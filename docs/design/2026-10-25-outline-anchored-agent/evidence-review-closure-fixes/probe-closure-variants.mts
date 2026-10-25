import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {buildAgentBook,buildAgentRootIndex,agentDirectory,agentBookLinks} from '../../../../packages/reader-core/src/agent-export/index.ts';
import {renderPublicationContent} from '../../../../packages/reader-core/src/publication-content/index.ts';
const here=path.dirname(new URL(import.meta.url).pathname),results:any[]=[];
function check(name:string,passed:boolean,detail:any=null){results.push({name,passed,detail});console.log((passed?'PASS ':'FAIL ')+name+' '+JSON.stringify(detail));}
const section=(id:string,content:string,format='markdown')=>({id,title:id,category:'test',format,content});
const book=(sections:any[])=>({id:'closure-book',title:'Closure fixture',author:'Review',description:'Independent fixture',sections});
const source='<h1>Alpha</h1><p><a href="#/target">legacy</a> <a href="?book=closure-book&amp;section=target">query</a> <a href="#/target#reader-content-part">part</a> <a href="#/absent">missing</a> <a href="#/target#missing-heading">missing heading</a> <a href="?book=other&amp;section=target">other</a> <a href="?search=target">search</a> <a href="https://citation.example/?section=target#/target">citation</a> <a href="#local">local</a></p><pre><code>&lt;a href="#/target"&gt;literal&lt;/a&gt;</code></pre>';
const b=book([section('alpha',source,'html'),section('target','<h1>Target</h1><h2 id="part">Part</h2><p>HTTP_TARGET_SENTINEL.</p>','html')]);
const get=(o:any,suffix:string)=>o.files.find((f:any)=>f.path.endsWith(suffix));
const strip=(s:string)=>s.replace(/^---\n[\s\S]*?\n---\n\n/,'');
const server=http.createServer();let fileMap=new Map<string,string>();
server.on('request',(req,res)=>{const u=new URL(req.url!,'http://localhost');const body=fileMap.get(decodeURI(u.pathname));res.statusCode=body===undefined?404:200;res.setHeader('Content-Type','text/plain; charset=utf-8');res.end(body??'MISSING');});
await new Promise<void>(r=>server.listen(0,'127.0.0.1',r));const port=(server.address() as any).port,base=`http://127.0.0.1:${port}/read/sub/`;
try{
 let traversals=0,requests=0;
 for(const directory of ['agent','v2.1/assets/_agents-2','./a/./b/'])for(const absolute of [false,true]){
  const opts={directory,...(absolute?{siteUrl:base}:{})};const out=buildAgentBook(b as any,opts);const root=buildAgentRootIndex([out],opts);
  fileMap=new Map([root,...out.files].map(f=>[new URL(f.path,base).pathname,f.content]));
  for(const [suffix,prefix] of [['/chapters/alpha.md',''],['/full.md','chapters/']]){
   const f=get(out,suffix),own=new URL(f.path,base);const content=(await fetch(own)).status===200?f.content:'';
   const expected=absolute?`${base}${agentDirectory(directory)}/closure-book/chapters/target.md`:`${prefix}target.md`;
   const hrefs=[...content.matchAll(/<a href="([^"]+)">(?:legacy|query|part)<\/a>/g)].map(m=>m[1]);
   let good=hrefs.length===3&&hrefs[0]===expected&&hrefs[1]===expected&&hrefs[2]===expected+'#reader-content-part';
   for(const href of hrefs){const res=await fetch(new URL(href,own));requests++;good=good&&res.status===200&&(await res.text()).includes('HTTP_TARGET_SENTINEL');}
   check(`HTTP chapter targets from ${directory} ${absolute?'absolute':'relative'} ${suffix}`,good,{hrefs});
   for(const unchanged of ['href="#/absent"','href="?book=other&#x26;section=target"','href="?search=target"','href="https://citation.example/?section=target#/target"','href="#local"','&#x3C;a href="#/target">literal'])if(!content.includes(unchanged))good=false;
   check(`unrelated authored hrefs and escaped code retained ${directory} ${absolute} ${suffix}`,good);
  }
  const invalidHeading=get(out,'/chapters/alpha.md').content.match(/<a href="([^"]+)">missing heading<\/a>/)?.[1];const target=get(out,'/chapters/target.md').content;check(`absent heading is carried unchanged under the documented fragment limit ${directory} ${absolute}`,!!invalidHeading&&invalidHeading.endsWith('target.md#missing-heading')&&!target.includes('id="missing-heading"'),{href:invalidHeading,chapterExists:true,fragmentExists:false});
  check(`unknown links truthful and deduplicated ${directory} ${absolute}`,JSON.stringify(out.manifest.unresolvedLinks)===JSON.stringify([{section:'alpha',href:'#/absent'}]));
  check(`manifest counts and helpers consistent ${directory} ${absolute}`,out.manifest.counts.files===out.files.length&&out.manifest.counts.sections===2&&out.manifest.counts.withText===2&&out.manifest.counts.withoutText===0&&out.manifest.sections.every(s=>out.files.some(f=>f.path===agentDirectory(directory)+'/closure-book/'+s.file)));
  for(const f of out.files){for(const m of f.content.matchAll(/^reader_url: "([^"]+)"$/gm)){const u=new URL(JSON.parse('"'+m[1]+'"'),new URL(f.path,base));if(u.pathname!=='/read/sub/')traversals++;}}
  const clean=agentDirectory(directory),links=agentBookLinks(base+clean+'/',b.id);check(`root discovery helper matches ${directory} ${absolute}`,root.content.includes(absolute?links.index:`${clean}/closure-book/index.md`));
 }
 check('nested reader links all resolve to the reader root',traversals===0,{requests,traversals});
 const invalid:any[]=['','/','//host/a','/absolute','../outside','a/../b','a/../../x','..','.', './','a//b','a\\b','a\\..\\b','%2e%2e','a/%2F/b','a%2fb','a/%252e%252e','https://host/a','C:/a','a:b','a\n','a\u0000b',null,0,{},[]];let rejected=0;
 for(const directory of invalid)for(const fn of [()=>buildAgentBook(b as any,{directory}),()=>buildAgentRootIndex([],{directory})]){try{fn();}catch{rejected++;}}
 check('both generators reject invalid directory variants without writes',rejected===invalid.length*2,{rejected,expected:invalid.length*2});
 check('dot segments normalise consistently',agentDirectory('./a/./b/')==='a/b'&&agentDirectory('a/././b')==='a/b');
 const cases=['# Existing\n\nTail\n\n','no newline','one trailing space ','hard break  \nnext\\\n```txt\ncode  \n```\n  ','',' \n\t  '];
 for(const content of cases){const out=buildAgentBook(book([section('raw',content),section('after','AFTER_SENTINEL')]) as any);const body=strip(get(out,'/chapters/raw.md').content),full=get(out,'/full.md').content;
  const expected=(/^\s*#[ \t]+\S/.test(content)?'':'# raw\n\n')+content;
  check('exact Markdown chapter bytes '+JSON.stringify(content),content===''?body.startsWith('# raw\n\nThis section has no text'):body===expected,{expected,actual:body});
  if(content.trim())check('source and separators remain distinct in full '+JSON.stringify(content),full.includes(expected+'\n\n---\n\n> Section 2'));
 }
 const md='# MD\n\n[go](#/target) [missing](#/absent) [citation](https://citation.example/?section=target)\n\n~~~md\n[code](#/target)\n~~~\n\n`[inline](#/target)`\n  ';
 const mo=buildAgentBook(book([section('raw',md),section('target','T')]) as any),mbody=strip(get(mo,'/chapters/raw.md').content),note=mbody.slice(md.length);
 check('Markdown source exact before chapter note',mbody.startsWith(md));check('only chapter notes outside code and citations',note.includes('[go](target.md)')&&!note.includes('[code]')&&!note.includes('[inline]')&&!note.includes('[citation]'),{note});
 // Detection-only narrow variants: a title attribute containing href-like text and no-space inline exclusions.
 const titled='<p><a title=\'example href="#/target"\' href="https://citation.example/">Citation title</a></p>';
 const titleOut=buildAgentBook(book([section('alpha',titled,'html'),section('target','T')]) as any);
 const sanitised=renderPublicationContent(titled,'html'),actual=strip(get(titleOut,'/chapters/alpha.md').content);
 check('href-like title text and citation untouched',actual==='# alpha\n\n'+sanitised+'\n',{sanitised,actual});
}finally{await new Promise<void>((r,j)=>server.close(e=>e?j(e):r()));fs.writeFileSync(path.join(here,'closure-variant-results.json'),JSON.stringify({results,failures:results.filter(x=>!x.passed).length},null,2)+'\n');}
process.exitCode=results.some(x=>!x.passed)?1:0;
