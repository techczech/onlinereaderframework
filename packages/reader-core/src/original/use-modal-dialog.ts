import { useEffect, useRef, type MouseEvent } from 'react';

/** A modal on the browser's own <dialog>: showModal() makes the page behind inert and keeps Tab inside, Escape closes it natively,
 * and focus goes back to what had it before. `onClose` runs however the dialog closes (Escape, a button, the backdrop). */
export function useModalDialog(onClose: () => void) {
  const ref = useRef<HTMLDialogElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!dialog.open) dialog.showModal();
    // The top layer stacks in the order things entered it, so a toast already showing is shown again to sit above the dialog.
    document.querySelectorAll<HTMLElement>('[data-reader-toast]:popover-open').forEach(toast => { try { toast.hidePopover(); toast.showPopover(); } catch { /* Left where it is. */ } });
    const closed = () => closeRef.current();
    dialog.addEventListener('close', closed);
    return () => {
      dialog.removeEventListener('close', closed);
      if (dialog.open) dialog.close();
      if (opener?.isConnected) opener.focus({ preventScroll: true });
    };
  }, []);
  // The backdrop is part of the dialog element, so a click whose target is the dialog itself landed outside its content.
  const onClick = (event: MouseEvent<HTMLDialogElement>) => { if (event.target === event.currentTarget) event.currentTarget.close(); };
  return { ref, onClick };
}
