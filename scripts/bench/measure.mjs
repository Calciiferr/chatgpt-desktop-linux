// Scenario measurement on the visible ChatGPT tab.
// usage: node measure.mjs <label> <scenario> [reps]
import fs from "node:fs";
const [label, scenario, repsArg] = process.argv.slice(2);
const reps = Number(repsArg || 3);
import os from "node:os";
import path from "node:path";
const OUT_DIR = process.env.BENCH_OUT || path.join(os.homedir(), "Documents", "Diagnostics-Kubuntu", "ChatGPT-Desktop-Audit", "bench");
fs.mkdirSync(OUT_DIR, { recursive: true });
const OUT = path.join(OUT_DIR, "mesures.jsonl");

const targets = (await (await fetch("http://127.0.0.1:9222/json/list")).json())
  .filter((t) => t.type === "page" && t.url.startsWith("https://chatgpt.com"));

async function connect(t) {
  const ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
  let id = 0; const pending = new Map(); const errors = [];
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d); pending.delete(d.id); return; }
    if (d.method === "Runtime.exceptionThrown") errors.push((d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text || "").slice(0, 300));
    if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error") errors.push("console.error: " + d.params.args.map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 300));
  };
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  return { ws, send, errors };
}

let tab = null;
for (const t of targets) {
  const c = await connect(t);
  const v = await c.send("Runtime.evaluate", { expression: "document.visibilityState + innerWidth", returnByValue: true });
  if (v.result?.value === "visible" + (process.env.W || "1920")) { tab = c; break; }
  c.ws.close();
}
if (!tab) throw new Error("no visible tab");
const { send } = tab;
await send("Runtime.enable");
await send("Performance.enable", { timeDomain: "timeTicks" });
await send("Profiler.enable");
await send("Profiler.setSamplingInterval", { interval: 200 });
const ev = async (expression) => (await send("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result?.value;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const INSTALL = `(() => {
  if (window.__m) { window.__m.frames = []; window.__m.loaf = []; return; }
  const m = window.__m = { frames: [], loaf: [], on: false };
  const loop = (t) => { if (m.on) m.frames.push(t); requestAnimationFrame(loop); };
  requestAnimationFrame(loop);
  try {
    new PerformanceObserver((l) => { if (!m.on) return; for (const e of l.getEntries()) m.loaf.push({
      d: e.duration, b: e.blockingDuration, sl: e.styleAndLayoutStart ? (e.startTime + e.duration - e.styleAndLayoutStart) : 0,
      s: e.scripts.map((s) => ({ u: (s.sourceURL || '').replace(/^https:\\/\\/[^/]+/, '').slice(0, 90), f: s.sourceFunctionName, inv: (s.invoker || '').slice(0, 60), d: Math.round(s.duration), fl: Math.round(s.forcedStyleAndLayoutDuration) })) }); })
      .observe({ type: 'long-animation-frame', buffered: false });
  } catch (e) { m.loafError = String(e); }
})()`;

const metrics = async () => Object.fromEntries((await send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
const mouse = (type, x, y, extra = {}) => send("Input.dispatchMouseEvent", { type, x, y, button: "none", pointerType: "mouse", ...extra });

async function action(name) {
  if (name === "idle") { await sleep(15000); return; }
  if (name === "scroll-chat") {
    await send("Input.synthesizeScrollGesture", { x: 1100, y: 500, yDistance: 2500, speed: 1200, gestureSourceType: "mouse", repeatCount: 0 });
    await send("Input.synthesizeScrollGesture", { x: 1100, y: 500, yDistance: -2500, speed: 1200, gestureSourceType: "mouse" });
    return;
  }
  if (name === "scroll-sidebar") {
    await send("Input.synthesizeScrollGesture", { x: 160, y: 600, yDistance: -1500, speed: 1000, gestureSourceType: "mouse" });
    await send("Input.synthesizeScrollGesture", { x: 160, y: 600, yDistance: 1500, speed: 1000, gestureSourceType: "mouse" });
    return;
  }
  if (name === "hover-sidebar") {
    for (let pass = 0; pass < 3; pass++) for (let y = 300; y <= 920; y += 6) { await mouse("mouseMoved", 150 + (y % 40), y); await sleep(8); }
    await mouse("mouseMoved", 1100, 500);
    return;
  }
  if (name === "hover-chat") {
    for (let pass = 0; pass < 3; pass++) for (let x = 700; x <= 1500; x += 6) { await mouse("mouseMoved", x, 300 + (x % 300)); await sleep(8); }
    return;
  }
  throw new Error("unknown scenario " + name);
}

function summarizeProfile(profile) {
  const byId = new Map(profile.nodes.map((n) => [n.id, n]));
  const self = new Map();
  const dt = profile.timeDeltas; const samples = profile.samples;
  for (let i = 0; i < samples.length; i++) { const d = (dt[i + 1] ?? 0) / 1000; self.set(samples[i], (self.get(samples[i]) || 0) + d); }
  const parent = new Map();
  for (const n of profile.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const special = new Set(["(idle)", "(program)", "(garbage collector)", "(root)"]);
  const cat = {}; const extFns = {};
  for (const [id0, ms] of self) {
    let id = id0; let n = byId.get(id);
    if (!special.has(n.callFrame.functionName)) {
      while (n && !n.callFrame.url && parent.has(id)) { id = parent.get(id); n = byId.get(id); }
      if (!n || !n.callFrame.url) n = byId.get(id0);
    }
    const u = n.callFrame.url || ""; const fn = n.callFrame.functionName || "(anon)";
    let c = u.startsWith("chrome-extension://") ? "nestfolders" : u.includes("chatgpt.com") || u.includes("oaistatic") ? "chatgpt" : u ? "other-js" : fn;
    cat[c] = (cat[c] || 0) + ms;
    if (c === "nestfolders") { const k = u.split("/").pop() + ":" + fn + ":" + n.callFrame.lineNumber; extFns[k] = (extFns[k] || 0) + ms; }
  }
  const round = (o) => Object.fromEntries(Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => [k, Math.round(v * 10) / 10]));
  return { cat: round(cat), extTop: round(extFns) };
}

for (let r = 0; r < reps; r++) {
  await ev(INSTALL);
  await sleep(300);
  tab.errors.length = 0;
  const before = await metrics();
  await ev("window.__m.on = true");
  await send("Profiler.start");
  const t0 = Date.now();
  await action(scenario);
  const wall = Date.now() - t0;
  const { profile } = await send("Profiler.stop");
  await sleep(200);
  await ev("window.__m.on = false");
  const after = await metrics();
  const m = await ev("({frames: window.__m.frames, loaf: window.__m.loaf, loafError: window.__m.loafError})");
  const gaps = m.frames.slice(1).map((t, i) => t - m.frames[i]).sort((a, b) => a - b);
  const pct = (p) => gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(p * gaps.length))] * 10) / 10 : null;
  const d = (k) => Math.round(((after[k] ?? 0) - (before[k] ?? 0)) * (k.endsWith("Duration") ? 1000 : 1) * 10) / 10;
  const loafScripts = {};
  for (const l of m.loaf) for (const s of l.s) { const k = (s.u.startsWith("chrome-extension") ? "EXT " + s.u.split("/").pop() : s.u.split("/").pop() || s.inv) + " " + (s.f || ""); const e = loafScripts[k] || (loafScripts[k] = { n: 0, d: 0, fl: 0 }); e.n++; e.d += s.d; e.fl += s.fl; }
  const rec = {
    when: new Date().toISOString(), label, scenario, rep: r + 1, wallMs: wall,
    frames: m.frames.length, frameMs: { p50: pct(0.5), p95: pct(0.95), p99: pct(0.99), max: gaps.length ? Math.round(gaps.at(-1)) : null },
    over33: gaps.filter((g) => g > 33.4).length, over50: gaps.filter((g) => g > 50).length,
    loaf: { n: m.loaf.length, totalMs: Math.round(m.loaf.reduce((a, l) => a + l.d, 0)), blockingMs: Math.round(m.loaf.reduce((a, l) => a + l.b, 0)), err: m.loafError },
    loafScripts: Object.fromEntries(Object.entries(loafScripts).sort((a, b) => b[1].d - a[1].d).slice(0, 8)),
    metrics: { ScriptMs: d("ScriptDuration"), TaskMs: d("TaskDuration"), LayoutCount: d("LayoutCount"), LayoutMs: d("LayoutDuration"), RecalcStyleCount: d("RecalcStyleCount"), RecalcStyleMs: d("RecalcStyleDuration"), JSHeapMB: Math.round((after.JSHeapUsedSize || 0) / 1e5) / 10, Nodes: after.Nodes },
    profile: summarizeProfile(profile),
    errors: tab.errors.slice(0, 10),
  };
  fs.appendFileSync(OUT, JSON.stringify(rec) + "\n");
  console.log(JSON.stringify({ rep: rec.rep, frameMs: rec.frameMs, over50: rec.over50, loaf: rec.loaf, metrics: rec.metrics, cat: rec.profile.cat, extTop: rec.profile.extTop, loafScripts: rec.loafScripts, errors: rec.errors }));
  await sleep(1500);
}
tab.ws.close();
