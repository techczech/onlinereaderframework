import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReadingSupport } from './use-reading-support.js';
import { useViewportWidth } from './use-viewport-width.js';
import { effectiveFontSize } from './reading-preferences.js';
import { bandRect, dimRects, rulerShape, visualLines, type LineRect } from './line-geometry.js';
export interface ReadingSupportSurfaceProps { bookId: string; sectionId: string; children: ReactNode; }
/** Overlay geometry from measured visual lines, relative to the article text area. `shades` are the shaded bands. */
interface Position { top: number; left: number; width: number; height: number; shades: LineRect[]; }
const NO_POSITION: Position = { top: 0, left: 0, width: 0, height: 0, shades: [] };
/** Wrap article content only. No text nodes, source offsets or annotation markup are changed. */
export function ReadingSupportSurface({ bookId, sectionId, children }: ReadingSupportSurfaceProps): React.JSX.Element {
  const { preferences: p, update } = useReadingSupport(bookId);
  const root = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<Position>(NO_POSITION);
  const viewport = useViewportWidth();
  useEffect(() => {
    const surface = root.current;
    if (!surface) return;
    let active: HTMLElement | null = null;
    let frame = 0;
    let pointer: {target: EventTarget | null; y: number} | null = null;
    let marked: HTMLElement[] = [];
    // Where in the block the reader pointed, so a re-measure after a resize or an annotation keeps the same line rather than the first one.
    let localY: number | null = null;
    const content = (): HTMLElement => surface.querySelector<HTMLElement>('[data-publication-content], .publication-content') ?? surface;
    const paragraphs = (): HTMLElement[] => Array.from(content().querySelectorAll<HTMLElement>('p, li')).filter(el => !el.closest('pre, code, math, [data-reading-support-ignore]') && !(el.tagName === 'LI' && el.querySelector('p, li')));
    const clear = (): void => { marked.forEach(el => { el.removeAttribute('data-rs-paragraph'); el.removeAttribute('data-rs-active'); }); marked = []; };
    const activate = (element: HTMLElement, clientY?: number): void => {
      if (active !== element) { active?.removeAttribute('data-rs-active'); active = element; if (clientY === undefined) localY = null; }
      const top = element.getBoundingClientRect().top;
      if (clientY !== undefined) localY = clientY - top; else if (localY !== null) clientY = top + localY;
      element.setAttribute('data-rs-active', '');
      const bounds = surface.getBoundingClientRect();
      const area = content().getBoundingClientRect();
      // Measure the rendered visual lines of this block and its neighbours; the focus line is the one under the pointer or tap.
      const blocks = paragraphs();
      const index = blocks.indexOf(element);
      const lines: LineRect[] = [];
      let focus = -1;
      for (let i = Math.max(0, index - 3); i <= Math.min(blocks.length - 1, index + 3); i++) {
        const measured = visualLines(blocks[i], area.top);
        if (i === index && measured.length) {
          const wanted = (clientY ?? element.getBoundingClientRect().top) - area.top;
          let best = 0;
          measured.forEach((line, n) => { if (Math.abs((line.top + line.bottom) / 2 - wanted) < Math.abs((measured[best].top + measured[best].bottom) / 2 - wanted)) best = n; });
          focus = lines.length + best;
        }
        lines.push(...measured);
      }
      let shades: LineRect[] = [];
      if (focus >= 0 && p.overlay === 'line-window') {
        const { above, below } = dimRects(bandRect(lines, focus, p.lines, area.height), area.height);
        shades = [above, below].filter((rect): rect is LineRect => rect !== null);
      } else if (focus >= 0 && p.overlay === 'ruler') {
        const bar = rulerShape(lines, focus, p.rulerLines, area.height);
        if (bar) shades = [bar];
      }
      setPosition({ top: area.top - bounds.top, left: area.left - bounds.left, width: area.width, height: area.height, shades });
    };
    const refresh = (): void => {
      clear(); marked = paragraphs(); marked.forEach(el => el.setAttribute('data-rs-paragraph', ''));
      if (!active || !surface.contains(active)) active = marked[0] ?? null;
      if (active) activate(active);
      else setPosition(NO_POSITION);
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
    '--rs-size':`${effectiveFontSize(p, viewport)}px`, '--rs-line':p.lineHeight,
    '--rs-paragraph':`${p.paragraphSpacing}px`, '--rs-letter':`${p.letterSpacing}em`,
    '--rs-dim':p.dim,
  } as CSSProperties;
  return <div ref={root} className="reading-support-surface" data-rs-focus={p.focus} data-rs-overlay={p.overlay} style={style} tabIndex={0} role="region" aria-label="Reading text. Use Up and Down to move reading focus; Escape turns reading focus off.">
    {children}
    {p.overlay !== 'off' && <div className="reading-support-overlay" aria-hidden="true" style={{top:position.top,left:position.left,width:position.width,height:position.height}}>
      {position.shades.map((shade, index) => <div key={index} className={p.overlay === 'ruler' ? 'reading-support-ruler' : 'reading-support-mask'} style={{top:shade.top, height:shade.bottom - shade.top}} />)}
    </div>}
  </div>;
}
