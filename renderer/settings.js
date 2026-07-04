const form = document.querySelector("#settings-form");
const shortcutInput = document.querySelector("#shortcut");
const searchShortcutInput = document.querySelector("#search-shortcut");
const searchNextShortcutInput = document.querySelector("#search-next-shortcut");
const searchPreviousShortcutInput = document.querySelector("#search-previous-shortcut");
const reloadShortcutInput = document.querySelector("#reload-shortcut");
const newTabShortcutInput = document.querySelector("#new-tab-shortcut");
const closeTabShortcutInput = document.querySelector("#close-tab-shortcut");
const nextTabShortcutInput = document.querySelector("#next-tab-shortcut");
const previousTabShortcutInput = document.querySelector("#previous-tab-shortcut");
const reopenTabShortcutInput = document.querySelector("#reopen-tab-shortcut");
const pullToRefreshEnabledInput = document.querySelector("#pull-to-refresh-enabled");
const tabBarModeInput = document.querySelector("#tab-bar-mode");
const restoreTabsOnStartupInput = document.querySelector("#restore-tabs-on-startup");
const lastTabCloseBehaviorInput = document.querySelector("#last-tab-close-behavior");
const companionEnabledInput = document.querySelector("#companion-enabled");
const companionShortcutInput = document.querySelector("#companion-shortcut");
const companionPromptMaxLinesInput = document.querySelector("#companion-prompt-max-lines");
const themeModeInput = document.querySelector("#theme-mode");
const responseNotificationsInput = document.querySelector("#response-notifications");
const closeBehaviorInput = document.querySelector("#close-behavior");
const closeBehaviorHint = document.querySelector("#close-behavior-hint");
const launchAtLoginInput = document.querySelector("#launch-at-login");
const languageInput = document.querySelector("#language");
const windowDisplayModeInput = document.querySelector("#window-display-mode");
const displayServerModeInput = document.querySelector("#display-server-mode");
const rememberWindowPositionInput = document.querySelector("#remember-window-position");
const widthInput = document.querySelector("#default-width");
const heightInput = document.querySelector("#default-height");
const saveButton = document.querySelector("#save");
const cancelButton = document.querySelector("#cancel");
const resetWindowButton = document.querySelector("#reset-window");
const resetSessionButton = document.querySelector("#reset-session");
const status = document.querySelector("#status");
const shortcutStatus = document.querySelector("#shortcut-status");
const companionShortcutStatus = document.querySelector("#companion-shortcut-status");
const displayModeHint = document.querySelector("#display-mode-hint");
const positionMemoryStatus = document.querySelector("#position-memory-status");
const fallbackCommand = document.querySelector("#fallback-command");
const companionFallbackCommand = document.querySelector("#companion-fallback-command");
const logPath = document.querySelector("#log-path");
const copyLogFileButton = document.querySelector("#copy-log-file");
const copyLogTailButton = document.querySelector("#copy-log-tail");
const clearLogButton = document.querySelector("#clear-log");
const scanProjectsButton = document.querySelector("#scan-projects");
const resetProjectsButton = document.querySelector("#reset-projects");
const projectSyncStatus = document.querySelector("#project-sync-status");
const defaultProjectInput = document.querySelector("#default-project");
const toggleProjectListButton = document.querySelector("#toggle-project-list");
const projectListPanel = document.querySelector("#project-list-panel");
const projectList = document.querySelector("#project-list");
const projectListEmpty = document.querySelector("#project-list-empty");

let shortcut = "Ctrl+Alt+G";
let companionShortcut = "Ctrl+Shift+Space";
let searchShortcut = "Ctrl+F";
let searchNextShortcut = "Enter";
let searchPreviousShortcut = "Shift+Enter";
let reloadShortcut = "F5";
let newTabShortcut = "Ctrl+T";
let closeTabShortcut = "Ctrl+W";
let nextTabShortcut = "Ctrl+Tab";
let previousTabShortcut = "Ctrl+Shift+Tab";
let reopenTabShortcut = "Ctrl+Shift+T";
let activeUiLanguage = "fr";
let storedLanguage = "fr";
let shortcutCaptureTarget = null;
let currentProjects = [];
let projectsExpanded = false;

function applySettingsTheme(state) {
  const darkMode = typeof state === "boolean" ? state : state?.darkMode;
  if (typeof darkMode !== "boolean") return;
  document.documentElement.classList.toggle("light", !darkMode);
}

const translations = {
  fr: {
    settingsTitle: "Paramètres", behaviorTitle: "Comportement",
    languageLabel: "Langue de l’application et de ChatGPT",
    languageHint: "Le changement nécessite un redémarrage de l’application.",
    shortcutLabel: "Raccourci global",
    shortcutHint: "Cliquez dans le champ puis pressez la nouvelle combinaison.",
    searchTitle: "Recherche dans la conversation", searchShortcutLabel: "Ouvrir la recherche",
    searchNextShortcutLabel: "Résultat suivant", searchPreviousShortcutLabel: "Résultat précédent",
    searchShortcutHint: "La recherche se met à jour à chaque lettre ; ces raccourcis fonctionnent dans la fenêtre ChatGPT.",
    tabsTitle: "Navigation et onglets", pullToRefreshLabel: "Activer « tirer pour actualiser »",
    pullToRefreshHint: "Geste précis du pavé tactile, uniquement lorsque la page est tout en haut.",
    tabBarModeLabel: "Visibilité de la barre d’onglets", tabBarAuto: "Automatique", tabBarAlways: "Toujours visible", tabBarHidden: "Toujours cachée",
    tabBarModeHint: "En automatique, la barre apparaît à partir de deux onglets.",
    restoreTabsLabel: "Restaurer les onglets au démarrage", restoreTabsHint: "Seules les URLs ChatGPT et l’ordre sont conservés, jamais les brouillons.",
    lastTabBehaviorLabel: "Fermeture du dernier onglet", lastTabHome: "Revenir à l’accueil ChatGPT", lastTabHide: "Cacher la fenêtre", lastTabIgnore: "Ignorer la fermeture",
    reloadShortcutLabel: "Actualiser", newTabShortcutLabel: "Nouvel onglet", closeTabShortcutLabel: "Fermer l’onglet",
    nextTabShortcutLabel: "Onglet suivant", previousTabShortcutLabel: "Onglet précédent", reopenTabShortcutLabel: "Rouvrir le dernier fermé",
    fixedTabShortcutsHint: "Ctrl+1 à Ctrl+8 sélectionnent un onglet ; Ctrl+9 sélectionne le dernier.",
    companionTitle: "Magic Bar", companionEnabledLabel: "Activer la Magic Bar",
    companionEnabledHint: "Ouvre une barre locale pour préparer du texte, des fichiers et des captures avant de les envoyer.",
    companionShortcutLabel: "Raccourci de la Magic Bar", companionShortcutHint: "Par défaut : Ctrl+Shift+Space.",
    companionPromptLinesLabel: "Lignes maximales du message", companionPromptLinesHint: "La barre grandit jusqu’à cette limite, puis le message défile. Par défaut : 3.",
    responseNotificationsLabel: "Notifier à la fin d’une réponse",
    responseNotificationsHint: "Uniquement lorsque la fenêtre ChatGPT est cachée, réduite ou sans focus.",
    themeModeLabel: "Thème global", themeSystem: "Automatique (système)", themeLight: "Clair", themeDark: "Sombre",
    themeModeHint: "Appliqué à ChatGPT, la Magic Bar et aux paramètres. Le mode automatique suit KDE sans redémarrage.",
    companionFallback: "Commande de secours de la Magic Bar",
    closeLabel: "Quand je ferme la fenêtre", closeHide: "Cacher dans la zone de notification", closeHideTaskbar: "Réduire dans la barre des tâches",
    closeQuit: "Quitter complètement", autostartLabel: "Lancer à la connexion",
    closeHintTray: "La fenêtre est cachée et reste accessible depuis la zone de notification.",
    closeHintTaskbar: "Sans icône tray, fermer avec X réduit la fenêtre dans la barre des tâches.",
    closeHintQuit: "Fermer avec X quitte complètement l’application.",
    autostartHint: "Démarre discrètement selon le mode d’affichage choisi.",
    windowDisplayModeLabel: "Présence de l’application", windowDisplayTray: "Zone de notification seulement",
    windowDisplayTaskbar: "Barre des tâches seulement", windowDisplayBoth: "Les deux",
    windowDisplayModeHint: "En mode barre des tâches seulement, fermer avec X réduit la fenêtre afin qu’elle reste accessible.",
    windowTitle: "Fenêtre", displayModeLabel: "Serveur d’affichage", x11Mode: "X11/XWayland", waylandNative: "Wayland natif",
    rememberPositionLabel: "Mémoriser l’emplacement de la fenêtre",
    rememberPositionHint: "Demande à KWin de restaurer la dernière position connue après le masquage dans le tray.",
    widthLabel: "Largeur", heightLabel: "Hauteur", resetWindow: "Recentrer et rétablir cette taille",
    diagnosticsTitle: "Diagnostic", logLabel: "Journal",
    copyLogFile: "Copier le fichier journal", copyLogTail: "Copier les 100 dernières lignes", clearLog: "Vider le journal…",
    logFileCopied: "Fichier journal copié.", logTailCopied: "100 dernières lignes copiées.", logCleared: "Journal vidé.",
    confirmClearLog: "Vider entièrement le fichier journal ?", logActionError: "Opération sur le journal impossible.",
    sessionTitle: "Session locale",
    sessionHint: "Efface les cookies et le cache de ChatGPT, puis vous déconnecte.",
    resetSession: "Réinitialiser la session…", closeButton: "Fermer", saveButton: "Enregistrer",
    shortcutActive: "Actif", shortcutUnavailable: "Indisponible dans la session actuelle. Utilisez la commande de secours ci-dessous.",
    companionShortcutActive: "Raccourci de la Magic Bar actif", companionShortcutUnavailable: "Raccourci de la Magic Bar indisponible.",
    positionAvailable: "Intégration KWin disponible.", positionUnavailable: "Intégration KWin indisponible dans la session actuelle.",
    fallback: "Commande de secours", displayHint: "Wayland natif est utilisé pour la stabilité sous KDE Plasma.",
    pressCombination: "Pressez une combinaison…", saving: "Enregistrement…", saved: "Paramètres enregistrés.",
    saveError: "Impossible d’enregistrer les paramètres.",
    restartPrompt: "La langue a changé. Redémarrer l’application maintenant pour l’appliquer à ChatGPT et aux paramètres ?",
    restartLater: "Langue enregistrée. Elle sera appliquée au prochain redémarrage.",
    windowReset: "Taille réinitialisée ; KDE gère la position sous Wayland.",
    sessionReset: "Session réinitialisée.", resetCancelled: "Réinitialisation annulée.", loadError: "Impossible de charger les paramètres.",
  },
  en: {
    settingsTitle: "Settings", behaviorTitle: "Behavior", languageLabel: "Application and ChatGPT language",
    languageHint: "Changing the language requires restarting the application.", shortcutLabel: "Global shortcut",
    shortcutHint: "Click the field, then press the new key combination.", closeLabel: "When I close the window",
    searchTitle: "Find in conversation", searchShortcutLabel: "Open search",
    searchNextShortcutLabel: "Next result", searchPreviousShortcutLabel: "Previous result",
    searchShortcutHint: "Search updates with every typed character; these shortcuts work inside the ChatGPT window.",
    tabsTitle: "Navigation and tabs", pullToRefreshLabel: "Enable pull to refresh",
    pullToRefreshHint: "Precise touchpad gesture, only when the page is already at the top.",
    tabBarModeLabel: "Tab bar visibility", tabBarAuto: "Automatic", tabBarAlways: "Always visible", tabBarHidden: "Always hidden",
    tabBarModeHint: "In automatic mode, the bar appears from two tabs.",
    restoreTabsLabel: "Restore tabs on startup", restoreTabsHint: "Only ChatGPT URLs and order are stored, never drafts.",
    lastTabBehaviorLabel: "Closing the last tab", lastTabHome: "Return to ChatGPT home", lastTabHide: "Hide the window", lastTabIgnore: "Ignore closing",
    reloadShortcutLabel: "Reload", newTabShortcutLabel: "New tab", closeTabShortcutLabel: "Close tab",
    nextTabShortcutLabel: "Next tab", previousTabShortcutLabel: "Previous tab", reopenTabShortcutLabel: "Reopen last closed",
    fixedTabShortcutsHint: "Ctrl+1 through Ctrl+8 select a tab; Ctrl+9 selects the last one.",
    companionTitle: "Companion", companionEnabledLabel: "Enable quick companion",
    companionEnabledHint: "Opens a local popup to prepare text, files and screenshots before transferring them.",
    companionShortcutLabel: "Companion shortcut", companionShortcutHint: "Default: Ctrl+Shift+Space.",
    companionPromptLinesLabel: "Maximum message lines", companionPromptLinesHint: "The bar grows to this limit, then the message scrolls. Default: 3.",
    responseNotificationsLabel: "Notify when a response finishes",
    responseNotificationsHint: "Only when the ChatGPT window is hidden, minimized, or unfocused.",
    themeModeLabel: "Global theme", themeSystem: "Automatic (system)", themeLight: "Light", themeDark: "Dark",
    themeModeHint: "Applied to ChatGPT, the Magic Bar and Settings. Automatic mode follows KDE without restarting.",
    companionFallback: "Companion fallback command",
    closeHide: "Hide in the system tray", closeHideTaskbar: "Minimize to the taskbar", closeQuit: "Quit completely", autostartLabel: "Launch at login",
    closeHintTray: "The window is hidden and remains available from the system tray.",
    closeHintTaskbar: "Without a tray icon, closing with X minimizes the window to the taskbar.",
    closeHintQuit: "Closing with X quits the application completely.",
    autostartHint: "Starts quietly using the selected display mode.",
    windowDisplayModeLabel: "Application presence", windowDisplayTray: "System tray only",
    windowDisplayTaskbar: "Taskbar only", windowDisplayBoth: "Both",
    windowDisplayModeHint: "In taskbar-only mode, closing with X minimizes the window so it remains accessible.",
    windowTitle: "Window", displayModeLabel: "Display server",
    x11Mode: "X11/XWayland", waylandNative: "Native Wayland", rememberPositionLabel: "Remember window position",
    rememberPositionHint: "Asks KWin to restore the last known position after hiding to the tray.",
    widthLabel: "Width", heightLabel: "Height", resetWindow: "Recenter and restore this size",
    diagnosticsTitle: "Diagnostics", logLabel: "Log",
    copyLogFile: "Copy log file", copyLogTail: "Copy last 100 lines", clearLog: "Clear log…",
    logFileCopied: "Log file copied.", logTailCopied: "Last 100 lines copied.", logCleared: "Log cleared.",
    confirmClearLog: "Clear the entire log file?", logActionError: "Log operation failed.",
    sessionTitle: "Local session",
    sessionHint: "Clears ChatGPT cookies and cache, then signs you out.", resetSession: "Reset session…",
    closeButton: "Close", saveButton: "Save", shortcutActive: "Active",
    shortcutUnavailable: "Unavailable in the current session. Use the fallback command below.",
    companionShortcutActive: "Companion shortcut active", companionShortcutUnavailable: "Companion shortcut unavailable.",
    positionAvailable: "KWin integration available.", positionUnavailable: "KWin integration unavailable in the current session.",
    fallback: "Fallback command", displayHint: "Native Wayland is used for stability on KDE Plasma.",
    pressCombination: "Press a key combination…", saving: "Saving…", saved: "Settings saved.",
    saveError: "Unable to save settings.",
    restartPrompt: "The language changed. Restart the application now to apply it to ChatGPT and Settings?",
    restartLater: "Language saved. It will be applied on the next restart.",
    windowReset: "Size reset; KDE manages position on Wayland.", sessionReset: "Session reset.",
    resetCancelled: "Reset cancelled.", loadError: "Unable to load settings.",
  },
  es: {
    settingsTitle: "Ajustes", behaviorTitle: "Comportamiento", languageLabel: "Idioma de la aplicación y ChatGPT",
    languageHint: "Cambiar el idioma requiere reiniciar la aplicación.", shortcutLabel: "Atajo global",
    shortcutHint: "Haz clic en el campo y pulsa la nueva combinación.", closeLabel: "Al cerrar la ventana",
    searchTitle: "Buscar en la conversación", searchShortcutLabel: "Abrir la búsqueda",
    searchNextShortcutLabel: "Resultado siguiente", searchPreviousShortcutLabel: "Resultado anterior",
    searchShortcutHint: "La búsqueda se actualiza con cada carácter; estos atajos funcionan dentro de la ventana de ChatGPT.",
    tabsTitle: "Navegación y pestañas", pullToRefreshLabel: "Activar tirar para actualizar",
    pullToRefreshHint: "Gesto preciso del panel táctil, solo cuando la página está arriba.",
    tabBarModeLabel: "Visibilidad de la barra de pestañas", tabBarAuto: "Automática", tabBarAlways: "Siempre visible", tabBarHidden: "Siempre oculta",
    tabBarModeHint: "En modo automático, la barra aparece a partir de dos pestañas.",
    restoreTabsLabel: "Restaurar pestañas al iniciar", restoreTabsHint: "Solo se guardan las URLs de ChatGPT y el orden, nunca los borradores.",
    lastTabBehaviorLabel: "Cerrar la última pestaña", lastTabHome: "Volver al inicio de ChatGPT", lastTabHide: "Ocultar la ventana", lastTabIgnore: "Ignorar el cierre",
    reloadShortcutLabel: "Actualizar", newTabShortcutLabel: "Nueva pestaña", closeTabShortcutLabel: "Cerrar pestaña",
    nextTabShortcutLabel: "Pestaña siguiente", previousTabShortcutLabel: "Pestaña anterior", reopenTabShortcutLabel: "Reabrir la última cerrada",
    fixedTabShortcutsHint: "Ctrl+1 a Ctrl+8 seleccionan una pestaña; Ctrl+9 selecciona la última.",
    companionTitle: "Asistente", companionEnabledLabel: "Activar el asistente rápido",
    companionEnabledHint: "Abre un popup local para preparar texto, archivos y capturas antes de transferirlos.",
    companionShortcutLabel: "Atajo del asistente", companionShortcutHint: "Predeterminado: Ctrl+Shift+Space.",
    companionPromptLinesLabel: "Líneas máximas del mensaje", companionPromptLinesHint: "La barra crece hasta este límite y después el mensaje se desplaza. Predeterminado: 3.",
    responseNotificationsLabel: "Notificar al terminar una respuesta",
    responseNotificationsHint: "Solo cuando la ventana de ChatGPT está oculta, minimizada o sin foco.",
    themeModeLabel: "Tema global", themeSystem: "Automático (sistema)", themeLight: "Claro", themeDark: "Oscuro",
    themeModeHint: "Se aplica a ChatGPT, Magic Bar y Ajustes. El modo automático sigue KDE sin reiniciar.",
    companionFallback: "Comando alternativo del asistente",
    closeHide: "Ocultar en la bandeja del sistema", closeHideTaskbar: "Minimizar en la barra de tareas", closeQuit: "Salir completamente", autostartLabel: "Iniciar al entrar",
    closeHintTray: "La ventana se oculta y sigue accesible desde la bandeja del sistema.",
    closeHintTaskbar: "Sin icono de bandeja, cerrar con X minimiza la ventana en la barra de tareas.",
    closeHintQuit: "Cerrar con X sale completamente de la aplicación.",
    autostartHint: "Se inicia discretamente según el modo de visualización elegido.",
    windowDisplayModeLabel: "Presencia de la aplicación", windowDisplayTray: "Solo bandeja del sistema",
    windowDisplayTaskbar: "Solo barra de tareas", windowDisplayBoth: "Ambas",
    windowDisplayModeHint: "En modo solo barra de tareas, cerrar con X minimiza la ventana para mantenerla accesible.",
    windowTitle: "Ventana", displayModeLabel: "Servidor de pantalla",
    x11Mode: "X11/XWayland", waylandNative: "Wayland nativo", rememberPositionLabel: "Recordar la posición de la ventana",
    rememberPositionHint: "Pide a KWin restaurar la última posición conocida después de ocultarla en la bandeja.",
    widthLabel: "Anchura", heightLabel: "Altura", resetWindow: "Centrar y restaurar este tamaño",
    diagnosticsTitle: "Diagnóstico", logLabel: "Registro",
    copyLogFile: "Copiar archivo de registro", copyLogTail: "Copiar las últimas 100 líneas", clearLog: "Vaciar registro…",
    logFileCopied: "Archivo de registro copiado.", logTailCopied: "Últimas 100 líneas copiadas.", logCleared: "Registro vaciado.",
    confirmClearLog: "¿Vaciar completamente el archivo de registro?", logActionError: "No se pudo operar sobre el registro.",
    sessionTitle: "Sesión local",
    sessionHint: "Borra las cookies y la caché de ChatGPT y cierra la sesión.", resetSession: "Restablecer sesión…",
    closeButton: "Cerrar", saveButton: "Guardar", shortcutActive: "Activo",
    shortcutUnavailable: "No disponible en la sesión actual. Usa el comando alternativo de abajo.",
    companionShortcutActive: "Atajo del asistente activo", companionShortcutUnavailable: "Atajo del asistente no disponible.",
    positionAvailable: "Integración con KWin disponible.", positionUnavailable: "Integración con KWin no disponible en la sesión actual.",
    fallback: "Comando alternativo", displayHint: "Wayland nativo se utiliza para la estabilidad en KDE Plasma.",
    pressCombination: "Pulsa una combinación…", saving: "Guardando…", saved: "Ajustes guardados.",
    saveError: "No se pudieron guardar los ajustes.",
    restartPrompt: "El idioma ha cambiado. ¿Reiniciar ahora para aplicarlo a ChatGPT y a los ajustes?",
    restartLater: "Idioma guardado. Se aplicará en el próximo reinicio.",
    windowReset: "Tamaño restablecido; KDE gestiona la posición en Wayland.", sessionReset: "Sesión restablecida.",
    resetCancelled: "Restablecimiento cancelado.", loadError: "No se pudieron cargar los ajustes.",
  },
};

const projectTranslations = {
  fr: {
    projectsTitle: "Projets ChatGPT", experimental: "Expérimental",
    projectsHint: "Cache local utilisé par la Magic Bar, actualisé sur demande et automatiquement toutes les cinq minutes.",
    syncProjects: "Synchroniser automatiquement depuis ChatGPT", projectsSynced: "Projets synchronisés.", projectsSyncedCount: "{count} projets synchronisés.",
    projectsInCache: "{count} projet(s) dans le cache local.", showProjects: "Afficher les projets ({count})", hideProjects: "Masquer les projets ({count})",
    defaultProject: "Projet par défaut dans la Magic Bar", noDefaultProject: "Aucun / ChatGPT normal",
    noProjects: "Aucun projet dans le cache local.",
    projectsDomWarning: "La synchronisation ouvre automatiquement la sidebar et la section Projets. Elle repose sur l’interface de chatgpt.com, pas sur une API officielle.",
    rename: "Renommer", remove: "Supprimer", neverSynced: "Aucune synchronisation effectuée.",
    syncing: "Synchronisation en cours…", projectRemoved: "Projet supprimé du cache.",
    syncLoading: "Chargement du scanner…", syncDiscovering: "Détection des projets…", syncSaving: "Enregistrement…", approximately: "environ",
    projectRenamed: "Nom local enregistré.", defaultSaved: "Projet par défaut enregistré.",
    projectActionError: "Opération projet impossible.",
    confirmRemoveProject: "Supprimer ce projet du cache local ?", pinned: "Épinglé", source: "Source", updated: "Mis à jour",
    resetProjects: "Réinitialiser tous les projets…",
    resetProjectsHint: "La réinitialisation vide uniquement le cache local ; elle ne supprime aucun projet sur ChatGPT.",
    confirmResetProjects: "Vider entièrement le cache local des projets ? Les projets ChatGPT eux-mêmes ne seront pas supprimés.",
    projectsReset: "Cache local des projets réinitialisé.",
  },
  en: {
    projectsTitle: "ChatGPT Projects", experimental: "Experimental",
    projectsHint: "Local cache used by the Magic Bar, refreshed on request and automatically every five minutes.",
    syncProjects: "Sync automatically from ChatGPT", projectsSynced: "Projects synchronized.", projectsSyncedCount: "{count} projects synchronized.",
    projectsInCache: "{count} project(s) in the local cache.", showProjects: "Show projects ({count})", hideProjects: "Hide projects ({count})",
    defaultProject: "Default project in the Magic Bar", noDefaultProject: "None / regular ChatGPT",
    noProjects: "No project in the local cache.",
    projectsDomWarning: "Synchronization automatically opens the sidebar and Projects section. It uses the chatgpt.com interface, not an official API.",
    rename: "Rename", remove: "Remove", neverSynced: "No synchronization performed.",
    syncing: "Synchronization in progress…", projectRemoved: "Project removed from the cache.",
    syncLoading: "Loading scanner…", syncDiscovering: "Detecting projects…", syncSaving: "Saving…", approximately: "about",
    projectRenamed: "Local name saved.", defaultSaved: "Default project saved.",
    projectActionError: "Project operation failed.",
    confirmRemoveProject: "Remove this project from the local cache?", pinned: "Pinned", source: "Source", updated: "Updated",
    resetProjects: "Reset all projects…",
    resetProjectsHint: "Resetting only clears the local cache; it does not delete any project from ChatGPT.",
    confirmResetProjects: "Clear the entire local project cache? The ChatGPT projects themselves will not be deleted.",
    projectsReset: "Local project cache reset.",
  },
  es: {
    projectsTitle: "Proyectos ChatGPT", experimental: "Experimental",
    projectsHint: "Caché local usada por Magic Bar, actualizada bajo demanda y automáticamente cada cinco minutos.",
    syncProjects: "Sincronizar automáticamente desde ChatGPT", projectsSynced: "Proyectos sincronizados.", projectsSyncedCount: "{count} proyectos sincronizados.",
    projectsInCache: "{count} proyecto(s) en la caché local.", showProjects: "Mostrar proyectos ({count})", hideProjects: "Ocultar proyectos ({count})",
    defaultProject: "Proyecto predeterminado en Magic Bar", noDefaultProject: "Ninguno / ChatGPT normal",
    noProjects: "No hay proyectos en la caché local.",
    projectsDomWarning: "La sincronización abre automáticamente la barra lateral y la sección Proyectos. Usa la interfaz de chatgpt.com, no una API oficial.",
    rename: "Renombrar", remove: "Eliminar", neverSynced: "No se ha sincronizado.",
    syncing: "Sincronización en curso…", projectRemoved: "Proyecto eliminado de la caché.",
    syncLoading: "Cargando escáner…", syncDiscovering: "Detectando proyectos…", syncSaving: "Guardando…", approximately: "aproximadamente",
    projectRenamed: "Nombre local guardado.", defaultSaved: "Proyecto predeterminado guardado.",
    projectActionError: "No se pudo completar la operación.",
    confirmRemoveProject: "¿Eliminar este proyecto de la caché local?", pinned: "Fijado", source: "Origen", updated: "Actualizado",
    resetProjects: "Restablecer todos los proyectos…",
    resetProjectsHint: "El restablecimiento solo vacía la caché local; no elimina ningún proyecto de ChatGPT.",
    confirmResetProjects: "¿Vaciar toda la caché local de proyectos? Los proyectos de ChatGPT no se eliminarán.",
    projectsReset: "Caché local de proyectos restablecida.",
  },
};

function tr(key) {
  return translations[activeUiLanguage]?.[key] || projectTranslations[activeUiLanguage]?.[key] || translations.fr[key] || projectTranslations.fr[key] || key;
}

function applyTranslations(language) {
  activeUiLanguage = translations[language] ? language : "fr";
  document.documentElement.lang = activeUiLanguage;
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = tr(element.dataset.i18n);
  });
  updateProjectListVisibility();
}

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = kind;
}

function formatProjectDate(value) {
  if (!value || Number.isNaN(Date.parse(value))) return "—";
  return new Intl.DateTimeFormat(activeUiLanguage, { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function renderProjectSync(sync = { status: "never" }, projectCount = currentProjects.length) {
  if (!sync || sync.status === "never") {
    projectSyncStatus.textContent = `${tr("neverSynced")} · ${tr("projectsInCache").replace("{count}", String(projectCount))}`;
    projectSyncStatus.className = "runtime-status";
    return;
  }
  const detail = sync.status === "error" && sync.message
    ? sync.message
    : tr("projectsInCache").replace("{count}", String(projectCount));
  projectSyncStatus.textContent = `${String(sync.status).toUpperCase()} · ${formatProjectDate(sync.at)} · ${detail}`;
  projectSyncStatus.className = `runtime-status ${sync.status === "ok" ? "success" : "error"}`;
}

function updateProjectListVisibility() {
  if (currentProjects.length === 0) projectsExpanded = false;
  projectListPanel.hidden = !projectsExpanded;
  toggleProjectListButton.disabled = currentProjects.length === 0;
  toggleProjectListButton.setAttribute("aria-expanded", String(projectsExpanded));
  toggleProjectListButton.textContent = tr(projectsExpanded ? "hideProjects" : "showProjects")
    .replace("{count}", String(currentProjects.length));
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
  scanProjectsButton.disabled = active;
  resetProjectsButton.disabled = active;
  if (progress.phase === "loading") projectSyncStatus.textContent = tr("syncLoading");
  else if (progress.phase === "discovering") projectSyncStatus.textContent = tr("syncDiscovering");
  else if (progress.phase === "saving") projectSyncStatus.textContent = tr("syncSaving");
  else if (progress.phase === "scanning") {
    const eta = formatEta(progress.etaMs);
    projectSyncStatus.textContent = `${tr("syncing")} ${progress.percent || 0} % · ${progress.completed || 0}/${progress.total || 0}${eta ? ` · ${tr("approximately")} ${eta}` : ""}`;
  } else if (progress.phase === "complete" && progress.total > 0) {
    projectSyncStatus.textContent = tr("projectsSyncedCount").replace("{count}", String(progress.successes || 0));
    projectSyncStatus.className = `runtime-status ${progress.failures ? "error" : "success"}`;
    window.desktopApi.getSettings().then(fillForm).catch(() => {});
  }
  if (active) projectSyncStatus.className = "runtime-status";
}

function renderProjects(settings) {
  currentProjects = Array.isArray(settings.chatGptProjects) ? settings.chatGptProjects : [];
  projectList.replaceChildren();
  projectListEmpty.hidden = currentProjects.length > 0;

  defaultProjectInput.replaceChildren();
  const noDefault = document.createElement("option");
  noDefault.value = "";
  noDefault.textContent = tr("noDefaultProject");
  defaultProjectInput.append(noDefault);
  for (const project of currentProjects) {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    defaultProjectInput.append(option);

    const row = document.createElement("article");
    row.className = "project-row";
    const header = document.createElement("div");
    header.className = "project-row-header";
    const nameInput = document.createElement("input");
    nameInput.type = "text";
    nameInput.maxLength = 120;
    nameInput.value = project.name;
    const actions = document.createElement("div");
    actions.className = "project-row-actions";
    const rename = document.createElement("button");
    rename.type = "button";
    rename.className = "secondary";
    rename.textContent = tr("rename");
    rename.addEventListener("click", async () => {
      const result = await window.desktopApi.renameProject(project.id, nameInput.value);
      if (result?.ok) { fillForm(result); setStatus(tr("projectRenamed"), "success"); }
      else setStatus(result?.error || tr("projectActionError"), "error");
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = tr("remove");
    remove.addEventListener("click", async () => {
      if (!window.confirm(tr("confirmRemoveProject"))) return;
      const result = await window.desktopApi.removeProject(project.id);
      if (result?.ok) { fillForm(result); setStatus(tr("projectRemoved"), "success"); }
      else setStatus(result?.error || tr("projectActionError"), "error");
    });
    actions.append(rename, remove);
    header.append(nameInput, actions);
    const url = document.createElement("div");
    url.className = "project-url";
    url.textContent = project.url;
    const meta = document.createElement("div");
    meta.className = "project-meta";
    meta.textContent = `${project.pinned === true ? `${tr("pinned")} · ` : ""}${tr("source")} : ${project.source} · ${tr("updated")} : ${formatProjectDate(project.lastSyncedAt)}`;
    row.append(header, url, meta);
    projectList.append(row);
  }
  defaultProjectInput.value = settings.defaultChatGptProjectId || "";
  updateProjectListVisibility();
  renderProjectSync(settings.projectSyncStatus, currentProjects.length);
}

function fillForm(payload) {
  const settings = payload.settings || payload;
  const runtime = payload.runtime;
  applySettingsTheme(runtime);
  shortcut = settings.globalShortcut;
  shortcutInput.value = shortcut;
  searchShortcut = settings.searchShortcut;
  searchNextShortcut = settings.searchNextShortcut;
  searchPreviousShortcut = settings.searchPreviousShortcut;
  searchShortcutInput.value = searchShortcut;
  searchNextShortcutInput.value = searchNextShortcut;
  searchPreviousShortcutInput.value = searchPreviousShortcut;
  reloadShortcut = settings.reloadShortcut || "F5";
  newTabShortcut = settings.newTabShortcut || "Ctrl+T";
  closeTabShortcut = settings.closeTabShortcut || "Ctrl+W";
  nextTabShortcut = settings.nextTabShortcut || "Ctrl+Tab";
  previousTabShortcut = settings.previousTabShortcut || "Ctrl+Shift+Tab";
  reopenTabShortcut = settings.reopenClosedTabShortcut || "Ctrl+Shift+T";
  reloadShortcutInput.value = reloadShortcut;
  newTabShortcutInput.value = newTabShortcut;
  closeTabShortcutInput.value = closeTabShortcut;
  nextTabShortcutInput.value = nextTabShortcut;
  previousTabShortcutInput.value = previousTabShortcut;
  reopenTabShortcutInput.value = reopenTabShortcut;
  pullToRefreshEnabledInput.checked = settings.pullToRefreshEnabled === true;
  tabBarModeInput.value = settings.tabBarMode || "auto";
  restoreTabsOnStartupInput.checked = settings.restoreTabsOnStartup === true;
  lastTabCloseBehaviorInput.value = settings.lastTabCloseBehavior || "home";
  companionShortcut = settings.companionShortcut;
  companionShortcutInput.value = companionShortcut;
  companionEnabledInput.checked = settings.companionEnabled;
  companionPromptMaxLinesInput.value = String(settings.companionPromptMaxLines || 3);
  themeModeInput.value = settings.themeMode || "system";
  responseNotificationsInput.checked = settings.responseNotificationsEnabled;
  closeBehaviorInput.value = settings.closeBehavior;
  windowDisplayModeInput.value = settings.windowDisplayMode;
  launchAtLoginInput.checked = settings.launchAtLogin;
  languageInput.value = settings.language;
  storedLanguage = settings.language;
  displayServerModeInput.value = settings.displayServerMode;
  rememberWindowPositionInput.checked = settings.rememberWindowPosition;
  widthInput.value = String(settings.defaultWidth);
  heightInput.value = String(settings.defaultHeight);

  if (runtime) {
    applyTranslations(runtime.activeLanguage);
    shortcutStatus.textContent = runtime.shortcutRegistered
      ? `${tr("shortcutActive")} : ${settings.globalShortcut}`
      : tr("shortcutUnavailable");
    shortcutStatus.className = `runtime-status ${runtime.shortcutRegistered ? "success" : "error"}`;
    companionShortcutStatus.textContent = runtime.companionShortcutRegistered
      ? `${tr("companionShortcutActive")} : ${settings.companionShortcut}`
      : tr("companionShortcutUnavailable");
    companionShortcutStatus.className =
      `runtime-status ${runtime.companionShortcutRegistered ? "success" : "error"}`;
    positionMemoryStatus.textContent = runtime.positionMemoryAvailable
      ? tr("positionAvailable")
      : tr("positionUnavailable");
    positionMemoryStatus.className =
      `runtime-status ${runtime.positionMemoryAvailable ? "success" : "error"}`;
    fallbackCommand.textContent = `${tr("fallback")} : ${runtime.fallbackCommand}`;
    companionFallbackCommand.textContent = runtime.companionFallbackCommand;
    logPath.textContent = runtime.logFilePath;
  }

  renderProjects(settings);
  if (runtime?.projectScanProgress && runtime.projectScanProgress.phase !== "complete") {
    renderProjectProgress(runtime.projectScanProgress);
  }

  updateDisplayModeHint();
  updateCloseBehaviorHint();
}

function updateDisplayModeHint() {
  displayModeHint.textContent =
    tr("displayHint");
}

function updateCloseBehaviorHint() {
  const hideOption = closeBehaviorInput.querySelector('option[value="hide"]');
  if (hideOption) {
    hideOption.textContent = tr(windowDisplayModeInput.value === "taskbar" ? "closeHideTaskbar" : "closeHide");
  }
  closeBehaviorHint.textContent =
    closeBehaviorInput.value === "quit"
      ? tr("closeHintQuit")
      : windowDisplayModeInput.value === "taskbar"
        ? tr("closeHintTaskbar")
        : tr("closeHintTray");
}

function acceleratorKey(event) {
  if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) {
    return null;
  }

  const aliases = {
    " ": "Space",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    "+": "Plus",
  };
  if (aliases[event.key]) {
    return aliases[event.key];
  }
  if (/^F([1-9]|1[0-9]|2[0-4])$/.test(event.key)) {
    return event.key;
  }
  if (event.key.length === 1 && /[a-z0-9]/i.test(event.key)) {
    return event.key.toUpperCase();
  }
  if (["Enter", "Tab", "Backspace", "Delete", "Insert", "Home", "End", "PageUp", "PageDown"].includes(event.key)) {
    return event.key;
  }
  return null;
}

function bindShortcutCapture(input, getCurrent, update, allowUnmodified = false) {
  input.addEventListener("focus", () => {
    shortcutCaptureTarget = { input, update, previousValue: getCurrent(), allowUnmodified };
    input.value = tr("pressCombination");
  });
  input.addEventListener("blur", () => {
    if (shortcutCaptureTarget?.input === input) {
      shortcutCaptureTarget = null;
    }
    if (input.value === tr("pressCombination")) {
      input.value = getCurrent();
    }
  });
}

function captureShortcutEvent(event, target) {
  event.preventDefault();
  event.stopPropagation();
  if (event.key === "Escape") {
    target.input.value = target.previousValue;
    target.input.blur();
    return;
  }
  const key = acceleratorKey(event);
  if (!key) {
    target.input.value = tr("pressCombination");
    return;
  }
  const modifiers = [];
  if (event.ctrlKey) modifiers.push("Ctrl");
  if (event.altKey) modifiers.push("Alt");
  if (event.shiftKey) modifiers.push("Shift");
  if (event.metaKey) modifiers.push("Super");
  if (
    modifiers.length === 0 &&
    !target.allowUnmodified &&
    !/^F([1-9]|1[0-9]|2[0-4])$/.test(key)
  ) {
    target.input.value = tr("pressCombination");
    return;
  }
  const value = [...modifiers, key].join("+");
  target.input.value = value;
  target.update(value);
  shortcutCaptureTarget = null;
  target.input.blur();
}

bindShortcutCapture(shortcutInput, () => shortcut, (value) => { shortcut = value; });
bindShortcutCapture(companionShortcutInput, () => companionShortcut, (value) => { companionShortcut = value; });
bindShortcutCapture(searchShortcutInput, () => searchShortcut, (value) => { searchShortcut = value; }, true);
bindShortcutCapture(searchNextShortcutInput, () => searchNextShortcut, (value) => { searchNextShortcut = value; }, true);
bindShortcutCapture(searchPreviousShortcutInput, () => searchPreviousShortcut, (value) => { searchPreviousShortcut = value; }, true);
bindShortcutCapture(reloadShortcutInput, () => reloadShortcut, (value) => { reloadShortcut = value; }, true);
bindShortcutCapture(newTabShortcutInput, () => newTabShortcut, (value) => { newTabShortcut = value; }, true);
bindShortcutCapture(closeTabShortcutInput, () => closeTabShortcut, (value) => { closeTabShortcut = value; }, true);
bindShortcutCapture(nextTabShortcutInput, () => nextTabShortcut, (value) => { nextTabShortcut = value; }, true);
bindShortcutCapture(previousTabShortcutInput, () => previousTabShortcut, (value) => { previousTabShortcut = value; }, true);
bindShortcutCapture(reopenTabShortcutInput, () => reopenTabShortcut, (value) => { reopenTabShortcut = value; }, true);

document.addEventListener("keydown", (event) => {
  if (!shortcutCaptureTarget) return;
  captureShortcutEvent(event, shortcutCaptureTarget);
}, true);

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = true;
  setStatus(tr("saving"));

  const languageChanged = languageInput.value !== storedLanguage;

  const result = await window.desktopApi.saveSettings({
    globalShortcut: shortcut,
    searchShortcut,
    searchNextShortcut,
    searchPreviousShortcut,
    reloadShortcut,
    newTabShortcut,
    closeTabShortcut,
    nextTabShortcut,
    previousTabShortcut,
    reopenClosedTabShortcut: reopenTabShortcut,
    pullToRefreshEnabled: pullToRefreshEnabledInput.checked,
    tabBarMode: tabBarModeInput.value,
    restoreTabsOnStartup: restoreTabsOnStartupInput.checked,
    lastTabCloseBehavior: lastTabCloseBehaviorInput.value,
    companionEnabled: companionEnabledInput.checked,
    companionShortcut,
    companionPromptMaxLines: Number(companionPromptMaxLinesInput.value),
    themeMode: themeModeInput.value,
    responseNotificationsEnabled: responseNotificationsInput.checked,
    windowDisplayMode: windowDisplayModeInput.value,
    closeBehavior: closeBehaviorInput.value,
    launchAtLogin: launchAtLoginInput.checked,
    language: languageInput.value,
    rememberWindowPosition: rememberWindowPositionInput.checked,
    displayServerMode: displayServerModeInput.value,
    defaultWidth: Number(widthInput.value),
    defaultHeight: Number(heightInput.value),
  });

  saveButton.disabled = false;
  if (result.ok) {
    fillForm(result);
    if (languageChanged && result.languageRestartRequired) {
      if (window.confirm(tr("restartPrompt"))) {
        window.desktopApi.restartApplication();
        return;
      }
      setStatus(tr("restartLater"), "success");
    } else {
      setStatus(tr("saved"), "success");
    }
  } else {
    setStatus(result.error || tr("saveError"), "error");
  }
});

resetWindowButton.addEventListener("click", async () => {
  const payload = await window.desktopApi.resetWindowBounds();
  fillForm(payload);
  setStatus(tr("windowReset"), "success");
});

resetSessionButton.addEventListener("click", async () => {
  resetSessionButton.disabled = true;
  const wasReset = await window.desktopApi.resetSession();
  resetSessionButton.disabled = false;
  setStatus(wasReset ? tr("sessionReset") : tr("resetCancelled"), wasReset ? "success" : "");
});

scanProjectsButton.addEventListener("click", async () => {
  scanProjectsButton.disabled = true;
  setStatus(tr("syncing"));
  try {
    const result = await window.desktopApi.scanProjects();
    if (result?.settings) fillForm(result);
    setStatus(
      result?.ok
        ? tr("projectsSyncedCount").replace("{count}", String(result.settings?.chatGptProjects?.length || 0))
        : result?.error || tr("projectActionError"),
      result?.ok ? "success" : "error",
    );
  } catch {
    setStatus(tr("projectActionError"), "error");
  } finally {
    scanProjectsButton.disabled = false;
  }
});

resetProjectsButton.addEventListener("click", async () => {
  if (!window.confirm(tr("confirmResetProjects"))) return;
  resetProjectsButton.disabled = true;
  try {
    const result = await window.desktopApi.resetProjects();
    if (result?.ok) {
      fillForm(result);
      setStatus(tr("projectsReset"), "success");
    } else {
      setStatus(result?.error || tr("projectActionError"), "error");
    }
  } catch {
    setStatus(tr("projectActionError"), "error");
  } finally {
    resetProjectsButton.disabled = false;
  }
});

defaultProjectInput.addEventListener("change", async () => {
  const result = await window.desktopApi.setDefaultProject(defaultProjectInput.value || undefined);
  if (result?.ok) {
    fillForm(result);
    setStatus(tr("defaultSaved"), "success");
  } else {
    setStatus(result?.error || tr("projectActionError"), "error");
  }
});

toggleProjectListButton.addEventListener("click", () => {
  projectsExpanded = !projectsExpanded;
  updateProjectListVisibility();
});

copyLogFileButton.addEventListener("click", async () => {
  const result = await window.desktopApi.copyLogFile();
  setStatus(result?.ok ? tr("logFileCopied") : result?.error || tr("logActionError"), result?.ok ? "success" : "error");
});

copyLogTailButton.addEventListener("click", async () => {
  const result = await window.desktopApi.copyLogTail();
  setStatus(result?.ok ? tr("logTailCopied") : result?.error || tr("logActionError"), result?.ok ? "success" : "error");
});

clearLogButton.addEventListener("click", async () => {
  if (!window.confirm(tr("confirmClearLog"))) return;
  const result = await window.desktopApi.clearLog();
  setStatus(result?.ok ? tr("logCleared") : result?.error || tr("logActionError"), result?.ok ? "success" : "error");
});

cancelButton.addEventListener("click", () => window.desktopApi.closeSettings());
displayServerModeInput.addEventListener("change", updateDisplayModeHint);
closeBehaviorInput.addEventListener("change", updateCloseBehaviorHint);
windowDisplayModeInput.addEventListener("change", updateCloseBehaviorHint);

window.desktopApi
  .getSettings()
  .then(fillForm)
  .catch(() => setStatus(tr("loadError"), "error"));

window.desktopApi.onProjectScanProgress(renderProjectProgress);
window.desktopApi.onSettingsTheme(applySettingsTheme);
