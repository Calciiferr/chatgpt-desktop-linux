#!/bin/sh
set -e

source_file="/opt/ChatGPT Desktop Linux/resources/chatgpt-desktop-linux-servicemenu.desktop"
target_file="/usr/share/kio/servicemenus/chatgpt-desktop-linux-servicemenu.desktop"
executable="/opt/ChatGPT Desktop Linux/chatgpt-desktop-linux"

if [ -f "$source_file" ]; then
  install -Dm644 "$source_file" "$target_file"
fi

if [ -x "$executable" ]; then
  ln -sfn "$executable" /usr/bin/chatgpt-desktop-linux
fi

if command -v kbuildsycoca6 >/dev/null 2>&1; then
  kbuildsycoca6 --noincremental >/dev/null 2>&1 || true
fi
