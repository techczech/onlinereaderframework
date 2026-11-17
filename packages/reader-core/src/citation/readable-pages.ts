import type { PublicationBook, PublicationSection } from '../original/types.js';
import { renderPublicationContent } from '../publication-content/index.js';
import { citationHead, citeBlockHtml } from './citation.js';
import { publicationCitation, type PublicationCitationOptions } from './publication-citation.js';

/** Complete no-JavaScript book pages. Hosts may add their shell, stylesheet and reader bundle. */
export function buildReadableBookPages(book: PublicationBook, options: PublicationCitationOptions = {}) {
  const sections: PublicationSection[] = book.sections.flatMap(function walk(section): PublicationSection[] { return [section, ...(section.children ?? []).flatMap(walk)]; });
  const root = publicationCitation(book, undefined, options);
  const esc = (value: string) => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const records = [root, ...sections.map(section => publicationCitation(book, section, options))];
  return records.map((page, index) => {
    const section = sections[index - 1];
    const content = section ? renderPublicationContent(section.content, section.format ?? 'markdown')
      : `<p>${esc(book.description)}</p><nav aria-label="Contents"><ol>${sections.map((unit, i) => `<li><a href="${esc(records[i + 1].url)}">${esc(unit.title)}</a></li>`).join('')}</ol></nav>`;
    const head = `<title>${esc(page.title)}</title><link rel="canonical" href="${esc(page.url)}"><meta name="description" content="${esc(book.description)}">${citationHead(page)}`;
    const body = `<main><h1>${esc(page.title)}</h1>${content}${citeBlockHtml(page)}</main>`;
    return { path: section ? encodeURIComponent(section.id) + '/index.html' : 'index.html', page, head, body,
      html: `<!doctype html><html lang="${esc(page.language!)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">${head}</head><body>${body}</body></html>` };
  });
}
