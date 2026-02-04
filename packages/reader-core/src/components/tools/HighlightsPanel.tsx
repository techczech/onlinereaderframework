import React from 'react';
import { Highlight } from '../../types';

interface HighlightsPanelProps {
  highlights: Highlight[];
  onExport: () => void;
  onRemove: (id: string) => void;
}

export function HighlightsPanel({ highlights, onExport, onRemove }: HighlightsPanelProps) {
  return (
    <div className="mt-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Highlights</h3>
        <button
          onClick={onExport}
          className="text-xs text-slate-500 hover:text-slate-900"
          disabled={highlights.length === 0}
        >
          Export
        </button>
      </div>
      {highlights.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">No highlights yet.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {highlights.map((highlight) => (
            <li key={highlight.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              <div className="flex items-start justify-between gap-3">
                <span>{highlight.text}</span>
                <button
                  onClick={() => onRemove(highlight.id)}
                  className="text-xs text-slate-400 hover:text-slate-700"
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
