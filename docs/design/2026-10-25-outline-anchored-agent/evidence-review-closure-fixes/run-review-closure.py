import json,pathlib,subprocess,sys,shutil
HERE=pathlib.Path(__file__).resolve().parent;ROOT=HERE.parents[3];SCRATCH=HERE/'scratch';commands=[]
SCRATCH.mkdir(exist_ok=True)
def run(name,args,cwd):
 with (HERE/(name+'.log')).open('w') as log:p=subprocess.run(args,cwd=cwd,stdout=log,stderr=subprocess.STDOUT)
 commands.append(dict(name=name,command=args,cwd=str(cwd),exit=p.returncode));(HERE/'command-exits.json').write_text(json.dumps(commands,indent=2)+'\n');print(name,p.returncode,flush=True)
 return p.returncode
try:
 run('agent-unit',['node','src/agent-export/test-agent-export.mjs'],ROOT/'packages/reader-core')
 run('subpath-build',[str(ROOT/'apps/reader-demo/node_modules/.bin/vite'),'build','--base=/sub/','--outDir='+str(SCRATCH/'sub'),'--emptyOutDir'],ROOT/'apps/reader-demo')
 run('agent-integration',[str(ROOT/'apps/reader-demo/node_modules/.bin/tsx'),str(HERE/'probe-agent-integration.mts')],ROOT)
 run('browser-fixture',['node',str(HERE/'build-browser-fixture.mjs')],ROOT)
 run('browser-integration',[str(ROOT.parent/'book-engine/.venv/bin/python'),str(HERE/'probe-browser-integration.py')],ROOT)
 run('contrast-extra',[str(ROOT.parent/'book-engine/.venv/bin/python'),str(HERE/'probe-contrast-extra.py')],ROOT)
 run('package-integration',['python3',str(HERE/'probe-package-integration.py')],ROOT)
 run('closure-variants',[str(ROOT/'apps/reader-demo/node_modules/.bin/tsx'),str(HERE/'probe-closure-variants.mts')],ROOT)
 run('contrast-boundary',[str(ROOT.parent/'book-engine/.venv/bin/python'),str(HERE/'probe-contrast-boundary.py')],ROOT)
 run('highlight-coexistence',[str(ROOT.parent/'book-engine/.venv/bin/python'),str(HERE/'probe-highlight-coexistence.py')],ROOT)
finally:
 shutil.rmtree(SCRATCH,ignore_errors=False)
 print('scratch removed',flush=True)
sys.exit(1 if any(c['exit'] for c in commands) else 0)
