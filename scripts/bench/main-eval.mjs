// Evaluate JS in the Electron MAIN process via the Node inspector.
// usage: node m.mjs <file-with-expression | -e "expr">
import fs from "node:fs";
const arg = process.argv[2] === "-e" ? process.argv[3] : fs.readFileSync(process.argv[2], "utf8");
const list = await (await fetch("http://127.0.0.1:9229/json/list")).json();
const ws = new WebSocket(list[0].webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params) => new Promise((r) => { const i = ++id; pending.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const prelude = "const electron = process.mainModule.require('electron'); const {app, BrowserWindow, webContents, session} = electron;";
const res = await send("Runtime.evaluate", {
  expression: `(async () => { ${prelude}\n${arg}\n})()`,
  awaitPromise: true, returnByValue: true, includeCommandLineAPI: true,
});
if (res.result?.exceptionDetails) console.error(JSON.stringify(res.result.exceptionDetails, null, 1));
else console.log(typeof res.result?.result?.value === "string" ? res.result.result.value : JSON.stringify(res.result?.result?.value, null, 1));
ws.close();
