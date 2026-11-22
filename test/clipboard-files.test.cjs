const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { parseClipboardFileUris } = require("../dist/clipboard-files.js");

const uriList = [
  "copy",
  "# commentaire",
  pathToFileURL("/tmp/Image avec espace.png").href,
  pathToFileURL("/tmp/document.pdf").href,
  pathToFileURL("/tmp/Image avec espace.png").href,
  "https://example.com/image.png",
  "URI invalide",
].join("\r\n");

assert.deepEqual(parseClipboardFileUris(uriList), [
  "/tmp/Image avec espace.png",
  "/tmp/document.pdf",
]);

const manyUris = Array.from({ length: 60 }, (_, index) => pathToFileURL(`/tmp/${index}.png`).href)
  .join("\0");
assert.equal(parseClipboardFileUris(manyUris).length, 50);
assert.deepEqual(parseClipboardFileUris("cut\nfile:///tmp/example.png"), ["/tmp/example.png"]);

const root = path.join(__dirname, "..");
const mainSource = fs.readFileSync(path.join(root, "src/main.ts"), "utf8");
const menuHtml = fs.readFileSync(path.join(root, "renderer/companion-menu.html"), "utf8");
const menuSource = fs.readFileSync(path.join(root, "renderer/companion-menu.js"), "utf8");
const companionSource = fs.readFileSync(path.join(root, "renderer/companion.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(root, "src/companion-preload.ts"), "utf8");
const importFunction = mainSource.match(
  /async function importClipboardToCompanion[\s\S]*?\n}\n\nasync function waitForComposer/,
)?.[0] || "";

assert.equal((menuHtml.match(/id="clipboard-import"/g) || []).length, 1);
assert.doesNotMatch(menuHtml, /clipboard-text|clipboard-image/);
assert.match(menuSource, /Ajouter depuis le presse-papiers/);
assert.match(menuSource, /addClipboard\(\)/);
assert.doesNotMatch(menuSource, /addClipboardText|addClipboardImage/);
assert.match(preloadSource, /companion:clipboard-import/);
assert.doesNotMatch(preloadSource, /companion:clipboard-(?:text|image)/);
assert.match(mainSource, /ipcMain\.handle\("companion:clipboard-import"/);
assert.match(importFunction, /appendClipboardTextToPrompt\(text\)/);
assert.match(importFunction, /showCompanionError\("clipboardEmpty"\)/);
assert.ok(importFunction.indexOf("clipboardFilePayload()") < importFunction.indexOf("clipboard.readImage"));
assert.ok(importFunction.indexOf("clipboard.readImage") < importFunction.indexOf("clipboard.readText"));
assert.match(companionSource, /clipboardData\.getData\("text\/plain"\)/);
assert.match(companionSource, /await persistDraft\(\);[\s\S]*await window\.companionApi\.addClipboard\(\)/);
assert.doesNotMatch(companionSource, /addClipboardImage|addClipboardText/);

console.log("Clipboard file URI tests passed.");
