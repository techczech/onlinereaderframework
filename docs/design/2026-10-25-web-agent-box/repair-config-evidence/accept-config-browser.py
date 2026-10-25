"""Browser acceptance beyond the reviewer's probe: more adversarial site addresses and folders, on a private preview and on a public page, at /sub/reader/.
Needs the fixture written by probe-config.mts (scratch/). Bundled Playwright chrome-headless-shell, never system Chrome; every request is intercepted and
fulfilled from scratch/ or refused, so no host is contacted. Run from the repository root with the book-engine venv Python."""
import json,re,sys
from pathlib import Path
from urllib.parse import urlsplit,unquote
import mimetypes
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent; SCRATCH=(HERE/'scratch').resolve()
checks=[]; requests=[]
def check(name,ok,detail=None):
 checks.append(dict(name=name,passed=bool(ok),detail=detail)); print(('PASS ' if ok else 'FAIL ')+name,flush=True)
SITES=['http://[::ffff:10.0.0.1]/','http://[::ffff:192.168.1.1]/','http://[::ffff:172.16.0.1]/','http://[::ffff:7f00:1]/','http://[64:ff9b::10.0.0.1]/','http://127.1/','http://2130706433/',
 'https://box.local./','https://printer.home.arpa/','https:example.org/sub/','https://example.org/sub/%2e%2e/x/','https://example.org./','https://u:p@public.example.org/sub/reader/']
FOLDERS=['javascript:alert(1)','JAVASCRIPT:alert(1)','java\tscript:alert(1)','data:text/html,x','vbscript:x','blob:https://public.example.org/x','https://evil.example/agent/','//evil.example/agent/',
 '/agent/','/sub/agent/','%2E%2E/agent/','.%2e/agent/','..\\agent\\','static\\agent\\','agent/?x=1','agent/#x','https://u:p@public.example.org/sub/reader/agent/']
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 browser=p.chromium.launch(executable_path=str(shell),headless=True)
 try:
  page=browser.new_context().new_page(); page.set_default_timeout(6000)
  def route(r):
   url=urlsplit(r.request.url); requests.append(r.request.url)
   if url.hostname not in ['127.0.0.1','public.example.org']: r.abort(); return
   rel=unquote(url.path).lstrip('/') or 'index.html'
   if rel.endswith('/'): rel+='index.html'
   target=(SCRATCH/rel).resolve()
   if not target.is_relative_to(SCRATCH) or not target.is_file(): r.fulfill(status=404,body='Not generated'); return
   r.fulfill(content_type=mimetypes.guess_type(target.name)[0] or 'text/plain',body=target.read_bytes(),headers={'Access-Control-Allow-Origin':'*'})
  page.route('**/*',route)
  mount=lambda access,chapter=False:(page.evaluate('x=>mount(x.a,x.c)',{'a':access,'c':chapter}),page.wait_for_timeout(70))
  hrefs=lambda:page.locator('[data-publication-agent] a').evaluate_all('els=>els.map(e=>e.getAttribute("href")+" -> "+e.href)')
  prompt=lambda:page.locator('.publication-agent-prompt p').inner_text()
  page.goto('http://127.0.0.1:18793/sub/reader/')
  for site in SITES:
   mount({'siteUrl':site,'path':'static/agent/'})
   t=prompt(); h=hrefs()
   check(f'private preview, siteUrl {site!r}: attachment prompt, no address in it, local custom-folder downloads','I have attached' in t and not re.search(r'https?:|127\.0|10\.0|192\.168|\.local|home\.arpa|evil',t) and h and all(x.endswith('http://127.0.0.1:18793/sub/reader/static/agent/review-book/'+x.split('/review-book/')[-1]) for x in h),{'prompt':t,'hrefs':h})
  for origin in ['http://127.0.0.1:18793','https://public.example.org']:
   page.goto(origin+'/sub/reader/')
   for folder in FOLDERS:
    mount({'siteUrl':'https://public.example.org/sub/reader/','path':folder},True)
    h=hrefs(); t=prompt()
    ok=h and all(x.split(' -> ')[1].startswith(origin+'/sub/reader/agent/review-book/') for x in h) and not any(re.match(r'\s*(javascript|data|vbscript|blob|file):',x,re.I) for x in h)
    check(f'{origin}: folder {folder!r} ignored for agent/; links stay under the served prefix; prompt names the public agent/ folder',ok and 'https://public.example.org/sub/reader/agent/review-book/chapters/' in t,{'hrefs':h})
  page.goto('http://127.0.0.1:18793/sub/reader/')
  mount({'siteUrl':'https://public.example.org/sub/reader/','path':'https://public.example.org/sub/reader/static/agent/'},True)
  h=[x.split(' -> ')[1] for x in hrefs()]; t=prompt()
  urls=[u.rstrip('.') for u in re.findall(r'https?://[^\s)]+',t)]
  st=page.evaluate('async l=>Promise.all(l.map(async h=>(await fetch(h)).status))',h+urls)
  check('private preview, folder given as an address under siteUrl: downloads and prompt use that folder and all return 200',all(x.startswith('https://public.example.org/sub/reader/static/agent/') for x in h+urls) and all(s==200 for s in st),{'hrefs':h,'prompt':urls,'status':st})
 finally: browser.close()
external=[u for u in requests if urlsplit(u).hostname not in ['127.0.0.1','public.example.org']]
(HERE/'accept-config-browser-results.json').write_text(json.dumps({'checks':checks,'refusedExternalRequests':external,'browser':str(shell)},indent=2)+'\n')
print(f'{len(checks)} checks; {sum(not c["passed"] for c in checks)} failures; {len(external)} external requests refused')
sys.exit(1 if any(not c['passed'] for c in checks) else 0)
