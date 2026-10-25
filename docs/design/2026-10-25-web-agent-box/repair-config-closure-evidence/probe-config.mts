import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import React from '../../../../packages/reader-core/node_modules/react/index.js';
import {renderToString} from '../../../../packages/reader-core/node_modules/react-dom/server.js';
import {build} from '../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import {buildAgentBook,buildAgentRootIndex} from '../../../../packages/reader-core/src/agent-export/agent-export.ts';
import {canonicalSiteUrl} from '../../../../packages/reader-core/src/agent-export/agent-paths.ts';
import {AgentAccess} from '../../../../packages/reader-core/src/original/agent/AgentAccess.tsx';
import books from '../../../../apps/reader-demo/src/books/original-publications.json';
import {canonicalSites} from '../../../../apps/reader-demo/src/canonical-sites.ts';
const here=path.dirname(fileURLToPath(import.meta.url)), root=path.resolve(here,'../../../..');
const book:any={id:'review-book',title:'Review book',author:'Public author',description:'Public description',sourceUrl:'https://source.example.org/',home:{license:{label:'CC BY',href:'https://creativecommons.org/licenses/by/4.0/'}},sections:[{id:'chapter one/..',title:'Chapter one',category:'Text',content:'# Chapter one\n\nExact authored text.\n\n[Next](?section=second)'},{id:'second',title:'Second',category:'Text',content:'# Second\n\nAttribution stays.'}]};
const cases:any[]=[];
for(const site of ['https://public.example.org/','https://public.example.org/sub/reader/'])for(const directory of ['agent','static/agent']){
 const out=buildAgentBook(book,{siteUrl:site,directory});
 const html=renderToString(React.createElement(AgentAccess,{book,access:{siteUrl:site,path:directory+'/'},variant:'panel'}));
 const expected=site+out.files.find(f=>f.path.endsWith('/index.md'))!.path;
 const rootIndex=buildAgentRootIndex([out],{directory});
 cases.push({site,directory,expected,componentMatches:html.includes(expected),manifestIndex:out.manifest.links.index,rootMatches:rootIndex.content.includes(expected),readerLinks:out.manifest.sections.map(s=>s.readerUrl),ssr:html});
}
const malformed=['javascript:alert(1)','data:text/html,hi','file:///tmp/book','https://u:p@example.org/sub/','https://example.org/sub/?x=1','https://example.org/sub/#frag','http://127.0.0.1:8773/','http://100.85.55.122:8773/','http://[::ffff:127.0.0.1]/','https://localhost./','https://box.local./','https://box.tail123.ts.net./','https://example.org/sub/../escape/','https://example.org/sub/%2e%2e/escape/','https:example.org/sub/','https://example.org/sub/?','https://example.org/sub/#'];
const invalid=malformed.map(site=>{try{const out=buildAgentBook(book,{siteUrl:site});return{input:site,canonical:canonicalSiteUrl(site)??null,generatorAccepted:true,generated:out.manifest.links.index,returnedSiteUrl:out.siteUrl,root:buildAgentRootIndex([out]).content,directRoot:buildAgentRootIndex([buildAgentBook(book)],{siteUrl:site}).content}}catch(e){return{input:site,canonical:canonicalSiteUrl(site)??null,generatorAccepted:false,error:String(e)}}});
const exports=(books as any[]).map(b=>buildAgentBook(b,{siteUrl:canonicalSites[b.id]}));
const perBook=exports.map(out=>({book:out.bookId,site:out.siteUrl,links:out.manifest.links,sourceUrl:out.manifest.book.sourceUrl,licence:out.manifest.book.licence}));
fs.writeFileSync(path.join(here,'generator-results.json'),JSON.stringify({cases,invalid,perBook,root:buildAgentRootIndex(exports).content},null,2));
const bundled=await build({absWorkingDir:root,stdin:{resolveDir:root,loader:'tsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import{AgentAccess}from'./packages/reader-core/src/original/agent/AgentAccess.tsx';const book=${JSON.stringify(book)};const root=createRoot(document.getElementById('root'));window.mount=(access,chapter=false)=>root.render(React.createElement(AgentAccess,{key:JSON.stringify(access)+chapter,book,access,variant:'panel',section:chapter?book.sections[0]:undefined}));`},bundle:true,write:false,format:'iife',platform:'browser',alias:{react:path.join(root,'packages/reader-core/node_modules/react'),'react-dom':path.join(root,'packages/reader-core/node_modules/react-dom')}});
const scratch=path.join(here,'scratch');
for(const base of ['','sub/reader/']){
 const dir=path.join(scratch,base);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><meta charset="utf-8"><div id="root"></div><script>'+bundled.outputFiles[0].text+'</script>');
 for(const directory of ['agent','static/agent'])for(const f of buildAgentBook(book,{directory}).files){const dest=path.join(dir,f.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,f.content)}
}
console.log(JSON.stringify({cases:cases.map(({ssr,...x})=>x),invalid:invalid.map(({root,...x})=>x),perBook},null,2));
