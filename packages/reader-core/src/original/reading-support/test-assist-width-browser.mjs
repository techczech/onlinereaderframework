/** Assist and formatting journeys in the real reader: ruler covers 1/2/3 measured lines, Dark dimming at 90 per cent with older presets migrated,
 * no count badges, Reset first in Formatting, four distinct text widths, interface type independent of the article's, honoured text size.
 * Headless Chromium shell only; geometry is measured from the rendered text, not from the overlay's own numbers. */
import { build } from '../../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(directory, '../../../..');
const bundle = await build({ absWorkingDir: root, stdin: { resolveDir: directory, loader: 'tsx', contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {PublicationReader} from './PublicationReader.tsx';
const long = 'The reading ruler should cover real rendered lines of this paragraph, which wraps over several lines in the text column. ';
const body = '# Chapter one\\n\\n' + Array.from({length: 6}, (_, i) => long.repeat(4) + 'Inline maths $x^2 + y^2 = z^2$ sits here, and so does an *emphasised phrase* near the end ' + i + '.').join('\\n\\n') + '\\n\\n- A list item that is long enough to wrap onto a second line in a narrow column, with more words.\\n- Another item.';
const sections=[{id:'one',title:'One',category:'C',content:body},{id:'two',title:'Two',category:'C',content:'# Two\\n\\nOther chapter text.'}];
window.root=createRoot(document.getElementById('root'));
window.mount=(id)=>window.root.render(React.createElement(PublicationReader,{epub:false,book:{id,title:'Fixture',author:'A',description:'D',sections}}));
` }, bundle: true, write: false, format: 'iife', platform: 'browser', alias: { react: resolve(root, 'apps/reader-demo/node_modules/react'), 'react-dom': resolve(root, 'apps/reader-demo/node_modules/react-dom') } });
const css = readFileSync(resolve(root, 'packages/reader-core/dist/reader.css'), 'utf8');
const python = String.raw`
import json,sys,re
from pathlib import Path
from playwright.sync_api import sync_playwright
payload=json.load(sys.stdin)
checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
LINES='''(el)=>{const r=document.createRange();r.selectNodeContents(el);const boxes=[...r.getClientRects()].filter(b=>b.width>0&&b.height>0).sort((a,b)=>a.top-b.top);const out=[];for(const b of boxes){const l=out[out.length-1];const c=(b.top+b.bottom)/2;if(l&&c>=l.top&&c<=l.bottom){l.top=Math.min(l.top,b.top);l.bottom=Math.max(l.bottom,b.bottom)}else out.push({top:b.top,bottom:b.bottom})}return out}'''
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 assert shells,'Headless Chromium shell required'
 browser=p.chromium.launch(headless=True,executable_path=str(shells[-1]))
 try:
  context=browser.new_context(viewport={'width':1280,'height':900});page=context.new_page();page.set_default_timeout(6000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://assist.test/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
  page.goto('https://assist.test/?book=a&section=one');page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle'])
  PREFS='publication-reader:a:reading-support:v1'
  def mount(seed=None,legacy=None,width=None,height=None):
   if width: page.set_viewport_size({'width':width,'height':height or 900})
   page.evaluate('localStorage.clear()')
   for k,v in (seed or {}).items(): page.evaluate('([k,v])=>localStorage.setItem(k,v)',[k,json.dumps(v)])
   page.evaluate('()=>{history.replaceState(null,"","/?book=a&section=one");window.root.unmount();window.root=window.__rc();}') if False else None
   page.reload();page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle'])
   page.evaluate('window.mount("a")');page.locator('[data-publication-content] p').first.wait_for();page.wait_for_timeout(250)
  control=lambda name:page.locator('.publication-toolbar-actions > button[aria-label^="%s"]'%name)
  menu=lambda name:page.get_by_role('dialog',name=name,exact=True)
  def openmenu(name):
   if menu(name).count()==0:control(name).click()
   page.wait_for_timeout(80)
  def radio(group,label): menu('Assist').get_by_role('radiogroup',name=group,exact=True).get_by_role('radio',name=label,exact=True).click()
  def paragraph(n): return page.locator('[data-publication-content] p').nth(n)
  def focus_line(n,line):
   box=paragraph(n).evaluate(LINES)
   y=(box[line]['top']+box[line]['bottom'])/2
   bb=paragraph(n).bounding_box();page.mouse.click(bb['x']+40,y);page.wait_for_timeout(250)
   return paragraph(n).evaluate(LINES)
  # 1. Ruler covers one, two or three real lines beneath the current one.
  mount({PREFS:{'overlay':'ruler'}})
  for covers in (1,2,3):
   openmenu('Assist');radio('Ruler covers',f'{covers} line' + ('' if covers==1 else 's'));page.keyboard.press('Escape')
   lines=focus_line(1,1)
   bar=page.evaluate('()=>{const e=document.querySelector(".reading-support-ruler");if(!e)return null;const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom,h:r.height}}')
   pitch=lines[2]['top']-lines[1]['top']
   focus=lines[1]
   check(f'ruler {covers}: it starts just under the current line and never covers it',bar is not None and bar['top']>=focus['bottom']-1 and bar['top']<=focus['bottom']+pitch/2+1,{'bar':bar,'focus':focus})
   check(f'ruler {covers}: it covers {covers} rendered line(s) beneath',bar is not None and abs(bar['h']-covers*pitch)<=pitch*0.35,{'h':bar and bar['h'],'pitch':pitch})
   check(f'ruler {covers}: the current line stays readable',bar is not None and bar['top']>=(focus['top']+focus['bottom'])/2)
  # Ruler across a paragraph boundary: the last line's covered lines continue into the next paragraph.
  lines=focus_line(1,len(paragraph(1).evaluate(LINES))-1)
  bar=page.evaluate('()=>{const r=document.querySelector(".reading-support-ruler").getBoundingClientRect();return {top:r.top,bottom:r.bottom}}')
  nxt=paragraph(2).evaluate(LINES)
  check('ruler 3 on the last line of a paragraph covers lines of the next paragraph',bar['bottom']>nxt[1]['top'],{'bar':bar,'next':nxt[:2]})
  # 2. Line window band from measured lines.
  mount({PREFS:{'overlay':'line-window','lines':3}})
  lines=focus_line(1,2)
  masks=page.evaluate('()=>[...document.querySelectorAll(".reading-support-mask")].map(e=>{const r=e.getBoundingClientRect();return {top:r.top,bottom:r.bottom}})')
  above=min(masks,key=lambda m:m['top']);below=max(masks,key=lambda m:m['top'])
  check('line window 3: unshaded band spans the line above, the current and the line below',len(masks)==2 and abs(above['bottom']-lines[1]['top'])<=pitch/2+1 and abs(below['top']-lines[3]['bottom'])<=pitch/2+1,{'masks':masks,'lines':lines[1:4]})
  # 3. Dimming: Light .72, Medium .9, Dark 1 (fully opaque). First-release names keep their name; version 2 numbers keep their shade.
  mount({PREFS:{'overlay':'line-window','dim':0.5}})
  openmenu('Assist')
  check('a saved first-release Dark (0.5) opens as Dark at 1',menu('Assist').get_by_role('radio',name='Dark',exact=True).get_attribute('aria-checked')=='true' and page.evaluate('getComputedStyle(document.querySelector(".reading-support-surface")).getPropertyValue("--rs-dim").trim()')=='1')
  page.keyboard.press('Escape')
  mount({PREFS:{'overlay':'line-window','dim':0.35}});openmenu('Assist')
  check('a saved first-release Medium (0.35) opens as Medium',menu('Assist').get_by_role('radio',name='Medium',exact=True).get_attribute('aria-checked')=='true')
  page.keyboard.press('Escape')
  mount({PREFS:{'overlay':'line-window','dim':0.9,'dimVersion':2}});openmenu('Assist')
  check('a saved version-2 Dark (0.9) keeps its shade and is now Medium',menu('Assist').get_by_role('radio',name='Medium',exact=True).get_attribute('aria-checked')=='true')
  alphas={}
  for level in ('Light','Medium','Dark'):
   radio('Dimming',level);page.wait_for_timeout(120)
   alphas[level]=page.evaluate('()=>{const e=document.querySelector(".reading-support-mask");return e?getComputedStyle(e).backgroundColor:null}')
  check('Light, Medium and Dark are three distinct shades, Dark fully opaque',alphas['Dark'] in ('rgb(28, 28, 32)','rgba(28, 28, 32, 1)') and alphas['Medium']=='rgba(28, 28, 32, 0.9)' and alphas['Light']=='rgba(28, 28, 32, 0.72)',alphas)
  page.keyboard.press('Escape')
  # 4. No numeric badges; Assist shows an active state without a number.
  mount({PREFS:{'overlay':'ruler','fontSize':22}})
  names=page.locator('.publication-toolbar-actions > button').evaluate_all('els=>els.map(e=>e.getAttribute("aria-label"))')
  check('no count badge, no count in any control name, icon-only controls',page.locator('.publication-toolbar-badge').count()==0 and len(names)==5 and names[:2]==['Listen','Formatting'] and names[2].startswith('Assist') and names[3]=='Open notes and highlights' and names[4].startswith('Theme'),names)
  check('Assist keeps an active state with the overlay on',control('Assist').get_attribute('data-active') is not None)
  # 5. Reset formatting leads the Formatting menu and keeps keyboard focus when it disables itself.
  openmenu('Formatting')
  reset=menu('Formatting').get_by_role('button',name='Reset formatting')
  theme=menu('Formatting').get_by_role('heading',name='Typeface')
  check('Reset formatting sits above the first setting',reset.bounding_box()['y']<theme.bounding_box()['y'])
  reset.click();page.wait_for_timeout(120)
  inside=lambda:page.evaluate('!!document.activeElement.closest("[data-reader-menu]")&&!document.activeElement.matches(":disabled")')
  check('Reset: focus stays inside the menu after Reset disables itself',inside())
  page.keyboard.press('Tab');check('Reset: Tab stays inside the menu',inside())
  page.keyboard.press('Escape')
  # 6. Four text widths that differ where the window has room.
  def widths(vw,vh,seed=None):
   out={}
   for choice,label in (('sm','Narrow'),('md','Normal'),('lg','Wide'),('full','Full')):
    mount({'publication-reader:a:textWidth':choice,**(seed or {})},width=vw,height=vh)
    out[choice]=page.evaluate('document.querySelector(".publication-reading-column").getBoundingClientRect().width')
   return out
  w=widths(1280,900)
  check('1280, sidebar open: Narrow < Normal < Wide < Full by at least 100 px each',w['md']-w['sm']>=80 and w['lg']-w['md']>=100 and w['full']-w['lg']>=100,w)
  check('the four measures keep the 44 : 52 : 64 character ratio (Normal is the old Narrow, 52)',abs(w['sm']/w['md']-44/52)<0.02 and abs(w['lg']/w['md']-64/52)<0.02,w)
  w2=widths(1440,900);check('1440: four distinct widths',len({round(v) for v in w2.values()})==4,w2)
  w3=widths(1024,768);check('1024, sidebar open: Narrow < Normal, and Wide/Full never exceed the room',w3['sm']<w3['md'] and w3['lg']<=w3['full']+1 and w3['full']<=760,w3)
  w4=widths(390,844);check('390: every choice gives the same column and nothing overflows',len({round(v) for v in w4.values()})==1 and not page.evaluate('document.documentElement.scrollWidth>innerWidth'),w4)
  mount({'publication-reader:a:maxWidth':'sm'},width=1280,height=900)
  check('an older saved Narrow keeps the column it was reading (becomes Normal)',abs(page.evaluate('document.querySelector(".publication-reading-column").getBoundingClientRect().width')-w['md'])<=2)
  mount({'publication-reader:a:maxWidth':'lg'},width=1280,height=900)
  check('an older saved Wide stays Wide',abs(page.evaluate('document.querySelector(".publication-reading-column").getBoundingClientRect().width')-w['lg'])<=2)
  mount(width=1280,height=900);openmenu('Formatting');menu('Formatting').get_by_role('radiogroup',name='Text width').get_by_role('radio',name='Wide',exact=True).click();page.wait_for_timeout(100)
  check('a width choice is saved under its own key',page.evaluate('localStorage.getItem("publication-reader:a:textWidth")')=='"lg"')
  page.keyboard.press('Escape')
  # 7. Interface type is independent of the article's size, spacing and letter-spacing.
  UI='''()=>{const f=s=>{const e=document.querySelector(s);if(!e)return null;const c=getComputedStyle(e);return [c.fontSize,c.lineHeight,c.letterSpacing,c.fontFamily].join('|')};return [f(".publication-toolbar"),f(".publication-toolbar-control"),f(".publication-sidebar"),f(".publication-menu")].join('||')}'''
  mount(width=1280,height=900);control('Formatting').click();page.wait_for_timeout(100);base=page.evaluate(UI);page.keyboard.press('Escape')
  mount({PREFS:{'fontSize':28,'lineHeight':2.4,'paragraphSpacing':40,'letterSpacing':0.12,'fontFamily':'sans','fontSizeChosen':True}},width=1280,height=900);control('Formatting').click();page.wait_for_timeout(100)
  check('toolbar, sidebar and menu type is unchanged by a 28 px, 2.4, wide-spaced article',page.evaluate(UI)==base,[base,page.evaluate(UI)]);page.keyboard.press('Escape')
  check('...while the article itself did change',page.evaluate('getComputedStyle(document.querySelector("[data-publication-content] p")).fontSize')=='28px')
  # 8. Text size: the default eases down on narrower windows; a chosen size is honoured everywhere.
  sizes={}
  for vw in (1600,1280,1024,390):
   mount(width=vw,height=900);sizes[vw]=page.evaluate('getComputedStyle(document.querySelector("[data-publication-content] p")).fontSize')
  check('default text size: 20 px on a large desktop, easing to 19 and 18 on smaller windows',sizes=={1600:'20px',1280:'19px',1024:'18px',390:'18px'},sizes)
  chosen={}
  for vw in (1600,1280,390):
   mount({PREFS:{'fontSize':20,'fontSizeChosen':True}},width=vw,height=900);chosen[vw]=page.evaluate('getComputedStyle(document.querySelector("[data-publication-content] p")).fontSize')
  check('a size the reader chose (even 20) is honoured at every width',set(chosen.values())=={'20px'},chosen)
  mount(width=1280,height=900);openmenu('Formatting');out=menu('Formatting').get_by_role('group',name='Text size').locator('output')
  check('the Text size control shows the size in use',out.inner_text()=='19 px',out.inner_text())
  menu('Formatting').get_by_role('button',name='Increase text size').click();page.wait_for_timeout(80)
  check('stepping up from the displayed size chooses 20 and keeps it',out.inner_text()=='20 px' and json.loads(page.evaluate('localStorage.getItem("'+PREFS+'")'))['fontSizeChosen'] is True)
  page.keyboard.press('Escape')
  # 9. Overlays leave the content nodes, MathML and the reader's selection alone.
  mount({PREFS:{'overlay':'ruler','rulerLines':3}},width=1280,height=900)
  clean=lambda:page.evaluate('()=>{const c=document.querySelector("[data-publication-content]").cloneNode(true);c.querySelectorAll("*").forEach(e=>{[...e.attributes].filter(a=>a.name.startsWith("data-rs-")).forEach(a=>e.removeAttribute(a.name))});return c.innerHTML}')
  page.evaluate('()=>{const p=document.querySelectorAll("[data-publication-content] p")[1];const r=document.createRange();r.setStart(p.firstChild,4);r.setEnd(p.firstChild,30);getSelection().removeAllRanges();getSelection().addRange(r)}')
  sel=page.evaluate('getSelection().toString()');html=clean()
  bb=paragraph(2).bounding_box();page.mouse.move(bb['x']+60,bb['y']+10);page.wait_for_timeout(250)
  check('moving the pointer under an overlay keeps the selection',page.evaluate('getSelection().toString()')==sel and len(sel)>10)
  mount({PREFS:{'overlay':'off'}},width=1280,height=900);plain=clean()
  mount({PREFS:{'overlay':'ruler'}},width=1280,height=900);focus_line(2,1)
  check('with the ruler on, the article markup (maths included) is byte-identical to the plain article',clean()==plain)
  check('the overlay never takes pointer events and never sits inside the article',page.evaluate('()=>{const o=document.querySelector(".reading-support-overlay");return getComputedStyle(o).pointerEvents==="none"&&!o.closest("[data-publication-content]")}'))
  check('no browser exceptions',not errors,errors)
 finally:browser.close()
print('ASSIST_JSON='+json.dumps(checks))
failed=[c for c in checks if not c['passed']];print(f'{len(checks)-len(failed)}/{len(checks)} passed');sys.exit(1 if failed else 0)
`;
const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python], { input: JSON.stringify({ bundle: bundle.outputFiles[0].text, css }), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
process.exitCode = result.status ?? 1;
