import {
  BrowserWindow,
  Menu,
  clipboard,
  type ContextMenuParams,
  type MenuItemConstructorOptions,
  type WebContents,
} from "electron";
import type { AppLanguage } from "./settings-store";

// Electron shows no context menu by default. This builds the usual text, link and image
// actions from the context-menu event parameters, for every web contents of the app
// (ChatGPT tabs, authentication popups, Magic Bar, settings).

const LABELS: Record<AppLanguage, Record<string, string>> = {
  fr: {
    undo: "Annuler", redo: "Rétablir", cut: "Couper", copy: "Copier", paste: "Coller",
    selectAll: "Tout sélectionner", openTab: "Ouvrir dans un nouvel onglet",
    openBrowser: "Ouvrir dans le navigateur", copyLink: "Copier l’adresse du lien",
    copyImage: "Copier l’image", copyImageUrl: "Copier l’adresse de l’image",
  },
  en: {
    undo: "Undo", redo: "Redo", cut: "Cut", copy: "Copy", paste: "Paste",
    selectAll: "Select all", openTab: "Open in new tab",
    openBrowser: "Open in browser", copyLink: "Copy link address",
    copyImage: "Copy image", copyImageUrl: "Copy image address",
  },
  es: {
    undo: "Deshacer", redo: "Rehacer", cut: "Cortar", copy: "Copiar", paste: "Pegar",
    selectAll: "Seleccionar todo", openTab: "Abrir en una pestaña nueva",
    openBrowser: "Abrir en el navegador", copyLink: "Copiar dirección del enlace",
    copyImage: "Copiar imagen", copyImageUrl: "Copiar dirección de la imagen",
  },
};

export type ContextMenuInput = Pick<
  ContextMenuParams,
  "x" | "y" | "isEditable" | "selectionText" | "linkURL" | "mediaType" | "srcURL" |
  "editFlags" | "misspelledWord" | "dictionarySuggestions"
>;

/** Operations the menu triggers; a WebContents in the app, a fake in tests. */
export interface ContextMenuOperations {
  undo(): void;
  redo(): void;
  cut(): void;
  copy(): void;
  paste(): void;
  selectAll(): void;
  replaceMisspelling(word: string): void;
  copyImageAt(x: number, y: number): void;
  writeText(text: string): void;
  openInNewTab(url: string): void;
  openExternal(url: string): void;
  isInternalUrl(url: string): boolean;
}

const isWebUrl = (url: string): boolean => /^https?:\/\//i.test(url);

export function contextMenuTemplate(
  params: ContextMenuInput,
  ops: ContextMenuOperations,
  language: AppLanguage,
): MenuItemConstructorOptions[] {
  const t = LABELS[language] ?? LABELS.en;
  const groups: MenuItemConstructorOptions[][] = [];
  const flags = params.editFlags;

  if (params.isEditable && params.misspelledWord && params.dictionarySuggestions.length) {
    groups.push(params.dictionarySuggestions.slice(0, 5).map((word) => ({
      label: word,
      click: () => ops.replaceMisspelling(word),
    })));
  }

  if (params.isEditable) {
    groups.push([
      { label: t.undo, enabled: flags.canUndo, click: () => ops.undo() },
      { label: t.redo, enabled: flags.canRedo, click: () => ops.redo() },
    ]);
    groups.push([
      { label: t.cut, enabled: flags.canCut, click: () => ops.cut() },
      { label: t.copy, enabled: flags.canCopy, click: () => ops.copy() },
      { label: t.paste, enabled: flags.canPaste, click: () => ops.paste() },
      { label: t.selectAll, enabled: flags.canSelectAll, click: () => ops.selectAll() },
    ]);
  } else if (params.selectionText.trim()) {
    groups.push([{ label: t.copy, click: () => ops.copy() }]);
  }

  if (params.linkURL && isWebUrl(params.linkURL)) {
    const url = params.linkURL;
    groups.push([
      ops.isInternalUrl(url)
        ? { label: t.openTab, click: () => ops.openInNewTab(url) }
        : { label: t.openBrowser, click: () => ops.openExternal(url) },
      { label: t.copyLink, click: () => ops.writeText(url) },
    ]);
  }

  if (params.mediaType === "image" && params.srcURL) {
    const image: MenuItemConstructorOptions[] = [
      { label: t.copyImage, click: () => ops.copyImageAt(params.x, params.y) },
    ];
    if (isWebUrl(params.srcURL)) {
      const src = params.srcURL;
      image.push({ label: t.copyImageUrl, click: () => ops.writeText(src) });
    }
    groups.push(image);
  }

  return groups.flatMap((group, index) =>
    index === 0 ? group : [{ type: "separator" as const }, ...group]);
}

export interface ContextMenuHost {
  language(): AppLanguage;
  openInNewTab(url: string): void;
  openExternal(url: string): void;
  isInternalUrl(url: string): boolean;
}

export function installContextMenu(contents: WebContents, host: ContextMenuHost): void {
  contents.on("context-menu", (_event, params) => {
    const ops: ContextMenuOperations = {
      undo: () => contents.undo(),
      redo: () => contents.redo(),
      cut: () => contents.cut(),
      copy: () => contents.copy(),
      paste: () => contents.paste(),
      selectAll: () => contents.selectAll(),
      replaceMisspelling: (word) => contents.replaceMisspelling(word),
      copyImageAt: (x, y) => contents.copyImageAt(x, y),
      writeText: (text) => clipboard.writeText(text),
      openInNewTab: (url) => host.openInNewTab(url),
      openExternal: (url) => host.openExternal(url),
      isInternalUrl: (url) => host.isInternalUrl(url),
    };
    const template = contextMenuTemplate(params, ops, host.language());
    if (!template.length) return;
    const window = BrowserWindow.fromWebContents(contents) ?? BrowserWindow.getFocusedWindow();
    // No coordinates: the menu opens at the pointer, which also works for views inside
    // the window and under Wayland.
    Menu.buildFromTemplate(template).popup(window ? { window } : {});
  });
}
