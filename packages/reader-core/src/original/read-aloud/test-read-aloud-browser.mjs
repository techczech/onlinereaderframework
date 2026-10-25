/** Read-aloud journeys in the real reader: voices, Start closing the menu, docked transport, highlight from real boundary events,
 * skip, pause, stop, errors, no engine, and the layout at 1280, 1024 and 390 px. Headless Chromium shell only.
 * The speech engine is a SYNTHETIC stub (labelled voices, utterances that only report the events the test emits); it proves wiring and state,
 * not that any real voice speaks. The real-engine smoke is separate (docs/design/2026-10-25-readaloud-reuse/evidence). */
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
const body = '# Chapter one\\n\\nFirst sentence has *emphasised words* inside it. Second one: naïve café 東京 — fine! Third closes.\\n\\nA formula $x^2 + y^2 = z^2$ sits in this sentence. Last line here.\\n\\nSecond paragraph here. It has two sentences.\\n\\n' + Array.from({length: 30}, (_, i) => 'Filler paragraph number ' + i + ' with enough words to take some room on the page. It has a second sentence too.').join('\\n\\n');
const sections=[{id:'one',title:'One',category:'C',content:body},{id:'two',title:'Two',category:'C',content:'# Two\\n\\nOther chapter text.'}];
window.root=createRoot(document.getElementById('root'));
window.mount=(id,language)=>window.root.render(React.createElement(PublicationReader,{epub:false,book:{id,title:'Fixture',author:'A',description:'D',language,sections}}));
` }, bundle: true, write: false, format: 'iife', platform: 'browser', alias: { react: resolve(root, 'apps/reader-demo/node_modules/react'), 'react-dom': resolve(root, 'apps/reader-demo/node_modules/react-dom') } });
const css = readFileSync(resolve(root, 'packages/reader-core/dist/reader.css'), 'utf8');
const python = String.raw`
import json,sys,re
from pathlib import Path
from playwright.sync_api import sync_playwright
payload=json.load(sys.stdin)
# SYNTHETIC speech engine. Voices are labelled fixtures; an utterance only does what the test tells it to.
SPEECH='''() => { window.speechLog=[];window.utterances=[];window.__voices=[];const listeners={};
 window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};
 window.fireVoices=v=>{window.__voices=v;(listeners.voiceschanged||[]).forEach(f=>f())};
 Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,paused:false,getVoices:()=>window.__voices,
  addEventListener(t,f){(listeners[t]??=[]).push(f)},removeEventListener(t,f){listeners[t]=(listeners[t]||[]).filter(x=>x!==f)},
  speak(u){window.utterances.push(u);window.speechLog.push('speak');this.speaking=true},cancel(){window.speechLog.push('cancel');this.speaking=false},pause(){window.speechLog.push('pause')},resume(){window.speechLog.push('resume')}}}); }'''
VOICES=[{'default':False,'lang':'cs-CZ','name':'SYNTHETIC Czech','voiceURI':'syn-cs','localService':True},{'default':True,'lang':'en-GB','name':'SYNTHETIC British','voiceURI':'syn-gb','localService':True},{'default':False,'lang':'en-US','name':'SYNTHETIC American','voiceURI':'syn-us','localService':True}]
checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
HL='''(name)=>{const h=CSS.highlights.get(name);return h?[...h].map(r=>r.toString()).join('|'):null}'''
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 assert shells,'Headless Chromium shell required'
 browser=p.chromium.launch(headless=True,executable_path=str(shells[-1]))
 try:
  context=browser.new_context(viewport={'width':1280,'height':800});page=context.new_page();page.set_default_timeout(6000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://aloud.test/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
  page.goto('https://aloud.test/?book=a&section=one');page.evaluate(SPEECH);page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle'])
  def mount(book='a',language=None):
   page.evaluate('([id,l])=>{history.replaceState(null,"","/?book="+id+"&section=one");window.mount(id,l)}',[book,language]);page.locator('[data-publication-content] p').first.wait_for();page.wait_for_timeout(150)
  control=lambda name:page.locator('.publication-toolbar-actions > button').filter(has_text=name)
  menu=lambda:page.get_by_role('dialog',name='Listen',exact=True)
  dock=page.locator('.publication-read-aloud-dock')
  def openlisten():
   if menu().count()==0:control('Listen').click()
  def start():
   openlisten();menu().get_by_role('button',name='Start',exact=True).click();page.wait_for_timeout(120)
  hl=lambda name='publication-read-aloud':page.evaluate(HL,name)
  spoken=lambda:page.evaluate('window.utterances.at(-1)?.text')
  article_html=lambda:page.evaluate('document.querySelector("[data-publication-content]").innerHTML')
  mount('a','en-GB')
  # 1. Voices arrive late and are really listed; nothing plays by itself.
  openlisten()
  check('no autoplay on load',page.evaluate('window.speechLog.length')==0)
  check('before the browser reports voices the menu says so and Start still works',menu().get_by_text('Waiting for the browser to list its voices').count()==1 and menu().get_by_role('button',name='Start',exact=True).is_enabled())
  page.evaluate('v=>window.fireVoices(v)',VOICES);page.wait_for_timeout(100)
  options=menu().get_by_label('Voice').locator('option').all_text_contents()
  check('real voices appear after the browser event, with language and default',any('SYNTHETIC British (en-GB), system default' in o for o in options) and any('SYNTHETIC Czech (cs-CZ)' in o for o in options),options)
  check('voices matching the book language come first in their own group',menu().get_by_label('Voice').locator('optgroup').first.get_attribute('label')=="Matches this book's language")
  check('the automatic choice names the voice it would use',options[0].startswith('Automatic (SYNTHETIC'),options[0])
  menu().get_by_label('Voice').select_option('syn-us');menu().get_by_label('Speed').select_option('1.3');page.wait_for_timeout(80)
  saved=page.evaluate('JSON.parse(localStorage.getItem("publication-reader:a:readAloud"))')
  check('voice and speed are saved for this book',saved['voiceURI']=='syn-us' and abs(saved['rate']-1.3)<1e-9,saved)
  page.keyboard.press('Escape')
  mount('b','en-GB');page.evaluate('v=>window.fireVoices(v)',VOICES);page.wait_for_timeout(100);openlisten()
  check('another book keeps its own, unchosen voice',menu().get_by_label('Voice').input_value()=='')
  page.keyboard.press('Escape');mount('a','en-GB');page.evaluate('v=>window.fireVoices(v)',VOICES);page.wait_for_timeout(100);openlisten()
  check('the saved voice and speed return for this book',menu().get_by_label('Voice').input_value()=='syn-us' and menu().get_by_label('Speed').input_value()=='1.3')
  page.keyboard.press('Escape')
  # 2. Start closes the menu and docks the transport outside the article.
  before=article_html();start()
  check('Start closes the Listen menu',menu().count()==0)
  check('the docked transport is shown with voice and position',dock.count()==1 and 'SYNTHETIC American' in dock.inner_text() and 'paragraph 1 of' in dock.inner_text(),dock.inner_text() if dock.count() else None)
  rects=page.evaluate('()=>{const d=document.querySelector(".publication-read-aloud-dock").getBoundingClientRect(),s=document.querySelector(".publication-scroll").getBoundingClientRect();return {dockBottom:d.bottom,scrollTop:s.top,dockTop:d.top,scrollLeft:s.left,dockW:d.width,vw:innerWidth}}')
  check('the transport sits above the text area and covers none of it',rects['dockBottom']<=rects['scrollTop']+0.5,rects)
  check('focus moves to the transport, not into the page text',page.evaluate('document.activeElement?.getAttribute("aria-label")')=='Pause reading aloud')
  check('the utterance uses the chosen voice and speed',page.evaluate('window.utterances.at(-1).voice?.voiceURI')=='syn-us' and abs(page.evaluate('window.utterances.at(-1).rate')-1.3)<1e-9)
  check('the heading is read first, as its own sentence',spoken()=='Chapter one',spoken())
  # 3. Highlight from the canonical text model, without touching the article.
  check('the current sentence is highlighted through the native highlight pipeline',hl()=='Chapter one',hl())
  check('the article markup is untouched by reading',article_html()==before)
  check('no word highlight without a real boundary event',hl('publication-read-aloud-word') is None)
  page.evaluate('window.utterances.at(-1).onend()');page.wait_for_timeout(80)
  check('the next sentence follows and is highlighted across emphasis markup',hl().startswith('First sentence has emphasised words inside it.'),hl())
  page.evaluate('window.utterances.at(-1).onboundary({charIndex:19})');page.wait_for_timeout(80)
  check('a real boundary highlights that word',hl('publication-read-aloud-word')=='emphasised',hl('publication-read-aloud-word'))
  page.evaluate('window.utterances.at(-1).onend()');page.wait_for_timeout(80)
  check('Unicode sentence is highlighted whole',hl()=='Second one: naïve café 東京 — fine!',hl())
  page.evaluate('window.utterances.at(-1).onboundary({charIndex:'+str('Second one: naïve café 東京 — fine!'.index('東京'))+'})');page.wait_for_timeout(80)
  check('the word highlight follows Unicode words',hl('publication-read-aloud-word')=='東京',hl('publication-read-aloud-word'))
  page.evaluate('window.utterances.at(-1).onend()');page.evaluate('window.utterances.at(-1).onend()');page.wait_for_timeout(80)
  math=hl()
  check('a sentence crossing MathML is highlighted by range, not by inserting HTML',math is not None and 'sits in this sentence' in math and page.evaluate('document.querySelectorAll("[data-publication-content] math mark, [data-publication-content] math span").length')==0,math)
  check('the article markup is still untouched',article_html()==before)
  # 4. Skip, pause, resume.
  page.get_by_role('button',name='Previous sentence').click();page.wait_for_timeout(80)
  check('previous sentence goes back one and keeps reading',spoken().startswith('Third closes.') or spoken().startswith('Third'),spoken())
  page.get_by_role('button',name='Next paragraph').click();page.wait_for_timeout(80)
  check('next paragraph starts the paragraph after the current one',spoken().startswith('A formula') or spoken().startswith('Second paragraph'),spoken())
  page.get_by_role('button',name='Previous paragraph').click();page.wait_for_timeout(80)
  check('previous paragraph starts at its first sentence',spoken().startswith('First sentence has'),spoken())
  page.get_by_role('button',name='Pause reading aloud').click();page.wait_for_timeout(80)
  check('pause keeps the sentence marked and offers Resume',hl() is not None and page.get_by_role('button',name='Resume reading aloud').count()==1 and 'Paused' in dock.inner_text())
  page.get_by_role('button',name='Resume reading aloud').click();page.wait_for_timeout(80)
  check('resume continues reading',page.get_by_role('button',name='Pause reading aloud').count()==1)
  # 5. Changing voice and speed continues from the sentence.
  openlisten();menu().get_by_label('Voice').select_option('syn-gb');page.wait_for_timeout(80)
  check('a voice change restarts only the current sentence in the new voice',page.evaluate('window.utterances.at(-1).voice?.voiceURI')=='syn-gb' and spoken().startswith('First sentence has'),spoken())
  menu().get_by_label('Speed').select_option('1.8');page.wait_for_timeout(80)
  check('a speed change applies at once, from the same sentence',abs(page.evaluate('window.utterances.at(-1).rate')-1.8)<1e-9 and spoken().startswith('First sentence has'))
  page.keyboard.press('Escape');check('Escape closes the menu',menu().count()==0)
  # 6. The transport reopens voice settings and focus returns to it.
  tune=page.get_by_role('button',name='Voice and speed');tune.click();page.wait_for_timeout(80)
  check('Voice and speed reopens the Listen menu',menu().count()==1)
  page.keyboard.press('Escape')
  check('Escape returns focus to the transport control that opened it',tune.evaluate('e=>e===document.activeElement'))
  page.mouse.click(300,400);page.wait_for_timeout(60)
  # 7. Stop clears everything.
  page.get_by_role('button',name='Stop reading aloud').click();page.wait_for_timeout(80)
  check('Stop clears the highlight and removes the transport',hl() is None and dock.count()==0)
  check('Stop cancels the browser queue',page.evaluate('window.speechLog.includes("cancel")'))
  # 8. Failure is shown plainly, with a way out.
  start();page.evaluate('window.utterances.at(-1).onerror({error:"synthesis-failed"})');page.wait_for_timeout(100)
  text=dock.inner_text() if dock.count() else ''
  check('an engine error replaces Reading with a plain statement and Try again',dock.count()==1 and 'could not read aloud' in text and 'Reading aloud with' not in text and page.get_by_role('button',name='Try reading aloud again').count()==1,text)
  check('the highlight is cleared after the error',hl() is None)
  page.get_by_role('button',name='Try reading aloud again').click();page.wait_for_timeout(100)
  check('Try again reads again',page.get_by_role('button',name='Pause reading aloud').count()==1)
  page.get_by_role('button',name='Stop reading aloud').click()
  # 9. Selection and typing are never scrolled against.
  start();page.evaluate('()=>{const p=document.querySelectorAll("[data-publication-content] p")[10];const r=document.createRange();r.selectNodeContents(p);getSelection().removeAllRanges();getSelection().addRange(r)}')
  top=page.evaluate('document.querySelector(".publication-scroll").scrollTop')
  for _ in range(4):
   page.evaluate('window.utterances.at(-1).onend()');page.wait_for_timeout(60)
  check('following the reading does not scroll while text is selected',page.evaluate('document.querySelector(".publication-scroll").scrollTop')==top)
  page.evaluate('getSelection().removeAllRanges()');page.get_by_role('button',name='Stop reading aloud').click()
  # 10. No engine.
  page.evaluate('()=>{delete window.speechSynthesis}');page.evaluate('()=>{Object.defineProperty(window,"speechSynthesis",{configurable:true,value:undefined})}')
  mount('c');openlisten()
  check('no engine: Start is disabled and the reason is stated',menu().get_by_role('button',name='Start',exact=True).is_disabled() and menu().get_by_text('This browser cannot read aloud').count()==1)
  check('no engine: no voice picker is offered',menu().get_by_label('Voice').count()==0)
  page.keyboard.press('Escape')
  # 11. Layout at 1024 and 390.
  page.evaluate(SPEECH);mount('a','en-GB')
  for width,height in ((1024,768),(390,844)):
   page.set_viewport_size({'width':width,'height':height});page.wait_for_timeout(100)
   page.evaluate('v=>window.fireVoices(v)',VOICES);start()
   m=page.evaluate('()=>{const d=document.querySelector(".publication-read-aloud-dock").getBoundingClientRect(),s=document.querySelector(".publication-scroll").getBoundingClientRect();const b=[...document.querySelectorAll(".publication-read-aloud-dock button")].map(e=>e.getBoundingClientRect());return {right:d.right,vw:innerWidth,bottom:d.bottom,scrollTop:s.top,h:d.height,minBtn:Math.min(...b.map(r=>Math.min(r.width,r.height))),over:document.documentElement.scrollWidth>innerWidth,menuOpen:!!document.querySelector("[data-reader-menu]")}}')
   check(f'{width}px: transport fits the window, clears the text and keeps 40px touch targets',m['right']<=m['vw'] and m['bottom']<=m['scrollTop']+0.5 and m['minBtn']>=40 and not m['over'] and not m['menuOpen'],m)
   names=[b.get_attribute('aria-label') for b in dock.locator('button').all()]
   check(f'{width}px: every transport button has an accessible name',all(names) and len(names)>=7,names)
   page.screenshot(path=payload['shots']+f'/readaloud-{width}.png')
   page.get_by_role('button',name='Stop reading aloud').click()
  check('no browser exceptions',not errors,errors)
 finally:browser.close()
print('READ_ALOUD_JSON='+json.dumps(checks))
failed=[c for c in checks if not c['passed']];print(f'{len(checks)-len(failed)}/{len(checks)} passed');sys.exit(1 if failed else 0)
`;
const shots = resolve(root, 'docs/design/2026-10-25-readaloud-reuse/evidence/after');
spawnSync('mkdir', ['-p', shots]);
const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python], { input: JSON.stringify({ bundle: bundle.outputFiles[0].text, css, shots }), encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
process.exitCode = result.status ?? 1;
