import json,threading,http.server,functools
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent
class Quiet(http.server.SimpleHTTPRequestHandler):
 def log_message(self,*args):pass
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Quiet,directory=str(out/'package-output/packaged-consumer-dist')))
threading.Thread(target=server.serve_forever,daemon=True).start();url=f'http://127.0.0.1:{server.server_port}'
results=[]
def sec(id,content='',children=None,category='Text'):
 return dict(id=id,title=id,content=content,category=category,**({'children':children} if children else {}))
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 browser=p.chromium.launch(headless=True,executable_path=str(shell))
 try:
  for layout in ['sol-jacket','sol-reading-desk','sol-open-contents','opus-title-contents','opus-search-map','opus-colour-band','invalid']:
   page=browser.new_page(viewport={'width':1440,'height':900})
   page.goto(url+'/?frontpage='+layout);page.locator('.publication-home').wait_for()
   results.append({'installedLayout':layout,'actual':page.locator('[data-front-layout]').get_attribute('data-front-layout') if page.locator('[data-front-layout]').count() else 'classic','bandBackground':page.locator('.pf-band').evaluate('(e)=>getComputedStyle(e).backgroundColor') if page.locator('.pf-band').count() else None})
   page.close()
  tree=[sec('group',children=[sec('child','child text',children=[sec('grandchild','grandchild text')])]),sec('meaningful','parent text',[sec('other-child','other text')])]
  for depth in [0,1,2,3]:
   page=browser.new_page()
   page.add_init_script('globalThis.reviewBook='+json.dumps({'id':'depth','sections':tree,'navigation':{'homeDepth':depth},'appearance':{'frontPageLayout':'opus-colour-band'}}))
   page.goto(url);page.locator('.publication-home').wait_for()
   full=page.get_by_role('button',name='Full contents',exact=True)
   if full.count():full.click()
   results.append({'depth':depth,'groupTitles':page.locator('.publication-front-group-head').all_text_contents(),'ids':page.locator('.publication-front-contents [data-section-id]').evaluate_all('es=>es.map(e=>e.dataset.sectionId)')})
   page.close()
  for last in ['group','deleted','grandchild',42]:
   page=browser.new_page()
   page.add_init_script('globalThis.reviewBook='+json.dumps({'id':'saved','sections':tree,'appearance':{'frontPageLayout':'sol-jacket'}})+';localStorage.setItem("publication-reader:saved:lastSection",'+json.dumps(json.dumps(last))+');')
   page.goto(url);page.locator('.publication-front-primary').wait_for()
   results.append({'last':last,'primary':page.locator('.publication-front-primary').inner_text()})
   page.close()
  page=browser.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.add_init_script("Storage.prototype.getItem=()=>{throw Error('blocked')};Storage.prototype.setItem=()=>{throw Error('blocked')}")
  page.goto(url);page.locator('.publication-front-primary').click();page.wait_for_timeout(200)
  results.append({'blockedStorageErrors':errors,'storageNotice':'Browser storage is unavailable' in page.content(),'url':page.url})
  page.close()
  # Real demo chapter toolbar geometry and keyboard search.
  page=browser.new_page(viewport={'width':1440,'height':900})
  page.goto('http://127.0.0.1:8773/?book=linguistics&frontpage=opus-colour-band');page.locator('.publication-front-primary').click();page.wait_for_timeout(300)
  results.append({'chapterToolbar':page.locator('.publication-toolbar-actions > button').evaluate_all("es=>es.map(e=>{let r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label'),left:r.left,right:r.right,hit:document.elementFromPoint(Math.min(innerWidth-1,r.x+r.width/2),r.y+r.height/2)?.closest('button')===e}})")})
  page.screenshot(path=str(out/'chapter-toolbar.png'))
  page.close()
 finally:
  browser.close();server.shutdown();server.server_close()
(out/'installed-browser-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
