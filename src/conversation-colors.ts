import fs from "node:fs";
import path from "node:path";
export function validConversationId(value: unknown): value is string {
  return typeof value === "string" && /^[a-z0-9-]{6,100}$/i.test(value);
}
export function validConversationColor(value: unknown): value is string {
  return typeof value === "string" && /^#[a-f0-9]{6}$/i.test(value);
}
export class ConversationColorStore {
  constructor(private file: string) {}
  load(): Record<string, string> {
    try {
      const input = JSON.parse(fs.readFileSync(this.file, "utf8"));
      if (!input || typeof input !== "object" || Array.isArray(input)) return {};
      return Object.fromEntries(Object.entries(input).filter((entry): entry is [string, string] => validConversationId(entry[0]) && validConversationColor(entry[1])).slice(0, 5000));
    } catch { return {}; }
  }
  set(id: unknown, color: unknown): Record<string, string> {
    if (!validConversationId(id) || (color !== null && !validConversationColor(color))) throw new Error("Couleur de conversation invalide.");
    const colors = this.load();
    if (color === null) delete colors[id];
    else {
      if (!(id in colors) && Object.keys(colors).length >= 5000) throw new Error("Limite de couleurs enregistrées atteinte.");
      colors[id] = color.toLowerCase();
    }
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file + ".tmp", JSON.stringify(colors, null, 2) + "\n", { mode: 0o600 });
    fs.renameSync(this.file + ".tmp", this.file);
    return colors;
  }
}
