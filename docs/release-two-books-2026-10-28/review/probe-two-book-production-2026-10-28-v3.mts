import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { buildEdition, hashEdition } from '../../../apps/reader-demo/scripts/release/build-edition';
import { releaseBooks } from '../../../apps/reader-demo/scripts/release/release-books';
import { planEdition } from '../../../apps/reader-demo/scripts/release/edition-plan';
import { verifyEdition, textSamples } from '../../../apps/reader-demo/scripts/release/verify-edition';
import { defaultPreviousSiteDir } from '../../../apps/reader-demo/scripts/release/previous-site';
import { securityHeaders } from '../../../apps/reader-demo/scripts/release/headers';
import { convertedEditionAssets, readAppFile } from '../../../apps/reader-demo/scripts/release/edition-assets';
import { canonicalSites } from '../../../apps/reader-demo/src/canonical-sites';
import { releaseLocation, sectionIdsOf } from '../../../apps/reader-demo/src/release-routes';
import { resolvePublicationEmbedUrl } from '../../../packages/reader-core/src/embed/embed-model';
import { importReaderBooks, checkHeaders, READER_BOOKS } from '../../../../../01_dlwebs/dlnet/scripts/import-reader-books';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../..');
const app = path.join(repo, 'apps/reader-demo');
const hostSource = path.resolve(repo, '../../01_dlwebs/dlnet');
const runId = new Date().toISOString().replace(/[:.]/g, '-') + '-' + process.pid;
const scratch = path.join(here, 'scratch-two-book-' + runId);
const evidence = path.join(here, 'evidence-two-book-production-' + runId + '.json');
const results: any = { runId, probeVersion: 3, buildCwd: process.cwd(), register: 'FOR AGENTS', buildSourceDirty: true, deployabilityClaim: false, commands: [], editions: [], isolation: [], importer: [], routes: [], assets: [], headers: [], findings: [] };
const sha = (x: string | Buffer) => crypto.createHash('sha256').update(x).digest('hex');
function sourceHashes() {
 const inventory:any={};
 for(const [name,base] of [['hashes-reader.txt',repo],['hashes-website.txt',hostSource]]) {
  const rows=fs.readFileSync(path.join(repo,'docs/release-two-books-2026-10-28/evidence',name),'utf8').trim().split('\n');
  for(const line of rows) {const relative=line.slice(line.indexOf('  ')+2);inventory[base+'/'+relative]=sha(fs.readFileSync(path.join(base,relative)));}
 }
 for(const rel of ['src/content/guides.json','src/content/bands.json','src/components/FeatureBands.astro','src/pages/resources.astro','src/pages/academic-productivity.astro','src/styles/bands.css','src/styles/sections.css','public/assets/books/academic-reading-cover.jpg','public/assets/books/readability-foundations-cover.jpg']) inventory[hostSource+'/'+rel]=sha(fs.readFileSync(path.join(hostSource,rel)));
 return inventory;
}
results.sourceHashesBefore=sourceHashes();

function walk(root: string, rel = ''): string[] { return fs.readdirSync(path.join(root, rel), {withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(e => {const r = rel ? rel + '/' + e.name : e.name; return e.isDirectory() && !e.isSymbolicLink() ? walk(root,r) : [r];}); }
function snapshot(root: string) { return Object.fromEntries(walk(root).filter(p=> !p.startsWith('.reader-books-import/')).map(p=>[p, fs.lstatSync(path.join(root,p)).isSymbolicLink() ? 'link:' + fs.readlinkSync(path.join(root,p)) : sha(fs.readFileSync(path.join(root,p)))])); }
function command(name: string, executable: string, args: string[], cwd: string, timeout = 180000) { const out = spawnSync(executable, args, {cwd, encoding:'utf8', timeout, maxBuffer: 10e6, env:{...process.env, DLNET_SKIP_BUILD:'1', ASTRO_TELEMETRY_DISABLED:'1'}}); results.commands.push({name, executable,args,cwd,exit:out.status,signal:out.signal,error:out.error?.message,stdout:out.stdout,stderr:out.stderr}); return out; }
let sequence = 0;
function hostFixture() { const host = path.join(scratch, 'host-' + ++sequence); fs.mkdirSync(path.join(host,'public/books'),{recursive:true}); fs.mkdirSync(path.join(host,'src/content'),{recursive:true}); fs.writeFileSync(path.join(host,'public/_headers'), fs.readFileSync(path.join(hostSource,'public/_headers'))); fs.writeFileSync(path.join(host,'src/content/reader-books.json'), '{"books":[]}\n'); fs.writeFileSync(path.join(host,'public/index.html'),'SITE CANARY'); fs.mkdirSync(path.join(host,'public/books/untouched'),{recursive:true}); fs.writeFileSync(path.join(host,'public/books/untouched/canary'),'UNTOUCHED BOOK'); return host; }
function manifest(root: string, book: string, mutate: (m:any)=>void) { const p = path.join(root,'build/release-books',book+'.manifest.json'); const m = JSON.parse(fs.readFileSync(p,'utf8')); mutate(m); fs.writeFileSync(p,JSON.stringify(m)); }
function recordImport(name:string,host:string,reader:string,extra:any={}) { const before = snapshot(host); let output:any; try { output = importReaderBooks({hostRoot:host, readerRoot:reader, verifyReader:()=>({ok:true,output:'SCRATCH transaction-only verifier stub'}),...extra}); } catch(e) { output = {threw: String(e)}; } const after = snapshot(host); const staging = fs.existsSync(path.join(host,'.reader-books-import')) ? fs.readdirSync(path.join(host,'.reader-books-import')) : []; const same = JSON.stringify(before) === JSON.stringify(after); results.importer.push({name,output,hostUnchanged:same,staging,outsideCanary:fs.readFileSync(path.join(scratch,'outside/canary'),'utf8')}); return output; }
try {
 fs.mkdirSync(path.join(scratch,'outside'),{recursive:true}); fs.writeFileSync(path.join(scratch,'outside/canary'),'OUTSIDE CANARY');
 const editionRepo = path.join(scratch,'editions');
 for(const book of releaseBooks.filter(b=>['academic-reading','readability-foundations'].includes(b.id))) {
  const built = await buildEdition({repo:editionRepo,app,book,others:releaseBooks.filter(b=>b.id!==book.id),sites:canonicalSites,source:{head:'0'.repeat(40),dirty:true,dirtyPaths:['independent review scratch']},previousSiteDir:defaultPreviousSiteDir(repo)});
  if(!built.ok) throw new Error(JSON.stringify(built));
  results.editions.push({book:book.id,...built,hash:hashEdition(built.folder).treeSha256});
  const plan = planEdition({book,site:canonicalSites[book.id],appRoot:app,previousSiteDir:defaultPreviousSiteDir(repo)});
  const others = releaseBooks.filter(b=>b.id!==book.id); const otherSites = others.map(b=>canonicalSites[b.id]);
  const main = walk(built.folder).filter(p=>/^assets\/index-.*\.js$/.test(p)).sort((a,b)=>fs.statSync(path.join(built.folder,b)).size-fs.statSync(path.join(built.folder,a)).size)[0];
  const bundle = path.join(built.folder,main); const clean = fs.readFileSync(bundle);
  for(const other of others) for(const [kind,payload] of [ ['book-id',`globalThis.foreignBook={id:${JSON.stringify(other.id)},sections:[]};`], ['title',JSON.stringify(other.title)], ['sample',textSamples(other)[0]], ['resource',`covers/${other.id}.jpg`] ]) {
   fs.writeFileSync(bundle,Buffer.concat([clean,Buffer.from('\n/* review */\n'+payload)]));
   const failures = verifyEdition({plan,others,otherSites,outDir:built.folder});
   results.isolation.push({book:book.id,other:other.id,kind,payload,refused:failures.length>0,failures});
  }
  fs.writeFileSync(bundle,clean);
  const base=plan.base, ids=sectionIdsOf(book.sections);
  for(const suffix of ['', ids[1]+'/',ids[1], '?section='+ids[1], '#/'+ids[1]]) { const href='https://preview.example'+base+suffix; results.routes.push({href,result:releaseLocation(book.id,href,ids,base)??null,embed:resolvePublicationEmbedUrl(plan.embeds!.root+plan.embeds!.items[0].src,plan.embeds!.root!,href,base)?.href}); }
  results.routes.push({href:'https://preview.example'+base.slice(0,-1)+'?text=x#h',result:releaseLocation(book.id,'https://preview.example'+base.slice(0,-1)+'?text=x#h',ids,base)});
  const assets=convertedEditionAssets(book,app,base); results.assets.push({book:book.id,cover:assets.record.cover,embeds:assets.record.embeds});
 }
 // Only transaction-only fixtures below are marked clean. No deployability evidence; no real reader verifier is stubbed at a production destination.
 const fixtureReader = path.join(scratch,'fixture-reader'); fs.cpSync(editionRepo,fixtureReader,{recursive:true});
 for(const b of READER_BOOKS) manifest(fixtureReader,b.book,m=>{m.sourceTreeDirty=false;});
 for(const fault of ['after-stage','after-first-move','after-all-moves','before-headers','before-record','after-record']) {
  const host=hostFixture(); recordImport('control before '+fault,host,fixtureReader); recordImport('late-failure '+fault,host,fixtureReader,{fault});
 }
 for(const kind of ['manifest-traversal','wrong-pin','dirty','header-escape','source-leaf-link','source-ancestor-link','manifest-link','host-books-link','host-destination-link','host-headers-link','host-record-link','host-content-link']) {
  const host=hostFixture(); const reader=path.join(scratch,'reader-'+kind); fs.cpSync(fixtureReader,reader,{recursive:true}); let extra:any={};
  const book=READER_BOOKS[0],dir=path.join(reader,'build/release-books',book.book);
  if(kind==='manifest-traversal') manifest(reader,book.book,m=>{m.files[0].path='../outside/canary';});
  if(kind==='wrong-pin') extra.expectTree={[book.book]:'f'.repeat(64)};
  if(kind==='dirty') manifest(reader,book.book,m=>{m.sourceTreeDirty=true;});
  if(kind==='header-escape') { fs.appendFileSync(path.join(dir,'_headers'),'\n/*\n  X-Frame-Options: DENY\n'); const h=hashEdition(dir); manifest(reader,book.book,m=>{m.files=h.files;m.treeSha256=h.treeSha256;}); }
  const link=(target:string,dest:string)=>{fs.rmSync(dest,{recursive:true,force:true});fs.symlinkSync(target,dest);};
  if(kind==='source-leaf-link') link(path.join(scratch,'outside/canary'),path.join(dir,'index.html'));
  if(kind==='source-ancestor-link') link(path.join(scratch,'outside'),path.join(reader,'build/release-books'));
  if(kind==='manifest-link') link(path.join(scratch,'outside/canary'),path.join(reader,'build/release-books',book.book+'.manifest.json'));
  if(kind==='host-books-link') link(path.join(scratch,'outside'),path.join(host,'public/books'));
  if(kind==='host-destination-link') link(path.join(scratch,'outside'),path.join(host,'public/books',book.folder));
  if(kind==='host-headers-link') link(path.join(scratch,'outside/canary'),path.join(host,'public/_headers'));
  if(kind==='host-record-link') link(path.join(scratch,'outside/canary'),path.join(host,'src/content/reader-books.json'));
  if(kind==='host-content-link') link(path.join(scratch,'outside'),path.join(host,'src/content'));
  recordImport(kind,host,reader,extra);
 }
 // Existing verifier rejection is honoured before any host write. This is not a successful real deployment verification.
 recordImport('verifier rejection',hostFixture(),fixtureReader,{verifyReader:()=>({ok:false,output:'independent refusal canary'})});
 // Headers, also tested independently of reader verifier.
 const spec=READER_BOOKS[0],good=securityHeaders({base:spec.base,embedRoot:'embeds/'+spec.book+'/'});
 for(const [name,text] of [['control',good],['path-escape',good+'\n/*\n  X-Frame-Options: DENY\n'],['same-origin',good.replace('sandbox allow-scripts;','sandbox allow-scripts allow-same-origin;')],['detach-robots',good.replace('  ! X-Frame-Options','  ! X-Robots-Tag\n  ! X-Frame-Options')]]) results.headers.push({name,failures:checkHeaders(text,spec,true)});
 // Real current website sources; copying does not include existing dist or unrelated docs.
 const site = path.join(scratch,'actual-site'); fs.mkdirSync(site,{recursive:true});
 for(const item of ['src','public','scripts','tests','astro.config.mjs','tsconfig.json','package.json']) fs.cpSync(path.join(hostSource,item),path.join(site,item),{recursive:true});
 fs.cpSync(path.join(hostSource,'node_modules'),path.join(site,'node_modules'),{recursive:true,verbatimSymlinks:true,mode:fs.constants.COPYFILE_FICLONE});
 const siteBuild=command('current website build without imported books','bun',['run','build'],site);
 if(siteBuild.status===0) command('current website focused source/render tests','bun',['test','tests/guides.test.ts','tests/reader-books.test.ts','tests/record-pages.test.ts'],site);
 // Current cover bytes must equal selected reader bytes. No committed fallback data.
 const guides=JSON.parse(fs.readFileSync(path.join(hostSource,'src/content/guides.json'),'utf8')).guides;
 const bands=JSON.parse(fs.readFileSync(path.join(hostSource,'src/content/bands.json'),'utf8'));
 results.websiteCards = READER_BOOKS.map(spec=>{const guide=guides.find((g:any)=>g.id===spec.book);const cards=bands.flatMap((b:any)=>b.items).filter((c:any)=>c.href===spec.site);return {book:spec.book,guide,cards,hostCoverHash:sha(fs.readFileSync(path.join(hostSource,'public',guide.shot))),readerCoverHash:sha(fs.readFileSync(path.join(app,'public/covers',spec.book+'.jpg')))};});
 // An actual filesystem failure at the final record rename, beyond the artificial fault switches.
 const lateHost=hostFixture(); recordImport('control before real EACCES',lateHost,fixtureReader);
 fs.chmodSync(path.join(lateHost,'src/content'),0o555);
 try { recordImport('real record rename EACCES',lateHost,fixtureReader); }
 finally { fs.chmodSync(path.join(lateHost,'src/content'),0o755); }
 // Scratch-only import with pinned trees, followed by the actual current site build. The verifier stub prevents any deployability claim.
 const pins=Object.fromEntries(READER_BOOKS.map(b=>[b.book,JSON.parse(fs.readFileSync(path.join(fixtureReader,'build/release-books',b.book+'.manifest.json'),'utf8')).treeSha256]));
 const stagedImport=recordImport('actual current site scratch import with pins',site,fixtureReader,{expectTree:pins});
 if(stagedImport.ok) {
  const importedBuild=command('current website build after scratch-only import','bun',['run','build'],site);
  if(importedBuild.status===0) {
   command('current imported website focused tests','bun',['test','tests/guides.test.ts','tests/reader-books.test.ts','tests/agent-layer.test.ts','tests/dead-links.test.ts'],site);
   results.renderedCovers=[];
   for(const page of ['index.html','resources/index.html','academic-productivity/index.html']) {
    const html=fs.readFileSync(path.join(site,'dist',page),'utf8');
    for(const spec of READER_BOOKS) {
     const guide=guides.find((g:any)=>g.id===spec.book);
     const tags=html.match(/<img\b[^>]*>/g)??[];
     results.renderedCovers.push({page,book:spec.book,tags:tags.filter(t=>t.includes(guide.shot)),hasBookUrl:html.includes(spec.site)});
    }
   }
   results.importedDiscovery=Object.fromEntries(['robots.txt','sitemap.xml','llms.txt','_headers'].map(file=>[file,fs.readFileSync(path.join(site,'dist',file),'utf8')]));
  }
 }
 results.completed=true;
} catch(error) { results.error=String(error);process.exitCode=1; }
finally { results.sourceHashesAfter=sourceHashes();results.productionSourcesUnchanged=JSON.stringify(results.sourceHashesBefore)===JSON.stringify(results.sourceHashesAfter);fs.rmSync(scratch,{recursive:true,force:true});results.scratchRemoved=!fs.existsSync(scratch);fs.writeFileSync(evidence,JSON.stringify(results,null,2)+'\n');console.log(evidence); }
