"""Run only this independent integration review. All generated fixtures are removed in finally."""
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
 run('packed native Node agent and demo writer boundary',['python3',str(HERE/'probe-package-integration.py')],ROOT,'package-review.log')
 exit_code=1 if any(x['exit'] for x in commands) else 0
except Exception as e:
 commands.append({'name':'review runner exception','exit':1,'error':str(e)})
finally:
 shutil.rmtree(SCRATCH,ignore_errors=False)
 hashes=json.loads((HERE/'source-hashes.json').read_text())
 changed=[p for p,h in hashes.items() if not (ROOT/p).is_file() or hashlib.sha256((ROOT/p).read_bytes()).hexdigest()!=h]
 receipt={'commands':commands,'checkedSourceFiles':len(hashes),'changedSourceFiles':changed,'scratchRemoved':not SCRATCH.exists()}
 (HERE/'final-command-exits.json').write_text(json.dumps(receipt,indent=2)+'\n')
 print('Source files changed:',changed,'; scratch removed:',receipt['scratchRemoved'],flush=True)
 if changed:exit_code=1
sys.exit(exit_code)
