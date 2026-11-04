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
assert.ok(vendoredMain.includes("ns.createRootFolderForProject"),
  "scoped root folder API must exist");
assert.ok(vendoredMain.includes("project-not-expanded"),
  "missing project scope must not fall back to global history");
assert.ok(!vendoredMain.includes("Ctrl+Alt+Shift+F") && !vendoredMain.includes("seedInitialFolder"),
  "no keyboard creation shortcut or automatic starter folder");
assert.ok(actions.includes("glyn-project-add-folder"),
  "project row button must be wired");
assert.ok(actions.includes('action.addEventListener("click"'),
  "click activation must be supported");
assert.ok(actions.includes("projectIdFromHref"),
  "projects must be identified by real project ID, not title");
assert.ok(stylesheet.includes(".glyn-project-add-folder"),
  "project + must be styled");
const adapter = fs.readFileSync(path.join(directory, "siteAdapter.js"), "utf8");
assert.ok(adapter.includes('a[href*="/g/g-p-"][href*="/c/"]'),
  "project discovery must support ChatGPT's modern unmarked chat links");
assert.ok(adapter.includes("nonProjectChatLinks"),
  "global history must exclude native project conversation lists");
assert.ok(vendoredMain.includes("initOnceHistoryFound(site.findHistoryContainer());"),
  "the controller must start even when no global history exists");
assert.ok(vendoredMain.includes("if (historyDiv) {"),
  "global history scope is optional");
assert.ok(vendoredMain.includes("if (!site.supportsProjectFolders() || !storageService) return;"),
  "project scope discovery must not depend on the global history scope");
assert.ok(actions.includes("function isSidebarProjectRow(") &&
  !actions.includes("ns.historyDiv && document.contains(ns.historyDiv)"),
  "project + must not require obsolete global history DOM");
// Reproduce the reported ChatGPT layout: project conversations exist, but no
// global #history/recents list. This must still discover a per-project tree.
const fakeEl = (tag) => ({
  tagName: tag, nodeType: 1, children: [], parentElement: null,
  classList: { contains: () => false },
  getAttribute: () => null, matches: () => false,
  querySelector: () => null, querySelectorAll: () => [],
  contains(node) { return this === node || this.children.some((child) => child.contains(node)); }
});
const host = fakeEl("DIV");
const projectList = fakeEl("UL");
host.children.push(projectList);
projectList.parentElement = host;
const projectLinks = [];
for (let i = 0; i < 2; i += 1) {
  const row = fakeEl("LI");
  const link = fakeEl("A");
  row.parentElement = projectList;
  row.children.push(link);
  row.querySelector = () => link;
  link.parentElement = row;
  link.getAttribute = (name) => name === "href" ? `/g/g-p-abc/c/example-${i}` : null;
  link.closest = () => null;
  projectList.children.push(row);
  projectLinks.push(link);
}
const projectSelector = 'a[href*="/g/g-p-"][href*="/c/"]';
const fakeDocument = {
  querySelectorAll: (selector) => selector === projectSelector ? projectLinks : [],
  querySelector: () => null,
};
const fakeWindow = {
  GlynGPT: {},
  location: { hostname: "chatgpt.com", pathname: "/g/g-p-abc/project", origin: "https://chatgpt.com" }
};
new vm.Script(adapter, { filename: "siteAdapter.js" }).runInNewContext({
  document: fakeDocument, window: fakeWindow
});
const adaptedSite = fakeWindow.GlynGPT.site;
assert.equal(adaptedSite.findHistoryContainer(), null, "the global history is absent");
const foundProjects = adaptedSite.findProjectChatLists();
assert.equal(foundProjects.length, 1, "must still find the project chat list");
assert.equal(foundProjects[0].projectId, "g-p-abc");
assert.equal(foundProjects[0].container, projectList);
adaptedSite.registerRowContainer(projectList);
assert.equal(adaptedSite.childRows(projectList).length, 2, "project chats must be draggable rows");
console.log("NestFolders manifest, packaging, modern project DOM and isolated scopes passed.");
