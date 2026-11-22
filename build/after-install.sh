#!/bin/sh
set -e

executable="/opt/ChatGPT Desktop Linux/chatgpt-desktop-linux"

if [ -x "$executable" ]; then
  ln -sfn "$executable" /usr/bin/chatgpt-desktop-linux
fi

# Up to 0.7.x the Dolphin entry was installed system-wide. It is now managed per
# user by the application, only while the Magic Bar extension is enabled.
legacy_service_menu="/usr/share/kio/servicemenus/chatgpt-desktop-linux-servicemenu.desktop"
if [ -f "$legacy_service_menu" ]; then
  rm -f "$legacy_service_menu"
  if command -v kbuildsycoca6 >/dev/null 2>&1; then
    kbuildsycoca6 --noincremental >/dev/null 2>&1 || true
  fi
fi
