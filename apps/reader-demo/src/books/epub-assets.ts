/** Image bytes the EPUB export embeds, by book and by the exact `src` the book's text uses; the EPUB makes no network request.
 * The demo keeps the original capture of Deliberate Practice's chapter icon. A release build replaces this whole module with its own book's
 * mapping (`scripts/release/projection.ts`), so no release bundle carries this file. */
import commandLineIcon from './assets/command-line_gray.svg?raw';

export interface EpubAsset { href: string; mediaType: 'image/svg+xml'; data: Uint8Array }

export const epubAssets: Partial<Record<string, EpubAsset[]>> = {
  'deliberate-practice': [{ href: 'https://www.notion.so/icons/command-line_gray.svg', mediaType: 'image/svg+xml', data: new TextEncoder().encode(commandLineIcon) }],
};
