"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  createProjectRecord,
  captureCurrentProject,
  createChatGptProject,
  mergeProjects,
  normalizeProjectUrl,
  normalizeStoredProjects,
  reconcileProjectsFromSidebar,
  reorderProjectsFromSidebar,
  scanChatGptProjects,
  snapshotChatGptProjectOrder,
} = require("../dist/chatgpt-projects.js");
const { SettingsStore } = require("../dist/settings-store.js");

const projectPath = "/g/g-p-0000000000000000000000000000a001-alpha/project";
const absolute = `https://chatgpt.com${projectPath}`;
const secondAbsolute = "https://chatgpt.com/g/g-p-0000000000000000000000000000a002-alpha/project";
assert.equal(normalizeProjectUrl(absolute), absolute);
assert.equal(normalizeProjectUrl(`${projectPath}?temporary=1#composer`), absolute);
assert.equal(normalizeProjectUrl("https://example.com/g/g-p-123-test/project"), null);
assert.equal(normalizeProjectUrl("https://chatgpt.com/c/123"), null);

const scanned = createProjectRecord("Alpha", absolute, "scan", "2026-07-01T00:00:00.000Z");
assert.equal(scanned.id, "chatgpt-project:g-p-0000000000000000000000000000a001");
assert.equal(scanned.pinned, undefined);
const locallyRenamed = { ...scanned, name: "Alpha local", locallyRenamed: true };
const refreshed = createProjectRecord("Alpha serveur", absolute, "scan", "2026-07-01T01:00:00.000Z");
const merged = mergeProjects([locallyRenamed], [refreshed]);
assert.equal(merged.length, 1);
assert.equal(merged[0].name, "Alpha local");
assert.equal(merged[0].lastSyncedAt, "2026-07-01T01:00:00.000Z");
const secondSameName = createProjectRecord("Alpha", secondAbsolute, "scan");
const twoSameNames = mergeProjects([], [
  { ...scanned, sidebarOrder: 1 },
  { ...secondSameName, sidebarOrder: 0 },
]);
assert.equal(twoSameNames.length, 2);
assert.deepEqual(twoSameNames.map((project) => project.url), [secondAbsolute, absolute]);
assert.equal(mergeProjects([], [scanned, scanned]).length, 1);
const pinnedScanned = { ...scanned, pinned: true };
assert.equal(mergeProjects([scanned], [pinnedScanned])[0].id, scanned.id);
assert.equal(mergeProjects([scanned], [pinnedScanned])[0].pinned, true);
assert.equal(mergeProjects([pinnedScanned], [{ ...scanned, pinned: false }])[0].pinned, false);
const reordered = reorderProjectsFromSidebar(twoSameNames, ["Alpha", "Alpha"]);
assert.deepEqual(reordered.map((project) => project.id), twoSameNames.map((project) => project.id));
const between = createProjectRecord(
  "Intermédiaire",
  "https://chatgpt.com/g/g-p-0000000000000000000000000000a003-intermediaire/project",
  "scan",
);
const separatedSameNames = mergeProjects([], [
  { ...scanned, sidebarOrder: 0 },
  { ...between, sidebarOrder: 1 },
  { ...secondSameName, sidebarOrder: 2 },
]);
assert.deepEqual(separatedSameNames.map((project) => project.name), ["Alpha", "Intermédiaire", "Alpha"]);
const recentAlpha = { ...scanned, sidebarOrder: 1 };
const reconciledNames = ["Nouveau", "Alpha", "Intermédiaire", "Ancien", "Alpha"];
const reconciled = reconcileProjectsFromSidebar(
  [
    { ...scanned, sidebarOrder: 1 },
    { ...between, sidebarOrder: 2 },
    { ...secondSameName, sidebarOrder: 4 },
  ],
  [recentAlpha],
  reconciledNames,
);
assert.deepEqual(reconciled.map((project) => project.name), ["Alpha", "Intermédiaire", "Alpha"]);
assert.equal(reconciled[2].id, secondSameName.id);
assert.equal(
  reconcileProjectsFromSidebar([between], [], ["Autre"], undefined, false).length,
  1,
);
assert.equal(
  reconcileProjectsFromSidebar([between], [], ["Autre"], undefined, true).length,
  0,
);
const removedAfterCompleteScan = reconcileProjectsFromSidebar(
  [scanned, between],
  [scanned],
  ["Alpha"],
  undefined,
  true,
);
assert.deepEqual(removedAfterCompleteScan.map((project) => project.id), [scanned.id]);
const retainedAfterPartialScan = reconcileProjectsFromSidebar(
  [scanned, between],
  [scanned],
  ["Alpha"],
  undefined,
  false,
);
assert.deepEqual(
  retainedAfterPartialScan.map((project) => project.id).sort(),
  [scanned.id, between.id].sort(),
);
assert.equal(normalizeStoredProjects([{ name: "Conversation", url: "https://chatgpt.com/c/123" }]).length, 0);
assert.equal(normalizeStoredProjects([scanned])[0].pinned, false);
assert.equal(normalizeStoredProjects([pinnedScanned])[0].pinned, true);

const temporaryDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "chatgpt-project-settings-"));
const settingsPath = path.join(temporaryDirectory, "settings.json");
fs.writeFileSync(
  settingsPath,
  JSON.stringify({
    chatGptProjects: [scanned, { name: "Invalid", url: "https://example.com/project" }],
    defaultChatGptProjectId: scanned.id,
    projectSyncStatus: { status: "ok", at: "2026-07-01T00:00:00.000Z", message: "test" },
  }),
);
const settings = new SettingsStore(settingsPath).load();
assert.equal(settings.chatGptProjects.length, 1);
assert.equal(settings.defaultChatGptProjectId, scanned.id);
assert.equal(settings.projectSyncStatus.status, "ok");
assert.equal(settings.themeMode, "system");
const persistedOrder = [
  { ...secondSameName, sidebarOrder: 0, orderSyncedAt: "2026-07-01T02:00:00.000Z" },
  { ...scanned, sidebarOrder: 1, orderSyncedAt: "2026-07-01T02:00:00.000Z" },
];
new SettingsStore(settingsPath).save({ ...settings, chatGptProjects: persistedOrder });
const verifiedSettings = new SettingsStore(settingsPath).load();
assert.deepEqual(verifiedSettings.chatGptProjects.map((project) => project.id), persistedOrder.map((project) => project.id));
fs.writeFileSync(settingsPath, JSON.stringify({ companionDarkMode: false }));
assert.equal(new SettingsStore(settingsPath).load().themeMode, "light");
fs.rmSync(temporaryDirectory, { recursive: true, force: true });

async function testInjectedScriptSyntax() {
  const compile = (code) => {
    assert.doesNotThrow(() => new Function(code));
  };
  const createDomMock = (names = [], urls = names.map((_name, index) =>
    `https://chatgpt.com/g/g-p-${String(index + 1).padStart(32, "0")}-project-${index + 1}/project`
  ), options = {}) => {
    let url = "https://chatgpt.com/";
    let sidebarOpen = false;
    let projectsExpanded = false;
    let currentNames = [...names];
    let expandCalls = 0;
    let pendingNames = null;
    const delayedBatches = Array.isArray(options.delayedBatches)
      ? options.delayedBatches.map((batch) => [...batch])
      : options.delayedNames
        ? [[...options.delayedNames]]
        : [];
    let delayedBatchIndex = 0;
    const clickedIndexes = [];
    const clickAttemptIndexes = [];
    const remainingClickFailures = new Map(
      Object.entries(options.clickFailuresByIndex || {}).map(([index, count]) => [Number(index), Number(count)]),
    );
    const remainingPinnedClickFailures = new Map(
      Object.entries(options.pinnedClickFailuresByIndex || {}).map(([index, count]) => [Number(index), Number(count)]),
    );
    const pinnedCandidates = (Array.isArray(options.pinnedEntries) ? options.pinnedEntries : [])
      .filter((entry) => entry.kind !== "conversation" && !entry.href);
    const expandedPinnedIndexes = new Set();
    return {
      getURL: () => url,
      state: () => ({ sidebarOpen, projectsExpanded, clickedIndexes }),
      expansionCalls: () => expandCalls,
      clickAttempts: () => [...clickAttemptIndexes],
      executeJavaScript: async (code) => {
        compile(code);
        if (code.includes("const shouldClickPinnedHeader")) {
          return {
            found: options.pinnedFound === true || pinnedCandidates.length > 0 || (options.pinnedEntries?.length || 0) > 0,
            expanded: true,
            clicked: false,
            names: pinnedCandidates.map((entry) => entry.name),
          };
        }
        if (code.includes("const pinnedExpansionExpected")) {
          const initialIndex = Number(code.match(/const initialIndex = (\d+)/)?.[1] || 0);
          const entry = pinnedCandidates[initialIndex];
          if (!entry || !expandedPinnedIndexes.has(initialIndex)) return false;
          url = entry.navigationUrl || entry.url || url;
          return true;
        }
        if (code.includes("pinnedProjectEntriesFor(findPinnedSection())")) {
          const initialIndex = Number(code.match(/const initialIndex = (\d+)/)?.[1] || 0);
          const remainingFailures = remainingPinnedClickFailures.get(initialIndex) || 0;
          if (remainingFailures > 0) {
            remainingPinnedClickFailures.set(initialIndex, remainingFailures - 1);
            return false;
          }
          const entry = pinnedCandidates[initialIndex];
          if (!entry) return false;
          if (entry.expands === true) {
            expandedPinnedIndexes.add(initialIndex);
            return true;
          }
          url = entry.navigationUrl || entry.url || url;
          return true;
        }
        if (code.includes("const scored =")) {
          if (sidebarOpen) return { open: true };
          if (code.includes("const shouldClick = true")) {
            sidebarOpen = true;
            return { open: false, clicked: true };
          }
          return { open: false };
        }
        if (code.includes("const shouldClick =") && code.includes("findProjectsSection")) {
          if (!sidebarOpen) return { found: false, visibleRows: 0, expanded: false };
          if (!projectsExpanded && code.includes("const shouldClick = true")) {
            projectsExpanded = true;
            return { found: true, visibleRows: 0, expanded: false, clicked: true };
          }
          return { found: true, visibleRows: projectsExpanded ? Math.max(1, currentNames.length) : 0, expanded: projectsExpanded };
        }
        if (code.includes("const showMore =")) {
          expandCalls += 1;
          if (delayedBatchIndex < delayedBatches.length) {
            const count = currentNames.length;
            pendingNames = delayedBatches[delayedBatchIndex];
            delayedBatchIndex += 1;
            return { clicked: true, count };
          }
          return { clicked: false, count: currentNames.length };
        }
        if (code.includes("return { count, hasMore }")) {
          if (pendingNames) {
            currentNames = pendingNames;
            pendingNames = null;
          }
          return {
            count: currentNames.length,
            hasMore: delayedBatchIndex < delayedBatches.length || options.hasMore === true,
          };
        }
        if (code.includes("names: entries.map((entry) => entry.name)")) {
          return {
            names: currentNames,
            hasMore: delayedBatchIndex < delayedBatches.length || options.hasMore === true,
          };
        }
        if (code.includes("return entries.map((entry) => ({ name: entry.name")) {
          const limit = Number(code.match(/slice\(0, (\d+)\)/)?.[1] || currentNames.length);
          return currentNames.slice(0, limit).map((name, index) => ({ name, projectId: options.directIds?.[index] }));
        }
        if (code.includes("const expected =")) {
          const initialIndex = Number(code.match(/const initialIndex = (\d+)/)?.[1] || 0);
          clickAttemptIndexes.push(initialIndex);
          const remainingFailures = remainingClickFailures.get(initialIndex) || 0;
          if (remainingFailures > 0) {
            remainingClickFailures.set(initialIndex, remainingFailures - 1);
            return false;
          }
          clickedIndexes.push(initialIndex);
          url = urls[initialIndex] || urls[0] || absolute;
          return true;
        }
        if (code.includes("const submit =")) { url = absolute; return true; }
        return true;
      },
    };
  };
  const scanContents = createDomMock(["Alpha"], [absolute]);
  const progress = [];
  const scan = await scanChatGptProjects(scanContents, {
    maxShowMoreClicks: 1,
    maxProjects: 2,
    scanId: "test-scan",
    onProgress: (event) => progress.push(event),
  });
  const directContents = createDomMock(["Même nom", "Même nom"], [], {
    directIds: ["g-p-abc123", "g-p-def456"],
  });
  const directScan = await scanChatGptProjects(directContents, { maxShowMoreClicks: 0 });
  assert.equal(directScan.status, "ok");
  assert.deepEqual(directScan.projects.map(project => project.url), [
    "https://chatgpt.com/g/g-p-abc123/project",
    "https://chatgpt.com/g/g-p-def456/project",
  ]);
  assert.deepEqual(directContents.state().clickedIndexes, []);
  assert.equal(scan.status, "ok");
  assert.equal(scan.projects[0].url, absolute);
  assert.equal(scan.sidebarComplete, false);
  assert.deepEqual(scanContents.state(), { sidebarOpen: true, projectsExpanded: true, clickedIndexes: [0] });
  const scanningProgress = progress.filter((event) => event.phase === "scanning");
  assert.equal(scanningProgress.at(-1).percent, 100);
  assert.equal(scanningProgress.at(-1).completed, 1);
  assert.equal(scanningProgress.at(-1).etaMs, 0);

  const pinnedProjectUrl = "https://chatgpt.com/g/g-p-0000000000000000000000000000a004-chatgpt-app-linux/project";
  const pinnedOnlyScan = await scanChatGptProjects(createDomMock([], [], {
    pinnedEntries: [
      { name: "ChatGPT App Linux", kind: "button", expands: true, navigationUrl: pinnedProjectUrl },
      { name: "Conversation épinglée", kind: "conversation", href: "/c/123456" },
    ],
  }), { maxShowMoreClicks: 1, maxProjects: 3 });
  assert.equal(pinnedOnlyScan.projects.length, 1);
  assert.equal(pinnedOnlyScan.projects[0].url, pinnedProjectUrl);
  assert.equal(pinnedOnlyScan.projects[0].pinned, true);
  assert.equal(pinnedOnlyScan.discovered, 1);

  const duplicatedPinnedScan = await scanChatGptProjects(createDomMock(["Alpha"], [absolute], {
    pinnedEntries: [{ name: "Alpha", kind: "button", navigationUrl: absolute }],
  }), { maxShowMoreClicks: 1, maxProjects: 3, navigationTimeoutMs: 2_000 });
  assert.equal(duplicatedPinnedScan.projects.length, 1);
  assert.equal(duplicatedPinnedScan.projects[0].id, scanned.id);
  assert.equal(duplicatedPinnedScan.projects[0].pinned, true);

  const pinnedHomonymScan = await scanChatGptProjects(createDomMock(["Alpha"], [secondAbsolute], {
    pinnedEntries: [{ name: "Alpha", kind: "button", navigationUrl: absolute }],
  }), { maxShowMoreClicks: 1, maxProjects: 3, navigationTimeoutMs: 2_000 });
  assert.equal(pinnedHomonymScan.projects.length, 2);
  assert.equal(new Set(pinnedHomonymScan.projects.map((project) => project.id)).size, 2);
  assert.deepEqual(pinnedHomonymScan.projects.map((project) => project.pinned), [true, false]);

  const conversationButtonScan = await scanChatGptProjects(createDomMock(["Alpha"], [absolute], {
    pinnedEntries: [{ name: "Conversation inattendue", kind: "button", navigationUrl: "https://chatgpt.com/c/abcdef" }],
  }), { maxShowMoreClicks: 1, maxProjects: 3, navigationTimeoutMs: 2_000 });
  assert.equal(conversationButtonScan.projects.length, 1);
  assert.equal(conversationButtonScan.failures.length, 0);
  assert.match(conversationButtonScan.message, /1 pinned conversation\(s\) ignored/);

  const failedPinnedCache = {
    ...createProjectRecord("Projet épinglé indisponible", pinnedProjectUrl, "scan"),
    pinned: true,
  };
  const failedPinnedScan = await scanChatGptProjects(createDomMock(["Alpha"], [absolute], {
    pinnedEntries: [{ name: failedPinnedCache.name, kind: "button", navigationUrl: pinnedProjectUrl }],
    pinnedClickFailuresByIndex: { 0: 3 },
  }), { maxShowMoreClicks: 1, maxProjects: 3, navigationTimeoutMs: 2_000 });
  assert.equal(failedPinnedScan.failures.length, 1);
  const cacheAfterPinnedFailure = reconcileProjectsFromSidebar(
    [failedPinnedCache, scanned],
    failedPinnedScan.projects,
    failedPinnedScan.sidebarNames,
    undefined,
    true,
  );
  assert.ok(cacheAfterPinnedFailure.some((project) => project.id === failedPinnedCache.id));

  const duplicateContents = createDomMock(["Alpha", "Alpha"], [absolute, secondAbsolute]);
  const duplicateScan = await scanChatGptProjects(duplicateContents, {
    maxShowMoreClicks: 1,
    maxProjects: 3,
    navigationTimeoutMs: 2_000,
  });
  assert.equal(duplicateScan.projects.length, 2);
  assert.equal(new Set(duplicateScan.projects.map((project) => project.url)).size, 2);
  assert.deepEqual(duplicateScan.projects.map((project) => project.sidebarOrder), [0, 1]);

  const repeatedUrlScan = await scanChatGptProjects(
    createDomMock(["Projet répété", "Projet répété"], [absolute, absolute]),
    { maxShowMoreClicks: 1, maxProjects: 3, navigationTimeoutMs: 2_000 },
  );
  assert.equal(repeatedUrlScan.projects.length, 1);
  assert.equal(repeatedUrlScan.duplicatesSkipped, 1);
  assert.equal(repeatedUrlScan.failures.length, 0);

  const homonymNames = ["Même nom", "Projet A", "Même nom", "Projet B", "Même nom"];
  const homonymUrls = homonymNames.map((_name, index) =>
    `https://chatgpt.com/g/g-p-${String(index + 10).padStart(32, "0")}-homonyme-${index}/project`
  );
  const homonymContents = createDomMock(homonymNames, homonymUrls);
  const homonymScan = await scanChatGptProjects(homonymContents, {
    maxShowMoreClicks: 1,
    maxProjects: 10,
    navigationTimeoutMs: 2_000,
  });
  assert.deepEqual(homonymScan.projects.map((project) => project.name), homonymNames);
  assert.deepEqual(homonymScan.projects.map((project) => project.url), homonymUrls);
  assert.deepEqual(homonymContents.state().clickedIndexes, [0, 1, 2, 3, 4]);

  const retryNames = ["Projet stable", "Projet temporairement absent"];
  const retryUrls = [absolute, secondAbsolute];
  const retryContents = createDomMock(retryNames, retryUrls, {
    clickFailuresByIndex: { 1: 2 },
  });
  const retryScan = await scanChatGptProjects(retryContents, {
    maxShowMoreClicks: 1,
    maxProjects: 3,
    navigationTimeoutMs: 2_000,
  });
  assert.equal(retryScan.projects.length, 2);
  assert.equal(retryScan.failures.length, 0);
  assert.deepEqual(retryContents.clickAttempts(), [0, 1, 1, 1]);

  const thirtyTwoNames = Array.from({ length: 32 }, (_value, index) => `Projet ${index + 1}`);
  const thirtyTwoUrls = thirtyTwoNames.map((_name, index) =>
    `https://chatgpt.com/g/g-p-${String(index + 100).padStart(32, "0")}-project-${index + 1}/project`
  );
  const thirtyTwoProgress = [];
  const thirtyTwoScan = await scanChatGptProjects(createDomMock(thirtyTwoNames, thirtyTwoUrls), {
    maxShowMoreClicks: 1,
    maxProjects: 40,
    navigationTimeoutMs: 2_000,
    onProgress: (event) => thirtyTwoProgress.push(event),
  });
  assert.equal(thirtyTwoScan.discovered, 32);
  assert.equal(thirtyTwoScan.projects.length, 32);
  assert.equal(thirtyTwoScan.sidebarComplete, false);
  const completedProgress = thirtyTwoProgress.filter((event) => event.phase === "scanning" && event.completed > 0);
  assert.ok(completedProgress.every((event, index, list) => index === 0 || event.percent >= list[index - 1].percent));
  assert.equal(completedProgress.at(-1).percent, 100);
  assert.equal(completedProgress.at(-1).total, 32);

  const orderOnlyContents = createDomMock(["Alpha", "Alpha"]);
  const orderSnapshot = await snapshotChatGptProjectOrder(orderOnlyContents, { maxShowMoreClicks: 1, maxProjects: 3 });
  assert.deepEqual(orderSnapshot.names, ["Alpha", "Alpha"]);
  assert.equal(orderOnlyContents.getURL(), "https://chatgpt.com/");
  assert.equal(orderSnapshot.complete, false);

  const cappedSnapshot = await snapshotChatGptProjectOrder(
    createDomMock(Array.from({ length: 12 }, (_value, index) => `Projet ${index + 1}`)),
    { maxShowMoreClicks: 1, maxProjects: 10 },
  );
  assert.equal(cappedSnapshot.descriptors.length, 10);
  assert.equal(cappedSnapshot.names.length, 10);
  assert.equal(cappedSnapshot.complete, false);

  const backgroundContents = createDomMock(thirtyTwoNames, thirtyTwoUrls);
  const backgroundScan = await scanChatGptProjects(backgroundContents, {
    maxShowMoreClicks: 20,
    maxProjects: 200,
    maxResolvedProjects: 10,
    navigationTimeoutMs: 2_000,
  });
  assert.equal(backgroundScan.projects.length, 10);
  assert.equal(backgroundScan.discovered, 10);
  assert.equal(backgroundScan.sidebarNames.length, 32);
  assert.equal(backgroundScan.sidebarComplete, true);
  assert.deepEqual(backgroundContents.state().clickedIndexes, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

  const expandableSnapshot = await snapshotChatGptProjectOrder(
    createDomMock(["Projet 1"], [], { hasMore: true }),
    { maxShowMoreClicks: 1, maxProjects: 10 },
  );
  assert.equal(expandableSnapshot.complete, false);

  const delayedShowMoreContents = createDomMock(
    ["Projet 1"],
    [],
    { delayedNames: ["Projet 1", "Projet 2", "Projet 3"] },
  );
  const delayedSnapshot = await snapshotChatGptProjectOrder(delayedShowMoreContents, {
    maxShowMoreClicks: 2,
    maxProjects: 10,
  });
  assert.deepEqual(delayedSnapshot.names, ["Projet 1", "Projet 2", "Projet 3"]);
  assert.equal(delayedSnapshot.showMoreClicks, 1);

  const thirtyNamesInBatches = Array.from({ length: 30 }, (_value, index) => `Lot ${index + 1}`);
  const batchedSnapshot = await snapshotChatGptProjectOrder(
    createDomMock(thirtyNamesInBatches.slice(0, 10), [], {
      delayedBatches: [14, 18, 22, 26, 30].map((count) => thirtyNamesInBatches.slice(0, count)),
    }),
    { maxShowMoreClicks: 20, maxProjects: 200 },
  );
  assert.equal(batchedSnapshot.names.length, 30);
  assert.equal(batchedSnapshot.showMoreClicks, 5);
  assert.equal(batchedSnapshot.complete, true);

  const inaccessibleSidebar = {
    getURL: () => "https://chatgpt.com/",
    executeJavaScript: async (code) => {
      compile(code);
      return { open: false, clicked: false };
    },
  };
  await assert.rejects(
    scanChatGptProjects(inaccessibleSidebar, { maxShowMoreClicks: 1, maxProjects: 2 }),
    /Unable to open the ChatGPT sidebar/,
  );
  await assert.rejects(
    scanChatGptProjects(inaccessibleSidebar, { signal: AbortSignal.abort() }),
    /interrupted/,
  );

  const captureContents = {
    getURL: () => absolute,
    executeJavaScript: async (code) => { compile(code); return "Alpha"; },
  };
  assert.equal((await captureCurrentProject(captureContents)).name, "Alpha");

  const createContents = createDomMock(["Alpha"], [absolute]);
  assert.equal((await createChatGptProject(createContents, "Alpha", 5_000)).url, absolute);
}

const mainSource = fs.readFileSync(path.join(__dirname, "../src/main.ts"), "utf8");
const scanWindowFunction = mainSource.match(
  /async function createHiddenProjectScanWindow[\s\S]*?\n}\n\nasync function synchronizeProjectCache/,
)?.[0] || "";
const synchronizeFunction = mainSource.match(
  /async function synchronizeProjectCache[\s\S]*?\n}\n\nasync function synchronizeProjectsInBackground/,
)?.[0] || "";
const backgroundFunction = mainSource.match(
  /async function synchronizeProjectsInBackground[\s\S]*?\n}/,
)?.[0] || "";
assert.match(mainSource, /show:\s*false,[\s\S]*focusable:\s*false,[\s\S]*backgroundThrottling:\s*false/);
assert.match(mainSource, /PROJECT_SYNC_INTERVAL_MS\s*=\s*5\s*\*\s*60\s*\*\s*1000/);
assert.match(scanWindowFunction, /width: isBackground \? 800 : 1280/);
assert.match(scanWindowFunction, /height: isBackground \? 600 : 900/);
assert.match(scanWindowFunction, /if \(isBackground\) return window;[\s\S]*reloadIgnoringCache\(\)/);
assert.match(mainSource, /projects:reset-all/);
assert.doesNotMatch(mainSource, /reorderProjectsFromSidebar\(/);
assert.match(mainSource, /maxShowMoreClicks:\s*20,\s*maxProjects:\s*200,\s*maxResolvedProjects:\s*10/);
assert.match(synchronizeFunction, /runProjectSyncWithTimeout\(/);
assert.match(synchronizeFunction, /destroyProjectScanWindow\(\);[\s\S]*projectSyncInProgress = false/);
assert.match(synchronizeFunction, /previousProjects[\s\S]*cache kept/);
assert.match(synchronizeFunction, /const removeMissing = result\.sidebarComplete/);
assert.match(synchronizeFunction, /lastSelectedChatGptProjectId:[\s\S]*mergedIds\.has/);
assert.match(synchronizeFunction, /message: t\("projectsInLocalList", \{ count: mergedProjects\.length \}\)/);
assert.match(backgroundFunction, /powerMonitor\.getSystemIdleTime\(\)/);
assert.match(backgroundFunction, /projectSyncSkipReason\("background"/);
assert.match(mainSource, /nativeTheme\.themeSource\s*=\s*mode/);
const companionSource = fs.readFileSync(path.join(__dirname, "../renderer/companion.js"), "utf8");
assert.match(companionSource, /projectsSyncing:\s*"Synchronisation des projets…"/);
assert.match(companionSource, /progress\.percent[\s\S]*progress\.completed[\s\S]*progress\.total/);
assert.match(companionSource, /document\.createElement\("optgroup"\)/);
assert.match(companionSource, /pinnedProjects\.length > 0/);
const settingsSource = fs.readFileSync(path.join(__dirname, "../renderer/settings.js"), "utf8");
assert.match(settingsSource, /project\.pinned === true \? `\$\{tr\("pinned"\)\} · `/);
const projectSource = fs.readFileSync(path.join(__dirname, "../src/chatgpt-projects.ts"), "utf8");
assert.match(projectSource, /header\.parentElement\?\.closest\('\[class\*="sidebar-expando-section"\]'\)/);
assert.match(projectSource, /const projectEntriesFor = \(section\)/);
assert.match(projectSource, /button\.matches\('\[class\*="project-unfurl-row"\]'\)/);
assert.match(projectSource, /new Set\(candidates\.filter\(isProjectHomeButton\)/);
assert.match(projectSource, /entry\.button\.click\(\)/);
assert.match(projectSource, /const root = sidebar \|\| section/);
assert.doesNotMatch(projectSource, /Array\.from\(\{ length: descriptor\.duplicateCount \}/);

function testProjectEntryDomHelpers() {
  class FakeElement {
    constructor(tagName = "div", { className = "", text = "", ariaLabel = "", rect = {} } = {}) {
      this.tagName = tagName.toLowerCase();
      this.className = className;
      this.textContent = text;
      this.innerText = text;
      this.attributes = new Map(ariaLabel ? [["aria-label", ariaLabel]] : []);
      this.children = [];
      this.parentElement = null;
      this.rect = { left: 0, top: 0, right: 300, bottom: 30, width: 300, height: 30, ...rect };
    }
    append(...children) {
      for (const child of children) {
        child.parentElement = this;
        this.children.push(child);
      }
      return this;
    }
    getAttribute(name) { return this.attributes.get(name) || null; }
    hasAttribute(name) { return this.attributes.has(name); }
    getBoundingClientRect() { return this.rect; }
    contains(candidate) {
      for (let current = candidate; current; current = current.parentElement) if (current === this) return true;
      return false;
    }
    matches(selector) {
      return selector.split(",").some((part) => {
        const value = part.trim();
        if (value === this.tagName) return true;
        if (value === "button[aria-label]") return this.tagName === "button" && this.attributes.has("aria-label");
        if (value === '[class*="project-unfurl-row"]') return this.className.includes("project-unfurl-row");
        if (value === '[class*="sidebar-expando-section-header"]') return this.className.includes("sidebar-expando-section-header");
        if (value === '[class*="sidebar"]') return this.className.includes("sidebar");
        return false;
      });
    }
    closest(selector) {
      for (let current = this; current; current = current.parentElement) if (current.matches(selector)) return current;
      return null;
    }
    querySelectorAll(selector) {
      const result = [];
      const visit = (node) => {
        for (const child of node.children) {
          if (child.matches(selector)) result.push(child);
          visit(child);
        }
      };
      visit(this);
      return result;
    }
  }
  class FakeButton extends FakeElement {
    constructor(options) { super("button", options); }
    click() { this.clicked = true; }
  }
  const roots = [];
  const fakeDocument = {
    querySelectorAll(selector) {
      const result = [];
      for (const root of roots) {
        if (root.matches(selector)) result.push(root);
        result.push(...root.querySelectorAll(selector));
      }
      return result;
    },
  };
  const helperSource = projectSource.match(/const ACTIVE_PROJECT_SCOPE_HELPERS = String\.raw`([\s\S]*?)`;\n/)?.[1];
  assert.ok(helperSource, "Les helpers DOM projets doivent rester isolés.");
  const helpers = new Function(
    "HTMLElement", "HTMLButtonElement", "getComputedStyle", "document", "innerWidth", "innerHeight",
    `${helperSource}; return { projectEntriesFor, findShowMoreButton };`,
  )(
    FakeElement,
    FakeButton,
    () => ({ display: "block", visibility: "visible", opacity: "1" }),
    fakeDocument,
    1200,
    900,
  );

  const directSection = new FakeElement();
  const directButton = new FakeButton({
    className: "group/project-unfurl-row relative",
    text: "Projet direct",
    ariaLabel: "Ouvrir l’accueil du projet",
  });
  directSection.append(directButton);
  const directEntries = helpers.projectEntriesFor(directSection);
  assert.equal(directEntries.length, 1);
  assert.equal(directEntries[0].button, directButton);
  assert.equal(directEntries[0].name, "Projet direct");

  const wrappedSection = new FakeElement();
  const outerWrapper = new FakeElement("div", { className: "project-unfurl-row" });
  const innerWrapper = new FakeElement("div", { className: "project-unfurl-row" });
  const wrappedButton = new FakeButton({ text: "Projet wrapper", ariaLabel: "Ouvrir l’accueil du projet" });
  const optionButton = new FakeButton({ ariaLabel: "Ouvrir les options du projet pour Projet wrapper" });
  outerWrapper.append(innerWrapper.append(wrappedButton, optionButton));
  wrappedSection.append(outerWrapper);
  const wrappedEntries = helpers.projectEntriesFor(wrappedSection);
  assert.equal(wrappedEntries.length, 1);
  assert.equal(wrappedEntries[0].button, wrappedButton);
  assert.equal(wrappedEntries[0].name, "Projet wrapper");

  const manySection = new FakeElement();
  for (let index = 0; index < 32; index += 1) {
    const outer = new FakeElement("div", { className: "project-unfurl-row" });
    const inner = new FakeElement("div", { className: "project-unfurl-row" });
    inner.append(new FakeButton({ text: `Projet ${index + 1}`, ariaLabel: "Ouvrir l’accueil du projet" }));
    manySection.append(outer.append(inner));
  }
  assert.equal(helpers.projectEntriesFor(manySection).length, 32);

  const sidebar = new FakeElement("nav", {
    className: "sidebar",
    text: "Nouveau chat Bibliothèque Projets",
    rect: { left: 0, top: 0, right: 320, bottom: 900, width: 320, height: 900 },
  });
  const projectSection = new FakeElement("div", { className: "sidebar-expando-section" });
  const showMore = new FakeButton({ text: "Afficher plus" });
  sidebar.append(projectSection, showMore);
  roots.push(sidebar);
  assert.equal(helpers.findShowMoreButton(projectSection), showMore);
}

testProjectEntryDomHelpers();
const companionHtml = fs.readFileSync(path.join(__dirname, "../renderer/companion.html"), "utf8");
assert.ok(companionHtml.indexOf('id="audit-quality"') < companionHtml.indexOf('id="project-enabled"'));

testInjectedScriptSyntax()
  .then(() => console.log("Project URL, merge, settings and injected-script tests passed."))
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
