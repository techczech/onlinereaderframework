import React, { useCallback, useMemo, useRef, useState } from 'react';
import { Sidebar } from './Sidebar.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { embedsForSection, type ValidPublicationEmbed } from '../embed/embed-model.js';

const noEmbeds: readonly ValidPublicationEmbed[] = [];
import { HighlightsDrawer } from './HighlightsDrawer.js';
import { Home } from './Home.js';
import { TableOfContents, type TableOfContentsHandle } from './TableOfContents.js';
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
  const labels = publicationLabels(book);
  const atlas = book.appearance?.readerLayout === 'atlas';
  const chapterNumber = currentSection ? (sections.find(section => section.children?.some(child => child.id === currentSection.id))?.children || sections.filter(isReadableSection)).findIndex(section => section.id === currentSection.id) + 1 : 0;
  const appearanceStyle = {
    '--publication-accent': publicationColour(book.appearance?.accent),
    '--publication-paper': publicationColour(book.appearance?.paper),
    '--publication-ink': publicationColour(book.appearance?.ink),
  } as React.CSSProperties;
  // Each topic above the page is a link to its own page; the sidebar's topic rows only open and close.
  const breadcrumbTopics = currentSection ? sectionAncestors(book.sections, currentSection.id) : [];
  const wrapReadingSurface = readingSurface ?? ((children: React.ReactNode) => children);
  return (
    <div style={appearanceStyle} className={`publication-reader ${book.appearance?.readerLayout === 'atlas' ? 'publication-atlas' : ''} ${isDarkMode ? 'dark' : ''} flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300`} >
      {atlas && <header className="publication-atlas-masthead"><div><button onClick={() => handleSectionChange('home')}>{publicationDisplayTitle(book)}</button><span>{book.author}</span></div><div className="publication-atlas-edition">Reading edition</div></header>}
      {/* Left Sidebar: hidden rather than unmounted, so its list position and open topics survive */}
      <Sidebar
        book={book}
        currentSectionId={currentSectionId} 
        onSelectSection={handleSectionChange}
        isOpen={isSidebarOpen && !isImmersiveMode}
        onClose={() => {
          setIsSidebarOpen(false);
          setIsSearchTriggered(false);
        }}
        readSections={readSections}
        bookmarkedSections={bookmarkedSections}
        shouldFocusSearch={isSearchTriggered}
        onSearchFocusHandled={() => setIsSearchTriggered(false)}
      />

      {/* Main Content Area */}
      <main className="publication-main min-w-0 flex-1 flex flex-col h-full overflow-hidden relative w-full transition-all duration-500 ease-in-out">
        <ReaderToolbar
          navigationLabel={labels.tableOfContents} navigationOpen={isSidebarOpen && !isImmersiveMode}
          onToggleNavigation={() => { if (isImmersiveMode) { setIsSidebarOpen(true); setIsImmersiveMode(false); } else setIsSidebarOpen(value => !value); }}
          title={publicationDisplayTitle(book)} onHome={() => handleSectionChange('home')} isHome={isHome} listenLabel={labels.listen}
          support={support} themeChoice={themeChoice} systemDark={systemDark} onTheme={setThemeChoice}
          maxWidth={maxWidth} onMaxWidth={setMaxWidth} immersive={isImmersiveMode} onImmersive={setIsImmersiveMode}
          readAloud={readAloud?.snapshot ?? null} readAloudActions={readAloud?.actions ?? null} language={book.language}
          hasRecordedAudio={!!hasRecordedAudio && !!onOpenRecordedAudio} onOpenRecordedAudio={trigger => onOpenRecordedAudio?.(trigger)}
          onOpenNotes={() => setIsHighlightsOpen(true)} onOpenShortcuts={() => setIsShortcutsOpen(true)} />

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
        <div ref={contentRef} onClick={handleContentLink} className="publication-scroll flex-1 overflow-y-auto scroll-smooth bg-white dark:bg-gray-950">
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
                            <div className="mb-6 flex min-w-0 items-center justify-between gap-3 text-sm text-gray-500 dark:text-gray-400">
                                <div className="flex min-w-0 flex-1 items-center">
                                    <button 
                                        onClick={() => handleSectionChange('home')}
                                        className="shrink-0 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    >
                                        Home
                                    </button>
                                    {breadcrumbTopics.map(topic => <React.Fragment key={topic.id}><span className="mx-2 shrink-0">/</span>
                                    <button onClick={() => handleSectionChange(topic.id)} title={topic.title} className="max-w-[40%] shrink truncate hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">{topic.title}</button></React.Fragment>)}
                                    {!breadcrumbTopics.length && currentSection.category !== currentSection.title && <><span className="mx-2 shrink-0">/</span>
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
                                        <span className="text-xs font-semibold">Share</span>
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
                                        <span className="text-xs font-semibold">{isBookmarked ? 'Saved' : 'Save'}</span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Windows too narrow for the side outline get the same outline here, collapsed above the chapter. */}
                        {currentSection && !isImmersiveMode && <TableOfContents ref={compactTocRef} variant="compact" content={currentSection.content} format={currentSection.format} sectionId={currentSection.id} contentRef={contentRef} />}

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
                    {currentSection && !isImmersiveMode && <TableOfContents ref={tocRef} fallbackRef={compactTocRef} bookId={book.id} content={currentSection.content} format={currentSection.format} sectionId={currentSection.id} contentRef={contentRef} />}
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
