import {build} from '../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import {readFileSync,writeFileSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {spawnSync} from 'node:child_process';
const root=process.cwd(),out=resolve(root,'docs/design/2026-10-25-assist-controls-followup');
const bundle=await build({absWorkingDir:root,stdin:{resolveDir:resolve(root,'packages/reader-core/src/original'),loader:'tsx',contents:`
import React from 'react';import {createRoot} from 'react-dom/client';import {PublicationReader} from './PublicationReader.tsx';
const content='<h1>Heading</h1><p>Plain paragraph with <math><mi>x</mi><mo>=</mo><mn>2</mn></math> inside.</p>';
window.root=createRoot(document.getElementById('root'));window.mount=(id='nested-own')=>{history.replaceState(null,'','/?book='+id+'&section=one');window.root.render(<PublicationReader epub={false} book={{id,title:'Review fixture',author:'Review',description:'',sections:[{id:'one',title:'One',category:'Category',format:'html',content},{id:'two',title:'Two',category:'Category',content:'# Two\\n\\nSecond chapter.'}]}}/>)};
`},bundle:true,write:false,format:'iife',alias:{react:resolve(root,'apps/reader-demo/node_modules/react'),'react-dom':resolve(root,'apps/reader-demo/node_modules/react-dom')}});
const py=String.raw`
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
v=json.load(sys.stdin);results=[]
def check(name,ok,detail=None):
 results.append(dict(name=name,passed=bool(ok),detail=detail));print(('PASS ' if ok else 'FAIL ')+name,flush=True)
DIM={'Light':0.72,'Medium':0.9,'Dark':1.0}
# Each reading unit is a text node (bare lead/tail text) or an element, found from the fixture.
UNITS="""(()=>{const q=s=>document.querySelector(s);const textOf=(el,which)=>{const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);const t=[];let n;while(n=w.nextNode()){if(n.parentElement===el&&n.textContent.trim())t.push(n)}return which==='lead'?t[0]:t[t.length-1]};
return {h1:q('#h1'),'lt-lead':textOf(q('#lt'),'lead'),'lt-tail':textOf(q('#lt'),'tail'),c0:q('#c0'),c7:q('#c7'),'sp-lead':q('#sp-lead'),'sp-child':q('#sp-child'),'sp-tail':q('#sp-tail'),'bq-lead':textOf(q('#bq'),'lead'),'bq-p':q('#bq-p'),'bq-tail':textOf(q('#bq'),'tail'),'cell-lead':textOf(q('#cell'),'lead'),'cell-p':q('#cell-p'),'cell-tail':textOf(q('#cell'),'tail'),plain:q('#plain')}})()"""
EFF="""(dim)=>{const U=%s;const hl=(window.CSS&&CSS.highlights&&CSS.highlights.get('rs-dim'))||[];const ranges=[...hl];const out={};for(const [k,n] of Object.entries(U)){let o=1,e=n.nodeType===3?n.parentElement:n;while(e&&!e.classList.contains('reading-support-surface')){o*=Number(getComputedStyle(e).opacity);e=e.parentElement}const hits=n.nodeType!==3?0:ranges.filter(r=>{const i=[...n.parentNode.childNodes].indexOf(n);return r.startContainer===n.parentNode&&r.startOffset===i&&r.endContainer===n.parentNode&&r.endOffset===i+1}).length;out[k]={opacity:Math.round(o*1000)/1000,highlights:hits,effective:Math.round(o*(hits?(1-dim):1)*1000)/1000}}return out}"""%UNITS
RECT="""(label)=>{const n=%s[label];const r=document.createRange();r.selectNodeContents(n);return [...r.getClientRects()].filter(b=>b.width>0&&b.height>0).map(b=>[b.top,b.bottom])}"""%UNITS
COVERED="""(label)=>{const n=%s[label];const r=document.createRange();r.selectNodeContents(n);const boxes=[...r.getClientRects()].filter(b=>b.width>0&&b.height>0);const masks=[...document.querySelectorAll('.reading-support-mask')].map(m=>m.getBoundingClientRect());return boxes.length>0&&boxes.every(b=>masks.some(m=>(b.top+b.bottom)/2>m.top&&(b.top+b.bottom)/2<m.bottom))}"""%UNITS
CLEAR="""(label)=>{const n=%s[label];const r=document.createRange();r.selectNodeContents(n);const boxes=[...r.getClientRects()].filter(b=>b.width>0&&b.height>0);const masks=[...document.querySelectorAll('.reading-support-mask')].map(m=>m.getBoundingClientRect());return boxes.length>0&&boxes.every(b=>!masks.some(m=>(b.top+b.bottom)/2>m.top&&(b.top+b.bottom)/2<m.bottom))}"""%UNITS
with sync_playwright() as p:
 shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
 b=p.chromium.launch(headless=True,executable_path=str(shell))
 try:
  c=b.new_context(viewport={'width':1440,'height':900},color_scheme='light');pg=c.new_page();pg.set_default_timeout(6000)
  errors=[];pg.on('pageerror',lambda e:errors.append(str(e)))
  pg.route('https://review.test/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
  pg.goto('https://review.test/');pg.add_style_tag(content=v['css']);pg.add_script_tag(content=v['bundle'])
  pg.evaluate('id=>window.mount(id)','nested-own');pg.locator('[data-publication-content]').wait_for();pg.wait_for_timeout(250)
  # The sanitiser does not keep ids, so the nested fixture is inserted into the rendered DOM (as the closure probe does); no authored source is touched.
  KIDS=''.join('<li id=c%d>Child item %d</li>'%(i,i) for i in range(8))
  pg.locator('[data-publication-content]').evaluate('''(e,k)=>{e.querySelector('h1').id='h1';e.querySelector('p').id='plain';e.insertAdjacentHTML('beforeend','<ul><li id=lt>Lead text of parent <ul>'+k+'</ul> tail text of parent</li></ul><ul><li id=sp><span id=sp-lead>Inline lead</span><ul><li id=sp-child>Inline child</li></ul><em id=sp-tail>Inline tail</em></li></ul><blockquote id=bq>Quote lead<p id=bq-p>Quote paragraph</p>Quote tail</blockquote><table><tbody><tr><td id=cell>Cell lead<p id=cell-p>Cell paragraph</p>Cell tail</td></tr></tbody></table>')}''',KIDS);pg.wait_for_timeout(300)
  base=pg.locator('[data-publication-content]').evaluate('''e=>({html:e.innerHTML.replace(/ data-rs-[a-z]+(="")?/g,''),text:e.textContent,math:e.querySelector('math').outerHTML})''')
  pg.evaluate("window.__nodes="+UNITS)
  def ctl(n):return pg.locator('.publication-toolbar-actions > button[aria-label^="'+n+'"]')
  def assist(mode):
   if pg.get_by_role('dialog',name='Assist',exact=True).count()==0:ctl('Assist').click()
   pg.get_by_role('dialog',name='Assist',exact=True).get_by_role('radio',name=mode,exact=True).click();pg.wait_for_timeout(160)
  def close():pg.keyboard.press('Escape');pg.mouse.move(0,0);pg.wait_for_timeout(100)
  def hover(label):
   pg.evaluate("l=>{const n=%s[l];(n.nodeType===3?n.parentElement:n).scrollIntoView({block:'center',behavior:'instant'})}"%UNITS,label);pg.wait_for_timeout(250)
   x=pg.evaluate("l=>{const n=%s[l];const r=document.createRange();r.selectNodeContents(n);const b=[...r.getClientRects()].find(b=>b.width>0&&b.height>0);return b.left+Math.min(b.width/2,20)}"%UNITS,label)
   r=pg.evaluate(RECT,label)[0];pg.mouse.move(x+3,(r[0]+r[1])/2+1);pg.mouse.move(x,(r[0]+r[1])/2);pg.wait_for_timeout(350)
   return pg.evaluate('([x,y])=>{const e=document.elementFromPoint(x,y);return e&&(e.tagName+"#"+e.id+"."+e.className)}',[x,(r[0]+r[1])/2])
  # Paragraph mode at each dimming level: the hovered unit is clear and every other unit carries the chosen dimming exactly once.
  print('mounted',flush=True);assist('Paragraph');print('assisted',flush=True)
  for level,dim in DIM.items():
   assist(level);close()
   for target in ['lt-lead','lt-tail','c0','c7','sp-lead','sp-child','sp-tail','bq-lead','bq-p','bq-tail','cell-lead','cell-p','cell-tail','h1','plain']:
    at=hover(target);eff=pg.evaluate(EFF,dim)
    bad={k:x for k,x in eff.items() if abs(x['effective']-(1.0 if k==target else round(1-dim,3)))>0.002}
    check('Paragraph %s: hovering %s leaves it clear and every other reading unit dimmed once'%(level,target),not bad,(dict(bad,pointerOn=at) if bad else None))
  # Parent text and child are each independently readable (one clear at a time) in the nested list.
  assist('Medium');close()
  hover('lt-lead');a=pg.evaluate(EFF,0.9);hover('c0');b2=pg.evaluate(EFF,0.9);hover('lt-tail');c3=pg.evaluate(EFF,0.9)
  check('parent lead, a child and parent tail are three separately readable units',a['lt-lead']['effective']==1 and a['c0']['effective']==0.1 and b2['c0']['effective']==1 and b2['lt-lead']['effective']==0.1 and c3['lt-tail']['effective']==1 and c3['lt-lead']['effective']==0.1)
  # Keyboard walk in document order.
  pg.locator('.reading-support-surface').focus();pg.keyboard.press('Home');pg.wait_for_timeout(120);seq=[]
  for _ in range(26):
   e=pg.evaluate(EFF,0.9);clear=[k for k,x in e.items() if x['effective']==1]
   if clear and (not seq or seq[-1]!=clear[0]):seq.append(clear[0])
   pg.keyboard.press('ArrowDown');pg.wait_for_timeout(60)
  want=['h1','plain','lt-lead','c0','c7','lt-tail','sp-lead','sp-child','sp-tail','bq-lead','bq-p','bq-tail','cell-lead','cell-p','cell-tail']
  check('keyboard visits lead text, children and tail text in reading order',[s for s in seq if s in want]==want,seq)
  # Line window at Dark: each unit can be the clear region while the rest stays under the opaque shade.
  assist('Line window');assist('Dark');close()
  for target in ['lt-lead','lt-tail','c0','sp-lead','sp-tail','bq-lead','bq-tail','cell-lead','cell-tail']:
   hover(target)
   check('Line window Dark: %s is clear when hovered'%target,pg.evaluate(CLEAR,target),pg.evaluate(RECT,target))
  hover('lt-lead');far=pg.evaluate(COVERED,'lt-tail');hover('lt-tail');far2=pg.evaluate(COVERED,'lt-lead')
  check('Line window Dark: the window follows lead to tail and shades the other',far and far2,{'tailShadedWhenLeadCurrent':far,'leadShadedWhenTailCurrent':far2})
  geom=[]
  hover('lt-lead');geom.append(pg.locator('.reading-support-overlay').evaluate('e=>[...e.children].map(x=>[x.offsetTop,x.offsetHeight])'))
  hover('lt-tail');geom.append(pg.locator('.reading-support-overlay').evaluate('e=>[...e.children].map(x=>[x.offsetTop,x.offsetHeight])'))
  check('Line window Dark: shade geometry differs between the lead and the tail',geom[0]!=geom[1],geom)
  pg.screenshot(path=str(Path(v['out'])/'fix-nested-own-window.png'))
  assist('Paragraph');close();hover('lt-tail');pg.screenshot(path=str(Path(v['out'])/'fix-nested-own-paragraph.png'))
  # Preservation: markup and selection untouched; only the reader's own data-rs attributes and a highlight registry differ.
  assist('Off');close()
  after=pg.locator('[data-publication-content]').evaluate('''e=>({html:e.innerHTML.replace(/ data-rs-[a-z]+(="")?/g,''),text:e.textContent,math:e.querySelector('math').outerHTML})''')
  check('assist off restores the exact authored markup, text and MathML',after==base,None)
  hover_ok=pg.evaluate("()=>Object.values(window.__nodes).every(n=>n.isConnected)")
  check('the original text and element nodes are the same live nodes (nothing wrapped or split)',hover_ok)
  assist('Paragraph');close();hover('lt-lead')
  mid=pg.locator('[data-publication-content]').evaluate('''e=>({html:e.innerHTML.replace(/ data-rs-[a-z]+(="")?/g,''),text:e.textContent,math:e.querySelector('math').outerHTML})''')
  check('while assist is on only data-rs attributes differ; text and MathML are identical',mid==base,None if mid==base else {k:(mid[k] if mid[k]==base[k] else next((i,mid[k][max(0,i-60):i+60],base[k][max(0,i-60):i+60]) for i in range(min(len(mid[k]),len(base[k]))) if mid[k][i]!=base[k][i])) for k in base})
  sel=pg.evaluate("()=>{const n=window.__nodes['lt-lead'];const s=getSelection();s.removeAllRanges();const r=document.createRange();r.setStart(n,2);r.setEnd(n,6);s.addRange(r);return s.toString()}")
  pg.mouse.move(0,0);pg.wait_for_timeout(150)
  still=pg.evaluate("()=>({s:getSelection().toString(),same:getSelection().anchorNode===window.__nodes['lt-lead']})")
  check('a text selection inside the parent text survives dimming and re-targeting',still['s']==sel and still['same'],still)
  check('no page errors',not errors,errors)
 finally:b.close()
Path(v['out']).joinpath(v['label']+'-results.json').write_text(json.dumps(results,indent=2))
failed=[r['name'] for r in results if not r['passed']]
print(json.dumps({'checks':len(results),'failed':failed}));sys.exit(1 if failed else 0)
`;
const scratch=mkdtempSync(resolve(out,'.closure-assist-scratch-'));
try{const r=spawnSync(resolve(root,'../book-engine/.venv/bin/python'),['-c',py],{input:JSON.stringify({label:process.env.RESULT_LABEL||'fix-nested-own',bundle:bundle.outputFiles[0].text,css:readFileSync(resolve(root,'packages/reader-core/dist/reader.css'),'utf8'),out}),encoding:'utf8',env:{...process.env,TMPDIR:scratch,TEMP:scratch,TMP:scratch},timeout:300000,maxBuffer:3e6});process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');process.exitCode=r.status??1;}finally{rmSync(scratch,{recursive:true,force:true});}
