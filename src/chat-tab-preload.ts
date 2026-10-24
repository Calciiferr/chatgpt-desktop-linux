import { ipcRenderer } from "electron";

const THRESHOLD = 130;
const RESET_DELAY_MS = 180;
let enabled = false;
let distance = 0;
let resetTimer: ReturnType<typeof setTimeout> | null = null;
let armed = true;

function scrollableElementAtTop(event: WheelEvent): boolean {
  for (const candidate of event.composedPath()) {
    if (!(candidate instanceof HTMLElement)) continue;
    const style = window.getComputedStyle(candidate);
    const canScroll = /(auto|scroll)/.test(style.overflowY) && candidate.scrollHeight > candidate.clientHeight + 2;
    if (canScroll) return candidate.scrollTop <= 1;
  }
  const root = document.scrollingElement;
  return !root || root.scrollTop <= 1;
}

function resetPull(): void {
  distance = 0;
  armed = true;
  ipcRenderer.send("pull-refresh:progress", { progress: 0, visible: false });
}

ipcRenderer.on("pull-refresh:enabled", (_event, value: unknown) => {
  enabled = value === true;
  if (!enabled) resetPull();
});

window.addEventListener(
  "wheel",
  (event) => {
    if (!enabled || !event.isTrusted || event.ctrlKey) return;
    const precise = event.deltaMode === WheelEvent.DOM_DELTA_PIXEL && Math.abs(event.deltaY) < 90;
    if (!precise || Math.abs(event.deltaX) > Math.abs(event.deltaY) * 1.5) {
      resetPull();
      return;
    }
    if (event.deltaY >= 0 || !scrollableElementAtTop(event)) {
      resetPull();
      return;
    }
    if (!armed) return;
    distance = Math.min(THRESHOLD, distance + Math.abs(event.deltaY));
    const progress = Math.min(1, distance / THRESHOLD);
    ipcRenderer.send("pull-refresh:progress", { progress, visible: true });
    if (resetTimer) clearTimeout(resetTimer);
    resetTimer = setTimeout(resetPull, RESET_DELAY_MS);
    if (distance >= THRESHOLD) {
      armed = false;
      ipcRenderer.send("pull-refresh:trigger");
      if (resetTimer) clearTimeout(resetTimer);
      resetTimer = setTimeout(resetPull, 450);
    }
  },
  { capture: true, passive: true },
);

// Keep this DOM integration in the sandbox-compatible preload: no page API or
// credentials are exposed to ChatGPT, only narrowly validated IPC in main.
window.addEventListener("DOMContentLoaded", () => {
  if (location.origin !== "https://chatgpt.com") return;
  let colors: Record<string, string> = {};
  let target: { id: string; row: HTMLElement; trigger: HTMLElement } | null = null;
  let preview: { id: string; color: string | null } | null = null;
  let overlay: HTMLElement | null = null;
  let scheduled = false;
  const labels = document.documentElement.lang.startsWith("fr") ? {
    menu: "Couleur", title: "Couleur de la conversation", custom: "Couleur personnalisée", none: "Aucune couleur", apply: "Appliquer", cancel: "Annuler", saved: "Couleur enregistrée", error: "Enregistrement impossible. Réessayez.",
  } : { menu: "Color", title: "Conversation color", custom: "Custom color", none: "No color", apply: "Apply", cancel: "Cancel", saved: "Color saved", error: "Could not save. Please retry." };
  const style = document.createElement("style");
  style.textContent = `
    [data-cdl-color] { background:linear-gradient(105deg,color-mix(in srgb,var(--cdl-color) 25%,transparent),color-mix(in srgb,var(--cdl-color) 6%,transparent)) !important;box-shadow:inset 3px 0 color-mix(in srgb,var(--cdl-color) 75%,transparent);border-radius:8px; }
    [data-cdl-color]:hover { background:linear-gradient(105deg,color-mix(in srgb,var(--cdl-color) 35%,transparent),color-mix(in srgb,var(--cdl-color) 12%,transparent)) !important; }
    .cdl-color-action { display:flex;align-items:center;gap:10px;width:100%;padding:9px 12px;background:transparent;color:inherit;border:0;border-radius:6px;font:inherit;text-align:start;cursor:pointer; }
    .cdl-color-action:hover,.cdl-color-action:focus-visible { background:color-mix(in srgb,currentColor 10%,transparent);outline:2px solid currentColor;outline-offset:-2px; }
    .cdl-color-overlay { position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;background:#0007;padding:20px; }
    .cdl-color-panel { width:min(390px,100%);max-height:85vh;overflow:auto;padding:24px;border-radius:18px;background:light-dark(#fff,#22252b);color:light-dark(#20232a,#f4f4f5);border:1px solid light-dark(#d4d8df,#484c55);box-shadow:0 20px 70px #0006;font:14px system-ui; }
    .cdl-color-panel h2 { margin:0 0 18px;font-size:18px;font-weight:650; }
    .cdl-color-preview { border-radius:9px;padding:12px;margin-bottom:16px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap; }
    .cdl-color-swatches { display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-bottom:18px; }
    .cdl-color-swatch { width:100%;height:38px;border:2px solid transparent;border-radius:10px;cursor:pointer; }
    .cdl-color-swatch[aria-pressed=true] { outline:2px solid currentColor;outline-offset:3px; }
    .cdl-color-swatch:focus-visible { outline:3px solid currentColor;outline-offset:3px; }
    .cdl-color-custom { display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0; }
    .cdl-color-custom input { width:60px;height:38px;padding:2px;cursor:pointer; }
    .cdl-color-footer { display:flex;justify-content:flex-end;gap:10px;margin-top:18px; }
    .cdl-color-panel .cdl-color-button { font:inherit;padding:8px 12px;border:1px solid light-dark(#c7ccd4,#606672);border-radius:8px;color:inherit;background:transparent;cursor:pointer; }
    .cdl-color-panel .cdl-color-primary { background:light-dark(#263754,#e0eaff);color:light-dark(#fff,#172238); }
    .cdl-color-error { color:light-dark(#a31b25,#ffadb2);margin-top:12px; }
  `;
  document.head.append(style);
  function conversationId(link: HTMLAnchorElement): string | null {
    try {
      const url = new URL(link.href);
      return url.origin === "https://chatgpt.com" ? url.pathname.match(/^\/(?:g\/g-p-[^/]+\/)?c\/([a-z0-9-]{6,100})\/?$/i)?.[1] ?? null : null;
    } catch { return null; }
  }
  function rowFor(link: HTMLAnchorElement): HTMLElement | null {
    if (link.closest("main, [role=main]")) return null;
    for (let row = link.parentElement, depth = 0; row && depth < 7; row = row.parentElement, depth++) {
      if (row.matches("main, body, nav, aside, [role=list]")) return null;
      const links = [...row.querySelectorAll<HTMLAnchorElement>("a[href]")].filter(conversationId);
      if (links.length > 1) return null;
      if (links.length === 1 && row.querySelector('button[aria-haspopup="menu"]')) return row;
    }
    return null;
  }
  function paint(row: HTMLElement, color: string | null): void {
    if (color) {
      if (row.style.getPropertyValue("--cdl-color") !== color) row.style.setProperty("--cdl-color", color);
      if (!row.hasAttribute("data-cdl-color")) row.setAttribute("data-cdl-color", "");
    } else if (row.hasAttribute("data-cdl-color")) {
      row.removeAttribute("data-cdl-color"); row.style.removeProperty("--cdl-color");
    }
  }
  function updateRows(): void {
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/c/"]').forEach(link => {
      const id = conversationId(link), row = rowFor(link);
      if (id && row) paint(row, preview?.id === id ? preview.color : colors[id] || null);
    });
  }
  function openPalette(item: NonNullable<typeof target>): void {
    if (overlay) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    if (item.trigger.getAttribute("aria-expanded") === "true") item.trigger.click();
    const root = document.createElement("div"); root.className = "cdl-color-overlay";
    const panel = document.createElement("section"); panel.className = "cdl-color-panel";
    panel.setAttribute("role", "dialog"); panel.setAttribute("aria-modal", "true"); panel.setAttribute("aria-label", labels.title);
    const title = document.createElement("h2"); title.textContent = labels.title;
    const sample = document.createElement("div"); sample.className = "cdl-color-preview";
    const link = [...item.row.querySelectorAll<HTMLAnchorElement>("a[href]")].find(anchor => conversationId(anchor) === item.id);
    sample.textContent = link?.getAttribute("aria-label") || link?.textContent || labels.title;
    const swatches = document.createElement("div"); swatches.className = "cdl-color-swatches"; swatches.setAttribute("role", "group"); swatches.setAttribute("aria-label", labels.menu);
    const choices = [["Rouge / Red", "#ef6464"], ["Orange", "#ed9853"], ["Jaune / Yellow", "#d8b83f"], ["Vert / Green", "#58b983"], ["Turquoise", "#45b4af"], ["Bleu / Blue", "#5c94e8"], ["Indigo", "#8278df"], ["Violet", "#b279d9"], ["Rose / Pink", "#dc80ab"], ["Gris / Gray", "#8d98aa"]];
    let draft: string | null = colors[item.id] || null;
    const input = document.createElement("input"); input.type = "color"; input.value = draft || "#5c94e8"; input.setAttribute("aria-label", labels.custom);
    const error = document.createElement("p"); error.className = "cdl-color-error"; error.setAttribute("role", "status");
    const choose = (color: string | null) => {
      draft = color; preview = { id: item.id, color }; updateRows(); paint(sample, color);
      swatches.querySelectorAll<HTMLButtonElement>("button").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.color === color)));
      if (color) input.value = color;
    };
    for (const [name, color] of choices) {
      const button = document.createElement("button"); button.type = "button"; button.className = "cdl-color-swatch";
      button.style.background = color; button.dataset.color = color; button.title = name; button.setAttribute("aria-label", name);
      button.addEventListener("click", () => choose(color)); swatches.append(button);
    }
    const custom = document.createElement("label"); custom.className = "cdl-color-custom"; custom.append(document.createTextNode(labels.custom), input);
    input.addEventListener("input", () => choose(input.value));
    const button = (text: string) => { const element = document.createElement("button"); element.type = "button"; element.className = "cdl-color-button"; element.textContent = text; return element; };
    const none = button(labels.none); none.addEventListener("click", () => choose(null));
    const footer = document.createElement("div"); footer.className = "cdl-color-footer";
    const cancel = button(labels.cancel), apply = button(labels.apply); apply.classList.add("cdl-color-primary");
    const close = () => { preview = null; root.remove(); overlay = null; updateRows(); if (item.trigger.isConnected) item.trigger.focus(); else previousFocus?.focus(); };
    cancel.addEventListener("click", close);
    apply.addEventListener("click", async () => {
      apply.disabled = true; cancel.disabled = true;
      try {
        const result = await ipcRenderer.invoke("conversation-colors:set", item.id, draft);
        if (!result?.ok) { error.textContent = result?.error || labels.error; return; }
        colors = result.colors; close();
      } catch { error.textContent = labels.error; }
      finally { apply.disabled = false; cancel.disabled = false; }
    });
    root.addEventListener("click", event => { if (event.target === root && !apply.disabled) close(); });
    root.addEventListener("keydown", event => {
      if (event.key === "Escape" && !apply.disabled) { event.preventDefault(); event.stopPropagation(); close(); }
      if (event.key === "Tab") {
        const focusable = [...panel.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled)")];
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    footer.append(cancel, apply); panel.append(title, sample, swatches, custom, none, error, footer); root.append(panel);
    overlay = root; document.body.append(root); choose(draft); swatches.querySelector("button")?.focus();
  }
  function injectMenu(): void {
    if (!target || !target.row.isConnected || overlay || target.trigger.getAttribute("aria-expanded") !== "true") return;
    const controlled = target.trigger.getAttribute("aria-controls");
    const menu = controlled ? document.getElementById(controlled) : [...document.querySelectorAll<HTMLElement>('[role="menu"]')].find(element => element.getBoundingClientRect().width > 0);
    if (!menu || menu.getAttribute("role") !== "menu") return;
    const existing = menu.querySelector<HTMLElement>("[data-cdl-color-action]");
    if (existing?.dataset.cdlColorAction === target.id) return;
    existing?.remove();
    const item = target;
    const action = document.createElement("button"); action.type = "button"; action.className = "cdl-color-action"; action.setAttribute("role", "menuitem"); action.setAttribute("data-cdl-color-action", item.id); action.textContent = "◉  " + labels.menu;
    action.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); openPalette(item); });
    action.addEventListener("keydown", event => {
      const nativeItems = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter(element => element !== action && element.getBoundingClientRect().width > 0);
      if (event.key === "ArrowUp" || event.key === "ArrowDown") {
        event.preventDefault(); event.stopPropagation();
        (event.key === "ArrowUp" ? nativeItems[nativeItems.length - 1] : nativeItems[0])?.focus();
      }
    });
    menu.addEventListener("keydown", event => {
      const keyboard = event as KeyboardEvent;
      const nativeItems = [...menu.querySelectorAll<HTMLElement>('[role="menuitem"]')].filter(element => !element.hasAttribute("data-cdl-color-action") && element.getBoundingClientRect().width > 0);
      if (keyboard.key === "ArrowDown" && document.activeElement === nativeItems[nativeItems.length - 1]) {
        keyboard.preventDefault(); keyboard.stopPropagation(); menu.querySelector<HTMLElement>("[data-cdl-color-action]")?.focus();
      }
    }, { capture: true });
    menu.append(action);
  }
  function schedule(): void {
    if (scheduled) return; scheduled = true;
    requestAnimationFrame(() => { scheduled = false; updateRows(); injectMenu(); });
  }
  const captureTarget = (event: Event) => {
    const trigger = event.target instanceof Element ? event.target.closest<HTMLElement>('button[aria-haspopup="menu"]') : null;
    if (!trigger || trigger.closest(".cdl-color-overlay")) return;
    target = null;
    for (let parent = trigger.parentElement, depth = 0; parent && depth < 8; parent = parent.parentElement, depth++) {
      const links = [...parent.querySelectorAll<HTMLAnchorElement>("a[href]")].filter(conversationId);
      if (links.length > 1) break;
      if (links.length === 1) {
        const id = conversationId(links[0]), row = rowFor(links[0]);
        if (id && row?.contains(trigger)) target = { id, row, trigger };
        break;
      }
    }
    schedule();
  };
  document.addEventListener("pointerdown", captureTarget, true);
  document.addEventListener("click", captureTarget, true);
  document.addEventListener("keydown", event => { if (["Enter", " ", "ArrowDown"].includes(event.key)) captureTarget(event); }, true);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["aria-expanded", "aria-controls"] });
  ipcRenderer.on("conversation-colors:state", (_event, state: Record<string, string>) => { colors = state; schedule(); });
  ipcRenderer.invoke("conversation-colors:get").then(state => { colors = state || {}; schedule(); }).catch(() => {});
});
