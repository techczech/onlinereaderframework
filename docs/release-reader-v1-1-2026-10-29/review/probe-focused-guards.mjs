import { readFileSync,writeFileSync,mkdtempSync,mkdirSync,rmSync,symlinkSync,copyFileSync,existsSync } from 'node:fs';
import {resolve,dirname} from 'node:path';import {fileURLToPath,pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../../..');const out=dirname(fileURLToPath(import.meta.url));const scratch=mkdtempSync(resolve(root,'build/review-focused-'));
const result={};
try {
 const source=readFileSync(resolve(root,'scripts/prepare-reader-source-release.mjs'),'utf8');
 const helper=(source.slice(0,source.indexOf('\nselfTest();'))+'\n'+source.slice(source.indexOf('function retirePreviousCandidate('),source.indexOf('\nlet scratch;'))+'\nexport {audit,manuscriptBooks,manuscriptAnchors,assertProjectPath,retirePreviousCandidate};\n').replace("const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');",'const root = '+JSON.stringify(root)+';').replace('const args = new Set(process.argv.slice(2));','const args = new Set();');
 writeFileSync(resolve(scratch,'guards.mjs'),helper);const {audit,manuscriptBooks,manuscriptAnchors,assertProjectPath,retirePreviousCandidate}=await import(pathToFileURL(resolve(scratch,'guards.mjs')));
 const path='packages/reader-core/src/embed/embed.test.mjs',line="assert.equal(resolve('file:///tmp/book/index.html'), null, 'file pages are refused');";
 const test=(p,t)=>audit(new Map([[p,Buffer.from(t)]]),[]).issues.length;
 assert.equal(test(path,line),0);
 for(const t of [line+'\n'+line,line.replace('index.html','index.html/private'),line.replace('index.html','index.html%2fprivate'),line.replace('assert.equal','other.equal'),line+"\nconst x='file:///tmp/private.md';"])assert.ok(test(path,t));
 assert.ok(test('packages/reader-core/src/other.test.mjs',line));
 for(const p of ['examples/reader-example/extra.mjs','examples/reader-example/src/extra.jsx','examples/reader-example/embeds/extra.html'])assert.ok(test(p,''));
 result.literalAndAllowlist='approved literal accepted; count, suffix, encoded suffix, context, extra URL, wrong file and unlisted files refused';
 const anchors=manuscriptAnchors(manuscriptBooks());result.manuscripts={anchors:anchors.length,books:[]};
 for(const book of [...new Set(anchors.map(a=>a.book))]) {const a=anchors.find(a=>a.book===book);assert.ok(audit(new Map([['README.md',Buffer.from(a.value)]]),anchors).issues.some(i=>i.code==='real-manuscript-span'));result.manuscripts.books.push(book);}
 const owner=resolve(scratch,'repository'),outside=resolve(scratch,'outside');mkdirSync(owner);mkdirSync(outside);writeFileSync(resolve(outside,'canary'),'KEEP');
 const output=resolve(owner,'build');symlinkSync(outside,output,'dir');assert.throws(()=>assertProjectPath(resolve(output,'new-file'),'file',owner));rmSync(output);mkdirSync(output);
 for(const name of ['reader-source-release.tar.gz','reader-source-release.manifest.json','reader-source-release.sha256','reader-source-release.evidence.json']) {const p=resolve(output,name);symlinkSync(resolve(outside,'canary'),p);assert.throws(()=>assertProjectPath(p,'file',owner));rmSync(p);}
 assert.throws(()=>assertProjectPath(resolve(owner,'../outside/new-file'),'file',owner));assert.equal(readFileSync(resolve(outside,'canary'),'utf8'),'KEEP');result.outputContainment='linked build, all four output leaves and directory escape refused; canary unchanged';
 // Confirm the linked-root issue through the actual default argument, using unmodified copied server modules.
 const example=resolve(scratch,'example');mkdirSync(example);for(const name of ['serve.mjs','hosting-headers.mjs'])copyFileSync(resolve(root,'build/public-reader-source/examples/reader-example',name),resolve(example,name));
 writeFileSync(resolve(outside,'example-build.json'),'{"embeds":true}');writeFileSync(resolve(outside,'outside-canary.txt'),'OUTSIDE_DEFAULT_ROOT');symlinkSync(outside,resolve(example,'dist'),'dir');
 const {createPreviewServer}=await import(pathToFileURL(resolve(example,'serve.mjs')));const server=createPreviewServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
 try {const r=await fetch(`http://127.0.0.1:${server.address().port}/outside-canary.txt`);result.defaultPreviewRoot={status:r.status,body:await r.text()};assert.equal(result.defaultPreviewRoot.status,200);assert.equal(result.defaultPreviewRoot.body,'OUTSIDE_DEFAULT_ROOT');}finally{await new Promise(r=>server.close(r));}
}finally {rmSync(scratch,{recursive:true,force:true});result.scratchRemoved=!existsSync(scratch);writeFileSync(resolve(out,'focused-guards.json'),JSON.stringify(result,null,2)+'\n');}
console.log(JSON.stringify(result,null,2));
