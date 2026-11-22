import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const USER_DATA_DIR_NAME = "chatgpt-desktop-linux";
const LEGACY_USER_DATA_DIR_NAME = "ChatGPT";

function isLegacyAppDirectory(directory: string): boolean {
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(directory, "settings.json"), "utf8"));
    return typeof settings === "object" && settings !== null &&
      "globalShortcut" in settings && "tabBarMode" in settings;
  } catch {
    return false;
  }
}

function isLockedByRunningProcess(directory: string, hostname: string): boolean {
  let target: string;
  try {
    target = fs.readlinkSync(path.join(directory, "SingletonLock"));
  } catch {
    return false;
  }
  const separator = target.lastIndexOf("-");
  const host = target.slice(0, separator);
  const pid = Number(target.slice(separator + 1));
  if (host !== hostname || !Number.isInteger(pid) || pid <= 0) return true;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EPERM";
  }
}

/**
 * Returns the data directory to use. Versions up to 0.7.x stored their data in
 * the generic "~/.config/ChatGPT" folder; it is moved once to a folder named
 * after the application so the session, settings and tabs are kept.
 */
export function resolveUserDataDirectory(configDirectory: string, hostname = os.hostname()): string {
  const current = path.join(configDirectory, USER_DATA_DIR_NAME);
  const legacy = path.join(configDirectory, LEGACY_USER_DATA_DIR_NAME);
  if (fs.existsSync(current) || !isLegacyAppDirectory(legacy)) return current;
  if (isLockedByRunningProcess(legacy, hostname)) return legacy;
  try {
    fs.renameSync(legacy, current);
    return current;
  } catch {
    return legacy;
  }
}
