import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { log } from "./logger";

export function syncKateTextIntegration(executablePath: string): void {
  if (process.platform !== "linux" || !fs.existsSync("/usr/bin/kate")) {
    return;
  }

  const toolsDirectory = path.join(os.homedir(), ".config", "kate", "externaltools");
  const filePath = path.join(toolsDirectory, "chatgpt");
  const content = [
    "[General]",
    "actionName=externaltool_AskChatGPT",
    'arguments=--source "Kate / KWrite" --companion-stdin',
    "category=ChatGPT",
    "cmdname=ask-chatgpt",
    `executable=${executablePath}`,
    "icon=chatgpt-desktop-linux",
    "input=%{Document:Selection:Text}",
    "name=Envoyer à ChatGPT",
    "output=Ignore",
    "reload=false",
    "save=None",
    "trigger=None",
    "",
  ].join("\n");

  try {
    fs.mkdirSync(toolsDirectory, { recursive: true });
    fs.writeFileSync(filePath, content, { encoding: "utf8", mode: 0o600 });
    log.info("[integration] Outil de sélection Kate/KWrite synchronisé.");
  } catch (error) {
    log.warn("[integration] Impossible de configurer Kate/KWrite :", error);
  }
}
