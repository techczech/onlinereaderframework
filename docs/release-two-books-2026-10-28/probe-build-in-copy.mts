/** Evidence driver: build release editions with the release code of a source copy (a `git archive` of a commit, or a copy of the working tree) into that
 * copy's own build/release-books/, so the real build/release-books/ is never touched. Prints one JSON line per book: tree hash, file list and hashes.
 * Usage: npx tsx probe-build-in-copy.mts <copy root> <previous Linguistics site folder> <book id>... */
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [copy, previousSiteDir, ...ids] = process.argv.slice(2);
const root = path.resolve(copy);
const app = path.join(root, 'apps', 'reader-demo');
const load = (relative: string) => import(pathToFileURL(path.join(app, relative)).href);
const { buildEdition, hashEdition } = await load('scripts/release/build-edition.ts');
const { canonicalSites } = await load('src/canonical-sites.ts');
let books: Array<{ id: string }>;
try { books = (await load('scripts/release/release-books.ts')).releaseBooks; }
catch { books = (await load('src/books/original-publications.json')).default; }
const results: unknown[] = [];
for (const id of ids) {
  const book = books.find(candidate => candidate.id === id);
  if (!book) throw new Error(`no book ${id} in ${root}`);
  const result = await buildEdition({ repo: root, app, book, others: books.filter(other => other.id !== id), sites: canonicalSites,
    source: { head: 'scratch-copy', dirty: true, dirtyPaths: ['scratch copy'] }, previousSiteDir: path.resolve(previousSiteDir), log: () => undefined });
  const out = result.ok ? { book: id, ok: true, treeSha256: result.treeSha256, files: hashEdition(result.folder).files } : { book: id, ok: false, failures: result.failures };
  results.push(out);
  console.log(JSON.stringify(out));
}
if (results.some(result => !(result as { ok: boolean }).ok)) process.exitCode = 1;
