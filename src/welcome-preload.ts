import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("welcome", {
  state(): Promise<unknown> {
    return ipcRenderer.invoke("welcome:state");
  },
  submit(name: string): Promise<unknown> {
    return ipcRenderer.invoke("welcome:submit", name);
  },
});
