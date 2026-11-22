#!/bin/sh
set -e

case "${1:-}" in
  remove|purge|0)
    rm -f /usr/share/kio/servicemenus/chatgpt-desktop-linux-servicemenu.desktop
    if [ "$(readlink /usr/bin/chatgpt-desktop-linux 2>/dev/null || true)" = "/opt/ChatGPT Desktop Linux/chatgpt-desktop-linux" ]; then
      rm -f /usr/bin/chatgpt-desktop-linux
    fi
    ;;
esac
