/** Evidence: the committed verifier (from a `git archive` copy) against the committed Linguistics edition, with the two converted books added as "others",
 * reports Readability's ordinary-word section id `accessibility` (red). The working-tree verifier, with the same five books, passes the working-tree
 * Linguistics edition and still reports a real identifier leak (green plus positive control).
 * Usage: npx tsx probe-verifier-false-positive.mts <baseline copy root> <after copy root> <previous Linguistics site> */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const [baseline, after, previous] = process.argv.slice(2).map(p => path.resolve(p));
const load = (root: string, rel: string) => import(pathToFileURL(path.join(root, 'apps/reader-demo', rel)).href);
const next = ['academic-reading-framework', 'readability-foundations'].map(name => JSON.parse(fs.readFileSync(path.join(after, `apps/reader-demo/src/books/next-books/${name}.book.json`), 'utf8')));
const result: Record<string, unknown> = {};
{
  const { planEdition } = await load(baseline, 'scripts/release/edition-plan.ts');
  const { verifyEdition } = await load(baseline, 'scripts/release/verify-edition.ts');
  const { canonicalSites } = await load(baseline, 'src/canonical-sites.ts');
  const originals = (await load(baseline, 'src/books/original-publications.json')).default;
  const book = originals.find((b: { id: string }) => b.id === 'linguistics');
  const plan = planEdition({ book, site: canonicalSites.linguistics, appRoot: path.join(baseline, 'apps/reader-demo'), previousSiteDir: previous });
  const failures = verifyEdition({ plan, others: [...originals.filter((b: { id: string }) => b.id !== 'linguistics'), ...next], otherSites: [], outDir: path.join(baseline, 'build/release-books/linguistics') });
  result.committedVerifier = { failures: failures.length, accessibility: failures.filter((f: string) => /accessibility/.test(f)).slice(0, 5) };
}
{
  const { planEdition } = await load(after, 'scripts/release/edition-plan.ts');
  const { verifyEdition } = await load(after, 'scripts/release/verify-edition.ts');
  const { canonicalSites } = await load(after, 'src/canonical-sites.ts');
  const { releaseBooks } = await load(after, 'scripts/release/release-books.ts');
  const book = releaseBooks.find((b: { id: string }) => b.id === 'linguistics');
  const plan = planEdition({ book, site: canonicalSites.linguistics, appRoot: path.join(after, 'apps/reader-demo'), previousSiteDir: previous });
  const others = releaseBooks.filter((b: { id: string }) => b.id !== 'linguistics');
  const sites = Object.entries(canonicalSites).filter(([id]) => id !== 'linguistics').map(([, url]) => url);
  const out = path.join(after, 'build/release-books/linguistics');
  const clean = verifyEdition({ plan, others, otherSites: sites, outDir: out });
  const copy = path.join(after, 'build/release-books/.probe-linguistics-leak');
  fs.rmSync(copy, { recursive: true, force: true });
  fs.cpSync(out, copy, { recursive: true });
  const js = fs.readdirSync(path.join(copy, 'assets')).find(name => /^index-.*\.js$/.test(name))!;
  fs.appendFileSync(path.join(copy, 'assets', js), '\n;var leak={id:"accessibility"};');
  const leaked = verifyEdition({ plan, others, otherSites: sites, outDir: copy });
  fs.rmSync(copy, { recursive: true, force: true });
  result.workingTreeVerifier = { failures: clean, positiveControl: leaked.filter((f: string) => /accessibility/.test(f)) };
}
console.log(JSON.stringify(result, null, 1));
const red = (result.committedVerifier as { accessibility: string[] }).accessibility.length > 0;
const green = (result.workingTreeVerifier as { failures: string[]; positiveControl: string[] }).failures.length === 0 && (result.workingTreeVerifier as { positiveControl: string[] }).positiveControl.length > 0;
process.exitCode = red && green ? 0 : 1;
