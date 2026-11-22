"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { acceleratorToQtKey, kdeShortcutActionDetails } = require("../dist/kde-shortcuts.js");

assert.equal(acceleratorToQtKey("Ctrl+Alt+G"), 201326663);
assert.equal(acceleratorToQtKey("Ctrl+Shift+Space"), 100663328);
assert.equal(acceleratorToQtKey("Ctrl+F12"), 83886139);
assert.equal(acceleratorToQtKey("Ctrl+NoSuchKey"), null);
assert.deepEqual(kdeShortcutActionDetails("main"), {
  id: "Toggle",
  name: "Afficher/masquer ChatGPT",
});
assert.deepEqual(kdeShortcutActionDetails("companion"), {
  id: "Companion",
  name: "Ouvrir la Magic Bar",
});
assert.notEqual(kdeShortcutActionDetails("main").id, kdeShortcutActionDetails("companion").id);

const source = fs.readFileSync(path.join(__dirname, "../src/kde-shortcuts.ts"), "utf8");
const syncFunction = source.match(/export function syncKdeShortcut[\s\S]*?\n}/)?.[0] || "";
assert.match(syncFunction, /runGdbus\("doRegister", \[actionId\]\)/);
assert.match(syncFunction, /action === "main"[\s\S]*assignMainShortcut\(actionId, keys\)[\s\S]*setForeignShortcut/);
assert.ok(
  syncFunction.indexOf('runGdbus("doRegister", [actionId]') <
    syncFunction.indexOf("assignMainShortcut(actionId, keys)"),
  "the desktop action is registered before its shortcut is assigned",
);
assert.match(syncFunction, /runGdbus\("shortcut", \[actionId\]\)/);
assert.match(syncFunction, /runGdbus\("defaultShortcut", \[actionId\]\)/);
assert.match(syncFunction, /id: "_launch", name: "ChatGPT"/);
assert.match(syncFunction, /assignMainShortcut\(legacyActionId, "\[\]"\)/);
assert.match(source, /runGdbus\("setShortcut", \[actionId, keys, "7"\]\)/);
assert.match(syncFunction, /runGdbus\("setForeignShortcut", \[actionId, keys\]\)/);

const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, "../package.json"), "utf8"));
const linux = packageJson.build.linux;
assert.deepEqual(linux.executableArgs, ["--toggle"]);
assert.match(linux.desktop.entry.Actions, /(?:^|;)Toggle;/);
assert.equal(linux.desktop.entry["X-KDE-Shortcuts"], undefined);
assert.equal(linux.desktop.desktopActions.Toggle.Exec, "chatgpt-desktop-linux --toggle");
assert.equal(linux.desktop.desktopActions.Toggle["X-KDE-Shortcuts"], "Ctrl+Alt+G");
assert.equal(linux.desktop.desktopActions.Companion["X-KDE-Shortcuts"], undefined, "the Magic Bar shortcut is only assigned while the extension is enabled");

console.log("KDE shortcut conversion and registration tests passed.");
