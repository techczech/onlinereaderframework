from pathlib import Path
import json,subprocess,os,hashlib,shutil
R=Path(__file__).resolve().parents[4];E=Path(__file__).resolve().parent;S=E/'scratch';M=S/'cli-mirror';A=M/'apps/reader-demo'
(A/'scripts').mkdir(parents=True);(M/'packages').mkdir();(M/'packages/reader-core').symlink_to(R/'packages/reader-core',target_is_directory=True)
(A/'src').symlink_to(R/'apps/reader-demo/src',target_is_directory=True);(A/'node_modules').symlink_to(R/'apps/reader-demo/node_modules',target_is_directory=True)
source=R/'apps/reader-demo/scripts/build-agent-files.ts';copy=A/'scripts/build-agent-files.ts';shutil.copy2(source,copy)
(A/'package.json').write_text('{"type":"module"}')
base={**os.environ,'TMPDIR':str(S)};base.pop('READER_SITE_URL',None)
records=[];checks=[]
def invoke(label,value=None,args=[]):
 env={**base}
 if value is not None:env['READER_SITE_URL']=value
 command=[str(R/'apps/reader-demo/node_modules/.bin/tsx'),str(copy),*args]
 p=subprocess.run(command,cwd=R,env=env,stdout=subprocess.PIPE,stderr=subprocess.STDOUT,text=True)
 (E/(label+'.log')).write_text(p.stdout)
 records.append(dict(name=label,command=command,READER_SITE_URL=value,exitCode=p.returncode,outputExists=(A/'dist').exists()))
 return p
p=invoke('canonical-isolated',args=['--canonical'])
files=[f for f in (A/'dist').rglob('*') if f.is_file()];roots=(A/'dist/llms.txt').read_text()
origins={'deliberate-practice':'https://deliberatepractice.dominiklukes.net/','language-muscle':'https://buildingyourlanguagemuscle.edutools.fyi/','linguistics':'https://linguistics.dominiklukes.net/'}
checks.append(dict(name='canonical CLI 305 files',passed=p.returncode==0 and len(files)==305,files=len(files)))
for book,origin in origins.items():
 manifest=json.loads((A/'dist/agent'/book/'manifest.json').read_text())
 checks.append(dict(name=book+' own origin',passed=manifest['links']['index']==origin+'agent/'+book+'/index.md' and origin+'agent/'+book+'/full.md' in roots,links=manifest['links']))
shutil.rmtree(A/'dist')
for n,value in enumerate(['https://u:p@example.org/sub/','https:example.org/sub/','https://example.org/sub/?','https://example.org/sub/#','https://example.org/sub/%2e%2e/x/','http://[::ffff:192.168.1.1]/','https://localhost。/','https://example.org./']):
 p=invoke('bad-env-'+str(n),value)
 checks.append(dict(name='invalid env before output '+str(n),passed=p.returncode!=0 and not (A/'dist').exists() and value not in p.stdout and 'u:p' not in p.stdout))
p=invoke('valid-env','https://public.example.org/Sub/Reader/')
checks.append(dict(name='valid environment fallback',passed=p.returncode==0 and len([f for f in (A/'dist').rglob('*') if f.is_file()])==305 and 'https://public.example.org/Sub/Reader/agent/' in (A/'dist/llms.txt').read_text()))
(E/'cli-results.json').write_text(json.dumps(dict(checks=checks,commands=records,sourceSha256=hashlib.sha256(source.read_bytes()).hexdigest(),copySha256=hashlib.sha256(copy.read_bytes()).hexdigest(),rootIndex=roots),indent=2)+'\n')
a=json.loads((E/'command-exits.json').read_text());a.extend(records);(E/'command-exits.json').write_text(json.dumps(a,indent=2)+'\n')
print(json.dumps(checks,indent=2));raise SystemExit(1 if any(not x['passed'] for x in checks) else 0)
