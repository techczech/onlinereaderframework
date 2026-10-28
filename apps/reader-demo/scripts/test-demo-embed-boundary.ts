import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { demoEmbedAssets } from './demo-embed-assets';
const scratch = fs.mkdtempSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../build/.embed-boundary-'));
const app = path.join(scratch, 'app'), allowed = path.join(app, 'interactives/book');
const manifest = path.join(app, 'src/books/next-books/embed-manifest.json');
fs.mkdirSync(path.dirname(manifest), { recursive: true }); fs.mkdirSync(allowed, { recursive: true });
const canary = path.join(scratch, 'outside.html'); fs.writeFileSync(canary, 'OUTSIDE_CANARY');
const config = (dir = 'interactives/book', src = 'index.html') => fs.writeFileSync(manifest, JSON.stringify({books:{book:{interactivesDir:dir,items:[{id:'probe',src}]}}}));
const read = (plugin: any) => { const out: any[] = []; plugin.generateBundle.call({emitFile:(v: any)=>out.push(v)}); return out; };
let failures = 0, checks = 0;
function refuses(name: string, fn: ()=>unknown) { checks++; try { fn(); failures++; console.error('FAIL', name); } catch {} }
try {
 fs.writeFileSync(path.join(allowed,'index.html'),'<!doctype html><p>allowed</p>'); config();
 assert.equal(String(read(demoEmbedAssets(app))[0].source),'<!doctype html><p>allowed</p>'); checks++;
 for (const [dir,src] of [['..','outside.html'],['interactives/book','../../../outside.html'],['/tmp','index.html'],['interactives/book','index.txt'],['interactives/book','index.html?x'],['interactives/book','%2e%2e/outside.html']]) { config(dir,src); refuses(dir+' '+src,()=>demoEmbedAssets(app)); }
 fs.symlinkSync(canary,path.join(allowed,'linked.html')); config('interactives/book','linked.html'); refuses('symlink leaf',()=>read(demoEmbedAssets(app)));
 fs.symlinkSync(scratch,path.join(app,'interactives/linked')); config('interactives/linked','outside.html'); refuses('symlink directory',()=>read(demoEmbedAssets(app)));
 config(); const p = demoEmbedAssets(app); fs.unlinkSync(path.join(allowed,'index.html')); fs.symlinkSync(canary,path.join(allowed,'index.html')); refuses('swapped leaf before emission',()=>read(p));
 fs.writeFileSync(manifest,'{"books":{"book":{"items":[]}}}'); refuses('malformed book',()=>demoEmbedAssets(app));
 console.log(`${checks-failures}/${checks} asset boundary checks pass`); if(failures)process.exitCode=1;
} finally { fs.rmSync(scratch,{recursive:true,force:true}); }
