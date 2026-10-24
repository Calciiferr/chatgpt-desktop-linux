import { contextBridge, ipcRenderer } from "electron";
contextBridge.exposeInMainWorld("updateProgress", {
  onState(callback: (state: unknown) => void): void { ipcRenderer.on("update-progress:state", (_event, state) => callback(state)); },
  ready(): void { ipcRenderer.send("update-progress:ready"); },
  action(action: "cancel" | "close" | "restart"): void { ipcRenderer.send("update-progress:action", action); },
});
