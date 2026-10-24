# Historique des versions

## 0.7.0-beta.30

- Comparaison explicite entre version installée et dernière Release compatible : plus récente localement, identique, mise à jour disponible, ou aucun paquet comparable.
- Connexion GitHub vérifiée en vert avec coche ; statuts de mise à jour visuels et textuels.

## 0.7.0-beta.29 (non publiée)

- Boutons de connexion et déconnexion affichés selon l'état GitHub.
- Vérification réelle de la connexion à l'ouverture des paramètres et bouton de vérification manuelle ; affichage du compte connecté.

## 0.7.0-beta.28 (non publiée)

- Bouton Se connecter à GitHub par code temporaire officiel, renouvellement automatique et déconnexion locale ; suppression du champ de jeton manuel.

## 0.7.0-beta.27 (non publiée)

- Vérification optionnelle des mises à jour au démarrage et recherche manuelle dans les paramètres.
- Accès au dépôt privé via un jeton GitHub en lecture, conservé chiffré dans le trousseau système.
- Téléchargement annulable avec contrôle de taille et SHA-256, puis ouverture de l'installateur Debian. L'installation nécessite une confirmation système.

## 0.7.0-beta.26 (non publiée)

- Destination configurable pour Ctrl+T et le bouton nouvel onglet : ChatGPT normal ou un projet du cache synchronisé.
- Réglage indépendant de la Magic Bar ; retour à ChatGPT normal si le projet n'est plus disponible.

## 0.7.0-beta.25

- Synchronisation des projets adaptée au nouveau HTML ChatGPT, avec lecture directe des identifiants.
- Conservation des groupes de projets épinglés et des autres projets ; emojis uniquement sur les catégories.
- Attente prolongée lorsque la liste des projets tarde à charger. En cas d'échec, le message indique que le cache est conservé.
- Dépendances Debian explicites pour Electron et les intégrations KDE Plasma 6.
- Navigation d'authentification conservée dans la session de l'application.

La compilation et les tests automatisés ne remplacent pas la vérification de la connexion et de la synchronisation sur la machine destinataire.
