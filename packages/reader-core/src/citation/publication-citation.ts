import type { PublicationBook, PublicationSection } from '../original/types.js';
import { publicationDisplayTitle } from '../original/publication-model.js';
import { citationHead, citeText, type CitePage } from './citation.js';

export interface PublicationCitationOptions {
  canonicalBaseUrl?: string;
  sectionUrl?: (section: PublicationSection) => string;
}
function publicUrl(value: string | undefined): string {
  let url: URL;
  try { url = new URL(value ?? ''); } catch { throw new Error('Citation requires an absolute canonical URL.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.hash || url.search || !url.pathname.endsWith('/')) {
    throw new Error('Citation canonical base URL must be HTTP(S), end in /, and have no credentials, query or fragment.');
  }
  return url.href;
}
/** The shared record used by readable builds and the live reader. Undated books stay undated. */
export function publicationCitation(book: PublicationBook, section?: PublicationSection, options: PublicationCitationOptions = {}): CitePage {
  if (!book.title?.trim()) throw new Error('Citation requires a non-empty book title.');
  if (section && !section.title?.trim()) throw new Error('Citation requires a non-empty chapter title.');
  const config = book.citation;
  const base = publicUrl(options.canonicalBaseUrl ?? config?.canonicalBaseUrl);
  const title = publicationDisplayTitle(book);
  const authors = config?.authors ?? [book.author];
  if (!authors.length || authors.some(author => !author?.trim())) throw new Error('Citation requires at least one named author.');
  if (config?.date && !/^\d{4}(?:-\d{2}-\d{2})?$/.test(config.date)) throw new Error('Citation date must be YYYY or YYYY-MM-DD.');
  const url = section ? (options.sectionUrl?.(section) ?? base + encodeURIComponent(section.id) + '/') : base;
  const chapterUrl = new URL(url);
  if (!['http:', 'https:'].includes(chapterUrl.protocol) || chapterUrl.username || chapterUrl.password) throw new Error('Citation chapter URL must be HTTP(S) without credentials.');
  return { title: section?.title ?? title, site: config?.siteName?.trim() || title, authors,
    organisations: config?.organisations, date: config?.date, isbn: config?.isbn,
    url, type: section ? 'bookSection' : 'book', bookTitle: section ? title : undefined, language: book.language ?? 'en-GB' };
}

/** Metadata for a host's existing readable-page template. Validation happens before a build writes output. */
export function readablePublicationHead(book: PublicationBook, section?: PublicationSection, options?: PublicationCitationOptions): string {
  return citationHead(publicationCitation(book, section, options));
}

/** A book-only RIS export; references in the manuscript never become page metadata. */
export function publicationRis(book: PublicationBook, options?: PublicationCitationOptions): string {
  return citationRis(publicationCitation(book, undefined, options));
}
export function citationRis(page: CitePage): string {
  const line = (value: string) => value.replace(/[\r\n]+/g, ' ');
  return ['TY  - BOOK', `TI  - ${line(page.title)}`, ...page.authors.map(author => `AU  - ${line(author)}`),
    ...(page.date ? [`PY  - ${page.date.slice(0, 4)}`, `DA  - ${page.date}`] : []),
    ...(page.isbn ? [`SN  - ${line(page.isbn)}`] : []), `UR  - ${page.url}`, 'ER  - ', ''].join('\r\n');
}
