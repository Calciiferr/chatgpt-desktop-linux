const translations = {
  fr: {
    close: "Fermer", addContext: "Ajouter du contexte", chatDestination: "Conversation cible",
    requestPlaceholder: "Message ChatGPT", files: "Ajouter des fichiers", region: "Capturer une zone",
    window: "Capturer une fenêtre", screen: "Capturer l’écran", clipboardImage: "Ajouter les fichiers/images copiés",
    securityAudit: "Audit sécurité", qualityAudit: "Audit qualité",
    projectLabel: "Projet", noProjectsSynced: "Aucun projet synchronisé", createProject: "Créer un nouveau projet…",
    refreshProjects: "↻ Actualiser les projets", manageProjects: "Gérer les projets…",
    projectsSyncing: "Synchronisation des projets…", projectsSynced: "Projets actualisés.", projectsSyncedCount: "{count} projets synchronisés", projectsSyncError: "Synchronisation impossible.",
    projectsLoading: "Chargement du scanner…", projectsDiscovering: "Détection des projets…", projectsSaving: "Enregistrement…", approximately: "environ",
    newProjectPlaceholder: "Nom du nouveau projet", projectNameRequired: "Saisissez le nom du nouveau projet.",
    newChat: "Nouveau", resumeChat: "Dernier", prepare: "Préparer dans ChatGPT",
    emptyError: "Écrivez une demande ou ajoutez un contexte.", preparing: "Préparation dans ChatGPT…",
    fallback: "Le texte a été copié. Joignez les fichiers manuellement.", imageMissing: "Aucun fichier ni aucune image compatible dans le presse-papiers.",
    captureError: "Capture annulée ou indisponible.", transferError: "Transfert impossible.",
  },
  en: {
    close: "Close", addContext: "Add context", chatDestination: "Target conversation",
    requestPlaceholder: "Message ChatGPT", files: "Add files", region: "Capture region", window: "Capture window",
    screen: "Capture screen", clipboardImage: "Add copied files/images", newChat: "New", resumeChat: "Last",
    securityAudit: "Security audit", qualityAudit: "Quality audit",
    projectLabel: "Project", noProjectsSynced: "No synchronized project", createProject: "Create a new project…",
    refreshProjects: "↻ Refresh projects", manageProjects: "Manage projects…",
    projectsSyncing: "Synchronizing projects…", projectsSynced: "Projects refreshed.", projectsSyncedCount: "{count} projects synchronized", projectsSyncError: "Synchronization failed.",
    projectsLoading: "Loading scanner…", projectsDiscovering: "Detecting projects…", projectsSaving: "Saving…", approximately: "about",
    newProjectPlaceholder: "New project name", projectNameRequired: "Enter the new project name.",
    prepare: "Prepare in ChatGPT", emptyError: "Write a request or add context.", preparing: "Preparing in ChatGPT…",
    fallback: "The text was copied. Attach files manually.", imageMissing: "No compatible files or images in the clipboard.",
    captureError: "Capture cancelled or unavailable.", transferError: "Transfer failed.",
  },
  es: {
    close: "Cerrar", addContext: "Añadir contexto", chatDestination: "Conversación de destino",
    requestPlaceholder: "Mensaje para ChatGPT", files: "Añadir archivos", region: "Capturar una zona",
    window: "Capturar una ventana", screen: "Capturar la pantalla", clipboardImage: "Añadir archivos/imágenes copiados",
    securityAudit: "Auditoría de seguridad", qualityAudit: "Auditoría de calidad",
    projectLabel: "Proyecto", noProjectsSynced: "Ningún proyecto sincronizado", createProject: "Crear un nuevo proyecto…",
    refreshProjects: "↻ Actualizar proyectos", manageProjects: "Gestionar proyectos…",
    projectsSyncing: "Sincronizando proyectos…", projectsSynced: "Proyectos actualizados.", projectsSyncedCount: "{count} proyectos sincronizados", projectsSyncError: "No se pudo sincronizar.",
    projectsLoading: "Cargando escáner…", projectsDiscovering: "Detectando proyectos…", projectsSaving: "Guardando…", approximately: "aproximadamente",
    newProjectPlaceholder: "Nombre del nuevo proyecto", projectNameRequired: "Introduce el nombre del nuevo proyecto.",
    newChat: "Nuevo", resumeChat: "Último", prepare: "Preparar en ChatGPT",
    emptyError: "Escribe una solicitud o añade contexto.", preparing: "Preparando en ChatGPT…",
    fallback: "El texto se copió. Adjunta los archivos manualmente.", imageMissing: "No hay archivos ni imágenes compatibles en el portapapeles.",
    captureError: "Captura cancelada o no disponible.", transferError: "No se pudo transferir.",
  },
};

const promptInput = document.querySelector("#prompt");
const itemsContainer = document.querySelector("#items");
const resumeButton = document.querySelector("#resume-chat");
const prepareButton = document.querySelector("#prepare");
const status = document.querySelector("#status");
const toggleToolsButton = document.querySelector("#toggle-tools");
const sourceIndicator = document.querySelector("#source-indicator");
const previewDialog = document.querySelector("#preview-dialog");
const previewImage = document.querySelector("#preview-image");
const previewTitle = document.querySelector("#preview-title");
const previewClose = document.querySelector("#preview-close");
const auditSecurityInput = document.querySelector("#audit-security");
const auditQualityInput = document.querySelector("#audit-quality");
const projectEnabledInput = document.querySelector("#project-enabled");
const projectPicker = document.querySelector("#project-picker");
const projectSelect = document.querySelector("#project-select");
const newProjectNameInput = document.querySelector("#new-project-name");

let language = "fr";
let selectedMode = "new";
let currentItems = [];
let lastDraftVersion = -1;
let hydratingDraft = false;
let toolsOpen = false;
let lastReportedLayout = "";
let layoutReportFrame = 0;
let suppressNextToolsClick = false;
let lastNotice = "";
let lastNoticeId = 0;
let lastTransientStatusId = 0;
let hasLastChat = false;
let knownProjects = [];
let projectSyncing = false;
let lastProjectSelection = "";
let statusTimer = 0;

function tr(key) { return translations[language]?.[key] || translations.fr[key] || key; }

function applyTranslations() {
  document.documentElement.lang = language;
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = tr(element.dataset.i18n); });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((element) => { element.placeholder = tr(element.dataset.i18nPlaceholder); });
  document.querySelectorAll("[data-i18n-aria]").forEach((element) => { element.setAttribute("aria-label", tr(element.dataset.i18nAria)); });
}

function setStatus(message = "", kind = "") {
  if (statusTimer) window.clearTimeout(statusTimer);
  statusTimer = 0;
  delete status.dataset.transientStatus;
  status.textContent = message;
  status.className = kind;
  scheduleLayoutReport();
}

function setTransientStatus(message, kind = "", durationMs = 3200) {
  setStatus(message, kind);
  statusTimer = window.setTimeout(() => setStatus(), durationMs);
}

function formatEta(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds <= 0) return "";
  const totalSeconds = Math.max(1, Math.round(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return minutes ? `${minutes} min ${seconds} s` : `${seconds} s`;
}

function renderProjectProgress(progress) {
  if (!progress || typeof progress !== "object") return;
  const active = ["loading", "discovering", "scanning", "saving"].includes(progress.phase);
  projectSyncing = active;
  projectSelect.disabled = active;
  projectEnabledInput.disabled = active;
  if (progress.phase === "loading") setStatus(tr("projectsLoading"));
  else if (progress.phase === "discovering") setStatus(tr("projectsDiscovering"));
  else if (progress.phase === "saving") setStatus(tr("projectsSaving"));
  else if (progress.phase === "scanning") {
    const eta = formatEta(progress.etaMs);
    setStatus(`${tr("projectsSyncing")} ${progress.percent || 0} % · ${progress.completed || 0}/${progress.total || 0}${eta ? ` · ${tr("approximately")} ${eta}` : ""}`);
  } else if (progress.phase === "complete") {
    projectSelect.disabled = false;
    projectEnabledInput.disabled = false;
    if (progress.total > 0) {
      setTransientStatus(
        tr("projectsSyncedCount").replace("{count}", String(progress.successes || 0)),
        progress.failures ? "error" : "success",
      );
    }
  }
}

function visibleUnionHeight() {
  const bar = document.querySelector("#bar");
  return bar ? Math.ceil(bar.getBoundingClientRect().height) : 0;
}

function barBottomOffset() {
  const bar = document.querySelector("#bar");
  return bar ? Math.ceil(bar.getBoundingClientRect().bottom) : 0;
}

function visibleRects() {
  const bodyRect = document.body.getBoundingClientRect();
  const bar = document.querySelector("#bar");
  if (!bar) return [];
  const rect = bar.getBoundingClientRect();
  return [{
    x: Math.max(0, Math.round(rect.left - bodyRect.left)),
    y: Math.max(0, Math.round(rect.top - bodyRect.top)),
    width: Math.max(1, Math.ceil(rect.width)),
    height: Math.max(1, Math.ceil(rect.height)),
  }];
}

function reportLayout() {
  layoutReportFrame = 0;
  const height = visibleUnionHeight();
  if (!height) return;
  const bottom = barBottomOffset();
  const signature = `${height}:${bottom}:${toolsOpen ? "1" : "0"}`;
  if (signature === lastReportedLayout) return;
  lastReportedLayout = signature;
  window.companionApi.reportLayout({ height, expanded: toolsOpen, barBottom: bottom, rects: visibleRects() });
}

function scheduleLayoutReport() {
  if (layoutReportFrame) return;
  layoutReportFrame = requestAnimationFrame(() => {
    requestAnimationFrame(reportLayout);
  });
}

function itemIcon(type) { return type === "text" ? "¶" : type === "image" ? "▧" : "↥"; }

function openImagePreview(item) {
  if (!item.previewDataUrl && !item.thumbnailDataUrl) return;
  previewImage.src = item.previewDataUrl || item.thumbnailDataUrl;
  previewImage.alt = item.name || "";
  previewTitle.textContent = item.name || "";
  previewDialog.showModal();
}

function mediaForItem(item) {
  if (item.thumbnailDataUrl) {
    const button = document.createElement("button");
    button.className = "context-thumb image-thumb";
    button.type = "button";
    button.title = item.name || "";
    button.addEventListener("click", () => openImagePreview(item));
    const image = document.createElement("img");
    image.src = item.thumbnailDataUrl;
    image.alt = item.name || "";
    button.append(image);
    return button;
  }
  const icon = document.createElement("span");
  icon.className = "context-icon";
  if (item.iconDataUrl) {
    const image = document.createElement("img");
    image.src = item.iconDataUrl;
    image.alt = "";
    icon.append(image);
  } else {
    icon.textContent = itemIcon(item.type);
  }
  return icon;
}

function renderItems() {
  itemsContainer.replaceChildren();
  for (const item of currentItems) {
    const chip = document.createElement("article");
    chip.className = "context-chip";
    const icon = mediaForItem(item);
    const copy = document.createElement("div");
    copy.className = "context-copy";
    const name = document.createElement("div");
    name.className = "context-name";
    name.textContent = item.source ? `${item.name} · ${item.source}` : item.name;
    const preview = document.createElement("div");
    preview.className = "context-preview";
    preview.textContent = item.preview || "";
    copy.append(name, preview);
    const remove = document.createElement("button");
    remove.className = "remove-context";
    remove.type = "button";
    remove.textContent = "×";
    remove.addEventListener("click", () => window.companionApi.removeItem(item.id));
    chip.append(icon, copy, remove);
    itemsContainer.append(chip);
  }
  const source = currentItems.find((item) => item.source)?.source;
  sourceIndicator.hidden = !source;
  sourceIndicator.textContent = source ? `● ${source}` : "";
  scheduleLayoutReport();
}

function selectChatMode(mode) {
  selectedMode = mode;
  document.querySelectorAll(".mode-button").forEach((button) => button.classList.toggle("selected", button.dataset.mode === mode));
}

function currentDraftInput() {
  const selectedProjectId = knownProjects.some((project) => project.id === projectSelect.value)
    ? projectSelect.value
    : knownProjects.some((project) => project.id === lastProjectSelection)
      ? lastProjectSelection
      : undefined;
  return {
    prompt: promptInput.value,
    securityAudit: auditSecurityInput.checked,
    qualityAudit: auditQualityInput.checked,
    chatMode: selectedMode,
    projectEnabled: projectEnabledInput.checked,
    projectMode: projectSelect.value === "__create__" ? "create" : "existing",
    selectedProjectId,
    newProjectName: newProjectNameInput.value,
  };
}

async function persistDraft() {
  if (hydratingDraft) return { ok: true, version: lastDraftVersion };
  try {
    const result = await window.companionApi.updateDraft(currentDraftInput());
    if (Number.isInteger(result?.version)) lastDraftVersion = Math.max(lastDraftVersion, result.version);
    return result;
  } catch {
    return { ok: false, version: lastDraftVersion };
  }
}

function updateProjectMode() {
  const projectEnabled = projectEnabledInput.checked;
  projectPicker.hidden = !projectEnabled;
  const hasProjectTarget = projectEnabled && projectSelect.value &&
    !["__empty__", "__manage__", "__refresh__"].includes(projectSelect.value);
  newProjectNameInput.hidden = !projectEnabled || projectSelect.value !== "__create__";
  projectSelect.hidden = !newProjectNameInput.hidden;
  resumeButton.disabled = hasProjectTarget || !hasLastChat;
  if (hasProjectTarget) selectChatMode("new");
  scheduleLayoutReport();
}

function renderProjectPicker(state, draft) {
  const availableIds = new Set(knownProjects.map((project) => project.id));
  let selected = projectSelect.value;
  if (draft) {
    selected = draft.projectMode === "create"
      ? "__create__"
      : availableIds.has(draft.selectedProjectId)
        ? draft.selectedProjectId
        : "";
    projectEnabledInput.checked = draft.projectEnabled === true;
    newProjectNameInput.value = typeof draft.newProjectName === "string" ? draft.newProjectName : "";
  }
  projectSelect.replaceChildren();
  const addOption = (value, label, disabled = false) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.disabled = disabled;
    projectSelect.append(option);
  };
  if (knownProjects.length === 0) addOption("__empty__", tr("noProjectsSynced"), true);
  for (const project of knownProjects) addOption(project.id, project.name);
  addOption("__create__", tr("createProject"));
  addOption("__refresh__", tr("refreshProjects"));
  addOption("__manage__", tr("manageProjects"));
  const fallbackValue = knownProjects[0]?.id || "__empty__";
  projectSelect.value = [...projectSelect.options].some((option) => option.value === selected)
    ? selected
    : fallbackValue;
  if (!["__refresh__", "__manage__"].includes(projectSelect.value)) lastProjectSelection = projectSelect.value;
  updateProjectMode();
}

function closeTools(notifyMain = true) {
  toolsOpen = false;
  toggleToolsButton.classList.remove("active");
  if (notifyMain) window.companionApi.setExpanded(false);
  scheduleLayoutReport();
}

function applyState(state) {
  if (!state || typeof state !== "object") return;
  language = translations[state.language] ? state.language : "fr";
  document.documentElement.classList.toggle("light", state.darkMode === false);
  currentItems = Array.isArray(state.items) ? state.items : [];
  knownProjects = Array.isArray(state.projects) ? state.projects : [];
  hasLastChat = state.hasLastChat === true;
  const noticeKey = ["captureError", "imageMissing"].includes(state.notice) ? state.notice : "";
  const notice = noticeKey ? tr(noticeKey) : typeof state.notice === "string" ? state.notice : "";
  const noticeId = Number.isInteger(state.noticeId) ? state.noticeId : 0;
  const draft = state.draft && typeof state.draft === "object" ? state.draft : null;
  const draftVersion = Number.isInteger(draft?.version) ? draft.version : -1;
  const hydrateDraft = draft && (lastDraftVersion < 0 || draftVersion > lastDraftVersion) ? draft : null;
  const firstHydration = lastDraftVersion < 0;
  if (hydrateDraft) {
    hydratingDraft = true;
    lastDraftVersion = draftVersion;
    promptInput.value = typeof draft.prompt === "string" ? draft.prompt : "";
    auditSecurityInput.checked = draft.securityAudit === true;
    auditQualityInput.checked = draft.qualityAudit === true;
    selectChatMode(draft.chatMode === "resume" ? "resume" : "new");
  }
  applyTranslations();
  renderProjectPicker(state, hydrateDraft);
  hydratingDraft = false;
  if (firstHydration) {
    setStatus();
    closeTools(false);
    requestAnimationFrame(() => promptInput.focus());
  }
  renderItems();
  if (state.projectScanProgress && state.projectScanProgress.phase !== "complete") {
    renderProjectProgress(state.projectScanProgress);
  }
  if (noticeId > lastNoticeId || notice !== lastNotice) {
    lastNoticeId = Math.max(lastNoticeId, noticeId);
    lastNotice = notice;
    setStatus(notice, notice ? "error" : "");
  }
  const transientStatus = state.transientStatus && typeof state.transientStatus === "object"
    ? state.transientStatus
    : null;
  const transientStatusId = Number.isInteger(transientStatus?.id) ? transientStatus.id : 0;
  if (transientStatusId > lastTransientStatusId) {
    lastTransientStatusId = transientStatusId;
    const key = ["captureError", "imageMissing"].includes(transientStatus?.key) ? transientStatus.key : "";
    const remainingMs = Number.isFinite(transientStatus?.expiresAt)
      ? transientStatus.expiresAt - Date.now()
      : 0;
    if (key && remainingMs > 0) {
      setTransientStatus(tr(key), "error", Math.min(3200, remainingMs));
      status.dataset.transientStatus = String(transientStatusId);
    } else if (status.dataset.transientStatus) {
      setStatus();
    }
  }
  scheduleLayoutReport();
}

document.querySelectorAll(".mode-button").forEach((button) => {
  button.addEventListener("click", () => {
    const projectSelected = projectEnabledInput.checked && knownProjects.some((project) => project.id === projectSelect.value);
    if (!projectSelected) {
      selectChatMode(button.dataset.mode);
      void persistDraft();
    }
  });
});

projectEnabledInput.addEventListener("change", () => {
  if (projectEnabledInput.checked) {
    const availableIds = new Set(knownProjects.map((project) => project.id));
    if (projectSelect.value === "__create__") {
      // Conserver une création de projet préparée pendant que le toggle était désactivé.
    } else if (availableIds.has(lastProjectSelection)) projectSelect.value = lastProjectSelection;
    else if (!availableIds.has(projectSelect.value)) projectSelect.value = knownProjects[0]?.id || "__empty__";
  } else if (knownProjects.some((project) => project.id === projectSelect.value)) {
    lastProjectSelection = projectSelect.value;
  }
  updateProjectMode();
  void persistDraft();
});

projectSelect.addEventListener("change", async () => {
  if (projectSelect.value === "__refresh__") {
    if (projectSyncing) return;
    const restoreSelection = lastProjectSelection;
    projectSyncing = true;
    projectSelect.disabled = true;
    setStatus(tr("projectsSyncing"));
    try {
      const result = await window.companionApi.syncProjects();
      projectSelect.value = restoreSelection;
      if (result?.state) applyState(result.state);
      const count = Array.isArray(result?.state?.projects) ? result.state.projects.length : knownProjects.length;
      setTransientStatus(
        result?.ok ? tr("projectsSyncedCount").replace("{count}", String(count)) : tr("projectsSyncError"),
        result?.ok ? "success" : "error",
      );
    } catch {
      projectSelect.value = restoreSelection;
      setTransientStatus(tr("projectsSyncError"), "error");
    } finally {
      projectSyncing = false;
      projectSelect.disabled = false;
      updateProjectMode();
    }
    return;
  }
  if (projectSelect.value === "__manage__") {
    window.companionApi.manageProjects();
    projectSelect.value = lastProjectSelection;
  } else {
    lastProjectSelection = projectSelect.value;
  }
  updateProjectMode();
  if (projectSelect.value !== "__manage__") void persistDraft();
  if (!newProjectNameInput.hidden) requestAnimationFrame(() => newProjectNameInput.focus());
});

promptInput.addEventListener("input", () => { void persistDraft(); });
auditSecurityInput.addEventListener("change", () => { void persistDraft(); });
auditQualityInput.addEventListener("change", () => { void persistDraft(); });
newProjectNameInput.addEventListener("input", () => { void persistDraft(); });

toggleToolsButton.addEventListener("pointerdown", (event) => {
  if (!toolsOpen) {
    return;
  }
  event.preventDefault();
  suppressNextToolsClick = true;
  closeTools();
});

toggleToolsButton.addEventListener("click", () => {
  if (suppressNextToolsClick) {
    suppressNextToolsClick = false;
    return;
  }
  toolsOpen = !toolsOpen;
  toggleToolsButton.classList.toggle("active", toolsOpen);
  window.companionApi.setExpanded(toolsOpen);
  scheduleLayoutReport();
});

document.addEventListener("pointerdown", (event) => {
  if (toolsOpen && !toggleToolsButton.contains(event.target)) {
    closeTools();
  }
});

document.querySelector("#close").addEventListener("click", () => window.companionApi.close());

previewClose.addEventListener("click", () => previewDialog.close());
previewDialog.addEventListener("click", (event) => {
  if (event.target === previewDialog) previewDialog.close();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && previewDialog.open) previewDialog.close();
});

prepareButton.addEventListener("click", async () => {
  setStatus();
  if (
    !promptInput.value.trim() &&
    currentItems.length === 0 &&
    !auditSecurityInput.checked &&
    !auditQualityInput.checked
  ) {
    setStatus(tr("emptyError"), "error");
    return;
  }
  if (projectEnabledInput.checked && projectSelect.value === "__create__" && !newProjectNameInput.value.trim()) {
    setStatus(tr("projectNameRequired"), "error");
    newProjectNameInput.focus();
    return;
  }
  prepareButton.disabled = true;
  setStatus(tr("preparing"));
  try {
    const persistedDraft = await persistDraft();
    const result = await window.companionApi.transfer({
      mode: selectedMode,
      prompt: promptInput.value,
      securityAudit: auditSecurityInput.checked,
      qualityAudit: auditQualityInput.checked,
      itemIds: currentItems.map((item) => item.id),
      projectId: projectEnabledInput.checked && knownProjects.some((project) => project.id === projectSelect.value) ? projectSelect.value : undefined,
      newProjectName: projectEnabledInput.checked && projectSelect.value === "__create__" ? newProjectNameInput.value.trim() : undefined,
      draftVersion: Number.isInteger(persistedDraft?.version) ? persistedDraft.version : lastDraftVersion,
    });
    if (!result?.ok) setStatus(result?.error || tr("transferError"), "error");
    else if (result.fallback) setStatus(result.error || tr("fallback"), "error");
  } catch {
    setStatus(tr("transferError"), "error");
  } finally {
    prepareButton.disabled = false;
  }
});

promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    prepareButton.click();
  }
});

for (const eventName of ["dragenter", "dragover"]) {
  document.body.addEventListener(eventName, (event) => { event.preventDefault(); });
}
document.body.addEventListener("drop", (event) => {
  event.preventDefault();
  const files = [...event.dataTransfer.files];
  if (files.length) window.companionApi.addDroppedFiles(files);
});

document.addEventListener("paste", (event) => {
  const clipboardData = event.clipboardData;
  if (!clipboardData) return;
  const types = [...clipboardData.types].map((type) => type.toLowerCase());
  const hasFilesOrImages =
    clipboardData.files.length > 0 ||
    types.some(
      (type) =>
        type === "files" ||
        type === "text/uri-list" ||
        type === "x-special/gnome-copied-files" ||
        type.startsWith("image/"),
    );
  if (!hasFilesOrImages) return;
  event.preventDefault();
  void window.companionApi.addClipboardImage();
});

window.companionApi.onState(applyState);
window.companionApi.onMenuVisibility((visible) => {
  toolsOpen = visible;
  toggleToolsButton.classList.toggle("active", visible);
  scheduleLayoutReport();
});
window.companionApi.onHidden(() => {
  if (previewDialog.open) previewDialog.close();
  closeTools(false);
});
window.companionApi.onProjectScanProgress(renderProjectProgress);
window.companionApi.getState().then((state) => {
  applyState(state);
  scheduleLayoutReport();
});
window.addEventListener("resize", scheduleLayoutReport);
