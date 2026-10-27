/** The release projection of a book: what a public edition ships in place of the canonical manuscript, which stays unchanged on disk.
 * Changes are limited to exposing the existing Linguistics reuse notice and Deliberate Practice's decorative chapter icon. The manuscript references Notion's `command-line_gray.svg`, whose
 * redistribution rights are not established (src/books/assets/provenance-command-line-icon.json). A release replaces that one `<img>` element
 * with the repository's own icon (src/books/assets/terminal-icon.svg, MIT) and an empty alt, because the icon is decorative and the old alt was the
 * Notion address itself. Every other byte of every section stays as authored. The count is checked, so a changed manuscript fails the build. */
import fs from 'node:fs';
import path from 'node:path';
import type { PublicationBook, PublicationSection } from '../../../../packages/reader-core/src/original/types';

export const ORIGINAL_ICON_URL = 'https://www.notion.so/icons/command-line_gray.svg';
export const RELEASE_ICON_FILE = 'media/terminal-icon.svg';
const ORIGINAL_ICON_ELEMENT = `<img src="${ORIGINAL_ICON_URL}" alt="${ORIGINAL_ICON_URL}" width="40px" />`;
const RELEASE_ICON_ELEMENT = `<img src="/${RELEASE_ICON_FILE}" alt="" width="40px" />`;
/** Sections whose icon element a release replaces, by book; any other occurrence of the Notion icon fails the build. */
const ICON_SECTIONS: Record<string, string[]> = { 'deliberate-practice': ['limitations-working-memory'] };

export const releaseIconSvg = (appRoot: string): string => fs.readFileSync(path.join(appRoot, 'src', 'books', 'assets', 'terminal-icon.svg'), 'utf8');

export interface Projection { book: PublicationBook; replaced: string[] }

export function releaseProjection(book: PublicationBook): Projection {
  const expected = ICON_SECTIONS[book.id] ?? [];
  const replaced: string[] = [];
  const project = (sections: readonly PublicationSection[]): PublicationSection[] => sections.map(section => {
    const count = section.content.split(ORIGINAL_ICON_ELEMENT).length - 1;
    if (count && (!expected.includes(section.id) || count !== 1)) throw new Error(`Unexpected Notion icon in ${book.id}/${section.id} (${count}).`);
    if (count) replaced.push(section.id);
    const content = count ? section.content.split(ORIGINAL_ICON_ELEMENT).join(RELEASE_ICON_ELEMENT) : section.content;
    return { ...section, content, ...(section.children ? { children: project(section.children) } : {}) };
  });
  const projected: PublicationBook = { ...book, sections: project(book.sections) };
  // Existing grant from the preserved edition's about page, exposed through the reader's existing home/agent metadata seam.
  if (book.id === 'linguistics') projected.home = {
    ...book.home,
    license: book.home?.license ?? { label: 'CC BY-SA 4.0', href: 'https://creativecommons.org/licenses/by-sa/4.0/' },
    authorNote: book.home?.authorNote ?? '© Dominik Lukeš. The book is released under CC BY-SA 4.0. You may copy, share, adapt and use this book, including to train AI models, with attribution. Each answer page shows the licence the answer carries on Stack Exchange, and a link to the original.',
  };
  if (replaced.join() !== expected.join()) throw new Error(`Expected the icon in ${expected.join(', ') || 'no section'} of ${book.id}; found ${replaced.join(', ') || 'none'}.`);
  if (JSON.stringify(projected).includes('notion.so/icons/')) throw new Error(`A Notion icon reference remains in ${book.id} after projection.`);
  return { book: projected, replaced };
}

/** Source of the module that replaces src/books/epub-assets.ts in this book's release bundle: only this book's image bytes, by their release src. */
export function epubAssetsModule(projection: Projection, appRoot: string): string {
  const assets = projection.replaced.length ? [{ href: `/${RELEASE_ICON_FILE}`, mediaType: 'image/svg+xml', svg: releaseIconSvg(appRoot) }] : [];
  return `const encode = text => new TextEncoder().encode(text);\nexport const epubAssets = ${assets.length
    ? `{ ${JSON.stringify(projection.book.id)}: [${assets.map(asset => `{ href: ${JSON.stringify(asset.href)}, mediaType: ${JSON.stringify(asset.mediaType)}, data: encode(${JSON.stringify(asset.svg)}) }`).join(', ')}] }`
    : '{}'};\n`;
}
