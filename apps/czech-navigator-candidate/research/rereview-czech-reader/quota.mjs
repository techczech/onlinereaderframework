import {chromium} from '/Users/dominiklukes/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {buildAgentBook} from '../../../../packages/reader-core/dist/agent-export/agent-export.js';
const app=path.resolve('apps/czech-navigator-candidate'),book=JSON.parse(fs.readFileSync(`${app}/book-czech-navigator.json`)),flat=book.sections.flatMap(s=>[s,...s.children??[]]),noun=flat.find(s=>s.id==='nouns');
const ownerEntry=Object.entries(book.compatibility.anchorOwners).find(([a,o])=>o==='nouns'&&a!=='nouns');const [anchor]=ownerEntry;
const generated=buildAgentBook(book);assert.equal(generated.manifest.counts.sections,22);
const browser=await chromium.launch({headless:true,executablePath:'/Users/dominiklukes/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
try{const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.setDefaultTimeout(5000);
await page.route('https://compat.test/**',async route=>{let file=path.join(app,'dist',decodeURIComponent(new URL(route.request().url()).pathname));if(!fs.existsSync(file)||fs.statSync(file).isDirectory())file=path.join(app,'dist/index.html');await route.fulfill({path:file});});
const title=()=>page.locator('.publication-atlas-title');const surface=()=>page.locator('.publication-scroll');
await page.addInitScript(({bookId})=>{const key='publication-reader:'+encodeURIComponent(bookId)+':';localStorage.setItem(key+'readingPositions','{legacy-unparsed');const original=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.includes('compatibility:')&&k.endsWith('original:readingPositions'))throw new DOMException('quota','QuotaExceededError');return original.call(this,k,v);};},{bookId:book.id});
await page.goto('https://compat.test/?section=nouns');await title().filter({hasText:'Nouns'}).waitFor();await surface().evaluate(e=>e.scrollTo({top:400,behavior:'instant'}));await page.waitForTimeout(300);
await page.waitForFunction(()=>history.state?.publicationReadingTop===400);await page.locator('[data-section-id=verbs]').first().click();await title().filter({hasText:'Verbs'}).waitFor();await page.goBack();await title().filter({hasText:'Nouns'}).waitFor();await page.waitForFunction(()=>document.querySelector('.publication-scroll').scrollTop===400);await page.goForward();await title().filter({hasText:'Verbs'}).waitFor();
const result=await page.evaluate(bookId=>{const k='publication-reader:'+encodeURIComponent(bookId)+':';return {positions:localStorage.getItem(k+'readingPositions'),backup:localStorage.getItem(k+'compatibility:czech-parts-2026-10-29:original:readingPositions')};},book.id);assert.equal(result.positions,'{legacy-unparsed');assert.equal(result.backup,null);fs.writeFileSync(app+'/research/rereview-czech-reader/quota.json',JSON.stringify({...result,backForward:true},null,2));console.log('Backup failure preserves original position bytes after scrolling.',JSON.stringify(result));
}finally{await browser.close();}
