/** Repair re-run of the independent review probe (copy of evidence-review-toolbar-2026-10-25.mjs; the original is untouched).
 * Only changes: PROBE_SRC / PROBE_OUT env variables, and the orphan-track step no longer requires an Open player button, which is now correctly absent.
 * Independent seam probes. Bundled Chromium only; speech is a state stub, never real voice evidence. */
import {build} from '../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import {readFileSync,mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const dir=dirname(fileURLToPath(import.meta.url)), root=resolve(dir,'../../..');
const bundle=await build({absWorkingDir:root,stdin:{resolveDir:resolve(root,process.env.PROBE_SRC??'packages/reader-core/src/original'),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {PublicationReader} from './PublicationReader.tsx';import {MarkdownRenderer} from './MarkdownRenderer.tsx';
const sections=[{id:'one',title:'One',category:'C',format:'html',content:'<h1>One</h1><p>Readable text with a formula <math><mi>x</mi><mo>=</mo><mn>2</mn></math>.</p>'+ '<p>More readable text.</p>'.repeat(50)},{id:'two',title:'Two',category:'C',content:'# Two\\n\\nOther chapter.'}];
window.root=createRoot(document.getElementById('root'));window.mount=(id,audio)=>window.root.render(<PublicationReader epub={false} audio={audio} book={{id,title:'Fixture',author:'A',description:'D',sections}}/>);
window.extra=()=>{window.extraRoot=createRoot(document.getElementById('extra'));window.extraRoot.render(<MarkdownRenderer content="Unrelated reader"/>)};window.removeExtra=()=>window.extraRoot.unmount();
`},bundle:true,write:false,format:'iife',platform:'browser',alias:{react:resolve(root,'apps/reader-demo/node_modules/react'),'react-dom':resolve(root,'apps/reader-demo/node_modules/react-dom')}});
const python=String.raw`
import json,sys,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
payload=json.load(sys.stdin); results=[]
def record(name,ok,detail=None):
 results.append(dict(name=name,passed=bool(ok),detail=detail));print(('PASS ' if ok else 'FAIL ')+name,flush=True)
SPEECH="""window.speechLog=[];window.utterances=[];window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],speak(u){window.utterances.push(u);window.speechLog.push('speak')},cancel(){window.speechLog.push('cancel')},pause(){window.speechLog.push('pause')},resume(){window.speechLog.push('resume')}}});"""
with sync_playwright() as p:
 shell=max((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'),key=lambda p:int(p.parents[1].name.rsplit('-',1)[1]))
 browser=p.chromium.launch(headless=True,executable_path=str(shell))
 try:
  page=browser.new_page(viewport=dict(width=1280,height=900));page.set_default_timeout(5000);errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://review.test/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div><div id="extra"></div>'))
  page.goto('https://review.test/?book=a&section=one');page.evaluate(SPEECH);page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle'])
  def mount(book='a',audio=None):
   page.evaluate('([id,audio])=>{history.replaceState(null,"","/?book="+id+"&section=one");window.mount(id,audio)}',[book,audio]);page.locator('[data-publication-content] p').first.wait_for();page.wait_for_timeout(100)
  def control(name):return page.locator('.publication-toolbar-actions > button').filter(has_text=name)
  def menu(name):return page.get_by_role('dialog',name=name,exact=True)
  def openmenu(name):
   if menu(name).count()==0:control(name).click()
  def state():return page.evaluate('({tag:document.activeElement.tagName,text:document.activeElement.textContent?.slice(0,60),label:document.activeElement.getAttribute("aria-label"),inMenu:!!document.activeElement.closest("[data-reader-menu]")})')
  page.evaluate('''()=>{localStorage.setItem('publication-reader:a:highlights',JSON.stringify([{id:'h',text:'Readable text',sectionId:'one',sectionTitle:'One',date:1,note:'Keep this note'}]));localStorage.setItem('publication-reader:a:reflections',JSON.stringify([{id:'r',content:'Keep reflection',sectionId:'one',sectionTitle:'One',date:1}]));localStorage.setItem('publication-reader:a:fontSize','"xl"');localStorage.setItem('publication-reader:a:lineHeight','"loose"');window.noteBytes=['highlights','reflections','fontSize','lineHeight'].map(f=>localStorage.getItem('publication-reader:a:'+f));}''')
  mount()
  record('legacy font size and line height are ignored',page.locator('[data-publication-content] p').first.evaluate('e=>[getComputedStyle(e).fontSize,getComputedStyle(e).lineHeight]')==['20px','34px'])
  record('four controls have approved order',[x for x in page.locator('.publication-toolbar-actions > button > span:last-child').all_text_contents()]==['Listen','Formatting','Assist','Notes'])
  openmenu('Formatting');menu('Formatting').get_by_role('button',name='Increase text size').click()
  page.keyboard.press('Escape');record('Escape returns focus',control('Formatting').evaluate('e=>e===document.activeElement'))
  openmenu('Assist');menu('Assist').get_by_role('radio',name='Ruler',exact=True).click();page.keyboard.press('Escape')
  openmenu('Formatting');menu('Formatting').get_by_role('button',name='Reset formatting').click();page.keyboard.press('Tab')
  record('Tab remains in Formatting after reset becomes disabled',state()['inMenu'],state())
  page.keyboard.press('Escape');openmenu('Assist')
  record('Formatting reset preserves Assist ruler',menu('Assist').get_by_role('radio',name='Ruler',exact=True).get_attribute('aria-checked')=='true')
  page.keyboard.press('Escape');openmenu('Formatting');menu('Formatting').get_by_role('button',name='Increase text size').click();page.keyboard.press('Escape')
  openmenu('Assist');menu('Assist').get_by_role('button',name='Turn all off').click();page.keyboard.press('Escape')
  record('Assist off preserves actual text size',page.locator('[data-publication-content] p').first.evaluate('e=>getComputedStyle(e).fontSize')=='21px')
  record('reset groups preserve note and legacy storage bytes',page.evaluate("JSON.stringify(window.noteBytes)===JSON.stringify(['highlights','reflections','fontSize','lineHeight'].map(f=>localStorage.getItem('publication-reader:a:'+f)))"))
  record('highlight remains decorated and reflection remains loaded',page.locator('[data-publication-highlight="h"]').count()>0 and page.get_by_role('textbox',name='Key lessons and reflections').input_value()=='Keep reflection')
  record('MathML survives settings updates',page.locator('[data-publication-content] math mi').text_content()=='x')
  openmenu('Listen');menu('Listen').get_by_role('button',name='Start',exact=True).click();page.keyboard.press('Escape');openmenu('Formatting')
  page.evaluate('window.speechLog=[]');menu('Formatting').get_by_role('button',name='Increase text size').click();page.keyboard.press('Escape')
  record('voice is not cancelled by menu and settings',page.evaluate('!window.speechLog.includes("cancel")'))
  page.evaluate('window.speechLog=[];window.extra()');page.wait_for_timeout(100)
  record('mounting another idle renderer does not cancel toolbar voice',page.evaluate('!window.speechLog.includes("cancel")'),page.evaluate('window.speechLog'))
  page.evaluate('window.speechLog=[];window.removeExtra()');page.wait_for_timeout(100)
  record('unmounting idle renderer does not cancel toolbar voice',page.evaluate('!window.speechLog.includes("cancel")'),page.evaluate('window.speechLog'))
  openmenu('Listen');menu('Listen').get_by_role('button',name='Stop',exact=True).click();page.keyboard.press('Tab')
  record('Tab remains in Listen after Stop disappears',state()['inMenu'],state())
  page.keyboard.press('Escape');openmenu('Listen');menu('Listen').get_by_role('button',name='Start',exact=True).click();page.wait_for_timeout(50)
  page.evaluate('window.oldUtterance=window.utterances.at(-1)');menu('Listen').get_by_role('button',name='Stop',exact=True).click();menu('Listen').get_by_role('button',name='Start',exact=True).click();page.wait_for_timeout(50)
  page.evaluate('window.oldUtterance.onerror({error:"canceled"})');page.wait_for_timeout(50)
  record('late canceled utterance cannot clear new playback state',page.get_by_role('button',name='Pause reading aloud').count()==1,dict(utterances=page.evaluate('window.utterances.length'),chip=page.locator('.publication-speech-status').count()))
  page.keyboard.press('Escape')
  mount('b',[dict(sectionId='missing',src='/valid.wav')]);openmenu('Listen')
  record('orphan section recording does not offer unusable player',menu('Listen').get_by_text('Recorded audiobook',exact=True).count()==0)
  (menu('Listen').get_by_role('button',name='Open player').click() if menu('Listen').get_by_role('button',name='Open player').count() else None);record('orphan track cannot open empty player',page.get_by_text('No recording for this book yet',exact=True).count()==0)
  page.keyboard.press('Escape');mount('c',[dict(sectionId='one',src='/valid.wav')])
  record('hidden recorded panel does not steal initial focus',page.evaluate('!document.activeElement.closest(".publication-listening-surface")'))
  openmenu('Listen');menu('Listen').get_by_role('button',name='Open player').click();record('visible player takes close-button focus',page.get_by_role('button',name='Close recorded audiobook').evaluate('e=>e===document.activeElement'))
  page.keyboard.press('Escape');record('recorded close returns to Listen',control('Listen').evaluate('e=>e===document.activeElement'))
  mount('a');record('book A formatting survives switch through B and C',page.locator('[data-publication-content] p').first.evaluate('e=>getComputedStyle(e).fontSize')=='22px')
  page.set_viewport_size(dict(width=390,height=800));openmenu('Formatting');record('phone menu is bottom-anchored',abs(menu('Formatting').bounding_box()['y']+menu('Formatting').bounding_box()['height']-800)<2)
  page.locator('.publication-menu-switch').get_by_role('button',name='Assist',exact=True).click();record('phone switch retains keyboard focus',state()['inMenu'],state());page.keyboard.press('Escape');record('phone switch Escape returns to active Assist control',control('Assist').evaluate('e=>e===document.activeElement'))
  # Outside pointerdown does not itself clear an existing selection.
  openmenu('Formatting');page.evaluate('''()=>{let p=document.querySelector('[data-publication-content] p'),r=document.createRange();r.selectNodeContents(p);getSelection().removeAllRanges();getSelection().addRange(r);window.selected=getSelection().toString();p.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true}));}''')
  record('outside pointerdown preserves selected text and closes menu',page.evaluate('getSelection().toString()===window.selected') and menu('Formatting').count()==0)
  # Real built books: check no player/empty contract, article model, DOM structure, book state.
  for book in ['linguistics','deliberate-practice','language-muscle']:
   page.goto('http://127.0.0.1:8773/?book='+book+'&section='+payload['sections'][book],wait_until='networkidle');page.locator('[data-publication-content]').wait_for()
   record(book+': four chapter controls, no empty player',page.locator('.publication-toolbar-actions > button').count()==4 and page.locator('.publication-listening-surface').count()==0)
  page.set_viewport_size(dict(width=1440,height=900));page.goto('http://127.0.0.1:8773/?book=linguistics&section=2014-11-26-abbot-costello-who-s-on-first-with-a-pragmatic-or-other-linguistic-per',wait_until='networkidle')
  page.evaluate('document.querySelector(".publication-sidebar-list").scrollTop+=70');page.wait_for_timeout(100)
  before=page.locator('.publication-sidebar-list').evaluate('e=>e.scrollTop');openmenu('Formatting');page.keyboard.press('Escape')
  record('toolbar menu preserves sidebar list scroll',abs(page.locator('.publication-sidebar-list').evaluate('e=>e.scrollTop')-before)<2)
  target=page.evaluate('''()=>{let l=document.querySelector('.publication-sidebar-list').getBoundingClientRect();return [...document.querySelectorAll('aside [data-section-id]')].find(e=>!e.hasAttribute('aria-expanded')&&!e.hasAttribute('aria-current')&&e.getBoundingClientRect().top>l.top+20&&e.getBoundingClientRect().bottom<l.bottom-10)?.getAttribute('data-section-id')}''')
  if target:
   page.locator('aside [data-section-id="'+target+'"]').click();page.wait_for_timeout(100)
   record('sidebar chapter change focuses article and resets article scroll',page.evaluate('!!document.activeElement.closest(".publication-article")&&document.querySelector(".publication-scroll").scrollTop===0'))
  else:record('sidebar chapter change fixture has visible alternative chapter',False)
  record('no browser exceptions',not errors,errors)
 finally:browser.close()
print('REVIEW_JSON='+json.dumps(results));sys.exit(1 if any(not r['passed'] for r in results) else 0)
`;
const books=JSON.parse(readFileSync(resolve(root,'apps/reader-demo/src/books/original-publications.json'),'utf8'));
const flatten=xs=>xs.flatMap(s=>[s,...flatten(s.children??[])]);
const sections=Object.fromEntries(books.map(b=>[b.id,flatten(b.sections).find(s=>s.content?.trim())?.id]));
const scratch=mkdtempSync(resolve(dir,'.review-toolbar-scratch-'));
try {
 const result=spawnSync(resolve(root,'../book-engine/.venv/bin/python'),['-c',python],{input:JSON.stringify({sections,bundle:bundle.outputFiles[0].text,css:readFileSync(resolve(root,'packages/reader-core/dist/reader.css'),'utf8')}),encoding:'utf8',env:{...process.env,TMPDIR:scratch,TMP:scratch,TEMP:scratch},maxBuffer:4*1024*1024});
 process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');
 const line=result.stdout?.split('\n').find(l=>l.startsWith('REVIEW_JSON='));if(line)writeFileSync(resolve(dir,process.env.PROBE_OUT??'evidence-repair-probe-after-2026-10-25.json'),JSON.stringify(JSON.parse(line.slice(12)),null,2)+'\n');
 process.exitCode=result.status??1;
} finally {rmSync(scratch,{recursive:true,force:true});}
