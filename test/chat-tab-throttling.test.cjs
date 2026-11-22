"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  ChatResponseMonitor,
  shouldThrottleChatTab,
} = require("../dist/response-monitor.js");

assert.equal(shouldThrottleChatTab({
  windowVisible: true,
  windowMinimized: false,
  active: true,
  generating: false,
}), false, "the visible active tab stays responsive");
assert.equal(shouldThrottleChatTab({
  windowVisible: true,
  windowMinimized: false,
  active: false,
  generating: false,
}), true, "a visible inactive tab may be throttled");
assert.equal(shouldThrottleChatTab({
  windowVisible: false,
  windowMinimized: false,
  active: true,
  generating: false,
}), true, "tabs may be throttled while the window is hidden");
assert.equal(shouldThrottleChatTab({
  windowVisible: true,
  windowMinimized: true,
  active: true,
  generating: false,
}), true, "tabs may be throttled while the window is minimized");
assert.equal(shouldThrottleChatTab({
  windowVisible: false,
  windowMinimized: true,
  active: false,
  generating: true,
}), false, "a generating tab is exempt even in the background");

async function testResponseMonitorTransitions() {
  const generationStates = [true, false, false];
  const transitions = [];
  let notifications = 0;
  const webContents = {
    isDestroyed: () => false,
    getURL: () => "https://chatgpt.com/c/test",
    executeJavaScript: async () => generationStates.shift() ?? false,
  };
  const monitor = new ChatResponseMonitor(
    webContents,
    () => { notifications += 1; },
    (generating) => transitions.push(generating),
  );
  await monitor.poll();
  assert.equal(monitor.isGenerationInProgress(), true);
  await monitor.poll();
  assert.equal(monitor.isGenerationInProgress(), true, "one idle poll does not finish a response");
  await monitor.poll();
  assert.equal(monitor.isGenerationInProgress(), false);
  assert.deepEqual(transitions, [true, false]);
  assert.equal(notifications, 1, "response completion remains observable");
}

const mainSource = fs.readFileSync(path.join(__dirname, "../src/main.ts"), "utf8");
assert.match(mainSource, /setBackgroundThrottling\(next\)/);
assert.match(mainSource, /active: tab\.id === activeChatTabId/);
assert.match(mainSource, /generating: tab\.monitor\.isGenerationInProgress\(\)/);
assert.match(
  mainSource,
  /responseNotification\.on\("click", \(\) => \{\s*activateChatTab\(tabId\);\s*showWindow\(\);/,
  "a notification still activates its originating tab before showing the window",
);

testResponseMonitorTransitions()
  .then(() => console.log("Chat tab throttling and response monitor tests passed."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
