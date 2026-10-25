import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent;root=out.parents[3]
books=json.loads((root/'apps/reader-demo/src/books/original-publications.json').read_text())
def readable(ss):
 return [s for x in ss for s in ([x] if x['content'].strip() or not x.get('children') else [])+readable(x.get('children',[]))]
a,b=books[0],books[1];aid=readable(a['sections'])[1]['id'];bid=readable(b['sections'])[1]['id']
result={}
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 browser=p.chromium.launch(headless=True,executable_path=str(shell))
 try:
  page=browser.new_page();page.goto('http://127.0.0.1:8773')
  seed={f'publication-reader:{a["id"]}:lastSection':aid,f'publication-reader:{b["id"]}:lastSection':bid,f'publication-reader:{a["id"]}:bookmarkedSections':[aid],f'publication-reader:{a["id"]}:highlights':[{'id':'review-highlight','text':'Text','sectionId':aid,'sectionTitle':'Title','date':123}],f'publication-reader:{a["id"]}:reflections':[{'id':'review-note','content':'Review note','sectionId':aid,'sectionTitle':'Title','date':123}]}
  page.evaluate('(data)=>Object.entries(data).forEach(([k,v])=>localStorage.setItem(k,JSON.stringify(v)))',seed)
  page.goto(f'http://127.0.0.1:8773/?book={a["id"]}&frontpage=sol-jacket');page.locator('.publication-front-primary-label').wait_for()
  def resume():return page.locator('.publication-front-primary-where').inner_text()
  result['initialResume']=resume()
  page.evaluate('(id)=>{history.pushState(null,"","?book="+id+"&frontpage=sol-jacket");dispatchEvent(new PopStateEvent("popstate"))}',b['id']);page.wait_for_timeout(180)
  result['switchedResume']=resume()
  page.evaluate('(id)=>{history.pushState(null,"","?book="+id+"&frontpage=opus-colour-band");dispatchEvent(new PopStateEvent("popstate"))}',a['id']);page.wait_for_timeout(180)
  result['restoredResume']=resume();result['selectedLayout']=page.locator('[data-front-layout]').get_attribute('data-front-layout')
  result['seedPreserved']=page.evaluate('(data)=>Object.entries(data).every(([k,v])=>localStorage.getItem(k)===JSON.stringify(v))',seed)
  page.go_back();page.wait_for_timeout(180);result['historyBackLayout']=page.locator('[data-front-layout]').get_attribute('data-front-layout');result['historyBackResume']=resume()
  page.go_forward();page.wait_for_timeout(180);result['historyForwardLayout']=page.locator('[data-front-layout]').get_attribute('data-front-layout')
  result['expected']={'initial':readable(a['sections'])[1]['title'],'switched':readable(b['sections'])[1]['title']}
 finally:browser.close()
(out/'state-results.json').write_text(json.dumps(result,indent=2));print(json.dumps(result,indent=2))
