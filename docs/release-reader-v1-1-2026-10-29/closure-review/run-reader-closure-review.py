from pathlib import Path
import os, json, hashlib, gzip, tarfile, tempfile, shutil, subprocess, difflib, time
R=Path(__file__).resolve().parents[3]; O=Path(__file__).parent
H=lambda b:hashlib.sha256(b).hexdigest()
results={'commands':[]}
def inventory():
 out={}
 for directory, dirs, files in os.walk(R):
  dirs[:]=[d for d in dirs if d not in ['.git','node_modules'] and Path(directory)/d != O]
  for f in files:
   p=Path(directory)/f
   if p.is_file() and not p.is_symlink(): out[str(p.relative_to(R))]=H(p.read_bytes())
 return out
before=inventory(); (O/'integrity-before.json').write_text(json.dumps(before,indent=2)+'\n')
S=Path(tempfile.mkdtemp(prefix='reader-closure-review-',dir=R/'build'))
def run(name,args,cwd,env=None,expected=0):
 start=time.monotonic(); p=subprocess.run(args,cwd=cwd,env=env,capture_output=True,text=True,timeout=180)
 (O/(name+'.log')).write_text(p.stdout.replace(str(R),'[reader-repository]')+p.stderr.replace(str(R),'[reader-repository]')+'\nEXIT '+str(p.returncode)+'\n')
 results['commands'].append({'name':name,'args':args,'exit':p.returncode,'seconds':round(time.monotonic()-start,3)})
 assert p.returncode==expected,(name,p.returncode)
 return p
try:
 archive=R/'build/reader-source-release.tar.gz'; raw=archive.read_bytes()
 assert H(raw)=='479728473301002b3fc6ad5da09166bc0f30653a805bb2abc0eb1ac51e05c390'
 assert H(gzip.decompress(raw))=='a24e3d2054bee50b879fc0570c951f07e35a00dbafd183e9d4c9c18c5ff5790f'
 with tarfile.open(archive) as tf:
  members=tf.getmembers();assert len(members)==146 and all(m.isfile() for m in members)
  current={m.name.removeprefix('public-reader-source/'):tf.extractfile(m).read() for m in members}
  tf.extractall(S,filter='data')
 manifest=json.loads((R/'docs/release-reader-v1-1-2026-10-29/manifest-reader-v1-1-boundary-repaired.json').read_text())
 assert set(current)=={f['path'] for f in manifest['files']}
 for f in manifest['files']:
  b=current[f['path']];assert len(b)==f['bytes'] and H(b)==f['sha256']
  assert b==(R/'build/public-reader-source'/f['path']).read_bytes()
 oldarchive=R/'build/retired-reader-v1-1-before-boundary-repairs/reader-source-release.tar.gz'
 with tarfile.open(oldarchive) as tf:old={m.name.removeprefix('public-reader-source/'):tf.extractfile(m).read() for m in tf.getmembers()}
 assert set(old)==set(current)
 changed=[p for p in current if current[p]!=old[p]]
 assert set(changed)=={'examples/reader-example/build.mjs','examples/reader-example/serve.mjs','examples/reader-example/test-example.mjs','provenance-reader-source.json'}
 for p in changed:(O/('diff-'+Path(p).name+'.patch')).write_text(''.join(difflib.unified_diff(old[p].decode().splitlines(True),current[p].decode().splitlines(True),fromfile='previous/'+p,tofile='repaired/'+p)))
 def scalar_changes(a,b,path=''):
  if isinstance(a,dict):
   assert set(a)==set(b);return sum((scalar_changes(a[k],b[k],path+'/'+k) for k in a),[])
  if isinstance(a,list):
   assert len(a)==len(b);return sum((scalar_changes(x,y,path+'/'+str(i)) for i,(x,y) in enumerate(zip(a,b))),[])
  return [] if a==b else [{'path':path,'old':a,'new':b}]
 pc=scalar_changes(json.loads(old['provenance-reader-source.json']),json.loads(current['provenance-reader-source.json']))
 assert len(pc)==6
 for f in json.loads((R/'docs/release-reader-v1-1-2026-10-29/hashes-reader-v1-1-boundary-repaired.json').read_text())['entries']:
  assert H((R/f['path']).read_bytes())==f['digest']==H(current[f['path']])
 results['integrity']={'archiveSha256':H(raw),'tarSha256':H(gzip.decompress(raw)),'members':len(current),'changedMembers':changed,'provenanceScalarChanges':pc}
 C=S/'public-reader-source';E=C/'examples/reader-example'
 source=(R/'scripts/prepare-reader-source-release.mjs').read_text()
 helper=source[:source.index('\nselfTest();')]+'\n'+source[source.index('function seedOfflineCache('):source.index('function materialise(')]+'\nexport {seedOfflineCache};\n'
 helper=helper.replace("const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');",'const root = '+json.dumps(str(R))+';').replace('const args = new Set(process.argv.slice(2));','const args = new Set();')
 (S/'helper.mjs').write_text(helper)
 (S/'seed.mjs').write_text("import {seedOfflineCache} from './helper.mjs';import {readFileSync} from 'node:fs';for(const f of ['packages/reader-core','examples/reader-example'])console.log(seedOfflineCache(process.argv[3],JSON.parse(readFileSync(process.argv[2]+'/'+f+'/package-lock.json'))));")
 cache=S/'npm-cache';env=os.environ.copy();env.update(npm_config_cache=str(cache),npm_config_offline='true',npm_config_audit='false',npm_config_fund='false')
 run('seed-real-offline-cache',['node',str(S/'seed.mjs'),str(C),str(cache)],R)
 run('exported-setup',['npm','run','setup'],C,env)
 run('exported-core-build',['npm','run','build'],C,env)
 run('example-embedded',['npm','run','example'],C,env)
 run('example-embedded-tests',['npm','run','test:example'],C,env)
 outside=S/'outside-embed';outside.mkdir();canary=outside/'line-spacing.html';original=(E/'embeds/line-spacing.html').read_bytes();canary.write_bytes(original+b'\n<p>INDEPENDENT_OUTSIDE_CANARY</p>\n')
 def dist_inventory():return {str(p.relative_to(E/'dist')):H(p.read_bytes()) for p in (E/'dist').rglob('*') if p.is_file()}
 baseline=dist_inventory(); results['sourceLinks']=[]
 for kind in ['leaf','directory']:
  if kind=='leaf':(E/'embeds/line-spacing.html').unlink();(E/'embeds/line-spacing.html').symlink_to(canary)
  else:(E/'embeds/line-spacing.html').unlink();(E/'embeds').rmdir();(E/'embeds').symlink_to(outside)
  p=run('refuse-embed-'+kind,['npm','run','example'],C,env,expected=1)
  assert 'Refusing a linked path: embeds' in p.stderr
  assert baseline==dist_inventory();assert canary.read_bytes()==original+b'\n<p>INDEPENDENT_OUTSIDE_CANARY</p>\n'
  results['sourceLinks'].append({'case':kind,'exit':p.returncode,'allPreviousDistFilesUnchanged':True,'distFilesCompared':len(baseline),'outsideCanaryUnchanged':True})
 (E/'embeds').unlink();(E/'embeds').mkdir();(E/'embeds/line-spacing.html').write_bytes(original)
 shutil.copyfile(O/'probe-reader-preview-closure.mjs',S/'probe.mjs')
 run('preview-boundaries',['node',str(S/'probe.mjs'),str(E),str(S/'preview-fixtures')],C,env)
 run('example-no-embeds',['npm','run','example:no-embeds'],C,env)
 run('example-no-embeds-tests',['npm','run','test:example'],C,env)
 results['status']='passed'
finally:
 shutil.rmtree(S);results['scratchRemoved']=not S.exists()
 after=inventory(); (O/'integrity-after.json').write_text(json.dumps(after,indent=2)+'\n')
 results['integrityChanges']=[p for p in set(before)|set(after) if before.get(p)!=after.get(p)]
 (O/'results-reader-closure.json').write_text(json.dumps(results,indent=2)+'\n')
 print(json.dumps(results,indent=2))
 assert not results['integrityChanges'],results['integrityChanges']
