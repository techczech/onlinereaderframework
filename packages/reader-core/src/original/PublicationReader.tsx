import React, { useRef, useState } from 'react';
import type { PublicationReaderProps } from './types.js';
import { flattenPublicationSections } from './publication-model.js';
import { usePublicationReader } from './use-publication-reader.js';
import { ReaderLayout } from './ReaderLayout.js';
import { ReadingSupportControls, ReadingSupportSurface, useReadingSupport } from './reading-support/index.js';
import { ListeningPanel, type ListeningBoundary } from './listening/index.js';
import { useListeningHighlight } from './use-listening-highlight.js';

/** Original Deliberate Practice reader, generalised without changing its visual baseline.
 * The inner key is part of the public isolation guarantee when a host switches books.
 */
export function PublicationReader(props: PublicationReaderProps) {
  const ids = new Set<string>();
  for (const section of flattenPublicationSections(props.book.sections)) {
    if (!section.id || section.id === 'home' || ids.has(section.id)) throw new Error(`Publication ${props.book.id} requires unique, non-empty section IDs; "home" is reserved. Invalid ID: ${section.id}`);
    ids.add(section.id);
  }
  if (!props.book.id) throw new Error('PublicationReader requires a stable book.id.');
  return <BookReader key={props.book.id} {...props} />;
}

function BookReader({ book, coaching, epub, audio }: PublicationReaderProps) {
  const reader = usePublicationReader(book, epub);
  const support = useReadingSupport(book.id);
  const [listeningOpen, setListeningOpen] = useState(false);
  const [pauseSignal, setPauseSignal] = useState(0);
  const [boundary, setBoundary] = useState<ListeningBoundary | null>(null);
  const listenTrigger = useRef<HTMLElement | null>(null);
  useListeningHighlight(reader.contentRef, reader.currentSectionId, boundary, reader.highlights);
  const openListening = () => {
    listenTrigger.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setListeningOpen(true);
  };
  return <ReaderLayout reader={reader} coaching={coaching}
    readingSettingsExtra={<ReadingSupportControls bookId={book.id} inline />}
    onResetReadingSupport={support.reset}
    readingSurface={children => <ReadingSupportSurface bookId={book.id} sectionId={reader.currentSectionId}>{children}</ReadingSupportSurface>}
    onListen={openListening}
    onBrowserSpeechStart={() => { setPauseSignal(value => value + 1); setBoundary(null); }}
    listeningPanel={<div hidden={!listeningOpen} className="publication-listening-surface">
      <ListeningPanel bookId={book.id} sections={reader.sections} currentSectionId={reader.currentSectionId}
        onSelectSection={reader.handleSectionChange} tracks={audio} pauseSignal={pauseSignal}
        onPlaybackStart={() => reader.rendererRef.current?.stopReadAloud()}
        onBoundary={setBoundary}
        onClose={() => { setListeningOpen(false); listenTrigger.current?.focus(); }} />
    </div>} />;
}

export type { PublicationBook, PublicationSection, PublicationContentFormat, PublicationReaderProps, PublicationCoaching } from './types.js';
