import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { fromHtml } from '../../../packages/reader-core/node_modules/hast-util-from-html/index.js';
import { toText } from '../../../packages/reader-core/node_modules/hast-util-to-text/index.js';
import { renderPublicationContent } from '../../../packages/reader-core/dist/publication-content/index.js';
const app = new URL('../', import.meta.url);
const read = name => fs.readFile(new URL(name, app), 'utf8');
const book = JSON.parse(await read('book-czech-navigator.json'));
const units = []; const walk = list => { for (const unit of list) { units.push(unit); walk(unit.children ?? []); } }; walk(book.sections);
const manifest = JSON.parse(await read(`public/agent/${book.id}/manifest.json`));
const html = await read('public/czech-navigator-complete.html');
const elements = text => { const out=[]; const walk = node => { if(node.type==='element') out.push(node); for(const child of node.children ?? []) walk(child); }; walk(fromHtml(text)); return out; };
const tables = text => elements(text).filter(n=>n.tagName==='table').map(n=> { const root=n; const cells=[]; const walk = n => { if(n !== root && n.tagName==='table') return; if(n.tagName==='th'||n.tagName==='td') cells.push({tag:n.tagName,text:toText(n), colspan:n.properties.colSpan, rowspan:n.properties.rowSpan,scope:n.properties.scope,headers:n.properties.headers}); for(const c of n.children ?? []) walk(c); }; walk(n); return cells; });
test('all 22 units have served chapter Markdown, index, full text and canonical links', async () => {
 assert.equal(units.length,22); assert.equal(manifest.counts.sections,22);
 const index=await read(`public/agent/${book.id}/index.md`), full=await read(`public/agent/${book.id}/full.md`);
 for(const [i,unit] of units.entries()) { assert.equal(manifest.sections[i].id,unit.id); const chapter=await read(`public/agent/${book.id}/${manifest.sections[i].file}`); assert.ok(chapter.includes(unit.title)); assert.ok(index.includes(manifest.sections[i].file)); assert.ok(full.includes(unit.title)); assert.match(manifest.sections[i].readerUrl,/^https:\/\/czechnavigator\.dominiklukes\.net\//); }
 assert.ok((await read('public/llms.txt')).includes(manifest.links.index));
});
test('complete static book needs no scripts and retains all 308 tables / 9652 cells in source order with header semantics', () => {
 assert.doesNotMatch(html,/<script\b/i);
 const actual=tables(html), expected=units.flatMap(u=>tables(renderPublicationContent(u.content,u.format)));
 assert.equal(actual.length,308); assert.equal(actual.flat().length,9652); assert.deepEqual(actual,expected);
 const nodes=elements(html), targets=new Set(nodes.map(n=>n.properties.id).filter(Boolean));
 for(const unit of units) assert.ok(targets.has(`unit-${encodeURIComponent(unit.id)}`));
 for(const a of nodes.filter(n=>n.tagName==='a' && String(n.properties.href).startsWith('#'))) assert.ok(targets.has(decodeURIComponent(a.properties.href.slice(1))),`missing static target ${a.properties.href}`);
});
test('entry discovery, noindex, no private fields or local paths in public export parcel', async()=>{
 assert.match(await read('index.html'),/czech-navigator-complete.html/); assert.match(html,/noindex,nofollow/);
 for(const file of ['llms.txt','czech-navigator-complete.html',...manifest.sections.map(s=>`agent/${book.id}/${s.file}`),`agent/${book.id}/index.md`,`agent/${book.id}/full.md`,`agent/${book.id}/manifest.json`]) assert.doesNotMatch(await read(`public/${file}`),/\/Users\/|file:\/\/|publication-reader:|privateAnnotations|sourceEvidence/i);
});
test('Vite deployment contains the complete no-JS route and every agent route', async () => {
 const paths=['llms.txt','czech-navigator-complete.html',`agent/${book.id}/index.md`,`agent/${book.id}/full.md`,`agent/${book.id}/manifest.json`,...manifest.sections.map(s=>`agent/${book.id}/${s.file}`)];
 for(const route of paths) assert.equal(await read(`dist/${route}`),await read(`public/${route}`),route);
 assert.match(await read('dist/index.html'),/noindex,nofollow/);
 assert.match(await read('dist/index.html'),/czech-navigator-complete.html/);
});
test('agent HTML source fragments point to real headings in their destination Markdown', async()=>{
 let checked=0;
 for(const section of manifest.sections) {
  const chapter=await read(`public/agent/${book.id}/${section.file}`);
  for(const match of chapter.matchAll(/href="https:\/\/czechnavigator\.dominiklukes\.net\/(agent\/[^"#]+\.md)#([^"#]+)"/g)) {
   const target=await read(`public/${match[1]}`);
   assert.ok(elements(target).some(n=>n.properties.id===decodeURIComponent(match[2])),`missing agent target ${match[1]}#${match[2]}`); checked++;
  }
 }
 assert.ok(checked>0,'real source links exercised');
});
test('deployment routes return complete text over HTTP without running JavaScript', async()=>{
 const { createServer } = await import('node:http');
 const server=createServer(async(req,res)=>{ try { const route=new URL(req.url,'http://localhost').pathname; if(route.includes('..')) throw Error(); const body=await read(`dist/${route==='/'?'index.html':route.slice(1)}`); res.end(body); } catch { res.statusCode=404; res.end(); } });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 try {
  const base=`http://127.0.0.1:${server.address().port}/`;
  for(const route of ['','llms.txt','czech-navigator-complete.html',`agent/${book.id}/index.md`,`agent/${book.id}/full.md`,`agent/${book.id}/manifest.json`,...manifest.sections.map(s=>`agent/${book.id}/${s.file}`)]) {
   const response=await fetch(base+route); assert.equal(response.status,200,route); const body=await response.text(); assert.ok(body.length>0);
   if(route==='czech-navigator-complete.html') { assert.doesNotMatch(body,/<script\b/i); assert.equal(tables(body).length,308); }
  }
 } finally { await new Promise(resolve=>server.close(resolve)); }
});
