/** The previous Linguistics web edition's addresses that the new edition keeps (parent decision, 2026-10-27):
 * - `answers/<id>.md` and `sections/<name>.md`: the bytes of the new agent chapter of the same section;
 * - `llms-full.txt`: the bytes of the new agent `full.md`;
 * - `download/key-issues-in-language.epub` and `.pdf`: the previous files, byte for byte;
 * - `about/`, `download/` and `404.html`: new static pages whose main text is the previous page's, quoted verbatim.
 * The previous files are read from the folder named in previous-linguistics-site.json and used only when every hash matches. */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { AgentBookExport } from '../../../../packages/reader-core/src/agent-export/index';
import { aliasRoutes } from '../../src/release-routes';
import pin from './previous-linguistics-site.json';

export interface PlannedFile { path: string; content: string | Uint8Array; origin: string }
export interface PreviousSite { files: PlannedFile[]; mains: { about: string; download: string; notFound: string }; record: Record<string, unknown> }

const sha256 = (bytes: Uint8Array | string): string => crypto.createHash('sha256').update(bytes).digest('hex');
export const defaultPreviousSiteDir = (repo: string): string => path.resolve(repo, pin.folder);

/** The `<main>` text of a previous page, refused if it holds anything executable or styled. */
function mainOf(html: string, name: string): string {
  const mains = [...html.matchAll(/<main>([\s\S]*?)<\/main>/g)];
  if (mains.length !== 1) throw new Error(`Previous page ${name}: expected one <main>, found ${mains.length}.`);
  const main = mains[0][1];
  if (/<(script|style|iframe|object|embed|form|input|link|meta)\b|\son\w+\s*=|\sstyle\s*=|javascript:/i.test(main)) throw new Error(`Previous page ${name}: main text holds markup a release does not ship.`);
  return main;
}

export function previousSite(bookId: string, exported: AgentBookExport, ids: readonly string[], folder: string): PreviousSite | undefined {
  if (bookId !== 'linguistics') return undefined;
  const read = (name: keyof typeof pin.files): Buffer => {
    const file = path.join(folder, name);
    const bytes = fs.readFileSync(file);
    const expected = pin.files[name];
    if (bytes.length !== expected.bytes || sha256(bytes) !== expected.sha256) throw new Error(`Previous Linguistics file ${name} does not match its pinned hash.`);
    return bytes;
  };
  const generated = new Map(exported.files.map(file => [file.path, file.content]));
  const chapter = (id: string): string => {
    const content = generated.get(`agent/${bookId}/chapters/${id}.md`);
    if (content === undefined) throw new Error(`No agent chapter for ${id}.`);
    return content;
  };
  const full = generated.get(`agent/${bookId}/full.md`);
  if (full === undefined) throw new Error('No agent full.md.');
  const files: PlannedFile[] = aliasRoutes(bookId, ids).map(route => ({ path: `${route.path.slice(1, -1)}.md`, content: chapter(route.id), origin: `agent/${bookId}/chapters/${route.id}.md` }));
  files.push({ path: 'llms-full.txt', content: full, origin: `agent/${bookId}/full.md` });
  for (const name of ['download/key-issues-in-language.epub', 'download/key-issues-in-language.pdf'] as const) files.push({ path: name, content: new Uint8Array(read(name)), origin: `previous site ${name}` });
  return {
    files,
    mains: { about: mainOf(read('about/index.html').toString('utf8'), 'about/index.html'), download: mainOf(read('download/index.html').toString('utf8'), 'download/index.html'), notFound: mainOf(read('404.html').toString('utf8'), '404.html') },
    record: { folder: pin.folder, sourceRepository: pin.sourceRepository, sourceHead: pin.sourceHead, files: Object.fromEntries(Object.entries(pin.files).map(([name, entry]) => [name, { sha256: entry.sha256, bytes: entry.bytes, use: entry.use }])) },
  };
}
