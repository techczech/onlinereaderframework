import { publicationTextModel, type PublicationTextModel } from '../publication-html.js';
import type { Speakable, SpokenPiece, SpokenRange, SpokenSegment } from './flex-speech.js';

/** Blocks that speak as one paragraph. The innermost match wins, so a list item holding a paragraph speaks it once. */
const SPEAKABLE_BLOCK = 'p, li, blockquote, h1, h2, h3, h4, h5, h6, pre, figcaption, caption, dt, dd, td, th';
const HEADING = /^H[1-6]$/;

export interface PublicationSpeakable {
  speakable: Speakable;
  model: PublicationTextModel;
}

/** Project the rendered publication into ReadFlex's Speakable.
 * The reading surface is the canonical publication text model that search, quotes and notes already share,
 * so every source offset here is an offset into that text. Spoken text is the same characters, one paragraph per
 * block, which makes the spoken-to-source mapping linear inside each piece. No node is changed.
 */
export function buildPublicationSpeakable(root: Node): PublicationSpeakable {
  const model = publicationTextModel(root);
  const rootElement = root.nodeType === 1 ? root as Element : null;
  const blockOf = (node: Text): Element | null => {
    const block = node.parentElement?.closest(SPEAKABLE_BLOCK) ?? null;
    return block && (!rootElement || rootElement.contains(block)) ? block : null;
  };
  const runs: { block: Element | null; from: number; to: number }[] = [];
  for (let index = 0; index < model.text.length; index++) {
    const point = model.points[index];
    if (!point) continue;
    const block = blockOf(point.node);
    const last = runs[runs.length - 1];
    // A block change closes the run; spaces between blocks belong to neither.
    if (last && last.block === block) last.to = index + 1;
    else runs.push({ block, from: index, to: index + 1 });
  }
  let text = '';
  const segments: SpokenSegment[] = [];
  const pieces: SpokenPiece[] = [];
  runs.forEach((run, index) => {
    if (text) text += '\n\n';
    const spokenFrom = text.length;
    text += model.text.slice(run.from, run.to);
    segments.push({
      blockId: `block-${index}`,
      kind: run.block && HEADING.test(run.block.tagName) ? 'heading' : 'paragraph',
      sourceFrom: run.from, sourceTo: run.to, spokenFrom, spokenTo: text.length,
    });
    pieces.push({ sourceFrom: run.from, sourceTo: run.to, spokenFrom, spokenTo: text.length });
  });
  return { speakable: { pieces, segments, text }, model };
}

/** The word that contains an offset, or the next word when the offset sits in a gap. Boundary events give a start position only. */
export function wordRangeAt(text: string, offset: number): SpokenRange | null {
  const word = /[\p{L}\p{N}\p{M}]+(?:['’\-][\p{L}\p{N}\p{M}]+)*/gu;
  for (const match of text.matchAll(word)) {
    const from = match.index ?? 0;
    const to = from + match[0].length;
    if (offset < to) return { from, to };
  }
  return null;
}

/** The source offset of the first paragraph whose bottom edge is below `top`, for starting where the reader is. */
export function firstOffsetBelow(parts: PublicationSpeakable, top: number): number {
  for (const segment of parts.speakable.segments) {
    const point = segment.sourceFrom === null ? null : parts.model.points[segment.sourceFrom];
    const element = point?.node.parentElement;
    if (element && element.getBoundingClientRect().bottom > top) return segment.sourceFrom!;
  }
  return 0;
}
