/** Artefact checks of one built edition, read from disk after the build. Returns the failures (empty when every check passes); never throws on a check.
 * These are file-level checks (what is shipped, where it points); they do not replace running the edition in a browser.
 * - the folder holds exactly the planned files plus Vite's own `assets/`, no symbolic link, and every planned file byte for byte;
 * - every page has one `<html>`, `<head>` and `<title>`, its exact title and canonical link, and its generated body verbatim; no build marker remains;
 * - no other book: no title, description, address, long section id or sample of text of any other book, with the samples' method proven on this
 *   book's own bundle; no Notion icon; no private paths, source maps or demo leftovers. */
import fs from 'node:fs';
import path from 'node:path';
import type { PublicationBook, PublicationSection } from '../../../../packages/reader-core/src/original/types';
import { plannedPaths, type EditionPlan } from './edition-plan';
import { escapeHtml } from './static-pages';
import { walkFiles } from './write-guard';

export interface EditionCheck { plan: EditionPlan; others: PublicationBook[]; otherSites: string[]; outDir: string }
const TEXT = /\.(html|js|css|json|md|txt|xml|svg)$|(^|\/)_headers$/;
const PRIVATE = [/\/Users\//, /\/private\/var\//, /100\.85\./, /127\.0\.0\.1/, /\.ts\.net/, /file:\/\//];
const ORIGINAL_ICON = [/notion\.so\/icons/, /command-line_gray/, /M15 3\.125H5c-1\.544/];
const flatten = (sections: readonly PublicationSection[]): PublicationSection[] => sections.flatMap(section => [section, ...flatten(section.children ?? [])]);
const equalBytes = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && Buffer.compare(Buffer.from(a), Buffer.from(b)) === 0;
const count = (text: string, pattern: RegExp): number => text.match(new RegExp(pattern.source, 'g'))?.length ?? 0;

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
  for (const other of others) {
    probes.set(`title of ${other.id}`, other.title);
    if (other.description.length >= 20) probes.set(`description of ${other.id}`, other.description);
    for (const section of flatten(other.sections)) if (section.id.length > 12 && !ownIds.has(section.id)) probes.set(`section id ${section.id.slice(0, 60)} of ${other.id}`, section.id);
    for (const [index, sample] of textSamples(other).entries()) probes.set(`text sample ${index + 1} of ${other.id}`, sample);
    if (other.sourceUrl && new URL(other.sourceUrl).host !== ownHost) probes.set(`source address of ${other.id}`, new URL(other.sourceUrl).host);
  }
  for (const address of otherSites) if (new URL(address).host !== ownHost) probes.set(`public address ${address}`, new URL(address).host);
  for (const [name, text] of texts) {
    if (text.includes('<!--ORF_')) fail(`build marker left in ${name}`);
    for (const pattern of PRIVATE) if (pattern.test(text)) { fail(`private path or address (${pattern.source}) in ${name}`); break; }
    for (const pattern of ORIGINAL_ICON) if (pattern.test(text)) { fail(`the Notion icon (${pattern.source}) in ${name}`); break; }
    if (/sourceMappingURL/.test(text)) fail(`sourceMappingURL in ${name}`);
    if (/\.(js|html)$/.test(name) && /demo-frontpage-chooser|Front page layout/.test(text)) fail(`demo chooser text in ${name}`);
    for (const [label, probe] of probes) if (text.includes(probe)) { fail(`another book's ${label} in ${name}`); break; }
  }
  for (const name of files) {
    if (/\.map$/.test(name)) fail(`source map shipped: ${name}`);
    if (/provenance|\.test\.|fixture/i.test(name)) fail(`non-public file shipped: ${name}`);
  }
  return failures;
}
