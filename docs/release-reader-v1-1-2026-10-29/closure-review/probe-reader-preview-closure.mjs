import fs from 'node:fs';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { syncBuiltinESMExports } from 'node:module';
const [example, scratch] = process.argv.slice(2);
const reads=[];
const originalRead=fs.readFileSync;
fs.readFileSync=function(path,...args) {
  if (String(path).endsWith('/example-build.json')) reads.push(String(path));
  return originalRead.call(this,path,...args);
};
syncBuiltinESMExports();
const {createPreviewServer,fileFor}=await import(pathToFileURL(resolve(example,'serve.mjs')));
fs.mkdirSync(scratch);
const at=name=>resolve(scratch,name);
const observations=[];
let server;
try {
  fs.mkdirSync(at('outside'));
  fs.writeFileSync(at('outside/example-build.json'),'{"embeds":false}');
  fs.writeFileSync(at('outside/index.html'),'OUTSIDE_PREVIEW_CANARY');
  fs.writeFileSync(at('outside/canary.txt'),'OUTSIDE_PREVIEW_CANARY');
  fs.symlinkSync(at('outside'),at('linked-root'));
  fs.symlinkSync(scratch,at('ancestor'));
  fs.mkdirSync(at('metadata-root'));
  fs.symlinkSync(at('outside/example-build.json'),at('metadata-root/example-build.json'));
  fs.mkdirSync(at('copied'));
  for(const name of ['serve.mjs','hosting-headers.mjs']) fs.copyFileSync(resolve(example,name),at('copied/'+name));
  fs.symlinkSync(at('outside'),at('copied/dist'));
  const copied=await import(pathToFileURL(at('copied/serve.mjs')));
  for(const [name,root,create] of [
    ['explicit linked root',at('linked-root'),()=>createPreviewServer(at('linked-root'))],
    ['default linked root',at('copied/dist'),()=>copied.createPreviewServer()],
    ['linked ancestor',at('ancestor/outside'),()=>createPreviewServer(at('ancestor/outside'))],
    ['linked metadata leaf',at('metadata-root'),()=>createPreviewServer(at('metadata-root'))],
  ]) {
    const count=reads.length;
    assert.equal(fileFor(root,'/example-build.json'),null);
    assert.throws(create,/Refusing a missing or linked preview root or build metadata/);
    assert.equal(reads.length,count,'must refuse before readFileSync reaches metadata');
    observations.push({case:name,startupRefused:true,metadataReads:0});
  }
  const root=at('real-root');fs.mkdirSync(root);
  fs.writeFileSync(resolve(root,'example-build.json'),'{"embeds":false}');
  fs.writeFileSync(resolve(root,'index.html'),'ORDINARY_LOCAL_PAGE');
  fs.symlinkSync(at('outside/canary.txt'),resolve(root,'linked.txt'));
  fs.symlinkSync(at('outside'),resolve(root,'linked-dir'));
  const count=reads.length;
  server=createPreviewServer(root);
  assert.equal(reads.length,count+1,'positive control observes the regular metadata read');
  await new Promise(done=>server.listen(0,'127.0.0.1',done));
  const base=`http://127.0.0.1:${server.address().port}`;
  let response=await fetch(base+'/'); assert.equal(response.status,200);assert.equal(await response.text(),'ORDINARY_LOCAL_PAGE');
  response=await fetch(base+'/',{method:'HEAD'});assert.equal(response.status,200);assert.equal(await response.text(),'');
  for(const path of ['/linked.txt','/linked-dir/canary.txt']) {
    response=await fetch(base+path);assert.equal(response.status,404);assert.doesNotMatch(await response.text(),/OUTSIDE_PREVIEW_CANARY/);
    observations.push({case:path,status:404});
  }
  fs.renameSync(root,at('saved-real-root'));fs.symlinkSync(at('outside'),root);
  response=await fetch(base+'/canary.txt');assert.equal(response.status,404);assert.doesNotMatch(await response.text(),/OUTSIDE_PREVIEW_CANARY/);
  observations.push({case:'root replaced with link after startup',status:404});
  observations.push({case:'ordinary real root and metadata instrumentation positive control',GET:200,HEAD:200,metadataReads:1});
  console.log(JSON.stringify({observations},null,2));
} finally {
  if(server?.listening)await new Promise(done=>server.close(done));
  fs.readFileSync=originalRead;syncBuiltinESMExports();
  fs.rmSync(scratch,{recursive:true,force:true});
}
