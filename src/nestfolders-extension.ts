import { app, session } from "electron";
import fs from "node:fs";
import path from "node:path";

/** Load the bundled, unpacked NestFolders content scripts into the same
 * persistent ChatGPT session as our WebContentsView tabs.
 *
 * Electron only supports chrome.storage.local; the vendored NestFolders main.js
 * intentionally chooses "local" instead of its upstream "sync" area.
 */
export async function loadNestFoldersExtension(): Promise<boolean> {
  const directory = app.isPackaged
    ? path.join(process.resourcesPath, "nestfolders")
    : path.join(app.getAppPath(), "vendor", "nestfolders");
  const manifest = path.join(directory, "manifest.json");
  if (!fs.existsSync(manifest)) {
    console.warn("[nestfolders] Missing extension manifest:", manifest);
    return false;
  }
  try {
    const chatSession = session.fromPartition("persist:chatgpt");
    const extension = await chatSession.extensions.loadExtension(directory, { allowFileAccess: false });
    console.info("[nestfolders] Loaded:", extension.name, extension.version);
    return true;
  } catch (error) {
    console.error("[nestfolders] Extension not loaded:", error);
    return false;
  }
}
