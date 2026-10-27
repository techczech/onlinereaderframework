/** Independent review probe of the book release recovery report (2026-10-27). From apps/reader-demo:
 *   npx tsx --test ../../docs/evidence-reader-release-final-guards-2026-10-27/probe-recovery-paths.mts
 * Covers rollback configurations the builder's regression does not: the reverse rename of the new tree failing, the restore of the previous
 * edition failing after the new tree never moved in, and a first build with no previous edition. Real Vite builds of a fake book into a fake
 * repository in owned scratch (build/review-final-guards-book-<pid>/), removed at the end. The CLI lines are a copy of build-release.ts:32-33. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { PublicationBook } from '../../packages/reader-core/src/original/types';
import publications from '../../apps/reader-demo/src/books/original-publications.json';
import { canonicalSites } from '../../apps/reader-demo/src/canonical-sites';
import { buildEdition, hashEdition } from '../../apps/reader-demo/scripts/release/build-edition';
import { defaultPreviousSiteDir } from '../../apps/reader-demo/scripts/release/previous-site';
import { verifyExistingEdition } from '../../apps/reader-demo/scripts/release/verify-existing-edition';
import { releaseRootOf } from '../../apps/reader-demo/scripts/release/write-guard';

const codeRepo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const app = path.join(codeRepo, 'apps/reader-demo');
const scratch = path.join(codeRepo, 'build', `review-final-guards-book-${process.pid}`);
after(() => fs.rmSync(scratch, { recursive: true, force: true }));
const books = publications as PublicationBook[];
const others = books.filter(book => book.id !== 'language-muscle');
const clean = { head: 'test', dirty: false, dirtyPaths: [] };
const fakeBook = {
  id: 'language-muscle', title: 'Fake review book', author: 'Test Author', description: 'A fake book for the recovery report probe.',
  sections: [
    { id: 'first-section', title: 'First', content: '# First\n\nThis is a plain sentence used as the sample text of the first section of the fake book.\n' },
    { id: 'second-section', title: 'Second', content: 'The second section carries another plain sentence that the text sample method can find here.\n' },
  ],
} as PublicationBook;
const run = (repo: string, book: PublicationBook) =>
  buildEdition({ repo, app, book, others, sites: canonicalSites, source: clean, previousSiteDir: defaultPreviousSiteDir(codeRepo) });
function fakeRepo(name: string) {
  const repo = path.join(scratch, name, 'repo'), outside = path.join(scratch, name, 'outside');
  fs.mkdirSync(releaseRootOf(repo), { recursive: true }); fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, 'keep-me.txt'), 'outside sentinel\n');
  return { repo, root: releaseRootOf(repo), outside };
}
const intact = (outside: string) => assert.deepEqual(fs.readdirSync(outside), ['keep-me.txt']);
const cli = (repo: string, result: { quarantine?: string; recovery?: string }) => [
  `language-muscle: NOT BUILT; no manifest written${result.quarantine ? `; incomplete output left in ${path.relative(repo, result.quarantine)}` : ''}`,
  ...(result.recovery ? [`  Previous edition retained for recovery in ${path.relative(repo, result.recovery)}; do not delete it.`] : []),
];
async function withRename(fail: (from: string, to: string) => boolean, body: () => Promise<unknown>) {
  const rename = fs.renameSync;
  fs.renameSync = ((from: fs.PathLike, to: fs.PathLike) => { if (fail(String(from), String(to))) throw new Error('probe injected rename failure'); return rename(from, to); }) as typeof fs.renameSync;
  try { return await body(); } finally { fs.renameSync = rename; }
}
const changed = { ...fakeBook, title: 'Changed review title' } as PublicationBook;

test('manifest rename fails and the new tree cannot be moved back: new tree named as incomplete, good edition named for recovery', async () => {
  const fake = fakeRepo('reverse-fails');
  assert.ok((await run(fake.repo, fakeBook)).ok);
  const folder = path.join(fake.root, 'language-muscle'), before = hashEdition(folder).treeSha256;
  const failed = await withRename((from, to) => from.includes('.manifest.json.tmp-') || (from === folder && to.includes('.incomplete-')), () => run(fake.repo, changed)) as Awaited<ReturnType<typeof run>>;
  assert.equal(failed.ok, false);
  if (failed.ok) return;
  console.log(JSON.stringify({ case: 'reverse-fails', failures: failed.failures, cli: cli(fake.repo, failed) }));
  assert.equal(failed.quarantine, folder, 'the folder that really holds the new tree');
  assert.notEqual(hashEdition(folder).treeSha256, before, 'quarantine holds the new tree, not the good edition');
  assert.ok(failed.recovery && path.basename(failed.recovery).startsWith('.previous-'));
  assert.equal(hashEdition(failed.recovery!).treeSha256, before, 'recovery holds the good edition');
  assert.ok(failed.failures.some(f => /recovery needs attention/.test(f)));
  assert.equal(fs.existsSync(path.join(fake.root, 'language-muscle.manifest.json')), false);
  assert.equal(verifyExistingEdition({ repo: fake.repo, app, book: changed, others, sites: canonicalSites, previousSiteDir: defaultPreviousSiteDir(codeRepo) }).ok, false, 'deploy gate refuses');
  intact(fake.outside);
});

test('new tree never moved in and the previous edition cannot be restored: staging is incomplete, previous named, edition path empty', async () => {
  const fake = fakeRepo('restore-fails');
  assert.ok((await run(fake.repo, fakeBook)).ok);
  const folder = path.join(fake.root, 'language-muscle'), before = hashEdition(folder).treeSha256;
  const failed = await withRename((from, to) => (from.includes('.incomplete-') && to === folder) || from.includes('.previous-'), () => run(fake.repo, changed)) as Awaited<ReturnType<typeof run>>;
  assert.equal(failed.ok, false);
  if (failed.ok) return;
  console.log(JSON.stringify({ case: 'restore-fails', failures: failed.failures, cli: cli(fake.repo, failed) }));
  assert.ok(failed.quarantine && path.basename(failed.quarantine).startsWith('.incomplete-') && fs.existsSync(failed.quarantine));
  assert.notEqual(hashEdition(failed.quarantine!).treeSha256, before);
  assert.ok(failed.recovery && hashEdition(failed.recovery).treeSha256 === before);
  assert.equal(fs.existsSync(folder), false);
  assert.equal(fs.existsSync(path.join(fake.root, 'language-muscle.manifest.json')), false);
  intact(fake.outside);
});

test('first build with no previous edition and a failed manifest rename: staging named, no recovery folder, no manifest', async () => {
  const fake = fakeRepo('first-build');
  const failed = await withRename(from => from.includes('.manifest.json.tmp-'), () => run(fake.repo, fakeBook)) as Awaited<ReturnType<typeof run>>;
  assert.equal(failed.ok, false);
  if (failed.ok) return;
  console.log(JSON.stringify({ case: 'first-build', failures: failed.failures, cli: cli(fake.repo, failed) }));
  assert.ok(failed.quarantine && path.basename(failed.quarantine).startsWith('.incomplete-') && fs.existsSync(failed.quarantine));
  assert.equal(failed.recovery, undefined);
  assert.equal(fs.existsSync(path.join(fake.root, 'language-muscle')), false);
  assert.equal(fs.existsSync(path.join(fake.root, 'language-muscle.manifest.json')), false);
  intact(fake.outside);
});
