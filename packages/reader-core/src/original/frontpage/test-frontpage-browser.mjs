/** All six layouts on the three real books at 1440 and 390 px, against the built demo (default http://127.0.0.1:8773, serving apps/reader-demo/dist).
 * Headless Chromium shell only. Usage: node test-frontpage-browser.mjs [baseUrl] [screenshotDirectory] */
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
const root = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../../..');
const python = String.raw`
import json,sys,re
from pathlib import Path
from playwright.sync_api import sync_playwright
cfg=json.load(sys.stdin)
base=cfg['base'];shots=cfg.get('shots')
books=json.load(open(cfg['books']))
LAYOUTS=['sol-jacket','sol-reading-desk','sol-open-contents','opus-title-contents','opus-search-map','opus-colour-band']
def readable(items):
 out=[]
 for s in items:
  kids=s.get('children') or []
  if s['content'].strip() or not kids: out.append(s['id'])
  out+=readable(kids)
 return out
def first(items):
 return readable(items)[0]
checks=0;failures=[]
def check(cond,msg):
 global checks
 checks+=1
 if not cond: failures.append(msg);print('FAIL',msg,flush=True)
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 assert shells,'Headless Chromium shell required'
 browser=p.chromium.launch(headless=True,executable_path=str(shells[-1]))
 try:
  for width,height in ((1440,900),(390,844)):
   page=browser.new_page(viewport={'width':width,'height':height})
   errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
   for book in books:
    expected=readable(book['sections'])
    for layout in LAYOUTS:
     tag=f"{book['id']} {layout} {width}"
     page.goto(f"{base}/?book={book['id']}&frontpage={layout}");page.locator('[data-front-layout]').wait_for()
     page.evaluate("localStorage.clear()");page.reload();page.locator('[data-front-layout]').wait_for()
     page.evaluate("document.fonts.ready");page.wait_for_timeout(120)
     check(page.locator('[data-front-layout]').get_attribute('data-front-layout')==layout,tag+' layout attribute')
     over=page.evaluate("()=>({doc:document.documentElement.scrollWidth-innerWidth,scroll:(s=>s.scrollWidth-s.clientWidth)(document.querySelector('.publication-scroll'))})")
     check(over['doc']<=0 and over['scroll']<=0,tag+' horizontal overflow '+json.dumps(over))
     if shots:
      Path(shots).mkdir(parents=True,exist_ok=True)
      page.screenshot(path=f"{shots}/{layout}-{book['id']}-{width}.jpg",type='jpeg',quality=70)
     if layout!='opus-search-map':
      depth=page.locator('.publication-front-depth button')
      if depth.count(): check(depth.all_text_contents()==['Contents','Full contents'],tag+' depth labels')
     full=page.locator('.publication-front-depth button',has_text='Full contents')
     if full.count(): full.click()
     listed=page.eval_on_selector_all('.publication-front-contents [data-section-id]','els=>els.map(e=>e.dataset.sectionId)')
     check(listed==expected,tag+f' Full contents ids/order ({len(listed)} vs {len(expected)})')
     if full.count(): check(full.get_attribute('aria-pressed')=='true',tag+' Full pressed')
     if layout=='opus-colour-band':
      geo=page.evaluate("()=>{const b=document.querySelector('.pf-band').getBoundingClientRect(),c=document.querySelector('.publication-front-cover').getBoundingClientRect();return {overlap:c.bottom-b.bottom,numerals:document.querySelectorAll('.publication-front-numeral').length}}")
      check(geo['numerals']>=3,tag+' numbered rows')
      if width==1440: check(geo['overlap']>40,tag+' cover overlaps band '+json.dumps(geo))
     btn=page.locator('.publication-front-primary')
     check(page.locator('.publication-front-primary-label').inner_text()=='Start reading',tag+' start label')
     btn.click();page.wait_for_timeout(120)
     check(f"section={first(book['sections'])}" in page.url,tag+' Start destination '+page.url)
     page.go_back();page.locator('[data-front-layout]').wait_for()
   # Continue, filter, Search and a toolbar flow on one book per width.
   book=next(b for b in books if b['id']=='deliberate-practice');rid=readable(book['sections'])[5]
   page.goto(f"{base}/?book=deliberate-practice&frontpage=sol-reading-desk");page.evaluate("id=>localStorage.setItem('publication-reader:deliberate-practice:lastSection',JSON.stringify(id))",rid)
   page.reload();page.locator('[data-front-layout]').wait_for()
   check(page.locator('.publication-front-primary-label').inner_text()=='Continue reading',f'continue label {width}')
   page.locator('.publication-front-primary').click();page.wait_for_timeout(120)
   check(f'section={rid}' in page.url,f'Continue destination {width}')
   page.evaluate("id=>localStorage.setItem('publication-reader:deliberate-practice:lastSection',JSON.stringify('missing'))",rid)
   page.goto(f"{base}/?book=deliberate-practice&frontpage=sol-reading-desk")
   check(page.locator('.publication-front-primary-label').inner_text()=='Start reading',f'stale last section ignored {width}')
   box=page.locator('.publication-front-filter input');box.fill('memory')
   check(page.locator('.publication-front-results [data-section-id]').count()>=3,f'filter results {width}')
   box.press('Escape');check(box.input_value()=='' and page.evaluate("document.activeElement.tagName")=='INPUT',f'Escape clears filter and keeps focus {width}')
   page.locator('.publication-front-actions-row .publication-front-secondary',has_text='Search').first.click()
   page.wait_for_timeout(800)
   # The classic home page behaves the same: the reader's sidebar search opens; focus stays on the button.
   check(page.evaluate("()=>{const s=document.querySelector('.publication-sidebar');const r=s.getBoundingClientRect();return r.x>=0&&r.right>0&&!!s.querySelector('input')}"),f'Search opens the reader search {width}')
   page.goto(f"{base}/?book=linguistics&frontpage=opus-colour-band")
   check('Contents' in page.locator('.publication-front-depth button[aria-pressed=true]').inner_text() and page.locator('.publication-front-depth button[aria-pressed=true]').inner_text()=='Contents',f'Linguistics opens on Contents {width}')
   page.goto(f"{base}/?book=linguistics&frontpage=not-a-key")
   check(page.locator('[data-front-layout]').get_attribute('data-front-layout')=='opus-colour-band',f'bad key falls back to configured default {width}')
   page.goto(f"{base}/?book=deliberate-practice")
   check(page.locator('[data-front-layout]').count()==0 and page.locator('.publication-masthead').count()==1,f'unconfigured book keeps classic home {width}')
   page.goto(f"{base}/?book=deliberate-practice&frontpage=sol-jacket");page.locator('.publication-front-entry button').first.click();page.wait_for_selector('[data-publication-content]')
   tb=[b.inner_text().split('\n')[0] for b in page.locator('.publication-toolbar-actions > button').all()]
   check(tb==['headphones','text_fields','eyeglasses','ink_highlighter'],f'toolbar controls unchanged {tb}')
   check('Browser storage is unavailable' not in page.content(),'storage available')
   check(not errors,f'page errors {errors}')
   page.close()
 finally: browser.close()
print(json.dumps({'checks':checks,'failures':failures}))
sys.exit(1 if failures else 0)
`;
const books = resolve(root, 'apps/reader-demo/src/books/original-publications.json');
const run = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python], { input: JSON.stringify({ base: process.argv[2] ?? 'http://127.0.0.1:8773', books, shots: process.argv[3] }), stdio: ['pipe', 'inherit', 'inherit'], encoding: 'utf8' });
process.exit(run.status ?? 1);
