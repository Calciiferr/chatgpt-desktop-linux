#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
Usage: ./scripts/make-ai-handoff-zip.sh [--include-debug]

Create a clean source archive for an AI handoff.
EOF
}

INCLUDE_DEBUG=false
case "${1:-}" in
  "") ;;
  --include-debug) INCLUDE_DEBUG=true ;;
  -h|--help)
    usage
    exit 0
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac

if [[ $# -gt 1 ]]; then
  usage >&2
  exit 2
fi

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)"
PROJECT_ROOT="$(cd -- "$SCRIPT_DIR/.." && pwd -P)"
CURRENT_DIR="$(pwd -P)"

if [[ "$CURRENT_DIR" != "$PROJECT_ROOT" ]]; then
  echo "Erreur : lancez ce script depuis la racine du projet :" >&2
  echo "  $PROJECT_ROOT" >&2
  exit 1
fi

if [[ ! -f "$PROJECT_ROOT/package.json" ]]; then
  echo "Erreur : package.json est introuvable à la racine du projet." >&2
  exit 1
fi

if ! command -v zip >/dev/null 2>&1; then
  echo "Erreur : la commande zip n'est pas installée." >&2
  echo "Installez-la avec : sudo apt install zip" >&2
  exit 1
fi

OUTPUT_DIR="$HOME/Projects/chatgpt-ai-handoff"
mkdir -p -- "$OUTPUT_DIR"

while :; do
  TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
  ZIP_NAME="chatgpt-desktop-linux-ai-handoff-${TIMESTAMP}.zip"
  ZIP_PATH="$OUTPUT_DIR/$ZIP_NAME"
  [[ ! -e "$ZIP_PATH" ]] && break
  sleep 1
done

STAGING_DIR="$(mktemp -d "$OUTPUT_DIR/.handoff-staging.XXXXXX")"
cleanup() {
  rm -rf -- "$STAGING_DIR"
}
trap cleanup EXIT INT TERM

echo "Dossier source : $PROJECT_ROOT"
echo "Dossier de sortie : $OUTPUT_DIR"
echo "Nom du zip : $ZIP_NAME"
echo "Mode debug activé : $INCLUDE_DEBUG"

copy_if_present() {
  local item="$1"
  if [[ -e "$PROJECT_ROOT/$item" ]]; then
    cp -a -- "$PROJECT_ROOT/$item" "$STAGING_DIR/"
  fi
}

for item in \
  src renderer assets build scripts \
  package.json package-lock.json npm-shrinkwrap.json tsconfig.json \
  .gitignore README.md README; do
  copy_if_present "$item"
done

shopt -s nullglob
config_files=(
  "$PROJECT_ROOT"/vite.config.*
  "$PROJECT_ROOT"/electron-builder.*
  "$PROJECT_ROOT"/eslint.config.*
  "$PROJECT_ROOT"/.eslintrc*
  "$PROJECT_ROOT"/.prettierrc*
  "$PROJECT_ROOT"/prettier.config.*
  "$PROJECT_ROOT"/jest.config.*
  "$PROJECT_ROOT"/vitest.config.*
  "$PROJECT_ROOT"/playwright.config.*
)
for config_file in "${config_files[@]}"; do
  cp -a -- "$config_file" "$STAGING_DIR/"
done
shopt -u nullglob

# Apply the deny list after copying so excluded artifacts are also removed when
# they happen to be nested inside an otherwise useful source directory.
find "$STAGING_DIR" -depth -type d \( \
  -name .git -o -name node_modules -o -name dist -o -name release \
  -o -name .cache -o -name .vite -o -name .electron \
  -o -name coverage -o -name out -o -name __pycache__ \
  -o -name 'Session Storage' -o -name Sessions -o -name sessions \
  -o -name 'User Data' \
\) -exec rm -rf -- {} +

find "$STAGING_DIR" -type f \( \
  -name '.env' -o -name '.env.*' -o -name '*.log' \
  -o -name '*.deb' -o -name '*.AppImage' -o -name '*.asar' \
  -o -name '*.zip' -o -name '*.tar' -o -name '*.gz' \
  -o -name '*.tgz' -o -name '*.bz2' -o -name '*.xz' \
  -o -name '*.7z' -o -name '*.rar' \
  -o -name '*.tmp' -o -name '*.temp' -o -name '*.swp' \
  -o -name '*.swo' -o -name '*~' -o -name '.DS_Store' \
\) -delete

PACKAGE_VERSION="$(sed -nE 's/^[[:space:]]*"version"[[:space:]]*:[[:space:]]*"([^"]+)".*/\1/p' package.json | head -n 1)"
PACKAGE_VERSION="${PACKAGE_VERSION:-inconnue}"
GIT_BRANCH="indisponible"
GIT_LAST_COMMIT="indisponible"
GIT_SHORT_STATUS="indisponible"

if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  GIT_BRANCH="$(git branch --show-current 2>/dev/null || true)"
  GIT_BRANCH="${GIT_BRANCH:-HEAD détachée}"
  GIT_LAST_COMMIT="$(git log -1 --pretty=format:'%h %s' 2>/dev/null || true)"
  GIT_LAST_COMMIT="${GIT_LAST_COMMIT:-indisponible}"
  GIT_SHORT_STATUS="$(git status --short 2>/dev/null || true)"
  GIT_SHORT_STATUS="${GIT_SHORT_STATUS:-propre}"
fi

DEB_COMMAND="aucune commande détectée"
if command -v node >/dev/null 2>&1; then
  DETECTED_DEB_SCRIPT="$(node -e '
    const scripts = require("./package.json").scripts || {};
    const name = Object.keys(scripts).find((key) => key === "dist:deb")
      || Object.keys(scripts).find((key) => /deb/i.test(key) && /electron-builder[^\n]*deb/i.test(scripts[key]));
    if (name) process.stdout.write(`${name}\t${scripts[name]}`);
  ' 2>/dev/null || true)"
  if [[ -n "$DETECTED_DEB_SCRIPT" ]]; then
    DEB_SCRIPT_NAME="${DETECTED_DEB_SCRIPT%%$'\t'*}"
    DEB_SCRIPT_BODY="${DETECTED_DEB_SCRIPT#*$'\t'}"
    DEB_COMMAND="npm run $DEB_SCRIPT_NAME (script : $DEB_SCRIPT_BODY)"
  fi
fi

cat > "$STAGING_DIR/AI_HANDOFF_CURRENT_STATE.txt" <<EOF
ÉTAT COURANT POUR TRANSFERT IA
==============================

Date de génération : $(date --iso-8601=seconds)
Chemin du projet : $PROJECT_ROOT
Version package.json : $PACKAGE_VERSION
Branche Git : $GIT_BRANCH
Dernier commit Git : $GIT_LAST_COMMIT
État Git court :
$GIT_SHORT_STATUS

Commandes utiles :
  npm ci
  npm test
  npm run build
  Génération .deb détectée : $DEB_COMMAND

Le paquet .deb doit être construit localement par l'utilisateur. Cette archive
n'en contient pas et sa création ne lance aucun packaging.

Invariants critiques :
  - aucun envoi automatique ;
  - aucune lecture automatique du presse-papiers ;
  - cache projets jamais vidé sur échec ;
  - projets identifiés par URL/projectId, jamais par nom seul ;
  - ne pas utiliser X11/XWayland comme solution ;
  - ne pas faire de refactor global non demandé ;
  - Git local uniquement, aucun push.
EOF

if [[ "$INCLUDE_DEBUG" == true ]]; then
  mkdir -p -- "$STAGING_DIR/debug"

  if command -v git >/dev/null 2>&1 && git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    git status --short --branch > "$STAGING_DIR/debug/git-status.txt" 2>&1 || true
    git log -10 --date=short --pretty=format:'%h %ad %s' > "$STAGING_DIR/debug/git-last-commits.txt" 2>&1 || true
  else
    echo "Git indisponible ou dossier hors dépôt." > "$STAGING_DIR/debug/git-status.txt"
    echo "Historique Git indisponible." > "$STAGING_DIR/debug/git-last-commits.txt"
  fi

  if command -v node >/dev/null 2>&1; then
    node -e '
      const scripts = require("./package.json").scripts || {};
      for (const name of Object.keys(scripts).sort()) console.log(`${name}: ${scripts[name]}`);
    ' > "$STAGING_DIR/debug/package-scripts.txt" 2>&1 || true
  else
    echo "Node.js indisponible ; consultez package.json." > "$STAGING_DIR/debug/package-scripts.txt"
  fi

  {
    echo "Date : $(date --iso-8601=seconds)"
    echo "Système : $(uname -srm)"
    if [[ -r /etc/os-release ]]; then
      . /etc/os-release
      echo "Distribution : ${PRETTY_NAME:-inconnue}"
    fi
    echo "Architecture : $(uname -m)"
    echo "Node.js : $(node --version 2>/dev/null || echo indisponible)"
    echo "npm : $(npm --version 2>/dev/null || echo indisponible)"
    echo "Git : $(git --version 2>/dev/null || echo indisponible)"
    echo "Session graphique : ${XDG_SESSION_TYPE:-inconnue}"
  } > "$STAGING_DIR/debug/system-summary.txt"
fi

(cd -- "$STAGING_DIR" && zip -q -r "$ZIP_PATH" .)

# Split sensitive terms in this script so the scanner does not flag its own
# pattern definition merely because the utility itself is included.
SUSPECT_PATTERN='to''ken|bear''er|authori''zation|coo''kie|sec''ret|pass''word|api_''key|access_''to''ken|refresh_''to''ken'
suspicious_paths=()
while IFS= read -r -d '' file; do
  if grep -IilE "$SUSPECT_PATTERN" -- "$file" >/dev/null 2>&1; then
    suspicious_paths+=("${file#"$STAGING_DIR/"}")
  fi
done < <(find "$STAGING_DIR" -type f -print0)

echo
echo "Archive créée : $ZIP_PATH"
echo "Taille : $(du -h -- "$ZIP_PATH" | cut -f1)"
echo "Exclusions principales : .git, node_modules, dist, release, caches, sessions, .env, logs, paquets et archives."

if [[ ${#suspicious_paths[@]} -eq 0 ]]; then
  echo "Vérification anti-sec""rets : aucun motif suspect évident trouvé."
else
  echo "Vérification anti-sec""rets : avertissement, motifs suspects trouvés dans :"
  printf '  - %s\n' "${suspicious_paths[@]}"
fi
echo "Vérifiez toujours manuellement le contenu avant d'envoyer le zip."
