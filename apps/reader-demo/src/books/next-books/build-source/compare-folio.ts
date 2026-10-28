/** Compares each imported Folio chapter (read-only) with the corresponding converted book section, word by word.
 *  Usage: tsx compare-folio.ts <folio-root> <out.json> */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from './lib.js';
import { publicationContentToText } from '../../../../../../packages/reader-core/src/publication-content/index.js';

const here = dirname(fileURLToPath(import.meta.url));
const books = resolve(here, '..');
const [folioRoot, out] = process.argv.slice(2).map(p => resolve(p));
const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").split(/\s+/).map(w => w.replace(/[^\p{L}\p{N}]+/gu, '')).filter(Boolean);
function diff(a: string[], b: string[]) {
  const n = a.length, m = b.length, w = m + 1, t = new Uint16Array((n + 1) * w);
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) t[i * w + j] = a[i] === b[j] ? t[(i + 1) * w + j + 1] + 1 : Math.max(t[(i + 1) * w + j], t[i * w + j + 1]);
  const onlyA: string[] = [], onlyB: string[] = []; let i = 0, j = 0, ra: string[] = [], rb: string[] = [];
  const flush = () => { if (ra.length) onlyA.push(ra.join(' ')); if (rb.length) onlyB.push(rb.join(' ')); ra = []; rb = []; };
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { flush(); i++; j++; }
    else if (j >= m || (i < n && t[(i + 1) * w + j] >= t[i * w + j + 1])) ra.push(a[i++]); else rb.push(b[j++]);
  }
  flush(); return { onlyA, onlyB };
}
const clip = (s: string) => (s.length > 220 ? s.slice(0, 220) + '…' : s);
const summary: any[] = [];
for (const [slug, bookFile] of [['academic-reading-framework', 'academic-reading-framework.book.json'], ['readability-foundations', 'readability-foundations.book.json']] as const) {
  const book = JSON.parse(readFileSync(resolve(books, bookFile), 'utf8'));
  const structure = JSON.parse(readFileSync(resolve(folioRoot, slug, '_report-structure.json'), 'utf8'));
  if (structure.files.length !== book.sections.length) throw new Error(`${slug}: ${structure.files.length} Folio files, ${book.sections.length} sections`);
  structure.files.forEach((f: any, i: number) => {
    const path = resolve(folioRoot, slug, f.path);
    const raw = readFileSync(path, 'utf8');
    const body = raw.replace(/^---\n[\s\S]*?\n---\n/, '');
    const asides = (body.match(/<div class="aside">/g) || []).length;
    const permalinks = (body.match(/\[\]\(#[^)]*"Copy link to section"\)/g) || []).length;
    const plain = publicationContentToText(body, 'markdown'); // same text path as the reader; raw HTML tables count
    const section = book.sections[i];
    const a = norm(plain), b = norm(publicationContentToText(section.content, 'markdown'));
    const { onlyA, onlyB } = diff(a, b);
    summary.push({ book: slug, folioFile: f.path, folioSha256: sha256(path), section: section.id, folioWords: a.length, bookWords: b.length, folioOnlyRuns: onlyA.length, folioOnlyWords: onlyA.reduce((n, r) => n + r.split(' ').length, 0), bookOnlyRuns: onlyB.length, bookOnlyWords: onlyB.reduce((n, r) => n + r.split(' ').length, 0), sidebarAsides: asides, permalinkMarkers: permalinks, folioOnly: onlyA.slice(0, 40).map(clip), bookOnly: onlyB.slice(0, 40).map(clip) });
  });
}
writeFileSync(out, JSON.stringify({ description: 'Imported Folio chapters (read-only) against the converted sections. folioOnly = words printed in the Folio but not in the book; bookOnly = words in the book not in the Folio. Order inside a run is the Folio/book order.', chapters: summary }, null, 1));
for (const s of summary) console.log(`${s.book.slice(0, 8)} ${s.section.padEnd(26)} folio ${String(s.folioWords).padStart(5)} book ${String(s.bookWords).padStart(5)}  folio-only ${String(s.folioOnlyWords).padStart(4)}w/${s.folioOnlyRuns}r  book-only ${String(s.bookOnlyWords).padStart(4)}w/${s.bookOnlyRuns}r  asides ${s.sidebarAsides}`);
