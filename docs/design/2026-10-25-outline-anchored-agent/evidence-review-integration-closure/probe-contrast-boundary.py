import json,re,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
HERE=Path(__file__).resolve().parent
payload=json.loads((HERE/'scratch/browser-fixture.json').read_text());checks=[]
def check(name,passed,detail=None):
 checks.append(dict(name=name,passed=bool(passed),detail=detail));print(('PASS ' if passed else 'FAIL ')+name+' '+json.dumps(detail),flush=True)
try:
 with sync_playwright() as p:
  shell=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
  browser=p.chromium.launch(headless=True,executable_path=str(shell))
  try:
   context=browser.new_context(viewport={'width':1440,'height':900});page=context.new_page();page.set_default_timeout(6000)
   page.route('https://closure.example/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div>'))
   page.goto('https://closure.example/sub/?book=boundary&section=one');page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle']);page.evaluate("mount('boundary')")
   page.locator('[data-publication-content] p').first.wait_for();page.wait_for_timeout(150)
   before=page.evaluate('''()=>{const c=document.querySelector('[data-publication-content]');const html='<h2>Excluded boundaries</h2>'+['code','kbd','samp','math','ignore'].map(tag=>'<p data-boundary="'+tag+'">extraordinary'+(tag==='ignore'?'<span data-reading-support-ignore>IGNORE</span>':tag==='math'?'<math xmlns="http://www.w3.org/1998/Math/MathML"><mi>MATH</mi></math>':'<'+tag+'>'+tag.toUpperCase()+'</'+tag+'>')+'suffix.</p>').join('');c.insertAdjacentHTML('beforeend',html);return {html:c.innerHTML,text:reviewModel(c).text}}''')
   page.wait_for_timeout(250);before=page.evaluate("(()=>{const c=document.querySelector('[data-publication-content]');return {html:c.innerHTML,text:reviewModel(c).text}})()")
   page.get_by_role('button',name=re.compile(r'^Assist')).click();page.get_by_role('switch',name='Anchored reading',exact=True).click();page.keyboard.press('Escape');page.wait_for_timeout(200)
   result=page.evaluate('''()=>{const c=document.querySelector('[data-publication-content]');const lead=CSS.highlights.get('publication-anchored-lead'),rest=CSS.highlights.get('publication-anchored-rest');const items=[...c.querySelectorAll('[data-boundary]')].map(p=>{const e=p.querySelector('code,kbd,samp,math,[data-reading-support-ignore]');return {kind:p.dataset.boundary,text:p.textContent,excludedText:e.textContent,lead:[...lead].filter(r=>r.intersectsNode(e)).map(r=>r.toString()),rest:[...rest].filter(r=>r.intersectsNode(e)).map(r=>r.toString()),baseColour:getComputedStyle(e).color,highlightColour:getComputedStyle(e,'::highlight(publication-anchored-rest)').color}});return {html:c.innerHTML,text:reviewModel(c).text,items,leadPriority:lead.priority,restPriority:rest.priority}}''')
   check('boundary fixture preserves DOM and canonical text',result['html']==before['html'] and result['text']==before['text'],{'before':before,'after':{'html':result['html'],'text':result['text']}})
   check('neither lead nor new remainder range crosses excluded inline content',all(not x['lead'] and not x['rest'] for x in result['items']),result['items'])
   page.get_by_role('button',name=re.compile(r'^Assist')).click();page.get_by_role('radio',name='Colour',exact=True).click();page.keyboard.press('Escape');page.wait_for_timeout(100)
   colour=page.evaluate("({lead:CSS.highlights.get('publication-anchored-lead').priority,rest:CSS.highlights.get('publication-anchored-rest').priority})")
   check('both anchored highlights retain priority below paragraph dimming and speech',colour['lead']==-1 and colour['rest']==-1,colour)
   page.get_by_role('button',name=re.compile(r'^Assist')).click();page.get_by_role('switch',name='Anchored reading',exact=True).click();page.keyboard.press('Escape');page.wait_for_timeout(100)
   check('Off removes both highlights after inline boundary fixture',page.evaluate("!CSS.highlights.has('publication-anchored-lead')&&!CSS.highlights.has('publication-anchored-rest')"))
   context.close()
  finally:browser.close()
except Exception as e:
 import traceback;traceback.print_exc();check('probe completed without exception',False,str(e))
(HERE/'contrast-boundary-results.json').write_text(json.dumps({'checks':checks,'failures':sum(not x['passed'] for x in checks)},indent=2)+'\n')
sys.exit(1 if any(not x['passed'] for x in checks) else 0)
