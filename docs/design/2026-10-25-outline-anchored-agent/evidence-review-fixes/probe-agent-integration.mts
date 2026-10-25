import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
// REPAIR-ROUND CHANGES to this copy (everything else is the unchanged 2026-10-25 review probe): (1) expected HTML bodies apply the intended reader-link rewrite, written independently here
// as chapter-context `<segment>.md` and full-book-context `chapters/<segment>.md`; every other byte of the sanitised render is still compared; (2) the 'source chapter links usable'
// check now resolves every retained #/ href and requires the resolved path to be a generated file; (3) the directory cases also require rejection from buildAgentRootIndex.
import {buildAgentBook,buildAgentRootIndex,agentSegment,readerLink,isPrivateHost} from '../../../../packages/reader-core/src/agent-export/index.ts';
import {renderPublicationContent,publicationContentToText} from '../../../../packages/reader-core/src/publication-content/index.ts';
const here=path.dirname(new URL(import.meta.url).pathname);
const root=path.resolve(here,'../../../..');
const scratch=path.join(here,'scratch');
fs.mkdirSync(scratch,{recursive:true});
const results:any[]=[];
function check(name:string,ok:boolean,detail:any=null){results.push({name,passed:!!ok,detail});console.log(`${ok?'PASS':'FAIL'} ${name}${detail===null?'':' '+JSON.stringify(detail)}`)}
const books=JSON.parse(fs.readFileSync(path.join(root,'apps/reader-demo/src/books/original-publications.json'),'utf8'));
const flat=(xs:any[],depth=0,parentId:any=null,trail:string[]=[]):any[]=>xs.flatMap(s=>[{s,depth,parentId,trail:[...trail,s.title]},...flat(s.children??[],depth+1,s.id,[...trail,s.title])]);
const outs=books.map((b:any)=>buildAgentBook(b));
const body=(s:string)=>s.replace(/^---\n[\s\S]*?\n---\n/,'');
for(let bi=0;bi<books.length;bi++){
 const b=books[bi],o=outs[bi],all=flat(b.sections),full=o.files.find(f=>f.path.endsWith('/full.md'))!.content;
 let at=0;const errors:any[]=[],rawFailures:string[]=[],badHtmlLinks:any[]=[];
 for(let i=0;i<all.length;i++){
  const {s,depth,parentId,trail}=all[i],m=o.manifest.sections[i];
  if(m.id!==s.id||m.order!==i+1||m.depth!==depth||m.parentId!==parentId||JSON.stringify(m.path)!==JSON.stringify(trail))errors.push({id:s.id,kind:'hierarchy'});
  const file=o.files.find(f=>f.path===`agent/${agentSegment(b.id)}/${m.file}`)!;
  const rewrite=(h:string,prefix:string)=>h.replace(/href="#\/([^"#?]+)"/g,(_m,id)=>`href="${prefix}${agentSegment(decodeURIComponent(id))}.md"`);
  const rendered=s.format==='html'?renderPublicationContent(s.content,'html'):s.content;
  const expected=s.format==='html'?rewrite(rendered,''):rendered;
  const expectedFull=s.format==='html'?rewrite(rendered,'chapters/'):rendered;
  const text=expected.replace(/\s+$/,'');
  const textFull=expectedFull.replace(/\s+$/,'');
  if(s.content.trim()){
   const found=full.indexOf(textFull,at);
   if(found<at||!body(file.content).includes(text))errors.push({id:s.id,kind:'body'}); else at=found+textFull.length;
   if(s.format!=='html'&&!body(file.content).includes(s.content))rawFailures.push(s.id);
   if(s.format==='html'){
    const original=publicationContentToText(s.content,'html');
    const exported=publicationContentToText(body(file.content),'html');
    if(!exported.includes(original))errors.push({id:s.id,kind:'semantic-html-body',original:original.slice(0,60),exported:exported.slice(0,60)});
    for(const a of body(file.content).matchAll(/href="(#\/[^" ]+)"/g))badHtmlLinks.push({section:s.id,href:a[1],resolved:new URL(a[1],`https://books.example/sub/${file.path}`).href});
    for(const a of text.matchAll(/href="([^"#]+\.md)"/g)){const r=new URL(a[1],`https://books.example/sub/${file.path}`).pathname.slice('/sub/'.length);if(!o.files.some(x=>x.path===r))badHtmlLinks.push({section:s.id,href:a[1],resolved:r,missing:true})}
   }
  }else for(const child of s.children??[])if(!body(file.content).includes(`${agentSegment(child.id)}.md`))errors.push({id:s.id,kind:'empty-parent-child'});
  for(const key of ['previous','next']){
   const expectedEntry=all[i+(key==='previous'?-1:1)];
   if(expectedEntry&&!file.content.includes(`${key}: ${JSON.stringify(`${agentSegment(expectedEntry.s.id)}.md`)}`))errors.push({id:s.id,kind:key});
  }
 }
 check(`${b.id}: complete ordered bodies and hierarchy`,errors.length===0,{total:all.length,withText:all.filter(x=>x.s.content.trim()).length,errors});
 check(`${b.id}: raw Markdown source bytes`,rawFailures.length===0,rawFailures);
 check(`${b.id}: source chapter links usable from exported Markdown`,badHtmlLinks.length===0,badHtmlLinks.length?{count:badHtmlLinks.length,examples:badHtmlLinks.slice(0,5)}:null);
 if(false)check(`${b.id}: source chapter links usable from exported Markdown`,false,{count:badHtmlLinks.length,examples:badHtmlLinks.slice(0,5)});
}
const fixture:any={id:'book /?é',title:'Public book',author:'Public author',description:'Public description',notes:'PRIVATE_SENTINEL_BOOK',absolutePath:'/Users/private-sentinel/book',drafts:['PRIVATE_DRAFT'],home:{notes:'PRIVATE_HOME',license:{label:'Public licence',href:'https://public.example/licence',secret:'PRIVATE_LICENCE'}},sections:[{id:'../a b/?#é',title:'Public chapter',category:'C',content:'# Heading\n\nPublic prose *emphasis* $x^2$.\n\n```js\nconst x = 1;\n```\n\nFootnote[^1].\n\n[^1]: Attribution.\n\n![Public image](https://public.example/image.png)\n\n',notes:'PRIVATE_SECTION',draft:'PRIVATE_DRAFT',browserState:{a:'PRIVATE_BROWSER'},privateUrl:'http://100.85.55.122/private'}]};
const f=buildAgentBook(fixture);const joined=f.files.map(x=>x.content).join('\n');
check('fixture: authored trailing Markdown whitespace retained verbatim',f.files.find(x=>x.path.includes('/chapters/'))!.content.includes(fixture.sections[0].content),{sourceEnd:fixture.sections[0].content.slice(-40),exportEnd:f.files.find(x=>x.path.includes('/chapters/'))!.content.slice(-40)});
check('unknown private fields never exported',!/(PRIVATE_|private-sentinel|100\.85\.55\.122)/.test(joined));
check('malicious and Unicode ids remain confined and round-trip in reader URLs',f.files.every(x=>x.path.startsWith('agent/')&&!x.path.includes('..'))&&new URL(f.manifest.sections[0].readerUrl,'https://books.example/sub/agent/book/index.md').searchParams.get('section')===fixture.sections[0].id);
for(const directory of ['../outside','/absolute','safe/../../outside','safe/nested']){
 let error='',out:any;
 try{out=buildAgentBook(fixture,{directory})}catch(e){error=String(e)}
 let rootError='';try{buildAgentRootIndex(outs,{directory})}catch(e){rootError=String(e)}
 if(directory!=='safe/nested')check(`root index also rejects directory: ${directory}`,!!rootError,{rootError});
 if(directory==='safe/nested'){
  const ch=out.files.find((x:any)=>x.path.includes('/chapters/'));
  const url=new URL(JSON.parse(ch.content.match(/^reader_url: (.+)$/m)[1]),'https://books.example/sub/'+ch.path);
  check('nested custom directory retains reader root',url.pathname==='/sub/',{directory,resolved:url.href});
 }else check(`unsafe directory rejected: ${directory}`,!!error,{error,path:out?.files[0].path,resolves:out?path.resolve(scratch,'output',out.files[0].path):null});
}
const safeOut=path.join(scratch,'sub');fs.mkdirSync(safeOut,{recursive:true});
for(const file of [buildAgentRootIndex(outs),...outs.flatMap(o=>o.files),...f.files]){
 const target=path.resolve(safeOut,file.path);if(!target.startsWith(safeOut+path.sep))throw Error('Review writer containment failed');
 fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,file.content);
}
check('private-host boundaries', ['100.64.0.1','100.127.255.254','[::1]','[fc00::1]','mac.ts.net','mac.local'].every(isPrivateHost)&&['100.63.255.255','100.128.0.1','books.example'].every(h=>!isPrivateHost(h)));
const summary={encodedFixtureChapterPath:f.files.find(x=>x.path.includes('/chapters/'))!.path,results,failures:results.filter(r=>!r.passed).length};
fs.writeFileSync(path.join(here,'agent-review-results.json'),JSON.stringify(summary,null,2)+'\n');
process.exitCode=summary.failures?1:0;
