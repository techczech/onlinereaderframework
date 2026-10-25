// node docs/design/2026-10-25-frontpage-sol/render-frontpage-designs.mjs
// All writes are confined beside this script. No root build or server is used.
import {readFileSync,writeFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const here=dirname(fileURLToPath(import.meta.url));
const read=n=>readFileSync(join(here,n),'utf8');
const block=n=>JSON.parse(read(n).match(/```json\n([\s\S]*?)\n```/)[1]);
const copy=block('copy-frontpage-designs.md');
const books=block('sources-frontpage-books.md');
const tints={'linguistics':'#f7e9df','deliberate-practice':'#f2e9e5','language-muscle':'#e8eee3'};
for(const b of books){
 b.tint=tints[b.id];
 b.cover='data:image/jpeg;base64,'+readFileSync(join(here,`assets/cover-${b.id}.jpg`)).toString('base64');
 if(!b.coverAlt) throw Error(`Missing canonical coverAlt: ${b.id}`);
}
const payload={copy,books,icons:read('assets/icons-frontpage-lucide.svg'),bookCss:read('style-frontpage-book.css'),bookBehaviour:read('behaviour-frontpage-book.js')};
const json=JSON.stringify(payload).replace(/</g,'\\u003c');
const html=`<!doctype html>\n<html lang="en-GB"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${copy.title}</title><style>${read('style-frontpage-comparison.css')}</style></head><body><script>window.FRONT_PAGE=${json};</script><script>${read('behaviour-frontpage-comparison.js')}</script></body></html>`;
writeFileSync(join(here,'frontpage-designs-sol-2026-10-25.html'),html);
console.log(`Built ${copy.variants.length} designs × ${books.length} books; ${html.length} characters. No external assets.`);
