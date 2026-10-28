/** Release checks of the two converted books served from folders of dominiklukes.net, and of the verifier changes they needed. Run: npm run test:release.
 * Builds use the real app into fake repositories in scratch (build/test-release-books-<pid>/, removed at the end); hostile asset cases use a scratch copy
 * of the few app files the asset plan reads. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, { after, before } from 'node:test';
import { fileURLToPath } from 'node:url';
import { canonicalSites } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/src/canonical-sites';
import { demoEmbeds } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/src/books/demo-books';
import { releaseLocation, sectionIdsOf } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/src/release-routes';
import { buildEdition, hashEdition } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/build-edition';
import { convertedEditionAssets, readAppFile } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/edition-assets';
import { planEdition } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/edition-plan';
import { CONTENT_SECURITY_POLICY, securityHeaders } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/headers';
import { defaultPreviousSiteDir } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/previous-site';
import { editionBase, releaseBooks, selectReleaseBooks } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/release-books';
import { bookIdPattern, sectionIdPattern, sectionIdToken, sitePrefix, verifyEdition } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/verify-edition';
import { verifyExistingEdition } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/verify-existing-edition';
import { releaseRootOf } from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/write-guard';

const app = '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo';
const codeRepo = path.resolve(app, '../..');
const scratch = '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/docs/release-two-books-2026-10-28/repair-review/closure-sol-2026-10-28-01/scratch-reader-tests';
after(() => fs.rmSync(scratch, { recursive: true, force: true }));
const previousSiteDir = defaultPreviousSiteDir(codeRepo);
const clean = { head: 'test', dirty: false, dirtyPaths: [] };
const byId = (id: string) => releaseBooks.find(book => book.id === id)!;
const othersOf = (id: string) => releaseBooks.filter(book => book.id !== id);

test('release registry: five books, folder editions only for the two converted books at their agreed addresses', () => {
  assert.deepEqual(releaseBooks.map(book => book.id), ['deliberate-practice', 'language-muscle', 'linguistics', 'academic-reading', 'readability-foundations']);
  assert.deepEqual(selectReleaseBooks('converted').map(book => book.id), ['academic-reading', 'readability-foundations']);
  assert.deepEqual(selectReleaseBooks('originals').map(book => book.id), ['deliberate-practice', 'language-muscle', 'linguistics']);
  assert.equal(selectReleaseBooks('nonsense').length, 0);
  assert.equal(editionBase(canonicalSites['academic-reading']), '/books/academic-reading/');
  assert.equal(editionBase(canonicalSites['readability-foundations']), '/books/readability/');
  for (const id of ['linguistics', 'deliberate-practice', 'language-muscle']) assert.equal(editionBase(canonicalSites[id]), '/');
  for (const bad of ['https://x.test/Books/', 'https://x.test/a_b/', 'https://x.test/a', 'https://x.test/a/b/c/d/e/', 'https://x.test/a%20b/', 'https://x.test/a%2fb/']) assert.throws(() => editionBase(bad), /Unsupported edition folder/, bad);
  assert.throws(() => planEdition({ book: byId('academic-reading'), site: 'https://academic.example/', appRoot: app, previousSiteDir }), /needs a folder address/);
  assert.throws(() => planEdition({ book: byId('language-muscle'), site: 'https://dominiklukes.net/books/language-muscle/', appRoot: app, previousSiteDir }), /keeps its domain-root address/);
});

test('book identity probes reject foreign registry values without matching prose or longer ids', () => {
  for (const own of selectReleaseBooks('converted')) for (const other of othersOf(own.id)) {
    const probe = bookIdPattern(other.id);
    for (const value of [`{id:"${other.id}",sections:[]}`, `{"bookId":"${other.id}"}`, `book_id='${other.id}'`, `data-book-id="${other.id}"`, `{"${other.id}":{}}`, JSON.stringify(`{id:"${other.id}"}`)]) assert.ok(probe.test(value), value);
    for (const value of [`Read about ${other.id} here.`, `{id:"${other.id}-appendix"}`, `chapter-${other.id}`, `other_id:"${other.id}"`]) assert.equal(probe.test(value), false, value);
  }
});

test('folder routes: a chapter folder, a slash-less edition address and demo parameters become the edition address; nothing outside the folder is read', () => {
  const ids = sectionIdsOf(byId('academic-reading').sections);
  const base = '/books/academic-reading/';
  const at = (pathAndQuery: string) => releaseLocation('academic-reading', `https://dominiklukes.net${pathAndQuery}`, ids, base);
  assert.equal(at('/books/academic-reading/cognition/'), '/books/academic-reading/?section=cognition');
  assert.equal(at('/books/academic-reading/cognition'), '/books/academic-reading/?section=cognition');
  assert.equal(at('/books/academic-reading/cognition/?text=x#frag'), '/books/academic-reading/?text=x&section=cognition#frag');
  assert.equal(at('/books/academic-reading'), '/books/academic-reading/');
  assert.equal(at('/books/academic-reading/?book=linguistics&frontpage=classic'), '/books/academic-reading/');
  assert.equal(at('/books/academic-reading/?section=cognition'), undefined, 'already clean');
  assert.equal(at('/books/academic-reading/#/cognition'), undefined, 'legacy hash route is the reader\'s own');
  assert.equal(at('/cognition/'), undefined, 'a domain-root chapter path is not this edition\'s');
  assert.equal(at('/books/readability/cognition/'), undefined, 'another edition\'s folder is not read');
  assert.equal(at('/books/academic-reading/nonsense/'), undefined);
  assert.equal(at('/books/academic-reading/../academic-reading/cognition/'), '/books/academic-reading/?section=cognition', 'URL parsing normalises dot segments first');
  // Domain-root editions behave exactly as before.
  const linguistics = sectionIdsOf(byId('linguistics').sections);
  assert.equal(releaseLocation('linguistics', `https://x.test/${linguistics[1]}/?book=linguistics#h`, linguistics), `/?section=${encodeURIComponent(linguistics[1])}#h`);
  assert.equal(releaseLocation('linguistics', `https://x.test/${linguistics[1]}/?book=linguistics#h`, linguistics, '/'), `/?section=${encodeURIComponent(linguistics[1])}#h`);
});

test('headers: the domain-root policy is unchanged byte for byte; a folder policy scopes every rule to the folder', () => {
  assert.equal(securityHeaders(), `/*\n  X-Content-Type-Options: nosniff\n  Referrer-Policy: strict-origin-when-cross-origin\n  X-Frame-Options: DENY\n  Permissions-Policy: camera=(), microphone=(), geolocation=()\n  Content-Security-Policy: ${CONTENT_SECURITY_POLICY}\n\n/assets/*\n  Cache-Control: public, max-age=3600\n`);
  const folder = securityHeaders({ base: '/books/readability/', embedRoot: 'embeds/readability-foundations/' });
  const rules = folder.split('\n').filter(line => line && !/^\s/.test(line));
  assert.deepEqual(rules, ['/books/readability/*', '/books/readability/assets/*', '/books/readability/embeds/readability-foundations/*']);
  assert.ok(folder.includes("frame-ancestors 'none'") && folder.includes('X-Frame-Options: DENY'), 'the reader itself cannot be framed');
  assert.match(folder, /embeds\/readability-foundations\/\*\n  ! Content-Security-Policy\n  ! X-Frame-Options\n  Content-Security-Policy: sandbox allow-scripts; default-src 'none';[^\n]*connect-src 'none';[^\n]*frame-ancestors 'self'\n/);
  assert.ok(!/X-Robots-Tag/i.test(folder), 'the host keeps its own indexing rules');
  for (const base of ['books/x/', '/books/x', '/Books/x/', '/books/../x/', '/books/x/*/', '//evil/']) assert.throws(() => securityHeaders({ base }), /Unsafe edition folder/, base);
});

test('section id probes: identifiers are found, ordinary words and longer heading anchors are not', () => {
  const word = sectionIdPattern('accessibility', ['dominiklukes.net/books/readability/']);
  for (const leak of ['{"id":"accessibility","title":"x"}', '{id:"accessibility",title:"x"}', 'JSON.parse(\'{\\"id\\":\\"accessibility\\"}\')', "sectionId: 'accessibility'",
    '<section id="accessibility">', '?book=x&section=accessibility', '#/accessibility', 'agent/readability-foundations/chapters/accessibility.md',
    'https://dominiklukes.net/books/readability/accessibility/']) assert.ok(word.test(leak), leak);
  for (const prose of ['Accessibility matters.', 'Digital accessibility is a legal duty.', 'the accessibility of the text', 'reader-content-accessibility-notes',
    'https://www.w3.org/WAI/accessibility/', 'accessibility-first design', 'section=accessibility-extra', 'grid:"accessibility"']) assert.ok(!word.test(prose), prose);
  const token = sectionIdToken('cognitive-load');
  assert.ok(token.test('"id":"cognitive-load"') && token.test('/cognitive-load/') && token.test('chapters/cognitive-load.md'));
  assert.ok(!token.test('<h2 id="reader-content-cognitive-load-model">') && !token.test('cognitive-loads'));
  assert.equal(sitePrefix('https://dominiklukes.net/books/readability/'), 'dominiklukes.net/books/readability/');
  assert.equal(sitePrefix('https://linguistics.dominiklukes.net/'), 'linguistics.dominiklukes.net');
});

test('asset plan: pinned cover and nine provenance-pinned embeds; descriptors carry the edition folder', () => {
  const academic = convertedEditionAssets(byId('academic-reading'), app, '/books/academic-reading/');
  const readability = convertedEditionAssets(byId('readability-foundations'), app, '/books/readability/');
  assert.equal(academic.record.embeds.length + readability.record.embeds.length, 9);
  assert.deepEqual(academic.embeds.items, demoEmbeds['academic-reading'].items);
  assert.equal(academic.embeds.base, '/books/academic-reading/');
  assert.equal(academic.record.cover.sha256, 'd56c130ac7f8c84f707e8d48aee205981f80efbc7c45866637f5b0b22b524539');
  assert.equal(readability.record.cover.sha256, 'adbedd7db78beaf5a54e9d165b72d302158cc42ada2261745e2bd126c8e074ef');
  assert.deepEqual(readability.files.map(file => file.path).filter(name => name.startsWith('embeds/')).sort(), demoEmbeds['readability-foundations'].items.map(item => `embeds/readability-foundations/${item.src}`).sort());
});

/** A scratch app holding only what the asset plan reads, so hostile changes never touch the real app. */
function scratchApp(name: string): string {
  const root = path.join(scratch, 'apps', name);
  for (const relative of ['scripts/release/converted-book-assets.json', 'src/books/next-books/next-books-provenance.json', 'src/books/next-books/embed-manifest.json', 'public/covers/academic-reading.jpg', 'interactives/academic-reading-framework']) {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.cpSync(path.join(app, relative), path.join(root, relative), { recursive: true });
  }
  return fs.realpathSync(root);
}
test('asset plan refuses changed bytes, symbolic links, traversal and a manifest that differs from the registry', () => {
  const book = byId('academic-reading');
  const plan = (root: string) => convertedEditionAssets(book, root, '/books/academic-reading/');
  assert.equal(plan(scratchApp('sound')).files.length, 4, 'control: the scratch copy plans');
  const changed = scratchApp('changed-embed');
  fs.appendFileSync(path.join(changed, 'interactives/academic-reading-framework/cognition-explorer/index.html'), '<!-- extra -->');
  assert.throws(() => plan(changed), /does not match its provenance hash/);
  const cover = scratchApp('changed-cover');
  fs.appendFileSync(path.join(cover, 'public/covers/academic-reading.jpg'), 'x');
  assert.throws(() => plan(cover), /cover of academic-reading does not match/);
  const leaf = scratchApp('symlink-leaf');
  const target = path.join(leaf, 'interactives/academic-reading-framework/cognition-explorer/index.html');
  fs.renameSync(target, `${target}.real`);
  fs.symlinkSync(`${target}.real`, target);
  assert.throws(() => plan(leaf), /symbolic link/);
  const folder = scratchApp('symlink-folder');
  const dir = path.join(folder, 'interactives/academic-reading-framework');
  fs.renameSync(dir, `${dir}-real`);
  fs.symlinkSync(`${dir}-real`, dir);
  assert.throws(() => plan(folder), /symbolic link/);
  const manifest = scratchApp('manifest-traversal');
  const file = path.join(manifest, 'src/books/next-books/embed-manifest.json');
  const json = JSON.parse(fs.readFileSync(file, 'utf8'));
  json.books['academic-reading'].items[0].src = '../../../outside/index.html';
  fs.writeFileSync(file, JSON.stringify(json));
  assert.throws(() => plan(manifest), /Unsafe embed entry/);
  const drift = scratchApp('manifest-drift');
  const driftFile = path.join(drift, 'src/books/next-books/embed-manifest.json');
  const drifted = JSON.parse(fs.readFileSync(driftFile, 'utf8'));
  drifted.books['academic-reading'].items[0].title = 'A different title';
  fs.writeFileSync(driftFile, JSON.stringify(drifted));
  assert.throws(() => plan(drift), /differs from the demo registry/);
  for (const bad of ['../x', '/etc/passwd', 'a/./b', 'a//b', 'a\\b', '']) assert.throws(() => readAppFile(app, bad), /unsafe asset path/i, bad);
});

let built: { repo: string; folder: string } | undefined;
before(async () => {
  const repo = path.join(scratch, 'repo-academic');
  fs.mkdirSync(releaseRootOf(repo), { recursive: true });
  const result = await buildEdition({ repo, app, book: byId('academic-reading'), others: othersOf('academic-reading'), sites: canonicalSites, source: clean, previousSiteDir });
  assert.ok(result.ok, JSON.stringify(result));
  built = { repo, folder: result.folder };
});

test('write path: a converted edition is staged, verified, swapped and recorded; verify:release passes it and the manifest records folder, cover and embeds', () => {
  const { repo, folder } = built!;
  const manifest = JSON.parse(fs.readFileSync(path.join(releaseRootOf(repo), 'academic-reading.manifest.json'), 'utf8'));
  assert.equal(manifest.site, 'https://dominiklukes.net/books/academic-reading/');
  assert.equal(manifest.edition.base, '/books/academic-reading/');
  assert.equal(manifest.edition.embeds.length, 3);
  assert.equal(manifest.edition.cover.variant, 'academic-reading-framework-03-print-connected-ideas');
  assert.equal(manifest.treeSha256, hashEdition(folder).treeSha256);
  assert.deepEqual(fs.readdirSync(releaseRootOf(repo)).sort(), ['academic-reading', 'academic-reading.manifest.json']);
  const verdict = verifyExistingEdition({ repo, app, book: byId('academic-reading'), others: othersOf('academic-reading'), sites: canonicalSites, previousSiteDir });
  assert.deepEqual(verdict.failures, []);
});

/** Copies the built edition, changes it, and returns the verifier's failures; the built edition itself is never changed. */
function tampered(name: string, change: (dir: string) => void): string[] {
  const dir = path.join(scratch, 'tampered', name);
  fs.cpSync(built!.folder, dir, { recursive: true });
  change(dir);
  const plan = planEdition({ book: byId('academic-reading'), site: canonicalSites['academic-reading'], appRoot: app, previousSiteDir });
  return verifyEdition({ plan, others: othersOf('academic-reading'), otherSites: Object.entries(canonicalSites).filter(([id]) => id !== 'academic-reading').map(([, url]) => url), outDir: dir });
}
const bundleOf = (dir: string) => fs.readdirSync(path.join(dir, 'assets')).filter(name => /^index-.*\.js$/.test(name)).map(name => path.join(dir, 'assets', name)).sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0];
test('verifier red cases on a real converted edition: each tampering is reported', () => {
  assert.deepEqual(tampered('control', () => undefined), [], 'control: an untouched copy passes');
  const expect = (name: string, change: (dir: string) => void, pattern: RegExp) => {
    const failures = tampered(name, change);
    assert.ok(failures.some(failure => pattern.test(failure)), `${name}: ${failures.join(' | ') || 'no failure'}`);
  };
  for (const other of othersOf('academic-reading')) {
    expect(`registry-${other.id}`, dir => fs.appendFileSync(bundleOf(dir), `\n;globalThis.foreignBook={id:"${other.id}",sections:[]};`), /book id/);
  }
  expect('other-book-id', dir => fs.appendFileSync(bundleOf(dir), '\n;var leak={id:"accessibility"};'), /section id accessibility of readability-foundations/);
  expect('other-book-route', dir => fs.appendFileSync(path.join(dir, 'index.html'), '<a href="https://dominiklukes.net/books/readability/accessibility/">x</a>'), /readability/);
  expect('other-embed', dir => fs.appendFileSync(bundleOf(dir), '\n;var x="embeds/readability-foundations/";'), /embed folder of readability-foundations|unplanned/);
  expect('other-cover', dir => fs.appendFileSync(bundleOf(dir), '\n;var x="covers/linguistics.jpg";'), /cover of linguistics/);
  expect('missing-embed', dir => fs.rmSync(path.join(dir, 'embeds/academic-reading/cognition-explorer/index.html')), /missing planned file embeds\/academic-reading\/cognition-explorer/);
  expect('extra-embed', dir => { fs.mkdirSync(path.join(dir, 'embeds/academic-reading/extra'), { recursive: true }); fs.writeFileSync(path.join(dir, 'embeds/academic-reading/extra/index.html'), '<p>x</p>'); }, /unplanned file embeds\/academic-reading\/extra/);
  expect('changed-embed', dir => fs.appendFileSync(path.join(dir, 'embeds/academic-reading/cognition-explorer/index.html'), '<script src="https://evil.test/x.js"></script>'), /loads an outside resource/);
  expect('network-embed', dir => fs.appendFileSync(path.join(dir, 'embeds/academic-reading/reading-simplified-summary/index.html'), '<script>fetch("https://evil.test")</script>'), /network request/);
  expect('unscoped-headers', dir => fs.appendFileSync(path.join(dir, '_headers'), '\n/*\n  X-Frame-Options: SAMEORIGIN\n'), /_headers: every rule must start with \/books\/academic-reading\//);
  expect('no-embed-rule', dir => fs.writeFileSync(path.join(dir, '_headers'), securityHeaders({ base: '/books/academic-reading/' })), /no embed rule/);
  expect('root-address', dir => fs.appendFileSync(bundleOf(dir), '\n;var c="/covers/academic-reading.jpg";'), /domain-root address of an edition file/);
  expect('root-page-address', dir => fs.writeFileSync(path.join(dir, 'cognition/index.html'), fs.readFileSync(path.join(dir, 'cognition/index.html'), 'utf8').replace('</body>', '<img src="/covers/academic-reading.jpg"></body>')), /root-relative address outside/);
  expect('robots', dir => fs.writeFileSync(path.join(dir, 'robots.txt'), 'User-agent: *\nDisallow: /\n'), /robots\.txt in a folder edition|unplanned file robots\.txt/);
  expect('demo-ui', dir => fs.appendFileSync(bundleOf(dir), '\n;var d="demo-frontpage-chooser";'), /demo chooser/);
  expect('private-path', dir => fs.appendFileSync(path.join(dir, 'llms.txt'), '\n/Users/someone/private\n'), /private path/);
});
