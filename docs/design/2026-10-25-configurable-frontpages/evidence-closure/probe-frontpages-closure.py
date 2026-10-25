import ast,json,hashlib,tempfile
from pathlib import Path
from playwright.sync_api import sync_playwright
out=Path(__file__).resolve().parent
root=out.parents[3]
repair=out.parent/'repair-2026-10-25/probe-repair.py'
contrast=next(ast.literal_eval(n.value) for n in ast.parse(repair.read_text()).body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='CONTRAST' for t in n.targets))
old=json.loads((out.parent/'evidence-review/source-hashes.json').read_text())
files=list(old)+['docs/configuration-publication-reader.md','packages/reader-core/src/original/PublicationReader.tsx']
hashes={f:hashlib.sha256((root/f).read_bytes()).hexdigest() for f in files}
(out/'hashes-frontpages-closure.json').write_text(json.dumps({'current':hashes,'changedSinceOriginalReview':[f for f in old if old[f]!=hashes[f]]},indent=2))
res={'search':[],'notes':[],'contrast':[],'guards':[],'errors':[]}
with sync_playwright() as p, tempfile.TemporaryDirectory(prefix='scratch-browser-',dir=out) as scratch:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 browser=p.chromium.launch_persistent_context(scratch,headless=True,executable_path=str(shell))
 try:
  page=browser.new_page();page.on('pageerror',lambda e:res['errors'].append(str(e)))
  def home(width=1440):
   page.set_viewport_size({'width':width,'height':900})
   page.goto('http://127.0.0.1:8773/?book=linguistics&frontpage=opus-search-map')
   page.locator('[data-front-layout]').wait_for()
  def state():
   return page.evaluate('''()=>({active:document.activeElement.tagName,cls:document.activeElement.className,value:document.activeElement.value,open:document.querySelector('.publication-sidebar').dataset.open,tries:window.__tries??0,scroll:[scrollY,document.querySelector('.publication-scroll')?.scrollTop]})''')
  def trigger():
   b=page.locator('.publication-front-secondary',has_text='Search').first;b.focus();page.keyboard.press('Enter')
  for width in (1440,390):
   home(width)
   for repeat in (1,2):
    trigger();page.wait_for_timeout(650);page.keyboard.type('mus')
    res['search'].append({'width':width,'repeat':repeat,**state()})
    page.locator('.publication-navigation-toggle').focus();page.keyboard.press('Enter');page.wait_for_timeout(100)
   home(width)
   res['notes'].append({'width':width,'controls':page.locator('.publication-toolbar-actions > button').all_text_contents()})
   page.locator('.publication-toolbar-notes').click();page.wait_for_timeout(150)
   res['notes'][-1]['drawerVisible']=page.get_by_role('heading',name='Notes & Highlights').count()>0 or 'Notes & Highlights' in page.inner_text('body')
   home(width);page.evaluate("localStorage.setItem('publication-reader:linguistics:darkMode','true')");page.reload();page.locator('[data-front-layout]').wait_for()
   res['contrast'].append({'width':width,'dark':page.locator('.publication-reader.dark').count(), 'computed':page.evaluate(contrast)})
  res['depthViews']=[]
  for depth in (0,1,2):
   page.goto(f'http://127.0.0.1:8773/?book=linguistics&frontpage=opus-colour-band&homedepth={depth}');page.locator('[data-front-layout]').wait_for()
   row={'depth':depth,'labels':page.locator('.publication-front-depth button').all_text_contents(),'summaryEntries':page.locator('.publication-front [data-section-id]').count()}
   full=page.locator('.publication-front-depth button',has_text='Full contents')
   if full.count():full.click()
   row['fullIds']=page.locator('.publication-front [data-section-id]').evaluate_all('es=>es.map(e=>e.dataset.sectionId)')
   res['depthViews'].append(row)
  # Controlled retries: only sidebar input.focus is refused; all other browser focus stays native.
  block='''()=>{window.__originalFocus=HTMLElement.prototype.focus;window.__tries=0;HTMLElement.prototype.focus=function(...a){if(this.matches('.publication-sidebar input')){window.__tries++;return;}return window.__originalFocus.apply(this,a)}}'''
  for width,kind in [(w,k) for w in (1440,390) for k in ('editable','dialog','close-reopen','book-change','exhaustion')]:
   home(width);page.evaluate(block);trigger();page.wait_for_timeout(60)
   before=state()
   if kind in ('editable','dialog'):
    page.evaluate('''kind=>{const box=document.createElement('div');if(kind==='dialog')box.setAttribute('role','dialog');box.innerHTML=kind==='dialog'?'<button id="closure-target">Other dialog</button>':'<textarea id="closure-target"></textarea>';document.body.append(box);document.querySelector('#closure-target').focus()}''',kind)
    page.wait_for_timeout(100);guarded=state();page.evaluate('()=>{HTMLElement.prototype.focus=window.__originalFocus}');page.wait_for_timeout(600)
    after=state();trigger();page.wait_for_timeout(250);fresh=state()
    res['guards'].append({'width':width,'kind':kind,'before':before,'guarded':guarded,'after':after,'fresh':fresh})
   elif kind=='close-reopen':
    page.locator('.publication-navigation-toggle').focus();page.keyboard.press('Enter');page.wait_for_timeout(100);closed=state()
    page.evaluate('()=>{HTMLElement.prototype.focus=window.__originalFocus}');page.locator('.publication-navigation-toggle').focus();page.keyboard.press('Enter');page.wait_for_timeout(300)
    res['guards'].append({'width':width,'kind':kind,'before':before,'closed':closed,'after':state()})
   elif kind=='book-change':
    page.evaluate('''()=>{history.pushState(null,'','?book=deliberate-practice&frontpage=opus-search-map');dispatchEvent(new PopStateEvent('popstate'))}''');page.wait_for_timeout(100)
    page.evaluate('()=>{HTMLElement.prototype.focus=window.__originalFocus}');page.wait_for_timeout(600)
    res['guards'].append({'width':width,'kind':kind,'before':before,'after':state()})
   else:
    page.wait_for_timeout(800);expired=state();page.evaluate('()=>{HTMLElement.prototype.focus=window.__originalFocus}');trigger();page.wait_for_timeout(250)
    res['guards'].append({'width':width,'kind':kind,'before':before,'expired':expired,'fresh':state()})
 finally:browser.close()
(out/'results-frontpages-closure.json').write_text(json.dumps(res,indent=2))
print(json.dumps(res,indent=2))
