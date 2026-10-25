from pathlib import Path
import subprocess, json, os
R=Path(__file__).resolve().parents[4]; E=Path(__file__).resolve().parent; S=E/'scratch'
S.mkdir(parents=True,exist_ok=True)
records=[]
def run(name,command,cwd=R,env=None):
 p=subprocess.run(command,cwd=cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 (E/(name+'.log')).write_text(p.stdout)
 records.append(dict(name=name,command=command,cwd=str(cwd),exitCode=p.returncode))
 (E/'command-exits.json').write_text(json.dumps(records,indent=2)+'\n')
 print(name,p.returncode,flush=True)
 return p
(S/'node_modules').symlink_to(R/'packages/reader-core/node_modules',target_is_directory=True)
(S/'package.json').write_text('{"type":"module"}')
compiled=S/'compiled'
r=run('focused-unit-compile',['node','node_modules/typescript/bin/tsc','src/agent-export/index.ts','src/agent-export/agent-location.ts','src/original/publication-model.ts','src/original/reading-support/anchored-reading.ts','--rootDir','src','--outDir',str(compiled),'--target','ES2020','--module','NodeNext','--moduleResolution','NodeNext','--strict','--skipLibCheck','--esModuleInterop','--declaration','false'],R/'packages/reader-core')
if r.returncode==0:
 run('focused-unit',['node','--test',str(R/'packages/reader-core/src/agent-export/agent-export.test.mjs')],env={**os.environ,'AGENT_EXPORT_TEST_ROOT':str(compiled)})
run('original-generator-probe',[str(R/'apps/reader-demo/node_modules/.bin/tsx'),str(E/'probe-config.mts')],env={**os.environ,'TMPDIR':str(S)})
run('ssr-source-check',[str(R/'apps/reader-demo/node_modules/.bin/tsx'),'scripts/check-agent-access-ssr.tsx'],R/'apps/reader-demo',env={**os.environ,'TMPDIR':str(S)})
