import json, sys
from pathlib import Path
SHELL=max((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'), key=lambda p:int(p.parents[1].name.rsplit('-',1)[1]))
from playwright.sync_api import sync_playwright
BASE='http://127.0.0.1:8773/'
ABBOT='2014-11-26-abbot-costello-who-s-on-first-with-a-pragmatic-or-other-linguistic-per'
OUT=sys.argv[1]
res={}
JS_SCROLLERS='''() => [...document.querySelectorAll('*')].filter(e=>{const s=getComputedStyle(e);return /(auto|scroll)/.test(s.overflowY)}).map(e=>({cls:(e.className||'').toString().slice(0,60),tag:e.tagName,ch:e.clientHeight,sh:e.scrollHeight,st:Math.round(e.scrollTop),scrolls:e.scrollHeight>e.clientHeight+1}))'''
def state(p):
    return p.evaluate('''() => {const a=document.querySelector('aside.publication-sidebar'); const inner=a&&a.querySelector(':scope > div.flex-1');
      const m=document.querySelector('.publication-scroll'); const act=document.querySelector('aside [aria-current=page]');
      const r=act&&act.getBoundingClientRect(); const ir=inner&&inner.getBoundingClientRect();
      return {asideTop:a&&Math.round(a.scrollTop), innerTop:inner&&Math.round(inner.scrollTop), innerH:inner&&inner.clientHeight, innerSH:inner&&inner.scrollHeight,
        mainTop:m&&Math.round(m.scrollTop), docTop:Math.round(document.scrollingElement.scrollTop), focus:(document.activeElement.textContent||'').trim().slice(0,50)+' <'+document.activeElement.tagName+'>',
        activeVisible: r&&ir? (r.top>=ir.top && r.bottom<=ir.bottom):null, activeTop:r&&Math.round(r.top), rows:a?a.querySelectorAll('nav button').length:0}}''')
with sync_playwright() as pw:
    b=pw.chromium.launch(headless=True, executable_path=str(SHELL))
    for W,H in [(1440,900)]:
        p=b.new_page(viewport={'width':W,'height':H})
        p.goto(BASE+'?book=linguistics&section='+ABBOT); p.wait_for_timeout(1200)
        res['deeplink']=state(p); res['scrollers']=p.evaluate(JS_SCROLLERS)
        res['header']=p.evaluate('''() => {const a=document.querySelector('aside.publication-sidebar'); const h=a.querySelector(':scope > div.p-4'); const id=a.querySelector('.publication-sidebar-identity')?.closest('div.p-6'); return {fixedHeaderH:h&&h.offsetHeight, identityBlockH:id&&id.offsetHeight, asideH:a.clientHeight}}''')
        p.screenshot(path=OUT+'/obs-1440-deeplink.png')
        # wheel over sidebar
        p.mouse.move(130,600); p.mouse.wheel(0,600); p.wait_for_timeout(500); res['wheelSidebar']=state(p)
        p.mouse.wheel(0,40000); p.wait_for_timeout(800); res['wheelSidebarEnd']=state(p)
        p.mouse.wheel(0,600); p.wait_for_timeout(500); res['wheelSidebarPastEnd']=state(p)
        # wheel over article
        p.mouse.move(800,500); p.mouse.wheel(0,400); p.wait_for_timeout(500); res['wheelArticle']=state(p)
        # click a chapter mid tree and keyboard
        p.goto(BASE+'?book=linguistics&section='+ABBOT); p.wait_for_timeout(1000)
        p.mouse.move(130,600); p.mouse.wheel(0,500); p.wait_for_timeout(400)
        before=state(p)
        btns=p.locator('aside nav button[aria-current!=page]')
        target=p.locator('aside nav button', has_text='Can every language express any lexical aspect').first
        if target.count()==0:
            # pick a visible sibling below active
            target=p.locator('aside nav button').nth(40)
        res['clickTarget']=target.inner_text()[:60]
        target.click(); p.wait_for_timeout(1200); res['afterClick']=state(p); res['beforeClick']=before
        for k in ['PageDown','Space','ArrowDown']:
            s0=state(p); p.keyboard.press(k); p.wait_for_timeout(700); res['key_'+k]={'before':s0,'after':state(p),'url':p.url.split('section=')[-1][:50]}
        # parent row click: Phonetics group title
        p.goto(BASE+'?book=linguistics&section='+ABBOT); p.wait_for_timeout(1000)
        grp=p.locator('aside nav button', has_text='Typology').first
        res['parentRow']={'box':grp.bounding_box()}
        grp.click(); p.wait_for_timeout(900)
        res['parentRow'].update({'url':p.url.split('?')[-1][:120],'expandedButtons':p.locator('aside [aria-expanded=true]').count(),'h1':p.locator('.publication-article h1').first.inner_text() if p.locator('.publication-article h1').count() else None})
        chev=p.locator('aside button[aria-label^="Expand Typology"], aside button[aria-label^="Collapse Typology"]').first
        res['chevronBox']=chev.bounding_box() if chev.count() else None
        p.screenshot(path=OUT+'/obs-1440-after-parent-click.png')
        # go home then back: sidebar persistence
        p.goto(BASE+'?book=linguistics&section='+ABBOT); p.wait_for_timeout(1000)
        p.mouse.move(130,600); p.mouse.wheel(0,800); p.wait_for_timeout(400); s1=state(p)
        p.locator('aside button', has_text='Home').first.click(); p.wait_for_timeout(900); s2=state(p)
        p.keyboard.press('s'); p.wait_for_timeout(400); p.keyboard.press('s'); p.wait_for_timeout(600); s3=state(p)
        res['persist']={'scrolled':s1,'afterHome':s2,'afterToggleS':s3}
        p.close()
    for W,H in [(1100,800),(1024,768),(1023,768),(390,844)]:
        p=b.new_page(viewport={'width':W,'height':H})
        p.goto(BASE+'?book=linguistics&section='+ABBOT); p.wait_for_timeout(1200)
        r=p.evaluate('''() => {const c=document.querySelector('.publication-reading-column'); const a=document.querySelector('aside.publication-sidebar'); const l=document.querySelector('.publication-local-contents');
          return {column:c&&Math.round(c.getBoundingClientRect().width), sidebar:a?Math.round(a.getBoundingClientRect().width):0, sidebarOpenVisible:a?getComputedStyle(a).transform:null, localRail:l?getComputedStyle(l).display:null, toolbarH:document.querySelector('.publication-toolbar').offsetHeight}}''')
        r.update(state(p)); res['w%d'%W]=r
        p.screenshot(path=OUT+'/obs-%d.png'%W)
        p.close()
    for book in ['deliberate-practice','language-muscle']:
        p=b.new_page(viewport={'width':1440,'height':900})
        p.goto(BASE+'?book='+book); p.wait_for_timeout(900)
        p.locator('.publication-home-contents button').nth(2).click(); p.wait_for_timeout(900)
        res[book]=state(p); res[book]['column']=p.evaluate("()=>Math.round(document.querySelector('.publication-reading-column').getBoundingClientRect().width)")
        res[book]['localRail']=p.evaluate("()=>{const l=document.querySelector('.publication-local-contents');return l?[...l.querySelectorAll('a')].map(a=>a.textContent.trim().slice(0,40)).slice(0,6):null}")
        p.screenshot(path=OUT+'/obs-1440-%s.png'%book)
        p.close()
    b.close()
print(json.dumps(res,indent=1))
