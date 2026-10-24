import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReadingSupport } from './use-reading-support.js';
export interface ReadingSupportSurfaceProps { bookId: string; sectionId: string; children: ReactNode; }
interface Position { y: number; lineHeight: number; top: number; left: number; width: number; height: number; }
/** Wrap article content only. No text nodes, source offsets or annotation markup are changed. */
export function ReadingSupportSurface({ bookId, sectionId, children }: ReadingSupportSurfaceProps): React.JSX.Element {
  const { preferences: p, update } = useReadingSupport(bookId);
  const root = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>({y:0, lineHeight:34, top:0, left:0, width:0, height:0});
  useEffect(() => {
    const surface = root.current;
    if (!surface) return;
    let active: HTMLElement | null = null;
    let frame = 0;
    let pointer: {target: EventTarget | null; y: number} | null = null;
    let marked: HTMLElement[] = [];
    const content = (): HTMLElement => surface.querySelector<HTMLElement>('[data-publication-content], .publication-content') ?? surface;
    const paragraphs = (): HTMLElement[] => Array.from(content().querySelectorAll<HTMLElement>('p, li')).filter(el => !el.closest('pre, code, math, [data-reading-support-ignore]') && !(el.tagName === 'LI' && el.querySelector('p, li')));
    const clear = (): void => { marked.forEach(el => { el.removeAttribute('data-rs-paragraph'); el.removeAttribute('data-rs-active'); }); marked = []; };
    const activate = (element: HTMLElement, clientY?: number): void => {
      if (active !== element) { active?.removeAttribute('data-rs-active'); active = element; }
      element.setAttribute('data-rs-active', '');
      const bounds = surface.getBoundingClientRect();
      const area = content().getBoundingClientRect();
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      const lineHeight = parseFloat(styles.lineHeight) || parseFloat(styles.fontSize) * p.lineHeight;
      // Quantise to this block's computed line grid; pointer movement never mutates selection.
      const local = Math.max(0, Math.min(rect.height - 1, (clientY ?? rect.top) - rect.top));
      const y = rect.top - area.top + Math.floor(local / lineHeight) * lineHeight + lineHeight / 2;
      setPosition({y, lineHeight, top:area.top-bounds.top, left:area.left-bounds.left, width:area.width, height:area.height});
    };
    const refresh = (): void => {
      clear(); marked = paragraphs(); marked.forEach(el => el.setAttribute('data-rs-paragraph', ''));
      if (!active || !surface.contains(active)) active = marked[0] ?? null;
      if (active) activate(active);
      else setPosition({y:0, lineHeight:p.fontSize * p.lineHeight, top:0, left:0, width:0, height:0});
    };
    const selectTarget = (target: EventTarget | null, y?: number): void => {
      if (!(target instanceof Element)) return;
      const block = target.closest<HTMLElement>('[data-rs-paragraph]');
      if (block && surface.contains(block)) activate(block, y);
    };
    const onPointer = (event: PointerEvent): void => {
      // Freeze the reading position while dragging a selection.
      if (event.buttons) return;
      pointer = {target:event.target, y:event.clientY};
      if (!frame) frame = requestAnimationFrame(() => { frame = 0; if (pointer) selectTarget(pointer.target, pointer.y); });
    };
    const onClick = (event: MouseEvent): void => selectTarget(event.target, event.clientY);
    const onFocus = (event: FocusEvent): void => selectTarget(event.target);
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && (p.focus !== 'off' || p.overlay !== 'off') && !(event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]'))) {
        event.preventDefault(); event.stopPropagation(); update({focus:'off', overlay:'off'}); return;
      }
      if (event.target !== surface || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const blocks = paragraphs();
      if (!blocks.length) return;
      event.preventDefault();
      const index = active ? blocks.indexOf(active) : 0;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? blocks.length - 1 : Math.max(0, Math.min(blocks.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
      activate(blocks[next]); blocks[next].scrollIntoView({block:'nearest'});
    };
    refresh();
    surface.addEventListener('pointermove', onPointer); surface.addEventListener('click', onClick);
    surface.addEventListener('focusin', onFocus); surface.addEventListener('keydown', onKey);
    // Annotation rendering may replace descendants. Observe children only; our own attributes do not loop.
    const observer = new MutationObserver(refresh); observer.observe(surface, {childList:true, subtree:true});
    const resize = new ResizeObserver(() => { if (active?.isConnected) activate(active); }); resize.observe(surface);
    return () => { cancelAnimationFrame(frame); observer.disconnect(); resize.disconnect(); clear();
      surface.removeEventListener('pointermove', onPointer); surface.removeEventListener('click', onClick);
      surface.removeEventListener('focusin', onFocus); surface.removeEventListener('keydown', onKey);
    };
    // update is intentionally omitted: the controller is keyed by bookId; preferences restart measurements.
  }, [bookId, sectionId, p]);
  const style = {
    '--rs-font':p.fontFamily === 'sans' ? 'Inter, system-ui, sans-serif' : 'Merriweather, Georgia, serif',
    '--rs-size':`${p.fontSize}px`, '--rs-line':p.lineHeight,
    '--rs-paragraph':`${p.paragraphSpacing}px`, '--rs-letter':`${p.letterSpacing}em`,
    '--rs-dim':p.dim,
  } as CSSProperties;
  const half = position.lineHeight * p.lines / 2;
  return <div ref={root} className="reading-support-surface" data-rs-focus={p.focus} data-rs-overlay={p.overlay} style={style} tabIndex={0} role="region" aria-label="Reading text. Use Up and Down to move reading focus; Escape turns reading focus off.">
    {children}
    {p.overlay !== 'off' && <div className="reading-support-overlay" aria-hidden="true" style={{top:position.top,left:position.left,width:position.width,height:position.height}}>
      {p.overlay === 'line-window' ? <><div className="reading-support-mask" style={{top:0, height:Math.max(0,position.y-half)}} /><div className="reading-support-mask" style={{top:Math.max(0,position.y+half), bottom:0}} /></> : <div className="reading-support-ruler" style={{top:Math.max(0,position.y + position.lineHeight/2), height:3}} />}
    </div>}
  </div>;
}
