/** Unit checks of the release write path and page assembly: the defects found in the 2026-10-27 review (physical folder guard, `$` in book text,
 * unvalidated section ids and colliding output paths). Scratch folders live under the repository's build/ folder and are removed at the end. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after } from 'node:test';
import { fileURLToPath } from 'node:url';
import type { PublicationBook, PublicationSection } from '../../../../packages/reader-core/src/original/types';
import publications from '../../src/books/original-publications.json';
import { sectionIdsOf } from '../../src/release-routes';
import { BODY, HEAD, renderShell } from './render-shell';
import { outputPathProblems, sectionIdProblems } from './route-checks';
import { assertReleasePath, releaseRootOf } from './write-guard';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../..');
const scratch = path.join(repoRoot, 'build', `test-release-repair-${process.pid}`);
after(() => fs.rmSync(scratch, { recursive: true, force: true }));
const books = publications as PublicationBook[];

/** A fake repository in scratch with build/release-books, and a sentinel folder outside it. */
function fakeRepo(name: string): { repo: string; root: string; outside: string; sentinel: string } {
  const base = path.join(scratch, name);
  const repo = path.join(base, 'repo'), outside = path.join(base, 'outside');
  fs.mkdirSync(path.join(repo, 'build', 'release-books'), { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  const sentinel = path.join(outside, 'keep-me.txt');
  fs.writeFileSync(sentinel, 'outside sentinel\n');
  return { repo, root: releaseRootOf(repo), outside, sentinel };
}

test('the guard refuses a symlinked edition folder, release root, build folder or manifest, and leaves the outside sentinel alone', () => {
  const edition = fakeRepo('edition');
  fs.symlinkSync(edition.outside, path.join(edition.root, 'linguistics'));
  assert.throws(() => assertReleasePath(edition.repo, path.join(edition.root, 'linguistics'), 'directory'), /symbolic link/);
  assert.equal(fs.readFileSync(edition.sentinel, 'utf8'), 'outside sentinel\n');

  const root = fakeRepo('root');
  fs.rmSync(root.root, { recursive: true });
  fs.symlinkSync(root.outside, root.root);
  assert.throws(() => assertReleasePath(root.repo, path.join(root.root, 'linguistics'), 'directory'), /symbolic link/);
  assert.throws(() => assertReleasePath(root.repo, root.root, 'directory'), /symbolic link/);

  const build = fakeRepo('build');
  fs.rmSync(path.join(build.repo, 'build'), { recursive: true });
  fs.mkdirSync(path.join(build.outside, 'release-books'));
  fs.symlinkSync(build.outside, path.join(build.repo, 'build'));
  assert.throws(() => assertReleasePath(build.repo, path.join(build.root, 'linguistics'), 'directory'), /symbolic link/);

  const manifest = fakeRepo('manifest');
  fs.symlinkSync(manifest.sentinel, path.join(manifest.root, 'linguistics.manifest.json'));
  assert.throws(() => assertReleasePath(manifest.repo, path.join(manifest.root, 'linguistics.manifest.json'), 'file'), /symbolic link/);
  for (const each of [edition, root, build, manifest]) assert.equal(fs.readFileSync(each.sentinel, 'utf8'), 'outside sentinel\n');

  const clean = fakeRepo('clean');
  fs.mkdirSync(path.join(clean.root, 'linguistics'));
  assert.doesNotThrow(() => assertReleasePath(clean.repo, path.join(clean.root, 'linguistics'), 'directory'));
  assert.doesNotThrow(() => assertReleasePath(clean.repo, path.join(clean.root, 'not-yet-built'), 'directory'));
  assert.throws(() => assertReleasePath(clean.repo, path.join(clean.repo, 'build', 'elsewhere'), 'directory'), /outside the release folder/);
  assert.throws(() => assertReleasePath(clean.repo, path.join(clean.root, '..', 'elsewhere'), 'directory'), /outside the release folder/);
});

test('a $ in book text, title or head reaches the page verbatim: one html, head and title, no marker left', () => {
  const template = `<!doctype html>\n<html lang="en">\n  <head>\n    <title>${HEAD}</title>\n  </head>\n  <body><div id="root">${BODY}</div><script type="module" src="/assets/x.js"></script></body>\n</html>\n`;
  const hostile = "Price: $& and $' and $` and $$ end. $1 $<name>";
  const body = `<main><p>${hostile}</p></main>`;
  const page = renderShell(template, `Title ${hostile}`, `<meta name="description" content="${hostile}">`, body);
  assert.ok(page.includes(body), 'body verbatim');
  assert.ok(page.includes(`<title>Title ${hostile}</title>`), 'title verbatim');
  assert.ok(page.includes(`<meta name="description" content="${hostile}">`), 'head verbatim');
  assert.equal(page.match(/<html[\s>]/g)?.length, 1);
  assert.equal(page.match(/<head[\s>]/g)?.length, 1);
  assert.equal(page.match(/<title>/g)?.length, 1);
  assert.ok(!page.includes('<!--ORF_'));
});

test('section ids: unsafe, reserved and case-colliding ids are refused; every real id passes', () => {
  for (const id of ['..', '.', '', 'theme-..', 'theme-.', 'CaseA', 'index.html', 'llms.txt', 'a/../../escape', '%2e%2e', '-lead', 'x'.repeat(101)]) {
    assert.ok(sectionIdProblems('linguistics', [id]).length > 0, `id ${JSON.stringify(id)} must be refused`);
  }
  for (const id of ['agent', 'assets', 'covers', 'answers', 'sections', 'media', 'about', 'download', 'home']) {
    assert.ok(sectionIdProblems('deliberate-practice', [id]).length > 0, `reserved id ${id} must be refused`);
  }
  assert.ok(sectionIdProblems('linguistics', ['casea', 'casea']).length > 0, 'duplicate id');
  for (const book of books) assert.deepEqual(sectionIdProblems(book.id, sectionIdsOf(book.sections as PublicationSection[])), [], book.id);
});

test('output paths: duplicates ignoring case and a file that is also a folder are refused', () => {
  assert.ok(outputPathProblems(['a/index.html', 'A/index.html']).length > 0);
  assert.ok(outputPathProblems(['index.html', 'index.html']).length > 0);
  assert.ok(outputPathProblems(['agent', 'agent/x.md']).length > 0);
  assert.ok(outputPathProblems(['sections/index.html', 'sections/index.html/x']).length > 0);
  assert.ok(outputPathProblems(['../x.html']).length > 0);
  assert.ok(outputPathProblems(['/x.html']).length > 0);
  assert.deepEqual(outputPathProblems(['index.html', 'a/index.html', 'answers/a.md', 'answers/a/index.html']), []);
});


test('static licence metadata uses the reader URL boundary', async () => {
  const { rootPage, sectionPage } = await import('./static-pages');
  const base = books.find(book => book.id === 'language-muscle')!;
  for (const href of ['javascript:alert(1)', 'data:text/html,bad', 'file:///tmp/unsafe-license']) {
    const book = { ...base, home: { ...base.home, license: { label: 'Fixture licence', href } } };
    for (const page of [rootPage({ book, site: 'https://fixture.invalid/' }), sectionPage({ book, site: 'https://fixture.invalid/' }, book.sections[0])]) {
      assert.ok(!page.html.includes(`href="${href}"`), href);
    }
  }
  const book = { ...base, home: { ...base.home, license: { label: 'Fixture licence', href: 'https://creativecommons.org/licenses/by-sa/4.0/' } } };
  assert.ok(rootPage({ book, site: 'https://fixture.invalid/' }).html.includes('href="https://creativecommons.org/licenses/by-sa/4.0/"'));
});

test('Linguistics release exposes the existing book-wide grant without changing the canonical book or its section bytes', async () => {
  const { releaseProjection } = await import('./projection');
  const { rootPage } = await import('./static-pages');
  const original = books.find(book => book.id === 'linguistics')!;
  const before = JSON.stringify(original);
  const projected = releaseProjection(original).book;
  assert.equal(projected.home?.license?.href, 'https://creativecommons.org/licenses/by-sa/4.0/');
  assert.ok(projected.home?.authorNote?.includes('including to train AI models, with attribution.'));
  const page = rootPage({ book: projected, site: 'https://linguistics.dominiklukes.net/' });
  assert.ok(page.html.includes('https://creativecommons.org/licenses/by-sa/4.0/'));
  assert.ok(page.html.includes('including to train AI models, with attribution.'));
  assert.equal(JSON.stringify(projected.sections), JSON.stringify(original.sections));
  assert.equal(JSON.stringify(original), before);
});
