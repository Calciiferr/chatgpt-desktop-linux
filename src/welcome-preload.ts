import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("welcome", {
  state(): Promise<unknown> {
    return ipcRenderer.invoke("welcome:state");
  },
  submit(choice: { name: string; language: string }): Promise<unknown> {
    return ipcRenderer.invoke("welcome:submit", choice);
  },
});
