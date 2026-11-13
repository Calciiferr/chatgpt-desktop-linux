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
const menuEntry = fs.readFileSync(path.join(directory, "projectMenuEntry.js"), "utf8");
const stylesheet = fs.readFileSync(path.join(directory, "folders.css"), "utf8");
assert.ok(!manifest.content_scripts[0].js.includes("electronProjectActions.js"),
  "the floating project + overlay must be gone");
assert.ok(manifest.content_scripts[0].js.indexOf("projectMenuEntry.js") >
  manifest.content_scripts[0].js.indexOf("main.js"), "project menu entry requires initialized controller");
for (const file of manifest.content_scripts[0].js) {
  new vm.Script(fs.readFileSync(path.join(directory, file), "utf8"), { filename: file });
}
assert.ok(vendoredMain.includes("ns.createRootFolderForProject"),
  "scoped root folder API must exist");
assert.ok(vendoredMain.includes("project-not-expanded"),
  "missing project scope must not fall back to global history");
assert.ok(!vendoredMain.includes("Ctrl+Alt+Shift+F") && !vendoredMain.includes("seedInitialFolder"),
  "no keyboard creation shortcut or automatic starter folder");
assert.ok(!stylesheet.includes(".glyn-project-add-folder"), "no + button styles");
assert.ok(menuEntry.includes('aria-labelledby') && menuEntry.includes("Nouveau dossier"),
  "folder creation lives in the native project menu, linked through aria-labelledby");
assert.ok(menuEntry.includes("projectIdFromHref"),
  "projects must be identified by real project ID, not title");
for (const forbidden of ["setInterval", '"scroll"', '"pointermove"', "getComputedStyle"]) {
  assert.ok(!menuEntry.includes(forbidden), `project menu entry must not poll or track ${forbidden}`);
}
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
assert.ok(!/\binit\(\)/.test(vendoredMain), "reinit must not call a non-existent init()");
assert.ok(vendoredMain.includes("data-cdl-no-nestfolders"), "scan window must be excluded");
assert.ok(vendoredMain.includes("chrome.storage.onChanged"), "trees resync when another tab writes");
const folderManagerSrc = fs.readFileSync(path.join(directory, "folderManager.js"), "utf8");
assert.ok(!folderManagerSrc.includes("ResizeObserver"), "no per-folder ResizeObserver");
assert.ok(!folderManagerSrc.includes("this.counter += 1"), "folder ids are not a per-tab counter");
const draggableSrc = fs.readFileSync(path.join(directory, "draggableElement.js"), "utf8");
assert.ok(/onDragStart\(evt\) \{[\s\S]{0,600}evt\.stopPropagation\(\);/.test(draggableSrc),
  "our dragstart must not reach ChatGPT's handler, which cancels native drags");
assert.ok(!draggableSrc.includes('band.removeEventListener("drop"'),
  "a folder keeps its drop zone after being dragged itself");
assert.ok(fs.readFileSync(path.join(root, "src", "main.ts"), "utf8").includes("project-scan-preload.js"),
  "hidden project scan window gets the exclusion preload");
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

// ---- Concurrency between tabs: two trees over the same stored keys -----------------
(async () => {
  const store = new Map();
  const listeners = [];
  const clone = (v) => JSON.parse(JSON.stringify(v));
  const chromeStub = { storage: { local: {
    get(keys, cb) {
      const out = {};
      const list = keys === null ? [...store.keys()] : Array.isArray(keys) ? keys : Object.keys(keys);
      list.forEach((k) => { if (store.has(k)) out[k] = clone(store.get(k)); });
      setTimeout(() => cb(out), 1);
    },
    set(items, cb) { Object.entries(items).forEach(([k, v]) => store.set(k, clone(v))); setTimeout(() => cb && cb(), 1); },
    remove(keys, cb) { [].concat(keys).forEach((k) => store.delete(k)); setTimeout(() => cb && cb(), 1); },
  }, onChanged: { addListener: (fn) => listeners.push(fn) } } };
  let chain = Promise.resolve();
  const navigatorStub = { locks: { request: (_name, fn) => { const run = chain.then(fn); chain = run.catch(() => {}); return run; } } };
  const siteStub = {
    storageKey: (k) => k, compactChatId: (h) => h, expandChatId: (i) => i,
    queryChatRows: () => [], isChatRow: () => false, hrefOf: () => "", titleOf: () => "",
  };
  const context = { window: { GlynGPT: { site: siteStub } }, chrome: chromeStub, navigator: navigatorStub,
    console: { warn() {}, info() {}, log() {} }, setTimeout, clearTimeout, JSON, Map, Set, Promise, Array, Object };
  vm.createContext(context);
  for (const file of ["storageService.js", "layoutState.js"]) {
    new vm.Script(fs.readFileSync(path.join(directory, file), "utf8"), { filename: file }).runInContext(context);
  }
  const { StorageService, LayoutState } = context.window.GlynGPT;
  const wrapper = (id, name) => ({
    classList: { contains: (c) => c === "glyn-folder-wrapper" },
    __glynFolderItem: { id: `folder-${id}`, data: { name }, contentsEl: { children: [] } },
  });
  const tree = () => {
    const historyDiv = { children: [] };
    const fm = { historyDiv, folders: [], suspendNotifications() {}, resumeNotifications() {}, clearAllFolders() {},
      getRootChatLinks: () => [], removeDuplicateWrappers() {}, ensureFolderMounts() {}, pinFoldersAtTop() {},
      createFolder: () => null, getRecordById: () => null };
    const hm = { suspendNotifications() {}, resumeNotifications() {}, resetFromLinks() {} };
    const storage = new StorageService({ area: "local" });
    const layout = new LayoutState(storage, fm, hm, { keyPrefix: "p:g-p-test:" });
    let conflicts = 0;
    layout.onConflict = () => { conflicts += 1; };
    return { layout, historyDiv, conflicts: () => conflicts };
  };
  const tabA = tree();
  const tabB = tree();
  await tabA.layout.restore();
  await tabB.layout.restore();
  tabA.historyDiv.children = [wrapper(101, "A")];
  tabB.historyDiv.children = [wrapper(202, "B")];
  // Both tabs save "at the same time": the lock serialises them, the revision check
  // refuses the stale one instead of letting it overwrite.
  const [savedA, savedB] = await Promise.all([tabA.layout.save(), tabB.layout.save()]);
  assert.equal(savedA, true, "first writer succeeds");
  assert.equal(savedB, false, "stale writer is refused");
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(tabB.conflicts(), 1, "stale tree is told to reload");
  assert.equal(store.get("p:g-p-test:f101").n, "A", "first writer's folder is kept");
  assert.ok(!store.has("p:g-p-test:f202"), "stale snapshot wrote nothing");
  assert.equal(store.get("p:g-p-test:f0").r, 1);
  // After reloading, tab B can write again, on top of A's change.
  await tabB.layout.restore();
  tabB.historyDiv.children = [wrapper(101, "A"), wrapper(202, "B")];
  assert.equal(await tabB.layout.save(), true, "reloaded tree saves");
  assert.equal(store.get("p:g-p-test:f0").r, 2);
  assert.deepEqual([...store.get("p:g-p-test:f0").fi].sort(), [101, 202], "both folders survive");
  console.log("NestFolders manifest, packaging, project discovery, menu entry and cross-tab concurrency passed.");
})().catch((err) => { console.error(err); process.exit(1); });
