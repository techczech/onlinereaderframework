/** Artefact checks of one built edition, read from disk after the build. Returns the failures (empty when every check passes); never throws on a check.
 * These are file-level checks (what is shipped, where it points); they do not replace running the edition in a browser.
 * - the folder holds exactly the planned files plus Vite's own `assets/`, no symbolic link, and every planned file byte for byte;
 * - every page has one `<html>`, `<head>` and `<title>`, its exact title and canonical link, and its generated body verbatim; no build marker remains;
 * - no other book: no title, description, address, long section id or sample of text of any other book, with the samples' method proven on this
 *   book's own bundle; no other book's embed or cover; no Notion icon; no private paths, source maps or demo leftovers. Another book's long section
 *   id is probed as a whole token, not inside a longer id or heading anchor (`cognitive-load` is not found in `reader-content-cognitive-load-model`);
 *   an id made only of letters (an ordinary word such as `accessibility`) is probed only where it acts as an identifier (`id`/`sectionId` values,
 *   `?section=`, `#/`, agent chapter file names, route folders under another book's address), not as a word in running text;
 * - an edition in a folder: every page loads its bundle from that folder, no bundle or stylesheet reference escapes it, its cover address is in it,
 *   and every `_headers` rule is scoped to it;
 * - a converted book's embeds: exactly its pinned documents under its own embed folder, each self-contained (no outside script, style, image, frame,
 *   font or network call), the embed rule present in `_headers`, and the descriptors in the bundle. */
import fs from 'node:fs';
import path from 'node:path';
import type { PublicationBook, PublicationSection } from '../../../../packages/reader-core/src/original/types';
import { demoEmbeds } from '../../src/books/demo-books';
import { plannedPaths, type EditionPlan } from './edition-plan';
import { EMBED_CONTENT_SECURITY_POLICY } from './headers';
import { escapeHtml } from './static-pages';
import { walkFiles } from './write-guard';

export interface EditionCheck { plan: EditionPlan; others: PublicationBook[]; otherSites: string[]; outDir: string }
const TEXT = /\.(html|js|css|json|md|txt|xml|svg)$|(^|\/)_headers$/;
const PRIVATE = [/\/Users\//, /\/private\/var\//, /100\.85\./, /127\.0\.0\.1/, /\.ts\.net/, /file:\/\//];
const ORIGINAL_ICON = [/notion\.so\/icons/, /command-line_gray/, /M15 3\.125H5c-1\.544/];
const flatten = (sections: readonly PublicationSection[]): PublicationSection[] => sections.flatMap(section => [section, ...flatten(section.children ?? [])]);
const equalBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
const count = (text: string, pattern: RegExp): number => text.match(new RegExp(pattern.source, 'g'))?.length ?? 0;
const escapeRegExp = (text: string): string => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Where another book's section id shows that book's structure, not a word: an `id`/`sectionId` value (JSON, JavaScript or HTML attribute, quotes
 * possibly escaped), a `?section=`/`&section=` value, a legacy `#/` route, an agent chapter file name, or a route folder under the other book's address. */
export function sectionIdPattern(id: string, otherSitePaths: readonly string[] = []): RegExp {
  const word = escapeRegExp(id);
  const quote = `(?:\\\\)*["'\`]`;
  const forms = [
    `(?<![A-Za-z0-9_$-])(?:id|sectionId|section_id|data-section-id)${quote}?\\s*[:=]\\s*${quote}${word}${quote}`,
    `[?&]section=${word}(?![A-Za-z0-9_-])`,
    `#\\/${word}(?![A-Za-z0-9_-])`,
    `chapters\\/${word}\\.md`,
    ...otherSitePaths.map(prefix => `${escapeRegExp(prefix)}${word}\\/`),
  ];
  return new RegExp(forms.join('|'));
}
/** A foreign book identity in a registry value, HTML attribute or keyed registry; ordinary prose is not an identity. */
export function bookIdPattern(id: string): RegExp {
  const word = escapeRegExp(id);
  const quote = `(?:\\\\)*["'\`]`;
  return new RegExp(`(?<![A-Za-z0-9_$-])(?:id|bookId|book_id|data-book-id)${quote}?\\s*[:=]\\s*${quote}${word}${quote}|${quote}${word}${quote}\\s*:\\s*\\{`);
}
/** Another book's section id as a whole token: not preceded or followed by a letter, digit, underscore or hyphen. */
export const sectionIdToken = (id: string): RegExp => new RegExp(`(?<![A-Za-z0-9_-])${escapeRegExp(id)}(?![A-Za-z0-9_-])`);
/** Probe text for another book's public address: its host, or its host and folder when the address is a folder (two books may share a host). */
export const sitePrefix = (address: string): string => { const url = new URL(address); return url.pathname === '/' ? url.host : `${url.host}${url.pathname}`; };

/** Up to `max` 60-character runs of plain letters, digits, spaces, commas and full stops from a book's raw text, spread over its sections.
 * These characters survive HTML, JSON and JavaScript escaping unchanged, so a run found in a file is the text itself. */
export function textSamples(book: PublicationBook, max = 40): string[] {
  const runs = flatten(book.sections).map(section => section.content.match(/[A-Za-z0-9,.][A-Za-z0-9 ,.]{58}[A-Za-z0-9,.]/)?.[0]).filter((run): run is string => !!run && !/ {2}/.test(run));
  const step = Math.max(1, runs.length / max);
  return Array.from({ length: Math.min(max, runs.length) }, (_, index) => runs[Math.floor(index * step)]);
}

export function verifyEdition({ plan, others, otherSites, outDir }: EditionCheck): string[] {
  const failures: string[] = [];
  const fail = (message: string): void => { failures.push(message); };
  const { book, site } = plan;
  let files: string[] = [];
  try { files = [...walkFiles(outDir)].map(file => path.relative(outDir, file).split(path.sep).join('/')); } catch (error) { fail((error as Error).message); return failures; }
  const onDisk = new Set(files);
  const bytes = (name: string): Buffer | undefined => onDisk.has(name) ? fs.readFileSync(path.join(outDir, name)) : undefined;

  // Exactly the planned files, plus Vite's bundle in assets/.
  const planned = new Set(plannedPaths(plan));
  for (const name of planned) if (!onDisk.has(name)) fail(`missing planned file ${name}`);
  for (const name of files) if (!planned.has(name) && !/^assets\/[\w.-]+$/.test(name)) fail(`unplanned file ${name}`);
  if (!files.some(name => /^assets\/[\w.-]+\.js$/.test(name))) fail('no JavaScript bundle in assets/');
  for (const file of plan.files) {
    const shipped = bytes(file.path);
    const expected = typeof file.content === 'string' ? Buffer.from(file.content, 'utf8') : file.content;
    if (shipped && !equalBytes(shipped, expected)) fail(`${file.path} differs from its planned bytes (${file.origin})`);
  }
  if (!plan.hasCover) fail('cover missing');

  // Pages: one html, head and title; exact title, canonical and robots; the generated body verbatim.
  for (const [page, alias] of [...plan.pages.map(page => [page, false] as const), ...plan.aliases.map(page => [page, true] as const)]) {
    const html = bytes(page.path)?.toString('utf8');
    if (html === undefined) continue;
    const head = html.slice(0, html.indexOf('</head>'));
    if (count(html, /<html[\s>]/) !== 1 || count(html, /<head[\s>]/) !== 1 || count(html, /<\/head>/) !== 1 || count(head, /<title>/) !== 1) fail(`${page.path}: not exactly one html, head and title`);
    if (!head.includes(`<title>${escapeHtml(page.title)}</title>`)) fail(`${page.path}: title is not the page title`);
    if (count(head, /<link rel="canonical"/) !== 1 || !head.includes(`<link rel="canonical" href="${escapeHtml(page.canonical)}">`)) fail(`${page.path}: canonical is not ${page.canonical}`);
    if (!head.includes(`<meta name="robots" content="${alias ? 'noindex, follow' : 'index, follow'}">`) || (!alias && /noindex/i.test(head))) fail(`${page.path}: robots tag is wrong`);
    if (!html.includes(`<div id="root">${page.html}</div>`)) fail(`${page.path}: body is not the generated page verbatim`);
    if (/Online Reader Framework/.test(head)) fail(`${page.path}: demo title`);
  }
  if (!bytes('index.html')?.toString('utf8').includes(`<link rel="canonical" href="${site}">`)) fail('index.html: canonical is not the book address');

  // The edition folder. Pages load the bundle from it; nothing in a page, bundle or stylesheet points at the domain root instead.
  const base = plan.base;
  for (const page of [...plan.pages, ...plan.aliases]) {
    const html = bytes(page.path)?.toString('utf8');
    if (html === undefined) continue;
    if (!new RegExp(`<script type="module" crossorigin src="${escapeRegExp(base)}assets/[\\w.-]+\\.js"></script>`).test(html)) fail(`${page.path}: the bundle is not loaded from ${base}assets/`);
    if (base !== '/' && /(?:src|href)="\/(?!\/)/.test(html.replace(new RegExp(`(?:src|href)="${escapeRegExp(base)}`, 'g'), ''))) fail(`${page.path}: a root-relative address outside ${base}`);
  }
  if (base !== '/') {
    for (const name of files.filter(file => /^assets\/.*\.(js|css)$/.test(file))) {
      const text = bytes(name)!.toString('utf8');
      if (/url\(\s*["']?\/(?!\/)/.test(text.replace(new RegExp(`url\\(\\s*["']?${escapeRegExp(base)}`, 'g'), ''))) fail(`${name}: a stylesheet address outside ${base}`);
      if (/["'`]\/(?:covers|assets|agent|embeds|media)\//.test(text)) fail(`${name}: a domain-root address of an edition file`);
    }
    if (!files.filter(file => /^assets\/.*\.js$/.test(file)).some(name => bytes(name)!.toString('utf8').includes(`${base}covers/${book.id}.jpg`))) fail(`the bundle does not show the cover at ${base}covers/${book.id}.jpg`);
    if (files.includes('robots.txt')) fail('robots.txt in a folder edition (only the host root has one)');
  }
  const headerRules = (bytes('_headers')?.toString('utf8') ?? '').split('\n').filter(line => line && !/^\s/.test(line));
  if (!headerRules.length || headerRules.some(rule => !rule.startsWith(base))) fail(`_headers: every rule must start with ${base}`);

  // Embeds: only a converted book has them, only its own, each self-contained; the policy rule and the descriptors are in place.
  const embedFiles = files.filter(name => name.startsWith('embeds/'));
  if (!plan.embeds) { if (embedFiles.length) fail('embed files in an edition without embeds'); }
  else {
    const root = plan.embeds.root ?? '';
    const expected = plan.embeds.items.map(item => `${root}${item.src}`).sort();
    if (JSON.stringify(embedFiles.slice().sort()) !== JSON.stringify(expected)) fail(`embed files are not exactly ${expected.join(', ')}`);
    for (const name of embedFiles) {
      const html = bytes(name)!.toString('utf8');
      if (/<(?:script|img|iframe|frame|source|audio|video|embed|object|track|input)\b[^>]*\ssrc\s*=\s*["']?(?!data:)[^"'\s>]/i.test(html)) fail(`${name}: loads an outside resource`);
      if (/<link\b[^>]*\shref\s*=/i.test(html) || /@import\b/i.test(html) || /url\(\s*["']?(?!data:|#|%23)[^"')\s]/i.test(html)) fail(`${name}: references an outside style, font or image`);
      if (/\bfetch\s*\(|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts|new\s+Worker|window\.open\s*\(/.test(html)) fail(`${name}: makes or opens a network request`);
      if (/<form\b|<base\b|http-equiv\s*=\s*["']?refresh/i.test(html)) fail(`${name}: has a form, base or refresh`);
    }
    const headers = bytes('_headers')?.toString('utf8') ?? '';
    if (!headers.includes(`${base}${root}*\n  ! Content-Security-Policy\n  ! X-Frame-Options\n  Content-Security-Policy: ${EMBED_CONTENT_SECURITY_POLICY}\n`)) fail('_headers: no embed rule for the embed folder');
    const bundle = files.filter(file => /^assets\/.*\.js$/.test(file)).map(name => bytes(name)!.toString('utf8')).join('\n');
    for (const item of plan.embeds.items) if (!bundle.includes(JSON.stringify(item.title)) || !bundle.includes(JSON.stringify(item.src))) fail(`the bundle does not register embed ${item.id}`);
    if (!bundle.includes(JSON.stringify(base))) fail('the bundle does not carry the embed base');
  }

  // Agent files are planned bytes (checked above); their number and folder are checked here too.
  const sections = flatten(book.sections);
  const chapters = files.filter(name => name.startsWith(`agent/${book.id}/chapters/`));
  if (chapters.length !== sections.length) fail(`agent chapters: ${chapters.length} files for ${sections.length} sections`);
  if (files.some(name => name.startsWith('agent/') && !name.startsWith(`agent/${book.id}/`))) fail('agent folder holds another book');
  const llms = bytes('llms.txt')?.toString('utf8') ?? '';
  for (const name of ['index.md', 'full.md', 'manifest.json']) if (!llms.includes(`${site}agent/${book.id}/${name}`)) fail(`llms.txt: no link to agent/${book.id}/${name}`);

  // Boundary. The samples' method is proven first on this book's own text in its bundle.
  const texts = new Map(files.filter(name => TEXT.test(name)).map(name => [name, fs.readFileSync(path.join(outDir, name), 'utf8')]));
  const bundle = [...texts].filter(([name]) => /^assets\/.*\.js$/.test(name)).map(([, text]) => text).join('\n');
  const own = textSamples(book);
  const ownMissing = own.filter(sample => !bundle.includes(sample));
  if (!own.length || ownMissing.length) fail(`text-sample control: ${ownMissing.length} of ${own.length} samples of this book not found in its own bundle`);
  const ownIds = new Set(sections.map(section => section.id));
  const ownHost = new URL(site).host;
  const probes = new Map<string, string>();
  const ownPrefix = sitePrefix(site);
  const otherPaths = otherSites.map(sitePrefix).filter(prefix => prefix !== ownPrefix && !ownPrefix.startsWith(prefix));
  const patterns = new Map<string, RegExp>();
  for (const other of others) {
    patterns.set(`book id ${other.id}`, bookIdPattern(other.id));
    probes.set(`title of ${other.id}`, other.title);
    if (other.description.length >= 20) probes.set(`description of ${other.id}`, other.description);
    for (const section of flatten(other.sections)) {
      if (section.id.length <= 12 || ownIds.has(section.id)) continue;
      patterns.set(`section id ${section.id.slice(0, 60)} of ${other.id}`, /^[a-z]+$/.test(section.id) ? sectionIdPattern(section.id, otherPaths) : sectionIdToken(section.id));
    }
    for (const [index, sample] of textSamples(other).entries()) probes.set(`text sample ${index + 1} of ${other.id}`, sample);
    if (other.sourceUrl && new URL(other.sourceUrl).host !== ownHost) probes.set(`source address of ${other.id}`, new URL(other.sourceUrl).host);
    probes.set(`cover of ${other.id}`, `covers/${other.id}.jpg`);
    for (const item of demoEmbeds[other.id]?.items ?? []) {
      probes.set(`embed title of ${other.id}`, item.title);
      probes.set(`embed folder of ${other.id}`, `embeds/${other.id}/`);
    }
  }
  for (const address of otherSites) {
    const prefix = sitePrefix(address);
    if (prefix !== ownPrefix && !ownPrefix.startsWith(prefix)) probes.set(`public address ${address}`, prefix);
  }
  for (const [name, text] of texts) {
    if (text.includes('<!--ORF_')) fail(`build marker left in ${name}`);
    for (const pattern of PRIVATE) if (pattern.test(text)) { fail(`private path or address (${pattern.source}) in ${name}`); break; }
    for (const pattern of ORIGINAL_ICON) if (pattern.test(text)) { fail(`the Notion icon (${pattern.source}) in ${name}`); break; }
    if (/sourceMappingURL/.test(text)) fail(`sourceMappingURL in ${name}`);
    if (/\.(js|html)$/.test(name) && /demo-frontpage-chooser|Front page layout/.test(text)) fail(`demo chooser text in ${name}`);
    for (const [label, probe] of probes) if (text.includes(probe)) { fail(`another book's ${label} in ${name}`); break; }
    for (const [label, pattern] of patterns) if (pattern.test(text)) { fail(`another book's ${label} in ${name}`); break; }
  }
  for (const name of files) {
    if (/\.map$/.test(name)) fail(`source map shipped: ${name}`);
    if (/provenance|\.test\.|fixture/i.test(name)) fail(`non-public file shipped: ${name}`);
  }
  return failures;
}
