/** The demo's one registry of all five books: the three originals (`original-publications.json`, unchanged) and the two converted books in `next-books/`.
 * Every consumer of "all demo books" reads this file: the demo app (loaded lazily, see App.tsx), the agent files and `llms.txt` (scripts/build-agent-files.ts),
 * and the integration tests. The converted books are registered here once and are not copied into original-publications.json.
 *
 * Release invariant: a single-book release replaces original-publications.json, canonical-sites.ts and epub-assets.ts with its own book's
 * (scripts/release/release-plugin.ts) but does not replace this file. Nothing a release bundle reaches may therefore import it: App.tsx loads it with a
 * dynamic import that only runs when `RELEASE_BOOK` is null, and the integration test builds an existing release and checks that no converted-book text,
 * embed or registry reaches the bundle. */
import type { PublicationBook, PublicationEmbeds } from 'reader-core';
import originals from './original-publications.json';
import academic from './next-books/academic-reading-framework.book.json';
import readability from './next-books/readability-foundations.book.json';
import manifest from './next-books/embed-manifest.json';

/** Folder of a book's embeds below the page, per the embed contract's `root`: `embeds/<book id>/`. The built copy of `<id>/index.html` lives there. */
export const embedRootOf = (bookId: string): string => `embeds/${bookId}/`;

interface ManifestBook { bookFile: string; interactivesDir: string; items: Array<Record<string, unknown> & { id: string; src: string }> }
export const embedManifest = manifest.books as unknown as Record<string, ManifestBook>;

/** The Readability original says "CC BY" and names no version (conversion report, Licences). The prepared file links the 4.0 deed, which is an assumed
 * version; this registry links the address without a version instead, so the reader does not state more than the original does. */
const unversionedReadability = (book: PublicationBook): PublicationBook => ({ ...book, home: { ...book.home, license: book.home?.license && { ...book.home.license, href: 'https://creativecommons.org/licenses/by/' } } });

/** Converted books keep their canonical per-book identity and author-selected covers. */
export const nextBooks: PublicationBook[] = [academic as unknown as PublicationBook, unversionedReadability(readability as unknown as PublicationBook)];
export const originalBooks = originals as unknown as PublicationBook[];
export const demoBooks: PublicationBook[] = [...originalBooks, ...nextBooks];

/** Host-owned embeds per book id, built once at module load so the objects are stable across renders. `placement` in the manifest is explanation only. */
export const demoEmbeds: Readonly<Record<string, PublicationEmbeds>> = Object.fromEntries(Object.entries(embedManifest).map(([bookId, entry]) => [bookId, {
  root: embedRootOf(bookId),
  items: entry.items.map(({ placement: _placement, ...descriptor }) => descriptor),
} as unknown as PublicationEmbeds]));
