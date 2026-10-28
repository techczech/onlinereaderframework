import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import publications from './books/original-publications.json';
import { RELEASE_BOOK } from './release';
import { releaseLocation, sectionIdsOf, type RouteSection } from './release-routes';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/merriweather/300.css';
import '@fontsource/merriweather/400.css';
import '@fontsource/merriweather/700.css';
import '@fontsource/merriweather/300-italic.css';
import '@fontsource/material-symbols-outlined/400.css';
import '../../../packages/reader-core/src/original/reader-original.css';
import '../../../packages/reader-core/src/original/reading-support/support.css';
import '../../../packages/reader-core/src/original/listening/listening.css';
import '../../../packages/reader-core/src/original/reader-integrations.css';
import '../../../packages/reader-core/src/original/frontpage/frontpage.css';
import '../../../packages/reader-core/src/original/agent/agent-access.css';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

if (RELEASE_BOOK) {
  const book = (publications as { id: string; sections: RouteSection[] }[]).find(entry => entry.id === RELEASE_BOOK);
  const clean = book && releaseLocation(book.id, window.location.href, sectionIdsOf(book.sections), import.meta.env.BASE_URL);
  if (clean) window.history.replaceState(window.history.state, '', clean);
}

createRoot(rootElement).render(<App />);
