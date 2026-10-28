import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {buildEdition,hashEdition} from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/build-edition.ts';
import {releaseBooks} from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/release-books.ts';
import {planEdition} from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/edition-plan.ts';
import {verifyEdition,bookIdPattern,sectionIdPattern,sectionIdToken} from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/verify-edition.ts';
import {verifyExistingEdition} from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/verify-existing-edition.ts';
import {defaultPreviousSiteDir} from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/scripts/release/previous-site.ts';
import {canonicalSites} from '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo/src/canonical-sites.ts';
import {importReaderBooks} from '/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet/scripts/import-reader-books.ts';
const here=path.dirname(fileURLToPath(import.meta.url)), repo='/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework',app=path.join(repo,'apps/reader-demo'), scratch=path.join(here,'scratch-closure');
const website='/Users/dominiklukes/gitrepos/07_webapps-websites/01_dlwebs/dlnet';
const evidence:any={scope:'two repaired findings and direct regressions only',started:new Date().toISOString(),editions:[],identity:[],patterns:[],imports:[]};
const sha=(x:any)=>crypto.createHash('sha256').update(x).digest('hex');
const inventory=()=>JSON.parse(fs.readFileSync(path.join(repo,'docs/release-two-books-2026-10-28/repair/source-hashes.json'),'utf8')).entries.map((e:any)=>({...e,current:sha(fs.readFileSync(path.join(e.project==='reader'?repo:website,e.path)))}));
evidence.before=inventory();
function walk(p:string):string[]{return fs.readdirSync(p,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name)).flatMap(d=>d.isDirectory()&&!d.isSymbolicLink()?walk(path.join(p,d.name)).map(n=>d.name+'/'+n):[d.name]);}
function snapshot(root:string){return Object.fromEntries(walk(root).filter(n=>!n.startsWith('.reader-books-import/')).map(n=>{const p=path.join(root,n),s=fs.lstatSync(p);return[n,s.isSymbolicLink()?'link:'+fs.readlinkSync(p):sha(fs.readFileSync(p))];}));}
let count=0;
function host(){const h=path.join(scratch,'host-'+ ++count);fs.mkdirSync(path.join(h,'public/books/untouched'),{recursive:true});fs.mkdirSync(path.join(h,'src/content'),{recursive:true});fs.copyFileSync(path.join(website,'public/_headers'),path.join(h,'public/_headers'));fs.writeFileSync(path.join(h,'public/index.html'),'HOST CANARY');fs.writeFileSync(path.join(h,'public/books/untouched/canary'),'THIRD BOOK');fs.writeFileSync(path.join(h,'src/content/reader-books.json'),'{"books":[]}');return h;}
const fixtureRepo=path.join(scratch,'editions');
function existing(book:any,others:any[]){return verifyExistingEdition({repo:fixtureRepo,app,book,others,sites:canonicalSites,previousSiteDir:defaultPreviousSiteDir(repo)});}
function pinManifest(book:string){const p=path.join(fixtureRepo,'build/release-books',book+'.manifest.json');const m=JSON.parse(fs.readFileSync(p,'utf8'));const h=hashEdition(path.join(fixtureRepo,'build/release-books',book));Object.assign(m,{sourceTreeDirty:false,files:h.files,treeSha256:h.treeSha256,totals:{files:h.files.length,bytes:h.files.reduce((s,f)=>s+f.bytes,0)}});fs.writeFileSync(p,JSON.stringify(m));}
try{
fs.mkdirSync(scratch);
for(const book of releaseBooks.filter(b=>['academic-reading','readability-foundations'].includes(b.id))){
 const others=releaseBooks.filter(b=>b.id!==book.id),otherSites=others.map(b=>canonicalSites[b.id]);
 const built=await buildEdition({repo:fixtureRepo,app,book,others,sites:canonicalSites,source:{head:'a'.repeat(40),dirty:true,dirtyPaths:['independent review fixture']},previousSiteDir:defaultPreviousSiteDir(repo)});
 assert.equal(built.ok,true,JSON.stringify(built));
 const plan=planEdition({book,site:canonicalSites[book.id],appRoot:app,previousSiteDir:defaultPreviousSiteDir(repo)});
 const bundle=walk(built.folder).filter(p=>/^assets\/index-.*\.js$/.test(p)).map(p=>path.join(built.folder,p)).sort((a,b)=>fs.statSync(b).size-fs.statSync(a).size)[0];
 assert.ok(bundle);const clean=fs.readFileSync(bundle);
 const verify=()=>verifyEdition({plan,others,otherSites,outDir:built.folder});
 assert.deepEqual(verify(),[]);pinManifest(book.id);assert.deepEqual(existing(book,others).failures,[]);
 evidence.editions.push({book:book.id,files:hashEdition(built.folder).files.length,tree:built.treeSha256,baselinePassed:true,existingFixturePassed:true,sourceDirty:true,note:'Only scratch manifest set false for existing-verifier control; no deployability claim.'});
 for(const other of others){
 const variants=[`globalThis.foreignBook={id:"${other.id}",sections:[]};`,`globalThis.r={"bookId" : '${other.id}'};`,'globalThis.r={book_id:`'+other.id+'`};',`<div data-book-id = "${other.id}">`,`globalThis.r={"${other.id}": {sections:[]}};`,JSON.stringify({id:other.id}),JSON.stringify(JSON.stringify({bookId:other.id})),`{\n id : '${other.id}'\n}`];
 for(const payload of variants){assert.equal(bookIdPattern(other.id).test(payload),true,payload);evidence.patterns.push({book:book.id,other:other.id,payload,refused:true});}
 for(const payload of [`The discussion includes ${other.id} in ordinary prose.`,`{id:"${other.id}-extended"}`,`{id:"prefix-${other.id}"}`,`{myid:"${other.id}"}`]){assert.equal(bookIdPattern(other.id).test(payload),false,payload);evidence.patterns.push({book:book.id,other:other.id,payload,allowed:true});}
 for(const payload of variants.slice(0,5)){
 fs.writeFileSync(bundle,Buffer.concat([clean,Buffer.from('\n'+payload)]));
 const failures=verify();assert.ok(failures.some(x=>x.includes('book id '+other.id)),failures.join('|'));
 pinManifest(book.id);const ex=existing(book,others);assert.ok(ex.failures.some(x=>x.includes('artefact check:')&&x.includes('book id '+other.id)),JSON.stringify(ex));
 evidence.identity.push({book:book.id,other:other.id,payload,failures,existingFailures:ex.failures});
 }
 for(const payload of [`// Ordinary discussion of ${other.id}.`,`;globalThis.longer={id:"${other.id}-extended"};`]){fs.writeFileSync(bundle,Buffer.concat([clean,Buffer.from('\n'+payload)]));assert.deepEqual(verify(),[]);pinManifest(book.id);assert.deepEqual(existing(book,others).failures,[]);}
 }
 fs.writeFileSync(bundle,clean);pinManifest(book.id);assert.deepEqual(verify(),[]);
}
assert.equal(sectionIdToken('cognitive-load').test('reader-content-cognitive-load-model'),false);
assert.equal(sectionIdPattern('accessibility').test('An accessibility discussion.'),false);
assert.equal(sectionIdPattern('accessibility').test('{id:"accessibility"}'),true);
evidence.sectionFalsePositiveControl=true;
const canary=path.join(scratch,'outside-canary');fs.writeFileSync(canary,'OUTSIDE BYTES');const canaryHash=sha(fs.readFileSync(canary));
const options=(h:string,extra:any={})=>({hostRoot:h,readerRoot:fixtureRepo,verifyReader:()=>({ok:true,output:'Transaction fixture only'}),...extra});
for(const kind of ['linked-existing','linked-dangling','record-directory']){
 const h=host(),record=path.join(h,'src/content/reader-books.json');fs.rmSync(record);if(kind==='record-directory')fs.mkdirSync(record);else fs.symlinkSync(kind==='linked-existing'?canary:path.join(scratch,'nonexistent-target'),record);
 const before=snapshot(h);let verifierCalls=0;const result=importReaderBooks(options(h,{verifyReader:()=>{verifierCalls++;return{ok:true,output:'should not run'};}}));
 assert.equal(result.ok,false);assert.equal(verifierCalls,0);assert.deepEqual(snapshot(h),before);assert.equal(fs.existsSync(path.join(h,'.reader-books-import')),false);assert.equal(sha(fs.readFileSync(canary)),canaryHash);
 evidence.imports.push({kind,result,verifierCalls,hostUnchanged:true,canaryUnchanged:true,stagingAbsent:true});
}
for(const fault of ['after-stage','after-first-move','after-all-moves','before-headers','before-record','after-record']){
 const h=host();assert.equal(importReaderBooks(options(h)).ok,true);const before=snapshot(h);const result=importReaderBooks(options(h,{fault}));assert.equal(result.ok,false);assert.deepEqual(snapshot(h),before);assert.deepEqual(fs.existsSync(path.join(h,'.reader-books-import'))?fs.readdirSync(path.join(h,'.reader-books-import')):[],[]);assert.equal(sha(fs.readFileSync(canary)),canaryHash);evidence.imports.push({kind:fault,result,hostUnchanged:true,canaryUnchanged:true,stagingEmpty:true});
}
evidence.after=inventory();assert.deepEqual(evidence.after,evidence.before);assert.ok(evidence.before.every((e:any)=>e.current===e.digest));evidence.ok=true;
}catch(error){evidence.error=String(error);process.exitCode=1;}finally{fs.rmSync(scratch,{recursive:true,force:true});evidence.scratchRemoved=!fs.existsSync(scratch);evidence.finished=new Date().toISOString();fs.writeFileSync(path.join(here,'evidence-two-book-repair-closure.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify({ok:evidence.ok,error:evidence.error,editions:evidence.editions.length,identity:evidence.identity.length,patterns:evidence.patterns.length,imports:evidence.imports.length,scratchRemoved:evidence.scratchRemoved}));}
