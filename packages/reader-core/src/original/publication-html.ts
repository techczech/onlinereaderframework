import type { Highlight } from './types';

const blockTags = new Set(['ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'BR', 'DD', 'DIV', 'DL', 'DT', 'FIGCAPTION', 'FIGURE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'LI', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TD', 'TH', 'TR', 'UL']);
export const normalisePublicationText = (text: string): string => text.replace(/[\s\u00a0]+/g, ' ').trim();

type TextPoint = { node: Text; offset: number };
export interface PublicationTextModel {
  text: string;
  points: (TextPoint | null)[];
}

/** The same normalised rendered text drives search, speech, quote restoration and notes.
 * Block boundaries add spaces; inline markup does not interrupt a phrase.
 */
export function publicationTextModel(root: Node): PublicationTextModel {
  let text = '';
  const points: (TextPoint | null)[] = [];
  const space = () => {
    if (text && !text.endsWith(' ')) { text += ' '; points.push(null); }
  };
  const visit = (node: Node) => {
    if (node.nodeType === 3) {
      const value = node.nodeValue ?? '';
      for (let offset = 0; offset < value.length; offset++) {
        if (/[\s\u00a0]/.test(value[offset])) {
          if (text && !text.endsWith(' ')) { text += ' '; points.push({ node: node as Text, offset }); }
        } else { text += value[offset]; points.push({ node: node as Text, offset }); }
      }
      return;
    }
    if (node.nodeType === 1) {
      const element = node as Element;
      if (element.matches('script, style, template, noscript, [hidden], [aria-hidden="true"], .publication-margin-note')) return;
      if (blockTags.has(element.tagName)) space();
      node.childNodes.forEach(visit);
      if (blockTags.has(element.tagName)) space();
    } else node.childNodes.forEach(visit);
  };
  visit(root);
  if (text.endsWith(' ')) { text = text.slice(0, -1); points.pop(); }
  return { text, points };
}

function templateFor(html: string): HTMLTemplateElement {
  const template = document.createElement('template');
  template.innerHTML = html;
  return template;
}

export function publicationPlainText(html: string): string {
  if (typeof document === 'undefined') return normalisePublicationText(html.replace(/<[^>]*>/g, ' '));
  return publicationTextModel(templateFor(html).content).text;
}

/** Input has already passed renderPublicationContent's sanitiser. Only safe DOM-created
 * IDs, classes and marks are added here. User text and notes never become HTML strings.
 */
export function preparePublicationHTML(html: string, highlights: Highlight[] = []): string {
  if (typeof document === 'undefined') return html;
  const template = templateFor(html);
  const usedIds = new Set<string>();
  template.content.querySelectorAll('[id]').forEach(element => {
    const id = element.id;
    if (usedIds.has(id)) element.removeAttribute('id');
    else usedIds.add(id);
  });
  template.content.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((heading, index) => {
    if (heading.id) return;
    const base = normalisePublicationText(heading.textContent ?? '').toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/\s+/g, '-') || `heading-${index + 1}`;
    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) id = `${base}-${suffix++}`;
    heading.id = id;
    usedIds.add(id);
  });
  // Find ranges before changing any text nodes. Longer overlapping selections win.
  const model = publicationTextModel(template.content);
  const claimed = new Uint8Array(model.text.length);
  const slices = new Map<Text, { from: number; to: number; id: string }[]>();
  [...highlights].sort((a, b) => b.text.length - a.text.length).forEach(highlight => {
    const needle = normalisePublicationText(highlight.text).toLowerCase();
    if (!needle) return;
    let from = model.text.toLowerCase().indexOf(needle);
    while (from !== -1) {
      const to = from + needle.length;
      if (!claimed.subarray(from, to).some(Boolean)) {
        const nodes = new Map<Text, { from: number; to: number }>();
        for (let i = from; i < to; i++) {
          claimed[i] = 1;
          const point = model.points[i];
          if (!point) continue;
          const slice = nodes.get(point.node);
          if (slice) slice.to = point.offset + 1;
          else nodes.set(point.node, { from: point.offset, to: point.offset + 1 });
        }
        nodes.forEach((slice, node) => slices.set(node, [...(slices.get(node) ?? []), { ...slice, id: highlight.id }]));
      }
      from = model.text.toLowerCase().indexOf(needle, to);
    }
  });
  slices.forEach((ranges, node) => ranges.sort((a, b) => b.from - a.from).forEach(slice => {
    const range = document.createRange();
    range.setStart(node, slice.from);
    range.setEnd(node, slice.to);
    const mark = document.createElement('mark');
    mark.className = 'bg-amber-200 dark:bg-amber-700 text-gray-900 dark:text-white rounded-sm py-0.5 px-0.5 decoration-clone';
    mark.dataset.publicationHighlight = slice.id;
    range.surroundContents(mark);
  }));
  return template.innerHTML;
}

/** Locate a visible phrase across emphasis, links and table-cell text nodes. */
export function findPublicationTextRange(root: Node, phrase: string): Range | null {
  const model = publicationTextModel(root);
  const needle = normalisePublicationText(phrase).toLowerCase();
  const start = model.text.toLowerCase().indexOf(needle);
  if (!needle || start === -1) return null;
  const points = model.points.slice(start, start + needle.length).filter((point): point is TextPoint => point !== null);
  if (!points.length) return null;
  const range = document.createRange();
  range.setStart(points[0].node, points[0].offset);
  const last = points[points.length - 1];
  range.setEnd(last.node, last.offset + 1);
  return range;
}
