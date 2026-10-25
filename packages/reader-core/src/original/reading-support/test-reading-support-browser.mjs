/** Existing repository headless workflow; bundles this module only, never writes shared dist. */
import { build } from '../../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
const dir = dirname(fileURLToPath(import.meta.url));
const root = resolve(dir, '../../../../..');
const fixture = `
import React from 'react'; import {createRoot} from 'react-dom/client';
import {ReadingSupportControls, ReadingSupportSurface, useReadingSupport} from './index.js';
function Fixture() {
 const [book,setBook]=React.useState('a'); const [section,setSection]=React.useState('one'); const controller=useReadingSupport(book);
 window.support={update:controller.update,reset:controller.reset,book:setBook,section:setSection,get:()=>controller.preferences};
 return <><button id="toolbar" onClick={()=>window.toolbarClicked=true}>Toolbar</button><ReadingSupportControls bookId={book} inline/><ReadingSupportSurface bookId={book} sectionId={section}><button id="inner-toolbar">Read aloud</button><article data-publication-content className="publication-content"><p id="p1">First <strong>bold</strong> passage, <a href="#note" id="link">linked</a> to <mark data-highlight-id="saved">saved annotation</mark>. <math xmlns="http://www.w3.org/1998/Math/MathML"><semantics><mi>x</mi><annotation encoding="application/x-tex">x</annotation></semantics></math> <code>const x = 1</code><sup><a href="#note">1</a></sup></p><p id="p2">Second paragraph with ordinary text for focus.</p><p id="note">Footnote body remains readable.</p><h2 id="hh">A heading</h2><table><tbody><tr><td id="cell">A cell</td></tr></tbody></table></article></ReadingSupportSurface></>;
}
createRoot(document.body.appendChild(document.createElement('main'))).render(<Fixture/>);`;
const bundle = await build({stdin:{contents:fixture,loader:'tsx',resolveDir:dir}, alias:{react:resolve(root,'apps/reader-demo/node_modules/react'),'react-dom':resolve(root,'apps/reader-demo/node_modules/react-dom')},bundle:true,write:false,format:'iife',platform:'browser'});
const python=String.raw`
import json,sys
from pathlib import Path
from playwright.sync_api import sync_playwright
payload=json.load(sys.stdin)
with sync_playwright() as p:
    shells=sorted(Path.home().glob('Library/Caches/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
    assert shells, 'Existing bundled Chromium headless shell required; no installation attempted'
    browser=p.chromium.launch(executable_path=str(shells[-1]),headless=True)
    try:
        page=browser.new_page(viewport={'width':1000,'height':900})
        page.set_default_timeout(5000)
        errors=[]
        page.on('pageerror',lambda error: errors.append(str(error)))
        page.route('http://reader.test/**',lambda route:route.fulfill(body='<!doctype html><html><head></head><body></body></html>',content_type='text/html'))
        page.goto('http://reader.test/')
        page.add_style_tag(content=payload['css'])
        page.add_script_tag(content=payload['bundle'])
        page.locator('#p1').wait_for()
        def settle(): page.evaluate('new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))')
        settle()
        assert page.get_by_label('Text size',exact=True).is_visible()
        size=page.get_by_label('Text size',exact=True)
        size.fill('');size.press_sequentially('24');settle();assert page.evaluate('support.get().fontSize')==24
        page.evaluate('support.reset()');settle()
        assert page.get_by_role('button',name='Text and focus',exact=True).count()==0, 'Inline controls have no nested disclosure'
        before=page.locator('article').evaluate('(el)=>({text:el.textContent,html:el.innerHTML,math:el.querySelector("math").outerHTML})')
        page.evaluate('''() => {
          document.activeElement.blur();
          window.originalNodes=[...document.querySelectorAll('article *')];
          const t=document.querySelector('#p1').firstChild;
          const r=document.createRange(); r.setStart(t,0);r.setEnd(t,5);
          getSelection().removeAllRanges();getSelection().addRange(r);
          window.originalTextNode=t;
          support.update({fontFamily:'sans',fontSize:28,lineHeight:2.4,paragraphSpacing:40,letterSpacing:.12,overlay:'line-window'});
        }''')
        settle()
        assert page.evaluate('getSelection().toString()')=='First'
        assert page.evaluate('originalTextNode===document.querySelector("#p1").firstChild && originalNodes.every(n=>n.isConnected)')
        after=page.locator('article').evaluate('(el)=>({text:el.textContent,math:el.querySelector("math").outerHTML})')
        assert after['text']==before['text'] and after['math']==before['math']
        assert page.locator('mark').inner_text()=='saved annotation'
        styles=page.locator('article').evaluate('el=>({font:getComputedStyle(el).fontSize,space:getComputedStyle(el).letterSpacing,line:getComputedStyle(el).lineHeight})')
        assert styles=={'font':'28px','space':'3.36px','line':'67.2px'}, styles
        assert page.locator('#p1').evaluate('el=>getComputedStyle(el).marginBottom')=='40px'
        # The window shades only what lies outside its band: at the top of the text nothing lies above, so one shade is correct.
        assert page.locator('.reading-support-mask').count() in (1,2)
        first=page.evaluate('(()=>{const r=document.createRange();r.selectNodeContents(document.querySelector("#p1"));const b=r.getClientRects()[0];return {top:b.top,bottom:b.bottom}})()')
        assert page.evaluate('([a,b])=>[...document.querySelectorAll(".reading-support-mask")].every(m=>{const r=m.getBoundingClientRect();return r.bottom<=a+1||r.top>=b-1})',[first['top'],first['bottom']]), 'shade must not cover the active line'
        assert page.evaluate('document.querySelector(".reading-support-overlay").getBoundingClientRect().top >= document.querySelector("#inner-toolbar").getBoundingClientRect().bottom'), 'Overlay must start below content toolbar'
        assert page.locator('.reading-support-overlay').evaluate('el=>getComputedStyle(el).pointerEvents')=='none'
        page.get_by_label('Reading assistance',exact=True).select_option('paragraph');settle()
        assert page.locator('.reading-support-overlay').count()==0, 'paragraph focus is its own choice, not an overlay layer'
        page.locator('#p2').hover();settle()
        assert page.locator('#p1').evaluate('el=>getComputedStyle(el).opacity')=='0.1', 'others fade by Dimming (Medium .9)'
        assert page.locator('#p2').evaluate('el=>getComputedStyle(el).opacity')=='1'
        assert page.locator('#hh').evaluate('el=>getComputedStyle(el).opacity')=='0.1' and page.locator('#cell').evaluate('el=>getComputedStyle(el).opacity')=='0.1', 'other headings and table cells fade too'
        page.locator('#hh').hover();settle()
        assert page.locator('#hh').evaluate('el=>getComputedStyle(el).opacity')=='1' and page.locator('#p2').evaluate('el=>getComputedStyle(el).opacity')=='0.1', 'a heading can be the current block'
        page.locator('#cell').hover();settle()
        assert page.locator('#cell').evaluate('el=>getComputedStyle(el).opacity')=='1' and page.locator('#hh').evaluate('el=>getComputedStyle(el).opacity')=='0.1', 'a table cell can be the current block'
        page.locator('#p2').hover();settle()
        page.evaluate('support.update({overlay:"line-window"})');settle()
        assert page.locator('#p1').evaluate('el=>getComputedStyle(el).opacity')=='1', 'a window does not fade paragraphs: the choices are exclusive'
        page.evaluate('support.update({dim:1})');page.locator('#hh').hover();settle()
        assert page.evaluate('(()=>{const h=document.querySelector("#hh").getBoundingClientRect();return [...document.querySelectorAll(".reading-support-mask")].every(m=>{const r=m.getBoundingClientRect();return r.bottom<=h.top+1||r.top>=h.bottom-1})})()'), 'at Dark the window opens over a hovered heading'
        page.locator('#cell').hover();settle()
        assert page.evaluate('(()=>{const h=document.querySelector("#cell").getBoundingClientRect();return [...document.querySelectorAll(".reading-support-mask")].every(m=>{const r=m.getBoundingClientRect();return r.bottom<=h.top+1||r.top>=h.bottom-1})})()'), 'at Dark the window opens over a hovered table cell'
        page.evaluate('support.update({dim:.9})');settle()
        page.locator('#link').click();assert page.evaluate('location.hash')=='#note'
        page.locator('#toolbar').click();assert page.evaluate('window.toolbarClicked')
        page.get_by_label('Reading assistance',exact=True).select_option('ruler');settle()
        assert page.locator('.reading-support-mask').count()==0
        assert page.locator('.reading-support-ruler').count()==1
        surface=page.locator('.reading-support-surface');surface.focus();page.keyboard.press('Home');page.keyboard.press('ArrowDown');settle()
        assert page.locator('#p2').evaluate('el=>el.hasAttribute("data-rs-active")')
        page.keyboard.press('Escape');settle()
        assert page.locator('.reading-support-overlay').count()==0
        assert page.locator('#p1').evaluate('el=>getComputedStyle(el).opacity')=='1'
        page.evaluate('support.book("b")');settle();assert page.evaluate('support.get().fontSize')==20
        page.evaluate('support.book("a")');settle();assert page.evaluate('support.get().fontSize')==28
        page.reload();page.add_style_tag(content=payload['css']);page.add_script_tag(content=payload['bundle']);page.locator('#p1').wait_for();settle()
        assert page.evaluate('support.get().fontSize')==28
        page.evaluate('support.section("two")');settle();assert page.locator('#p1').evaluate('el=>el.hasAttribute("data-rs-active")')
        page.get_by_role('button',name='Reset text and focus',exact=True).click();settle()
        assert page.evaluate('support.get().fontSize')==20
        page.evaluate('''() => {Storage.prototype.setItem=()=>{throw Error('quota')};support.update({fontSize:24});}''');settle()
        assert page.evaluate('support.get().fontSize')==24
        assert page.get_by_role('status').inner_text().startswith('Settings work for this visit')
        assert not errors,errors
        print(json.dumps({'result':'PASS','browser':browser.version,'checks':['inline accessible controls','text-node and selection identity','MathML tree','annotation and links','typography ranges rendered','paragraph focus pointer','line window masks','ruler exclusion','toolbar clicks','keyboard navigation and Escape','per-book isolation and reload','section reset','Reset','guarded storage writes'],'styles':styles}))
    finally: browser.close()
`;
const scratch=mkdtempSync(resolve(dir,'.test-reading-support-'));
try {
 const result=spawnSync(resolve(root,'../book-engine/.venv/bin/python'),['-c',python],{input:JSON.stringify({bundle:bundle.outputFiles[0].text,css:readFileSync(resolve(dir,'support.css'),'utf8')}),encoding:'utf8',maxBuffer:2*1024*1024,env:{...process.env,TMPDIR:scratch,TMP:scratch,TEMP:scratch}});
 process.stdout.write(result.stdout??'');process.stderr.write(result.stderr??'');if(result.error)throw result.error;process.exitCode=result.status??1;
} finally { rmSync(scratch,{recursive:true,force:true}); }
