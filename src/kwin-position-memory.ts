import { spawnSync } from "node:child_process";

const RULE_ID = "chatgpt-desktop-linux-position";
const CONFIG_FILE = "kwinrulesrc";
const RULE_KEYS = [
  "Description",
  "position",
  "positionrule",
  "title",
  "titlematch",
  "wmclass",
  "wmclassmatch",
];

export interface KWinPositionMemoryResult {
  available: boolean;
  enabled: boolean;
  changed: boolean;
  error?: string;
}

interface Position {
  x: number;
  y: number;
}

function kdeCommand(command: string, args: string[]): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    env: { ...process.env, QT_QPA_PLATFORM: "offscreen" },
  });

  if (result.error) {
    throw result.error;
  }
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `${command} a échoué avec le code ${result.status}.`);
  }
  return result.stdout.trim();
}

function readConfig(group: string, key: string, fallback = ""): string {
  return kdeCommand("kreadconfig6", [
    "--file",
    CONFIG_FILE,
    "--group",
    group,
    "--key",
    key,
    "--default",
    fallback,
  ]);
}

function writeConfig(group: string, key: string, value: string): void {
  kdeCommand("kwriteconfig6", [
    "--file",
    CONFIG_FILE,
    "--group",
    group,
    "--key",
    key,
    value,
  ]);
}

function deleteConfigKey(group: string, key: string): void {
  kdeCommand("kwriteconfig6", [
    "--file",
    CONFIG_FILE,
    "--group",
    group,
    "--key",
    key,
    "--delete",
    "",
  ]);
}

function configuredRuleIds(): string[] {
  return readConfig("General", "rules")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

function writeRuleIds(ruleIds: string[]): void {
  writeConfig("General", "rules", ruleIds.join(","));
  writeConfig("General", "count", String(ruleIds.length));
}

function reloadKWinRules(): void {
  kdeCommand("qdbus6", ["org.kde.KWin", "/KWin", "reconfigure"]);
}

export function syncKWinPositionMemory(
  enabled: boolean,
  initialPosition: Position,
): KWinPositionMemoryResult {
  if (process.platform !== "linux") {
    return { available: false, enabled: false, changed: false };
  }

  try {
    const ruleIds = configuredRuleIds();
    const wasEnabled = ruleIds.includes(RULE_ID);

    if (enabled) {
      if (!wasEnabled) {
        writeRuleIds([...ruleIds, RULE_ID]);
      }

      writeConfig(RULE_ID, "Description", "ChatGPT — mémoriser la position");
      writeConfig(RULE_ID, "wmclass", "chatgpt-desktop-linux");
      writeConfig(RULE_ID, "wmclassmatch", "1");
      writeConfig(RULE_ID, "title", "ChatGPT");
      writeConfig(RULE_ID, "titlematch", "1");
      writeConfig(RULE_ID, "positionrule", "4");

      if (readConfig(RULE_ID, "position", "missing") === "missing") {
        writeConfig(
          RULE_ID,
          "position",
          `${Math.round(initialPosition.x)},${Math.round(initialPosition.y)}`,
        );
      }
    } else if (wasEnabled) {
      writeRuleIds(ruleIds.filter((ruleId) => ruleId !== RULE_ID));
      for (const key of RULE_KEYS) {
        deleteConfigKey(RULE_ID, key);
      }
    }

    if (enabled !== wasEnabled) {
      reloadKWinRules();
    }

    return { available: true, enabled, changed: enabled !== wasEnabled };
  } catch (error) {
    return {
      available: false,
      enabled: false,
      changed: false,
      error: error instanceof Error ? error.message : "Intégration KWin indisponible.",
    };
  }
}
