/** Writes the agent-readable copy of every demo book into the build output, from the same book data the reader displays.
 * Run after `vite build` (the demo's `npm run build` does). Usage: tsx scripts/build-agent-files.ts [--out dist]
 * READER_SITE_URL (optional) makes every link absolute, e.g. https://books.example.org/reader/ ; without it all links are relative and work under any host or sub-path.
 * --canonical writes each book's links against its own public address from src/canonical-sites.ts (for a deployment to those addresses); READER_SITE_URL, if also set, applies to books without one.
 * Output is confined to the demo's own build folder: the target must be inside apps/reader-demo/dist, and only dist/agent and dist/llms.txt are written.
 * This is the reference integration for any host: see docs/design/2026-10-25-outline-anchored-agent/agent-access.md. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AGENT_DIRECTORY, buildAgentBook, canonicalSiteUrl, buildAgentRootIndex, type AgentFile } from '../../../packages/reader-core/src/agent-export/index';
import type { PublicationBook } from '../../../packages/reader-core/src/original/types';
import publications from '../src/books/original-publications.json';
import { canonicalSites } from '../src/canonical-sites';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');
const argument = process.argv.indexOf('--out');
const out = path.resolve(app, argument < 0 ? 'dist' : process.argv[argument + 1] ?? '');
if (out !== path.join(app, 'dist')) throw new Error(`Refusing to write outside the build folder ${path.join(app, 'dist')} (asked for ${out}).`);

// Both address sources pass the generators' own check (canonicalSiteUrl) before anything is written. Messages never repeat a refused value.
const publicSite = (value: string, what: string): string => {
  const valid = canonicalSiteUrl(value);
  if (!valid) throw new Error(`${what} must be a public http(s) address written exactly, with no credentials, query, fragment, "." or ".." segment, or private host.`);
  return valid;
};
const siteUrl = process.env.READER_SITE_URL ? publicSite(process.env.READER_SITE_URL, 'READER_SITE_URL') : undefined;
const books = publications as PublicationBook[];
const canonical = process.argv.includes('--canonical');
const siteFor = (book: PublicationBook): string | undefined =>
  canonical && canonicalSites[book.id] ? publicSite(canonicalSites[book.id], `The canonical address of "${book.id}"`) : siteUrl;
const exports = books.map(book => buildAgentBook(book, { siteUrl: siteFor(book) }));
const root = buildAgentRootIndex(exports, { siteUrl, title: 'Online Reader Framework demo books',
  summary: 'Three books read in the Online Reader Framework demo. Each is available as plain Markdown: an index, the whole text in one file, and one file per section.' });
const files: AgentFile[] = [root, ...exports.flatMap(book => book.files)];

const inside = (target: string): string => {
  const resolved = path.resolve(out, target);
  if (resolved !== out && !resolved.startsWith(out + path.sep)) throw new Error(`Refusing to write outside the build folder: ${target}`);
  return resolved;
};
await fs.mkdir(out, { recursive: true });
await fs.rm(inside(AGENT_DIRECTORY), { recursive: true, force: true });
for (const file of files) {
  const target = inside(file.path);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, file.content, 'utf8');
}
for (const book of exports) console.log(`${book.bookId}: ${book.manifest.counts.sections} sections (${book.manifest.counts.withText} with text), ${book.files.length} files`);
console.log(`Wrote ${files.length} agent files under ${path.relative(app, out)}${canonical ? ' with links under each book\'s canonical address' : siteUrl ? ` with links under ${siteUrl}` : ' with relative links'}.`);
