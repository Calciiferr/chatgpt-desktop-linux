const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const directory = path.join(root, "vendor", "nestfolders");
const manifest = JSON.parse(fs.readFileSync(path.join(directory, "manifest.json"), "utf8"));
const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
assert.equal(manifest.manifest_version, 3);
assert.ok(manifest.permissions.includes("storage"));
assert.deepEqual(manifest.host_permissions, ["https://chatgpt.com/*"]);
assert.equal(manifest.content_scripts.length, 1);
for (const asset of [...manifest.content_scripts[0].js, ...manifest.content_scripts[0].css]) {
  assert.ok(fs.statSync(path.join(directory, asset)).isFile(), `missing extension asset: ${asset}`);
}
assert.ok(fs.readFileSync(path.join(directory, "main.js"), "utf8").includes('area: "local"'),
  "Electron only supports chrome.storage.local; upstream sync must be adapted");
assert.ok(pkg.build.extraResources.some((asset) =>
  asset.from === "vendor/nestfolders" && asset.to === "nestfolders"),
  "NestFolders must be shipped outside the app.asar in packaged builds");
const main = fs.readFileSync(path.join(root, "src", "main.ts"), "utf8");
assert.ok(main.includes("await loadNestFoldersExtension()"),
  "Extension must load from the ready lifecycle");
const preload = fs.readFileSync(path.join(root, "src", "chat-tab-preload.ts"), "utf8");
assert.ok(!preload.includes("conversation-colors:"), "old color UI must not be injected");
assert.ok(!main.includes("ConversationColorStore"), "old color IPC must not remain");
const vm = require("node:vm");
const vendoredMain = fs.readFileSync(path.join(directory, "main.js"), "utf8");
const actions = fs.readFileSync(path.join(directory, "electronProjectActions.js"), "utf8");
const stylesheet = fs.readFileSync(path.join(directory, "folders.css"), "utf8");
assert.ok(manifest.content_scripts[0].js.indexOf("electronProjectActions.js") >
  manifest.content_scripts[0].js.indexOf("main.js"), "project action requires initialized controller");
for (const file of manifest.content_scripts[0].js) {
  new vm.Script(fs.readFileSync(path.join(directory, file), "utf8"), { filename: file });
}
assert.match(vendoredMain, /ns\\.createRootFolderForProject\\s*=/,
  "scoped root folder API must exist");
assert.match(vendoredMain, /project-not-expanded/,
  "missing project scope must not fall back to global history");
assert.doesNotMatch(vendoredMain, /Ctrl\\+Alt\\+Shift\\+F|seedInitialFolder/,
  "no keyboard creation shortcut or automatic starter folder");
assert.match(actions, /glyn-project-add-folder/,
  "project row button must be wired");
assert.match(actions, /action\\.addEventListener\\("click"/,
  "click activation must be supported");
assert.match(actions, /projectIdFromHref/,
  "projects must be identified by real project ID, not title");
assert.match(stylesheet, /\\.glyn-project-add-folder/,
  "project + must be styled");
console.log("NestFolders extension manifest, packaging, storage and color migration checks passed.");
