import React from 'react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const shortcuts = [
    { key: '?', description: 'Show this help' },
    { key: 'h', description: 'Highlight text (when selected)' },
    { key: 'l', description: 'Copy link (to selection or page)' },
    { key: 'f', description: 'Toggle Focus Mode' },
    { key: 'b', description: 'Bookmark section' },
    { key: 'a', description: 'Toggle Read Aloud' },
    { key: 'r', description: 'Toggle Reading Ruler' },
    { key: 'n', description: 'Focus Table of Contents' },
    { key: 's', description: 'Toggle Sidebar' },
    { key: 'j', description: 'Next Heading (Global) / Next Link (Nav)' },
    { key: 'k', description: 'Prev Heading (Global) / Prev Link (Nav)' },
    { key: '1-4', description: 'Set Ruler size (when active)' },
    { key: 'Arrows', description: 'Move Ruler (when active)' },
    { key: 'Esc', description: 'Close modals / Defocus Navigation' },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-sm" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="Keyboard shortcuts" className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <span className="material-symbols-outlined text-indigo-600 dark:text-indigo-400">keyboard</span>
            Keyboard Shortcuts
          </h3>
          <button aria-label="Close keyboard shortcuts" onClick={onClose} className="text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between gap-4 p-3 rounded-lg border border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{s.description}</span>
              <div className="flex gap-1">
                {s.key.split(' ').map((k, i) => (
                    <kbd key={i} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-md text-xs font-mono font-bold text-gray-600 dark:text-gray-200 min-w-[1.5rem] text-center shadow-sm">
                    {k}
                    </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 text-center text-xs text-gray-500 dark:text-gray-400">
            Press <kbd className="font-bold">Shift + ?</kbd> at any time to view this menu
        </div>
      </div>
    </div>
  );
};