import assert from 'node:assert/strict';
import { build } from '../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { resolve } from 'node:path';
import { readFileSync, writeFileSync } from 'node:fs';
const output = await build({entryPoints:['packages/reader-core/src/original/frontpage/frontpage-model.ts'],bundle:true,write:false,platform:'node',format:'esm'});
const {frontPageContents,defaultFullContents}=await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
const s=(id,children=[],content='page')=>({id,title:id,category:id,content,children});
const book={id:'independent-depth',title:'Depth',author:'A',description:'D',sections:[s('struct',[s('deep-heading',[s('near-page',[s('below-page')])],'')],''),s('own',[s('own-child')]),s('mixed',[s('direct'),s('hidden-heading',[s('buried')],'')],'')]};
const records=[];
for(const depth of [0,1,2,3,4]){
 const navigation={homeDepth:depth};const copy={...book,navigation};const c=frontPageContents(copy);
 assert.deepEqual(navigation,{homeDepth:depth});
 const row={depth,groups:c.groups.map(g=>({key:g.key,own:g.section?.id,entries:g.entries.map(e=>[e.section.id,e.depth,e.readable]),count:g.count})),total:c.total,hasDepth:c.hasDepth};records.push(row);
 if(depth===0)assert.equal(c.groups.length,0);
 else {
  assert.deepEqual(c.groups.map(g=>g.key),['struct','own','mixed']);
  assert.equal(c.groups[0].entries.some(e=>e.section.id==='near-page'),true);
  if(depth<=3)assert.equal(c.groups[0].entries.some(e=>e.section.id==='below-page'),false);
  if(depth===1)assert.deepEqual(c.groups[1].entries,[]);
  if(depth===2)assert.equal(c.groups[2].entries.some(e=>e.section.id==='buried'),false);
 }
}
const real=JSON.parse(readFileSync('apps/reader-demo/src/books/original-publications.json','utf8'));
const realRows=[];
for(const b of real)for(const d of [0,1,2]){
 const c=frontPageContents({...b,navigation:{homeDepth:d}});
 const ids=c.groups.flatMap(g=>[...(g.section?[g.section.id]:[]),...g.entries.filter(e=>e.readable).map(e=>e.section.id)]);
 assert.equal(new Set(ids).size,ids.length);
 realRows.push({book:b.id,depth:d,groups:c.groups.map(g=>g.key),ids,total:c.total,fullInitially:defaultFullContents(c)});
}
writeFileSync(new URL('results-depth-closure.json',import.meta.url),JSON.stringify({records,realRows},null,2));
console.log('Independent synthetic depth 0-4 checks and three-book depth 0-2 identity checks passed.');
