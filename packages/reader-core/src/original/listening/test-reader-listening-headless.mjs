/** Isolated real React/media fixture; no reader root build, downloaded media or system Chrome. */
import { build } from '../../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { existsSync, readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const directory = fileURLToPath(new URL('.', import.meta.url));
const root = resolve(directory, '../../../../..');
const fixture = `
import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import {ListeningPanel} from './index.ts';
window.events=[]; window.boundaries=[]; window.media=[];
const NativeAudio=window.Audio;
window.Audio=function(...args){const media=new NativeAudio(...args);window.media.push(media);return media;};
const nativePlay=HTMLMediaElement.prototype.play;
HTMLMediaElement.prototype.play=function(){window.events.push('native-play');if(window.refuseNext){window.refuseNext=false;return Promise.reject(new DOMException('Test refusal','NotAllowedError'));}return nativePlay.call(this);};
const sections=[{id:'one',title:'First chapter'},{id:'gap',title:'Text only'},{id:'three',title:'Third chapter'}];
const recordings=[{sectionId:'one',src:'/fixture-one.wav',label:'Synthetic test audio',alignment:[{start:1,end:4,charStart:0,charEnd:10},{start:8,end:12,charStart:12,charEnd:30}]},{sectionId:'three',src:'/fixture-three.wav'}];
function Host(){
 const [book,setBook]=useState('alpha'),[current,setCurrent]=useState('one'),[tracks,setTracks]=useState(recordings);
 const [mounted,setMounted]=useState(false),[open,setOpen]=useState(false),[view,setView]=useState(0),[pauseSignal,setPauseSignal]=useState(0);
 window.host={setBook:(id)=>{setBook(id);setCurrent('one');setTracks(recordings);},setTracks,setCurrent,unmount:()=>setMounted(false)};
 return <><button onClick={()=>{setMounted(true);setOpen(true);}}>Open listening</button>
 <button onClick={()=>{window.events.push('browser-read-aloud');setPauseSignal(value=>value+1);}}>Browser read aloud</button>
 <button onClick={()=>setView(value=>value+1)}>Change view</button>
 <div hidden={!open} className={'view-'+view}>{mounted&&<ListeningPanel bookId={book} currentSectionId={current}
 sections={sections.map(s=>({...s}))} tracks={tracks.map(t=>({...t}))} onSelectSection={setCurrent} onClose={()=>setOpen(false)}
 onBoundary={boundary=>window.boundaries.push(boundary)} onPlaybackStart={()=>window.events.push('recorded-start')}
 pauseSignal={pauseSignal}/>}</div></>;
}
createRoot(document.getElementById('root')).render(<React.StrictMode><Host/></React.StrictMode>);
`;
const bundle = await build({ absWorkingDir: root, stdin: { resolveDir: directory, contents: fixture, loader: 'tsx' }, bundle: true, write: false, format: 'iife', platform: 'browser', alias: { react: resolve(root, 'apps/reader-demo/node_modules/react'), 'react-dom': resolve(root, 'apps/reader-demo/node_modules/react-dom') } });
const cssFile = resolve(directory, 'listening.css');
const css = existsSync(cssFile) ? readFileSync(cssFile, 'utf8') : '/* No extracted CSS yet. */';
const python = String.raw`
import io,json,sys,wave,re
from pathlib import Path
from playwright.sync_api import sync_playwright,expect
payload=json.load(sys.stdin)
stream=io.BytesIO()
with wave.open(stream,'wb') as wav:
 wav.setnchannels(1);wav.setsampwidth(2);wav.setframerate(8000);wav.writeframes(b'\x00\x00'*8000*24)
audio_bytes=stream.getvalue()
checks=[]
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 assert shells,'Install the existing Playwright headless shell before running this test.'
 browser=p.chromium.launch(headless=True,executable_path=str(shells[-1]))
 try:
  page=browser.new_page(viewport={'width':390,'height':844})
  errors=[];page.on('pageerror',lambda error:errors.append(str(error)))
  def route_handler(route):
   url=route.request.url
   if url.endswith('.wav') and 'unavailable' not in url:route.fulfill(status=200,content_type='audio/wav',body=audio_bytes,headers={'Accept-Ranges':'bytes'})
   elif 'unavailable' in url:route.fulfill(status=404,body='No such test recording')
   else:route.fulfill(content_type='text/html',body='<html><body><div id="root"></div></body></html>')
  page.route('https://listening.test/**',route_handler)
  page.goto('https://listening.test/')
  page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle'])
  opener=page.get_by_role('button',name='Open listening',exact=True)
  opener.click()
  panel=page.get_by_role('region',name='Recorded audiobook',exact=True)
  expect(panel).to_be_visible()
  expect(panel.get_by_role('status')).to_have_text('Paused')
  assert panel.locator('style').count()==0,'Panel styles belong in listening.css, not runtime style elements'
  assert page.evaluate('window.media.every(a=>a.paused)')
  expect(page.get_by_role('button',name='Close recorded audiobook')).to_be_focused()
  page.get_by_role('button',name='Play recording',exact=True).click()
  expect(panel.get_by_role('status')).to_have_text('Playing')
  assert page.evaluate("window.events.indexOf('recorded-start') < window.events.indexOf('native-play') && window.events.includes('recorded-start')"),'Stop browser speech before recorded Play'
  media_count=page.evaluate('window.media.length')
  page.get_by_role('button',name='Change view',exact=True).click()
  expect(panel.get_by_role('status')).to_have_text('Playing')
  assert page.evaluate('window.media.length')==media_count
  page.get_by_role('button',name='Close recorded audiobook',exact=True).click()
  expect(panel).not_to_be_visible();expect(opener).to_be_focused()
  assert page.evaluate('!window.media.at(-1).paused')
  opener.click();expect(panel.get_by_role('status')).to_have_text('Playing')
  checks.append('Real audio plays; view changes and hidden/reopened panel preserve audio; callback precedes native play')
  page.get_by_role('button',name='Browser read aloud',exact=True).click()
  expect(panel.get_by_role('status')).to_have_text('Paused')
  assert page.evaluate('window.media.at(-1).paused')
  page.evaluate('window.refuseNext=true')
  page.get_by_role('button',name='Play recording',exact=True).click()
  expect(panel.get_by_role('alert')).to_contain_text('Playback could not start')
  page.get_by_role('button',name='Play recording',exact=True).click()
  expect(panel.get_by_role('status')).to_have_text('Playing')
  page.get_by_role('button',name='Pause recording',exact=True).click()
  page.get_by_label('Playback speed',exact=True).select_option('1.5')
  seek=page.get_by_role('slider',name=re.compile('Recording position'))
  seek.fill('2')
  expect(seek).to_have_value('2')
  page.get_by_label('Follow text',exact=True).check()
  page.wait_for_function('window.boundaries.at(-1)?.charStart===0')
  page.get_by_role('button',name='Next passage',exact=True).click()
  expect(seek).to_have_value('8')
  page.wait_for_function('window.boundaries.at(-1)?.charStart===12')
  page.get_by_role('button',name='Previous passage',exact=True).click()
  expect(seek).to_have_value('1')
  page.get_by_label('Follow text',exact=True).uncheck()
  page.wait_for_function('window.boundaries.at(-1)===null')
  checks.append('Pause signal, rejected play retry, measured passage seeking and opt-in canonical text boundaries')
  page.get_by_role('button',name='Forward 15 seconds',exact=True).click();expect(seek).to_have_value('16')
  page.get_by_role('button',name='Back 15 seconds',exact=True).click();expect(seek).to_have_value('1')
  page.get_by_role('button',name='Next recorded chapter',exact=True).click()
  expect(page.get_by_role('combobox',name='Recorded chapter',exact=True)).to_have_value('three')
  expect(panel.get_by_role('status')).to_have_text('Paused')
  assert page.get_by_role('button',name='Next passage',exact=True).count()==0
  seek.fill('7');page.get_by_label('Playback speed',exact=True).select_option('1.5')
  page.keyboard.press('Escape');expect(panel).not_to_be_visible();expect(opener).to_be_focused()
  opener.click();expect(seek).to_have_value('7')
  checks.append('Time controls, chapters skip missing, no fabricated passages, close focus and retained hidden panel')
  # Reload and real HTMLAudioElement metadata restoration, with zero playback calls.
  page.reload();page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle']);opener.click()
  expect(page.get_by_role('combobox',name='Recorded chapter',exact=True)).to_have_value('three')
  expect(panel.get_by_role('status')).to_have_text('Paused')
  seek=page.get_by_role('slider',name=re.compile('Recording position'));expect(seek).to_have_value('7')
  assert page.evaluate('window.media.at(-1).currentTime')==7
  assert page.evaluate('window.media.at(-1).playbackRate')==1.5
  assert page.evaluate("!window.events.includes('native-play')")
  page.evaluate("window.host.setBook('beta')")
  expect(page.get_by_role('combobox',name='Recorded chapter',exact=True)).to_have_value('one')
  expect(panel.get_by_role('status')).to_have_text('Paused');expect(seek).to_have_value('0')
  expect(page.get_by_label('Playback speed',exact=True)).to_have_value('1')
  page.evaluate("window.host.setBook('alpha')")
  expect(page.get_by_role('combobox',name='Recorded chapter',exact=True)).to_have_value('three')
  expect(panel.get_by_role('status')).to_have_text('Paused');expect(seek).to_have_value('7')
  checks.append('Reload restores real media time and speed without autoplay; changing books preserves isolated progress')
  page.evaluate("window.host.setTracks([{sectionId:'three',src:'/unavailable.wav'}])")
  expect(panel.get_by_role('alert')).to_contain_text('could not be loaded')
  page.evaluate("window.host.setTracks([])")
  expect(panel).to_contain_text('No recording for this book yet')
  expect(page.get_by_role('button',name='Browser read aloud',exact=True)).to_be_enabled()
  assert page.get_by_role('button',name='Play recording',exact=True).count()==0
  page.evaluate("window.host.setTracks([{sectionId:'three',src:'javascript:alert(1)'}])")
  expect(panel).to_contain_text('No recording for this book yet')
  # Overflow at phone width and keyboard range operation on a real ready recording.
  page.evaluate("window.host.setTracks([{sectionId:'three',src:'/fixture-three.wav'}])")
  expect(panel.get_by_role('status')).to_have_text('Paused')
  for width in [320,390,768]:
   page.set_viewport_size({'width':width,'height':844})
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),'Panel overflow at '+str(width)
  seek=page.get_by_role('slider',name=re.compile('Recording position'));seek.focus();seek.press('Home');seek.press('ArrowRight')
  assert float(seek.input_value())>0
  checks.append('Real media 404, clear empty/unsafe recording state, separate parent browser speech button, narrow widths and keyboard seek')
  assert not errors,errors
  print(json.dumps({'checks':checks,'browser':'Playwright chrome-headless-shell','react':'StrictMode','pageErrors':errors}))
 finally:browser.close()
`;
const scratch = mkdtempSync(resolve(directory, '.test-listening-browser-'));
try {
  const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), ['-c', python], { input: JSON.stringify({ bundle: bundle.outputFiles[0].text, css }), encoding: 'utf8', env: { ...process.env, TMPDIR: scratch, TMP: scratch, TEMP: scratch }, maxBuffer: 2 * 1024 * 1024 });
  process.stdout.write(result.stdout ?? ''); process.stderr.write(result.stderr ?? '');
  if (result.error) throw result.error;
  process.exitCode = result.status ?? 1;
} finally { rmSync(scratch, { recursive: true, force: true }); }
