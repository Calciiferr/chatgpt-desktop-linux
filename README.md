# ChatGPT Desktop Linux

Application desktop personnelle et non officielle pour utiliser `chatgpt.com` dans une fenêtre dédiée sous Linux. Elle ajoute notamment une navigation par onglets, une icône de zone de notification, des raccourcis globaux, une recherche dans la conversation et une Magic Bar pour préparer un prompt avec du texte ou des fichiers.

Le projet cible principalement KDE Plasma sous Wayland. Il produit des paquets Debian et AppImage, sans utiliser l’API OpenAI ni envoyer automatiquement les prompts préparés.

## Stack technique

- Electron et Node.js pour l’application desktop ;
- TypeScript pour le processus principal et les scripts injectés ;
- HTML, CSS et JavaScript pour les interfaces locales ;
- electron-builder pour les paquets Linux.

## Développement et build

```bash
# Installer les dépendances
npm install

# Compiler puis lancer l’application
npm run dev

# Compiler et exécuter les tests du projet
npm test

# Compiler uniquement
npm run build

# Générer les deux formats Linux
npm run dist

# Générer un format précis
npm run dist:deb
npm run dist:appimage
```

## Distribution sur GitHub

Le code et son historique sont publiés avec Git. Les installateurs `.deb` sont distribués séparément dans l'onglet **Releases** du dépôt ; ils ne sont pas ajoutés au dépôt Git.

Pour installer ou mettre à jour l'application, télécharger le `.deb` depuis **Releases**, quitter complètement ChatGPT, puis lancer :

```bash
sudo apt install ./ChatGPT-Desktop-Linux-VERSION-amd64.deb
```

Remplacer `VERSION` par la version téléchargée. Les réglages et la session ChatGPT sont conservés. Les versions `beta` figurent comme préversions : consulter la liste des Releases, et pas seulement le lien « latest ».

Pour publier une nouvelle version après avoir enregistré les modifications dans des commits :

```bash
# Exemple : choisir une version encore inutilisée.
npm version 0.7.0-beta.26 --no-git-tag-version
# Mettre aussi CHANGELOG.md à jour, puis enregistrer les changements.
git add package.json package-lock.json CHANGELOG.md
git commit -m "chore: release 0.7.0-beta.26"
git tag -a v0.7.0-beta.26 -m "ChatGPT Desktop Linux 0.7.0-beta.26"
git push origin main
git push origin v0.7.0-beta.26
```

Le workflow GitHub Actions vérifie la version, exécute les tests, construit le `.deb`, puis crée la Release avec l'installateur et sa somme SHA-256. Un simple push de code ne publie pas de nouvelle version. Le workflow nécessite GitHub Actions activé sur le dépôt ; sa première exécution devra être vérifiée.

## Notes importantes

- Pour partager l’application sur Kubuntu avec Plasma 6, utiliser le `.deb` et l’installer avec `sudo apt install ./ChatGPT-Desktop-Linux-VERSION-amd64.deb` (en remplaçant `VERSION`). APT installe les dépendances manquantes depuis les dépôts ; les paquets déjà installés et satisfaisant les contraintes sont réutilisés.
- Les dépendances obligatoires du `.deb` sont explicites dans `build.deb.depends` de `package.json` : bibliothèques Electron, Spectacle, outils D-Bus et de configuration KDE 6, KGlobalAccel, KWin/Plasma, portails de bureau, Dolphin et Kate pour leurs intégrations. Cette liste remplace les dépendances par défaut d’electron-builder : conserver les bibliothèques Electron lors des mises à jour.
- Le paquet ne copie pas le compte ChatGPT ni les réglages personnels. Les permissions de session, les conflits de raccourcis et les pilotes de la machine restent indépendants de l’installation des dépendances.

- L’intégration au tray, aux raccourcis globaux, à KRunner et à Dolphin est conçue en priorité pour KDE Plasma ; certaines fonctions peuvent être limitées sur un autre environnement.
- La session Chromium, les réglages et le cache local des projets sont conservés dans `~/.config/ChatGPT/`.
- Les paquets générés sont placés dans `release/`. Le code compilé est placé dans `dist/`.

## Mises à jour depuis le dépôt privé

Dans **Paramètres → Mises à jour**, cliquer sur **Se connecter à GitHub**. L'application affiche un code temporaire et ouvre la page officielle GitHub. S'y connecter avec son propre compte, saisir le code, puis autoriser **Calciiferr Desktop Updates**. Aucun jeton ni URL de dépôt à saisir. Le compte doit avoir accès au dépôt privé.

L'intégration GitHub App doit être installée une seule fois par le propriétaire sur le seul dépôt `Calciiferr/chatgpt-desktop-linux`, avec Contents en lecture. Son identité de connexion peut être publique pour permettre au frère de se connecter ; le code et les Releases restent privés. Aucun secret de l'application n'est embarqué, uniquement son identifiant public. L'accès utilisateur et son renouvellement sont conservés chiffrés dans le trousseau système et ne sont jamais inclus dans le `.deb`. **Se déconnecter de GitHub** efface la connexion de cet ordinateur. Les autorisations peuvent aussi être révoquées dans GitHub.

La vérification au démarrage est activée par défaut une fois connecté à GitHub et peut être désactivée avec la case correspondante, puis **Enregistrer**. **Rechercher maintenant** lance la même recherche manuellement. Une installation beta peut recevoir les préversions ; une installation stable ignore les préversions.

Seules les Releases contenant un `.deb` amd64 avec une empreinte SHA-256 sont proposées. Un push de code sans Release ne constitue pas une mise à jour. Une fenêtre suit le téléchargement, la vérification de la taille et de l'empreinte, puis l'installation APT via une demande d'autorisation KDE (pkexec) ; aucune commande Git n'est exécutée pour modifier l'application installée. Ne pas quitter ChatGPT pendant l'installation. Après confirmation de la version installée par Debian, le bouton Redémarrer ChatGPT permet d'utiliser la nouvelle version. Les erreurs et détails APT restent visibles. L'installation n'est pas silencieuse et peut demander le mot de passe système. Cette fonction cible les installations Debian, pas les AppImage.
