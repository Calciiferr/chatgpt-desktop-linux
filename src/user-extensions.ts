import fs from "node:fs";
import path from "node:path";
import { inflateRawSync } from "node:zlib";

/**
 * Extensions added by the user. They are web extensions in the Chrome
 * Manifest V3 format, limited to content scripts on chatgpt.com: they can read
 * and change the ChatGPT page, never the application or the computer.
 */

export const MAX_ZIP_BYTES = 20 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 50 * 1024 * 1024;
const MAX_ENTRIES = 1_000;
const ALLOWED_PERMISSIONS = new Set(["storage"]);
const CHATGPT_MATCH = /^https:\/\/chatgpt\.com\/[^\s]*$/;
const FORBIDDEN_KEYS = ["background", "action", "browser_action", "page_action", "chrome_url_overrides", "devtools_page", "options_page", "options_ui", "externally_connectable"];

export interface UserExtensionInfo {
  id: string;
  name: string;
  version: string;
  description: string;
  author: string;
  enabled: boolean;
  /** Set when the extension cannot be loaded; it is then skipped. */
  error?: string;
}

export class ExtensionError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
  }
}

// ---------- Zip reading (stored and deflated entries only) ----------

export interface ZipEntry { name: string; data: Buffer }

export function readZip(buffer: Buffer): ZipEntry[] {
  if (buffer.length > MAX_ZIP_BYTES) throw new ExtensionError("tooLarge", "The .zip file is too large.");
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65_557); i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new ExtensionError("notZip", "This file is not a valid .zip archive.");
  const count = buffer.readUInt16LE(end + 10);
  let offset = buffer.readUInt32LE(end + 16);
  if (count > MAX_ENTRIES) throw new ExtensionError("tooLarge", "The .zip file contains too many files.");
  const entries: ZipEntry[] = [];
  let total = 0;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > buffer.length || buffer.readUInt32LE(offset) !== 0x02014b50) {
      throw new ExtensionError("notZip", "This file is not a valid .zip archive.");
    }
    const flags = buffer.readUInt16LE(offset + 8);
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const size = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString("utf8", offset + 46, offset + 46 + nameLength);
    offset += 46 + nameLength + extraLength + commentLength;
    if (name.endsWith("/")) continue;
    if (flags & 1) throw new ExtensionError("unsupportedZip", "Encrypted .zip files are not supported.");
    if (size === 0xffffffff || compressedSize === 0xffffffff) throw new ExtensionError("tooLarge", "The .zip file is too large.");
    total += size;
    if (total > MAX_UNPACKED_BYTES) throw new ExtensionError("tooLarge", "The extension is too large once unpacked.");
    if (localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
      throw new ExtensionError("notZip", "This file is not a valid .zip archive.");
    }
    const dataStart = localOffset + 30 + buffer.readUInt16LE(localOffset + 26) + buffer.readUInt16LE(localOffset + 28);
    const raw = buffer.subarray(dataStart, dataStart + compressedSize);
    let data: Buffer;
    if (method === 0) data = Buffer.from(raw);
    else if (method === 8) data = inflateRawSync(raw, { maxOutputLength: size + 1 });
    else throw new ExtensionError("unsupportedZip", "This .zip compression method is not supported.");
    if (data.length !== size) throw new ExtensionError("notZip", "This file is not a valid .zip archive.");
    entries.push({ name, data });
  }
  return entries;
}

/** Returns a safe relative path, or null for anything that could leave the extension folder. */
function safeRelativePath(name: string): string | null {
  if (name.includes("\\") || name.includes("\0") || name.startsWith("/")) return null;
  const parts = name.split("/").filter((part) => part !== "" && part !== ".");
  if (parts.length === 0 || parts.some((part) => part === "..")) return null;
  // Archive tools sometimes add these; they are never part of an extension.
  if (parts[0] === "__MACOSX") return "";
  return parts.join("/");
}

/** Keeps only the extension's own files, whether they are at the root or in one top-level folder. */
export function extensionFiles(entries: readonly ZipEntry[]): Map<string, Buffer> {
  const files = new Map<string, Buffer>();
  for (const entry of entries) {
    const relative = safeRelativePath(entry.name);
    if (relative === null) throw new ExtensionError("unsafeZip", "The .zip file contains unsafe paths.");
    if (relative) files.set(relative, entry.data);
  }
  if (!files.has("manifest.json")) {
    const roots = new Set([...files.keys()].map((file) => file.split("/")[0]));
    const [root] = roots;
    if (roots.size === 1 && files.has(`${root}/manifest.json`)) {
      return new Map([...files].map(([file, data]) => [file.slice(root.length + 1), data]));
    }
    throw new ExtensionError("noManifest", "The .zip file has no manifest.json.");
  }
  return files;
}

// ---------- Manifest rules ----------

export interface ExtensionManifest {
  name: string;
  version: string;
  description: string;
  author: string;
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Checks that the manifest only describes what custom extensions are allowed to do. */
export function validateManifest(manifest: unknown, hasFile: (file: string) => boolean): ExtensionManifest {
  if (typeof manifest !== "object" || manifest === null) throw new ExtensionError("badManifest", "manifest.json is not valid JSON.");
  const value = manifest as Record<string, unknown>;
  if (value.manifest_version !== 3) throw new ExtensionError("badManifest", "manifest_version must be 3.");
  const name = text(value.name);
  const version = text(value.version);
  if (!name || name.length > 60) throw new ExtensionError("badManifest", "The extension needs a name (60 characters at most).");
  if (!/^\d+(\.\d+){0,3}$/.test(version)) throw new ExtensionError("badManifest", "The version must look like 1.0 or 1.2.3.");
  for (const key of FORBIDDEN_KEYS) {
    if (key in value) throw new ExtensionError("notAllowed", `"${key}" is not allowed: extensions can only change the ChatGPT page.`);
  }
  const permissions = Array.isArray(value.permissions) ? value.permissions : value.permissions === undefined ? [] : null;
  if (!permissions || permissions.some((permission) => !ALLOWED_PERMISSIONS.has(permission as string))) {
    throw new ExtensionError("notAllowed", "Only the \"storage\" permission is allowed.");
  }
  const hosts = Array.isArray(value.host_permissions) ? value.host_permissions : value.host_permissions === undefined ? [] : null;
  if (!hosts || hosts.some((host) => typeof host !== "string" || !CHATGPT_MATCH.test(host))) {
    throw new ExtensionError("notAllowed", "Extensions can only run on https://chatgpt.com/.");
  }
  const scripts = value.content_scripts;
  if (!Array.isArray(scripts) || scripts.length === 0) {
    throw new ExtensionError("badManifest", "The extension needs at least one entry in content_scripts.");
  }
  for (const script of scripts) {
    const entry = (typeof script === "object" && script !== null ? script : {}) as Record<string, unknown>;
    const matches = entry.matches;
    if (!Array.isArray(matches) || matches.length === 0 || matches.some((match) => typeof match !== "string" || !CHATGPT_MATCH.test(match))) {
      throw new ExtensionError("notAllowed", "Extensions can only run on https://chatgpt.com/.");
    }
    const files = [...(Array.isArray(entry.js) ? entry.js : []), ...(Array.isArray(entry.css) ? entry.css : [])];
    if (files.length === 0) throw new ExtensionError("badManifest", "Each content script needs js or css files.");
    for (const file of files) {
      if (typeof file !== "string" || safeRelativePath(file) === null || !hasFile(safeRelativePath(file) as string)) {
        throw new ExtensionError("badManifest", `The file "${String(file)}" listed in manifest.json is missing.`);
      }
    }
  }
  const author = typeof value.author === "string" ? value.author : text((value.author as Record<string, unknown> | undefined)?.email);
  return { name, version, description: text(value.description).slice(0, 300), author: author.trim().slice(0, 80) };
}

export function extensionIdFromName(name: string): string {
  const id = name.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50);
  return id || "extension";
}

// ---------- Folder management ----------

export class UserExtensions {
  constructor(public readonly directory: string) {}

  private readFolder(id: string): ExtensionManifest {
    const folder = path.join(this.directory, id);
    let manifest: unknown;
    try {
      manifest = JSON.parse(fs.readFileSync(path.join(folder, "manifest.json"), "utf8"));
    } catch {
      throw new ExtensionError("badManifest", "manifest.json is missing or is not valid JSON.");
    }
    return validateManifest(manifest, (file) => fs.existsSync(path.join(folder, file)));
  }

  list(disabled: readonly string[]): UserExtensionInfo[] {
    let ids: string[] = [];
    try {
      ids = fs.readdirSync(this.directory, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
    } catch {
      return [];
    }
    return ids.sort().map((id) => {
      try {
        return { id, ...this.readFolder(id), enabled: !disabled.includes(id) };
      } catch (error) {
        return { id, name: id, version: "", description: "", author: "", enabled: false, error: error instanceof Error ? error.message : String(error) };
      }
    });
  }

  folder(id: string): string {
    if (!/^[a-z0-9][a-z0-9-]*$/.test(id)) throw new ExtensionError("badId", "Invalid extension.");
    return path.join(this.directory, id);
  }

  /** Reads and checks a .zip without installing it. */
  inspect(zipPath: string): { manifest: ExtensionManifest; id: string; files: Map<string, Buffer>; exists: boolean } {
    if (fs.statSync(zipPath).size > MAX_ZIP_BYTES) throw new ExtensionError("tooLarge", "The .zip file is too large.");
    const files = extensionFiles(readZip(fs.readFileSync(zipPath)));
    let manifest: unknown;
    try {
      manifest = JSON.parse(files.get("manifest.json")?.toString("utf8") ?? "");
    } catch {
      throw new ExtensionError("badManifest", "manifest.json is not valid JSON.");
    }
    const checked = validateManifest(manifest, (file) => files.has(file));
    const id = extensionIdFromName(checked.name);
    return { manifest: checked, id, files, exists: fs.existsSync(path.join(this.directory, id)) };
  }

  /** Installs (or replaces) an extension from a checked .zip. */
  install(inspected: { id: string; files: Map<string, Buffer> }): void {
    const target = this.folder(inspected.id);
    const staging = `${target}.installing`;
    fs.rmSync(staging, { recursive: true, force: true });
    for (const [file, data] of inspected.files) {
      const destination = path.join(staging, file);
      if (!destination.startsWith(staging + path.sep)) throw new ExtensionError("unsafeZip", "The .zip file contains unsafe paths.");
      fs.mkdirSync(path.dirname(destination), { recursive: true });
      fs.writeFileSync(destination, data);
    }
    fs.rmSync(target, { recursive: true, force: true });
    fs.renameSync(staging, target);
  }

  remove(id: string): void {
    fs.rmSync(this.folder(id), { recursive: true, force: true });
  }
}
