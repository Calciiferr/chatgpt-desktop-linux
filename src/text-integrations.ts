import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { log } from "./logger";

type Language = "fr" | "en" | "es";

const SEND_TO_CHATGPT: Record<Language, string> = {
  en: "Send to ChatGPT",
  fr: "Envoyer à ChatGPT",
  es: "Enviar a ChatGPT",
};

export function kateToolPath(home = os.homedir()): string {
  return path.join(home, ".config", "kate", "externaltools", "chatgpt");
}

export function dolphinServiceMenuPath(home = os.homedir()): string {
  return path.join(home, ".local", "share", "kio", "servicemenus", "chatgpt-desktop-linux-servicemenu.desktop");
}

function quoteDesktopExec(value: string): string {
  return /[\s"'\\$`]/.test(value) ? `"${value.replace(/([\\"`$])/g, "\\$1")}"` : value;
}

export function kateToolContent(executablePath: string, language: Language): string {
  return [
    "[General]",
    "actionName=externaltool_AskChatGPT",
    'arguments=--source "Kate / KWrite" --companion-stdin',
    "category=ChatGPT",
    "cmdname=ask-chatgpt",
    `executable=${executablePath}`,
    "icon=chatgpt-desktop-linux",
    "input=%{Document:Selection:Text}",
    `name=${SEND_TO_CHATGPT[language]}`,
    "output=Ignore",
    "reload=false",
    "save=None",
    "trigger=None",
    "",
  ].join("\n");
}

export function dolphinServiceMenuContent(executablePath: string): string {
  return [
    "[Desktop Entry]",
    "Type=Service",
    "MimeType=all/allfiles;",
    "Actions=AskChatGPT;",
    "X-KDE-ServiceTypes=KonqPopupMenu/Plugin",
    "",
    "[Desktop Action AskChatGPT]",
    `Name=${SEND_TO_CHATGPT.en}`,
    `Name[fr]=${SEND_TO_CHATGPT.fr}`,
    `Name[es]=${SEND_TO_CHATGPT.es}`,
    "Icon=chatgpt-desktop-linux",
    `Exec=${quoteDesktopExec(executablePath)} --source Dolphin --attach %F`,
    "",
  ].join("\n");
}

function writeOrRemove(filePath: string, content: string | null, mode: number): void {
  if (content === null) {
    fs.rmSync(filePath, { force: true });
    return;
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, { encoding: "utf8", mode });
  // KDE only runs service menus from the user's folder when they are executable.
  fs.chmodSync(filePath, mode);
}

/**
 * Installs or removes the Kate/KWrite external tool and the Dolphin context
 * menu entry. Both open the Magic Bar, so they only exist while it is enabled.
 */
export function syncMagicBarIntegrations(
  executablePath: string | null,
  enabled: boolean,
  language: Language,
  home = os.homedir(),
): void {
  // Development builds leave the integrations of the installed application alone.
  if (executablePath === null) return;
  const active = enabled;
  try {
    const kateInstalled = fs.existsSync("/usr/bin/kate") || fs.existsSync("/usr/bin/kwrite");
    writeOrRemove(kateToolPath(home), active && kateInstalled ? kateToolContent(executablePath, language) : null, 0o600);
    writeOrRemove(dolphinServiceMenuPath(home), active ? dolphinServiceMenuContent(executablePath) : null, 0o755);
    log.info(active ? "[integration] Dolphin and Kate integrations installed." : "[integration] Dolphin and Kate integrations removed.");
  } catch (error) {
    log.warn("[integration] Unable to update the Dolphin and Kate integrations:", error);
  }
}
