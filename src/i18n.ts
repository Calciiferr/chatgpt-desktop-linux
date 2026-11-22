export type Language = "en" | "fr" | "es";

const en = {
  // Generic
  settingsDisplayNameInvalid: "The application name must be 1 to 40 characters, without [, ] or =.",
  projectsSectionMissing: "The Projects section could not be found.",
  projectNameEmpty: "The project name is empty.",
  newProjectButtonMissing: "The New project button could not be found.",
  debianPackagePathInvalid: "Invalid package path.",
  settingsShortcutInvalid: "The keyboard shortcut is invalid.",
  settingsLocalShortcutsInvalid: "The local shortcuts are invalid.",
  settingsCompanionShortcutInvalid: "The Magic Bar shortcut is invalid.",
  settingsLastTabInvalid: "The last tab behavior is invalid.",
  settingsCloseBehaviorInvalid: "The close behavior is invalid.",
  companionNothingToSend: "Choose a chat and add a request or some context.",
  updateSignInFailed: "Unable to sign in.",
  updateSignInInterrupted: "Sign-in interrupted.",
  projectOrNameInvalid: "Invalid project or name.",
  projectNotFound: "Project not found.",
  syncWaitForCurrent: "Wait for the current synchronization to finish.",
  logFileMissing: "Log file not found.",
  logCopyFailed: "Unable to copy the log.",
  chatWindowUnavailable: "The ChatGPT window is unavailable.",
  noChatTab: "No ChatGPT tab available.",
  invalidRequest: "Invalid request.",
  unauthorizedSource: "Unauthorized source.",
  projectActionFailed: "The project operation failed.",
  projectMissingFromCache: "The selected project no longer exists in the local list.",
  magicBarPreviewTitle: "Magic Bar preview",
  // Settings
  settingsInvalid: "Invalid settings.",
  settingsLocalShortcutsDistinct: "Local shortcuts must be different.",
  settingsTabShortcutsReserved: "Ctrl+1 to Ctrl+9 are reserved for selecting tabs.",
  settingsCompanionInvalid: "The Magic Bar setting is invalid.",
  settingsNestFoldersInvalid: "The folders setting is invalid.",
  settingsCompanionLines: "The number of Magic Bar lines must be between {min} and {max}.",
  settingsGlobalShortcutsDistinct: "The two global shortcuts must be different.",
  settingsLocalReusesGlobal: "Local shortcuts cannot reuse a global shortcut.",
  settingsThemeInvalid: "The appearance setting is invalid.",
  settingsPullToRefreshInvalid: "The pull to refresh setting is invalid.",
  settingsTabBarInvalid: "The tab bar setting is invalid.",
  settingsRestoreTabsInvalid: "The tab restore setting is invalid.",
  settingsNotificationsInvalid: "The notifications setting is invalid.",
  settingsDisplayModeInvalid: "The tray/taskbar mode is invalid.",
  settingsAutostartInvalid: "The launch at login setting is invalid.",
  settingsPositionInvalid: "The window position setting is invalid.",
  settingsLanguageInvalid: "The selected language is invalid.",
  settingsDisplayServerInvalid: "The display server setting is invalid.",
  settingsWidthRange: "The width must be between {min} and {max} px.",
  settingsHeightRange: "The height must be between {min} and {max} px.",
  settingsPositionRuleFailed: "Unable to change the KWin window position rule.",
  settingsAutostartFailed: "Unable to change launch at login.",
  settingsShortcutTaken: "This shortcut is invalid or already in use. The previous shortcut stays active.",
  settingsCompanionShortcutTaken: "The Magic Bar shortcut is invalid or already in use.",
  settingsSaveFailed: "Unable to save the settings to disk.",
  logResetFailed: "Unable to clear the log.",
  // Projects
  projectsInLocalList: "{count} project(s) in the local list.",
  syncAlreadyRunning: "A project synchronization is already running.",
  syncInterrupted: "Project synchronization was interrupted.",
  syncTimedOut: "Project synchronization timed out after {minutes} minute(s).",
  scanLoadTimeout: "The ChatGPT page took too long to load.",
  scanClosed: "The ChatGPT page closed too early.",
  scanReloadTimeout: "The ChatGPT page took too long to refresh.",
  scanClosedDuringReload: "The ChatGPT page closed while refreshing.",
  projectListUnreadable: "{message} The ChatGPT list could not be read. Saved projects are kept; try syncing again.",
  cacheVerificationFailed: "Local list verification failed ({count} missing project(s)).",
  checkSignedIn: "{reason} Make sure you are signed in to ChatGPT, then try again.",
  openSidebarFailed: "Unable to open the ChatGPT sidebar.",
  noVisibleProjects: "No project visible in the Projects section.",
  noVisibleProjectsCollapsed: "No project visible: the Projects section is collapsed, empty or unavailable.",
  noVisibleProjectsSidebar: "No project visible in the ChatGPT sidebar.",
  projectListUnstable: "The project list did not settle.",
  notProjectUrl: "The URL is not a ChatGPT project page.",
  notProjectHome: "The current page is not a ChatGPT project home.",
  projectAutomationDisabled: "Project automation is disabled.",
  syncSummary: "{discovered} project(s) found · {succeeded} succeeded · {failed} failed",
  syncSummaryDuplicates: " · {count} repeated item(s) ignored",
  syncSummaryPinnedChats: " · {count} pinned conversation(s) ignored",
  projectCreateFieldMissing: "The project name field could not be found.",
  projectCreateDialogGone: "The project creation dialog is no longer available.",
  projectCreateFailed: "Project creation did not lead to a valid project page.",
  // Updates
  updateAlreadyRunning: "An update is already in progress.",
  updateRequiresPackage: "Built-in installation requires the .deb version of the application.",
  updateCheckAgain: "Check for the update again.",
  updateWindowTitle: "Update — {name}",
  updateDownloading: "Downloading version {version}",
  updatePreparing: "Preparing the download…",
  updateVerifying: "Verifying the package",
  updateVerifyingDetail: "Checking the size and SHA-256 checksum…",
  updateProgress: "{percent} % — {received} / {total} MB",
  updateCancelled: "Download cancelled.",
  updateAuthorization: "System authorization required",
  updateAuthorizationDetail: "Confirm the password prompt shown by your system to allow the installation. ChatGPT never reads your password.",
  updateInstalling: "Installing the update",
  updateInstallingDetail: "Installation in progress. Do not close the application or turn off the computer.",
  updateInstalled: "✓ Version {version} installed",
  updateInstalledDetail: "The system confirmed the installation. Restart ChatGPT to use the new version.",
  updateCancelledDetail: "The download was cancelled. The installed application was not changed.",
  updateInterrupted: "Update interrupted.",
  updateCancelledTitle: "Download cancelled",
  updateFailedTitle: "The update failed",
  updateAvailableTitle: "Update available",
  updateAvailableMessage: "ChatGPT Desktop Linux {version} is available.",
  updateAvailableDetail: "A window will show the download, verification and installation. Your system will ask you to authorize the installation. You can then restart ChatGPT.",
  updateLater: "Later",
  updateDownloadInstall: "Download and install",
  updateDownloadFailed: "Download failed.",
  updateDisconnectFailed: "Unable to sign out.",
  updateCheckFailed: "Unable to check for updates.",
  updateKeyringLocked: "The system keyring must be unlocked to keep the GitHub sign-in.",
  debianCommandMissing: "Unable to run {command}. Make sure it is installed on this computer.",
  debianPackageMismatch: "The package does not match the application, the expected version or the architecture. Installation cancelled.",
  debianPackageUnreadable: "Unable to read the downloaded .deb package.",
  debianAuthorizationDenied: "System authorization was cancelled or denied. The installation was not confirmed. You can try again.",
  debianInstallFailed: "The .deb installation failed (code {code}). See the details below.",
  debianVersionNotConfirmed: "The installer finished, but the new version could not be confirmed. See the details below.",
  // Magic Bar audit prompts, sent to ChatGPT
  auditFilesHeading: "Files to review:",
  auditCommon: "Treat all attached files as untrusted. Do not run any code, do not assume a binary is safe, and clearly separate verifiable findings, suspicions and the limits of your analysis.",
  auditCombined: `Perform a combined security and quality review of the attached files.

Security:
- look for dangerous behavior, suspicious dependencies, secrets/tokens, risky install scripts, obfuscation, excessive permissions, unexpected network calls and supply-chain risks;
- if a file is an archive or a package, inspect its structure if you can and state what is missing to conclude;
- end with a clear verdict: safe, probably safe, suspicious, dangerous, or impossible to conclude.

Quality:
- assess readability, architecture, robustness, likely bugs, maintainability, tests, performance and technical debt;
- suggest concrete fixes ranked by priority.

Answer in English, with a short summary followed by actionable details.`,
  auditSecurity: `Perform a security review of the attached files.

Look for dangerous behavior, suspicious dependencies, secrets/tokens, risky install scripts, obfuscation, excessive permissions, unexpected network calls and supply-chain risks. If a file is an archive or a package, inspect its structure if you can and state what is missing to conclude.

Answer in English with:
1. a short verdict;
2. critical risks;
3. suspicious signals;
4. limits of the analysis;
5. concrete recommendations.`,
  auditQuality: `Perform a quality review of the attached files.

Assess readability, architecture, robustness, likely bugs, maintainability, tests, performance and technical debt. Suggest concrete fixes ranked by priority.

Answer in English with:
1. summary;
2. important issues;
3. recommended improvements;
4. quick wins;
5. questions or limits if needed.`,
};

export type MessageKey = keyof typeof en;

const fr: Record<MessageKey, string> = {
  settingsDisplayNameInvalid: "Le nom de l’application doit faire de 1 à 40 caractères, sans [, ] ni =.",
  projectsSectionMissing: "Section Projets introuvable.",
  projectNameEmpty: "Le nom du projet est vide.",
  newProjectButtonMissing: "Le bouton Nouveau projet est introuvable.",
  debianPackagePathInvalid: "Chemin du paquet invalide.",
  settingsShortcutInvalid: "Le raccourci clavier est invalide.",
  settingsLocalShortcutsInvalid: "Les raccourcis locaux sont invalides.",
  settingsCompanionShortcutInvalid: "Le raccourci de la Magic Bar est invalide.",
  settingsLastTabInvalid: "Le comportement du dernier onglet est invalide.",
  settingsCloseBehaviorInvalid: "Le comportement de fermeture est invalide.",
  companionNothingToSend: "Choisissez un chat et ajoutez une demande ou un contexte.",
  updateSignInFailed: "Connexion impossible.",
  updateSignInInterrupted: "Connexion interrompue.",
  projectOrNameInvalid: "Projet ou nom invalide.",
  projectNotFound: "Projet introuvable.",
  syncWaitForCurrent: "Attendez la fin de la synchronisation en cours.",
  logFileMissing: "Fichier journal introuvable.",
  logCopyFailed: "Copie du journal impossible.",
  chatWindowUnavailable: "La fenêtre ChatGPT est indisponible.",
  noChatTab: "Aucun onglet ChatGPT disponible.",
  invalidRequest: "Requête invalide.",
  unauthorizedSource: "Source non autorisée.",
  projectActionFailed: "L’opération sur le projet a échoué.",
  projectMissingFromCache: "Le projet choisi n’existe plus dans la liste locale.",
  magicBarPreviewTitle: "Aperçu de la Magic Bar",
  settingsInvalid: "Paramètres invalides.",
  settingsLocalShortcutsDistinct: "Les raccourcis locaux doivent être différents.",
  settingsTabShortcutsReserved: "Ctrl+1 à Ctrl+9 sont réservés à la sélection des onglets.",
  settingsCompanionInvalid: "Le réglage de la Magic Bar est invalide.",
  settingsNestFoldersInvalid: "Le réglage des dossiers est invalide.",
  settingsCompanionLines: "Le nombre de lignes de la Magic Bar doit être compris entre {min} et {max}.",
  settingsGlobalShortcutsDistinct: "Les deux raccourcis globaux doivent être différents.",
  settingsLocalReusesGlobal: "Les raccourcis locaux ne peuvent pas réutiliser un raccourci global.",
  settingsThemeInvalid: "Le réglage d’apparence est invalide.",
  settingsPullToRefreshInvalid: "Le réglage « tirer pour actualiser » est invalide.",
  settingsTabBarInvalid: "Le réglage de la barre d’onglets est invalide.",
  settingsRestoreTabsInvalid: "Le réglage de restauration des onglets est invalide.",
  settingsNotificationsInvalid: "Le réglage des notifications est invalide.",
  settingsDisplayModeInvalid: "Le mode zone de notification/barre des tâches est invalide.",
  settingsAutostartInvalid: "Le réglage de lancement à la connexion est invalide.",
  settingsPositionInvalid: "Le réglage de position de la fenêtre est invalide.",
  settingsLanguageInvalid: "La langue sélectionnée est invalide.",
  settingsDisplayServerInvalid: "Le réglage du serveur d’affichage est invalide.",
  settingsWidthRange: "La largeur doit être comprise entre {min} et {max} px.",
  settingsHeightRange: "La hauteur doit être comprise entre {min} et {max} px.",
  settingsPositionRuleFailed: "Impossible de modifier la règle de position KWin.",
  settingsAutostartFailed: "Impossible de modifier le lancement à la connexion.",
  settingsShortcutTaken: "Ce raccourci est invalide ou déjà utilisé. L’ancien raccourci reste actif.",
  settingsCompanionShortcutTaken: "Le raccourci de la Magic Bar est invalide ou déjà utilisé.",
  settingsSaveFailed: "Impossible d’enregistrer les paramètres sur le disque.",
  logResetFailed: "Impossible de vider le journal.",
  projectsInLocalList: "{count} projet(s) dans la liste locale.",
  syncAlreadyRunning: "Une synchronisation des projets est déjà en cours.",
  syncInterrupted: "La synchronisation des projets a été interrompue.",
  syncTimedOut: "La synchronisation des projets a expiré après {minutes} minute(s).",
  scanLoadTimeout: "La page ChatGPT a mis trop de temps à se charger.",
  scanClosed: "La page ChatGPT s’est fermée trop tôt.",
  scanReloadTimeout: "La page ChatGPT a mis trop de temps à s’actualiser.",
  scanClosedDuringReload: "La page ChatGPT s’est fermée pendant l’actualisation.",
  projectListUnreadable: "{message} La liste ChatGPT n’a pas pu être lue. Les projets déjà enregistrés sont conservés ; réessayez la synchronisation.",
  cacheVerificationFailed: "Vérification de la liste locale échouée ({count} projet(s) manquant(s)).",
  checkSignedIn: "{reason} Vérifiez que vous êtes connecté à ChatGPT, puis réessayez.",
  openSidebarFailed: "Impossible d’ouvrir la barre latérale de ChatGPT.",
  noVisibleProjects: "Aucun projet visible dans la section Projets.",
  noVisibleProjectsCollapsed: "Aucun projet visible : section Projets repliée, vide ou inaccessible.",
  noVisibleProjectsSidebar: "Aucun projet visible dans la barre latérale de ChatGPT.",
  projectListUnstable: "La liste des projets ne s’est pas stabilisée.",
  notProjectUrl: "L’URL ne correspond pas à une page de projet ChatGPT.",
  notProjectHome: "La page actuelle n’est pas l’accueil d’un projet ChatGPT.",
  projectAutomationDisabled: "L’automatisation des projets est désactivée.",
  syncSummary: "{discovered} projet(s) trouvé(s) · {succeeded} réussi(s) · {failed} échoué(s)",
  syncSummaryDuplicates: " · {count} répétition(s) ignorée(s)",
  syncSummaryPinnedChats: " · {count} conversation(s) épinglée(s) ignorée(s)",
  projectCreateFieldMissing: "Le champ de création du projet est introuvable.",
  projectCreateDialogGone: "La fenêtre de création du projet n’est plus disponible.",
  projectCreateFailed: "La création n’a pas abouti à une page de projet valide.",
  updateAlreadyRunning: "Une mise à jour est déjà en cours.",
  updateRequiresPackage: "L’installation intégrée nécessite la version .deb de l’application.",
  updateCheckAgain: "Recherchez à nouveau la mise à jour.",
  updateWindowTitle: "Mise à jour — {name}",
  updateDownloading: "Téléchargement de la version {version}",
  updatePreparing: "Préparation du téléchargement…",
  updateVerifying: "Vérification du paquet",
  updateVerifyingDetail: "Contrôle de la taille et de l’empreinte SHA-256…",
  updateProgress: "{percent} % — {received} / {total} Mo",
  updateCancelled: "Téléchargement annulé.",
  updateAuthorization: "Autorisation système requise",
  updateAuthorizationDetail: "Validez la demande de mot de passe affichée par votre système pour autoriser l’installation. ChatGPT ne lit jamais votre mot de passe.",
  updateInstalling: "Installation de la mise à jour",
  updateInstallingDetail: "L’installation est en cours. Ne fermez pas l’application et n’éteignez pas l’ordinateur.",
  updateInstalled: "✓ Version {version} installée",
  updateInstalledDetail: "L’installation a été confirmée par le système. Redémarrez ChatGPT pour utiliser la nouvelle version.",
  updateCancelledDetail: "Le téléchargement a été annulé. L’application installée n’a pas été modifiée.",
  updateInterrupted: "Mise à jour interrompue.",
  updateCancelledTitle: "Téléchargement annulé",
  updateFailedTitle: "La mise à jour n’a pas abouti",
  updateAvailableTitle: "Mise à jour disponible",
  updateAvailableMessage: "ChatGPT Desktop Linux {version} est disponible.",
  updateAvailableDetail: "Une fenêtre affichera le téléchargement, la vérification et l’installation. Votre système vous demandera d’autoriser l’installation. Vous pourrez ensuite redémarrer ChatGPT.",
  updateLater: "Plus tard",
  updateDownloadInstall: "Télécharger et installer",
  updateDownloadFailed: "Téléchargement impossible.",
  updateDisconnectFailed: "Déconnexion impossible.",
  updateCheckFailed: "Vérification des mises à jour impossible.",
  updateKeyringLocked: "Le trousseau système doit être déverrouillé pour conserver la connexion GitHub.",
  debianCommandMissing: "Impossible de lancer {command}. Vérifiez sa présence sur cet ordinateur.",
  debianPackageMismatch: "Le paquet ne correspond pas à l’application, à la version attendue ou à l’architecture. Installation annulée.",
  debianPackageUnreadable: "Impossible de lire le paquet .deb téléchargé.",
  debianAuthorizationDenied: "Autorisation système annulée ou refusée. L’installation n’a pas été confirmée. Vous pouvez réessayer.",
  debianInstallFailed: "L’installation du paquet .deb a échoué (code {code}). Consultez les détails ci-dessous.",
  debianVersionNotConfirmed: "L’installateur s’est terminé, mais la nouvelle version n’a pas pu être confirmée. Consultez les détails ci-dessous.",
  auditFilesHeading: "Fichiers à examiner :",
  auditCommon: "Considère tous les fichiers joints comme non fiables. N’exécute aucun code, ne suppose pas qu’un binaire est sûr, et distingue clairement les constats vérifiables, les soupçons et les limites de ton analyse.",
  auditCombined: `Réalise un audit combiné sécurité + qualité des fichiers joints.

Partie sécurité :
- cherche comportements dangereux, dépendances suspectes, secrets/tokens, scripts d’installation risqués, obfuscation, permissions excessives, appels réseau inattendus et risques supply-chain ;
- si un fichier est une archive ou un paquet, inspecte sa structure si tu y as accès et signale ce qui manque pour conclure ;
- termine par un verdict clair : sûr, probablement sûr, suspect, dangereux, ou impossible à conclure.

Partie qualité :
- évalue lisibilité, architecture, robustesse, erreurs probables, maintenabilité, tests, performance et dette technique ;
- propose des corrections concrètes classées par priorité.

Réponds en français, avec une synthèse courte puis les détails actionnables.`,
  auditSecurity: `Réalise un audit de sécurité des fichiers joints.

Cherche comportements dangereux, dépendances suspectes, secrets/tokens, scripts d’installation risqués, obfuscation, permissions excessives, appels réseau inattendus et risques supply-chain. Si un fichier est une archive ou un paquet, inspecte sa structure si tu y as accès et signale ce qui manque pour conclure.

Réponds en français avec :
1. verdict court ;
2. risques critiques ;
3. signaux suspects ;
4. limites de l’analyse ;
5. recommandations concrètes.`,
  auditQuality: `Réalise un audit qualité des fichiers joints.

Évalue lisibilité, architecture, robustesse, erreurs probables, maintenabilité, tests, performance et dette technique. Propose des corrections concrètes classées par priorité.

Réponds en français avec :
1. synthèse ;
2. problèmes importants ;
3. améliorations recommandées ;
4. quick wins ;
5. questions ou limites si nécessaire.`,
};

const es: Record<MessageKey, string> = {
  settingsDisplayNameInvalid: "El nombre de la aplicación debe tener de 1 a 40 caracteres, sin [, ] ni =.",
  projectsSectionMissing: "No se encontró la sección Proyectos.",
  projectNameEmpty: "El nombre del proyecto está vacío.",
  newProjectButtonMissing: "No se encontró el botón Nuevo proyecto.",
  debianPackagePathInvalid: "Ruta del paquete no válida.",
  settingsShortcutInvalid: "El atajo de teclado no es válido.",
  settingsLocalShortcutsInvalid: "Los atajos locales no son válidos.",
  settingsCompanionShortcutInvalid: "El atajo de Magic Bar no es válido.",
  settingsLastTabInvalid: "El comportamiento de la última pestaña no es válido.",
  settingsCloseBehaviorInvalid: "El comportamiento al cerrar no es válido.",
  companionNothingToSend: "Elige un chat y añade una solicitud o un contexto.",
  updateSignInFailed: "No se pudo iniciar sesión.",
  updateSignInInterrupted: "Inicio de sesión interrumpido.",
  projectOrNameInvalid: "Proyecto o nombre no válido.",
  projectNotFound: "Proyecto no encontrado.",
  syncWaitForCurrent: "Espera a que termine la sincronización en curso.",
  logFileMissing: "No se encontró el archivo de registro.",
  logCopyFailed: "No se pudo copiar el registro.",
  chatWindowUnavailable: "La ventana de ChatGPT no está disponible.",
  noChatTab: "No hay ninguna pestaña de ChatGPT disponible.",
  invalidRequest: "Solicitud no válida.",
  unauthorizedSource: "Origen no autorizado.",
  projectActionFailed: "La operación sobre el proyecto falló.",
  projectMissingFromCache: "El proyecto elegido ya no existe en la lista local.",
  magicBarPreviewTitle: "Vista previa de Magic Bar",
  settingsInvalid: "Ajustes no válidos.",
  settingsLocalShortcutsDistinct: "Los atajos locales deben ser distintos.",
  settingsTabShortcutsReserved: "Ctrl+1 a Ctrl+9 están reservados para seleccionar pestañas.",
  settingsCompanionInvalid: "El ajuste de Magic Bar no es válido.",
  settingsNestFoldersInvalid: "El ajuste de carpetas no es válido.",
  settingsCompanionLines: "El número de líneas de Magic Bar debe estar entre {min} y {max}.",
  settingsGlobalShortcutsDistinct: "Los dos atajos globales deben ser distintos.",
  settingsLocalReusesGlobal: "Los atajos locales no pueden reutilizar un atajo global.",
  settingsThemeInvalid: "El ajuste de apariencia no es válido.",
  settingsPullToRefreshInvalid: "El ajuste de tirar para actualizar no es válido.",
  settingsTabBarInvalid: "El ajuste de la barra de pestañas no es válido.",
  settingsRestoreTabsInvalid: "El ajuste de restauración de pestañas no es válido.",
  settingsNotificationsInvalid: "El ajuste de notificaciones no es válido.",
  settingsDisplayModeInvalid: "El modo bandeja/barra de tareas no es válido.",
  settingsAutostartInvalid: "El ajuste de inicio al entrar no es válido.",
  settingsPositionInvalid: "El ajuste de posición de la ventana no es válido.",
  settingsLanguageInvalid: "El idioma seleccionado no es válido.",
  settingsDisplayServerInvalid: "El ajuste del servidor de pantalla no es válido.",
  settingsWidthRange: "La anchura debe estar entre {min} y {max} px.",
  settingsHeightRange: "La altura debe estar entre {min} y {max} px.",
  settingsPositionRuleFailed: "No se pudo modificar la regla de posición de KWin.",
  settingsAutostartFailed: "No se pudo modificar el inicio al entrar.",
  settingsShortcutTaken: "Este atajo no es válido o ya está en uso. El atajo anterior sigue activo.",
  settingsCompanionShortcutTaken: "El atajo de Magic Bar no es válido o ya está en uso.",
  settingsSaveFailed: "No se pudieron guardar los ajustes en el disco.",
  logResetFailed: "No se pudo vaciar el registro.",
  projectsInLocalList: "{count} proyecto(s) en la lista local.",
  syncAlreadyRunning: "Ya hay una sincronización de proyectos en curso.",
  syncInterrupted: "La sincronización de proyectos se interrumpió.",
  syncTimedOut: "La sincronización de proyectos expiró tras {minutes} minuto(s).",
  scanLoadTimeout: "La página de ChatGPT tardó demasiado en cargar.",
  scanClosed: "La página de ChatGPT se cerró antes de tiempo.",
  scanReloadTimeout: "La página de ChatGPT tardó demasiado en actualizarse.",
  scanClosedDuringReload: "La página de ChatGPT se cerró durante la actualización.",
  projectListUnreadable: "{message} No se pudo leer la lista de ChatGPT. Los proyectos guardados se conservan; vuelve a sincronizar.",
  cacheVerificationFailed: "La verificación de la lista local falló ({count} proyecto(s) faltante(s)).",
  checkSignedIn: "{reason} Comprueba que has iniciado sesión en ChatGPT y vuelve a intentarlo.",
  openSidebarFailed: "No se pudo abrir la barra lateral de ChatGPT.",
  noVisibleProjects: "No hay proyectos visibles en la sección Proyectos.",
  noVisibleProjectsCollapsed: "No hay proyectos visibles: la sección Proyectos está plegada, vacía o no disponible.",
  noVisibleProjectsSidebar: "No hay proyectos visibles en la barra lateral de ChatGPT.",
  projectListUnstable: "La lista de proyectos no se estabilizó.",
  notProjectUrl: "La URL no corresponde a una página de proyecto de ChatGPT.",
  notProjectHome: "La página actual no es el inicio de un proyecto de ChatGPT.",
  projectAutomationDisabled: "La automatización de proyectos está desactivada.",
  syncSummary: "{discovered} proyecto(s) encontrado(s) · {succeeded} correcto(s) · {failed} fallido(s)",
  syncSummaryDuplicates: " · {count} repetición(es) ignorada(s)",
  syncSummaryPinnedChats: " · {count} conversación(es) fijada(s) ignorada(s)",
  projectCreateFieldMissing: "No se encontró el campo de nombre del proyecto.",
  projectCreateDialogGone: "El diálogo de creación del proyecto ya no está disponible.",
  projectCreateFailed: "La creación no llevó a una página de proyecto válida.",
  updateAlreadyRunning: "Ya hay una actualización en curso.",
  updateRequiresPackage: "La instalación integrada requiere la versión .deb de la aplicación.",
  updateCheckAgain: "Vuelve a buscar la actualización.",
  updateWindowTitle: "Actualización — {name}",
  updateDownloading: "Descargando la versión {version}",
  updatePreparing: "Preparando la descarga…",
  updateVerifying: "Verificando el paquete",
  updateVerifyingDetail: "Comprobando el tamaño y la suma SHA-256…",
  updateProgress: "{percent} % — {received} / {total} MB",
  updateCancelled: "Descarga cancelada.",
  updateAuthorization: "Se requiere autorización del sistema",
  updateAuthorizationDetail: "Confirma la solicitud de contraseña que muestra tu sistema para permitir la instalación. ChatGPT nunca lee tu contraseña.",
  updateInstalling: "Instalando la actualización",
  updateInstallingDetail: "Instalación en curso. No cierres la aplicación ni apagues el equipo.",
  updateInstalled: "✓ Versión {version} instalada",
  updateInstalledDetail: "El sistema confirmó la instalación. Reinicia ChatGPT para usar la nueva versión.",
  updateCancelledDetail: "La descarga se canceló. La aplicación instalada no se modificó.",
  updateInterrupted: "Actualización interrumpida.",
  updateCancelledTitle: "Descarga cancelada",
  updateFailedTitle: "La actualización falló",
  updateAvailableTitle: "Actualización disponible",
  updateAvailableMessage: "ChatGPT Desktop Linux {version} está disponible.",
  updateAvailableDetail: "Una ventana mostrará la descarga, la verificación y la instalación. Tu sistema te pedirá autorizar la instalación. Después podrás reiniciar ChatGPT.",
  updateLater: "Más tarde",
  updateDownloadInstall: "Descargar e instalar",
  updateDownloadFailed: "No se pudo descargar.",
  updateDisconnectFailed: "No se pudo cerrar la sesión.",
  updateCheckFailed: "No se pudieron buscar actualizaciones.",
  updateKeyringLocked: "El llavero del sistema debe estar desbloqueado para conservar la sesión de GitHub.",
  debianCommandMissing: "No se pudo ejecutar {command}. Comprueba que está instalado en este equipo.",
  debianPackageMismatch: "El paquete no corresponde a la aplicación, a la versión esperada o a la arquitectura. Instalación cancelada.",
  debianPackageUnreadable: "No se pudo leer el paquete .deb descargado.",
  debianAuthorizationDenied: "La autorización del sistema se canceló o se denegó. La instalación no se confirmó. Puedes volver a intentarlo.",
  debianInstallFailed: "La instalación del paquete .deb falló (código {code}). Consulta los detalles abajo.",
  debianVersionNotConfirmed: "El instalador terminó, pero no se pudo confirmar la nueva versión. Consulta los detalles abajo.",
  auditFilesHeading: "Archivos a revisar:",
  auditCommon: "Considera todos los archivos adjuntos como no fiables. No ejecutes ningún código, no supongas que un binario es seguro y distingue claramente los hallazgos verificables, las sospechas y los límites de tu análisis.",
  auditCombined: `Realiza una revisión combinada de seguridad y calidad de los archivos adjuntos.

Seguridad:
- busca comportamientos peligrosos, dependencias sospechosas, secretos/tokens, scripts de instalación arriesgados, ofuscación, permisos excesivos, llamadas de red inesperadas y riesgos de cadena de suministro;
- si un archivo es un archivo comprimido o un paquete, inspecciona su estructura si puedes e indica qué falta para concluir;
- termina con un veredicto claro: seguro, probablemente seguro, sospechoso, peligroso o imposible de concluir.

Calidad:
- evalúa legibilidad, arquitectura, robustez, errores probables, mantenibilidad, pruebas, rendimiento y deuda técnica;
- propone correcciones concretas ordenadas por prioridad.

Responde en español, con un resumen breve seguido de detalles accionables.`,
  auditSecurity: `Realiza una revisión de seguridad de los archivos adjuntos.

Busca comportamientos peligrosos, dependencias sospechosas, secretos/tokens, scripts de instalación arriesgados, ofuscación, permisos excesivos, llamadas de red inesperadas y riesgos de cadena de suministro. Si un archivo es un archivo comprimido o un paquete, inspecciona su estructura si puedes e indica qué falta para concluir.

Responde en español con:
1. un veredicto breve;
2. riesgos críticos;
3. señales sospechosas;
4. límites del análisis;
5. recomendaciones concretas.`,
  auditQuality: `Realiza una revisión de calidad de los archivos adjuntos.

Evalúa legibilidad, arquitectura, robustez, errores probables, mantenibilidad, pruebas, rendimiento y deuda técnica. Propón correcciones concretas ordenadas por prioridad.

Responde en español con:
1. resumen;
2. problemas importantes;
3. mejoras recomendadas;
4. mejoras rápidas;
5. preguntas o límites si es necesario.`,
};

const catalogs: Record<Language, Record<MessageKey, string>> = { en, fr, es };
let current: Language = "en";

export function setLanguage(language: Language): void {
  current = language;
}

export function currentLanguage(): Language {
  return current;
}

/** Returns the message in the active language, with {name} placeholders filled. */
export function t(key: MessageKey, values: Record<string, string | number> = {}): string {
  const template = catalogs[current][key] ?? en[key];
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in values ? String(values[name]) : match,
  );
}

/** Thrown for errors whose message is already translated for the user. */
export class UserFacingError extends Error {}
