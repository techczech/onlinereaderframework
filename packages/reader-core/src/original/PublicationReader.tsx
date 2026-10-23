import React from 'react';
import type { PublicationReaderProps } from './types';
import { flattenPublicationSections } from './publication-model';
import { usePublicationReader } from './use-publication-reader';
import { ReaderLayout } from './ReaderLayout';

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

function BookReader({ book, coaching }: PublicationReaderProps) {
  const reader = usePublicationReader(book);
  return <ReaderLayout reader={reader} coaching={coaching} />;
}

export type { PublicationBook, PublicationSection, PublicationContentFormat, PublicationReaderProps, PublicationCoaching } from './types';
