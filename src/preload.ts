import { contextBridge, ipcRenderer } from "electron";

const desktopApi = {
  cancelUpdate(): Promise<void> { return ipcRenderer.invoke("updates:cancel"); },
  updateStatus(): Promise<any> { return ipcRenderer.invoke("updates:status"); },
  openUpdatePage(): Promise<void> { return ipcRenderer.invoke("updates:open-page"); },
  listExtensions(): Promise<any> { return ipcRenderer.invoke("extensions:list"); },
  addExtension(): Promise<any> { return ipcRenderer.invoke("extensions:add"); },
  setExtensionEnabled(id: string, enabled: boolean): Promise<any> { return ipcRenderer.invoke("extensions:set-enabled", id, enabled); },
  removeExtension(id: string): Promise<any> { return ipcRenderer.invoke("extensions:remove", id); },
  openExtensionsFolder(): Promise<void> { return ipcRenderer.invoke("extensions:open-folder"); },
  reloadExtensions(): Promise<any> { return ipcRenderer.invoke("extensions:reload"); },
  createExtensionWithChatGpt(language: string): Promise<any> { return ipcRenderer.invoke("extensions:create-with-chatgpt", language); },
  copyExtensionPrompt(language: string): Promise<any> { return ipcRenderer.invoke("extensions:copy-prompt", language); },
  checkUpdates(): Promise<any> { return ipcRenderer.invoke("updates:check"); },
  installUpdate(): Promise<any> { return ipcRenderer.invoke("updates:install"); },
  getSettings(): Promise<unknown> {
    return ipcRenderer.invoke("settings:get");
  },
  saveSettings(settings: unknown): Promise<unknown> {
    return ipcRenderer.invoke("settings:save", settings);
  },
  scanProjects(): Promise<unknown> {
    return ipcRenderer.invoke("projects:scan");
  },
  onProjectScanProgress(callback: (progress: unknown) => void): () => void {
    const listener = (_event: Electron.IpcRendererEvent, progress: unknown): void => callback(progress);
    ipcRenderer.on("projects:progress", listener);
    return () => ipcRenderer.removeListener("projects:progress", listener);
  },
  onSettingsTheme(callback: (state: { darkMode: boolean; themeMode: string }) => void): () => void {
    const listener = (
      _event: Electron.IpcRendererEvent,
      state: { darkMode: boolean; themeMode: string },
    ): void => callback(state);
    ipcRenderer.on("settings:theme", listener);
    return () => ipcRenderer.removeListener("settings:theme", listener);
  },
  renameProject(id: string, name: string): Promise<unknown> {
    return ipcRenderer.invoke("projects:rename", id, name);
  },
  removeProject(id: string): Promise<unknown> {
    return ipcRenderer.invoke("projects:remove", id);
  },
  resetProjects(): Promise<unknown> {
    return ipcRenderer.invoke("projects:reset-all");
  },
  setDefaultProject(id?: string): Promise<unknown> {
    return ipcRenderer.invoke("projects:set-default", id);
  },
  resetSession(): Promise<boolean> {
    return ipcRenderer.invoke("session:reset");
  },
  resetWindowBounds(): Promise<unknown> {
    return ipcRenderer.invoke("window:reset-bounds");
  },
  copyLogFile(): Promise<unknown> {
    return ipcRenderer.invoke("diagnostics:copy-log-file");
  },
  copyLogTail(): Promise<unknown> {
    return ipcRenderer.invoke("diagnostics:copy-log-tail");
  },
  clearLog(): Promise<unknown> {
    return ipcRenderer.invoke("diagnostics:clear-log");
  },
  closeSettings(): void {
    ipcRenderer.send("settings:close");
  },
  restartApplication(): void {
    ipcRenderer.send("app:restart");
  },
};

contextBridge.exposeInMainWorld("desktopApi", desktopApi);
