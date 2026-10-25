import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, type RefObject } from 'react';
import { readStoredValue, writeStoredValue } from '../publication-model.js';
import { publicationTextModel, type PublicationTextModel } from '../publication-html.js';
import {
  ReadAloudController, browserReadAloudCapability, DEFAULT_READ_ALOUD_PREFERENCES,
  type ReadAloudPreferences, type ReadAloudSnapshot,
} from './read-aloud-controller.js';
import { buildPublicationSpeakable, firstOffsetBelow } from './read-aloud-speakable.js';
import { applyReadAloudHighlight, mayFollowReading, rangeForSpan } from './read-aloud-highlight.js';

const FIELD = 'readAloud';
const validPreferences = (value: unknown): value is ReadAloudPreferences => {
  const item = value as Partial<ReadAloudPreferences> | null;
  return !!item && typeof item === 'object' && (item.voiceURI === null || typeof item.voiceURI === 'string')
    && typeof item.rate === 'number' && Number.isFinite(item.rate) && typeof item.follow === 'boolean';
};

export interface ReadAloudActions {
  /** Start, pause or resume. Starting begins at the first paragraph in view. */
  toggle(): void;
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  skip(unit: 'sentence' | 'paragraph', direction: 1 | -1): void;
  setVoice(voiceURI: string | null): void;
  setRate(rate: number): void;
  setFollow(follow: boolean): void;
}

/** Browser read-aloud for one rendered chapter: the shared player, per-book choices, real-event highlighting. */
export function useReadAloud(options: {
  bookId: string; language?: string; contentElement: RefObject<HTMLDivElement>; renderedHTML: string; annotatedHTML: string;
  /** Runs synchronously before the browser engine is asked to speak, whichever control started it. */
  onEngage?: () => void;
}): { snapshot: ReadAloudSnapshot; actions: ReadAloudActions } {
  const { bookId, language, contentElement, renderedHTML, annotatedHTML } = options;
  const engage = useRef(options.onEngage);
  engage.current = options.onEngage;
  const controller = useMemo(() => new ReadAloudController({
    capability: browserReadAloudCapability(), language, onEngage: () => engage.current?.(),
    storage: {
      read: () => readStoredValue(bookId, FIELD, DEFAULT_READ_ALOUD_PREFERENCES, validPreferences),
      write: value => writeStoredValue(bookId, FIELD, value),
    },
  // One controller per mounted chapter; the renderer is keyed by chapter and the reader by book.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), []);
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);

  // Voices arrive late and sometimes empty: ask on mount, on the browser's own event, and a few times after.
  useEffect(() => {
    controller.refreshVoices();
    const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined;
    const refresh = () => controller.refreshVoices();
    synth?.addEventListener?.('voiceschanged', refresh);
    const timers = [250, 1000].map(delay => window.setTimeout(refresh, delay));
    timers.push(window.setTimeout(() => controller.refreshVoices(true), 2500));
    return () => { synth?.removeEventListener?.('voiceschanged', refresh); timers.forEach(window.clearTimeout); };
  }, [controller]);

  // The text this chapter speaks. New text always stops the previous reading; annotation changes do not alter text and never reload.
  const loadedText = useRef<string | null>(null);
  useEffect(() => {
    const element = contentElement.current;
    if (!element) return;
    const parts = buildPublicationSpeakable(element);
    if (loadedText.current !== parts.speakable.text) { loadedText.current = parts.speakable.text; controller.load(parts); }
  }, [controller, contentElement, renderedHTML]);

  // Only speech this controller produced is cancelled when the chapter or the reader goes away.
  useEffect(() => () => controller.dispose(), [controller]);

  // Paint from the current DOM. Annotations replace the markup but not the text, so the model is rebuilt per markup version.
  const model = useRef<{ html: string; value: PublicationTextModel } | null>(null);
  useEffect(() => {
    const element = contentElement.current;
    if (!element || !snapshot.sentence) return;
    if (!model.current || model.current.html !== annotatedHTML) model.current = { html: annotatedHTML, value: publicationTextModel(element) };
    return applyReadAloudHighlight(model.current.value, snapshot.sentence, snapshot.wordTiming === 'boundary' ? snapshot.word : null).clear;
  }, [contentElement, annotatedHTML, snapshot.sentence, snapshot.word, snapshot.wordTiming]);

  // Following moves only when the sentence changes, and never against a selection, a field or an open dialog.
  const sentenceStart = snapshot.sentence?.from ?? null;
  useEffect(() => {
    const element = contentElement.current;
    const sentence = snapshot.sentence;
    if (!element || !sentence || sentenceStart === null || !snapshot.follow || snapshot.status !== 'speaking' || !mayFollowReading()) return;
    if (!model.current || model.current.html !== annotatedHTML) model.current = { html: annotatedHTML, value: publicationTextModel(element) };
    const block = rangeForSpan(model.current.value, sentence)?.startContainer.parentElement;
    block?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contentElement, annotatedHTML, sentenceStart, snapshot.follow, snapshot.status]);

  const startOffset = useCallback((): number => {
    const element = contentElement.current;
    if (!element) return 0;
    const scroller = element.closest<HTMLElement>('.publication-scroll');
    return firstOffsetBelow(buildPublicationSpeakable(element), (scroller?.getBoundingClientRect().top ?? 0) + 4);
  }, [contentElement]);

  const actions = useMemo<ReadAloudActions>(() => ({
    toggle: () => controller.toggle(controller.getSnapshot().status === 'idle' ? startOffset() : 0),
    start: () => controller.start(startOffset()),
    pause: () => controller.pause(), resume: () => controller.resume(), stop: () => controller.stop(),
    skip: (unit, direction) => controller.skip(unit, direction),
    setVoice: voiceURI => controller.setVoice(voiceURI), setRate: rate => controller.setRate(rate), setFollow: follow => controller.setFollow(follow),
  }), [controller, startOffset]);
  return { snapshot, actions };
}
