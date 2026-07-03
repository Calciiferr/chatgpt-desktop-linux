import { contextBridge, ipcRenderer, webUtils } from "electron";

const companionApi = {
  getState(): Promise<unknown> {
    return ipcRenderer.invoke("companion:get-state");
  },
  onState(callback: (state: unknown) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, state: unknown): void => callback(state);
    ipcRenderer.on("companion:state", listener);
    return () => ipcRenderer.removeListener("companion:state", listener);
  },
  updateDraft(input: unknown): Promise<{ ok: boolean; version: number }> {
    return ipcRenderer.invoke("companion:update-draft", input);
  },
  onHidden(callback: () => void): () => void {
    const listener = (): void => callback();
    ipcRenderer.on("companion:hidden", listener);
    return () => ipcRenderer.removeListener("companion:hidden", listener);
  },
  onMenuVisibility(callback: (visible: boolean) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, visible: unknown): void => {
      callback(visible === true);
    };
    ipcRenderer.on("companion:menu-visibility", listener);
    return () => ipcRenderer.removeListener("companion:menu-visibility", listener);
  },
  chooseFiles(): Promise<void> {
    return ipcRenderer.invoke("companion:choose-files");
  },
  addDroppedFiles(files: File[]): Promise<{ added: number }> {
    const paths = files.map((file) => webUtils.getPathForFile(file)).filter(Boolean);
    return ipcRenderer.invoke("companion:add-paths", paths);
  },
  capture(mode: "region" | "screen" | "window"): Promise<{ ok: boolean; cancelled?: boolean }> {
    return ipcRenderer.invoke("companion:capture", mode);
  },
  addClipboardImage(): Promise<{ ok: boolean; added?: number }> {
    return ipcRenderer.invoke("companion:clipboard-image");
  },
  addClipboardText(): Promise<{ ok: boolean; empty?: boolean }> {
    return ipcRenderer.invoke("companion:clipboard-text");
  },
  removeItem(id: string): void {
    ipcRenderer.send("companion:remove-item", id);
  },
  setExpanded(expanded: boolean): void {
    ipcRenderer.send("companion:set-expanded", expanded);
  },
  reportLayout(layout: {
    height: number;
    expanded: boolean;
    barBottom: number;
    rects?: Array<{ x: number; y: number; width: number; height: number }>;
  }): void {
    ipcRenderer.send("companion:layout", layout);
  },
  transfer(input: unknown): Promise<unknown> {
    return ipcRenderer.invoke("companion:transfer", input);
  },
  manageProjects(): void {
    ipcRenderer.send("companion:manage-projects");
  },
  syncProjects(): Promise<unknown> {
    return ipcRenderer.invoke("companion:sync-projects");
  },
  onProjectScanProgress(callback: (progress: unknown) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, progress: unknown): void => callback(progress);
    ipcRenderer.on("companion:project-sync-progress", listener);
    return () => ipcRenderer.removeListener("companion:project-sync-progress", listener);
  },
  close(): void {
    ipcRenderer.send("companion:close");
  },
};

contextBridge.exposeInMainWorld("companionApi", companionApi);
