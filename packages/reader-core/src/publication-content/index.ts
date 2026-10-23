import MarkdownIt from 'markdown-it';
import footnote from 'markdown-it-footnote';
import { katex } from '@mdit/plugin-katex';
import { fromHtml } from 'hast-util-from-html';
import { sanitize } from 'hast-util-sanitize';
import { toHtml } from 'hast-util-to-html';
import { toText } from 'hast-util-to-text';
import type { Element, Root, RootContent } from 'hast';
import { publicationSchema } from './publication-schema.js';

const markdown = new MarkdownIt({ html: true, linkify: true })
  .use(footnote)
  .use(katex, {
    delimiters: 'all',
    mathFence: true,
    output: 'mathml',
    trust: false,
    throwOnError: false,
    logger: () => 'ignore' as const,
    maxExpand: 1000,
    maxSize: 20,
  });

const idPrefix = 'reader-content-';
const headingTags = new Set(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);

function visitElements(parent: Root | Element, visit: (element: Element) => void): void {
  for (const child of parent.children) {
    if (child.type === 'element') {
      visit(child);
      visitElements(child, visit);
    }
  }
}

function slug(value: string): string {
  return value.normalize('NFKC').toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, '')
    .trim().replace(/\s+/g, '-') || 'heading';
}

function assignIds(tree: Root): void {
  const used = new Set<string>();
  const targets = new Map<string, string>();
  const elements: Element[] = [];
  visitElements(tree, element => elements.push(element));

  function assign(element: Element, original: string): void {
    const base = original.startsWith(idPrefix) ? original : idPrefix + original;
    let id = base;
    let suffix = 2;
    while (used.has(id)) id = `${base}-${suffix++}`;
    used.add(id);
    element.properties.id = id;
    if (!targets.has(original)) targets.set(original, id);
  }

  // Reserve already-safe IDs first. Prefixing a legacy ID must never displace
  // a supplied safe ID; otherwise its fragment links would change on rerender.
  const supplied = elements.flatMap(element => {
    const id = element.properties.id;
    return typeof id === 'string' && id ? [{ element, id }] : [];
  });
  for (const compatible of [true, false]) {
    for (const { element, id } of supplied) {
      if (id.startsWith(idPrefix) === compatible) assign(element, id);
    }
  }
  for (const element of elements) {
    if (headingTags.has(element.tagName) && !element.properties.id) {
      assign(element, slug(toText(element)));
    }
  }
  for (const id of used) if (!targets.has(id)) targets.set(id, id);
  for (const element of elements) {
    const href = element.properties.href;
    if (typeof href === 'string' && href.startsWith('#')) {
      let fragment = href.slice(1);
      try { fragment = decodeURIComponent(fragment); } catch { /* Keep malformed source fragments inert. */ }
      const target = targets.get(fragment);
      // Unknown fragments include the original reader's #/chapter routes.
      if (target) element.properties.href = '#' + encodeURIComponent(target);
    }
    for (const property of ['fill', 'stroke', 'markerStart', 'markerEnd']) {
      const paint = element.properties[property];
      if (typeof paint === 'string') {
        const reference = paint.match(/^url\(#([a-z0-9_.:-]+)\)$/i);
        if (reference) {
          const target = targets.get(reference[1]);
          if (target) element.properties[property] = `url(#${target})`;
          else delete element.properties[property];
        }
      }
    }
    for (const property of ['ariaLabelledBy', 'ariaDescribedBy']) {
      const value = element.properties[property];
      if (value) {
        const references = Array.isArray(value) ? value.map(String) : String(value).split(/\s+/);
        element.properties[property] = references.flatMap(reference => targets.get(reference) ?? []);
      }
    }
  }
}

function contentTree(content: string, format: 'markdown' | 'html'): Root {
  const html = format === 'html' ? content : markdown.render(content, {});
  const tree = fromHtml(html, { fragment: true });
  visitElements(tree, element => {
    if (element.tagName === 'stop') {
      // The original gradient specifies only these presentation values in CSS.
      // Extract them before sanitising; the schema validates their finite forms.
      for (const declaration of String(element.properties.style ?? '').split(';')) {
        const [name, value] = declaration.split(':').map(part => part.trim());
        if (name === 'stop-color') element.properties.stopColor = value;
        if (name === 'stop-opacity') element.properties.stopOpacity = value;
      }
    }
    // Preserve Markdown-it's finite table alignment before removing all styles.
    if (element.tagName === 'th' || element.tagName === 'td') {
      const alignment = String(element.properties.style ?? '').match(/^text-align:\s*(left|right|center);?$/);
      if (alignment) element.properties.align = alignment[1];
    }
  });
  const safe = sanitize(tree, publicationSchema) as Root;
  assignIds(safe);
  return safe;
}

/** Render a complete section synchronously, in a browser or during SSR. */
export function renderPublicationContent(content: string, format: 'markdown' | 'html' = 'markdown'): string {
  return toHtml(contentTree(content, format));
}

function includeSearchText(parent: Root | Element): void {
  parent.children = parent.children.map((child): RootContent => {
    if (child.type !== 'element') return child;
    if (child.tagName === 'img') {
      return { type: 'text', value: ` ${String(child.properties.alt ?? '')} ` };
    }
    if (child.tagName === 'math') {
      let tex: string | undefined;
      visitElements(child, element => {
        if (element.tagName === 'annotation' && element.properties.encoding === 'application/x-tex') tex = toText(element);
      });
      if (tex !== undefined) return { type: 'text', value: ` ${tex} ` };
    }
    includeSearchText(child);
    return child;
  });
}

/** Full section text for search/speech, including image alt text and footnotes. */
export function publicationContentToText(content: string, format: 'markdown' | 'html' = 'markdown'): string {
  const tree = contentTree(content, format);
  includeSearchText(tree);
  return toText(tree).trim();
}

export interface PublicationHeading {
  id: string;
  text: string;
  level: number;
}

/** TOC targets and labels use the exact sanitised model used for rendering. */
export function getPublicationHeadings(content: string, format: 'markdown' | 'html' = 'markdown'): PublicationHeading[] {
  const tree = contentTree(content, format);
  includeSearchText(tree);
  const headings: PublicationHeading[] = [];
  visitElements(tree, element => {
    if (headingTags.has(element.tagName)) {
      headings.push({ id: String(element.properties.id), text: toText(element).replace(/\s+/g, ' ').trim(), level: Number(element.tagName[1]) });
    }
  });
  return headings;
}
