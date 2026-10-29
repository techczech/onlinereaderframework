import { chromium } from '/Users/dominiklukes/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const browser=await chromium.launch({headless:true, executablePath:"/Users/dominiklukes/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell"});
try {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:5189/'); await page.waitForTimeout(1000);
 console.log(await page.locator('a,button').evaluateAll(es=>es.map(e=>({tag:e.tagName,text:e.innerText,href:e.getAttribute('href'),visible:!!e.getClientRects().length}))));
 await page.getByRole('button',{name:'Parts of speech: Nouns, Verbs and More',exact:true}).filter({visible:true}).first().click();
 await page.waitForTimeout(500);
 console.log((await page.locator('body').innerText()).slice(0,1700));
 console.log('tables',await page.locator('table').count());
 await page.locator('table').first().scrollIntoViewIfNeeded();
 await page.screenshot({path:'research/screenshot-czech-navigator-desktop-table.png'});
 await page.setViewportSize({width:390,height:844});
 await page.waitForTimeout(300);
 if(!await page.locator('aside').isVisible()) console.log('sidebar closed');
 await page.locator('input[type=search]').fill('slovesa');
 await page.waitForTimeout(300);
 console.log('search-results',await page.locator('aside').textContent());
 await page.screenshot({path:'research/screenshot-czech-navigator-mobile-search.png'});

 await page.locator('button[aria-label="Close navigation"]').evaluate(e=>e.click());
 await page.evaluate(()=>{const cell=document.querySelector('table [colspan],table [rowspan]');(cell?.closest('table')??document.querySelector('table')).scrollIntoView();});
 await page.waitForTimeout(300);
 await page.screenshot({path:'research/screenshot-czech-navigator-mobile-table.png'});
 console.log('dimensions',await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,tables:[...document.querySelectorAll('table')].map(t=>({cols:t.rows[0]?.cells.length,scroll:t.scrollWidth,client:t.clientWidth,merged:t.querySelectorAll('[colspan],[rowspan]').length})).sort((a,b)=>b.cols-a.cols).slice(0,5)})));
 await page.setViewportSize({width:1440,height:1000});
 await page.evaluate(()=>document.querySelector('table').scrollIntoView());
 await page.screenshot({path:'research/screenshot-czech-navigator-desktop-table.png'});
}finally{await browser.close();}
