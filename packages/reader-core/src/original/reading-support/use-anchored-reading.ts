import { useEffect, useState, type RefObject } from 'react';
import { anchoredReadingSupported, applyAnchoredReading } from './anchored-reading.js';

/** Keeps the lead-in highlight in step with the chapter inside `surface` while `enabled`. The chapter markup is replaced when notes change, so it is
 * painted again then; nothing is written to the text. */
export function useAnchoredReading(surface: RefObject<HTMLElement>, enabled: boolean, chapterId: string): void {
  useEffect(() => {
    const root = surface.current;
    if (!enabled || !root || !anchoredReadingSupported()) return;
    let applied = applyAnchoredReading(root.querySelector('[data-publication-content]') ?? root);
    let frame = 0;
    const repaint = (): void => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { applied.clear(); applied = applyAnchoredReading(root.querySelector('[data-publication-content]') ?? root); });
    };
    const observer = typeof MutationObserver === 'undefined' ? null : new MutationObserver(repaint);
    observer?.observe(root, { childList: true, subtree: true, characterData: true });
    return () => { cancelAnimationFrame(frame); observer?.disconnect(); applied.clear(); };
  }, [surface, enabled, chapterId]);
}

/** Whether this browser can show anchored reading; false until the page is in the browser so server and client markup agree. */
export function useAnchoredReadingSupport(): boolean {
  const [supported, setSupported] = useState(false);
  useEffect(() => setSupported(anchoredReadingSupported()), []);
  return supported;
}
