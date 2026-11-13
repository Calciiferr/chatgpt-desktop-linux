const assert = require("node:assert/strict");
const { contextMenuTemplate } = require("../dist/context-menu.js");

const calls = [];
const ops = new Proxy({}, {
  get: (_target, name) => name === "isInternalUrl"
    ? (url) => url.startsWith("https://chatgpt.com")
    : (...args) => calls.push([name, ...args]),
});
const flags = { canUndo: true, canRedo: false, canCut: true, canCopy: true, canPaste: true,
  canDelete: true, canSelectAll: true, canEditRichly: false };
const base = { x: 10, y: 20, isEditable: false, selectionText: "", linkURL: "", mediaType: "none",
  srcURL: "", editFlags: flags, misspelledWord: "", dictionarySuggestions: [] };
const labels = (items) => items.map((item) => item.type === "separator" ? "—" : item.label);
const click = (items, label) => items.find((item) => item.label === label).click();

// Nothing selected, no link: no menu at all.
assert.deepEqual(contextMenuTemplate(base, ops, "fr"), []);

// Selected text in the conversation: Copy.
let menu = contextMenuTemplate({ ...base, selectionText: "bonjour" }, ops, "fr");
assert.deepEqual(labels(menu), ["Copier"]);
click(menu, "Copier");
assert.deepEqual(calls.pop(), ["copy"]);

// Prompt field: edit actions with the renderer's own enabled states.
menu = contextMenuTemplate({ ...base, isEditable: true }, ops, "fr");
assert.deepEqual(labels(menu), ["Annuler", "Rétablir", "—", "Couper", "Copier", "Coller", "Tout sélectionner"]);
assert.equal(menu.find((item) => item.label === "Rétablir").enabled, false);
click(menu, "Coller");
assert.deepEqual(calls.pop(), ["paste"]);

// Spelling suggestions come first and replace the misspelled word.
menu = contextMenuTemplate({ ...base, isEditable: true, misspelledWord: "bonjur",
  dictionarySuggestions: ["bonjour"] }, ops, "fr");
assert.equal(menu[0].label, "bonjour");
menu[0].click();
assert.deepEqual(calls.pop(), ["replaceMisspelling", "bonjour"]);

// ChatGPT link: new tab. External link: system browser. Both can be copied.
menu = contextMenuTemplate({ ...base, linkURL: "https://chatgpt.com/c/abc" }, ops, "fr");
assert.deepEqual(labels(menu), ["Ouvrir dans un nouvel onglet", "Copier l’adresse du lien"]);
click(menu, "Ouvrir dans un nouvel onglet");
assert.deepEqual(calls.pop(), ["openInNewTab", "https://chatgpt.com/c/abc"]);
menu = contextMenuTemplate({ ...base, linkURL: "https://example.org/x", selectionText: "x" }, ops, "fr");
assert.deepEqual(labels(menu), ["Copier", "—", "Ouvrir dans le navigateur", "Copier l’adresse du lien"]);
click(menu, "Copier l’adresse du lien");
assert.deepEqual(calls.pop(), ["writeText", "https://example.org/x"]);
// Non-web links (javascript:, file:) get no link actions.
assert.deepEqual(contextMenuTemplate({ ...base, linkURL: "javascript:alert(1)" }, ops, "fr"), []);

// Images: copy the image at the click position; web addresses can be copied.
menu = contextMenuTemplate({ ...base, mediaType: "image", srcURL: "https://cdn.example/img.png" }, ops, "en");
assert.deepEqual(labels(menu), ["Copy image", "Copy image address"]);
click(menu, "Copy image");
assert.deepEqual(calls.pop(), ["copyImageAt", 10, 20]);
menu = contextMenuTemplate({ ...base, mediaType: "image", srcURL: "data:image/png;base64,AAAA" }, ops, "fr");
assert.deepEqual(labels(menu), ["Copier l’image"]);

console.log("Context menu template tests passed.");
