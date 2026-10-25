import json,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).resolve().parent
results=[]
with sync_playwright() as p,tempfile.TemporaryDirectory(prefix='scratch-notes-',dir=out) as scratch:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 browser=p.chromium.launch_persistent_context(scratch,headless=True,executable_path=str(shell))
 try:
  page=browser.new_page()
  for width in (1440,390):
   page.set_viewport_size({'width':width,'height':900});page.goto('http://127.0.0.1:8773/?book=linguistics&frontpage=opus-colour-band');page.locator('[data-front-layout]').wait_for()
   page.locator('.publication-front-depth button',has_text='Full contents').click()
   sid=page.locator('.publication-front [data-section-id]').first.get_attribute('data-section-id')
   seed={'publication-reader:linguistics:highlights':[{'id':'closure-h','text':'Closure highlight','sectionId':sid,'sectionTitle':'Title','date':123}],'publication-reader:linguistics:reflections':[{'id':'closure-r','content':'Closure reflection','sectionId':sid,'sectionTitle':'Title','date':123}]}
   page.evaluate('s=>{for(const[k,v]of Object.entries(s))localStorage.setItem(k,JSON.stringify(v))}',seed);page.reload();page.locator('[data-front-layout]').wait_for()
   before=page.evaluate('s=>Object.fromEntries(Object.keys(s).map(k=>[k,localStorage.getItem(k)]))',seed)
   page.locator('.publication-toolbar-notes').click();page.wait_for_timeout(200)
   body=page.inner_text('body');page.get_by_role('button',name='Reflections',exact=True).click();page.wait_for_timeout(100);body+='\n'+page.inner_text('body')
   row={'width':width,'home':page.locator('[data-front-layout]').count()==1,'highlight':'Closure highlight' in body,'reflection':'Closure reflection' in body,'drawerText':body[-1800:]}
   row['storedUnchanged']=before==page.evaluate('s=>Object.fromEntries(Object.keys(s).map(k=>[k,localStorage.getItem(k)]))',seed)
   results.append(row)
 finally:browser.close()
(out/'results-notes-closure.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
assert all(r['highlight'] and r['reflection'] and r['home'] and r['storedUnchanged'] for r in results)
