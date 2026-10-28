// Evidence: approximate pre-check for a future source export. Builds the same 120/160-character exclusion anchors as scripts/prepare-reader-source-release.mjs
// from the two converted manuscripts and scans packages/reader-core (except node_modules/dist) and scripts/templates for them. Read-only.
import fs from 'node:fs';
import path from 'node:path';
const root = path.resolve(process.argv[2] ?? '.');
const books = ['academic-reading-framework', 'readability-foundations'].map(name => JSON.parse(fs.readFileSync(path.join(root, `apps/reader-demo/src/books/next-books/${name}.book.json`), 'utf8')));
const anchors = new Set();
const visit = section => {
  const text = (section.content ?? '').replace(/\r/g, '');
  for (const run of text.split(/\n|<[^>]*>/).filter(s => s.trim().length >= 120)) anchors.add(run.trim().slice(0, 120));
  for (let at = 0; at + 160 <= text.length; at += 80) anchors.add(text.slice(at, at + 160));
  for (const child of section.children ?? []) visit(child);
};
for (const book of books) for (const section of book.sections) visit(section);
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.name === 'node_modules' || e.name === 'dist' || e.name.startsWith('.test-build') ? [] : e.isDirectory() ? walk(path.join(dir, e.name)) : e.isFile() ? [path.join(dir, e.name)] : []);
const files = [...walk(path.join(root, 'packages/reader-core')), ...walk(path.join(root, 'scripts/templates'))];
const hits = [];
for (const file of files) { const text = fs.readFileSync(file, 'utf8'); for (const anchor of anchors) if (text.includes(anchor)) { hits.push(path.relative(root, file)); break; } }
console.log(JSON.stringify({ anchors: anchors.size, filesScanned: files.length, hits }));
process.exitCode = hits.length ? 1 : 0;
