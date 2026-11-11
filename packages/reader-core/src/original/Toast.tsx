import React, { useEffect, useRef } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
  const ref = useRef<HTMLDivElement>(null);
  // A manual popover joins the top layer, so the toast stays above an open modal <dialog> and its backdrop.
  useEffect(() => {
    const element = ref.current;
    if (element && !element.matches(':popover-open')) try { element.showPopover(); } catch { /* Shown without the top layer. */ }
  }, []);
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div ref={ref} role="status" data-reader-toast {...{ popover: 'manual' }} className="fixed top-auto right-auto m-0 border-0 overflow-visible bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-gray-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 transition-all animate-bounce">
      <span className="material-symbols-outlined text-green-400">check_circle</span>
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
};