import { installDebianPackage } from "./debian-update";
import { loadNestFoldersExtension } from "./nestfolders-extension";
import { GitHubDeviceAuth, GitHubLoginExpiredError, type GitHubSession } from "./github-device-auth";
import { GitHubUpdater } from "./github-updater";
import { installAuthNavigation } from "./auth-navigation";
import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  globalShortcut,
  ipcMain,
  Menu,
  nativeImage,
  nativeTheme,
  Notification,
  powerMonitor,
  type Input,
  type Rectangle,
  screen,
  session,
  safeStorage,
  shell,
  Tray,
  type WebContents,
  WebContentsView,
} from "electron";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import { syncAutostart } from "./autostart";
import {
  type CompanionDraftState,
  appendCompanionPromptText,
  emptyCompanionDraft,
  initialCompanionDraft,
  reconcileCompanionDraftProjectState,
  retargetCompanionDraftState,
  touchCompanionDraftState,
  updateCompanionDraftState,
} from "./companion-draft";
import { clearLogFile, initializeLogger, log, readLogTail } from "./logger";
import { syncKdeShortcut } from "./kde-shortcuts";
import {
  startKWinCompanionController,
  stopKWinCompanionController,
} from "./kwin-companion-controller";
import { syncKWinPositionMemory } from "./kwin-position-memory";
import { ChatResponseMonitor, shouldThrottleChatTab } from "./response-monitor";
import { inspectChatPageState } from "./chat-page-state";
import {
  type ChatGptProject,
  type ProjectScanProgress,
  createChatGptProject,
  mergeProjects,
  reconcileProjectsFromSidebar,
  scanChatGptProjects,
} from "./chatgpt-projects";
import { syncKateTextIntegration } from "./text-integrations";
import { parseClipboardFileUris } from "./clipboard-files";
import {
  type ComposerAttachmentSnapshot,
  attachmentSnapshotProvesBatch,
  composerAttachmentProbeScript,
  transferAttachmentBatches,
} from "./attachment-transfer";
import {
  ProjectSyncTimeoutError,
  type ProjectSyncTrigger,
  projectSyncSkipReason,
  projectSyncTimeoutMs,
  runProjectSyncWithTimeout,
} from "./project-sync-policy";
import {
  type AppLanguage,
  type AppSettings,
  DEFAULT_SETTINGS,
  type DisplayServerMode,
  SettingsStore,
  newChatTabUrl,
  type ThemeMode,
  validateSettingsInput,
  type WindowDisplayMode,
} from "./settings-store";

const APP_TITLE = "ChatGPT";
const CHATGPT_URL = "https://chatgpt.com/";
const PERSISTENT_PARTITION = "persist:chatgpt";
const WINDOW_STATE_DELAY_MS = 350;
const MAX_CONTEXT_LENGTH = 20_000;
const MAX_COMPANION_FILES = 10;
const MAX_COMPANION_FILE_BYTES = 512 * 1024 * 1024;
const COMPANION_TEMP_DIR = path.join(os.tmpdir(), "chatgpt-desktop-linux-companion");
const MAGIC_BAR_WIDTH = 680;
const MAGIC_BAR_FALLBACK_HEIGHT = 190;
const MAGIC_BAR_MIN_HEIGHT = 80;
const MAGIC_MENU_WIDTH = 280;
const MAGIC_MENU_HEIGHT = 228;
const MAGIC_MENU_GAP = 2;
const MAGIC_PREVIEW_MIN_WIDTH = 360;
const MAGIC_PREVIEW_MIN_HEIGHT = 280;
const MAGIC_PREVIEW_MAX_RATIO = 0.85;
const MAGIC_PREVIEW_MAX_SOURCE_EDGE = 1600;
const MAGIC_PREVIEW_CHROME_WIDTH = 32;
const MAGIC_PREVIEW_CHROME_HEIGHT = 72;
const SEARCH_VIEW_WIDTH = 390;
const SEARCH_VIEW_HEIGHT = 46;
const SEARCH_VIEW_MARGIN = 12;
const PROJECT_SYNC_INTERVAL_MS = 5 * 60 * 1000;
const TAB_BAR_HEIGHT = 38;
const UPDATE_TEST_BANNER_HEIGHT = app.getVersion() === "0.7.0-beta.33" ? 32 : 0;
const MAX_CHAT_TABS = 8;
const REFRESH_VIEW_WIDTH = 176;
const REFRESH_VIEW_HEIGHT = 36;

type CliCommand = "show" | "hide" | "toggle" | "settings" | "companion" | "quit";
interface CliRequest {
  command: CliCommand;
  files: string[];
  text?: string;
  source?: string;
  clipboard?: boolean;
}

type CompanionItemType = "text" | "file" | "image";
type CompanionFeedbackKey = "captureError" | "clipboardEmpty";
interface CompanionItem {
  id: string;
  type: CompanionItemType;
  name: string;
  source?: string;
  preview?: string;
  thumbnailDataUrl?: string;
  iconDataUrl?: string;
  text?: string;
  filePath?: string;
  temporary?: boolean;
  preferFileUpload?: boolean;
}

interface CompanionTransferOptions {
  securityAudit: boolean;
  qualityAudit: boolean;
}

interface ChatTab {
  id: string;
  view: WebContentsView;
  title: string;
  loading: boolean;
  monitor: ChatResponseMonitor;
  backgroundThrottling: boolean;
}

let mainWindow: BrowserWindow | null = null;
let settingsWindow: BrowserWindow | null = null;
let companionWindow: BrowserWindow | null = null;
let companionMenuWindow: BrowserWindow | null = null;
let companionPreviewWindow: BrowserWindow | null = null;
let companionPreviewLoadPromise: Promise<void> | null = null;
let searchView: WebContentsView | null = null;
let refreshView: WebContentsView | null = null;
let tray: Tray | null = null;
let hideNotification: Notification | null = null;
let responseNotification: Notification | null = null;
let chatTabs: ChatTab[] = [];
let activeChatTabId: string | null = null;
let closedChatTabUrls: string[] = [];
let tabStateTimer: ReturnType<typeof setTimeout> | null = null;
let settingsStore: SettingsStore | null = null;
let currentSettings: AppSettings = { ...DEFAULT_SETTINGS };
let registeredShortcut: string | null = null;
let registeredCompanionShortcut: string | null = null;
let pendingRequest: CliRequest | null = null;
let companionItems: CompanionItem[] = [];
let companionDraft: CompanionDraftState = emptyCompanionDraft();
let companionDraftInitialized = false;
let companionTransferInProgress = false;
let companionExpanded = false;
let companionNotice = "";
let companionNoticeId = 0;
let companionTransientStatus: { id: number; key?: CompanionFeedbackKey; expiresAt?: number } = { id: 0 };
let projectSyncInProgress = false;
let projectScanWindow: BrowserWindow | null = null;
let projectSyncTimer: ReturnType<typeof setInterval> | null = null;
let currentProjectScanProgress: ProjectScanProgress | null = null;
let searchVisible = false;
let companionMeasuredHeight = MAGIC_BAR_FALLBACK_HEIGHT;
let windowStateTimer: ReturnType<typeof setTimeout> | null = null;
let shellReady = false;
let showWhenReady = true;
let mainWindowHiddenSince: number | null = null;
let isQuitting = false;
let hasPromptedUpgradeRestart = false;
let hasShownHideNotification = false;
let isWaylandSession = false;
let activeDisplayServerMode: DisplayServerMode = "wayland";
let logFilePath = "";
let kwinPositionMemoryAvailable = false;
let activeLanguage: AppLanguage = "fr";
const companionTestCapturePath = app.isPackaged ? "" : process.env.CHATGPT_MAGIC_BAR_TEST_CAPTURE || "";

const LANGUAGE_LOCALES: Record<AppLanguage, string> = {
  fr: "fr-FR",
  en: "en-US",
  es: "es-ES",
};

const MAIN_TEXT = {
  fr: {
    show: "Afficher",
    hide: "Cacher",
    reload: "Recharger ChatGPT",
    browser: "Ouvrir ChatGPT dans le navigateur",
    settings: "Paramètres…",
    companion: "Ouvrir la Magic Bar…",
    reset: "Réinitialiser la session…",
    quit: "Quitter",
    hiddenTitle: "ChatGPT reste actif",
    hiddenBody: "Cliquez ici pour le rouvrir. L’icône peut être rangée parmi les éléments masqués de Plasma.",
    responseFinishedTitle: "Réponse terminée",
    responseFinishedBody: "ChatGPT a terminé de répondre.",
    resetTitle: "Réinitialiser la session",
    resetMessage: "Se déconnecter de ChatGPT et effacer la session locale ?",
    resetDetail: "Les cookies, le cache et les données du site seront supprimés de cette application.",
    upgradeTitle: "Nouvelle version détectée",
    upgradeMessage: "Une nouvelle version de ChatGPT Desktop Linux est installée.",
    upgradeDetail: "Redémarrer maintenant pour utiliser la nouvelle version ?",
    restartNow: "Redémarrer maintenant",
    cancel: "Annuler",
    confirmReset: "Réinitialiser",
  },
  en: {
    show: "Show",
    hide: "Hide",
    reload: "Reload ChatGPT",
    browser: "Open ChatGPT in browser",
    settings: "Settings…",
    companion: "Open Magic Bar…",
    reset: "Reset session…",
    quit: "Quit",
    hiddenTitle: "ChatGPT is still running",
    hiddenBody: "Click here to reopen it. Plasma may place the icon among hidden items.",
    responseFinishedTitle: "Response complete",
    responseFinishedBody: "ChatGPT has finished responding.",
    resetTitle: "Reset session",
    resetMessage: "Sign out of ChatGPT and clear the local session?",
    resetDetail: "Cookies, cache and site data will be removed from this application.",
    upgradeTitle: "New version detected",
    upgradeMessage: "A new version of ChatGPT Desktop Linux is installed.",
    upgradeDetail: "Restart now to use the new version?",
    restartNow: "Restart now",
    cancel: "Cancel",
    confirmReset: "Reset",
  },
  es: {
    show: "Mostrar",
    hide: "Ocultar",
    reload: "Recargar ChatGPT",
    browser: "Abrir ChatGPT en el navegador",
    settings: "Ajustes…",
    companion: "Abrir Magic Bar…",
    reset: "Restablecer la sesión…",
    quit: "Salir",
    hiddenTitle: "ChatGPT sigue activo",
    hiddenBody: "Haz clic aquí para volver a abrirlo. Plasma puede ocultar el icono.",
    responseFinishedTitle: "Respuesta terminada",
    responseFinishedBody: "ChatGPT ha terminado de responder.",
    resetTitle: "Restablecer la sesión",
    resetMessage: "¿Cerrar sesión en ChatGPT y borrar la sesión local?",
    resetDetail: "Se eliminarán las cookies, la caché y los datos del sitio de esta aplicación.",
    upgradeTitle: "Nueva versión detectada",
    upgradeMessage: "Hay una nueva versión de ChatGPT Desktop Linux instalada.",
    upgradeDetail: "¿Reiniciar ahora para usar la nueva versión?",
    restartNow: "Reiniciar ahora",
    cancel: "Cancelar",
    confirmReset: "Restablecer",
  },
} as const;

function mainText(): (typeof MAIN_TEXT)[AppLanguage] {
  return MAIN_TEXT[activeLanguage];
}

const rendererPath = (fileName: string): string => path.join(__dirname, "../renderer", fileName);
const assetPath = (fileName: string): string => path.join(__dirname, "../assets", fileName);

function parseCliRequest(argv: readonly string[]): CliRequest | null {
  const commands = new Map<string, CliCommand>([
    ["--show", "show"],
    ["--hide", "hide"],
    ["--toggle", "toggle"],
    ["--settings", "settings"],
    ["--companion", "companion"],
    ["--companion-files", "companion"],
    ["--companion-stdin", "companion"],
    ["--quit", "quit"],
  ]);
  const requested = argv.flatMap((argument) => {
    const command = commands.get(argument);
    return command ? [[argument, command] as const] : [];
  });

  if (requested.length > 1) {
    log.warn(
      `[cli] Plusieurs commandes reçues (${requested
        .map(([argument]) => argument)
        .join(", ")}). La dernière est utilisée.`,
    );
  }

  const hasExplicitContext = argv.some((argument) =>
    ["--ask", "--attach", "--source", "--clipboard", "--companion-files", "--companion-stdin"].includes(
      argument,
    ),
  );
  const command = requested.at(-1)?.[1] ?? (hasExplicitContext ? "companion" : undefined);
  if (!command) {
    return null;
  }

  const valuesAfter = (flag: string): string[] => {
    const values: string[] = [];
    for (let index = 0; index < argv.length; index += 1) {
      if (argv[index] !== flag) continue;
      for (let valueIndex = index + 1; valueIndex < argv.length; valueIndex += 1) {
        const value = argv[valueIndex];
        if (value.startsWith("--")) break;
        values.push(value);
      }
    }
    return values;
  };
  const files = [...valuesAfter("--companion-files"), ...valuesAfter("--attach")]
    .map((argument) => path.resolve(argument))
    .filter((filePath, index, all) => all.indexOf(filePath) === index);

  const askValues = valuesAfter("--ask");
  let text: string | undefined;
  if (askValues.length > 0) {
    text = askValues.at(-1)?.trim().slice(0, MAX_CONTEXT_LENGTH) || undefined;
  } else if (argv.includes("--companion-stdin")) {
    try {
      const input = fs.readFileSync(0, "utf8").trim().slice(0, MAX_CONTEXT_LENGTH);
      text = input || undefined;
    } catch {
      text = undefined;
    }
  }
  const source = valuesAfter("--source").at(-1)?.trim().slice(0, 160) || undefined;
  return {
    command,
    files,
    ...(text ? { text } : {}),
    ...(source ? { source } : {}),
    ...(argv.includes("--clipboard") ? { clipboard: true } : {}),
  };
}

function isCliCommand(value: unknown): value is CliCommand {
  return (
    value === "show" ||
    value === "hide" ||
    value === "toggle" ||
    value === "settings" ||
    value === "companion" ||
    value === "quit"
  );
}

function openExternal(url: string): void {
  void shell.openExternal(url).catch((error: unknown) => {
    log.error(`[external] Impossible d’ouvrir ${url} :`, error);
  });
}

function updateTrayMenu(): void {
  if (!tray) {
    return;
  }

  const windowIsVisible =
    mainWindow !== null && mainWindow.isVisible() && !mainWindow.isMinimized();
  const text = mainText();
  const menu = Menu.buildFromTemplate([
    {
      label: text.companion,
      enabled: currentSettings.companionEnabled,
      click: () => showCompanionWindow(),
    },
    { type: "separator" },
    {
      label: windowIsVisible ? text.hide : text.show,
      click: toggleWindow,
    },
    { type: "separator" },
    {
      label: text.reload,
      click: reloadChat,
    },
    {
      label: text.browser,
      click: () => openExternal(CHATGPT_URL),
    },
    { type: "separator" },
    {
      label: text.settings,
      click: showSettingsWindow,
    },
    {
      label: text.reset,
      click: () => {
        void resetSessionWithConfirmation();
      },
    },
    { type: "separator" },
    {
      label: text.quit,
      click: quitApplication,
    },
  ]);

  tray.setContextMenu(menu);
}

function displayModeUsesTray(mode: WindowDisplayMode = currentSettings.windowDisplayMode): boolean {
  return mode === "tray" || mode === "both";
}

function visibleWindowUsesTaskbar(
  mode: WindowDisplayMode = currentSettings.windowDisplayMode,
): boolean {
  return mode === "taskbar" || mode === "both";
}

function markMainWindowVisible(): void {
  mainWindowHiddenSince = null;
  updateTrayMenu();
  syncChatTabThrottling();
}

function markMainWindowHidden(): void {
  mainWindowHiddenSince ??= Date.now();
  updateTrayMenu();
  syncChatTabThrottling();
}

function showWindow(): void {
  if (!mainWindow) {
    pendingRequest = { command: "show", files: [] };
    return;
  }

  showWhenReady = true;
  mainWindow.setSkipTaskbar(!visibleWindowUsesTaskbar());
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }

  const wasVisible = mainWindow.isVisible();
  mainWindowHiddenSince = null;
  mainWindow.show();
  mainWindow.focus();
  syncChatTabThrottling();
  updateTrayMenu();
  if (!wasVisible) {
    log.info(`[window] Fenêtre affichée (shell prêt : ${shellReady ? "oui" : "non"}).`);
  }
}

function showHiddenNotification(): void {
  if (
    hasShownHideNotification ||
    !displayModeUsesTray() ||
    !Notification.isSupported()
  ) {
    return;
  }

  hasShownHideNotification = true;
  const text = mainText();
  hideNotification = new Notification({
    title: text.hiddenTitle,
    body: text.hiddenBody,
    icon: assetPath("icon.png"),
    silent: true,
  });
  hideNotification.on("click", showWindow);
  hideNotification.on("close", () => {
    hideNotification = null;
  });
  hideNotification.show();
}

function notifyResponseFinished(tabId: string): void {
  const isActiveTab = activeChatTabId === tabId;
  if (
    !currentSettings.responseNotificationsEnabled ||
    !mainWindow ||
    mainWindow.isDestroyed() ||
    (isActiveTab && mainWindow.isVisible() && !mainWindow.isMinimized() && mainWindow.isFocused()) ||
    !Notification.isSupported()
  ) {
    return;
  }

  responseNotification?.close();
  const text = mainText();
  responseNotification = new Notification({
    title: text.responseFinishedTitle,
    body: text.responseFinishedBody,
    icon: assetPath("icon.png"),
  });
  responseNotification.on("click", () => {
    activateChatTab(tabId);
    showWindow();
  });
  responseNotification.on("close", () => {
    responseNotification = null;
  });
  responseNotification.show();
}

function syncResponseMonitor(): void {
  for (const tab of chatTabs) {
    if (currentSettings.responseNotificationsEnabled) tab.monitor.start();
    else tab.monitor.stop();
  }
}

function hideWindow(notify = false): void {
  showWhenReady = false;
  mainWindowHiddenSince ??= Date.now();
  if (searchVisible) {
    hideSearch();
  }
  persistWindowBounds();
  if (mainWindow) {
    if (currentSettings.windowDisplayMode === "taskbar") {
      mainWindow.setSkipTaskbar(false);
      mainWindow.minimize();
      log.info("[window] Fenêtre réduite dans la barre des tâches.");
    } else {
      mainWindow.setSkipTaskbar(true);
      mainWindow.hide();
      log.info("[window] Fenêtre cachée dans la zone de notification.");
    }
  }
  syncChatTabThrottling();
  updateTrayMenu();
  if (notify) {
    showHiddenNotification();
  }
}

function toggleWindow(): void {
  if (!mainWindow) {
    pendingRequest = { command: "show", files: [] };
    return;
  }

  if (mainWindow.isVisible() && !mainWindow.isMinimized()) {
    hideWindow();
  } else {
    showWindow();
  }
}

function toggleCompanionWindow(): void {
  if (companionWindow && !companionWindow.isDestroyed() && companionWindow.isVisible()) {
    hideCompanionMenu();
    companionWindow.hide();
    return;
  }
  void showCompanionWindow();
}

function quitApplication(): void {
  isQuitting = true;
  app.quit();
}

function executeCommand(command: CliCommand): void {
  switch (command) {
    case "show":
      showWindow();
      break;
    case "hide":
      hideWindow();
      break;
    case "toggle":
      toggleWindow();
      break;
    case "settings":
      showSettingsWindow();
      break;
    case "companion":
      toggleCompanionWindow();
      break;
    case "quit":
      quitApplication();
      break;
  }
}

function executeRequest(request: CliRequest): void {
  if (request.command === "companion") {
    const hasExplicitContext = request.files.length > 0 || Boolean(request.text) || request.clipboard === true;
    if (hasExplicitContext) {
      void showCompanionWindow(request.files, request.text, {
        source: request.source,
        clipboard: request.clipboard === true,
      });
    } else {
      toggleCompanionWindow();
    }
    return;
  }
  executeCommand(request.command);
}

function rectanglesOverlap(a: Rectangle, b: Rectangle): boolean {
  const overlapWidth = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const overlapHeight = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return overlapWidth >= 100 && overlapHeight >= 100;
}

function isWindowBoundsVisible(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some((display) => rectanglesOverlap(bounds, display.workArea));
}

function persistWindowBounds(): void {
  if (!mainWindow || mainWindow.isDestroyed() || !settingsStore) {
    return;
  }

  const bounds = mainWindow.getNormalBounds();
  log.info(
    `[window] Géométrie détectée : ${bounds.x},${bounds.y} ${bounds.width}x${bounds.height}.`,
  );
  const previousBounds = currentSettings.windowBounds;
  currentSettings = {
    ...currentSettings,
    windowBounds: {
      x: activeDisplayServerMode === "x11" ? bounds.x : (previousBounds?.x ?? 0),
      y: activeDisplayServerMode === "x11" ? bounds.y : (previousBounds?.y ?? 0),
      width: bounds.width,
      height: bounds.height,
    },
  };

  try {
    settingsStore.save(currentSettings);
  } catch (error) {
    log.error("[settings] Impossible de mémoriser la fenêtre :", error);
  }
}

function scheduleWindowBoundsSave(): void {
  if (windowStateTimer) {
    clearTimeout(windowStateTimer);
  }

  windowStateTimer = setTimeout(() => {
    windowStateTimer = null;
    persistWindowBounds();
  }, WINDOW_STATE_DELAY_MS);
}

function activeChatTab(): ChatTab | undefined {
  return chatTabs.find((tab) => tab.id === activeChatTabId) ?? chatTabs[0];
}

function activeChatContents(): WebContents | null {
  const tab = activeChatTab();
  return tab && !tab.view.webContents.isDestroyed() ? tab.view.webContents : null;
}

function tabBarIsVisible(): boolean {
  return currentSettings.tabBarMode === "always" ||
    (currentSettings.tabBarMode === "auto" && chatTabs.length > 1);
}

function sendTabState(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.webContents.send("tabs:state", {
    tabs: chatTabs.map((tab) => ({
      id: tab.id,
      title: tab.title || APP_TITLE,
      loading: tab.loading,
      active: tab.id === activeChatTabId,
    })),
    barVisible: tabBarIsVisible(),
    updateTest: UPDATE_TEST_BANNER_HEIGHT > 0,
    canCreate: chatTabs.length < MAX_CHAT_TABS,
    darkMode: nativeTheme.shouldUseDarkColors,
  });
}

function syncChatTabThrottling(): void {
  const windowVisible = Boolean(mainWindow?.isVisible());
  const windowMinimized = Boolean(mainWindow?.isMinimized());
  for (const tab of chatTabs) {
    if (tab.view.webContents.isDestroyed()) continue;
    const next = shouldThrottleChatTab({
      windowVisible,
      windowMinimized,
      active: tab.id === activeChatTabId,
      generating: tab.monitor.isGenerationInProgress(),
    });
    if (tab.backgroundThrottling === next) continue;
    tab.view.webContents.setBackgroundThrottling(next);
    tab.backgroundThrottling = next;
  }
}

function layoutChatViews(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const bounds = mainWindow.getContentBounds();
  const top = (tabBarIsVisible() ? TAB_BAR_HEIGHT : 0) + UPDATE_TEST_BANNER_HEIGHT;
  for (const tab of chatTabs) {
    tab.view.setBounds({ x: 0, y: top, width: bounds.width, height: Math.max(1, bounds.height - top) });
    tab.view.setVisible(tab.id === activeChatTabId);
  }
  syncChatTabThrottling();
  positionSearchView();
  if (refreshView) {
    refreshView.setBounds({
      x: Math.max(0, Math.round((bounds.width - REFRESH_VIEW_WIDTH) / 2)),
      y: top + 8,
      width: REFRESH_VIEW_WIDTH,
      height: REFRESH_VIEW_HEIGHT,
    });
  }
  sendTabState();
}

function persistTabStateNow(): void {
  if (!settingsStore) return;
  const urls = chatTabs
    .map((tab) => tab.view.webContents.getURL())
    .filter(isChatGptUrl)
    .slice(0, MAX_CHAT_TABS);
  currentSettings = {
    ...currentSettings,
    openChatTabUrls: currentSettings.restoreTabsOnStartup ? urls : [],
    activeChatTabIndex: Math.max(0, chatTabs.findIndex((tab) => tab.id === activeChatTabId)),
  };
  try { settingsStore.save(currentSettings); }
  catch (error) { log.warn("[tabs] Impossible de mémoriser la session d’onglets :", error); }
}

function scheduleTabStateSave(): void {
  if (tabStateTimer) clearTimeout(tabStateTimer);
  tabStateTimer = setTimeout(() => {
    tabStateTimer = null;
    persistTabStateNow();
  }, 250);
}

function bringLocalOverlaysToFront(): void {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (searchView) {
    mainWindow.contentView.removeChildView(searchView);
    mainWindow.contentView.addChildView(searchView);
  }
  if (refreshView) {
    mainWindow.contentView.removeChildView(refreshView);
    mainWindow.contentView.addChildView(refreshView);
  }
}

function activateChatTab(id: string): void {
  const tab = chatTabs.find((candidate) => candidate.id === id);
  if (!tab) return;
  if (searchVisible) hideSearch();
  activeChatTabId = tab.id;
  layoutChatViews();
  bringLocalOverlaysToFront();
  tab.view.webContents.focus();
  scheduleTabStateSave();
}

function normalizeTabTitle(title: string): string {
  const clean = title.replace(/\s*[|—-]\s*ChatGPT\s*$/i, "").trim();
  return (clean || APP_TITLE).slice(0, 120);
}

function handleChatInput(event: Electron.Event, input: Input): void {
  if (input.type !== "keyDown") return;
  const fixed = input.control && !input.alt && !input.meta && !input.shift && /^[1-9]$/.test(input.key);
  if (fixed) {
    event.preventDefault();
    const requested = input.key === "9" ? chatTabs.at(-1) : chatTabs[Number(input.key) - 1];
    if (requested) activateChatTab(requested.id);
    return;
  }
  if (inputMatchesAccelerator(input, currentSettings.searchShortcut)) {
    event.preventDefault();
    showSearch();
  } else if (inputMatchesAccelerator(input, currentSettings.reloadShortcut)) {
    event.preventDefault();
    void safeReloadActiveTab("shortcut");
  } else if (inputMatchesAccelerator(input, currentSettings.newTabShortcut)) {
    event.preventDefault();
    createChatTab(newChatTabUrl(currentSettings), true);
  } else if (inputMatchesAccelerator(input, currentSettings.closeTabShortcut)) {
    event.preventDefault();
    const tab = activeChatTab();
    if (tab) void closeChatTab(tab.id);
  } else if (inputMatchesAccelerator(input, currentSettings.nextTabShortcut)) {
    event.preventDefault();
    cycleChatTab(1);
  } else if (inputMatchesAccelerator(input, currentSettings.previousTabShortcut)) {
    event.preventDefault();
    cycleChatTab(-1);
  } else if (inputMatchesAccelerator(input, currentSettings.reopenClosedTabShortcut)) {
    event.preventDefault();
    reopenClosedChatTab();
  } else if (input.key === "Escape" && searchVisible) {
    event.preventDefault();
    hideSearch();
  }
}

function createChatTab(url = CHATGPT_URL, activate = true): ChatTab | null {
  if (!mainWindow || mainWindow.isDestroyed() || chatTabs.length >= MAX_CHAT_TABS) return null;
  const safeUrl = isChatGptUrl(url) ? url : CHATGPT_URL;
  const id = randomUUID();
  const view = new WebContentsView({
    webPreferences: {
      partition: PERSISTENT_PARTITION,
      preload: path.join(__dirname, "chat-tab-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false,
    },
  });
  view.setBackgroundColor(resolvedThemeBackground());
  const monitor = new ChatResponseMonitor(
    view.webContents,
    () => notifyResponseFinished(id),
    () => syncChatTabThrottling(),
  );
  const tab: ChatTab = {
    id,
    view,
    title: APP_TITLE,
    loading: true,
    monitor,
    backgroundThrottling: false,
  };
  chatTabs.push(tab);
  mainWindow.contentView.addChildView(view);
  installAuthNavigation(view.webContents, (target) => { createChatTab(target, true); }, openExternal);
  view.webContents.on("before-input-event", handleChatInput);
  view.webContents.on("page-title-updated", (_event, title) => {
    tab.title = normalizeTabTitle(title);
    sendTabState();
  });
  view.webContents.on("did-start-loading", () => {
    tab.loading = true;
    tab.monitor.reset();
    sendTabState();
  });
  view.webContents.on("did-stop-loading", () => {
    tab.loading = false;
    sendTabState();
  });
  view.webContents.on("did-finish-load", () => {
    tab.loading = false;
    shellReady = true;
    view.webContents.send("pull-refresh:enabled", currentSettings.pullToRefreshEnabled);
    void applyChatThemeTo(view.webContents);
    sendTabState();
    if (showWhenReady) showWindow();
  });
  view.webContents.on("did-navigate", (_event, target) => {
    rememberConversationUrl(target);
    scheduleTabStateSave();
  });
  view.webContents.on("did-navigate-in-page", (_event, target) => {
    rememberConversationUrl(target);
    scheduleTabStateSave();
  });
  view.webContents.on("found-in-page", (_event, result) => {
    if (tab.id === activeChatTabId && searchVisible && searchView && !searchView.webContents.isDestroyed()) {
      searchView.webContents.send("search:result", result);
    }
  });
  view.webContents.on("render-process-gone", (_event, details) => {
    log.error(`[tabs] Processus de l’onglet arrêté (${details.reason}).`);
  });
  if (currentSettings.responseNotificationsEnabled) monitor.start();
  if (activate || !activeChatTabId) activeChatTabId = id;
  layoutChatViews();
  bringLocalOverlaysToFront();
  void view.webContents.loadURL(safeUrl).catch((error: unknown) => {
    tab.loading = false;
    log.error("[tabs] Impossible de charger ChatGPT :", error);
    sendTabState();
  });
  scheduleTabStateSave();
  return tab;
}

function cycleChatTab(offset: number): void {
  if (chatTabs.length < 2) return;
  const current = Math.max(0, chatTabs.findIndex((tab) => tab.id === activeChatTabId));
  const next = (current + offset + chatTabs.length) % chatTabs.length;
  activateChatTab(chatTabs[next].id);
}

function reopenClosedChatTab(): void {
  const url = closedChatTabUrls.pop();
  if (url) createChatTab(url, true);
}

async function confirmRiskyAction(contents: WebContents, action: "reload" | "close"): Promise<boolean> {
  const state = await inspectChatPageState(contents);
  if (!state.pendingText && !state.pendingFiles && !state.generating && !state.uncertain) return true;
  const french = activeLanguage === "fr";
  const spanish = activeLanguage === "es";
  const message = action === "reload"
    ? (french ? "Actualiser cet onglet ?" : spanish ? "¿Actualizar esta pestaña?" : "Reload this tab?")
    : (french ? "Fermer cet onglet ?" : spanish ? "¿Cerrar esta pestaña?" : "Close this tab?");
  const detail = french
    ? "Un brouillon, une pièce jointe ou une réponse en cours pourrait être perdu."
    : spanish
      ? "Podría perderse un borrador, un archivo adjunto o una respuesta en curso."
      : "A draft, attachment, or response in progress could be lost.";
  const result = mainWindow
    ? await dialog.showMessageBox(mainWindow, {
        type: "warning",
        message,
        detail,
        buttons: [
          mainText().cancel,
          action === "reload"
            ? mainText().reload
            : activeLanguage === "en" ? "Close" : activeLanguage === "es" ? "Cerrar" : "Fermer",
        ],
        defaultId: 0,
        cancelId: 0,
        noLink: true,
      })
    : { response: 0 };
  return result.response === 1;
}

async function closeChatTab(id: string): Promise<void> {
  const index = chatTabs.findIndex((tab) => tab.id === id);
  if (index < 0) return;
  const tab = chatTabs[index];
  if (chatTabs.length === 1) {
    if (currentSettings.lastTabCloseBehavior === "ignore") return;
    if (currentSettings.lastTabCloseBehavior === "hide") {
      hideWindow();
      return;
    }
    if (!(await confirmRiskyAction(tab.view.webContents, "close"))) return;
    tab.monitor.reset();
    await tab.view.webContents.loadURL(CHATGPT_URL);
    return;
  }
  if (!(await confirmRiskyAction(tab.view.webContents, "close"))) return;
  const url = tab.view.webContents.getURL();
  if (isChatGptUrl(url)) closedChatTabUrls.push(url);
  closedChatTabUrls = closedChatTabUrls.slice(-12);
  tab.monitor.stop();
  mainWindow?.contentView.removeChildView(tab.view);
  tab.view.webContents.close();
  chatTabs.splice(index, 1);
  if (activeChatTabId === id) {
    activeChatTabId = chatTabs[Math.min(index, chatTabs.length - 1)]?.id ?? null;
  }
  layoutChatViews();
  activeChatContents()?.focus();
  scheduleTabStateSave();
}

async function safeReloadActiveTab(source: "shortcut" | "tray" | "gesture"): Promise<void> {
  const contents = activeChatContents();
  if (!contents || !(await confirmRiskyAction(contents, "reload"))) return;
  activeChatTab()?.monitor.reset();
  contents.reloadIgnoringCache();
  log.info(`[tabs] Actualisation sécurisée demandée (${source}).`);
}

function loadChatUrl(url: string): void {
  const contents = activeChatContents();
  if (!contents) return;
  void contents.loadURL(isChatGptUrl(url) ? url : CHATGPT_URL).catch((error: unknown) => {
    log.error("[network] Impossible de charger ChatGPT :", error);
  });
}

function reloadChat(): void {
  void safeReloadActiveTab("tray");
}

function isChatGptUrl(url: string): boolean {
  try {
    return new URL(url).origin === "https://chatgpt.com";
  } catch {
    return false;
  }
}

function isConversationUrl(url: string): boolean {
  if (!isChatGptUrl(url)) {
    return false;
  }
  const pathname = new URL(url).pathname;
  return pathname.startsWith("/c/") || /^\/g\/[^/]+\/c\//.test(pathname);
}

function rememberConversationUrl(url: string): void {
  if (!isConversationUrl(url) || currentSettings.lastChatUrl === url) {
    return;
  }
  currentSettings = { ...currentSettings, lastChatUrl: url };
  try {
    settingsStore?.save(currentSettings);
  } catch (error) {
    log.warn("[companion] Impossible de mémoriser le dernier chat :", error);
  }
}

function initializeCompanionDraft(): void {
  if (companionDraftInitialized) return;
  const selectedProjectId =
    projectById(currentSettings.defaultChatGptProjectId)?.id ??
    projectById(currentSettings.lastSelectedChatGptProjectId)?.id;
  companionDraft = initialCompanionDraft(companionDraft.version + 1, selectedProjectId);
  companionDraftInitialized = true;
}

function missingDraftProjectNotice(): string {
  return activeLanguage === "en"
    ? "The selected project is no longer available. Project mode was disabled."
    : activeLanguage === "es"
      ? "El proyecto seleccionado ya no está disponible. El modo Proyecto se desactivó."
      : "Le projet sélectionné n’est plus disponible. Le mode Projet a été désactivé.";
}

function reconcileCompanionDraftProject(): void {
  const result = reconcileCompanionDraftProjectState(companionDraft, (id) => Boolean(projectById(id)));
  companionDraft = result.draft;
  if (result.disabledMissingProject) companionNotice = missingDraftProjectNotice();
}

function updateCompanionDraft(input: unknown): { ok: boolean; version: number } {
  initializeCompanionDraft();
  const result = updateCompanionDraftState(companionDraft, input, (id) => Boolean(projectById(id)));
  if (!result) return { ok: false, version: companionDraft.version };
  companionDraft = result.draft;
  if (result.invalidProject) {
    companionNotice = missingDraftProjectNotice();
  } else if (companionDraft.projectMode === "create" || companionDraft.selectedProjectId) {
    companionNotice = "";
  }
  return { ok: true, version: companionDraft.version };
}

function touchCompanionDraft(): void {
  initializeCompanionDraft();
  companionDraft = touchCompanionDraftState(companionDraft);
}

function retargetCompanionDraftToCreatedProject(project: ChatGptProject): void {
  initializeCompanionDraft();
  companionDraft = retargetCompanionDraftState(companionDraft, project.id);
  sendCompanionState();
}

function clearCompanionDraft(): void {
  companionItems = [];
  companionDraft = emptyCompanionDraft(companionDraft.version + 1);
  companionDraftInitialized = true;
  companionNotice = "";
  sendCompanionState();
}

function completeCompanionDraftTransfer(submittedVersion: number | undefined, itemIds: ReadonlySet<string>): void {
  if (submittedVersion === companionDraft.version) {
    clearCompanionDraft();
    return;
  }
  companionItems = companionItems.filter((item) => !itemIds.has(item.id));
  touchCompanionDraft();
  sendCompanionState();
  log.info("[companion] Du nouveau contexte est arrivé pendant le transfert ; il a été conservé.");
}

function companionPublicState(): object {
  initializeCompanionDraft();
  reconcileCompanionDraftProject();
  return {
    language: activeLanguage,
    hasLastChat: Boolean(currentSettings.lastChatUrl && isConversationUrl(currentSettings.lastChatUrl)),
    darkMode: nativeTheme.shouldUseDarkColors,
    themeMode: currentSettings.themeMode,
    notice: companionNotice,
    noticeId: companionNoticeId,
    transientStatus: companionTransientStatus,
    promptMaxLines: currentSettings.companionPromptMaxLines,
    projects: currentSettings.chatGptProjects.map(({ id, name, url, pinned }) => ({ id, name, url, pinned })),
    defaultProjectId: currentSettings.defaultChatGptProjectId ?? null,
    lastSelectedProjectId: currentSettings.lastSelectedChatGptProjectId ?? null,
    projectScanProgress: currentProjectScanProgress,
    draft: { ...companionDraft },
    maxFileSizeMb: Math.round(MAX_COMPANION_FILE_BYTES / (1024 * 1024)),
    items: companionItems.map(
      ({ filePath: _filePath, text: _text, temporary: _temporary, preferFileUpload: _preferFileUpload, ...item }) =>
        item,
    ),
  };
}

function resolvedThemeBackground(): string {
  return nativeTheme.shouldUseDarkColors ? "#0f1117" : "#ffffff";
}

function resolvedSettingsBackground(): string {
  return nativeTheme.shouldUseDarkColors ? "#11141b" : "#f4f6f9";
}

function sendSettingsTheme(): void {
  if (!settingsWindow || settingsWindow.isDestroyed()) return;
  settingsWindow.setBackgroundColor(resolvedSettingsBackground());
  settingsWindow.webContents.send("settings:theme", {
    darkMode: nativeTheme.shouldUseDarkColors,
    themeMode: currentSettings.themeMode,
  });
}

async function applyChatThemeTo(contents: WebContents): Promise<void> {
  if (contents.isDestroyed() || !isChatGptUrl(contents.getURL())) return;
  try {
    await contents.executeJavaScript(`(() => {
      try { localStorage.setItem('theme', 'system'); } catch {}
    })()`, true);
  } catch (error) {
    log.warn("[theme] Impossible d’appliquer immédiatement le thème à ChatGPT :", error);
  }
}

async function applyChatTheme(): Promise<void> {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setBackgroundColor(resolvedThemeBackground());
  for (const tab of chatTabs) {
    tab.view.setBackgroundColor(resolvedThemeBackground());
    await applyChatThemeTo(tab.view.webContents);
  }
  sendTabState();
}

function applyThemeMode(mode: ThemeMode): void {
  nativeTheme.themeSource = mode;
  void applyChatTheme();
  sendCompanionState();
  sendSettingsTheme();
  updateTrayIcon();
}

function saveProjectSettings(next: AppSettings): void {
  settingsStore?.save(next);
  currentSettings = next;
  reconcileCompanionDraftProject();
  sendCompanionState();
}

function projectById(id: unknown): ChatGptProject | undefined {
  return typeof id === "string"
    ? currentSettings.chatGptProjects.find((project) => project.id === id)
    : undefined;
}

function projectOperationError(error: unknown): string {
  return error instanceof Error ? error.message : "Opération projet impossible.";
}

async function ensureChatWindowForProjectOperation(): Promise<BrowserWindow> {
  showWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    throw new Error("La fenêtre ChatGPT est indisponible.");
  }
  const contents = activeChatContents();
  if (!contents) throw new Error("Aucun onglet ChatGPT disponible.");
  const currentUrl = contents.getURL();
  if (!isChatGptUrl(currentUrl)) {
    await contents.loadURL(CHATGPT_URL);
  }
  return mainWindow;
}

function destroyProjectScanWindow(): void {
  if (projectScanWindow && !projectScanWindow.isDestroyed()) {
    projectScanWindow.destroy();
  }
  projectScanWindow = null;
}

async function createHiddenProjectScanWindow(isBackground: boolean): Promise<BrowserWindow> {
  destroyProjectScanWindow();
  const window = new BrowserWindow({
    width: isBackground ? 800 : 1280,
    height: isBackground ? 600 : 900,
    show: false,
    focusable: false,
    skipTaskbar: true,
    title: "ChatGPT Project Scanner",
    webPreferences: {
      partition: PERSISTENT_PARTITION,
      preload: path.join(__dirname, "project-scan-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      backgroundThrottling: false,
    },
  });
  projectScanWindow = window;
  window.removeMenu();
  window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  window.on("closed", () => {
    if (projectScanWindow === window) projectScanWindow = null;
  });
  let loadTimeout: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      window.loadURL(CHATGPT_URL),
      new Promise<never>((_resolve, reject) => {
        loadTimeout = setTimeout(
          () => reject(new Error("Chargement de la fenêtre de scan expiré.")),
          25_000,
        );
      }),
    ]);
  } finally {
    if (loadTimeout) clearTimeout(loadTimeout);
  }
  if (window.isDestroyed()) throw new Error("La fenêtre de scan s’est fermée prématurément.");
  if (isBackground) return window;
  let refreshTimeout: ReturnType<typeof setTimeout> | null = null;
  try {
    await Promise.race([
      new Promise<void>((resolve) => {
        window.webContents.once("did-finish-load", () => resolve());
        window.webContents.reloadIgnoringCache();
      }),
      new Promise<never>((_resolve, reject) => {
        refreshTimeout = setTimeout(
          () => reject(new Error("Actualisation de la fenêtre de scan expirée.")),
          25_000,
        );
      }),
    ]);
  } finally {
    if (refreshTimeout) clearTimeout(refreshTimeout);
  }
  if (window.isDestroyed()) throw new Error("La fenêtre de scan s’est fermée pendant l’actualisation.");
  return window;
}

async function synchronizeProjectCache(trigger: ProjectSyncTrigger): Promise<{
  ok: boolean;
  error?: string;
  result?: Awaited<ReturnType<typeof scanChatGptProjects>>;
}> {
  if (projectSyncInProgress) {
    return { ok: false, error: "Une synchronisation des projets est déjà en cours." };
  }
  projectSyncInProgress = true;
  const scanId = randomUUID();
  const isBackground = trigger === "background";
  const timeoutMs = projectSyncTimeoutMs(trigger);
  let syncTimedOut = false;
  const previousProjects = currentSettings.chatGptProjects.map((project) => ({ ...project }));
  if (!isBackground) {
    broadcastProjectScanProgress({
      scanId,
      phase: "loading",
      completed: 0,
      total: 0,
      successes: 0,
      failures: 0,
      percent: 0,
    });
  }
  log.info(`[projects:${scanId}] Synchronisation ${trigger} démarrée; cache avant=${previousProjects.length}.`);
  try {
    const result = await runProjectSyncWithTimeout(
      timeoutMs,
      async (signal) => {
        const window = await createHiddenProjectScanWindow(isBackground);
        return scanChatGptProjects(window.webContents, {
          scanId,
          signal,
          ...(isBackground
            ? { maxShowMoreClicks: 20, maxProjects: 200, maxResolvedProjects: 10 }
            : {}),
          ...(!isBackground
            ? {
                onProgress: (progress: ProjectScanProgress) => {
                  if (!syncTimedOut) broadcastProjectScanProgress(progress);
                },
              }
            : {}),
        });
      },
      () => {
        syncTimedOut = true;
        log.warn(
          `[projects:${scanId}] Timeout global après ${Math.round(timeoutMs / 60_000)} minute(s), ` +
            "destruction de la fenêtre de scan.",
        );
        destroyProjectScanWindow();
      },
    );
    const at = new Date().toISOString();
    log.info(
      `[projects:${scanId}] Sidebar observée=${result.sidebarNames.length}, ` +
        `couverture=${result.sidebarComplete ? "complète" : "partielle"}, ` +
        `dépliages=${result.showMoreClicks}, projets contrôlés=${result.discovered}, ` +
        `épinglés=${result.projects.filter((project) => project.pinned === true).length}.`,
    );
    for (const project of result.projects) {
      const index = project.sidebarOrder ?? -1;
      log.info(
        `[projects:${scanId}] Résolu ${index + 1}/${result.discovered} ` +
          `« ${project.remoteName ?? project.name} » id=${project.projectId ?? project.id} ` +
          `durée=${result.durationsMs[index] ?? "?"}ms.`,
      );
    }
    for (const failure of result.failures) {
      log.warn(
        `[projects:${scanId}] Échec ${failure.initialIndex + 1}/${result.discovered} ` +
          `« ${failure.name} » occurrence=${failure.occurrence + 1} durée=${failure.durationMs}ms : ${failure.error}`,
      );
    }
    if (result.projects.length === 0 || result.status === "error") {
      if (trigger !== "background") {
        saveProjectSettings({
          ...currentSettings,
          projectSyncStatus: {
            status: "error",
            at,
            message: `${result.message} La liste ChatGPT n’a pas pu être lue. Les projets déjà enregistrés sont conservés ; réessayez la synchronisation.`,
          },
        });
      }
      log.warn(`[projects:${scanId}] Synchronisation sans résultat, cache conservé : ${result.message}`);
      if (!isBackground) {
        broadcastProjectScanProgress({
          scanId,
          phase: "complete",
          completed: result.discovered,
          total: result.discovered,
          successes: 0,
          failures: result.failures.length,
          percent: 100,
        });
      }
      return {
        ok: false,
        error: `${result.message} La liste ChatGPT n’a pas pu être lue. Les projets déjà enregistrés sont conservés ; réessayez la synchronisation.`,
        result,
      };
    }
    // A full scan already associates each URL/projectId with its exact initial
    // sidebar position. Reordering again by name would group same-name projects.
    const removeMissing = result.sidebarComplete;
    if (isBackground && !result.sidebarComplete) {
      log.info(
        `[projects:${scanId}] Liste background partielle : suppressions distantes reportées, cache conservé.`,
      );
    }
    const mergedProjects = reconcileProjectsFromSidebar(
      currentSettings.chatGptProjects,
      result.projects,
      result.sidebarNames,
      at,
      removeMissing,
    );
    log.info(
      `[projects:${scanId}] Fusion cache avant=${currentSettings.chatGptProjects.length}, ` +
        `entrants=${result.projects.length}, après=${mergedProjects.length}, doublons ignorés=${result.duplicatesSkipped}.`,
    );
    if (!isBackground) {
      broadcastProjectScanProgress({
        scanId,
        phase: "saving",
        completed: result.discovered,
        total: result.discovered,
        successes: result.projects.length,
        failures: result.failures.length,
        percent: 100,
      });
    }
    const mergedIds = new Set(mergedProjects.map((project) => project.id));
    const nextSettings: AppSettings = {
      ...currentSettings,
      chatGptProjects: mergedProjects,
      defaultChatGptProjectId: currentSettings.defaultChatGptProjectId &&
        mergedIds.has(currentSettings.defaultChatGptProjectId)
        ? currentSettings.defaultChatGptProjectId
        : undefined,
      lastSelectedChatGptProjectId: currentSettings.lastSelectedChatGptProjectId &&
        mergedIds.has(currentSettings.lastSelectedChatGptProjectId)
        ? currentSettings.lastSelectedChatGptProjectId
        : undefined,
      projectSyncStatus: {
        status: result.status,
        at,
        message: `${mergedProjects.length} projet(s) dans le cache local.`,
      },
    };
    saveProjectSettings(nextSettings);
    const verified = settingsStore?.load();
    const verifiedIds = new Set(verified?.chatGptProjects.map((project) => project.id) ?? []);
    const missingIds = mergedProjects.filter((project) => !verifiedIds.has(project.id));
    log.info(`[projects:${scanId}] Cache relu sur disque=${verified?.chatGptProjects.length ?? 0}.`);
    if (!verified || missingIds.length > 0) {
      const message = `Vérification du cache échouée (${missingIds.length} projet(s) manquant(s)).`;
      const rollback: AppSettings = {
        ...nextSettings,
        chatGptProjects: previousProjects,
        projectSyncStatus: { status: "error", at: new Date().toISOString(), message },
      };
      saveProjectSettings(rollback);
      throw new Error(message);
    }
    currentSettings = verified;
    sendCompanionState();
    if (!isBackground) {
      broadcastProjectScanProgress({
        scanId,
        phase: "complete",
        completed: result.discovered,
        total: result.discovered,
        successes: result.projects.length,
        failures: result.failures.length,
        percent: 100,
        etaMs: 0,
      });
    }
    log.info(`[projects:${scanId}] Synchronisation enregistrée : ${result.message}`);
    return { ok: true, result };
  } catch (error) {
    const reason = projectOperationError(error);
    const message = `${reason} Vérifiez que vous êtes connecté à ChatGPT, puis réessayez.`;
    if (trigger !== "background") {
      saveProjectSettings({
        ...currentSettings,
        projectSyncStatus: { status: "error", at: new Date().toISOString(), message },
      });
    }
    const previousStillAvailable = previousProjects.every((project) =>
      currentSettings.chatGptProjects.some((candidate) => candidate.id === project.id),
    );
    if (!previousStillAvailable) {
      saveProjectSettings({ ...currentSettings, chatGptProjects: previousProjects });
    }
    if (!isBackground) {
      const last = currentProjectScanProgress;
      broadcastProjectScanProgress({
        scanId,
        phase: "complete",
        completed: last?.scanId === scanId ? last.completed : 0,
        total: last?.scanId === scanId ? last.total : 0,
        successes: last?.scanId === scanId ? last.successes : 0,
        failures: last?.scanId === scanId ? Math.max(1, last.failures) : 1,
        percent: last?.scanId === scanId ? last.percent : 0,
      });
    }
    log.warn(
      `[projects:${scanId}] ${error instanceof ProjectSyncTimeoutError ? "Synchronisation expirée" : "Synchronisation impossible"}, ` +
        "cache conservé :",
      error,
    );
    return { ok: false, error: message };
  } finally {
    destroyProjectScanWindow();
    projectSyncInProgress = false;
  }
}

async function synchronizeProjectsInBackground(): Promise<void> {
  if (isQuitting || projectSyncInProgress || currentSettings.chatGptProjects.length === 0) return;
  const now = Date.now();
  const idleSeconds = powerMonitor.getSystemIdleTime();
  const skipReason = projectSyncSkipReason("background", {
    idleSeconds,
    hiddenSince: mainWindowHiddenSince,
    now,
  });
  if (skipReason === "idle") {
    log.info(
      `[projects] Contrôle automatique ignoré : utilisateur inactif depuis ${idleSeconds} seconde(s).`,
    );
    return;
  }
  if (skipReason === "hidden") {
    log.info("[projects] Contrôle automatique ignoré : fenêtre principale cachée depuis plus de 15 minutes.");
    return;
  }
  const result = await synchronizeProjectCache("background");
  if (result.ok) {
    log.info("[projects] Resynchronisation automatique cachée terminée.");
  } else {
    log.warn(`[projects] Resynchronisation automatique ignorée : ${result.error ?? "échec inconnu"}`);
  }
}

function sendCompanionState(): void {
  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.webContents.send("companion:state", companionPublicState());
  }
}

function broadcastProjectScanProgress(progress: ProjectScanProgress): void {
  currentProjectScanProgress = progress;
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.webContents.send("projects:progress", progress);
  }
  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.webContents.send("companion:project-sync-progress", progress);
  }
}

function scheduleCompanionTestCapture(): void {
  if (!companionTestCapturePath || !companionWindow || companionWindow.isDestroyed()) {
    return;
  }
  setTimeout(() => {
    if (!companionWindow || companionWindow.isDestroyed()) {
      return;
    }
    showCompanionMenu();
    setTimeout(() => {
      if (!companionWindow || companionWindow.isDestroyed()) {
        return;
      }
      const child = spawn(
        "spectacle",
        ["--fullscreen", "--background", "--nonotify", "--new-instance", "--output", companionTestCapturePath],
        { stdio: "ignore" },
      );
      child.once("close", () => {
        log.info(`[companion:test] Capture écran écrite : ${companionTestCapturePath}`);
        app.quit();
      });
      child.once("error", (error) => {
        log.error("[companion:test] Capture Spectacle impossible :", error);
        app.quit();
      });
    }, 900);
  }, 500);
}

function isImageFile(filePath: string): boolean {
  return /\.(?:avif|bmp|gif|jpe?g|png|webp)$/i.test(filePath);
}

function mimeTypeForPath(filePath: string): string {
  const extension = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    ".avif": "image/avif",
    ".bmp": "image/bmp",
    ".gif": "image/gif",
    ".jpeg": "image/jpeg",
    ".jpg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".pdf": "application/pdf",
    ".txt": "text/plain",
    ".md": "text/markdown",
    ".json": "application/json",
    ".csv": "text/csv",
    ".py": "text/x-python",
    ".js": "text/javascript",
    ".ts": "text/typescript",
    ".zip": "application/zip",
    ".gz": "application/gzip",
    ".dmg": "application/x-apple-diskimage",
    ".tar": "application/x-tar",
  };
  return types[extension] ?? "application/octet-stream";
}

async function fileVisuals(filePath: string, image: boolean): Promise<{
  thumbnailDataUrl?: string;
  iconDataUrl?: string;
}> {
  try {
    if (image) {
      const source = nativeImage.createFromPath(filePath);
      if (!source.isEmpty()) {
        const thumbnail = source.resize({ width: 112, height: 112 });
        return { thumbnailDataUrl: thumbnail.toDataURL() };
      }
    }
  } catch (error) {
    log.warn(`[magic-bar] Miniature impossible (${filePath}) :`, error);
  }

  try {
    const fileIcon = await app.getFileIcon(filePath, { size: "normal" });
    if (!fileIcon.isEmpty()) {
      return { iconDataUrl: fileIcon.resize({ width: 36, height: 36 }).toDataURL() };
    }
  } catch (error) {
    log.warn(`[magic-bar] Icône système impossible (${filePath}) :`, error);
  }
  return {};
}

async function addCompanionPaths(
  filePaths: readonly string[],
  temporary = false,
  options: { preferFileUpload?: boolean; source?: string } = {},
): Promise<number> {
  let added = 0;
  for (const candidate of filePaths) {
    try {
      const resolvedPath = path.resolve(candidate);
      const stat = fs.statSync(resolvedPath);
      const fileCount = companionItems.filter((item) => item.filePath).length;
      if (
        !stat.isFile() ||
        stat.size > MAX_COMPANION_FILE_BYTES ||
        fileCount >= MAX_COMPANION_FILES ||
        companionItems.some((item) => item.filePath === resolvedPath)
      ) {
        if (stat.size > MAX_COMPANION_FILE_BYTES) {
          log.warn(`[magic-bar] Fichier trop volumineux ignoré (${resolvedPath}).`);
        }
        continue;
      }
      const image = isImageFile(resolvedPath);
      const visuals = await fileVisuals(resolvedPath, image);
      companionItems.push({
        id: randomUUID(),
        type: image ? "image" : "file",
        name: path.basename(resolvedPath),
        source: options.source ?? (temporary ? "Spectacle" : undefined),
        preview: `${Math.max(1, Math.round(stat.size / 1024))} Ko`,
        ...visuals,
        filePath: resolvedPath,
        temporary,
        preferFileUpload: options.preferFileUpload === true,
      });
      added += 1;
    } catch (error) {
      log.warn(`[companion] Fichier ignoré (${candidate}) :`, error);
    }
  }
  if (added > 0) {
    touchCompanionDraft();
    sendCompanionState();
  }
  return added;
}

function clipboardSourceLabel(): string {
  return activeLanguage === "en"
    ? "Clipboard"
    : activeLanguage === "es"
      ? "Portapapeles"
      : "Presse-papiers";
}

function clipboardFilePayload(): { formatPresent: boolean; paths: string[] } {
  const formats = clipboard.availableFormats("clipboard");
  const uriListFormat = formats.find((format) => {
    const normalized = format.toLowerCase().split(";", 1)[0];
    return normalized === "text/uri-list" || normalized === "x-special/gnome-copied-files";
  });
  if (!uriListFormat) return { formatPresent: false, paths: [] };

  const uriList = clipboard.readBuffer(uriListFormat).toString("utf8").replace(/\0/g, "\n");
  return { formatPresent: true, paths: parseClipboardFileUris(uriList, 50) };
}

function appendClipboardTextToPrompt(text: string): boolean {
  initializeCompanionDraft();
  const nextDraft = appendCompanionPromptText(companionDraft, text);
  if (nextDraft === companionDraft) return false;
  companionDraft = nextDraft;
  companionNotice = "";
  sendCompanionState();
  return true;
}

function addIncomingTextContext(text: string, source?: string): void {
  const cleaned = text.trim().slice(0, MAX_CONTEXT_LENGTH);
  if (!cleaned) {
    return;
  }
  companionItems.push({
    id: randomUUID(),
    type: "text",
    name:
      activeLanguage === "en"
        ? "External text"
        : activeLanguage === "es"
          ? "Texto externo"
          : "Texte externe",
    source:
      source ||
      (activeLanguage === "en"
        ? "Explicit input"
        : activeLanguage === "es"
          ? "Entrada explícita"
          : "Entrée explicite"),
    preview: cleaned.length < 240 ? cleaned : `${cleaned.slice(0, 237)}…`,
    text: cleaned,
  });
  touchCompanionDraft();
}

function createCompanionWindow(): void {
  companionWindow = new BrowserWindow({
    width: MAGIC_BAR_WIDTH,
    height: MAGIC_BAR_FALLBACK_HEIGHT,
    minWidth: 520,
    minHeight: MAGIC_BAR_FALLBACK_HEIGHT,
    maxHeight: MAGIC_BAR_FALLBACK_HEIGHT,
    show: false,
    frame: false,
    hasShadow: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    title: "ChatGPT Magic Bar",
    icon: assetPath("icon.png"),
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "companion-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  companionWindow.setMenuBarVisibility(false);
  companionWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  companionWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape") {
      event.preventDefault();
      companionWindow?.hide();
    }
  });
  companionWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideCompanionMenu();
      hideCompanionPreview();
      companionWindow?.hide();
    }
  });
  companionWindow.on("hide", () => {
    hideCompanionMenu();
    hideCompanionPreview();
    if (companionWindow && !companionWindow.isDestroyed()) {
      companionWindow.webContents.send("companion:hidden");
    }
  });
  companionWindow.on("closed", () => {
    hideCompanionMenu();
    destroyCompanionPreviewWindow();
    companionWindow = null;
  });
  companionWindow.webContents.on("did-finish-load", sendCompanionState);
  void companionWindow.loadFile(rendererPath("companion.html")).catch((error: unknown) => {
    log.error("[companion] Impossible de charger la fenêtre :", error);
  });
}

function hideCompanionPreview(): void {
  if (companionPreviewWindow && !companionPreviewWindow.isDestroyed()) {
    companionPreviewWindow.hide();
  }
}

function destroyCompanionPreviewWindow(): void {
  const previewWindow = companionPreviewWindow;
  companionPreviewWindow = null;
  companionPreviewLoadPromise = null;
  if (previewWindow && !previewWindow.isDestroyed()) {
    previewWindow.destroy();
  }
}

function createCompanionPreviewWindow(): BrowserWindow {
  if (companionPreviewWindow && !companionPreviewWindow.isDestroyed()) {
    return companionPreviewWindow;
  }

  const previewWindow = new BrowserWindow({
    width: 960,
    height: 720,
    minWidth: MAGIC_PREVIEW_MIN_WIDTH,
    minHeight: MAGIC_PREVIEW_MIN_HEIGHT,
    show: false,
    frame: false,
    hasShadow: true,
    transparent: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    title: "ChatGPT Magic Bar Aperçu",
    icon: assetPath("icon.png"),
    backgroundColor: resolvedThemeBackground(),
    webPreferences: {
      preload: path.join(__dirname, "companion-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  companionPreviewWindow = previewWindow;

  previewWindow.setMenuBarVisibility(false);
  previewWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  previewWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape") {
      event.preventDefault();
      hideCompanionPreview();
    }
  });
  previewWindow.on("blur", () => {
    setTimeout(() => {
      if (
        companionPreviewWindow === previewWindow &&
        !previewWindow.isDestroyed() &&
        previewWindow.isVisible() &&
        !previewWindow.isFocused()
      ) {
        hideCompanionPreview();
      }
    }, 120);
  });
  previewWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      hideCompanionPreview();
    }
  });
  previewWindow.on("closed", () => {
    if (companionPreviewWindow === previewWindow) {
      companionPreviewWindow = null;
      companionPreviewLoadPromise = null;
    }
  });
  companionPreviewLoadPromise = previewWindow
    .loadFile(rendererPath("companion-preview.html"))
    .catch((error: unknown) => {
      log.error("[magic-bar] Impossible de charger l’aperçu image :", error);
      if (companionPreviewWindow === previewWindow) {
        destroyCompanionPreviewWindow();
      }
      throw error;
    });
  return previewWindow;
}

async function openCompanionPreview(itemId: unknown): Promise<{ ok: boolean }> {
  if (typeof itemId !== "string") return { ok: false };
  const item = companionItems.find((candidate) => candidate.id === itemId);
  if (!item || item.type !== "image" || !item.filePath) {
    log.warn(`[magic-bar] Aperçu refusé : image introuvable (${itemId}).`);
    return { ok: false };
  }
  if (!companionWindow || companionWindow.isDestroyed()) {
    log.warn("[magic-bar] Aperçu refusé : Magic Bar indisponible.");
    return { ok: false };
  }

  try {
    const source = nativeImage.createFromPath(item.filePath);
    if (source.isEmpty()) throw new Error("Image illisible.");
    const sourceSize = source.getSize();
    const largestEdge = Math.max(sourceSize.width, sourceSize.height);
    const previewImage = largestEdge > MAGIC_PREVIEW_MAX_SOURCE_EDGE
      ? sourceSize.width >= sourceSize.height
        ? source.resize({ width: MAGIC_PREVIEW_MAX_SOURCE_EDGE })
        : source.resize({ height: MAGIC_PREVIEW_MAX_SOURCE_EDGE })
      : source;
    const previewSize = previewImage.getSize();
    const display = screen.getDisplayMatching(companionWindow.getBounds());
    const workArea = display.workArea;
    const maxWidth = Math.max(
      MAGIC_PREVIEW_MIN_WIDTH,
      Math.floor(workArea.width * MAGIC_PREVIEW_MAX_RATIO),
    );
    const maxHeight = Math.max(
      MAGIC_PREVIEW_MIN_HEIGHT,
      Math.floor(workArea.height * MAGIC_PREVIEW_MAX_RATIO),
    );
    const width = Math.min(
      maxWidth,
      Math.max(MAGIC_PREVIEW_MIN_WIDTH, previewSize.width + MAGIC_PREVIEW_CHROME_WIDTH),
    );
    const height = Math.min(
      maxHeight,
      Math.max(MAGIC_PREVIEW_MIN_HEIGHT, previewSize.height + MAGIC_PREVIEW_CHROME_HEIGHT),
    );
    const bounds: Rectangle = {
      x: workArea.x + Math.round((workArea.width - width) / 2),
      y: workArea.y + Math.round((workArea.height - height) / 2),
      width,
      height,
    };

    const previewWindow = createCompanionPreviewWindow();
    if (companionPreviewLoadPromise) await companionPreviewLoadPromise;
    if (previewWindow.isDestroyed() || companionPreviewWindow !== previewWindow) {
      return { ok: false };
    }
    previewWindow.setBackgroundColor(resolvedThemeBackground());
    previewWindow.setMaximumSize(maxWidth, maxHeight);
    previewWindow.setMinimumSize(MAGIC_PREVIEW_MIN_WIDTH, MAGIC_PREVIEW_MIN_HEIGHT);
    previewWindow.setBounds(bounds, false);
    previewWindow.webContents.send("companion:preview-data", {
      name: item.name,
      dataUrl: previewImage.toDataURL(),
      language: activeLanguage,
      darkMode: nativeTheme.shouldUseDarkColors,
    });
    previewWindow.show();
    previewWindow.focus();
    return { ok: true };
  } catch (error) {
    log.warn(`[magic-bar] Aperçu image impossible (${item.filePath}) :`, error);
    hideCompanionPreview();
    return { ok: false };
  }
}

function createCompanionMenuWindow(): void {
  companionMenuWindow = new BrowserWindow({
    width: MAGIC_MENU_WIDTH,
    height: MAGIC_MENU_HEIGHT,
    show: false,
    frame: false,
    hasShadow: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    title: "ChatGPT Magic Bar Menu",
    icon: assetPath("icon.png"),
    backgroundColor: "#00000000",
    webPreferences: {
      preload: path.join(__dirname, "companion-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  companionMenuWindow.setMenuBarVisibility(false);
  companionMenuWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  companionMenuWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "Escape") {
      event.preventDefault();
      hideCompanionMenu();
    }
  });
  companionMenuWindow.on("blur", () => {
    setTimeout(() => {
      if (companionExpanded) {
        hideCompanionMenu();
      }
    }, 120);
  });
  companionMenuWindow.on("closed", () => {
    companionMenuWindow = null;
  });
  void companionMenuWindow.loadFile(rendererPath("companion-menu.html")).catch((error: unknown) => {
    log.error("[magic-bar] Impossible de charger le menu :", error);
  });
}

function hideCompanionMenu(): void {
  companionExpanded = false;
  if (companionMenuWindow && !companionMenuWindow.isDestroyed()) {
    companionMenuWindow.hide();
  }
  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.webContents.send("companion:menu-visibility", false);
  }
}

function setCompanionShape(rects: Rectangle[]): void {
  if (!companionWindow || companionWindow.isDestroyed()) {
    return;
  }
  if (activeDisplayServerMode === "x11") {
    return;
  }
  try {
    companionWindow.setShape(rects);
  } catch (error) {
    log.warn("[companion] Forme de fenêtre non disponible :", error);
  }
}

function companionMenuBounds(): Rectangle | null {
  if (
    !companionWindow ||
    companionWindow.isDestroyed() ||
    !companionMenuWindow ||
    companionMenuWindow.isDestroyed()
  ) {
    return null;
  }
  const barBounds = companionWindow.getBounds();
  const display = screen.getDisplayMatching(barBounds);
  const workArea = display.workArea;
  const width = MAGIC_MENU_WIDTH;
  const height = MAGIC_MENU_HEIGHT;
  const x = Math.max(
    workArea.x + MAGIC_MENU_GAP,
    Math.min(barBounds.x, workArea.x + workArea.width - width - MAGIC_MENU_GAP),
  );
  const y = Math.max(workArea.y + MAGIC_MENU_GAP, barBounds.y - height - MAGIC_MENU_GAP);
  return { x, y, width, height };
}

function positionCompanionMenu(): void {
  const bounds = companionMenuBounds();
  if (!bounds || !companionMenuWindow || companionMenuWindow.isDestroyed()) {
    return;
  }
  companionMenuWindow.setBounds(bounds, false);
  companionMenuWindow.setPosition(bounds.x, bounds.y, false);
}

function showCompanionMenu(): void {
  if (!companionWindow || companionWindow.isDestroyed() || !companionWindow.isVisible()) {
    return;
  }
  if (!companionMenuWindow || companionMenuWindow.isDestroyed()) {
    createCompanionMenuWindow();
  }
  companionExpanded = true;
  positionCompanionMenu();
  companionMenuWindow?.setSkipTaskbar(true);
  companionMenuWindow?.setOpacity(0);
  companionMenuWindow?.show();
  setTimeout(() => {
    if (companionMenuWindow && !companionMenuWindow.isDestroyed() && companionMenuWindow.isVisible()) {
      companionMenuWindow.setOpacity(1);
    }
  }, 160);
  companionMenuWindow?.focus();
  companionWindow.webContents.send("companion:menu-visibility", true);
}

function positionCompanionInitially(): void {
  if (!companionWindow || companionWindow.isDestroyed()) {
    return;
  }
  const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
  const workArea = display.workArea;
  const width = Math.min(MAGIC_BAR_WIDTH, workArea.width - 32);
  const height = Math.min(Math.max(MAGIC_BAR_MIN_HEIGHT, companionMeasuredHeight), workArea.height - 32);
  const y = workArea.y + workArea.height - height - 34;
  companionWindow.setBounds({
    x: workArea.x + Math.round((workArea.width - width) / 2),
    y,
    width,
    height,
  });
}

async function showCompanionWindow(
  filePaths: readonly string[] = [],
  incomingText?: string,
  options: { source?: string; clipboard?: boolean } = {},
): Promise<void> {
  if (!currentSettings.companionEnabled) {
    showSettingsWindow();
    return;
  }

  initializeCompanionDraft();
  if (incomingText) {
    addIncomingTextContext(incomingText, options.source);
  }
  if (options.clipboard) {
    await importClipboardToCompanion();
  }
  await addCompanionPaths(filePaths, false, { source: options.source });

  const needsInitialPosition = !companionWindow || companionWindow.isDestroyed();
  if (needsInitialPosition) {
    createCompanionWindow();
    positionCompanionInitially();
  }
  companionWindow?.setSkipTaskbar(true);
  companionWindow?.show();
  companionWindow?.focus();
  sendCompanionState();
  scheduleCompanionTestCapture();
  log.info(`[companion] Fenêtre ouverte avec ${companionItems.length} contexte(s).`);
}

async function chooseCompanionFiles(): Promise<void> {
  if (!companionWindow || companionWindow.isDestroyed()) {
    return;
  }
  const result = await dialog.showOpenDialog(companionWindow, {
    properties: ["openFile", "multiSelections"],
    title:
      activeLanguage === "en"
        ? "Add files"
        : activeLanguage === "es"
          ? "Añadir archivos"
          : "Ajouter des fichiers",
  });
  if (!result.canceled) {
    await addCompanionPaths(result.filePaths);
  }
}

function restoreCompanionAfterCapture(): void {
  if (companionWindow && !companionWindow.isDestroyed()) {
    companionWindow.show();
    companionWindow.focus();
  }
}

function clearCompanionFeedback(): void {
  companionNotice = "";
  if (companionTransientStatus.key) {
    companionTransientStatus = { id: companionTransientStatus.id + 1 };
  }
}

function showCompanionError(key: CompanionFeedbackKey): void {
  clearCompanionFeedback();
  companionNotice = key;
  companionNoticeId += 1;
  sendCompanionState();
}

function showCompanionTransientStatus(key: CompanionFeedbackKey): void {
  clearCompanionFeedback();
  companionTransientStatus = {
    id: companionTransientStatus.id + 1,
    key,
    expiresAt: Date.now() + 3_200,
  };
  sendCompanionState();
}

async function captureWithSpectacle(mode: unknown): Promise<{ ok: boolean; cancelled?: boolean }> {
  const modeArgs: Record<string, string[]> = {
    region: ["--region"],
    screen: ["--fullscreen"],
    window: ["--windowundercursor", "--onclick"],
  };
  if (typeof mode !== "string" || !modeArgs[mode]) {
    showCompanionError("captureError");
    return { ok: false };
  }

  fs.mkdirSync(COMPANION_TEMP_DIR, { recursive: true });
  const outputPath = path.join(COMPANION_TEMP_DIR, `capture-${Date.now()}-${randomUUID()}.png`);
  companionWindow?.hide();
  await new Promise((resolve) => setTimeout(resolve, 250));

  return new Promise((resolve) => {
    let failedToStart = false;
    const child = spawn(
      "spectacle",
      [...modeArgs[mode], "--background", "--nonotify", "--new-instance", "--output", outputPath],
      { stdio: "ignore" },
    );
    child.once("error", (error) => {
      failedToStart = true;
      log.error("[companion] Spectacle indisponible :", error);
      restoreCompanionAfterCapture();
      showCompanionError("captureError");
      resolve({ ok: false });
    });
    child.once("close", (code) => {
      if (failedToStart) return;
      void (async () => {
        const captured = code === 0 && fs.existsSync(outputPath) && fs.statSync(outputPath).size > 0;
        if (captured) {
          clearCompanionFeedback();
          const added = await addCompanionPaths([outputPath], true, { preferFileUpload: true });
          if (added !== 1) showCompanionError("captureError");
          restoreCompanionAfterCapture();
          resolve({ ok: added === 1 });
          return;
        }
        fs.rmSync(outputPath, { force: true });
        restoreCompanionAfterCapture();
        showCompanionTransientStatus("captureError");
        resolve({ ok: false, cancelled: true });
      })();
    });
  });
}

async function importClipboardToCompanion(): Promise<{
  ok: boolean;
  kind?: "files" | "image" | "text";
  added?: number;
}> {
  const filePayload = clipboardFilePayload();
  if (filePayload.formatPresent) {
    if (filePayload.paths.length === 0) {
      showCompanionError("clipboardEmpty");
      return { ok: false };
    }
    clearCompanionFeedback();
    const added = await addCompanionPaths(filePayload.paths, false, { source: clipboardSourceLabel() });
    if (added === 0) showCompanionError("clipboardEmpty");
    return { ok: added > 0, kind: "files", added };
  }

  const image = clipboard.readImage("clipboard");
  if (!image.isEmpty()) {
    fs.mkdirSync(COMPANION_TEMP_DIR, { recursive: true });
    const outputPath = path.join(COMPANION_TEMP_DIR, `clipboard-${Date.now()}-${randomUUID()}.png`);
    try {
      fs.writeFileSync(outputPath, image.toPNG(), { mode: 0o600 });
      clearCompanionFeedback();
      const added = await addCompanionPaths([outputPath], true, {
        preferFileUpload: true,
        source: clipboardSourceLabel(),
      });
      if (added !== 1) showCompanionError("clipboardEmpty");
      return { ok: added === 1, kind: "image", added };
    } catch (error) {
      fs.rmSync(outputPath, { force: true });
      log.error("[companion] Image du presse-papiers indisponible :", error);
      showCompanionError("clipboardEmpty");
      return { ok: false };
    }
  }

  const text = clipboard.readText("clipboard");
  if (appendClipboardTextToPrompt(text)) {
    clearCompanionFeedback();
    return { ok: true, kind: "text" };
  }
  showCompanionError("clipboardEmpty");
  return { ok: false };
}

async function waitForComposer(timeoutMs = 12_000): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (mainWindow && !mainWindow.isDestroyed() && Date.now() < deadline) {
    const contents = activeChatContents();
    if (!contents || !isChatGptUrl(contents.getURL())) {
      return false;
    }
    try {
      const found = (await contents.executeJavaScript(
        `Boolean(document.querySelector('#prompt-textarea') || document.querySelector('[data-testid="prompt-textarea"]') || document.querySelector('form textarea') || document.querySelector('form [contenteditable="true"]'))`,
        true,
      )) as boolean;
      if (found) {
        return true;
      }
    } catch {
      // La navigation peut remplacer le document pendant cette courte attente.
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  return false;
}

function companionFileNames(filePaths: readonly string[]): string[] {
  return filePaths.map((filePath) => path.basename(filePath)).filter(Boolean);
}

async function visibleComposerAttachmentSnapshot(
  filePaths: readonly string[] = [],
): Promise<ComposerAttachmentSnapshot> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { markerCount: 0, matchedNames: [] };
  }
  const contents = activeChatContents();
  if (!contents) return { markerCount: 0, matchedNames: [] };
  try {
    return (await contents.executeJavaScript(
      composerAttachmentProbeScript(companionFileNames(filePaths)),
      true,
    )) as ComposerAttachmentSnapshot;
  } catch {
    return { markerCount: 0, matchedNames: [] };
  }
}

async function waitForVisibleAttachments(
  filePaths: readonly string[],
  timeoutMs = 3_000,
  baseline: ComposerAttachmentSnapshot = { markerCount: 0, matchedNames: [] },
): Promise<boolean> {
  if (filePaths.length === 0) {
    return true;
  }
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const current = await visibleComposerAttachmentSnapshot(filePaths);
    if (attachmentSnapshotProvesBatch(companionFileNames(filePaths), baseline, current)) return true;
    await new Promise((resolve) => setTimeout(resolve, 350));
  }
  return false;
}

async function clickChatUploadEntry(): Promise<boolean> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }
  const contents = activeChatContents();
  if (!contents) return false;
  return (await contents.executeJavaScript(
    `(() => {
      const composer = document.querySelector('#prompt-textarea') ||
        document.querySelector('[data-testid="prompt-textarea"]') ||
        document.querySelector('form textarea') ||
        document.querySelector('form [contenteditable="true"]');
      const form = composer?.closest('form') || document.querySelector('form');
      const directInput = form?.querySelector('input[type="file"]') ||
        document.querySelector('input[type="file"][multiple]') ||
        document.querySelector('input[type="file"]');
      if (directInput) {
        directInput.click();
        return true;
      }

      const buttons = [...document.querySelectorAll('button, [role="button"]')];
      const plus = document.querySelector('#composer-plus-btn') ||
        document.querySelector('[data-testid="composer-plus-btn"]') ||
        document.querySelector('[data-testid*="plus" i]') ||
        document.querySelector('[aria-label*="Attach" i]') ||
        document.querySelector('[aria-label*="Joindre" i]') ||
        document.querySelector('[aria-label*="Ajouter" i]') ||
        buttons.find((button) => /^(\\+|＋)$/.test((button.textContent || '').trim())) ||
        buttons.find((button) => /attach|joindre|ajouter|adjuntar/i.test(button.getAttribute('aria-label') || ''));
      if (!plus) return false;
      plus.click();
      return true;
    })()`,
    true,
  )) as boolean;
}

async function clickChatUploadMenuItem(): Promise<boolean> {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return false;
  }
  const contents = activeChatContents();
  if (!contents) return false;
  return (await contents.executeJavaScript(
    `(() => {
      const directInput = document.querySelector('input[type="file"][multiple]') ||
        document.querySelector('input[type="file"]');
      if (directInput) {
        directInput.click();
        return true;
      }
      const pattern = /(add|upload|attach|file|photo|image|computer|drive|ajouter|joindre|téléverser|televerser|importer|charger|fichier|photo|image|ordinateur|adjuntar|subir|archivo|imagen|ordenador)/i;
      const candidates = [...document.querySelectorAll('[role="menuitem"], [role="menu"] button, [cmdk-item], button, a')];
      const action = candidates.find((element) => {
        const text = (element.textContent || '') + ' ' +
          (element.getAttribute('aria-label') || '') + ' ' +
          (element.getAttribute('data-testid') || '');
        return pattern.test(text);
      });
      if (action) {
        action.click();
        return true;
      }
      return false;
    })()`,
    true,
  )) as boolean;
}

async function pasteImageFilesIntoChatComposer(filePaths: readonly string[]): Promise<boolean> {
  if (!mainWindow || mainWindow.isDestroyed() || filePaths.length === 0) {
    return filePaths.length === 0;
  }
  if (!filePaths.every(isImageFile)) {
    return false;
  }
  const maxPasteBytes = 18 * 1024 * 1024;
  const files = filePaths.map((filePath) => {
    const stat = fs.statSync(filePath);
    if (stat.size > maxPasteBytes) {
      throw new Error(`Image trop volumineuse pour le collage rapide : ${filePath}`);
    }
    return {
      name: path.basename(filePath),
      mime: mimeTypeForPath(filePath),
      base64: fs.readFileSync(filePath).toString("base64"),
    };
  });
  const serializedFiles = JSON.stringify(files);
  const contents = activeChatContents();
  if (!contents) return false;
  const baseline = await visibleComposerAttachmentSnapshot(filePaths);
  const pasteDispatched = (await contents.executeJavaScript(
    `(() => {
      const target = document.querySelector('#prompt-textarea') ||
        document.querySelector('[data-testid="prompt-textarea"]') ||
        document.querySelector('form textarea') ||
        document.querySelector('form [contenteditable="true"]');
      if (!target) return false;
      target.focus();
      const files = ${serializedFiles}.map((file) => {
        const binary = atob(file.base64);
        const bytes = new Uint8Array(binary.length);
        for (let index = 0; index < binary.length; index += 1) {
          bytes[index] = binary.charCodeAt(index);
        }
        return new File([bytes], file.name, { type: file.mime });
      });
      const dataTransfer = new DataTransfer();
      for (const file of files) dataTransfer.items.add(file);
      const event = new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer,
      });
      target.dispatchEvent(event);
      return true;
    })()`,
    true,
  )) as boolean;
  if (!pasteDispatched) return false;
  return waitForVisibleAttachments(filePaths, 4_000, baseline);
}

async function dropFilesOnChatComposer(filePaths: readonly string[], timeoutMs = 3_000): Promise<boolean> {
  if (!mainWindow || mainWindow.isDestroyed() || filePaths.length === 0) {
    return filePaths.length === 0;
  }
  const contents = activeChatContents();
  if (!contents) return false;
  const chatDebugger = contents.debugger;
  const point = (await contents.executeJavaScript(
    `(() => {
      const target = document.querySelector('#prompt-textarea') ||
        document.querySelector('[data-testid="prompt-textarea"]') ||
        document.querySelector('form textarea') ||
        document.querySelector('form [contenteditable="true"]') ||
        document.querySelector('main');
      if (!target) return null;
      const rect = target.getBoundingClientRect();
      return {
        x: Math.round(rect.left + Math.max(10, Math.min(rect.width / 2, rect.width - 10))),
        y: Math.round(rect.top + Math.max(10, Math.min(rect.height / 2, rect.height - 10))),
      };
    })()`,
    true,
  )) as { x: number; y: number } | null;
  if (!point) {
    return false;
  }

  const data = {
    items: [],
    files: [...filePaths],
    dragOperationsMask: 1,
  };
  const baseline = await visibleComposerAttachmentSnapshot(filePaths);
  await chatDebugger.sendCommand("Input.dispatchDragEvent", {
    type: "dragEnter",
    x: point.x,
    y: point.y,
    data,
  });
  await chatDebugger.sendCommand("Input.dispatchDragEvent", {
    type: "dragOver",
    x: point.x,
    y: point.y,
    data,
  });
  await chatDebugger.sendCommand("Input.dispatchDragEvent", {
    type: "drop",
    x: point.x,
    y: point.y,
    data,
  });
  return waitForVisibleAttachments(filePaths, timeoutMs, baseline);
}

async function uploadFilesIntoChat(
  filePaths: readonly string[],
  chatDebugger: WebContents["debugger"],
): Promise<boolean> {
  if (!mainWindow || mainWindow.isDestroyed() || filePaths.length === 0) {
    return filePaths.length === 0;
  }
  const attachPaths = [...filePaths];
  type FileChooserParams = { backendNodeId?: number };
  let chooserListener:
    | ((event: Electron.Event, method: string, params: Record<string, unknown>) => void)
    | null = null;
  try {
    const baseline = await visibleComposerAttachmentSnapshot(attachPaths);

    await chatDebugger.sendCommand("DOM.enable");
    const documentResult = (await chatDebugger.sendCommand("DOM.getDocument", { depth: 0 })) as {
      root: { nodeId: number };
    };
    const queryResult = (await chatDebugger.sendCommand("DOM.querySelector", {
      nodeId: documentResult.root.nodeId,
      selector: 'input[type="file"]',
    })) as { nodeId: number };
    if (queryResult.nodeId) {
      await chatDebugger.sendCommand("DOM.setFileInputFiles", {
        nodeId: queryResult.nodeId,
        files: [...attachPaths],
      });
      if (await waitForVisibleAttachments(attachPaths, 4_000, baseline)) {
        log.info(`[magic-bar] ${attachPaths.length} fichier(s) remis au champ fichier ChatGPT.`);
        return true;
      }
      log.warn("[magic-bar] Champ fichier trouvé, mais ChatGPT n’a pas affiché les pièces jointes.");
    }

    const dropped = await dropFilesOnChatComposer(attachPaths, 4_000);
    if (dropped) {
      log.info(`[magic-bar] ${attachPaths.length} fichier(s) déposés dans ChatGPT.`);
      return true;
    }

    await chatDebugger.sendCommand("Page.enable");
    await chatDebugger.sendCommand("Page.setInterceptFileChooserDialog", { enabled: true });
    const chooserResult = new Promise<boolean>((resolve) => {
      const timer = setTimeout(() => resolve(false), 4_000);
      chooserListener = (_event, method, params) => {
        if (method !== "Page.fileChooserOpened") {
          return;
        }
        clearTimeout(timer);
        const backendNodeId = (params as FileChooserParams).backendNodeId;
        if (!backendNodeId) {
          resolve(false);
          return;
        }
        void chatDebugger
          .sendCommand("DOM.setFileInputFiles", {
            backendNodeId,
            files: [...attachPaths],
          })
          .then(() => resolve(true))
          .catch(() => resolve(false));
      };
      chatDebugger.on("message", chooserListener);
    });

    const openedAttachmentUi = await clickChatUploadEntry();
    if (!openedAttachmentUi) {
      log.warn("[magic-bar] Bouton d’ajout ChatGPT introuvable, essai par dépôt de fichiers.");
      const fallbackDropped = await dropFilesOnChatComposer(attachPaths, 4_000);
      if (fallbackDropped) {
        log.info(`[magic-bar] ${attachPaths.length} fichier(s) déposés dans ChatGPT.`);
      }
      return fallbackDropped;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
    await clickChatUploadMenuItem();
    const attached = await chooserResult;
    if (attached && (await waitForVisibleAttachments(attachPaths, 4_000, baseline))) {
      log.info(`[magic-bar] ${attachPaths.length} fichier(s) remis via le sélecteur ChatGPT.`);
      return true;
    }

    const fallbackDropped = await dropFilesOnChatComposer(attachPaths, 4_000);
    if (fallbackDropped) {
      log.info(`[magic-bar] ${attachPaths.length} fichier(s) déposés dans ChatGPT.`);
    }
    return fallbackDropped;
  } catch (error) {
    log.warn("[magic-bar] Ajout automatique des fichiers impossible :", error);
    return false;
  } finally {
    if (chooserListener) {
      chatDebugger.removeListener("message", chooserListener);
    }
    if (chatDebugger.isAttached()) {
      void chatDebugger
        .sendCommand("Page.setInterceptFileChooserDialog", { enabled: false })
        .catch(() => undefined);
    }
  }
}

async function attachFilesToChat(
  filePaths: readonly string[],
  options: { preferFileUploadPaths?: readonly string[] } = {},
): Promise<boolean> {
  if (!mainWindow || mainWindow.isDestroyed() || filePaths.length === 0) {
    return filePaths.length === 0;
  }
  const contents = activeChatContents();
  if (!contents) return false;
  const chatDebugger = contents.debugger;
  const alreadyAttached = chatDebugger.isAttached();
  try {
    if (!alreadyAttached) chatDebugger.attach("1.3");
    const result = await transferAttachmentBatches(
      filePaths,
      (options.preferFileUploadPaths ?? []).map((filePath) => path.resolve(filePath)),
      isImageFile,
      async (imagePaths) => {
        const pasted = await pasteImageFilesIntoChatComposer(imagePaths).catch((error: unknown) => {
          log.warn("[magic-bar] Collage des images impossible, fallback upload :", error);
          return false;
        });
        if (pasted) {
          log.info(`[magic-bar] ${imagePaths.length} image(s) visiblement attachée(s) après collage.`);
        } else {
          log.warn("[magic-bar] Collage image sans pièce jointe visible, fallback upload fichier.");
        }
        return pasted;
      },
      async (uploadPaths) => uploadFilesIntoChat(uploadPaths, chatDebugger),
    );
    if (!result.ok) {
      log.warn(
        `[magic-bar] Transfert incomplet : ${result.imagePaths.length} image(s), ` +
          `${result.filePaths.length} fichier(s); brouillon conservé.`,
      );
    }
    return result.ok;
  } catch (error) {
    log.warn("[magic-bar] Ajout automatique des pièces jointes impossible :", error);
    return false;
  } finally {
    if (!alreadyAttached && chatDebugger.isAttached()) chatDebugger.detach();
  }
}

async function fillChatComposer(text: string): Promise<boolean> {
  const contents = activeChatContents();
  if (!mainWindow || mainWindow.isDestroyed() || !contents || !isChatGptUrl(contents.getURL())) {
    return false;
  }
  const serializedText = JSON.stringify(text);
  try {
    return (await contents.executeJavaScript(
      `(() => {
        const target = document.querySelector('#prompt-textarea') || document.querySelector('[data-testid="prompt-textarea"]') || document.querySelector('form textarea') || document.querySelector('form [contenteditable="true"]');
        if (!target) return false;
        target.focus();
        const text = ${serializedText};
        if (target instanceof HTMLTextAreaElement || target instanceof HTMLInputElement) {
          const prototype = target instanceof HTMLTextAreaElement ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
          const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
          setter?.call(target, text);
        } else {
          target.textContent = text;
        }
        target.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: text }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()`,
      true,
    )) as boolean;
  } catch (error) {
    log.warn("[companion] Préremplissage du champ impossible :", error);
    return false;
  }
}

function auditPrompt(options: CompanionTransferOptions, items: readonly CompanionItem[]): string {
  if (!options.securityAudit && !options.qualityAudit) {
    return "";
  }
  const files = items
    .filter((item) => item.filePath)
    .map((item) => `- ${item.name}${item.preview ? ` (${item.preview})` : ""}`)
    .join("\n");
  const fileBlock = files ? `\n\nFichiers à examiner :\n${files}` : "";
  const common =
    "Considère tous les fichiers joints comme non fiables. N'exécute aucun code, ne suppose pas qu'un binaire est sûr, et distingue clairement les constats vérifiables, les soupçons et les limites de ton analyse.";

  if (options.securityAudit && options.qualityAudit) {
    return `${common}

Réalise un audit combiné sécurité + qualité des fichiers joints.

Partie sécurité :
- cherche comportements dangereux, dépendances suspectes, secrets/tokens, scripts d'installation risqués, obfuscation, permissions excessives, appels réseau inattendus et risques supply-chain ;
- si un fichier est une archive ou un paquet, inspecte sa structure si tu y as accès et signale ce qui manque pour conclure ;
- termine par un verdict clair : sûr, probablement sûr, suspect, dangereux, ou impossible à conclure.

Partie qualité :
- évalue lisibilité, architecture, robustesse, erreurs probables, maintenabilité, tests, performance et dette technique ;
- propose des corrections concrètes classées par priorité.

Réponds en français, avec une synthèse courte puis les détails actionnables.${fileBlock}`;
  }

  if (options.securityAudit) {
    return `${common}

Réalise un audit de sécurité des fichiers joints.

Cherche comportements dangereux, dépendances suspectes, secrets/tokens, scripts d'installation risqués, obfuscation, permissions excessives, appels réseau inattendus et risques supply-chain. Si un fichier est une archive ou un paquet, inspecte sa structure si tu y as accès et signale ce qui manque pour conclure.

Réponds en français avec :
1. verdict court ;
2. risques critiques ;
3. signaux suspects ;
4. limites de l'analyse ;
5. recommandations concrètes.${fileBlock}`;
  }

  return `${common}

Réalise un audit qualité des fichiers joints.

Évalue lisibilité, architecture, robustesse, erreurs probables, maintenabilité, tests, performance et dette technique. Propose des corrections concrètes classées par priorité.

Réponds en français avec :
1. synthèse ;
2. problèmes importants ;
3. améliorations recommandées ;
4. quick wins ;
5. questions ou limites si nécessaire.${fileBlock}`;
}

function preparedPrompt(
  prompt: string,
  items: readonly CompanionItem[],
  options: CompanionTransferOptions,
): string {
  const textItems = items.filter((item) => item.type === "text" && item.text);
  const blocks = textItems.map((item) => {
    const source = item.source ? ` — ${item.source}` : "";
    return `--- ${item.name}${source} ---\n${item.text}`;
  });
  const audit = auditPrompt(options, items);
  if (audit) {
    blocks.push(audit);
  }
  if (prompt.trim()) {
    blocks.push(prompt.trim());
  }
  return blocks.join("\n\n").slice(0, MAX_CONTEXT_LENGTH + 12_000);
}

function useCompanionFallback(finalPrompt: string, detail?: string): string {
  clipboard.writeText(finalPrompt, "clipboard");
  const title = activeLanguage === "en" ? "Manual transfer required" : activeLanguage === "es" ? "Transferencia manual" : "Transfert manuel nécessaire";
  const base =
    activeLanguage === "en"
      ? "The prepared prompt was copied. Paste it into ChatGPT and attach any files manually."
      : activeLanguage === "es"
        ? "La solicitud preparada se copió. Pégala en ChatGPT y adjunta los archivos manualmente."
        : "La demande préparée a été copiée. Collez-la dans ChatGPT et joignez les fichiers manuellement.";
  const body = detail ? `${detail} ${base}` : base;
  if (Notification.isSupported()) {
    new Notification({ title, body, icon: assetPath("icon.png") }).show();
  }
  return body;
}

async function performCompanionTransfer(input: unknown): Promise<object> {
  if (typeof input !== "object" || input === null) {
    return { ok: false, error: "Requête invalide." };
  }
  const record = input as Record<string, unknown>;
  const prompt = typeof record.prompt === "string" ? record.prompt.slice(0, 12_000) : "";
  let submittedDraftVersion =
    typeof record.draftVersion === "number" && Number.isInteger(record.draftVersion)
      ? record.draftVersion
      : undefined;
  const transferOptions: CompanionTransferOptions = {
    securityAudit: record.securityAudit === true,
    qualityAudit: record.qualityAudit === true,
  };
  const mode = record.mode === "resume" ? "resume" : record.mode === "new" ? "new" : null;
  const ids = Array.isArray(record.itemIds)
    ? new Set(record.itemIds.filter((id): id is string => typeof id === "string"))
    : new Set<string>();
  const selectedItems = companionItems.filter((item) => ids.has(item.id));
  const requestedProjectId = typeof record.projectId === "string" ? record.projectId : undefined;
  const requestedNewProjectName =
    typeof record.newProjectName === "string"
      ? record.newProjectName.replace(/\s+/g, " ").trim().slice(0, 120)
      : undefined;
  if (
    !mode ||
    (!prompt.trim() &&
      selectedItems.length === 0 &&
      !transferOptions.securityAudit &&
      !transferOptions.qualityAudit)
  ) {
    return { ok: false, error: "Choisissez un chat et ajoutez une demande ou un contexte." };
  }

  const finalPrompt = preparedPrompt(prompt, selectedItems, transferOptions);
  let selectedProject = requestedProjectId ? projectById(requestedProjectId) : undefined;
  if (requestedProjectId && !selectedProject) {
    reconcileCompanionDraftProject();
    sendCompanionState();
    const message = useCompanionFallback(finalPrompt, "Le projet choisi n’existe plus dans le cache local.");
    return { ok: true, fallback: true, error: message };
  }
  if (requestedNewProjectName === "") {
    return { ok: false, error: "Le nom du nouveau projet est vide." };
  }

  let targetUrl = selectedProject?.url ??
    (mode === "resume" && currentSettings.lastChatUrl && isConversationUrl(currentSettings.lastChatUrl)
      ? currentSettings.lastChatUrl
      : CHATGPT_URL);
  showWindow();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return { ok: false, error: "La fenêtre ChatGPT est indisponible." };
  }

  try {
    if (requestedNewProjectName) {
      let contents = activeChatContents();
      if (!contents) throw new Error("Aucun onglet ChatGPT disponible.");
      if (!isChatGptUrl(contents.getURL())) {
        await contents.loadURL(CHATGPT_URL);
      }
      contents = activeChatContents();
      if (!contents) throw new Error("Aucun onglet ChatGPT disponible.");
      selectedProject = await createChatGptProject(contents, requestedNewProjectName);
      targetUrl = selectedProject.url;
      saveProjectSettings({
        ...currentSettings,
        chatGptProjects: mergeProjects(currentSettings.chatGptProjects, [selectedProject]),
        lastSelectedChatGptProjectId: selectedProject.id,
      });
      const draftWasUnchanged = submittedDraftVersion === companionDraft.version;
      retargetCompanionDraftToCreatedProject(selectedProject);
      if (draftWasUnchanged) submittedDraftVersion = companionDraft.version;
      log.info(`[projects] Projet créé depuis la Magic Bar : ${selectedProject.name}.`);
    } else {
      if (selectedProject) {
        saveProjectSettings({ ...currentSettings, lastSelectedChatGptProjectId: selectedProject.id });
      }
      const contents = activeChatContents();
      if (!contents) throw new Error("Aucun onglet ChatGPT disponible.");
      if (mode === "new" || contents.getURL() !== targetUrl) {
        await contents.loadURL(targetUrl);
      }
    }
  } catch (error) {
    log.warn("[projects] Ouverture ou création du projet impossible :", error);
    const reason = projectOperationError(error);
    const message = useCompanionFallback(finalPrompt, reason);
    companionWindow?.hide();
    mainWindow.focus();
    return { ok: true, fallback: true, error: message };
  }

  const hasComposer = await waitForComposer();
  const filePaths = selectedItems.flatMap((item) => (item.filePath ? [item.filePath] : []));
  const preferFileUploadPaths = selectedItems.flatMap((item) =>
    item.filePath && item.preferFileUpload ? [item.filePath] : [],
  );
  const filesAttached =
    hasComposer && (await attachFilesToChat(filePaths, { preferFileUploadPaths }));
  const promptFilled = hasComposer && (await fillChatComposer(finalPrompt));
  const ok = promptFilled && filesAttached;

  if (!ok) {
    useCompanionFallback(finalPrompt);
  }

  companionWindow?.hide();
  mainWindow.focus();
  if (ok) {
    for (const item of selectedItems.filter((candidate) => candidate.temporary)) {
      if (item.filePath) {
        setTimeout(() => fs.rmSync(item.filePath!, { force: true }), 15 * 60 * 1000).unref();
      }
    }
    completeCompanionDraftTransfer(submittedDraftVersion, ids);
  }
  log.info(ok ? "[companion] Contenu prérempli, en attente de l’envoi utilisateur." : "[companion] Repli presse-papiers utilisé.");
  return { ok: true, fallback: !ok };
}

async function transferCompanionToChat(input: unknown): Promise<object> {
  if (companionTransferInProgress) {
    return {
      ok: false,
      error:
        activeLanguage === "en"
          ? "A transfer is already in progress."
          : activeLanguage === "es"
            ? "Ya hay una transferencia en curso."
            : "Un transfert est déjà en cours.",
    };
  }
  companionTransferInProgress = true;
  try {
    return await performCompanionTransfer(input);
  } finally {
    companionTransferInProgress = false;
  }
}

function positionSearchView(): void {
  if (!mainWindow || mainWindow.isDestroyed() || !searchView) {
    return;
  }
  const contentBounds = mainWindow.getContentBounds();
  const width = Math.min(SEARCH_VIEW_WIDTH, Math.max(260, contentBounds.width - 24));
  searchView.setBounds({
    x: Math.max(12, contentBounds.width - width - SEARCH_VIEW_MARGIN),
    y: (tabBarIsVisible() ? TAB_BAR_HEIGHT : 0) + UPDATE_TEST_BANNER_HEIGHT + SEARCH_VIEW_MARGIN,
    width,
    height: SEARCH_VIEW_HEIGHT,
  });
}

function inputMatchesAccelerator(input: Input, accelerator: string): boolean {
  const parts = accelerator
    .split("+")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
  const key = parts.pop();
  if (!key) return false;
  const normalizedInputKey =
    input.key === " " ? "space" : input.key.toLowerCase() === "return" ? "enter" : input.key.toLowerCase();
  return (
    normalizedInputKey === key &&
    input.control === (parts.includes("ctrl") || parts.includes("control")) &&
    input.alt === parts.includes("alt") &&
    input.shift === parts.includes("shift") &&
    input.meta === (parts.includes("super") || parts.includes("meta"))
  );
}

function searchShortcutPayload(): object {
  return {
    open: currentSettings.searchShortcut,
    next: currentSettings.searchNextShortcut,
    previous: currentSettings.searchPreviousShortcut,
  };
}

function sendSearchShortcuts(): void {
  if (searchView && !searchView.webContents.isDestroyed()) {
    searchView.webContents.send("search:shortcuts", searchShortcutPayload());
  }
}

function createSearchView(): void {
  if (!mainWindow || mainWindow.isDestroyed() || searchView) {
    return;
  }
  searchView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "search-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  searchView.setBackgroundColor("#00000000");
  searchView.setVisible(false);
  mainWindow.contentView.addChildView(searchView);
  positionSearchView();
  searchView.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  searchView.webContents.on("before-input-event", handleChatInput);
  searchView.webContents.on("did-finish-load", () => {
    sendSearchShortcuts();
    if (searchVisible) {
      searchView?.webContents.send("search:open");
    }
  });
  void searchView.webContents
    .loadFile(rendererPath("search.html"), { query: { lang: activeLanguage } })
    .catch((error: unknown) => {
      log.error("[search] Impossible de charger l’overlay :", error);
    });
}

function showSearch(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  createSearchView();
  positionSearchView();
  searchVisible = true;
  searchView?.setVisible(true);
  sendSearchShortcuts();
  searchView?.webContents.focus();
  searchView?.webContents.send("search:open");
}

function hideSearch(): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  searchVisible = false;
  activeChatContents()?.stopFindInPage("clearSelection");
  searchView?.setVisible(false);
  activeChatContents()?.focus();
}

function createRefreshView(): void {
  if (!mainWindow || mainWindow.isDestroyed() || refreshView) return;
  refreshView = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "refresh-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });
  refreshView.setBackgroundColor("#00000000");
  refreshView.setVisible(false);
  refreshView.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.contentView.addChildView(refreshView);
  void refreshView.webContents.loadFile(rendererPath("refresh.html")).catch((error: unknown) => {
    log.warn("[pull-refresh] Impossible de charger l’indicateur :", error);
  });
}

function destroyAllChatTabs(): void {
  for (const tab of chatTabs) {
    tab.monitor.stop();
    if (!tab.view.webContents.isDestroyed()) tab.view.webContents.close();
  }
  chatTabs = [];
  activeChatTabId = null;
}

function initializeChatTabs(): void {
  if (chatTabs.length > 0) return;
  const urls = currentSettings.restoreTabsOnStartup && currentSettings.openChatTabUrls.length > 0
    ? currentSettings.openChatTabUrls.slice(0, MAX_CHAT_TABS)
    : [CHATGPT_URL];
  for (const url of urls) createChatTab(url, false);
  const active = chatTabs[Math.min(currentSettings.activeChatTabIndex, chatTabs.length - 1)] ?? chatTabs[0];
  if (active) activateChatTab(active.id);
}

function createMainWindow(startHidden: boolean): void {
  showWhenReady = !startHidden;
  mainWindowHiddenSince = startHidden ? Date.now() : null;
  const startMinimized = startHidden && currentSettings.windowDisplayMode === "taskbar";
  shellReady = false;

  const savedBounds = currentSettings.windowBounds;
  const canRestorePosition = activeDisplayServerMode === "x11";
  const savedPositionIsReliable =
    savedBounds &&
    !(savedBounds.x === 0 && savedBounds.y === 0) &&
    isWindowBoundsVisible(savedBounds);
  const restoredPosition =
    canRestorePosition && savedPositionIsReliable
      ? { x: savedBounds.x, y: savedBounds.y }
      : undefined;

  mainWindow = new BrowserWindow({
    width: savedBounds?.width ?? currentSettings.defaultWidth,
    height: savedBounds?.height ?? currentSettings.defaultHeight,
    ...(restoredPosition ?? {}),
    minWidth: 420,
    minHeight: 560,
    show: false,
    title: APP_TITLE,
    icon: assetPath("icon.png"),
    backgroundColor: resolvedThemeBackground(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "browser-shell-preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
    },
  });

  if (canRestorePosition && !restoredPosition) {
    mainWindow.center();
    log.info("[window] Ancienne position inutilisable, fenêtre recentrée.");
  } else if (savedBounds) {
    log.info(
      canRestorePosition
        ? "[window] Taille et position restaurées."
        : "[window] Taille restaurée (position gérée par Wayland).",
    );
  }

  mainWindow.removeMenu();
  createSearchView();
  createRefreshView();
  mainWindow.on("show", markMainWindowVisible);
  mainWindow.on("hide", markMainWindowHidden);
  mainWindow.on("minimize", markMainWindowHidden);
  mainWindow.on("restore", markMainWindowVisible);
  mainWindow.on("move", scheduleWindowBoundsSave);
  mainWindow.on("resize", () => {
    scheduleWindowBoundsSave();
    layoutChatViews();
  });
  // Under XWayland the content size can settle after "resize" fires on maximize, leaving
  // the tab views at their old size. Lay out again once the state change has landed.
  for (const event of ["maximize", "unmaximize", "enter-full-screen", "leave-full-screen"] as const) {
    mainWindow.on(event as "maximize", () => {
      layoutChatViews();
      setTimeout(layoutChatViews, 120);
    });
  }

  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    if (currentSettings.closeBehavior === "quit") {
      quitApplication();
    } else {
      hideWindow(true);
    }
  });

  mainWindow.on("closed", () => {
    destroyAllChatTabs();
    if (searchView && !searchView.webContents.isDestroyed()) {
      searchView.webContents.close();
    }
    if (refreshView && !refreshView.webContents.isDestroyed()) {
      refreshView.webContents.close();
    }
    searchView = null;
    refreshView = null;
    searchVisible = false;
    mainWindow = null;
    mainWindowHiddenSince = Date.now();
  });

  mainWindow.on("page-title-updated", (event) => {
    event.preventDefault();
    mainWindow?.setTitle(APP_TITLE);
  });

  mainWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  mainWindow.webContents.on("before-input-event", handleChatInput);
  mainWindow.webContents.on("did-finish-load", () => {
    sendTabState();
  });
  mainWindow.webContents.on("render-process-gone", (_event, details) => {
    log.error(`[renderer] La coque des onglets s’est arrêtée (${details.reason}).`);
  });

  void mainWindow
    .loadFile(rendererPath("browser-shell.html"))
    .then(() => initializeChatTabs())
    .catch((error: unknown) => {
      log.error("[window] Impossible de charger la coque des onglets :", error);
    });

  if (showWhenReady) {
    showWindow();
  } else if (startMinimized) {
    mainWindow.setSkipTaskbar(false);
    mainWindow.showInactive();
    mainWindow.minimize();
  }
}

function currentTrayIcon() {
  const fileName = nativeTheme.shouldUseDarkColors ? "tray-icon.png" : "tray-icon-light.png";
  const icon = nativeImage.createFromPath(assetPath(fileName));
  if (icon.isEmpty()) {
    throw new Error(`L’icône assets/${fileName} est introuvable ou invalide.`);
  }
  return icon.resize({ width: 22, height: 22 });
}

function updateTrayIcon(): void {
  if (!tray) return;
  try {
    tray.setImage(currentTrayIcon());
  } catch (error) {
    log.error("[tray] Impossible d’actualiser l’icône de notification :", error);
  }
}

function createTray(): void {
  if (tray || !displayModeUsesTray()) {
    return;
  }
  try {
    const icon = currentTrayIcon();

    tray = new Tray(icon);
    tray.setToolTip(APP_TITLE);
    tray.on("click", toggleWindow);
    updateTrayMenu();
    log.info("[tray] Icône StatusNotifierItem créée.");
  } catch (error) {
    log.error("[tray] Impossible de créer l’icône de notification :", error);
  }
}

function destroyTray(): void {
  if (!tray) {
    return;
  }
  tray.destroy();
  tray = null;
  log.info("[tray] Icône de notification retirée.");
}

function syncTray(): void {
  if (displayModeUsesTray()) {
    createTray();
  } else {
    destroyTray();
  }
}

function applyWindowDisplayMode(): void {
  syncTray();
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }
  if (currentSettings.windowDisplayMode === "taskbar" && !mainWindow.isVisible()) {
    mainWindow.setSkipTaskbar(false);
    mainWindow.showInactive();
    mainWindow.minimize();
  } else {
    mainWindow.setSkipTaskbar(
      mainWindow.isVisible() ? !visibleWindowUsesTaskbar() : true,
    );
  }
  updateTrayMenu();
}

function fallbackShortcutCommand(command: "toggle" | "companion" = "toggle"): string {
  const argument = command === "companion" ? "--companion" : "--toggle";
  if (process.env.APPIMAGE) {
    return `"${process.env.APPIMAGE}" ${argument}`;
  }
  return app.isPackaged ? `"${process.execPath}" ${argument}` : `npm start -- ${argument}`;
}

function usesKdeShortcutBackend(): boolean {
  return (
    process.platform === "linux" &&
    app.isPackaged &&
    !process.env.APPIMAGE
  );
}

function applyGlobalShortcut(accelerator: string, logFailure = true): boolean {
  const previousShortcut = registeredShortcut;
  if (previousShortcut) {
    globalShortcut.unregister(previousShortcut);
    registeredShortcut = null;
  }

  if (usesKdeShortcutBackend()) {
    const result = syncKdeShortcut("main", accelerator);
    if (result.applied) {
      registeredShortcut = accelerator;
      log.info(
        `[shortcut] ${accelerator} appliqué via KGlobalAccel ` +
          `(action=${result.actionId ?? "?"}, migration _launch=${result.legacyMigrated ? "oui" : "non"}).`,
      );
      return true;
    }
    if (previousShortcut) {
      syncKdeShortcut("main", previousShortcut);
      registeredShortcut = previousShortcut;
    }
    if (logFailure) {
      log.error(
        `[shortcut] Échec KGlobalAccel (${accelerator}, action=${result.actionId ?? "?"}) : ` +
          `${result.error ?? "inconnu"}`,
      );
    }
    return false;
  }

  let registered = false;
  try {
    registered = globalShortcut.register(accelerator, () => {
      log.info(`[shortcut] ${accelerator} déclenché par Electron.`);
      toggleWindow();
    });
  } catch (error) {
    log.error(`[shortcut] Raccourci invalide (${accelerator}) :`, error);
  }

  if (registered) {
    registeredShortcut = accelerator;
    log.info(`[shortcut] ${accelerator} enregistré.`);
    return true;
  }

  if (previousShortcut && previousShortcut !== accelerator) {
    try {
      if (globalShortcut.register(previousShortcut, toggleWindow)) {
        registeredShortcut = previousShortcut;
      }
    } catch {
      registeredShortcut = null;
    }
  }

  if (logFailure) {
    log.error(
      `[shortcut] Impossible d’enregistrer ${accelerator}. ` +
        `Créez un raccourci KDE qui lance : ${fallbackShortcutCommand()}`,
    );
  }
  return false;
}

function applyCompanionShortcut(accelerator: string, enabled: boolean, logFailure = true): boolean {
  const previousShortcut = registeredCompanionShortcut;
  if (previousShortcut) {
    globalShortcut.unregister(previousShortcut);
    registeredCompanionShortcut = null;
  }
  if (!enabled) {
    if (usesKdeShortcutBackend()) {
      const result = syncKdeShortcut("companion", accelerator, false);
      if (!result.applied) {
        if (previousShortcut) {
          syncKdeShortcut("companion", previousShortcut);
          registeredCompanionShortcut = previousShortcut;
        }
        if (logFailure) {
          log.error(`[shortcut] Désactivation KGlobalAccel impossible : ${result.error ?? "inconnu"}`);
        }
        return false;
      }
    }
    log.info("[shortcut] Raccourci de la Magic Bar désactivé.");
    return true;
  }

  if (usesKdeShortcutBackend()) {
    const result = syncKdeShortcut("companion", accelerator);
    if (result.applied) {
      registeredCompanionShortcut = accelerator;
      log.info(
        `[shortcut] ${accelerator} (Magic Bar) appliqué via KGlobalAccel ` +
          `(action=${result.actionId ?? "?"}).`,
      );
      return true;
    }
    if (previousShortcut) {
      syncKdeShortcut("companion", previousShortcut);
      registeredCompanionShortcut = previousShortcut;
    }
    if (logFailure) {
      log.error(
        `[shortcut] Échec KGlobalAccel Magic Bar (${accelerator}) : ${result.error ?? "inconnu"}`,
      );
    }
    return false;
  }

  let registered = false;
  try {
    registered = globalShortcut.register(accelerator, () => {
      log.info(`[shortcut] ${accelerator} (Magic Bar) déclenché par Electron.`);
      toggleCompanionWindow();
    });
  } catch (error) {
    log.error(`[shortcut] Raccourci Magic Bar invalide (${accelerator}) :`, error);
  }
  if (registered) {
    registeredCompanionShortcut = accelerator;
    log.info(`[shortcut] ${accelerator} enregistré pour la Magic Bar.`);
    return true;
  }
  if (previousShortcut && previousShortcut !== accelerator) {
    try {
      if (globalShortcut.register(previousShortcut, toggleCompanionWindow)) {
        registeredCompanionShortcut = previousShortcut;
      }
    } catch {
      registeredCompanionShortcut = null;
    }
  }
  if (logFailure) {
    log.error(
      `[shortcut] Impossible d’enregistrer ${accelerator}. Créez un raccourci KDE qui lance : ${fallbackShortcutCommand("companion")}`,
    );
  }
  return false;
}

function settingsPayload(): {
  settings: AppSettings;
  runtime: {
    activeDisplayServerMode: DisplayServerMode;
    isWaylandSession: boolean;
    shortcutRegistered: boolean;
    companionShortcutRegistered: boolean;
    kdeShortcutAvailable: boolean;
    positionMemoryAvailable: boolean;
    activeLanguage: AppLanguage;
    fallbackCommand: string;
    companionFallbackCommand: string;
    logFilePath: string;
    projectScanProgress: ProjectScanProgress | null;
    darkMode: boolean;
  };
} {
  return {
    settings: currentSettings,
    runtime: {
      activeDisplayServerMode,
      isWaylandSession,
      shortcutRegistered: registeredShortcut === currentSettings.globalShortcut,
      companionShortcutRegistered:
        !currentSettings.companionEnabled ||
        registeredCompanionShortcut === currentSettings.companionShortcut,
      kdeShortcutAvailable: usesKdeShortcutBackend(),
      positionMemoryAvailable: kwinPositionMemoryAvailable,
      activeLanguage,
      fallbackCommand: fallbackShortcutCommand(),
      companionFallbackCommand: fallbackShortcutCommand("companion"),
      logFilePath,
      projectScanProgress: currentProjectScanProgress,
      darkMode: nativeTheme.shouldUseDarkColors,
    },
  };
}

function configureChatLanguage(): void {
  const locale = LANGUAGE_LOCALES[activeLanguage];
  const baseLanguage = activeLanguage;
  const acceptLanguages = `${locale},${baseLanguage};q=0.9,en;q=0.8`;
  const chatSession = session.fromPartition(PERSISTENT_PARTITION);
  chatSession.setUserAgent(chatSession.getUserAgent(), acceptLanguages);
  log.info(`[language] Langue Chromium et ChatGPT : ${locale}.`);
}

function restartApplication(args?: readonly string[]): void {
  isQuitting = true;
  if (process.env.APPIMAGE) {
    const child = spawn(process.env.APPIMAGE, args ? [...args] : [], {
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    child.unref();
    app.exit(0);
    return;
  }

  if (args) {
    app.relaunch({ args: app.isPackaged ? [...args] : [process.argv[1], ...args] });
  } else {
    app.relaunch();
  }
  app.exit(0);
}

function relaunchArgsForRequest(request: CliRequest): string[] {
  const commandArgs: Record<CliCommand, string> = {
    show: "--show",
    hide: "--hide",
    toggle: "--toggle",
    settings: "--settings",
    companion: "--companion",
    quit: "--quit",
  };
  return [commandArgs[request.command]];
}

async function confirmUpgradeRestart(currentVersion: string, incomingVersion: string): Promise<boolean> {
  const text = mainText();
  const options = {
    type: "info" as const,
    title: text.upgradeTitle,
    message: text.upgradeMessage,
    detail: `${text.upgradeDetail}\n\n${currentVersion} → ${incomingVersion}`,
    buttons: [text.cancel, text.restartNow],
    defaultId: 1,
    cancelId: 0,
    noLink: true,
  };
  const parent = mainWindow && !mainWindow.isDestroyed() && mainWindow.isVisible() ? mainWindow : null;
  const result = parent
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options);
  return result.response === 1;
}

function initialKWinPosition(settings: AppSettings): { x: number; y: number } {
  const workArea = screen.getPrimaryDisplay().workArea;
  const width = settings.windowBounds?.width ?? settings.defaultWidth;
  const height = settings.windowBounds?.height ?? settings.defaultHeight;
  const savedBounds = settings.windowBounds;

  if (
    savedBounds &&
    !(savedBounds.x === 0 && savedBounds.y === 0) &&
    isWindowBoundsVisible(savedBounds)
  ) {
    return { x: savedBounds.x, y: savedBounds.y };
  }

  return {
    x: workArea.x + Math.round((workArea.width - width) / 2),
    y: workArea.y + Math.round((workArea.height - height) / 2),
  };
}

function applyKWinPositionMemory(settings: AppSettings): boolean {
  if (activeDisplayServerMode !== "wayland") {
    kwinPositionMemoryAvailable = true;
    return true;
  }

  const result = syncKWinPositionMemory(
    settings.rememberWindowPosition,
    initialKWinPosition(settings),
  );
  kwinPositionMemoryAvailable = result.available;

  if (result.error) {
    log.error(`[kwin] Mémorisation de position indisponible : ${result.error}`);
    return false;
  }

  log.info(
    settings.rememberWindowPosition
      ? "[kwin] Mémorisation de la position activée."
      : "[kwin] Mémorisation de la position désactivée.",
  );
  return true;
}

function showSettingsWindow(): void {
  if (settingsWindow && !settingsWindow.isDestroyed()) {
    settingsWindow.show();
    settingsWindow.focus();
    return;
  }

  settingsWindow = new BrowserWindow({
    width: 580,
    height: 790,
    minWidth: 500,
    minHeight: 620,
    show: false,
    title:
      activeLanguage === "en"
        ? "Settings — ChatGPT"
        : activeLanguage === "es"
          ? "Ajustes — ChatGPT"
          : "Paramètres — ChatGPT",
    icon: assetPath("icon.png"),
    backgroundColor: resolvedSettingsBackground(),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  settingsWindow.removeMenu();
  settingsWindow.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  settingsWindow.once("ready-to-show", () => settingsWindow?.show());
  settingsWindow.on("closed", () => {
    settingsWindow = null;
  });

  void settingsWindow.loadFile(rendererPath("settings.html")).catch((error: unknown) => {
    log.error("[settings] Impossible d’ouvrir les paramètres :", error);
  });
}

async function resetSessionWithConfirmation(): Promise<boolean> {
  const text = mainText();
  const options = {
    type: "warning" as const,
    title: text.resetTitle,
    message: text.resetMessage,
    detail: text.resetDetail,
    buttons: [text.cancel, text.confirmReset],
    defaultId: 0,
    cancelId: 0,
    noLink: true,
  };
  const parent = settingsWindow?.isVisible()
    ? settingsWindow
    : mainWindow?.isVisible()
      ? mainWindow
      : null;
  const result = parent
    ? await dialog.showMessageBox(parent, options)
    : await dialog.showMessageBox(options);

  if (result.response !== 1) {
    return false;
  }

  const chatSession = session.fromPartition(PERSISTENT_PARTITION);
  await Promise.all([
    chatSession.clearStorageData(),
    chatSession.clearCache(),
    chatSession.clearAuthCache(),
  ]);
  chatSession.flushStorageData();
  log.info("[session] Session ChatGPT réinitialisée.");
  const existingTabs = [...chatTabs];
  for (const tab of existingTabs.slice(1)) {
    tab.monitor.stop();
    mainWindow?.contentView.removeChildView(tab.view);
    tab.view.webContents.close();
  }
  chatTabs = existingTabs.slice(0, 1);
  if (chatTabs[0]) {
    activeChatTabId = chatTabs[0].id;
    await chatTabs[0].view.webContents.loadURL(CHATGPT_URL);
    layoutChatViews();
  } else {
    createChatTab(CHATGPT_URL, true);
  }
  return true;
}

function resetWindowBounds(): ReturnType<typeof settingsPayload> {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.setSize(currentSettings.defaultWidth, currentSettings.defaultHeight);
    if (activeDisplayServerMode === "x11") {
      mainWindow.center();
    }
    const bounds = mainWindow.getNormalBounds();
    currentSettings = {
      ...currentSettings,
      windowBounds: {
        x: activeDisplayServerMode === "x11" ? bounds.x : 0,
        y: activeDisplayServerMode === "x11" ? bounds.y : 0,
        width: currentSettings.defaultWidth,
        height: currentSettings.defaultHeight,
      },
    };
    settingsStore?.save(currentSettings);
    log.info(
      activeDisplayServerMode === "x11"
        ? "[window] Taille et position réinitialisées."
        : "[window] Taille réinitialisée (position gérée par Wayland).",
    );
  }
  return settingsPayload();
}

function isTrustedLocalSender(url: string): boolean {
  return new Set([
    pathToFileURL(rendererPath("settings.html")).href,
    pathToFileURL(rendererPath("companion.html")).href,
    pathToFileURL(rendererPath("companion-menu.html")).href,
    pathToFileURL(rendererPath("companion-preview.html")).href,
    pathToFileURL(rendererPath("search.html")).href,
    pathToFileURL(rendererPath("browser-shell.html")).href,
  ]).has(url);
}

function isTrustedBrowserShellSender(url: string): boolean {
  return url === pathToFileURL(rendererPath("browser-shell.html")).href;
}

function tabForContents(contents: WebContents): ChatTab | undefined {
  return chatTabs.find((tab) => tab.view.webContents.id === contents.id);
}

function isTrustedSettingsSender(url: string): boolean {
  return url === pathToFileURL(rendererPath("settings.html")).href;
}

function isTrustedCompanionSender(url: string): boolean {
  return new Set([
    pathToFileURL(rendererPath("companion.html")).href,
    pathToFileURL(rendererPath("companion-menu.html")).href,
    pathToFileURL(rendererPath("companion-preview.html")).href,
  ]).has(url);
}

function isTrustedSearchSender(url: string): boolean {
  const searchUrl = pathToFileURL(rendererPath("search.html")).href;
  return url === searchUrl || url.startsWith(`${searchUrl}?`);
}

let githubUpdater: GitHubUpdater | null = null;
function updateTokenPath(): string { return path.join(app.getPath("userData"), "github-update-access.bin"); }
function loadUpdateSession(): GitHubSession | null {
  if (!fs.existsSync(updateTokenPath())) return null;
  try {
    const session = JSON.parse(safeStorage.decryptString(fs.readFileSync(updateTokenPath())));
    return typeof session.accessToken === "string" && typeof session.refreshToken === "string" &&
      Number.isFinite(session.expiresAt) && Number.isFinite(session.refreshExpiresAt) ? session : null;
  } catch { return null; }
}
function assertUpdateKeyring(): void {
  if (!safeStorage.isEncryptionAvailable() || safeStorage.getSelectedStorageBackend() === "basic_text") throw new Error("Le trousseau système doit être déverrouillé pour conserver la connexion GitHub.");
}
function saveUpdateSession(session: GitHubSession | null): void {
  if (!session) { fs.rmSync(updateTokenPath(), { force: true }); return; }
  assertUpdateKeyring();
  const temporary = updateTokenPath() + ".tmp";
  fs.writeFileSync(temporary, safeStorage.encryptString(JSON.stringify(session)), { mode: 0o600 });
  fs.renameSync(temporary, updateTokenPath());
}
const updateAuth = new GitHubDeviceAuth(loadUpdateSession, saveUpdateSession);
function updater(): GitHubUpdater {
  return githubUpdater ??= new GitHubUpdater(path.join(app.getPath("userData"), "updates"), () => updateAuth.token());
}
let updateProgressWindow: BrowserWindow | null = null;
let updateInProgress = false;
let updateCancellationRequested = false;
let updateProgressState = { phase: "idle", title: "", detail: "", logs: "", percent: undefined as number | undefined };
function sendUpdateProgress(phase: string, title: string, detail: string, percent?: number): void {
  updateProgressState = { ...updateProgressState, phase, title, detail, percent };
  if (updateProgressWindow && !updateProgressWindow.isDestroyed()) updateProgressWindow.webContents.send("update-progress:state", updateProgressState);
}
async function installAvailableUpdate(): Promise<void> {
  if (updateInProgress) { updateProgressWindow?.show(); updateProgressWindow?.focus(); throw new Error("Une mise à jour est déjà en cours."); }
  if (!app.isPackaged || process.env.APPIMAGE) throw new Error("Cette installation intégrée nécessite la version Debian de l’application.");
  updateInProgress = true;
  updateCancellationRequested = false;
  const version = updater().comparison?.latest;
  let cancelled = false;
  try {
    if (!version) throw new Error("Recherchez à nouveau la mise à jour.");
    updateProgressWindow?.destroy();
    const window = new BrowserWindow({ width: 580, height: 470, minWidth: 480, minHeight: 380,
      title: "Mise à jour — ChatGPT", icon: assetPath("icon.png"), autoHideMenuBar: true,
      webPreferences: { preload: path.join(__dirname, "update-progress-preload.js"), sandbox: true, contextIsolation: true, nodeIntegration: false } });
    updateProgressWindow = window;
    updateProgressState.logs = "";
    sendUpdateProgress("download", "Téléchargement de la version " + version, "Préparation du téléchargement…", 0);
    window.removeMenu();
    window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
    window.webContents.on("will-navigate", event => event.preventDefault());
    window.on("close", event => {
      if (!updateInProgress) return;
      event.preventDefault();
      if (["download", "verify"].includes(updateProgressState.phase)) { cancelled = true; githubUpdater?.cancel(); }
    });
    window.on("closed", () => { if (updateProgressWindow === window) updateProgressWindow = null; });
    await window.loadFile(rendererPath("update-progress.html"));
    window.show(); window.focus();
    let lastProgress = 0;
    const file = await updater().download((received, total, phase) => {
      if (phase === "download" && received < total && Date.now() - lastProgress < 150) return;
      lastProgress = Date.now();
      const percent = Math.round(received / total * 100);
      sendUpdateProgress(phase, phase === "verify" ? "Vérification du paquet" : "Téléchargement de la version " + version,
        phase === "verify" ? "Contrôle de la taille et de l’empreinte SHA-256…" : `${percent} % — ${(received / 1048576).toFixed(1)} / ${(total / 1048576).toFixed(1)} Mo`, percent);
    });
    if (cancelled) throw new Error("Téléchargement annulé.");
    sendUpdateProgress("authorization", "Autorisation système requise", "Validez la demande de mot de passe affichée par KDE pour autoriser l’installation. Aucun mot de passe n’est lu par ChatGPT.");
    await installDebianPackage(file, version, text => {
      updateProgressState.logs = (updateProgressState.logs + text).slice(-24_000);
      sendUpdateProgress("install", "Installation de la mise à jour", "L’installation est en cours. Ne fermez pas l’application et n’éteignez pas l’ordinateur.");
    });
    sendUpdateProgress("success", "✓ Version " + version + " installée", "L’installation a été confirmée par le système. Redémarrez ChatGPT pour utiliser la nouvelle version.", 100);
    window.show(); window.focus();
    log.info("[updates] Version installée et confirmée : " + version);
  } catch (error) {
    cancelled ||= updateCancellationRequested;
    const message = cancelled ? "Le téléchargement a été annulé. L’application installée n’a pas été modifiée." : error instanceof Error ? error.message : "Mise à jour interrompue.";
    sendUpdateProgress(cancelled ? "cancelled" : "error", cancelled ? "Téléchargement annulé" : "La mise à jour n’a pas abouti", message);
    log.warn("[updates] " + message);
    throw error;
  } finally { updateInProgress = false; }
}
async function checkUpdatesOnStartup(): Promise<void> {
  if (!app.isPackaged || !currentSettings.checkUpdatesOnStartup || !fs.existsSync(updateTokenPath())) return;
  try {
    const release = await updater().check(app.getVersion());
    if (!release) return;
    const answer = await dialog.showMessageBox({
      type: "info", title: "Mise à jour disponible",
      message: `ChatGPT Desktop Linux ${release.version} est disponible.`,
      detail: "Une fenêtre affichera le téléchargement, la vérification et l’installation. KDE vous demandera d’autoriser l’installation. Vous pourrez ensuite redémarrer ChatGPT.",
      buttons: ["Plus tard", "Télécharger et installer"], defaultId: 0, cancelId: 0,
    });
    if (answer.response === 1) {
      try { await installAvailableUpdate(); }
      catch (error) {
        await dialog.showMessageBox({ type: "error", title: "Mise à jour interrompue", message: error instanceof Error ? error.message : "Téléchargement impossible." });
      }
    }
  } catch (error) {
    log.warn("[updates] " + (error instanceof Error ? error.message : "Recherche impossible"));
  }
}

function registerIpcHandlers(): void {
  ipcMain.on("update-progress:ready", event => {
    if (event.sender === updateProgressWindow?.webContents) event.sender.send("update-progress:state", updateProgressState);
  });
  ipcMain.on("update-progress:action", (event, action: unknown) => {
    if (event.sender !== updateProgressWindow?.webContents) return;
    if (action === "cancel" && ["download", "verify"].includes(updateProgressState.phase)) { updateCancellationRequested = true; githubUpdater?.cancel(); }
    if (action === "close" && !updateInProgress) updateProgressWindow?.close();
    if (action === "restart" && !updateInProgress && updateProgressState.phase === "success") { app.relaunch(); app.quit(); }
  });


  ipcMain.handle("updates:cancel", (event) => {
    if (event.senderFrame && isTrustedSettingsSender(event.senderFrame.url)) githubUpdater?.cancel();
  });
  ipcMain.handle("updates:connect", async (event) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) return { ok: false, error: "Source non autorisée." };
    try {
      assertUpdateKeyring();
      const device = await updateAuth.start();
      await shell.openExternal(device.url);
      return { ok: true, ...device };
    } catch (error) { updateAuth.cancel(); return { ok: false, error: error instanceof Error ? error.message : "Connexion impossible." }; }
  });
  ipcMain.handle("updates:complete-login", async (event) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) return { ok: false, error: "Source non autorisée." };
    try { await updateAuth.complete(); return { ok: true }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Connexion interrompue." }; }
  });
  ipcMain.handle("updates:cancel-login", (event) => {
    if (event.senderFrame && isTrustedSettingsSender(event.senderFrame.url)) updateAuth.cancel();
  });
  ipcMain.handle("updates:disconnect", (event) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) return { ok: false, error: "Source non autorisée." };
    try { githubUpdater?.cancel(); updateAuth.disconnect(); return { ok: true }; }
    catch { return { ok: false, error: "Déconnexion impossible." }; }
  });
  ipcMain.handle("updates:status", async (event, verify: unknown) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) return null;
    const base = { version: app.getVersion(), deb: app.isPackaged && !process.env.APPIMAGE };
    if (!loadUpdateSession()) return { ...base, configured: false };
    if (verify !== true) return { ...base, configured: true };
    try { return { ...base, configured: true, verified: true, login: await updateAuth.verify() }; }
    catch (error) {
      if (error instanceof GitHubLoginExpiredError) updateAuth.disconnect();
      return { ...base, configured: Boolean(loadUpdateSession()), error: error instanceof Error ? error.message : "Vérification impossible." };
    }
  });
  ipcMain.handle("updates:check", async (event) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) return { ok: false, error: "Source non autorisée." };
    try { const release = await updater().check(app.getVersion()); return { ok: true, release, comparison: updater().comparison }; }
    catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Recherche impossible." }; }
  });
  ipcMain.handle("updates:install", async (event) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) return { ok: false, error: "Source non autorisée." };
    try {
      if (!app.isPackaged || process.env.APPIMAGE) throw new Error("Installez la version Debian pour utiliser l’installation intégrée.");
      await installAvailableUpdate();
      return { ok: true };
    } catch (error) { return { ok: false, error: error instanceof Error ? error.message : "Téléchargement impossible." }; }
  });

  ipcMain.on("tabs:activate", (event, id: unknown) => {
    if (event.senderFrame && isTrustedBrowserShellSender(event.senderFrame.url) && typeof id === "string") {
      activateChatTab(id);
    }
  });
  ipcMain.on("tabs:close", (event, id: unknown) => {
    if (event.senderFrame && isTrustedBrowserShellSender(event.senderFrame.url) && typeof id === "string") {
      void closeChatTab(id);
    }
  });
  ipcMain.on("tabs:create", (event) => {
    if (event.senderFrame && isTrustedBrowserShellSender(event.senderFrame.url)) {
      createChatTab(newChatTabUrl(currentSettings), true);
    }
  });
  ipcMain.on("pull-refresh:progress", (event, value: unknown) => {
    const tab = tabForContents(event.sender);
    if (!tab || tab.id !== activeChatTabId || !currentSettings.pullToRefreshEnabled || !refreshView) return;
    const record = typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
    const progress = typeof record.progress === "number" ? Math.max(0, Math.min(1, record.progress)) : 0;
    const visible = record.visible === true && progress > 0;
    refreshView.webContents.send("refresh:progress", { progress });
    refreshView.setVisible(visible);
    if (visible) bringLocalOverlaysToFront();
  });
  ipcMain.on("pull-refresh:trigger", (event) => {
    const tab = tabForContents(event.sender);
    if (!tab || tab.id !== activeChatTabId || !currentSettings.pullToRefreshEnabled) return;
    refreshView?.setVisible(false);
    void safeReloadActiveTab("gesture");
  });

  ipcMain.handle("settings:get", (event) => {
    if (!event.senderFrame || !isTrustedLocalSender(event.senderFrame.url)) {
      throw new Error("Source IPC non autorisée.");
    }
    return settingsPayload();
  });

  ipcMain.handle("projects:scan", async (event) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) {
      return { ok: false, error: "Source IPC non autorisée." };
    }
    return { ...(await synchronizeProjectCache("settings")), ...settingsPayload() };
  });

  ipcMain.handle("projects:rename", (event, id: unknown, nameValue: unknown) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) {
      return { ok: false, error: "Source IPC non autorisée." };
    }
    const name = typeof nameValue === "string" ? nameValue.replace(/\s+/g, " ").trim().slice(0, 120) : "";
    const project = projectById(id);
    if (!project || !name) return { ok: false, error: "Projet ou nom invalide." };
    saveProjectSettings({
      ...currentSettings,
      chatGptProjects: currentSettings.chatGptProjects.map((candidate) =>
        candidate.id === project.id ? { ...candidate, name, locallyRenamed: true } : candidate,
      ),
    });
    return { ok: true, ...settingsPayload() };
  });

  ipcMain.handle("projects:remove", (event, id: unknown) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) {
      return { ok: false, error: "Source IPC non autorisée." };
    }
    const project = projectById(id);
    if (!project) return { ok: false, error: "Projet introuvable." };
    saveProjectSettings({
      ...currentSettings,
      chatGptProjects: currentSettings.chatGptProjects.filter((candidate) => candidate.id !== project.id),
      ...(currentSettings.defaultChatGptProjectId === project.id
        ? { defaultChatGptProjectId: undefined }
        : {}),
      ...(currentSettings.lastSelectedChatGptProjectId === project.id
        ? { lastSelectedChatGptProjectId: undefined }
        : {}),
    });
    return { ok: true, ...settingsPayload() };
  });

  ipcMain.handle("projects:reset-all", (event) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) {
      return { ok: false, error: "Source IPC non autorisée." };
    }
    if (projectSyncInProgress) {
      return { ok: false, error: "Attendez la fin de la synchronisation en cours." };
    }
    saveProjectSettings({
      ...currentSettings,
      chatGptProjects: [],
      defaultChatGptProjectId: undefined,
      lastSelectedChatGptProjectId: undefined,
      projectSyncStatus: { status: "never" },
    });
    currentProjectScanProgress = null;
    sendCompanionState();
    log.info("[projects] Cache local réinitialisé par l’utilisateur.");
    return { ok: true, ...settingsPayload() };
  });

  ipcMain.handle("projects:set-default", (event, id: unknown) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) {
      return { ok: false, error: "Source IPC non autorisée." };
    }
    const projectId = typeof id === "string" && projectById(id) ? id : undefined;
    saveProjectSettings({ ...currentSettings, defaultChatGptProjectId: projectId });
    return { ok: true, ...settingsPayload() };
  });

  ipcMain.handle("settings:save", (event, input: unknown) => {
    if (!event.senderFrame || !isTrustedLocalSender(event.senderFrame.url)) {
      return { ok: false, error: "Source IPC non autorisée." };
    }

    let proposedSettings: AppSettings;
    try {
      proposedSettings = validateSettingsInput(input, currentSettings);
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : "Paramètres invalides." };
    }

    if (
      proposedSettings.rememberWindowPosition !== currentSettings.rememberWindowPosition &&
      !applyKWinPositionMemory(proposedSettings)
    ) {
      return {
        ok: false,
        error: "Impossible de modifier la règle de position KWin.",
      };
    }

    const previousSettings = currentSettings;
    try {
      syncAutostart(proposedSettings.launchAtLogin);
    } catch (error) {
      log.error("[autostart] Impossible de modifier le démarrage automatique :", error);
      return { ok: false, error: "Impossible de modifier le démarrage automatique." };
    }

    const shouldRegisterShortcut =
      proposedSettings.globalShortcut !== previousSettings.globalShortcut ||
      registeredShortcut !== proposedSettings.globalShortcut;
    if (shouldRegisterShortcut && !applyGlobalShortcut(proposedSettings.globalShortcut, false)) {
      try {
        syncAutostart(previousSettings.launchAtLogin);
      } catch {
        // La restauration sera retentée au prochain lancement.
      }
      return {
        ok: false,
        error: "Ce raccourci est invalide ou déjà utilisé. L’ancien raccourci reste actif.",
      };
    }
    const shouldRegisterCompanionShortcut =
      proposedSettings.companionEnabled !== previousSettings.companionEnabled ||
      proposedSettings.companionShortcut !== previousSettings.companionShortcut ||
      (proposedSettings.companionEnabled &&
        registeredCompanionShortcut !== proposedSettings.companionShortcut);
    if (
      shouldRegisterCompanionShortcut &&
      !applyCompanionShortcut(
        proposedSettings.companionShortcut,
        proposedSettings.companionEnabled,
        false,
      )
    ) {
      if (shouldRegisterShortcut) {
        applyGlobalShortcut(previousSettings.globalShortcut, false);
      }
      applyCompanionShortcut(
        previousSettings.companionShortcut,
        previousSettings.companionEnabled,
        false,
      );
      return {
        ok: false,
        error: "Le raccourci de la Magic Bar est invalide ou déjà utilisé.",
      };
    }

    try {
      settingsStore?.save(proposedSettings);
      currentSettings = proposedSettings;
      applyThemeMode(currentSettings.themeMode);
      applyWindowDisplayMode();
      syncResponseMonitor();
      sendSearchShortcuts();
      sendCompanionState();
      for (const tab of chatTabs) {
        tab.view.webContents.send("pull-refresh:enabled", currentSettings.pullToRefreshEnabled);
      }
      layoutChatViews();
      scheduleTabStateSave();
    } catch (error) {
      log.error("[settings] Impossible d’enregistrer les paramètres :", error);
      try {
        syncAutostart(previousSettings.launchAtLogin);
      } catch {
        // La restauration sera retentée au prochain lancement.
      }
      if (proposedSettings.globalShortcut !== previousSettings.globalShortcut) {
        applyGlobalShortcut(previousSettings.globalShortcut, false);
      }
      if (
        proposedSettings.companionShortcut !== previousSettings.companionShortcut ||
        proposedSettings.companionEnabled !== previousSettings.companionEnabled
      ) {
        applyCompanionShortcut(
          previousSettings.companionShortcut,
          previousSettings.companionEnabled,
          false,
        );
      }
      return { ok: false, error: "Impossible d’enregistrer les paramètres sur le disque." };
    }

    if (
      mainWindow &&
      (previousSettings.defaultWidth !== currentSettings.defaultWidth ||
        previousSettings.defaultHeight !== currentSettings.defaultHeight)
    ) {
      mainWindow.setSize(currentSettings.defaultWidth, currentSettings.defaultHeight);
    }

    const languageRestartRequired = currentSettings.language !== activeLanguage;
    const restartRequired = languageRestartRequired;
    log.info(
      restartRequired
        ? "[settings] Paramètres enregistrés, redémarrage requis pour appliquer la langue."
        : "[settings] Paramètres enregistrés.",
    );
    return { ok: true, ...settingsPayload(), restartRequired, languageRestartRequired };
  });

  ipcMain.handle("session:reset", (event) => {
    if (!event.senderFrame || !isTrustedLocalSender(event.senderFrame.url)) {
      return false;
    }
    return resetSessionWithConfirmation();
  });

  ipcMain.handle("diagnostics:copy-log-file", (event) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) {
      return { ok: false, error: "Source IPC non autorisée." };
    }
    try {
      if (!logFilePath || !fs.existsSync(logFilePath)) {
        return { ok: false, error: "Fichier journal introuvable." };
      }
      const fileUri = `${pathToFileURL(logFilePath).href}\r\n`;
      clipboard.writeBuffer("text/uri-list", Buffer.from(fileUri, "utf8"), "clipboard");
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Copie du journal impossible.",
      };
    }
  });

  ipcMain.handle("diagnostics:copy-log-tail", (event) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) {
      return { ok: false, error: "Source IPC non autorisée." };
    }
    clipboard.writeText(readLogTail(100), "clipboard");
    return { ok: true };
  });

  ipcMain.handle("diagnostics:clear-log", (event) => {
    if (!event.senderFrame || !isTrustedSettingsSender(event.senderFrame.url)) {
      return { ok: false, error: "Source IPC non autorisée." };
    }
    return clearLogFile()
      ? { ok: true }
      : { ok: false, error: "Réinitialisation du journal impossible." };
  });

  ipcMain.handle("window:reset-bounds", (event) => {
    if (!event.senderFrame || !isTrustedLocalSender(event.senderFrame.url)) {
      throw new Error("Source IPC non autorisée.");
    }
    return resetWindowBounds();
  });

  ipcMain.on("settings:close", (event) => {
    if (event.senderFrame && isTrustedLocalSender(event.senderFrame.url)) {
      settingsWindow?.close();
    }
  });

  ipcMain.on("app:restart", (event) => {
    if (event.senderFrame && isTrustedLocalSender(event.senderFrame.url)) {
      restartApplication();
    }
  });

  ipcMain.handle("companion:get-state", (event) => {
    if (!event.senderFrame || !isTrustedCompanionSender(event.senderFrame.url)) {
      throw new Error("Source IPC non autorisée.");
    }
    return companionPublicState();
  });

  ipcMain.handle("companion:update-draft", (event, input: unknown) => {
    if (!event.senderFrame || !isTrustedCompanionSender(event.senderFrame.url)) {
      return { ok: false, version: companionDraft.version };
    }
    return updateCompanionDraft(input);
  });

  ipcMain.on("companion:manage-projects", (event) => {
    if (event.senderFrame && isTrustedCompanionSender(event.senderFrame.url)) {
      showSettingsWindow();
    }
  });

  ipcMain.handle("companion:sync-projects", async (event) => {
    if (!event.senderFrame || !isTrustedCompanionSender(event.senderFrame.url)) {
      return { ok: false, error: "Source IPC non autorisée." };
    }
    const result = await synchronizeProjectCache("magic-bar");
    return { ...result, state: companionPublicState() };
  });

  ipcMain.handle("companion:choose-files", (event) => {
    if (!event.senderFrame || !isTrustedCompanionSender(event.senderFrame.url)) {
      return;
    }
    return chooseCompanionFiles();
  });

  ipcMain.handle("companion:add-paths", async (event, filePaths: unknown) => {
    if (!event.senderFrame || !isTrustedCompanionSender(event.senderFrame.url)) {
      return { added: 0 };
    }
    const safePaths = Array.isArray(filePaths)
      ? filePaths.filter((value): value is string => typeof value === "string").slice(0, 50)
      : [];
    return { added: await addCompanionPaths(safePaths) };
  });

  ipcMain.handle("companion:capture", (event, mode: unknown) => {
    if (!event.senderFrame || !isTrustedCompanionSender(event.senderFrame.url)) {
      return { ok: false };
    }
    return captureWithSpectacle(mode);
  });

  ipcMain.handle("companion:clipboard-import", (event) => {
    if (!event.senderFrame || !isTrustedCompanionSender(event.senderFrame.url)) {
      return { ok: false };
    }
    return importClipboardToCompanion();
  });

  ipcMain.handle("companion:open-preview", (event, itemId: unknown) => {
    if (!event.senderFrame || !isTrustedCompanionSender(event.senderFrame.url)) {
      return { ok: false };
    }
    return openCompanionPreview(itemId);
  });

  ipcMain.on("companion:preview-close", (event) => {
    if (event.senderFrame && isTrustedCompanionSender(event.senderFrame.url)) {
      hideCompanionPreview();
    }
  });

  ipcMain.handle("search:find", (event, input: unknown) => {
    if (!event.senderFrame || !isTrustedSearchSender(event.senderFrame.url)) {
      return { ok: false };
    }
    const contents = activeChatContents();
    if (!mainWindow || mainWindow.isDestroyed() || !contents || typeof input !== "object" || input === null) {
      return { ok: false };
    }
    const record = input as Record<string, unknown>;
    const query = typeof record.query === "string" ? record.query.slice(0, 500) : "";
    if (!query) {
      contents.stopFindInPage("clearSelection");
      return { ok: true, requestId: 0 };
    }
    const requestId = contents.findInPage(query, {
      forward: record.forward !== false,
      findNext: record.findNext === true,
    });
    return { ok: true, requestId };
  });

  ipcMain.on("search:close", (event) => {
    if (event.senderFrame && isTrustedSearchSender(event.senderFrame.url)) {
      hideSearch();
    }
  });

  ipcMain.on("companion:remove-item", (event, id: unknown) => {
    if (!event.senderFrame || !isTrustedCompanionSender(event.senderFrame.url) || typeof id !== "string") {
      return;
    }
    const removed = companionItems.find((item) => item.id === id);
    companionItems = companionItems.filter((item) => item.id !== id);
    if (removed) touchCompanionDraft();
    if (removed?.temporary && removed.filePath) {
      fs.rmSync(removed.filePath, { force: true });
    }
    sendCompanionState();
  });

  ipcMain.on("companion:set-expanded", (event, expanded: unknown) => {
    if (event.senderFrame && isTrustedCompanionSender(event.senderFrame.url)) {
      if (expanded === true) {
        showCompanionMenu();
      } else {
        hideCompanionMenu();
      }
    }
  });

  ipcMain.on("companion:layout", (event, layout: unknown) => {
    if (!event.senderFrame || !isTrustedCompanionSender(event.senderFrame.url)) {
      return;
    }
    if (typeof layout !== "object" || layout === null) {
      return;
    }
    if (!companionWindow || companionWindow.isDestroyed()) {
      return;
    }
    const [windowWidth, windowHeight] = companionWindow.getSize();
    const [windowX, windowY] = companionWindow.getPosition();
    const workArea = screen.getDisplayMatching({
      x: windowX,
      y: windowY,
      width: windowWidth,
      height: windowHeight,
    }).workArea;
    const record = layout as Record<string, unknown>;
    const height = typeof record.height === "number" ? Math.round(record.height) : 0;
    const rects = Array.isArray(record.rects)
      ? record.rects
          .map((value): Rectangle | null => {
            if (typeof value !== "object" || value === null) {
              return null;
            }
            const candidate = value as Record<string, unknown>;
            const x = typeof candidate.x === "number" ? Math.round(candidate.x) : 0;
            const y = typeof candidate.y === "number" ? Math.round(candidate.y) : 0;
            const width = typeof candidate.width === "number" ? Math.round(candidate.width) : 0;
            const height = typeof candidate.height === "number" ? Math.round(candidate.height) : 0;
            if (width <= 0 || height <= 0 || width > windowWidth + 2 || height > windowHeight + 2) {
              return null;
            }
            return { x, y, width, height };
          })
          .filter((value): value is Rectangle => Boolean(value))
      : [];
    if (rects.length > 0) {
      setCompanionShape(rects);
    }
    if (height >= MAGIC_BAR_MIN_HEIGHT && height <= workArea.height) {
      companionMeasuredHeight = height;
      const [width, currentHeight] = companionWindow.getSize();
      companionWindow.setMinimumSize(520, MAGIC_BAR_MIN_HEIGHT);
      companionWindow.setMaximumSize(Math.max(520, workArea.width), height);
      companionWindow.setMinimumSize(520, height);
      if (currentHeight !== height) {
        companionWindow.setSize(width, height, false);
      }
    }
  });

  ipcMain.on("companion:close", (event) => {
    if (event.senderFrame && isTrustedCompanionSender(event.senderFrame.url)) {
      hideCompanionMenu();
      companionWindow?.hide();
    }
  });

  ipcMain.handle("companion:transfer", (event, input: unknown) => {
    if (!event.senderFrame || !isTrustedCompanionSender(event.senderFrame.url)) {
      return { ok: false, error: "Source IPC non autorisée." };
    }
    return transferCompanionToChat(input);
  });
}

app.setName(APP_TITLE);
logFilePath = path.join(app.getPath("userData"), "app.log");
initializeLogger(logFilePath);
settingsStore = new SettingsStore(path.join(app.getPath("userData"), "settings.json"));
currentSettings = settingsStore.load();
activeLanguage = currentSettings.language;
app.commandLine.appendSwitch("lang", LANGUAGE_LOCALES[activeLanguage]);

isWaylandSession =
  process.platform === "linux" &&
  (process.env.XDG_SESSION_TYPE === "wayland" || Boolean(process.env.WAYLAND_DISPLAY));
activeDisplayServerMode = isWaylandSession ? "wayland" : "x11";

if (isWaylandSession) {
  if (currentSettings.displayServerMode !== "wayland") {
    currentSettings = { ...currentSettings, displayServerMode: "wayland" };
    try {
      settingsStore.save(currentSettings);
      log.info("[settings] Mode Wayland natif restauré.");
    } catch (error) {
      log.warn("[settings] Migration vers Wayland non enregistrée :", error);
    }
  }
  app.commandLine.appendSwitch("ozone-platform", "wayland");
  app.commandLine.appendSwitch("disable-features", "Vulkan");
  app.commandLine.appendSwitch("enable-features", "GlobalShortcutsPortal");
}

log.info(
  `[startup] ChatGPT Desktop Linux ${app.getVersion()} — mode ${activeDisplayServerMode} natif.`,
);

const startupRequest = parseCliRequest(process.argv);
const startupCommand = startupRequest?.command ?? null;
const hasSingleInstanceLock = app.requestSingleInstanceLock({
  request: startupRequest,
  version: app.getVersion(),
});

if (!hasSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", async (_event, argv, _workingDirectory, additionalData) => {
    const requestFromAdditionalData =
      typeof additionalData === "object" &&
      additionalData !== null &&
      "request" in additionalData
        ? additionalData.request
        : undefined;
    const parsedRequest = parseCliRequest(argv);
    const request =
      typeof requestFromAdditionalData === "object" &&
      requestFromAdditionalData !== null &&
      "command" in requestFromAdditionalData &&
      isCliCommand(requestFromAdditionalData.command)
        ? {
            command: requestFromAdditionalData.command,
            files:
              "files" in requestFromAdditionalData && Array.isArray(requestFromAdditionalData.files)
                ? requestFromAdditionalData.files.filter(
                    (value): value is string => typeof value === "string",
                  )
                : [],
            text:
              "text" in requestFromAdditionalData &&
              typeof requestFromAdditionalData.text === "string"
                ? requestFromAdditionalData.text.slice(0, MAX_CONTEXT_LENGTH)
                : undefined,
            source:
              "source" in requestFromAdditionalData &&
              typeof requestFromAdditionalData.source === "string"
                ? requestFromAdditionalData.source.slice(0, 160)
                : undefined,
            clipboard:
              "clipboard" in requestFromAdditionalData &&
              requestFromAdditionalData.clipboard === true,
          }
        : (parsedRequest ?? { command: "show" as const, files: [] });

    const incomingVersion =
      typeof additionalData === "object" &&
      additionalData !== null &&
      "version" in additionalData &&
      typeof additionalData.version === "string"
        ? additionalData.version
        : null;
    const currentVersion = app.getVersion();
    if (incomingVersion && incomingVersion !== currentVersion && !hasPromptedUpgradeRestart) {
      hasPromptedUpgradeRestart = true;
      log.info(`[upgrade] Version différente détectée : active=${currentVersion}, lancée=${incomingVersion}.`);
      let shouldRestart = false;
      try {
        shouldRestart = await confirmUpgradeRestart(currentVersion, incomingVersion);
      } catch (error) {
        log.error("[upgrade] Impossible d’afficher la proposition de redémarrage :", error);
      }
      if (shouldRestart) {
        log.info("[upgrade] Redémarrage accepté pour charger la version installée.");
        restartApplication(relaunchArgsForRequest(request));
        return;
      }
      log.info("[upgrade] Redémarrage refusé ; la requête est exécutée par la version active.");
    }

    log.info(`[cli] Commande ${request.command} reçue d’une seconde instance.`);

    if (mainWindow) {
      executeRequest(request);
    } else {
      pendingRequest = request;
    }
  });

  app.on("before-quit", event => {
    if (updateInProgress && ["authorization", "install"].includes(updateProgressState.phase)) {
      event.preventDefault(); updateProgressWindow?.show(); updateProgressWindow?.focus(); return;
    }
    if (updateInProgress) githubUpdater?.cancel();
    isQuitting = true;
    if (tabStateTimer) {
      clearTimeout(tabStateTimer);
      tabStateTimer = null;
    }
    persistTabStateNow();
    if (windowStateTimer) {
      clearTimeout(windowStateTimer);
      windowStateTimer = null;
    }
    if (projectSyncTimer) {
      clearInterval(projectSyncTimer);
      projectSyncTimer = null;
    }
    destroyProjectScanWindow();
    destroyCompanionPreviewWindow();
    stopKWinCompanionController();
    persistWindowBounds();
    fs.rmSync(COMPANION_TEMP_DIR, { recursive: true, force: true });
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });

  app.on("child-process-gone", (_event, details) => {
    log.error(
      `[process] Sous-processus arrêté : type=${details.type}, raison=${details.reason}, code=${details.exitCode}.`,
    );
  });

  app.on("window-all-closed", () => {
    if (!isQuitting) {
      log.info("[window] Toutes les fenêtres sont fermées, maintien en arrière-plan.");
    }
  });

  if (startupCommand === "quit") {
    app.once("ready", quitApplication);
  } else {
    void app.whenReady().then(async () => {
      fs.rmSync(COMPANION_TEMP_DIR, { recursive: true, force: true });
      fs.mkdirSync(COMPANION_TEMP_DIR, { recursive: true, mode: 0o700 });
      registerIpcHandlers();

      applyKWinPositionMemory(currentSettings);
      if (activeDisplayServerMode === "wayland") {
        const companionController = startKWinCompanionController();
        if (companionController.available) {
          log.info("[kwin] Contrôleur de session Magic Bar chargé.");
        } else {
          log.warn(
            `[kwin] Contrôleur de session Magic Bar indisponible : ${companionController.error ?? "KWin indisponible."}`,
          );
        }
      }
      configureChatLanguage();
      await loadNestFoldersExtension();
      applyThemeMode(currentSettings.themeMode);

      nativeTheme.on("updated", () => {
        if (currentSettings.themeMode !== "system") return;
        void applyChatTheme();
        sendCompanionState();
        sendSettingsTheme();
        updateTrayIcon();
      });

      try {
        syncAutostart(currentSettings.launchAtLogin);
      } catch (error) {
        log.error("[autostart] Synchronisation impossible :", error);
      }

      if (app.isPackaged && !process.env.APPIMAGE) {
        syncKateTextIntegration("/usr/bin/chatgpt-desktop-linux");
      }

      createMainWindow(
        startupCommand === "hide" ||
          startupCommand === "settings" ||
          startupCommand === "companion",
      );
      setTimeout(() => { void checkUpdatesOnStartup(); }, 12_000);
      syncTray();
      applyGlobalShortcut(currentSettings.globalShortcut);
      applyCompanionShortcut(
        currentSettings.companionShortcut,
        currentSettings.companionEnabled,
      );
      projectSyncTimer = setInterval(() => {
        void synchronizeProjectsInBackground();
      }, PROJECT_SYNC_INTERVAL_MS);
      projectSyncTimer.unref();

      if (startupCommand === "settings") {
        showSettingsWindow();
      }
      if (startupCommand === "companion") {
        showCompanionWindow(startupRequest?.files ?? [], startupRequest?.text, {
          source: startupRequest?.source,
          clipboard: startupRequest?.clipboard === true,
        });
      }

      if (pendingRequest) {
        const request = pendingRequest;
        pendingRequest = null;
        executeRequest(request);
      }
    });
  }
}
