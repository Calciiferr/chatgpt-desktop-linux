import type { WebContents } from "electron";
import { log } from "./logger";

const POLL_INTERVAL_MS = 1_000;
const REQUIRED_IDLE_POLLS = 2;
// A page check that never answers must not stop monitoring for the rest of the session.
const POLL_TIMEOUT_MS = 5_000;

export interface ChatTabThrottlingState {
  windowVisible: boolean;
  windowMinimized: boolean;
  active: boolean;
  generating: boolean;
}

export function shouldThrottleChatTab(state: ChatTabThrottlingState): boolean {
  if (state.generating) return false;
  if (!state.windowVisible || state.windowMinimized) return true;
  return !state.active;
}

// Keep every chatgpt.com-specific selector in this module. If the website changes,
// response monitoring can be disabled without affecting the rest of the application.
const GENERATION_STATE_SCRIPT = String.raw`(() => {
  const visible = (element) => {
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && style.visibility !== 'hidden' && element.getClientRects().length > 0;
  };
  const selectors = [
    '[data-testid="stop-button"]',
    'button[data-testid*="stop" i]',
    'button[aria-label*="stop generating" i]',
    'button[aria-label*="stop streaming" i]',
    'button[aria-label*="arrêter" i]',
    'button[aria-label*="detener" i]'
  ];
  if (selectors.some((selector) => [...document.querySelectorAll(selector)].some(visible))) return true;
  // The stop button replaces the send button in the composer; its label is only
  // "Stop" in English, "Arrêter" in French and "Detener" in Spanish.
  const stopLabel = /^(stop|arr[êe]ter|detener)\b/i;
  return [...document.querySelectorAll('form button[aria-label], #composer-background button[aria-label]')]
    .some((button) => stopLabel.test((button.getAttribute('aria-label') || '').trim()) && visible(button));
})()`;

export class ChatResponseMonitor {
  private timer: ReturnType<typeof setInterval> | null = null;
  private pollInProgress = false;
  private generationObserved = false;
  private idlePolls = 0;
  private failureLogged = false;

  public constructor(
    private readonly webContents: WebContents,
    private readonly onResponseFinished: () => void,
    private readonly onGenerationStateChanged?: (generating: boolean) => void,
  ) {}

  public isGenerationInProgress(): boolean {
    return this.generationObserved;
  }

  public start(): void {
    if (this.timer || this.webContents.isDestroyed()) {
      return;
    }
    this.timer = setInterval(() => void this.poll(), POLL_INTERVAL_MS);
    this.timer.unref();
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.reset();
  }

  public reset(): void {
    if (this.generationObserved) {
      this.generationObserved = false;
      this.onGenerationStateChanged?.(false);
    }
    this.idlePolls = 0;
  }

  private async poll(): Promise<void> {
    if (this.pollInProgress || this.webContents.isDestroyed()) {
      return;
    }
    const url = this.webContents.getURL();
    if (!url.startsWith("https://chatgpt.com/")) {
      this.reset();
      return;
    }

    this.pollInProgress = true;
    try {
      const generating = (await Promise.race([
        this.webContents.executeJavaScript(GENERATION_STATE_SCRIPT, true),
        new Promise((_resolve, reject) => {
          setTimeout(() => reject(new Error("page check timed out")), POLL_TIMEOUT_MS).unref();
        }),
      ])) as boolean;
      this.failureLogged = false;
      if (generating) {
        if (!this.generationObserved) {
          log.info("[response-monitor] Generation detected.");
          this.generationObserved = true;
          this.onGenerationStateChanged?.(true);
        }
        this.idlePolls = 0;
        return;
      }

      if (!this.generationObserved) {
        return;
      }
      this.idlePolls += 1;
      if (this.idlePolls >= REQUIRED_IDLE_POLLS) {
        this.reset();
        log.info("[response-monitor] Generation finished.");
        this.onResponseFinished();
      }
    } catch (error) {
      if (!this.failureLogged) {
        this.failureLogged = true;
        log.warn("[response-monitor] Page temporarily unreadable:", error);
      }
    } finally {
      this.pollInProgress = false;
    }
  }
}
