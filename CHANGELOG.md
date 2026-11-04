# Notes de version

## 0.7.0-beta.34-nestfolders.2 (branche de test, sans Release)

- Correction de l'initialisation NestFolders lorsque ChatGPT ne fournit plus de liste globale d'historique.
- Recherche des conversations de projet sans dépendance aux anciens attributs de la barre latérale.
- Bouton + indépendant de la présence de l'ancien conteneur d'historique.
- Les conversations des projets restent isolées de l'historique général.

## 0.7.0-beta.34-nestfolders.1 (branche de test, sans Release)

- Remplacement des couleurs des conversations par NestFolders 1.1.0 (licence MIT).
- Dossiers virtuels imbriqués à l'intérieur des vrais projets ChatGPT, avec glisser-déposer.
- Bouton discret « + » à droite de la ligne du projet actif ou survolé ; le menu « … » d'un dossier permet de créer un sous-dossier.
- Aucun raccourci clavier requis ni dossier créé automatiquement.
- Adaptation Electron : chargement de l'extension dans la session ChatGPT et stockage local `chrome.storage.local` (pas de synchronisation).
- Essai réservé à la branche `feature/nestfolders-electron` ; aucune publication de mise à jour.


## 0.7.0-beta.33

- Version temporaire pour tester la mise à jour depuis la beta 32.
- Ajout d'un bandeau **TEST DE MISE À JOUR — beta 33 installée** dans la fenêtre principale, visible après redémarrage.

## 0.7.0-beta.32

- Nouvelle fenêtre de suivi des mises à jour, du téléchargement au redémarrage.
- Progression du téléchargement en pourcentage et en Mo, avec possibilité d'annuler.
- Installation par APT avec demande d'autorisation KDE.
- Affichage des erreurs et des détails d'installation.
- Confirmation de la version installée avant de proposer le redémarrage.

## 0.7.0-beta.31

- Nouvelle entrée **Couleur** dans le menu des conversations.
- Palette de 10 couleurs, sélecteur personnalisé et aperçu du fond dégradé.
- Options **Appliquer**, **Annuler** et **Aucune couleur**.
- Couleurs conservées après renommage et redémarrage, et partagées entre les onglets de l'application.

## 0.7.0-beta.30

- Recherche des mises à jour au démarrage et bouton de recherche manuelle dans les paramètres.
- Connexion GitHub par code temporaire, renouvellement de session et déconnexion.
- Affichage du compte connecté et bouton pour vérifier la connexion.
- Comparaison entre la version installée et la dernière version disponible, y compris lorsqu'une version locale est plus récente.
- Choix du projet à ouvrir avec **Ctrl+T** ou le bouton **+**, indépendant de la Magic Bar.

## 0.7.0-beta.25

- Synchronisation des projets adaptée à la nouvelle interface ChatGPT.
- Groupes **Projets épinglés** et **Autres projets** dans les sélecteurs.
- Conservation de l'ordre des projets épinglés.
- Meilleure gestion du chargement de la liste et des échecs de synchronisation.
- Connexion à ChatGPT maintenue dans la fenêtre de l'application.
- Mise à jour des dépendances du paquet Debian pour KDE Plasma 6.
