// Real input on the visible tab. usage: node input.mjs click x y | move x y | key Escape | type "text" | drag x1 y1 x2 y2 | rclick x y
const [cmd, ...a] = process.argv.slice(2);
const targets = (await (await fetch("http://127.0.0.1:9222/json/list")).json()).filter((t) => t.type === "page" && t.url.startsWith("https://chatgpt.com"));
let ws, id = 0; const pending = new Map();
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
for (const t of targets) {
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((r) => (ws.onopen = r));
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d.result ?? d); pending.delete(d.id); } };
  const v = await send("Runtime.evaluate", { expression: "document.visibilityState + innerWidth", returnByValue: true });
  if (v.result?.value === "visible" + (process.env.W || "1920")) break;
  ws.close(); ws = null;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const m = (type, x, y, extra = {}) => send("Input.dispatchMouseEvent", { type, x, y, ...extra });
const n = a.map(Number);
if (cmd === "click" || cmd === "rclick") {
  const button = cmd === "click" ? "left" : "right"; const buttons = cmd === "click" ? 1 : 2;
  await m("mouseMoved", n[0], n[1]); await sleep(120);
  await m("mousePressed", n[0], n[1], { button, buttons, clickCount: 1 }); await sleep(60);
  await m("mouseReleased", n[0], n[1], { button, buttons: 0, clickCount: 1 });
} else if (cmd === "move") { await m("mouseMoved", n[0], n[1]); }
else if (cmd === "key") {
  const key = a[0]; const code = key === "Escape" ? 27 : key === "Enter" ? 13 : 0;
  await send("Input.dispatchKeyEvent", { type: "rawKeyDown", key, code: key, windowsVirtualKeyCode: code });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key, code: key, windowsVirtualKeyCode: code });
} else if (cmd === "type") { await send("Input.insertText", { text: a[0] }); }
else if (cmd === "drag") {
  // Native HTML5 drag requires Input.dispatchDragEvent with drag interception.
  await send("Input.setInterceptDrags", { enabled: true });
  let dragData = null;
  ws.addEventListener("message", (e) => { const d = JSON.parse(e.data); if (d.method === "Input.dragIntercepted") dragData = d.params.data; });
  await m("mouseMoved", n[0], n[1]); await sleep(80);
  await m("mousePressed", n[0], n[1], { button: "left", buttons: 1, clickCount: 1 });
  for (let i = 1; i <= 10; i++) { await m("mouseMoved", n[0] + ((n[2] - n[0]) * i) / 10, n[1] + ((n[3] - n[1]) * i) / 10, { button: "left", buttons: 1 }); await sleep(30); }
  await sleep(200);
  if (dragData && !process.env.NODROP) {
    for (const type of ["dragEnter", "dragOver"]) { await send("Input.dispatchDragEvent", { type, x: n[2], y: n[3], data: dragData }); await sleep(80); }
    await send("Input.dispatchDragEvent", { type: "dragOver", x: n[2], y: n[3] + 1, data: dragData }); await sleep(80);
    await send("Input.dispatchDragEvent", { type: "drop", x: n[2], y: n[3] + 1, data: dragData });
  }
  await m("mouseReleased", n[2], n[3] + 1, { button: "left", buttons: 0, clickCount: 1 });
  await send("Input.setInterceptDrags", { enabled: false });
  console.log(dragData ? "drag intercepted: " + JSON.stringify(dragData.items.map((i) => i.mimeType)) : "no drag started");
}
await sleep(400);
ws.close();
