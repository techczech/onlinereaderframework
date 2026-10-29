import { demoBooks } from '../src/books/demo-books';
/** Builds one deployable, single-book production edition of each release book into build/release-books/<book>/, plus build/release-books/<book>.manifest.json.
 * Usage (from apps/reader-demo): npm run build:release -- [--book <id>|originals|converted|all]   (default all; ids in scripts/release/release-books.ts)
 * Each edition is pinned to its book (no `?book` choice, no front-page chooser), carries only that book's manuscript (and, for a converted book, only its
 * own embeds and cover), and is served from its own public address in src/canonical-sites.ts: a domain root, or a folder such as /books/<name>/. The write path is in scripts/release/build-edition.ts: staging folder, verification, then the swap and the manifest last.
 * Nothing is deployed or uploaded. Before a deploy, check the folder with `npm run verify:release -- --book <book>`. */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalSites } from '../src/canonical-sites';
import { buildEdition, sourceState } from './release/build-edition';
import { defaultPreviousSiteDir } from './release/previous-site';
import { releaseBookChoices, releaseBooks, selectReleaseBooks } from './release/release-books';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');
const repo = path.resolve(app, '../..');
const books = releaseBooks;
const argument = process.argv.indexOf('--book');
const wanted = argument < 0 ? 'all' : process.argv[argument + 1] ?? '';
const selected = selectReleaseBooks(wanted);
if (!selected.length) throw new Error(`Unknown book "${wanted.slice(0, 40)}". Choose one of: ${releaseBookChoices()}.`);

const source = sourceState(repo);
let failed = false;
for (const book of selected) {
  const result = await buildEdition({
    repo, app, book, others: demoBooks.filter(other => other.id !== book.id), sites: canonicalSites, source,
    previousSiteDir: defaultPreviousSiteDir(repo), log: line => console.log(line),
  });
  if (result.ok) continue;
  failed = true;
  console.log(`${book.id}: NOT BUILT; no manifest written${result.quarantine ? `; incomplete output left in ${path.relative(repo, result.quarantine)}` : ''}`);
  if (result.recovery) console.log(`  Previous edition retained for recovery in ${path.relative(repo, result.recovery)}; do not delete it.`);
  for (const failure of result.failures) console.log(`  FAIL ${failure}`);
}
if (source.dirty) console.log(`Source has ${source.dirtyPaths.length} uncommitted change(s): the manifests record sourceTreeDirty: true, and verify:release will refuse them.`);
if (failed) process.exitCode = 1;
