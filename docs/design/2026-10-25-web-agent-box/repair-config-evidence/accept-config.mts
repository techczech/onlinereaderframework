/** Acceptance for the public URL boundary: the reviewer's observational generator probe (probe-config.mts) turned into assertions, plus the root-index
 * and server-render cases. Exit 1 on any failure. Run from the repository root: apps/reader-demo/node_modules/.bin/tsx <this file>
 * Fixture credentials are the synthetic `u:p`. Nothing is written except accept-config-results.json beside this file. */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import React from '../../../../packages/reader-core/node_modules/react/index.js';
import {renderToString} from '../../../../packages/reader-core/node_modules/react-dom/server.js';
import {buildAgentBook,buildAgentRootIndex} from '../../../../packages/reader-core/src/agent-export/agent-export.ts';
import {canonicalSiteUrl} from '../../../../packages/reader-core/src/agent-export/agent-paths.ts';
import {AgentAccess} from '../../../../packages/reader-core/src/original/agent/AgentAccess.tsx';
import books from '../../../../apps/reader-demo/src/books/original-publications.json';
import {canonicalSites} from '../../../../apps/reader-demo/src/canonical-sites.ts';
const here=path.dirname(fileURLToPath(import.meta.url));
const checks:{name:string;passed:boolean;detail?:unknown}[]=[];
const check=(name:string,passed:boolean,detail?:unknown)=>{checks.push({name,passed,detail});console.log(`${passed?'PASS':'FAIL'} ${name}`)};
const book:any={id:'review-book',title:'Review book',author:'Public author',description:'Public description',sourceUrl:'https://source.example.org/',home:{license:{label:'CC BY',href:'https://creativecommons.org/licenses/by/4.0/'}},sections:[{id:'chapter one/..',title:'Chapter one',category:'Text',content:'# Chapter one\n\nExact authored text.\n\n[Next](?section=second)'},{id:'second',title:'Second',category:'Text',content:'# Second\n\nAttribution stays.'}]};
const ssr=(access:any,chapter=false)=>renderToString(React.createElement(AgentAccess,{book,access,variant:'panel',section:chapter?book.sections[0]:undefined}));
// 1. Custom folders: the component, the manifest and the root index name the file the generator writes, at root and sub-path, for every path style.
for(const site of ['https://public.example.org/','https://public.example.org/sub/reader/'])for(const directory of ['agent','static/agent']){
  const out=buildAgentBook(book,{siteUrl:site,directory});
  const index=out.files.find(f=>f.path.endsWith('/index.md'))!.path, chapterFile=out.files.find(f=>f.path.includes('/chapters/'))!.path;
  const expected=site+index, expectedChapter=site+chapterFile, prefix=new URL(site).pathname;
  check(`${site} ${directory}: manifest index`,out.manifest.links.index===expected,out.manifest.links.index);
  check(`${site} ${directory}: root index (export address)`,buildAgentRootIndex([out],{directory}).content.includes(`(${expected})`));
  check(`${site} ${directory}: root index (direct address)`,buildAgentRootIndex([buildAgentBook(book,{directory})],{directory,siteUrl:site}).content.includes(`(${expected})`));
  for(const p of [`${directory}/`,`./${directory}`,`${prefix}${directory}/`,`${site}${directory}/`]){
    const home=ssr({siteUrl:site,path:p}), chapter=ssr({siteUrl:site,path:p},true);
    check(`${site} ${directory} path=${p}: server-rendered prompt names the generated index and chapter`,home.includes(expected)&&chapter.includes(expectedChapter)&&!/javascript:/i.test(home+chapter),{expected,expectedChapter});
  }
}
// 2. Invalid origins: refused by both generators and by the root index's export check, before any file, without echoing the value.
const malformed=['javascript:alert(1)','data:text/html,hi','file:///tmp/book','https://u:p@example.org/sub/','https://example.org/sub/?x=1','https://example.org/sub/#frag','http://127.0.0.1:8773/','http://100.85.55.122:8773/','http://[::ffff:127.0.0.1]/','https://localhost./','https://box.local./','https://box.tail123.ts.net./','https://example.org/sub/../escape/','https://example.org/sub/%2e%2e/escape/','https:example.org/sub/','https://example.org/sub/?','https://example.org/sub/#',
  'http://[::ffff:10.0.0.1]/','http://[::ffff:192.168.1.1]/','http://[::ffff:172.16.0.1]/','http://127.1/','https://example.org./','https://example.org\\sub/','https://exa\tmple.org/'];
const good=buildAgentBook(book,{siteUrl:'https://public.example.org/sub/reader/'});
const refuses=(label:string,run:()=>unknown,input:string)=>{try{run();check(label,false,'accepted')}catch(e){const m=String((e as Error).message);check(label,/siteUrl|public address/i.test(m)&&!m.includes(input)&&!m.includes('u:p'),m)}};
for(const input of malformed){
  check(`canonicalSiteUrl refuses ${JSON.stringify(input)}`,canonicalSiteUrl(input)===undefined);
  refuses(`buildAgentBook refuses ${JSON.stringify(input)}`,()=>buildAgentBook(book,{siteUrl:input}),input);
  refuses(`buildAgentRootIndex refuses siteUrl ${JSON.stringify(input)}`,()=>buildAgentRootIndex([good],{siteUrl:input}),input);
  refuses(`buildAgentRootIndex refuses export siteUrl ${JSON.stringify(input)}`,()=>buildAgentRootIndex([{...good,siteUrl:input}]),input);
  check(`server render ignores siteUrl ${JSON.stringify(input)}`,ssr({siteUrl:input,path:'agent/'})==='');
}
// 3. The real books: each manifest at its own canonical origin; the root index never points one book at another's origin; source and licence kept.
const exports=(books as any[]).map(b=>buildAgentBook(b,{siteUrl:canonicalSites[b.id]}));
const root=buildAgentRootIndex(exports).content.split('\n').filter(l=>l.startsWith('- ['));
for(const out of exports){
  const site=canonicalSites[out.bookId], others=Object.entries(canonicalSites).filter(([id])=>id!==out.bookId).map(([,s])=>s);
  const line=root.find(l=>l.includes(`/agent/${out.bookId}/index.md`))??'';
  check(`${out.bookId}: export address, manifest, root line at ${site}`,out.siteUrl===site&&out.manifest.links.index===`${site}agent/${out.bookId}/index.md`&&line.includes(`(${site}agent/${out.bookId}/full.md)`)&&!others.some(o=>line.includes(o)),line);
  check(`${out.bookId}: source and licence fields kept`,out.manifest.book.sourceUrl!==undefined||!(books as any[]).find(b=>b.id===out.bookId).sourceUrl);
}
fs.writeFileSync(path.join(here,'accept-config-results.json'),JSON.stringify({checks},null,2)+'\n');
const failed=checks.filter(c=>!c.passed).length;
console.log(`${checks.length} checks; ${failed} failures`);
process.exit(failed?1:0);
