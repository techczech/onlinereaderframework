/** Appearance of the three original books (the converted books carry theirs in their own JSON). A release build replaces this module with its own
 * book's entry only, or none (scripts/release/release-plugin.ts), so no bundle carries another book's cover or colours. */
import type { PublicationBook } from 'reader-core';

export const bookIdentities: Readonly<Record<string, NonNullable<PublicationBook['appearance']>>> = {
  'linguistics': { accent: '#b84b2d', paper: '#fffaf1', ink: '#282723', masthead: 'editorial', cover: { src: '/covers/linguistics.jpg', alt: 'Linguistics cover with overlapping red and blue voices' } },
  'deliberate-practice': { accent: '#a93232', paper: '#faf9f5', ink: '#202822', masthead: 'practical', cover: { src: '/covers/deliberate-practice.jpg', alt: 'Deliberate Practice cover with repeated ink strokes and a red correction' } },
  'language-muscle': { accent: '#187060', paper: '#f7f6e9', ink: '#203d35', masthead: 'literary', cover: { src: '/covers/language-muscle.jpg', alt: 'Language Muscle cover with interwoven green and cream ribbons' } }
};
