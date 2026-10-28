/** Host-owned embeds of a pinned single-book release, by book id. Empty here: the demo takes its embeds from src/books/demo-books.ts, and every release
 * build replaces this module with its own book's descriptors only, including the edition folder as `base` (scripts/release/release-plugin.ts). */
import type { PublicationEmbeds } from 'reader-core';

export const releaseEmbeds: Readonly<Record<string, PublicationEmbeds>> = {};
