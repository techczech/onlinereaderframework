#!/usr/bin/env node
/** Offline evidence only. No install, subprocess, network, environment or secret access. */
import { readFileSync, readdirSync, existsSync, lstatSync, realpathSync } from 'node:fs';
import { dirname, resolve, relative, join, posix, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { gunzipSync, gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const roots = ['packages/reader-core', 'apps/reader-demo'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const rel = path => relative(repo, path).split('\\').join('/');
const inside = path => { const p = relative(repo, path); return p === '' || (!p.startsWith('..') && !isAbsolute(p)); };
const secretName = name => /^(?:\.env(?:\.|$)|\.npmrc$|\.netrc$|.*\.(?:pem|key|p12|pfx)$)/i.test(name);
const noticeName = name => /^(?:(?:licen[cs]es?|notices?|copying|copyright|unlicense|authors)(?:[._-].*|$)|third[-_ ]?party.*(?:licen[cs]e|notice))/i.test(name);
const json = path => JSON.parse(readFileSync(path, 'utf8'));

function notices(dir, at = '', found = []) {
  for (const entry of readdirSync(join(dir, at), { withFileTypes: true }).sort((a,b) => a.name.localeCompare(b.name, 'en'))) {
    if (secretName(entry.name) || entry.isSymbolicLink() || ['node_modules','.git','.cache'].includes(entry.name)) continue;
    const child = posix.join(at, entry.name);
    if (entry.isDirectory()) notices(dir, child, found);
    else if (entry.isFile() && noticeName(entry.name)) {
      const bytes = readFileSync(join(dir, child));
      found.push({ file: child, sha256: hash(bytes), text: bytes.toString('utf8') });
    }
  }
  if (!at) {
    for (const file of readdirSync(dir).filter(f=>/^readme\.md$/i.test(f)).sort()) {
      if (!existsSync(join(dir,file)) || lstatSync(join(dir,file)).isSymbolicLink()) continue;
      const bytes=readFileSync(join(dir,file)), text=bytes.toString('utf8');
      const match=text.match(/^#{1,6} Licen[cs]e[^\n]*\n[\s\S]*?(?=^#{1,6} |$(?![\s\S]))/mi);
      // Only treat a complete embedded MIT grant as a notice; a link is still a gap.
      if(match && /Permission is hereby granted/.test(match[0]) && /THE SOFTWARE IS PROVIDED/.test(match[0]))
        found.push({file,sha256:hash(bytes),kind:'embedded-readme-licence',text:match[0]});
    }
    if (existsSync(join(dir,'package.json')) && json(join(dir,'package.json')).name==='pako') {
      const zlib=join(dir,'lib/zlib');
      if(existsSync(zlib)) for(const file of readdirSync(zlib).filter(f=>f.endsWith('.js')).sort()) {
        const p=join(zlib,file); if(lstatSync(p).isSymbolicLink()) continue;
        const bytes=readFileSync(p), match=bytes.toString('utf8').match(/(?:^\/\/[^\n]*\n)+/m);
        if(match && /This notice may not be removed/.test(match[0]))
          found.push({file:'lib/zlib/'+file,sha256:hash(bytes),kind:'embedded-zlib-notice',text:match[0]});
      }
    }
  }
  return found;
}

function inventory() {
  const issues = [], packages = new Map(), installations = [];
  function add(dir, installRoot) {
    const physical = realpathSync(dir);
    if (!inside(physical)) { issues.push({ code: 'external-package-link', path: rel(dir) }); return; }
    // Local reader-core is inventoried as an author source, not a third-party licence grant.
    if (!physical.split('/').includes('node_modules')) return;
    const manifestPath = join(physical, 'package.json');
    if (!existsSync(manifestPath)) { issues.push({ code: 'missing-package-manifest', path: rel(dir) }); return; }
    const key = rel(physical);
    if (!packages.has(key)) {
      const bytes = readFileSync(manifestPath), m = JSON.parse(bytes);
      packages.set(key, { name: m.name ?? null, version: m.version ?? null, path: key,
        installedUnder: [installRoot], manifestSha256: hash(bytes), declaredLicence: m.license ?? m.licenses ?? null,
        notices: notices(physical), directRoles: [], m });
    } else if (!packages.get(key).installedUnder.includes(installRoot)) packages.get(key).installedUnder.push(installRoot);
    scanModules(join(physical, 'node_modules'), installRoot);
  }
  const seenModules = new Set();
  function scanModules(dir, root) {
    if (!existsSync(dir)) return;
    const physical=realpathSync(dir);
    if(!inside(physical)) { issues.push({code:'external-installation-link',path:rel(dir)}); return; }
    const key = `${root}:${physical}`;
    if (seenModules.has(key)) return;
    seenModules.add(key);
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a,b)=>a.name.localeCompare(b.name,'en'))) {
      if (entry.name.startsWith('.')) continue;
      const p = join(dir, entry.name);
      if (entry.name.startsWith('@') && entry.isDirectory()) {
        for (const n of readdirSync(p).sort()) add(join(p,n), root);
      } else if (entry.isDirectory() || entry.isSymbolicLink()) add(p,root);
    }
  }
  for (const root of roots) {
    const dir = join(repo,root), m = json(join(dir,'package.json'));
    const locks = ['package-lock.json','node_modules/.package-lock.json'].filter(f=>existsSync(join(dir,f)))
      .map(file=>({ file, sha256: hash(readFileSync(join(dir,file))) }));
    installations.push({ root, name: m.name, private: m.private === true,
      manifestSha256: hash(readFileSync(join(dir,'package.json'))), locks });
    if (root==='packages/reader-core' && m.private!==true) issues.push({code:'private-publication-guard-changed',path:root+'/package.json'});
    if (!existsSync(join(dir,'node_modules'))) issues.push({code:'missing-installation',path:root});
    scanModules(join(dir,'node_modules'),root);
    for (const group of ['dependencies','devDependencies','peerDependencies','optionalDependencies']) {
      for (const name of Object.keys(m[group] ?? {}).sort()) {
        const p = join(dir,'node_modules',name);
        if (!existsSync(join(p,'package.json'))) {
          issues.push({code:group==='optionalDependencies'?'optional-not-installed':'direct-not-installed',root,name,group});
          continue;
        }
        const record = packages.get(rel(realpathSync(p)));
        if (record) record.directRoles.push({root,group,requested:m[group][name]});
      }
    }
  }
  for (const p of packages.values()) for (const notice of p.notices) notice.textSha256=hash(notice.text);
  const records = [...packages.values()].sort((a,b)=>a.path.localeCompare(b.path,'en')).map(({m,...p})=>p);
  for (const p of records) {
    if (!p.declaredLicence) issues.push({code:'missing-licence-metadata',path:p.path});
    if (!p.notices.length) issues.push({code:'missing-notice-file',path:p.path});
  }
  return { installations, packages:records, issues };
}

function unpack(bytes) {
  const tar = gunzipSync(bytes, { maxOutputLength: 128 * 1024 * 1024 });
  const files = [], seen = new Set();
  let offset = 0, nextPath;
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset,offset+512); offset += 512;
    if (header.every(v=>v===0)) {
      if (!tar.subarray(offset).every(v=>v===0)) throw Error('Non-zero data after tar terminator');
      return files;
    }
    const field = (start,len) => header.subarray(start,start+len).toString('utf8').replace(/\0.*$/s,'');
    const stored = Number.parseInt(field(148,8).trim(),8);
    const checksum = header.reduce((n,v,i)=>n+(i>=148&&i<156?32:v),0);
    if (checksum!==stored) throw Error('Invalid tar checksum');
    const sizeField=field(124,12).trim();
    if (!/^[0-7]+$/.test(sizeField)) throw Error('Unsupported tar size');
    const size=Number.parseInt(sizeField,8), type=field(156,1);
    if (offset+size>tar.length) throw Error('Truncated tar body');
    const body=tar.subarray(offset,offset+size); offset+=Math.ceil(size/512)*512;
    if (type==='x') {
      let at=0;
      while(at<body.length) {
        const space=body.indexOf(32,at), length=Number(body.subarray(at,space).toString());
        if(space<0 || !Number.isInteger(length) || length<=space-at+1 || at+length>body.length) throw Error('Invalid PAX record');
        const record=body.subarray(space+1,at+length-1).toString('utf8');
        const equal=record.indexOf('='), key=record.slice(0,equal), value=record.slice(equal+1);
        if(key==='path') nextPath=value;
        else if(!['mtime','atime','ctime'].includes(key)) throw Error('Unsupported PAX attribute');
        at+=length;
      }
      continue;
    }
    const name=nextPath ?? [field(345,155),field(0,100)].filter(Boolean).join('/'); nextPath=undefined;
    if (!name.startsWith('package/') || name.includes('\\') || name.split('/').includes('..') || name.includes('\0')) throw Error('Unsafe tar path');
    if(type==='5') continue;
    if(type!=='' && type!=='0') throw Error('Links and special tar entries are forbidden');
    if(seen.has(name)) throw Error('Duplicate tar path'); seen.add(name);
    files.push({path:name.slice(8),body});
  }
  throw Error('Missing tar terminator');
}

function contentAnchors() {
  const path=join(repo,'apps/reader-demo/src/books/original-publications.json');
  if(!existsSync(path)) throw Error('Demo manuscript exclusion source is missing');
  const anchors=[];
  function visit(section) {
    // Long literal spans catch accidental manuscript imports without printing their text.
    const text=(section.content ?? '').replace(/\r/g,'');
    for(const run of text.split(/\n|<[^>]*>/).filter(s=>s.trim().length>=120)) {
      const value=run.trim().slice(0,120);
      anchors.push({book:currentBook, value, sha256:hash(value)});
    }
    for(const child of section.children ?? []) visit(child);
  }
  let currentBook;
  for(const book of json(path)) { currentBook=book.id; for(const section of book.sections) visit(section); }
  if(!anchors.length) throw Error('No manuscript exclusion anchors were generated');
  return anchors;
}
function inspectFiles(files,anchors) {
  const issues=[], paths=new Set(files.map(f=>f.path));
  for(const file of files) {
    const p=file.path;
    if(p.split('/').some(secretName)) { issues.push({code:'forbidden-secret-filename',path:p}); continue; }
    const topNotice=/^(?:LICEN[CS]E|NOTICE|COPYING|COPYRIGHT|THIRD[-_]PARTY[-_]NOTICES)(?:[._-].*)?$/i.test(p);
    const allowed=p==='package.json'||/^README(?:\.md)?$/i.test(p)||topNotice||
      /^dist\/.+\.(?:js|mjs|cjs|ts|css|woff2?|ttf|otf|svg|png)$/.test(p)||
      /^dist\/(?:.*\/)?(?:LICEN[CS]E|NOTICE|COPYING|COPYRIGHT|THIRD[-_]PARTY[-_]NOTICES)(?:[._-].*)?$/i.test(p);
    if(!allowed || /(?:^|\/)(?:node_modules|\.git|docs|apps|books|research)(?:\/|$)|(?:original-publications|bookContent|provenance|search-index|llms\.txt)|\.(?:test|spec)\.|\.map$/i.test(p)) issues.push({code:'outside-core-allowlist',path:p});
    // Inspect textual bytes only. Font/image rights still require the separate asset inventory.
    if(/\.(?:woff2?|ttf|otf|png)$/.test(p)) continue;
    const text=file.body.toString('utf8');
    const decoded=text.replace(/\\u([a-f0-9]{4})/gi,(_,h)=>String.fromCharCode(parseInt(h,16))).replace(/\\n/g,'\n').replace(/\\"/g,'"').replace(/\\'/g,"'");
    if(/(?:\/(?:Users|home)\/[^\s/"']+|[A-Z]:[\\/](?:Users|home)[\\/]|file:\/\/|nexus-onedrive|_COORDINATION|_MACHINECONFIG|_CONTEXT|_DTC|_BACKLOG|_agent-work-space)/i.test(decoded)) issues.push({code:'private-path-or-context',path:p});
    const hit=anchors.find(a=>decoded.includes(a.value));
    if(hit) issues.push({code:'demo-manuscript-text',path:p,book:hit.book,anchorSha256:hit.sha256});
  }
  for(const p of ['package.json','dist/index.js','dist/index.d.ts']) if(!paths.has(p)) issues.push({code:'required-core-file-missing',path:p});
  const manifest=files.find(f=>f.path==='package.json');
  if(manifest) {
    const m=JSON.parse(manifest.body);
    function targets(value) {
      if(typeof value==='string') return [value];
      return value && typeof value==='object' ? Object.values(value).flatMap(targets) : [];
    }
    for(const target of [m.main,m.types,...targets(m.exports)].filter(Boolean)) {
      if(!target.startsWith('./dist/') || !paths.has(target.slice(2))) issues.push({code:'missing-or-unsafe-export',path:'package.json'});
    }
    if(m.private!==true) issues.push({code:'private-publication-guard-changed',path:'package.json'});
    if(m.bundledDependencies?.length || m.bundleDependencies?.length) issues.push({code:'bundled-dependencies-need-explicit-review',path:'package.json'});
  }
  return issues;
}
function selfTest() {
  const files=[{path:'package.json',body:Buffer.from('{"private":true}')},{path:'dist/index.js',body:Buffer.from('export {};')},{path:'dist/index.d.ts',body:Buffer.from('export {};')}];
  assert.deepEqual(inspectFiles(files,[]),[]);
  for(const [path,text,code] of [
    ['dist/leak.js','const p="/Users/example/private"','private-path-or-context'],
    ['dist/leak.js','const p="C:\\Users\\example"','private-path-or-context'],
    ['dist/leak.js','const p="'+String.raw`\u002fUsers\u002fexample`+'"','private-path-or-context'],
    ['dist/book.js','This is manuscript content','demo-manuscript-text'],
    ['dist/index.d.ts.map','{}','outside-core-allowlist'],
    ['apps/book.json','{}','outside-core-allowlist'],
    ['.env.local','DO NOT READ','forbidden-secret-filename'],
  ]) assert(inspectFiles([...files,{path,body:Buffer.from(text)}],[{book:'fixture',value:'This is manuscript content',sha256:'fixture'}]).some(i=>i.code===code),code);
  function archive(entries) {
    const blocks=[];
    for(const {name,body='',type='0'} of entries) {
      const h=Buffer.alloc(512); h.write(name,0,100); h.write('0000644\0',100);
      h.write(Buffer.byteLength(body).toString(8).padStart(11,'0')+'\0',124);
      h.fill(32,148,156); h.write(type,156); h.write('ustar\0',257);
      const sum=h.reduce((a,b)=>a+b,0); h.write(sum.toString(8).padStart(6,'0')+'\0 ',148);
      blocks.push(h,Buffer.from(body),Buffer.alloc((512-Buffer.byteLength(body)%512)%512));
    }
    return gzipSync(Buffer.concat([...blocks,Buffer.alloc(1024)]));
  }
  assert.equal(unpack(archive([{name:'package/dist/index.js',body:'export {};'}]))[0].path,'dist/index.js');
  assert.throws(()=>unpack(archive([{name:'package/../escape'}])));
  assert.throws(()=>unpack(archive([{name:'package/link',type:'2'}])));
  assert.throws(()=>unpack(archive([{name:'package/same'},{name:'package/same'}])));
  const broken=gunzipSync(archive([{name:'package/dist/index.js'}])); broken[0]^=1;
  assert.throws(()=>unpack(gzipSync(broken)));
  assert.throws(()=>unpack(Buffer.from('invalid')));
  console.log('PASS: clean core; private Unix/Windows paths; manuscript span; source map; demo path; secret filename; valid tar; traversal, link, duplicate, bad-checksum and malformed archives. No files written.');
}

try {
  const args=process.argv.slice(2);
  if(args.length===1 && args[0]==='--self-test') selfTest();
  else {
    if(args.some((a,i)=>!(a==='--summary'||a==='--pack'||(i>0&&args[i-1]==='--pack'))) || args.filter(a=>a==='--pack').length>1 || (args.includes('--pack')&&!args[args.indexOf('--pack')+1])) throw Error('Usage: node scripts/audit-reader-distribution.mjs [--summary] [--pack relative/core.tgz] | --self-test');
    const result={schemaVersion:1,scope:'Installed packages, including development dependencies; not a bundle trace or rights clearance.',...inventory()};
    const pack=args.includes('--pack')?resolve(repo,args[args.indexOf('--pack')+1]):null;
    if(pack) {
      if(!inside(pack)||!inside(realpathSync(pack))||!pack.endsWith('.tgz')||!lstatSync(pack).isFile()) throw Error('Pack must be a regular .tgz file inside this repository');
      const bytes=readFileSync(pack),files=unpack(bytes),anchors=contentAnchors();
      result.pack={path:rel(pack),sha256:hash(bytes),manuscriptAnchorCount:anchors.length,
        files:files.map(f=>({path:f.path,bytes:f.body.length,sha256:hash(f.body)})),issues:inspectFiles(files,anchors)};
    } else result.pack={status:'not-checked',reason:'Supply the actual npm pack tarball using --pack.'};
    if(args.includes('--summary')) for(const p of result.packages) for(const notice of p.notices) delete notice.text;
    console.log(JSON.stringify(result,null,2));
    if(result.issues.some(i=>i.code!=='optional-not-installed')||result.pack.issues?.length) process.exitCode=1;
  }
} catch(error) {
  // Avoid echoing parse input or absolute author paths in error messages.
  console.error(JSON.stringify({error:'Audit could not complete; check arguments, local manifests, notices and archive format.',type:error.name}));
  process.exitCode=2;
}
