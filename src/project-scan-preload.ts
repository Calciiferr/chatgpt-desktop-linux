// Preload of the hidden project-scan window only. It marks the document so the
// NestFolders content scripts (loaded for the whole ChatGPT session) do not start a
// folder tree there: that window must never become a writer of the folder layout.
const MARK = "data-cdl-no-nestfolders";

function mark(): void {
  document.documentElement?.setAttribute(MARK, "");
}

mark();
// The content scripts run at document_idle, after DOMContentLoaded.
window.addEventListener("DOMContentLoaded", mark, { once: true });
