import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { courseData } from '../../../../course-design-frameworks/data.ts';
import { publicationContentToText, renderPublicationContent } from '../../../packages/reader-core/src/publication-content/index.ts';
import { checkPublicationEmbeds } from '../../../packages/reader-core/src/embed/embed-check.ts';
import { buildAgentBook } from '../../../packages/reader-core/src/agent-export/index.ts';
const load = (name: string) => JSON.parse(readFileSync(new URL('../../../apps/reader-demo/src/books/next-books/' + name, import.meta.url), 'utf8'));
const book = load('course-design-frameworks.book.json');
const provenance = load('course-design-frameworks-provenance.json');
const embeds = load('course-design-frameworks-embed-manifest.json');
for(const source of provenance.sourceFiles) assert.equal(createHash('sha256').update(readFileSync(new URL('../../../../course-design-frameworks/'+source.path,import.meta.url))).digest('hex'),source.sha256,'unchanged source '+source.path);
assert.equal(book.title, courseData.title);
assert.equal(book.author, courseData.author);
assert.deepEqual(book.sections.map((s: any) => s.id), courseData.sections.map(s => s.id));
assert.equal(book.sourceUrl, undefined, 'No invented canonical URL');
assert.deepEqual(checkPublicationEmbeds(book, embeds), []);
const normal = (s: string) => s.replace(/\s+/g, ' ').trim();
const agent = buildAgentBook(book);
for (const section of book.sections) {
 const expected = provenance.values.filter((v: any) => v.sectionId === section.id && v.rendered);
 const text = normal(publicationContentToText(section.content, section.format));
 let cursor = 0;
 for (const value of expected) {
  const index = text.indexOf(normal(value.value), cursor);
  assert.ok(index >= cursor, `${section.id}: missing/out of order ${value.path}`);
  cursor = index + normal(value.value).length;
 }
 assert.ok(agent.files.some(f => f.content.includes(renderPublicationContent(section.content, section.format))), `agent content ${section.id}`);
}
// Independent source traversal checks that the converter did not omit values from its own ledger.
for (let si=0;si<courseData.sections.length;si++) {
 const source:any=courseData.sections[si];
 const expected:string[]=[source.title,source.shortDescription];
 if(source.type==='text') for(const block of source.data) {
  if(block.type==='image') expected.push(block.alt);
  else expected.push(...(Array.isArray(block.content)?block.content:[block.content]));
 } else if(source.type==='checklist') for(const category of source.data) {
  expected.push(category.title,...category.items.map((item:any)=>item.text));
 } else {
  expected.push(...source.data.columns.map((c:any)=>c.header));
  for(const row of source.data.rows) for(const col of source.data.columns) expected.push(...(Array.isArray(row[col.key])?row[col.key]:[row[col.key]]));
 }
 assert.deepEqual(provenance.values.filter((v:any)=>v.sectionId===source.id).map((v:any)=>v.value),expected,source.id+' independent source traversal');
 const safe=renderPublicationContent(book.sections[si].content,'html');
 if(source.type==='matrix'||source.type==='planner') {
  assert.equal((safe.match(/scope="col"/g)||[]).length,source.data.columns.length);
  assert.equal((safe.match(/scope="row"/g)||[]).length,source.data.rows.length);
  assert.ok(safe.includes('<caption>'));
 }
}
assert.equal(embeds.items.length, 4);
assert.ok(!JSON.stringify(book).includes('picsum.photos'));
assert.ok(book.sections[0].content.includes('https://creativecommons.org/licenses/by-sa/4.0/'));
for (const item of embeds.items) {
 const html = readFileSync(new URL('../../../apps/reader-demo/interactives/course-design-frameworks/' + item.src, import.meta.url), 'utf8');
 assert.ok(!/localStorage|sessionStorage|fetch\(|XMLHttpRequest|contentEditable/i.test(html));
 assert.ok(html.includes('not saved'));
}
console.log(JSON.stringify({sections: book.sections.length, values: provenance.values.length, embeds: embeds.items.length, agentFiles: agent.files.length, coverage: 'ordered rendered strings pass'}, null, 2));
