import json,os,pathlib,subprocess,tarfile,sys,shutil
HERE=pathlib.Path(__file__).resolve().parent
ROOT=HERE.parents[3]
SCRATCH=HERE/'scratch/package'
if SCRATCH.exists():shutil.rmtree(SCRATCH)
SCRATCH.mkdir(parents=True,exist_ok=True)
results=[]
def run(name,args,cwd,env=None):
 p=subprocess.run(args,cwd=cwd,text=True,capture_output=True,env=env)
 output=p.stdout
 if name=='pack existing reader package' and p.returncode==0:
  metadata=json.loads(p.stdout)[0];output=json.dumps({k:metadata[k] for k in ['filename','shasum','size','entryCount']})
 result={'name':name,'command':args,'exit':p.returncode,'stdout':output,'stderr':p.stderr}
 results.append(result);print(name,'exit',p.returncode,output[-1800:],p.stderr[-800:],flush=True)
 return p
try:
 env={**os.environ,'npm_config_cache':str(SCRATCH/'npm-cache')}
 p=run('pack existing reader package',['npm','pack','--json','--pack-destination',str(SCRATCH)],ROOT/'packages/reader-core',env)
 if p.returncode:raise RuntimeError('Package pack failed')
 name=json.loads(p.stdout)[0]['filename']
 consumer=SCRATCH/'consumer';modules=consumer/'node_modules';modules.mkdir(parents=True,exist_ok=True)
 with tarfile.open(SCRATCH/name) as tf:tf.extractall(SCRATCH/'unpack',filter='data')
 (SCRATCH/'unpack/package').rename(modules/'reader-core')
 # Resolve existing dependencies without a network install or changing package manifests.
 for dep in (ROOT/'packages/reader-core/node_modules').iterdir():
  target=modules/dep.name
  if not target.exists():target.symlink_to(dep,target_is_directory=True)
 (consumer/'probe.mjs').write_text('''import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildAgentBook,buildAgentRootIndex,agentSegment} from 'reader-core/agent';
assert.equal(typeof document,'undefined');
const b={id:'a /é',title:'Public',author:'A',description:'D',sections:[{id:'x /?',title:'X',category:'C',content:'# X\\n\\nBody.'}]};
const x=buildAgentBook(b);assert.equal(x.manifest.sections.length,1);assert.ok(x.files.some(f=>f.path.endsWith('/'+agentSegment(b.sections[0].id)+'.md')));assert.equal(buildAgentRootIndex([x]).path,'llms.txt');
const css=readFileSync(new URL('./node_modules/reader-core/dist/reader.css',import.meta.url),'utf8');for(const selector of ['::highlight(publication-anchored-lead)','.publication-agent','.publication-outline-rail-toggle'])assert.ok(css.includes(selector),selector);console.log('PASS packed reader-core/agent native Node ESM import, generation and bundled integration styles');
''')
 run('packed native Node export and styles',['node','probe.mjs'],consumer)
 refused=HERE/'scratch/refused-output'
 assert not refused.exists()
 p=run('demo writer rejects non-dist output before writes',[str(ROOT/'apps/reader-demo/node_modules/.bin/tsx'),'scripts/build-agent-files.ts','--out',str(refused)],ROOT/'apps/reader-demo')
 if p.returncode==0 or refused.exists() or 'Refusing to write outside the build folder' not in p.stderr:raise RuntimeError('Writer boundary failed')
 results[-1]['expectedFailure']=True
except Exception as e:
 results.append({'name':'harness exception','exit':1,'error':str(e)})
finally:
 (HERE/'package-review-results.json').write_text(json.dumps(results,indent=2)+'\n')
sys.exit(1 if any(r['exit']!=0 and not r.get('expectedFailure') for r in results) else 0)
