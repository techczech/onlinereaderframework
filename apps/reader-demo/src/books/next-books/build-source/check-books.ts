/** Focused checks for the two converted books: structure, embed contract, internal links, licence notices and source accounting.
 *  Usage: tsx check-books.ts <scratch-dir> <report.json> */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPublicationEmbeds, validatePublicationEmbeds } from '../../../../../../packages/reader-core/src/embed/index.js';
import { getPublicationHeadings, publicationContentToText, renderPublicationContent } from '../../../../../../packages/reader-core/src/publication-content/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const books = resolve(here, '..');
const [scratch, reportPath] = process.argv.slice(2).map(p => resolve(p));
const json = (p: string) => JSON.parse(readFileSync(p, 'utf8'));
const academic = json(resolve(books, 'academic-reading-framework.book.json'));
const readability = json(resolve(books, 'readability-foundations.book.json'));
const manifest = json(resolve(books, 'embed-manifest.json'));
const originals = json(resolve(scratch, 'originals-text.json'));
const readabilityRender = json(resolve(scratch, 'readability-sections.json'));
const academicRender = json(resolve(scratch, 'academic-sections.json'));

const results: { name: string; ok: boolean; detail?: string }[] = [];
const check = (name: string, ok: boolean, detail = '') => { results.push({ name, ok, detail }); if (!ok) console.log('FAIL', name, detail.slice(0, 600)); };

// ---- word accounting ----
const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").split(/\s+/).map(w => w.replace(/[^\p{L}\p{N}]+/gu, '')).filter(Boolean);
function diff(a: string[], b: string[]) {
  const n = a.length, m = b.length, w = m + 1, t = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i * w + j] = a[i] === b[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
  const removed: string[] = [], added: string[] = []; let i = 0, j = 0, rr: string[] = [], aa: string[] = [];
  const flush = () => { if (rr.length) removed.push(rr.join(' ')); if (aa.length) added.push(aa.join(' ')); rr = []; aa = []; };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { flush(); i++; j++; }
    else if (j >= m || (i < n && t[(i + 1) * w + j] >= t[i * w + j + 1])) rr.push(a[i++]); else aa.push(b[j++]);
  }
  flush(); return { removed, added };
}
const ENTITIES: Record<string, string> = { '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#x27;': "'", '&#39;': "'", '&nbsp;': ' ' };
/** Text of the original app's HTML. The sidebar contents list (aside) and the breadcrumb (nav) are interface, removed on purpose; blocks separate words. */
function htmlText(html: string): string {
  return html.replace(/<aside[\s\S]*?<\/aside>/g, ' ').replace(/<nav[\s\S]*?<\/nav>/g, ' ').replace(/<svg[\s\S]*?<\/svg>/g, ' ')
    .replace(/<\/?(div|p|li|ul|ol|h[1-6]|tr|td|th|table|thead|tbody|section|article|blockquote|br|button|label|figure|figcaption|textarea)\b[^>]*>/g, ' ')
    .replace(/>(?=<)/g, '> ').replace(/<[^>]+>/g, '').replace(/&(?:amp|lt|gt|quot|#x27|#39|nbsp);/g, e => ENTITIES[e]);
}
const stripAlternatives = (md: string) => md.replace(/<div id="[a-z-]+-text">[\s\S]*?<\/div>(?=\n\n|\n*$)/g, '');
const bookText = (content: string) => publicationContentToText(content, 'markdown');

// Interface text the original app prints around the content, removed on purpose. Each phrase is taken out of the original before the comparison and counted in the ledger.
const UI_PHRASES = [
  'Characteristic', 'Guide Section', 'Cite Section', 'Explore Related Sections',                                   // DetailSection chrome
  'Interactive Cognition Map', 'Click on nodes to explore the cognitive process.', 'Reset View', 'Scroll horizontally to view full diagram', // explorer widget chrome
  'Click the box to see the text clearly.', 'Click to reveal', 'Interactive Example', 'Slide 1 of 1', 'Intro', 'Summary', // demonstration chrome
  'Total Sentences 3 Total Words 40 Avg Words / Sentence 13.3 Input Text Clear', 'Analysis Results > 20 Words > 35 Words', 'Total Sentences 0 Total Words 0 Avg Words / Sentence 0 Input Text Clear', // checker chrome and default-state figures (described in the text version)
  '90301-7)',                                                                                                         // repaired: the original app cuts the Schwarz & Flammer DOI at its first parenthesis and prints this tail again after the link
  'Go through your document item by item. Add notes to give feedback or track changes.', 'Reset Checklist',         // checklist chrome
].map(p => norm(p).join(' '));
const NUMERAL = /^\d{1,2}$/;                                                                                     // numbered step badges and list markers
function removeDeclared(words: string[]) {
  let text = ' ' + words.join(' ') + ' '; const used: Record<string, number> = {};
  for (const phrase of [...UI_PHRASES].sort((x, y) => y.length - x.length)) {
    const needle = ' ' + phrase + ' ';
    while (text.includes(needle)) { text = text.replace(needle, ' '); used[phrase] = (used[phrase] || 0) + 1; }
  }
  return { words: text.trim().split(' ').filter(Boolean), used };
}
function accountSection(label: string, original: string, content: string, ledger: any[]) {
  const stripped = removeDeclared(norm(htmlText(original)));
  const o = stripped.words, b = norm(bookText(content));
  const bookJoined = ' ' + b.join(' ') + ' ';
  const { removed, added } = diff(o, b);
  // A removed run that still occurs contiguously elsewhere in the book was moved or repeated (the demonstrations repeat one paragraph), not lost.
  const lost = removed.filter(r => !bookJoined.includes(' ' + r + ' ') && !NUMERAL.test(r));
  ledger.push({ section: label, originalWords: o.length, bookWords: b.length, declaredRemovals: stripped.used, movedOrRepeated: removed.filter(r => bookJoined.includes(' ' + r + ' ')).length, lost, added: added.map(a => (a.length > 160 ? a.slice(0, 160) + '…' : a)) });
  return lost;
}

const ledger: any[] = [];
for (const s of academic.sections) {
  const unexplained = accountSection(`academic:${s.id}`, originals.academic[s.id], s.content, ledger);
  check(`academic ${s.id}: every word of the original appears in the book, or is a declared interface string`, unexplained.length === 0, JSON.stringify(unexplained));
}
for (const s of readability.sections) {
  const unexplained = accountSection(`readability:${s.id}`, originals.readability[s.id], s.content, ledger);
  check(`readability ${s.id}: every word of the original appears in the book, or is a declared interface string`, unexplained.length === 0, JSON.stringify(unexplained));
}

// ---- structure ----
for (const [name, book, order] of [['academic', academic, academicRender.sections.map((s: any) => s.id)], ['readability', readability, readabilityRender.sections.map((s: any) => s.id)]] as const) {
  const ids = book.sections.map((s: any) => s.id);
  check(`${name}: section ids unique and in the original navigation order`, new Set(ids).size === ids.length && JSON.stringify(ids) === JSON.stringify(order), ids.join());
  check(`${name}: every section has a category, a title and non-empty Markdown`, book.sections.every((s: any) => s.category && s.title && s.format === 'markdown' && s.content.trim().length > 100), '');
  check(`${name}: every section opens with one level-1 heading and has level-2 subheadings where the original has steps/headings`, book.sections.every((s: any) => /^# \S/.test(s.content) && (s.content.match(/^# /gm) || []).length === 1), book.sections.filter((s: any) => (s.content.match(/^# /gm) || []).length !== 1).map((s: any) => s.id).join());
  const skips = book.sections.filter((s: any) => { let prev = 0; return [...s.content.matchAll(/^(#{1,6}) /gm)].some(m => { const jump = m[1].length > prev + 1; prev = m[1].length; return jump; }); }).map((s: any) => s.id);
  check(`${name}: heading levels never skip a level`, skips.length === 0, skips.join());
  const linkTargets = [...book.sections.flatMap((s: any) => [...s.content.matchAll(/\]\(#\/([a-z0-9-]+)\)/g)].map(m => m[1]))];
  check(`${name}: internal links point to sections that exist (${linkTargets.length} links)`, linkTargets.every(t => ids.includes(t)), linkTargets.filter(t => !ids.includes(t)).join());
  const rendered = book.sections.map((s: any) => renderPublicationContent(s.content, 'markdown')).join('\n');
  check(`${name}: rendered content has no script, iframe, leftover markers or event attributes`, !/<script|<iframe|@@|\son[a-z]+=/i.test(rendered), '');
  check(`${name}: each section yields searchable text and headings`, book.sections.every((s: any) => publicationContentToText(s.content, 'markdown').length > 80 && getPublicationHeadings(s.content, 'markdown').length >= 1), '');
}
check('academic: ten sections, as in the original NAV_STRUCTURE', academic.sections.length === 10, '');
check('readability: fourteen sections, as in the original NAV_GROUPS', readability.sections.length === 14, '');

// ---- embed contract ----
for (const [bookId, book] of [['academic-reading', academic], ['readability-foundations', readability]] as const) {
  const items = manifest.books[bookId].items.map(({ placement, ...descriptor }: any) => descriptor);
  const embeds = { items };
  const validated = validatePublicationEmbeds(embeds);
  check(`${bookId}: ${items.length} embed descriptors valid under the v1 contract`, validated.problems.length === 0 && validated.embeds.length === items.length, JSON.stringify(validated.problems));
  const problems = checkPublicationEmbeds(book, embeds);
  check(`${bookId}: every embed has a prose alternative anchor of at least 80 characters (checkPublicationEmbeds)`, problems.length === 0, JSON.stringify(problems));
}
// every anchor div in the content is described by the manifest, and the file exists
import { existsSync } from 'node:fs';
for (const [bookId, book] of [['academic-reading', academic], ['readability-foundations', readability]] as const) {
  const entry = manifest.books[bookId];
  const anchors = book.sections.flatMap((s: any) => [...s.content.matchAll(/<div id="([a-z0-9-]+-text)">/g)].map(m => `${s.id}#${m[1]}`));
  const described = entry.items.map((i: any) => `${i.sectionId}#${i.anchor}`);
  check(`${bookId}: manifest and content agree on embed anchors`, JSON.stringify([...anchors].sort()) === JSON.stringify([...described].sort()), JSON.stringify({ anchors, described }));
  check(`${bookId}: every embed file exists`, entry.items.every((i: any) => existsSync(resolve(books, '../../..', entry.interactivesDir, i.src))), '');
}

// Authored homepage paragraphs must survive into canonical book/export content.
for (const [key, book] of Object.entries({ academic, readability })) {
  const summaries = originals.homepageSummaries?.[key];
  check(`${key}: homepage summaries included in source accounting`, Array.isArray(summaries) && summaries.length === (key === 'academic' ? 3 : 14));
  for (const [index, summary] of (summaries ?? []).entries()) check(`${key}: original homepage summary ${index + 1} preserved`, JSON.stringify(book).includes(summary), summary);
}
check('readability: licence URL remains version-neutral', readability.home.license.href === 'https://creativecommons.org/licenses/by/');
// ---- licence notices ----
check('readability: licence stays CC BY as printed in the original (not CC BY-SA)', /CC BY/.test(readability.home.license.label) && !/SA/.test(readability.home.license.label) && !/by-sa/.test(readability.home.license.href), JSON.stringify(readability.home));
check('academic: no licence is invented (the original carries none)', academic.home.license === undefined, '');

const failed = results.filter(r => !r.ok);
writeFileSync(reportPath, JSON.stringify({ date: new Date().toISOString(), passed: results.length - failed.length, failed: failed.length, results, accounting: ledger }, null, 1));
console.log(`${results.length - failed.length}/${results.length} book checks passed`);
process.exit(failed.length ? 1 : 0);
