import {chromium} from '/Users/dominiklukes/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import fs from 'node:fs';import assert from 'node:assert/strict';
const base=process.env.TABLE_CHECK_URL||'http://127.0.0.1:5191/';const out='apps/czech-navigator-candidate/research/refine-czech-visuals/';const phase=base.startsWith('https')?'live':'local';
const browser=await chromium.launch({headless:true,executablePath:'/Users/dominiklukes/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
const results=[];
try {const page=await browser.newPage();
for(const width of [1440,390]) for(const scale of [1,2]) {
await page.setViewportSize({width,height:1000});
await page.goto(base+'?section=how-parts-of-speech-interact-when-combined-in-a-sentence');
const matrix=page.locator('#reader-content-czech-table-168');await matrix.waitFor();await page.evaluate(()=>document.fonts.ready);
// The actual format control caps at 28px, so 200% uses browser text sizing as supplementary coverage.
if(scale===2)await page.evaluate(()=>document.documentElement.style.fontSize='200%');
const columnWeights=await matrix.evaluate(t=>[...t.rows[0].cells].map(c=>getComputedStyle(c.querySelector('p')||c).fontWeight));assert.ok(columnWeights.every(w=>Number(w)>=700));
const snapshot=await matrix.evaluate(t=>[...t.rows].map(r=>[...r.cells].map(c=>({text:c.textContent,rowspan:c.rowSpan,colspan:c.colSpan}))));
const weights=await matrix.evaluate(t=>[...t.rows].map(r=>getComputedStyle(r.cells[0].querySelector('p')||r.cells[0]).fontWeight));assert.ok(weights.every(w=>Number(w)>=700));
await matrix.scrollIntoViewIfNeeded();await matrix.locator('xpath=ancestor::section').screenshot({path:out+`${phase}-matrix-${width}-${scale}.png`});
const notes=page.locator('[data-publication-reflection]');const field=notes.getByRole('textbox');
await page.evaluate(()=>localStorage.setItem('unrelated-reader-value','keep-exact'));
await field.fill('Previous saved note — žluťoučký');await notes.getByRole('button',{name:'Save Reflection'}).click();await page.reload();await assert.doesNotReject(()=>page.getByRole('textbox',{name:'Key lessons and reflections'}).waitFor());assert.equal(await page.getByRole('textbox',{name:'Key lessons and reflections'}).inputValue(),'Previous saved note — žluťoučký');
await page.getByRole('textbox',{name:'Key lessons and reflections'}).fill('Previous saved note — žluťoučký\nAdditional reflection');await page.getByRole('button',{name:'Save Reflection'}).click();await page.reload();assert.equal(await page.getByRole('textbox',{name:'Key lessons and reflections'}).inputValue(),'Previous saved note — žluťoučký\nAdditional reflection');assert.equal(await page.evaluate(()=>localStorage.getItem('unrelated-reader-value')),'keep-exact');
if(scale===2)await page.evaluate(()=>document.documentElement.style.fontSize='200%');await notes.scrollIntoViewIfNeeded();await notes.screenshot({path:out+`${phase}-notes-${width}-${scale}.png`});
assert.deepEqual(await matrix.evaluate(t=>[...t.rows].map(r=>[...r.cells].map(c=>({text:c.textContent,rowspan:c.rowSpan,colspan:c.colSpan})))),snapshot);
await page.goto(base+'?section=prepositions');const diagram=page.locator('img[src$="/image62-wmf.png"]');await diagram.waitFor();if(scale===2)await page.evaluate(()=>document.documentElement.style.fontSize='200%');
for(const colorScheme of ['light','dark']) {await page.emulateMedia({colorScheme});assert.equal(await diagram.evaluate(e=>getComputedStyle(e).mixBlendMode),'multiply');await diagram.scrollIntoViewIfNeeded();await page.screenshot({path:out+`${phase}-diagram-${width}-${scale}-${colorScheme}.png`});}
results.push({width,scale,axisWeights:weights,columnWeights,cellTextAndSpansUnchanged:true,notesSaveReload:true,unknownStoragePreserved:true,diagramBlend:'multiply'});
}
fs.writeFileSync(out+phase+'-results.json',JSON.stringify(results,null,2));console.log(results);
}finally{await browser.close()}
