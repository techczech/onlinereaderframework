import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import ts from '../../node_modules/typescript/lib/typescript.js';

// Use the package's installed compiler and Node's existing test runner, with no scratch output.
async function loadTypeScript(name) {
  const source = readFileSync(new URL(name, import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext } });
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`);
}
const model = await loadTypeScript('./publication-model.ts');
const notes = await loadTypeScript('./publication-notes.ts');
const sections = [{ id: 'parent', title: 'Group', category: 'Theme', content: '', children: [{ id: 'fine-tuning-aims', title: 'Child', category: 'Theme', content: 'Content' }] }];
const flat = model.flattenPublicationSections(sections);

test('preorder navigation and lookup include recursive book descendants', () => {
  assert.deepEqual(flat.map(section => section.id), ['parent', 'fine-tuning-aims']);
  assert.equal(model.containsSection(sections[0], 'fine-tuning-aims'), true);
  assert.equal(model.containsSection(sections[0], 'missing'), false);
});

test('original query and Language Muscle hash URLs restore the same leaf', () => {
  for (const url of ['https://reader.test/?book=language-muscle&section=fine-tuning-aims', 'https://reader.test/?book=language-muscle#/fine-tuning-aims?text=working%20memory']) {
    assert.equal(model.sectionFromUrl(url, 'language-muscle', flat), 'fine-tuning-aims');
  }
  assert.equal(model.sectionFromUrl('https://reader.test/?book=other&section=fine-tuning-aims', 'language-muscle', flat), 'home');
  assert.equal(model.sectionFromUrl('https://reader.test/?book=language-muscle#/missing', 'language-muscle', flat), 'home');
});

test('sharing and home preserve host parameters while removing old section fragments and quotes', () => {
  const original = 'https://reader.test/app?book=language-muscle&host=keep&section=old&text=old#footnote';
  const shared = model.publicationUrl(original, 'language-muscle', 'fine-tuning-aims', 'working memory');
  assert.equal(shared.searchParams.get('host'), 'keep');
  assert.equal(shared.searchParams.get('book'), 'language-muscle');
  assert.equal(shared.searchParams.get('text'), 'working memory');
  assert.equal(shared.hash, '');
  const home = model.publicationUrl(shared.href, 'language-muscle', 'home');
  assert.equal(home.searchParams.get('book'), 'language-muscle');
  assert.equal(home.searchParams.get('host'), 'keep');
  assert.equal(home.searchParams.has('section'), false);
  assert.equal(home.searchParams.has('text'), false);
});

test('storage keys isolate every book, including IDs containing separators', () => {
  assert.notEqual(model.readerStorageKey('a:b', 'notes'), model.readerStorageKey('a', 'b:notes'));
  const values = new Map();
  globalThis.window = { localStorage: { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) } };
  const isString = value => typeof value === 'string';
  assert.equal(model.writeStoredValue('one', 'reflection', 'first'), true);
  assert.equal(model.writeStoredValue('two', 'reflection', 'second'), true);
  assert.equal(model.readStoredValue('one', 'reflection', '', isString), 'first');
  assert.equal(model.readStoredValue('two', 'reflection', '', isString), 'second');
  values.set(model.readerStorageKey('one', 'reflection'), '{bad json');
  assert.equal(model.readStoredValue('one', 'reflection', 'fallback', isString), 'fallback');
  values.set(model.readerStorageKey('one', 'reflection'), '{}');
  assert.equal(model.readStoredValue('one', 'reflection', 'fallback', isString), 'fallback');
  Object.defineProperty(globalThis.window, 'localStorage', { get() { throw new Error('Blocked'); } });
  assert.equal(model.readStoredValue('one', 'reflection', 'fallback', isString), 'fallback');
  assert.equal(model.writeStoredValue('one', 'reflection', 'new'), false);
  delete globalThis.window;
});

test('notes export includes reflections even when there are no highlights', () => {
  const markdown = notes.publicationNotesMarkdown('Language Muscle', [], [{ id: 'reflection', sectionId: 'fine-tuning-aims', sectionTitle: 'Fine-tuning your aims', content: 'A real takeaway.', date: 1 }]);
  assert.match(markdown, /My Language Muscle Notes/);
  assert.match(markdown, /## Fine-tuning your aims/);
  assert.match(markdown, /A real takeaway/);
  assert.doesNotMatch(markdown, /Deliberate Practice/);
});

test('download boundaries reject executable schemes and retain same-origin assets', () => {
  assert.equal(model.safePublicationHref('javascript:alert(1)'), undefined);
  assert.equal(model.safePublicationHref('data:text/html,<script>bad</script>'), undefined);
  assert.equal(model.safePublicationHref('/downloads/book.epub'), '/downloads/book.epub');
});


test('full publication identity uses actual adapter words without added punctuation or duplicates', () => {
  const books = JSON.parse(readFileSync(new URL('../../../../apps/reader-demo/src/books/original-publications.json', import.meta.url), 'utf8'));
  assert.equal(model.publicationDisplayTitle(books.find(book => book.id === 'language-muscle')), 'Building Your Language Muscle');
  assert.equal(model.publicationDisplayTitle(books.find(book => book.id === 'deliberate-practice')), 'Deliberate Practice: A Universal Learning Method');
  assert.equal(model.publicationDisplayTitle({ title: 'Complete Title' }), 'Complete Title');
  assert.equal(model.publicationDisplayTitle({ title: 'Building Your Language Muscle', subtitle: 'Language Muscle' }), 'Building Your Language Muscle');
  assert.equal(model.publicationDisplayTitle({ title: 'Building Your Language', subtitle: 'Language Muscle' }), 'Building Your Language Muscle');
  assert.equal(model.publicationDisplayTitle({ title: '  Building Your  ', subtitle: '  Language Muscle  ' }), 'Building Your Language Muscle');
});


test('native ESM imports the original reader without a bundler or browser globals', async () => {
  const directory = fileURLToPath(new URL('.', import.meta.url));
  const core = resolve(directory, '../..');
  const scratch = mkdtempSync(resolve(directory, '.test-original-reader-esm-'));
  try {
    execFileSync(process.execPath, [resolve(core, 'node_modules/typescript/bin/tsc'), '-p', resolve(core, 'tsconfig.json'), '--outDir', scratch, '--declaration', 'false'], { stdio: 'pipe' });
    const api = await import(pathToFileURL(resolve(scratch, 'original/PublicationReader.js')).href);
    assert.equal(typeof api.PublicationReader, 'function');
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
