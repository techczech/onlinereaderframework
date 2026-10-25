import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { PublicationReaderProps } from './types.js';
import { flattenPublicationSections } from './publication-model.js';
import { usePublicationReader } from './use-publication-reader.js';
import { ReaderLayout } from './ReaderLayout.js';
import { ReadingSupportSurface } from './reading-support/index.js';
import { ListeningPanel, safeRecordingSource, type ListeningBoundary } from './listening/index.js';
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

function BookReader({ book, coaching, epub, audio, agent }: PublicationReaderProps) {
  const reader = usePublicationReader(book, epub);
  // The recorded player exists only when a track has a usable source and belongs to a section of this book, as the controller requires.
  const hasRecordedAudio = !!audio?.some(track => safeRecordingSource(track.src) && reader.sections.some(section => section.id === track.sectionId));
  const [listeningOpen, setListeningOpen] = useState(false);
  const [pauseSignal, setPauseSignal] = useState(0);
  const [boundary, setBoundary] = useState<ListeningBoundary | null>(null);
  const pauseRecording = useRef<(() => void) | null>(null);
  const registerPause = useCallback((pause: (() => void) | null) => { pauseRecording.current = pause; }, []);
  const listenTrigger = useRef<HTMLElement | null>(null);
  const listeningSurface = useRef<HTMLDivElement>(null);
  // The player stays mounted while hidden, so focus belongs to each opening.
  useEffect(() => {
    if (listeningOpen) listeningSurface.current?.querySelector<HTMLButtonElement>('[aria-label="Close recorded audiobook"]')?.focus();
  }, [listeningOpen]);
  useListeningHighlight(reader.contentRef, reader.currentSectionId, boundary, reader.highlights);
  const openListening = (trigger: HTMLElement | null) => {
    listenTrigger.current = trigger;
    setListeningOpen(true);
  };
  return <ReaderLayout reader={reader} coaching={coaching} agent={agent || undefined}
    readingSurface={children => <ReadingSupportSurface bookId={book.id} sectionId={reader.currentSectionId}>{children}</ReadingSupportSurface>}
    hasRecordedAudio={hasRecordedAudio} onOpenRecordedAudio={openListening}
    onBrowserSpeechStart={() => { pauseRecording.current?.(); setPauseSignal(value => value + 1); setBoundary(null); }}
    listeningPanel={hasRecordedAudio ? <div ref={listeningSurface} hidden={!listeningOpen} className="publication-listening-surface">
      <ListeningPanel bookId={book.id} sections={reader.sections} currentSectionId={reader.currentSectionId}
        onSelectSection={reader.handleSectionChange} tracks={audio} pauseSignal={pauseSignal} registerPause={registerPause}
        onPlaybackStart={() => reader.rendererRef.current?.stopReadAloud()}
        onBoundary={setBoundary}
        onClose={() => { setListeningOpen(false); listenTrigger.current?.focus(); }} />
    </div> : null} />;
}

export type { PublicationBook, PublicationSection, PublicationContentFormat, PublicationReaderProps, PublicationCoaching, PublicationAgentAccess } from './types.js';
