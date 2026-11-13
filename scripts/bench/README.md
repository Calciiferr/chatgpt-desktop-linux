# Banc de mesure NestFolders / onglets ChatGPT

Outils de l'audit de performance (phase 2), conservés comme test de non-régression.
Ils pilotent une instance **de test** via le protocole DevTools : ils ne doivent
jamais viser le profil réel.

## Lancer une instance de test

```bash
PROFILE=~/Documents/Diagnostics-Kubuntu/ChatGPT-Desktop-Audit/profil-test \
  scripts/bench/run-test-profile.sh            # build du dépôt, XWayland
scripts/bench/run-test-profile.sh --wayland    # build du dépôt, Wayland natif
scripts/bench/run-test-profile.sh --installed  # paquet installé, Wayland
```

- `PROFILE` est une **copie** de `~/.config/ChatGPT` (sans `Partitions/chatgpt/Cache`).
  Dans sa copie de `settings.json`, désactiver `checkUpdatesOnStartup` et changer les
  raccourcis globaux.
- Le mode build force XWayland : l'instance de test ne charge alors pas le script KWin
  de la Magic Bar et ne touche pas KGlobalAccel. Elle peut donc tourner à côté de
  l'application réelle.
- `--wayland` (build du dépôt) et `--installed` (paquet installé) tournent en Wayland natif. **Fermez d'abord l'application
  réelle** : ce mode recharge le script KWin partagé.
- Ports : inspecteur du processus principal sur `127.0.0.1:9229`, DevTools des onglets
  sur `127.0.0.1:9222`.

## Mesurer

```bash
node scripts/bench/main-eval.mjs -e "BrowserWindow.getAllWindows()[0].maximize()"
node scripts/bench/measure.mjs A-maxi scroll-chat 3      # idle | scroll-chat | scroll-sidebar | hover-sidebar | hover-chat
node scripts/bench/trace.mjs A-maxi scroll-sidebar        # trace Chromium (ouvrable dans DevTools > Performance)
node scripts/bench/analyze.mjs <fichier-trace.json>       # longues tâches, restyles, coût par script
```

- `measure.mjs` cible l'onglet visible dont `innerWidth` vaut `W` (1920 par défaut). Cela
  écarte la fenêtre cachée de scan des projets.
- Les résultats sont ajoutés à `$BENCH_OUT/mesures.jsonl`. Par défaut, `BENCH_OUT` vaut
  `~/Documents/Diagnostics-Kubuntu/ChatGPT-Desktop-Audit/bench`.
- Chaque relevé contient : le JS du thread principal (`ScriptMs`), le nombre et la durée
  des layouts et restyles, les percentiles d'intervalle entre frames, le temps
  d'échantillonnage par origine (`nestfolders` / `chatgpt`) et les fonctions de
  l'extension les plus coûteuses.
- La première frame de chaque relevé (~200 ms) est un artefact du démarrage de
  l'observateur : ne pas en tenir compte.

## Comparaison sans NestFolders (B)

```bash
node scripts/bench/main-eval.mjs -e "const s=session.fromPartition('persist:chatgpt'); for (const e of s.extensions.getAllExtensions()) s.extensions.removeExtension(e.id); for (const w of webContents.getAllWebContents()) if (w.getURL().startsWith('https://chatgpt.com')) w.reload();"
```

## Référence (phase 2, 2026-11-13, avant correctifs)

| Scénario | JS A (avec) | JS B (sans) | Part NestFolders |
|---|---|---|---|
| scroll-chat | 213 ms | 66 ms | 156 ms |
| scroll-sidebar | 214 ms | 36 ms | 164 ms |
| hover-sidebar | 101 ms | 80 ms | 24 ms |

**Critère après correctifs : JS A ≤ JS B + 10 %, et pas de frames > 50 ms supplémentaires.**
Les ~105 ms de restyle au défilement de la barre latérale viennent de ChatGPT : ils sont
présents en B.

Autres outils :
- `tab-eval.mjs <visible|index|all> <main|ext> -e "…"` évalue du code dans un onglet, dans
  le monde de la page ou dans celui de NestFolders ;
- `input.mjs click|move|key|drag …` envoie de vraies entrées à l'onglet visible.
