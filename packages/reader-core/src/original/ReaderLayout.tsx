import React, { useRef } from 'react';
import { Sidebar } from './Sidebar.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { HighlightsDrawer } from './HighlightsDrawer.js';
import { Home } from './Home.js';
import { TableOfContents } from './TableOfContents.js';
import { QuoteImageModal } from './QuoteImageModal.js';
import { Toast } from './Toast.js';
import { ShortcutsModal } from './ShortcutsModal.js';
import { publicationLabels, publicationColour } from './publication-navigation.js';
import type { MaxWidth, PublicationCoaching } from './types.js';
import { publicationDisplayTitle, publicationUrl } from './publication-model.js';
import type { usePublicationReader } from './use-publication-reader.js';

export interface ReaderLayoutProps {
  reader: ReturnType<typeof usePublicationReader>;
  coaching?: PublicationCoaching;
  readingSettingsExtra?: React.ReactNode;
  readingSurface?: (children: React.ReactNode) => React.ReactNode;
  listeningPanel?: React.ReactNode;
  onListen?: () => void;
  onBrowserSpeechStart?: () => void;
  onResetReadingSupport?: () => void;
}

/** Original reader actions and annotations, with independently measured article and navigation. */
export function ReaderLayout({ reader, coaching, readingSettingsExtra, readingSurface, listeningPanel, onListen, onBrowserSpeechStart, onResetReadingSupport }: ReaderLayoutProps) {
  const settingsRef = useRef<HTMLDialogElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const { book, sections, currentSectionId, currentSection, isHome, readSections, bookmarkedSections, isBookmarked, highlights, reflections, currentSectionHighlights, currentSectionReflection,
    isDarkMode, setIsDarkMode, fontSize, lineHeight, maxWidth, setMaxWidth, resetReadingSettings, getContainerWidthClass,
    isSidebarOpen, setIsSidebarOpen, isChatOpen, setIsChatOpen, isHighlightsOpen, setIsHighlightsOpen, isShortcutsOpen, setIsShortcutsOpen, isImmersiveMode, setIsImmersiveMode,
    isRulerActive, setIsRulerActive, rulerY, rulerLines, rulerHeightPx, isSearchTriggered, setIsSearchTriggered,
    quoteModalData, setQuoteModalData, toastMessage, setToastMessage, selectionRect, selectedText, storageUnavailable,
    contentRef, rendererRef, tocRef, prevSection, nextSection, handleSectionChange, handleOpenSearch, handleDownloadEbook,
    saveHighlight, shareHighlightLink, shareHighlightImage, sharePageLink, toggleBookmark, handleSaveReflection, handleOpenHighlightCallback,
    handleDrawerShareLink, handleDrawerShareImage, deleteHighlight, updateHighlightNote, deleteReflection, showToast, handleContentLink  } = reader;
  const labels = publicationLabels(book);
  const browserSpeechAvailable = typeof window !== 'undefined' && 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  const appearanceStyle = {
    '--publication-accent': publicationColour(book.appearance?.accent),
    '--publication-paper': publicationColour(book.appearance?.paper),
    '--publication-ink': publicationColour(book.appearance?.ink),
  } as React.CSSProperties;
  const wrapReadingSurface = readingSurface ?? ((children: React.ReactNode) => children);
  return (
    <div style={appearanceStyle} className={`publication-reader ${isDarkMode ? 'dark' : ''} flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300`} >
      {/* Reading Ruler Overlay */}
      {isRulerActive && (
        <div className="fixed inset-0 z-[90] pointer-events-none">
            <div 
                className="absolute left-0 right-0 bg-gray-900/80 dark:bg-black/80 transition-all duration-150 ease-out"
                style={{ top: 0, height: `${rulerY}px` }}
            />
            
            <div 
                className="absolute left-0 right-0 border-y-2 border-amber-400/30 dark:border-indigo-400/30 transition-all duration-150 ease-out"
                style={{ top: `${rulerY}px`, height: `${rulerHeightPx}px`, boxShadow: '0 0 30px rgba(0,0,0,0.5) inset' }}
            />

            <div 
                className="absolute left-0 right-0 bottom-0 bg-gray-900/80 dark:bg-black/80 transition-all duration-150 ease-out"
                style={{ top: `${rulerY + rulerHeightPx}px` }}
            />
            
            <div className="absolute top-4 left-1/2 -translate-x-1/2 text-white/70 text-xs font-mono bg-black/60 px-3 py-1 rounded-full border border-white/10">
                Arrows: Move | 1-4: Size | Esc: Exit
            </div>
        </div>
      )}

      {/* Left Sidebar */}
      {isSidebarOpen && !isImmersiveMode && (
        <Sidebar
          book={book}
          currentSectionId={currentSectionId} 
          onSelectSection={handleSectionChange}
          isOpen={isSidebarOpen}
          onClose={() => {
            setIsSidebarOpen(false);
            setIsSearchTriggered(false);
          }}
          readSections={readSections}
          bookmarkedSections={bookmarkedSections}
          onOpenHighlights={() => setIsHighlightsOpen(true)}
          shouldFocusSearch={isSearchTriggered}

        />
      )}

      {/* Main Content Area */}
      <main className="publication-main min-w-0 flex-1 flex flex-col h-full overflow-hidden relative w-full transition-all duration-500 ease-in-out">
        <header className="publication-toolbar">
          <button className="publication-navigation-toggle" onClick={() => { setIsSidebarOpen(value => !value); setIsImmersiveMode(false); }} aria-expanded={isSidebarOpen && !isImmersiveMode} aria-label={isSidebarOpen && !isImmersiveMode ? 'Close navigation' : 'Open navigation'}>
            <span aria-hidden="true" className="material-symbols-outlined">menu</span>
            <span>{labels.tableOfContents}</span>
          </button>
          <button className="publication-toolbar-identity" onClick={() => handleSectionChange('home')} title={publicationDisplayTitle(book)}>{publicationDisplayTitle(book)}</button>
          <div className="publication-toolbar-actions">
            <button ref={settingsButtonRef} aria-haspopup="dialog" onClick={() => settingsRef.current?.showModal()}>
              <span aria-hidden="true" className="material-symbols-outlined">tune</span>{labels.readingSettings}
            </button>
            <button onClick={onListen ?? (() => rendererRef.current?.toggleReadAloud())} disabled={!onListen && (isHome || !browserSpeechAvailable)} title={!onListen && !browserSpeechAvailable ? 'Browser read-aloud is unavailable in this browser' : undefined}>
              <span aria-hidden="true" className="material-symbols-outlined">headphones</span>{onListen ? labels.listen : 'Browser read-aloud'}
            </button>
            {!isHome && <button className="publication-toolbar-notes" onClick={() => setIsHighlightsOpen(true)} aria-label="Open notes and highlights">Notes</button>}
          </div>
        </header>
        <dialog ref={settingsRef} className="publication-settings" aria-labelledby="publication-settings-title"
          onClose={() => settingsButtonRef.current?.focus()} onClick={event => { if (event.target === event.currentTarget) {
            const box = event.currentTarget.getBoundingClientRect();
            if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) event.currentTarget.close();
          } }}>
          <div className="publication-settings-heading"><h2 id="publication-settings-title">{labels.readingSettings}</h2>
            <button autoFocus aria-label="Close reading settings" onClick={() => settingsRef.current?.close()}>Close</button>
          </div>
          <fieldset><legend>Text layout</legend>
            <label>Article width<select aria-label="Article width" value={maxWidth} onChange={event => setMaxWidth(event.target.value as MaxWidth)}>
              <option value="sm">Narrow</option><option value="md">Normal</option><option value="lg">Wide</option><option value="full">Full width</option>
            </select></label>
            <p>The width controls the text column. Chapter navigation sits beside it.</p>
          </fieldset>
          <fieldset><legend>Page appearance and focus</legend>
            <label>Colour theme<select aria-label="Colour theme" value={isDarkMode ? 'dark' : 'light'} onChange={event => setIsDarkMode(event.target.value === 'dark')}>
              <option value="light">Light</option><option value="dark">Dark</option>
            </select></label>
            <label><input type="checkbox" checked={isImmersiveMode} onChange={event => setIsImmersiveMode(event.target.checked)} />Focus mode hides navigation</label>

          </fieldset>
          {readingSettingsExtra}
          <div className="publication-settings-actions">
            <button onClick={() => { resetReadingSettings(); onResetReadingSupport?.(); }}>Reset reading settings</button>
            <button onClick={() => { settingsRef.current?.close(); setIsShortcutsOpen(true); }}>Keyboard shortcuts</button>
            {handleDownloadEbook && <button onClick={handleDownloadEbook}>Download eBook</button>}
          </div>
        </dialog>

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
                    onStart={() => { if (sections[0]) handleSectionChange(sections[0].id); }} 
                    onSelectSection={handleSectionChange}
                    onOpenSearch={handleOpenSearch}
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
                                    {currentSection.category !== currentSection.title && <><span className="mx-2 shrink-0">/</span>
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

                        {/* Main Text */}
                        {currentSection && (
                            <div className="publication-article">
                                {!currentSection.content.trim() && <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{currentSection.title}</h1>}
                                {wrapReadingSurface(<MarkdownRenderer
                                    key={currentSection.id}
                                    format={currentSection.format}
                                    language={book.language}
                                    onBrowserSpeechStart={onBrowserSpeechStart}
                                    ref={rendererRef}
                                    content={currentSection.content} 
                                    highlights={currentSectionHighlights}
                                    reflection={currentSectionReflection}
                                    onSaveReflection={handleSaveReflection}
                                    onOpenHighlight={handleOpenHighlightCallback}
                                    // Readability Props
                                    fontSize={fontSize}
                                    lineHeight={lineHeight}
                                    maxWidth={maxWidth}
                                />)}
                                {!!currentSection.children?.length && <nav aria-label="Chapters in this section" className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6 space-y-3">
                                  {currentSection.children.map(child => <button key={child.id} onClick={() => handleSectionChange(child.id)} className="block text-left text-indigo-600 dark:text-indigo-400 hover:underline">{child.title}</button>)}
                                </nav>}
                            </div>
                        )}

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
                    {currentSection && !isImmersiveMode && <TableOfContents ref={tocRef} content={currentSection.content} format={currentSection.format} sectionId={currentSection.id} contentRef={contentRef} />}
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
