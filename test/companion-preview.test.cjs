"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  companionKWinControllerScriptForTests,
} = require("../dist/kwin-companion-controller.js");

const root = path.join(__dirname, "..");
const mainSource = fs.readFileSync(path.join(root, "src/main.ts"), "utf8");
const preloadSource = fs.readFileSync(path.join(root, "src/companion-preload.ts"), "utf8");
const kwinSource = fs.readFileSync(path.join(root, "src/kwin-companion-controller.ts"), "utf8");
const companionHtml = fs.readFileSync(path.join(root, "renderer/companion.html"), "utf8");
const companionSource = fs.readFileSync(path.join(root, "renderer/companion.js"), "utf8");
const previewHtml = fs.readFileSync(path.join(root, "renderer/companion-preview.html"), "utf8");
const previewCss = fs.readFileSync(path.join(root, "renderer/companion-preview.css"), "utf8");
const previewSource = fs.readFileSync(path.join(root, "renderer/companion-preview.js"), "utf8");

const createPreviewFunction = mainSource.match(
  /function createCompanionPreviewWindow[\s\S]*?\n}\n\nasync function openCompanionPreview/,
)?.[0] || "";
const openPreviewFunction = mainSource.match(
  /async function openCompanionPreview[\s\S]*?\n}\n\nfunction createCompanionMenuWindow/,
)?.[0] || "";

assert.match(mainSource, /const MAGIC_PREVIEW_MIN_WIDTH = 360/);
assert.match(mainSource, /const MAGIC_PREVIEW_MIN_HEIGHT = 280/);
assert.match(mainSource, /const MAGIC_PREVIEW_MAX_RATIO = 0\.85/);
assert.match(mainSource, /const MAGIC_PREVIEW_MAX_SOURCE_EDGE = 1600/);
assert.match(createPreviewFunction, /new BrowserWindow\(\{/);
assert.match(createPreviewFunction, /title: MAGIC_BAR_PREVIEW_WINDOW_TITLE/);
assert.match(createPreviewFunction, /frame: false/);
assert.match(createPreviewFunction, /alwaysOnTop: true/);
assert.match(createPreviewFunction, /skipTaskbar: true/);
assert.match(createPreviewFunction, /resizable: true/);
assert.match(createPreviewFunction, /maximizable: false/);
assert.match(createPreviewFunction, /fullscreenable: false/);
assert.match(createPreviewFunction, /hasShadow: true/);
assert.match(createPreviewFunction, /transparent: false/);
assert.doesNotMatch(createPreviewFunction, /transparent: true/);
assert.doesNotMatch(createPreviewFunction, /setShape/);
assert.match(createPreviewFunction, /sandbox: true/);
assert.match(createPreviewFunction, /contextIsolation: true/);
assert.match(createPreviewFunction, /nodeIntegration: false/);
assert.match(createPreviewFunction, /setWindowOpenHandler\(\(\) => \(\{ action: "deny" \}\)\)/);
assert.match(createPreviewFunction, /loadFile\(rendererPath\("companion-preview\.html"\)\)/);
assert.match(createPreviewFunction, /setTimeout\(\(\) => \{[\s\S]*?120\)/);

assert.match(openPreviewFunction, /candidate\.id === itemId/);
assert.match(openPreviewFunction, /item\.type !== "image"/);
assert.match(openPreviewFunction, /nativeImage\.createFromPath\(item\.filePath\)/);
assert.match(openPreviewFunction, /source\.resize\(\{ width: MAGIC_PREVIEW_MAX_SOURCE_EDGE \}\)/);
assert.match(openPreviewFunction, /source\.resize\(\{ height: MAGIC_PREVIEW_MAX_SOURCE_EDGE \}\)/);
assert.doesNotMatch(openPreviewFunction, /resize\(\{[^}]*width:[^}]*height:/);
assert.match(openPreviewFunction, /screen\.getDisplayMatching\(companionWindow\.getBounds\(\)\)/);
assert.match(openPreviewFunction, /MAGIC_PREVIEW_MAX_RATIO/);
assert.match(openPreviewFunction, /webContents\.send\("companion:preview-data"/);

assert.match(mainSource, /ipcMain\.handle\("companion:open-preview"/);
assert.match(mainSource, /ipcMain\.on\("companion:preview-close"/);
assert.match(mainSource, /rendererPath\("companion-preview\.html"\)/);
assert.match(mainSource, /companionWindow\.on\("hide", \(\) => \{[\s\S]*hideCompanionPreview\(\)/);
assert.match(mainSource, /companionWindow\.on\("closed", \(\) => \{[\s\S]*destroyCompanionPreviewWindow\(\)/);

assert.match(preloadSource, /openPreview\(itemId: string\)/);
assert.match(preloadSource, /companion:open-preview/);
assert.match(preloadSource, /companion:preview-data/);
assert.match(preloadSource, /companion:preview-close/);
assert.match(preloadSource, /onPreviewData/);
assert.match(preloadSource, /closePreview/);

assert.match(previewHtml, /<title>ChatGPT Magic Bar Preview<\/title>/);
assert.match(previewHtml, /default-src 'self'; img-src 'self' data:; style-src 'self'; script-src 'self'/);
assert.match(previewCss, /background: var\(--background\)/);
assert.match(previewCss, /object-fit: contain/);
assert.match(previewCss, /-webkit-app-region: drag/);
assert.match(previewCss, /-webkit-app-region: no-drag/);
assert.match(previewSource, /companionApi\.onPreviewData/);
assert.match(previewSource, /companionApi\.closePreview\(\)/);
assert.doesNotMatch(previewSource, /window\.close\(/);

assert.doesNotMatch(companionHtml, /<dialog/);
assert.doesNotMatch(companionSource, /showModal\(|previewDialog|previewClose/);
assert.match(companionSource, /companionApi\.openPreview\(item\.id\)/);
const removedStateField = ["preview", "DataUrl"].join("");
assert.equal(mainSource.includes(removedStateField), false);
assert.equal(companionSource.includes(removedStateField), false);

assert.match(kwinSource, /const previewTitle = "ChatGPT Magic Bar Preview"/);
assert.match(kwinSource, /function placePreview\(\)/);
assert.match(kwinSource, /function placeMenu\(\)/);
assert.match(kwinSource, /const menuTitle = "ChatGPT Magic Bar Menu"/);

class MockSignal {
  constructor() { this.callbacks = []; }
  connect(callback) { this.callbacks.push(callback); }
  emit(...args) { this.callbacks.forEach((callback) => callback(...args)); }
}

function mockWindow(caption, geometry, outputGeometry) {
  const frameGeometryChanged = new MockSignal();
  let currentGeometry = { ...geometry };
  return {
    caption,
    output: { geometry: { ...outputGeometry } },
    frameGeometryChanged,
    keepAbove: false,
    onAllDesktops: false,
    skipTaskbar: false,
    skipSwitcher: false,
    get frameGeometry() { return { ...currentGeometry }; },
    set frameGeometry(value) {
      currentGeometry = { ...value };
      frameGeometryChanged.emit();
    },
  };
}

const outputGeometry = { x: 1_920, y: 0, width: 2_560, height: 1_440 };
const windows = [];
const windowAdded = new MockSignal();
const windowRemoved = new MockSignal();
const workspace = {
  windowList: () => [...windows],
  windowAdded,
  windowRemoved,
  clientArea: () => ({ ...outputGeometry }),
};
vm.runInNewContext(companionKWinControllerScriptForTests(), {
  workspace,
  KWin: { FullScreenArea: 0 },
});

const bar = mockWindow("ChatGPT Magic Bar", { x: 2_100, y: 1_100, width: 680, height: 116 }, outputGeometry);
windows.push(bar);
windowAdded.emit(bar);
const preview = mockWindow("ChatGPT Magic Bar Preview", { x: 0, y: 0, width: 800, height: 600 }, outputGeometry);
windows.push(preview);
windowAdded.emit(preview);
assert.deepEqual(preview.frameGeometry, { x: 2_800, y: 420, width: 800, height: 600 });
assert.equal(preview.keepAbove, true);
assert.equal(preview.skipTaskbar, true);
assert.equal(preview.skipSwitcher, true);

const menu = mockWindow("ChatGPT Magic Bar Menu", { x: 0, y: 0, width: 280, height: 228 }, outputGeometry);
windows.push(menu);
windowAdded.emit(menu);
assert.equal(menu.frameGeometry.x, 2_100);
assert.equal(menu.keepAbove, true);

console.log("Dedicated Magic Bar image preview tests passed.");
