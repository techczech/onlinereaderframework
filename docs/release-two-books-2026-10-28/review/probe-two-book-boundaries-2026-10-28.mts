import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { convertedEditionAssets, readAppFile } from '../../../apps/reader-demo/scripts/release/edition-assets';
import { releaseBooks } from '../../../apps/reader-demo/scripts/release/release-books';
import { resolvePublicationEmbedUrl, validatePublicationEmbeds } from '../../../packages/reader-core/src/embed/embed-model';
const here=path.dirname(fileURLToPath(import.meta.url)), repo=path.resolve(here,'../../..'),app=path.join(repo,'apps/reader-demo');
const id=new Date().toISOString().replace(/[:.]/g,'-')+'-'+process.pid,scratch=path.join(here,'scratch-boundaries-'+id);
const result:any={register:'FOR AGENTS',id,assets:[],urls:[],commands:[]};
const book=releaseBooks.find(b=>b.id==='academic-reading')!;
let n=0;
function fixture() {const root=path.join(scratch,'app-'+ ++n);for(const rel of ['scripts/release/converted-book-assets.json','src/books/next-books/next-books-provenance.json','src/books/next-books/embed-manifest.json','public/covers/academic-reading.jpg','interactives/academic-reading-framework']) {fs.mkdirSync(path.dirname(path.join(root,rel)),{recursive:true});fs.cpSync(path.join(app,rel),path.join(root,rel),{recursive:true});}return root;}
try {
 fs.mkdirSync(scratch,{recursive:true});const canary=path.join(scratch,'outside.html');fs.writeFileSync(canary,'OUTSIDE ASSET CANARY');
 for(const name of ['control','cover-tamper','embed-tamper','manifest-traversal','manifest-drift','manifest-symlink','manifest-ancestor-symlink','cover-symlink','embed-leaf-symlink','embed-ancestor-symlink','app-alias']) {
  let root=fixture(); const m=path.join(root,'src/books/next-books/embed-manifest.json');const embed=path.join(root,'interactives/academic-reading-framework/cognition-explorer/index.html');
  if(name==='cover-tamper')fs.appendFileSync(path.join(root,'public/covers/academic-reading.jpg'),'x');
  if(name==='embed-tamper')fs.appendFileSync(embed,'x');
  if(name==='manifest-traversal'||name==='manifest-drift'){const data=JSON.parse(fs.readFileSync(m,'utf8'));if(name==='manifest-traversal')data.books['academic-reading'].items[0].src='../../outside.html';else data.books['academic-reading'].items[0].title='Forged descriptor';fs.writeFileSync(m,JSON.stringify(data));}
  const link=(p:string)=>{const copy=p+'-real';fs.renameSync(p,copy);fs.symlinkSync(copy,p);};
  if(name==='manifest-symlink')link(m);
  if(name==='manifest-ancestor-symlink')link(path.dirname(m));
  if(name==='cover-symlink')link(path.join(root,'public/covers/academic-reading.jpg'));
  if(name==='embed-leaf-symlink')link(embed);
  if(name==='embed-ancestor-symlink')link(path.join(root,'interactives/academic-reading-framework'));
  if(name==='app-alias'){fs.symlinkSync(root,root+'-alias');root+='-alias';}
  try{const plan=convertedEditionAssets(book,root,'/books/academic-reading/');result.assets.push({name,refused:false,files:plan.files.length});}catch(e){result.assets.push({name,refused:true,error:String(e)});}
 }
 const leafRoot=path.join(scratch,'outside-asset-root');fs.mkdirSync(leafRoot);fs.symlinkSync(canary,path.join(leafRoot,'leak.html'));
 try{readAppFile(leafRoot,'leak.html');result.outsideLeafRefused=false;}catch(e){result.outsideLeafRefused=true;}
 for(const base of ['/books/a/','/','//foreign.test/','https://foreign.test/','/books/a/../','/books/%2e%2e/','/books/a%2fb/','/books/a\\b/','/books/a/?q=x','/books/a/#h','/books/a','/books/a//','/a/b/c/d/e/f/g/h/i/']){
  const url=resolvePublicationEmbedUrl('embeds/test/index.html','embeds/','https://actual.example/books/a/chapter/?query#hash',base);
  result.urls.push({base,url:url?.href??null,validRegistry:validatePublicationEmbeds({base,items:[]}).problems.length===0});
 }
 // Existing self-test relocated solely to keep its scratch in the authorised review output root.
 const source=fs.readFileSync(path.join(repo,'scripts/prepare-reader-source-release.mjs'),'utf8');
 const relocated=source.replace("const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');",'const root = '+JSON.stringify(repo)+';').replace("const build = resolve(root, 'build');",'const build = '+JSON.stringify(path.join(scratch,'source-export-test'))+';');
 fs.mkdirSync(path.join(scratch,'source-export-test')); const runner=path.join(scratch,'source-export-self-test.mjs');fs.writeFileSync(runner,relocated);
 const out=spawnSync('node',[runner,'--self-test'],{cwd:repo,encoding:'utf8',timeout:60000});result.commands.push({name:'source export five-book manuscript/privacy self-test (scratch relocated)',exit:out.status,stdout:out.stdout,stderr:out.stderr,error:out.error?.message});
 result.outsideCanaryUnchanged=fs.readFileSync(canary,'utf8')==='OUTSIDE ASSET CANARY';
 result.completed=true;
} catch(e){result.error=String(e);process.exitCode=1;}
finally{fs.rmSync(scratch,{recursive:true,force:true});result.scratchRemoved=!fs.existsSync(scratch);const output=path.join(here,'evidence-two-book-boundaries-'+id+'.json');fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(output);}
