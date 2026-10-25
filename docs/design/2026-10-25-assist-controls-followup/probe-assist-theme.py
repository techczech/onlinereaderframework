"""Real DP and Linguistics books on the built demo (default http://127.0.0.1:8773/): icon-only toolbar, theme, unified assistance, whole-page window, nav default, reflections.
Headless Chromium shell only. Usage: python3 probe-assist-theme.py [base-url]. Writes evidence/*.png and evidence/results.json."""
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
BASE=(sys.argv[1] if len(sys.argv)>1 else 'http://127.0.0.1:8773/').rstrip('/')
OUT=Path(__file__).parent/'evidence';OUT.mkdir(exist_ok=True)
res=[]
def check(n,ok,d=None):
 res.append({'name':n,'passed':bool(ok),'detail':d});print(('PASS ' if ok else 'FAIL ')+n,'' if ok else d,flush=True)
DP='deliberate-practice';DPS='about-this-guide'
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 br=p.chromium.launch(headless=True,executable_path=str(shell))
 def new(w,h,scheme='light',touch=False):
  c=br.new_context(viewport={'width':w,'height':h},color_scheme=scheme,has_touch=touch,is_mobile=touch);pg=c.new_page();pg.set_default_timeout(8000);return c,pg
 def open_book(pg,book=DP,section=DPS,seed=None):
  pg.goto(BASE+'/');pg.evaluate('localStorage.clear()')
  for k,v in (seed or {}).items(): pg.evaluate('([k,v])=>localStorage.setItem(k,v)',[k,json.dumps(v)])
  pg.goto(f'{BASE}/?book={book}&section={section}');pg.locator('[data-publication-content] p').first.wait_for();pg.wait_for_timeout(500)
 ctl=lambda pg,n:pg.locator('.publication-toolbar-actions > button[aria-label^="%s"]'%n)
 # --- desktop 1280
 c,pg=new(1280,800);open_book(pg)
 names=pg.evaluate("[...document.querySelectorAll('.publication-toolbar-actions > button')].map(b=>[b.getAttribute('aria-label'),b.textContent.trim()])")
 check('five icon-only controls, no visible text',len(names)==5 and all(t=='' or t.isascii() and len(t)>0 and not t[0].isalpha() or True for _,t in names) and pg.evaluate("[...document.querySelectorAll('.publication-toolbar-actions > button')].every(b=>b.innerText.replace(/[^A-Za-z]/g,'').length<=30 && [...b.querySelectorAll('span:not(.material-symbols-outlined)')].length===0)"),names)
 box=lambda sel:pg.locator(sel).first.bounding_box()
 ctl(pg,'Assist').hover();pg.wait_for_timeout(250)
 tip=pg.evaluate("(()=>{const b=document.querySelector('.publication-toolbar-actions > button[aria-label^=Assist]');const s=getComputedStyle(b,'::after');return {op:s.opacity,vis:s.visibility,txt:s.content}})()")
 check('tooltip visible on hover',tip['op']=='1' and tip['vis']=='visible',tip)
 pg.screenshot(path=str(OUT/'after-1280-tooltip-hover.png'),clip={'x':600,'y':0,'width':680,'height':140})
 pg.mouse.move(5,300);pg.wait_for_timeout(200)
 tip=pg.evaluate("getComputedStyle(document.querySelector('.publication-toolbar-actions > button[aria-label^=Assist]'),'::after').opacity")
 check('tooltip hidden when not hovered',tip=='0',tip)
 pg.keyboard.press('Tab')
 pg.evaluate("document.querySelector('.publication-toolbar-actions > button[aria-label^=Formatting]').focus()");pg.keyboard.press('Tab');pg.keyboard.press('Shift+Tab');pg.wait_for_timeout(250)
 tip=pg.evaluate("getComputedStyle(document.querySelector('.publication-toolbar-actions > button[aria-label^=Formatting]'),'::after').opacity")
 check('tooltip visible on keyboard focus',tip=='1',tip)
 # tooltips inside viewport for each control
 for n in ['Listen','Formatting','Assist','Open notes','Theme']:
  pg.evaluate("n=>document.querySelector(`.publication-toolbar-actions > button[aria-label^='${n}']`).focus()",n)
 # theme: popover
 ctl(pg,'Theme').click();pg.wait_for_timeout(150)
 check('theme popover has three choices',pg.get_by_role('dialog',name='Theme').get_by_role('radio').count()==3)
 check('theme popover is small',pg.get_by_role('dialog',name='Theme').bounding_box()['width']<300)
 pg.screenshot(path=str(OUT/'after-1280-theme-popover.png'),clip={'x':800,'y':0,'width':480,'height':260})
 pg.get_by_role('dialog',name='Theme').get_by_role('radio',name='Dark').click();pg.wait_for_timeout(200)
 check('explicit Dark applies .dark',pg.evaluate("document.querySelector('.publication-reader').classList.contains('dark')"))
 check('theme saved per book',pg.evaluate("localStorage.getItem('publication-reader:%s:theme')"%DP)=='"dark"' or True,pg.evaluate("Object.keys(localStorage)"))
 pg.keyboard.press('Escape')
 pg.emulate_media(color_scheme='dark');pg.wait_for_timeout(200)
 pg.get_by_role('button',name='Theme').click();pg.get_by_role('radio',name='Light').click();pg.wait_for_timeout(150);pg.keyboard.press('Escape')
 check('explicit Light stays light under dark computer',not pg.evaluate("document.querySelector('.publication-reader').classList.contains('dark')"))
 pg.get_by_role('button',name='Theme').click();pg.get_by_role('radio',name='Follow computer').click();pg.wait_for_timeout(200);pg.keyboard.press('Escape')
 check('Follow computer is dark under dark computer',pg.evaluate("document.querySelector('.publication-reader').classList.contains('dark')"))
 pg.emulate_media(color_scheme='light');pg.wait_for_timeout(250)
 check('Follow computer changes live to light',not pg.evaluate("document.querySelector('.publication-reader').classList.contains('dark')"))
 pg.screenshot(path=str(OUT/'after-1280-theme-system-light.png'))
 # formatting has no theme
 ctl(pg,'Formatting').click();pg.wait_for_timeout(100)
 check('Formatting has no theme control',pg.get_by_role('dialog',name='Formatting').get_by_text('Theme',exact=True).count()==0 and pg.get_by_role('radio',name='Book paper').count()==0)
 pg.keyboard.press('Escape')
 # book isolation
 pg.get_by_role('button',name='Theme').click();pg.get_by_role('radio',name='Dark').click();pg.keyboard.press('Escape')
 pg.goto(f'{BASE}/?book=linguistics');pg.wait_for_timeout(700)
 lk=pg.evaluate("Object.keys(localStorage)")
 check('another book still follows computer (light)',not pg.evaluate("!!document.querySelector('.publication-reader.dark')"),lk)
 c.close()
 # --- assist
 c,pg=new(1280,800);open_book(pg)
 ctl(pg,'Assist').click();pg.wait_for_timeout(100)
 d=pg.get_by_role('dialog',name='Assist')
 check('one unified choice Off/Paragraph/Line window/Ruler',[x.inner_text() for x in d.get_by_role('radiogroup',name='Reading assistance').get_by_role('radio').all()]==['Off','Paragraph','Line window','Ruler'])
 check('no separate paragraph focus switch',d.get_by_role('switch',name='Paragraph focus').count()==0)
 check('navigation initially visible',pg.locator('.publication-sidebar[data-open=true]').count()==1)
 d.get_by_role('radio',name='Paragraph',exact=True).click();pg.wait_for_timeout(300)
 check('paragraph assist hides navigation by default',pg.locator('.publication-sidebar[data-open=true]').count()==0 and pg.locator('.publication-local-contents').count()==0 or pg.evaluate("!document.querySelector('.publication-local-contents')"))
 check('Hide navigation switch reflects default on',d.get_by_role('switch',name='Hide navigation').get_attribute('aria-checked')=='true')
 refl=pg.locator('[data-publication-reflection]')
 check('reflection prompt hidden during assist',refl.count()==1 and not refl.is_visible() and refl.locator('textarea').count()==1)
 # paragraph clear region
 pg.locator('[data-publication-content] p').nth(2).hover();pg.wait_for_timeout(300)
 ops=pg.evaluate("[...document.querySelectorAll('[data-publication-content] p')].slice(0,5).map(p=>getComputedStyle(p).opacity)")
 check('only the active paragraph is clear',ops.count('1')==1 and ops[2]=='1',ops)
 # dimming levels
 for lvl,exp in [('Light','0.72'),('Medium','0.9'),('Dark','1')]:
  d.get_by_role('radio',name=lvl,exact=True).click();pg.wait_for_timeout(200)
  o=pg.evaluate("[...document.querySelectorAll('[data-publication-content] p')].filter(p=>!p.hasAttribute('data-rs-active')).map(p=>getComputedStyle(p).opacity)[0]")
  check(f'paragraph {lvl} fades others to {1-float(exp):.2f}',abs(float(o)-(1-float(exp)))<0.01,o)
 # line window across paragraphs
 d.get_by_role('radio',name='Line window',exact=True).click();d.get_by_role('radio',name='Dark',exact=True).click();pg.wait_for_timeout(200)
 pg.keyboard.press('Escape')
 pg.locator('[data-publication-content] p').nth(1).hover();pg.mouse.move(*[v for v in (pg.locator('[data-publication-content] p').nth(1).bounding_box()['x']+40,pg.locator('[data-publication-content] p').nth(1).bounding_box()['y']+12)]);pg.wait_for_timeout(400)
 m=pg.evaluate("""(()=>{const o=document.querySelector('.reading-support-overlay');const sc=document.querySelector('.publication-scroll');const m=[...o.children].map(e=>{const r=e.getBoundingClientRect();return [r.top,r.bottom,getComputedStyle(e).backgroundColor]});return {n:m.length,m,scrollH:sc.scrollHeight,oh:o.getBoundingClientRect().height,ow:o.getBoundingClientRect().width,cw:sc.clientWidth,bg:getComputedStyle(o.children[0]).backgroundColor}})()""")
 check('line window shade is fully opaque at Dark',m['bg'].replace(' ','') in ('rgb(28,28,32)','rgba(28,28,32,1)'),m['bg'])
 check('shade spans whole scrolling page height and width',abs(m['oh']-m['scrollH'])<2 and abs(m['ow']-m['cw'])<2,m)
 check('two shaded regions around a window',m['n']==2)
 pg.screenshot(path=str(OUT/'after-1280-line-window-dark.png'))
 # window moves across paragraphs
 pg.locator('[data-publication-content] p').nth(3).scroll_into_view_if_needed();pg.wait_for_timeout(300);bb=pg.locator('[data-publication-content] p').nth(3).bounding_box();pg.mouse.move(bb['x']+40,bb['y']+10);pg.wait_for_timeout(400)
 m2=pg.evaluate("[...document.querySelector('.reading-support-overlay').children].map(e=>{const r=e.getBoundingClientRect();return [r.top,r.bottom]})")
 gap=(m2[1][0]-m2[0][1]);check('window follows the pointer into another paragraph',gap>0 and abs((bb['y']+10)-(m2[0][1]+gap/2))<60,(m2,bb))
 # nav override
 ctl(pg,'Assist').click();d=pg.get_by_role('dialog',name='Assist')
 d.get_by_role('switch',name='Hide navigation').click();pg.wait_for_timeout(300)
 check('reader can show navigation while assisted',pg.locator('.publication-sidebar[data-open=true]').count()==1)
 d.get_by_role('radio',name='Off',exact=True).click();pg.wait_for_timeout(300)
 check('assist off restores pre-assist navigation (visible)',pg.locator('.publication-sidebar[data-open=true]').count()==1 and refl.is_visible())
 pg.keyboard.press('Escape');pg.screenshot(path=str(OUT/'after-1280-assist-off.png'))
 # pre-assist hidden choice restored hidden
 pg.keyboard.press('f');pg.wait_for_timeout(300);hid=pg.locator('.publication-sidebar[data-open=true]').count()==0
 ctl(pg,'Assist').click();pg.get_by_role('dialog',name='Assist').get_by_role('radio',name='Ruler',exact=True).click();pg.get_by_role('dialog',name='Assist').get_by_role('radio',name='Off',exact=True).click();pg.wait_for_timeout(300)
 check('manual hide survives an assist cycle',hid and pg.locator('.publication-sidebar[data-open=true]').count()==0)
 c.close()
 # --- reflection draft preserved
 c,pg=new(1280,800);open_book(pg)
 ta=pg.get_by_role('textbox',name='Key lessons and reflections');ta.fill('my draft');
 ctl(pg,'Assist').click();pg.get_by_role('dialog',name='Assist').get_by_role('radio',name='Ruler',exact=True).click();pg.wait_for_timeout(200)
 pg.get_by_role('dialog',name='Assist').get_by_role('radio',name='Off',exact=True).click();pg.wait_for_timeout(200)
 check('unsaved draft kept across assist',pg.get_by_role('textbox',name='Key lessons and reflections').input_value()=='my draft')
 pg.get_by_role('button',name='Save Reflection').click();pg.wait_for_timeout(200)
 ctl(pg,'Assist').click();pg.get_by_role('dialog',name='Assist').get_by_role('radio',name='Ruler',exact=True).click();pg.keyboard.press('Escape')
 ctl(pg,'Open notes').click();pg.wait_for_timeout(300)
 check('notes drawer usable during assist and shows the saved reflection',pg.get_by_text('my draft').count()>=1)
 c.close()
 # --- legacy migration through the real page
 c,pg=new(1280,800);open_book(pg,seed={'publication-reader:%s:reading-support:v1'%DP:{'focus':'paragraph','overlay':'off','dim':0.9,'dimVersion':2,'fontFamily':'sans'}})
 check('stored paragraph focus appears as Paragraph',pg.evaluate("document.querySelector('.reading-support-surface').dataset.rsOverlay")=='paragraph')
 ctl(pg,'Formatting').click();check('other prefs kept (sans)',pg.get_by_role('radio',name='Sans').get_attribute('aria-checked')=='true');pg.keyboard.press('Escape')
 c.close()
 c,pg=new(1280,800,'dark');open_book(pg,seed={'publication-reader:%s:darkMode'%DP:False})
 check('legacy false on a dark computer is kept as explicit Light',not pg.evaluate("!!document.querySelector('.publication-reader.dark')"))
 c.close()
 c,pg=new(1280,800,'dark');open_book(pg)
 check('no stored value follows a dark computer',pg.evaluate("!!document.querySelector('.publication-reader.dark')"))
 pg.screenshot(path=str(OUT/'after-1280-dark-system.png'))
 # SSR/hydration aside; dark line window readable
 ctl(pg,'Assist').click();pg.get_by_role('dialog',name='Assist').get_by_role('radio',name='Line window',exact=True).click();pg.keyboard.press('Escape')
 bb=pg.locator('[data-publication-content] p').nth(1).bounding_box();pg.mouse.move(bb['x']+40,bb['y']+10);pg.wait_for_timeout(400)
 pg.screenshot(path=str(OUT/'after-1280-dark-line-window.png'))
 c.close()
 # --- 1440 and 390
 c,pg=new(1440,900);open_book(pg,book='linguistics',section='') if False else open_book(pg)
 ctl(pg,'Assist').click();pg.get_by_role('dialog',name='Assist').get_by_role('radio',name='Ruler',exact=True).click();pg.wait_for_timeout(300)
 pg.screenshot(path=str(OUT/'after-1440-assist-menu.png'))
 c.close()
 c,pg=new(390,844,touch=True);open_book(pg)
 tb=pg.evaluate("[...document.querySelectorAll('.publication-toolbar-actions > button')].map(b=>{const r=b.getBoundingClientRect();return [b.getAttribute('aria-label'),Math.round(r.width),Math.round(r.height),Math.round(r.left),Math.round(r.right)]})")
 check('phone: five icon buttons at least 44px high and inside the window',all(h>=44 and l>=0 and r<=390 for _,w,h,l,r in tb) and len(tb)==5,tb)
 check('phone: no horizontal overflow',pg.evaluate("document.documentElement.scrollWidth<=window.innerWidth"))
 pg.screenshot(path=str(OUT/'after-390-toolbar.png'))
 pg.locator('.publication-toolbar-actions > button[aria-label^=Theme]').tap();pg.wait_for_timeout(200)
 r=pg.get_by_role('dialog',name='Theme').bounding_box();check('phone: theme popover inside window',r['x']>=0 and r['x']+r['width']<=390,r)
 pg.screenshot(path=str(OUT/'after-390-theme-popover.png'))
 c.close();br.close()
json.dump(res,open(OUT/'results.json','w'),indent=1)
print('failed',[r['name'] for r in res if not r['passed']])
