import React, { useState } from 'react';

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

  const [hideSubheadings, setHideSubheadings] = useState(false);
  const minLevel = Math.min(...items.map((item) => item.level));
  const hasSubheadings = items.some((item) => item.level > minLevel);

  return (
    <nav className="hidden xl:block w-64 shrink-0 order-last pt-4 pb-8 pr-8 h-screen sticky top-0 overflow-y-auto">
      <div className="border-l border-slate-200 pl-4 py-2">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">On this page</h4>
          {hasSubheadings && (
            <button
              onClick={() => setHideSubheadings((prev) => !prev)}
              className="text-[10px] text-slate-400 hover:text-slate-700 uppercase tracking-wider"
            >
              {hideSubheadings ? `Show H${minLevel + 1}+` : `Collapse H${minLevel + 1}+`}
            </button>
          )}
        </div>
        <ul className="space-y-3 text-sm">
          {items.map((item) => {
            if (hideSubheadings && item.level > minLevel) {
              return null;
            }
            const indent = Math.max(0, item.level - minLevel) * 0.75;
            const paddingLeft = `${0.5 + indent}rem`;
            return (
              <li key={item.id}>
                <button
                  onClick={() => onNavigate(item.id)}
                  style={{ paddingLeft }}
                  className={`block text-left w-full transition-colors duration-200 ${
                    activeId === item.id
                      ? 'text-slate-900 font-semibold border-l-2 border-slate-900'
                      : 'text-slate-500 hover:text-slate-900'
                  }`}
                >
                  {item.text}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
