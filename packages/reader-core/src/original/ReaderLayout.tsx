import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Sidebar } from './Sidebar.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { embedsForSection, type ValidPublicationEmbed } from '../embed/embed-model.js';

const noEmbeds: readonly ValidPublicationEmbed[] = [];
import { HighlightsDrawer } from './HighlightsDrawer.js';
import { Home } from './Home.js';
import { TableOfContents, type TableOfContentsHandle } from './TableOfContents.js';
import { browserStorage, readOutlineCollapsed, writeOutlineCollapsed } from './outline-preference.js';
import { QuoteImageModal } from './QuoteImageModal.js';
import { Toast } from './Toast.js';
import { ShortcutsModal } from './ShortcutsModal.js';
import { publicationLabels, publicationColour } from './publication-navigation.js';
import type { PublicationAgentAccess, PublicationCoaching } from './types.js';
import { AgentAccess } from './agent/AgentAccess.js';
import { publicationDisplayTitle, publicationUrl } from './publication-model.js';
import { isReadableSection, sectionAncestors } from './sidebar-model.js';
import type { usePublicationReader } from './use-publication-reader.js';
import { ReaderToolbar } from './toolbar/ReaderToolbar.js';
import type { ReadAloudActions } from './read-aloud/use-read-aloud.js';
import type { ReadAloudSnapshot } from './read-aloud/read-aloud-controller.js';
import { useReadingSupport } from './reading-support/use-reading-support.js';
import { useViewportWidth } from './reading-support/use-viewport-width.js';

export interface ReaderLayoutProps {
  reader: ReturnType<typeof usePublicationReader>;
  coaching?: PublicationCoaching;
  /** Generated agent files exist for this book: show the ask-an-agent box. */
  agent?: PublicationAgentAccess;
  readingSurface?: (children: React.ReactNode) => React.ReactNode;
  listeningPanel?: React.ReactNode;
  /** True only when the host configured at least one playable recording; the recorded option is hidden otherwise. */
  hasRecordedAudio?: boolean;
  onOpenRecordedAudio?: (trigger: HTMLElement | null) => void;
  onBrowserSpeechStart?: () => void;
  /** Validated host embeds for the whole book; each chapter receives its own. */
  embeds?: readonly ValidPublicationEmbed[];
}

/** Original reader actions and annotations, with independently measured article and navigation. */
export function ReaderLayout({ reader, coaching, agent, readingSurface, listeningPanel, hasRecordedAudio, onOpenRecordedAudio, onBrowserSpeechStart, embeds = noEmbeds }: ReaderLayoutProps) {
  // The toolbar needs the read-aloud state but not the sentence and word positions, so the layout does not re-render for every spoken word.
  const [readAloud, setReadAloud] = useState<{ snapshot: ReadAloudSnapshot; actions: ReadAloudActions } | null>(null);
  const onReadAloudChange = useCallback((snapshot: ReadAloudSnapshot | null, actions: ReadAloudActions | null) => {
    setReadAloud(previous => {
      if (!snapshot || !actions) return null;
      const before = previous?.snapshot;
      const same = before && previous.actions === actions && (['available', 'status', 'problem', 'voices', 'voicesSettled', 'voiceURI', 'voiceName', 'chosenVoiceURI', 'rate', 'follow', 'paragraph', 'paragraphs'] as const).every(key => before[key] === snapshot[key]);
      return same ? previous : { snapshot, actions };
    });
  }, []);
  const { book, sections, currentSectionId, currentSection, isHome, readSections, lastSectionId, bookmarkedSections, isBookmarked, highlights, reflections, currentSectionHighlights, currentSectionReflection,
    isDarkMode, themeChoice, setThemeChoice, systemDark, isAssistActive, maxWidth, setMaxWidth, getContainerWidthClass,
    isSidebarOpen, setIsSidebarOpen, isChatOpen, setIsChatOpen, isHighlightsOpen, setIsHighlightsOpen, isShortcutsOpen, setIsShortcutsOpen, isImmersiveMode, setIsImmersiveMode,
    isSearchTriggered, setIsSearchTriggered,
    quoteModalData, setQuoteModalData, toastMessage, setToastMessage, selectionRect, selectedText, storageUnavailable,
    contentRef, rendererRef, tocRef, prevSection, nextSection, handleSectionChange, handleResume, handleOpenSearch, handleDownloadEbook,
    saveHighlight, shareHighlightLink, shareHighlightImage, sharePageLink, toggleBookmark, handleSaveReflection, handleOpenHighlightCallback,
    handleDrawerShareLink, handleDrawerShareImage, deleteHighlight, updateHighlightNote, deleteReflection, showToast, handleContentLink  } = reader;
  const sectionEmbeds = useMemo(() => embedsForSection(embeds, currentSection?.id), [embeds, currentSection?.id]);
  const support = useReadingSupport(book.id);
  const compactTocRef = useRef<TableOfContentsHandle>(null);
  // The side outline's folded state lives here so the toolbar button and the outline's own close button share it (remembered per book).
  const [outlineCollapsed, setOutlineCollapsedState] = useState(() => readOutlineCollapsed(book.id, browserStorage()));
  const outlineBook = useRef(book.id);
  if (outlineBook.current !== book.id) { outlineBook.current = book.id; const next = readOutlineCollapsed(book.id, browserStorage()); if (next !== outlineCollapsed) setOutlineCollapsedState(next); }
  const setOutlineCollapsed = useCallback((next: boolean) => { setOutlineCollapsedState(next); writeOutlineCollapsed(book.id, next, browserStorage()); }, [book.id]);
  const [outlineAvailable, setOutlineAvailable] = useState(false);
  const labels = publicationLabels(book);
  const atlas = book.appearance?.readerLayout === 'atlas';
  // Atlas below 1024 px: both panels are overlay drawers (contents from the left, outline from the right), opened only for this visit.
  // The outline's remembered desktop choice is not used there, so a phone never opens on a covering sheet.
  const viewportWidth = useViewportWidth();
  const narrow = viewportWidth < 1024;
  const [outlineSheetOpen, setOutlineSheetOpen] = useState(false);
  const outlineSheet = atlas && narrow;
  // Atlas has two modes. The book's front page is a landing page: no reading toolbar and no contents panel (Search there opens the contents for the visit).
  // Reading starts with the first chapter: the toolbar appears and the contents opens on a desktop until the reader closes it.
  const landing = atlas && isHome;
  const [landingContents, setLandingContents] = useState(false);
  useEffect(() => { if (landing && isSearchTriggered) setLandingContents(true); }, [landing, isSearchTriggered]);
  useEffect(() => { if (!landing) setLandingContents(false); }, [landing]);
  const contentsOpen = landing ? landingContents : isSidebarOpen && !isImmersiveMode;
  // A hairline under the toolbar only once the text has scrolled beneath it.
  const [scrolled, setScrolled] = useState(false);
  // Atlas: the toolbar slides away while the reader scrolls down through the text and comes back on any scroll up or near the top.
  // Direction is measured from where the reader last turned, so a slow scroll counts as much as a flick.
  const [toolbarAway, setToolbarAway] = useState(false);
  const scrollTrack = useRef({ last: 0, turn: 0, direction: 0 });
  // Opening a chapter, or returning to a saved place in it, shows the toolbar; the reader's own scrolling decides after that.
  const settleUntil = useRef(0);
  useEffect(() => { setToolbarAway(false); settleUntil.current = performance.now() + 800; }, [currentSectionId]);
  const onReadingScroll = (event: React.UIEvent<HTMLDivElement>) => {
    const top = event.currentTarget.scrollTop;
    setScrolled(top > 4);
    if (!atlas) return;
    const track = scrollTrack.current;
    if (performance.now() < settleUntil.current) { track.last = track.turn = top; track.direction = 0; return; }
    const direction = Math.sign(top - track.last);
    if (direction && direction !== track.direction) { track.direction = direction; track.turn = track.last; }
    track.last = top;
    if (top < 56) setToolbarAway(false);
    else if (track.direction > 0 && top - track.turn > 32) setToolbarAway(true);
    else if (track.direction < 0 && track.turn - top > 32) setToolbarAway(false);
  };
  const railCollapsed = outlineSheet ? !outlineSheetOpen : outlineCollapsed;
  const setRailCollapsed = useCallback((next: boolean) => { if (outlineSheet) setOutlineSheetOpen(!next); else setOutlineCollapsed(next); }, [outlineSheet, setOutlineCollapsed]);
  const focusWhenShown = (target: () => HTMLElement | null) => {
    // Focus is refused while an overlay is still becoming visible, so retry for about half a second.
    let tries = 0;
    const attempt = () => { const element = target(); element?.focus({ preventScroll: true }); if (document.activeElement !== element && ++tries < 30) requestAnimationFrame(attempt); };
    requestAnimationFrame(attempt);
  };
  // The outline's visible control (toolbar button, or variant A's Hide button or tab) takes focus back after it closes.
  const focusOutlineToggle = () => focusWhenShown(() => Array.from(document.querySelectorAll<HTMLElement>('[data-outline-toggle]')).find(element => element.getClientRects().length) ?? null);
  const dismissOutline = () => { const hadFocus = !!document.activeElement?.closest('#toc-container'); setRailCollapsed(true); if (hadFocus) focusOutlineToggle(); };
  const toggleOutline = () => {
    if (!railCollapsed) { setRailCollapsed(true); return; }
    // The opened sheet takes focus as a whole (its label is read out); no entry looks chosen until the reader moves.
    if (outlineSheet) { setIsSidebarOpen(false); setOutlineSheetOpen(true); }
    else setOutlineCollapsed(false);
    // The list icon disappears once the outline shows, so focus moves into the outline (its label is read out).
    focusWhenShown(() => document.getElementById('toc-container'));
  };
  // One overlay at a time, and moving to another page closes the outline sheet.
  useEffect(() => { if (outlineSheet && isSidebarOpen) setOutlineSheetOpen(false); }, [outlineSheet, isSidebarOpen]);
  useEffect(() => { setOutlineSheetOpen(false); }, [currentSectionId]);
  // While an overlay drawer is open, everything behind its scrim is inert: no focus, no clicks, nothing read out.
  const rootRef = useRef<HTMLDivElement>(null);
  const contentsOverlay = atlas && narrow && contentsOpen;
  const outlineOverlay = outlineSheet && outlineSheetOpen;
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const behind = [
      ...(contentsOverlay ? [root.querySelector('.publication-main'), root.querySelector('.publication-toolbar')] : []),
      ...(outlineOverlay ? [root.querySelector('.publication-sidebar'), root.querySelector('.publication-toolbar'), root.querySelector('.publication-reading-column')] : []),
    ].filter((element): element is HTMLElement => !!element);
    behind.forEach(element => element.setAttribute('inert', ''));
    return () => behind.forEach(element => element.removeAttribute('inert'));
  }, [contentsOverlay, outlineOverlay]);
  const chapterNumber = currentSection ? (sections.find(section => section.children?.some(child => child.id === currentSection.id))?.children || sections.filter(isReadableSection)).findIndex(section => section.id === currentSection.id) + 1 : 0;
  const appearanceStyle = {
    '--publication-accent': publicationColour(book.appearance?.accent),
    '--publication-paper': publicationColour(book.appearance?.paper),
    '--publication-ink': publicationColour(book.appearance?.ink),
  } as React.CSSProperties;
  // Each topic above the page is a link to its own page; the sidebar's topic rows only open and close.
  const breadcrumbTopics = currentSection ? sectionAncestors(book.sections, currentSection.id) : [];
  // Atlas: the toolbar lies over the top of the text column and the outline; the contents panel runs the full height beside it.
  const toolbar = (
    <ReaderToolbar
      navigationLabel={labels.tableOfContents} navigationOpen={contentsOpen}
      onToggleNavigation={() => {
        if (isImmersiveMode) { setIsSidebarOpen(true); setIsImmersiveMode(false); } else setIsSidebarOpen(value => !value);
        // Atlas: the hamburger disappears once the contents shows, so focus moves into the panel.
        if (atlas && !contentsOpen) focusWhenShown(() => document.getElementById('publication-sidebar'));
      }}
      title={publicationDisplayTitle(book)} onHome={() => handleSectionChange('home')} isHome={isHome} listenLabel={labels.listen}
      support={support} themeChoice={themeChoice} systemDark={systemDark} onTheme={setThemeChoice}
      maxWidth={maxWidth} onMaxWidth={setMaxWidth} immersive={isImmersiveMode} onImmersive={setIsImmersiveMode}
      readAloud={readAloud?.snapshot ?? null} readAloudActions={readAloud?.actions ?? null} language={book.language}
      hasRecordedAudio={!!hasRecordedAudio && !!onOpenRecordedAudio} onOpenRecordedAudio={trigger => onOpenRecordedAudio?.(trigger)}
      panelToggles={atlas} bookId={book.id}
      outline={atlas && !isHome && !isImmersiveMode && outlineAvailable && railCollapsed ? { open: false, onToggle: toggleOutline } : undefined}
      onOpenNotes={() => setIsHighlightsOpen(true)} onOpenShortcuts={() => setIsShortcutsOpen(true)} />
  );
  const wrapReadingSurface = readingSurface ?? ((children: React.ReactNode) => children);
  return (
    <div ref={rootRef} style={appearanceStyle} className={`publication-reader ${atlas ? `publication-atlas${landing ? ' publication-landing' : ''}` : ''} ${isDarkMode ? 'dark' : ''} flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300`} >
      {/* Atlas lays the panels and the text out in a row under the toolbar; other layouts ignore this wrapper (display: contents). */}
      <div className="publication-frame">
      {/* Left Sidebar: hidden rather than unmounted, so its list position and open topics survive */}
      <Sidebar
        book={book}
        currentSectionId={currentSectionId} 
        onSelectSection={handleSectionChange}
        isOpen={contentsOpen}
        onClose={() => {
          const hadFocus = !!document.activeElement?.closest('.publication-sidebar');
          if (landing) {
            setLandingContents(false); setIsSearchTriggered(false);
            // The front page has no toolbar: focus returns to the page's title.
            if (hadFocus) setTimeout(() => { const title = contentRef.current?.querySelector<HTMLElement>('h1'); if (title) { title.tabIndex = -1; title.focus({ preventScroll: true }); } }, 0);
            return;
          }
          setIsSidebarOpen(false);
          setIsSearchTriggered(false);
          // The sidebar is about to be hidden: focus goes to the toolbar toggle that reopens it.
          if (hadFocus) setTimeout(() => document.querySelector<HTMLElement>('.publication-navigation-toggle')?.focus(), 0);
        }}
        readSections={readSections}
        bookmarkedSections={bookmarkedSections}
        shouldFocusSearch={isSearchTriggered}
        onSearchFocusHandled={() => setIsSearchTriggered(false)}
      />

      {/* Main Content Area */}
      <main data-scrolled={scrolled || undefined} data-toolbar-away={(atlas && toolbarAway) || undefined} className="publication-main min-w-0 flex-1 flex flex-col h-full overflow-hidden relative w-full transition-all duration-500 ease-in-out">
        {!landing && toolbar}

        {/* Floating Highlight Tooltip */}
        {selectionRect && (
            <div 
                className="fixed z-[60] animate-bounce-in"
                style={{
                    top: `${Math.max(8, selectionRect.top - 60)}px`,
                    left: `${Math.max(130, Math.min(window.innerWidth - 130, selectionRect.left + selectionRect.width / 2))}px`,
                    transform: 'translateX(-50%)'
                }}
                onMouseDown={(e) => e.preventDefault()}
                onMouseUp={(e) => e.stopPropagation()}
            >
                <div className="bg-gray-900 dark:bg-gray-800 text-white rounded-full shadow-xl flex items-center p-1 gap-1 pointer-events-auto ring-1 ring-white/20">
                    <button 
                        onClick={saveHighlight}
                        className="flex items-center gap-1 px-3 py-1.5 hover:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors"
                        title="Save Highlight (h)"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <span className="material-symbols-outlined text-sm text-amber-400">ink_highlighter</span>
                        <span className="text-xs font-medium">Highlight</span>
                    </button>
                    <div className="w-px h-4 bg-gray-700 dark:bg-gray-600"></div>
                    <button 
                        onClick={shareHighlightLink}
                        className="p-1.5 hover:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-300 hover:text-white"
                        title="Copy Link to Text (l)"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <span className="material-symbols-outlined text-sm">link</span>
                    </button>
                    <button 
                        onClick={shareHighlightImage}
                        className="p-1.5 hover:bg-gray-700 dark:hover:bg-gray-600 rounded-full transition-colors text-gray-300 hover:text-white"
                        title="Share as Image"
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <span className="material-symbols-outlined text-sm">image</span>
                    </button>
                </div>
                <div className="w-3 h-3 bg-gray-900 dark:bg-gray-800 rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1.5 z-[-1]"></div>
            </div>
        )}

        {/* Content Body */}
        <div ref={contentRef} onClick={handleContentLink} onScroll={onReadingScroll} className="publication-scroll flex-1 overflow-y-auto scroll-smooth bg-white dark:bg-gray-950">
            {isHome ? (
                <Home
                    onDownloadEbook={handleDownloadEbook}
                    book={book}
                    onStart={() => { const first = sections.find(isReadableSection); if (first) handleSectionChange(first.id); }} 
                    onSelectSection={handleSectionChange}
                    agent={agent}
                    onOpenSearch={handleOpenSearch}
                    readSections={readSections}
                    lastSectionId={lastSectionId}
                    onResume={handleResume}
                />
            ) : (
                <div className={`publication-reading-layout ${getContainerWidthClass()}`}>
                    {/* Center Content */}
                    <div className="publication-reading-column">
                         {/* Breadcrumb & Controls */}
                         {currentSection && !isImmersiveMode && (
                            <div className="publication-breadcrumb-row mb-6 flex min-w-0 items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <div className="publication-breadcrumb flex min-w-0 flex-1 items-center">
                                    <button 
                                        onClick={() => handleSectionChange('home')}
                                        className="shrink-0 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    >
                                        Home
                                    </button>
                                    {breadcrumbTopics.map(topic => <React.Fragment key={topic.id}><span className="mx-2 shrink-0">/</span>
                                    <button onClick={() => handleSectionChange(topic.id)} title={topic.title} className="max-w-[40%] shrink truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{topic.title}</button></React.Fragment>)}
                                    {!breadcrumbTopics.length && currentSection.category && currentSection.category !== currentSection.title && <><span className="mx-2 shrink-0">/</span>
                                    <span title={currentSection.category} className="max-w-[40%] shrink-0 truncate uppercase tracking-wider font-medium text-xs">{currentSection.category}</span></>}
                                    <span className="mx-2 shrink-0">/</span>
                                    <span title={currentSection.title} className="min-w-0 truncate text-gray-900 dark:text-white font-medium">{currentSection.title}</span>
                                </div>
                                
                                <div className="shrink-0 flex items-center gap-2">
                                     <button
                                        onClick={sharePageLink}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-700"
                                        title="Copy Link to Page (l)"
                                    >
                                        <span className="material-symbols-outlined text-lg">link</span>
                                        <span className="publication-page-action-label text-xs font-semibold">Share</span>
                                    </button>

                                    <button
                                        onClick={toggleBookmark}
                                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all border ${
                                            isBookmarked 
                                                ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800' 
                                                : 'bg-white dark:bg-gray-900 text-gray-400 dark:text-gray-500 border-gray-200 dark:border-gray-700 hover:text-gray-600 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                                        }`}
                                        title="Bookmark (b)"
                                    >
                                        <span className={`material-symbols-outlined text-lg ${isBookmarked ? 'material-symbols-filled' : ''}`}>
                                            {isBookmarked ? 'bookmark' : 'bookmark_border'}
                                        </span>
                                        <span className="publication-page-action-label text-xs font-semibold">{isBookmarked ? 'Saved' : 'Save'}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Windows too narrow for the side outline get the same outline here, collapsed above the chapter. */}
                        {currentSection && !isImmersiveMode && !atlas && <TableOfContents ref={compactTocRef} variant="compact" content={currentSection.content} format={currentSection.format} sectionId={currentSection.id} contentRef={contentRef} />}

                        {/* Main Text */}
                        {currentSection && (
                            <div className="publication-article">
                                {atlas && <div className="publication-atlas-chapter" aria-hidden="true"><span className="publication-atlas-folio">{String(chapterNumber).padStart(2, '0')}</span><div><div className="publication-atlas-category">{breadcrumbTopics[breadcrumbTopics.length - 1]?.title || currentSection.category}</div><div className="publication-atlas-title">{currentSection.title}</div></div></div>}
                                {!currentSection.content.trim() && <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{currentSection.title}</h1>}
                                {wrapReadingSurface(<MarkdownRenderer tableReviews={book.appearance?.tableReviews} tableControls={book.appearance?.tableControls}
                                    key={currentSection.id}
                                    format={currentSection.format}
                                    language={book.language}
                                    onBrowserSpeechStart={onBrowserSpeechStart}
                                    bookId={book.id}
                                    onReadAloudChange={onReadAloudChange}
                                    ref={rendererRef}
                                    content={currentSection.content} 
                                    highlights={currentSectionHighlights}
                                    reflection={currentSectionReflection}
                                    onSaveReflection={handleSaveReflection}
                                    onOpenHighlight={handleOpenHighlightCallback}
                                    maxWidth={maxWidth}
                                    reflectionHidden={isAssistActive}
                                    embeds={sectionEmbeds}
                                />)}
                                {!!currentSection.children?.length && <nav aria-label="Chapters in this section" className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 space-y-3">
                                  {currentSection.children.map(child => <button key={child.id} onClick={() => handleSectionChange(child.id)} className="block text-left text-indigo-600 dark:text-indigo-400 hover:underline">{child.title}</button>)}
                                </nav>}
                            </div>
                        )}

                        {agent && currentSection && !isImmersiveMode && <AgentAccess book={book} access={agent} section={currentSection} variant="quiet" />}

                        {/* Navigation Footer */}
                        <div className="flex justify-between items-center border-t border-gray-200 dark:border-gray-800 pt-8 mb-12">
                            {prevSection ? (
                                <button 
                                    onClick={() => handleSectionChange(prevSection.id)}
                                    className="group flex flex-col items-start max-w-[45%]"
                                >
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Previous</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 text-left">{prevSection.title}</span>
                                </button>
                            ) : (
                                <button 
                                    onClick={() => handleSectionChange('home')}
                                    className="group flex flex-col items-start"
                                >
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Back</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300">Home</span>
                                </button>
                            )}

                            {nextSection && (
                                <button 
                                    onClick={() => handleSectionChange(nextSection.id)}
                                    className="group flex flex-col items-end text-right max-w-[45%]"
                                >
                                    <span className="text-xs text-gray-500 dark:text-gray-400 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">Next</span>
                                    <span className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-indigo-700 dark:group-hover:text-indigo-300 text-right">{nextSection.title}</span>
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right TOC Sidebar - Hidden in Immersive Mode */}
                    {currentSection && !isImmersiveMode && (atlas
                      // Atlas: the outline has a small close button in its header; while it is closed a list icon at the right of the toolbar brings it back. Below 1024 px it is an overlay sheet with a scrim.
                      ? <>{outlineSheet && outlineSheetOpen && <div className="publication-outline-scrim" aria-hidden="true" onClick={dismissOutline} />}
                        <TableOfContents ref={tocRef} bookId={book.id} toolbarControlled sheet={outlineSheet} collapsed={railCollapsed} onCollapsedChange={setRailCollapsed} onDismiss={dismissOutline}
                          onLinkChosen={outlineSheet ? () => setOutlineSheetOpen(false) : undefined} onAvailableChange={setOutlineAvailable} content={currentSection.content} format={currentSection.format} sectionId={currentSection.id} contentRef={contentRef} /></>
                      : <TableOfContents ref={tocRef} fallbackRef={compactTocRef} bookId={book.id} collapsed={outlineCollapsed} onCollapsedChange={setOutlineCollapsed} onAvailableChange={setOutlineAvailable} content={currentSection.content} format={currentSection.format} sectionId={currentSection.id} contentRef={contentRef} />)}
                </div>
            )}
        </div>

        {storageUnavailable && <p role="status" className="absolute bottom-2 left-2 right-2 text-center text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-gray-900 rounded p-2 z-30">Browser storage is unavailable. Your notes and progress are kept for this session only.</p>}
        {/* Floating Chat Trigger */}
        {coaching && !isChatOpen && !isHome && (
            <button
                onClick={() => setIsChatOpen(true)}
                className={`
                    hidden lg:flex absolute bottom-8 right-8 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-5 py-3 shadow-lg items-center gap-2 transition-all hover:scale-105 z-30
                    ${isImmersiveMode ? 'opacity-20 hover:opacity-100' : 'opacity-100'}
                `}
            >
                <span className="material-symbols-outlined">smart_toy</span>
                <span className="font-medium">{coaching?.label ?? 'Ask Coach'}</span>
            </button>
        )}
      </main>
      </div>

      {listeningPanel}
      <HighlightsDrawer
        bookId={book.id}
        bookTitle={publicationDisplayTitle(book)}
        isOpen={isHighlightsOpen}
        onClose={() => setIsHighlightsOpen(false)}
        highlights={highlights}
        reflections={reflections}
        onDeleteHighlight={deleteHighlight}
        onDeleteReflection={deleteReflection}
        onUpdateNote={updateHighlightNote}
        onNavigate={(id, text) => {
            handleSectionChange(id, text);
            setIsHighlightsOpen(false);
        }}
        onShareLink={handleDrawerShareLink}
        onShareImage={handleDrawerShareImage}
      />
      
      {coaching && isChatOpen && coaching.render({ book, section: currentSection, onClose: () => setIsChatOpen(false) })}

      {quoteModalData && (
          <QuoteImageModal 
              text={quoteModalData.text} 
              title={quoteModalData.title}
              author={book.author}
              bookTitle={publicationDisplayTitle(book)}
              bookId={book.id}
              url={publicationUrl(window.location.href, book.id, quoteModalData.sectionId, quoteModalData.text).href}
              onClose={() => setQuoteModalData(null)} 
          />
      )}

      <ShortcutsModal 
        isOpen={isShortcutsOpen} 
        onClose={() => setIsShortcutsOpen(false)} 
      />

      {toastMessage && (
          <Toast 
            message={toastMessage} 
            onClose={() => setToastMessage(null)} 
          />
      )}
    </div>
  );
}
