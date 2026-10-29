import { demoBooks } from '../../src/books/demo-books';
/** Check a built edition before it is deployed. Passes only when all of these hold:
 * - the release folder, the edition folder and the manifest are real (no symlink from build/ down);
 * - the manifest is a current-schema manifest of this book, records no check failures and `sourceTreeDirty: false`;
 * - the files on disk are exactly the manifest's list, each with its size and SHA-256, and the tree hash matches;
 * - the artefact checks (`verify-edition.ts`) pass again on the folder against the current source.
 * The current HEAD and source state are reported as notes: a commit of docs after the build changes HEAD without changing the edition.
 * Usage (from apps/reader-demo): npm run verify:release -- --book <id>|originals|converted|all   (exit 1 unless every book passes) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { canonicalSiteUrl } from '../../../../packages/reader-core/src/agent-export/index';
import type { PublicationBook } from '../../../../packages/reader-core/src/original/types';
import { canonicalSites } from '../../src/canonical-sites';
import { hashEdition, MANIFEST_SCHEMA, otherSitesOf, sourceState, type EditionFile } from './build-edition';
import { planEdition } from './edition-plan';
import { defaultPreviousSiteDir } from './previous-site';
import { releaseBookChoices, releaseBooks, selectReleaseBooks } from './release-books';
import { verifyEdition } from './verify-edition';
import { assertReleasePath, releaseRootOf } from './write-guard';

export interface ExistingEditionResult { book: string; ok: boolean; failures: string[]; notes: string[]; treeSha256?: string; files?: number }

export function verifyExistingEdition(input: { repo: string; app: string; book: PublicationBook; others: PublicationBook[]; sites: Record<string, string | undefined>; previousSiteDir: string }): ExistingEditionResult {
  const { repo, book } = input;
  const failures: string[] = [], notes: string[] = [];
  const done = (extra: Partial<ExistingEditionResult> = {}): ExistingEditionResult => ({ book: book.id, ok: failures.length === 0, failures, notes, ...extra });
  const root = releaseRootOf(repo);
  const folder = path.join(root, book.id);
  const manifestPath = path.join(root, `${book.id}.manifest.json`);
  try {
    assertReleasePath(repo, root, 'directory');
    assertReleasePath(repo, folder, 'directory');
    assertReleasePath(repo, manifestPath, 'file');
  } catch (error) { failures.push((error as Error).message); return done(); }
  if (!fs.existsSync(manifestPath)) { failures.push('no manifest: the edition was not built, or its last build failed'); return done(); }
  if (!fs.existsSync(folder)) { failures.push('no edition folder'); return done(); }

  let manifest: { schema?: string; book?: string; site?: string; folder?: string; sourceHead?: string; sourceTreeDirty?: unknown; treeSha256?: string; totals?: { files?: number; bytes?: number }; checks?: { failures?: unknown[] }; files?: EditionFile[] };
  try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); } catch { failures.push('manifest is not valid JSON'); return done(); }
  if (manifest.schema !== MANIFEST_SCHEMA) failures.push(`manifest schema is ${String(manifest.schema)}, expected ${MANIFEST_SCHEMA}`);
  if (manifest.book !== book.id || manifest.folder !== `build/release-books/${book.id}`) failures.push('manifest names another book or folder');
  const site = canonicalSiteUrl(input.sites[book.id]);
  if (!site || manifest.site !== site) failures.push(`manifest address ${String(manifest.site)} is not the book's address ${String(site)}`);
  if (!Array.isArray(manifest.checks?.failures) || manifest.checks.failures.length) failures.push('manifest records check failures');
  if (manifest.sourceTreeDirty !== false) failures.push('built from uncommitted source (sourceTreeDirty is not false)');

  let disk;
  try { disk = hashEdition(folder); } catch (error) { failures.push((error as Error).message); return done(); }
  const listed = new Map((manifest.files ?? []).map(file => [file.path, file]));
  for (const file of disk.files) {
    const entry = listed.get(file.path);
    if (!entry) failures.push(`file not in manifest: ${file.path}`);
    else if (entry.sha256 !== file.sha256 || entry.bytes !== file.bytes) failures.push(`file differs from manifest: ${file.path}`);
  }
  const present = new Set(disk.files.map(file => file.path));
  for (const name of listed.keys()) if (!present.has(name)) failures.push(`manifest file missing on disk: ${name}`);
  if (manifest.treeSha256 !== disk.treeSha256) failures.push('tree hash differs from manifest');
  if (manifest.totals?.files !== disk.files.length || manifest.totals?.bytes !== disk.files.reduce((sum, file) => sum + file.bytes, 0)) failures.push('manifest totals differ from disk');

  if (site) {
    try {
      const plan = planEdition({ book, site, appRoot: input.app, previousSiteDir: input.previousSiteDir });
      for (const failure of verifyEdition({ plan, others: input.others, otherSites: otherSitesOf(input.sites, book.id), outDir: folder })) failures.push(`artefact check: ${failure}`);
      if (JSON.stringify((manifest as { edition?: unknown }).edition ?? null) !== JSON.stringify(plan.assets ?? null)) failures.push('manifest edition record (folder, cover, embeds) differs from the current plan');
    } catch (error) { failures.push(`artefact checks could not run: ${(error as Error).message}`); }
  }
  try {
    const now = sourceState(repo);
    if (manifest.sourceHead !== now.head) notes.push(`built at ${String(manifest.sourceHead).slice(0, 12)}, HEAD is now ${now.head.slice(0, 12)}`);
    if (now.dirty) notes.push(`the working tree now has ${now.dirtyPaths.length} uncommitted change(s) outside build/, docs/ and research/`);
  } catch (error) { notes.push(`source state not read: ${(error as Error).message}`); }
  return done({ treeSha256: disk.treeSha256, files: disk.files.length });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const repo = path.resolve(app, '../..');
  const books = releaseBooks;
  const argument = process.argv.indexOf('--book');
  const wanted = argument < 0 ? '' : process.argv[argument + 1] ?? '';
  const selected = wanted ? selectReleaseBooks(wanted) : [];
  if (!selected.length) { console.error(`Choose --book from ${releaseBookChoices()}`); process.exit(2); }
  let ok = true;
  for (const book of selected) {
    const result = verifyExistingEdition({ repo, app, book, others: demoBooks.filter(other => other.id !== book.id), sites: canonicalSites, previousSiteDir: defaultPreviousSiteDir(repo) });
    ok &&= result.ok;
    console.log(`${book.id}: ${result.ok ? 'PASS, deployable' : 'FAIL, do not deploy'}${result.treeSha256 ? ` (tree ${result.treeSha256}, ${result.files} files)` : ''}`);
    for (const failure of result.failures) console.log(`  FAIL ${failure}`);
    for (const note of result.notes) console.log(`  note ${note}`);
  }
  process.exitCode = ok ? 0 : 1;
}
