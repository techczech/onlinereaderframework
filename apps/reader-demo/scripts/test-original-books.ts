import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const books = JSON.parse(readFileSync(new URL('../src/books/original-publications.json', import.meta.url), 'utf8'));
const provenance = JSON.parse(readFileSync(new URL('../src/books/original-publications-provenance.json', import.meta.url), 'utf8'));
const flatten = (sections: any[]): any[] => sections.flatMap(s => [s, ...flatten(s.children ?? [])]);
test('real sources retain complete chapter and answer counts', () => {
  assert.equal(books[0].sections.length, 21);
  assert.equal(books[1].sections.length, 4);
  assert.equal(books[2].sections.length, 9);
  assert.equal(books[2].sections.flatMap((s: any) => s.children).length, 253);
  assert.equal(provenance.counts.linguisticsAnswers, 253);
});
test('every book has stable unique section identities, including descendants', () => {
  for (const book of books) {
    const sections = flatten(book.sections);
    assert.equal(new Set(sections.map(s => s.id)).size, sections.length, book.id);
    assert.ok(sections.every(s => s.id && s.id !== 'home' && s.title && typeof s.content === 'string'));
  }
});
test('Language Muscle HTML and its actual cross-reference are preserved', () => {
  const sections = flatten(books[1].sections);
  assert.ok(sections.some(s => s.content.includes('href="#/fine-tuning-aims"')));
  assert.ok(sections.some(s => s.id === 'fine-tuning-aims'));
  assert.ok(sections.every(s => s.format === 'html'));
});
test('all linguistics answers include source and licence attribution', () => {
  for (const s of books[2].sections.flatMap((theme: any) => theme.children)) {
    assert.match(s.content, /Original answer: \[/);
    assert.match(s.content, /Licence: \[/);
    assert.match(s.content, /Original question by \[/);
  }
});
test('provenance hashes identify real source snapshots without private machine paths', () => {
  assert.ok(provenance.sources.length >= 255);
  for (const s of provenance.sources) {
    assert.match(s.sha256, /^[a-f0-9]{64}$/);
    assert.ok(!s.source.startsWith('/'));
  }
});
