import React from 'react';
import { SectionId } from '../../types';
import { SEARCH_INDEX } from '../../data/searchIndex';

interface SidebarProps {
  activeSectionId: SectionId;
  onNavigate: (id: SectionId) => void;
  onDownloadEpub: () => void;
  onSearch: () => void;
  bookmarkedIds: Set<string>;
  children?: React.ReactNode;
}

export function Sidebar({
  activeSectionId,
  onNavigate,
  onDownloadEpub,
  onSearch,
  bookmarkedIds,
  children
}: SidebarProps) {
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
        {SEARCH_INDEX.map((entry) => (
          <button
            key={entry.id}
            onClick={() => onNavigate(entry.id)}
            className={`block w-full text-left px-3 py-2 rounded-lg text-sm ${
              activeSectionId === entry.id
                ? 'bg-slate-900 text-white'
                : 'text-slate-700 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span>{entry.title}</span>
              {bookmarkedIds.has(entry.id) && <span className="text-[10px] text-slate-300">★</span>}
            </div>
          </button>
        ))}
      </nav>

      <button
        onClick={onDownloadEpub}
        className="mt-6 w-full px-3 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100"
      >
        Download EPUB
      </button>

      {children}
    </aside>
  );
}
