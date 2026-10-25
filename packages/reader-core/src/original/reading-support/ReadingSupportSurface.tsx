import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useReadingSupport } from './use-reading-support.js';
import { useViewportWidth } from './use-viewport-width.js';
import { effectiveFontSize } from './reading-preferences.js';
import { bandRect, dimRects, ownContent, rulerShape, visualLines, type LineRect } from './line-geometry.js';
export interface ReadingSupportSurfaceProps { bookId: string; sectionId: string; children: ReactNode; }
/** One thing to read: a whole block, or (`nodes`) the run of a block's own text before or after a readable block nested in it. */
interface Unit { element: HTMLElement; nodes?: Node[]; }
/** Overlay geometry from measured visual lines, relative to the whole scrolling page (not just the article text). `shades` are the shaded bands. */
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
    let active: Unit | null = null;
    let frame = 0;
    let pointer: {target: EventTarget | null; y: number} | null = null;
    let units: Unit[] = [];
    // Where in the block the reader pointed, so a re-measure after a resize or an annotation keeps the same line rather than the first one.
    let localY: number | null = null;
    const content = (): HTMLElement => surface.querySelector<HTMLElement>('[data-publication-content], .publication-content') ?? surface;
    // The page that scrolls under the reader. The shade covers all of it, so the window is the only clear region and nothing stops at a paragraph's edge.
    const scroller = (): HTMLElement => surface.closest<HTMLElement>('.publication-scroll') ?? surface;
    // One list of readable blocks: paragraphs, list items, headings, quotes and table cells. The same list is measured for the window, targeted by the pointer and keyboard,
    // and dimmed by Paragraph, so a block cannot be shaded without being reachable. A block that contains another is itself readable only for its own text (lead text
    // before a nested block, tail text after it), and only that part is dimmed with it, so dimming is never layered.
    const READABLE = 'p, li, h1, h2, h3, h4, h5, h6, td, th, dt, dd, figcaption, blockquote';
    const IGNORE = 'pre, code, math, [data-reading-support-ignore]';
    const paragraphs = (): Unit[] => {
      const found: Unit[] = [];
      for (const el of Array.from(content().querySelectorAll<HTMLElement>(READABLE))) {
        if (el.closest(IGNORE)) continue;
        if (!Array.from(el.querySelectorAll(READABLE)).some(inner => !inner.closest(IGNORE))) found.push({ element: el });
        else ownContent(el, READABLE, IGNORE).forEach(nodes => found.push({ element: el, nodes }));
      }
      // Document order, so the window, the keyboard and the neighbours all see a block's lead text, its nested blocks and its tail text in the order they are read.
      const at = (unit: Unit): Node => unit.nodes?.[0] ?? unit.element;
      return found.sort((a, b) => (at(a).compareDocumentPosition(at(b)) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
    };
    // Dimming of a block's own text. An inline element takes the same opacity as a whole paragraph; bare text nodes cannot carry opacity without wrapping them,
    // so they take the equivalent text colour through the CSS Custom Highlight API (where unavailable they stay undimmed).
    type Highlights = { set(name: string, value: unknown): void; delete(name: string): void };
    const highlights = (): Highlights | null => (typeof CSS !== 'undefined' && 'highlights' in CSS && typeof Highlight !== 'undefined' ? (CSS as unknown as { highlights: Highlights }).highlights : null);
    const dimOwn = (): void => {
      const ranges: Range[] = [];
      units.forEach(unit => unit.nodes?.forEach(node => {
        const dimmed = p.overlay === 'paragraph' && unit !== active;
        if (node instanceof HTMLElement) { if (dimmed) node.setAttribute('data-rs-own', ''); else node.removeAttribute('data-rs-own'); }
        else if (dimmed) { const range = document.createRange(); range.selectNode(node); ranges.push(range); }
      }));
      const api = highlights();
      if (api) { if (ranges.length) api.set('rs-dim', new Highlight(...ranges)); else api.delete('rs-dim'); }
    };
    const clear = (): void => {
      units.forEach(({ element, nodes }) => {
        element.removeAttribute('data-rs-paragraph'); element.removeAttribute('data-rs-owner'); element.removeAttribute('data-rs-active');
        nodes?.forEach(node => { if (node instanceof HTMLElement) node.removeAttribute('data-rs-own'); });
      });
      units = []; highlights()?.delete('rs-dim');
    };
    const unitTop = (unit: Unit): number => unit.nodes ? (visualLines(unit.element, 0, unit.nodes)[0]?.top ?? unit.element.getBoundingClientRect().top) : unit.element.getBoundingClientRect().top;
    const activate = (unit: Unit, clientY?: number): void => {
      const element = unit.element;
      if (active !== unit) { active?.element.removeAttribute('data-rs-active'); active = unit; if (clientY === undefined) localY = null; }
      const top = unitTop(unit);
      if (clientY !== undefined) localY = clientY - top; else if (localY !== null) clientY = top + localY;
      element.setAttribute('data-rs-active', '');
      dimOwn();
      const bounds = surface.getBoundingClientRect();
      const page = scroller();
      const pageBox = page.getBoundingClientRect();
      // Region the shade covers, in client coordinates: the whole scrollable page when there is one, else the article text area.
      const region = page === surface
        ? (() => { const box = content().getBoundingClientRect(); return { top: box.top, left: box.left, width: box.width, height: box.height }; })()
        : { top: pageBox.top + page.clientTop - page.scrollTop, left: pageBox.left + page.clientLeft, width: page.clientWidth, height: page.scrollHeight };
      let shades: LineRect[] = [];
      if (p.overlay === 'line-window' || p.overlay === 'ruler') {
        // Measure the rendered visual lines of this block and its neighbours; the focus line is the one under the pointer or tap.
        const blocks = units;
        const index = blocks.indexOf(unit);
        const lines: LineRect[] = [];
        let focus = -1;
        for (let i = Math.max(0, index - 3); index >= 0 && i <= Math.min(blocks.length - 1, index + 3); i++) {
          const measured = visualLines(blocks[i].element, region.top, blocks[i].nodes);
          if (i === index && measured.length) {
            const wanted = (clientY ?? top) - region.top;
            let best = 0;
            measured.forEach((line, n) => { if (Math.abs((line.top + line.bottom) / 2 - wanted) < Math.abs((measured[best].top + measured[best].bottom) / 2 - wanted)) best = n; });
            focus = lines.length + best;
          }
          lines.push(...measured);
        }
        if (focus >= 0 && p.overlay === 'line-window') {
          const { above, below } = dimRects(bandRect(lines, focus, p.lines, region.height), region.height);
          shades = [above, below].filter((rect): rect is LineRect => rect !== null);
        } else if (focus >= 0) {
          const bar = rulerShape(lines, focus, p.rulerLines, region.height);
          if (bar) shades = [bar];
        }
      }
      setPosition({ top: region.top - bounds.top, left: region.left - bounds.left, width: region.width, height: region.height, shades });
    };
    const refresh = (): void => {
      const previous = active; clear(); units = paragraphs();
      units.forEach(({ element, nodes }) => { element.setAttribute('data-rs-paragraph', ''); if (nodes) element.setAttribute('data-rs-owner', ''); });
      // Keep the reader's place across a re-render: the same block and, within a split block, the same run.
      const sameRun = (u: Unit): boolean => u.element === previous?.element && u.nodes?.[0] === previous.nodes?.[0];
      active = units.find(sameRun) ?? units.find(u => u.element === previous?.element) ?? units[0] ?? null;
      if (active) activate(active);
      else setPosition(NO_POSITION);
    };
    const selectTarget = (target: EventTarget | null, y?: number): void => {
      if (!(target instanceof Element)) return;
      const block = target.closest<HTMLElement>('[data-rs-paragraph]');
      if (!block || !surface.contains(block)) return;
      // A block split by a nested block has a run before and after it; point at the run nearest the pointer.
      const runs = units.filter(unit => unit.element === block);
      if (!runs.length) return;
      const gap = (unit: Unit): number => { const lines = visualLines(unit.element, 0, unit.nodes); return y === undefined || !lines.length ? 0 : Math.max(lines[0].top - y, y - lines[lines.length - 1].bottom, 0); };
      activate(runs.reduce((best, unit) => gap(unit) < gap(best) ? unit : best), y);
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
      if (event.key === 'Escape' && p.overlay !== 'off' && !(event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]'))) {
        event.preventDefault(); event.stopPropagation(); update({overlay:'off'}); return;
      }
      if (event.target !== surface || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
      const blocks = units;
      if (!blocks.length) return;
      event.preventDefault();
      const index = active ? blocks.indexOf(active) : 0;
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? blocks.length - 1 : Math.max(0, Math.min(blocks.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)));
      activate(blocks[next]); blocks[next].element.scrollIntoView({block:'nearest'});
    };
    refresh();
    surface.addEventListener('pointermove', onPointer); surface.addEventListener('click', onClick);
    surface.addEventListener('focusin', onFocus); surface.addEventListener('keydown', onKey);
    // Annotation rendering may replace descendants. Observe children only; our own attributes do not loop.
    const observer = new MutationObserver(refresh); observer.observe(surface, {childList:true, subtree:true});
    const resize = new ResizeObserver(() => { if (active?.element.isConnected) activate(active); }); resize.observe(surface);
    // Content above or below the article (the outline, the reflection box) changes the page height the shade covers.
    const pageBox = scroller(); if (pageBox !== surface) { resize.observe(pageBox); if (pageBox.firstElementChild) resize.observe(pageBox.firstElementChild); }
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
  return <div ref={root} className="reading-support-surface" data-rs-overlay={p.overlay} style={style} tabIndex={0} role="region" aria-label="Reading text. Use Up and Down to move reading focus; Escape turns reading assistance off.">
    {children}
    {(p.overlay === 'line-window' || p.overlay === 'ruler') && <div className="reading-support-overlay" aria-hidden="true" style={{top:position.top,left:position.left,width:position.width,height:position.height}}>
      {position.shades.map((shade, index) => <div key={index} className={p.overlay === 'ruler' ? 'reading-support-ruler' : 'reading-support-mask'} style={{top:shade.top, height:shade.bottom - shade.top}} />)}
    </div>}
  </div>;
}
