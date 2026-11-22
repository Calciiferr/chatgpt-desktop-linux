import { t } from "./i18n";

export type ProjectSyncTrigger = "settings" | "magic-bar" | "background";
export type ProjectBackgroundSkipReason = "idle" | "hidden" | null;

export const MANUAL_PROJECT_SYNC_TIMEOUT_MS = 10 * 60 * 1000;
export const BACKGROUND_PROJECT_SYNC_TIMEOUT_MS = 4 * 60 * 1000;
export const PROJECT_BACKGROUND_IDLE_SECONDS = 300;
export const PROJECT_BACKGROUND_HIDDEN_MS = 15 * 60 * 1000;

export class ProjectSyncTimeoutError extends Error {
  public constructor(public readonly timeoutMs: number) {
    super(t("syncTimedOut", { minutes: Math.round(timeoutMs / 60_000) }));
    this.name = "ProjectSyncTimeoutError";
  }
}

export function projectSyncTimeoutMs(trigger: ProjectSyncTrigger): number {
  return trigger === "background"
    ? BACKGROUND_PROJECT_SYNC_TIMEOUT_MS
    : MANUAL_PROJECT_SYNC_TIMEOUT_MS;
}

export function projectSyncSkipReason(
  trigger: ProjectSyncTrigger,
  input: { idleSeconds: number; hiddenSince: number | null; now: number },
): ProjectBackgroundSkipReason {
  if (trigger !== "background") return null;
  if (input.idleSeconds > PROJECT_BACKGROUND_IDLE_SECONDS) return "idle";
  if (
    input.hiddenSince !== null &&
    input.now - input.hiddenSince > PROJECT_BACKGROUND_HIDDEN_MS
  ) {
    return "hidden";
  }
  return null;
}

export async function runProjectSyncWithTimeout<T>(
  timeoutMs: number,
  operation: (signal: AbortSignal) => Promise<T>,
  onTimeout: () => void,
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      try {
        onTimeout();
      } finally {
        controller.abort();
        reject(new ProjectSyncTimeoutError(timeoutMs));
      }
    }, timeoutMs);
    timer.unref();
  });
  try {
    return await Promise.race([operation(controller.signal), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}
