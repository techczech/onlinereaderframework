import json,re,sys,mimetypes
from pathlib import Path
from urllib.parse import urlsplit,unquote
from playwright.sync_api import sync_playwright
E=Path(__file__).resolve().parent;S=(E/'scratch').resolve()
checks=[];requests=[];blocked=[];errors=[]
def check(name,ok,detail=None):
 checks.append(dict(name=name,passed=bool(ok),detail=detail));print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 browser=p.chromium.launch(executable_path=str(shell),headless=True)
 try:
  context=browser.new_context(service_workers='block');page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.set_default_timeout(6000)
  state={'publicAvailable':True}
  def route(r):
   u=urlsplit(r.request.url);requests.append(r.request.url)
   if u.hostname not in ['127.0.0.1','public.example.org']:
    blocked.append(r.request.url);r.abort();return
   if u.hostname=='public.example.org' and not state['publicAvailable']:
    r.fulfill(status=404,body='Public agent files have not been deployed',headers={'Access-Control-Allow-Origin':'*'});return
   rel=unquote(u.path).lstrip('/') or 'index.html'
   if rel.endswith('/'):rel+='index.html'
   dest=(S/rel).resolve()
   if not dest.is_relative_to(S) or not dest.is_file():r.fulfill(status=404,body='No fixture',headers={'Access-Control-Allow-Origin':'*'});return
   r.fulfill(content_type=mimetypes.guess_type(dest.name)[0] or 'text/plain',body=dest.read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
  context.route('**/*',route)
  def mount(a,chapter=False):
   page.evaluate('x=>mount(x.a,x.c)',{'a':a,'c':chapter});page.wait_for_timeout(80)
  def hrefs():return page.locator('.publication-agent-links a').evaluate_all('els=>els.map(e=>e.href)')
  def statuses(h):return page.evaluate('async hs=>Promise.all(hs.map(async h=>({href:h,status:(await fetch(h)).status})))',h)
  for prefix in ['/','/sub/reader/']:
   page.goto('http://127.0.0.1:18793'+prefix);site='https://public.example.org'+prefix
   for folder in ['agent','static/agent']:
    for path in [None,folder+'/', '././'+folder+'/',prefix+folder+'/','http://127.0.0.1:18793'+prefix+folder+'/']:
     if path is None and folder!='agent':continue
     a={'siteUrl':site}
     if path is not None:a['path']=path
     mount(a,True);h=hrefs();prompt=page.locator('.publication-agent-prompt p').inner_text();urls=[u.rstrip('.') for u in re.findall(r'https?://[^\s)]+',prompt)]
     st=statuses(h+urls)
     check(f'safe folder {prefix} {path!r}: local files and public chapter are 200',len(h)==3 and all(x.startswith('http://127.0.0.1:18793'+prefix+folder+'/') for x in h) and urls and all(x.startswith(site+folder+'/') for x in urls) and all(x['status']==200 for x in st),st)
   for chapter in [False,True]:
    state['publicAvailable']=False;folder='static/agent';mount({'siteUrl':site,'path':site+folder+'/'},chapter)
    h=hrefs();st=statuses(h);expected=[x.replace(site,'http://127.0.0.1:18793'+prefix,1) for x in h];controls=statuses(expected)
    check(f'canonical absolute folder {prefix} chapter={chapter}: downloads remain usable before deployment',len(h)==3 and all(x.startswith('http://127.0.0.1:18793'+prefix+folder+'/') for x in h) and all(x['status']==200 for x in st),{'actual':st,'localControl':controls,'prompt':page.locator('.publication-agent-prompt p').inner_text()})
    state['publicAvailable']=True
  page.goto('http://127.0.0.1:18793/sub/reader/')
  for path in ['%252e%252e/agent/','static/%252fagent/','static/%255cagent/','/sub/readerX/agent/','/Sub/reader/agent/','https://public.example.org.evil.example/sub/reader/agent/','java\tscript:alert(1)','data:text/html,x','static/agent?','static/agent#','https://u:p@public.example.org/sub/reader/agent/']:
   mount({'siteUrl':'https://public.example.org/sub/reader/','path':path});h=hrefs()
   check('hostile folder inspected without clicking '+repr(path),len(h)==3 and all(x.startswith('http://127.0.0.1:18793/sub/reader/agent/review-book/') for x in h),h)
  for site in ['http://0x7f000001/','http://[::ffff:172.31.255.255]/','https://localhost。/','https://ｌｏｃａｌｈｏｓｔ/','https://box.tail123.ts.net．/']:
   mount({'siteUrl':site});prompt=page.locator('.publication-agent-prompt p').inner_text()
   check('private alias never enters hosted prompt '+site,'I have attached' in prompt and 'http' not in prompt,prompt)
  check('no page exceptions or outside requests',not errors and not blocked,{'errors':errors,'blocked':blocked})
 finally:browser.close()
(E/'variants-browser-results.json').write_text(json.dumps({'checks':checks,'requests':requests,'blocked':blocked,'pageErrors':errors,'externalNetworkRequests':0,'browser':str(shell)},indent=2)+'\n')
print(f'{len(checks)} checks; {sum(not x["passed"] for x in checks)} failures');sys.exit(1 if any(not x['passed'] for x in checks) else 0)
