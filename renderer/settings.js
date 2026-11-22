const form = document.querySelector("#settings-form");
const shortcutInput = document.querySelector("#shortcut");
const searchShortcutInput = document.querySelector("#search-shortcut");
const searchNextShortcutInput = document.querySelector("#search-next-shortcut");
const searchPreviousShortcutInput = document.querySelector("#search-previous-shortcut");
const reloadShortcutInput = document.querySelector("#reload-shortcut");
const newTabProjectInput = document.querySelector("#new-tab-project");
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
const nestFoldersEnabledInput = document.querySelector("#nestfolders-enabled");
const companionUnavailable = document.querySelector("#companion-unavailable");
const companionShortcutInput = document.querySelector("#companion-shortcut");
const companionPromptMaxLinesInput = document.querySelector("#companion-prompt-max-lines");
const themeModeInput = document.querySelector("#theme-mode");
const responseNotificationsInput = document.querySelector("#response-notifications");
const closeBehaviorInput = document.querySelector("#close-behavior");
const closeBehaviorHint = document.querySelector("#close-behavior-hint");
const launchAtLoginInput = document.querySelector("#launch-at-login");
const languageInput = document.querySelector("#language");
const displayNameInput = document.querySelector("#display-name");
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
let activeUiLanguage = "en";
let storedLanguage = "en";
let storedCompanionEnabled = false;
let storedNestFoldersEnabled = true;
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
    extPromptLanguage: "Langue du prompt", extPromptLanguageHint: "Langue des instructions données à l’IA. Les termes techniques restent en anglais.",
    extBuiltInTitle: "Intégrées",
    extInstalledTitle: "Vos extensions",
    extInstalledHint: "Les extensions que vous ajoutez s’appliquent tout de suite : les onglets ChatGPT ouverts se rechargent.",
    extEmpty: "Aucune extension installée pour l’instant.",
    extAdd: "Ajouter une extension (.zip)…",
    extOpenFolder: "Ouvrir le dossier des extensions",
    extReload: "Recharger les extensions",
    extCreateTitle: "Créer la vôtre",
    extCreateIntro: "Décrivez l’extension que vous voulez à une IA, puis installez le .zip qu’elle vous donne. Les extensions ne peuvent modifier que la page de ChatGPT.",
    extCreate: "Créer avec ChatGPT",
    extCreateHint: "Ouvre un nouvel onglet ChatGPT avec les instructions déjà dans la zone de message. Décrivez votre extension à la fin, envoyez le message, puis installez le .zip obtenu.",
    extCopyPrompt: "Copier le prompt pour une IA",
    extCopyHint: "Copie les instructions à coller dans une autre IA, comme Claude ou Codex.",
    extDevHint: "Développeurs : modifiez vos extensions directement dans le dossier des extensions, puis rechargez-les. Le guide complet est docs/EXTENSIONS.md dans le dépôt du projet.",
    extRemove: "Supprimer",
    extBy: "par {author}",
    extInstalled: "« {name} » installée.",
    extReloaded: "Extensions rechargées.",
    extPromptCopied: "Prompt copié. Collez-le dans votre IA et décrivez votre extension à la fin.",
    extPromptOpened: "Un onglet ChatGPT est prêt : décrivez votre extension à la fin du message.",
    extNotLoaded: "Non chargée : {error}",
    extensionsHint: "Fonctions optionnelles. Une extension désactivée n’est pas chargée du tout. Les extensions intégrées changent après un redémarrage.",
    updatesOpenPage: "Ouvrir la page de téléchargement", updManual: "Téléchargez le nouveau paquet depuis la page de la version.",
    displayNameLabel: "Nom de l’application", displayNameHint: "Affiché dans le menu des applications, la recherche, la barre des tâches et les fenêtres de l’application. La commande du terminal reste chatgpt-desktop-linux.", displayNameUnavailable: "Le renommage n’est disponible que pour les installations .deb et .rpm.",
    trayUnavailable: "Aucune zone de notification n’a été trouvée : la fenêtre est réduite dans la barre des tâches à la place. Sous GNOME, installez l’extension AppIndicator pour avoir l’icône.",
    updInstalledVersion: "Version installée : {version}",
    updFailed: "L’opération n’a pas abouti. Réessayez.",
    updChecking: "Recherche en cours…",
    updAhead: "↗ Votre version {installed} est plus récente que la dernière version publiée ({latest}).",
    updCurrent: "✓ À jour ({latest}).",
    updAvailable: "↓ Version {latest} disponible — version installée : {installed}.",
    updNoPackage: "Aucun paquet compatible dans les versions publiées.",
    updDownloading: "Téléchargement et vérification du paquet…",
    updInstalledOk: "Mise à jour installée et confirmée. Utilisez Redémarrer ChatGPT dans la fenêtre de suivi.",
    updInfoUnavailable: "Informations de mise à jour indisponibles.",
    tabGeneral: "Général", tabTabs: "Onglets", tabShortcuts: "Raccourcis", tabWindow: "Fenêtre", tabExtensions: "Extensions", tabAbout: "À propos",
    globalShortcutTitle: "Global", tabsShortcutsTitle: "Onglets",
    nestFoldersTitle: "Dossiers de projets (NestFolders)", nestFoldersHint: "Dossiers et sous-dossiers dans les projets ChatGPT, avec couleurs et glisser-déposer. Vos dossiers sont conservés si l’extension est désactivée.", dependsOnChatGpt: "Dépend de l’interface de ChatGPT",
    kdeOnly: "KDE Plasma uniquement", extensionUnavailable: "Indisponible : cette extension nécessite KDE Plasma.",
    extensionsRestartPrompt: "Les extensions ont changé. Redémarrer l’application maintenant pour appliquer le changement ?",
    extensionsRestartLater: "Extensions enregistrées. Le changement sera appliqué au prochain redémarrage.",
    aboutUnofficial: "Application non officielle, sans lien avec OpenAI.", aboutLicense: "Logiciel libre sous licence MIT.",
    updatesHint: "Les versions sont téléchargées depuis les publications GitHub du projet. Avec le paquet .deb, l’installation passe par l’installateur système et nécessite votre confirmation.",
      updatesInstall: "Télécharger et installer",
    updatesTitle: "Mises à jour", updatesAuto: "Rechercher les mises à jour au démarrage", updatesCheck: "Rechercher maintenant",
    settingsTitle: "Paramètres", behaviorTitle: "Comportement",
    languageLabel: "Langue de l’application et de ChatGPT",
    languageHint: "Le changement nécessite un redémarrage de l’application.",
    shortcutLabel: "Afficher ou masquer ChatGPT",
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
    newTabTargetLabel: "Destination des nouveaux onglets", newTabTargetHint: "Raccourci Nouvel onglet et bouton + : ChatGPT normal ou l’un des projets ci-dessous.", reloadShortcutLabel: "Actualiser", newTabShortcutLabel: "Nouvel onglet", closeTabShortcutLabel: "Fermer l’onglet",
    nextTabShortcutLabel: "Onglet suivant", previousTabShortcutLabel: "Onglet précédent", reopenTabShortcutLabel: "Rouvrir le dernier fermé",
    fixedTabShortcutsHint: "Ctrl+1 à Ctrl+8 sélectionnent un onglet ; Ctrl+9 sélectionne le dernier.",
    companionTitle: "Magic Bar", companionEnabledLabel: "Activer la Magic Bar",
    companionEnabledHint: "Une barre flottante pour préparer du texte, des fichiers et des captures avant de les envoyer à ChatGPT. Inclut les intégrations Dolphin et Kate.",
    companionShortcutLabel: "Raccourci de la Magic Bar", companionShortcutHint: "Par défaut : Ctrl+Shift+Space.",
    companionPromptLinesLabel: "Lignes maximales du message", companionPromptLinesHint: "La barre grandit jusqu’à cette limite, puis le message défile. Par défaut : 3.",
    responseNotificationsLabel: "Notifier à la fin d’une réponse",
    responseNotificationsHint: "Uniquement lorsque la fenêtre ChatGPT est cachée, réduite ou sans focus.",
    themeModeLabel: "Thème", themeSystem: "Automatique (système)", themeLight: "Clair", themeDark: "Sombre",
    themeModeHint: "Appliqué à ChatGPT et aux fenêtres de l’application. Le mode automatique suit le système sans redémarrage.",
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
    shortcutActive: "Actif", shortcutUnavailable: "Indisponible dans la session actuelle. Utilisez la commande de secours ci-dessous dans un raccourci de votre bureau.",
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
    extPromptLanguage: "Prompt language", extPromptLanguageHint: "Language of the instructions given to the AI. Technical terms stay in English.",
    extBuiltInTitle: "Built-in",
    extInstalledTitle: "Your extensions",
    extInstalledHint: "Extensions you add apply immediately: open ChatGPT tabs reload.",
    extEmpty: "No extension installed yet.",
    extAdd: "Add an extension (.zip)…",
    extOpenFolder: "Open the extensions folder",
    extReload: "Reload extensions",
    extCreateTitle: "Create your own",
    extCreateIntro: "Describe the extension you want to an AI, then install the .zip it gives you. Extensions can only change the ChatGPT page.",
    extCreate: "Create with ChatGPT",
    extCreateHint: "Opens a new ChatGPT tab with the instructions already in the message box. Describe your extension at the end, send the message, then install the .zip you get.",
    extCopyPrompt: "Copy the AI prompt",
    extCopyHint: "Copies the instructions to paste into another AI, such as Claude or Codex.",
    extDevHint: "Developers: edit your extensions directly in the extensions folder, then reload them. The full guide is docs/EXTENSIONS.md in the project repository.",
    extRemove: "Remove",
    extBy: "by {author}",
    extInstalled: "“{name}” installed.",
    extReloaded: "Extensions reloaded.",
    extPromptCopied: "Prompt copied. Paste it into your AI and describe your extension at the end.",
    extPromptOpened: "A ChatGPT tab is ready: describe your extension at the end of the message.",
    extNotLoaded: "Not loaded: {error}",
    extensionsHint: "Optional features. A disabled extension is not loaded at all. Built-in extensions change after a restart.",
    updatesOpenPage: "Open the download page", updManual: "Download the new package from the release page.",
    displayNameLabel: "Application name", displayNameHint: "Shown in your applications menu, search and taskbar, and in the application's windows. The terminal command stays chatgpt-desktop-linux.", displayNameUnavailable: "Renaming is only available for .deb and .rpm installations.",
    trayUnavailable: "No system tray was found, so the window is minimized to the taskbar instead. On GNOME, install the AppIndicator extension to get the tray icon.",
    updatesHint: "Versions are downloaded from the project's GitHub releases. With the .deb package, installation goes through the system installer and requires your confirmation.",
      updatesInstall: "Download and install",
    updInstalledVersion: "Installed version: {version}",
    updFailed: "The operation failed. Try again.",
    updChecking: "Checking…",
    updAhead: "↗ Your version {installed} is newer than the latest published version ({latest}).",
    updCurrent: "✓ Up to date ({latest}).",
    updAvailable: "↓ Version {latest} is available — installed version: {installed}.",
    updNoPackage: "No compatible package was found in the published releases.",
    updDownloading: "Downloading and verifying the package…",
    updInstalledOk: "Update installed and confirmed. Use Restart ChatGPT in the progress window.",
    updInfoUnavailable: "Update information unavailable.",
    tabGeneral: "General", tabTabs: "Tabs", tabShortcuts: "Shortcuts", tabWindow: "Window", tabExtensions: "Extensions", tabAbout: "About",
    globalShortcutTitle: "Global", tabsShortcutsTitle: "Tabs",
    nestFoldersTitle: "Project folders (NestFolders)", nestFoldersHint: "Folders and subfolders inside ChatGPT projects, with colors and drag and drop. Your folders are kept when the extension is disabled.", dependsOnChatGpt: "Depends on the ChatGPT interface",
    kdeOnly: "KDE Plasma only", extensionUnavailable: "Unavailable: this extension requires KDE Plasma.",
    extensionsRestartPrompt: "Extensions changed. Restart the application now to apply the change?",
    extensionsRestartLater: "Extensions saved. The change will be applied on the next restart.",
    aboutUnofficial: "Unofficial application, not affiliated with OpenAI.", aboutLicense: "Free software under the MIT license.",
    updatesTitle: "Updates", updatesAuto: "Check for updates at startup", updatesCheck: "Check now",
    settingsTitle: "Settings", behaviorTitle: "Behavior", languageLabel: "Application and ChatGPT language",
    languageHint: "Changing the language requires restarting the application.", shortcutLabel: "Show or hide ChatGPT",
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
    newTabTargetLabel: "New tab destination", newTabTargetHint: "New tab shortcut and + button: regular ChatGPT or one of the projects below.", reloadShortcutLabel: "Reload", newTabShortcutLabel: "New tab", closeTabShortcutLabel: "Close tab",
    nextTabShortcutLabel: "Next tab", previousTabShortcutLabel: "Previous tab", reopenTabShortcutLabel: "Reopen last closed",
    fixedTabShortcutsHint: "Ctrl+1 through Ctrl+8 select a tab; Ctrl+9 selects the last one.",
    companionTitle: "Magic Bar", companionEnabledLabel: "Enable the Magic Bar",
    companionEnabledHint: "A floating bar to prepare text, files and screenshots before sending them to ChatGPT. Includes the Dolphin and Kate integrations.",
    companionShortcutLabel: "Magic Bar shortcut", companionShortcutHint: "Default: Ctrl+Shift+Space.",
    companionPromptLinesLabel: "Maximum message lines", companionPromptLinesHint: "The bar grows to this limit, then the message scrolls. Default: 3.",
    responseNotificationsLabel: "Notify when a response finishes",
    responseNotificationsHint: "Only when the ChatGPT window is hidden, minimized, or unfocused.",
    themeModeLabel: "Theme", themeSystem: "Automatic (system)", themeLight: "Light", themeDark: "Dark",
    themeModeHint: "Applied to ChatGPT and to the application windows. Automatic mode follows the system without restarting.",
    companionFallback: "Magic Bar fallback command",
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
    companionShortcutActive: "Magic Bar shortcut active", companionShortcutUnavailable: "Magic Bar shortcut unavailable.",
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
    extPromptLanguage: "Idioma del prompt", extPromptLanguageHint: "Idioma de las instrucciones para la IA. Los términos técnicos siguen en inglés.",
    extBuiltInTitle: "Integradas",
    extInstalledTitle: "Tus extensiones",
    extInstalledHint: "Las extensiones que añades se aplican al instante: las pestañas de ChatGPT abiertas se recargan.",
    extEmpty: "Todavía no hay ninguna extensión instalada.",
    extAdd: "Añadir una extensión (.zip)…",
    extOpenFolder: "Abrir la carpeta de extensiones",
    extReload: "Recargar las extensiones",
    extCreateTitle: "Crea la tuya",
    extCreateIntro: "Describe la extensión que quieres a una IA y después instala el .zip que te dé. Las extensiones solo pueden modificar la página de ChatGPT.",
    extCreate: "Crear con ChatGPT",
    extCreateHint: "Abre una nueva pestaña de ChatGPT con las instrucciones ya en el cuadro de mensaje. Describe tu extensión al final, envía el mensaje e instala el .zip que obtengas.",
    extCopyPrompt: "Copiar el prompt para una IA",
    extCopyHint: "Copia las instrucciones para pegarlas en otra IA, como Claude o Codex.",
    extDevHint: "Desarrolladores: editad vuestras extensiones directamente en la carpeta de extensiones y recargadlas. La guía completa es docs/EXTENSIONS.md en el repositorio del proyecto.",
    extRemove: "Eliminar",
    extBy: "de {author}",
    extInstalled: "«{name}» instalada.",
    extReloaded: "Extensiones recargadas.",
    extPromptCopied: "Prompt copiado. Pégalo en tu IA y describe tu extensión al final.",
    extPromptOpened: "Una pestaña de ChatGPT está lista: describe tu extensión al final del mensaje.",
    extNotLoaded: "No cargada: {error}",
    extensionsHint: "Funciones opcionales. Una extensión desactivada no se carga en absoluto. Las extensiones integradas cambian tras reiniciar.",
    updatesOpenPage: "Abrir la página de descarga", updManual: "Descarga el nuevo paquete desde la página de la versión.",
    displayNameLabel: "Nombre de la aplicación", displayNameHint: "Se muestra en el menú de aplicaciones, la búsqueda, la barra de tareas y las ventanas de la aplicación. El comando de terminal sigue siendo chatgpt-desktop-linux.", displayNameUnavailable: "El cambio de nombre solo está disponible en instalaciones .deb y .rpm.",
    trayUnavailable: "No se encontró ninguna bandeja del sistema, así que la ventana se minimiza en la barra de tareas. En GNOME, instala la extensión AppIndicator para tener el icono.",
    updatesHint: "Las versiones se descargan desde las publicaciones de GitHub del proyecto. Con el paquete .deb, la instalación pasa por el instalador del sistema y requiere tu confirmación.",
      updatesInstall: "Descargar e instalar",
    updInstalledVersion: "Versión instalada: {version}",
    updFailed: "La operación falló. Vuelve a intentarlo.",
    updChecking: "Buscando…",
    updAhead: "↗ Tu versión {installed} es más reciente que la última versión publicada ({latest}).",
    updCurrent: "✓ Actualizado ({latest}).",
    updAvailable: "↓ Versión {latest} disponible. Versión instalada: {installed}.",
    updNoPackage: "No se encontró ningún paquete compatible en las versiones publicadas.",
    updDownloading: "Descargando y verificando el paquete…",
    updInstalledOk: "Actualización instalada y confirmada. Usa Reiniciar ChatGPT en la ventana de progreso.",
    updInfoUnavailable: "Información de actualización no disponible.",
    tabGeneral: "General", tabTabs: "Pestañas", tabShortcuts: "Atajos", tabWindow: "Ventana", tabExtensions: "Extensiones", tabAbout: "Acerca de",
    globalShortcutTitle: "Global", tabsShortcutsTitle: "Pestañas",
    nestFoldersTitle: "Carpetas de proyectos (NestFolders)", nestFoldersHint: "Carpetas y subcarpetas dentro de los proyectos de ChatGPT, con colores y arrastrar y soltar. Tus carpetas se conservan si desactivas la extensión.", dependsOnChatGpt: "Depende de la interfaz de ChatGPT",
    kdeOnly: "Solo KDE Plasma", extensionUnavailable: "No disponible: esta extensión requiere KDE Plasma.",
    extensionsRestartPrompt: "Las extensiones han cambiado. ¿Reiniciar ahora para aplicar el cambio?",
    extensionsRestartLater: "Extensiones guardadas. El cambio se aplicará en el próximo reinicio.",
    aboutUnofficial: "Aplicación no oficial, sin relación con OpenAI.", aboutLicense: "Software libre bajo licencia MIT.",
    updatesTitle: "Actualizaciones", updatesAuto: "Buscar actualizaciones al iniciar", updatesCheck: "Buscar ahora",
    settingsTitle: "Ajustes", behaviorTitle: "Comportamiento", languageLabel: "Idioma de la aplicación y ChatGPT",
    languageHint: "Cambiar el idioma requiere reiniciar la aplicación.", shortcutLabel: "Mostrar u ocultar ChatGPT",
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
    newTabTargetLabel: "Destino de nuevas pestañas", newTabTargetHint: "Atajo Nueva pestaña y botón +: ChatGPT normal o uno de los proyectos de abajo.", reloadShortcutLabel: "Actualizar", newTabShortcutLabel: "Nueva pestaña", closeTabShortcutLabel: "Cerrar pestaña",
    nextTabShortcutLabel: "Pestaña siguiente", previousTabShortcutLabel: "Pestaña anterior", reopenTabShortcutLabel: "Reabrir la última cerrada",
    fixedTabShortcutsHint: "Ctrl+1 a Ctrl+8 seleccionan una pestaña; Ctrl+9 selecciona la última.",
    companionTitle: "Magic Bar", companionEnabledLabel: "Activar Magic Bar",
    companionEnabledHint: "Una barra flotante para preparar texto, archivos y capturas antes de enviarlos a ChatGPT. Incluye las integraciones con Dolphin y Kate.",
    companionShortcutLabel: "Atajo de Magic Bar", companionShortcutHint: "Predeterminado: Ctrl+Shift+Space.",
    companionPromptLinesLabel: "Líneas máximas del mensaje", companionPromptLinesHint: "La barra crece hasta este límite y después el mensaje se desplaza. Predeterminado: 3.",
    responseNotificationsLabel: "Notificar al terminar una respuesta",
    responseNotificationsHint: "Solo cuando la ventana de ChatGPT está oculta, minimizada o sin foco.",
    themeModeLabel: "Tema", themeSystem: "Automático (sistema)", themeLight: "Claro", themeDark: "Oscuro",
    themeModeHint: "Se aplica a ChatGPT y a las ventanas de la aplicación. El modo automático sigue al sistema sin reiniciar.",
    companionFallback: "Comando alternativo de Magic Bar",
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
    companionShortcutActive: "Atajo de Magic Bar activo", companionShortcutUnavailable: "Atajo de Magic Bar no disponible.",
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
    projectsHint: "Liste locale de vos projets ChatGPT, actualisée sur demande et automatiquement toutes les cinq minutes.",
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
    confirmRemoveProject: "Supprimer ce projet du cache local ?", pinnedProjects: "Projets épinglés", otherProjects: "Autres projets", pinned: "Épinglé", source: "Source", updated: "Mis à jour",
    resetProjects: "Réinitialiser tous les projets…",
    resetProjectsHint: "La réinitialisation vide uniquement le cache local ; elle ne supprime aucun projet sur ChatGPT.",
    confirmResetProjects: "Vider entièrement le cache local des projets ? Les projets ChatGPT eux-mêmes ne seront pas supprimés.",
    projectsReset: "Cache local des projets réinitialisé.",
  },
  en: {
    projectsTitle: "ChatGPT Projects", experimental: "Experimental",
    projectsHint: "Local list of your ChatGPT projects, refreshed on request and automatically every five minutes.",
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
    confirmRemoveProject: "Remove this project from the local cache?", pinnedProjects: "Pinned projects", otherProjects: "Other projects", pinned: "Pinned", source: "Source", updated: "Updated",
    resetProjects: "Reset all projects…",
    resetProjectsHint: "Resetting only clears the local cache; it does not delete any project from ChatGPT.",
    confirmResetProjects: "Clear the entire local project cache? The ChatGPT projects themselves will not be deleted.",
    projectsReset: "Local project cache reset.",
  },
  es: {
    projectsTitle: "Proyectos ChatGPT", experimental: "Experimental",
    projectsHint: "Lista local de tus proyectos de ChatGPT, actualizada bajo demanda y automáticamente cada cinco minutos.",
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
    confirmRemoveProject: "¿Eliminar este proyecto de la caché local?", pinnedProjects: "Proyectos fijados", otherProjects: "Otros proyectos", pinned: "Fijado", source: "Origen", updated: "Actualizado",
    resetProjects: "Restablecer todos los proyectos…",
    resetProjectsHint: "El restablecimiento solo vacía la caché local; no elimina ningún proyecto de ChatGPT.",
    confirmResetProjects: "¿Vaciar toda la caché local de proyectos? Los proyectos de ChatGPT no se eliminarán.",
    projectsReset: "Caché local de proyectos restablecida.",
  },
};

function trf(key, values) {
  return tr(key).replace(/\{(\w+)\}/g, (match, name) => (name in values ? String(values[name]) : match));
}

function tr(key) {
  return translations[activeUiLanguage]?.[key] || projectTranslations[activeUiLanguage]?.[key] || translations.en[key] || projectTranslations.en[key] || key;
}

function applyTranslations(language) {
  activeUiLanguage = translations[language] ? language : "en";
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
  const pinnedGroup = document.createElement("optgroup");
  pinnedGroup.label = `📌 ${tr("pinnedProjects")}`;
  const otherGroup = document.createElement("optgroup");
  otherGroup.label = `📁 ${tr("otherProjects")}`;
  if (currentProjects.some(project => project.pinned === true)) defaultProjectInput.append(pinnedGroup);
  if (currentProjects.some(project => project.pinned !== true)) defaultProjectInput.append(otherGroup);
  for (const project of currentProjects) {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    (project.pinned === true ? pinnedGroup : otherGroup).append(option);

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
  const selectedTarget = newTabProjectInput.dataset.loaded === "true"
    ? newTabProjectInput.value : settings.newTabChatGptProjectId || "";
  newTabProjectInput.replaceChildren(...[...defaultProjectInput.children].map(child => child.cloneNode(true)));
  newTabProjectInput.value = currentProjects.some(project => project.id === selectedTarget) ? selectedTarget : "";
  newTabProjectInput.dataset.loaded = "true";
  updateProjectListVisibility();
  renderProjectSync(settings.projectSyncStatus, currentProjects.length);
}

function fillForm(payload) {
  const settings = payload.settings || payload;
  const runtime = payload.runtime;
  applySettingsTheme(runtime);
  document.querySelector("#updates-auto").checked = settings.checkUpdatesOnStartup !== false;
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
  storedCompanionEnabled = settings.companionEnabled;
  nestFoldersEnabledInput.checked = settings.nestFoldersEnabled !== false;
  storedNestFoldersEnabled = nestFoldersEnabledInput.checked;
  const companionSupported = runtime?.extensions?.companion?.supported !== false;
  companionEnabledInput.disabled = !companionSupported;
  companionUnavailable.hidden = companionSupported;
  updateExtensionSettingsVisibility();
  companionPromptMaxLinesInput.value = String(settings.companionPromptMaxLines || 3);
  themeModeInput.value = settings.themeMode || "system";
  responseNotificationsInput.checked = settings.responseNotificationsEnabled;
  closeBehaviorInput.value = settings.closeBehavior;
  windowDisplayModeInput.value = settings.windowDisplayMode;
  launchAtLoginInput.checked = settings.launchAtLogin;
  languageInput.value = settings.language;
  displayNameInput.value = settings.displayName || "ChatGPT";
  storedLanguage = settings.language;
  displayServerModeInput.value = settings.displayServerMode;
  rememberWindowPositionInput.checked = settings.rememberWindowPosition;
  widthInput.value = String(settings.defaultWidth);
  heightInput.value = String(settings.defaultHeight);

  if (runtime) {
    applyTranslations(runtime.activeLanguage);
    // The prompt follows the application language until the user picks another one.
    const promptLanguage = document.querySelector("#extension-prompt-language");
    if (promptLanguage && !promptLanguage.dataset.chosen) {
      const radio = promptLanguage.querySelector(`input[value="${runtime.activeLanguage}"]`);
      if (radio) radio.checked = true;
    }
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
    document.querySelector("#tray-unavailable").hidden = runtime.trayAvailable !== false;
    displayNameInput.disabled = runtime.renameSupported === false;
    document.querySelector("#display-name-unavailable").hidden = runtime.renameSupported !== false;
    document.title = `${tr("settingsTitle")} — ${settings.displayName || "ChatGPT"}`;
    document.querySelector("#remember-window-position-row").hidden = runtime.kdeSession === false;
    positionMemoryStatus.className =
      `runtime-status ${runtime.positionMemoryAvailable ? "success" : "error"}`;
    fallbackCommand.textContent = runtime.fallbackCommand;
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

function updateExtensionSettingsVisibility() {
  document.querySelector('[data-extension-settings="companion"]').hidden =
    !companionEnabledInput.checked || companionEnabledInput.disabled;
}

function selectTab(name, focus = false) {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  const target = tabs.find((tab) => tab.dataset.tab === name) || tabs[0];
  for (const tab of tabs) {
    const selected = tab === target;
    tab.setAttribute("aria-selected", String(selected));
    tab.tabIndex = selected ? 0 : -1;
    document.querySelector(`[data-panel="${tab.dataset.tab}"]`).hidden = !selected;
  }
  if (focus) target.focus();
  document.querySelector("main").scrollTop = 0;
  try { localStorage.setItem("settings-tab", target.dataset.tab); } catch {}
}

function initTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  for (const tab of tabs) {
    tab.addEventListener("click", () => selectTab(tab.dataset.tab));
    tab.addEventListener("keydown", (event) => {
      const index = tabs.indexOf(tab);
      const next = event.key === "ArrowDown" ? tabs[(index + 1) % tabs.length]
        : event.key === "ArrowUp" ? tabs[(index - 1 + tabs.length) % tabs.length]
          : event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1] : null;
      if (!next) return;
      event.preventDefault();
      selectTab(next.dataset.tab, true);
    });
  }
  let saved = "general";
  try { saved = localStorage.getItem("settings-tab") || saved; } catch {}
  selectTab(saved);
}

initTabs();

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
  const extensionsChanged = companionEnabledInput.checked !== storedCompanionEnabled ||
    nestFoldersEnabledInput.checked !== storedNestFoldersEnabled;

  const result = await window.desktopApi.saveSettings({
    globalShortcut: shortcut,
    searchShortcut,
    searchNextShortcut,
    searchPreviousShortcut,
    reloadShortcut,
    newTabShortcut,
    checkUpdatesOnStartup: document.querySelector("#updates-auto").checked,
    newTabChatGptProjectId: newTabProjectInput.value,
    closeTabShortcut,
    nextTabShortcut,
    previousTabShortcut,
    reopenClosedTabShortcut: reopenTabShortcut,
    pullToRefreshEnabled: pullToRefreshEnabledInput.checked,
    tabBarMode: tabBarModeInput.value,
    restoreTabsOnStartup: restoreTabsOnStartupInput.checked,
    lastTabCloseBehavior: lastTabCloseBehaviorInput.value,
    companionEnabled: companionEnabledInput.checked,
    nestFoldersEnabled: nestFoldersEnabledInput.checked,
    displayName: displayNameInput.value,
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
    } else if (extensionsChanged && result.extensionsRestartRequired) {
      if (window.confirm(tr("extensionsRestartPrompt"))) {
        window.desktopApi.restartApplication();
        return;
      }
      setStatus(tr("extensionsRestartLater"), "success");
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
companionEnabledInput.addEventListener("change", updateExtensionSettingsVisibility);
windowDisplayModeInput.addEventListener("change", updateCloseBehaviorHint);

window.desktopApi
  .getSettings()
  .then(fillForm)
  .catch(() => setStatus(tr("loadError"), "error"));

window.desktopApi.onProjectScanProgress(renderProjectProgress);
window.desktopApi.onSettingsTheme(applySettingsTheme);

const updateMessage = document.querySelector("#update-status");
const updateInstallButton = document.querySelector("#updates-install");
const updateOpenPageButton = document.querySelector("#updates-open-page");
const updateButtons = [...document.querySelectorAll("#updates-check, #updates-install")];
let updateCanInstall = false;
async function refreshUpdateStatus() {
  const status = await window.desktopApi.updateStatus();
  if (!status) return;
  document.querySelector("#update-version").textContent = trf("updInstalledVersion", { version: status.version });
  updateCanInstall = status.deb;
}
async function updateAction(action) {
  updateButtons.forEach(button => { button.disabled = true; });
  updateMessage.dataset.state = "neutral";
  try { await action(); }
  catch { updateMessage.dataset.state = "error"; updateMessage.textContent = tr("updFailed"); }
  finally { updateButtons.forEach(button => { button.disabled = false; }); }
}
document.querySelector("#updates-check").addEventListener("click", () => updateAction(async () => {
  updateMessage.textContent = tr("updChecking");
  updateInstallButton.hidden = true;
  updateOpenPageButton.hidden = true;
  const result = await window.desktopApi.checkUpdates();
  if (!result.ok) { updateMessage.dataset.state = "error"; updateMessage.textContent = result.error; return; }
  const comparison = result.comparison;
  if (comparison?.state === "ahead") {
    updateMessage.dataset.state = "info";
    updateMessage.textContent = trf("updAhead", { installed: comparison.installed, latest: comparison.latest });
  } else if (comparison?.state === "current") {
    updateMessage.dataset.state = "success";
    updateMessage.textContent = trf("updCurrent", { latest: comparison.latest });
  } else if (comparison?.state === "available") {
    updateMessage.dataset.state = "info";
    updateMessage.textContent = trf("updAvailable", { latest: comparison.latest, installed: comparison.installed })
      + (updateCanInstall ? "" : ` ${tr("updManual")}`);
  } else {
    updateMessage.dataset.state = "warning";
    updateMessage.textContent = tr("updNoPackage");
  }
  // .deb installations update from here; the other formats point to the release page.
  updateInstallButton.hidden = !result.release || !updateCanInstall;
  updateOpenPageButton.hidden = !result.release || updateCanInstall;
}));
updateOpenPageButton.addEventListener("click", () => { void window.desktopApi.openUpdatePage(); });
updateInstallButton.addEventListener("click", () => updateAction(async () => {
  updateMessage.textContent = tr("updDownloading");
  const cancel = document.querySelector("#updates-cancel");
  cancel.hidden = false;
  let result;
  try { result = await window.desktopApi.installUpdate(); }
  finally { cancel.hidden = true; }
  updateMessage.textContent = result.ok ? tr("updInstalledOk") : result.error;
}));
refreshUpdateStatus().catch(() => { updateMessage.textContent = tr("updInfoUnavailable"); });

document.querySelector("#updates-cancel").addEventListener("click", () => { void window.desktopApi.cancelUpdate(); });

// ---------- Custom extensions ----------

const userExtensionList = document.querySelector("#user-extension-list");
const promptLanguageGroup = document.querySelector("#extension-prompt-language");
promptLanguageGroup.addEventListener("change", () => { promptLanguageGroup.dataset.chosen = "true"; });
const selectedPromptLanguage = () => promptLanguageGroup.querySelector("input:checked")?.value || activeUiLanguage;
const userExtensionEmpty = document.querySelector("#user-extension-empty");

function renderUserExtensions(extensions) {
  if (!Array.isArray(extensions)) return;
  userExtensionList.replaceChildren();
  userExtensionEmpty.hidden = extensions.length > 0;
  for (const extension of extensions) {
    const card = document.createElement("div");
    card.className = "card extension user-extension";
    const header = document.createElement("label");
    header.className = "toggle extension-header";
    const info = document.createElement("span");
    const title = document.createElement("strong");
    title.textContent = extension.name;
    info.append(title);
    const meta = [extension.version && `v${extension.version}`, extension.author && trf("extBy", { author: extension.author })].filter(Boolean).join(" · ");
    if (meta) {
      const metaLine = document.createElement("small");
      metaLine.className = "user-extension-meta";
      metaLine.textContent = meta;
      info.append(metaLine);
    }
    if (extension.description) {
      const description = document.createElement("small");
      description.textContent = extension.description;
      info.append(description);
    }
    if (extension.error) {
      const error = document.createElement("small");
      error.className = "user-extension-error";
      error.textContent = trf("extNotLoaded", { error: extension.error });
      info.append(error);
    }
    header.append(info);
    if (!extension.error) {
      const toggle = document.createElement("input");
      toggle.type = "checkbox";
      toggle.checked = extension.enabled;
      toggle.setAttribute("aria-label", extension.name);
      toggle.addEventListener("change", async () => {
        toggle.disabled = true;
        const result = await window.desktopApi.setExtensionEnabled(extension.id, toggle.checked);
        if (result?.ok) { renderUserExtensions(result.extensions); setStatus(tr("extReloaded"), "success"); }
        else { toggle.checked = !toggle.checked; toggle.disabled = false; setStatus(result?.error || tr("saveError"), "error"); }
      });
      header.append(toggle);
    }
    const actions = document.createElement("div");
    actions.className = "user-extension-actions";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "danger";
    remove.textContent = tr("extRemove");
    remove.addEventListener("click", async () => {
      const result = await window.desktopApi.removeExtension(extension.id);
      if (result?.extensions) renderUserExtensions(result.extensions);
      if (result && !result.ok) setStatus(result.error, "error");
    });
    actions.append(remove);
    card.append(header, actions);
    userExtensionList.append(card);
  }
}

function refreshUserExtensions() {
  window.desktopApi.listExtensions().then(renderUserExtensions).catch(() => {});
}

document.querySelector("#extension-add").addEventListener("click", async () => {
  const result = await window.desktopApi.addExtension();
  if (result?.extensions) renderUserExtensions(result.extensions);
  if (result?.ok && result.installed) setStatus(trf("extInstalled", { name: result.installed }), "success");
  else if (result && !result.ok) setStatus(result.error, "error");
});
document.querySelector("#extension-open-folder").addEventListener("click", () => { void window.desktopApi.openExtensionsFolder(); });
document.querySelector("#extension-reload").addEventListener("click", async () => {
  const result = await window.desktopApi.reloadExtensions();
  if (result?.ok) { renderUserExtensions(result.extensions); setStatus(tr("extReloaded"), "success"); }
});
document.querySelector("#extension-create").addEventListener("click", async () => {
  const result = await window.desktopApi.createExtensionWithChatGpt(selectedPromptLanguage());
  setStatus(result?.ok ? tr("extPromptOpened") : result?.error || "", result?.ok ? "success" : "error");
});
document.querySelector("#extension-copy-prompt").addEventListener("click", async () => {
  const result = await window.desktopApi.copyExtensionPrompt(selectedPromptLanguage());
  setStatus(result?.ok ? tr("extPromptCopied") : result?.error || "", result?.ok ? "success" : "error");
});

refreshUserExtensions();
