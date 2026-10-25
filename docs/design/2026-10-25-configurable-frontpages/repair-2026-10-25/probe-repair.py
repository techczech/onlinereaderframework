"""Targeted reprobe of the four front-page review findings against the built demo (default http://127.0.0.1:8773).
Headless Chromium shell only. Usage: probe-repair.py <label> [baseUrl]; writes results-<label>.json beside this file."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
label=sys.argv[1];base=sys.argv[2] if len(sys.argv)>2 else 'http://127.0.0.1:8773'
out=Path(__file__).parent
BOOKS=['linguistics','deliberate-practice','language-muscle']
LAYOUTS=['sol-jacket','sol-reading-desk','sol-open-contents','opus-title-contents','opus-search-map','opus-colour-band']
CONTRAST="""()=>{
 const cv=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
 const rgb=c=>{cv.clearRect(0,0,1,1);cv.fillStyle='#000';cv.fillStyle=c;cv.fillRect(0,0,1,1);const d=cv.getImageData(0,0,1,1).data;return [d[0],d[1],d[2],d[3]/255]};
 const lum=([r,g,b])=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(r)+.7152*f(g)+.0722*f(b)};
 const mix=(f,b)=>[0,1,2].map(i=>f[i]*f[3]+b[i]*(1-f[3]));
 const bgOf=el=>{const stack=[];for(let e=el;e;e=e.parentElement){const c=getComputedStyle(e);if(c.backgroundImage!=='none')return {gradient:true};const v=rgb(c.backgroundColor);stack.push(v);if(v[3]>=1)break}
  let base=[255,255,255];for(const v of stack.reverse())base=mix(v,base);return {rgb:base}};
 const root=document.querySelector('.publication-front');const rows=[];
 const sel=['.publication-front-entry a','.publication-front-entry button','.publication-front-entry-title','.publication-front-group-title','.publication-front-group-count','.publication-front-more','.publication-front-secondary','.publication-front-filter input','.publication-front-entry-meta','.publication-front-title'];
 const seen=new Set();
 for(const s of sel){for(const el of root.querySelectorAll(s)){if(seen.has(el)||!el.textContent.trim()&&!el.placeholder)continue;seen.add(el);const c=getComputedStyle(el);const fg=rgb(c.color);const b=bgOf(el);if(b.gradient){rows.push({sel:s,gradient:true});continue}
  const fgm=mix(fg,b.rgb);const L1=lum(fgm),L2=lum(b.rgb);const ratio=(Math.max(L1,L2)+.05)/(Math.min(L1,L2)+.05);
  rows.push({sel:s,text:(el.textContent||el.placeholder).trim().slice(0,24),fg:fgm.map(Math.round),bg:b.rgb.map(Math.round),ratio:+ratio.toFixed(2)})}}
 const worst={};for(const r of rows){if(r.gradient)continue;if(!worst[r.sel]||r.ratio<worst[r.sel].ratio)worst[r.sel]=r}
 return worst}"""
res={'label':label}
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 browser=p.chromium.launch(headless=True,executable_path=str(shells[-1]))
 try:
  # 1 depth one on Linguistics (the demo reads ?homedepth=)
  res['depth']={}
  page=browser.new_page(viewport={'width':1440,'height':900})
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  for d in (0,1,2):
   for layout,bk in [(l,b) for l in ('opus-colour-band','sol-open-contents') for b in BOOKS]:
    page.goto(f'{base}/?book={bk}&frontpage={layout}&homedepth={d}');page.wait_for_timeout(400)
    page.evaluate("document.fonts.ready")
    full=page.locator('.publication-front-depth button',has_text='Full contents')
    if full.count(): full.click()
    page.wait_for_timeout(150)
    res['depth'][f'{bk} {layout} depth {d}']={
     'groups':page.eval_on_selector_all('.publication-front-groups > .publication-front-group .publication-front-group-title','e=>e.map(x=>x.textContent.trim().slice(0,40))'),
     'entries':page.locator('.publication-front-contents [data-section-id]').count(),
     'fullAvailable':full.count(),'frontPagePresent':page.locator('[data-front-layout]').count()}
  # 2 Notes on home, all layouts and books, both widths; opens drawer with seeded note
  res['notes']=[]
  for width in (1440,390):
   page.set_viewport_size({'width':width,'height':900 if width>400 else 844})
   for b in BOOKS:
    for layout in LAYOUTS:
     page.goto(f'{base}/?book={b}&frontpage={layout}');page.locator('[data-front-layout]').wait_for()
     n=page.locator('.publication-toolbar-notes')
     inview=None
     if n.count():
      bb=n.first.bounding_box();inview=bool(bb and bb['x']>=0 and bb['x']+bb['width']<=width and bb['width']>0)
     res['notes'].append({'width':width,'book':b,'layout':layout,'count':n.count(),'inViewport':inview,'controls':page.locator('.publication-toolbar-actions > .publication-toolbar-control').all_text_contents()})
  # 2b notes state preserved: seed a reflection + highlight, open Notes on the front page
  page.set_viewport_size({'width':1440,'height':900})
  page.goto(f'{base}/?book=linguistics&frontpage=opus-colour-band');page.evaluate("localStorage.clear()");page.reload();page.locator('[data-front-layout]').wait_for()
  page.locator('.publication-front-depth button',has_text='Full contents').click()
  sid=page.eval_on_selector('.publication-front [data-section-id]','e=>e.dataset.sectionId')
  seed={'publication-reader:linguistics:reflections':[{'id':'r','content':'Seeded reflection','sectionId':sid,'sectionTitle':'Title','date':123}],
        'publication-reader:linguistics:highlights':[{'id':'h','text':'Seeded highlight text','note':'','sectionId':sid,'sectionTitle':'Title','date':124}]}
  page.evaluate("s=>{for(const[k,v]of Object.entries(s))localStorage.setItem(k,JSON.stringify(v))}",seed)
  page.reload();page.locator('[data-front-layout]').wait_for()
  keep={k:page.evaluate("k=>localStorage.getItem(k)",k) for k in seed}
  opened=False;found=[]
  if page.locator('.publication-toolbar-notes').count():
   page.locator('.publication-toolbar-notes').click();page.wait_for_timeout(500)
   found=[]
   for tab in ('All','Notes','Reflections'):
    t=page.get_by_role('button',name=tab,exact=True)
    if t.count(): t.first.click();page.wait_for_timeout(150)
    body=page.inner_text('body');found+=[x for x in ('Seeded highlight text','Seeded reflection') if x in body and x not in found]
  res['notesDrawer']={'opened':len(found)==2,'found':found,'storedUnchanged':keep=={k:page.evaluate("k=>localStorage.getItem(k)",k) for k in seed},'stillOnFrontPage':page.locator('[data-front-layout]').count()==1}
  # 3 search focus: Enter on the Search button, then type
  res['search']=[]
  for width,height in ((1440,900),(390,844)):
   page.set_viewport_size({'width':width,'height':height})
   for layout in LAYOUTS:
    for b in ('linguistics','deliberate-practice'):
     page.goto(f'{base}/?book={b}&frontpage={layout}');page.locator('[data-front-layout]').wait_for();page.evaluate("localStorage.clear()")
     btn=page.locator('.publication-front-secondary',has_text='Search').first
     btn.focus()
     scroll0=page.evaluate("()=>[scrollY,document.querySelector('.publication-scroll')?.scrollTop??0]")
     page.keyboard.press('Enter');page.wait_for_timeout(700)
     page.keyboard.type('mus')
     r=page.evaluate("()=>({tag:document.activeElement.tagName,label:document.activeElement.getAttribute('aria-label'),value:document.activeElement.value??null,scroll:[scrollY,document.querySelector('.publication-scroll')?.scrollTop??0]})")
     r.update({'width':width,'layout':layout,'book':b,'scrollBefore':scroll0,'ok':r['tag']=='INPUT' and r['value']=='mus'})
     res['search'].append(r)
  # 4 dark contrast across books x layouts at both widths
  res['contrast']=[]
  for width,height in ((1440,900),(390,844)):
   page.set_viewport_size({'width':width,'height':height})
   for b in BOOKS:
    for layout in LAYOUTS:
     for dark in (True,False):
      page.goto(f'{base}/?book={b}&frontpage={layout}')
      page.evaluate("([b,d])=>{localStorage.clear();if(d)localStorage.setItem('publication-reader:'+b+':darkMode','true')}",[b,dark])
      page.reload();page.locator('[data-front-layout]').wait_for();page.wait_for_timeout(200)
      full=page.locator('.publication-front-depth button',has_text='Full contents')
      if full.count(): full.click()
      page.wait_for_timeout(100)
      worst=page.evaluate(CONTRAST)
      res['contrast'].append({'width':width,'book':b,'layout':layout,'dark':dark,'isDark':page.locator('.publication-reader.dark').count()>0,'worst':worst})
  # 5 keyboard focus indicator on topic cards, dark and light
  res['focus']=[]
  page.set_viewport_size({'width':1440,'height':900})
  for b in BOOKS:
   for dark in (True,False):
    page.goto(f'{base}/?book={b}&frontpage=opus-search-map');page.evaluate("([b,d])=>{localStorage.clear();if(d)localStorage.setItem('publication-reader:'+b+':darkMode','true')}",[b,dark]);page.reload();page.locator('[data-front-layout]').wait_for()
    more=page.locator('.publication-front-more').first
    entry=page.locator('.publication-front-groups.is-tiles .publication-front-entry a, .publication-front-groups.is-tiles .publication-front-entry button').first
    for name,loc in (('entry',entry),('show-all',more)):
     if not loc.count(): res['focus'].append({'book':b,'dark':dark,'target':name,'present':False});continue
     page.keyboard.press('Shift+Tab');loc.focus();page.keyboard.press('Shift+Tab');page.keyboard.press('Tab')
     r=page.evaluate("""()=>{const e=document.activeElement;const c=getComputedStyle(e);const cv=document.createElement('canvas').getContext('2d',{willReadFrequently:true});
      const rgb=x=>{cv.clearRect(0,0,1,1);cv.fillStyle=x;cv.fillRect(0,0,1,1);const d=cv.getImageData(0,0,1,1).data;return [d[0],d[1],d[2]]};
      const lum=a=>{const f=v=>{v/=255;return v<=.03928?v/12.92:((v+.055)/1.055)**2.4};return .2126*f(a[0])+.7152*f(a[1])+.0722*f(a[2])};
      let bg=null;for(let n=e;n;n=n.parentElement){const k=getComputedStyle(n).backgroundColor;if(k!=='rgba(0, 0, 0, 0)'&&k!=='transparent'){bg=rgb(k);break}}
      const oc=rgb(c.outlineColor);const ratio=bg?(Math.max(lum(oc),lum(bg))+.05)/(Math.min(lum(oc),lum(bg))+.05):null;
      return {matches:e.matches(':focus-visible'),outlineStyle:c.outlineStyle,outlineWidth:c.outlineWidth,outlineColor:c.outlineColor,boxShadow:c.boxShadow,ratioVsBackground:ratio&&+ratio.toFixed(2),tag:e.tagName,text:(e.textContent||'').trim().slice(0,20)}}""")
     r.update({'book':b,'dark':dark,'target':name});res['focus'].append(r)
  res['pageErrors']=errors
 finally: browser.close()
(out/f'results-{label}.json').write_text(json.dumps(res,indent=1))
# summary
bad=[c for c in res['contrast'] if c['isDark']==c['dark'] and any(v['ratio']<4.5 for v in c['worst'].values())]
print('notes missing',sum(1 for n in res['notes'] if n['count']!=1),'/',len(res['notes']))
print('search focus failures',sum(1 for s in res['search'] if not s['ok']),'/',len(res['search']))
print('contrast views below 4.5',len(bad),'/',len(res['contrast']))
print('depth',json.dumps(res['depth'],indent=0)[:1500])
print('drawer',res['notesDrawer']['opened'])
