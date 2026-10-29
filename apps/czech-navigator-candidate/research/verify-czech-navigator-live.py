import urllib.request,hashlib,json,concurrent.futures,pathlib
m=json.load(open('research/manifest-czech-navigator-hosting.json'))['files'];base='https://czechnavigator.dominiklukes.net/'
def check(item):
 f,h=item
 if f=='_headers':return {'file':f,'configuration':True}
 try:
  import subprocess
  b=subprocess.check_output(['curl','--fail','--silent','--show-error','--max-time','30',base+f]);headers={}
  return {'file':f,'match':hashlib.sha256(b).hexdigest()==h,'sha256':hashlib.sha256(b).hexdigest(),'headers':headers if f.endswith('.epub') or f=='index.html' else None}
 except Exception as e:return {'file':f,'error':str(e)}
with concurrent.futures.ThreadPoolExecutor(max_workers=6) as ex:r=list(ex.map(check,m.items()))
pathlib.Path('research/validation-czech-navigator-live-http-final.json').write_text(json.dumps({'base':base,'files':r},indent=2));print('matching',sum(v.get('match',False) for v in r),'of 134');print([v for v in r if 'error' in v or v.get('match')==False])
