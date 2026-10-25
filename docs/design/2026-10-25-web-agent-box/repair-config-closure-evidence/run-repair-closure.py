"""Red/green runner for the canonical-folder repair. Usage: python run-repair-closure.py <phase>. Runs the reviewer's byte-identical probes (copied here, so
their fixed-name outputs land in this folder and are renamed with the phase) and this repair's own fixture + browser acceptance. All scratch lives in
./scratch and is removed in the finally step. Logs: <name>-<phase>.log; exits: command-exits-<phase>.json."""
from pathlib import Path
import subprocess, json, os, shutil, sys
R=Path(__file__).resolve().parents[4]; E=Path(__file__).resolve().parent; S=E/'scratch'; phase=sys.argv[1]
PY='/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/book-engine/.venv/bin/python'; TSX=str(R/'apps/reader-demo/node_modules/.bin/tsx')
records=[]
def run(name,command,cwd=R):
 # tsx opens an IPC socket in TMPDIR; under ./scratch the socket path exceeds the macOS 104-byte limit, so tsx keeps the system TMPDIR for that socket only.
 env={**os.environ} if command[0]==TSX else {**os.environ,'TMPDIR':str(S)}
 if name=='focused-unit':env['AGENT_EXPORT_TEST_ROOT']=str(S/'compiled')
 if name=='focused-unit-pre-repair-source':env['AGENT_EXPORT_TEST_ROOT']=str(S/'compiled-before')
 p=subprocess.run(command,cwd=cwd,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 (E/f'{name}-{phase}.log').write_text(p.stdout)
 records.append(dict(name=name,command=command,cwd=str(cwd),exitCode=p.returncode))
 (E/f'command-exits-{phase}.json').write_text(json.dumps(records,indent=2)+'\n')
 print(name,p.returncode,p.stdout.strip().splitlines()[-1:] ,flush=True)
 return p
def keep(output):
 if (E/output).exists():(E/output).rename(E/output.replace('.json',f'-{phase}.json'))
try:
 S.mkdir(parents=True,exist_ok=False)
 (S/'node_modules').symlink_to(R/'packages/reader-core/node_modules',target_is_directory=True)
 (S/'package.json').write_text('{"type":"module"}')
 c=run('focused-unit-compile',['node','node_modules/typescript/bin/tsc','src/agent-export/index.ts','src/agent-export/agent-location.ts','src/original/publication-model.ts','src/original/reading-support/anchored-reading.ts','--rootDir','src','--outDir',str(S/'compiled'),'--target','ES2020','--module','NodeNext','--moduleResolution','NodeNext','--strict','--skipLibCheck','--esModuleInterop','--declaration','false'],R/'packages/reader-core')
 if c.returncode==0:run('focused-unit',['node','--test',str(R/'packages/reader-core/src/agent-export/agent-export.test.mjs')])
 # The same (current) unit tests against the hash-verified pre-repair agent-location.ts, compiled from a scratch copy of src: shows the new tests are red there.
 B=S/'before';shutil.copytree(R/'packages/reader-core/src',B/'src',ignore=shutil.ignore_patterns('.test-build-*'));(B/'node_modules').symlink_to(R/'packages/reader-core/node_modules',target_is_directory=True)
 (B/'src/agent-export/agent-location.ts').write_text((E/'agent-location.before-repair.ts.txt').read_text())
 c=run('focused-unit-compile-pre-repair-source',['node',str(R/'packages/reader-core/node_modules/typescript/bin/tsc'),'src/agent-export/index.ts','src/agent-export/agent-location.ts','src/original/publication-model.ts','src/original/reading-support/anchored-reading.ts','--rootDir','src','--outDir',str(S/'compiled-before'),'--target','ES2020','--module','NodeNext','--moduleResolution','NodeNext','--strict','--skipLibCheck','--esModuleInterop','--declaration','false'],B)
 if c.returncode==0:run('focused-unit-pre-repair-source',['node','--test',str(R/'packages/reader-core/src/agent-export/agent-export.test.mjs')])
 run('original-generator-probe',[TSX,str(E/'probe-config.mts')]);keep('generator-results.json')
 run('independent-api-variants',[TSX,str(E/'probe-config-variants.mts')]);keep('variants-results.json')
 run('original-browser',[PY,str(E/'probe-config-browser.py')]);keep('browser-results.json')
 run('independent-browser',[PY,str(E/'probe-config-variants-browser.py')]);keep('variants-browser-results.json')
 run('canonical-fixture',[TSX,str(E/'build-canonical-fixture.mts')])
 run('accept-canonical-browser',[PY,str(E/'accept-canonical-folder-browser.py'),phase])
 run('ssr-source-check',[TSX,'scripts/check-agent-access-ssr.tsx'],R/'apps/reader-demo')
finally:
 shutil.rmtree(S,ignore_errors=True)
 print('scratch removed',not S.exists())
