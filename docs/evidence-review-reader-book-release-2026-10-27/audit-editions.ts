/** Read-only audit of the three built single-book editions in build/release-books/ (review 2026-10-27).
 * Reads the built folders, their manifests, the demo source and the old Linguistics dist; writes only audit-editions.json beside this file.
 * Run from the repository root: apps/reader-demo/node_modules/.bin/tsx docs/evidence-review-reader-book-release-2026-10-27/audit-editions.ts */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PublicationBook, PublicationSection } from '../../packages/reader-core/src/original/types';
import { publicationContentToText } from '../../packages/reader-core/src/publication-content/index';
import { publicationDisplayTitle } from '../../packages/reader-core/src/original/publication-model';
import publications from '../../apps/reader-demo/src/books/original-publications.json';
import { canonicalSites } from '../../apps/reader-demo/src/canonical-sites';
import { aliasRoutes, sectionForPath, sectionIdsOf, sectionPath } from '../../apps/reader-demo/src/release-routes';
import { allPages } from '../../apps/reader-demo/scripts/release/static-pages';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../..');
const releaseRoot = path.join(repo, 'build', 'release-books');
const oldLinguistics = path.resolve(repo, '../linguistics-stack-exchange-answers/dist');
const books = publications as PublicationBook[];
const flat = (s: readonly PublicationSection[]): PublicationSection[] => s.flatMap(x => [x, ...flat(x.children ?? [])]);
const TEXT = /\.(html|js|css|json|md|txt|xml|svg)$/;
const RESERVED = ['agent', 'assets', 'covers', 'answers', 'sections', 'index.html', 'llms.txt', 'robots.txt', 'sitemap.xml'];
const PRIVATE: [string, RegExp][] = [
  ['users-path', /\/Users\//], ['private-var', /\/private\/var\//], ['home-path', /\/home\/[a-z]/], ['gitrepos', /gitrepos/i], ['onedrive', /onedrive/i],
  ['username-not-domain', /dominiklukes(?!\.net)/i], ['gmail', /@gmail\.com/i], ['localhost', /localhost/], ['loopback', /127\.0\.0\.1/],
  ['rfc1918', /\b(?:10\.\d{1,3}|192\.168|172\.(?:1[6-9]|2\d|3[01]))\.\d{1,3}\.\d{1,3}\b/], ['tailscale-cgnat', /\b100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.\d{1,3}\.\d{1,3}\b/],
  ['ts-net', /\.ts\.net/], ['file-url', /file:\/\//], ['source-map', /sourceMappingURL/], ['private-key', /BEGIN [A-Z ]*PRIVATE KEY/], ['api-key-shape', /\b(?:sk-[A-Za-z0-9]{20,}|ghp_[A-Za-z0-9]{20,}|AKIA[0-9A-Z]{16})\b/],
];

function* walk(dir: string): Generator<string> {
  for (const e of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const full = path.join(dir, e.name);
    if (e.isSymbolicLink()) { yield `SYMLINK:${full}`; continue; }
    if (e.isDirectory()) yield* walk(full); else yield full;
  }
}
const sha = (b: Buffer | string): string => crypto.createHash('sha256').update(b).digest('hex');

const report: Record<string, unknown> = { generated: new Date().toISOString(), repo, releaseRoot };
// Physical path chain of the release root: any symlink here would let Vite's emptyOutDir empty a folder elsewhere.
report.releaseRootChain = ['build', 'build/release-books', ...books.map(b => `build/release-books/${b.id}`)].map(rel => {
  const p = path.join(repo, rel); const st = fs.lstatSync(p, { throwIfNoEntry: false });
  return { rel, exists: !!st, symlink: st?.isSymbolicLink() ?? false, realpathEqualsLexical: st ? fs.realpathSync(p) === p : null };
});

// Section ids: encoding, dot segments, case collisions (macOS file system is case-insensitive), reserved top-level names.
report.sectionIds = books.map(book => {
  const ids = sectionIdsOf(book.sections);
  const lower = new Map<string, string[]>();
  for (const id of ids) lower.set(id.toLowerCase(), [...(lower.get(id.toLowerCase()) ?? []), id]);
  return { book: book.id, count: ids.length, duplicates: ids.length - new Set(ids).size,
    needEncoding: ids.filter(id => encodeURIComponent(id) !== id), dotOrEmpty: ids.filter(id => id === '' || id === '.' || id === '..'),
    caseCollisions: [...lower.values()].filter(v => v.length > 1), reservedNames: ids.filter(id => RESERVED.includes(id)),
    longestBytes: Math.max(...ids.map(id => Buffer.byteLength(id))), aliasCollidesWithSection: aliasRoutes(book.id, ids).filter(r => ids.some(id => sectionPath(id) === r.path)).map(r => r.path) };
});

const editions = [];
for (const book of books) {
  const site = canonicalSites[book.id];
  const outDir = path.join(releaseRoot, book.id);
  const manifest = JSON.parse(fs.readFileSync(path.join(releaseRoot, `${book.id}.manifest.json`), 'utf8'));
  const all = [...walk(outDir)];
  const symlinks = all.filter(f => f.startsWith('SYMLINK:'));
  const files = all.filter(f => !f.startsWith('SYMLINK:'));
  const rel = (f: string): string => path.relative(outDir, f).split(path.sep).join('/');
  const listing = files.map(f => { const b = fs.readFileSync(f); return { path: rel(f), bytes: b.length, sha256: sha(b) }; });
  const tree = sha(listing.map(f => `${f.sha256}  ${f.path}`).join('\n'));
  const manifestMatchesDisk = JSON.stringify(listing) === JSON.stringify(manifest.files);
  const others = books.filter(o => o.id !== book.id);
  const ownIds = new Set(sectionIdsOf(book.sections));
  // Other books: every section id (any length), titles, descriptions, addresses, and a 60-character plain-text probe from every section with text.
  const probes: { kind: string; book: string; value: string }[] = [];
  for (const o of others) {
    for (const id of sectionIdsOf(o.sections)) if (!ownIds.has(id) && id.length >= 6) probes.push({ kind: 'section-id', book: o.id, value: id });
    probes.push({ kind: 'title', book: o.id, value: o.title }, { kind: 'description', book: o.id, value: o.description.slice(0, 60) }, { kind: 'site', book: o.id, value: canonicalSites[o.id].replace(/\/$/, '') });
    if (o.sourceUrl) probes.push({ kind: 'sourceUrl', book: o.id, value: o.sourceUrl.replace(/\/$/, '') });
    for (const s of flat(o.sections)) {
      const text = s.content.trim() ? publicationContentToText(s.content, s.format === 'html' ? 'html' : 'markdown').replace(/\s+/g, ' ').trim() : '';
      if (text.length >= 120) probes.push({ kind: 'manuscript-text', book: o.id, value: text.slice(40, 100) });
    }
  }
  const leaks: { file: string; kind: string; book: string; value: string }[] = [];
  const privateHits: { file: string; rule: string; sample: string }[] = [];
  const htmlProblems: { file: string; problem: string; sample: string }[] = [];
  const externalLoads = new Set<string>();
  const ownLinks = new Set<string>();
  const markerLeft: string[] = [];
  const notion: string[] = [];
  const iconSvg = fs.readFileSync(path.join(repo, 'apps/reader-demo/src/books/assets/command-line_gray.svg'), 'utf8');
  const iconProbe = iconSvg.replace(/\s+/g, ' ').slice(0, 80);
  const nonText: string[] = [];
  for (const f of files) {
    const name = rel(f);
    const buf = fs.readFileSync(f);
    if (buf.includes('command-line_gray') || buf.includes('notion.so') || buf.includes(iconProbe)) notion.push(name);
    if (!TEXT.test(name)) { nonText.push(name); continue; }
    const text = buf.toString('utf8');
    for (const p of probes) if (text.includes(p.value)) leaks.push({ file: name, ...p, value: p.value.slice(0, 80) });
    for (const [rule, re] of PRIVATE) { const m = re.exec(text); if (m) privateHits.push({ file: name, rule, sample: text.slice(Math.max(0, m.index - 40), m.index + 60) }); }
    if (/<!--ORF_(HEAD|BODY)-->/.test(text)) markerLeft.push(name);
    for (const m of text.matchAll(new RegExp(`${site.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}[^\\s"'<>)\\]\\\\]*`, 'g'))) ownLinks.add(m[0]);
    if (name.endsWith('.html')) {
      for (const m of text.matchAll(/<script\b[^>]*>/gi)) if (!/^<script type="module" crossorigin src="\/assets\/[\w.-]+\.js"><\/?/.test(m[0] + '<') && m[0] !== '<script type="application/ld+json">') htmlProblems.push({ file: name, problem: 'unexpected script tag', sample: m[0] });
      for (const m of text.matchAll(/<[a-z][^>]*\son[a-z]+\s*=/gi)) htmlProblems.push({ file: name, problem: 'event handler attribute', sample: m[0].slice(0, 120) });
      for (const m of text.matchAll(/(?:href|src|action|formaction|data|poster)\s*=\s*["']?\s*(?:javascript|vbscript|data:text\/html)/gi)) htmlProblems.push({ file: name, problem: 'script URL', sample: m[0] });
      for (const m of text.matchAll(/<(iframe|object|embed|form|base|frame|svg[^>]*onload)\b/gi)) htmlProblems.push({ file: name, problem: `element ${m[1]}`, sample: m[0] });
      const refresh = /http-equiv="refresh"/.test(text), isAlias = /^(answers|sections)\//.test(name);
      if (refresh !== isAlias) htmlProblems.push({ file: name, problem: 'refresh on non-alias or missing on alias', sample: String(refresh) });
      const ld = [...text.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
      for (const m of ld) { try { JSON.parse(m[1]); } catch { htmlProblems.push({ file: name, problem: 'invalid JSON-LD', sample: m[1].slice(0, 80) }); } }
      for (const m of text.matchAll(/\s(?:src|srcset)\s*=\s*"(https?:\/\/[^"/]+)/gi)) externalLoads.add(m[1]);
      const canon = [...text.matchAll(/<link rel="canonical" href="([^"]+)">/g)];
      if (canon.length !== 1) htmlProblems.push({ file: name, problem: `canonical count ${canon.length}`, sample: '' });
      else if (!canon[0][1].startsWith(site)) htmlProblems.push({ file: name, problem: 'canonical outside site', sample: canon[0][1] });
    }
  }
  // Every same-site address named in any shipped text file resolves to a shipped file (path/ means path/index.html).
  const decoded = (p: string): string => { try { return decodeURIComponent(p); } catch { return p; } };
  const brokenOwnLinks = [...ownLinks].map(u => u.replace(/[.,;:]+$/, '')).filter(u => {
    const p = new URL(u).pathname.slice(1);
    const candidate = p === '' || p.endsWith('/') ? `${p}index.html` : p;
    return !fs.existsSync(path.join(outDir, decoded(candidate))) && !fs.existsSync(path.join(outDir, candidate));
  });
  // Pages as generated vs pages as shipped: the shipped HTML must contain each page's body verbatim (catches String.replace `$` patterns).
  const { pages, aliases } = allPages({ book, site });
  const bodyMismatch = [...pages, ...aliases].filter(p => { const f = path.join(outDir, p.path); return !fs.existsSync(f) || !fs.readFileSync(f, 'utf8').includes(p.html); }).map(p => p.path);
  const dollarPatterns = [...pages, ...aliases].filter(p => /\$[$&'`]/.test(p.html + p.title + p.description)).map(p => p.path);
  // Routes: every section folder and alias page is understood by the browser mapping and points at an existing page.
  const ids = sectionIdsOf(book.sections);
  const routeProblems: string[] = [];
  for (const id of ids) {
    if (sectionForPath(book.id, sectionPath(id), ids) !== id) routeProblems.push(`section path ${sectionPath(id)} does not map back`);
    if (!fs.existsSync(path.join(outDir, sectionPath(id).slice(1), 'index.html'))) routeProblems.push(`no page for ${id}`);
  }
  for (const r of aliasRoutes(book.id, ids)) {
    const page = path.join(outDir, r.path.slice(1), 'index.html');
    if (sectionForPath(book.id, r.path, ids) !== r.id) routeProblems.push(`alias ${r.path} maps elsewhere`);
    if (!fs.existsSync(page) || !fs.readFileSync(page, 'utf8').includes(`<link rel="canonical" href="${site}${sectionPath(r.id).slice(1)}">`)) routeProblems.push(`alias ${r.path} canonical wrong`);
  }
  const topLevel = fs.readdirSync(outDir).sort();
  const unexpectedTop = topLevel.filter(n => !ownIds.has(n) && !['agent', 'assets', 'covers', 'answers', 'sections', 'index.html', 'llms.txt', 'robots.txt', 'sitemap.xml'].includes(n));
  editions.push({ book: book.id, site, files: listing.length, bytes: listing.reduce((s, f) => s + f.bytes, 0), treeSha256: tree, manifestTree: manifest.treeSha256,
    treeMatchesManifest: tree === manifest.treeSha256, manifestFileListMatchesDisk: manifestMatchesDisk, manifestHead: manifest.sourceHead, manifestDirty: manifest.sourceTreeDirty, manifestFailures: manifest.checks?.failures,
    symlinks, nonTextFiles: nonText.filter(n => !/^assets\/.*\.(woff2?|ttf)$/.test(n)), fontFiles: nonText.filter(n => /\.(woff2?|ttf)$/.test(n)).length,
    probesRun: probes.length, leaks, privateHits, htmlProblems, externalLoads: [...externalLoads], markerLeft, notionIconFiles: notion,
    ownLinksChecked: ownLinks.size, brokenOwnLinks: brokenOwnLinks.slice(0, 50), brokenOwnLinkCount: brokenOwnLinks.length,
    pagesBodyNotVerbatim: bodyMismatch, pagesWithDollarPatterns: dollarPatterns, routeProblems, unexpectedTopLevel: unexpectedTop,
    rootTitle: publicationDisplayTitle(book) });
}
report.editions = editions;

// Old Linguistics site: which of its public paths the new edition keeps (read-only listing of the old dist).
if (fs.existsSync(oldLinguistics)) {
  const out = path.join(releaseRoot, 'linguistics');
  const old = [...walk(oldLinguistics)].filter(f => !f.startsWith('SYMLINK:')).map(f => path.relative(oldLinguistics, f).split(path.sep).join('/'));
  const missing = old.filter(p => !fs.existsSync(path.join(out, p)));
  const group = (p: string): string => p.startsWith('answers/') ? (p.endsWith('.md') ? 'answers/<id>.md' : 'answers/<id>/index.html') : p.startsWith('sections/') ? (p.endsWith('.md') ? 'sections/<name>.md' : 'sections/<name>/index.html') : p.startsWith('pagefind/') ? 'pagefind/*' : p.startsWith('assets/') ? 'assets/*' : p;
  const counts: Record<string, { old: number; missing: number }> = {};
  for (const p of old) { const g = group(p); counts[g] ??= { old: 0, missing: 0 }; counts[g].old++; }
  for (const p of missing) counts[group(p)].missing++;
  report.oldLinguisticsSite = { dist: oldLinguistics, files: old.length, byGroup: counts };
}
fs.writeFileSync(path.join(here, 'audit-editions.json'), `${JSON.stringify(report, null, 2)}\n`);
for (const e of editions) console.log(e.book, e.files, e.treeSha256.slice(0, 12), 'manifest', e.treeMatchesManifest, 'leaks', e.leaks.length, 'private', e.privateHits.length, 'html', e.htmlProblems.length, 'broken', e.brokenOwnLinkCount, 'notVerbatim', e.pagesBodyNotVerbatim.length, 'routes', e.routeProblems.length);
