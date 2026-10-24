import { useEffect, type RefObject } from 'react';
import { publicationTextModel } from './publication-html.js';

export interface ListeningTextBoundary {
  sectionId: string;
  charStart: number;
  charEnd: number;
}

/** Measured audio spans address the canonical rendered section text, never source Markdown. */
export function useListeningHighlight(
  contentRef: RefObject<HTMLDivElement>, sectionId: string,
  boundary: ListeningTextBoundary | null, revision: unknown,
) {
  useEffect(() => {
    const container = contentRef.current?.querySelector<HTMLElement>('[data-publication-content]');
    if (!container || !boundary || boundary.sectionId !== sectionId) return;
    const model = publicationTextModel(container);
    const { charStart, charEnd } = boundary;
    if (!Number.isInteger(charStart) || !Number.isInteger(charEnd) || charStart < 0 || charEnd <= charStart || charEnd > model.text.length) return;
    const start = model.points.slice(charStart, charEnd).find(Boolean);
    const end = model.points.slice(charStart, charEnd).reverse().find(Boolean);
    if (!start || !end) return;
    const range = document.createRange();
    range.setStart(start.node, start.offset); range.setEnd(end.node, end.offset + 1);
    const host = globalThis as unknown as {
      Highlight?: new (range: Range) => unknown;
      CSS?: { highlights?: Map<string, unknown> };
    };
    const block = start.node.parentElement?.closest<HTMLElement>('p, li, blockquote, h1, h2, h3, h4');
    const highlight = host.Highlight ? new host.Highlight(range) : undefined;
    if (highlight) host.CSS?.highlights?.set('publication-audiobook', highlight);
    else block?.setAttribute('data-publication-audio-active', '');
    const selection = window.getSelection();
    const editing = document.activeElement?.closest('input, textarea, select, [contenteditable="true"]');
    if (!editing && (!selection || selection.isCollapsed)) block?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    return () => {
      if (host.CSS?.highlights?.get('publication-audiobook') === highlight) host.CSS?.highlights?.delete('publication-audiobook');
      block?.removeAttribute('data-publication-audio-active');
    };
  }, [contentRef, sectionId, boundary, revision]);
}
