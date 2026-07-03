import type { WebContents } from "electron";

export interface ChatPageState {
  pendingText: boolean;
  pendingFiles: boolean;
  generating: boolean;
  uncertain: boolean;
}

export async function inspectChatPageState(contents: WebContents): Promise<ChatPageState> {
  try {
    const value = (await contents.executeJavaScript(`(() => {
      const composer = document.querySelector('#prompt-textarea, [data-testid="prompt-textarea"], form textarea, form [contenteditable="true"]');
      const text = composer instanceof HTMLTextAreaElement || composer instanceof HTMLInputElement
        ? composer.value
        : (composer?.textContent || '');
      const composerRoot = composer?.closest('form')?.parentElement || composer?.parentElement || null;
      const fileInput = composerRoot?.querySelector('input[type="file"]') || document.querySelector('form input[type="file"]');
      const fileCount = fileInput instanceof HTMLInputElement ? (fileInput.files?.length || 0) : 0;
      const attachment = composerRoot?.querySelector('[data-testid*="attachment"], [aria-label*="Remove file" i], [aria-label*="Supprimer le fichier" i], [class*="file-pill"]');
      const stop = document.querySelector('[data-testid="stop-button"], button[aria-label*="Stop" i], button[aria-label*="Arrêter" i]');
      return {
        pendingText: Boolean(text.trim()),
        pendingFiles: fileCount > 0 || Boolean(attachment),
        generating: Boolean(stop),
        uncertain: !composer,
      };
    })()`, true)) as Partial<ChatPageState>;
    return {
      pendingText: value.pendingText === true,
      pendingFiles: value.pendingFiles === true,
      generating: value.generating === true,
      uncertain: value.uncertain === true,
    };
  } catch {
    return { pendingText: false, pendingFiles: false, generating: false, uncertain: true };
  }
}
