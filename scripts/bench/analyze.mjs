import fs from "node:fs";
const file = process.argv[2];
const { traceEvents: ev } = JSON.parse(fs.readFileSync(file, "utf8"));
const mains = new Map();
for (const e of ev) if (e.name === "thread_name" && e.args?.name === "CrRendererMain") mains.set(`${e.pid}:${e.tid}`, 0);
for (const e of ev) { const k = `${e.pid}:${e.tid}`; if (mains.has(k) && e.name === "RunTask" && e.dur) mains.set(k, mains.get(k) + e.dur); }
const busiest = [...mains].sort((a, b) => b[1] - a[1]);
const key = process.env.KEY || busiest[0][0];
const main = ev.filter((e) => `${e.pid}:${e.tid}` === key && e.ph === "X" && e.dur !== undefined).sort((a, b) => a.ts - b.ts);
const interesting = (k) => ["UpdateLayoutTree", "Layout", "Paint", "PrePaint", "Layerize", "FunctionCall", "EventDispatch", "TimerFire", "FireAnimationFrame", "HitTest", "ParseHTML", "IntersectionObserverController::computeIntersections", "ScrollLayer", "Commit", "MinorGC", "MajorGC"].includes(k.name) || k.name.startsWith("V8.GC") || k.name.startsWith("BlinkGC");
const tasks = main.filter((e) => e.name === "RunTask" && e.dur > 30000);
const longTasks = tasks.sort((a, b) => b.dur - a.dur).slice(0, 8).map((t) => {
  const by = {};
  for (const k of main) {
    if (k.ts < t.ts) continue; if (k.ts > t.ts + t.dur) break;
    if (k === t || !interesting(k)) continue;
    const name = k.name + (k.name === "UpdateLayoutTree" ? ` els=${k.args?.elementCount ?? "?"}` : k.name === "FunctionCall" ? ` ${(k.args?.data?.url || "").split("/").pop().slice(0, 40)}:${k.args?.data?.functionName || ""}` : k.name === "EventDispatch" ? ` ${k.args?.data?.type}` : "");
    by[name] = (by[name] || 0) + k.dur / 1000;
  }
  return { ms: +(t.dur / 1000).toFixed(1), top: Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => `${k}=${v.toFixed(1)}`) };
});
const sum = (n) => +main.filter((e) => e.name === n).reduce((a, e) => a + e.dur / 1000, 0).toFixed(1);
const fcByUrl = {};
for (const e of main.filter((e) => e.name === "FunctionCall")) { const u = (e.args?.data?.url || "?"); const k = u.startsWith("chrome-extension") ? "EXT:" + u.split("/").pop() : u.includes("chatgpt") || u.includes("oaistatic") ? "chatgpt" : u.slice(0, 40); fcByUrl[k] = +((fcByUrl[k] || 0) + e.dur / 1000).toFixed(1); }
const ult = main.filter((e) => e.name === "UpdateLayoutTree").sort((a, b) => b.dur - a.dur).slice(0, 6).map((e) => ({ ms: +(e.dur / 1000).toFixed(1), els: e.args?.elementCount, stack: (e.args?.beginData?.stackTrace || []).slice(0, 3).map((s) => `${(s.url || "").split("/").pop()}:${s.functionName}:${s.lineNumber}`) }));
const lay = main.filter((e) => e.name === "Layout").sort((a, b) => b.dur - a.dur).slice(0, 4).map((e) => ({ ms: +(e.dur / 1000).toFixed(1), dirty: e.args?.beginData?.dirtyObjects, total: e.args?.beginData?.totalObjects, stack: (e.args?.beginData?.stackTrace || []).slice(0, 2).map((s) => `${(s.url || "").split("/").pop()}:${s.functionName}`) }));
console.log(JSON.stringify({ thread: key, renderers: busiest.map(([k, v]) => `${k}=${(v / 1000).toFixed(0)}ms`), totals: { UpdateLayoutTree: sum("UpdateLayoutTree"), Layout: sum("Layout"), PrePaint: sum("PrePaint"), Paint: sum("Paint"), Layerize: sum("Layerize"), FunctionCall: sum("FunctionCall") }, fcByUrl, longTasks, topStyle: ult, topLayout: lay }, null, 1));
