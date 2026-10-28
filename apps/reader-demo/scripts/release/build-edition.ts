/** Builds one release edition safely. Order of work:
 * 1. plan the edition and check section ids and output paths: a refusal here writes nothing;
 * 2. delete the edition's old manifest, so no manifest describes a folder this run may change;
 * 3. build into a new staging folder `build/release-books/.incomplete-<book>-<stamp>/` (Vite empties nothing);
 * 4. verify the staging folder; on any failure the staging folder stays where it is, under that name, and the previous edition folder is untouched;
 * 5. prepare the temporary manifest, then move the previous edition aside and staging into place;
 * 6. check the hash and publish the manifest last; restore the previous edition on a later failure.
 * The two directory renames are not a crash-atomic exchange: interruption can leave recoverable .previous/.incomplete folders.
 * Every path is checked by `assertReleasePath` (no symlink anywhere from build/ down) immediately before it is created, renamed, written or deleted. */
import { execFileSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import react from '@vitejs/plugin-react';
import { build, type InlineConfig } from 'vite';
import { canonicalSiteUrl } from '../../../../packages/reader-core/src/agent-export/index';
import type { PublicationBook } from '../../../../packages/reader-core/src/original/types';
import { planEdition, planProblems, type EditionPlan } from './edition-plan';
import { RELEASE_ICON_FILE } from './projection';
import { releasePlugin } from './release-plugin';
import { verifyEdition } from './verify-edition';
import { assertReleasePath, releaseRootOf, walkFiles } from './write-guard';

export const MANIFEST_SCHEMA = 'online-reader-framework/release-manifest@2';
export interface SourceState { head: string; dirty: boolean; dirtyPaths: string[] }
export interface BuildEditionOptions {
  repo: string; app: string; book: PublicationBook; others: PublicationBook[]; sites: Record<string, string | undefined>;
  source: SourceState; previousSiteDir: string; log?: (line: string) => void;
}
export type BuildEditionResult =
  | { ok: true; folder: string; manifest: string; files: number; bytes: number; treeSha256: string }
  | { ok: false; failures: string[]; quarantine?: string; recovery?: string };
export interface EditionFile { path: string; bytes: number; sha256: string }

/** Source state of everything that can change an edition: the whole repository except its own build output, docs, research notes and agent
 * metadata (build/ is also ignored by Git). Configuration, package manifests, lock files, covers and the previous-site pin are all included. */
export function sourceState(root: string): SourceState {
  const git = (...args: string[]): string => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' });
  const status = git('status', '--porcelain', '--untracked-files=all', '--', '.', ':(exclude)build', ':(exclude)docs', ':(exclude)research', ':(exclude).codex');
  const dirtyPaths = status.split('\n').filter(Boolean);
  return { head: git('rev-parse', 'HEAD').trim(), dirty: dirtyPaths.length > 0, dirtyPaths };
}

export function hashEdition(folder: string): { files: EditionFile[]; treeSha256: string } {
  const files = [...walkFiles(folder)].map(file => {
    const bytes = fs.readFileSync(file);
    return { path: path.relative(folder, file).split(path.sep).join('/'), bytes: bytes.length, sha256: crypto.createHash('sha256').update(bytes).digest('hex') };
  });
  return { files, treeSha256: crypto.createHash('sha256').update(files.map(file => `${file.sha256}  ${file.path}`).join('\n')).digest('hex') };
}

/** The Vite configuration of one edition's build; the release tests build with exactly this. `base` is the edition folder. */
export const releaseViteConfig = (plan: EditionPlan, app: string, outDir: string, logLevel: InlineConfig['logLevel'] = 'warn'): InlineConfig => ({
  configFile: false, root: app, base: plan.base, publicDir: false, logLevel,
  plugins: [react(), releasePlugin(plan, app)],
  resolve: { alias: { 'reader-core': path.resolve(app, '../../packages/reader-core/src/index.ts') }, dedupe: ['react', 'react-dom'] },
  define: { __READER_RELEASE_BOOK__: JSON.stringify(plan.book.id) },
  build: { outDir, emptyOutDir: false, sourcemap: false },
});

export const otherSitesOf = (sites: Record<string, string | undefined>, bookId: string): string[] =>
  Object.entries(sites).filter(([id]) => id !== bookId).map(([, url]) => canonicalSiteUrl(url)).filter((url): url is string => !!url);

export async function buildEdition(options: BuildEditionOptions): Promise<BuildEditionResult> {
  const { repo, app, book, source } = options;
  const log = options.log ?? (() => undefined);
  const site = canonicalSiteUrl(options.sites[book.id]);
  if (!site) return { ok: false, failures: [`The public address of "${book.id}" is missing or not usable.`] };

  // 1. Plan and check; nothing is written yet.
  let plan;
  try { plan = planEdition({ book, site, appRoot: app, previousSiteDir: options.previousSiteDir }); } catch (error) { return { ok: false, failures: [(error as Error).message] }; }
  const problems = planProblems(plan);
  if (problems.length) return { ok: false, failures: problems };

  const root = releaseRootOf(repo);
  const folder = path.join(root, book.id);
  const manifest = path.join(root, `${book.id}.manifest.json`);
  const stamp = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')}-${process.pid}-${crypto.randomUUID().slice(0, 8)}`;
  const staging = path.join(root, `.incomplete-${book.id}-${stamp}`);
  try {
    for (const [target, kind] of [[root, 'directory'], [folder, 'directory'], [manifest, 'file'], [staging, 'directory']] as const) assertReleasePath(repo, target, kind);
  } catch (error) { return { ok: false, failures: [(error as Error).message] }; }
  fs.mkdirSync(root, { recursive: true });
  assertReleasePath(repo, root, 'directory');

  // 2. Invalidate the old manifest.
  assertReleasePath(repo, manifest, 'file');
  if (fs.existsSync(manifest)) fs.unlinkSync(manifest);

  // 3. Build into a fresh staging folder.
  assertReleasePath(repo, staging, 'directory');
  fs.mkdirSync(staging);
  assertReleasePath(repo, staging, 'directory');
  try {
    await build(releaseViteConfig(plan, app, staging));
  } catch (error) {
    return { ok: false, failures: [`build failed: ${(error as Error).message.split('\n')[0]}`], quarantine: staging };
  }

  // 4. Verify the staging folder.
  assertReleasePath(repo, staging, 'directory');
  const failures = verifyEdition({ plan, others: options.others, otherSites: otherSitesOf(options.sites, book.id), outDir: staging });
  if (failures.length) return { ok: false, failures, quarantine: staging };
  const staged = hashEdition(staging);

  // Prepare the record before promotion; the old edition remains recoverable until the final manifest rename succeeds.
  const record = {
    schema: MANIFEST_SCHEMA, book: book.id, site, command: `npm run build:release -- --book ${book.id}`,
    sourceHead: source.head, sourceTreeDirty: source.dirty, sourceDirtyPaths: source.dirtyPaths.slice(0, 200), node: process.version,
    folder: `build/release-books/${book.id}`,
    totals: { files: staged.files.length, bytes: staged.files.reduce((sum, file) => sum + file.bytes, 0) }, treeSha256: staged.treeSha256,
    checks: { failures: [] as string[] },
    projection: { iconReplacedIn: plan.projection.replaced, ...(plan.projection.replaced.length ? { icon: RELEASE_ICON_FILE } : {}) },
    // A converted book's edition folder, pinned cover and embed documents with their sources and hashes.
    ...(plan.assets ? { edition: plan.assets } : {}),
    ...(plan.previous ? { previousSite: plan.previous.record } : {}),
    files: staged.files,
  };
  const previous = path.join(root, `.previous-${book.id}-${stamp}`);
  const temporary = path.join(root, `.${book.id}.manifest.json.tmp-${stamp}`);
  const hadPrevious = fs.existsSync(folder);
  let oldMoved = false;
  let newMoved = false;
  try {
    assertReleasePath(repo, temporary, 'file');
    fs.writeFileSync(temporary, `${JSON.stringify(record, null, 2)}\n`, { flag: 'wx' });
    assertReleasePath(repo, folder, 'directory');
    assertReleasePath(repo, previous, 'directory');
    if (hadPrevious) { fs.renameSync(folder, previous); oldMoved = true; }
    assertReleasePath(repo, staging, 'directory');
    assertReleasePath(repo, folder, 'directory');
    fs.renameSync(staging, folder);
    newMoved = true;
    assertReleasePath(repo, folder, 'directory');
    if (hashEdition(folder).treeSha256 !== staged.treeSha256) throw new Error('the edition changed while it was moved into place');
    assertReleasePath(repo, temporary, 'file');
    assertReleasePath(repo, manifest, 'file');
    fs.renameSync(temporary, manifest);
  } catch (error) {
    const failures = [`could not publish the edition: ${(error as Error).message}`];
    // Never delete the previous edition on this path. If recovery itself fails, leave both trees for manual recovery and no manifest.
    try {
      assertReleasePath(repo, manifest, 'file');
      if (fs.existsSync(manifest)) fs.unlinkSync(manifest);
      if (newMoved) {
        assertReleasePath(repo, folder, 'directory');
        assertReleasePath(repo, staging, 'directory');
        fs.renameSync(folder, staging);
      }
      if (oldMoved) {
        assertReleasePath(repo, previous, 'directory');
        assertReleasePath(repo, folder, 'directory');
        fs.renameSync(previous, folder);
      }
      assertReleasePath(repo, temporary, 'file');
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    } catch (recoveryError) { failures.push(`recovery needs attention: ${(recoveryError as Error).message}`); }
    return { ok: false, failures, quarantine: fs.existsSync(staging) ? staging : newMoved && fs.existsSync(folder) ? folder : undefined,
      recovery: oldMoved && fs.existsSync(previous) ? previous : undefined };
  }
  // Cleanup is after the commit point. An undeletable backup does not invalidate a verified, published edition.
  if (hadPrevious) {
    try { assertReleasePath(repo, previous, 'directory'); fs.rmSync(previous, { recursive: true }); }
    catch { log(`${book.id}: previous edition retained for cleanup`); }
  }
  log(`${book.id}: ${record.totals.files} files, tree ${staged.treeSha256.slice(0, 12)}, artefact checks pass`);
  return { ok: true, folder, manifest, files: record.totals.files, bytes: record.totals.bytes, treeSha256: staged.treeSha256 };
}
