import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const data = source => 'data:text/javascript;base64,' + Buffer.from(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText).toString('base64');
const kit = data(readFileSync(new URL('./citation.ts', import.meta.url), 'utf8'));
const model = data(readFileSync(new URL('../original/publication-model.ts', import.meta.url), 'utf8'));
const source = readFileSync(new URL('./publication-citation.ts', import.meta.url), 'utf8').replace('./citation.js', kit).replace('../original/publication-model.js', model);
const { publicationCitation, readablePublicationHead, publicationRis } = await import(data(source));
const book = { id: 'guide', title: 'A Guide', author: 'Ada Example', description: 'An invented guide.', sections: [], citation: { canonicalBaseUrl: 'https://books.example.org/guide/' } };
test('landing and chapter types, authors, parent title and undated defaults', () => {
  const home = publicationCitation(book);
  assert.equal(home.type, 'book'); assert.equal(home.site, 'A Guide'); assert.equal(home.date, undefined);
  const section = publicationCitation(book, { id: 'start', title: 'Start here' });
  assert.equal(section.type, 'bookSection'); assert.equal(section.bookTitle, 'A Guide'); assert.equal(section.url, 'https://books.example.org/guide/start/');
  const head = readablePublicationHead(book, { id: 'start', title: 'Start here' });
  assert.ok(head.includes('name="citation_author" content="Example, Ada"')); assert.ok(head.includes('citation_inbook_title')); assert.ok(!/citation_journal_title|Z3988/.test(head));
});
test('configured authors, date, site name and ISBN reach metadata and book RIS', () => {
  const configured = { ...book, citation: { ...book.citation, authors: ['Ada Example', 'Ben Sample'], date: '2020-01-02', siteName: 'Example Books', isbn: '9780000000002' } };
  const head = readablePublicationHead(configured);
  assert.equal((head.match(/name="citation_author"/g) ?? []).length, 2); assert.ok(head.includes('2020/01/02')); assert.ok(head.includes('citation_isbn'));
  assert.ok(publicationRis(configured).includes('TY  - BOOK\r\n')); assert.ok(publicationRis(configured).includes('AU  - Ben Sample'));
});
test('build metadata refuses missing titles and missing or unsafe canonical URLs', () => {
  for (const invalid of [{ ...book, title: '' }, { ...book, citation: undefined }, { ...book, citation: { canonicalBaseUrl: '/relative/' } }, { ...book, citation: { canonicalBaseUrl: 'javascript:bad' } }]) assert.throws(() => readablePublicationHead(invalid), /Citation/);
  assert.throws(() => publicationCitation(book, { id: 'empty', title: '' }), /chapter title/);
});
