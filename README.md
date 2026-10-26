# ChatGPT Desktop Linux

ChatGPT dans une fenêtre dédiée sous Linux, avec des onglets, des raccourcis clavier et une Magic Bar pour préparer ses messages. L'application est conçue pour KDE Plasma et Wayland.

Client non officiel, indépendant d'OpenAI. Un compte ChatGPT est nécessaire ; aucun abonnement API n'est requis.

[**Télécharger l'application**](https://github.com/Calciiferr/chatgpt-desktop-linux/releases) · [Notes de version](CHANGELOG.md)

## Fonctionnalités

### Navigation

- Plusieurs conversations ouvertes dans des onglets.
- Raccourcis pour ouvrir, fermer et retrouver ses onglets.
- Recherche dans la conversation avec `Ctrl+F`.
- Ouverture des nouveaux onglets dans ChatGPT ou dans le projet de son choix.
- Restauration des onglets au démarrage, en option.

### Magic Bar

La Magic Bar s'ouvre avec `Ctrl+Shift+Espace`. Elle permet de préparer un message, d'y joindre des fichiers, des images du presse-papiers ou des captures d'écran, puis de transférer le tout vers ChatGPT.

- Choix d'un projet et synchronisation de la liste depuis ChatGPT.
- Projets épinglés regroupés en tête de liste.
- Aperçu des images jointes.
- Capture d'une zone, d'une fenêtre ou de l'écran avec Spectacle.

### Personnalisation

- Thèmes clair, sombre ou automatique.
- Couleur par conversation : palette, couleur personnalisée et fond dégradé dans la barre latérale.
- Raccourcis, dimensions de fenêtre et comportement de fermeture configurables.
- Interface en français, anglais et espagnol.

### Intégration au bureau

- Icône dans la zone de notification pour afficher ou masquer l'application.
- Raccourcis globaux KDE et lancement à l'ouverture de session.
- Intégrations avec Dolphin et Kate pour envoyer du contenu vers ChatGPT.
- Notifications de fin de réponse.

## Installation

Le paquet `.deb` est destiné aux systèmes **Kubuntu / KDE Plasma 6 en amd64**.

1. Télécharger le fichier `.deb` depuis les [Releases](https://github.com/Calciiferr/chatgpt-desktop-linux/releases).
2. Depuis le dossier du téléchargement, l'installer avec APT :

```bash
sudo apt install ./ChatGPT-Desktop-Linux-VERSION-amd64.deb
```

Remplacer `VERSION` par la version téléchargée. APT installe les dépendances nécessaires. L'application apparaît ensuite sous le nom **ChatGPT** dans le menu des applications.

Au premier lancement, se connecter à son compte ChatGPT dans la fenêtre de l'application.

## Raccourcis par défaut

| Action | Raccourci |
| --- | --- |
| Afficher ou masquer ChatGPT | `Ctrl+Alt+G` |
| Ouvrir la Magic Bar | `Ctrl+Shift+Espace` |
| Nouvel onglet | `Ctrl+T` |
| Fermer l'onglet | `Ctrl+W` |
| Onglet suivant / précédent | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| Rouvrir le dernier onglet fermé | `Ctrl+Shift+T` |
| Rechercher dans la conversation | `Ctrl+F` |

Les raccourcis se modifient dans les paramètres.

## Mises à jour

L'application peut rechercher les nouvelles versions au démarrage. Une recherche manuelle est également disponible dans **Paramètres → Mises à jour → Rechercher maintenant**.

Pour accéder aux versions du dépôt privé, cliquer sur **Se connecter à GitHub**, saisir le code affiché sur la page GitHub qui s'ouvre, puis autoriser l'application. Le compte utilisé doit avoir accès au dépôt.

Lorsqu'une mise à jour est disponible, une fenêtre suit le téléchargement et l'installation. KDE peut demander une autorisation système. À la fin, cliquer sur **Redémarrer ChatGPT** pour utiliser la nouvelle version.

Les mises à jour conservent la session et les réglages. La recherche automatique peut être désactivée dans les paramètres. Les installations beta reçoivent les préversions.

## À savoir

L'application utilise le site ChatGPT. Certaines fonctions, comme la synchronisation des projets ou les couleurs de conversations, dépendent de son interface et peuvent nécessiter une adaptation lorsque celle-ci évolue.

L'intégration au bureau est conçue pour KDE Plasma. Les autres environnements Linux ne sont pas la cible principale du projet.

## Développement

Le projet utilise Electron, TypeScript et electron-builder.

```bash
npm ci
npm run dev
```

```bash
npm test                 # Tests
npm run build            # Compilation
npm run dist:deb         # Paquet Debian
npm run dist:appimage    # AppImage
```

Les paquets sont générés dans `release/`. Chaque version publiée possède une entrée dans le [changelog](CHANGELOG.md), reprise dans sa Release GitHub.
