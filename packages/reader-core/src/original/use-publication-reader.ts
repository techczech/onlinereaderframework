import type { PublicationEpubOptions } from '../services/publication-epub/index.js';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FontSize, Highlight, LineHeight, MaxWidth, PublicationBook, Reflection } from './types.js';
import type { MarkdownRendererHandle } from './MarkdownRenderer.js';
import type { TableOfContentsHandle } from './TableOfContents.js';
import { flattenPublicationSections, publicationUrl, readStoredValue, safePublicationHref, sectionFromUrl, writeStoredValue } from './publication-model.js';
import { findPublicationTextRange, publicationTextModel } from './publication-html.js';

const strings = (value: unknown): value is string[] => Array.isArray(value) && value.every(item => typeof item === 'string');
const boolean = (value: unknown): value is boolean => typeof value === 'boolean';
const oneOf = <T extends string>(values: readonly T[]) => (value: unknown): value is T => typeof value === 'string' && values.includes(value as T);
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object';
const highlightsValid = (value: unknown): value is Highlight[] => Array.isArray(value) && value.every(item => record(item) && ['id', 'text', 'sectionId', 'sectionTitle'].every(key => typeof item[key] === 'string') && typeof item.date === 'number' && Number.isFinite(item.date) && (item.note === undefined || typeof item.note === 'string') && (item.author === undefined || typeof item.author === 'string'));
const reflectionsValid = (value: unknown): value is Reflection[] => Array.isArray(value) && value.every(item => record(item) && ['id', 'content', 'sectionId', 'sectionTitle'].every(key => typeof item[key] === 'string') && typeof item.date === 'number' && Number.isFinite(item.date));
const id = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;

function useBookState<T>(bookId: string, field: string, fallback: T, valid: (value: unknown) => value is T, onFailure: () => void) {
  const [value, setValue] = useState<T>(() => readStoredValue(bookId, field, fallback, valid));
  useEffect(() => { if (!writeStoredValue(bookId, field, value)) onFailure(); }, [bookId, field, value, onFailure]);
  return [value, setValue] as const;
}

/** State is intentionally mounted beneath PublicationReader's book.id key. */
export function usePublicationReader(book: PublicationBook, epub?: PublicationEpubOptions | false) {
  const sections = useMemo(() => flattenPublicationSections(book.sections), [book.sections]);
  const getInitialSection = useCallback(() => typeof window === 'undefined' ? 'home' : sectionFromUrl(window.location.href, book.id, sections), [book.id, sections]);
  const [currentSectionId, setCurrentSectionId] = useState(getInitialSection);
  const [storageUnavailable, setStorageUnavailable] = useState(false);
  const storageFailure = useCallback(() => setStorageUnavailable(true), []);
  const [readIds, setReadIds] = useBookState(book.id, 'readSections', [] as string[], strings, storageFailure);
  const [bookmarkIds, setBookmarkIds] = useBookState(book.id, 'bookmarkedSections', [] as string[], strings, storageFailure);
  const [highlights, setHighlights] = useBookState(book.id, 'highlights', [] as Highlight[], highlightsValid, storageFailure);
  const [reflections, setReflections] = useBookState(book.id, 'reflections', [] as Reflection[], reflectionsValid, storageFailure);
  const systemDark = (() => { try { return typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-color-scheme: dark)').matches; } catch { return false; } })();
  const [isDarkMode, setIsDarkMode] = useBookState(book.id, 'darkMode', systemDark, boolean, storageFailure);
  const [fontSize, setFontSize] = useBookState<FontSize>(book.id, 'fontSize', 'base', oneOf(['sm', 'base', 'lg', 'xl'] as const), storageFailure);
  const [lineHeight, setLineHeight] = useBookState<LineHeight>(book.id, 'lineHeight', 'relaxed', oneOf(['tight', 'normal', 'relaxed', 'loose'] as const), storageFailure);
  const [maxWidth, setMaxWidth] = useBookState<MaxWidth>(book.id, 'maxWidth', 'md', oneOf(['sm', 'md', 'lg', 'full'] as const), storageFailure);
  const readSections = useMemo(() => new Set(readIds), [readIds]);
  const bookmarkedSections = useMemo(() => new Set(bookmarkIds), [bookmarkIds]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => typeof window !== 'undefined' && window.innerWidth >= 1024 && getInitialSection() !== 'home');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isHighlightsOpen, setIsHighlightsOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isImmersiveMode, setIsImmersiveMode] = useState(false);
  const [isRulerActive, setIsRulerActive] = useState(false);
  const [rulerY, setRulerY] = useState(200);
  const [rulerLines, setRulerLines] = useState(2);
  const [isSearchTriggered, setIsSearchTriggered] = useState(false);
  const [quoteModalData, setQuoteModalData] = useState<{ text: string; title: string; sectionId: string } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [selectionRect, setSelectionRect] = useState<DOMRect | null>(null);
  const [selectedText, setSelectedText] = useState('');
  const [highlightToScroll, setHighlightToScroll] = useState<string | null>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<MarkdownRendererHandle>(null);
  const tocRef = useRef<TableOfContentsHandle>(null);
  const currentSection = sections.find(section => section.id === currentSectionId);
  const isHome = currentSectionId === 'home';
  const isBookmarked = bookmarkedSections.has(currentSectionId);
  const currentSectionHighlights = useMemo(() => highlights.filter(highlight => highlight.sectionId === currentSectionId), [highlights, currentSectionId]);
  const currentSectionReflection = reflections.find(reflection => reflection.sectionId === currentSectionId);
  const currentIndex = sections.findIndex(section => section.id === currentSectionId);
  const prevSection = currentIndex > 0 ? sections[currentIndex - 1] : null;
  const nextSection = currentIndex >= 0 ? sections[currentIndex + 1] : null;
  const cycleFontSize = () => setFontSize(value => (['sm', 'base', 'lg', 'xl'] as const)[(['sm', 'base', 'lg', 'xl'].indexOf(value) + 1) % 4]);
  const cycleLineHeight = () => setLineHeight(value => (['tight', 'normal', 'relaxed', 'loose'] as const)[(['tight', 'normal', 'relaxed', 'loose'].indexOf(value) + 1) % 4]);
  const cycleMaxWidth = () => setMaxWidth(value => (['sm', 'md', 'lg', 'full'] as const)[(['sm', 'md', 'lg', 'full'].indexOf(value) + 1) % 4]);
  const getContainerWidthClass = () => isImmersiveMode ? 'max-w-3xl' : ({ sm: 'max-w-prose', md: 'max-w-3xl', lg: 'max-w-5xl', full: 'max-w-none px-4 lg:px-12' })[maxWidth];
  const showToast = useCallback((message: string) => setToastMessage(message), []);
  const clearSelection = useCallback(() => {
    setSelectionRect(null);
    setSelectedText('');
  }, []);

  useEffect(() => {
    if (currentSection && !readIds.includes(currentSection.id)) setReadIds(previous => [...previous, currentSection.id]);
  }, [currentSection, readIds, setReadIds]);

  const handleSectionChange = useCallback((sectionId: string, text?: string) => {
    if (sectionId !== 'home' && !sections.some(section => section.id === sectionId)) return;
    setCurrentSectionId(sectionId);
    setHighlightToScroll(text ?? null);
    clearSelection();
    window.getSelection()?.removeAllRanges();
    if (window.innerWidth >= 1024 && sectionId !== 'home') setIsSidebarOpen(true);
    if (window.innerWidth < 1024) setIsSidebarOpen(false);
    setIsSearchTriggered(false);
    const url = publicationUrl(window.location.href, book.id, sectionId, text);
    if (url.href !== window.location.href) window.history.pushState({ section: sectionId, book: book.id }, '', url);
    if (!text) contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [book.id, sections, clearSelection]);

  useEffect(() => {
    const restore = () => {
      const next = getInitialSection();
      setCurrentSectionId(next);
      clearSelection();
      const params = new URL(window.location.href).searchParams;
      const legacy = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
      setHighlightToScroll(params.get('text') ?? legacy.get('text'));
      contentRef.current?.scrollTo({ top: 0 });
    };
    restore();
    window.addEventListener('popstate', restore);
    window.addEventListener('hashchange', restore);
    return () => { window.removeEventListener('popstate', restore); window.removeEventListener('hashchange', restore); };
  }, [getInitialSection, clearSelection]);

  useEffect(() => {
    const root = contentRef.current?.querySelector<HTMLElement>('[data-publication-content]');
    if (!root) return;
    if (highlightToScroll) {
      const range = findPublicationTextRange(root, highlightToScroll);
      const node = range?.startContainer.parentElement;
      node?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      node?.animate?.([{ backgroundColor: isDarkMode ? '#4338ca' : '#fef3c7' }, { backgroundColor: 'transparent' }], { duration: 2000 });
      setHighlightToScroll(null);
    } else if (window.location.hash && !window.location.hash.startsWith('#/')) {
      try {
        const fragment = decodeURIComponent(window.location.hash.slice(1));
        Array.from(root.querySelectorAll<HTMLElement>('[id]')).find(element => element.id === fragment)?.scrollIntoView({ block: 'center' });
      } catch { /* A malformed external fragment does not prevent reading. */ }
    }
  }, [currentSectionId, highlightToScroll, isDarkMode]);

  // Mouse, touch and keyboard selection all use the browser's real content range.
  useEffect(() => {
    const update = () => {
      const selection = window.getSelection();
      const root = contentRef.current?.querySelector('[data-publication-content]');
      if (!selection || !root || selection.isCollapsed || !selection.rangeCount || !root.contains(selection.anchorNode) || !root.contains(selection.focusNode)) { clearSelection(); return; }
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      if (!rect.width && !rect.height) { clearSelection(); return; }
      setSelectedText(publicationTextModel(range.cloneContents()).text);
      setSelectionRect(rect);
    };
    document.addEventListener('selectionchange', update);
    const hide = () => clearSelection();
    contentRef.current?.addEventListener('scroll', hide);
    const content = contentRef.current;
    return () => { document.removeEventListener('selectionchange', update); content?.removeEventListener('scroll', hide); };
  }, [clearSelection]);

  const copyLink = useCallback(async (sectionId: string, text?: string) => {
    try {
      await navigator.clipboard.writeText(publicationUrl(window.location.href, book.id, sectionId, text).href);
      showToast('Link copied!');
      return true;
    } catch { showToast('The browser could not copy the link.'); return false; }
  }, [book.id, showToast]);
  const createHighlight = useCallback(() => {
    if (!selectedText || !currentSection) return;
    setHighlights(previous => previous.some(highlight => highlight.sectionId === currentSection.id && highlight.text === selectedText) ? previous : [...previous, { id: id(), text: selectedText, sectionId: currentSection.id, sectionTitle: currentSection.title, author: book.author, date: Date.now(), note: '' }]);
  }, [selectedText, currentSection, book.author, setHighlights]);
  const saveHighlight = useCallback(() => {
    createHighlight();
    clearSelection();
    window.getSelection()?.removeAllRanges();
    setIsHighlightsOpen(true);
    showToast('Highlight saved');
  }, [createHighlight, clearSelection, showToast]);
  const shareHighlightLink = useCallback(async () => {
    if (!selectedText || !currentSection) return;
    createHighlight();
    if (await copyLink(currentSection.id, selectedText)) {
      clearSelection();
      window.getSelection()?.removeAllRanges();
      setIsHighlightsOpen(true);
    }
  }, [selectedText, currentSection, createHighlight, copyLink, clearSelection]);
  const shareHighlightImage = () => {
    if (!selectedText || !currentSection) return;
    createHighlight();
    setQuoteModalData({ text: selectedText, title: currentSection.title, sectionId: currentSection.id });
    clearSelection();
    window.getSelection()?.removeAllRanges();
  };
  const sharePageLink = useCallback(() => { void copyLink(currentSectionId); }, [copyLink, currentSectionId]);
  const handleDrawerShareLink = (sectionId: string, text: string) => { void copyLink(sectionId, text); };
  const handleDrawerShareImage = (text: string, title: string) => {
    const sectionId = highlights.find(highlight => highlight.text === text && highlight.sectionTitle === title)?.sectionId ?? currentSectionId;
    setQuoteModalData({ text, title, sectionId });
  };
  const handleSaveReflection = useCallback((content: string) => {
    if (!currentSection) return;
    setReflections(previous => {
      const existing = previous.find(reflection => reflection.sectionId === currentSection.id);
      const reflection: Reflection = { id: existing?.id ?? id(), sectionId: currentSection.id, sectionTitle: currentSection.title, content, date: Date.now() };
      return [...previous.filter(item => item.sectionId !== currentSection.id), reflection];
    });
    showToast('Reflection saved');
  }, [currentSection, setReflections, showToast]);
  const handleOpenHighlightCallback = useCallback(() => setIsHighlightsOpen(true), []);
  const deleteHighlight = (highlightId: string) => setHighlights(previous => previous.filter(highlight => highlight.id !== highlightId));
  const updateHighlightNote = (highlightId: string, note: string) => setHighlights(previous => previous.map(highlight => highlight.id === highlightId ? { ...highlight, note } : highlight));
  const deleteReflection = (reflectionId: string) => setReflections(previous => previous.filter(reflection => reflection.id !== reflectionId));
  const toggleBookmark = useCallback(() => {
    if (!currentSection) return;
    setBookmarkIds(previous => previous.includes(currentSection.id) ? previous.filter(sectionId => sectionId !== currentSection.id) : [...previous, currentSection.id]);
  }, [currentSection, setBookmarkIds]);
  const handleOpenSearch = () => { setIsSidebarOpen(true); setIsSearchTriggered(true); };
  const download = book.downloads?.find(download => safePublicationHref(download.href));
  const handleDownloadEbook = !download && epub === false ? undefined : async () => {
    try {
      if (download) {
        const anchor = document.createElement('a'); anchor.href = download.href; anchor.click();
      } else {
        const { downloadPublicationEpub } = await import('../services/publication-epub/index.js');
        await downloadPublicationEpub(book, epub || undefined);
      }
    } catch (error) {
      console.error('Publication ebook export failed', error);
      showToast('Could not create the ebook. Please try again.');
    }
  };

  const handleContentLink = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return;
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[href]');
    if (!anchor || !event.currentTarget.contains(anchor)) return;
    const href = anchor.getAttribute('href') ?? '';
    if (href.startsWith('#/') || href.startsWith('?')) {
      const url = new URL(href, window.location.href);
      const sectionId = sectionFromUrl(url.href, book.id, sections);
      if (sectionId !== 'home' || (!url.searchParams.has('section') && !href.startsWith('#/'))) {
        event.preventDefault();
        const text = url.searchParams.get('text') ?? new URLSearchParams(url.hash.split('?')[1] ?? '').get('text') ?? undefined;
        handleSectionChange(sectionId, text);
      }
    } else if (href.startsWith('#')) {
      try {
        const targetId = decodeURIComponent(href.slice(1));
        const target = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[data-publication-content] [id]')).find(element => element.id === targetId);
        if (target) {
          event.preventDefault();
          const url = publicationUrl(window.location.href, book.id, currentSectionId);
          url.hash = targetId;
          window.history.pushState(null, '', url);
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.tabIndex = -1;
          target.focus({ preventScroll: true });
        }
      } catch { /* Keep malformed links inert to this adapter. */ }
    }
  };

  useEffect(() => {
    const keydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === 'Escape') {
        setIsRulerActive(false); setIsShortcutsOpen(false); setQuoteModalData(null); setIsHighlightsOpen(false); setIsChatOpen(false); setIsImmersiveMode(false); clearSelection();
        return;
      }
      if (event.ctrlKey || event.altKey || event.metaKey || target.closest('input, textarea, select, [contenteditable="true"], [role="dialog"]')) return;
      if (isRulerActive && (/^[1-4]$/.test(event.key) || ['ArrowDown', 'ArrowUp'].includes(event.key))) {
        event.preventDefault();
        if (/^[1-4]$/.test(event.key)) setRulerLines(Number(event.key));
        else {
          const delta = event.key === 'ArrowDown' ? 20 : -20;
          const next = rulerY + delta;
          if (next < 100 || next > window.innerHeight - rulerLines * 42 - 50) contentRef.current?.scrollBy({ top: delta, behavior: 'smooth' });
          else setRulerY(next);
        }
        return;
      }
      switch (event.key.toLowerCase()) {
        case '?': event.preventDefault(); setIsShortcutsOpen(true); break;
        case 'h': if (selectedText) { event.preventDefault(); saveHighlight(); } break;
        case 'l': event.preventDefault(); if (selectedText) void shareHighlightLink(); else sharePageLink(); break;
        case 'f': event.preventDefault(); setIsImmersiveMode(value => !value); break;
        case 'b': event.preventDefault(); toggleBookmark(); break;
        case 'r': event.preventDefault(); setIsRulerActive(value => !value); break;
        case 'a': event.preventDefault(); rendererRef.current?.toggleReadAloud(); break;
        case 's': event.preventDefault(); setIsSidebarOpen(value => !value); break;
        case 'n': event.preventDefault(); setIsImmersiveMode(false); setTimeout(() => tocRef.current?.focus(), 0); break;
        case 'j': case 'k': {
          if (target.closest('#toc-container')) return;
          event.preventDefault();
          const headings = Array.from(contentRef.current?.querySelectorAll<HTMLElement>('[data-publication-content] h1,[data-publication-content] h2,[data-publication-content] h3') ?? []);
          const top = contentRef.current?.getBoundingClientRect().top ?? 0;
          const next = event.key.toLowerCase() === 'j' ? headings.find(heading => heading.getBoundingClientRect().top > top + 80) : headings.reverse().find(heading => heading.getBoundingClientRect().top < top + 60);
          next?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [selectedText, isRulerActive, rulerY, rulerLines, saveHighlight, shareHighlightLink, sharePageLink, toggleBookmark, clearSelection]);

  return { book, sections, currentSectionId, currentSection, isHome, readSections, bookmarkedSections, isBookmarked, highlights, reflections, currentSectionHighlights, currentSectionReflection,
    isDarkMode, setIsDarkMode, fontSize, lineHeight, maxWidth, cycleFontSize, cycleLineHeight, cycleMaxWidth, getContainerWidthClass,
    isSidebarOpen, setIsSidebarOpen, isChatOpen, setIsChatOpen, isHighlightsOpen, setIsHighlightsOpen, isShortcutsOpen, setIsShortcutsOpen, isImmersiveMode, setIsImmersiveMode,
    isRulerActive, setIsRulerActive, rulerY, rulerLines, rulerHeightPx: rulerLines * 42, isSearchTriggered, setIsSearchTriggered,
    quoteModalData, setQuoteModalData, toastMessage, setToastMessage, selectionRect, selectedText, storageUnavailable,
    contentRef, rendererRef, tocRef, prevSection, nextSection, handleSectionChange, handleOpenSearch, handleDownloadEbook,
    saveHighlight, shareHighlightLink, shareHighlightImage, sharePageLink, toggleBookmark, handleSaveReflection, handleOpenHighlightCallback,
    handleDrawerShareLink, handleDrawerShareImage, deleteHighlight, updateHighlightNote, deleteReflection, showToast, handleContentLink };
}
