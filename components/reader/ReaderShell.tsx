import React, { useEffect, useMemo, useState } from 'react';
import { SectionId, Highlight } from '../../types';
import { Sidebar } from './Sidebar';
import { ReaderContent } from './ReaderContent';
import { TableOfContents, TocItem } from './TableOfContents';
import { SelectionToolbar } from './SelectionToolbar';
import { HighlightsPanel } from '../tools/HighlightsPanel';
import { exportHighlightsToMarkdown } from '../../utils/highlightExport';
import { generateEpub } from '../../services/epub/epubGenerator';
import { SAMPLE_CONTENT } from '../../data/content/sampleContent';
import { SearchModal } from '../tools/SearchModal';
import { ReadabilityControls, FontSize, LineHeight, ContentWidth } from '../tools/ReadabilityControls';
import { ProgressPanel } from '../tools/ProgressPanel';
import { BookmarkButton } from '../tools/BookmarkButton';

interface ReaderShellProps {
  activeSectionId: SectionId;
  onNavigate: (id: SectionId) => void;
}

const HIGHLIGHTS_KEY = 'reader_highlights';
const READ_KEY = 'reader_read_sections';
const BOOKMARK_KEY = 'reader_bookmarks';
const FONT_SIZE_KEY = 'reader_font_size';
const LINE_HEIGHT_KEY = 'reader_line_height';
const CONTENT_WIDTH_KEY = 'reader_content_width';

export function ReaderShell({ activeSectionId, onNavigate }: ReaderShellProps) {
  const [tocItems, setTocItems] = useState<TocItem[]>([]);
  const [activeHeadingId, setActiveHeadingId] = useState<string | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

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
    localStorage.setItem(READ_KEY, JSON.stringify(Array.from(readSections)));
  }, [readSections]);

  useEffect(() => {
    localStorage.setItem(BOOKMARK_KEY, JSON.stringify(Array.from(bookmarks)));
  }, [bookmarks]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

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
    exportHighlightsToMarkdown(highlights);
  };

  const handleDownloadEpub = async () => {
    await generateEpub(SAMPLE_CONTENT, 'Reader Framework');
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

  const layoutClassName = useMemo(() => {
    const sizeMap: Record<FontSize, string> = {
      sm: 'text-sm',
      base: 'text-base',
      lg: 'text-lg',
      xl: 'text-xl'
    };
    const lineMap: Record<LineHeight, string> = {
      tight: 'leading-snug',
      normal: 'leading-normal',
      relaxed: 'leading-relaxed',
      loose: 'leading-loose'
    };
    const widthMap: Record<ContentWidth, string> = {
      sm: 'max-w-prose',
      md: 'max-w-3xl',
      lg: 'max-w-5xl',
      full: 'max-w-none'
    };

    return `${sizeMap[fontSize]} ${lineMap[lineHeight]} ${widthMap[contentWidth]}`;
  }, [fontSize, lineHeight, contentWidth]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900" onMouseUp={handleSelection}>
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        sections={SAMPLE_CONTENT}
        onNavigate={(id) => onNavigate(id)}
      />

      <Sidebar
        activeSectionId={activeSectionId}
        onNavigate={onNavigate}
        onDownloadEpub={handleDownloadEpub}
        onSearch={() => setIsSearchOpen(true)}
        bookmarkedIds={bookmarks}
      >
        <ProgressPanel
          total={SAMPLE_CONTENT.length}
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
        <HighlightsPanel
          highlights={currentHighlights}
          onExport={handleExport}
          onRemove={removeHighlight}
        />
      </Sidebar>

      <main className="md:ml-72 px-6 py-12 flex gap-10">
        <div className={layoutClassName}>
          <ReaderContent
            sectionId={activeSectionId}
            onActiveHeadingChange={setActiveHeadingId}
            onTocItems={setTocItems}
          />
        </div>
        <TableOfContents
          items={tocItems}
          activeId={activeHeadingId}
          onNavigate={handleTocNavigate}
        />
      </main>

      <SelectionToolbar
        text={selectedText}
        onAdd={addHighlight}
        onClear={() => setSelectedText('')}
      />
    </div>
  );
}
