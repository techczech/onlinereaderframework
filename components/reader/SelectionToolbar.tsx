import React from 'react';

interface SelectionToolbarProps {
  text: string;
  onAdd: () => void;
  onClear: () => void;
  onCopyLink: () => void;
}

export function SelectionToolbar({ text, onAdd, onClear, onCopyLink }: SelectionToolbarProps) {
  if (!text) return null;

  return (
    <div className="fixed bottom-6 right-6 bg-white border border-slate-200 shadow-lg rounded-lg px-4 py-3 flex items-center gap-3">
      <span className="text-xs text-slate-500 line-clamp-1 max-w-[240px]">"{text}"</span>
      <button
        onClick={onAdd}
        className="px-3 py-1 text-xs bg-slate-900 text-white rounded"
      >
        Highlight
      </button>
      <button
        onClick={onCopyLink}
        className="px-3 py-1 text-xs border border-slate-200 rounded text-slate-600"
      >
        Copy Link
      </button>
      <button
        onClick={onClear}
        className="text-xs text-slate-400 hover:text-slate-700"
      >
        Cancel
      </button>
    </div>
  );
}
