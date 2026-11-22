Tu vas m’aider à créer une extension personnalisée pour **ChatGPT Desktop Linux**, une application de bureau qui affiche chatgpt.com dans sa propre fenêtre. Réponds-moi en français.

## Ce qu’est une extension

Une extension personnalisée est une extension web au format Chrome **Manifest V3** qui s’exécute **uniquement sur la page de ChatGPT** (https://chatgpt.com/). Elle peut lire et modifier cette page : ajouter des boutons, changer la mise en page ou le style, ajouter des raccourcis clavier dans la page, enregistrer ses propres réglages. Elle ne peut pas accéder aux fichiers, lancer des programmes ni modifier l’application elle-même.

## Règles que l’extension doit respecter

L’application refuse l’extension si l’une de ces règles n’est pas respectée.

- `manifest.json` utilise `"manifest_version": 3`, un `name` (60 caractères maximum) et une `version` du type `1.0.0`. `description` et `author` sont recommandés.
- Le code s’exécute uniquement via `content_scripts`. Chaque motif `matches` commence par `https://chatgpt.com/` (par exemple `https://chatgpt.com/*`).
- La seule permission autorisée est `"storage"`. `host_permissions`, s’il est présent, ne contient que des motifs `https://chatgpt.com/`.
- Interdits : `background` (pas de service worker), `action`/popup, pages d’options, `chrome_url_overrides`, `devtools_page`, `externally_connectable`.
- Utilise `chrome.storage.local` pour enregistrer des données (`chrome.storage.sync` n’est pas disponible). La plupart des autres API `chrome.*` ne sont pas disponibles non plus : limite-toi au DOM de la page et à `chrome.storage.local`.
- Uniquement du JavaScript et du CSS simples, sans étape de compilation ni bibliothèque externe chargée depuis internet. Chaque fichier cité dans `manifest.json` doit faire partie de l’extension.
- La page de ChatGPT n’est pas une API publique et change avec le temps. Privilégie les repères stables (`data-testid`, rôles et libellés ARIA) plutôt que les classes générées, attends les éléments avec un `MutationObserver` plutôt qu’avec des délais fixes, et échoue en silence si un élément manque.
- N’envoie jamais le contenu des conversations ailleurs, et ne charge jamais de code distant.

## Exemple minimal

`manifest.json` :

```json
{
  "manifest_version": 3,
  "name": "Mon extension",
  "version": "1.0.0",
  "description": "Ce qu’elle fait, en une phrase.",
  "author": "Votre nom",
  "permissions": ["storage"],
  "content_scripts": [
    {
      "matches": ["https://chatgpt.com/*"],
      "js": ["content.js"],
      "css": ["style.css"],
      "run_at": "document_idle"
    }
  ]
}
```

## Ce que j’attends de toi

1. Pose-moi des questions si ma demande n’est pas claire.
2. Écris chaque fichier de l’extension en entier, avec de courts commentaires.
3. Fournis-la sous forme de **fichier .zip** avec `manifest.json` à la racine de l’archive. Si tu ne peux pas créer de fichiers, donne-moi chaque fichier et la commande pour créer l’archive, par exemple `zip -r mon-extension.zip manifest.json content.js style.css`.
4. Explique-moi comment l’installer : dans ChatGPT Desktop Linux, **Paramètres → Extensions → Ajouter une extension (.zip)…**, puis choisir le fichier .zip.

## L’extension que je veux
