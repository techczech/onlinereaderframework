import React, { useId, useMemo, useRef, useState } from 'react';
import type { PublicationAgentAccess, PublicationBook } from '../types.js';
import { safePublicationHref } from '../publication-model.js';
import { publicationLabels } from '../publication-navigation.js';
import type { FrontPageLayoutKey } from './frontpage-layouts.js';
import { defaultFullContents, frontPageContents, frontPageMatches, frontPageProgress, frontPageTargets, frontPageTitle } from './frontpage-model.js';
import { FrontPageLayout, type FrontPageContext } from './layouts.js';

export interface FrontPageProps {
  book: PublicationBook;
  layout: FrontPageLayoutKey;
  onStart: () => void;
  onSelectSection: (id: string) => void;
  onResume?: (id: string) => void;
  onOpenSearch: () => void;
  onDownloadEbook?: () => void | Promise<void>;
  /** Ids the reader has opened, from the reader's saved state. */
  readSections?: ReadonlySet<string>;
  /** The last page the reader opened in this book, from the reader's saved state. */
  lastSectionId?: string | null;
  agent?: PublicationAgentAccess;
}

const noneRead: ReadonlySet<string> = new Set();

/** One front page for every layout: the book data, contents, actions and saved state are shared; the layout component only arranges them. */
export function FrontPage({ book, layout, onStart, onSelectSection, onResume, onOpenSearch, onDownloadEbook, readSections = noneRead, lastSectionId, agent }: FrontPageProps) {
  const id = useId();
  const labels = publicationLabels(book);
  const contents = useMemo(() => frontPageContents(book), [book]);
  const [full, setFull] = useState(() => defaultFullContents(contents));
  const [opened, setOpened] = useState<ReadonlySet<string>>(new Set());
  const [query, setQuery] = useState('');
  const [generating, setGenerating] = useState(false);
  const filterRef = useRef<HTMLInputElement>(null);
  const matches = useMemo(() => frontPageMatches(contents, query), [contents, query]);
  const downloads = (book.downloads ?? []).filter(download => safePublicationHref(download.href));
  const context: FrontPageContext = {
    id, book, labels, contents, title: frontPageTitle(book),
    targets: frontPageTargets(book, lastSectionId), progress: frontPageProgress(book, readSections), readSections,
    showContents: book.navigation?.showHomeContents !== false && contents.groups.length > 0,
    full, setFull, opened, query, setQuery, matches, filterRef,
    toggle: key => setOpened(previous => { const next = new Set(previous); if (!next.delete(key)) next.add(key); return next; }),
    onStart, onSelectSection, onResume, onOpenSearch, agent,
    downloads, canGenerate: !downloads.length && !!onDownloadEbook, generating,
    generate: async () => { setGenerating(true); try { await onDownloadEbook?.(); } finally { setGenerating(false); } },
  };
  const masthead = book.appearance?.masthead ?? 'editorial';
  return <div className={`publication-home publication-front publication-front--${masthead}`} data-front-layout={layout}>
    <FrontPageLayout layout={layout} context={context} />
  </div>;
}
