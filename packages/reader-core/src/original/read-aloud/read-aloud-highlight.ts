import type { PublicationTextModel } from '../publication-html.js';
import type { SpokenRange } from './flex-speech.js';

export const SENTENCE_HIGHLIGHT = 'publication-read-aloud';
export const WORD_HIGHLIGHT = 'publication-read-aloud-word';

type HighlightHost = { Highlight?: new (...ranges: Range[]) => unknown; CSS?: { highlights?: Map<string, unknown> } };
const host = (): HighlightHost => globalThis as unknown as HighlightHost;

/** A DOM range for canonical publication text offsets. It crosses emphasis, links, table cells and MathML without changing a node. */
export function rangeForSpan(model: PublicationTextModel, span: SpokenRange): Range | null {
  if (!Number.isInteger(span.from) || !Number.isInteger(span.to) || span.from < 0 || span.to <= span.from || span.to > model.text.length) return null;
  const covered = model.points.slice(span.from, span.to).filter(point => point !== null);
  const first = covered[0], last = covered[covered.length - 1];
  if (!first || !last) return null;
  const range = document.createRange();
  range.setStart(first.node, first.offset);
  range.setEnd(last.node, last.offset + 1);
  return range;
}

export interface AppliedHighlight { block: Element | null; clear(): void }

/** Paint the sentence (and the word, only when `word` is given) with the native CSS Highlight pipeline.
 * Without it the paragraph holding the sentence is marked instead, which is the truthful extent of that fallback.
 */
export function applyReadAloudHighlight(model: PublicationTextModel, sentence: SpokenRange | null, word: SpokenRange | null): AppliedHighlight {
  const registry = host().CSS?.highlights;
  const Highlight = host().Highlight;
  const sentenceRange = sentence ? rangeForSpan(model, sentence) : null;
  const wordRange = word ? rangeForSpan(model, word) : null;
  const block = sentenceRange?.startContainer.parentElement?.closest('p, li, blockquote, h1, h2, h3, h4, h5, h6, pre, figcaption, dt, dd, td, th') ?? null;
  const created: [string, unknown][] = [];
  if (registry && Highlight) {
    if (sentenceRange) created.push([SENTENCE_HIGHLIGHT, new Highlight(sentenceRange)]);
    if (wordRange) created.push([WORD_HIGHLIGHT, new Highlight(wordRange)]);
    const active = registry;
    created.forEach(([name, value]) => active.set(name, value));
  } else block?.setAttribute('data-publication-read-aloud-active', '');
  return {
    block,
    clear() {
      // Only remove what this call set; a newer sentence may already own the name.
      created.forEach(([name, value]) => { if (registry?.get(name) === value) registry?.delete(name); });
      block?.removeAttribute('data-publication-read-aloud-active');
    },
  };
}

/** Follow reading, never against the reader: no scrolling while text is selected, a field has focus or a dialog or menu is open. */
export function mayFollowReading(): boolean {
  const selection = window.getSelection();
  if (selection && !selection.isCollapsed) return false;
  const active = document.activeElement;
  return !active?.closest('input, textarea, select, [contenteditable="true"], dialog[open], [role="dialog"], [data-reader-menu]');
}
