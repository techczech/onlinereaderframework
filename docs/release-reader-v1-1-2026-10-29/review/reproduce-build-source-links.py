from pathlib import Path
import tempfile,shutil,json,subprocess,tarfile,os
R=Path(__file__).resolve().parents[3];O=Path(__file__).parent;S=Path(tempfile.mkdtemp(prefix='review-build-links-',dir=R/'build'));results={'commands':[]}
def run(name,args,cwd):
 q=subprocess.run(args,cwd=cwd,env=(os.environ.copy() if name=='build-links-cache' else env),stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True,timeout=180);(O/(name+'.log')).write_text(q.stdout.replace(str(R),'[reader-repository]')+'\nEXIT '+str(q.returncode)+'\n');results['commands'].append({'name':name,'exit':q.returncode});assert q.returncode==0,name
try:
 with tarfile.open(R/'build/reader-source-release.tar.gz') as tf:tf.extractall(S,filter='data')
 C=S/'public-reader-source';cache=S/'npm-cache';env=os.environ.copy();env.update(npm_config_cache=str(cache),npm_config_offline='true',npm_config_audit='false',npm_config_fund='false')
 source=(R/'scripts/prepare-reader-source-release.mjs').read_text();helper=source[:source.index('\nselfTest();')]+'\n'+source[source.index('function seedOfflineCache('):source.index('function materialise(')]+'\nexport {seedOfflineCache};\n';helper=helper.replace("const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');",'const root = '+json.dumps(str(R))+';').replace('const args = new Set(process.argv.slice(2));','const args = new Set();');(S/'helper.mjs').write_text(helper)
 seed="import {seedOfflineCache} from './helper.mjs';import {readFileSync} from 'node:fs';for(const f of ['packages/reader-core','examples/reader-example'])seedOfflineCache(process.argv[3],JSON.parse(readFileSync(process.argv[2]+'/'+f+'/package-lock.json')));";(S/'seed.mjs').write_text(seed)
 run('build-links-cache',['node',str(S/'seed.mjs'),str(C),str(cache)],R);run('build-links-setup',['npm','run','setup'],C);run('build-links-core',['npm','run','build'],C)
 E=C/'examples/reader-example';original=(E/'embeds/line-spacing.html').read_text();outside=S/'outside-source';outside.mkdir();canary=outside/'line-spacing.html';canary.write_text(original.replace('</body>','<p>OUTSIDE_EMBED_SOURCE_CANARY</p></body>'))
 # A leaf link at the known filename imports source from outside the example folder.
 (E/'embeds/line-spacing.html').unlink();(E/'embeds/line-spacing.html').symlink_to(canary)
 run('build-linked-embed-leaf',['npm','run','example'],C);results['linkedLeafCopied']='OUTSIDE_EMBED_SOURCE_CANARY' in (E/'dist/embeds/line-spacing.html').read_text();assert results['linkedLeafCopied']
 (E/'embeds/line-spacing.html').unlink();(E/'embeds').rmdir();(E/'embeds').symlink_to(outside,target_is_directory=True)
 run('build-linked-embed-directory',['npm','run','example'],C);results['linkedDirectoryCopied']='OUTSIDE_EMBED_SOURCE_CANARY' in (E/'dist/embeds/line-spacing.html').read_text();assert results['linkedDirectoryCopied']
finally:
 shutil.rmtree(S);results['scratchRemoved']=not S.exists();(O/'build-source-links.json').write_text(json.dumps(results,indent=2)+'\n');print(json.dumps(results))
