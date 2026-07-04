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
  error?: string;
}

function actionDetails(action: KdeShortcutAction): { id: string; name: string } {
  return action === "main"
    ? { id: "_launch", name: "ChatGPT" }
    : { id: "Companion", name: "Ouvrir la Magic Bar" };
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
  const details = actionDetails(action);
  const qtKey = enabled ? acceleratorToQtKey(accelerator) : 0;
  if (enabled && qtKey === null) {
    return { available: true, applied: false, error: "Raccourci non convertible pour KDE." };
  }

  const actionId = `['${COMPONENT_ID}', '${details.id}', '${COMPONENT_NAME}', '${details.name}']`;
  const keys = enabled ? `[${qtKey}]` : "[]";
  const registerResult = runGdbus("doRegister", [actionId]);
  if (registerResult.error || registerResult.status !== 0) {
    return {
      available: false,
      applied: false,
      error:
        registerResult.error?.message ||
        String(registerResult.stderr).trim() ||
        "Enregistrement de l’action KGlobalAccel impossible.",
    };
  }
  const setResult = runGdbus("setForeignShortcut", [actionId, keys]);
  if (setResult.error || setResult.status !== 0) {
    return {
      available: false,
      applied: false,
      error:
        setResult.error?.message || String(setResult.stderr).trim() || "KGlobalAccel indisponible.",
    };
  }

  const readResult = runGdbus("shortcut", [actionId]);
  if (readResult.error || readResult.status !== 0) {
    return {
      available: false,
      applied: false,
      error:
        readResult.error?.message || String(readResult.stderr).trim() || "Vérification KDE impossible.",
    };
  }
  const registeredKeys = [...String(readResult.stdout).matchAll(/-?\d+/g)].map((match) =>
    Number(match[0]),
  );
  const applied = enabled ? registeredKeys.includes(qtKey as number) : registeredKeys.length === 0;
  return {
    available: true,
    applied,
    ...(applied
      ? {}
      : {
          error:
            `KDE n’a pas appliqué le raccourci demandé ` +
            `(attendu=${enabled ? qtKey : "aucun"}, retourné=${registeredKeys.join(",") || "aucun"}).`,
        }),
  };
}
