"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { clearLogFile, initializeLogger, log, readLogTail } = require("../dist/logger.js");

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "chatgpt-desktop-log-"));
const testLogPath = path.join(temporaryDirectory, "app.log");
const originalInfo = console.info;
try {
  console.info = () => {};
  initializeLogger(testLogPath);
  log.info("première ligne");
  log.info("deuxième ligne");
  log.info("troisième ligne");
  const tail = readLogTail(2);
  assert.doesNotMatch(tail, /première ligne/);
  assert.match(tail, /deuxième ligne/);
  assert.match(tail, /troisième ligne/);
  assert.equal(clearLogFile(), true);
  assert.equal(fs.readFileSync(testLogPath, "utf8"), "");
  assert.equal(readLogTail(100), "");
} finally {
  console.info = originalInfo;
  fs.rmSync(temporaryDirectory, { recursive: true, force: true });
}

const settingsHtml = fs.readFileSync(path.join(__dirname, "../renderer/settings.html"), "utf8");
const settingsSource = fs.readFileSync(path.join(__dirname, "../renderer/settings.js"), "utf8");
const preloadSource = fs.readFileSync(path.join(__dirname, "../src/preload.ts"), "utf8");
const mainSource = fs.readFileSync(path.join(__dirname, "../src/main.ts"), "utf8");

assert.match(settingsHtml, /id="toggle-project-list"[\s\S]*aria-expanded="false"/);
assert.match(settingsHtml, /id="project-list-panel" hidden/);
assert.match(settingsHtml, /id="copy-log-file"/);
assert.match(settingsHtml, /id="copy-log-tail"/);
assert.match(settingsHtml, /id="clear-log"/);
assert.match(settingsSource, /showProjects[\s\S]*\{count\}/);
assert.match(settingsSource, /hideProjects[\s\S]*\{count\}/);
assert.match(settingsSource, /projectsInCache/);
assert.match(preloadSource, /diagnostics:copy-log-file/);
assert.match(preloadSource, /diagnostics:copy-log-tail/);
assert.match(preloadSource, /diagnostics:clear-log/);
assert.match(mainSource, /clipboard\.writeBuffer\("text\/uri-list"/);
assert.match(mainSource, /clipboard\.writeText\(readLogTail\(100\)/);
assert.match(mainSource, /return clearLogFile\(\)/);

console.log("Settings project list and diagnostics tests passed.");
