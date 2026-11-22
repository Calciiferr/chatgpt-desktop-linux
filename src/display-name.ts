import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { log } from "./logger";

export const DEFAULT_DISPLAY_NAME = "ChatGPT";
export const MAX_DISPLAY_NAME_LENGTH = 40;
export const SYSTEM_LAUNCHER_PATH = "/usr/share/applications/chatgpt-desktop-linux.desktop";
const OVERRIDE_MARKER = "X-ChatGPT-Desktop-Linux-Renamed=true";
// Keywords that would still list a renamed launcher when searching for "ChatGPT".
const BRAND_KEYWORDS = new Set(["chatgpt", "openai"]);

/** Returns the trimmed name, or null when it cannot be used as an application name. */
export function cleanDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.replace(/\s+/g, " ").trim();
  if (!name || name.length > MAX_DISPLAY_NAME_LENGTH) return null;
  // Control characters would break the launcher file; brackets and = are desktop-entry syntax.
  if (/[\u0000-\u001f\u007f[\]=]/.test(name)) return null;
  return name;
}

export function launcherOverridePath(home = os.homedir(), dataHome = process.env.XDG_DATA_HOME): string {
  const base = dataHome && path.isAbsolute(dataHome) ? dataHome : path.join(home, ".local", "share");
  return path.join(base, "applications", "chatgpt-desktop-linux.desktop");
}

/**
 * Copies the installed launcher with another name. Desktop environments give a
 * launcher in the user's folder priority over the system one with the same file name.
 */
export function renamedLauncherContent(systemContent: string, name: string): string {
  const lines = systemContent.replace(/\r\n/g, "\n").split("\n");
  let section = "";
  const output: string[] = [];
  for (const line of lines) {
    const header = /^\[(.+)\]\s*$/.exec(line);
    if (header) {
      section = header[1];
      output.push(line);
      if (section === "Desktop Entry") output.push(`Name=${name}`, OVERRIDE_MARKER);
      continue;
    }
    if (section === "Desktop Entry") {
      if (/^Name(\[[^\]]+\])?=/.test(line) || line === OVERRIDE_MARKER) continue;
      if (line.startsWith("Keywords=")) {
        const keywords = line.slice("Keywords=".length).split(";").filter((word) => word && !BRAND_KEYWORDS.has(word.toLowerCase()));
        output.push(`Keywords=${keywords.map((word) => `${word};`).join("")}`);
        continue;
      }
    }
    output.push(line);
  }
  return output.join("\n");
}

function refreshLauncherCaches(directory: string): void {
  for (const [command, args] of [["update-desktop-database", [directory]], ["kbuildsycoca6", []]] as const) {
    try {
      const child = spawn(command, [...args], { stdio: "ignore", detached: true });
      child.on("error", () => {});
      child.unref();
    } catch {
      // Optional: menus also pick up the change on their own.
    }
  }
}

/** Installs, updates or removes the renamed launcher. Returns true when the launcher changed. */
export function syncLauncherName(
  name: string,
  options: { systemLauncher?: string; overridePath?: string } = {},
): boolean {
  const systemLauncher = options.systemLauncher ?? SYSTEM_LAUNCHER_PATH;
  const overridePath = options.overridePath ?? launcherOverridePath();
  try {
    const existing = fs.existsSync(overridePath) ? fs.readFileSync(overridePath, "utf8") : null;
    const ours = existing !== null && existing.includes(OVERRIDE_MARKER);
    if (name === DEFAULT_DISPLAY_NAME || !fs.existsSync(systemLauncher)) {
      // Never remove a launcher the user wrote by hand.
      if (!ours) return false;
      fs.rmSync(overridePath, { force: true });
    } else {
      const content = renamedLauncherContent(fs.readFileSync(systemLauncher, "utf8"), name);
      if (existing === content) return false;
      if (existing !== null && !ours) {
        log.warn(`[launcher] ${overridePath} was created by hand; the application name is not applied to it.`);
        return false;
      }
      fs.mkdirSync(path.dirname(overridePath), { recursive: true });
      fs.writeFileSync(overridePath, content, { encoding: "utf8", mode: 0o644 });
    }
    refreshLauncherCaches(path.dirname(overridePath));
    log.info(`[launcher] Application name set to "${name}".`);
    return true;
  } catch (error) {
    log.warn("[launcher] Unable to update the application name:", error);
    return false;
  }
}
