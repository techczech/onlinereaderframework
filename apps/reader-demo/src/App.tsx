import React, { useEffect, useState } from 'react';
import { PublicationReader, publicationDisplayTitle, type PublicationBook } from 'reader-core';
import commandLineIcon from './books/assets/command-line_gray.svg?raw';
import publications from './books/original-publications.json';

const identities: Record<string, NonNullable<PublicationBook['appearance']>> = {
  'linguistics': { accent: '#b84b2d', paper: '#fffaf1', ink: '#282723', masthead: 'editorial', cover: { src: '/covers/linguistics.jpg', alt: 'Linguistics cover with overlapping red and blue voices' } },
  'deliberate-practice': { accent: '#a93232', paper: '#faf9f5', ink: '#202822', masthead: 'practical', cover: { src: '/covers/deliberate-practice.jpg', alt: 'Deliberate Practice cover with repeated ink strokes and a red correction' } },
  'language-muscle': { accent: '#187060', paper: '#f7f6e9', ink: '#203d35', masthead: 'literary', cover: { src: '/covers/language-muscle.jpg', alt: 'Language Muscle cover with interwoven green and cream ribbons' } }
};
const books = (publications as PublicationBook[]).map(book => ({ ...book,
  appearance: identities[book.id],
  labels: { search: 'Search', tableOfContents: 'Table of contents', readingSettings: 'Reading settings', listen: 'Listen' },
  navigation: { homeDepth: 2, sidebarDepth: 3, showHomeContents: true }
}));
function selectedBook() {
  const id = new URL(window.location.href).searchParams.get('book');
  return books.find(book => book.id === id) ?? books[0];
}

/** Host routing chooses the book; the original-derived reader owns its section route. */
export default function App() {
  const [book, setBook] = useState(selectedBook);
  useEffect(() => {
    const restore = () => setBook(selectedBook());
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => { document.title = `${publicationDisplayTitle(book)} — Online Reader Framework`; }, [book]);
  const epub = book.id === 'deliberate-practice' ? { assets: [{
    href: 'https://www.notion.so/icons/command-line_gray.svg',
    mediaType: 'image/svg+xml' as const,
    data: new TextEncoder().encode(commandLineIcon)
  }] } : undefined;
  return <PublicationReader book={book} epub={epub} />;
}
