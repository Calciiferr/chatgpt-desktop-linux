<div align="center">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/tray-icon.png">
  <img src="assets/icon.png" alt="ChatGPT Desktop Linux logo" width="96" height="96">
</picture>

# ChatGPT Desktop Linux

**ChatGPT in its own window on Linux — with tabs, shortcuts, a tray icon and optional extensions.**

[![Latest release](https://img.shields.io/github/v/release/Calciiferr/chatgpt-desktop-linux?label=release&color=10a37f)](https://github.com/Calciiferr/chatgpt-desktop-linux/releases/latest)
[![License: MIT](https://img.shields.io/github/license/Calciiferr/chatgpt-desktop-linux?color=blue)](LICENSE)
[![Platform: Linux](https://img.shields.io/badge/platform-Linux%20x86__64-informational)](#installation)
[![Desktops: KDE Plasma and GNOME](https://img.shields.io/badge/desktop-KDE%20Plasma%20%7C%20GNOME-informational)](#desktop-support)

[**Download**](https://github.com/Calciiferr/chatgpt-desktop-linux/releases/latest) ·
[Features](#features) ·
[Extensions](#extensions) ·
[Installation](#installation) ·
[Shortcuts](#default-shortcuts) ·
[Changelog](CHANGELOG.md)

</div>

> [!NOTE]
> Unofficial client, not affiliated with OpenAI. It uses your regular ChatGPT account: no API key or extra subscription is needed.

<!-- Screenshots: add images to docs/ and reference them here, e.g.
<p align="center"><img src="docs/screenshot.png" alt="ChatGPT Desktop Linux" width="800"></p>
-->

## Features

<table>
<tr>
<td width="50%" valign="top">

### 🗂️ Tabs and navigation

- Several conversations side by side in **tabs**
- Reorder tabs by **drag and drop**
- Open, close, cycle through and **reopen** tabs from the keyboard
- New tabs open in regular ChatGPT or **in the project of your choice**
- **Find in conversation** with `Ctrl+F`
- Optional **restore of your tabs** at startup

</td>
<td width="50%" valign="top">

### 🖥️ Desktop integration

- **Tray icon** to show or hide the window
- **Global shortcut** (`Ctrl+Alt+G`) from anywhere
- **Notification** when a response finishes while the window is hidden
- **Launch at login**
- Light, dark or automatic **theme**
- Your own **application name** in menus, search and the taskbar

</td>
</tr>
<tr>
<td width="50%" valign="top">

### 🧩 Extensions

Optional features you can turn on or off in **Settings → Extensions**. A disabled extension is not loaded at all.

- **Project folders** — folders and subfolders inside ChatGPT projects, with colors and drag and drop
- **Magic Bar** *(experimental, KDE Plasma)* — a floating bar to prepare text, files and screenshots, with Dolphin and Kate integrations
- **Your own extensions** — install them from a `.zip`, or create one with ChatGPT in a few clicks

</td>
<td width="50%" valign="top">

### 🌍 Languages and updates

- Interface in **English, French and Spanish** — ChatGPT follows the selected language
- Language and name chosen on **first launch**, changeable at any time
- **Update check** at startup
- One-click updates for `.deb` installations

</td>
</tr>
</table>

## Extensions

Extensions are optional features. Turn them on or off in **Settings → Extensions**. A disabled extension is not loaded at all, so ChatGPT runs exactly as it does without it. Built-in extensions change after a restart; your own extensions change immediately.

### 📁 Project folders (NestFolders)

*Enabled by default · All desktops*

Organize the conversations of each ChatGPT project into folders, directly in the ChatGPT sidebar.

- **Create folders** from the **New folder** entry in the "…" menu of any project.
- **Nest them** as deep as you need: every folder can hold subfolders.
- **Drag and drop** conversations into folders, with guide lines that make the tree easy to read.
- **Customize** each folder from its "…" menu: rename it, pick a color, add a subfolder, expand or collapse everything, or delete it.
- **Stay in sync** across all the application's tabs.
- **Keep your projects intact**: folders are stored locally on your computer and never change your ChatGPT projects or move conversations between them. Disabling the extension keeps your folders for later.

NestFolders is based on [ChatGPT Folders](https://github.com/glyndavidson/chatgpt-folders) by Glyn Davidson (MIT license), adapted to ChatGPT projects and to the desktop application.

### ✨ Magic Bar

*Experimental · Disabled by default · KDE Plasma only*

A floating bar, opened from anywhere with `Ctrl+Shift+Space`, to prepare a message before sending it to ChatGPT.

- **Write your request** and add context: files, images from the clipboard, or screenshots of a region, a window or the whole screen (with Spectacle).
- **Choose where it goes**: a new chat, your last chat, or one of your ChatGPT projects.
- **Ask for a review** of attached files in one click: security, code quality, or both.
- **Send from your apps**: *Send to ChatGPT* in Dolphin's right-click menu, and in Kate for the selected text.

The message is prepared in ChatGPT and waits for you to send it.

### 🛠️ Your own extensions

*All desktops*

Add extensions made by you or by others, as a `.zip` file, from **Settings → Extensions → Add an extension**. They work like NestFolders: they can change the ChatGPT page, but never your files or the application itself. Before installing, the application checks the extension's rules and asks for your confirmation.

- **Create with ChatGPT** opens a new tab with instructions ready: describe the extension you want, then install the `.zip` you get.
- **Copy the AI prompt** puts the same instructions on your clipboard, to use with another assistant such as Claude or Codex.
- **Developers** can edit installed extensions directly in their folder and reload them. See the [extension guide](docs/EXTENSIONS.md).

> [!WARNING]
> An extension can read everything shown on ChatGPT, including your conversations. Only install extensions from people you trust.

## Installation

Download the package for your distribution from the [**latest release**](https://github.com/Calciiferr/chatgpt-desktop-linux/releases/latest) (x86_64).

| Distribution | Package | Install |
| --- | --- | --- |
| Debian, Ubuntu, Kubuntu, Linux Mint, Pop!_OS | `.deb` | `sudo apt install ./ChatGPT-Desktop-Linux-*-amd64.deb` |
| Fedora, openSUSE | `.rpm` | `sudo dnf install ./ChatGPT-Desktop-Linux-*-x86_64.rpm` |
| Any other distribution | `.AppImage` | `chmod +x ChatGPT-Desktop-Linux-*.AppImage` then run it |

The application appears as **ChatGPT** in your applications menu. On first launch, choose your language and the application name, then sign in to your ChatGPT account in the window.

### Desktop support

| | KDE Plasma 6 | GNOME | Other desktops |
| --- | :---: | :---: | :---: |
| Window, tabs, settings | ✅ | ✅ | ✅ |
| Global shortcut | ✅ | ✅ GNOME 48+ | Depends on the desktop |
| Tray icon | ✅ | With the [AppIndicator](https://extensions.gnome.org/extension/615/appindicator-support/) extension¹ | Depends on the desktop |
| Magic Bar extension | ✅ | — | — |

¹ Preinstalled on Ubuntu. Without a tray, the window is minimized to the taskbar instead.

## Default shortcuts

| Action | Shortcut |
| --- | --- |
| Show or hide ChatGPT | `Ctrl+Alt+G` |
| New tab | `Ctrl+T` |
| Close tab | `Ctrl+W` |
| Next / previous tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| Go to tab 1–8 / last tab | `Ctrl+1`…`Ctrl+8` / `Ctrl+9` |
| Reopen last closed tab | `Ctrl+Shift+T` |
| Find in conversation | `Ctrl+F` |
| Reload | `F5` |

All shortcuts can be changed in **Settings → Shortcuts**.

## Updates

The application checks for new versions at startup; this can be turned off in **Settings → About**.

- **`.deb`**: updates are downloaded, verified and installed from the application, after confirming with your system password.
- **`.rpm` and AppImage**: the application tells you a new version is available and opens the download page.

## Privacy

The application loads chatgpt.com and keeps your session, settings and tabs locally in `~/.config/chatgpt-desktop-linux`. Apart from checking this repository's releases for updates, it sends nothing anywhere else.

> [!TIP]
> Some features, such as project synchronization and project folders, read the ChatGPT website's interface. If ChatGPT changes its design, they may need an update — please [open an issue](https://github.com/Calciiferr/chatgpt-desktop-linux/issues).

## Building from source

Requires Node.js 22 or later.

```bash
git clone https://github.com/Calciiferr/chatgpt-desktop-linux.git
cd chatgpt-desktop-linux
npm ci
npm run dev        # Run the application
npm test           # Run the tests
npm run dist       # Build .deb, .rpm and AppImage packages into release/
```

## Contributing

Bug reports and suggestions are welcome in the [issues](https://github.com/Calciiferr/chatgpt-desktop-linux/issues).

## License

[MIT](LICENSE) © Calciiferr. The NestFolders extension is based on [ChatGPT Folders](https://github.com/glyndavidson/chatgpt-folders) by Glyn Davidson, also under the [MIT license](vendor/nestfolders/LICENSE).
