import json,os,signal,subprocess,tempfile,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[3]
OUT=Path(__file__).resolve().parent
checks=[('units',['npm','test'],60),('read-aloud',['node','packages/reader-core/src/original/read-aloud/test-read-aloud-browser.mjs'],45),('assist',['node','packages/reader-core/src/original/reading-support/test-assist-width-browser.mjs'],45),('navigation-fixture',['node','packages/reader-core/src/original/test-navigation-fixture-browser.mjs'],45),('navigation-books',['node','packages/reader-core/src/original/test-navigation-books-browser.mjs'],45),('recorded-toolbar',['node','packages/reader-core/src/original/toolbar/test-toolbar-recorded-browser.mjs'],45),('recorded-isolated-unmodified',['node','packages/reader-core/src/original/listening/test-reader-listening-headless.mjs'],45)]
results=[]
with tempfile.TemporaryDirectory(prefix='.review-scratch-',dir=OUT) as scratch:
 for name,cmd,limit in checks:
  start=time.monotonic()
  with (OUT/('evidence-review-'+name+'.txt')).open('w') as log:
   proc=subprocess.Popen(cmd,cwd=ROOT,stdout=log,stderr=subprocess.STDOUT,env={**os.environ,'TMPDIR':scratch,'TMP':scratch,'TEMP':scratch},start_new_session=True)
   try: code=proc.wait(timeout=limit);timed=False
   except subprocess.TimeoutExpired:
    os.killpg(proc.pid,signal.SIGTERM)
    try:proc.wait(timeout=3)
    except subprocess.TimeoutExpired:os.killpg(proc.pid,signal.SIGKILL);proc.wait()
    code=124;timed=True
  result={'name':name,'command':cmd,'exit':code,'timedOut':timed,'seconds':round(time.monotonic()-start,2)}
  results.append(result);print(json.dumps(result),flush=True)
  (OUT/'evidence-review-checks.json').write_text(json.dumps(results,indent=2)+'\n')
