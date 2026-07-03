import fs from "node:fs";
import path from "node:path";
import util from "node:util";

const MAX_LOG_SIZE = 512 * 1024;
let logFilePath: string | null = null;

function formatValue(value: unknown): string {
  if (value instanceof Error) {
    return value.stack ?? value.message;
  }
  return typeof value === "string" ? value : util.inspect(value, { depth: 4, breakLength: 120 });
}

function write(level: "INFO" | "WARN" | "ERROR", values: unknown[]): void {
  const line = `${new Date().toISOString()} ${level} ${values.map(formatValue).join(" ")}\n`;

  if (level === "ERROR") {
    console.error(...values);
  } else if (level === "WARN") {
    console.warn(...values);
  } else {
    console.info(...values);
  }

  if (!logFilePath) {
    return;
  }

  try {
    fs.appendFileSync(logFilePath, line, { encoding: "utf8", mode: 0o600 });
  } catch {
    // La journalisation ne doit jamais empêcher l’application de fonctionner.
  }
}

export function initializeLogger(filePath: string): void {
  logFilePath = filePath;
  try {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    if (fs.existsSync(filePath) && fs.statSync(filePath).size > MAX_LOG_SIZE) {
      fs.renameSync(filePath, `${filePath}.old`);
    }
    fs.appendFileSync(filePath, "", { encoding: "utf8", mode: 0o600 });
  } catch {
    logFilePath = null;
  }
}

export const log = {
  info: (...values: unknown[]): void => write("INFO", values),
  warn: (...values: unknown[]): void => write("WARN", values),
  error: (...values: unknown[]): void => write("ERROR", values),
};
