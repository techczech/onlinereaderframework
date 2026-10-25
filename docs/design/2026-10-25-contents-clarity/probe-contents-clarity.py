"""Contents clarity probe: before (scratch build, port 8791) vs after (built demo, port 8773), three real books.
Headless Chromium shell only. Usage: uv run --with playwright python probe-contents-clarity.py. Writes screenshots/*.png and results.json."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
OUT=Path(__file__).parent;SHOTS=OUT/'screenshots'
BUILDS={'before':'http://127.0.0.1:8791','after':'http://127.0.0.1:8773'}
BOOKS=['linguistics','deliberate-practice','language-muscle']
LAYOUTS=['sol-jacket','sol-reading-desk','sol-open-contents','opus-title-contents','opus-search-map','opus-colour-band']
res=[]
JS='''()=>{const items=[...document.querySelectorAll('.publication-front-entry > button')];
const rects=items.map(b=>b.getBoundingClientRect());
let overlap=0;for(let i=0;i<items.length;i++){const t=items[i].querySelector('.publication-front-entry-title'),m=items[i].querySelector('.publication-front-entry-meta');
 if(t&&m){const a=t.getBoundingClientRect(),c=m.getBoundingClientRect();if(a.left<c.right&&c.left<a.right&&a.top<c.bottom&&c.top<a.bottom)overlap++}}
let clipped=items.filter(b=>{const t=b.querySelector('.publication-front-entry-title');return t&&t.scrollWidth>t.clientWidth+1}).length;
const ids=items.map(b=>b.dataset.sectionId);
return {buttons:items.length,titleMetaOverlap:overlap,clippedTitles:clipped,hOverflow:document.documentElement.scrollWidth>innerWidth+1||[...document.querySelectorAll('.publication-front')].some(e=>e.scrollWidth>e.clientWidth+1),
 counts:[...document.querySelectorAll('.publication-front-count,.publication-front-group-count')].slice(0,3).map(e=>e.textContent),
 entriesWord:/\\bentr(y|ies)\\b/i.test(document.querySelector('.publication-front')?.innerText||''),
 firstIds:ids.slice(0,6),
 tops:rects.slice(0,6).map(r=>[Math.round(r.left),Math.round(r.top)])}}'''
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 br=p.chromium.launch(headless=True,executable_path=str(shell))
 def shot(build,book,layout,w,h,scheme,tag):
  c=br.new_context(viewport={'width':w,'height':h},color_scheme=scheme,is_mobile=w<500,has_touch=w<500);pg=c.new_page();pg.set_default_timeout(8000)
  pg.goto(f"{BUILDS[build]}/?book={book}&frontpage={layout}");pg.locator('.publication-front').wait_for();pg.wait_for_timeout(700)
  if not pg.locator('.publication-front-group.is-open').count():
   t=pg.locator('.publication-front-group-toggle').first
   if t.count(): t.click();pg.wait_for_timeout(300)
  tgt=pg.locator('.publication-front-group.is-open').first
  if tgt.count(): tgt.scroll_into_view_if_needed();pg.evaluate("window.scrollBy(0,-24)")
  pg.wait_for_timeout(300)
  m=pg.evaluate(JS);name=f"{tag}-{build}-{book}-{layout}-{w}-{scheme}.png"
  pg.screenshot(path=str(SHOTS/name));m.update(name=name,build=build,book=book,layout=layout,width=w,scheme=scheme);res.append(m);print(name,json.dumps({k:m[k] for k in('buttons','titleMetaOverlap','clippedTitles','hOverflow','entriesWord','counts')}),flush=True);c.close()
 for build in BUILDS:
  for book in BOOKS:
   for w,h in((1280,900),(390,844)): shot(build,book,'opus-colour-band',w,h,'light','main')
 for layout in LAYOUTS:
  for book in BOOKS: shot('after',book,layout,1280,900,'light','layouts')
 shot('after','linguistics','opus-colour-band',1280,900,'dark','dark')
 shot('after','deliberate-practice','opus-colour-band',390,844,'dark','dark')
 br.close()
(OUT/'results.json').write_text(json.dumps(res,indent=1))
