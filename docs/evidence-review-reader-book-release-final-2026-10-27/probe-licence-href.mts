/** Reviewer probe: static licence href variants through every static render site (root, section, standalone, JSON-LD). */
import fs from 'node:fs';
import path from 'node:path';
const app = '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/onlinereaderframework/apps/reader-demo';
const sp = await import(path.join(app, 'scripts/release/static-pages.ts'));
const books = JSON.parse(fs.readFileSync(path.join(app, 'src/books/original-publications.json'), 'utf8'));
const base = books.find((b: any) => b.id === 'deliberate-practice');
const variants = ['javascript:alert(1)', 'java\tscript:alert(1)', 'java\nscript:alert(1)', '  javascript:alert(1)', '\u0001javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'vbscript:x', 'data:text/html,x', 'file:///etc/passwd', 'javascript&#58;alert(1)', '"><script>alert(1)</script>', 'https://ok.example/" onmouseover="x', '//evil.example/x', 'https://creativecommons.org/licenses/by-sa/4.0/'];
const out: any[] = []; let bad = 0;
for (const href of variants) {
  const book = { ...base, home: { ...base.home, license: { label: 'L<b>', href } } };
  const ctx = { book, site: 'https://fixture.invalid/' };
  const root = sp.rootPage(ctx); const section = sp.sectionPage(ctx, book.sections[0]);
  const standalone = sp.standalonePage(ctx, { title: 't', description: 'd', main: '<p>x</p>' });
  const head = sp.headTags(ctx, root, { alias: false });
  const all = [root.html, section.html, standalone, head].join('\n');
  // Extract every licence anchor href as the browser would decode it, and reparse with WHATWG URL.
  const anchors = [...all.matchAll(/<p>Licence: <a href="([^"]*)">/g)].map(m => m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'));
  const ld = [...head.matchAll(/"license":"([^"]*)"/g)].map(m => m[1]);
  const protocols = [...anchors, ...ld].map(h => { try { return new URL(h, 'https://fixture.invalid/').protocol; } catch { return 'unparseable'; } });
  const unsafe = protocols.some(p => p !== 'http:' && p !== 'https:');
  const attrBreak = /onmouseover="|<script>alert/.test(all);
  if (unsafe || attrBreak) bad++;
  out.push({ href: JSON.stringify(href), anchors: anchors.length, jsonLd: ld.length, protocols: [...new Set(protocols)], unsafe, attrBreak });
}
console.log(JSON.stringify(out, null, 1));
console.log(`unsafe outputs: ${bad}`);
process.exitCode = bad ? 1 : 0;
