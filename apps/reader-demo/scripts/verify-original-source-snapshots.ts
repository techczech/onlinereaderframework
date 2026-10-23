/** Verify the demo against current, read-only originals; never silently accept changed author input. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
const args = process.argv.slice(2);
function required(flag: string) { const i = args.indexOf(flag); if(i < 0 || !args[i+1]) throw new Error(`Required ${flag} <path>`); return resolve(args[i+1]); }
const roots: Record<string,string> = {
  'deliberate-practice-guide': required('--practice'),
  'building-your-language-muscle': required('--language'),
  writing: required('--writing'),
  'linguistics-stack-exchange-answers': required('--site')
};
const here = dirname(fileURLToPath(import.meta.url));
const books = JSON.parse(readFileSync(resolve(here, '../src/books/original-publications.json'), 'utf8'));
const provenance = JSON.parse(readFileSync(resolve(here, '../src/books/original-publications-provenance.json'), 'utf8'));
for (const source of provenance.sources) {
  const path = resolve(roots[source.repository], source.source);
  assert.ok(path.startsWith(roots[source.repository] + '/'));
  assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'), source.sha256, `${source.repository}/${source.source} changed`);
}
const { GUIDE_CONTENT } = await import(pathToFileURL(resolve(roots['deliberate-practice-guide'], 'data.ts')).href);
assert.deepEqual(books[0].sections.map(({format,...s}:any) => s), GUIDE_CONTENT);
const { BOOK_CONTENT } = await import(pathToFileURL(resolve(roots['building-your-language-muscle'], 'bookContent.ts')).href);
const flatten = (sections: any[]): any[] => sections.flatMap(s=>[s,...flatten(s.children??[])]);
const languageSections = flatten(books[1].sections);
for (const original of flatten(BOOK_CONTENT)) {
  const adapted = languageSections.find(s => s.id === original.id);
  assert.ok(adapted, original.id);
  assert.equal(adapted.title, original.title);
  assert.equal(adapted.content, original.content ?? '');
  assert.equal(adapted.defaultExpanded, original.defaultExpanded);
}
console.log(`Verified ${provenance.sources.length} source hashes, all practice chapter objects and all ${languageSections.length} Language Muscle sections against unchanged originals.`);
