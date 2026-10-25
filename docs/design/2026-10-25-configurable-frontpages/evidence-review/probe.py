import json
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).parent
results=[]
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 browser=p.chromium.launch(headless=True,executable_path=str(shells[-1]))
 try:
  page=browser.new_page(viewport={'width':1440,'height':900})
  for book in ['linguistics','deliberate-practice','language-muscle']:
   page.goto(f'http://127.0.0.1:8773/?book={book}&frontpage=opus-colour-band')
   page.locator('[data-front-layout]').wait_for()
   page.wait_for_timeout(400)
   tools=page.locator('.publication-toolbar-actions > button').evaluate_all("es=>es.map(e=>{const r=e.getBoundingClientRect();return {text:e.innerText,label:e.getAttribute('aria-label'),x:r.x,right:r.right,w:r.width,hit:document.elementFromPoint(Math.min(innerWidth-1,r.x+r.width/2),r.y+r.height/2)?.closest('button')===e}})")
   results.append({'book':book,'toolbar':tools})
  for width in [1440,390]:
   page.set_viewport_size({'width':width,'height':900})
   page.goto('http://127.0.0.1:8773/?book=linguistics&frontpage=opus-colour-band')
   page.locator('[data-front-layout]').wait_for()
   btn=page.locator('.publication-front-secondary',has_text='Search').first
   btn.focus();page.keyboard.press('Enter');page.wait_for_timeout(600)
   results.append({'width':width,'searchFocus':page.evaluate('({tag:document.activeElement.tagName,cls:document.activeElement.className,text:document.activeElement.textContent,placeholder:document.activeElement.getAttribute("placeholder")})')})
  page.set_viewport_size({'width':1440,'height':900})
  for layout in ['sol-jacket','opus-search-map','opus-colour-band']:
   page.goto(f'http://127.0.0.1:8773/?book=linguistics&frontpage={layout}')
   page.evaluate("localStorage.setItem('publication-reader:linguistics:darkMode','true')")
   page.reload();page.locator('.publication-reader.dark').wait_for();page.wait_for_timeout(300)
   styles=page.evaluate("()=>Object.fromEntries(['.publication-front-title','.publication-front-primary','.publication-front-secondary','.publication-front-filter','.publication-front-group'].map(s=>{let e=document.querySelector(s);if(!e)return[s,null];let c=getComputedStyle(e);return[s,{color:c.color,bg:c.backgroundColor,paper:c.getPropertyValue('--reader-paper'),ink:c.getPropertyValue('--reader-ink'),accent:c.getPropertyValue('--reader-accent')}]}))")
   page.screenshot(path=str(out/f'dark-{layout}.png'))
   results.append({'layout':layout,'darkStyles':styles})
 finally: browser.close()
(out/'browser-results.json').write_text(json.dumps(results,indent=2))
print(json.dumps(results,indent=2))
