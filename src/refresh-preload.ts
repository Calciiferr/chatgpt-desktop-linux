import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("refreshApi", {
  onProgress(callback: (state: { progress: number }) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, state: { progress: number }): void => callback(state);
    ipcRenderer.on("refresh:progress", listener);
    return () => ipcRenderer.removeListener("refresh:progress", listener);
  },
});
