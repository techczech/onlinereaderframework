import React from 'react';
import { SectionConfig, SectionId } from '../../types';
import { getReadingTimeMinutes, getSectionWordCount } from '../../utils/readingStats';

interface SidebarProps {
  activeSectionId: SectionId;
  onNavigate: (id: SectionId) => void;
  onDownloadEpub: () => void;
  onSearch: () => void;
  bookmarkedIds: Set<string>;
  sections: SectionConfig[];
  showReadingStats: boolean;
  onToggleReadingStats: () => void;
  fontSize: 'sm' | 'base' | 'lg' | 'xl';
  children?: React.ReactNode;
}

export function Sidebar({
  activeSectionId,
  onNavigate,
  onDownloadEpub,
  onSearch,
  bookmarkedIds,
  sections,
  showReadingStats,
  onToggleReadingStats,
  fontSize,
  children
}: SidebarProps) {
  const sizeMap: Record<'sm' | 'base' | 'lg' | 'xl', string> = {
    sm: 'text-xs',
    base: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  return (
    <aside className="hidden md:block fixed left-0 top-0 h-screen w-72 border-r border-slate-200 bg-white px-4 py-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="text-sm font-semibold uppercase tracking-wider text-slate-400">Contents</div>
        <button
          onClick={onSearch}
          className="text-xs text-slate-500 hover:text-slate-900"
        >
          Search
        </button>
      </div>
      <nav className="mt-6 space-y-2">
        {sections.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onNavigate(entry.id)}
            className={`block w-full text-left px-3 py-2 rounded-lg ${sizeMap[fontSize]} ${
              activeSectionId === entry.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
            style={{ paddingLeft: `${0.75 + Math.max(0, (entry.level || 2) - 2) * 0.75}rem` }}
          >
            <div className="flex items-center justify-between">
              <span>{entry.title}</span>
              {bookmarkedIds.has(entry.id) && <span className="text-[10px] text-slate-300">★</span>}
            </div>
            {showReadingStats && (
              <div className="mt-1 text-[11px] text-slate-400">
                {getSectionWordCount(entry)} words · {getReadingTimeMinutes(getSectionWordCount(entry))} min
              </div>
            )}
          </button>
        ))}
      </nav>

      <button
        onClick={onDownloadEpub}
        className="mt-6 w-full px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
      >
        Download EPUB
      </button>

      <button
        onClick={onToggleReadingStats}
        className="mt-3 w-full px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
      >
        {showReadingStats ? 'Hide' : 'Show'} reading stats
      </button>

      {children}
    </aside>
  );
}
