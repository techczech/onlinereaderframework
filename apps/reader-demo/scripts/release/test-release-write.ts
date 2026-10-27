/** Write-path checks of the release build, with real Vite builds of a small fake book into a fake repository in scratch
 * (build/test-release-write-<pid>/, removed at the end). Each case keeps a sentinel folder outside the fake release folder and checks it afterwards. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { PublicationBook } from '../../../../packages/reader-core/src/original/types';
import publications from '../../src/books/original-publications.json';
import { canonicalSites } from '../../src/canonical-sites';
import { buildEdition, hashEdition } from './build-edition';
import { defaultPreviousSiteDir } from './previous-site';
import { escapeHtml } from './static-pages';
import { verifyExistingEdition } from './verify-existing-edition';
import { releaseRootOf } from './write-guard';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const codeRepo = path.resolve(app, '../..');
const scratch = path.join(codeRepo, 'build', `test-release-write-${process.pid}`);
after(() => fs.rmSync(scratch, { recursive: true, force: true }));
const books = publications as PublicationBook[];
const others = books.filter(book => book.id !== 'language-muscle');
const clean = { head: 'test', dirty: false, dirtyPaths: [] };

/** A two-section stand-in for Language Muscle (its cover and address are real), with every replacement pattern of String.replace in its text. */
const hostile = "Price: $& and $' and $` and $$ end, $1 and $<name>.";
const fakeBook: PublicationBook = {
  id: 'language-muscle', title: `Fake release book ${hostile}`, author: 'Test Author $&', description: `A fake book for the write-path test ${hostile}`,
  sections: [
    { id: 'first-section', title: `First ${hostile}`, content: `# First\n\nThis is a plain sentence used as the sample text of the first section of the fake book.\n\n${hostile}\n` },
    { id: 'second-section', title: 'Second', content: 'The second section carries another plain sentence that the text sample method can find here.\n' },
  ],
} as PublicationBook;

function fakeRepo(name: string): { repo: string; root: string; outside: string; sentinel: string } {
  const repo = path.join(scratch, name, 'repo'), outside = path.join(scratch, name, 'outside');
  fs.mkdirSync(releaseRootOf(repo), { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  const sentinel = path.join(outside, 'keep-me.txt');
  fs.writeFileSync(sentinel, 'outside sentinel\n');
  return { repo, root: releaseRootOf(repo), outside, sentinel };
}
const intact = (fake: { outside: string; sentinel: string }): void => {
  assert.deepEqual(fs.readdirSync(fake.outside), ['keep-me.txt']);
  assert.equal(fs.readFileSync(fake.sentinel, 'utf8'), 'outside sentinel\n');
};
const run = (repo: string, book: PublicationBook, otherBooks = others) =>
  buildEdition({ repo, app, book, others: otherBooks, sites: canonicalSites, source: clean, previousSiteDir: defaultPreviousSiteDir(codeRepo) });

test('a symlinked edition folder, release folder or manifest is refused before anything is built, deleted or written', async () => {
  const edition = fakeRepo('edition');
  fs.symlinkSync(edition.outside, path.join(edition.root, 'language-muscle'));
  const first = await run(edition.repo, fakeBook);
  assert.equal(first.ok, false);
  intact(edition);

  const root = fakeRepo('root');
  fs.rmSync(root.root, { recursive: true });
  fs.symlinkSync(root.outside, root.root);
  assert.equal((await run(root.repo, fakeBook)).ok, false);
  intact(root);

  const manifest = fakeRepo('manifest');
  fs.symlinkSync(manifest.sentinel, path.join(manifest.root, 'language-muscle.manifest.json'));
  assert.equal((await run(manifest.repo, fakeBook)).ok, false);
  intact(manifest);
  assert.ok(fs.lstatSync(path.join(manifest.root, 'language-muscle.manifest.json')).isSymbolicLink(), 'the symlink itself is not removed either');
});

test('an unsafe section id is refused before any write, and the previous manifest and folder stay as they were', async () => {
  const fake = fakeRepo('ids');
  fs.mkdirSync(path.join(fake.root, 'language-muscle'));
  fs.writeFileSync(path.join(fake.root, 'language-muscle', 'old.txt'), 'old\n');
  fs.writeFileSync(path.join(fake.root, 'language-muscle.manifest.json'), '{}\n');
  for (const id of ['index.html', 'theme-..', 'agent', 'CaseA']) {
    const result = await run(fake.repo, { ...fakeBook, sections: [{ ...fakeBook.sections[0], id }, fakeBook.sections[1]] } as PublicationBook);
    assert.equal(result.ok, false, id);
  }
  assert.deepEqual(fs.readdirSync(fake.root).sort(), ['language-muscle', 'language-muscle.manifest.json']);
  assert.deepEqual(fs.readdirSync(path.join(fake.root, 'language-muscle')), ['old.txt']);
  intact(fake);
});

test('a $ in the book builds verbatim pages; a failed verification keeps the previous edition and leaves no manifest; verify:release checks the folder', async () => {
  const fake = fakeRepo('build');
  const built = await run(fake.repo, fakeBook);
  assert.ok(built.ok, built.ok ? '' : built.failures.join('\n'));
  const folder = path.join(fake.root, 'language-muscle');
  const page = fs.readFileSync(path.join(folder, 'first-section', 'index.html'), 'utf8');
  assert.ok(page.includes(`<title>${escapeHtml(`First ${hostile}`)} — `), 'title with every $ pattern verbatim');
  assert.ok(fs.readFileSync(path.join(folder, 'index.html'), 'utf8').includes(escapeHtml(fakeBook.description)), 'description verbatim');
  assert.equal(page.match(/<html[\s>]/g)?.length, 1);
  assert.ok(!page.includes('<!--ORF_'));
  assert.ok(fs.existsSync(path.join(folder, '_headers')) && fs.existsSync(path.join(folder, '404.html')));
  assert.deepEqual(fs.readdirSync(fake.root).sort(), ['language-muscle', 'language-muscle.manifest.json'], 'no staging or previous folder left');

  const check = () => verifyExistingEdition({ repo: fake.repo, app, book: fakeBook, others, sites: canonicalSites, previousSiteDir: defaultPreviousSiteDir(codeRepo) });
  const passed = check();
  assert.ok(passed.ok, passed.failures.join('\n'));
  const extra = path.join(folder, 'extra.txt');
  fs.writeFileSync(extra, 'added after the build\n');
  assert.ok(check().failures.some(failure => /not in manifest/.test(failure)));
  fs.rmSync(extra);
  const manifestPath = path.join(fake.root, 'language-muscle.manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  fs.writeFileSync(manifestPath, JSON.stringify({ ...manifest, sourceTreeDirty: true }));
  assert.ok(check().failures.some(failure => /uncommitted/.test(failure)), 'a dirty-source manifest is refused');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest));
  assert.ok(check().ok);

  // A second build that fails verification: another book sharing this book's text.
  const before = hashEdition(folder).treeSha256;
  const twin = { ...fakeBook, id: 'twin-book', title: 'Twin', sections: fakeBook.sections.map(section => ({ ...section, id: `twin-${section.id}` })) } as PublicationBook;
  const failed = await run(fake.repo, fakeBook, [...others, twin]);
  assert.equal(failed.ok, false);
  assert.ok(!failed.ok && failed.failures.some(failure => /another book's text sample/.test(failure)), JSON.stringify(failed));
  assert.equal(hashEdition(folder).treeSha256, before, 'previous edition untouched');
  assert.ok(!fs.existsSync(manifestPath), 'old manifest invalidated, no new manifest');
  assert.ok(!failed.ok && failed.quarantine && path.basename(failed.quarantine).startsWith('.incomplete-language-muscle-') && fs.existsSync(failed.quarantine));
  assert.equal(check().ok, false, 'verify:release refuses an edition without a manifest');
  intact(fake);
});


test('all late publication failures identify only incomplete output, preserving the previous edition and no manifest', async () => {
  for (const point of ['manifest-write', 'previous-rename', 'edition-rename', 'manifest-rename']) {
    const fake = fakeRepo(`late-${point}`);
    assert.ok((await run(fake.repo, fakeBook)).ok);
    const folder = path.join(fake.root, fakeBook.id);
    const manifest = path.join(fake.root, `${fakeBook.id}.manifest.json`);
    const before = hashEdition(folder).treeSha256;
    const rename = fs.renameSync, write = fs.writeFileSync;
    let failed;
    try {
      fs.writeFileSync = ((file, ...args) => {
        if (point === 'manifest-write' && String(file).includes('.manifest.json.tmp-')) throw new Error('test manifest write failure');
        return write(file, ...args);
      }) as typeof fs.writeFileSync;
      fs.renameSync = ((from, to) => {
        if ((point === 'previous-rename' && String(from) === folder && String(to).includes('.previous-')) ||
          (point === 'edition-rename' && String(from).includes('.incomplete-') && String(to) === folder) ||
          (point === 'manifest-rename' && String(from).includes('.manifest.json.tmp-'))) throw new Error(`test ${point} failure`);
        return rename(from, to);
      }) as typeof fs.renameSync;
      failed = await run(fake.repo, { ...fakeBook, title: 'Changed replacement title' });
    } finally { fs.renameSync = rename; fs.writeFileSync = write; }
    assert.equal(failed.ok, false, JSON.stringify(failed));
    assert.equal(hashEdition(folder).treeSha256, before, point);
    assert.equal(fs.existsSync(manifest), false, point);
    assert.ok(!failed.ok && failed.quarantine && failed.quarantine !== folder && fs.existsSync(failed.quarantine), point);
    assert.ok(!failed.ok && path.basename(failed.quarantine!).startsWith('.incomplete-'), point);
    intact(fake);
  }
});

test('a rollback failure names the retained good edition separately from incomplete output', async () => {
  const fake = fakeRepo('rollback-report');
  assert.ok((await run(fake.repo, fakeBook)).ok);
  const folder = path.join(fake.root, fakeBook.id), before = hashEdition(folder).treeSha256;
  const rename = fs.renameSync;
  let failed;
  try {
    fs.renameSync = ((from, to) => {
      if (String(from).includes('.manifest.json.tmp-') || String(from).includes('.previous-')) throw new Error('test manifest or restore failure');
      return rename(from, to);
    }) as typeof fs.renameSync;
    failed = await run(fake.repo, { ...fakeBook, title: 'Changed replacement title' });
  } finally { fs.renameSync = rename; }
  assert.equal(failed.ok, false);
  assert.ok(!failed.ok && failed.recovery && fs.existsSync(failed.recovery));
  assert.equal(hashEdition(failed.recovery!).treeSha256, before);
  assert.ok(!failed.ok && failed.quarantine && fs.existsSync(failed.quarantine) && failed.quarantine !== failed.recovery);
  assert.equal(fs.existsSync(path.join(fake.root, `${fakeBook.id}.manifest.json`)), false);
  intact(fake);
});
