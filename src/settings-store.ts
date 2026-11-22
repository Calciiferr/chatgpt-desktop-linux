import fs from "node:fs";
import path from "node:path";
import { log } from "./logger";
import {
  type ChatGptProject,
  type ProjectSyncState,
  normalizeStoredProjects,
} from "./chatgpt-projects";
import { t } from "./i18n";

export type CloseBehavior = "hide" | "quit";
export type DisplayServerMode = "wayland" | "x11";
export type WindowDisplayMode = "tray" | "taskbar" | "both";
export type AppLanguage = "fr" | "en" | "es";
export type ThemeMode = "system" | "light" | "dark";
export type TabBarMode = "auto" | "always" | "hidden";
export type LastTabCloseBehavior = "home" | "hide" | "ignore";

export interface StoredWindowBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppSettings {
  globalShortcut: string;
  searchShortcut: string;
  searchNextShortcut: string;
  searchPreviousShortcut: string;
  reloadShortcut: string;
  newTabShortcut: string;
  checkUpdatesOnStartup: boolean;
  closeTabShortcut: string;
  nextTabShortcut: string;
  previousTabShortcut: string;
  reopenClosedTabShortcut: string;
  pullToRefreshEnabled: boolean;
  tabBarMode: TabBarMode;
  restoreTabsOnStartup: boolean;
  lastTabCloseBehavior: LastTabCloseBehavior;
  companionEnabled: boolean;
  nestFoldersEnabled: boolean;
  companionShortcut: string;
  companionPromptMaxLines: number;
  themeMode: ThemeMode;
  responseNotificationsEnabled: boolean;
  windowDisplayMode: WindowDisplayMode;
  closeBehavior: CloseBehavior;
  launchAtLogin: boolean;
  rememberWindowPosition: boolean;
  language: AppLanguage;
  displayServerMode: DisplayServerMode;
  defaultWidth: number;
  defaultHeight: number;
  chatGptProjects: ChatGptProject[];
  defaultChatGptProjectId?: string;
  newTabChatGptProjectId?: string;
  lastSelectedChatGptProjectId?: string;
  projectSyncStatus: {
    status: ProjectSyncState;
    at?: string;
    message?: string;
  };
  lastChatUrl?: string;
  openChatTabUrls: string[];
  activeChatTabIndex: number;
  windowBounds?: StoredWindowBounds;
}

export const DEFAULT_SETTINGS: Readonly<AppSettings> = {
  globalShortcut: "Ctrl+Alt+G",
  searchShortcut: "Ctrl+F",
  searchNextShortcut: "Enter",
  searchPreviousShortcut: "Shift+Enter",
  reloadShortcut: "F5",
  newTabShortcut: "Ctrl+T",
  checkUpdatesOnStartup: true,
  closeTabShortcut: "Ctrl+W",
  nextTabShortcut: "Ctrl+Tab",
  previousTabShortcut: "Ctrl+Shift+Tab",
  reopenClosedTabShortcut: "Ctrl+Shift+T",
  pullToRefreshEnabled: false,
  tabBarMode: "auto",
  restoreTabsOnStartup: false,
  lastTabCloseBehavior: "home",
  companionEnabled: false,
  nestFoldersEnabled: true,
  companionShortcut: "Ctrl+Shift+Space",
  companionPromptMaxLines: 3,
  themeMode: "system",
  responseNotificationsEnabled: true,
  windowDisplayMode: "both",
  closeBehavior: "hide",
  launchAtLogin: false,
  rememberWindowPosition: true,
  language: "en",
  displayServerMode: "wayland",
  defaultWidth: 520,
  defaultHeight: 760,
  chatGptProjects: [],
  projectSyncStatus: { status: "never" },
  openChatTabUrls: [],
  activeChatTabIndex: 0,
};

const MIN_WIDTH = 420;
const MAX_WIDTH = 3840;
const MIN_HEIGHT = 560;
const MAX_HEIGHT = 2160;
const MIN_COMPANION_PROMPT_LINES = 1;
const MAX_COMPANION_PROMPT_LINES = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function canonicalAccelerator(value: string): string {
  const parts = value.toLowerCase().split("+").map((part) => part.trim()).filter(Boolean);
  const key = parts.pop() ?? "";
  const modifiers = new Set(parts.map((part) => part === "control" ? "ctrl" : part === "commandorcontrol" ? "ctrl" : part));
  return ["ctrl", "alt", "shift", "super", "meta"]
    .filter((part) => modifiers.has(part))
    .concat(key)
    .join("+");
}

function parseWindowBounds(value: unknown): StoredWindowBounds | undefined {
  if (
    !isRecord(value) ||
    !isFiniteNumber(value.x) ||
    !isFiniteNumber(value.y) ||
    !isFiniteNumber(value.width) ||
    !isFiniteNumber(value.height) ||
    value.width < MIN_WIDTH ||
    value.width > MAX_WIDTH ||
    value.height < MIN_HEIGHT ||
    value.height > MAX_HEIGHT
  ) {
    return undefined;
  }

  return {
    x: Math.round(value.x),
    y: Math.round(value.y),
    width: Math.round(value.width),
    height: Math.round(value.height),
  };
}

function normalizeChatTabUrls(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((candidate) => {
    if (typeof candidate !== "string") return [];
    try {
      const url = new URL(candidate);
      return url.protocol === "https:" && url.origin === "https://chatgpt.com"
        ? [url.toString()]
        : [];
    } catch {
      return [];
    }
  }).slice(0, 8);
}

function normalizeStoredSettings(value: unknown): AppSettings {
  if (!isRecord(value)) {
    return { ...DEFAULT_SETTINGS };
  }

  const shortcut = typeof value.globalShortcut === "string" ? value.globalShortcut.trim() : "";
  const defaultWidth = isFiniteNumber(value.defaultWidth)
    ? Math.round(value.defaultWidth)
    : DEFAULT_SETTINGS.defaultWidth;
  const defaultHeight = isFiniteNumber(value.defaultHeight)
    ? Math.round(value.defaultHeight)
    : DEFAULT_SETTINGS.defaultHeight;
  const companionPromptMaxLines = isFiniteNumber(value.companionPromptMaxLines)
    ? Math.round(value.companionPromptMaxLines)
    : DEFAULT_SETTINGS.companionPromptMaxLines;
  const windowBounds = parseWindowBounds(value.windowBounds);
  const chatGptProjects = normalizeStoredProjects(value.chatGptProjects);
  const projectIds = new Set(chatGptProjects.map((project) => project.id));
  const syncValue = isRecord(value.projectSyncStatus) ? value.projectSyncStatus : {};
  const syncStatus: ProjectSyncState =
    syncValue.status === "ok" ||
    syncValue.status === "partial" ||
    syncValue.status === "error"
      ? syncValue.status
      : "never";
  const openChatTabUrls = normalizeChatTabUrls(value.openChatTabUrls);
  const activeChatTabIndex = isFiniteNumber(value.activeChatTabIndex)
    ? Math.max(0, Math.min(Math.round(value.activeChatTabIndex), Math.max(0, openChatTabUrls.length - 1)))
    : 0;

  return {
    globalShortcut: shortcut || DEFAULT_SETTINGS.globalShortcut,
    searchShortcut:
      typeof value.searchShortcut === "string" && value.searchShortcut.trim()
        ? value.searchShortcut.trim()
        : DEFAULT_SETTINGS.searchShortcut,
    searchNextShortcut:
      typeof value.searchNextShortcut === "string" && value.searchNextShortcut.trim()
        ? value.searchNextShortcut.trim()
        : DEFAULT_SETTINGS.searchNextShortcut,
    searchPreviousShortcut:
      typeof value.searchPreviousShortcut === "string" && value.searchPreviousShortcut.trim()
        ? value.searchPreviousShortcut.trim()
        : DEFAULT_SETTINGS.searchPreviousShortcut,
    reloadShortcut:
      typeof value.reloadShortcut === "string" && value.reloadShortcut.trim()
        ? value.reloadShortcut.trim()
        : DEFAULT_SETTINGS.reloadShortcut,
    checkUpdatesOnStartup: typeof value.checkUpdatesOnStartup === "boolean" ? value.checkUpdatesOnStartup : true,
    newTabShortcut:
      typeof value.newTabShortcut === "string" && value.newTabShortcut.trim()
        ? value.newTabShortcut.trim()
        : DEFAULT_SETTINGS.newTabShortcut,
    closeTabShortcut:
      typeof value.closeTabShortcut === "string" && value.closeTabShortcut.trim()
        ? value.closeTabShortcut.trim()
        : DEFAULT_SETTINGS.closeTabShortcut,
    nextTabShortcut:
      typeof value.nextTabShortcut === "string" && value.nextTabShortcut.trim()
        ? value.nextTabShortcut.trim()
        : DEFAULT_SETTINGS.nextTabShortcut,
    previousTabShortcut:
      typeof value.previousTabShortcut === "string" && value.previousTabShortcut.trim()
        ? value.previousTabShortcut.trim()
        : DEFAULT_SETTINGS.previousTabShortcut,
    reopenClosedTabShortcut:
      typeof value.reopenClosedTabShortcut === "string" && value.reopenClosedTabShortcut.trim()
        ? value.reopenClosedTabShortcut.trim()
        : DEFAULT_SETTINGS.reopenClosedTabShortcut,
    pullToRefreshEnabled: value.pullToRefreshEnabled === true,
    tabBarMode:
      value.tabBarMode === "always" || value.tabBarMode === "hidden"
        ? value.tabBarMode
        : "auto",
    restoreTabsOnStartup: value.restoreTabsOnStartup === true,
    lastTabCloseBehavior:
      value.lastTabCloseBehavior === "hide" || value.lastTabCloseBehavior === "ignore"
        ? value.lastTabCloseBehavior
        : "home",
    companionEnabled:
      typeof value.companionEnabled === "boolean" ? value.companionEnabled : DEFAULT_SETTINGS.companionEnabled,
    nestFoldersEnabled: value.nestFoldersEnabled !== false,
    companionShortcut:
      typeof value.companionShortcut === "string" && value.companionShortcut.trim()
        ? value.companionShortcut.trim()
        : DEFAULT_SETTINGS.companionShortcut,
    companionPromptMaxLines:
      companionPromptMaxLines >= MIN_COMPANION_PROMPT_LINES &&
      companionPromptMaxLines <= MAX_COMPANION_PROMPT_LINES
        ? companionPromptMaxLines
        : DEFAULT_SETTINGS.companionPromptMaxLines,
    themeMode:
      value.themeMode === "system" || value.themeMode === "light" || value.themeMode === "dark"
        ? value.themeMode
        : typeof value.companionDarkMode === "boolean"
          ? value.companionDarkMode ? "dark" : "light"
          : DEFAULT_SETTINGS.themeMode,
    responseNotificationsEnabled: value.responseNotificationsEnabled !== false,
    windowDisplayMode:
      value.windowDisplayMode === "tray" || value.windowDisplayMode === "taskbar"
        ? value.windowDisplayMode
        : "both",
    closeBehavior: value.closeBehavior === "quit" ? "quit" : "hide",
    launchAtLogin: value.launchAtLogin === true,
    rememberWindowPosition: value.rememberWindowPosition !== false,
    language: value.language === "fr" || value.language === "es" ? value.language : "en",
    displayServerMode:
      value.displayServerMode === "x11" || value.displayServerMode === "wayland"
        ? value.displayServerMode
        : DEFAULT_SETTINGS.displayServerMode,
    defaultWidth:
      defaultWidth >= MIN_WIDTH && defaultWidth <= MAX_WIDTH
        ? defaultWidth
        : DEFAULT_SETTINGS.defaultWidth,
    defaultHeight:
      defaultHeight >= MIN_HEIGHT && defaultHeight <= MAX_HEIGHT
        ? defaultHeight
        : DEFAULT_SETTINGS.defaultHeight,
    chatGptProjects,
    projectSyncStatus: {
      status: syncStatus,
      ...(typeof syncValue.at === "string" && !Number.isNaN(Date.parse(syncValue.at))
        ? { at: syncValue.at }
        : {}),
      ...(typeof syncValue.message === "string"
        ? { message: syncValue.message.slice(0, 500) }
        : {}),
    },
    ...(typeof value.defaultChatGptProjectId === "string" &&
    projectIds.has(value.defaultChatGptProjectId)
      ? { defaultChatGptProjectId: value.defaultChatGptProjectId }
      : {}),
    ...(typeof value.newTabChatGptProjectId === "string" && projectIds.has(value.newTabChatGptProjectId)
      ? { newTabChatGptProjectId: value.newTabChatGptProjectId } : {}),
    ...(typeof value.lastSelectedChatGptProjectId === "string" &&
    projectIds.has(value.lastSelectedChatGptProjectId)
      ? { lastSelectedChatGptProjectId: value.lastSelectedChatGptProjectId }
      : {}),
    ...(typeof value.lastChatUrl === "string" && value.lastChatUrl.startsWith("https://chatgpt.com/")
      ? { lastChatUrl: value.lastChatUrl }
      : {}),
    openChatTabUrls,
    activeChatTabIndex,
    ...(windowBounds ? { windowBounds } : {}),
  };
}

export function validateSettingsInput(input: unknown, current: AppSettings): AppSettings {
  if (!isRecord(input)) {
    throw new Error(t("settingsInvalid"));
  }

  const shortcut = typeof input.globalShortcut === "string" ? input.globalShortcut.trim() : "";
  if (!shortcut || shortcut.length > 64) {
    throw new Error("Le raccourci clavier est invalide.");
  }
  const searchShortcut =
    typeof input.searchShortcut === "string" ? input.searchShortcut.trim() : "";
  const searchNextShortcut =
    typeof input.searchNextShortcut === "string" ? input.searchNextShortcut.trim() : "";
  const searchPreviousShortcut =
    typeof input.searchPreviousShortcut === "string" ? input.searchPreviousShortcut.trim() : "";
  const reloadShortcut =
    typeof input.reloadShortcut === "string" ? input.reloadShortcut.trim() : "";
  const newTabShortcut =
    typeof input.newTabShortcut === "string" ? input.newTabShortcut.trim() : "";
  const closeTabShortcut =
    typeof input.closeTabShortcut === "string" ? input.closeTabShortcut.trim() : "";
  const nextTabShortcut =
    typeof input.nextTabShortcut === "string" ? input.nextTabShortcut.trim() : "";
  const previousTabShortcut =
    typeof input.previousTabShortcut === "string" ? input.previousTabShortcut.trim() : "";
  const reopenClosedTabShortcut =
    typeof input.reopenClosedTabShortcut === "string" ? input.reopenClosedTabShortcut.trim() : "";
  const localShortcuts = [
    searchShortcut,
    searchNextShortcut,
    searchPreviousShortcut,
    reloadShortcut,
    newTabShortcut,
    closeTabShortcut,
    nextTabShortcut,
    previousTabShortcut,
    reopenClosedTabShortcut,
  ];
  if (
    localShortcuts.some((value) => !value || value.length > 64)
  ) {
    throw new Error("Les raccourcis locaux sont invalides.");
  }
  const normalizedLocalShortcuts = localShortcuts.map(canonicalAccelerator);
  if (new Set(normalizedLocalShortcuts).size !== normalizedLocalShortcuts.length) {
    throw new Error(t("settingsLocalShortcutsDistinct"));
  }
  const fixedTabShortcuts = Array.from({ length: 9 }, (_value, index) => `ctrl+${index + 1}`);
  if (normalizedLocalShortcuts.some((value) => fixedTabShortcuts.includes(value))) {
    throw new Error(t("settingsTabShortcutsReserved"));
  }
  if (typeof input.companionEnabled !== "boolean") {
    throw new Error(t("settingsCompanionInvalid"));
  }
  if (typeof input.nestFoldersEnabled !== "boolean") {
    throw new Error(t("settingsNestFoldersInvalid"));
  }
  const companionShortcut =
    typeof input.companionShortcut === "string" ? input.companionShortcut.trim() : "";
  if (!companionShortcut || companionShortcut.length > 64) {
    throw new Error("Le raccourci de la Magic Bar est invalide.");
  }
  const companionPromptMaxLines = Number(input.companionPromptMaxLines);
  if (
    !Number.isInteger(companionPromptMaxLines) ||
    companionPromptMaxLines < MIN_COMPANION_PROMPT_LINES ||
    companionPromptMaxLines > MAX_COMPANION_PROMPT_LINES
  ) {
    throw new Error(
      t("settingsCompanionLines", { min: MIN_COMPANION_PROMPT_LINES, max: MAX_COMPANION_PROMPT_LINES }),
    );
  }
  if (input.companionEnabled && companionShortcut === shortcut) {
    throw new Error(t("settingsGlobalShortcutsDistinct"));
  }
  const reservedGlobalShortcuts = [shortcut, ...(input.companionEnabled ? [companionShortcut] : [])]
    .map(canonicalAccelerator);
  if (normalizedLocalShortcuts.some((value) => reservedGlobalShortcuts.includes(value))) {
    throw new Error(t("settingsLocalReusesGlobal"));
  }
  if (input.themeMode !== "system" && input.themeMode !== "light" && input.themeMode !== "dark") {
    throw new Error(t("settingsThemeInvalid"));
  }
  if (typeof input.pullToRefreshEnabled !== "boolean") {
    throw new Error(t("settingsPullToRefreshInvalid"));
  }
  if (input.tabBarMode !== "auto" && input.tabBarMode !== "always" && input.tabBarMode !== "hidden") {
    throw new Error(t("settingsTabBarInvalid"));
  }
  if (typeof input.restoreTabsOnStartup !== "boolean") {
    throw new Error(t("settingsRestoreTabsInvalid"));
  }
  if (
    input.lastTabCloseBehavior !== "home" &&
    input.lastTabCloseBehavior !== "hide" &&
    input.lastTabCloseBehavior !== "ignore"
  ) {
    throw new Error("Le comportement du dernier onglet est invalide.");
  }
  if (typeof input.responseNotificationsEnabled !== "boolean") {
    throw new Error(t("settingsNotificationsInvalid"));
  }
  if (
    input.windowDisplayMode !== "tray" &&
    input.windowDisplayMode !== "taskbar" &&
    input.windowDisplayMode !== "both"
  ) {
    throw new Error(t("settingsDisplayModeInvalid"));
  }
  if (input.closeBehavior !== "hide" && input.closeBehavior !== "quit") {
    throw new Error("Le comportement de fermeture est invalide.");
  }
  if (typeof input.launchAtLogin !== "boolean") {
    throw new Error(t("settingsAutostartInvalid"));
  }
  if (typeof input.rememberWindowPosition !== "boolean") {
    throw new Error(t("settingsPositionInvalid"));
  }
  if (input.language !== "fr" && input.language !== "en" && input.language !== "es") {
    throw new Error(t("settingsLanguageInvalid"));
  }
  if (input.displayServerMode !== "wayland" && input.displayServerMode !== "x11") {
    throw new Error(t("settingsDisplayServerInvalid"));
  }

  const width = Number(input.defaultWidth);
  const height = Number(input.defaultHeight);
  if (!Number.isInteger(width) || width < MIN_WIDTH || width > MAX_WIDTH) {
    throw new Error(t("settingsWidthRange", { min: MIN_WIDTH, max: MAX_WIDTH }));
  }
  if (!Number.isInteger(height) || height < MIN_HEIGHT || height > MAX_HEIGHT) {
    throw new Error(t("settingsHeightRange", { min: MIN_HEIGHT, max: MAX_HEIGHT }));
  }

  return {
    ...current,
    checkUpdatesOnStartup: typeof input.checkUpdatesOnStartup === "boolean" ? input.checkUpdatesOnStartup : current.checkUpdatesOnStartup,
    newTabChatGptProjectId: input.newTabChatGptProjectId === undefined
      ? current.newTabChatGptProjectId
      : typeof input.newTabChatGptProjectId === "string" && current.chatGptProjects.some(project => project.id === input.newTabChatGptProjectId)
        ? input.newTabChatGptProjectId : undefined,
    globalShortcut: shortcut,
    searchShortcut,
    searchNextShortcut,
    searchPreviousShortcut,
    reloadShortcut,
    newTabShortcut,
    closeTabShortcut,
    nextTabShortcut,
    previousTabShortcut,
    reopenClosedTabShortcut,
    pullToRefreshEnabled: input.pullToRefreshEnabled,
    tabBarMode: input.tabBarMode,
    restoreTabsOnStartup: input.restoreTabsOnStartup,
    lastTabCloseBehavior: input.lastTabCloseBehavior,
    companionEnabled: input.companionEnabled,
    nestFoldersEnabled: input.nestFoldersEnabled,
    companionShortcut,
    companionPromptMaxLines,
    themeMode: input.themeMode,
    responseNotificationsEnabled: input.responseNotificationsEnabled,
    windowDisplayMode: input.windowDisplayMode,
    closeBehavior: input.closeBehavior,
    launchAtLogin: input.launchAtLogin,
    rememberWindowPosition: input.rememberWindowPosition,
    language: input.language,
    displayServerMode: input.displayServerMode,
    defaultWidth: width,
    defaultHeight: height,
  };
}

export class SettingsStore {
  public constructor(private readonly filePath: string) {}

  public load(): AppSettings {
    try {
      const content = fs.readFileSync(this.filePath, "utf8");
      return normalizeStoredSettings(JSON.parse(content) as unknown);
    } catch (error) {
      const errorCode = isRecord(error) && typeof error.code === "string" ? error.code : "";
      if (errorCode !== "ENOENT") {
        log.warn("[settings] Unreadable settings file, using defaults.");
      }
      return { ...DEFAULT_SETTINGS };
    }
  }

  public save(settings: AppSettings): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    fs.writeFileSync(temporaryPath, `${JSON.stringify(settings, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    fs.renameSync(temporaryPath, this.filePath);
  }
}

/** A removed project falls back to the normal ChatGPT home. */
export function newChatTabUrl(settings: Pick<AppSettings, "chatGptProjects" | "newTabChatGptProjectId">): string {
  return settings.chatGptProjects.find(project => project.id === settings.newTabChatGptProjectId)?.url
    ?? "https://chatgpt.com/";
}
