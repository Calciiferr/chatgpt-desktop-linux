import { contextBridge, ipcRenderer } from "electron";

export interface BrowserShellTab {
  id: string;
  title: string;
  loading: boolean;
  active: boolean;
}

export interface BrowserShellState {
  tabs: BrowserShellTab[];
  barVisible: boolean;
  canCreate: boolean;
  darkMode: boolean;
}

contextBridge.exposeInMainWorld("browserShellApi", {
  onState(callback: (state: BrowserShellState) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, state: BrowserShellState): void => callback(state);
    ipcRenderer.on("tabs:state", listener);
    return () => ipcRenderer.removeListener("tabs:state", listener);
  },
  activate(id: string): void {
    ipcRenderer.send("tabs:activate", id);
  },
  close(id: string): void {
    ipcRenderer.send("tabs:close", id);
  },
  reorder(id: string, toIndex: number): void {
    ipcRenderer.send("tabs:reorder", id, toIndex);
  },
  create(): void {
    ipcRenderer.send("tabs:create");
  },
});
