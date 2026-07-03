import { contextBridge, ipcRenderer } from "electron";

const searchApi = {
  find(query: string, forward: boolean, findNext: boolean): Promise<unknown> {
    return ipcRenderer.invoke("search:find", { query, forward, findNext });
  },
  close(): void {
    ipcRenderer.send("search:close");
  },
  onResult(callback: (result: unknown) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, result: unknown): void => callback(result);
    ipcRenderer.on("search:result", listener);
    return () => ipcRenderer.removeListener("search:result", listener);
  },
  onOpen(callback: () => void): () => void {
    const listener = (): void => callback();
    ipcRenderer.on("search:open", listener);
    return () => ipcRenderer.removeListener("search:open", listener);
  },
  onShortcuts(callback: (shortcuts: unknown) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, shortcuts: unknown): void =>
      callback(shortcuts);
    ipcRenderer.on("search:shortcuts", listener);
    return () => ipcRenderer.removeListener("search:shortcuts", listener);
  },
};

contextBridge.exposeInMainWorld("searchApi", searchApi);
