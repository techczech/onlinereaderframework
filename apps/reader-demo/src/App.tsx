import React, { useEffect, useState } from 'react';
import { PublicationReader, publicationDisplayTitle, type PublicationBook } from 'reader-core';
import commandLineIcon from './books/assets/command-line_gray.svg?raw';
import publications from './books/original-publications.json';

const books = publications as PublicationBook[];
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
