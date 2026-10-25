import json,mimetypes,re,sys,traceback
from pathlib import Path
from urllib.parse import urlparse,unquote
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent
payload=json.loads((HERE/'scratch/browser-fixture.json').read_text())
checks=[]
def check(name,passed,detail=None):
 checks.append(dict(name=name,passed=bool(passed),detail=detail));print(('PASS ' if passed else 'FAIL ')+name+' '+json.dumps(detail,ensure_ascii=False),flush=True)
SPEECH='''()=>{window.utterances=[];window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};const listeners={};Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{speaking:false,paused:false,getVoices:()=>[{default:true,lang:'en-GB',name:'SYNTHETIC British',voiceURI:'syn-gb',localService:true}],addEventListener(t,f){(listeners[t]??=[]).push(f)},removeEventListener(t,f){listeners[t]=(listeners[t]||[]).filter(x=>x!==f)},speak(u){window.utterances.push(u);this.speaking=true},cancel(){this.speaking=false},pause(){this.paused=true},resume(){this.paused=false}}})}'''
try:
 with sync_playwright() as p:
  shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
  browser=p.chromium.launch(headless=True,executable_path=str(shell))
  try:
   context=browser.new_context(viewport={'width':1440,'height':900})
   page=context.new_page();page.set_default_timeout(6000)
   page.route('https://fixture.example/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
   page.goto('https://fixture.example/sub/?book=fixture&section=one');page.evaluate(SPEECH);page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle']);page.evaluate('mount()')
   page.locator('[data-publication-content] p').first.wait_for();page.wait_for_timeout(200)
   check('framework agent access defaults off',page.locator('[data-publication-agent]').count()==0)
   page.evaluate("mount('fixture',{path:'/sub/custom/'})");page.wait_for_timeout(200)
   page.locator('[data-publication-agent] summary').click()
   prompt=page.locator('[data-publication-agent] code').inner_text()
   check('configured framework chapter prompt uses public book-specific URL and citations','https://fixture.example/sub/custom/fixture/chapters/one.md' in prompt and 'Cite chapter titles' in prompt,prompt)
   # Exercise plain-HTTP clipboard fallback deterministically; do not touch the system clipboard.
   page.evaluate("()=>{window.copied='';Object.defineProperty(navigator,'clipboard',{configurable:true,value:undefined});document.execCommand=cmd=>{window.copied=document.querySelector('textarea[aria-hidden]').value;return cmd==='copy'};return null}")
   page.locator('.publication-agent-prompt button').click();page.wait_for_timeout(80)
   check('clipboard fallback copies complete prompt and restores focus',page.evaluate('window.copied')==prompt and page.locator('.publication-agent-prompt button').evaluate('(e)=>document.activeElement===e'))
   page.locator('[data-publication-agent] summary').click()
   before=page.evaluate("(()=>{const c=document.querySelector('[data-publication-content]');const math=c.querySelector('math');return {html:c.innerHTML,text:reviewModel(c).text,mathColour:getComputedStyle(math).color,mathText:math.textContent}})()")
   page.get_by_role('button',name='Assist',exact=True).click();page.get_by_role('switch',name='Anchored reading',exact=True).click();page.keyboard.press('Escape');page.wait_for_timeout(180)
   info=page.evaluate("(()=>{const c=document.querySelector('[data-publication-content]'),h=CSS.highlights.get('publication-anchored-lead'),m=reviewModel(c);return {html:c.innerHTML,text:m.text,mathColour:getComputedStyle(c.querySelector('math')).color,pri:h.priority,excluded:[...h].filter(r=>r.startContainer.parentElement.closest('code,math')).length,split:[...h].filter(r=>r.toString()==='emph').map(r=>({text:r.toString(),from:m.points.findIndex(x=>x&&x.node===r.startContainer&&x.offset===r.startOffset)}))}})()")
   check('anchored reading preserves canonical text, markup and inline word offsets',info['html']==before['html'] and info['text']==before['text'] and info['split']==[{'text':'emph','from':before['text'].index('emphasised')}],info)
   check('anchored ranges skip code and MathML',info['excluded']==0)
   check('contrast leaves ignored MathML colour unchanged',info['mathColour']==before['mathColour'],{'before':before['mathColour'],'after':info['mathColour']})
   page.evaluate("document.querySelector('.publication-scroll').style.scrollBehavior='auto';document.querySelector('.publication-scroll').scrollTop=0");page.wait_for_timeout(200)
   page.get_by_role('button',name='Listen',exact=True).click();page.get_by_role('dialog',name='Listen',exact=True).get_by_role('button',name='Start',exact=True).click();page.wait_for_timeout(100)
   for i in range(5):
    if 'emphasised' in page.evaluate('window.utterances.at(-1).text'):break
    page.evaluate('window.utterances.at(-1).onend()');page.wait_for_timeout(80)
   page.evaluate("(()=>{const u=window.utterances.at(-1);u.onboundary({charIndex:u.text.indexOf('emphasised'),charLength:10,name:'word'})})()")
   page.wait_for_timeout(100)
   spoken=page.evaluate("(()=>{const h=n=>{const x=CSS.highlights.get(n);return x?{text:[...x].map(r=>r.toString()).join('|'),priority:x.priority}:null};const c=document.querySelector('[data-publication-content]'),m=reviewModel(c),word=CSS.highlights.get('publication-read-aloud-word');const r=word?[...word][0]:null;return {sentence:h('publication-read-aloud'),word:h('publication-read-aloud-word'),anchored:h('publication-anchored-lead'),offset:r?m.points.findIndex(x=>x&&x.node===r.startContainer&&x.offset===r.startOffset):-1,html:c.innerHTML,text:m.text}})()")
   check('synthetic speech word means the canonical inline word while anchored is active',spoken['word'] is not None and spoken['word']['text']=='emphasised' and spoken['offset']==before['text'].index('emphasised') and spoken['html']==before['html'] and spoken['text']==before['text'],{k:v for k,v in spoken.items() if k not in ['html','text','anchored']})
   check('speech and both anchored highlights coexist in correct priority order',spoken['anchored'] is not None and spoken['word'] is not None and spoken['anchored']['priority']<spoken['word']['priority'] and page.evaluate("CSS.highlights.get('publication-anchored-rest').priority")<spoken['word']['priority'])
   page.get_by_role('button',name='Stop reading aloud',exact=True).click()
   # Inject saved preferences, remount, and compare both bare-text and inline dimming.
   page.evaluate("localStorage.setItem('publication-reader:mixed:reading-support:v1',JSON.stringify({anchored:true,leadStyle:'contrast',overlay:'paragraph',dim:1,dimVersion:3}));history.replaceState(null,'','?book=mixed&section=one');mount('mixed')")
   page.wait_for_timeout(250)
   mixed=page.evaluate("(()=>{const b=document.querySelector('[data-publication-content] blockquote'),h=CSS.highlights.get('rs-dim');return {colour:getComputedStyle(b,'::highlight(rs-dim)').color,anchored:getComputedStyle(b,'::highlight(publication-anchored-lead)').color,priority:h?.priority,dim:h?[...h].map(r=>r.toString()):[],overlay:document.querySelector('.reading-support-surface').dataset.rsOverlay,html:document.querySelector('[data-publication-content]').innerHTML}})()")
   check('mixed paragraph dimming takes priority over anchored colour on bare text',mixed['priority']==0 and any('BEFOREALPHA' in x for x in mixed['dim']) and mixed['colour'].endswith('/ 0)'),mixed)
   coexist=page.evaluate("(()=>{const a=CSS.highlights.get('publication-anchored-lead'),r=CSS.highlights.get('publication-anchored-rest'),d=CSS.highlights.get('rs-dim');return {lead:a?.priority,rest:r?.priority,dim:d?.priority,restCount:r?.size}})()")
   check('new remainder stays below paragraph dim highlight',coexist['rest']==-1 and coexist['lead']==-1 and coexist['dim']==0 and coexist['restCount']>0,coexist)
   page.evaluate("localStorage.setItem('publication-reader:ruler:reading-support:v1',JSON.stringify({anchored:true,leadStyle:'contrast',overlay:'ruler',rulerLines:1,dim:0.9,dimVersion:3}));history.replaceState(null,'','?book=ruler&section=one');mount('ruler')")
   page.wait_for_timeout(300)
   first=page.locator('[data-publication-content] p').first
   first.scroll_into_view_if_needed();first.hover();page.wait_for_timeout(200)
   info=page.evaluate("(()=>{const c=document.querySelector('[data-publication-content]'),bar=document.querySelector('.reading-support-ruler'),surface=document.querySelector('.reading-support-surface');return {overlay:surface.dataset.rsOverlay,bar:bar?{height:bar.getBoundingClientRect().height,top:bar.getBoundingClientRect().top}:null,lead:CSS.highlights.get('publication-anchored-lead')?.priority,rest:CSS.highlights.get('publication-anchored-rest')?.priority,text:reviewModel(c).text}})()")
   check('real pointer event places Ruler while both anchored highlights remain active',info['overlay']=='ruler' and info['bar'] is not None and info['bar']['height']>0 and info['lead']==-1 and info['rest']==-1,info)
   context.close()
  finally:browser.close()
except Exception:
 traceback.print_exc();check('probe completed without harness exception',False,traceback.format_exc())
finally:
 (HERE/'highlight-coexistence-results.json').write_text(json.dumps({'checks':checks,'failures':sum(not x['passed'] for x in checks)},ensure_ascii=False,indent=2)+'\n')
sys.exit(1 if any(not x['passed'] for x in checks) else 0)
