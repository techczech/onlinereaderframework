# Close/hide navigation before a Search focus request settles, focus another control, reopen via the ordinary toggle: focus must stay put.
# A fresh explicit Search request must still focus the real input, at both widths, and repeat. Usage: probe-search-cancel.py <label>
import json,sys,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).resolve().parent
label=sys.argv[1] if len(sys.argv)>1 else 'run'
res={'label':label,'cases':[],'errors':[]}
BLOCK='''()=>{window.__originalFocus=HTMLElement.prototype.focus;HTMLElement.prototype.focus=function(...a){if(this.matches('.publication-sidebar input'))return;return window.__originalFocus.apply(this,a)}}'''
RESTORE='()=>{HTMLElement.prototype.focus=window.__originalFocus}'
with sync_playwright() as p, tempfile.TemporaryDirectory(prefix='scratch-browser-',dir=out) as scratch:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 browser=p.chromium.launch_persistent_context(scratch,headless=True,executable_path=str(shell))
 try:
  page=browser.new_page();page.on('pageerror',lambda e:res['errors'].append(str(e)))
  def home(width):
   page.set_viewport_size({'width':width,'height':900})
   page.goto('http://127.0.0.1:8773/?book=linguistics&frontpage=opus-search-map');page.locator('[data-front-layout]').wait_for()
  def state():
   return page.evaluate('''()=>({active:document.activeElement.tagName,cls:document.activeElement.className,inInput:!!document.activeElement.closest('.publication-sidebar input')||document.activeElement.matches('.publication-sidebar input'),open:document.querySelector('.publication-sidebar').dataset.open})''')
  def trigger():
   b=page.locator('.publication-front-secondary',has_text='Search').first;b.focus();page.keyboard.press('Enter')
  def toggle():
   page.locator('.publication-navigation-toggle').focus();page.keyboard.press('Enter')
  for width in (1440,390):
   home(width);page.evaluate(BLOCK);trigger();page.wait_for_timeout(60)
   toggle();page.wait_for_timeout(100);closed=state()
   page.evaluate(RESTORE);page.wait_for_timeout(100)
   page.locator('.publication-navigation-toggle').focus()  # another control holds focus
   toggle();page.wait_for_timeout(400);reopened=state()
   res['cases'].append({'width':width,'kind':'close-focus-other-reopen','closed':closed,'reopened':reopened,'stoleFocus':reopened['inInput']})
   # fresh explicit requests still focus the input, and repeat
   for repeat in (1,2):
    if page.locator('.publication-sidebar').get_attribute('data-open')=='true':toggle();page.wait_for_timeout(100)
    trigger();page.wait_for_timeout(500);s=state()
    res['cases'].append({'width':width,'kind':'fresh-request','repeat':repeat,'state':s,'focusedInput':s['inInput']})
 finally:browser.close()
res['pass']=all((not c['stoleFocus']) if c['kind']=='close-focus-other-reopen' else c['focusedInput'] for c in res['cases']) and not res['errors']
(out/f'results-{label}.json').write_text(json.dumps(res,indent=2));print(json.dumps(res,indent=2))
