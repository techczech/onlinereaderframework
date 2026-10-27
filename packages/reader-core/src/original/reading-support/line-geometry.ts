/** Adapted from WriteFlex editor/line-overlay.ts (tileLines, clampRect, bandRect, dimRects, rulerShape), inspected 2026-10-25.
 * The functions are pure and CodeMirror-free; changes: the ruler covers 1, 2 or 3 lines (WriteFlex: thin, 1, 3, 5, all below),
 * and line rectangles come from the DOM text (`visualLines` below) instead of an editor's measured lines.
 */
/** A vertical extent in pixels, relative to the top of the content area. */
export type LineRect = { top: number; bottom: number };

/** Close the gaps between consecutive visual lines so a band or ruler edge falls halfway between two lines. `lines` run top to bottom. */
export function tileLines(lines: readonly LineRect[]): LineRect[] {
  const tiled = lines.map(line => ({ ...line }));
  for (let i = 0; i < lines.length - 1; i++) {
    const middle = (lines[i].bottom + lines[i + 1].top) / 2;
    tiled[i].bottom = middle;
    tiled[i + 1].top = middle;
  }
  if (lines.length > 1) {
    tiled[0].top -= Math.max(0, (lines[1].top - lines[0].bottom) / 2);
    tiled[lines.length - 1].bottom += Math.max(0, (lines[lines.length - 1].top - lines[lines.length - 2].bottom) / 2);
  }
  return tiled;
}

export function clampRect(rect: LineRect, height: number): LineRect | null {
  const top = Math.max(0, rect.top);
  const bottom = Math.min(height, rect.bottom);
  return bottom > top ? { top, bottom } : null;
}

/** The line-window band: `size` visual lines centred on line `focus`; near the ends it keeps what exists. */
export function bandRect(lines: readonly LineRect[], focus: number, size: 1 | 3 | 5, height: number): LineRect | null {
  if (focus < 0 || focus >= lines.length) return null;
  const tiled = tileLines(lines);
  const reach = (size - 1) / 2;
  return clampRect({ top: tiled[Math.max(0, focus - reach)].top, bottom: tiled[Math.min(lines.length - 1, focus + reach)].bottom }, height);
}

export function dimRects(band: LineRect | null, height: number): { above: LineRect | null; below: LineRect | null } {
  if (!band) return { above: null, below: null };
  return { above: clampRect({ top: 0, bottom: band.top }, height), below: clampRect({ top: band.bottom, bottom: height }, height) };
}

/** The ruler directly under line `focus`: it covers the next `covers` visual lines and never the focus line or anything above it. */
export function rulerShape(lines: readonly LineRect[], focus: number, covers: 1 | 2 | 3, height: number): LineRect | null {
  if (focus < 0 || focus >= lines.length) return null;
  const tiled = tileLines(lines);
  const last = Math.min(lines.length - 1, focus + covers);
  if (last <= focus) return null;
  return clampRect({ top: tiled[focus].bottom, bottom: tiled[last].bottom }, height);
}

/** The parts of a block that belong to it and not to a readable block nested inside it: its direct text and the inline elements that hold no readable block,
 * in runs. A nested readable block ends a run, so the text before it (lead) and after it (tail) are separate runs, each a contiguous stretch of reading.
 * A list item with a sub-list, or a cell with a paragraph, keeps its own text this way. Nothing in the DOM is changed.
 */
export function ownContent(block: Element, readable: string, ignore: string): Node[][] {
  const runs: Node[][] = [];
  let run: Node[] = [];
  const end = (): void => { if (run.length) runs.push(run); run = []; };
  const walk = (parent: Node): void => {
    parent.childNodes.forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) { if (child.textContent?.trim()) run.push(child); return; }
      if (!(child instanceof Element) || child.matches(ignore)) return;
      if (child.matches(readable)) end();
      else if (child.querySelector(readable)) { end(); walk(child); end(); }
      else if (child.textContent?.trim()) run.push(child);
    });
  };
  walk(block);
  end();
  return runs;
}

/** The rendered visual lines of one block, merged from the client rectangles of its text and inline boxes, relative to `origin`.
 * A wrapped line is one entry whatever inline maths, emphasis or links it holds. With `only`, just those nodes of the block are measured (its own text, not a nested block's).
 * Nothing in the DOM is changed.
 */
export function visualLines(block: Element, origin: number, only?: readonly Node[]): LineRect[] {
  const boxes: DOMRect[] = [];
  for (const node of only ?? [block]) {
    const range = document.createRange();
    if (node === block || node.nodeType === Node.ELEMENT_NODE) range.selectNodeContents(node); else range.selectNode(node);
    boxes.push(...Array.from(range.getClientRects()));
  }
  boxes.sort((a, b) => a.top - b.top || a.left - b.left);
  const lines: LineRect[] = [];
  for (const box of boxes) {
    if (box.width <= 0 || box.height <= 0) continue;
    const last = lines[lines.length - 1];
    const centre = (box.top + box.bottom) / 2 - origin;
    if (last && centre >= last.top && centre <= last.bottom) { last.top = Math.min(last.top, box.top - origin); last.bottom = Math.max(last.bottom, box.bottom - origin); }
    else lines.push({ top: box.top - origin, bottom: box.bottom - origin });
  }
  return lines;
}
