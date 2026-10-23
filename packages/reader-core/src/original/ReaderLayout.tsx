import React from 'react';
import { Sidebar } from './Sidebar.js';
import { MarkdownRenderer } from './MarkdownRenderer.js';
import { HighlightsDrawer } from './HighlightsDrawer.js';
import { Home } from './Home.js';
import { TableOfContents } from './TableOfContents.js';
import { QuoteImageModal } from './QuoteImageModal.js';
import { Toast } from './Toast.js';
import { ShortcutsModal } from './ShortcutsModal.js';
import type { PublicationCoaching } from './types.js';
import { publicationDisplayTitle, publicationUrl } from './publication-model.js';
import type { usePublicationReader } from './use-publication-reader.js';

/** Deliberate Practice App.tsx's original reader layout and control markup. */
export function ReaderLayout({ reader, coaching }: { reader: ReturnType<typeof usePublicationReader>; coaching?: PublicationCoaching }) {
  const { book, sections, currentSectionId, currentSection, isHome, readSections, bookmarkedSections, isBookmarked, highlights, reflections, currentSectionHighlights, currentSectionReflection,
    isDarkMode, setIsDarkMode, fontSize, lineHeight, maxWidth, cycleFontSize, cycleLineHeight, cycleMaxWidth, getContainerWidthClass,
    isSidebarOpen, setIsSidebarOpen, isChatOpen, setIsChatOpen, isHighlightsOpen, setIsHighlightsOpen, isShortcutsOpen, setIsShortcutsOpen, isImmersiveMode, setIsImmersiveMode,
    isRulerActive, setIsRulerActive, rulerY, rulerLines, rulerHeightPx, isSearchTriggered, setIsSearchTriggered,
    quoteModalData, setQuoteModalData, toastMessage, setToastMessage, selectionRect, selectedText, storageUnavailable,
    contentRef, rendererRef, tocRef, prevSection, nextSection, handleSectionChange, handleOpenSearch, handleDownloadEbook,
    saveHighlight, shareHighlightLink, shareHighlightImage, sharePageLink, toggleBookmark, handleSaveReflection, handleOpenHighlightCallback,
    handleDrawerShareLink, handleDrawerShareImage, deleteHighlight, updateHighlightNote, deleteReflection, showToast, handleContentLink  } = reader;
  return (
    <div className={`publication-reader ${isDarkMode ? 'dark' : ''} flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950 transition-colors duration-300`} >
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
          // Pass handlers for "Read Your Way" features
          onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          onToggleFocus={() => setIsImmersiveMode(!isImmersiveMode)}
          onToggleRuler={() => {
              setIsRulerActive(!isRulerActive);
              if (!isRulerActive) showToast("Ruler Active: Use Arrows to move");
          }}
          onToggleReadAloud={() => rendererRef.current?.toggleReadAloud()}
          onToggleCoach={coaching ? () => setIsChatOpen(true) : undefined}
          onToggleShortcuts={() => setIsShortcutsOpen(true)}
          onDownloadEbook={handleDownloadEbook}
          
          // Readability Settings
          fontSize={fontSize}
          onCycleFontSize={cycleFontSize}
          lineHeight={lineHeight}
          onCycleLineHeight={cycleLineHeight}
          maxWidth={maxWidth}
          onCycleMaxWidth={cycleMaxWidth}
        />
      )}

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative w-full transition-all duration-500 ease-in-out">
        {/* Mobile Header */}
        {!isHome && (
          <header className={`lg:hidden bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between flex-shrink-0 z-20 relative shadow-sm transition-all duration-300 ${isImmersiveMode ? 'hidden' : ''}`}>
              <div className="flex items-center gap-3">
                  <button 
                      onClick={() => setIsSidebarOpen(true)}
                      aria-label="Open navigation"
                      className="p-2 -ml-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md flex items-center"
                  >
                      <span className="material-symbols-outlined">menu</span>
                  </button>
                  <h1 className="font-semibold text-gray-900 dark:text-white truncate text-sm max-w-[150px]">
                      {currentSection?.title}
                  </h1>
              </div>
              <div className="flex items-center gap-1">
                 <button
                    onClick={sharePageLink}
                    className="p-2 rounded-full flex items-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    title="Copy Link"
                >
                    <span className="material-symbols-outlined">link</span>
                </button>
                 <button
                    onClick={toggleBookmark}
                    className={`p-2 rounded-full flex items-center transition-colors ${isBookmarked ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/30' : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                    title={isBookmarked ? "Remove Bookmark" : "Bookmark Section"}
                >
                    <span className={`material-symbols-outlined ${isBookmarked ? 'material-symbols-filled' : ''}`}>
                        {isBookmarked ? 'bookmark' : 'bookmark_border'}
                    </span>
                </button>
                <button 
                    onClick={() => setIsHighlightsOpen(true)}
                    aria-label="Open notes and highlights"
                    className="text-gray-600 dark:text-gray-300 p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full flex items-center"
                >
                    <span className="material-symbols-outlined">bookmarks</span>
                </button>
              </div>
          </header>
        )}

        {isImmersiveMode && <button onClick={() => setIsImmersiveMode(false)} aria-label="Exit focus mode" className="lg:hidden absolute top-2 right-2 z-30 p-2 rounded-full bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-300 shadow"><span className="material-symbols-outlined">fullscreen_exit</span></button>}
        {/* Desktop Floating Controls - COMPACT */}
        {!isHome && (
          <div className="hidden lg:flex absolute top-6 right-8 z-30 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm border border-gray-200 dark:border-gray-700 rounded-full p-1 shadow-sm gap-1">
             {/* Dark Mode Toggle */}
             <button
                onClick={() => setIsDarkMode(!isDarkMode)}
                className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full w-9 h-9 flex items-center justify-center transition-all"
                title="Switch Mode"
            >
                <span className="material-symbols-outlined text-lg">
                    {isDarkMode ? 'light_mode' : 'dark_mode'}
                </span>
            </button>

             {/* Ruler Mode Toggle */}
             <button
                onClick={() => {
                    setIsRulerActive(!isRulerActive);
                    if (!isRulerActive) showToast("Ruler Active: Use Arrows to move, 1-4 to resize");
                }}
                className={`rounded-full w-9 h-9 flex items-center justify-center transition-all ${
                    isRulerActive 
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={isRulerActive ? "Exit Reading Ruler (r)" : "Reading Ruler Mode (r)"}
            >
                <span className="material-symbols-outlined text-lg">horizontal_rule</span>
            </button>

             {/* Immersive Mode Toggle */}
             <button
                onClick={() => setIsImmersiveMode(!isImmersiveMode)}
                className={`rounded-full w-9 h-9 flex items-center justify-center transition-all ${
                    isImmersiveMode 
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                    : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title={isImmersiveMode ? "Exit Focus Mode (f)" : "Enter Focus Mode (f)"}
            >
                <span className="material-symbols-outlined text-lg">
                    {isImmersiveMode ? 'fullscreen_exit' : 'fullscreen'}
                </span>
            </button>

             {/* Retained publication download, supplied by the book adapter. */}
             {handleDownloadEbook && <button onClick={handleDownloadEbook} className="text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full w-9 h-9 flex items-center justify-center transition-all" title="Download eBook"><span className="material-symbols-outlined text-lg">download</span></button>}
          </div>
        )}

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
        <div ref={contentRef} onClick={handleContentLink} className="flex-1 overflow-y-auto scroll-smooth bg-white dark:bg-gray-950">
            {isHome ? (
                <Home
                    onDownloadEbook={handleDownloadEbook}
                    book={book}
                    onStart={() => { if (sections[0]) handleSectionChange(sections[0].id); }} 
                    onSelectSection={handleSectionChange}
                    onOpenSearch={handleOpenSearch}
                />
            ) : (
                <div className={`flex mx-auto w-full transition-all duration-500 ${getContainerWidthClass()}`}>
                    {/* Center Content */}
                    <div className={`flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-8 lg:py-12 mx-auto ${!isImmersiveMode ? 'lg:mx-0' : ''}`}>
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
                                    <span className="mx-2 shrink-0">/</span>
                                    <span title={currentSection.category} className="max-w-[40%] shrink-0 truncate uppercase tracking-wider font-medium text-xs">{currentSection.category}</span>
                                    <span className="mx-2 shrink-0">/</span>
                                    <span title={currentSection.title} className="min-w-0 truncate text-gray-900 dark:text-white font-medium">{currentSection.title}</span>
                                </div>
                                
                                <div className="hidden shrink-0 lg:flex items-center gap-2">
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
                            <div className={`bg-white dark:bg-gray-900 transition-all duration-500 ${isImmersiveMode ? '' : 'shadow-sm border border-gray-200 dark:border-gray-800 rounded-xl'} p-6 sm:p-10 mb-12`}>
                                {!currentSection.content.trim() && <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">{currentSection.title}</h1>}
                                <MarkdownRenderer
                                    key={currentSection.id}
                                    format={currentSection.format}
                                    language={book.language}
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
                                />
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

      <HighlightsDrawer
        bookId={book.id}
        bookTitle={book.title}
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
