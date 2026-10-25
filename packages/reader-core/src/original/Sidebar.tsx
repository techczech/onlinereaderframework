import React, { useState, useMemo, useRef, useEffect, useLayoutEffect } from 'react';
import type { PublicationBook, PublicationSection } from './types.js';
import { flattenPublicationSections } from './publication-model.js';
import { renderPublicationContent } from '../publication-content/index.js';
import { publicationLabels, publicationNavigation } from './publication-navigation.js';
import { publicationDisplayTitle } from './publication-model.js';
import { publicationPlainText } from './publication-html.js';
import { chapterProgress, dropClosedOnPath, sectionAncestors, sidebarDepth, sidebarExpanded } from './sidebar-model.js';

interface SidebarProps {
  book: PublicationBook;
  currentSectionId: string;
  onSelectSection: (id: string, text?: string) => void;
  isOpen: boolean;
  onClose: () => void;
  readSections: Set<string>;
  bookmarkedSections: Set<string>;
  shouldFocusSearch?: boolean;
  /** Called once the requested focus has landed or been given up, so the next request is a new one. */
  onSearchFocusHandled?: () => void;
}

// Layout effects warn during server rendering; the sidebar only measures in a browser.
const useBrowserLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

interface SidebarSession { manual: Record<string, boolean>; scrollTop: number }
const sessionKey = (bookId: string) => `publication-reader:${encodeURIComponent(bookId)}:sidebarSession`;
/** Tab-scoped and keyed by book, so one book's open topics and list position never reach another. */
function readSession(bookId: string): SidebarSession {
  try {
    const value: unknown = JSON.parse(window.sessionStorage.getItem(sessionKey(bookId)) ?? 'null');
    const { manual, scrollTop } = (value ?? {}) as Partial<SidebarSession>;
    if (manual && typeof manual === 'object' && Object.values(manual).every(open => typeof open === 'boolean') && typeof scrollTop === 'number') return { manual, scrollTop };
  } catch { /* An unavailable or malformed session store starts the list fresh. */ }
  return { manual: {}, scrollTop: 0 };
}
function writeSession(bookId: string, session: SidebarSession) {
  try { window.sessionStorage.setItem(sessionKey(bookId), JSON.stringify(session)); } catch { /* Session position is a convenience. */ }
}

/** Pinned compact header over one scrolling contents list. It stays mounted while hidden so its state survives. */
export const Sidebar: React.FC<SidebarProps> = ({
  book,
  currentSectionId,
  onSelectSection,
  isOpen,
  onClose,
  readSections,
  bookmarkedSections,
  shouldFocusSearch,
  onSearchFocusHandled,
}) => {
  const GUIDE_CONTENT = useMemo(() => flattenPublicationSections(book.sections), [book.sections]);
  const searchIndex = useMemo(() => GUIDE_CONTENT.map(section => ({ section, text: publicationPlainText(renderPublicationContent(section.content, section.format ?? 'markdown')) })), [GUIDE_CONTENT]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const labels = publicationLabels(book);
  const navigation = useMemo(() => publicationNavigation(book.sections, sidebarDepth(book.sections, book.navigation?.sidebarDepth)), [book.sections, book.navigation?.sidebarDepth]);
  const displayTitle = publicationDisplayTitle(book);
  const searching = searchQuery.length > 0;

  const initialSession = useRef<SidebarSession>();
  if (!initialSession.current) initialSession.current = typeof window === 'undefined' ? { manual: {}, scrollTop: 0 } : readSession(book.id);
  const [manual, setManual] = useState(initialSession.current.manual);
  const scrollTopRef = useRef(initialSession.current.scrollTop);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  // A row the reader clicked stays where it was under the pointer, even when topics above it open or close.
  const clicked = useRef<{ id: string; top: number } | null>(null);
  const arrival = useRef(true);

  const pathIds = useMemo(() => [...sectionAncestors(book.sections, currentSectionId).map(section => section.id), currentSectionId], [book.sections, currentSectionId]);
  const onPath = useMemo(() => new Set(pathIds), [pathIds]);
  // Adjusting state while rendering applies the arrival before paint, so the current row exists to be revealed.
  const [arrivedAt, setArrivedAt] = useState(currentSectionId);
  if (arrivedAt !== currentSectionId) {
    setArrivedAt(currentSectionId);
    setManual(previous => dropClosedOnPath(previous, pathIds));
  }

  useEffect(() => { writeSession(book.id, { manual, scrollTop: scrollTopRef.current }); }, [book.id, manual]);
  useEffect(() => () => clearTimeout(saveTimer.current), []);

  const rowFor = (id: string) => Array.from(listRef.current?.querySelectorAll<HTMLElement>('[data-section-id]') ?? []).find(element => element.dataset.sectionId === id);
  const reveal = (mode: 'center' | 'nearest', onlyIfHidden = true) => {
    const list = listRef.current;
    const row = list && rowFor(currentSectionId);
    if (!list || !row) return;
    const box = list.getBoundingClientRect(), rowBox = row.getBoundingClientRect();
    if (onlyIfHidden && rowBox.top >= box.top && rowBox.bottom <= box.bottom) return;
    const offset = rowBox.top - box.top + list.scrollTop;
    list.scrollTop = mode === 'center' ? offset - (list.clientHeight - row.offsetHeight) / 2
      : rowBox.top < box.top ? offset - 8 : offset - list.clientHeight + row.offsetHeight + 8;
  };

  useBrowserLayoutEffect(() => { if (listRef.current) listRef.current.scrollTop = scrollTopRef.current; }, []);
  // Opening, including the first render at a deep link, brings the current row into view.
  useBrowserLayoutEffect(() => {
    if (!isOpen || searching) return;
    // Leaving a search swaps the list back in at the top; put the reader's position back first.
    if (listRef.current) listRef.current.scrollTop = scrollTopRef.current;
    // Arriving at a link centres the row even if it is already on screen; reopening moves the list only if the row is hidden.
    reveal('center', !arrival.current);
    arrival.current = false;
  }, [isOpen, searching]);
  // Previous/Next and links move the list only when the new row is out of sight; a click in the list never does.
  const firstRender = useRef(true);
  useBrowserLayoutEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const pointed = clicked.current;
    clicked.current = null;
    const list = listRef.current, row = pointed && rowFor(pointed.id);
    if (list && row) { list.scrollTop += row.getBoundingClientRect().top - list.getBoundingClientRect().top - pointed.top; return; }
    if (isOpen && !searching) reveal('nearest');
  }, [currentSectionId]);

  // A search request (the Search button on the book home, or the search shortcut) lands in the field once the sidebar is rendered.
  // The sidebar slides in over a few frames and focus is refused while it is still hidden, so retry on frames for about half a second.
  // Focus is not taken from a field the reader has moved to meanwhile, and the sliding sidebar must not scroll anything.
  useEffect(() => {
    if (!shouldFocusSearch || !isOpen) return;
    const input = searchInputRef.current;
    let frame = 0, tries = 0, done = false;
    // Only the request that is still current may consume the flag; a request already cancelled below cannot clear a newer one.
    const finish = () => { if (done) return; done = true; onSearchFocusHandled?.(); };
    const elsewhere = () => {
      const active = document.activeElement as HTMLElement | null;
      return !!active && active !== input && (active.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(active.tagName) || !!active.closest('[role="dialog"]'));
    };
    const attempt = () => {
      if (done || !input) return;
      if (elsewhere()) return finish();
      input.focus({ preventScroll: true });
      if (document.activeElement === input) { input.select(); return finish(); }
      if (++tries >= 30) return finish();
      frame = requestAnimationFrame(attempt);
    };
    frame = requestAnimationFrame(attempt);
    // Closing navigation, a book change or unmount ends the request instead of leaving it to revive on the next opening.
    return () => { cancelAnimationFrame(frame); finish(); };
  }, [shouldFocusSearch, isOpen]);

  // Search Logic
  const searchResults = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase();
    
    return searchIndex.map(({ section, text }) => {
        // Title Match
        const titleMatch = section.title.toLowerCase().includes(query);
        
        // Content Match (find snippets)
        const textLower = text.toLowerCase();
        const contentMatches = [];
        let startIndex = 0;
        
        // Find up to 3 matches per section
        while(contentMatches.length < 3) {
            const idx = textLower.indexOf(query, startIndex);
            if (idx === -1) break;
            
            const start = Math.max(0, idx - 30);
            const end = Math.min(text.length, idx + query.length + 40);
            const snippet = (start > 0 ? '...' : '') + text.substring(start, end) + (end < text.length ? '...' : '');
            
            contentMatches.push({
                snippet,
                textToHighlight: text.substring(idx, idx + query.length)
            });
            
            startIndex = idx + query.length + 20; // skip ahead a bit
        }
        
        if (!titleMatch && contentMatches.length === 0) return null;
        
        return {
            section,
            titleMatch,
            contentMatches
        };
    }).filter((result): result is NonNullable<typeof result> => result !== null);
  }, [searchQuery, searchIndex]);


  const handleClearSearch = () => setSearchQuery('');
  const select = (id: string, text?: string) => {
    const row = rowFor(id);
    clicked.current = row && listRef.current && id !== currentSectionId ? { id, top: row.getBoundingClientRect().top - listRef.current.getBoundingClientRect().top } : null;
    onSelectSection(id, text);
  };

  // Get bookmarked section objects
  const bookmarks = GUIDE_CONTENT.filter(s => bookmarkedSections.has(s.id));
  const progress = chapterProgress(GUIDE_CONTENT, readSections);
  const cover = book.appearance?.cover;
  const homeHref = `?book=${encodeURIComponent(book.id)}`;

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        ></div>
      )}

      {/* Sidebar Content */}
      <aside data-open={isOpen} aria-label={labels.tableOfContents}
        className="publication-sidebar bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800">
        <div className="publication-sidebar-header">
          <div className="publication-sidebar-identity-row">
            <a href={homeHref} className="publication-sidebar-identity" title={`${displayTitle}, ${book.author}`} aria-label={`${displayTitle}: book home`}
              onClick={event => { if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; event.preventDefault(); select('home'); }}>
              {cover && <img src={cover.src} alt="" className="publication-sidebar-cover" />}
              <span className="publication-sidebar-book"><span className="publication-sidebar-book-title">{displayTitle}</span>
                <span className="publication-sidebar-author">{book.author}</span></span>
            </a>
            <button onClick={onClose} aria-label="Close navigation" className="publication-sidebar-close"><span className="material-symbols-outlined">close</span></button>
          </div>
          <div className="relative">
            <input 
                ref={searchInputRef}
                type="search"
                aria-label={labels.search}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={labels.search}
                className="publication-sidebar-search w-full pl-9 pr-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500"
            />
            <span className="material-symbols-outlined publication-sidebar-search-icon text-gray-400 text-lg">search</span>
            {searchQuery && (
                <button 
                    aria-label="Clear search"
                    onClick={handleClearSearch}
                    className="publication-sidebar-search-clear text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                    <span className="material-symbols-outlined text-lg">close</span>
                </button>
            )}
          </div>
          <div className="publication-sidebar-progress">
            <div role="progressbar" aria-label="Chapters read" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.read} className="publication-sidebar-progress-bar">
              <div style={{ width: `${progress.total ? Math.round(progress.read / progress.total * 100) : 0}%` }} />
            </div>
            <span>{progress.read} of {progress.total} read</span>
          </div>
        </div>

        {/* The only scrolling area in the sidebar */}
        <div ref={listRef} className="publication-sidebar-list" onScroll={event => {
          if (searching) return;
          scrollTopRef.current = event.currentTarget.scrollTop;
          clearTimeout(saveTimer.current);
          saveTimer.current = setTimeout(() => writeSession(book.id, { manual, scrollTop: scrollTopRef.current }), 200);
        }}>
            {searchQuery ? (
                // Search Results View
                <div className="p-4 space-y-4">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                        {searchResults.length} {searchResults.length === 1 ? 'Result' : 'Results'} Found
                    </h3>
                    
                    {searchResults.length > 0 ? (
                        searchResults.map((result) => (
                            <div key={result.section.id} className="space-y-2">
                                <button
                                    onClick={() => onSelectSection(result.section.id)}
                                    title={result.section.title}
                                    className="w-full text-left font-semibold text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                                >
                                    {result.section.title}
                                </button>
                                
                                {result.contentMatches.map((match, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => onSelectSection(result.section.id, match.textToHighlight)}
                                        className="w-full text-left text-xs text-gray-600 dark:text-gray-300 p-2 bg-gray-50 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded border border-gray-100 dark:border-gray-700 transition-colors block"
                                    >
                                        <span className="line-clamp-2">
                                            {match.snippet.split(match.textToHighlight).map((part: string, idx: number, arr: string[]) => (
                                                <React.Fragment key={idx}>
                                                    {part}
                                                    {idx < arr.length - 1 && (
                                                        <span className="font-bold bg-yellow-100 dark:bg-yellow-900 text-gray-900 dark:text-white px-0.5 rounded">
                                                            {match.textToHighlight}
                                                        </span>
                                                    )}
                                                </React.Fragment>
                                            ))}
                                        </span>
                                    </button>
                                ))}
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-gray-400 py-8">
                            <p>No matches found for "{searchQuery}"</p>
                        </div>
                    )}
                </div>
            ) : (
                // Normal Navigation View
                <nav aria-label={labels.tableOfContents} className="p-4">
                        {/* Saved Sections (Bookmarks) */}
                        {bookmarks.length > 0 && (
                            <div className="mb-6">
                                <h3 className="px-2 text-xs font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm material-symbols-filled">bookmark</span>
                                    Saved Sections
                                </h3>
                                <div className="space-y-1">
                                     {bookmarks.map(section => (
                                        <button
                                            key={`bookmark-${section.id}`}
                                            onClick={() => select(section.id)}
                                            className={`
                                                w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex justify-between items-center
                                                ${currentSectionId === section.id
                                                    ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}
                                            `}
                                        >
                                            <span title={section.title} className="truncate">{section.title}</span>
                                        </button>
                                     ))}
                                </div>
                                <div className="border-b border-gray-100 dark:border-gray-800 my-4 mx-2"></div>
                            </div>
                        )}

                        <h2 className="px-2 mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">{labels.tableOfContents}</h2>
                        <div className="space-y-1">
                          {navigation.map(node => <SidebarItem key={node.section.id} section={node.section}
                            visibleChildren={node.children} currentSectionId={currentSectionId} onPath={onPath} manual={manual} readSections={readSections}
                            onToggle={(id, open) => setManual(previous => ({ ...previous, [id]: open }))} onSelectSection={select} />)}
                        </div>
                </nav>
            )}
        </div>
      </aside>
    </>
  );
};


/** Language Muscle's original rows: a topic row opens and closes its topic, and only chapters open pages.
 * A topic's own page is reached from the breadcrumb and the home contents.
 */
function SidebarItem({ section, visibleChildren, currentSectionId, onPath, manual, readSections, onToggle, onSelectSection, depth = 0 }: {
  section: PublicationSection;
  visibleChildren: ReturnType<typeof publicationNavigation>;
  currentSectionId: string;
  onPath: ReadonlySet<string>;
  manual: Readonly<Record<string, boolean>>;
  readSections: Set<string>;
  onToggle: (id: string, open: boolean) => void;
  onSelectSection: (id: string) => void;
  depth?: number;
}) {
  const hasChildren = visibleChildren.length > 0;
  const expanded = hasChildren && sidebarExpanded(section, onPath.has(section.id), manual);
  const isRead = readSections.has(section.id);
  const isActive = currentSectionId === section.id;
  const colour = isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
    : hasChildren || isRead ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
    : 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white';
  return (
    <div className="select-none">
      <div style={{ paddingLeft: `${Math.min(depth, 6) * 0.75}rem` }}>
        <button data-section-id={section.id} aria-current={isActive ? 'page' : undefined} aria-expanded={hasChildren ? expanded : undefined}
          onClick={() => hasChildren ? onToggle(section.id, !expanded) : onSelectSection(section.id)}
          className={`publication-sidebar-row w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex justify-between items-center gap-2 ${colour}`}>
          <span title={section.title} className={`publication-sidebar-title ${isActive ? 'is-active' : ''} ${isRead && !isActive && !hasChildren ? 'opacity-80' : ''}`}>{section.title}</span>
          {hasChildren
            ? <span aria-hidden="true" className="material-symbols-outlined text-lg text-gray-400">{expanded ? 'expand_more' : 'chevron_right'}</span>
            : isRead && <span aria-hidden="true" className={`material-symbols-outlined text-base ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-green-500 dark:text-green-600'}`}>check</span>}
        </button>
      </div>
      {expanded && <div className="my-1 transition-all">
        {visibleChildren.map(child => <SidebarItem key={child.section.id} section={child.section} visibleChildren={child.children} currentSectionId={currentSectionId} onPath={onPath} manual={manual}
          readSections={readSections} onToggle={onToggle} onSelectSection={onSelectSection} depth={depth + 1} />)}
      </div>}
    </div>
  );
}
