import React, { useEffect, useState } from 'react';
import { PublicationReader, type PublicationBook } from 'reader-core';
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
  useEffect(() => { document.title = `${book.title} ${book.subtitle ?? ''} — Online Reader Framework`; }, [book]);
  return <PublicationReader book={book} />;
}
