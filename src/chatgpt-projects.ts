import type { WebContents } from "electron";

/**
 * All DOM-dependent ChatGPT Projects integration lives in this file.
 *
 * The selectors below are intentionally narrow, bilingual and bounded. ChatGPT's
 * DOM is not a public API: callers must surface failures without deleting the
 * existing cache. No function in this module sends a chat message.
 */

export type ChatGptProjectSource = "scan" | "current" | "manual" | "created";
export type ProjectSyncState = "never" | "ok" | "partial" | "error";

export interface ChatGptProject {
  id: string;
  name: string;
  url: string;
  lastSyncedAt: string;
  source: ChatGptProjectSource;
  projectId?: string;
  lastKnownSlug?: string;
  locallyRenamed?: boolean;
  remoteName?: string;
  sidebarOrder?: number;
  orderSyncedAt?: string;
}

export interface ProjectScanFailure {
  name: string;
  error: string;
  initialIndex: number;
  occurrence: number;
  durationMs: number;
}

export type ProjectScanPhase = "loading" | "discovering" | "scanning" | "saving" | "complete";

export interface ProjectScanProgress {
  scanId: string;
  phase: ProjectScanPhase;
  completed: number;
  total: number;
  successes: number;
  failures: number;
  percent: number;
  etaMs?: number;
  currentProjectName?: string;
}

export interface ProjectRowDescriptor {
  name: string;
  occurrence: number;
  initialIndex: number;
  duplicateCount: number;
}

export interface ProjectScanResult {
  status: Exclude<ProjectSyncState, "never">;
  projects: ChatGptProject[];
  failures: ProjectScanFailure[];
  discovered: number;
  showMoreClicks: number;
  duplicatesSkipped: number;
  durationsMs: number[];
  sidebarNames: string[];
  sidebarComplete: boolean;
  message: string;
}

export interface ProjectScanOptions {
  maxShowMoreClicks?: number;
  maxProjects?: number;
  navigationTimeoutMs?: number;
  scanId?: string;
  onProgress?: (progress: ProjectScanProgress) => void;
  signal?: AbortSignal;
}

const CHATGPT_ORIGIN = "https://chatgpt.com";
const PROJECT_PATH_PATTERN = /^\/g\/(g-p-[a-z0-9]+(?:-[a-z0-9-]+)?)\/project\/?$/i;
const SOURCE_VALUES = new Set<ChatGptProjectSource>(["scan", "current", "manual", "created"]);
export const CHATGPT_PROJECTS_DOM_AUTOMATION_ENABLED =
  process.env.CHATGPT_PROJECTS_DOM_AUTOMATION !== "0";

// Keep the active-sidebar heuristic in one place. ChatGPT can keep several
// responsive sidebar trees mounted at once; querying the first matching
// section produced repeated rows and wrong ordering for same-name projects.
const ACTIVE_PROJECT_SCOPE_HELPERS = String.raw`
  const isRendered = (element) => {
    if (!(element instanceof HTMLElement)) return false;
    if (element.closest('[aria-hidden="true"], [inert]')) return false;
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    return style.display !== 'none' && style.visibility !== 'hidden' &&
      Number(style.opacity || 1) !== 0 && rect.width > 1 && rect.height > 1;
  };
  const intersectsViewport = (element) => {
    if (!isRendered(element)) return false;
    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
  };
  const exactProjectText = (element) =>
    ['Projets', 'Projects'].includes((element?.textContent || '').replace(/\s+/g, ' ').trim());
  const projectHomeLabels = ['ouvrir l’accueil du projet', 'open project home', 'open project homepage'];
  const isProjectHomeButton = (button) =>
    button instanceof HTMLButtonElement && projectHomeLabels.includes(
      (button.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim().toLowerCase()
    );
  const projectRowForButton = (button, section) => {
    if (!(button instanceof HTMLElement)) return null;
    if (button.matches('[class*="project-unfurl-row"]')) return button;
    const row = button.closest('[class*="project-unfurl-row"]');
    return row && (!section || section.contains(row)) ? row : button;
  };
  const projectNameForEntry = (button, row) => {
    const container = row instanceof HTMLElement ? row : button;
    const labelledButtons = [
      ...(container?.matches?.('button[aria-label]') ? [container] : []),
      ...(container ? [...container.querySelectorAll('button[aria-label]')] : []),
    ];
    const option = labelledButtons
      .map((button) => button.getAttribute('aria-label') || '')
      .find((label) => /^(Ouvrir les options du projet pour|Open options for project)\s+/i.test(label));
    if (option) {
      return option.replace(/^(Ouvrir les options du projet pour|Open options for project)\s+/i, '').trim();
    }
    return (container?.innerText || container?.textContent || button?.innerText || button?.textContent || '')
      .split('\n').map((part) => part.trim()).find(Boolean) || '';
  };
  const projectEntriesFor = (section) => {
    if (!section) return [];
    const candidates = [
      ...(section.matches?.('button[aria-label]') ? [section] : []),
      ...section.querySelectorAll('button[aria-label]'),
    ];
    const homeButtons = [...new Set(candidates.filter(isProjectHomeButton).filter(isRendered))];
    return homeButtons.map((button, initialIndex) => {
      const row = projectRowForButton(button, section);
      return { button, row, name: projectNameForEntry(button, row), initialIndex };
    }).filter((entry) => entry.name);
  };
  const findActiveSidebar = () => {
    const markers = ['nouveau chat', 'new chat', 'bibliothèque', 'library', 'planification', 'scheduling', 'applications'];
    const candidates = [...document.querySelectorAll('nav, aside, [class*="sidebar"]')]
      .filter(intersectsViewport)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const text = (element.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
        const label = (element.getAttribute('aria-label') || '').toLowerCase();
        const markerCount = markers.filter((marker) => text.includes(marker)).length;
        const projectHeader = [...element.querySelectorAll('[class*="sidebar-expando-section-header"], button')]
          .some(exactProjectText);
        let score = markerCount * 30 + (projectHeader ? 80 : 0);
        if (/historique de chat|chat history|sidebar|barre latérale/.test(label)) score += 60;
        if (rect.left < Math.max(120, innerWidth * 0.25)) score += 35;
        if (rect.width >= 170 && rect.width <= Math.max(520, innerWidth * 0.55)) score += 30;
        if (rect.height >= innerHeight * 0.45) score += 35;
        // Prefer the outer active container instead of a small nested sidebar-* node.
        score += Math.min(25, Math.round(rect.height / Math.max(1, innerHeight) * 25));
        return { element, score, area: rect.width * rect.height };
      })
      .filter((candidate) => candidate.score >= 60)
      .sort((left, right) => right.score - left.score || right.area - left.area);
    return candidates[0]?.element || null;
  };
  const findProjectsSection = () => {
    const sidebar = findActiveSidebar();
    const root = sidebar || document;
    const headers = [...root.querySelectorAll('[class*="sidebar-expando-section-header"]')]
      .filter(isRendered)
      .filter((header) => [...header.querySelectorAll('button, span, div')].some(exactProjectText));
    const matches = [...new Set(headers
      .map((header) => header.parentElement?.closest('[class*="sidebar-expando-section"]'))
      .filter((section) => section && isRendered(section)))];
    if (matches.length === 0) return null;
    return matches.sort((left, right) => {
      const leftHeader = left.querySelector('[class*="sidebar-expando-section-header"]');
      const rightHeader = right.querySelector('[class*="sidebar-expando-section-header"]');
      const viewportDifference = Number(intersectsViewport(rightHeader)) - Number(intersectsViewport(leftHeader));
      if (viewportDifference !== 0) return viewportDifference;
      return projectEntriesFor(right).length - projectEntriesFor(left).length;
    })[0];
  };
  const findShowMoreButton = (section) => {
    if (!section) return null;
    const sidebar = findActiveSidebar();
    const root = sidebar || section;
    const labels = ['Afficher plus', 'Show more'];
    const candidates = [...root.querySelectorAll('button')].filter((button) =>
      isRendered(button) && labels.includes((button.textContent || '').replace(/\s+/g, ' ').trim())
    );
    return candidates.find((button) => section.contains(button)) || candidates[0] || null;
  };
`;

function cleanName(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 120);
}

export function normalizeProjectUrl(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw.startsWith("/") ? raw : raw, CHATGPT_ORIGIN);
    if (url.origin !== CHATGPT_ORIGIN || !PROJECT_PATH_PATTERN.test(url.pathname)) {
      return null;
    }
    url.search = "";
    url.hash = "";
    url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString();
  } catch {
    return null;
  }
}

export function projectUrlParts(urlValue: string): { projectId: string; slug: string } | null {
  const normalized = normalizeProjectUrl(urlValue);
  if (!normalized) return null;
  const segment = new URL(normalized).pathname.split("/")[2];
  const projectId = segment.match(/^(g-p-[a-z0-9]+)/i)?.[1];
  return projectId ? { projectId, slug: segment } : null;
}

export function projectNameFromUrl(urlValue: string): string {
  const parts = projectUrlParts(urlValue);
  if (!parts) return "Projet ChatGPT";
  const suffix = parts.slug.slice(parts.projectId.length).replace(/^-/, "");
  if (!suffix) return "Projet ChatGPT";
  return suffix
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function createProjectRecord(
  nameValue: string,
  urlValue: string,
  source: ChatGptProjectSource,
  at = new Date().toISOString(),
): ChatGptProject {
  const url = normalizeProjectUrl(urlValue);
  if (!url) throw new Error("L’URL ne correspond pas à une page de projet ChatGPT.");
  const parts = projectUrlParts(url)!;
  const name = cleanName(nameValue) || projectNameFromUrl(url);
  return {
    id: `chatgpt-project:${parts.projectId}`,
    name,
    url,
    lastSyncedAt: at,
    source,
    projectId: parts.projectId,
    lastKnownSlug: parts.slug,
    remoteName: name,
  };
}

export function normalizeStoredProjects(value: unknown): ChatGptProject[] {
  if (!Array.isArray(value)) return [];
  const projects: ChatGptProject[] = [];
  for (const candidate of value.slice(0, 200)) {
    if (typeof candidate !== "object" || candidate === null) continue;
    const record = candidate as Record<string, unknown>;
    const source = SOURCE_VALUES.has(record.source as ChatGptProjectSource)
      ? (record.source as ChatGptProjectSource)
      : "manual";
    if (typeof record.url !== "string") continue;
    try {
      const project = createProjectRecord(
        typeof record.name === "string" ? record.name : "",
        record.url,
        source,
        typeof record.lastSyncedAt === "string" && !Number.isNaN(Date.parse(record.lastSyncedAt))
          ? record.lastSyncedAt
          : new Date().toISOString(),
      );
      if (record.locallyRenamed === true) project.locallyRenamed = true;
      if (typeof record.remoteName === "string" && cleanName(record.remoteName)) {
        project.remoteName = cleanName(record.remoteName);
      }
      if (typeof record.sidebarOrder === "number" && Number.isInteger(record.sidebarOrder) && record.sidebarOrder >= 0) {
        project.sidebarOrder = record.sidebarOrder;
      } else {
        project.sidebarOrder = projects.length;
      }
      if (typeof record.orderSyncedAt === "string" && !Number.isNaN(Date.parse(record.orderSyncedAt))) {
        project.orderSyncedAt = record.orderSyncedAt;
      }
      projects.push(project);
    } catch {
      // Invalid legacy/cache entries are deliberately discarded.
    }
  }
  return mergeProjects([], projects);
}

export function mergeProjects(
  existing: readonly ChatGptProject[],
  incoming: readonly ChatGptProject[],
): ChatGptProject[] {
  const existingOrder = new Map(existing.map((project, index) => [project.id, index]));
  const merged = new Map(existing.map((project, index) => [project.id, {
    ...project,
    sidebarOrder: project.sidebarOrder ?? index,
    remoteName: project.remoteName ?? project.name,
  }]));
  const incomingSeen = new Set<string>();
  for (const next of incoming) {
    const previous = merged.get(next.id);
    const nextOrder =
      typeof next.sidebarOrder === "number"
        ? incomingSeen.has(next.id) && previous?.sidebarOrder !== undefined
          ? Math.min(previous.sidebarOrder, next.sidebarOrder)
          : next.sidebarOrder
        : (previous?.sidebarOrder ?? merged.size);
    merged.set(next.id, {
      ...previous,
      ...next,
      name: previous?.locallyRenamed ? previous.name : next.name,
      remoteName: next.remoteName ?? next.name ?? previous?.remoteName,
      sidebarOrder: nextOrder,
      locallyRenamed: previous?.locallyRenamed || next.locallyRenamed || undefined,
    });
    incomingSeen.add(next.id);
  }
  const incomingOrders = incoming
    .map((project) => project.sidebarOrder)
    .filter((value): value is number => typeof value === "number");
  if (incomingOrders.length > 0) {
    const appendFrom = Math.max(...incomingOrders) + 1;
    const unseen = [...merged.values()]
      .filter((project) => !incomingSeen.has(project.id))
      .sort(
        (left, right) =>
          (existingOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
          (existingOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER),
      );
    unseen.forEach((project, index) => {
      project.sidebarOrder = appendFrom + index;
    });
  }
  return [...merged.values()].sort((left, right) => {
    const leftOrder = left.sidebarOrder ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = right.sidebarOrder ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return (existingOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
      (existingOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER);
  });
}

export function reconcileProjectsFromSidebar(
  existing: readonly ChatGptProject[],
  resolved: readonly ChatGptProject[],
  sidebarNames: readonly string[],
  at = new Date().toISOString(),
  removeMissing = false,
): ChatGptProject[] {
  const resolvedIds = new Set(resolved.map((project) => project.id));
  const existingByResolvedId = existing.filter((project) => resolvedIds.has(project.id));
  const resolvedMerged = mergeProjects(existingByResolvedId, resolved);
  const unresolved = existing.filter((project) => !resolvedIds.has(project.id));
  const combined = [...resolvedMerged, ...unresolved];
  const keyFor = (project: ChatGptProject): string =>
    cleanName(project.remoteName ?? project.name).toLocaleLowerCase();
  const sidebarKeys = sidebarNames.map((name) => cleanName(name).toLocaleLowerCase());
  const remoteCounts = new Map<string, number>();
  const firstRemoteIndex = new Map<string, number>();
  sidebarKeys.forEach((key, index) => {
    remoteCounts.set(key, (remoteCounts.get(key) ?? 0) + 1);
    if (!firstRemoteIndex.has(key)) firstRemoteIndex.set(key, index);
  });
  const localCounts = new Map<string, number>();
  combined.forEach((project) => {
    const key = keyFor(project);
    localCounts.set(key, (localCounts.get(key) ?? 0) + 1);
  });

  const retained = combined.filter((project) => {
    if (!removeMissing) return true;
    if (resolvedIds.has(project.id)) return true;
    const key = keyFor(project);
    // A complete name snapshot can safely remove a unique missing project or
    // an entirely missing name group. A reduced duplicate count is ambiguous.
    return (remoteCounts.get(key) ?? 0) > 0;
  });
  const previousOrder = new Map(existing.map((project, index) => [
    project.id,
    project.sidebarOrder ?? index,
  ]));
  const resolvedOrder = new Map(resolved.map((project, index) => [
    project.id,
    project.sidebarOrder ?? index,
  ]));
  retained.sort((left, right) => {
    const rankFor = (project: ChatGptProject): number => {
      const exact = resolvedOrder.get(project.id);
      if (exact !== undefined) return exact;
      const key = keyFor(project);
      if ((localCounts.get(key) ?? 0) === 1 && (remoteCounts.get(key) ?? 0) === 1) {
        return firstRemoteIndex.get(key) ?? Number.MAX_SAFE_INTEGER;
      }
      return previousOrder.get(project.id) ?? Number.MAX_SAFE_INTEGER;
    };
    return rankFor(left) - rankFor(right) ||
      (previousOrder.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (previousOrder.get(right.id) ?? Number.MAX_SAFE_INTEGER);
  });
  return retained.map((project, index) => ({
    ...project,
    sidebarOrder: index,
    orderSyncedAt: at,
  }));
}

export function reorderProjectsFromSidebar(
  projects: readonly ChatGptProject[],
  names: readonly string[],
  at = new Date().toISOString(),
): ChatGptProject[] {
  const queues = new Map<string, ChatGptProject[]>();
  for (const project of projects) {
    const key = cleanName(project.remoteName ?? project.name).toLocaleLowerCase();
    const queue = queues.get(key) ?? [];
    queue.push(project);
    queues.set(key, queue);
  }
  const orderedIds: string[] = [];
  for (const name of names) {
    const queue = queues.get(cleanName(name).toLocaleLowerCase());
    const project = queue?.shift();
    if (project && !orderedIds.includes(project.id)) orderedIds.push(project.id);
  }
  for (const project of projects) {
    if (!orderedIds.includes(project.id)) orderedIds.push(project.id);
  }
  const order = new Map(orderedIds.map((id, index) => [id, index]));
  return projects
    .map((project) => ({ ...project, sidebarOrder: order.get(project.id), orderSyncedAt: at }))
    .sort((left, right) => (left.sidebarOrder ?? 0) - (right.sidebarOrder ?? 0));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function throwIfProjectScanAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new Error("La synchronisation des projets a été interrompue.");
  }
}

async function waitForProjectUrl(
  webContents: WebContents,
  timeoutMs: number,
  previousUrl?: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const deadline = Date.now() + timeoutMs;
  const previous = previousUrl ? normalizeProjectUrl(previousUrl) : null;
  while (Date.now() < deadline) {
    throwIfProjectScanAborted(signal);
    const url = normalizeProjectUrl(webContents.getURL());
    if (url && (!previous || url !== previous)) return url;
    await delay(200);
  }
  return null;
}

interface SidebarProbe {
  open: boolean;
  clicked?: boolean;
}

async function probeSidebar(webContents: WebContents, clickToggle: boolean): Promise<SidebarProbe> {
  return (await webContents.executeJavaScript(String.raw`(() => {
    const shouldClick = ${clickToggle};
    const visible = (element) => {
      if (!(element instanceof HTMLElement)) return false;
      if (element.closest('[aria-hidden="true"], [inert]')) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden' &&
        Number(style.opacity || 1) !== 0 && rect.width > 1 && rect.height > 1 &&
        rect.bottom > 0 && rect.right > 0 && rect.top < innerHeight && rect.left < innerWidth;
    };
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const markers = ['nouveau chat', 'new chat', 'bibliothèque', 'library', 'planification', 'scheduling', 'applications'];
    const candidates = [...document.querySelectorAll('nav, aside, [class*="sidebar"]')].filter(visible);
    const open = candidates.some((candidate) => {
      const rect = candidate.getBoundingClientRect();
      const label = normalize(candidate.getAttribute('aria-label'));
      const text = normalize(candidate.textContent);
      const knownNav = /historique de chat|chat history|sidebar|barre latérale/.test(label);
      const markerCount = markers.filter((marker) => text.includes(marker)).length;
      const containsProjects = /(^|\s)(projets|projects)(\s|$)/.test(text);
      return rect.left < Math.max(80, innerWidth * 0.22) && rect.width >= 170 &&
        rect.width <= Math.max(520, innerWidth * 0.55) && rect.height >= innerHeight * 0.45 &&
        (knownNav || markerCount >= 2 || containsProjects);
    });
    if (open || !shouldClick) return { open };

    const scored = [...document.querySelectorAll('button')].filter(visible).map((button) => {
      const rect = button.getBoundingClientRect();
      const aria = normalize(button.getAttribute('aria-label'));
      const title = normalize(button.getAttribute('title'));
      const text = normalize(button.textContent);
      const hint = aria + ' ' + title;
      let score = 0;
      if (/sidebar|side bar|barre latérale/.test(hint)) score += 90;
      if (/ouvrir|open|afficher|show|menu|navigation/.test(hint)) score += 24;
      if (button.matches('[data-testid*="sidebar"], [data-testid*="menu"]')) score += 70;
      if (rect.left >= 0 && rect.left < 120 && rect.top >= 0 && rect.top < 120) score += 25;
      if (button.querySelector('svg')) score += 12;
      if (text.length <= 2) score += 8;
      if (/nouveau chat|new chat|recherche|search|fermer|close|retour|back|paramètres|settings/.test(hint + ' ' + text)) score -= 160;
      return { button, score, left: rect.left, top: rect.top };
    }).sort((left, right) => right.score - left.score || left.top - right.top || left.left - right.left);
    const toggle = scored[0];
    if (!toggle || toggle.score < 35) return { open: false, clicked: false };
    toggle.button.click();
    return { open: false, clicked: true };
  })()`, true)) as SidebarProbe;
}

async function ensureSidebarOpen(webContents: WebContents): Promise<void> {
  const initial = await probeSidebar(webContents, true);
  if (initial.open) return;
  if (!initial.clicked) throw new Error("Impossible d’ouvrir la sidebar ChatGPT.");
  const deadline = Date.now() + 3_000;
  while (Date.now() < deadline) {
    await delay(200);
    if ((await probeSidebar(webContents, false)).open) return;
  }
  throw new Error("Impossible d’ouvrir la sidebar ChatGPT.");
}

interface ProjectsSectionProbe {
  found: boolean;
  visibleRows: number;
  expanded: boolean;
  clicked?: boolean;
}

async function probeProjectsSection(
  webContents: WebContents,
  clickHeader: boolean,
): Promise<ProjectsSectionProbe> {
  return (await webContents.executeJavaScript(`(() => {
    ${ACTIVE_PROJECT_SCOPE_HELPERS}
    const shouldClick = ${clickHeader};
    let section = findProjectsSection();
    let headerButton = section
      ? [...section.querySelectorAll('button')].find(exactProjectText)
      : [...document.querySelectorAll('button')].filter(intersectsViewport).find(exactProjectText);
    if (!section && headerButton) {
      section = headerButton.closest('[class*="sidebar-expando-section"]') || headerButton.parentElement?.parentElement;
    }
    if (!section) return { found: false, visibleRows: 0, expanded: false };
    if (!headerButton) {
      const header = section.querySelector('[class*="sidebar-expando-section-header"]');
      headerButton = header ? [...header.querySelectorAll('button')].find(exactProjectText) : undefined;
    }
    const entries = projectEntriesFor(section);
    const expanded = entries.length > 0 || headerButton?.getAttribute('aria-expanded') === 'true';
    if (shouldClick && entries.length === 0 && !expanded && headerButton instanceof HTMLElement) {
      headerButton.click();
      return { found: true, visibleRows: 0, expanded: false, clicked: true };
    }
    return { found: true, visibleRows: entries.length, expanded };
  })()`, true)) as ProjectsSectionProbe;
}

async function ensureProjectsSectionExpanded(
  webContents: WebContents,
  allowEmpty = false,
): Promise<void> {
  let probe: ProjectsSectionProbe | null = null;
  const discoveryDeadline = Date.now() + 2_000;
  while (Date.now() < discoveryDeadline) {
    probe = await probeProjectsSection(webContents, false);
    if (probe.found) break;
    await delay(250);
  }
  if (!probe?.found) throw new Error("Section Projets introuvable.");
  if (probe.visibleRows > 0) return;

  if (probe.expanded) {
    const contentDeadline = Date.now() + 2_000;
    while (Date.now() < contentDeadline) {
      await delay(200);
      probe = await probeProjectsSection(webContents, false);
      if (probe.visibleRows > 0) return;
    }
    if (allowEmpty) return;
    throw new Error("Aucun projet visible dans la section Projets.");
  }

  await delay(300);
  probe = await probeProjectsSection(webContents, false);
  if (probe.visibleRows > 0) return;
  if (!probe.found) throw new Error("Section Projets introuvable.");

  probe = await probeProjectsSection(webContents, true);
  if (probe.clicked) {
    const expansionDeadline = Date.now() + 3_000;
    while (Date.now() < expansionDeadline) {
      await delay(200);
      probe = await probeProjectsSection(webContents, false);
      if (probe.visibleRows > 0) return;
      if (allowEmpty && probe.expanded) return;
    }
  }
  if (allowEmpty && probe.found) return;
  throw new Error("Aucun projet visible : section Projets repliée, vide ou inaccessible.");
}

async function prepareProjectsSidebar(webContents: WebContents, allowEmpty = false): Promise<void> {
  await ensureSidebarOpen(webContents);
  await ensureProjectsSectionExpanded(webContents, allowEmpty);
}

async function expandVisibleProjects(
  webContents: WebContents,
  maxClicks: number,
  maxProjects: number,
): Promise<number> {
  let clicks = 0;
  while (clicks < maxClicks) {
    const result = (await webContents.executeJavaScript(`(() => {
      ${ACTIVE_PROJECT_SCOPE_HELPERS}
      const scope = findProjectsSection();
      const entries = projectEntriesFor(scope);
      const sidebar = findActiveSidebar();
      let scroller = scope || sidebar;
      while (scroller && scroller !== document.body && scroller.scrollHeight <= scroller.clientHeight + 2) {
        scroller = scroller.parentElement;
      }
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
      const showMore = findShowMoreButton(scope);
      if (!showMore || entries.length >= ${maxProjects}) return { clicked: false, count: entries.length };
      showMore.click();
      return { clicked: true, count: entries.length };
    })()`, true)) as { clicked?: boolean; count?: number };
    if (!result.clicked) break;
    clicks += 1;
    const previousCount = typeof result.count === "number" ? result.count : 0;
    const loadDeadline = Date.now() + 2_000;
    while (Date.now() < loadDeadline) {
      await delay(200);
      const progress = (await webContents.executeJavaScript(`(() => {
        ${ACTIVE_PROJECT_SCOPE_HELPERS}
        const scope = findProjectsSection();
        if (!scope) return { count: 0, hasMore: false };
        const count = projectEntriesFor(scope).length;
        const hasMore = Boolean(findShowMoreButton(scope));
        return { count, hasMore };
      })()`, true)) as { count?: number; hasMore?: boolean };
      if ((progress.count ?? 0) > previousCount || progress.hasMore === true) break;
    }
  }
  return clicks;
}

async function visibleProjectDescriptors(
  webContents: WebContents,
  maxProjects: number,
): Promise<ProjectRowDescriptor[]> {
  const names = (await webContents.executeJavaScript(`(() => {
    ${ACTIVE_PROJECT_SCOPE_HELPERS}
    const scope = findProjectsSection();
    const entries = projectEntriesFor(scope).slice(0, ${maxProjects});
    return entries.map((entry) => entry.name).filter(Boolean);
  })()`, true)) as unknown;
  if (!Array.isArray(names)) return [];
  const cleanNames = names.filter((name): name is string => typeof name === "string").map(cleanName);
  const totals = new Map<string, number>();
  for (const name of cleanNames) {
    const key = name.toLocaleLowerCase();
    totals.set(key, (totals.get(key) ?? 0) + 1);
  }
  const occurrences = new Map<string, number>();
  return cleanNames.map((name, initialIndex) => {
    const key = name.toLocaleLowerCase();
    const occurrence = occurrences.get(key) ?? 0;
    occurrences.set(key, occurrence + 1);
    return { name, occurrence, initialIndex, duplicateCount: totals.get(key) ?? 1 };
  });
}

export async function snapshotChatGptProjectOrder(
  webContents: WebContents,
  options: Pick<ProjectScanOptions, "maxShowMoreClicks" | "maxProjects" | "signal"> = {},
): Promise<{
  names: string[];
  descriptors: ProjectRowDescriptor[];
  showMoreClicks: number;
  complete: boolean;
}> {
  const maxShowMoreClicks = Math.min(20, Math.max(0, options.maxShowMoreClicks ?? 20));
  const maxProjects = Math.min(200, Math.max(1, options.maxProjects ?? 200));
  throwIfProjectScanAborted(options.signal);
  await prepareProjectsSidebar(webContents);
  throwIfProjectScanAborted(options.signal);
  let showMoreClicks = await expandVisibleProjects(webContents, maxShowMoreClicks, maxProjects);
  let descriptors: ProjectRowDescriptor[] = [];
  let previousSignature = "";
  let stablePasses = 0;
  let passes = 0;
  while (stablePasses < 3 && passes < 12) {
    throwIfProjectScanAborted(options.signal);
    passes += 1;
    if (showMoreClicks < maxShowMoreClicks) {
      showMoreClicks += await expandVisibleProjects(
        webContents,
        maxShowMoreClicks - showMoreClicks,
        maxProjects,
      );
    }
    await webContents.executeJavaScript(`(() => {
      ${ACTIVE_PROJECT_SCOPE_HELPERS}
      const section = findProjectsSection();
      let scroller = section;
      while (scroller && scroller !== document.body && scroller.scrollHeight <= scroller.clientHeight + 2) {
        scroller = scroller.parentElement;
      }
      if (scroller) scroller.scrollTop = scroller.scrollHeight;
    })()`, true);
    await delay(400);
    throwIfProjectScanAborted(options.signal);
    descriptors = await visibleProjectDescriptors(webContents, maxProjects);
    const signature = descriptors.map((item) => `${item.name}:${item.occurrence}`).join("\u0000");
    if (signature === previousSignature) stablePasses += 1;
    else stablePasses = 0;
    previousSignature = signature;
  }
  if (stablePasses < 3) {
    throw new Error("La liste des projets ne s’est pas stabilisée.");
  }
  const coverage = (await webContents.executeJavaScript(`(() => {
    ${ACTIVE_PROJECT_SCOPE_HELPERS}
    const scope = findProjectsSection();
    const entries = projectEntriesFor(scope);
    return {
      names: entries.map((entry) => entry.name).filter(Boolean),
      hasMore: Boolean(findShowMoreButton(scope)),
    };
  })()`, true)) as { names?: unknown; hasMore?: boolean };
  const completeNames = Array.isArray(coverage.names)
    ? coverage.names.filter((name): name is string => typeof name === "string").map(cleanName)
    : [];
  const complete = coverage.hasMore === false && completeNames.length > 0;
  return {
    names: complete ? completeNames : descriptors.map((item) => item.name),
    descriptors,
    showMoreClicks,
    complete,
  };
}

async function clickProjectHome(
  webContents: WebContents,
  name: string,
  occurrence: number,
  initialIndex: number,
): Promise<boolean> {
  return (await webContents.executeJavaScript(`(() => {
    ${ACTIVE_PROJECT_SCOPE_HELPERS}
    const expected = ${JSON.stringify(name)};
    const occurrence = ${occurrence};
    const initialIndex = ${initialIndex};
    const normalize = (value) => (value || '').replace(/\s+/g, ' ').trim();
    const scope = findProjectsSection();
    const entries = projectEntriesFor(scope);
    const indexed = entries[initialIndex];
    const entry = indexed && normalize(indexed.name) === normalize(expected)
      ? indexed
      : entries.filter((candidate) => normalize(candidate.name) === normalize(expected))[occurrence];
    if (!(entry?.button instanceof HTMLElement)) return false;
    entry.button.click();
    return true;
  })()`, true)) as boolean;
}

export async function captureCurrentProject(webContents: WebContents): Promise<ChatGptProject> {
  const url = normalizeProjectUrl(webContents.getURL());
  if (!url) throw new Error("La page actuelle n’est pas l’accueil d’un projet ChatGPT.");
  if (!CHATGPT_PROJECTS_DOM_AUTOMATION_ENABLED) {
    return createProjectRecord(projectNameFromUrl(url), url, "current");
  }
  const detected = (await webContents.executeJavaScript(String.raw`(() => {
    const candidates = [
      ...[...document.querySelectorAll('textarea[placeholder], [contenteditable="true"][data-placeholder]')]
        .map((element) => element.getAttribute('placeholder') || element.getAttribute('data-placeholder') || '')
        .map((value) => value.match(/^(?:Nouveau chat dans|New chat in)\s+(.+)$/i)?.[1] || ''),
      ...[...document.querySelectorAll('main h1, main h2')].map((element) => element.textContent || ''),
    ].map((value) => value.replace(/\s+/g, ' ').trim()).filter(Boolean);
    return candidates[0] || document.title.replace(/\s*[|–-]\s*ChatGPT.*$/i, '').trim();
  })()`, true)) as unknown;
  return createProjectRecord(
    typeof detected === "string" ? detected : projectNameFromUrl(url),
    url,
    "current",
  );
}

export async function scanChatGptProjects(
  webContents: WebContents,
  options: ProjectScanOptions = {},
): Promise<ProjectScanResult> {
  if (!CHATGPT_PROJECTS_DOM_AUTOMATION_ENABLED) {
    throw new Error("L’automatisation DOM des projets est désactivée.");
  }
  throwIfProjectScanAborted(options.signal);
  const maxShowMoreClicks = Math.min(20, Math.max(0, options.maxShowMoreClicks ?? 20));
  const maxProjects = Math.min(200, Math.max(1, options.maxProjects ?? 200));
  const navigationTimeoutMs = Math.min(30_000, Math.max(2_000, options.navigationTimeoutMs ?? 12_000));
  const scanId = options.scanId ?? `scan-${Date.now()}`;
  const emit = (progress: Omit<ProjectScanProgress, "scanId">): void => {
    options.onProgress?.({ scanId, ...progress });
  };
  emit({ phase: "discovering", completed: 0, total: 0, successes: 0, failures: 0, percent: 0 });
  const snapshot = await snapshotChatGptProjectOrder(webContents, {
    maxShowMoreClicks,
    maxProjects,
    signal: options.signal,
  });
  const descriptors = snapshot.descriptors;
  if (descriptors.length === 0) {
    return {
      status: "error",
      projects: [],
      failures: [],
      discovered: 0,
      showMoreClicks: snapshot.showMoreClicks,
      duplicatesSkipped: 0,
      durationsMs: [],
      sidebarNames: [],
      sidebarComplete: snapshot.complete,
      message: "Aucun projet visible dans la sidebar ChatGPT.",
    };
  }

  const projects: ChatGptProject[] = [];
  const failures: ProjectScanFailure[] = [];
  const durationsMs: number[] = [];
  const resolvedUrls = new Set<string>();
  const orderSyncedAt = new Date().toISOString();
  let duplicatesSkipped = 0;
  let completed = 0;
  emit({
    phase: "scanning",
    completed: 0,
    total: descriptors.length,
    successes: 0,
    failures: 0,
    percent: 0,
  });
  for (const descriptor of descriptors) {
    throwIfProjectScanAborted(options.signal);
    const startedAt = Date.now();
    let resolvedProject: ChatGptProject | null = null;
    let sawDuplicateUrl = false;
    let lastError = "bouton d’accueil introuvable";
    try {
      await prepareProjectsSidebar(webContents);
      await expandVisibleProjects(webContents, maxShowMoreClicks, maxProjects);
      const previousUrl = webContents.getURL();
      if (!(await clickProjectHome(
        webContents,
        descriptor.name,
        descriptor.occurrence,
        descriptor.initialIndex,
      ))) {
        lastError = `bouton d’accueil introuvable (index ${descriptor.initialIndex + 1})`;
      } else {
        let url = await waitForProjectUrl(
          webContents,
          navigationTimeoutMs,
          previousUrl,
          options.signal,
        );
        if (!url) url = normalizeProjectUrl(webContents.getURL());
        if (!url) {
          lastError = `navigation expirée (index ${descriptor.initialIndex + 1})`;
        } else if (resolvedUrls.has(url)) {
          // A repeated URL is a duplicate DOM entry, not an invitation to
          // click another row sharing the same display name.
          sawDuplicateUrl = true;
          lastError = `URL déjà résolue (index ${descriptor.initialIndex + 1})`;
        } else {
          const project = createProjectRecord(descriptor.name, url, "scan");
          project.sidebarOrder = descriptor.initialIndex;
          project.orderSyncedAt = orderSyncedAt;
          project.remoteName = descriptor.name;
          resolvedUrls.add(url);
          resolvedProject = project;
          projects.push(project);
        }
      }
    } catch (error) {
      throwIfProjectScanAborted(options.signal);
      lastError = error instanceof Error ? error.message : "échec inconnu";
    }
    const durationMs = Date.now() - startedAt;
    durationsMs.push(durationMs);
    if (!resolvedProject) {
      if (sawDuplicateUrl) {
        duplicatesSkipped += 1;
      } else {
        failures.push({
          name: descriptor.name,
          error: lastError,
          initialIndex: descriptor.initialIndex,
          occurrence: descriptor.occurrence,
          durationMs,
        });
      }
    }
    completed += 1;
    const recent = durationsMs.slice(-10);
    const averageMs = recent.reduce((sum, value) => sum + value, 0) / recent.length;
    emit({
      phase: "scanning",
      completed,
      total: descriptors.length,
      successes: projects.length,
      failures: failures.length,
      percent: Math.round((completed / descriptors.length) * 100),
      etaMs: Math.max(0, Math.round(averageMs * (descriptors.length - completed))),
      currentProjectName: descriptor.name,
    });
    throwIfProjectScanAborted(options.signal);
  }
  const status = projects.length === 0 ? "error" : failures.length > 0 ? "partial" : "ok";
  const message =
    `${descriptors.length} projet(s) trouvé(s) · ${projects.length} réussi(s) · ${failures.length} échoué(s)` +
    (duplicatesSkipped > 0 ? ` · ${duplicatesSkipped} répétition(s) DOM ignorée(s)` : "");
  return {
    status,
    projects: mergeProjects([], projects),
    failures,
    discovered: descriptors.length,
    showMoreClicks: snapshot.showMoreClicks,
    duplicatesSkipped,
    durationsMs,
    sidebarNames: snapshot.names,
    sidebarComplete: snapshot.complete,
    message,
  };
}

export async function createChatGptProject(
  webContents: WebContents,
  nameValue: string,
  timeoutMs = 20_000,
): Promise<ChatGptProject> {
  if (!CHATGPT_PROJECTS_DOM_AUTOMATION_ENABLED) {
    throw new Error("L’automatisation DOM des projets est désactivée.");
  }
  const name = cleanName(nameValue);
  if (!name) throw new Error("Le nom du projet est vide.");
  await prepareProjectsSidebar(webContents, true);
  const previousUrl = webContents.getURL();
  const opened = (await webContents.executeJavaScript(`(() => {
    const labels = ['Nouveau projet', 'New project'];
    const button = [...document.querySelectorAll('button')].find((candidate) => {
      const label = (candidate.getAttribute('aria-label') || '').trim();
      return labels.includes(label);
    });
    if (!(button instanceof HTMLElement)) return false;
    button.click();
    return true;
  })()`, true)) as boolean;
  if (!opened) throw new Error("Le bouton Nouveau projet est introuvable.");

  const deadline = Date.now() + Math.min(30_000, Math.max(5_000, timeoutMs));
  let filled = false;
  while (Date.now() < deadline && !filled) {
    filled = (await webContents.executeJavaScript(`(() => {
      const projectName = ${JSON.stringify(name)};
      const dialogs = [...document.querySelectorAll('[role="dialog"], dialog')];
      const dialog = dialogs.find((candidate) => /Créer un projet|Create (?:a )?project/i.test(candidate.textContent || ''));
      if (!dialog) return false;
      const input = [...dialog.querySelectorAll('input')].find((candidate) => {
        const label = (candidate.getAttribute('aria-label') || candidate.getAttribute('placeholder') || '').trim();
        return /Nom du projet|Project name/i.test(label);
      }) || dialog.querySelector('input');
      if (!(input instanceof HTMLInputElement)) return false;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, projectName);
      input.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: projectName }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.focus();
      return true;
    })()`, true)) as boolean;
    if (!filled) await delay(200);
  }
  if (!filled) throw new Error("Le champ de création du projet est introuvable.");
  await delay(250);
  const submitted = (await webContents.executeJavaScript(`(() => {
      const dialogs = [...document.querySelectorAll('[role="dialog"], dialog')];
      const dialog = dialogs.find((candidate) => /Créer un projet|Create (?:a )?project/i.test(candidate.textContent || ''));
      if (!dialog) return false;
      const input = dialog.querySelector('input');
      const submit = [...dialog.querySelectorAll('button')].find((candidate) =>
        /^(Créer un projet|Create project)$/i.test((candidate.textContent || '').trim()) && !candidate.disabled
      );
      if (submit instanceof HTMLElement) submit.click();
      else if (input instanceof HTMLInputElement) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', code: 'Enter', bubbles: true }));
        input.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', code: 'Enter', bubbles: true }));
      } else return false;
      return true;
  })()`, true)) as boolean;
  if (!submitted) throw new Error("La modale de création n’est plus disponible.");
  const url = await waitForProjectUrl(webContents, Math.max(2_000, deadline - Date.now()), previousUrl);
  if (!url) throw new Error("La création n’a pas abouti à une page de projet valide.");
  return createProjectRecord(name, url, "created");
}
