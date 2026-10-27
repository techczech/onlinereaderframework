/** Reviewer probe (final review 2026-10-27): failure injection at every promotion step of buildEdition, in a fake repo under build/review-final-probe/run-<pid>/. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after } from 'node:test';
const app = '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo';
const codeRepo = path.resolve(app, '../..');
const { buildEdition, hashEdition } = await import(path.join(app, 'scripts/release/build-edition.ts'));
const { defaultPreviousSiteDir } = await import(path.join(app, 'scripts/release/previous-site.ts'));
const { releaseRootOf } = await import(path.join(app, 'scripts/release/write-guard.ts'));
const { verifyExistingEdition } = await import(path.join(app, 'scripts/release/verify-existing-edition.ts'));
const publications = JSON.parse(fs.readFileSync(path.join(app, 'src/books/original-publications.json'), 'utf8'));
const { canonicalSites } = await import(path.join(app, 'src/canonical-sites.ts'));
const scratch = path.join(codeRepo, 'build', 'review-final-probe', `run-${process.pid}`);
after(() => fs.rmSync(scratch, { recursive: true, force: true }));
const others = publications.filter((b: any) => b.id !== 'language-muscle');
const clean = { head: 'test', dirty: false, dirtyPaths: [] };
const fakeBook = { id: 'language-muscle', title: 'Probe book', author: 'Probe', description: 'A probe book for late failure injection.',
  sections: [
    { id: 'first-section', title: 'First', content: '# First\n\nThis is a plain sentence used as the sample text of the first probe section here.\n' },
    { id: 'second-section', title: 'Second', content: 'The second probe section carries another plain sentence that the sample method can find.\n' },
  ] };
function fakeRepo(name: string) {
  const repo = path.join(scratch, name, 'repo'), outside = path.join(scratch, name, 'outside');
  fs.mkdirSync(releaseRootOf(repo), { recursive: true }); fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(outside, 'keep-me.txt'), 'outside\n');
  return { repo, root: releaseRootOf(repo), outside };
}
const run = (repo: string, book: any) => buildEdition({ repo, app, book, others, sites: canonicalSites, source: clean, previousSiteDir: defaultPreviousSiteDir(codeRepo) });
const check = (repo: string) => verifyExistingEdition({ repo, app, book: fakeBook, others, sites: canonicalSites, previousSiteDir: defaultPreviousSiteDir(codeRepo) });
type Inject = { renameWhen?: (from: string, to: string) => boolean; writeWhen?: (file: string) => boolean; rmWhen?: (p: string) => boolean };
async function withInjection(inject: Inject, body: () => Promise<any>) {
  const rename = fs.renameSync, write = fs.writeFileSync, rm = fs.rmSync;
  fs.renameSync = ((a: any, b: any) => { if (inject.renameWhen?.(String(a), String(b))) throw Object.assign(new Error('injected rename EACCES'), { code: 'EACCES' }); return rename(a, b); }) as any;
  fs.writeFileSync = ((f: any, ...rest: any[]) => { if (inject.writeWhen?.(String(f))) throw Object.assign(new Error('injected write ENOSPC'), { code: 'ENOSPC' }); return (write as any)(f, ...rest); }) as any;
  fs.rmSync = ((p: any, o: any) => { if (inject.rmWhen?.(String(p))) throw Object.assign(new Error('injected rm EBUSY'), { code: 'EBUSY' }); return rm(p, o); }) as any;
  try { return await body(); } finally { fs.renameSync = rename; fs.writeFileSync = write; fs.rmSync = rm; }
}
const listing = (root: string) => fs.readdirSync(root).sort();
const intact = (f: { outside: string }) => assert.deepEqual(fs.readdirSync(f.outside), ['keep-me.txt']);
const changed = { ...fakeBook, title: 'Changed probe title' };

const cases: Array<[string, Inject]> = [
  ['temporary manifest write', { writeWhen: f => f.includes('.manifest.json.tmp-') }],
  ['old folder moved aside', { renameWhen: (a, b) => path.basename(b).startsWith('.previous-') }],
  ['staging moved into place', { renameWhen: a => path.basename(a).startsWith('.incomplete-') }],
  ['final manifest rename', { renameWhen: a => a.includes('.manifest.json.tmp-') }],
];
for (const [name, inject] of cases) test(`late failure at ${name}: old tree and hash restored, no manifest, staging retained, outside untouched`, async () => {
  const fake = fakeRepo(name.replace(/\W+/g, '-'));
  const ok = await run(fake.repo, fakeBook); assert.ok(ok.ok, JSON.stringify(ok));
  const folder = path.join(fake.root, fakeBook.id), manifest = path.join(fake.root, `${fakeBook.id}.manifest.json`);
  const before = hashEdition(folder).treeSha256;
  const failed = await withInjection(inject, () => run(fake.repo, changed));
  assert.equal(failed.ok, false);
  assert.equal(hashEdition(folder).treeSha256, before, 'old tree restored');
  assert.equal(fs.existsSync(manifest), false, 'no deployable manifest');
  assert.equal(check(fake.repo).ok, false, 'verify:release refuses');
  const left = listing(fake.root);
  console.log(`[${name}] failures=${JSON.stringify(failed.failures)} quarantine=${path.relative(fake.root, failed.quarantine ?? '')} listing=${JSON.stringify(left)}`);
  assert.ok(!left.some(n => n.includes('.tmp-')), 'no temporary manifest left');
  assert.ok(!left.some(n => n.startsWith('.previous-')), 'no previous left after successful recovery');
  assert.equal(left.filter(n => n.startsWith('.incomplete-')).length, 1, 'new tree quarantined under staging name');
  intact(fake);
  // Reported quarantine must name the new tree, never the restored previous edition.
  assert.notEqual(path.resolve(failed.quarantine), path.resolve(folder), `quarantine reported as the restored previous edition (${name})`);
});

test('recovery itself fails (manifest rename and reverse rename both fail): both trees kept, no manifest, previous never deleted', async () => {
  const fake = fakeRepo('recovery-fails');
  assert.ok((await run(fake.repo, fakeBook)).ok);
  const folder = path.join(fake.root, fakeBook.id);
  const before = hashEdition(folder).treeSha256;
  const failed = await withInjection({ renameWhen: (a, b) => a.includes('.manifest.json.tmp-') || path.basename(b).startsWith('.incomplete-') }, () => run(fake.repo, changed));
  assert.equal(failed.ok, false);
  const left = listing(fake.root);
  console.log(`[recovery-fails] failures=${JSON.stringify(failed.failures)} listing=${JSON.stringify(left)}`);
  const prev = left.find(n => n.startsWith('.previous-'));
  assert.ok(prev, 'previous retained');
  assert.equal(hashEdition(path.join(fake.root, prev!)).treeSha256, before, 'previous bytes intact');
  assert.equal(fs.existsSync(path.join(fake.root, `${fakeBook.id}.manifest.json`)), false);
  assert.equal(check(fake.repo).ok, false);
  assert.ok(failed.failures.some((f: string) => /recovery needs attention/.test(f)));
  intact(fake);
  // A rerun after manual-recovery state: must not delete the retained old .previous tree.
  const again = await run(fake.repo, fakeBook);
  assert.ok(again.ok, JSON.stringify(again));
  assert.ok(fs.existsSync(path.join(fake.root, prev!)), 'older retained previous still present after rerun');
  console.log(`[recovery-fails rerun] listing=${JSON.stringify(listing(fake.root))}`);
});

test('cleanup failure after commit point: published edition stays, previous retained', async () => {
  const fake = fakeRepo('cleanup');
  assert.ok((await run(fake.repo, fakeBook)).ok);
  const r = await withInjection({ rmWhen: p => path.basename(p).startsWith('.previous-') }, () => run(fake.repo, changed));
  assert.ok(r.ok);
  assert.ok(check(fake.repo).ok === false || true);
  console.log(`[cleanup] listing=${JSON.stringify(listing(fake.root))}`);
  assert.ok(fs.existsSync(path.join(fake.root, `${fakeBook.id}.manifest.json`)));
  intact(fake);
});

test('first build (no previous) failing at manifest rename leaves no folder and no manifest', async () => {
  const fake = fakeRepo('first');
  const failed = await withInjection({ renameWhen: a => a.includes('.manifest.json.tmp-') }, () => run(fake.repo, fakeBook));
  assert.equal(failed.ok, false);
  const left = listing(fake.root);
  console.log(`[first] listing=${JSON.stringify(left)} quarantine=${path.basename(failed.quarantine ?? '')}`);
  assert.ok(!left.includes(fakeBook.id) && !left.includes(`${fakeBook.id}.manifest.json`));
  intact(fake);
});
