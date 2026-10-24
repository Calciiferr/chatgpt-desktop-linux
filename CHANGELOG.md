# Historique des versions

## 0.7.0-beta.33

### Test temporaire du système de mise à jour

Cette préversion sert uniquement à vérifier le téléchargement, l'installation et le redémarrage depuis l'updateur de l'application.

- Bandeau **TEST DE MISE À JOUR — beta 33 installée** visible en haut de la fenêtre principale après installation et redémarrage.
- Aucun autre changement fonctionnel par rapport à la beta 32.

### Comment tester

Depuis la beta 32, utiliser **Paramètres → Mises à jour → Rechercher maintenant**, puis lancer le téléchargement et l'installation. Ne pas installer cette version manuellement si le but est de vérifier l'updateur. La vérification automatique au démarrage peut également la proposer.

Le bandeau est un repère visuel de la version exécutée après redémarrage. Cette version de test est destinée à être remplacée par une version de nettoyage, puis retirée des Releases à la demande de l'utilisateur.

## 0.7.0-beta.32

### Mises à jour : un suivi visible jusqu'au résultat

Le bouton d'installation ne se contente plus de confier le fichier `.deb` à l'application associée sur le bureau. Une fenêtre dédiée accompagne désormais la mise à jour.

- Progression du téléchargement en pourcentage et en Mo, avec possibilité d'annuler avant l'installation.
- Vérification de la taille, de l'empreinte SHA-256, du nom du paquet, de sa version et de son architecture.
- Installation explicite par APT via `pkexec` : KDE affiche la demande d'autorisation système si nécessaire. L'application ne lit jamais le mot de passe.
- Détails de l'installation consultables dans la fenêtre ; erreurs et refus d'autorisation affichés explicitement.
- Succès affiché uniquement après confirmation de la version installée par Debian, puis bouton **Redémarrer ChatGPT**.
- Fermeture protégée pendant l'installation afin de conserver le suivi de l'opération.

### Installation et limites

Pour bénéficier de ce nouveau parcours, installer cette version une première fois manuellement : les anciennes versions utilisent encore leur ancien mécanisme de mise à jour.

```bash
sudo apt install ./ChatGPT-Desktop-Linux-0.7.0-beta.32-amd64.deb
```

Cette fonction cible les paquets Debian amd64. La compilation et les tests automatisés couvrent les commandes et les erreurs ; l'installation complète avec autorisation KDE reste à valider sur les machines utilisatrices.

## 0.7.0-beta.31

### Des couleurs pour les conversations

- Nouvelle entrée **Couleur** dans le menu des trois points d'une conversation.
- Palette de 10 couleurs, sélecteur personnalisé et aperçu du fond dégradé avant validation.
- Boutons **Appliquer**, **Annuler** et **Aucune couleur** pour retrouver l'apparence d'origine.
- Choix associés à l'identifiant de la conversation : ils restent valables après renommage et relance.
- Couleurs appliquées aux onglets de l'application et conservées localement, sans modifier les données ChatGPT ni les synchroniser entre ordinateurs.

### Installation

Disponible depuis la recherche de mises à jour des versions déjà équipées de cette fonction, ou par installation manuelle :

```bash
sudo apt install ./ChatGPT-Desktop-Linux-0.7.0-beta.31-amd64.deb
```

L'intégration dépend du menu et du HTML de ChatGPT, qui peuvent évoluer. Le parcours d'installation avec fenêtre de suivi est ajouté dans la beta 32.

## 0.7.0-beta.30

### Connexion GitHub et recherche des mises à jour

Cette Release regroupe les ajouts développés dans les betas locales 26 à 30.

- Nouvelle section **Mises à jour** : recherche automatique au démarrage, désactivable, et bouton **Rechercher maintenant**.
- Bouton **Se connecter à GitHub** : code temporaire affiché dans l'application et autorisation sur la page officielle GitHub. Aucun jeton ni adresse de dépôt à saisir.
- Connexion conservée chiffrée dans le trousseau système, renouvellement automatique et déconnexion locale.
- Boutons adaptés à l'état de connexion ; vérification réelle à l'ouverture des paramètres ou avec **Vérifier la connexion**.
- Compte GitHub confirmé affiché en vert avec une coche.
- Comparaison explicite entre version installée et dernière Release compatible : version locale plus récente, version identique, mise à jour disponible ou absence de paquet comparable.
- Téléchargement annulable avec contrôle de taille et SHA-256.

### Destination des nouveaux onglets

- Réglage permettant de choisir ChatGPT normal ou un projet synchronisé pour **Ctrl+T** et le bouton **+**.
- Choix indépendant du projet par défaut de la Magic Bar ; retour à ChatGPT normal si le projet n'est plus disponible.

### Installation et accès

Le compte de chaque utilisateur doit avoir accès au dépôt privé. Depuis une ancienne version sans système de mise à jour, installer le paquet manuellement :

```bash
sudo apt install ./ChatGPT-Desktop-Linux-0.7.0-beta.30-amd64.deb
```

Les installations beta peuvent recevoir les préversions. Dans cette version, l'installation est confiée au gestionnaire de fichiers `.deb` du système ; son suivi visible est amélioré dans la beta 32.

## 0.7.0-beta.25

### Synchronisation des projets réparée

- Détection adaptée au nouveau HTML de ChatGPT, avec lecture directe des identifiants des projets.
- Conservation des projets épinglés et de leur ordre ; groupes **Projets épinglés** et **Autres projets** dans les sélecteurs.
- Emojis uniquement sur les catégories, sans les répéter sur chaque projet.
- Attente prolongée lorsque la liste des projets tarde à charger.
- Message d'échec précisant que les projets du cache sont conservés : une liste utilisable peut subsister même si la dernière synchronisation a échoué.

### Distribution Linux

- Dépendances du paquet Debian explicites pour Electron et les intégrations KDE Plasma 6.
- Navigation d'authentification maintenue dans la session de l'application, avec tests des destinations autorisées.

```bash
sudo apt install ./ChatGPT-Desktop-Linux-0.7.0-beta.25-amd64.deb
```

La connexion et la synchronisation réelles restent dépendantes de la machine et de l'interface ChatGPT ; les tests automatisés ne remplacent pas leur validation utilisateur.
