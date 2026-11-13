// CDP client for ChatGPT tab renderers (remote-debugging-port 9222).
// usage: node r.mjs <tabSelector> <ctx: main|ext> (-e "expr" | file) [--listen secs]
//  tabSelector: "visible" | index among chatgpt pages | "all"
import fs from "node:fs";
const [sel, ctxName, mode, src, ...rest] = process.argv.slice(2);
const expr = mode === "-e" ? src : (mode ? fs.readFileSync(mode, "utf8") : "1");
const listenIdx = rest.indexOf("--listen");
const listen = listenIdx >= 0 ? Number(rest[listenIdx + 1]) : 0;

const targets = (await (await fetch("http://127.0.0.1:9222/json/list")).json())
  .filter((t) => t.type === "page" && t.url.startsWith("https://chatgpt.com"));

async function connect(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const contexts = []; const events = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); return; }
    if (d.method === "Runtime.executionContextCreated") contexts.push(d.params.context);
    else if (d.method === "Runtime.exceptionThrown") events.push({ t: Date.now(), kind: "exception", text: (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text || "").slice(0, 400) });
    else if (d.method === "Runtime.consoleAPICalled" && ["error", "warning", "warn"].includes(d.params.type)) events.push({ t: Date.now(), kind: "console." + d.params.type, ctx: d.params.executionContextId, text: d.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 400) });
    else if (d.method === "Log.entryAdded" && ["error", "warning"].includes(d.params.entry.level)) events.push({ t: Date.now(), kind: "log." + d.params.entry.level, text: (d.params.entry.text || "").slice(0, 300) });
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Log.enable");
  await new Promise((r) => setTimeout(r, 300));
  return { ws, send, contexts, events };
}

async function run(t, idx) {
  const c = await connect(t);
  const vis = await c.send("Runtime.evaluate", { expression: "document.visibilityState", returnByValue: true });
  let ctxId;
  if (ctxName === "ext") { for (const x of c.contexts.filter((x) => x.origin?.startsWith("chrome-extension://") || /NestFolders/i.test(x.name))) { const ok = await c.send("Runtime.evaluate", { expression: "!!(window.GlynGPT && window.GlynGPT.scopes)", contextId: x.id, returnByValue: true }); if (ok.result?.result?.value) { ctxId = x.id; break; } } }
  const res = await c.send("Runtime.evaluate", { expression: `(async () => { ${expr}\n})()`, awaitPromise: true, returnByValue: true, ...(ctxId ? { contextId: ctxId } : {}) });
  if (listen) await new Promise((r) => setTimeout(r, listen * 1000));
  const out = { tab: idx, visibility: vis.result?.result?.value, extCtx: !!ctxId, result: res.result?.exceptionDetails ? { error: res.result.exceptionDetails.exception?.description } : res.result?.result?.value };
  if (listen || c.events.length) out.events = c.events;
  c.ws.close();
  return out;
}

let chosen;
if (sel === "all") chosen = targets.map((t, i) => [t, i]);
else if (sel === "visible") {
  chosen = [];
  for (const [i, t] of targets.entries()) { const c = await connect(t); const v = await c.send("Runtime.evaluate", { expression: "document.visibilityState", returnByValue: true }); c.ws.close(); if (v.result?.result?.value === "visible") chosen.push([t, i]); }
} else chosen = [[targets[Number(sel)], Number(sel)]];
const results = await Promise.all(chosen.map(([t, i]) => run(t, i)));
console.log(JSON.stringify(results, null, 1));
