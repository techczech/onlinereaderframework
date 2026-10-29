import pathlib,json,hashlib,tarfile,gzip,io,subprocess,tempfile,shutil,os,time,urllib.request,urllib.error
R=pathlib.Path(__file__).resolve().parents[3]
O=R/'docs/release-reader-v1-1-2026-10-29/review'
H=lambda b:hashlib.sha256(b).hexdigest()
def dump(n,x): (O/n).write_text(json.dumps(x,indent=2)+'\n')
def snapshot():
    out={}
    for base in ['scripts','examples/reader-example','packages/reader-core','docs','build/public-reader-source','build/retired-reader-source-v1-source-candidate-502b7a14a3eb','build/public-reader-v1-git']:
        for d,dirs,files in os.walk(R/base,followlinks=False):
            dirs[:]=[x for x in dirs if x not in ['node_modules','.git','dist'] and pathlib.Path(d,x)!=O]
            for f in files:
                p=pathlib.Path(d,f)
                if not p.is_symlink(): out[str(p.relative_to(R))]=H(p.read_bytes())
    for f in ['package.json','build/reader-source-release.tar.gz','build/reader-source-release.manifest.json','build/reader-source-release.sha256','build/reader-source-release.evidence.json']:
        out[f]=H((R/f).read_bytes())
    return out
results={'commands':[]}
before=snapshot();dump('integrity-before.json',before)
scratch=pathlib.Path(tempfile.mkdtemp(prefix='review-reader-v1-1-',dir=R/'build'))
def run(name,args,cwd=None,env=None,required=True):
    t=time.monotonic();q=subprocess.run(args,cwd=cwd or R,text=True,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,env=env,timeout=240)
    text=q.stdout.replace(str(R),'[reader-repository]');(O/(name+'.log')).write_text(text+'\nEXIT '+str(q.returncode)+'\n')
    results['commands'].append({'name':name,'command':args,'exit':q.returncode,'seconds':round(time.monotonic()-t,2)});dump('results.json',results)
    print(name,q.returncode,flush=True)
    if required: assert q.returncode==0,name
    return q
try:
    m=json.loads((R/'build/reader-source-release.manifest.json').read_text());ev=json.loads((R/'build/reader-source-release.evidence.json').read_text())
    raw=(R/'build/reader-source-release.tar.gz').read_bytes();tar=gzip.decompress(raw)
    assert H(raw)=='bef6d91ef82e9cb93753cec1ef4affdd4e3088885ca25c6b3062388910274502'==m['sha256']
    assert H(tar)=='9ab5d23aafde1ec269ee0d8a97bbc47af41a7d449d9759ac3efc864dcbfaf4a4'==m['uncompressedTarSha256']
    assert len(raw)==m['bytes'];assert m['fileCount']==146
    assert (R/'build/reader-source-release.sha256').read_text().split()[0]==H(raw)
    assert json.loads((O.parent/'manifest-reader-source-release-v1.1.0.json').read_text())==m
    listed={f['path']:f for f in m['files']}
    assert len(listed)==146
    with tarfile.open(fileobj=io.BytesIO(raw),mode='r:gz') as tf:
        members=tf.getmembers();assert len(members)==146
        for t in members:
            assert t.isfile() and t.name.startswith('public-reader-source/')
            path=t.name.removeprefix('public-reader-source/');assert '..' not in pathlib.PurePosixPath(path).parts
            b=tf.extractfile(t).read();assert H(b)==listed[path]['sha256'] and len(b)==listed[path]['bytes']
            assert (R/'build/public-reader-source'/path).read_bytes()==b
        tf.extractall(scratch,filter='data')
    sourceDrift=[f['path'] for f in ev['inputHashes'] if H((R/f['path']).read_bytes())!=f['sha256']]
    assert not sourceDrift,sourceDrift
    results['candidate']={'archiveSha256':H(raw),'tarSha256':H(tar),'members':146,'inputHashesVerified':len(ev['inputHashes']),'sourceDrift':sourceDrift}
    # Only read-only Git inspection; preserve the exact reviewed diff in new evidence.
    run('exporter-diff',['git','--no-optional-locks','diff','HEAD','--','scripts/prepare-reader-source-release.mjs'])
    run('exporter-self-test',['node','scripts/prepare-reader-source-release.mjs','--self-test'])
    source=(R/'scripts/prepare-reader-source-release.mjs').read_text()
    # Load exact functions without the publishing-output block. Original root remains fixed; helper reads source and cache only.
    helper=source[:source.index('\nselfTest();')]+ '\n'+source[source.index('function seedOfflineCache('):source.index('function materialise(')]+ '\nexport { audit,manuscriptBooks,manuscriptAnchors,seedOfflineCache,assertProjectPath };\n'
    helper=helper.replace("const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');",'const root = '+json.dumps(str(R))+';')
    helper=helper.replace('const args = new Set(process.argv.slice(2));', 'const args = new Set();')
    (scratch/'exporter-functions.mjs').write_text(helper)
    isolated=scratch/'public-reader-source';cache=scratch/'npm-cache'
    seed=r"""import {readFileSync,writeFileSync} from 'node:fs';import {resolve} from 'node:path';import {seedOfflineCache,audit,manuscriptBooks,manuscriptAnchors} from './exporter-functions.mjs';
const [copy,cache,out]=process.argv.slice(2);const reports=[];
for(const f of ['packages/reader-core','examples/reader-example'])reports.push(seedOfflineCache(cache,JSON.parse(readFileSync(resolve(copy,f,'package-lock.json')))));
const manifest=JSON.parse(readFileSync(resolve(copy,'../../reader-source-release.manifest.json')));
const entries=new Map(manifest.files.map(f=>[f.path,readFileSync(resolve(copy,f.path))]));const anchors=manuscriptAnchors(manuscriptBooks());const report=audit(entries,anchors);if(report.issues.length)throw Error(JSON.stringify(report.issues));
writeFileSync(out,JSON.stringify({cache:reports,audit:report},null,2));"""
    # Manifest belongs to original build; provide its exact bytes in scratch, not any altered gate data.
    seed=seed.replace("resolve(copy,'../../reader-source-release.manifest.json')",json.dumps(str(R/'build/reader-source-release.manifest.json')))
    (scratch/'seed-and-audit.mjs').write_text(seed)
    run('seed-cache-and-audit',['node',str(scratch/'seed-and-audit.mjs'),str(isolated),str(cache),str(O/'audit.json')])
    env=os.environ.copy();env.update({'npm_config_cache':str(cache),'npm_config_offline':'true','npm_config_audit':'false','npm_config_fund':'false'})
    run('exported-setup',['npm','run','setup'],isolated,env)
    for name,script in [('exported-build','build'),('exported-tests','test'),('exported-native-import','test:native'),('example-build','example'),('example-tests','test:example')]:run(name,['npm','run',script],isolated,env)
    # Boundary reproductions use canaries only, all under owned scratch.
    probe=r"""import {mkdirSync,writeFileSync,symlinkSync,rmSync} from 'node:fs';import {resolve} from 'node:path';import {pathToFileURL} from 'node:url';import assert from 'node:assert/strict';
const [copy,scratch,out]=process.argv.slice(2);const {fileFor,createPreviewServer}=await import(pathToFileURL(resolve(copy,'examples/reader-example/serve.mjs')));
const external=resolve(scratch,'outside-preview-root');mkdirSync(external);writeFileSync(resolve(external,'example-build.json'),'{"embeds":true}');writeFileSync(resolve(external,'outside-canary.txt'),'OUTSIDE_PREVIEW_CANARY');
const linked=resolve(scratch,'linked-dist');symlinkSync(external,linked,'dir');const server=createPreviewServer(linked);await new Promise(r=>server.listen(0,'127.0.0.1',r));let result;
try {const response=await fetch(`http://127.0.0.1:${server.address().port}/outside-canary.txt`);result={linkedRoot:{fileFor:fileFor(linked,'/outside-canary.txt')!==null,status:response.status,body:await response.text()}};assert.equal(result.linkedRoot.status,200);assert.equal(result.linkedRoot.body,'OUTSIDE_PREVIEW_CANARY');}finally{await new Promise(r=>server.close(r));}
// The ordinary root's descendants still reject links.
symlinkSync(resolve(external,'outside-canary.txt'),resolve(external,'child-link.txt'));result.childLinkRefused=fileFor(external,'/child-link.txt')===null;assert.equal(result.childLinkRefused,true);
writeFileSync(out,JSON.stringify(result,null,2));console.log(JSON.stringify(result));"""
    (scratch/'probe-preview.mjs').write_text(probe)
    run('probe-preview-root-link',['node',str(scratch/'probe-preview.mjs'),str(isolated),str(scratch),str(O/'preview-root-link.json')])
    for name,script in [('example-build-without-embeds','example:no-embeds'),('example-tests-without-embeds','test:example')]:run(name,['npm','run',script],isolated,env)
    local=[]
    for folder in ['packages/reader-core','examples/reader-example']:
        package=json.loads((isolated/folder/'package.json').read_text())
        for dep in set(package.get('dependencies',{}))|set(package.get('devDependencies',{}))|set(package.get('peerDependencies',{})):
            p=isolated/folder/'node_modules'/dep/'package.json';assert p.exists() and p.resolve().is_relative_to(isolated)
            local.append(folder+':'+dep)
    results['declaredDependenciesLocal']=len(local)
    built=isolated/'examples/reader-example/dist';leaks=[]
    for p in built.rglob('*'):
        if p.is_file() and p.suffix in ['.html','.js','.css','.json','.md']:
            t=p.read_text()
            if any(s in t for s in [str(R),str(scratch),'/Users/','nexus-onedrive','apps/reader-demo']):leaks.append(str(p.relative_to(built)))
    assert not leaks;results['builtPrivatePathLeaks']=leaks
    results['completed']=True
except Exception as e:
    results['error']=repr(e);raise
finally:
    shutil.rmtree(scratch);results['scratchRemoved']=not scratch.exists()
    after=snapshot();dump('integrity-after.json',after);results['integrityChanged']=[p for p in before.keys()|after.keys() if before.get(p)!=after.get(p)];dump('results.json',results)
    print('scratch removed:',results['scratchRemoved'],'integrity differences:',len(results['integrityChanged']),flush=True)
