/** Authored reader references inside a section (`#/chapter`, `#/chapter#heading`, `?section=chapter`) made usable from the exported files.
 * Only same-book reader routes are touched. Citations, source addresses, other books' routes and in-page fragments are left exactly as written, and a route to a
 * chapter the book does not have is kept as written and reported as unresolved, never pointed at another file. */

export interface ReaderLinkContext {
  bookId: string;
  /** True for the id of a section in this book. */
  has(sectionId: string): boolean;
  /** Address of that section's exported file, from the file that carries the link (a chapter file or full.md). */
  chapter(sectionId: string): string;
  /** Address of the book's index, the target of a link to the book's start. */
  index: string;
  /** Called once per reference that could not be resolved. */
  unresolved(href: string): void;
}

const decodeAttribute = (value: string): string => value.replace(/&(?:#x26|#38|amp);/gi, '&');

/** The exported address for one authored href, or `undefined` when it is not a same-book reader route or cannot be resolved. */
export function resolveReaderHref(rawHref: string, context: ReaderLinkContext): string | undefined {
  const href = decodeAttribute(rawHref).trim();
  let id: string | null;
  let fragment = '';
  if (href.startsWith('#/')) {
    const [route, ...rest] = href.slice(2).split('#');
    fragment = rest.length ? `#${rest.join('#')}` : '';
    try { id = decodeURIComponent(route.split('?')[0]); } catch { context.unresolved(rawHref); return undefined; }
  } else if (href.startsWith('?')) {
    const [query, ...rest] = href.slice(1).split('#');
    fragment = rest.length ? `#${rest.join('#')}` : '';
    const params = new URLSearchParams(query);
    const book = params.get('book');
    if (book !== null && book !== context.bookId) return undefined;
    id = params.get('section');
    if (book === null && id === null) return undefined;
  } else return undefined;
  if (!id || id === 'home') return context.index;
  if (!context.has(id)) { context.unresolved(rawHref); return undefined; }
  return `${context.chapter(id)}${fragment}`;
}

/** Rewrite the hrefs of `<a>` tags in sanitised HTML (`renderPublicationContent`). Text, code examples and every other attribute are untouched: code is escaped there,
 * so a literal `<a href>` in a code sample is never a tag. */
export function rewriteReaderLinksInHtml(html: string, context: ReaderLinkContext): string {
  return html.replace(/(<a\b[^>]*?\bhref=")([^"]*)(")/gi, (whole, open: string, href: string, close: string) => {
    const target = resolveReaderHref(href, context);
    return target === undefined ? whole : `${open}${target}${close}`;
  });
}

/** Reader references written as Markdown links outside code, as `{ text, href }`. The Markdown itself is never edited (it is the author's own bytes). */
export function readerLinksInMarkdown(markdown: string): { text: string; href: string }[] {
  const prose = markdown
    .replace(/^( {0,3})(`{3,}|~{3,})[^\n]*\n[\s\S]*?(?:^ {0,3}\2[`~]*[ \t]*$|(?![\s\S]))/gm, '')
    .replace(/(`+)[^`]*?\1/g, '');
  const found: { text: string; href: string }[] = [];
  for (const match of prose.matchAll(/\[([^\]\n]*)\]\(\s*<?((?:#\/|\?)[^)\s>]*)>?(?:\s+(?:"[^"]*"|'[^']*'))?\s*\)/g)) found.push({ text: match[1], href: match[2] });
  return found;
}

/** A note placed after a Markdown section's own text that gives the exported file for each reader reference in it, or `''` when there are none. */
export function markdownReaderLinkNote(markdown: string, context: ReaderLinkContext): string {
  const seen = new Set<string>();
  const items: string[] = [];
  for (const { text, href } of readerLinksInMarkdown(markdown)) {
    const key = `${text}\u0000${href}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const target = resolveReaderHref(href, context);
    items.push(target === undefined ? `- ${text}: \`${href}\` has no exported file` : `- [${text}](${target}) (written as \`${href}\`)`);
  }
  return items.length ? `> Chapter links in this section, as exported files:\n>\n${items.map(item => `> ${item}`).join('\n')}` : '';
}
