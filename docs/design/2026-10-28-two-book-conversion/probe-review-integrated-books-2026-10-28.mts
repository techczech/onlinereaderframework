import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync,spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=process.cwd(), app=path.join(root,'apps/reader-demo'), review=path.dirname(fileURLToPath(import.meta.url));
const scratch=fs.mkdtempSync(path.join(review,'.scratch-review-integrated-'));
const sha=(p:string)=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const json=(p:string)=>JSON.parse(fs.readFileSync(p,'utf8'));
const result:any={date:new Date().toISOString(),commands:[],provenance:[],plugin:[],release:[]};
const b=path.join(app,'src/books/next-books/build-source'), tsx=path.join(app,'node_modules/.bin/tsx');
function run(name:string,args:string[],env:any={}) { const r=spawnSync(args[0],args.slice(1),{cwd:root,encoding:'utf8',env:{...process.env,TSX_DISABLE_CACHE:'1',...env},maxBuffer:20<<20}); result.commands.push({name,args,exit:r.status,stdout:r.stdout,stderr:r.stderr}); console.log(name,r.status); if(r.status!==0) throw new Error(name+' failed: '+r.stderr); }
try {
 const prov=json(path.join(app,'src/books/next-books/next-books-provenance.json'));
 for(const [id,record] of Object.entries(prov.books) as any) for(const f of record.files){const actual=sha(path.join(record.readFrom??record.repository,f.file));result.provenance.push({kind:'source',book:id,file:f.file,expected:f.sha256,actual,match:actual===f.sha256});}
 for(const f of prov.outputs){const actual=sha(path.join(app,f.file));result.provenance.push({kind:'output',file:f.file,expected:f.sha256,actual,match:actual===f.sha256});}
 const folio='/Users/dominiklukes/gitrepos/02_writing-creation/writing/books/web-published';
 for(const f of prov.folioFiles){const actual=sha(path.join(folio,f.file));result.provenance.push({kind:'folio',file:f.file,expected:f.sha256,actual,match:actual===f.sha256});}
 const A=prov.books['academic-reading'].repository,R=prov.books['readability-foundations'].readFrom;
 run('render-academic',[tsx,path.join(b,'build-academic.tsx'),A,scratch]);
 run('render-readability',[tsx,path.join(b,'build-readability.tsx'),R,scratch]);
 run('render-originals',[tsx,path.join(b,'render-originals.tsx'),A,R,path.join(scratch,'originals-text.json')]);
 run('oracle-states',[tsx,path.join(b,'oracle-states.tsx'),R,path.join(scratch,'oracle-states.json')]);
 run('book-accounting',[tsx,path.join(b,'check-books.ts'),scratch,path.join(review,'evidence-review-integrated-books-accounting-2026-10-28.json')]);
 run('rebuild-embeds-to-scratch',[tsx,path.join(b,'build-embeds.tsx'),R,scratch,path.join(scratch,'interactives')]);
 result.rebuilt=prov.outputs.filter((f:any)=>f.file.startsWith('interactives/')).map((f:any)=>({file:f.file,current:sha(path.join(app,f.file)),rebuilt:sha(path.join(scratch,f.file)),equal:sha(path.join(app,f.file))===sha(path.join(scratch,f.file))}));
 const cache=path.join(process.env.HOME!,'Library/Caches/ms-playwright');
 const shells=fs.readdirSync(cache).filter(n=>n.startsWith('chromium_headless_shell-')).sort().map(n=>path.join(cache,n,'chrome-headless-shell-mac-arm64/chrome-headless-shell')).filter(f=>fs.existsSync(f));
 const chrome=shells.at(-1)!; result.chrome={path:chrome,version:execFileSync(chrome,['--version'],{encoding:'utf8'}).trim()};
 run('source-behaviour-browser',['node',path.join(b,'check-embeds.mjs'),path.join(app,'interactives'),scratch,path.join(review,'evidence-review-integrated-books-browser-2026-10-28.json')],{CHROME:chrome});
 const {demoEmbedAssets}=await import(path.join(app,'scripts/demo-embed-assets.ts'));
 // Synthetic files only; all fixtures, including the outside-root canary, stay inside review scratch.
 const fixture=path.join(scratch,'fixture-app'), manifestPath=path.join(fixture,'src/books/next-books/embed-manifest.json');fs.mkdirSync(path.dirname(manifestPath),{recursive:true});
 const canary=path.join(scratch,'outside-allowed-assets.txt'); fs.writeFileSync(canary,'REVIEW_SYNTHETIC_CANARY_ONLY');
 const allowed=path.join(fixture,'interactives/book');fs.mkdirSync(allowed,{recursive:true});fs.writeFileSync(path.join(allowed,'index.html'),'<!doctype html><p>allowed</p>'); fs.symlinkSync(canary,path.join(allowed,'linked.html'));
 const cases=[{name:'valid-listed-html',dir:'interactives/book',src:'index.html'}, {name:'directory-traversal-to-text',dir:'..',src:'outside-allowed-assets.txt'}, {name:'source-traversal-to-text',dir:'interactives/book',src:'../../../outside-allowed-assets.txt'}, {name:'symlink-to-text',dir:'interactives/book',src:'linked.html'}];
 for(const c of cases){fs.writeFileSync(manifestPath,JSON.stringify({books:{book:{interactivesDir:c.dir,items:[{id:'probe',src:c.src}]}}}));let emitted:any[]=[],middleware:any;try{const p:any=demoEmbedAssets(fixture);p.configureServer({middlewares:{use:(m:any)=>{middleware=m}}});p.buildStart.call({addWatchFile:()=>{},error:(s:string)=>{throw new Error(s)}});p.generateBundle.call({emitFile:(f:any)=>{emitted.push({fileName:f.fileName,body:String(f.source)})}});let body='';middleware({url:'/embeds/book/'+c.src},{setHeader:()=>{},end:(v:any)=>{body=String(v)},statusCode:0},()=>{});result.plugin.push({...c,rejected:false,emitted,served:body});}catch(e){result.plugin.push({...c,rejected:true,error:String(e)});}}
 // Exact production release bundle path, no renamed section ids. Capture known verifier false positives separately.
 const {build}=await import(path.join(app,'node_modules/vite/dist/node/index.js'));
 const react=(await import(path.join(app,'node_modules/@vitejs/plugin-react/dist/index.js'))).default;
 const {planEdition}=await import(path.join(app,'scripts/release/edition-plan.ts'));
 const {releasePlugin}=await import(path.join(app,'scripts/release/release-plugin.ts'));
 const {defaultPreviousSiteDir}=await import(path.join(app,'scripts/release/previous-site.ts'));
 const {otherSitesOf}=await import(path.join(app,'scripts/release/build-edition.ts'));
 const {verifyEdition}=await import(path.join(app,'scripts/release/verify-edition.ts'));
 const {walkFiles}=await import(path.join(app,'scripts/release/write-guard.ts'));
 const {demoBooks,originalBooks}=await import(path.join(app,'src/books/demo-books.ts'));
 const {canonicalSites}=await import(path.join(app,'src/canonical-sites.ts'));
 for(const book of originalBooks){const outDir=path.join(scratch,'release-'+book.id),plan=planEdition({book,site:canonicalSites[book.id],appRoot:app,previousSiteDir:defaultPreviousSiteDir(root)});await build({configFile:false,root:app,base:'/',publicDir:false,logLevel:'silent',plugins:[react(),releasePlugin(plan,app)],resolve:{alias:{'reader-core':path.join(root,'packages/reader-core/src/index.ts')},dedupe:['react','react-dom']},define:{__READER_RELEASE_BOOK__:JSON.stringify(book.id)},build:{outDir,emptyOutDir:false,sourcemap:false}});const files=[...walkFiles(outDir)],bundle=files.filter((f:string)=>/\.(js|css|html|json|txt|md)$/.test(f)).map((f:string)=>fs.readFileSync(f,'utf8')).join('\n'); const markers=['Cognition Explorer','Foundations of Readability','Increasing Reading Productivity','readability-checker','cramped-text-reveal','demo-books','embed-manifest','academicreading.edutools','readability.edutools'];result.release.push({book:book.id,failures:verifyEdition({plan,others:demoBooks.filter((x:any)=>x.id!==book.id),otherSites:otherSitesOf(canonicalSites,book.id),outDir}),forbiddenMarkersFound:markers.filter(m=>bundle.includes(m)),unexpectedFiles:files.map((f:string)=>path.relative(outDir,f)).filter((f:string)=>f.startsWith('embeds/')||f.includes('demo-books')),files:files.map((f:string)=>({file:path.relative(outDir,f),sha256:sha(f)}))});console.log('release',book.id,'built');}
} catch(e){result.fatal=String(e);process.exitCode=1;} finally{fs.rmSync(scratch,{recursive:true,force:true});result.scratchRemoved=!fs.existsSync(scratch);fs.writeFileSync(path.join(review,'evidence-review-integrated-books-2026-10-28.json'),JSON.stringify(result,null,2)+'\n');}
