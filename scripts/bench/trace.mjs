// Chromium trace of a scenario on the real tab. usage: node trace.mjs <label> <scenario>
import fs from "node:fs";
const [label, scenario] = process.argv.slice(2);
import os from "node:os";
import path from "node:path";
const DIR = (process.env.BENCH_OUT || path.join(os.homedir(), "Documents", "Diagnostics-Kubuntu", "ChatGPT-Desktop-Audit", "bench")) + path.sep;
fs.mkdirSync(DIR, { recursive: true });
const targets = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter((t) => t.type === "page" && t.url.startsWith("https://chatgpt.com"));
async function connect(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const events = []; let done;
  const complete = new Promise((r) => (done = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d); pending.delete(d.id); return; }
    if (d.method === "Tracing.dataCollected") events.push(...d.params.value);
    if (d.method === "Tracing.tracingComplete") done(); };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  return { ws, send, events, complete };
}
let tab;
for (const t of targets) { const c = await connect(t); const v = await c.send("Runtime.evaluate", { expression: "document.visibilityState + innerWidth", returnByValue: true }); if (v.result?.value === "visible" + (process.env.W || "1920")) { tab = c; break; } c.ws.close(); }
const { send } = tab;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mouse = (type, x, y, extra = {}) => send("Input.dispatchMouseEvent", { type, x, y, button: "none", ...extra });
await send("Tracing.start", { traceConfig: { includedCategories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.timeline.frame", "v8.execute", "toplevel", "blink.user_timing", "disabled-by-default-devtools.timeline.stack", ...(process.env.INV ? ["disabled-by-default-devtools.timeline.invalidationTracking"] : [])], recordMode: "recordAsMuchAsPossible" }, transferMode: "ReportEvents" });
await sleep(300);
if (scenario === "scroll-sidebar") {
  await send("Input.synthesizeScrollGesture", { x: 160, y: 600, yDistance: -1500, speed: 1000, gestureSourceType: "mouse" });
  await send("Input.synthesizeScrollGesture", { x: 160, y: 600, yDistance: 1500, speed: 1000, gestureSourceType: "mouse" });
} else if (scenario === "scroll-chat") {
  await send("Input.synthesizeScrollGesture", { x: 1100, y: 500, yDistance: 2500, speed: 1200, gestureSourceType: "mouse" });
  await send("Input.synthesizeScrollGesture", { x: 1100, y: 500, yDistance: -2500, speed: 1200, gestureSourceType: "mouse" });
} else if (scenario === "custom") {
  const fn = (await import(process.env.CUSTOM)).default; await fn({ send, mouse, sleep });
}
await sleep(500);
await send("Tracing.end");
await tab.complete;
const file = `${DIR}trace-${label}-${scenario}.json`;
fs.writeFileSync(file, JSON.stringify({ traceEvents: tab.events })); console.log(file); process.exit(0);
// Summary: main-thread long tasks of the page renderer and their dominant children.
const pidTid = {};
for (const e of tab.events) if (e.name === "thread_name" && e.args?.name === "CrRendererMain") pidTid[`${e.pid}:${e.tid}`] = true;
const main = tab.events.filter((e) => pidTid[`${e.pid}:${e.tid}`] && e.ph === "X");
const tasks = main.filter((e) => e.name === "RunTask" && e.dur > 30000).sort((a, b) => b.dur - a.dur).slice(0, 8);
const summary = tasks.map((t) => {
  const kids = main.filter((e) => e !== t && e.ts >= t.ts && e.ts + e.dur <= t.ts + t.dur && e.pid === t.pid && e.tid === t.tid);
  const by = {};
  for (const k of kids) if (["UpdateLayoutTree", "Layout", "Paint", "PrePaint", "Layerize", "FunctionCall", "EventDispatch", "TimerFire", "FireAnimationFrame", "ParseHTML", "HitTest", "IntersectionObserverController::computeIntersections", "UpdateLayer", "MajorGC", "MinorGC", "V8.GC_SCAVENGER", "BlinkGC.AtomicPhase"].includes(k.name) || k.name.startsWith("V8.GC")) {
    const key = k.name + (k.name === "UpdateLayoutTree" ? ` els=${k.args?.elementCount ?? "?"}` : k.name === "FunctionCall" ? ` ${(k.args?.data?.url || "").split("/").pop().slice(0, 40)}:${k.args?.data?.functionName || ""}` : k.name === "EventDispatch" ? ` ${k.args?.data?.type}` : "");
    by[key] = (by[key] || 0) + k.dur / 1000;
  }
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([k, v]) => `${k}=${v.toFixed(1)}`);
  return { ms: (t.dur / 1000).toFixed(1), top };
});
const sum = (n) => main.filter((e) => e.name === n).reduce((a, e) => a + e.dur / 1000, 0).toFixed(1);
const ult = main.filter((e) => e.name === "UpdateLayoutTree").sort((a, b) => b.dur - a.dur).slice(0, 5).map((e) => ({ ms: (e.dur / 1000).toFixed(1), els: e.args?.elementCount, stack: (e.args?.beginData?.stackTrace || []).slice(0, 2).map((s) => `${(s.url || "").split("/").pop()}:${s.functionName}`) }));
console.log(JSON.stringify({ file, totals: { UpdateLayoutTree: sum("UpdateLayoutTree"), Layout: sum("Layout"), Paint: sum("Paint"), PrePaint: sum("PrePaint"), FunctionCall: sum("FunctionCall") }, longTasks: summary, topStyle: ult }, null, 1));
