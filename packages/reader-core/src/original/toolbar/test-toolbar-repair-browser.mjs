/** Regression journeys for the four toolbar review findings: menu focus after a self-disabling action, orphan recordings,
 * speech ownership across renderers, and stale speech callbacks. Headless Chromium shell only; speech is a state stub, never a real voice.
 * TOOLBAR_REPAIR_SRC may point at another copy of src/original (used to show the failures against the pre-repair sources). */
import { build } from '../../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(directory, '../../../..');
const source = process.env.TOOLBAR_REPAIR_SRC ? resolve(process.env.TOOLBAR_REPAIR_SRC) : directory;
const bundle = await build({ absWorkingDir: root, stdin: { resolveDir: source, loader: 'tsx', contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {PublicationReader} from './PublicationReader.tsx'; import {MarkdownRenderer} from './MarkdownRenderer.tsx';
const sections=[{id:'one',title:'One',category:'C',content:'# One\\n\\n'+'Readable text. '.repeat(80)},{id:'two',title:'Two',category:'C',content:'# Two\\n\\nOther chapter.'}];
window.root=createRoot(document.getElementById('root'));
window.mount=(id,audio)=>window.root.render(React.createElement(PublicationReader,{epub:false,audio,book:{id,title:'Fixture',author:'A',description:'D',sections}}));
// A second, independent renderer in its own host element, with a handle so the test can start and stop its own speech.
window.extraRef=React.createRef();
window.extra=(content)=>{window.extraRoot??=createRoot(document.getElementById('extra'));window.extraRoot.render(React.createElement(MarkdownRenderer,{ref:window.extraRef,content}))};
window.removeExtra=()=>{window.extraRoot?.unmount();window.extraRoot=null};
` }, bundle: true, write: false, format: 'iife', platform: 'browser', alias: { react: resolve(root, 'apps/reader-demo/node_modules/react'), 'react-dom': resolve(root, 'apps/reader-demo/node_modules/react-dom') } });
const css = readFileSync(resolve(root, 'packages/reader-core/dist/reader.css'), 'utf8');
const python = String.raw`
import json,sys,re
from pathlib import Path
from playwright.sync_api import sync_playwright
payload=json.load(sys.stdin)
SPEECH='''() => { window.speechLog=[];window.utterances=[];window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};
 Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],speak(u){window.utterances.push(u);window.speechLog.push('speak')},cancel(){window.speechLog.push('cancel')},pause(){window.speechLog.push('pause')},resume(){window.speechLog.push('resume')}}}); }'''
checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 assert shells,'Headless Chromium shell required'
 browser=p.chromium.launch(headless=True,executable_path=str(shells[-1]))
 try:
  page=browser.new_page(viewport={'width':1280,'height':800});page.set_default_timeout(6000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.route('https://repair.test/**',lambda r:r.fulfill(content_type='text/html',body='<div id="root"></div><div id="extra"></div>'))
  page.goto('https://repair.test/?book=a&section=one');page.evaluate(SPEECH);page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle'])
  def mount(book='a',audio=None):
   page.evaluate('([id,audio])=>{history.replaceState(null,"","/?book="+id+"&section=one");window.mount(id,audio)}',[book,audio]);page.locator('[data-publication-content]').wait_for();page.wait_for_timeout(100)
  control=lambda name:page.locator('.publication-toolbar-actions > button').filter(has_text=name)
  menu=lambda name:page.get_by_role('dialog',name=name,exact=True)
  def openmenu(name):
   if menu(name).count()==0:control(name).click()
  state=lambda:page.evaluate('({tag:document.activeElement.tagName,label:document.activeElement.getAttribute("aria-label")||document.activeElement.textContent?.slice(0,40),disabled:document.activeElement.matches(":disabled"),inMenu:!!document.activeElement.closest("[data-reader-menu]")&&!document.activeElement.matches(":disabled")})')
  mount()
  # 1. Keyboard containment after an action disables the focused button.
  openmenu('Formatting');menu('Formatting').get_by_role('button',name='Increase text size').click()
  menu('Formatting').get_by_role('button',name='Reset formatting').click()
  check('reset: focus stays inside Formatting when Reset disables itself',state()['inMenu'],state())
  page.keyboard.press('Tab');check('reset: Tab stays inside Formatting',state()['inMenu'],state())
  page.keyboard.press('Shift+Tab');page.keyboard.press('Shift+Tab');check('reset: Shift+Tab stays inside Formatting',state()['inMenu'],state())
  page.keyboard.press('Escape');check('reset: Escape closes the menu and returns to Formatting',menu('Formatting').count()==0 and control('Formatting').evaluate('e=>e===document.activeElement'))
  openmenu('Formatting');inc=menu('Formatting').get_by_role('button',name='Increase text size')
  for _ in range(12):
   if inc.is_enabled():inc.click()
   else:break
  check('stepper at its limit: focus stays inside Formatting',state()['inMenu'],state())
  page.keyboard.press('Tab');check('stepper at its limit: Tab stays inside Formatting',state()['inMenu'],state());page.keyboard.press('Escape')
  openmenu('Assist');menu('Assist').get_by_role('radio',name='Ruler',exact=True).click();menu('Assist').get_by_role('button',name='Turn all off').click()
  check('Turn all off: focus stays inside Assist',state()['inMenu'],state());page.keyboard.press('Tab');check('Turn all off: Tab stays inside Assist',state()['inMenu'],state());page.keyboard.press('Escape')
  # 2. Orphan recordings.
  mount('b',[{'sectionId':'missing','src':'/valid.wav'}]);openmenu('Listen')
  check('orphan track: no recorded option',menu('Listen').get_by_text('Recorded audiobook',exact=True).count()==0)
  check('orphan track: no player surface or empty-player message',page.locator('.publication-listening-surface').count()==0 and page.get_by_text('No recording for this book yet',exact=True).count()==0)
  page.keyboard.press('Escape')
  mount('b2',[{'sectionId':'missing','src':'/valid.wav'},{'sectionId':'two','src':'/valid.wav'}]);openmenu('Listen')
  check('mixed tracks: a matching track still offers the player',menu('Listen').get_by_text('Recorded audiobook',exact=True).count()==1 and page.locator('.publication-listening-surface').count()==1)
  page.keyboard.press('Escape')
  # 3. Speech ownership across two renderers.
  mount();openmenu('Listen');menu('Listen').get_by_role('button',name='Start',exact=True).click();page.keyboard.press('Escape')
  page.evaluate('window.speechLog=[];window.extra("Unrelated reader")');page.wait_for_timeout(100)
  check('idle second renderer mounting does not cancel the first renderer speech',page.evaluate('!window.speechLog.includes("cancel")'),page.evaluate('window.speechLog'))
  page.evaluate('window.extra("Unrelated reader, new content")');page.wait_for_timeout(100)
  check('idle second renderer changing content does not cancel',page.evaluate('!window.speechLog.includes("cancel")'),page.evaluate('window.speechLog'))
  page.evaluate('window.extraRef.current.stopReadAloud()');check('idle second renderer stop does not cancel',page.evaluate('!window.speechLog.includes("cancel")'),page.evaluate('window.speechLog'))
  page.evaluate('window.removeExtra()');page.wait_for_timeout(100)
  check('idle second renderer unmounting does not cancel',page.evaluate('!window.speechLog.includes("cancel")'),page.evaluate('window.speechLog'))
  check('toolbar still shows the first renderer reading aloud',page.locator('.publication-read-aloud-dock').count()==1)
  page.evaluate('window.speechLog=[]');page.get_by_role('button',name='Stop reading aloud').click()
  check('the owning renderer Stop still cancels its speech',page.evaluate('window.speechLog.includes("cancel")'))
  page.keyboard.press('Escape')
  page.evaluate('window.speechLog=[];window.extra("Second reader")');page.wait_for_timeout(100);page.evaluate('window.extraRef.current.toggleReadAloud()');page.wait_for_timeout(100)
  page.evaluate('window.speechLog=[];window.extra("Second reader, changed")');page.wait_for_timeout(100)
  check('a renderer that owns speech cancels it when its content changes',page.evaluate('window.speechLog.includes("cancel")'),page.evaluate('window.speechLog'))
  page.evaluate('window.extraRef.current.toggleReadAloud();window.speechLog=[];window.removeExtra()');page.wait_for_timeout(100)
  check('a renderer that owns speech cancels it on unmount',page.evaluate('window.speechLog.includes("cancel")'),page.evaluate('window.speechLog'))
  # 4. Stale callbacks.
  openmenu('Listen');menu('Listen').get_by_role('button',name='Start',exact=True).click();page.wait_for_timeout(50)
  page.evaluate('window.oldUtterance=window.utterances.at(-1)')
  page.get_by_role('button',name='Stop reading aloud').click();openmenu('Listen');menu('Listen').get_by_role('button',name='Start',exact=True).click();page.wait_for_timeout(50)
  page.evaluate('window.oldUtterance.onerror({error:"canceled"})');page.wait_for_timeout(50)
  check('late canceled callback cannot clear the new playback state',page.locator('.publication-read-aloud-dock').count()==1 and page.get_by_role('button',name='Pause reading aloud').count()==1)
  page.evaluate('window.oldUtterance.onend()');page.wait_for_timeout(50)
  check('late end callback cannot clear the new playback state',page.locator('.publication-read-aloud-dock').count()==1)
  page.evaluate('for(let i=0;i<150;i++)window.utterances.at(-1).onend()');page.wait_for_timeout(80)
  check('the last utterance ending returns to idle',page.locator('.publication-read-aloud-dock').count()==0)
  check('no browser exceptions',not errors,errors)
 finally:browser.close()
print('REPAIR_JSON='+json.dumps(checks))
failed=[c for c in checks if not c['passed']];print(f'{len(checks)-len(failed)}/{len(checks)} passed');sys.exit(1 if failed else 0)
`;
const scratch = mkdtempSync(resolve(directory, '.repair-scratch-'));
try {
  const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python], { input: JSON.stringify({ bundle: bundle.outputFiles[0].text, css }), encoding: 'utf8', env: { ...process.env, TMPDIR: scratch, TMP: scratch, TEMP: scratch }, maxBuffer: 4 * 1024 * 1024 });
  process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
  process.exitCode = result.status ?? 1;
} finally { rmSync(scratch, { recursive: true, force: true }); }
