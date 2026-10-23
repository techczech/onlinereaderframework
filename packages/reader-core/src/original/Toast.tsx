import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({ message, onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, duration);
    return () => clearTimeout(timer);
  }, [onClose, duration]);

  return (
    <div role="status" className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] bg-gray-900/90 backdrop-blur-sm text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-3 transition-all animate-bounce">
      <span className="material-symbols-outlined text-green-400">check_circle</span>
      <span className="font-medium text-sm">{message}</span>
    </div>
  );
};