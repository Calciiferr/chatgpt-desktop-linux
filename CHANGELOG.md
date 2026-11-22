# Changelog

## 0.8.0

First public release.

- **Tabs**: several conversations side by side, reorderable by drag and drop, with shortcuts to open, close, cycle through and reopen them, and optional restore at startup.
- **Find in conversation** with `Ctrl+F`.
- **Desktop integration**: tray icon, global shortcut to show or hide the window, launch at login, and a notification when a response finishes while the window is hidden.
- **Settings** organized in tabs: General, Tabs, Shortcuts, Window, Extensions and About.
- **Languages**: English, French and Spanish. ChatGPT follows the selected language.
- **First launch**: choose the language and the application name. The name appears in menus, search and the taskbar, and can be changed later in Settings.
- **Extensions** that can be turned off: project folders (based on NestFolders) and the experimental Magic Bar (KDE Plasma only).
- **Packages**: `.deb`, `.rpm` and AppImage. `.deb` installations update from the application; the others open the release page.
- Works outside KDE Plasma: the global shortcut uses the desktop portal, and without a tray the window is minimized to the taskbar.

## Before the public release

These versions were only distributed privately. Their packages are no longer available.

### 0.7.8

- Fixed the sidebar being unusable with the new ChatGPT interface: when pinned open, it shrank to a thin strip and the page covered it, which prevented opening projects and conversations.
- Removed the resize handle added by the folders: ChatGPT now manages the width of its sidebar itself. Folders are unchanged.

### 0.7.7

- **Tabs** can be reordered by drag and drop: the order is kept after a restart, and tab titles are no longer selected while dragging.
- Fixed the sidebar: when collapsing it, the leftover strip and the shifted project title are gone, and the interface stays correct when reopening it.

### 0.7.5

- New **folders** in ChatGPT projects: folders and subfolders with no depth limit, with colors and renaming.
- **New folder** entry in the "…" menu of each project; each folder's menu can add a subfolder, rename, change the color, expand or collapse everything, and delete.
- Drag and drop conversations into folders, with guide lines to read the tree.
- Folders are stored locally and synced between tabs; ChatGPT projects are not modified.
- New **right-click menu**: cut, copy, paste, select all, undo, spelling, links and images.
- Conversation colors are replaced by folders.
- Fixed the size of tabs after maximizing the window.

### 0.7.0-beta.32

- New update window, from download to restart.
- Download progress in percent and MB, with the option to cancel.
- Installation through APT with a KDE authorization prompt.
- Installation errors and details are shown.
- The installed version is confirmed before offering a restart.

### 0.7.0-beta.31

- New **Color** entry in the conversation menu.
- Palette of 10 colors, custom picker and preview of the gradient background.
- **Apply**, **Cancel** and **No color** options.
- Colors are kept after renaming and restarting, and shared between the application's tabs.

### 0.7.0-beta.30

- Update check at startup and a manual check button in the settings.
- GitHub sign-in with a temporary code, session renewal and sign-out, to reach the private releases.
- The signed-in account is shown, with a button to verify the sign-in.
- Comparison between the installed version and the latest available one, including when a local version is newer.
- Choice of the project opened with **Ctrl+T** or the **+** button, independent of the Magic Bar.

### 0.7.0-beta.25

- Project sync adapted to the new ChatGPT interface.
- **Pinned projects** and **Other projects** groups in the selectors.
- The order of pinned projects is kept.
- Better handling of list loading and sync failures.
- The ChatGPT sign-in stays inside the application window.
- Debian package dependencies updated for KDE Plasma 6.
