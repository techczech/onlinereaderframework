/** Anchored reading for the online reader: the first letters of every word carry the emphasis.
 *
 * Source: WriteFlex `src/renderer/src/editor/anchored-reading.ts` (the `\S+` word walk and `lead = min(leadLength(word), word.length)` mark)
 * and `src/renderer/src/editor/sentences.ts` (`leadLength`, the bionic ramp) and `focus-modes.ts` (`normaliseLeadStyle`, the contrast default),
 * inspected 2026-10-25 in writeflex-desktop at cd75e8cb (anchored-reading.ts last changed in 664ea233). `leadLength` is copied unchanged.
 * Local changes: the CodeMirror decoration window and edit mapping are not needed (the chapter text is read-only here), so marks are CSS Custom
 * Highlight ranges over the canonical publication text. WriteFlex's third style, bold, needs `font-weight`, which a highlight cannot set and which
 * would need the text nodes wrapped, so it is left out. Display only: no text node, source offset, note or speech position changes.
 */
import { publicationTextModel } from '../publication-html.js';

export { normaliseLeadStyle, type LeadStyle } from './reading-preferences.js';

/** The Anchored Reading lead-in ramp (bionic): how many characters of `word` carry the emphasis.
 * Measured on the word's LETTERS only (punctuation stripped); short words anchor on one character,
 * long words on ~35% of their length. Always at least 1 so every token has a handhold.
 * Copied unchanged from WriteFlex sentences.ts. */
export function leadLength(word: string): number {
  const letters = word.replace(/[^\p{L}]/gu, '').length;
  if (letters <= 3) return 1;
  if (letters <= 6) return 2;
  if (letters <= 9) return 3;
  return Math.ceil(letters * 0.35);
}

/** Lead-in spans of every word in `text`, as WriteFlex's anchoredRanges computes them: each `\S+` token, from its first character for
 * `min(leadLength(token), token.length)` characters. Offsets are in `text`. */
export function leadSpans(text: string): { from: number; to: number }[] {
  const spans: { from: number; to: number }[] = [];
  const words = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = words.exec(text))) {
    const lead = Math.min(leadLength(match[0]), match[0].length);
    spans.push({ from: match.index, to: match.index + lead });
  }
  return spans;
}

export const ANCHORED_HIGHLIGHT = 'publication-anchored-lead';
/** The rest of each eligible word, softened by Contrast through the highlight (never by recolouring the block, which MathML and code inherit from). */
export const ANCHORED_REST_HIGHLIGHT = 'publication-anchored-rest';
/** Text that is not prose: never emphasised, as the reading surface already leaves it alone for focus. */
const NOT_PROSE = 'pre, code, kbd, samp, math, [data-reading-support-ignore]';

type HighlightHost = { Highlight?: new (...ranges: Range[]) => { priority: number }; CSS?: { highlights?: Map<string, unknown> } };
const host = (): HighlightHost => globalThis as unknown as HighlightHost;

/** True where the browser can paint ranges without touching the text (CSS Custom Highlight API). Without it anchored reading is unavailable, not faked. */
export function anchoredReadingSupported(): boolean {
  return typeof document !== 'undefined' && !!host().Highlight && !!host().CSS?.highlights;
}

/** DOM ranges for the lead-in and for the remainder of each word in the rendered chapter, over the same canonical text the reader's search, notes and speech use.
 * A word split over inline markup (emphasis, a note mark) is still one word; each range stays inside one text node. Excluded content (code, MathML, ignored spans) is never inside a range, even between two prose parts of one token. */
export function anchoredRangeSets(root: Node): { lead: Range[]; rest: Range[] } {
  const model = publicationTextModel(root);
  const lead: Range[] = [];
  const rest: Range[] = [];
  // Ranges are cut per text node and never include a point inside excluded content, so a painted range cannot intersect an excluded subtree
  // even when it starts and ends in prose around inline code or MathML. Canonical offsets and node identity are untouched.
  const rangesOf = (from: number, to: number): Range[] => {
    const out: Range[] = [];
    let node: Text | null = null;
    let start = 0;
    let end = 0;
    const flush = (): void => {
      if (!node) return;
      const range = document.createRange();
      range.setStart(node, start);
      range.setEnd(node, end);
      out.push(range);
      node = null;
    };
    for (let i = from; i < to; i++) {
      const point = model.points[i];
      if (!point || point.node.parentElement?.closest(NOT_PROSE)) { flush(); continue; }
      if (node === point.node && point.offset === end) { end = point.offset + 1; continue; }
      flush();
      node = point.node;
      start = point.offset;
      end = point.offset + 1;
    }
    flush();
    return out;
  };
  const words = /\S+/g;
  let match: RegExpExecArray | null;
  while ((match = words.exec(model.text))) {
    const end = match.index + match[0].length;
    const leadEnd = match.index + Math.min(leadLength(match[0]), match[0].length);
    const head = rangesOf(match.index, leadEnd);
    lead.push(...head);
    if (head.length && leadEnd < end) rest.push(...rangesOf(leadEnd, end));
  }
  return { lead, rest };
}

/** DOM ranges for the lead-in of each word (see `anchoredRangeSets`). */
export function anchoredRanges(root: Node): Range[] {
  return anchoredRangeSets(root).lead;
}

export interface AppliedAnchored { count: number; clear(): void }
/** Paint the lead-ins of `root` with the native highlight. Registered below read-aloud's highlights so the spoken word still reads on top. */
export function applyAnchoredReading(root: Node): AppliedAnchored {
  const registry = host().CSS?.highlights;
  const Highlight = host().Highlight;
  if (!registry || !Highlight) return { count: 0, clear() {} };
  const { lead, rest } = anchoredRangeSets(root);
  const leadHighlight = new Highlight(...lead);
  const restHighlight = new Highlight(...rest);
  leadHighlight.priority = -1;
  restHighlight.priority = -1;
  registry.set(ANCHORED_HIGHLIGHT, leadHighlight);
  registry.set(ANCHORED_REST_HIGHLIGHT, restHighlight);
  return {
    count: lead.length,
    clear() {
      if (registry.get(ANCHORED_HIGHLIGHT) === leadHighlight) registry.delete(ANCHORED_HIGHLIGHT);
      if (registry.get(ANCHORED_REST_HIGHLIGHT) === restHighlight) registry.delete(ANCHORED_REST_HIGHLIGHT);
    },
  };
}
