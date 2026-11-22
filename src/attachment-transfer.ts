export interface ComposerAttachmentSnapshot {
  markerCount: number;
  matchedNames: string[];
}

export interface AttachmentTransferResult {
  ok: boolean;
  imagePaths: string[];
  filePaths: string[];
  pastedImages: boolean;
  uploadedPaths: string[];
}

export function composerAttachmentProbeScript(fileNames: readonly string[]): string {
  const serializedNames = JSON.stringify(fileNames);
  return `(() => {
    const names = ${serializedNames};
    const normalize = (value) => (value || '').normalize('NFC').toLowerCase();
    const composer = document.querySelector('#prompt-textarea') ||
      document.querySelector('[data-testid="prompt-textarea"]') ||
      document.querySelector('form textarea') ||
      document.querySelector('form [contenteditable="true"]');
    const form = composer?.closest('form');
    const root = composer?.closest('[data-testid*="composer" i]') || form;
    if (!root) return { markerCount: 0, matchedNames: [] };
    const cardSelector = [
      '[data-testid*="attachment" i]',
      '[data-testid*="file" i]',
      '[class*="attachment" i]',
      '[class*="file-pill" i]'
    ].join(',');
    const markerSelector = [
      cardSelector,
      'img[src^="blob:"]',
      'img[src^="data:"]',
      '[aria-label*="remove file" i]',
      '[aria-label*="supprimer le fichier" i]',
      '[aria-label*="eliminar archivo" i]',
      '[aria-label*="quitar archivo" i]'
    ].join(',');
    const cards = [...new Set([...root.querySelectorAll(markerSelector)].map((element) =>
      element.closest(cardSelector) || element.parentElement || element
    ))];
    const searchableText = cards.map((card) => normalize(
      (card.textContent || '') + ' ' +
      (card.getAttribute?.('aria-label') || '') + ' ' +
      (card.getAttribute?.('title') || '') + ' ' +
      (card.getAttribute?.('data-testid') || '') + ' ' +
      (card.getAttribute?.('alt') || '') + ' ' +
      [...card.querySelectorAll('[aria-label], [title], [data-testid], img[alt]')]
        .map((element) =>
          (element.getAttribute('aria-label') || '') + ' ' +
          (element.getAttribute('title') || '') + ' ' +
          (element.getAttribute('data-testid') || '') + ' ' +
          (element.getAttribute('alt') || '')
        ).join(' ')
    ));
    return {
      markerCount: cards.length,
      matchedNames: names.filter((name) => {
        const normalizedName = normalize(name);
        return normalizedName && searchableText.some((text) => text.includes(normalizedName));
      }),
    };
  })()`;
}

export function attachmentSnapshotProvesBatch(
  fileNames: readonly string[],
  baseline: ComposerAttachmentSnapshot,
  current: ComposerAttachmentSnapshot,
): boolean {
  if (fileNames.length === 0) return true;
  const normalize = (value: string): string => value.normalize("NFC").toLocaleLowerCase();
  const expectedNames = fileNames.map(normalize);
  const baselineNames = new Set(baseline.matchedNames.map(normalize));
  const currentNames = new Set(current.matchedNames.map(normalize));
  const allNamesAreNew = new Set(expectedNames).size === expectedNames.length && expectedNames.every((normalized) => {
    return currentNames.has(normalized) && !baselineNames.has(normalized);
  });
  const enoughNewCards = current.markerCount - baseline.markerCount >= fileNames.length;
  return allNamesAreNew || enoughNewCards;
}

export async function transferAttachmentBatches(
  paths: readonly string[],
  preferFileUploadPaths: readonly string[],
  isImagePath: (filePath: string) => boolean,
  pasteImages: (imagePaths: readonly string[]) => Promise<boolean>,
  uploadFiles: (filePaths: readonly string[]) => Promise<boolean>,
): Promise<AttachmentTransferResult> {
  const preferred = new Set(preferFileUploadPaths);
  const imagePaths = paths.filter((filePath) => isImagePath(filePath) && !preferred.has(filePath));
  const filePaths = paths.filter((filePath) => !isImagePath(filePath) || preferred.has(filePath));
  const pastedImages = imagePaths.length === 0 ? true : await pasteImages(imagePaths);
  const uploadedPaths = [...filePaths, ...(pastedImages ? [] : imagePaths)];
  const uploaded = uploadedPaths.length === 0 ? true : await uploadFiles(uploadedPaths);
  return {
    ok: uploaded,
    imagePaths,
    filePaths,
    pastedImages,
    uploadedPaths,
  };
}
