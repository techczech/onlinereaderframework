import {build} from '../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),out=resolve(root,'docs/design/2026-10-25-assist-controls-followup');
const bundle=await build({absWorkingDir:root,stdin:{resolveDir:resolve(root,'packages/reader-core/src/original'),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {PublicationReader} from './PublicationReader.tsx';
const content='<h1>Heading</h1><p>'+('First paragraph text. '.repeat(25))+'</p><h2>Subheading</h2><p>'+('Second paragraph text. '.repeat(25))+'</p><table><tbody><tr><td>Table remains readable</td><td>Second cell</td></tr></tbody></table><ul><li><p>Nested item paragraph</p></li></ul><h3>Rich <math><mi>y</mi><mo>+</mo><mn>1</mn></math> heading</h3><p>Third paragraph with <math><mi>x</mi><mo>=</mo><mn>2</mn></math>.</p><p>Last paragraph.</p>';
window.root=createRoot(document.getElementById('root'));window.mount=(id='review-a')=>{history.replaceState(null,'','/?book='+id+'&section=one');window.root.render(<PublicationReader epub={false} book={{id,title:'Review fixture',author:'Review',description:'',sections:[{id:'one',title:'One',category:'Category',format:'html',content},{id:'two',title:'Two',category:'Category',content:'# Two\\n\\nSecond chapter.'}]}}/>)};
`},bundle:true,write:false,format:'iife',alias:{react:resolve(root,'apps/reader-demo/node_modules/react'),'react-dom':resolve(root,'apps/reader-demo/node_modules/react-dom')}});
const py=String.raw`
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
v=json.load(sys.stdin);results=[]
def check(name,ok,detail=None):
 results.append(dict(name=name,passed=bool(ok),detail=detail));print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 b=p.chromium.launch(headless=True,executable_path=str(shell))
 try:
  c=b.new_context(viewport={'width':1440,'height':900},color_scheme='light');pg=c.new_page();pg.set_default_timeout(6000)
  errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.route('https://review.test/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
  pg.goto('https://review.test/');pg.evaluate('''() => {window.utterances=[];window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],addEventListener(){},removeEventListener(){},speak(u){window.utterances.push(u)},cancel(){},pause(){},resume(){}}})}''');pg.add_style_tag(content=v['css']);pg.add_script_tag(content=v['bundle'])
  stored=[{'id':'r1','content':'Czech č\n  spaces & <tag>','sectionId':'one','sectionTitle':'One','date':1}]
  highlights=[{'id':'h1','text':'First paragraph text.','note':'Keep č\n  spaces','sectionId':'one','sectionTitle':'One','date':2}]
  pg.evaluate('([r,h])=>{localStorage.setItem("publication-reader:review-a:reflections",JSON.stringify(r));localStorage.setItem("publication-reader:review-a:highlights",JSON.stringify(h))}',[stored,highlights])
  def mount(id='review-a'):
   pg.evaluate('id=>window.mount(id)',id);pg.locator('[data-publication-content]').wait_for();pg.wait_for_timeout(200)
  mount()
  before=pg.evaluate('Object.fromEntries(Object.entries(localStorage).filter(([k])=>/reflections|highlights/.test(k)))')
  ta=pg.get_by_role('textbox',name='Key lessons and reflections');ta.fill('unsaved č\n  draft')
  baseline=pg.locator('[data-publication-content]').evaluate('e=>({text:e.textContent,html:e.innerHTML,math:e.querySelector("math")?.outerHTML})')
  def ctl(n):return pg.locator('.publication-toolbar-actions > button[aria-label^="'+n+'"]')
  def assist(mode):
   if pg.get_by_role('dialog',name='Assist',exact=True).count()==0:ctl('Assist').click()
   pg.get_by_role('dialog',name='Assist',exact=True).get_by_role('radio',name=mode,exact=True).click();pg.wait_for_timeout(160)
  def close():pg.keyboard.press('Escape');pg.mouse.move(0,0);pg.wait_for_timeout(100)
  def hidden():return pg.locator('.publication-sidebar').get_attribute('data-open')=='false'
  assist('Paragraph');check('assist defaults navigation hidden',hidden());close()
  pg.locator('[data-publication-content] p').first.hover();pg.wait_for_timeout(150)
  EFF="e=>[...e.querySelectorAll('h1,h2,h3,p,td,li')].filter(x=>!x.querySelector('p,li')).map(x=>{let o=1,n=x;while(n&&n!==e.parentElement){o*=parseFloat(getComputedStyle(n).opacity);n=n.parentElement}return {tag:x.tagName,text:x.textContent.slice(0,20),effective:Math.round(o*1000)/1000,active:x.hasAttribute('data-rs-active')}})"
  para=pg.locator('[data-publication-content]').evaluate(EFF)
  check('paragraph mode: only the current paragraph is clear; headings, cells and items carry the chosen dimming once',sum(1 for x in para if x['effective']==1)==1 and all(abs(x['effective']-0.1)<0.01 for x in para if not x['active']),para)
  pg.locator('[data-publication-content] td').first.hover();pg.wait_for_timeout(150)
  para=pg.locator('[data-publication-content]').evaluate(EFF)
  check('paragraph mode: a table cell can be the current clear block',[x['text'] for x in para if x['effective']==1]==['Table remains readab'],para)
  pg.locator('[data-publication-content] h2').hover();pg.wait_for_timeout(150)
  para=pg.locator('[data-publication-content]').evaluate(EFF)
  check('paragraph mode: a heading can be the current clear block',[x['text'] for x in para if x['effective']==1]==['Subheading'],para)
  pg.locator('[data-publication-content] p').first.hover();pg.wait_for_timeout(150)
  check('reflection is hidden without unmounting textarea',not pg.locator('[data-publication-reflection]').is_visible() and pg.locator('[data-publication-reflection] textarea').count()==1)
  pg.locator('.reading-support-surface').focus();pg.keyboard.press('f');pg.wait_for_timeout(150);check('F overrides assist default',not hidden())
  pg.set_viewport_size({'width':390,'height':844});pg.wait_for_timeout(150);pg.set_viewport_size({'width':1440,'height':900});pg.wait_for_timeout(150);check('assist override survives resize',not hidden())
  assist('Off');close();check('off restores original visible navigation and draft',not hidden() and ta.input_value()=='unsaved č\n  draft')
  pg.locator('.reading-support-surface').focus();pg.keyboard.press('f');pg.wait_for_timeout(150);check('F hides manually',hidden())
  assist('Ruler');close();pg.locator('.reading-support-surface').focus();pg.keyboard.press('f');pg.wait_for_timeout(150);check('F can show during assist after manual hide',not hidden())
  assist('Off');close();check('off restores prior manual hidden state',hidden())
  # Full-page masks and DOM, distinct ruler.
  assist('Line window');pg.get_by_role('dialog',name='Assist').get_by_role('radio',name='Dark',exact=True).click();close();pg.locator('[data-publication-content] p').nth(1).hover();pg.wait_for_timeout(200)
  geom=pg.evaluate('(()=>{const o=document.querySelector(".reading-support-overlay"),s=document.querySelector(".publication-scroll");return {w:o.offsetWidth,h:o.offsetHeight,sw:s.clientWidth,sh:s.scrollHeight,m:[...o.children].map(x=>({h:x.offsetHeight,bg:getComputedStyle(x).backgroundColor}))}})()')
  check('line window covers scroll page at opaque Dark',geom['w']==geom['sw'] and abs(geom['h']-geom['sh'])<2 and len(geom['m'])==2 and all(x['bg'] in ['rgb(28, 28, 32)','rgb(0, 0, 0)'] for x in geom['m']),geom)
  firstgap=pg.locator('.reading-support-overlay').evaluate('e=>[...e.children].map(x=>[x.offsetTop,x.offsetHeight])')
  COVER="(sel)=>{const e=document.querySelector(sel).getBoundingClientRect(),o=document.querySelector('.reading-support-overlay').getBoundingClientRect();return [...document.querySelectorAll('.reading-support-mask')].some(m=>{const r=m.getBoundingClientRect();return r.bottom>e.top+1&&r.top<e.bottom-1})}"
  check('line window at Dark hides unrelated headings while another block is current',pg.evaluate(COVER,'[data-publication-content] h1'))
  pg.locator('[data-publication-content] h1').hover();pg.wait_for_timeout(200)
  headinggap=pg.locator('.reading-support-overlay').evaluate('e=>[...e.children].map(x=>[x.offsetTop,x.offsetHeight])')
  check('line window follows pointer onto heading',headinggap!=firstgap,{'before':firstgap,'afterHeadingHover':headinggap})
  check('line window at Dark leaves the hovered heading readable',not pg.evaluate(COVER,'[data-publication-content] h1'))
  pg.locator('[data-publication-content] h3').hover();pg.wait_for_timeout(200)
  check('line window: heading with MathML is readable and its MathML is untouched',not pg.evaluate(COVER,'[data-publication-content] h3') and pg.locator('[data-publication-content] h3 math').count()==1 and pg.locator('[data-publication-content] h3 math').evaluate('e=>e.outerHTML')=='<math><mi>y</mi><mo>+</mo><mn>1</mn></math>')
  pg.locator('[data-publication-content] td').nth(1).hover();pg.wait_for_timeout(200)
  check('line window: a table cell is readable when current',not pg.evaluate(COVER,'[data-publication-content] td:nth-child(2)'))
  pg.keyboard.press('Escape')
  assist('Line window');close()
  pg.evaluate('document.querySelector(".publication-scroll").scrollTop=0');pg.wait_for_timeout(100)
  sb=pg.locator('[data-publication-content] p').nth(1).bounding_box();pg.mouse.move(sb['x']+40,sb['y']+10);pg.wait_for_timeout(250)
  note=pg.evaluate('()=>{const n=document.querySelector(".publication-margin-note button");const r=n.getBoundingClientRect();const o=document.querySelector(".reading-support-overlay");o.style.pointerEvents="auto";o.querySelectorAll("*").forEach(x=>x.style.pointerEvents="auto");const t=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);const masks=[...o.children].map(m=>m.getBoundingClientRect());const inMask=masks.some(m=>r.top+r.height/2>m.top&&r.top+r.height/2<m.bottom);o.style.pointerEvents="";o.querySelectorAll("*").forEach(x=>x.style.pointerEvents="");return {inMask,topIsMask:o.contains(t),top:t&&t.className,rect:[r.left,r.top,r.width,r.height],win:[innerWidth,innerHeight]}}')
  check('margin note outside the window is beneath the shade',note['inMask'] and note['topIsMask'],note)
  check('margin note can still be opened under the shade (overlay passes pointer events)',pg.locator('.publication-margin-note button').first.evaluate('e=>{const r=e.getBoundingClientRect();return e.contains(document.elementFromPoint(r.left+r.width/2,r.top+r.height/2))}'))
  pg.screenshot(path=str(Path(v['out'])/('repair-'+v['label']+'-window.png')))
  assist('Ruler');close();check('ruler has one mask instead of line windows two',pg.locator('.reading-support-ruler').count()==1)
  after=pg.locator('[data-publication-content]').evaluate('e=>({text:e.textContent,math:e.querySelector("math")?.outerHTML})')
  check('assist leaves body text and MathML unchanged',after['text']==baseline['text'] and after['math']==baseline['math'])
  ctl('Open notes').click();pg.get_by_role('button',name='Reflections',exact=True).click();check('Notes drawer usable under assist','Czech č' in pg.locator('body').inner_text())
  pg.keyboard.press('Escape');assist('Off');close()
  check('stored notes and highlights bytes unchanged across controls',before==pg.evaluate('Object.fromEntries(Object.entries(localStorage).filter(([k])=>/reflections|highlights/.test(k)))'))
  # Selection and synthetic speech boundaries must survive assistance changes.
  pg.locator('.reading-support-surface').focus();pg.keyboard.press('a');pg.wait_for_timeout(200)
  spoken=pg.evaluate('window.utterances.at(-1)?.text')
  if spoken:
   pg.evaluate('window.utterances.at(-1).onboundary?.({charIndex:0})');pg.wait_for_timeout(100)
   speechBefore=pg.evaluate('(()=>{const h=CSS.highlights.get("publication-read-aloud");return h?[...h].map(r=>r.toString()).join("|"):null})()')
   assist('Paragraph');close()
   speechAfter=pg.evaluate('(()=>{const h=CSS.highlights.get("publication-read-aloud");return h?[...h].map(r=>r.toString()).join("|"):null})()')
   check('synthetic speech highlight survives assist change',bool(speechBefore) and speechBefore==speechAfter,{'utterance':spoken,'before':speechBefore,'after':speechAfter})
   pg.locator('.reading-support-surface').focus();pg.keyboard.press('a');pg.keyboard.press('a')
   assist('Off');close()
  else:check('synthetic speech started',False)
  selected=pg.locator('[data-publication-content] p').first.evaluate('e=>{const w=document.createTreeWalker(e,NodeFilter.SHOW_TEXT),n=w.nextNode(),r=document.createRange();r.setStart(n,0);r.setEnd(n,5);const s=getSelection();s.removeAllRanges();s.addRange(r);return s.toString()}')
  check('native body selection works after assist changes',selected=='First',selected);pg.evaluate('getSelection().removeAllRanges()')
  # Tooltip: hoverable, no dead zone, dismissible with Escape, focus kept, rearmed only by a new hover or focus, no native title.
  F=ctl('Formatting')
  tip=lambda:F.evaluate('e=>({op:getComputedStyle(e,"::after").opacity,visibility:getComputedStyle(e,"::after").visibility})')
  shown=lambda:tip()['op']=='1' and tip()['visibility']=='visible'
  check('toolbar icon has no native title duplicate',all(not x.get_attribute('title') for x in pg.locator('.publication-toolbar-actions > button').all()))
  pg.mouse.move(5,5);box=F.bounding_box();pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);pg.wait_for_timeout(200)
  check('tooltip shows on hover',shown(),tip())
  tipbox=F.evaluate('e=>{const s=getComputedStyle(e,"::after");return {h:parseFloat(s.height)+(s.boxSizing==="content-box"?parseFloat(s.paddingTop)+parseFloat(s.paddingBottom)+parseFloat(s.borderTopWidth):0)}}')
  dead=[]
  for dy in range(0,int(box['height']/2+tipbox['h']-3),2):
   pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2+dy);pg.wait_for_timeout(20)
   if dy>box['height']/2 and not shown():dead.append(dy)
  check('pointer can travel from the icon onto the label without a dead zone',not dead,dead)
  pg.wait_for_timeout(300);check('tooltip stays while the pointer rests on the label',shown(),tip())
  pg.keyboard.press('Escape');pg.wait_for_timeout(150)
  check('Escape dismisses a hovered tooltip',not shown(),tip())
  check('Escape on a tooltip opens no menu',pg.get_by_role('dialog').count()==0)
  pg.mouse.move(5,5);pg.wait_for_timeout(150);pg.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);pg.wait_for_timeout(200)
  check('a new hover rearms the tooltip',shown(),tip())
  pg.keyboard.press('Escape');pg.wait_for_timeout(100);pg.mouse.move(box['x']+box['width']/2+2,box['y']+box['height']/2+2);pg.wait_for_timeout(150)
  check('moving within the same control does not rearm a dismissed tooltip',not shown(),tip())
  pg.mouse.move(5,5);F.focus();pg.wait_for_timeout(200)
  check('keyboard focus shows the tooltip',shown(),tip())
  pg.keyboard.press('Escape');pg.wait_for_timeout(150)
  check('Escape dismisses a focused tooltip and focus stays on the control',not shown() and F.evaluate('e=>e===document.activeElement') and pg.get_by_role('dialog').count()==0,tip())
  pg.keyboard.press('Shift+Tab');pg.keyboard.press('Tab');pg.wait_for_timeout(150)
  check('moving focus away and back rearms the tooltip',shown(),tip())
  # Per book + live follow.
  ctl('Theme').click();pg.get_by_role('dialog',name='Theme').get_by_role('radio',name='Dark',exact=True).click();close();mount('review-b');check('another book defaults to Follow computer',ctl('Theme').get_attribute('aria-label').startswith('Theme: Follow computer') and not pg.locator('.publication-reader.dark').count())
  pg.emulate_media(color_scheme='dark');pg.wait_for_timeout(150);check('system theme follows media live',pg.locator('.publication-reader.dark').count()==1)
  mount('review-a');check('book theme isolation restores explicit Dark',ctl('Theme').get_attribute('aria-label')=='Theme: Dark')
  # Rehydrate saved assist; only support pref, never reset notes.
  assist('Line window');close();mount('review-b');mount('review-a');check('book remount with saved assist hides navigation',hidden())
  check('no browser runtime errors',not errors,errors)
  # Legacy and malformed values loaded through actual reader hooks.
  for i,(pref,theme,legacy,want,dim) in enumerate([
   ({'focus':'paragraph','overlay':'off','dim':0.9,'dimVersion':2},'nonsense',None,'paragraph',0.9),
   ({'focus':'paragraph','overlay':'ruler','dim':0.72,'dimVersion':2},['dark'],None,'ruler',0.72),
   ({'overlay':['ruler'],'dim':0.5,'dimVersion':2},None,None,'off',0.5),
   ({'overlay':'paragraph','dim':0.35},False,None,'paragraph',0.9),
   ({'overlay':'line-window','dim':999,'dimVersion':3},'system',None,'line-window',0.9),
  ]):
   bid='malformed-'+str(i)
   pg.evaluate('([id,p,t,l])=>{localStorage.setItem("publication-reader:"+id+":reading-support:v1",JSON.stringify(p));localStorage.setItem("publication-reader:"+id+":theme",JSON.stringify(t));localStorage.setItem("publication-reader:"+id+":darkMode",JSON.stringify(l))}',[bid,pref,theme,legacy])
   mount(bid)
   actual=pg.locator('.reading-support-surface').evaluate('e=>({overlay:e.dataset.rsOverlay,dim:e.style.getPropertyValue("--rs-dim")})')
   check('legacy or malformed migration '+str(i),actual['overlay']==want and abs(float(actual['dim'])-dim)<0.001 and ctl('Theme').get_attribute('aria-label').startswith('Theme: Follow computer'),actual)
  # Matching old boolean: explicit Light cannot be distinguished from old default and becomes System.
  pg.emulate_media(color_scheme='light');pg.evaluate('localStorage.setItem("publication-reader:old-theme:darkMode","false")');mount('old-theme');pg.emulate_media(color_scheme='dark');pg.wait_for_timeout(180)
  check('matching legacy boolean becomes live System',ctl('Theme').get_attribute('aria-label').startswith('Theme: Follow computer') and pg.locator('.publication-reader.dark').count()==1)
  pg.evaluate('''() => {window.originalGet=Storage.prototype.getItem;window.originalSet=Storage.prototype.setItem;Storage.prototype.getItem=()=>{throw Error('review denied')};Storage.prototype.setItem=()=>{throw Error('review denied')}}''');mount('blocked-storage')
  ctl('Formatting').click();pg.get_by_role('button',name='Increase text size',exact=True).click();pg.wait_for_timeout(100)
  check('denied storage permits in-memory settings and reports unsaved',pg.get_by_text('Settings work for this visit but could not be saved on this device.',exact=True).count()==1)
  pg.evaluate('()=>{Storage.prototype.getItem=window.originalGet;Storage.prototype.setItem=window.originalSet}')
  # Real book source at the builder server, independent context.
  rc=b.new_context(viewport={'width':390,'height':844});rp=rc.new_page();rp.goto('http://127.0.0.1:8773/?book=deliberate-practice&section=about-this-guide');rp.locator('[data-publication-content]').wait_for();rp.wait_for_timeout(300)
  check('real DP book at 390 has no main overflow',rp.locator('main').evaluate('e=>e.scrollWidth<=e.clientWidth'),rp.locator('main').evaluate('e=>({client:e.clientWidth,scroll:e.scrollWidth})'))
  rc.close();c.close()
 finally:b.close()
Path(v['out']).joinpath('repair-results-'+v['label']+'.json').write_text(json.dumps(results,indent=2))
failed=[r['name'] for r in results if not r['passed']]
print(json.dumps({'checks':len(results),'failed':failed}));sys.exit(1 if failed else 0)
`;
const scratch=mkdtempSync(resolve(out,'.repair-scratch-'));
try{const r=spawnSync(resolve(root,'../book-engine/.venv/bin/python'),['-c',py],{input:JSON.stringify({label:process.env.REPAIR_LABEL||'run',bundle:bundle.outputFiles[0].text,css:readFileSync(resolve(root,'packages/reader-core/dist/reader.css'),'utf8'),out}),encoding:'utf8',env:{...process.env,TMPDIR:scratch,TEMP:scratch,TMP:scratch},timeout:60000,maxBuffer:3e6});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');process.exitCode=r.status??1;}finally{rmSync(scratch,{recursive:true,force:true});}
