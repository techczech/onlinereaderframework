"""Copy of ../evidence-review-integration/run-review-integration.py (2026-10-25 repair round). Logic unchanged except: the probes live in, and write their results to, this folder (so the earlier review files are not overwritten), the extra contrast probe is added, and the end-of-run source check records the current production hashes instead of comparing them with the pre-repair snapshot. Fixtures are removed in finally."""
import hashlib,json,pathlib,shutil,subprocess,sys
HERE=pathlib.Path(__file__).resolve().parent
ROOT=HERE.parents[3]
SCRATCH=HERE/'scratch'
commands=[]
def run(name,args,cwd,log):
 with (HERE/log).open('w') as stream:p=subprocess.run(args,cwd=cwd,stdout=stream,stderr=subprocess.STDOUT)
 commands.append({'name':name,'command':args,'cwd':str(cwd),'exit':p.returncode,'log':log})
 print(name,'exit',p.returncode,flush=True)
 return p.returncode
exit_code=1
try:
 SCRATCH.mkdir(exist_ok=True)
 if run('actual Vite /sub/ build',[str(ROOT/'apps/reader-demo/node_modules/.bin/vite'),'build','--base=/sub/','--outDir='+str(SCRATCH/'sub'),'--emptyOutDir'],ROOT/'apps/reader-demo','subpath-build.log'):raise RuntimeError('Isolated Vite build failed')
 run('source export adversarial probe',[str(ROOT/'apps/reader-demo/node_modules/.bin/tsx'),str(HERE/'probe-agent-integration.mts')],ROOT,'agent-review.log')
 if run('source browser fixture',['node',str(HERE/'build-browser-fixture.mjs')],ROOT,'browser-fixture-build.log'):raise RuntimeError('Browser fixture build failed')
 run('targeted browser integration',[str(ROOT.parent/'book-engine/.venv/bin/python'),str(HERE/'probe-browser-integration.py')],ROOT,'browser-review.log')
 run('extra contrast probe: custom colours, inline kinds and Off cleanup',[str(ROOT.parent/'book-engine/.venv/bin/python'),str(HERE/'probe-contrast-extra.py')],ROOT,'contrast-extra.log')
 run('packed native Node agent and demo writer boundary',['python3',str(HERE/'probe-package-integration.py')],ROOT,'package-review.log')
 exit_code=1 if any(x['exit'] for x in commands) else 0
except Exception as e:
 commands.append({'name':'review runner exception','exit':1,'error':str(e)})
finally:
 shutil.rmtree(SCRATCH,ignore_errors=False)
 prior=json.loads((HERE.parent/'evidence-review-integration/source-hashes.json').read_text())
 hashes={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest() for p in prior if (ROOT/p).is_file()}
 (HERE/'source-hashes-after-repair.json').write_text(json.dumps(hashes,indent=1)+'\n')
 changed=[p for p,h in prior.items() if not (ROOT/p).is_file() or hashes.get(p)!=h]
 receipt={'commands':commands,'checkedSourceFiles':len(hashes),'filesDifferingFromPreRepairSnapshot':changed,'scratchRemoved':not SCRATCH.exists()}
 (HERE/'final-command-exits.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print('Production files that differ from the pre-repair review snapshot (expected: the repaired files):',changed,flush=True)
sys.exit(exit_code)
