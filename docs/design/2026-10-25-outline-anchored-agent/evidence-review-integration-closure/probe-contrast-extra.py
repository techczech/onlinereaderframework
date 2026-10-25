"""Extra repair probe for the Contrast finding: custom author colours on prose and on every excluded kind, inline and ignored, must be unchanged by
Contrast, and switching anchored reading Off must leave no inline style, variable or class behind. Uses the same source fixture as probe-browser-integration.py."""
import json,re,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent
payload=json.loads((HERE/'scratch/browser-fixture.json').read_text())
checks=[]
def check(name,passed,detail=None):
 checks.append(dict(name=name,passed=bool(passed),detail=detail));print(('PASS ' if passed else 'FAIL ')+name+' '+json.dumps(detail,ensure_ascii=False),flush=True)
SETUP='''()=>{const c=document.querySelector('[data-publication-content]');const p=c.querySelector('p');
 const add=(tag,text,attrs={})=>{const e=document.createElement(tag);e.textContent=text;for(const[k,v]of Object.entries(attrs))e.setAttribute(k,v);p.append(' ',e);return e};
 p.style.color='rgb(120, 40, 40)';
 const items={kbd:add('kbd','KBDX'),samp:add('samp','SAMPX'),ignored:add('span','IGNOREDX',{'data-reading-support-ignore':''}),inlineCode:add('code','INLINECODEX'),coloured:add('code','COLOUREDX')};
 items.coloured.style.color='rgb(0, 100, 200)';
 const math=c.querySelector('math');math.style.color='rgb(10, 120, 30)';items.math=math;
 const pre=document.createElement('pre');pre.textContent='PREX';c.append(pre);items.pre=pre;
 const sig=n=>n.nodeType===3?JSON.stringify(n.data):n.nodeType===1?`<${n.tagName}${[...n.attributes].filter(a=>!a.name.startsWith('data-rs-')).map(a=>` ${a.name}=${a.value}`).sort().join('')}>${[...n.childNodes].map(sig).join('')}</>`:'';const p2=document.createElement('p');p2.append('Plain paragraph with ');c.append(p2);for(const[k,v]of Object.entries({plainMath:c.querySelector('math').cloneNode(true),plainKbd:Object.assign(document.createElement('kbd'),{textContent:'K2'}),plainSamp:Object.assign(document.createElement('samp'),{textContent:'S2'}),plainIgnored:Object.assign(document.createElement('span'),{textContent:'I2'}),plainCode:Object.assign(document.createElement('code'),{textContent:'C2'})})){p2.append(v,' ');items[k]=v}items.plainIgnored.setAttribute('data-reading-support-ignore','');items.plainMath.removeAttribute('style');items.plainProse=p2;
 window.kinds=items;window.snapshot=()=>({colours:Object.fromEntries(Object.entries(window.kinds).map(([k,e])=>[k,getComputedStyle(e).color])),prose:getComputedStyle(p).color,html:sig(c),styleAttrs:[...c.querySelectorAll('[style]')].map(e=>e.getAttribute('style'))})}'''
try:
 with sync_playwright() as p:
  shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
  browser=p.chromium.launch(headless=True,executable_path=str(shell))
  try:
   page=browser.new_context(viewport={'width':1440,'height':900}).new_page();page.set_default_timeout(6000)
   page.route('https://fixture.example/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
   page.goto('https://fixture.example/sub/?book=fixture&section=one');page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle']);page.evaluate('mount()')
   page.locator('[data-publication-content] p').first.wait_for();page.wait_for_timeout(200)
   page.evaluate(SETUP);before=page.evaluate('snapshot()')
   page.get_by_role('button',name=re.compile(r'^Assist')).click();page.get_by_role('switch',name='Anchored reading',exact=True).click();page.keyboard.press('Escape');page.wait_for_timeout(250)
   on=page.evaluate('snapshot()')
   check('Contrast leaves every excluded kind at its exact existing colour (math, pre, kbd, samp, ignored, inline code, author-coloured code; in an author-coloured and in a plain paragraph)',on['colours']==before['colours'],{'before':before['colours'],'on':on['colours']})
   check('Contrast does not recolour the parent prose block and writes nothing to the markup (DOM signature ignoring the surface own data-rs-* marks)',on['prose']==before['prose'] and on['html']==before['html'] and on['styleAttrs']==before['styleAttrs'],{'prose':[before['prose'],on['prose']],'sameHtml':on['html']==before['html'],'sameStyle':on['styleAttrs']==before['styleAttrs'],'note':'DOM signature'})
   rest=page.evaluate("(()=>{const h=CSS.highlights.get('publication-anchored-rest'),l=CSS.highlights.get('publication-anchored-lead');const bad=[...(h||[]),...(l||[])].filter(r=>r.startContainer.parentElement.closest('pre,code,kbd,samp,math,[data-reading-support-ignore]')||r.endContainer.parentElement.closest('pre,code,kbd,samp,math,[data-reading-support-ignore]')).length;return {rest:h?h.size:0,lead:l?l.size:0,bad,restColour:getComputedStyle(document.querySelector('[data-publication-content] p'),'::highlight(publication-anchored-rest)').color}})()")
   check('eligible words have a lead and a softened rest highlight; none touches excluded content',rest['rest']>0 and rest['lead']>0 and rest['bad']==0 and rest['restColour']!=on['prose'],rest)
   page.get_by_role('button',name=re.compile(r'^Assist')).click();page.get_by_role('radio',name='Colour',exact=True).click();page.keyboard.press('Escape');page.wait_for_timeout(200)
   colour=page.evaluate('snapshot()')
   check('Colour style leaves every excluded kind and the prose block unchanged',colour['colours']==before['colours'] and colour['prose']==before['prose'] and colour['html']==before['html'])
   page.get_by_role('button',name=re.compile(r'^Assist')).click();page.get_by_role('switch',name='Anchored reading',exact=True).click();page.keyboard.press('Escape');page.wait_for_timeout(250)
   off=page.evaluate("({s:snapshot(),rest:!!CSS.highlights.get('publication-anchored-rest'),lead:!!CSS.highlights.get('publication-anchored-lead'),attr:document.querySelector('.reading-support-surface').dataset.rsAnchored??null})")
   check('Off removes both highlights and the mode, and leaves colours, markup and style attributes exactly as before',not off['rest'] and not off['lead'] and off['attr'] is None and off['s']['colours']==before['colours'] and off['s']['prose']==before['prose'] and off['s']['html']==before['html'] and off['s']['styleAttrs']==before['styleAttrs'],off['attr'])
  finally: browser.close()
except Exception as e:
 import traceback;traceback.print_exc();check('probe ran without exception',False,str(e))
(HERE/'contrast-extra-results.json').write_text(json.dumps({'checks':checks,'failures':sum(not x['passed'] for x in checks)},ensure_ascii=False,indent=2)+'\n')
sys.exit(1 if any(not x['passed'] for x in checks) else 0)
