import React from 'react';

interface BookmarkButtonProps {
  isBookmarked: boolean;
  onToggle: () => void;
}

export function BookmarkButton({ isBookmarked, onToggle }: BookmarkButtonProps) {
  return (
    <button
      onClick={onToggle}
      className={`mt-4 w-full px-3 py-2 text-xs rounded-lg border ${
        isBookmarked ? 'border-slate-900 text-slate-900' : 'border-slate-200 text-slate-600'
      }`}
    >
      {isBookmarked ? 'Bookmarked' : 'Bookmark section'}
    </button>
  );
}
