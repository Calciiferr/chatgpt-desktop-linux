"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  attachmentSnapshotProvesBatch,
  composerAttachmentProbeScript,
  transferAttachmentBatches,
} = require("../dist/attachment-transfer.js");

const isImage = (filePath) => /\.(?:jpe?g|png)$/i.test(filePath);

async function run(paths, pasted = true, uploaded = true) {
  const calls = { paste: [], upload: [] };
  const result = await transferAttachmentBatches(
    paths,
    [],
    isImage,
    async (imagePaths) => { calls.paste.push([...imagePaths]); return pasted; },
    async (filePaths) => { calls.upload.push([...filePaths]); return uploaded; },
  );
  return { result, calls };
}

async function main() {
  const imageOnly = await run(["photo.jpg"]);
  assert.equal(imageOnly.result.ok, true);
  assert.deepEqual(imageOnly.calls.paste, [["photo.jpg"]]);
  assert.deepEqual(imageOnly.calls.upload, []);

  const images = await run(["one.jpg", "two.png"]);
  assert.deepEqual(images.calls.paste, [["one.jpg", "two.png"]]);
  assert.deepEqual(images.calls.upload, []);

  const fileOnly = await run(["notes.md"]);
  assert.deepEqual(fileOnly.calls.paste, []);
  assert.deepEqual(fileOnly.calls.upload, [["notes.md"]]);

  const files = await run(["notes.md", "archive.zip"]);
  assert.deepEqual(files.calls.upload, [["notes.md", "archive.zip"]]);

  const mixed = await run(["notes.md", "archive.zip", "one.jpg", "two.png"]);
  assert.deepEqual(mixed.calls.paste, [["one.jpg", "two.png"]]);
  assert.deepEqual(mixed.calls.upload, [["notes.md", "archive.zip"]]);

  const fallback = await run(["notes.md", "archive.zip", "one.jpg", "two.png"], false, true);
  assert.equal(fallback.result.ok, true);
  assert.deepEqual(fallback.calls.upload, [["notes.md", "archive.zip", "one.jpg", "two.png"]]);

  const failed = await run(["one.jpg"], false, false);
  assert.equal(failed.result.ok, false);

  const probe = composerAttachmentProbeScript(["photo.jpg"]);
  assert.doesNotThrow(() => new Function(probe));
  assert.match(probe, /closest\('\[data-testid\*="composer" i\]'\)/);
  assert.doesNotMatch(probe, /document\.body|closest\('main'\)/);

  const noChange = {
    markerCount: 1,
    matchedNames: ["photo.jpg"],
  };
  assert.equal(attachmentSnapshotProvesBatch(["photo.jpg"], noChange, noChange), false);
  assert.equal(
    attachmentSnapshotProvesBatch(
      ["photo.jpg"],
      { markerCount: 0, matchedNames: [] },
      { markerCount: 1, matchedNames: ["photo.jpg"] },
    ),
    true,
  );
  assert.equal(
    attachmentSnapshotProvesBatch(
      ["one.jpg", "two.png"],
      { markerCount: 2, matchedNames: [] },
      { markerCount: 3, matchedNames: [] },
    ),
    false,
  );
  assert.equal(
    attachmentSnapshotProvesBatch(
      ["same.png", "same.png"],
      { markerCount: 0, matchedNames: [] },
      { markerCount: 1, matchedNames: ["same.png", "same.png"] },
    ),
    false,
  );

  const root = path.join(__dirname, "..");
  const mainSource = fs.readFileSync(path.join(root, "src/main.ts"), "utf8");
  const transferFunction = mainSource.match(
    /async function performCompanionTransfer[\s\S]*?\n}\n\nasync function transferCompanionToChat/,
  )?.[0] || "";
  assert.match(mainSource, /Collage image sans pièce jointe visible, fallback upload fichier/);
  assert.match(mainSource, /brouillon conservé/);
  assert.match(transferFunction, /if \(ok\) \{[\s\S]*?rmSync[\s\S]*?completeCompanionDraftTransfer/);
  assert.doesNotMatch(transferFunction, /completeCompanionDraftTransfer\([^)]*\);\s*if \(!ok\)/);

  console.log("Magic Bar attachment transfer tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
