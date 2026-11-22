import { fileURLToPath } from "node:url";

export function parseClipboardFileUris(uriList: string, limit = 50): string[] {
  const paths: string[] = [];
  for (const rawLine of uriList.replace(/\0/g, "\n").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line === "copy" || line === "cut") continue;
    try {
      const url = new URL(line);
      if (url.protocol !== "file:") continue;
      const filePath = fileURLToPath(url);
      if (!paths.includes(filePath)) paths.push(filePath);
    } catch {
      // Only valid local file URIs are accepted.
    }
    if (paths.length >= limit) break;
  }
  return paths;
}
