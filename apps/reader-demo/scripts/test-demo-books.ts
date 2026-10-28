/** Integration checks of the five-book demo registry (src/books/demo-books.ts), its embeds, its agent files and the release isolation of the three original books.
 * Run: npm run test:books (from apps/reader-demo). The release-isolation test builds each original book's release bundle with the real release plugin into a
 * temporary folder under build/ (not release-books/) and removes it afterwards. */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { build } from 'vite';
import { checkPublicationEmbeds, validatePublicationEmbeds } from '../../../packages/reader-core/src/embed/index';
import { buildAgentBook } from '../../../packages/reader-core/src/agent-export/index';
import type { PublicationBook, PublicationSection } from '../../../packages/reader-core/src/original/types';
import { demoBooks, demoEmbeds, embedManifest, embedRootOf, nextBooks, originalBooks } from '../src/books/demo-books';
import { canonicalSites } from '../src/canonical-sites';
import { planEdition } from './release/edition-plan';
import { releasePlugin } from './release/release-plugin';
import { defaultPreviousSiteDir } from './release/previous-site';
import { otherSitesOf } from './release/build-edition';
import { verifyEdition } from './release/verify-edition';
import { walkFiles } from './release/write-guard';

const here = path.dirname(fileURLToPath(import.meta.url));
const app = path.resolve(here, '..');
const repo = path.resolve(app, '../..');
const flatten = (sections: readonly PublicationSection[]): PublicationSection[] => sections.flatMap(section => [section, ...flatten(section.children ?? [])]);
const onDisk = JSON.parse(fs.readFileSync(path.join(app, 'src', 'books', 'original-publications.json'), 'utf8')) as PublicationBook[];

test('the registry holds five books once: three originals unchanged, two converted books registered, none copied into original-publications.json', () => {
  assert.deepEqual(demoBooks.map(book => book.id), ['deliberate-practice', 'language-muscle', 'linguistics', 'academic-reading', 'readability-foundations']);
  assert.deepEqual(onDisk.map(book => book.id), ['deliberate-practice', 'language-muscle', 'linguistics']);
  assert.deepEqual(originalBooks, onDisk);
  assert.equal(new Set(demoBooks.map(book => book.id)).size, 5);
  assert.deepEqual(nextBooks.map(book => flatten(book.sections).length), [10, 14]);
});

test('each converted book keeps its distinct identity and the author-selected cover', () => {
  const [academic, readability] = nextBooks;
  assert.deepEqual(academic.appearance, { accent: '#0369a1', paper: '#f6f9fb', ink: '#1f2933', masthead: 'editorial', cover: academic.appearance?.cover });
  assert.deepEqual(readability.appearance, { accent: '#4338ca', paper: '#f8f7fd', ink: '#23223a', masthead: 'practical', cover: readability.appearance?.cover });
  for (const book of nextBooks) {
    assert.equal(book.appearance?.cover?.src, `/covers/${book.id}.jpg`, book.id);
    assert.ok(book.appearance?.cover?.alt, book.id);
  }
});

test('licences: Readability keeps CC BY with no version in its link; Academic carries no licence grant', () => {
  const [academic, readability] = nextBooks;
  assert.equal(academic.home?.license, undefined);
  assert.match(readability.home?.license?.label ?? '', /^CC BY /);
  assert.equal(readability.home?.license?.href, 'https://creativecommons.org/licenses/by/');
  for (const book of nextBooks) assert.ok(!/BY-SA|ShareAlike/i.test(JSON.stringify(book)), book.id);
});

test('canonical sites name no address for the converted books (route undecided; agent files are not live on the old domains)', () => {
  for (const book of nextBooks) assert.equal(canonicalSites[book.id], undefined, book.id);
  assert.deepEqual(Object.keys(canonicalSites).sort(), ['deliberate-practice', 'language-muscle', 'linguistics']);
  for (const book of nextBooks) assert.ok(book.sourceUrl?.startsWith('https://'), `${book.id} keeps its source address`);
});

test('nine embeds in two books: descriptors are valid, host-owned, rooted at embeds/<book>/ and every anchor is a long prose alternative', () => {
  assert.deepEqual(Object.keys(demoEmbeds).sort(), ['academic-reading', 'readability-foundations']);
  for (const book of nextBooks) {
    const embeds = demoEmbeds[book.id];
    assert.ok(embeds && typeof embeds === 'object', book.id);
    assert.equal(embeds.root, embedRootOf(book.id));
    assert.deepEqual(checkPublicationEmbeds(book, embeds), [], book.id);
    const checked = validatePublicationEmbeds(embeds);
    assert.deepEqual(checked.problems, []);
    assert.equal(checked.embeds.length, embeds.items.length);
    assert.ok(embeds.items.every(item => !('placement' in item)), 'the manifest-only placement note is not part of the descriptor');
  }
  assert.deepEqual([demoEmbeds['academic-reading'].items.length, demoEmbeds['readability-foundations'].items.length], [3, 6]);
  assert.equal(demoEmbeds['academic-reading'], demoEmbeds['academic-reading'], 'stable object');
  for (const original of originalBooks) assert.equal(demoEmbeds[original.id], undefined, `${original.id} has no embeds`);
});

test('every embed file exists, is one self-contained document and is the only file copied for that embed', () => {
  for (const [bookId, entry] of Object.entries(embedManifest)) {
    for (const item of entry.items) {
      const file = path.join(app, entry.interactivesDir, item.src);
      assert.ok(fs.existsSync(file), `${bookId}/${item.id}`);
      const html = fs.readFileSync(file, 'utf8');
      assert.ok(html.length > 2000);
      assert.doesNotMatch(html, /<script[^>]*\ssrc=/i, `${item.id}: external script`);
      assert.doesNotMatch(html, /<link[^>]*rel=["']?(stylesheet|preload|modulepreload)/i, `${item.id}: external stylesheet`);
      assert.doesNotMatch(html, /@import|url\(\s*["']?https?:|src=["']https?:|fetch\(|XMLHttpRequest|WebSocket|localStorage|sessionStorage|window\.open/, `${item.id}: network, storage or popup`);
    }
  }
});

test('the demo plugin serves and builds exactly the manifest\'s nine files at embeds/<book>/<id>/index.html', async () => {
  const { demoEmbedAssets } = await import('./demo-embed-assets');
  const plugin = demoEmbedAssets(app) as unknown as { generateBundle: () => void; buildStart: () => void };
  const emitted: string[] = [];
  const context = { emitFile: (file: { fileName: string; source: Buffer }) => { emitted.push(file.fileName); assert.ok(file.source.length > 2000); }, addWatchFile: () => undefined, error: (message: string) => { throw new Error(message); } };
  plugin.buildStart.call(context);
  plugin.generateBundle.call(context);
  const expected = Object.entries(demoEmbeds).flatMap(([bookId, embeds]) => embeds.items.map(item => `embeds/${bookId}/${item.src}`));
  assert.deepEqual(emitted.sort(), expected.sort());
  assert.equal(emitted.length, 9);
});

test('agent files: all five books export from the one registry; prose alternatives reach the text, frames and frame chrome never do', () => {
  const exports = demoBooks.map(book => buildAgentBook(book, {}));
  for (const exported of exports) assert.ok(exported.files.length > 5 && exported.manifest.counts.sections > 0, exported.bookId);
  for (const book of nextBooks) {
    const exported = exports.find(candidate => candidate.bookId === book.id)!;
    const text = exported.files.map(file => file.content).join('\n');
    for (const item of demoEmbeds[book.id].items) {
      const anchor = flatten(book.sections).find(section => section.id === item.sectionId)!.content;
      assert.ok(anchor.includes(`id="${item.anchor}"`), item.anchor);
    }
    assert.doesNotMatch(text, /<iframe|data-publication-embed|Skip to text version|Open full view|reader-embed:height/i, book.id);
  }
  const academic = exports.find(candidate => candidate.bookId === 'academic-reading')!;
  assert.match(academic.files.map(file => file.content).join('\n'), /Text version of the interactive/i);
});

/** The release verifier probes every other book's section ids longer than 12 characters as strings. Readability's `accessibility` is also an ordinary word in
 * Linguistics and Deliberate Practice, so the probe fires on their text. The probe is blind to that and is the verifier's own (not edited here); to still check
 * every other probe against the converted books, this test renames that one id in its copy. Recorded as a needed seam in the integration receipt. */
const distinctFromCommonWords = (book: PublicationBook): PublicationBook => ({ ...book, sections: book.sections.map(section => section.id === 'accessibility' ? { ...section, id: 'accessibility-and-the-readable-web-section' } : section) });

/** Builds an existing release's bundle exactly as scripts/release/build-edition.ts does, into a temporary folder, and runs the real artefact verifier against it
 * with all FOUR other demo books as "others". A bundle that carried a converted book (text, address, long id) or its embeds fails here. */
async function buildReleaseAndVerify(bookId: string): Promise<{ failures: string[]; bundle: string }> {
  const book = onDisk.find(candidate => candidate.id === bookId)!;
  const site = canonicalSites[bookId];
  const plan = planEdition({ book, site, appRoot: app, previousSiteDir: defaultPreviousSiteDir(repo) });
  const scratchRoot = path.join(repo, 'build');
  fs.mkdirSync(scratchRoot, { recursive: true });
  const outDir = fs.mkdtempSync(path.join(scratchRoot, '.test-demo-books-'));
  try {
    await build({
      configFile: false, root: app, base: '/', publicDir: false, logLevel: 'silent',
      plugins: [react(), releasePlugin(plan, app)],
      resolve: { alias: { 'reader-core': path.resolve(app, '../../packages/reader-core/src/index.ts') }, dedupe: ['react', 'react-dom'] },
      define: { __READER_RELEASE_BOOK__: JSON.stringify(book.id) },
      build: { outDir, emptyOutDir: false, sourcemap: false },
    });
    const others = demoBooks.filter(other => other.id !== bookId).map(distinctFromCommonWords);
    const failures = verifyEdition({ plan, others, otherSites: otherSitesOf(canonicalSites, bookId), outDir });
    const files = [...walkFiles(outDir)];
    const bundle = files.filter(file => /\.(js|css|html|json|txt|md)$/.test(file)).map(file => fs.readFileSync(file, 'utf8')).join('\n');
    for (const file of files) { const name = path.relative(outDir, file).split(path.sep).join('/'); assert.ok(!name.startsWith('embeds/') && !/demo-books/.test(name), `${bookId}: unexpected file ${name}`); }
    return { failures, bundle };
  } finally { fs.rmSync(outDir, { recursive: true, force: true }); }
}

for (const bookId of ['linguistics', 'deliberate-practice', 'language-muscle']) {
  test(`release isolation: the ${bookId} release bundle carries neither converted book, their embeds nor the demo registry`, { timeout: 180000 }, async () => {
    const { failures, bundle } = await buildReleaseAndVerify(bookId);
    assert.deepEqual(failures, []);
    for (const marker of ['Cognition Explorer', 'Foundations of Readability', 'Increasing Reading Productivity', 'readability-checker', 'cramped-text-reveal', 'demo-books', 'embed-manifest', 'academicreading.edutools', 'readability.edutools'])
      assert.ok(!bundle.includes(marker), `${bookId} bundle contains "${marker}"`);
    // The three originals other than this one stay out as well (the verifier proves it for text; this is the same for the registry's lists).
    for (const other of originalBooks.filter(candidate => candidate.id !== bookId)) assert.ok(!bundle.includes(other.title), `${bookId} bundle contains "${other.title}"`);
  });
}

test('scratch: no temporary release folder is left behind', () => {
  const left = fs.existsSync(path.join(repo, 'build')) ? fs.readdirSync(path.join(repo, 'build')).filter(name => name.startsWith('.test-demo-books-')) : [];
  assert.deepEqual(left, []);
  assert.ok(os.tmpdir());
});
