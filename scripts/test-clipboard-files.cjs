const assert = require("node:assert/strict");
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

console.log("Clipboard file URI tests passed.");
