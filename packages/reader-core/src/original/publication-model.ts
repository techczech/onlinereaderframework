import type { PublicationBook, PublicationSection } from './types.js';

/** Join the authored title/subtitle without adding punctuation or repeating their overlap. */
export function publicationDisplayTitle(book: Pick<PublicationBook, 'title' | 'subtitle'>): string {
  const title = book.title.trim();
  const subtitle = book.subtitle?.trim();
  if (!subtitle) return title;
  if (!title) return subtitle;
  const titleWords = title.split(/\s+/);
  const subtitleWords = subtitle.split(/\s+/);
  for (let overlap = Math.min(titleWords.length, subtitleWords.length); overlap > 0; overlap--) {
    if (titleWords.slice(-overlap).every((word, index) => word.toLowerCase() === subtitleWords[index].toLowerCase())) {
      return [...titleWords, ...subtitleWords.slice(overlap)].join(' ');
    }
  }
  return `${title} ${subtitle}`;
}

/** Preorder includes parents with content as well as every descendant. */
export function flattenPublicationSections(sections: PublicationSection[]): PublicationSection[] {
  return sections.flatMap(section => [section, ...flattenPublicationSections(section.children ?? [])]);
}

export function containsSection(section: PublicationSection, id: string): boolean {
  return section.id === id || (section.children ?? []).some(child => containsSection(child, id));
}

export function readerStorageKey(bookId: string, field: string): string {
  return `publication-reader:${encodeURIComponent(bookId)}:${field}`;
}

export function readStoredValue<T>(bookId: string, field: string, fallback: T, valid: (value: unknown) => value is T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(readerStorageKey(bookId, field));
    if (raw === null) return fallback;
    const value: unknown = JSON.parse(raw);
    return valid(value) ? value : fallback;
  } catch {
    return fallback;
  }
}

export function writeStoredValue(bookId: string, field: string, value: unknown): boolean {
  try {
    if (typeof window === 'undefined') return false;
    window.localStorage.setItem(readerStorageKey(bookId, field), JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function publicationUrl(href: string, bookId: string, sectionId: string, text?: string): URL {
  const url = new URL(href);
  url.searchParams.set('book', bookId);
  if (sectionId === 'home') url.searchParams.delete('section');
  else url.searchParams.set('section', sectionId);
  if (text) url.searchParams.set('text', text);
  else url.searchParams.delete('text');
  // A fragment belongs to the previous section and must not follow navigation.
  url.hash = '';
  return url;
}

export function sectionFromUrl(href: string, bookId: string, sections: PublicationSection[], compatibility?: PublicationBook['compatibility']): string {
  const url = new URL(href);
  if (url.searchParams.has('book') && url.searchParams.get('book') !== bookId) return 'home';
  let legacyId: string | undefined;
  if (url.hash.startsWith('#/')) {
    try { legacyId = decodeURIComponent(url.hash.slice(2).split('?')[0]); } catch { /* Ignore malformed fragments. */ }
  }
  // Retained source anchors may now belong to a child reading unit.
  if (url.hash && !url.hash.startsWith('#/')) {
    try {
      const fragment = decodeURIComponent(url.hash.slice(1));
      const mapped = compatibility?.anchorOwners[fragment];
      if (mapped && sections.some(section => section.id === mapped)) return mapped;
      const owner = sections.find(section => section.format !== 'markdown' &&
        (section.content.includes(`id="${fragment.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"`) || section.content.includes(`id="${fragment}"`)));
      if (owner) return owner.id;
    } catch { /* Malformed legacy anchors retain their section route. */ }
  }
  const id = legacyId ?? url.searchParams.get('section');
  return id && sections.some(section => section.id === id) ? id : 'home';
}

/** Only publication adapter download links reach this boundary. */
export function safePublicationHref(href: string): string | undefined {
  try {
    const url = new URL(href, 'https://publication.invalid/');
    return ['http:', 'https:'].includes(url.protocol) ? href : undefined;
  } catch {
    return undefined;
  }
}
