const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { DEFAULT_SETTINGS, SettingsStore, validateSettingsInput } = require("../dist/settings-store.js");

const directory = fs.mkdtempSync(path.join(os.tmpdir(), "chatgpt-tabs-test-"));
const file = path.join(directory, "settings.json");
try {
  fs.writeFileSync(file, JSON.stringify({
    ...DEFAULT_SETTINGS,
    restoreTabsOnStartup: true,
    openChatTabUrls: [
      "https://chatgpt.com/",
      "https://example.com/nope",
      "javascript:alert(1)",
      ...Array.from({ length: 10 }, (_, index) => `https://chatgpt.com/c/test-${index}`),
    ],
    activeChatTabIndex: 99,
    companionPromptMaxLines: 99,
  }));
  const loaded = new SettingsStore(file).load();
  assert.equal(loaded.openChatTabUrls.length, 8, "restoration is limited to eight trusted ChatGPT URLs");
  assert.ok(loaded.openChatTabUrls.every((url) => new URL(url).origin === "https://chatgpt.com"));
  assert.equal(loaded.activeChatTabIndex, 7, "active index is clamped");
  assert.equal(loaded.companionPromptMaxLines, 3, "invalid prompt line limit falls back to default");

  const valid = validateSettingsInput({ ...DEFAULT_SETTINGS }, { ...DEFAULT_SETTINGS });
  assert.equal(valid.reloadShortcut, "F5");
  assert.equal(valid.tabBarMode, "auto");
  assert.equal(valid.pullToRefreshEnabled, false);
  assert.equal(valid.companionPromptMaxLines, 3);
  assert.equal(
    validateSettingsInput(
      { ...DEFAULT_SETTINGS, companionPromptMaxLines: 7 },
      { ...DEFAULT_SETTINGS },
    ).companionPromptMaxLines,
    7,
  );

  assert.throws(
    () => validateSettingsInput({ ...DEFAULT_SETTINGS, newTabShortcut: "Ctrl+1" }, { ...DEFAULT_SETTINGS }),
    /réservés/,
  );
  assert.throws(
    () => validateSettingsInput({ ...DEFAULT_SETTINGS, nextTabShortcut: "Shift+Ctrl+Tab" }, { ...DEFAULT_SETTINGS }),
    /différents/,
  );
  assert.throws(
    () => validateSettingsInput({ ...DEFAULT_SETTINGS, reloadShortcut: "Ctrl+Alt+G" }, { ...DEFAULT_SETTINGS }),
    /global/,
  );
  for (const companionPromptMaxLines of [0, 11, 2.5]) {
    assert.throws(
      () => validateSettingsInput(
        { ...DEFAULT_SETTINGS, companionPromptMaxLines },
        { ...DEFAULT_SETTINGS },
      ),
      /nombre de lignes/,
    );
  }
  console.log("Tabs/settings tests: OK");
} finally {
  fs.rmSync(directory, { recursive: true, force: true });
}
