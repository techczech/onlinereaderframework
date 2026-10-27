import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildEdition,hashEdition} from '../../apps/reader-demo/scripts/release/build-edition.ts';
import {verifyExistingEdition} from '../../apps/reader-demo/scripts/release/verify-existing-edition.ts';
import {planEdition} from '../../apps/reader-demo/scripts/release/edition-plan.ts';
import {releasePlugin} from '../../apps/reader-demo/scripts/release/release-plugin.ts';
import {sectionIdProblems,outputPathProblems,RESERVED_TOP_LEVEL} from '../../apps/reader-demo/scripts/release/route-checks.ts';
import {releaseTemplate,renderShell} from '../../apps/reader-demo/scripts/release/render-shell.ts';
import {safePublicationHref} from '../../packages/reader-core/src/original/publication-model.ts';
import {renderPublicationContent} from '../../packages/reader-core/src/publication-content/index.ts';
const evidence=path.dirname(fileURLToPath(import.meta.url)), repo=path.resolve(evidence,'../..'), app=path.join(repo,'apps/reader-demo');
const scratch=path.join(evidence,`scratch-${process.pid}`), results:any[]=[];
const selected=process.argv[2]??'all';
const dollars="Literal $& $' $` $$ $1 $<named>";
const book:any={id:'language-muscle',title:`Independent fixture ${dollars}`,author:'Review fixture',description:`A bounded review fixture. ${dollars}`,language:'en',sections:[{id:'sample-one',title:dollars,content:`This unique fixture sentence survives all rendering and is long enough for the release text sample check.\n\n${dollars}`},{id:'sample-two',title:'Second',format:'html',content:'<p>Another lengthy independent fixture sentence is rendered as ordinary safe content in the generated book.</p><img src="x" onerror="alert(1)"><script>alert(1)</script><a href="javascript:alert(1)">bad</a>'}]};
const sites={'language-muscle':'https://fixture.invalid/'};
const options=(root:string,b=book,others:any[]=[])=>({repo:root,app,book:b,others,sites,source:{head:'owned-fixture',dirty:false,dirtyPaths:[]},previousSiteDir:''});
const verify=(root:string,b=book)=>verifyExistingEdition({...options(root,b),previousSiteDir:''});
function fixture(name:string){const root=path.join(scratch,name); fs.mkdirSync(path.join(root,'build/release-books'),{recursive:true}); const outside=path.join(scratch,`${name}-outside`);fs.mkdirSync(outside);fs.writeFileSync(path.join(outside,'sentinel.txt'),'unchanged');return {root,release:path.join(root,'build/release-books'),outside};}
async function check(name:string,fn:()=>any){if(selected!=='all'&&selected!==name)return; try{const detail=await fn();results.push({name,pass:true,detail});}catch(e:any){results.push({name,pass:false,error:e.message});}}
try {
fs.mkdirSync(scratch,{recursive:true});
await check('guards',async()=>{
 const cases=[];
 for(const kind of ['build','root','edition','manifest','dangling-manifest','nested-edition']){
  const f=fixture(kind), folder=path.join(f.release,book.id), manifest=path.join(f.release,`${book.id}.manifest.json`);
  fs.writeFileSync(manifest,'old-manifest');
  if(kind==='build'){fs.rmSync(path.join(f.root,'build'),{recursive:true});fs.symlinkSync(f.outside,path.join(f.root,'build'));}
  if(kind==='root'){fs.rmSync(f.release,{recursive:true});fs.symlinkSync(f.outside,f.release);}
  if(kind==='edition')fs.symlinkSync(f.outside,folder);
  if(kind.includes('manifest')){fs.unlinkSync(manifest);fs.symlinkSync(path.join(f.outside,kind==='manifest'?'sentinel.txt':'absent.txt'),manifest);}
  if(kind==='nested-edition'){fs.mkdirSync(folder);fs.symlinkSync(f.outside,path.join(folder,'child'));}
  const before=fs.readdirSync(f.outside), res=await buildEdition(options(f.root));
  // A nested symlink in an existing edition is detected by the re-deploy/hash gate; building can replace that whole folder without following it.
  if(kind==='nested-edition'){assert.equal(res.ok,true);assert.equal(fs.readFileSync(path.join(f.outside,'sentinel.txt'),'utf8'),'unchanged');}
  else {assert.equal(res.ok,false,JSON.stringify(res)); assert.match(JSON.stringify(res),/symbolic link/i);}
  assert.deepEqual(fs.readdirSync(f.outside),before);assert.equal(fs.readFileSync(path.join(f.outside,'sentinel.txt'),'utf8'),'unchanged');
  if(kind==='edition')assert.equal(fs.readFileSync(manifest,'utf8'),'old-manifest');
  cases.push({kind,result:res});
 }
 for(const ids of [['a','A'],['same','same'],['a', 'x'.repeat(101)],...Array.from(RESERVED_TOP_LEVEL,x=>[x]),['child', '..'],['%2e%2e'],['a/b'],['café']])assert.ok(sectionIdProblems(book.id,ids).length,JSON.stringify(ids));
 for(const paths of [['A/x','a/X'],['a/x','a'],['a','a/b'],['./x'],['a//b'],['a\\b'],['../x']])assert.ok(outputPathProblems(paths).length,JSON.stringify(paths));
 return cases;
});
await check('module-hooks',()=>{
 const plan=planEdition({book,site:sites[book.id],appRoot:app,previousSiteDir:''});
 const mods=['src/books/original-publications.json','src/canonical-sites.ts','src/books/epub-assets.ts'];const counts=[];
 for(let n=0;n<3;n++){
  const plugin:any=releasePlugin(plan,app);
  for(const file of mods.slice(0,n))plugin.load(path.join(app,file)+'?variant');
  assert.throws(()=>plugin.generateBundle.handler.call({emitFile(){}},{},{'index.html':{type:'asset',source:'unused'}}),/did not replace/);counts.push(n);
 }
 return {missingReplacementCountsRefused:counts,htmlBody:renderPublicationContent(book.sections[1].content,'html')};
});
await check('manifest-gates',async()=>{
 const f=fixture('gates');let built=await buildEdition(options(f.root));assert.equal(built.ok,true,JSON.stringify(built));assert.equal(verify(f.root).ok,true);
 const folder=path.join(f.release,book.id),mp=path.join(f.release,`${book.id}.manifest.json`),original=fs.readFileSync(mp,'utf8');
 const html=fs.readFileSync(path.join(folder,'sample-one/index.html'),'utf8'); assert.ok(html.includes("Literal $&amp; $' $` $$ $1 $&lt;named&gt;"));
 const failures=[];
 for(const patch of [{checks:{failures:['forced failure']}},{checks:{}},{schema:'old'},{sourceTreeDirty:true},{sourceTreeDirty:null},{treeSha256:'0'.repeat(64)},{totals:{files:0,bytes:0}}]){
  fs.writeFileSync(mp,JSON.stringify({...JSON.parse(original),...patch}));const v=verify(f.root);assert.equal(v.ok,false,JSON.stringify(patch));failures.push({patch,failures:v.failures});
 } fs.writeFileSync(mp,original);
 const js=fs.readdirSync(path.join(folder,'assets')).find(x=>x.endsWith('.js'))!;const jp=path.join(folder,'assets',js),jb=fs.readFileSync(jp);fs.appendFileSync(jp,'\n/*tampered*/');assert.equal(verify(f.root).ok,false);fs.writeFileSync(jp,jb);
 fs.symlinkSync(f.outside,path.join(folder,'linked'));assert.equal(verify(f.root).ok,false);fs.unlinkSync(path.join(folder,'linked'));
 const old=hashEdition(folder).treeSha256;
 const twin={...book,id:'different-book',title:'Different title',sections:book.sections.map((s:any)=>({...s,id:'other-'+s.id}))};
 const failed=await buildEdition(options(f.root,book,[twin]));assert.equal(failed.ok,false,JSON.stringify(failed));assert.equal(hashEdition(folder).treeSha256,old);assert.equal(fs.existsSync(mp),false);assert.equal(verify(f.root).ok,false);
 assert.equal(fs.readFileSync(path.join(f.outside,'sentinel.txt'),'utf8'),'unchanged');return {mutationsRefused:failures,failedBuild:failed,oldEditionRetained:true};
});
await check('render-guards',()=>{
 const source=fs.readFileSync(path.join(app,'index.html'),'utf8');
 for(const bad of [source.replace('<div id="root"></div>',''),source.replace('<div id="root"></div>','<div id="root"></div><div id="root"></div>'),source.replace('</head>','<title>Duplicate</title></head>'),source.replace('<meta name="robots"','<meta name="robots" content="x"><meta name="robots"')])assert.throws(()=>releaseTemplate(bad,'en'),/expected exactly one/);
 const template=releaseTemplate(source,'en');
 assert.throws(()=>renderShell(template.replace('<!--ORF_BODY-->',''),'title','head','body'),/expected exactly one/);
 assert.throws(()=>renderShell(template.replace('<!--ORF_BODY-->','<!--ORF_BODY--><!--ORF_BODY-->'),'title','head','body'),/expected exactly one/);
 return {malformedTemplatesRefused:6};
});
await check('build-failure',async()=>{
 const f=fixture('build-failure'), folder=path.join(f.release,book.id),mp=path.join(f.release,book.id+'.manifest.json');
 fs.mkdirSync(folder);fs.writeFileSync(path.join(folder,'sentinel.txt'),'previous edition');fs.writeFileSync(mp,'old manifest');const old=hashEdition(folder).treeSha256;
 const fakeApp=path.join(scratch,'fixture-app');fs.mkdirSync(path.join(fakeApp,'src'),{recursive:true});
 fs.writeFileSync(path.join(fakeApp,'index.html'),fs.readFileSync(path.join(app,'index.html'),'utf8'));
 fs.writeFileSync(path.join(fakeApp,'src/main.tsx'),'console.log("owned missing-module fixture");');
 const failed=await buildEdition({...options(f.root),app:fakeApp});
 assert.equal(failed.ok,false,JSON.stringify(failed));assert.match(JSON.stringify(failed),/did not replace/);
 assert.equal(hashEdition(folder).treeSha256,old);assert.equal(fs.existsSync(mp),false);
 assert.equal(fs.readFileSync(path.join(f.outside,'sentinel.txt'),'utf8'),'unchanged');
 return {failed,oldEditionRetained:true,oldManifestInvalidated:true};
});
await check('unsafe-link',async()=>{
 const f=fixture('unsafe-link'), bad={...book,home:{license:{label:'Unsafe fixture licence',href:'javascript:alert(1)'}}};
 assert.equal(safePublicationHref(bad.home.license.href),undefined);
 const built=await buildEdition(options(f.root,bad));assert.equal(built.ok,true,JSON.stringify(built));
 const v=verify(f.root,bad);assert.equal(v.ok,true,JSON.stringify(v));
 const html=fs.readFileSync(path.join(f.release,book.id,'index.html'),'utf8');
 const link=html.match(/<a href="javascript:[^"]*">[^<]*<\/a>/)?.[0];
 fs.writeFileSync(path.join(evidence,'unsafe-link-result.json'),JSON.stringify({built,v,link,bodySanitised:!/<script|onerror=|href="javascript:/i.test(renderPublicationContent(book.sections[1].content,'html'))},null,2));
 assert.equal(link,undefined,'Static licence metadata emits '+link+' and both build and deploy verification accept it.');
});
await check('promotion-gap',async()=>{
 const f=fixture('promotion-gap');assert.equal((await buildEdition(options(f.root))).ok,true);
 const folder=path.join(f.release,book.id), old=hashEdition(folder).treeSha256, rename=fs.renameSync;let gap:any;
 try{fs.renameSync=((from:any,to:any)=>{if(String(from).includes('.incomplete-')&&String(to)===folder){gap={editionPresent:fs.existsSync(folder),previousPresent:fs.readdirSync(f.release).some(x=>x.startsWith('.previous-'))};throw new Error('owned injected promotion failure');}return rename(from,to);}) as any;
 const failed=await buildEdition(options(f.root,{...book,title:'Changed new title'}));assert.equal(failed.ok,false);assert.equal(hashEdition(folder).treeSha256,old);assert.equal(fs.existsSync(path.join(f.release,book.id+'.manifest.json')),false);
 }finally{fs.renameSync=rename;}
 fs.writeFileSync(path.join(evidence,'promotion-gap-result.json'),JSON.stringify({gap,rollbackRestoresOld:true},null,2));
 assert.equal(gap.editionPresent,true,'Between the two promotion renames the canonical edition folder is absent; process termination here leaves only .previous and .incomplete folders.');
});
await check('manifest-failure',async()=>{
 const f=fixture('manifest-failure');assert.equal((await buildEdition(options(f.root))).ok,true);
 const folder=path.join(f.release,book.id),old=hashEdition(folder).treeSha256,rename=fs.renameSync;let error='';
 try{fs.renameSync=((from:any,to:any)=>{if(String(from).includes('.manifest.json.tmp-'))throw Object.assign(new Error('owned injected manifest rename failure'),{code:'EACCES'});return rename(from,to);}) as any;
 try{await buildEdition(options(f.root,{...book,title:'Changed replacement title'}));}catch(e:any){error=e.message;}
 }finally{fs.renameSync=rename;}
 const observation={error,oldHash:old,currentHash:hashEdition(folder).treeSha256,manifestExists:fs.existsSync(path.join(f.release,book.id+'.manifest.json')),previousFolders:fs.readdirSync(f.release).filter(x=>x.startsWith('.previous-'))};
 fs.writeFileSync(path.join(evidence,'manifest-failure-result.json'),JSON.stringify(observation,null,2));assert.ok(error);
 assert.equal(observation.currentHash,old,'The manifest publication failed after the previous edition was deleted; the old edition cannot be recovered from the release root.');
});
} finally {fs.rmSync(scratch,{recursive:true,force:true});}
console.log(JSON.stringify(results,null,2));
fs.writeFileSync(path.join(evidence,selected==='all'?'probe-results.json':`probe-${selected}-results.json`),JSON.stringify(results,null,2)+'\n');
process.exitCode=results.some(x=>!x.pass)?1:0;
