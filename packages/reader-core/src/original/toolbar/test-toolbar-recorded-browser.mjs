/** Listen menu with configured recordings: option appears only then, player focus, and one audio source at a time. Headless Chromium shell only. */
import { build } from '../../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = fileURLToPath(new URL('..', import.meta.url));
const root = resolve(directory, '../../../..');
const bundle = await build({ absWorkingDir: root, stdin: { resolveDir: directory, loader: 'tsx', contents: `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {PublicationReader} from './PublicationReader.tsx';
const sections=[{id:'one',title:'First chapter',category:'First chapter',content:'# First chapter\\n\\n'+'A readable chapter. '.repeat(80)},{id:'two',title:'Second chapter',category:'Second',content:'# Second chapter\\n\\nText only.'}];
window.mount = (id, audio) => { window.root?.unmount(); document.body.innerHTML='<div id="root"></div>'; window.root=createRoot(document.getElementById('root'));
  window.root.render(React.createElement(PublicationReader,{epub:false,audio,book:{id,title:'Fixture',author:'A',description:'D',sections}})); };
` }, bundle: true, write: false, format: 'iife', platform: 'browser', alias: { react: resolve(root, 'apps/reader-demo/node_modules/react'), 'react-dom': resolve(root, 'apps/reader-demo/node_modules/react-dom') } });
const css = readFileSync(resolve(root, 'packages/reader-core/dist/reader.css'), 'utf8');
const python = String.raw`
import io,json,sys,wave,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
payload=json.load(sys.stdin)
stream=io.BytesIO()
with wave.open(stream,'wb') as wav:
 wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(8000);wav.writeframes(b'\x00\x00'*8000*24)
audio_bytes=stream.getvalue()
SPEECH='''() => { window.speechLog=[]; window.SpeechSynthesisUtterance=class{constructor(t){this.text=t}};
 Object.defineProperty(window,'speechSynthesis',{configurable:true,value:{getVoices:()=>[],speak(){window.speechLog.push('speak');window.recordedPlayingAt.push(window.media.some(m=>!m.paused))},cancel(){window.speechLog.push('cancel')},pause(){window.speechLog.push('pause')},resume(){window.speechLog.push('resume');window.recordedPlayingAt.push(window.media.some(m=>!m.paused))}}});
 window.recordedPlayingAt=[]; const N=window.Audio; window.media=[]; window.Audio=function(...a){const m=new N(...a);window.media.push(m);return m}; }'''
checks=[]
def check(name,ok,detail=None):
 checks.append({'name':name,'passed':bool(ok),'detail':detail});print(('PASS ' if ok else 'FAIL ')+name,flush=True)
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 assert shells,'Headless Chromium shell required'
 browser=p.chromium.launch(headless=True,executable_path=str(shells[-1]))
 try:
  page=browser.new_page(viewport={'width':1280,'height':800});page.set_default_timeout(8000)
  errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  def handler(route):
   if route.request.url.endswith('.wav'):route.fulfill(content_type='audio/wav',body=audio_bytes,headers={'Accept-Ranges':'bytes'})
   else:route.fulfill(content_type='text/html',body='<html><body></body></html>')
  page.route('https://reader.test/**',handler)
  page.add_init_script('('+SPEECH+')()')
  page.goto('https://reader.test/?book=rec&section=one')
  page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle'])
  listen=lambda:page.locator('.publication-toolbar-actions').get_by_role('button',name=re.compile('^Listen'))
  def reopen(book,audio):
   page.evaluate('([b,a])=>{history.replaceState(null,"","/?book="+b+"&section=one");window.mount(b,a)}',[book,audio]);page.locator('[data-publication-content]').wait_for()
  # No audio configured: browser read-aloud only, no player mounted.
  reopen('none',None);listen().click()
  menu=page.get_by_role('dialog',name='Listen')
  check('no audio prop: no recorded option, browser read-aloud offered',menu.get_by_text('Recorded audiobook').count()==0 and menu.get_by_role('button',name='Start').is_enabled())
  check('no audio prop: no player surface',page.locator('.publication-listening-surface').count()==0)
  page.keyboard.press('Escape')
  # Tracks with only unusable sources behave as no recordings.
  reopen('bad',[{'sectionId':'one','src':'file:///etc/passwd'}]);listen().click()
  check('unusable track sources do not offer a recording',page.get_by_role('dialog',name='Listen').get_by_text('Recorded audiobook').count()==0 and page.locator('.publication-listening-surface').count()==0)
  page.keyboard.press('Escape')
  # A real track.
  reopen('rec',[{'sectionId':'one','src':'/fixture-one.wav','label':'Synthetic test audio'}]);listen().click()
  menu=page.get_by_role('dialog',name='Listen')
  check('configured track: recorded option and browser option both offered',menu.get_by_text('Recorded audiobook').is_visible() and menu.get_by_role('button',name='Start').is_visible())
  menu.get_by_role('button',name='Open player').click()
  expect(page.get_by_role('button',name='Close recorded audiobook')).to_be_focused()
  check('menu closes and player takes focus',page.get_by_role('dialog',name='Listen').count()==0)
  page.get_by_role('button',name='Play recording').click()
  expect(page.locator('.publication-listening-surface').get_by_role('status').first).to_have_text('Playing')
  page.evaluate('window.rec=window.media.at(-1);window.recCount=window.media.length')
  page.keyboard.press('Escape')
  expect(page.locator('.publication-listening-surface')).to_be_hidden()
  check('Escape returns focus to the Listen button',listen().evaluate('e=>e===document.activeElement'))
  check('recording keeps playing after the player hides',page.evaluate('!window.rec.paused&&window.media.at(-1)===window.rec&&window.media.length===window.recCount'))
  # Menus and formatting do not interrupt it.
  page.locator('.publication-toolbar-actions').get_by_role('button',name=re.compile('^Formatting')).click()
  page.get_by_role('dialog',name='Formatting').get_by_role('button',name='Increase text size').click()
  page.keyboard.press('Escape')
  check('formatting change and menu close keep recording playing',page.evaluate('!window.rec.paused&&window.media.length===window.recCount'))
  # Browser speech pauses the recording; recording play cancels browser speech.
  listen().click();page.get_by_role('dialog',name='Listen').get_by_role('button',name='Start').click()
  page.wait_for_function('window.rec.paused',timeout=2000)
  check('starting browser speech pauses the recording',page.evaluate('window.rec.paused')and page.evaluate('window.speechLog.includes("speak")'))
  page.evaluate('window.speechLog.length=0')
  listen().click();page.get_by_role('dialog',name='Listen').get_by_role('button',name='Open player').click()
  page.get_by_role('button',name='Play recording').click()
  page.wait_for_function('!window.rec.paused')
  page.wait_for_timeout(300)
  check('starting the recording cancels browser speech',page.evaluate('window.speechLog.includes("cancel")')and page.locator('.publication-read-aloud-dock').count()==0,[page.evaluate('window.speechLog'),page.locator('.publication-read-aloud-dock').count()])
  # Ordering, not just the end state: at the instant the engine is asked to speak or resume, no recording may still be playing.
  # The menu button and the keyboard shortcut are tried, each while the recording is playing.
  def play_recording():
   listen().click();page.get_by_role('dialog',name='Listen').get_by_role('button',name='Open player').click()
   play=page.get_by_role('button',name='Play recording')
   if play.count():play.click()
   page.wait_for_function('!window.rec.paused')
   page.wait_for_timeout(200);page.keyboard.press('Escape')
  dock=page.locator('.publication-read-aloud-dock')
  page.evaluate('window.recordedPlayingAt.length=0;window.speechLog.length=0')
  play_recording()
  listen().click();page.get_by_role('dialog',name='Listen').get_by_role('button',name='Start').click()
  page.wait_for_function('window.rec.paused',timeout=2000)
  check('menu Start: the recording was already paused when speech was submitted',page.evaluate('window.recordedPlayingAt.length>=1 && window.recordedPlayingAt.every(x=>x===false)'),page.evaluate('window.recordedPlayingAt'))
  # Pausing speech, then starting the recording, stops the paused speech completely (no dock, engine cancelled).
  dock.get_by_role('button',name='Pause reading aloud').click()
  page.evaluate('window.speechLog.length=0')
  play_recording()
  check('recording Play while speech is paused ends that speech',page.evaluate('window.speechLog.includes("cancel")') and dock.count()==0 and not page.evaluate('window.rec.paused'),[page.evaluate('window.speechLog'),dock.count()])
  # The keyboard shortcut starts speech with the recording playing: still paused first.
  page.evaluate('window.recordedPlayingAt.length=0')
  page.locator('[data-publication-content] h1').focus() if page.locator('[data-publication-content] h1').count() else None
  page.keyboard.press('a')
  page.wait_for_function('window.rec.paused',timeout=2000)
  check('keyboard shortcut: the recording was already paused when speech was submitted',page.evaluate('window.recordedPlayingAt.length>=1 && window.recordedPlayingAt.every(x=>x===false)'),page.evaluate('window.recordedPlayingAt'))
  # Resume and skip-from-paused cannot overlap a recording from the page (its Play ends paused speech, above); their order is in the controller unit tests.
  check('no page errors',not errors,errors)
 finally:browser.close()
failed=[c for c in checks if not c['passed']]
print(json.dumps({'passed':len(checks)-len(failed),'total':len(checks),'failed':failed}))
sys.exit(1 if failed else 0)
`;
const scratch = mkdtempSync(resolve(directory, '.test-toolbar-'));
try {
  const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python], { input: JSON.stringify({ bundle: bundle.outputFiles[0].text, css }), encoding: 'utf8', env: { ...process.env, TMPDIR: scratch, TMP: scratch, TEMP: scratch }, maxBuffer: 4 * 1024 * 1024 });
  process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? ''); if (result.error) throw result.error; process.exitCode = result.status ?? 1;
} finally { rmSync(scratch, { recursive: true, force: true }); }
