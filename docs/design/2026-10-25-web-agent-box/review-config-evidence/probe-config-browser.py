import json,re,sys,traceback,mimetypes
from pathlib import Path
from urllib.parse import urlsplit,unquote
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent
checks=[]; observations=[]; requests=[]
def check(name,ok,detail=None):
 checks.append(dict(name=name,passed=bool(ok),detail=detail)); print(('PASS ' if ok else 'FAIL ')+name+' '+json.dumps(detail),flush=True)
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 browser=p.chromium.launch(executable_path=str(shell),headless=True)
 try:
  context=browser.new_context();page=context.new_page();page.set_default_timeout(6000)
  state={'directory':'agent'}
  def route(r):
   url=urlsplit(r.request.url);requests.append(r.request.url)
   if url.hostname not in ['127.0.0.1','public.example.org']:
    r.abort();return
   rel=unquote(url.path).lstrip('/') or 'index.html'
   if rel.endswith('/'):rel+='index.html'
   base='sub/reader/' if rel.startswith('sub/reader/') else ''
   if url.hostname=='public.example.org' and state['directory']=='static/agent' and rel[len(base):].startswith('agent/'):
    r.fulfill(status=404,body='Not generated under this directory',headers={'Access-Control-Allow-Origin':'*'});return
   target=(HERE/'scratch'/rel).resolve()
   if not target.is_relative_to((HERE/'scratch').resolve()) or not target.is_file():
    r.fulfill(status=404,body='Not generated',headers={'Access-Control-Allow-Origin':'*'});return
   r.fulfill(content_type=mimetypes.guess_type(target.name)[0] or 'text/plain',body=target.read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
  page.route('**/*',route)
  for prefix in ['/','/sub/reader/']:
   page.goto('http://127.0.0.1:18793'+prefix)
   for directory in ['agent','static/agent']:
    state['directory']=directory
    for style in ['relative','absolute-prefix','absolute-url']:
     path=directory+'/' if style=='relative' else (('http://127.0.0.1:18793' if style=='absolute-url' else '')+prefix+directory+'/')
     site='https://public.example.org'+prefix
     for chapter in [False,True]:
      tag=f'{prefix} {directory} {style} chapter={chapter}'
      page.evaluate('x=>mount(x.access,x.chapter)',{'access':{'siteUrl':site,'path':path},'chapter':chapter})
      page.wait_for_timeout(70)
      prompt=page.locator('.publication-agent-prompt p').inner_text()
      urls=[u.rstrip('.') for u in re.findall(r'https?://[^\s)]+',prompt)]
      links=page.locator('.publication-agent-links a').evaluate_all('(els)=>els.map(e=>e.href)')
      local=page.evaluate('async links=>Promise.all(links.map(async href=>({href,status:(await fetch(href)).status})))',links)
      public=page.evaluate('async links=>Promise.all(links.map(async href=>({href,status:(await fetch(href)).status})))',urls)
      observation={'tag':tag,'prompt':prompt,'downloads':local,'promptFetches':public}; observations.append(observation)
      check(tag+' local download/index/manifest resolve under served prefix',all(x['status']==200 and x['href'].startswith('http://127.0.0.1:18793'+prefix+directory+'/') for x in local),local)
      check(tag+' public prompt matches generated directory and resolves',all(x['status']==200 and x['href'].startswith(site+directory+'/') for x in public),public)
      check(tag+' prompt contains no private preview host','127.0.0.1' not in prompt)
  page.goto('http://127.0.0.1:18793/sub/reader/')
  state['directory']='agent'
  invalid=['nonsense','javascript:alert(1)','https://u:p@example.org/sub/','https://example.org/sub/?x=1','https://example.org/sub/#frag','http://127.0.0.1:8773/','http://100.85.55.122:8773/','http://[::ffff:127.0.0.1]/','https://localhost./','https://box.tail123.ts.net./']
  for site in invalid:
   page.evaluate('site=>mount({siteUrl:site,path:"agent/"})',site);page.wait_for_timeout(70)
   text=page.locator('[data-publication-agent]').inner_text();prompt=page.locator('.publication-agent-prompt p').inner_text()
   check('private preview ignores invalid/private canonical '+site,'I have attached' in prompt and 'Download the book' in text and 'http' not in prompt,{'prompt':prompt})
  page.evaluate('()=>mount({path:"agent/"})');page.wait_for_timeout(70)
  check('unconfigured private preview uses attachment prompt without network explanation','I have attached' in page.locator('.publication-agent-prompt p').inner_text() and not re.search('Tailscale|private address|hosted at',page.locator('[data-publication-agent]').inner_text(),re.I))
  page.evaluate("()=>{window.copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});document.execCommand=cmd=>{window.copied=document.querySelector('textarea').value;return cmd==='copy'};}")
  button=page.locator('.publication-agent-prompt button');button.click();page.wait_for_timeout(70)
  check('HTTP clipboard fallback copies attachment prompt and returns focus',page.evaluate('window.copied')==page.locator('.publication-agent-prompt p').inner_text() and button.evaluate('e=>document.activeElement===e'))
  page.goto('https://public.example.org/sub/reader/')
  page.evaluate('()=>mount({siteUrl:"nonsense",path:"agent/"})');page.wait_for_timeout(70)
  check('invalid canonical on public host falls back to public served prefix','https://public.example.org/sub/reader/agent/review-book/index.md' in page.locator('.publication-agent-prompt p').inner_text())
  for path in ['javascript:alert(1);void(0)//x','../agent/','%2e%2e/agent/']:
   page.evaluate('path=>mount({siteUrl:"https://public.example.org/sub/reader/",path})',path);page.wait_for_timeout(70)
   hrefs=page.locator('.publication-agent-links a').evaluate_all('(els)=>els.map(e=>e.href)')
   check('configured resource path remains http(s) and inside public served prefix '+path,all(h.startswith('https://public.example.org/sub/reader/') for h in hrefs),{'hrefs':hrefs})
  context.close()
 finally:browser.close()
(HERE/'browser-results.json').write_text(json.dumps({'checks':checks,'observations':observations,'requests':requests,'externalNetworkRequests':0,'browser':str(shell)},indent=2)+'\n')
print(f'{len(checks)} checks; {sum(not c["passed"] for c in checks)} failures')
sys.exit(1 if any(not c['passed'] for c in checks) else 0)
