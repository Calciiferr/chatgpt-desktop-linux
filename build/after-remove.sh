#!/bin/sh
set -e

case "${1:-}" in
  remove|purge)
    rm -f /usr/share/kio/servicemenus/chatgpt-desktop-linux-servicemenu.desktop
    if [ "$(readlink /usr/bin/chatgpt-desktop-linux 2>/dev/null || true)" = "/opt/ChatGPT Desktop Linux/chatgpt-desktop-linux" ]; then
      rm -f /usr/bin/chatgpt-desktop-linux
    fi
    if command -v kbuildsycoca6 >/dev/null 2>&1; then
      kbuildsycoca6 --noincremental >/dev/null 2>&1 || true
    fi
    ;;
esac
