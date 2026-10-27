import React, { useEffect, useMemo, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { getPublicationHeadings } from '../publication-content/index.js';
import { publicationTextModel } from './publication-html.js';
import { browserStorage, readOutlineCollapsed, writeOutlineCollapsed } from './outline-preference.js';

interface TableOfContentsProps {
  content: string;
  format?: 'markdown' | 'html';
  sectionId?: string;
  /** Identity of the book, so the folded state of the side outline is remembered per book. */
  bookId?: string;
  contentRef: React.RefObject<HTMLDivElement>;
  /** 'rail' is the side outline; 'compact' is the disclosure above the chapter for windows too narrow for the rail. CSS shows one of them. */
  variant?: 'rail' | 'compact';
  /** The rail hands keyboard focus to this outline when the rail is not on screen. */
  fallbackRef?: React.RefObject<TableOfContentsHandle>;
}

export interface TableOfContentsHandle {
  focus: () => void;
}

interface Heading {
  id: string;
  text: string;
  level: number;
}

const HEADINGS = '[data-publication-content] h1, [data-publication-content] h2, [data-publication-content] h3, [data-publication-content] h4, [data-publication-content] h5, [data-publication-content] h6';
/** The reader fires this after it moves to a place by itself (a followed fragment link, Back, Forward), so every outline agrees with the URL. */
export const PUBLICATION_LOCATION_EVENT = 'publication-location';
const SCROLL_KEYS = new Set(['PageUp', 'PageDown', 'Home', 'End', 'ArrowUp', 'ArrowDown', ' ']);
/** The subsection the URL names, or '' when it names none. */
function fragmentId(): string {
  const hash = typeof window === 'undefined' ? '' : window.location.hash;
  if (!hash || hash.startsWith('#/')) return '';
  try { return decodeURIComponent(hash.slice(1)); } catch { return ''; }
}

/** The last heading at or above the line where the observer treats a heading as reached (the top fifth of the scroller). */
function headingAtReadingLine(scroller: HTMLElement, headings: readonly Heading[]): string {
  const rect = scroller.getBoundingClientRect();
  const line = rect.top + rect.height * 0.2;
  let found = '';
  for (const heading of headings) {
    const element = document.getElementById(heading.id);
    if (element && element.getBoundingClientRect().top <= line) found = heading.id;
  }
  return found;
}

const outlineId = { rail: 'toc-container', compact: 'toc-container-compact' } as const;

/** The chapter's own subheadings, in reading order with their authored levels.
 * The chapter's title heading is the page title, not an entry, so a first h1 is left out; every other heading is a route,
 * even when it is the only one. Labels are the canonical visible heading text (a formula reads as the formula, not its TeX
 * and its MathML twice); ids are the rendered ids, so the same fragment works in the URL, the outline and the text.
 */
function extractHeadings(root: HTMLElement | null, canonical: Map<string, string>): Heading[] {
  const found = Array.from(root?.querySelectorAll<HTMLElement>(HEADINGS) ?? []);
  return found.flatMap((heading, index) => {
    const level = Number(heading.tagName.slice(1));
    if (!heading.id || (level === 1 && index === 0)) return [];
    const text = canonical.get(heading.id) ?? publicationTextModel(heading).text;
    return text ? [{ id: heading.id, text, level }] : [];
  });
}

export const TableOfContents = forwardRef<TableOfContentsHandle, TableOfContentsProps>(({ content, contentRef, format, sectionId, bookId, variant = 'rail', fallbackRef }, ref) => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const [open, setOpen] = useState(false);
  // The side outline can be folded away to a small reopen control; the choice is remembered per book.
  const [collapsed, setCollapsedState] = useState(() => bookId ? readOutlineCollapsed(bookId, browserStorage()) : false);
  const bookOfCollapse = useRef(bookId);
  if (bookOfCollapse.current !== bookId) { bookOfCollapse.current = bookId; const next = bookId ? readOutlineCollapsed(bookId, browserStorage()) : false; if (next !== collapsed) setCollapsedState(next); }
  const setCollapsed = (next: boolean) => { setCollapsedState(next); if (bookId) writeOutlineCollapsed(bookId, next, browserStorage()); };
  const focusAfterExpand = useRef(false);
  const linkRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const navRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  // Scrolling to a chosen heading passes others on the way; they must not take the marker from the one chosen. The choice holds until
  // the reader moves the text by their own hand.
  const pin = useRef<{ id: string } | null>(null);
  const chooseRef = useRef<(id: string) => void>(() => {});
  const compact = variant === 'compact';
  // Visible labels come from the same sanitised model that renders the chapter.
  const canonical = useMemo(() => {
    try { return new Map(getPublicationHeadings(content, format ?? 'markdown').map(heading => [heading.id, heading.text])); }
    catch { return new Map<string, string>(); }
  }, [content, format]);

  const focusLink = () => {
    const activeIndex = headings.findIndex(h => h.id === activeId);
    (linkRefs.current[activeIndex] ?? linkRefs.current[0] ?? navRef.current)?.focus();
  };
  useImperativeHandle(ref, () => ({
    focus: () => {
      // A hidden outline cannot take focus: the one that is on screen does.
      if (!compact && !navRef.current?.getClientRects().length && fallbackRef?.current) { fallbackRef.current.focus(); return; }
      if (compact) { setOpen(true); setTimeout(focusLink, 0); return; }
      // N on a folded outline unfolds it first, then moves into it.
      if (collapsed) { focusAfterExpand.current = true; setCollapsed(false); return; }
      focusLink();
    }
  }));

  // Headings are read from the rendered chapter, again whenever its markup is replaced (annotations rewrite it) so active tracking never points at removed nodes.
  useEffect(() => {
    const root = contentRef.current?.querySelector<HTMLElement>('[data-publication-content]') ?? null;
    const read = () => {
      const next = extractHeadings(root, canonical);
      setHeadings(previous => previous.length === next.length && previous.every((heading, index) => heading.id === next[index].id && heading.text === next[index].text && heading.level === next[index].level) ? previous : next);
    };
    setActiveId('');
    setOpen(false);
    read();
    if (!root || typeof MutationObserver === 'undefined') return;
    let frame = 0;
    const observer = new MutationObserver(() => { cancelAnimationFrame(frame); frame = requestAnimationFrame(read); });
    observer.observe(root, { childList: true });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [content, format, sectionId, contentRef, canonical]);

  useEffect(() => {
    linkRefs.current = linkRefs.current.slice(0, headings.length);
  }, [headings]);
  useEffect(() => {
    if (collapsed || !focusAfterExpand.current) return;
    focusAfterExpand.current = false;
    focusLink();
  });

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    let observer: IntersectionObserver | null = null;
    try {
      observer = new IntersectionObserver(
        entries => entries.forEach(entry => { if (entry.isIntersecting && !pin.current) setActiveId(entry.target.id); }),
        { root: contentRef.current, rootMargin: '0px 0px -80% 0px' }
      );
      const present = new Map(Array.from(contentRef.current?.querySelectorAll<HTMLElement>('[data-publication-content] [id]') ?? []).map(element => [element.id, element]));
      headings.forEach(heading => { const element = present.get(heading.id); if (element) observer?.observe(element); });
    } catch (e) {
      console.error('IntersectionObserver error:', e);
    }
    return () => observer?.disconnect();
  }, [headings, contentRef]);

  // The URL names the chosen subsection. Click, Back, Forward, a deep link and a resize all end with the same marker in every outline.
  // The choice holds until the reader moves the text themselves (wheel, touch, scroll keys, scrollbar); scrolling caused by the
  // reader's own movement to the destination, or by a layout change, does not take the marker away.
  useEffect(() => {
    const scroller = contentRef.current;
    const choose = (id: string) => { pin.current = { id }; setActiveId(id); };
    const follow = () => {
      const id = fragmentId();
      if (id && headings.some(heading => heading.id === id)) choose(id);
      else if (!id) { pin.current = null; setActiveId(''); }
      else pin.current = null;
    };
    let frame = 0;
    const onScroll = () => {
      if (pin.current || !scroller) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => { if (!pin.current) setActiveId(headingAtReadingLine(scroller, headings)); });
    };
    const release = () => { pin.current = null; };
    const onKey = (event: KeyboardEvent) => {
      if (!SCROLL_KEYS.has(event.key) || (event.target as Element | null)?.closest('input, textarea, select, nav, [contenteditable="true"]')) return;
      release();
    };
    const onPointer = (event: PointerEvent) => { if (event.target === scroller) release(); };
    chooseRef.current = choose;
    follow();
    window.addEventListener('popstate', follow);
    window.addEventListener('hashchange', follow);
    window.addEventListener(PUBLICATION_LOCATION_EVENT, follow);
    scroller?.addEventListener('scroll', onScroll, { passive: true });
    scroller?.addEventListener('wheel', release, { passive: true });
    scroller?.addEventListener('touchmove', release, { passive: true });
    scroller?.addEventListener('keydown', onKey);
    scroller?.addEventListener('pointerdown', onPointer);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('popstate', follow);
      window.removeEventListener('hashchange', follow);
      window.removeEventListener(PUBLICATION_LOCATION_EVENT, follow);
      scroller?.removeEventListener('scroll', onScroll);
      scroller?.removeEventListener('wheel', release);
      scroller?.removeEventListener('touchmove', release);
      scroller?.removeEventListener('keydown', onKey);
      scroller?.removeEventListener('pointerdown', onPointer);
    };
  }, [headings, contentRef]);

  // Up and Down move through the outline and focus the link only; Enter or a click goes to the passage, like any link.
  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    let nextIndex = -1;
    if (e.key === 'ArrowDown' || e.key === 'j') { e.preventDefault(); nextIndex = Math.min(index + 1, headings.length - 1); }
    else if (e.key === 'ArrowUp' || e.key === 'k') { e.preventDefault(); nextIndex = Math.max(index - 1, 0); }
    if (nextIndex !== -1) linkRefs.current[nextIndex]?.focus();
  };

  if (headings.length < 1) return null;
  // Authored levels are kept; indentation is measured from the shallowest level listed, so an outline that starts at h3 is not pushed right.
  const shallowest = Math.min(...headings.map(heading => heading.level));
  const list = <ul className={compact ? 'publication-outline-list' : 'space-y-3 text-sm'}>
    {headings.map((heading, index) => (
      <li key={heading.id} style={{ paddingLeft: `${(heading.level - shallowest) * (compact ? 0.9 : 0.5)}rem` }}>
        <a
          ref={el => { linkRefs.current[index] = el; }}
          href={`#${encodeURIComponent(heading.id)}`}
          title={heading.text}
          aria-current={activeId === heading.id ? 'location' : undefined}
          data-outline-level={heading.level}
          onKeyDown={e => handleKeyDown(e, index)}
          // The click is left to the reader's anchor handling: it updates the URL, scrolls and moves focus into the passage.
          onClick={() => { chooseRef.current(heading.id); if (compact) setOpen(false); }}
          className={`
            publication-outline-link block transition-colors duration-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-gray-900 rounded-sm
            ${activeId === heading.id
              ? 'text-indigo-600 dark:text-indigo-400 font-medium border-l-2 border-indigo-600 dark:border-indigo-400 -ml-[1.1rem] pl-[calc(1.1rem-2px)]'
              : `text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 ${compact ? '' : 'line-clamp-2'}`}
          `}
        >
          {heading.text}
        </a>
      </li>
    ))}
  </ul>;

  if (compact) {
    const id = `${outlineId.compact}-list`;
    return (
      <nav id={outlineId.compact} ref={navRef} aria-label="On this page" tabIndex={-1} className="publication-local-contents-compact"
        onKeyDown={e => { if (e.key === 'Escape' && open) { e.stopPropagation(); setOpen(false); toggleRef.current?.focus(); } }}>
        <button ref={toggleRef} type="button" className="publication-outline-toggle" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>
          <span aria-hidden="true" className="material-symbols-outlined">format_list_bulleted</span>
          <span>On this page</span>
          <span aria-hidden="true" className="material-symbols-outlined publication-outline-chevron">{open ? 'expand_less' : 'expand_more'}</span>
        </button>
        <div id={id} hidden={!open} className="publication-outline-panel">{list}</div>
      </nav>
    );
  }
  const listId = `${outlineId.rail}-list`;
  return (
    <nav
        id={outlineId.rail}
        ref={navRef}
        aria-label="On this page"
        tabIndex={-1}
        data-collapsed={collapsed || undefined}
        className="publication-local-contents focus:outline-none focus:ring-2 focus:ring-indigo-500"
        onKeyDown={e => {
          // Escape inside the open outline folds it and returns focus to its toggle.
          if (e.key === 'Escape' && !collapsed && e.target !== toggleRef.current) { e.stopPropagation(); setCollapsed(true); setTimeout(() => toggleRef.current?.focus(), 0); }
        }}
    >
      <div className="publication-outline-rail">
        <h4 className="publication-outline-heading">
          <button ref={toggleRef} type="button" className="publication-outline-rail-toggle" aria-expanded={!collapsed} aria-controls={listId}
            title={collapsed ? 'Show the page outline' : 'Hide the page outline'} onClick={() => setCollapsed(!collapsed)}>
            <span className="publication-outline-heading-text">On this page</span>
            <span aria-hidden="true" className="material-symbols-outlined publication-outline-chevron">{collapsed ? 'right_panel_open' : 'right_panel_close'}</span>
          </button>
        </h4>
        <div id={listId} hidden={collapsed}>{list}</div>
      </div>
    </nav>
  );
});
