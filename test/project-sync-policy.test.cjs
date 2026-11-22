const assert = require("node:assert/strict");
const {
  BACKGROUND_PROJECT_SYNC_TIMEOUT_MS,
  MANUAL_PROJECT_SYNC_TIMEOUT_MS,
  ProjectSyncTimeoutError,
  projectSyncSkipReason,
  projectSyncTimeoutMs,
  runProjectSyncWithTimeout,
} = require("../dist/project-sync-policy.js");

async function run() {
  assert.equal(projectSyncTimeoutMs("settings"), MANUAL_PROJECT_SYNC_TIMEOUT_MS);
  assert.equal(projectSyncTimeoutMs("magic-bar"), MANUAL_PROJECT_SYNC_TIMEOUT_MS);
  assert.equal(projectSyncTimeoutMs("background"), BACKGROUND_PROJECT_SYNC_TIMEOUT_MS);

  const now = 1_000_000;
  assert.equal(projectSyncSkipReason("background", { idleSeconds: 301, hiddenSince: null, now }), "idle");
  assert.equal(
    projectSyncSkipReason("background", { idleSeconds: 0, hiddenSince: now - 15 * 60 * 1000 - 1, now }),
    "hidden",
  );
  assert.equal(projectSyncSkipReason("background", { idleSeconds: 0, hiddenSince: null, now }), null);
  assert.equal(projectSyncSkipReason("settings", { idleSeconds: 999, hiddenSince: 0, now }), null);
  assert.equal(projectSyncSkipReason("magic-bar", { idleSeconds: 999, hiddenSince: 0, now }), null);

  let cleanupCalled = false;
  let capturedSignal;
  const keepAlive = setTimeout(() => {}, 1_000);
  try {
    await assert.rejects(
      runProjectSyncWithTimeout(
        10,
        (signal) => {
          capturedSignal = signal;
          return new Promise(() => {});
        },
        () => {
          cleanupCalled = true;
        },
      ),
      ProjectSyncTimeoutError,
    );
  } finally {
    clearTimeout(keepAlive);
  }
  assert.equal(cleanupCalled, true, "timeout cleanup runs");
  assert.equal(capturedSignal.aborted, true, "timeout aborts the stale scan");
  assert.equal(
    await runProjectSyncWithTimeout(100, async () => "retry-ok", () => {}),
    "retry-ok",
    "a later synchronization can run after timeout",
  );

  console.log("Project sync policy tests passed.");
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
