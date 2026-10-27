import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import * as crypto from 'node:crypto';
import * as zlib from 'node:zlib';
import assert from 'node:assert/strict';
const out=path.dirname(url.fileURLToPath(import.meta.url));const root=path.resolve(out,'../..');
const source=fs.readFileSync(path.join(root,'scripts/prepare-reader-source-release.mjs'),'utf8');
const snapshot=JSON.parse(fs.readFileSync(path.join(out,'snapshot-reader-source-start.json')));
for(const key of ['inputs','candidate']) if(Array.isArray(snapshot[key])) snapshot[key]=Object.fromEntries(snapshot[key].map(entry=>[entry.path,entry.digest]));
const scratch=fs.mkdtempSync(path.join(out,'scratch-reader-source-cleanup-'));
let result;
try {
 const fakeRoot=path.join(scratch,'repository');fs.mkdirSync(fakeRoot);
 for(const p of Object.keys(snapshot.inputs)){const target=path.join(fakeRoot,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.copyFileSync(path.join(root,p),target);}
 fs.symlinkSync(path.join(root,'packages/reader-core/node_modules'),path.join(fakeRoot,'packages/reader-core/node_modules'),'dir');
 const script=source.replace(/^import .*;\n/gm,'').replace("const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');",'const root = reviewRoot;');
 const all={...fs,...url,...path,...crypto,...zlib,assert};
 const names=['readFileSync','writeFileSync','readdirSync','lstatSync','mkdirSync','mkdtempSync','rmSync','cpSync','symlinkSync','existsSync','dirname','resolve','relative','posix','fileURLToPath','createHash','gzipSync','gunzipSync','assert'];
 const fakeProcess={platform:process.platform,version:process.version,execPath:process.execPath,argv:['node','review'],exit(code){throw Error('unexpected exit '+code);},exitCode:0};
 const calls=[];
 const spawn=(command,args)=>{
  calls.push({command:command===process.execPath?'node':command,args});
  if(command==='git')return {status:0,stdout:args[0]==='rev-parse'?'24ff25434457928cacdfedc8f91645d58c2615c0\n':'',stderr:''};
  return {status:37,stdout:'',stderr:'Synthetic build failure for cleanup verification.'};
 };
 new Function('reviewRoot','process','spawnSync',...names,script)(fakeRoot,fakeProcess,spawn,...names.map(n=>all[n]));
 const e=JSON.parse(fs.readFileSync(path.join(fakeRoot,'build/reader-source-release.evidence.json')));
 const scratchRemaining=fs.readdirSync(path.join(fakeRoot,'build')).filter(n=>n.startsWith('reader-source-release.scratch-'));
 assert.equal(fakeProcess.exitCode,1);assert.equal(e.result,'failed');assert.equal(e.checks[0].exitCode,37);assert.equal(e.scratchRemoved,true);assert.deepEqual(scratchRemaining,[]);
 assert(fs.existsSync(path.join(root,'packages/reader-core/node_modules/typescript/package.json')));
 result={mode:'actual exporter body on cloned inputs; Git reads stubbed; first npm build injected exit 37',exporterProcessExitCode:fakeProcess.exitCode,childExitCode:e.checks[0].exitCode,evidenceResult:e.result,scratchRemoved:e.scratchRemoved,scratchRemaining,sharedDependenciesStillExist:true,calls};
} finally {fs.rmSync(scratch,{recursive:true,force:true});}
result.reviewScratchRemoved=!fs.existsSync(scratch);
fs.writeFileSync(path.join(out,'result-reader-source-cleanup.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
