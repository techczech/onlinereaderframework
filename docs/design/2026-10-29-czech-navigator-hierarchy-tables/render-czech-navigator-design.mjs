import { chromium } from '/Users/dominiklukes/.npm/_npx/9833c18b2d85bc59/node_modules/playwright/index.mjs';
import { readdirSync } from 'node:fs';
import { dirname,join } from 'node:path';
import { fileURLToPath,pathToFileURL } from 'node:url';
const dir=dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({headless:true,executablePath:'/Users/dominiklukes/Library/Caches/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-mac-arm64/chrome-headless-shell'});
try { const page=await browser.newPage({viewport:{width:1000,height:1000}});
for(const name of readdirSync(dir).filter(n=>n.endsWith('.svg'))){await page.goto(pathToFileURL(join(dir,name)).href);await page.locator('svg').screenshot({path:join(dir,name.replace('.svg','.png'))});}
} finally {await browser.close();}
