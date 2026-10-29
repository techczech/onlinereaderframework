/** Host adapter: consumes the freshly generated public book without changing it. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildAgentBook, buildAgentRootIndex } from '../../../packages/reader-core/dist/agent-export/index.js';
import { renderPublicationContent } from '../../../packages/reader-core/dist/publication-content/index.js';
import { rewriteReaderLinksInHtml } from '../../../packages/reader-core/dist/agent-export/agent-links.js';

const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicRoot = path.join(app, 'public');
const siteUrl = 'https://czechnavigator.dominiklukes.net/';
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const bookBytes = await fs.readFile(path.join(app, 'book-czech-navigator.json'), 'utf8');
const book = JSON.parse(bookBytes);
const exported = buildAgentBook(book, { siteUrl });
const sections = [];
const walk = units => { for (const unit of units) { sections.push(unit); walk(unit.children ?? []); } };
walk(book.sections);
const rendered = sections.map(unit => renderPublicationContent(unit.content, unit.format));
const contentIds = new Set(rendered.flatMap(html => [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1])));
const fixSourceFragments = html => html.replace(/(href="[^"#]*#)([^"#]+)(")/g, (whole, start, fragment, end) => {
  return !contentIds.has(fragment) && contentIds.has(`reader-content-${fragment}`) ? `${start}reader-content-${fragment}${end}` : whole;
});
for (const file of exported.files) if (file.path.endsWith('.md')) file.content = fixSourceFragments(file.content);
const ids = new Set(sections.map(unit => unit.id));
const sectionTarget = id => `#unit-${encodeURIComponent(id)}`;
const navigation = sections.map(unit => `<li><a href="${sectionTarget(unit.id)}">${escape(unit.title)}</a></li>`).join('');
const bodies = sections.map((unit, i) => {
  let html = rewriteReaderLinksInHtml(rendered[i], {
    bookId: book.id, has: id => ids.has(id), index: '#contents', chapter: sectionTarget,
    anchorOwner: anchor => book.compatibility?.anchorOwners[anchor], unresolved: () => {},
  });
  // The shared exporter appends source fragments to chapter URLs. In this
  // single document the final fragment is the target, rather than a second #.
  html = html.replace(/href="#unit-[^"#]+#([^" ]+)"/g, 'href="#$1"');
  html = fixSourceFragments(html);
  return `<section id="unit-${escape(encodeURIComponent(unit.id))}"><h2>${escape(unit.title)}</h2>${html}<p><a href="#contents">Contents</a></p></section>`;
}).join('\n');
const staticPage = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${escape(book.title)} — complete text</title><style>body{max-width:80rem;margin:auto;padding:1rem;font:1.1rem/1.6 Georgia,serif}img{max-width:100%;height:auto}table{border-collapse:collapse;display:block;overflow:auto}th,td{border:1px solid;padding:.3rem}section{margin-block:3rem}a{overflow-wrap:anywhere}</style></head><body><h1>${escape(book.title)}</h1><p>${escape(book.author)}</p><p>${escape(book.description)}</p><p><a href="/">Interactive reader</a> · <a href="${escape(exported.manifest.links.index)}">Agent index</a> · <a href="${escape(exported.manifest.links.full)}">Full Markdown</a></p><nav id="contents" aria-label="Complete book contents"><ol>${navigation}</ol></nav><main>${bodies}</main></body></html>\n`;
const files = [...exported.files, buildAgentRootIndex([exported], { siteUrl, title: book.title }), { path: 'czech-navigator-complete.html', content: staticPage }];
// Validate the entire parcel before writing. No deletion, no configurable output root,
// and no symlink traversal, including pre-existing final output files.
for (const file of files) {
  if (/\/Users\/|file:\/\/|publication-reader:|privateAnnotations|sourceEvidence/i.test(file.content)) throw new Error('Non-public content in generated output');
  const target = path.resolve(publicRoot, file.path);
  if (!target.startsWith(publicRoot + path.sep)) throw new Error('Output escapes public root');
  for (let current = target; current !== app; current = path.dirname(current)) {
    const stat = await fs.lstat(current).catch(error => { if (error.code !== 'ENOENT') throw error; });
    if (stat?.isSymbolicLink()) throw new Error('Symlink in output path');
  }
}
for (const file of files) {
  const target = path.join(publicRoot, file.path);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.writeFile(target, file.content);
}
if (await fs.readFile(path.join(app, 'book-czech-navigator.json'), 'utf8') !== bookBytes) throw new Error('Book changed during export; rerun after semantic generation finishes');
console.log(`Served exports: ${sections.length} units, ${files.length} files; compatibility map ${book.compatibility ? 'present' : 'ABSENT (parent integration required)'}`);
