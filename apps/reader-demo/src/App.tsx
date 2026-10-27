import React, { useEffect, useMemo, useState } from 'react';
import { FRONT_PAGE_LAYOUTS, PublicationReader, frontPageLayoutKey, publicationDisplayTitle, type FrontPageLayoutKey, type PublicationBook } from 'reader-core';
import { epubAssets } from './books/epub-assets';
import publications from './books/original-publications.json';
import { canonicalSites } from './canonical-sites';
import { RELEASE_BOOK } from './release';

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
/** Per-book front-page layout. Linguistics previews Colour band provisionally; a book not listed keeps the classic home page. */
const frontPageLayouts: Partial<Record<string, FrontPageLayoutKey>> = { linguistics: 'opus-colour-band' };
/** Demo only: ?frontpage=<layout key> previews any layout, ?frontpage=classic the classic home page; an unknown value uses the book's configured layout. */
const frontPageParameter = () => RELEASE_BOOK ? null : new URL(window.location.href).searchParams.get('frontpage');
/** Demo only: ?homedepth=<number> sets navigation.homeDepth for the front-page contents; anything else keeps the book's own. */
const homeDepthParameter = () => {
  if (RELEASE_BOOK) return undefined;
  const value = new URL(window.location.href).searchParams.get('homedepth');
  return value !== null && value.trim() !== '' && Number.isInteger(Number(value)) ? Number(value) : undefined;
};
function layoutFor(book: PublicationBook, parameter: string | null) {
  return parameter === 'classic' ? undefined : frontPageLayoutKey(parameter) ?? frontPageLayouts[book.id];
}
/** A release is pinned to its one book: `?book` is ignored. */
function selectedBook() {
  if (RELEASE_BOOK) return books.find(book => book.id === RELEASE_BOOK) ?? books[0];
  const id = new URL(window.location.href).searchParams.get('book');
  return books.find(book => book.id === id) ?? books[0];
}

/** Host routing chooses the book; the original-derived reader owns its section route. */
export default function App() {
  const [selected, setBook] = useState(selectedBook);
  const [parameter, setParameter] = useState(frontPageParameter);
  const layout = layoutFor(selected, parameter);
  const homeDepth = homeDepthParameter();
  const book = useMemo(() => ({ ...selected, appearance: { ...selected.appearance, frontPageLayout: layout },
    navigation: { ...selected.navigation, ...(homeDepth === undefined ? {} : { homeDepth }) } }), [selected, layout, homeDepth]);
  useEffect(() => {
    const restore = () => { setBook(selectedBook()); setParameter(frontPageParameter()); };
    window.addEventListener('popstate', restore);
    return () => window.removeEventListener('popstate', restore);
  }, []);
  useEffect(() => { document.title = RELEASE_BOOK ? publicationDisplayTitle(book) : `${publicationDisplayTitle(book)} — Online Reader Framework`; }, [book]);
  /* A release build swaps this mapping for its own book's (scripts/release/projection.ts). */
  const assets = epubAssets[book.id];
  const epub = assets ? { assets } : undefined;
  const choose = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set('frontpage', value);
    window.history.pushState(window.history.state, '', url);
    setParameter(value);
  };
  return <>
    <PublicationReader book={book} epub={epub} agent={{ path: `${import.meta.env.BASE_URL}agent/`, siteUrl: canonicalSites[book.id] }} />
    {!RELEASE_BOOK && <label className="demo-frontpage-chooser">Front page layout
      <select value={layout ?? 'classic'} onChange={event => choose(event.target.value)}>
        <option value="classic">Classic</option>
        {FRONT_PAGE_LAYOUTS.map(option => <option key={option.key} value={option.key}>{option.label}</option>)}
      </select>
    </label>}
  </>;
}
