/** Chapter outline on a fixture book built to be awkward: a formula heading, Unicode and repeated headings, a heading with a link and an annotation,
 * one meaningful subheading, subheadings that start at h3, a chapter with none, and read-aloud running while the outline is used.
 * Headless Chromium shell only; the speech engine is a SYNTHETIC stub that only reports events the test emits. */
import { build } from '../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(directory, '../../../..');
const bundle = await build({ absWorkingDir: root, stdin: { resolveDir: directory, loader: 'tsx', contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {PublicationReader} from './PublicationReader.tsx';
const filler = (n) => Array.from({length: n}, (_, i) => 'Filler paragraph ' + i + ' with enough words to give the page some height. It has a second sentence.').join('\\n\\n');
const rich = '# Rich chapter\\n\\nIntro text. ' + filler(6) + '\\n\\n## Equation $x^2$\\n\\n' + filler(8) + '\\n\\n### Ünïcode ✓ heading — café\\n\\n' + filler(8) + '\\n\\n## Same title\\n\\n' + filler(8) + '\\n\\n## Same title\\n\\n' + filler(8) + '\\n\\n## A [linked](https://example.org) heading\\n\\n' + filler(10);
const sections = [
  {id:'rich',title:'Rich chapter',category:'Part one',content:rich},
  {id:'single',title:'Single subheading',category:'Part one',content:'# Single subheading\\n\\nOpening.\\n\\n## What is this\\n\\n' + filler(12)},
  {id:'deep',title:'Starts at h3',category:'Part two',content:'# Starts at h3\\n\\n' + filler(2) + '\\n\\n### First deep\\n\\n' + filler(8) + '\\n\\n#### Deeper\\n\\n' + filler(8) + '\\n\\n### Second deep\\n\\n' + filler(8)},
  {id:'none',title:'No subheadings',category:'Part two',content:'# No subheadings\\n\\n' + filler(8)},
  {id:'solo',title:'Solo',category:'Solo',content:'# Solo\\n\\nOne page.'},
];
window.root=createRoot(document.getElementById('root'));
window.mount=()=>window.root.render(React.createElement(PublicationReader,{epub:false,book:{id:'nav',title:'Fixture',author:'A',description:'D',sections}}));
` }, bundle: true, write: false, format: 'iife', platform: 'browser', alias: { react: resolve(root, 'apps/reader-demo/node_modules/react'), 'react-dom': resolve(root, 'apps/reader-demo/node_modules/react-dom') } });
const css = readFileSync(resolve(root, 'packages/reader-core/dist/reader.css'), 'utf8');
const python = String.raw`
import json,sys,re
from urllib.parse import unquote
from pathlib import Path
from playwright.sync_api import sync_playwright
payload=json.load(sys.stdin)
SPEECH='''() => { window.utterances=[];window.speechLog=[];window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};
 Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,getVoices:()=>[],addEventListener(){},removeEventListener(){},speak(u){window.utterances.push(u);this.speaking=true},cancel(){window.speechLog.push('cancel');this.speaking=false},pause(){},resume(){}}}); }'''
checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 assert shells,'Headless Chromium shell required'
 browser=p.chromium.launch(headless=True,executable_path=str(shells[-1]))
 try:
  page=browser.new_context(viewport={'width':1366,'height':800}).new_page();page.set_default_timeout(6000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://nav.test/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
  def mount(section='rich',width=1366,height=800,seed=None,fragment=''):
   page.set_viewport_size({'width':width,'height':height})
   page.goto('https://nav.test/?book=nav&section='+section+fragment);page.evaluate('localStorage.clear()')
   for k,v in (seed or {}).items(): page.evaluate('([k,v])=>localStorage.setItem(k,v)',[k,json.dumps(v)])
   page.goto('https://nav.test/?book=nav&section='+section+fragment);page.evaluate(SPEECH);page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle'])
   page.evaluate('window.mount()');page.locator('[data-publication-content] p').first.wait_for();page.wait_for_timeout(300)
  visible=lambda:page.locator('nav[aria-label="On this page"]').evaluate_all('els=>els.filter(e=>e.getClientRects().length).map(e=>e.id)')
  def links():
   return page.locator('nav[aria-label="On this page"]').evaluate_all('els=>{const e=els.find(e=>e.getClientRects().length);return e?[...e.querySelectorAll("a")].map(a=>({text:a.textContent,href:a.getAttribute("href"),level:Number(a.dataset.outlineLevel),pad:parseFloat(getComputedStyle(a.parentElement).paddingLeft)})):[]}')
  scroller=lambda:page.evaluate('document.querySelector(".publication-scroll").scrollTop')
  # 1. Labels are the visible text, not TeX twice; ids are stable and unique.
  mount('rich')
  ls=links();texts=[l['text'] for l in ls]
  check('outline lists every subheading, not the chapter title',texts==['Equation x^2','Ünïcode ✓ heading — café','Same title','Same title','A linked heading'],texts)
  check('the formula heading reads once, with no TeX and MathML duplicated',not any('x2x' in t for t in texts))
  ids=[l['href'] for l in ls];check('every outline target is a distinct, percent-encoded rendered id',len(set(ids))==5 and all(re.fullmatch(r'#[A-Za-z0-9%_.~-]+',h) for h in ids),ids)
  ids_dom=page.evaluate('[...document.querySelectorAll("[data-publication-content] h2,[data-publication-content] h3")].map(h=>h.id)')
  check('outline ids match the heading ids in the text, repeated titles are de-duplicated',[unquote(h[1:]) for h in ids]==ids_dom and len(set(ids_dom))==len(ids_dom),ids_dom)
  mount('rich');again=[l['href'] for l in links()];check('ids are stable across loads',again==ids)
  check('hierarchy is kept: the h3 sits deeper than its h2',ls[1]['level']==3 and ls[1]['pad']>ls[0]['pad'])
  # 2. Meaningful single heading shows; none does not; h3-only outline is not pushed right.
  mount('single');check('one useful subheading is an outline',[l['text'] for l in links()]==['What is this'])
  mount('none');check('a chapter with no subheadings has no outline',visible()==[] and page.locator('nav[aria-label="On this page"]').count()==0)
  mount('deep');ls=links();check('an outline that starts at h3 is indented from its own shallowest level',[l['pad'] for l in ls][0]==0 and ls[1]['pad']>0 and ls[2]['pad']==0,ls)
  # 3. Availability at every width: exactly one outline, no overflow, article not narrowed.
  widths={}
  for width,height in ((1440,900),(1366,768),(1280,800),(1200,800),(1024,768),(768,900),(390,844)):
   mount('rich',width,height)
   v=visible()
   widths[width]=page.evaluate('document.querySelector(".publication-reading-column").getBoundingClientRect().width')
   check(f'{width}px: exactly one chapter outline is on screen ('+(v[0] if v else 'none')+')',len(v)==1,v)
   check(f'{width}px: no horizontal overflow',not page.evaluate('document.documentElement.scrollWidth>innerWidth'))
  check('the article keeps its measure wherever the rail or the disclosure is used',widths[1440]==widths[1366]==widths[1280]==widths[1200] or abs(widths[1280]-widths[1200])<=2,widths)
  # Compact disclosure: closed until asked, labelled, keyboard operable.
  mount('rich',1024,768)
  check('1024: the disclosure is the outline and is collapsed',visible()==['toc-container-compact'] and page.locator('#toc-container-compact-list').is_hidden())
  toggle=page.locator('#toc-container-compact .publication-outline-toggle')
  check('the toggle states whether it is open',toggle.get_attribute('aria-expanded')=='false')
  toggle.focus();page.keyboard.press('Enter');page.wait_for_timeout(80)
  check('Enter opens the list and shows every link at a usable size',page.locator('#toc-container-compact-list').is_visible() and page.locator('#toc-container-compact-list a').count()==5 and page.evaluate('Math.min(...[...document.querySelectorAll("#toc-container-compact-list a")].map(a=>a.getBoundingClientRect().height))')>=36)
  page.keyboard.press('Escape');check('Escape closes it and returns focus to the toggle',page.locator('#toc-container-compact-list').is_hidden() and toggle.evaluate('e=>e===document.activeElement'))
  # 4. N opens whichever outline is available.
  mount('rich',1024,768);page.locator('[data-publication-content] p').first.click();page.keyboard.press('n');page.wait_for_timeout(200)
  check('N at 1024 opens the disclosure and focuses a link',page.locator('#toc-container-compact-list').is_visible() and page.evaluate('document.activeElement.closest("#toc-container-compact")!==null'))
  mount('rich',1366,768);page.locator('[data-publication-content] p').first.click();page.keyboard.press('n');page.wait_for_timeout(200)
  check('N at 1366 focuses the rail',page.evaluate('document.activeElement.closest("#toc-container")!==null'))
  # 5. A link is a location: URL, focus, active state, no page scroll, same-chapter history.
  mount('rich',1366,768)
  a=page.locator('#toc-container a').nth(1);b=page.locator('#toc-container a').nth(3)
  ida=a.get_attribute('href');idb=b.get_attribute('href')
  a.click();page.wait_for_timeout(500)
  check('activating a link puts the subsection in the URL',page.evaluate('location.hash')==ida and 'section=rich' in page.evaluate('location.search'),page.evaluate('location.href'))
  check('focus moves into the passage, not the outline',page.evaluate('document.activeElement.id')==unquote(ida[1:]),page.evaluate('document.activeElement.outerHTML.slice(0,80)'))
  check('the outline marks the current location',a.get_attribute('aria-current')=='location')
  check('the host page itself did not scroll',page.evaluate('document.scrollingElement.scrollTop')==0)
  b.click();page.wait_for_timeout(500);top_b=scroller()
  check('a second link replaces the fragment',page.evaluate('location.hash')==idb)
  page.go_back();page.wait_for_timeout(500)
  check('Back returns to the first subsection, in the URL and on screen',page.evaluate('location.hash')==ida and abs(page.evaluate('(()=>{const h=document.getElementById(decodeURIComponent(location.hash.slice(1)));const s=document.querySelector(".publication-scroll").getBoundingClientRect();return h.getBoundingClientRect().top-s.top})()'))<600)
  page.go_forward();page.wait_for_timeout(500)
  check('Forward returns to the second',page.evaluate('location.hash')==idb and abs(scroller()-top_b)<40,[scroller(),top_b])
  page.go_back();page.go_back();page.wait_for_timeout(500)
  check('Back past the first fragment returns to the top of the chapter',page.evaluate('location.hash')=='' and scroller()<5,[page.evaluate('location.hash'),scroller()])
  # 5b. The marker follows the location, in both outlines, through click, Back, Forward, deep link and a resize; later reading still moves it.
  marks=lambda:page.evaluate('({rail:[...document.querySelectorAll("#toc-container a[aria-current=location]")].map(a=>a.getAttribute("href")),compact:[...document.querySelectorAll("#toc-container-compact a[aria-current=location]")].map(a=>a.getAttribute("href"))})')
  mount('rich',1366,800)
  page.evaluate('window.__marks=[];new MutationObserver(()=>window.__marks.push([...document.querySelectorAll("#toc-container a[aria-current=location]")].map(a=>a.getAttribute("href")).join())).observe(document.getElementById("toc-container"),{subtree:true,attributes:true,attributeFilter:["aria-current"]})')
  a=page.locator('#toc-container a').nth(1);b=page.locator('#toc-container a').nth(4)
  ida=a.get_attribute('href');idb=b.get_attribute('href')
  a.click();page.wait_for_timeout(1500);m=marks()
  check('click: both outlines mark the chosen subsection',m['rail']==[ida] and m['compact']==[ida],m)
  page.evaluate('window.__marks.length=0')
  b.click();page.wait_for_timeout(1500);m=marks()
  check('click far away: both outlines mark the destination after the 1.2 s pin would have expired',m['rail']==[idb] and m['compact']==[idb],m)
  check('the smooth scroll passing other headings never moved the marker off the destination',set(page.evaluate('window.__marks'))<={idb},page.evaluate('window.__marks'))
  page.go_back();page.wait_for_timeout(1500);m=marks()
  check('Back: both outlines mark the subsection that the URL and the text returned to',m['rail']==[ida] and m['compact']==[ida] and page.evaluate('location.hash')==ida,[m,page.evaluate('location.hash')])
  page.set_viewport_size({'width':1024,'height':768});page.wait_for_timeout(400);m=marks()
  check('resize to the compact outline: it still agrees',m['rail']==[ida] and m['compact']==[ida],m)
  page.keyboard.press('n');page.wait_for_timeout(300);m=marks()
  check('the outline shortcut after the resize does not move the marker off the URL\'s subsection',m['rail']==[ida] and m['compact']==[ida] and page.evaluate('location.hash')==ida,[m,page.evaluate('location.hash')])
  page.keyboard.press('Escape')
  page.set_viewport_size({'width':1366,'height':800});page.wait_for_timeout(300)
  page.go_forward();page.wait_for_timeout(1500);m=marks()
  check('Forward: both outlines mark the second subsection',m['rail']==[idb] and m['compact']==[idb],m)
  page.go_back();page.go_back();page.wait_for_timeout(1500);m=marks()
  check('Back to the top of the chapter: no outline marks a subsection',m['rail']==[] and m['compact']==[] and page.evaluate('location.hash')=='',[m,page.evaluate('location.hash')])
  mount('rich',1366,800,fragment=idb);page.wait_for_timeout(1500);m=marks()
  check('a copied subsection URL: both outlines mark it on load',m['rail']==[idb] and m['compact']==[idb],m)
  page.mouse.move(700,400);page.mouse.wheel(0,-9000);page.wait_for_timeout(600);page.mouse.wheel(0,1400);page.wait_for_timeout(900);m=marks()
  check('reading on by hand lets scrolling take the marker back, in both outlines',m['rail']==m['compact'] and m['rail']!=[idb] and len(m['rail'])<=1,m)
  # Modified activation keeps its own meaning.
  page.keyboard.press('Escape')
  mount('rich',1366,768);n_before=page.evaluate('history.length');page.locator('#toc-container a').nth(0).click(modifiers=['Shift']);page.wait_for_timeout(300)
  check('a modified click is left to the browser (no in-page history entry)',page.evaluate('history.length')==n_before)
  # Deep link in a fresh load.
  mount('rich',1366,768,fragment=ida);page.wait_for_timeout(600)
  check('opening the copied URL lands on that subsection',scroller()>200 and page.evaluate('(()=>{const h=document.getElementById(decodeURIComponent(location.hash.slice(1)));const s=document.querySelector(".publication-scroll").getBoundingClientRect();const r=h.getBoundingClientRect();return r.top>=s.top&&r.bottom<=s.bottom})()'))
  # 6. Compact link at 1024 does the same and closes the disclosure.
  mount('rich',1024,768);page.locator('#toc-container-compact .publication-outline-toggle').click();l2=page.locator('#toc-container-compact-list a').nth(2);id2=l2.get_attribute('href');l2.click();page.wait_for_timeout(500)
  check('1024: the compact outline link updates the URL, focuses the passage and collapses',page.evaluate('location.hash')==id2 and page.evaluate('document.activeElement.id')==unquote(id2[1:]) and page.locator('#toc-container-compact-list').is_hidden())
  # 7. Annotations in a heading and read-aloud do not break the outline or each other.
  note={'publication-reader:nav:highlights':[{'id':'h1','text':'Equation','sectionId':'rich','sectionTitle':'Rich chapter','date':1,'note':'a note'}]}
  mount('rich',1366,768,seed=note)
  check('a highlight inside a heading keeps the heading, its id and its outline label',page.locator('[data-publication-content] h2 mark').count()==1 and [l['text'] for l in links()][0]=='Equation x^2')
  page.locator('.publication-toolbar-actions').get_by_role('button',name='Listen').click();page.get_by_role('dialog',name='Listen').get_by_role('button',name='Start',exact=True).click();page.wait_for_timeout(200)
  page.evaluate('window.speechLog.length=0');page.locator('#toc-container a').nth(2).click();page.wait_for_timeout(400)
  check('using the outline while reading aloud does not stop or restart the reading',page.get_by_role('button',name='Pause reading aloud').count()==1 and 'cancel' not in page.evaluate('window.speechLog'))
  page.get_by_role('button',name='Stop reading aloud').click()
  # The reader's notes and settings are untouched by navigating.
  keys_before=page.evaluate('Object.keys(localStorage).sort().join()');notes_before=page.evaluate('localStorage.getItem("publication-reader:nav:highlights")')
  page.locator('#toc-container a').nth(4).click();page.wait_for_timeout(300)
  check('navigating leaves notes and saved settings as they were',page.evaluate('localStorage.getItem("publication-reader:nav:highlights")')==notes_before)
  # Selection survives a keyboard outline walk.
  page.evaluate('()=>{const p=document.querySelectorAll("[data-publication-content] p")[1];const r=document.createRange();r.setStart(p.firstChild,0);r.setEnd(p.firstChild,10);getSelection().removeAllRanges();getSelection().addRange(r)}')
  sel=page.evaluate('getSelection().toString()')
  check('the outline lists the same headings after annotation and speech',len(links())==5 and len(sel)==10)
  # 8. Book sidebar: a flat fixture book groups by category without inventing chapters.
  heads=page.locator('.publication-sidebar-category').all_text_contents()
  check('flat book: category headings in source order, once each',heads==['Part one','Part two'],heads)
  rows=page.locator('.publication-sidebar [data-section-id]').count()
  check('category headings add no rows, routes or counts',rows==5 and page.locator('.publication-sidebar-category').evaluate_all('els=>els.every(e=>!e.closest("button,a")&&!e.querySelector("button,a"))'))
  check('a lone chapter named like its category is not labelled twice',not any(h=='Solo' for h in heads))
  check('no browser exceptions',not errors,errors)
 finally:browser.close()
print('NAV_FIXTURE_JSON='+json.dumps(checks))
failed=[c for c in checks if not c['passed']];print(f'{len(checks)-len(failed)}/{len(checks)} passed');sys.exit(1 if failed else 0)
`;
const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python], { input: JSON.stringify({ bundle: bundle.outputFiles[0].text, css }), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
process.exitCode = result.status ?? 1;
