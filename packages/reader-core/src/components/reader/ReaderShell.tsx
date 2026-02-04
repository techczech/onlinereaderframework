import React, { useEffect, useMemo, useState } from 'react';
import { SectionConfig, SectionId, Highlight } from '../../types';
import { Sidebar } from './Sidebar';
import { ReaderContent } from './ReaderContent';
import { TableOfContents, TocItem } from './TableOfContents';
import { SelectionToolbar } from './SelectionToolbar';
import { HighlightsPanel } from '../tools/HighlightsPanel';
import { exportHighlightsToMarkdown } from '../../utils/highlightExport';
import { generateEpub } from '../../services/epub/epubGenerator';
import { SearchModal } from '../tools/SearchModal';
import { ReadabilityControls, FontSize, LineHeight, ContentWidth } from '../tools/ReadabilityControls';
import { ProgressPanel } from '../tools/ProgressPanel';
import { BookmarkButton } from '../tools/BookmarkButton';

export interface ReaderProps {
  sections: SectionConfig[];
  initialSectionId?: string;
  enableSearch?: boolean;
  enableHighlights?: boolean;
  enableReadingStats?: boolean;
  headingLevels?: { section: number; tocMin?: number };
  onBackHome?: () => void;
}

const HIGHLIGHTS_KEY = 'reader_highlights';
const READ_KEY = 'reader_read_sections';
const BOOKMARK_KEY = 'reader_bookmarks';
const FONT_SIZE_KEY = 'reader_font_size';
const LINE_HEIGHT_KEY = 'reader_line_height';
const CONTENT_WIDTH_KEY = 'reader_content_width';
const READING_STATS_KEY = 'reader_show_reading_stats';

export function ReaderShell({
  sections,
  initialSectionId,
  enableSearch = true,
  enableHighlights = true,
  enableReadingStats = true,
  headingLevels,
  onBackHome
}: ReaderProps) {
  const firstSectionId = sections[0]?.id;
  const [activeSectionId, setActiveSectionId] = useState<SectionId>(
    initialSectionId || firstSectionId || 'home'
  );
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (!sections.find((section) => section.id === activeSectionId)) {
      if (firstSectionId) setActiveSectionId(firstSectionId);
    }
  }, [sections, activeSectionId, firstSectionId]);

  const [highlights, setHighlights] = useState<Highlight[]>(() => {
    try {
      const saved = localStorage.getItem(HIGHLIGHTS_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [readSections, setReadSections] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(READ_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [bookmarks, setBookmarks] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(BOOKMARK_KEY);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  const [fontSize, setFontSize] = useState<FontSize>(() => {
    return (localStorage.getItem(FONT_SIZE_KEY) as FontSize) || 'base';
  });
  const [lineHeight, setLineHeight] = useState<LineHeight>(() => {
    return (localStorage.getItem(LINE_HEIGHT_KEY) as LineHeight) || 'relaxed';
  });
  const [contentWidth, setContentWidth] = useState<ContentWidth>(() => {
    return (localStorage.getItem(CONTENT_WIDTH_KEY) as ContentWidth) || 'md';
  });
  const [showReadingStats, setShowReadingStats] = useState<boolean>(() => {
    const saved = localStorage.getItem(READING_STATS_KEY);
    return saved ? JSON.parse(saved) : false;
  });

  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, fontSize);
  }, [fontSize]);

  useEffect(() => {
    localStorage.setItem(LINE_HEIGHT_KEY, lineHeight);
  }, [lineHeight]);

  useEffect(() => {
    localStorage.setItem(CONTENT_WIDTH_KEY, contentWidth);
  }, [contentWidth]);

  useEffect(() => {
    localStorage.setItem(READING_STATS_KEY, JSON.stringify(showReadingStats));
  }, [showReadingStats]);

  useEffect(() => {
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readSections)));
  }, [readSections]);

  useEffect(() => {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(Array.from(bookmarks)));
  }, [bookmarks]);

  useEffect(() => {
    if (!enableSearch) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [enableSearch]);

  const currentHighlights = useMemo(
    () => highlights.filter((item) => item.sectionId === activeSectionId),
    [highlights, activeSectionId]
  );

  const handleSelection = () => {
    const selection = window.getSelection();
    if (!selection) return;
    const text = selection.toString().trim();
    setSelectedText(text);
  };

  const addHighlight = () => {
    if (!selectedText) return;
    const next: Highlight = {
      id: crypto.randomUUID(),
      sectionId: activeSectionId,
      text: selectedText,
      date: Date.now()
    };
    const updated = [next, ...highlights];
    setHighlights(updated);
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(updated));
    setSelectedText('');
    window.getSelection()?.removeAllRanges();
  };

  const removeHighlight = (id: string) => {
    const updated = highlights.filter((item) => item.id !== id);
    setHighlights(updated);
    localStorage.setItem(HIGHLIGHTS_KEY, JSON.stringify(updated));
  };

  const handleExport = () => {
    exportHighlightsToMarkdown(highlights, sections);
  };

  const handleDownloadEpub = async () => {
    await generateEpub(sections, 'Reader Framework');
  };

  const handleTocNavigate = (id: string) => {
    const element = document.getElementById(id);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  const toggleRead = () => {
    setReadSections((prev) => {
      const next = new Set(prev);
      if (next.has(activeSectionId)) {
        next.delete(activeSectionId);
      } else {
        next.add(activeSectionId);
      }
      return next;
    });
  };

  const toggleBookmark = () => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(activeSectionId)) {
        next.delete(activeSectionId);
      } else {
        next.add(activeSectionId);
      }
      return next;
    });
  };

  const handleCopyLink = () => {
    const url = new URL(window.location.href);
    url.searchParams.set('section', activeSectionId);
    if (selectedText) {
      url.searchParams.set('text', selectedText);
    }
    navigator.clipboard.writeText(url.toString());
  };

  const layoutClassName = useMemo(() => {
    const sizeMap: Record<FontSize, string> = {
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-xl',
      xl: 'text-3xl'
    };
    const lineMap: Record<LineHeight, string> = {
      tight: 'leading-snug',
      normal: 'leading-normal',
      relaxed: 'leading-relaxed',
      loose: 'leading-loose'
    };
    const baseWidths: Record<ContentWidth, number> = {
      sm: 55,
      md: 60,
      lg: 75,
      full: 85
    };

    const sizeBump: Record<FontSize, number> = {
      sm: 0,
      base: 0,
      lg: 5,
      xl: 10
    };

    const minWidth = 55;
    const targetWidth = Math.max(minWidth, baseWidths[contentWidth] + sizeBump[fontSize]);
    const widthClass = `max-w-[${targetWidth}ch]`;

    return `w-full min-w-0 px-4 md:px-8 ${sizeMap[fontSize]} ${lineMap[lineHeight]} ${widthClass}`;
  }, [fontSize, lineHeight, contentWidth]);

  if (!activeSectionId || sections.length === 0) {
    return <div className="p-6 text-slate-600">No sections available.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" onMouseUp={handleSelection}>
      {enableSearch && (
        <SearchModal
          isOpen={isSearchOpen}
          onClose={() => setIsSearchOpen(false)}
          sections={sections}
          onNavigate={(id) => setActiveSectionId(id)}
        />
      )}

      <Sidebar
        activeSectionId={activeSectionId}
        onNavigate={setActiveSectionId}
        onDownloadEpub={handleDownloadEpub}
        onSearch={() => setIsSearchOpen(true)}
        bookmarkedIds={bookmarks}
        sections={sections}
        showReadingStats={showReadingStats && enableReadingStats}
        onToggleReadingStats={() => setShowReadingStats((prev) => !prev)}
        fontSize={fontSize}
        onBackHome={onBackHome}
      >
        <ProgressPanel
          total={sections.length}
          completed={readSections.size}
          isRead={readSections.has(activeSectionId)}
          onToggleRead={toggleRead}
        />
        <BookmarkButton
          isBookmarked={bookmarks.has(activeSectionId)}
          onToggle={toggleBookmark}
        />
        <ReadabilityControls
          fontSize={fontSize}
          lineHeight={lineHeight}
          contentWidth={contentWidth}
          onFontSize={setFontSize}
          onLineHeight={setLineHeight}
          onContentWidth={setContentWidth}
        />
        {enableHighlights && (
          <HighlightsPanel
            highlights={currentHighlights}
            onExport={handleExport}
            onRemove={removeHighlight}
          />
        )}
      </Sidebar>

      <main className="md:ml-72 px-6 py-12 flex gap-10">
        <div className={layoutClassName}>
          <ReaderContent
            sections={sections}
            sectionId={activeSectionId}
            onActiveHeadingChange={setActiveHeadingId}
            onTocItems={setTocItems}
            showReadingStats={showReadingStats && enableReadingStats}
            tocMinLevel={headingLevels?.tocMin}
            highlightQuery={new URLSearchParams(window.location.search).get('text')}
          />
        </div>
        <TableOfContents
          items={tocItems}
          activeId={activeHeadingId}
          onNavigate={handleTocNavigate}
        />
      </main>

      {enableHighlights && (
        <SelectionToolbar
          text={selectedText}
          onAdd={addHighlight}
          onCopyLink={handleCopyLink}
          onClear={() => setSelectedText('')}
        />
      )}
    </div>
  );
}
