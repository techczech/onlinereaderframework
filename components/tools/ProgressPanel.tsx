import React from 'react';

interface ProgressPanelProps {
  total: number;
  completed: number;
  isRead: boolean;
  onToggleRead: () => void;
}

export function ProgressPanel({ total, completed, isRead, onToggleRead }: ProgressPanelProps) {
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);

  return (
    <div className="mt-8">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Progress</h3>
      <div className="mt-3">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{completed} of {total} sections</span>
          <span>{percent}%</span>
        </div>
        <div className="mt-2 h-2 rounded-full bg-slate-100">
          <div className="h-2 rounded-full bg-slate-900" style={{ width: `${percent}%` }} />
        </div>
        <button
          onClick={onToggleRead}
          className="mt-3 w-full px-3 py-2 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
        >
          {isRead ? 'Mark as unread' : 'Mark as read'}
        </button>
      </div>
    </div>
  );
}
