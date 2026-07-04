"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { acceleratorToQtKey } = require("../dist/kde-shortcuts.js");

assert.equal(acceleratorToQtKey("Ctrl+Alt+G"), 201326663);
assert.equal(acceleratorToQtKey("Ctrl+Shift+Space"), 100663328);
assert.equal(acceleratorToQtKey("Ctrl+F12"), 83886139);
assert.equal(acceleratorToQtKey("Ctrl+NoSuchKey"), null);

const source = fs.readFileSync(path.join(__dirname, "../src/kde-shortcuts.ts"), "utf8");
const syncFunction = source.match(/export function syncKdeShortcut[\s\S]*?\n}/)?.[0] || "";
assert.match(syncFunction, /runGdbus\("doRegister", \[actionId\]\)/);
assert.match(syncFunction, /runGdbus\("setForeignShortcut", \[actionId, keys\]\)/);
assert.ok(
  syncFunction.indexOf('runGdbus("doRegister"') <
    syncFunction.indexOf('runGdbus("setForeignShortcut"'),
  "the desktop action is registered before its shortcut is assigned",
);
assert.match(syncFunction, /runGdbus\("shortcut", \[actionId\]\)/);

console.log("KDE shortcut conversion and registration tests passed.");
