/** Crawler-readable pages of a pinned release, generated from the same `PublicationBook` the reader displays. Pure: strings in, strings out.
 * Section text is the reader's own sanitised render (`renderPublicationContent`), so no markup the reader would refuse reaches a page.
 * The pages live inside `#root` and are replaced when the reader mounts; without JavaScript they are the whole public site. */
import type { PublicationBook, PublicationSection } from '../../../../packages/reader-core/src/original/types';
import { publicationContentToText, renderPublicationContent } from '../../../../packages/reader-core/src/publication-content/index';
import { publicationDisplayTitle, safePublicationHref } from '../../../../packages/reader-core/src/original/publication-model';
import { agentBookLinks, readerLink } from '../../../../packages/reader-core/src/agent-export/index';
import { rewriteReaderLinksInHtml } from '../../../../packages/reader-core/src/agent-export/agent-links';
import { aliasRoutes, sectionIdsOf, sectionPath } from '../../src/release-routes';

export const escapeHtml = (value: string): string => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export interface PageContext { book: PublicationBook; site: string }
export interface Page { path: string; html: string; title: string; description: string; canonical: string }

const formatOf = (section: PublicationSection): 'markdown' | 'html' => section.format === 'html' ? 'html' : 'markdown';
const flatten = (sections: readonly PublicationSection[]): PublicationSection[] => sections.flatMap(section => [section, ...flatten(section.children ?? [])]);
const startsWithTitle = (content: string, format: 'markdown' | 'html'): boolean => format === 'html' ? /^\s*<h1[\s>]/i.test(content) : /^\s*#[ \t]+\S/.test(content);
export const pageUrl = (site: string, id?: string): string => id ? `${site}${sectionPath(id).slice(1)}` : site;
const trim = (text: string, max = 200): string => {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).replace(/\s+\S*$/, '')}…`;
};

function contents(sections: readonly PublicationSection[], site: string): string {
  return `<ol>${sections.map(section => `<li><a href="${escapeHtml(pageUrl(site, section.id))}">${escapeHtml(section.title)}</a>${section.children?.length ? contents(section.children, site) : ''}</li>`).join('')}</ol>`;
}
function agentLinks({ book, site }: PageContext): string {
  const links = agentBookLinks(`${site}agent/`, book.id);
  return `<nav aria-label="Text for assistants"><p>Plain-text copies for assistants: <a href="${site}llms.txt">llms.txt</a> · <a href="${escapeHtml(links.index)}">index</a> · <a href="${escapeHtml(links.full)}">full text</a> · <a href="${escapeHtml(links.manifest)}">manifest</a></p></nav>`;
}
function header({ book, site }: PageContext, link: boolean): string {
  const title = escapeHtml(publicationDisplayTitle(book));
  return `<header><p>${link ? `<a href="${site}">${title}</a>` : title}</p><p>By ${escapeHtml(book.author)}</p></header>`;
}
const licence = (book: PublicationBook): string => book.home?.license && safePublicationHref(book.home.license.href) ? `<p>Licence: <a href="${escapeHtml(book.home.license.href)}">${escapeHtml(book.home.license.label)}</a>.</p>` : '';
const wrap = (inner: string): string => `<div class="static-book">${inner}</div>`;

export function rootPage(context: PageContext): Page {
  const { book, site } = context;
  const title = publicationDisplayTitle(book);
  const html = wrap(`<main><h1>${escapeHtml(title)}</h1><p>By ${escapeHtml(book.author)}</p><p>${escapeHtml(book.description)}</p>${licence(book)}${book.home?.authorNote ? `<p>${escapeHtml(book.home.authorNote)}</p>` : ''}<nav aria-label="Contents"><h2>Contents</h2>${contents(book.sections, site)}</nav>${agentLinks(context)}</main>`);
  return { path: 'index.html', html, title, description: trim(book.description), canonical: site };
}

export function sectionPage(context: PageContext, section: PublicationSection): Page {
  const { book, site } = context;
  const all = flatten(book.sections);
  const ids = new Set(all.map(entry => entry.id));
  const index = all.indexOf(section);
  const previous = all[index - 1], next = all[index + 1];
  const format = formatOf(section);
  const link = (target: PublicationSection | undefined, label: string): string => target ? `<a href="${escapeHtml(pageUrl(site, target.id))}">${label}: ${escapeHtml(target.title)}</a>` : '';
  const rendered = section.content.trim()
    ? rewriteReaderLinksInHtml(renderPublicationContent(section.content, format), {
      bookId: book.id, has: id => ids.has(id), chapter: id => pageUrl(site, id), index: site, unresolved: () => undefined })
    : `<p>This section has no text of its own. It contains:</p>${contents(section.children ?? [], site)}`;
  const heading = section.content.trim() && startsWithTitle(section.content, format) ? '' : `<h1>${escapeHtml(section.title)}</h1>`;
  const text = section.content.trim() ? publicationContentToText(section.content, format) : '';
  const pageTitle = `${section.title} — ${publicationDisplayTitle(book)}`;
  const html = wrap(`${header(context, true)}<main><article>${heading}${rendered}</article><nav aria-label="Next and previous">${link(previous, 'Previous')} ${link(next, 'Next')} <a href="${site}">Contents</a></nav></main>${licence(book)}${agentLinks(context)}`);
  return { path: `${sectionPath(section.id).slice(1)}index.html`, html, title: pageTitle, description: trim(text || book.description), canonical: pageUrl(site, section.id) };
}

/** A previous-site address: a small page that names its new address, with the canonical link and a refresh, so a static host needs no redirect rules. */
export function aliasPage(context: PageContext, aliasPath: string, id: string, title: string): Page {
  const target = pageUrl(context.site, id);
  const html = wrap(`<main><p>This address moved to <a href="${escapeHtml(target)}">${escapeHtml(title)}</a>.</p></main>`);
  return { path: `${aliasPath.slice(1)}index.html`, html, title: `${title} — ${publicationDisplayTitle(context.book)}`, description: trim(context.book.description), canonical: target };
}

export function allPages(context: PageContext): { pages: Page[]; aliases: Page[] } {
  const all = flatten(context.book.sections);
  const byId = new Map(all.map(section => [section.id, section]));
  return {
    pages: [rootPage(context), ...all.map(section => sectionPage(context, section))],
    aliases: aliasRoutes(context.book.id, sectionIdsOf(context.book.sections)).map(route => aliasPage(context, route.path, route.id, byId.get(route.id)!.title)),
  };
}

/** The `<head>` additions of one page: description, canonical, robots, social cards, and for the root a Book description in JSON-LD. */
export function headTags(context: PageContext, page: Page, options: { alias: boolean; cover?: string }): string {
  const { book, site } = context;
  const links = agentBookLinks(`${site}agent/`, book.id);
  const jsonLd = page.path === 'index.html' ? `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Book', name: publicationDisplayTitle(book), author: { '@type': 'Person', name: book.author },
    description: book.description, url: site, inLanguage: book.language ?? 'en', ...(book.home?.license && safePublicationHref(book.home.license.href) ? { license: book.home.license.href } : {}),
  }).replace(/</g, '\\u003c')}</script>` : '';
  const tag = (name: string, value: string, attribute = 'name'): string => `<meta ${attribute}="${name}" content="${escapeHtml(value)}">`;
  return [
    tag('description', page.description), `<link rel="canonical" href="${escapeHtml(page.canonical)}">`,
    tag('robots', options.alias ? 'noindex, follow' : 'index, follow'),
    tag('og:type', page.path === 'index.html' ? 'book' : 'article', 'property'), tag('og:title', page.title, 'property'), tag('og:description', page.description, 'property'),
    tag('og:url', page.canonical, 'property'), ...(options.cover ? [tag('og:image', options.cover, 'property'), tag('twitter:card', 'summary_large_image')] : []),
    `<link rel="alternate" type="text/plain" href="${site}llms.txt" title="llms.txt">`,
    `<link rel="alternate" type="text/markdown" href="${escapeHtml(links.full)}" title="Full text">`,
    ...(options.alias ? [`<meta http-equiv="refresh" content="0; url=${escapeHtml(page.canonical)}">`] : []), jsonLd,
  ].filter(Boolean).join('\n    ');
}

/** A page without the reader bundle, for addresses the reader does not own (`404.html`, Linguistics `about/` and `download/`). The reader would
 * replace its text on mount, so these pages carry no script. `main` is trusted markup: generated here, or verbatim from a pinned previous page. */
export function standalonePage(context: PageContext, page: { title: string; description: string; canonical?: string; main: string }): string {
  const { book } = context;
  return `<!doctype html>
<html lang="${escapeHtml(book.language ?? 'en')}">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(page.title)}</title>
    <meta name="description" content="${escapeHtml(page.description)}">
    ${page.canonical ? `<link rel="canonical" href="${escapeHtml(page.canonical)}">\n    ` : ''}<meta name="robots" content="noindex, follow">
  </head>
  <body>
    ${wrap(`${header(context, true)}<main>${page.main}</main>${licence(book)}${agentLinks(context)}`)}
  </body>
</html>
`;
}
/** The text of a not-found page where the previous site had none of its own. */
export const notFoundMain = (site: string): string => `<h1>Page not found</h1><p>There is no page at this address. Try the <a href="${site}">contents</a>.</p>`;

export const sitemap = (context: PageContext, pages: readonly Page[]): string =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(page => `  <url><loc>${escapeHtml(page.canonical)}</loc></url>`).join('\n')}\n</urlset>\n`;
export const robots = (site: string): string => `User-agent: *\nAllow: /\n\nSitemap: ${site}sitemap.xml\n`;
export { readerLink };
