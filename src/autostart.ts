import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

const AUTOSTART_FILE_NAME = "chatgpt-desktop-linux.desktop";

function quoteDesktopArgument(value: string): string {
  const escaped = value.replace(/%/g, "%%").replace(/([\\"`$])/g, "\\$1");
  return `"${escaped}"`;
}

function launchCommand(): string {
  if (process.env.APPIMAGE) {
    return `${quoteDesktopArgument(process.env.APPIMAGE)} --hide`;
  }

  if (app.isPackaged) {
    return `${quoteDesktopArgument(process.execPath)} --hide`;
  }

  return `${quoteDesktopArgument(process.execPath)} ${quoteDesktopArgument(app.getAppPath())} --hide`;
}

export function autostartFilePath(): string {
  return path.join(app.getPath("appData"), "autostart", AUTOSTART_FILE_NAME);
}

export function syncAutostart(enabled: boolean): void {
  const filePath = autostartFilePath();

  if (!enabled) {
    fs.rmSync(filePath, { force: true });
    return;
  }

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const content = [
    "[Desktop Entry]",
    "Type=Application",
    "Name=ChatGPT Desktop Linux",
    "Comment=Start ChatGPT in the system tray",
    `Exec=${launchCommand()}`,
    "Terminal=false",
    "Icon=chatgpt-desktop-linux",
    "X-GNOME-Autostart-enabled=true",
    "X-KDE-autostart-after=panel",
    "",
  ].join("\n");

  fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o644 });
}
