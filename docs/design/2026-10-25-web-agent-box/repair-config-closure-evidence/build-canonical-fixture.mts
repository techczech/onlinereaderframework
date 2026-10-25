// Fixture for accept-canonical-folder-browser.py: the reader box bundle served at three reader roots, each with the generator's files for three folders,
// and the generator's own public links for every (siteUrl, folder) pair the browser probe tests. Writes only under ./scratch/accept.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from '../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import {buildAgentBook} from '../../../../packages/reader-core/src/agent-export/agent-export.ts';
import {agentSegment} from '../../../../packages/reader-core/src/agent-export/agent-paths.ts';
const here=path.dirname(fileURLToPath(import.meta.url)), root=path.resolve(here,'../../../..'), out=path.join(here,'scratch','accept');
const book:any={id:'review-book',title:'Review book',author:'Public author',description:'Public description',sourceUrl:'https://source.example.org/',home:{license:{label:'CC BY',href:'https://creativecommons.org/licenses/by/4.0/'}},sections:[{id:'chapter one/..',title:'Chapter one',category:'Text',content:'# Chapter one\n\nExact authored text.'},{id:'second',title:'Second',category:'Text',content:'# Second\n\nAttribution stays.'}]};
const bases=['','sub/reader/','preview/'], directories=['agent','static/agent','a/b/agent'];
const sites=['https://public.example.org/','https://public.example.org/sub/reader/'];
const bundled=await build({absWorkingDir:root,stdin:{resolveDir:root,loader:'tsx',contents:`import React from 'react';import{createRoot}from'react-dom/client';import{AgentAccess}from'./packages/reader-core/src/original/agent/AgentAccess.tsx';const book=${JSON.stringify(book)};const root=createRoot(document.getElementById('root'));window.mount=(access,chapter=false)=>root.render(React.createElement(AgentAccess,{key:JSON.stringify(access)+chapter,book,access,variant:'panel',section:chapter?book.sections[0]:undefined}));`},bundle:true,write:false,format:'iife',platform:'browser',alias:{react:path.join(root,'packages/reader-core/node_modules/react'),'react-dom':path.join(root,'packages/reader-core/node_modules/react-dom')}});
for(const base of bases){
 const dir=path.join(out,base);fs.mkdirSync(dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'index.html'),'<!doctype html><meta charset="utf-8"><div id="root"></div><script>'+bundled.outputFiles[0].text+'</script>');
 for(const directory of directories)for(const f of buildAgentBook(book,{directory}).files){const dest=path.join(dir,f.path);fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,f.content)}
}
const expected:Record<string,any>={};
for(const site of sites)for(const directory of directories){
 const generated=buildAgentBook(book,{siteUrl:site,directory});
 const chapterFile=`${directory}/review-book/chapters/${agentSegment(book.sections[0].id)}.md`;
 if(!generated.files.some(f=>f.path===chapterFile))throw new Error('generator did not write '+chapterFile);
 expected[`${site} ${directory}`]={index:generated.manifest.links.index,full:generated.manifest.links.full,chapter:site+chapterFile};
}
fs.writeFileSync(path.join(out,'expected.json'),JSON.stringify(expected,null,2));
console.log(JSON.stringify({bases,directories,sites,expected:Object.keys(expected).length}));
