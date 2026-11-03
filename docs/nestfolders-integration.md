# NestFolders dans ChatGPT Desktop Linux — branche de test

Implémentation expérimentale, isolée de `main`. Aucun GitHub Release ni push depuis la machine n'est requis.

## Fonctionnement
- Les projets sont les projets natifs d'OpenAI. NestFolders range visuellement les conversations **dans chaque projet**, en dossiers et sous-dossiers sans limite programmée.
- Glisser-déposer : une conversation déjà présente dans un projet peut être déplacée dans ses dossiers. Aucune conversation n'est déplacée d'un projet OpenAI vers un autre.
- Sur la liste des conversations du projet actif, un premier dossier est créé à la première ouverture. Dans son menu « … », **New folder** crée un sous-dossier.
- **Ctrl+Alt+Maj+F** crée un nouveau dossier à la racine de la liste affichée (du projet actif, ou des conversations hors projet), et permet de le renommer.
- La couleur des conversations de l'application a été retirée. Les couleurs des *dossiers* appartiennent à NestFolders.

## Adaptation Electron
- NestFolders upstream 1.1.0 (licence MIT conservée), scripts sources dans `vendor/nestfolders/`.
- Le bundle est livré dans `resources/nestfolders/` dans le .deb. Electron charge l'extension unpacked via `session.fromPartition("persist:chatgpt").extensions.loadExtension` **avant** de créer le premier onglet.
- **Electron ne prend pas en charge `chrome.storage.sync` : utilisation explicite de `chrome.storage.local`.** Données locales à l'application, non synchronisées vers Firefox, d'autres PC ou des appareils mobiles.
- L'extension native Chrome utilise un popup ; Electron n'affiche pas ce bouton d'extension dans notre interface. Un raccourci de création de dossiers racine est ajouté ; **l'export/import depuis le popup reste à intégrer**. Ne pas considérer cette première version comme une intégration complète.
- Les dossiers ne modifient ni messages ni instructions des projets. Les chemins et titres des conversations peuvent être conservés dans le stockage de l'extension.
- Le code de l'extension manipule le DOM de ChatGPT ; son comportement réel nécessite une validation dans une session connectée.

## Procédure d'essai sur Kubuntu
Depuis la **racine de l'application**, vérifier d'abord `git status --short`. Ne pas changer de branche si des modifications non commit sont présentes.

```bash
git fetch origin
git switch --track origin/feature/nestfolders-electron
npm ci
npm test
npm run dist:deb
sudo apt install ./release/ChatGPT-Desktop-Linux-0.7.0-beta.34-nestfolders.1-amd64.deb
```

Si la branche existe déjà localement, utiliser `git switch feature/nestfolders-electron` puis `git pull --ff-only`.

**Avant d'installer le test**, conserver une copie de l'ancien fichier .deb (dans un répertoire distinct de la sortie `release/`) et noter son chemin. La commande `npm run dist:deb` archive les précédents paquets de `release/` dans `release/OLD/` ; elle refuse aussi d'écraser un .deb portant exactement la même version.

## Retour arrière
```bash
# Fermer complètement l'application ChatGPT Desktop, y compris dans la zone de notification
git switch main
sudo apt install /chemin/vers/ancien-paquet.deb
```
Git restaure le code ; l'installation de l'ancien .deb restaure le programme. **Git ne restaure pas les données utilisateur**. Avant les essais, sauvegarder le répertoire de données Electron de l'application (après l'avoir quittée). Le stockage NestFolders de la session persistante restera présent après rollback mais ne sera plus chargé par l'ancienne version.

## Points de contrôle manuels
- Les dossiers apparaissent sur la liste principale ET sur les conversations d'un projet existant.
- Créer un sous-dossier, déplacer une conversation existante dedans, replier/déplier, recharger et redémarrer.
- Changer de projet : aucune arborescence ne doit se mélanger.
- Conversations, messages, gestion des projets, Magic Bar, onglets, connexion et mise à jour doivent rester fonctionnels.
- Vérifier les logs pour `[nestfolders]`. Si le chargement échoue, les conversations natales doivent rester visibles.

Aucune publication ni fusion dans `main` tant que l'essai n'est pas validé.
