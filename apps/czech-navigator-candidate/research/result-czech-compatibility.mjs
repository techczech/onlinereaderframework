import {chromium} from '/Users/dominiklukes/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {buildAgentBook} from '../../../packages/reader-core/dist/agent-export/agent-export.js';
const app=path.resolve('apps/czech-navigator-candidate'),book=JSON.parse(fs.readFileSync(`${app}/book-czech-navigator.json`)),flat=book.sections.flatMap(s=>[s,...s.children??[]]),noun=flat.find(s=>s.id==='nouns');
const ownerEntry=Object.entries(book.compatibility.anchorOwners).find(([a,o])=>o==='nouns'&&a!=='nouns');const [anchor]=ownerEntry;
const generated=buildAgentBook(book);assert.equal(generated.manifest.counts.sections,22);
const browser=await chromium.launch({headless:true,executablePath:'/Users/dominiklukes/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
try{const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.setDefaultTimeout(5000);
await page.route('https://compat.test/**',async route=>{let file=path.join(app,'dist',decodeURIComponent(new URL(route.request().url()).pathname));if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(app,'dist/index.html');await route.fulfill({path:file});});
const title=()=>page.locator('.publication-atlas-title');const surface=()=>page.locator('.publication-scroll');
console.log('goto');await page.goto(`https://compat.test/?section=parts-of-speech-nouns-verbs-and-more#${anchor}`);await title().filter({hasText:'Nouns'}).waitFor();
console.log('goto');await page.goto('https://compat.test/?section=parts-of-speech-nouns-verbs-and-more');await title().filter({hasText:'Parts of speech'}).waitFor();
// Exercise the actual delegated manuscript link handler with a retained cross-unit fragment.
await page.locator('[data-publication-content]').evaluate((root,anchor)=>{const a=document.createElement('a');a.href=`#${anchor}`;a.textContent='Compatibility cross-unit fixture';root.prepend(a);},anchor);
await page.getByRole('link',{name:'Compatibility cross-unit fixture'}).click();await title().filter({hasText:'Nouns'}).waitFor();assert.equal(new URL(page.url()).hash,`#${anchor}`);
await page.locator('[data-section-id="verbs"]').first().click();await title().filter({hasText:'Verbs'}).waitFor();assert.equal(await surface().evaluate(e=>e.scrollTop),0);
await page.locator('[data-section-id="nouns"]').first().click();await title().filter({hasText:'Nouns'}).waitFor();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await surface().evaluate(e=>e.scrollTo({top:731,behavior:'instant'}));console.log('position check',await surface().evaluate(e=>e.scrollTop),await page.evaluate(()=>history.state));await page.waitForFunction(()=>history.state?.publicationReadingTop===731);
await page.locator('[data-section-id="verbs"]').first().click();await title().filter({hasText:'Verbs'}).waitFor();console.log('back');await page.goBack();await title().filter({hasText:'Nouns'}).waitFor();console.log('position check',await surface().evaluate(e=>e.scrollTop),await page.evaluate(()=>history.state));await page.waitForFunction(()=>document.querySelector('.publication-scroll').scrollTop===731);
console.log('forward');await page.goForward();await title().filter({hasText:'Verbs'}).waitFor();assert.equal(await surface().evaluate(e=>e.scrollTop),0);
// Home Continue has a separate callback from explicit chapter selection.
await page.locator('[data-section-id="nouns"]').first().click();await title().filter({hasText:'Nouns'}).waitFor();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));await surface().evaluate(e=>e.scrollTo({top:613,behavior:'instant'}));console.log('position check',await surface().evaluate(e=>e.scrollTop),await page.evaluate(()=>history.state));await page.waitForFunction(()=>history.state?.publicationReadingTop===613);
await page.getByRole('button',{name:'Home',exact:true}).first().click();await page.getByRole('button',{name:'Continue reading: Nouns',exact:true}).click();await title().filter({hasText:'Nouns'}).waitFor();console.log('position check',await surface().evaluate(e=>e.scrollTop),await page.evaluate(()=>history.state));await page.waitForFunction(()=>document.querySelector('.publication-scroll').scrollTop===613);
await page.locator('[data-section-id="nouns"]').first().click();assert.equal(await surface().evaluate(e=>e.scrollTop),0);
const quote = await page.evaluate(html=>{const t=document.createElement('template');t.innerHTML=html;return [...t.content.querySelectorAll('p')].map(p=>p.textContent.replace(/\s+/g,' ').trim()).find(text=>text.length>100);},noun.content);
assert.ok(quote);
const storageKey=field=>`publication-reader:${encodeURIComponent(book.id)}:${field}`;
const original=[{id:'legacy-quote',sectionId:'parts-of-speech-nouns-verbs-and-more',sectionTitle:'Parts of speech',text:quote,date:1,note:'retain note',unknown:{retained:true},range:{start:999,end:1111}}];
await page.evaluate(({key,original})=>{localStorage.clear();localStorage.setItem(key+'highlights',JSON.stringify(original));localStorage.setItem(key+'readSections','["parts-of-speech-nouns-verbs-and-more"]');localStorage.setItem(key+'bookmarkedSections','["parts-of-speech-nouns-verbs-and-more"]');localStorage.setItem(key+'lastSection','"parts-of-speech-nouns-verbs-and-more"');},{key:storageKey(''),original});
await page.goto('https://compat.test/');await page.getByRole('button',{name:'Continue reading: Parts of speech: Nouns, Verbs and More',exact:true}).waitFor();
const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey('highlights'));assert.equal(saved[0].sectionId,'nouns');assert.deepEqual(saved[0].unknown,{retained:true});assert.deepEqual(saved[0].range,original[0].range);
assert.deepEqual(await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey('readSections')),['parts-of-speech-nouns-verbs-and-more']);
await page.goto('https://compat.test/?section=nouns');await title().filter({hasText:'Nouns'}).waitFor();assert.ok(await page.locator('mark').count()>0,'legacy quote renders as an actual highlight');
await page.getByRole('searchbox',{name:'Search',exact:true}).fill('Word Order');
await page.locator('.publication-sidebar').getByRole('button',{name:'Word Order',exact:true}).click();await title().filter({hasText:'Word Order'}).waitFor();
console.log(JSON.stringify({status:'passed',units:22,anchor,directLegacy:true,sectionOnly:true,crossUnitInlineFixture:true,explicitTop:true,backForward:true,resume:true,agentUnits:22,legacyHighlightRendered:true,legacyReadNotExpanded:true,search:true}));
}finally{await browser.close();}
