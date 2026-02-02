import React from 'react';

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface TableOfContentsProps {
  items: TocItem[];
  activeId: string | null;
  onNavigate: (id: string) => void;
}

export function TableOfContents({ items, activeId, onNavigate }: TableOfContentsProps) {
  if (items.length === 0) return null;

  return (
    <nav className="hidden xl:block w-64 shrink-0 order-last pt-4 pb-8 pr-8 h-screen sticky top-0 overflow-y-auto">
      <div className="border-l border-slate-200 pl-4 py-2">
        <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">On this page</h4>
        <ul className="space-y-3 text-sm">
          {items.map((item) => (
            <li key={item.id} style={{ paddingLeft: `${(item.level - 2) * 0.5}rem` }}>
              <button
                onClick={() => onNavigate(item.id)}
                className={`block text-left w-full transition-colors duration-200 ${
                  activeId === item.id
                    ? 'text-slate-900 font-semibold border-l-2 border-slate-900 -ml-4 pl-3'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                {item.text}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
