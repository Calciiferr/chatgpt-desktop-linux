# ChatGPT Desktop Linux

ChatGPT in its own window on Linux, with tabs, keyboard shortcuts and a tray icon. Built for KDE Plasma on Wayland, and usable on other desktops such as GNOME.

Unofficial client, not affiliated with OpenAI. A ChatGPT account is required; no API key or subscription is needed.

[**Download**](https://github.com/Calciiferr/chatgpt-desktop-linux/releases/latest) · [Changelog](CHANGELOG.md)

## Features

### Tabs and navigation

- Several conversations open side by side in tabs, reorderable by drag and drop.
- Shortcuts to open, close, cycle through and reopen tabs.
- Find in conversation with `Ctrl+F`.
- New tabs open in regular ChatGPT or in the project of your choice.
- Optional restore of your tabs at startup.

### Desktop integration

- Tray icon to show or hide the window, and a global shortcut (`Ctrl+Alt+G`).
- Launch at login.
- Notification when a response finishes while the window is hidden.
- Light, dark or automatic theme.
- Interface in English, French and Spanish. ChatGPT itself follows the selected language.

### Extensions

Optional features, enabled or disabled in **Settings → Extensions**. A disabled extension is not loaded at all.

| Extension | What it does | Availability |
| --- | --- | --- |
| **Project folders** (based on NestFolders) | Folders and subfolders inside ChatGPT projects, with colors and drag and drop. | All desktops, enabled by default |
| **Magic Bar** (experimental) | A floating bar to prepare text, files and screenshots before sending them to ChatGPT, with Dolphin and Kate integrations. | KDE Plasma only, disabled by default |

## Installation

Packages are available for **x86_64 (amd64)** on the [Releases](https://github.com/Calciiferr/chatgpt-desktop-linux/releases/latest) page.

**Debian, Ubuntu, Kubuntu, Linux Mint, Pop!_OS** — download the `.deb` file, then from the download folder:

```bash
sudo apt install ./ChatGPT-Desktop-Linux-*-amd64.deb
```

**Fedora, openSUSE** — download the `.rpm` file, then:

```bash
sudo dnf install ./ChatGPT-Desktop-Linux-*-x86_64.rpm
```

**Any other distribution** — download the `.AppImage` file, make it executable and run it:

```bash
chmod +x ChatGPT-Desktop-Linux-*.AppImage
./ChatGPT-Desktop-Linux-*.AppImage
```

The application appears as **ChatGPT** in your applications menu. Sign in to your ChatGPT account in the application window on first launch.

### Desktop support

| | KDE Plasma 6 | GNOME | Other desktops |
| --- | --- | --- | --- |
| Window, tabs, settings | ✓ | ✓ | ✓ |
| Global shortcut | ✓ | ✓ (GNOME 48 or later) | depends on the desktop |
| Tray icon | ✓ | with the [AppIndicator](https://extensions.gnome.org/extension/615/appindicator-support/) extension (preinstalled on Ubuntu) | depends on the desktop |
| Magic Bar | ✓ | — | — |

## Default shortcuts

| Action | Shortcut |
| --- | --- |
| Show or hide ChatGPT | `Ctrl+Alt+G` |
| New tab | `Ctrl+T` |
| Close tab | `Ctrl+W` |
| Next / previous tab | `Ctrl+Tab` / `Ctrl+Shift+Tab` |
| Go to tab 1–8 / last tab | `Ctrl+1`–`Ctrl+8` / `Ctrl+9` |
| Reopen last closed tab | `Ctrl+Shift+T` |
| Find in conversation | `Ctrl+F` |
| Reload | `F5` |

Shortcuts can be changed in **Settings → Shortcuts**.

## Updates

The application checks for new versions at startup; this can be turned off in **Settings → About**. With the `.deb` package, updates can be downloaded and installed from the application, after confirming with your system password.

## Privacy

The application loads chatgpt.com and keeps your session, settings and tabs locally in `~/.config/chatgpt-desktop-linux`. It sends nothing anywhere else, apart from checking this repository's releases for updates.

## Good to know

The application relies on the ChatGPT website. Some features, such as project synchronization and project folders, depend on its interface and may need an update when ChatGPT changes.

## Development

The project uses Electron, TypeScript and electron-builder.

```bash
npm ci
npm run dev
```

```bash
npm test                 # Tests
npm run build            # Compile TypeScript
npm run dist             # Build .deb, .rpm and AppImage packages into release/
```

Bug reports and suggestions are welcome in the [issues](https://github.com/Calciiferr/chatgpt-desktop-linux/issues).

## License

[MIT](LICENSE). The project folders extension includes [NestFolders](vendor/nestfolders/LICENSE), also under the MIT license.
