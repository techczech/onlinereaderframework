import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test, {after} from 'node:test';
import {fileURLToPath} from 'node:url';
import {canonicalSites} from '../../../../apps/reader-demo/src/canonical-sites';
import {demoBooks} from '../../../../apps/reader-demo/src/books/demo-books';
import {releaseBooks, selectReleaseBooks} from '../../../../apps/reader-demo/scripts/release/release-books';
import {planEdition,planProblems} from '../../../../apps/reader-demo/scripts/release/edition-plan';
import {buildEdition,hashEdition} from '../../../../apps/reader-demo/scripts/release/build-edition';
import {verifyEdition} from '../../../../apps/reader-demo/scripts/release/verify-edition';
import {verifyExistingEdition} from '../../../../apps/reader-demo/scripts/release/verify-existing-edition';
import {defaultPreviousSiteDir} from '../../../../apps/reader-demo/scripts/release/previous-site';
import {readAppFile} from '../../../../apps/reader-demo/scripts/release/edition-assets';
import {sectionIdProblems,outputPathProblems} from '../../../../apps/reader-demo/scripts/release/route-checks';
const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../../..'), app=path.join(root,'apps/reader-demo'), previousSiteDir=defaultPreviousSiteDir(root);
const scratch=path.join(here,'scratch-boundary');
after(()=>fs.rmSync(scratch,{recursive:true,force:true}));
const plan=(book:any,site:string)=>planEdition({book,site,appRoot:app,previousSiteDir});
test('independent root/folder plans preserve all converted bytes and original root contract',()=>{
 assert.equal(demoBooks.length,8); assert.equal(releaseBooks.length,7);
 assert.equal(Object.keys(canonicalSites).length,7);
 for(const b of demoBooks.filter(b=>!releaseBooks.includes(b)))assert.equal(canonicalSites[b.id],undefined);
 for(const book of selectReleaseBooks('converted')){
  const a=plan(book,canonicalSites[book.id]),b=plan(book,'https://legacy.invalid/archive/v2/');
  assert.equal(a.base,'/');assert.equal(b.base,'/archive/v2/');assert.deepEqual(a.assets!.cover,b.assets!.cover);assert.deepEqual(a.assets!.embeds,b.assets!.embeds);
  assert.deepEqual(a.book.sections,book.sections);assert.deepEqual(b.book.sections,book.sections);
  assert.deepEqual(planProblems(a),[]);assert.deepEqual(planProblems(b),[]);
  assert(a.files.some(f=>f.path==='robots.txt'));assert(!b.files.some(f=>f.path==='robots.txt'));
 }
 for(const book of selectReleaseBooks('originals')){assert.equal(plan(book,canonicalSites[book.id]).assets,undefined);assert.throws(()=>plan(book,'https://legacy.invalid/archive/v2/'),/root address/);}
 for(const id of ['../escape','a/b','%2e%2e','new_id'])assert(sectionIdProblems('academic-productivity',[id]).length);
 assert(outputPathProblems(['../escape']).length);assert(outputPathProblems(['a','a/b']).length);
 fs.mkdirSync(scratch,{recursive:true});fs.writeFileSync(path.join(scratch,'victim'),'unchanged');fs.symlinkSync(path.join(scratch,'victim'),path.join(scratch,'link'));
 assert.throws(()=>readAppFile(scratch,'link'),/symbolic link/);assert.throws(()=>readAppFile(scratch,'../victim'),/unsafe asset/);assert.equal(fs.readFileSync(path.join(scratch,'victim'),'utf8'),'unchanged');
});
for(const [id,site] of [['academic-reading',canonicalSites['academic-reading']],['readability-foundations','https://legacy.invalid/archive/v2/']])test(`independent build and negative controls ${id} ${site}`,async()=>{
 const book=releaseBooks.find(b=>b.id===id)!,others=demoBooks.filter(b=>b.id!==id),sites={...canonicalSites,[id]:site}, repo=path.join(scratch,id);
 const p=plan(book,site),input={repo,app,book,others,sites,previousSiteDir};
 const result=await buildEdition({...input,source:{head:'independent-synthetic',dirty:false,dirtyPaths:[]}});assert(result.ok,JSON.stringify(result));if(!result.ok)return;
 const read=(name:string)=>fs.readFileSync(path.join(result.folder,name),'utf8');
 const index=read('index.html');assert(index.includes(`src="${p.base}assets/`));assert(index.includes(`<link rel="canonical" href="${site}">`));assert(index.includes(`"url":"${site}"`));assert(read('sitemap.xml').includes(site));assert(read('llms.txt').includes(`${site}agent/${id}/full.md`));
 const headers=read('_headers');assert(headers.includes(`${p.base}embeds/${id}/*`));assert(headers.includes('sandbox allow-scripts'));assert(headers.includes("connect-src 'none'"));
 assert.deepEqual(verifyEdition({plan:p,others,otherSites:Object.entries(sites).filter(([k])=>k!==id).map(([,v])=>v),outDir:result.folder}),[]);
 const bundle=fs.readdirSync(path.join(result.folder,'assets')).find(n=>/^index-.*\.js$/.test(n))!;const file=path.join(result.folder,'assets',bundle),bytes=fs.readFileSync(file);
 try{for(const other of others){fs.writeFileSync(file,Buffer.concat([bytes,Buffer.from(`;globalThis.x={bookId:"${other.id}"};`)]));assert(verifyEdition({plan:p,others,otherSites:[],outDir:result.folder}).some(f=>f.includes(`book id ${other.id}`)),other.id);}}finally{fs.writeFileSync(file,bytes);}
 const manifest=path.join(repo,'build/release-books',`${id}.manifest.json`),raw=fs.readFileSync(manifest,'utf8'),record=JSON.parse(raw);
 assert(verifyExistingEdition(input).ok);
 for(const change of [{sourceTreeDirty:true},{schema:'invalid'},{edition:{...record.edition,base:'/wrong/'}},{site:'https://wrong.invalid/'}]){fs.writeFileSync(manifest,JSON.stringify({...record,...change}));assert(!verifyExistingEdition(input).ok,JSON.stringify(change));}fs.writeFileSync(manifest,raw);
 const cover=path.join(result.folder,`covers/${id}.jpg`),original=fs.readFileSync(cover);try{fs.writeFileSync(cover,Buffer.concat([original,Buffer.from('tamper')]));assert(!verifyExistingEdition(input).ok);}finally{fs.writeFileSync(cover,original);}
 assert(verifyExistingEdition(input).ok);console.log('INDEPENDENT_SYNTHETIC_TREE',id,hashEdition(result.folder).treeSha256);
});
