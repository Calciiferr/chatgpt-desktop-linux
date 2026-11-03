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
