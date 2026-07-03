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

## Notes importantes

- L’intégration au tray, aux raccourcis globaux, à KRunner et à Dolphin est conçue en priorité pour KDE Plasma ; certaines fonctions peuvent être limitées sur un autre environnement.
- La session Chromium, les réglages et le cache local des projets sont conservés dans `~/.config/ChatGPT/`.
- Les paquets générés sont placés dans `release/`. Le code compilé est placé dans `dist/`.
