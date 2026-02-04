import React, { useEffect, useMemo, useState } from 'react';
import { SectionConfig, SearchIndexEntry } from '../../types';
import { buildSearchIndex, searchIndex } from '../../utils/search';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  sections: SectionConfig[];
  onNavigate: (id: string) => void;
}

export function SearchModal({ isOpen, onClose, sections, onNavigate }: SearchModalProps) {
  const [query, setQuery] = useState('');
  const index = useMemo(() => buildSearchIndex(sections), [sections]);
  const results = useMemo<SearchIndexEntry[]>(() => searchIndex(index, query), [index, query]);

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) setQuery('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 bg-black/40 flex items-start justify-center pt-24">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-xl border border-slate-200">
        <div className="border-b border-slate-200 px-4 py-3">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sections..."
            className="w-full text-sm text-slate-700 outline-none"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-sm text-slate-500">No results.</div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    onClick={() => {
                      onNavigate(result.id);
                      onClose();
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-slate-50"
                  >
                    <div className="text-sm font-semibold text-slate-900">{result.title}</div>
                    <div className="text-xs text-slate-500 mt-1 line-clamp-2">{result.excerpt}</div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-400 flex justify-between">
          <span>Press Esc to close</span>
          <span>{results.length} results</span>
        </div>
      </div>
    </div>
  );
}
