"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const {
  appendCompanionPromptText,
  emptyCompanionDraft,
  initialCompanionDraft,
  reconcileCompanionDraftProjectState,
  retargetCompanionDraftState,
  touchCompanionDraftState,
  updateCompanionDraftState,
} = require("../dist/companion-draft.js");
const {
  companionKWinControllerScriptForTests,
} = require("../dist/kwin-companion-controller.js");

const projectA = "chatgpt-project:g-p-a";
const projectB = "chatgpt-project:g-p-b";
const known = new Set([projectA, projectB]);
const isKnown = (id) => known.has(id);

const empty = emptyCompanionDraft();
assert.deepEqual(empty, {
  version: 0,
  prompt: "",
  securityAudit: false,
  qualityAudit: false,
  chatMode: "new",
  projectEnabled: false,
  projectMode: "existing",
  newProjectName: "",
});

const initial = initialCompanionDraft(1, projectA);
assert.equal(initial.projectEnabled, true);
assert.equal(initial.selectedProjectId, projectA);

const updated = updateCompanionDraftState(initial, {
  prompt: "Analyse ce projet",
  securityAudit: true,
  qualityAudit: true,
  chatMode: "resume",
  projectEnabled: true,
  projectMode: "existing",
  selectedProjectId: projectB,
  newProjectName: "",
}, isKnown);
assert.ok(updated);
assert.equal(updated.invalidProject, false);
assert.deepEqual(updated.draft, {
  version: 2,
  prompt: "Analyse ce projet",
  securityAudit: true,
  qualityAudit: true,
  chatMode: "resume",
  projectEnabled: true,
  projectMode: "existing",
  selectedProjectId: projectB,
  newProjectName: "",
});

const creating = updateCompanionDraftState(updated.draft, {
  ...updated.draft,
  projectEnabled: false,
  projectMode: "create",
  newProjectName: "Projet à reprendre",
}, isKnown);
assert.ok(creating);
assert.equal(creating.draft.projectEnabled, false);
assert.equal(creating.draft.projectMode, "create");
assert.equal(creating.draft.newProjectName, "Projet à reprendre");

const retargeted = retargetCompanionDraftState(creating.draft, projectA);
assert.equal(retargeted.projectEnabled, true);
assert.equal(retargeted.projectMode, "existing");
assert.equal(retargeted.selectedProjectId, projectA);
assert.equal(retargeted.newProjectName, "");
assert.equal(retargeted.chatMode, "new");

known.delete(projectA);
const missing = reconcileCompanionDraftProjectState(retargeted, isKnown);
assert.equal(missing.disabledMissingProject, true);
assert.equal(missing.draft.projectEnabled, false);
assert.equal(missing.draft.selectedProjectId, undefined);
assert.equal(missing.draft.prompt, "Analyse ce projet");

const invalid = updateCompanionDraftState(missing.draft, {
  ...missing.draft,
  projectEnabled: true,
  projectMode: "existing",
  selectedProjectId: "chatgpt-project:missing",
}, isKnown);
assert.ok(invalid);
assert.equal(invalid.invalidProject, true);
assert.equal(invalid.draft.projectEnabled, false);

assert.equal(touchCompanionDraftState(invalid.draft).version, invalid.draft.version + 1);
const appendedPrompt = appendCompanionPromptText({ ...initial, prompt: "Déjà présent" }, "Nouveau texte");
assert.equal(appendedPrompt.prompt, "Déjà présent\n\nNouveau texte");
assert.equal(appendedPrompt.version, initial.version + 1);
assert.equal(appendedPrompt.selectedProjectId, initial.selectedProjectId);
assert.equal(appendCompanionPromptText(appendedPrompt, "   "), appendedPrompt);
assert.equal(appendCompanionPromptText({ ...initial, prompt: "x".repeat(11_999) }, "suite").prompt.length, 12_000);
assert.equal(updateCompanionDraftState(empty, { prompt: "x".repeat(13_000) }, isKnown).draft.prompt.length, 12_000);
assert.equal(updateCompanionDraftState(empty, { newProjectName: "x".repeat(150) }, isKnown).draft.newProjectName.length, 120);

const root = path.join(__dirname, "..");
const mainSource = fs.readFileSync(path.join(root, "src/main.ts"), "utf8");
const rendererSource = fs.readFileSync(path.join(root, "renderer/companion.js"), "utf8");
const settingsRendererSource = fs.readFileSync(path.join(root, "renderer/settings.js"), "utf8");
const settingsCssSource = fs.readFileSync(path.join(root, "renderer/settings.css"), "utf8");
const preloadSource = fs.readFileSync(path.join(root, "src/companion-preload.ts"), "utf8");
const desktopPreloadSource = fs.readFileSync(path.join(root, "src/preload.ts"), "utf8");
const settingsSource = fs.readFileSync(path.join(root, "src/settings-store.ts"), "utf8");
const packageSource = fs.readFileSync(path.join(root, "package.json"), "utf8");

const showFunction = mainSource.match(/async function showCompanionWindow[\s\S]*?\n}\n\nasync function chooseCompanionFiles/)?.[0] || "";
const createCompanionFunction = mainSource.match(/function createCompanionWindow[\s\S]*?\n}\n\nfunction createCompanionMenuWindow/)?.[0] || "";
const layoutHandler = mainSource.match(/ipcMain\.on\("companion:layout"[\s\S]*?\n  \}\);/)?.[0] || "";
assert.doesNotMatch(showFunction, /companionItems\s*=\s*\[\]/);
assert.match(mainSource, /ipcMain\.handle\("companion:update-draft"/);
assert.match(mainSource, /if \(ok\) \{[\s\S]*?completeCompanionDraftTransfer/);
assert.match(mainSource, /retargetCompanionDraftToCreatedProject\(selectedProject\)/);
assert.match(mainSource, /if \(submittedVersion === companionDraft\.version\)/);
assert.match(mainSource, /function toggleCompanionWindow\(\)/);
assert.match(mainSource, /hasExplicitContext[\s\S]*showCompanionWindow[\s\S]*toggleCompanionWindow/);
assert.match(mainSource, /globalShortcut\.register\(accelerator,[\s\S]*toggleCompanionWindow\(\)/);
assert.doesNotMatch(mainSource, /companionSessionBounds|rememberCompanionBounds/);
assert.match(mainSource, /const needsInitialPosition = !companionWindow \|\| companionWindow\.isDestroyed\(\)/);
assert.match(mainSource, /if \(needsInitialPosition\) \{\s*createCompanionWindow\(\);\s*positionCompanionInitially\(\);\s*\}/);
assert.equal((mainSource.match(/positionCompanionInitially\(\);/g) || []).length, 1);
assert.match(mainSource, /const MAGIC_BAR_MIN_HEIGHT = 80/);
assert.match(createCompanionFunction, /resizable: true/);
assert.match(createCompanionFunction, /minHeight: MAGIC_BAR_FALLBACK_HEIGHT/);
assert.match(createCompanionFunction, /maxHeight: MAGIC_BAR_FALLBACK_HEIGHT/);
assert.match(createCompanionFunction, /maximizable: false/);
assert.match(mainSource, /startKWinCompanionController\(\)/);
assert.match(mainSource, /stopKWinCompanionController\(\)/);
assert.doesNotMatch(mainSource, /positionCompanionMenuWithKWin|setTimeout\(positionCompanionMenu/);
assert.doesNotMatch(layoutHandler, /getBounds\(\)|setBounds\(/);
assert.match(layoutHandler, /getSize\(\)/);
assert.match(layoutHandler, /setSize\(width, height, false\)/);
assert.match(layoutHandler, /setMaximumSize\(Math\.max\(520, workArea\.width\), height\)/);
assert.match(layoutHandler, /setMinimumSize\(520, height\)/);
assert.doesNotMatch(mainSource, /document\.documentElement\.classList\.toggle\('dark'/);
assert.doesNotMatch(mainSource, /document\.documentElement\.style\.colorScheme/);
assert.match(mainSource, /before-quit[\s\S]*rmSync\(COMPANION_TEMP_DIR, \{ recursive: true, force: true \}\)/);
assert.match(rendererSource, /draftVersion:/);
assert.match(rendererSource, /onHidden\(\(\) =>/);
assert.match(rendererSource, /window\.companionApi\.setExpanded\(toolsOpen\)/);
assert.match(rendererSource, /function resizePrompt\(\)/);
assert.match(rendererSource, /Math\.min\(promptInput\.scrollHeight, maxHeight\)/);
assert.match(rendererSource, /lineHeight \* promptMaxLines/);
assert.match(rendererSource, /state\.promptMaxLines/);
assert.match(mainSource, /promptMaxLines: currentSettings\.companionPromptMaxLines/);
assert.match(rendererSource, /window\.innerWidth.*window\.innerHeight/);
assert.match(rendererSource, /window\.addEventListener\("resize", resizePrompt\)/);
assert.doesNotMatch(rendererSource, /lastOpenId|state\.openId/);
assert.match(preloadSource, /companion:update-draft/);
assert.doesNotMatch(settingsSource, /CompanionDraftState|companionDraft/);
assert.match(mainSource, /settingsWindow\.webContents\.send\("settings:theme"/);
assert.match(mainSource, /darkMode: nativeTheme\.shouldUseDarkColors/);
assert.match(desktopPreloadSource, /onSettingsTheme/);
assert.match(settingsRendererSource, /classList\.toggle\("light", !darkMode\)/);
assert.match(settingsRendererSource, /onSettingsTheme\(applySettingsTheme\)/);
assert.match(settingsCssSource, /:root\.light/);
assert.match(settingsCssSource, /background: var\(--background\)/);
assert.match(mainSource, /nativeTheme\.shouldUseDarkColors \? "tray-icon\.png" : "tray-icon-light\.png"/);
assert.match(mainSource, /tray\.setImage\(currentTrayIcon\(\)\)/);
assert.match(packageSource, /assets\/tray-icon-light\.png/);
assert.ok(fs.existsSync(path.join(root, "assets/tray-icon-light.png")));

class MockSignal {
  constructor() { this.callbacks = []; }
  connect(callback) { this.callbacks.push(callback); }
  emit(...args) { this.callbacks.forEach((callback) => callback(...args)); }
}

function mockWindow(caption, geometry) {
  const frameGeometryChanged = new MockSignal();
  let currentGeometry = { ...geometry };
  return {
    caption,
    output: { geometry: { x: 0, y: 0, width: 1_920, height: 1_080 } },
    frameGeometryChanged,
    get frameGeometry() { return { ...currentGeometry }; },
    set frameGeometry(value) {
      currentGeometry = { ...value };
      frameGeometryChanged.emit();
    },
  };
}

const windows = [];
const windowAdded = new MockSignal();
const windowRemoved = new MockSignal();
const workspace = {
  windowList: () => [...windows],
  windowAdded,
  windowRemoved,
  clientArea: () => ({ x: 0, y: 0, width: 1_920, height: 1_080 }),
};
vm.runInNewContext(companionKWinControllerScriptForTests(), {
  workspace,
  KWin: { FullScreenArea: 0 },
});

const firstBar = mockWindow("ChatGPT Magic Bar", { x: 500, y: 400, width: 680, height: 116 });
windows.push(firstBar);
windowAdded.emit(firstBar);
firstBar.frameGeometry = { x: 120, y: 0, width: 680, height: 116 };
windows.splice(windows.indexOf(firstBar), 1);
windowRemoved.emit(firstBar);

const remappedBar = mockWindow("ChatGPT Magic Bar", { x: 532, y: 465, width: 680, height: 140 });
windows.push(remappedBar);
windowAdded.emit(remappedBar);
assert.deepEqual(remappedBar.frameGeometry, { x: 120, y: 0, width: 680, height: 140 });

const menu = mockWindow("ChatGPT Magic Bar Menu", { x: 800, y: 500, width: 280, height: 270 });
windows.push(menu);
windowAdded.emit(menu);
assert.equal(menu.frameGeometry.x, 120);
assert.equal(menu.frameGeometry.y, 142);

remappedBar.frameGeometry = { x: 300, y: 500, width: 680, height: 140 };
assert.equal(menu.frameGeometry.x, 300);
assert.equal(menu.frameGeometry.y, 228);

console.log("Companion session draft lifecycle tests passed.");
