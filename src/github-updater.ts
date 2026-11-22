import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { t } from "./i18n";

const API = "https://api.github.com/repos/Calciiferr/chatgpt-desktop-linux";
export const RELEASES_PAGE = "https://github.com/Calciiferr/chatgpt-desktop-linux/releases/latest";
const MAX_PACKAGE_BYTES = 300 * 1024 * 1024;
export interface UpdateRelease { version: string; assetId: number; name: string; size: number; digest: string; pageUrl: string }

export function compareVersions(left: string, right: string): number {
  const parse = (value: string) => {
    const match = value.replace(/^v/, "").match(/^(\d+)\.(\d+)\.(\d+)(?:-([a-z]+)\.(\d+))?$/i);
    if (!match) throw new Error("Unrecognized version.");
    return { numbers: match.slice(1, 4).map(Number), label: match[4] || "", build: Number(match[5] || 0) };
  };
  const a = parse(left), b = parse(right);
  for (let i = 0; i < 3; i++) if (a.numbers[i] !== b.numbers[i]) return a.numbers[i] - b.numbers[i];
  if (!a.label || !b.label) return Number(!a.label) - Number(!b.label);
  if (a.label !== b.label) return a.label.localeCompare(b.label);
  return a.build - b.build;
}

export function latestCompatibleRelease(releases: unknown, current: string): UpdateRelease | null {
  if (!Array.isArray(releases)) throw new Error(t("updateInvalidResponse"));
  const candidates: UpdateRelease[] = [];
  for (const release of releases) {
    if (release.draft || (release.prerelease && !current.includes("-"))) continue;
    const version = String(release.tag_name || "").replace(/^v/, "");
    try { compareVersions(version, current); } catch { continue; }
    const name = `ChatGPT-Desktop-Linux-${version}-amd64.deb`;
    const asset = release.assets?.find((item: { name: string }) => item.name === name);
    if (!asset || !Number.isSafeInteger(asset.id) || asset.id <= 0 ||
      !Number.isSafeInteger(asset.size) || asset.size <= 0 || asset.size > MAX_PACKAGE_BYTES ||
      !/^sha256:[a-f0-9]{64}$/i.test(asset.digest || "")) continue;
    candidates.push({ version, assetId: asset.id, name, size: asset.size, digest: asset.digest.toLowerCase(),
      pageUrl: typeof release.html_url === "string" && release.html_url.startsWith("https://github.com/") ? release.html_url : RELEASES_PAGE });
  }
  return candidates.sort((a, b) => compareVersions(b.version, a.version))[0] || null;
}

export function selectUpdate(releases: unknown, current: string): UpdateRelease | null {
  const latest = latestCompatibleRelease(releases, current);
  return latest && compareVersions(latest.version, current) > 0 ? latest : null;
}
export function releaseComparison(latest: UpdateRelease | null, current: string) {
  const difference = latest ? compareVersions(current, latest.version) : 0;
  return { installed: current, latest: latest?.version ?? null, pageUrl: latest?.pageUrl ?? RELEASES_PAGE,
    state: !latest ? "unavailable" : difference > 0 ? "ahead" : difference === 0 ? "current" : "available" };
}

export function verifyDownload(size: number, digest: string, release: UpdateRelease): void {
  if (size !== release.size || digest !== release.digest) {
    throw new Error(t("updateChecksumMismatch"));
  }
}

export class GitHubUpdater {
  private pending: UpdateRelease | null = null;
  comparison: ReturnType<typeof releaseComparison> | null = null;
  private busy = false;
  private controller: AbortController | null = null;
  cancel(): void { this.controller?.abort(); }
  constructor(private directory: string) {}
  private async request(url: string, download = false): Promise<Response> {
    // The repository is public: release information and packages need no account.
    const response = await fetch(url, {
      headers: { Accept: download ? "application/octet-stream" : "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" },
      signal: this.controller ? AbortSignal.any([this.controller.signal, AbortSignal.timeout(download ? 180_000 : 20_000)]) : AbortSignal.timeout(20_000),
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) throw new Error(t("updateRateLimited"));
      throw new Error(t("updateServerUnavailable", { status: response.status }));
    }
    return response;
  }
  async check(current: string): Promise<UpdateRelease | null> {
    if (this.busy) throw new Error(t("updateBusy"));
    this.busy = true;
    this.pending = null;
    this.comparison = null;
    try {
      if (process.arch !== "x64") throw new Error(t("updateUnsupportedArch"));
      const response = await this.request(`${API}/releases?per_page=100`);
      const latest = latestCompatibleRelease(await response.json(), current);
      this.comparison = releaseComparison(latest, current);
      this.pending = latest && compareVersions(latest.version, current) > 0 ? latest : null;
      return this.pending;
    } finally { this.busy = false; }
  }
  async download(progress: (received: number, total: number, phase: "download" | "verify") => void = () => {}): Promise<string> {
    if (this.busy) throw new Error(t("updateBusy"));
    const release = this.pending;
    if (!release) throw new Error(t("updateCheckFirst"));
    this.busy = true;
    this.controller = new AbortController();
    let partial = "";
    progress(0, release.size, "download");
    try {
      const response = await this.request(`${API}/releases/assets/${release.assetId}`, true);
      fs.mkdirSync(this.directory, { recursive: true, mode: 0o700 });
      const target = path.join(this.directory, release.name);
      partial = target + ".partial";
      const descriptor = fs.openSync(partial, "w", 0o600);
      const hash = createHash("sha256");
      let received = 0;
      try {
        if (!response.body) throw new Error(t("updateEmptyDownload"));
        for await (const chunk of response.body as unknown as AsyncIterable<Uint8Array>) {
          received += chunk.length;
          if (received > release.size || received > MAX_PACKAGE_BYTES) throw new Error(t("updateChecksumMismatch"));
          hash.update(chunk);
          fs.writeFileSync(descriptor, chunk);
          progress(received, release.size, "download");
        }
      } finally { fs.closeSync(descriptor); }
      progress(received, release.size, "verify");
      verifyDownload(received, `sha256:${hash.digest("hex")}`, release);
      fs.renameSync(partial, target);
      return target;
    } finally {
      this.controller = null;
      if (partial) fs.rmSync(partial, { force: true });
      this.busy = false;
    }
  }
}
