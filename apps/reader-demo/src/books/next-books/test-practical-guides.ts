import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {demoBooks,originalBooks,nextBooks} from '../demo-books';
import {literalAfter} from './build-source/lib';
import {buildAgentBook} from '../../../../../packages/reader-core/src/agent-export/index';
const here=dirname(fileURLToPath(import.meta.url));
const source=resolve(here,'../../../../../..');
const normal=(s:string)=>s.replace(/[*_#>`|\[\]()]/g,'').replace(/\s+/g,' ').trim();
test('eight isolated demo identities, originals and previous conversions unchanged',()=>{
 assert.equal(demoBooks.length,8);assert.equal(new Set(demoBooks.map(b=>b.id)).size,8);
 assert.deepEqual(demoBooks.slice(0,5),[...originalBooks,...nextBooks]);
});
test('practical strategies preserve all authored descriptions and actions in source order',()=>{
 const b=demoBooks.find(b=>b.id==='academic-productivity')!;
 const strategies=literalAfter(readFileSync(resolve(source,'academic-productivity/data/content.ts'),'utf8'),'export const strategies: Strategy[] =');
 assert.deepEqual(b.sections.slice(1,5).map(s=>s.id),['listen','enlarge','outline','dictate']);
 for(let i=0;i<4;i++)for(const value of [strategies[i].shortDescription,strategies[i].fullDescription,...strategies[i].actionItems])assert.ok(b.sections[i+1].content.includes(value),value);
 assert.match(b.sections[0].content,/decreasing cognitive load and increasing fluency/);
 assert.doesNotMatch(b.sections.map(s=>s.content).join('\n'),/£\d|Freemium/);
});
test('seven theory sections preserve every paragraph, example and table cell',()=>{
 const b=demoBooks.find(b=>b.id==='developing-competence')!;
 const theory=literalAfter(readFileSync(resolve(source,'developing-competence/content/theory.ts'),'utf8'),'export const THEORY_CONTENT: ContentSection[] =');
 assert.deepEqual(b.sections.slice(0,7).map(s=>s.id),theory.map((s:any)=>s.id));
 for(let i=0;i<7;i++)for(const block of theory[i].blocks){const values=block.table?[...block.table.headers,...block.table.rows.flat()]:block.items??[block.content];for(const value of values)assert.ok(normal(b.sections[i].content).includes(normal(value)),value);}
});
test('current agent route retains all chapter destinations, licences and external-tool links',()=>{
 for(const b of demoBooks.slice(5,7)){
  const exported=buildAgentBook(b,{});assert.equal(exported.manifest.counts.sections,b.sections.length);
  const text=exported.files.map(f=>f.content).join('\n');
  for(const s of b.sections)assert.ok(text.includes(s.title),s.title);
  assert.ok(text.includes(b.sourceUrl!));assert.equal(b.appearance?.cover,undefined);
 }
 assert.equal(demoBooks[5].home?.license?.href,'https://creativecommons.org/licenses/by/4.0/');
 assert.equal(demoBooks[6].home?.license,undefined);
});

test('competence retains both canonical competency chapters and all 24 level descriptions',()=>{
 const b=demoBooks.find(b=>b.id==='developing-competence')!;
 const areas=literalAfter(readFileSync(resolve(source,'developing-competence/content/competencies.ts'),'utf8'),'export const COMPETENCY_AREAS: CompetencyArea[] =');
 assert.deepEqual(b.sections.slice(7).map(s=>s.id),areas.map((a:any)=>a.id));
 let count=0;
 for(const a of areas){const chapter=b.sections.find(s=>s.id===a.id)!; assert.ok(chapter.content.includes(a.description));for(const d of a.dimensions){assert.ok(chapter.content.includes(d.name));for(const level of d.descriptions){assert.ok(chapter.content.includes(level.levelName));assert.ok(chapter.content.includes(level.description));count++;}}}
 assert.equal(count,24);
 const exported=buildAgentBook(b,{}).files.map(f=>f.content).join('\n');
 for(const a of areas)for(const d of a.dimensions)for(const level of d.descriptions)assert.ok(exported.includes(level.description));
});
