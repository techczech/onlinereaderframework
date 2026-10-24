
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { PublicationBook, PublicationSection } from './types.js';
import { containsSection, flattenPublicationSections } from './publication-model.js';
import { renderPublicationContent } from '../publication-content/index.js';
import { publicationLabels, publicationNavigation } from './publication-navigation.js';
import { publicationPlainText } from './publication-html.js';

interface SidebarProps {
  book: PublicationBook;
  currentSectionId: string;
  onSelectSection: (id: string, text?: string) => void;
  isOpen: boolean;
  onClose: () => void;
  readSections: Set<string>;
  bookmarkedSections: Set<string>;
  onOpenHighlights?: () => void;
  shouldFocusSearch?: boolean;

}

export const Sidebar: React.FC<SidebarProps> = ({ 
  book,
  currentSectionId, 
  onSelectSection, 
  isOpen, 
  onClose, 
  readSections,
  bookmarkedSections,
  onOpenHighlights,
  shouldFocusSearch,

}) => {
  const GUIDE_CONTENT = useMemo(() => flattenPublicationSections(book.sections), [book.sections]);
  const searchIndex = useMemo(() => GUIDE_CONTENT.map(section => ({ section, text: publicationPlainText(renderPublicationContent(section.content, section.format ?? 'markdown')) })), [GUIDE_CONTENT]);
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const labels = publicationLabels(book);
  const navigation = publicationNavigation(book.sections, book.navigation?.sidebarDepth);

  // Auto-focus search input when requested
  useEffect(() => {
    if (shouldFocusSearch && isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [shouldFocusSearch, isOpen]);

  // Clean text helper for searching


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

  // Get bookmarked section objects
  const bookmarks = GUIDE_CONTENT.filter(s => bookmarkedSections.has(s.id));

  // Calculate Progress
  const totalSections = GUIDE_CONTENT.filter(s => s.category !== 'App Guide' && s.content.trim()).length;
  const validReadCount = Array.from(readSections).filter(id => {
      const section = GUIDE_CONTENT.find(s => s.id === id);
      return section && section.category !== 'App Guide' && section.content.trim();
  }).length;
  const progress = totalSections > 0 ? Math.min(100, Math.round((validReadCount / totalSections) * 100)) : 0;

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
      <aside className={`
        publication-sidebar fixed top-0 left-0 z-50 h-full w-72 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800
        transform transition-transform duration-300 ease-in-out overflow-y-auto
        lg:translate-x-0 lg:static lg:h-screen flex flex-col
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        
        <button onClick={onClose} aria-label="Close navigation" className="lg:hidden self-end p-3 text-gray-500 dark:text-gray-300"><span className="material-symbols-outlined">close</span></button>
        {/* Search & Nav Header */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 flex-shrink-0 space-y-4">
             {/* Search Input */}
             <div className="relative">
                <input 
                    ref={searchInputRef}
                    type="search"
                    aria-label={labels.search}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={labels.search}
                    className="w-full pl-9 pr-8 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900 outline-none text-sm transition-all placeholder-gray-400 dark:placeholder-gray-500"
                />
                <span className="material-symbols-outlined absolute left-2.5 top-2 text-gray-400 text-lg">search</span>
                {searchQuery && (
                    <button 
                        aria-label="Clear search"
                        onClick={handleClearSearch}
                        className="absolute right-2 top-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <span className="material-symbols-outlined text-lg">close</span>
                    </button>
                )}
             </div>

             {/* Standard Meta Links (only if not searching) */}
             {!searchQuery && (
                 <>
                    <button
                        onClick={() => {
                            onSelectSection('home');
                            if (window.innerWidth < 1024) onClose();
                        }}
                        className={`
                            w-full text-left px-4 py-3 rounded-lg text-sm font-bold transition-all flex items-center gap-3 shadow-sm border
                            ${currentSectionId === 'home' 
                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-indigo-200 dark:shadow-none' 
                                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-white dark:hover:bg-gray-700 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-md'}
                        `}
                    >
                        <span className="material-symbols-outlined">home</span>
                        Home
                    </button>
                    
                    {onOpenHighlights && (
                        <button
                            onClick={() => {
                                onOpenHighlights();
                                if (window.innerWidth < 1024) onClose();
                            }}
                            className="w-full text-left px-4 py-2.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 hover:bg-amber-100 dark:hover:bg-amber-900/40"
                        >
                            <span className="material-symbols-outlined">bookmarks</span>
                            Notes & Highlights
                        </button>
                    )}
                 </>
             )}
        </div>

        {/* Main Sidebar Body */}
        <div className="flex-1 overflow-y-auto">
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
                                    onClick={() => {
                                        onSelectSection(result.section.id);
                                        if (window.innerWidth < 1024) onClose();
                                    }}
                                    className="w-full text-left font-semibold text-sm text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                                >
                                    {result.section.title}
                                </button>
                                
                                {result.contentMatches.map((match, i: number) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            onSelectSection(result.section.id, match.textToHighlight);
                                            if (window.innerWidth < 1024) onClose();
                                        }}
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
                <div className="flex flex-col min-h-full">
                    <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
                        <div className="publication-sidebar-identity">
                          {book.appearance?.cover && <img src={book.appearance.cover.src} alt="" className="publication-sidebar-cover" />}
                          <div><h2 className="font-bold text-gray-900 dark:text-white leading-tight">{book.title}</h2>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{book.author}</p></div>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 mb-4">{book.subtitle}</p>
                        
                        {/* Progress Bar */}
                        <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-2.5 mb-1">
                            <div 
                                className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500 ease-out" 
                                style={{ width: `${progress}%` }}
                            ></div>
                        </div>
                        <div className="flex justify-between text-xs text-gray-400 font-medium">
                            <span>Progress</span>
                            <span>{progress}%</span>
                        </div>
                    </div>

                    <nav className="p-4 flex-1">
                        {/* Saved Sections (Bookmarks) */}
                        {bookmarks.length > 0 && (
                            <div className="mb-8">
                                <h3 className="px-2 text-xs font-semibold text-amber-600 dark:text-amber-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <span className="material-symbols-outlined text-sm material-symbols-filled">bookmark</span>
                                    Saved Sections
                                </h3>
                                <div className="space-y-1">
                                     {bookmarks.map(section => (
                                        <button
                                            key={`bookmark-${section.id}`}
                                            onClick={() => {
                                                onSelectSection(section.id);
                                                if (window.innerWidth < 1024) onClose();
                                            }}
                                            className={`
                                                w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex justify-between items-center
                                                ${currentSectionId === section.id
                                                    ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200'
                                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}
                                            `}
                                        >
                                            <span className="truncate">{section.title}</span>
                                        </button>
                                     ))}
                                </div>
                                <div className="border-b border-gray-100 dark:border-gray-800 my-4 mx-2"></div>
                            </div>
                        )}

                        <h2 className="px-2 mb-3 text-sm font-semibold">{labels.tableOfContents}</h2>
                        <div className="space-y-1">
                          {navigation.map(node => <SidebarItem key={node.section.id} section={node.section}
                            visibleChildren={node.children} currentSectionId={currentSectionId} readSections={readSections}
                            onSelectSection={onSelectSection} />)}
                        </div>
                    </nav>


                </div>
            )}
        </div>
      </aside>
    </>
  );
};


/** Language Muscle's recursive SidebarItem adapted to Deliberate Practice's colours.
 * Separate links and expand buttons keep parent chapters readable and keyboard accessible.
 */
function SidebarItem({ section, visibleChildren, currentSectionId, readSections, onSelectSection, depth = 0 }: {
  section: PublicationSection;
  visibleChildren: ReturnType<typeof publicationNavigation>;
  currentSectionId: string;
  readSections: Set<string>;
  onSelectSection: (id: string) => void;
  depth?: number;
}) {
  const activeDescendant = containsSection(section, currentSectionId);
  const [expanded, setExpanded] = useState(section.defaultExpanded || activeDescendant);
  const hasChildren = visibleChildren.length > 0;
  useEffect(() => { if (activeDescendant) setExpanded(true); }, [activeDescendant]);
  const isRead = readSections.has(section.id);
  const isActive = currentSectionId === section.id;
  return (
    <div className="select-none">
      <div className="flex items-center" style={{ paddingLeft: `${Math.min(depth, 6) * 0.75}rem` }}>
        <button onClick={() => onSelectSection(section.id)} aria-current={isActive ? 'page' : undefined}
          className={`min-w-0 flex-1 w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors flex justify-between items-center group ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300' : isRead ? 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800' : 'text-gray-500 dark:text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'}`}>
          <span className={isRead && !isActive ? 'opacity-80' : ''}>{section.title}</span>
          {isRead && <span className={`material-symbols-outlined text-base ${isActive ? 'text-indigo-600 dark:text-indigo-400' : 'text-green-500 dark:text-green-600'}`}>check</span>}
        </button>
        {hasChildren && <button onClick={() => setExpanded(value => !value)} aria-expanded={expanded} aria-label={`${expanded ? 'Collapse' : 'Expand'} ${section.title}`} className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"><span className="material-symbols-outlined text-lg">{expanded ? 'expand_more' : 'chevron_right'}</span></button>}
      </div>
      {hasChildren && expanded && <div className="my-1 transition-all">
        {visibleChildren.map(child => <SidebarItem key={child.section.id} section={child.section} visibleChildren={child.children} currentSectionId={currentSectionId} readSections={readSections} onSelectSection={onSelectSection} depth={depth + 1} />)}
      </div>}
    </div>
  );
}
