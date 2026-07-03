import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PLUGIN_NAME = "chatgpt-magic-bar-controller";
const SCRIPT_FILE = path.join(os.tmpdir(), `${PLUGIN_NAME}.js`);

export interface KWinCompanionControllerResult {
  available: boolean;
  error?: string;
}

interface CommandResult {
  error?: Error;
  status: number | null;
  stdout: string;
  stderr: string;
}

function qdbus(method: string, extraArgs: string[] = []): CommandResult {
  const result = spawnSync(
    "qdbus6",
    ["org.kde.KWin", "/Scripting", `org.kde.kwin.Scripting.${method}`, ...extraArgs],
    { encoding: "utf8" },
  );
  return {
    error: result.error,
    status: result.status,
    stdout: String(result.stdout ?? ""),
    stderr: String(result.stderr ?? ""),
  };
}

function controllerScript(): string {
  return `
const barTitle = "ChatGPT Magic Bar";
const menuTitle = "ChatGPT Magic Bar Menu";
const gap = 2;
let lastBarPosition = null;
let barWindow = null;
let menuWindow = null;
let restoringBar = false;
let positioningMenu = false;
const watchedBars = [];

function captionOf(window) {
  return String(window && window.caption ? window.caption : "");
}

function isBar(window) {
  return captionOf(window) === barTitle;
}

function isMenu(window) {
  return captionOf(window) === menuTitle;
}

function findExact(title) {
  const windows = workspace.windowList();
  for (let index = 0; index < windows.length; index += 1) {
    if (captionOf(windows[index]) === title) return windows[index];
  }
  return null;
}

function clonePosition(geometry) {
  return { x: Math.round(geometry.x), y: Math.round(geometry.y) };
}

function outputGeometryFor(window) {
  try {
    if (window.output && window.output.geometry) return window.output.geometry;
  } catch (_) {}
  try {
    return workspace.clientArea(KWin.FullScreenArea, window);
  } catch (_) {
    return { x: 0, y: 0, width: 100000, height: 100000 };
  }
}

function placeMenu() {
  if (positioningMenu) return;
  const bar = isBar(barWindow) ? barWindow : findExact(barTitle);
  const menu = isMenu(menuWindow) ? menuWindow : findExact(menuTitle);
  if (!bar || !menu) return;

  const barGeometry = bar.frameGeometry;
  const menuGeometry = menu.frameGeometry;
  const output = outputGeometryFor(bar);
  const outputLeft = Math.round(output.x);
  const outputTop = Math.round(output.y);
  const outputRight = outputLeft + Math.round(output.width);
  const outputBottom = outputTop + Math.round(output.height);
  const width = Math.round(menuGeometry.width);
  const height = Math.round(menuGeometry.height);
  const aboveY = Math.round(barGeometry.y - height - gap);
  const belowY = Math.round(barGeometry.y + barGeometry.height + gap);
  let y = aboveY >= outputTop ? aboveY : belowY;
  if (y + height > outputBottom) y = Math.max(outputTop, aboveY);
  y = Math.max(outputTop, Math.min(y, outputBottom - height));
  const x = Math.max(
    outputLeft,
    Math.min(Math.round(barGeometry.x), outputRight - width),
  );

  if (
    Math.round(menuGeometry.x) === x &&
    Math.round(menuGeometry.y) === y &&
    Math.round(menuGeometry.width) === width &&
    Math.round(menuGeometry.height) === height
  ) return;

  positioningMenu = true;
  menu.frameGeometry = { x, y, width, height };
  menu.keepAbove = true;
  menu.onAllDesktops = true;
  if (typeof menu.skipTaskbar !== "undefined") menu.skipTaskbar = true;
  if (typeof menu.skipSwitcher !== "undefined") menu.skipSwitcher = true;
  positioningMenu = false;
}

function rememberBar(window) {
  if (!isBar(window) || restoringBar) return;
  lastBarPosition = clonePosition(window.frameGeometry);
  placeMenu();
}

function watchBar(window) {
  barWindow = window;
  const geometry = window.frameGeometry;
  if (lastBarPosition) {
    const x = lastBarPosition.x;
    const y = lastBarPosition.y;
    if (Math.round(geometry.x) !== x || Math.round(geometry.y) !== y) {
      restoringBar = true;
      window.frameGeometry = {
        x,
        y,
        width: Math.round(geometry.width),
        height: Math.round(geometry.height),
      };
      restoringBar = false;
    }
  } else {
    lastBarPosition = clonePosition(geometry);
  }

  if (watchedBars.indexOf(window) === -1) {
    watchedBars.push(window);
    window.frameGeometryChanged.connect(() => rememberBar(window));
    if (typeof window.interactiveMoveResizeFinished === "function") {
      window.interactiveMoveResizeFinished.connect(() => rememberBar(window));
    }
  }
  placeMenu();
}

function watch(window) {
  if (isBar(window)) watchBar(window);
  else if (isMenu(window)) {
    menuWindow = window;
    placeMenu();
  }
}

workspace.windowList().forEach(watch);
workspace.windowAdded.connect(watch);
workspace.windowRemoved.connect((window) => {
  if (window === barWindow) barWindow = null;
  if (window === menuWindow) menuWindow = null;
});
`;
}

export function stopKWinCompanionController(): void {
  if (process.platform === "linux") {
    qdbus("unloadScript", [PLUGIN_NAME]);
  }
  fs.rmSync(SCRIPT_FILE, { force: true });
}

export function startKWinCompanionController(): KWinCompanionControllerResult {
  if (process.platform !== "linux") return { available: false };

  try {
    qdbus("unloadScript", [PLUGIN_NAME]);
    fs.writeFileSync(SCRIPT_FILE, controllerScript(), { encoding: "utf8", mode: 0o600 });

    const load = qdbus("loadScript", [SCRIPT_FILE, PLUGIN_NAME]);
    if (load.error || load.status !== 0) {
      throw load.error ?? new Error(load.stderr?.trim() || "Chargement du script KWin impossible.");
    }

    const start = qdbus("start");
    if (start.error || start.status !== 0) {
      qdbus("unloadScript", [PLUGIN_NAME]);
      throw start.error ?? new Error(start.stderr?.trim() || "Démarrage du script KWin impossible.");
    }

    return { available: true };
  } catch (error) {
    fs.rmSync(SCRIPT_FILE, { force: true });
    return {
      available: false,
      error: error instanceof Error ? error.message : "Contrôleur KWin indisponible.",
    };
  }
}

export function companionKWinControllerScriptForTests(): string {
  return controllerScript();
}
