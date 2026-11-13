#!/usr/bin/env bash
# Launch ChatGPT Desktop Linux on an isolated *test* profile with debugging ports.
# Default: repository build under XWayland (does not load the shared KWin Magic Bar
# script nor touch KGlobalAccel, so it can run next to the real application).
# --wayland: repository build under native Wayland (close the real app first).
# --installed: installed package under native Wayland (close the real app first).
set -euo pipefail
PROFILE="${PROFILE:?Set PROFILE to a COPY of ~/.config/ChatGPT}"
if [[ "$PROFILE" == "$HOME/.config/ChatGPT" ]]; then
  echo "Refus : PROFILE doit être une copie, pas le profil réel." >&2
  exit 1
fi
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DEBUG_ARGS=(--user-data-dir="$PROFILE" --inspect=127.0.0.1:9229
  --remote-debugging-port=9222 --remote-debugging-address=127.0.0.1)

if [[ "${1:-}" == "--installed" ]]; then
  shift
  exec "/opt/ChatGPT Desktop Linux/chatgpt-desktop-linux" "${DEBUG_ARGS[@]}" "$@"
fi
cd "$ROOT"
npm run build >/dev/null
if [[ "${1:-}" == "--wayland" ]]; then
  # Native Wayland, like daily use. Loads the shared KWin Magic Bar script: close the
  # real application first.
  shift
  exec node_modules/.bin/electron . "${DEBUG_ARGS[@]}" "$@"
fi
exec env -u WAYLAND_DISPLAY XDG_SESSION_TYPE=x11 node_modules/.bin/electron . "${DEBUG_ARGS[@]}" "$@"
