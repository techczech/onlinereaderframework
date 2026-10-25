from pathlib import Path
import subprocess,json,os,shutil,hashlib,sys
E=Path(__file__).resolve().parent;R=E.parents[3];S=E/'scratch';records=[]
TSX=R/'apps/reader-demo/node_modules/.bin/tsx';PY=R.parent/'book-engine/.venv/bin/python'
def run(name,cmd):
 env={**os.environ}
 if str(cmd[0])!=str(TSX):env['TMPDIR']=str(S)
 p=subprocess.run([str(x) for x in cmd],cwd=R,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 (E/(name+'.log')).write_text(p.stdout);records.append({'name':name,'command':[str(x) for x in cmd],'cwd':str(R),'exitCode':p.returncode});(E/'command-exits.json').write_text(json.dumps(records,indent=2)+'\n');print(name,p.returncode,p.stdout[-200:],flush=True)
 return p.returncode
try:
 S.mkdir(exist_ok=False)
 assert run('fixture-generator',[TSX,E/'probe-config.mts'])==0
 assert run('api-ssr-variants',[TSX,E/'probe-config-variants.mts'])==0
 assert run('overlap-observation',[TSX,E/'probe-config-overlap.mts'])==0
 # One additional prefix exercises different preview and public directory roots.
 shutil.copytree(S/'sub/reader',S/'preview/x')
 assert run('browser-variants',[PY,E/'probe-config-variants-browser.py'])==0
 assert run('browser-independent-bytes',[PY,E/'probe-config-final-browser.py'])==0
finally:
 shutil.rmtree(S,ignore_errors=True)
 before=json.loads((E/'source-hashes-before.json').read_text());before={entry['path']:entry['digest'] for entry in before['files']} if before.get('algorithm')=='sha256' else before;after={k:hashlib.sha256((R/k).read_bytes()).hexdigest() if (R/k).is_file() else None for k in before};(E/'source-hashes-after.json').write_text(json.dumps(after,indent=2)+'\n');mismatch=[k for k in before if before[k]!=after[k]]
 (E/'cleanup-and-integrity.json').write_text(json.dumps({'scratchRemoved':not S.exists(),'snapshottedFiles':len(before),'changedFiles':mismatch},indent=2)+'\n');print('scratch removed',not S.exists(),'changed files',mismatch,flush=True)
 if mismatch:sys.exit(2)
