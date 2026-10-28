/** The books a release can build and verify: the three originals (src/books/original-publications.json, unchanged) and the two converted books, taken
 * from the demo registry (src/books/demo-books.ts) so that a release ships the same canonical book objects the demo shows. Node-side only: no release
 * bundle imports this file (the release plugin swaps in one book; see release-plugin.ts).
 * An edition's folder (`base`) is the path of its public address in src/canonical-sites.ts: `/` for the originals' own domains, `/books/<name>/` for the
 * converted books on dominiklukes.net. */
import type { PublicationBook } from '../../../../packages/reader-core/src/original/types';
import { nextBooks, originalBooks } from '../../src/books/demo-books';

export const releaseBooks: PublicationBook[] = [...originalBooks, ...nextBooks];
/** Books whose edition carries host-owned embeds and a pinned cover (scripts/release/edition-assets.ts). */
export const convertedBookIds: ReadonlySet<string> = new Set(nextBooks.map(book => book.id));

const BASE = /^\/(?:[a-z0-9][a-z0-9-]{0,62}\/){0,4}$/;
/** The edition folder of a canonical address; refuses anything but plain lowercase folder segments. */
export function editionBase(site: string): string {
  const base = new URL(site).pathname;
  if (!BASE.test(base)) throw new Error(`Unsupported edition folder ${JSON.stringify(base.slice(0, 80))}: use / or /<folder>/ of lowercase letters, digits and hyphens.`);
  return base;
}

/** Book choice of build:release and verify:release: one id, `all` (every release book), `originals` or `converted`. */
export function selectReleaseBooks(wanted: string): PublicationBook[] {
  if (wanted === 'all') return releaseBooks;
  if (wanted === 'originals') return releaseBooks.filter(book => !convertedBookIds.has(book.id));
  if (wanted === 'converted') return releaseBooks.filter(book => convertedBookIds.has(book.id));
  return releaseBooks.filter(book => book.id === wanted);
}
export const releaseBookChoices = (): string => `${releaseBooks.map(book => book.id).join(', ')}, originals, converted, all`;
