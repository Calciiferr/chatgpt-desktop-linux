import { spawnSync } from "node:child_process";

const COMPONENT_ID = "chatgpt-desktop-linux.desktop";
const COMPONENT_NAME = "ChatGPT";

const QT_MODIFIERS: Record<string, number> = {
  ctrl: 0x04000000,
  control: 0x04000000,
  alt: 0x08000000,
  shift: 0x02000000,
  super: 0x10000000,
  meta: 0x10000000,
};

const QT_KEYS: Record<string, number> = {
  space: 0x20,
  tab: 0x01000001,
  backspace: 0x01000003,
  enter: 0x01000004,
  return: 0x01000004,
  insert: 0x01000006,
  delete: 0x01000007,
  home: 0x01000010,
  end: 0x01000011,
  left: 0x01000012,
  up: 0x01000013,
  right: 0x01000014,
  down: 0x01000015,
  pageup: 0x01000016,
  pagedown: 0x01000017,
  plus: 0x2b,
};

export type KdeShortcutAction = "main" | "companion";

export interface KdeShortcutResult {
  available: boolean;
  applied: boolean;
  defaultApplied?: boolean;
  actionId?: string;
  legacyMigrated?: boolean;
  error?: string;
}

export function kdeShortcutActionDetails(action: KdeShortcutAction): { id: string; name: string } {
  return action === "main"
    ? { id: "Toggle", name: "Afficher/masquer ChatGPT" }
    : { id: "Companion", name: "Ouvrir la Magic Bar" };
}

function actionIdentifier(details: { id: string; name: string }): string {
  return `['${COMPONENT_ID}', '${details.id}', '${COMPONENT_NAME}', '${details.name}']`;
}

function keysFromResult(result: ReturnType<typeof spawnSync>): number[] {
  if (result.error || result.status !== 0) return [];
  return [...String(result.stdout).matchAll(/-?\d+/g)].map((match) => Number(match[0]));
}

function assignMainShortcut(actionId: string, keys: string): ReturnType<typeof spawnSync> {
  // ActiveShortcut (1) | DefaultShortcut (2) | NoAutoloading (4).
  return runGdbus("setShortcut", [actionId, keys, "7"]);
}

export function acceleratorToQtKey(accelerator: string): number | null {
  const parts = accelerator
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean);
  const keyName = parts.pop();
  if (!keyName) return null;

  let value = 0;
  for (const modifier of parts) {
    const qtModifier = QT_MODIFIERS[modifier.toLowerCase()];
    if (!qtModifier) return null;
    value |= qtModifier;
  }

  const normalizedKey = keyName.toLowerCase();
  let key = QT_KEYS[normalizedKey];
  const functionKey = /^f([1-9]|1[0-9]|2[0-4])$/i.exec(keyName);
  if (functionKey) {
    key = 0x01000030 + Number(functionKey[1]) - 1;
  } else if (key === undefined && keyName.length === 1 && /[a-z0-9]/i.test(keyName)) {
    key = keyName.toUpperCase().charCodeAt(0);
  }
  return key === undefined ? null : value | key;
}

function runGdbus(method: string, args: string[]): ReturnType<typeof spawnSync> {
  return spawnSync(
    "gdbus",
    [
      "call",
      "--session",
      "--dest",
      "org.kde.kglobalaccel",
      "--object-path",
      "/kglobalaccel",
      "--method",
      `org.kde.KGlobalAccel.${method}`,
      ...args,
    ],
    { encoding: "utf8", timeout: 2_000 },
  );
}

export function syncKdeShortcut(
  action: KdeShortcutAction,
  accelerator: string,
  enabled = true,
): KdeShortcutResult {
  const details = kdeShortcutActionDetails(action);
  const qtKey = enabled ? acceleratorToQtKey(accelerator) : 0;
  if (enabled && qtKey === null) {
    return { available: true, applied: false, error: "Raccourci non convertible pour KDE." };
  }

  const actionId = actionIdentifier(details);
  const keys = enabled ? `[${qtKey}]` : "[]";
  const legacyActionId = action === "main"
    ? actionIdentifier({ id: "_launch", name: "ChatGPT" })
    : undefined;
  const legacyKeys = legacyActionId ? keysFromResult(runGdbus("shortcut", [legacyActionId])) : [];
  let legacyMigrated = false;
  const restoreLegacy = (): void => {
    if (!legacyActionId || legacyKeys.length === 0) return;
    runGdbus("doRegister", [legacyActionId]);
    assignMainShortcut(legacyActionId, `[${legacyKeys.join(",")}]`);
  };
  if (legacyActionId && legacyKeys.length > 0) {
    const clearLegacyResult = assignMainShortcut(legacyActionId, "[]");
    if (clearLegacyResult.error || clearLegacyResult.status !== 0) {
      return {
        available: false,
        applied: false,
        actionId: details.id,
        error:
          clearLegacyResult.error?.message ||
          String(clearLegacyResult.stderr).trim() ||
          "Migration de l’ancienne action KGlobalAccel impossible.",
      };
    }
    legacyMigrated = true;
  }
  const registerResult = runGdbus("doRegister", [actionId]);
  if (registerResult.error || registerResult.status !== 0) {
    restoreLegacy();
    return {
      available: false,
      applied: false,
      actionId: details.id,
      error:
        registerResult.error?.message ||
        String(registerResult.stderr).trim() ||
        "Enregistrement de l’action KGlobalAccel impossible.",
    };
  }
  const setResult = action === "main"
    ? assignMainShortcut(actionId, keys)
    : runGdbus("setForeignShortcut", [actionId, keys]);
  if (setResult.error || setResult.status !== 0) {
    restoreLegacy();
    return {
      available: false,
      applied: false,
      actionId: details.id,
      error:
        setResult.error?.message || String(setResult.stderr).trim() || "KGlobalAccel indisponible.",
    };
  }

  const readResult = runGdbus("shortcut", [actionId]);
  if (readResult.error || readResult.status !== 0) {
    restoreLegacy();
    return {
      available: false,
      applied: false,
      actionId: details.id,
      error:
        readResult.error?.message || String(readResult.stderr).trim() || "Vérification KDE impossible.",
    };
  }
  const registeredKeys = keysFromResult(readResult);
  const activeApplied = enabled ? registeredKeys.includes(qtKey as number) : registeredKeys.length === 0;
  let defaultApplied: boolean | undefined;
  let defaultKeys: number[] = [];
  if (action === "main") {
    const defaultReadResult = runGdbus("defaultShortcut", [actionId]);
    if (defaultReadResult.error || defaultReadResult.status !== 0) {
      restoreLegacy();
      return {
        available: false,
        applied: false,
        actionId: details.id,
        error:
          defaultReadResult.error?.message ||
          String(defaultReadResult.stderr).trim() ||
          "Vérification du raccourci KDE par défaut impossible.",
      };
    }
    defaultKeys = keysFromResult(defaultReadResult);
    defaultApplied = enabled ? defaultKeys.includes(qtKey as number) : defaultKeys.length === 0;
  }
  const applied = activeApplied && defaultApplied !== false;
  if (!applied) restoreLegacy();
  if (applied && legacyMigrated && legacyActionId) runGdbus("unRegister", [legacyActionId]);
  return {
    available: true,
    applied,
    defaultApplied,
    actionId: details.id,
    legacyMigrated,
    ...(applied
      ? {}
      : {
          error:
            `KDE n’a pas appliqué le raccourci demandé ` +
            `(attendu=${enabled ? qtKey : "aucun"}, actif=${registeredKeys.join(",") || "aucun"}` +
            `${action === "main" ? `, défaut=${defaultKeys.join(",") || "aucun"}` : ""}).`,
        }),
  };
}
