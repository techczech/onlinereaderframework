// Extracts the real contents tree of the three books into data-books-frontpage-2026-10-25.json.
// Reads (never writes) apps/reader-demo/src/books/original-publications.json and the identities in apps/reader-demo/src/App.tsx.
// Usage: node extract-books-frontpage.mjs   (writes beside this file)
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../..');
const books = JSON.parse(readFileSync(join(root, 'apps/reader-demo/src/books/original-publications.json'), 'utf8'));
const app = readFileSync(join(root, 'apps/reader-demo/src/App.tsx'), 'utf8');

// Identity values as configured in App.tsx:7-9 (accent, paper, ink, masthead).
const identity = id => {
  const line = app.split('\n').find(l => l.trimStart().startsWith(`'${id}'`));
  const pick = key => new RegExp(`${key}: '([^']+)'`).exec(line)?.[1];
  return { accent: pick('accent'), paper: pick('paper'), ink: pick('ink'), masthead: pick('masthead') };
};
const words = s => (s ?? '').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;

function node(section) {
  const kids = (section.children ?? []).map(node);
  const n = { id: section.id, title: section.title, words: words(section.content) };
  if (section.category && section.category !== section.title) n.category = section.category;
  const date = /^(\d{4}-\d{2}-\d{2})-/.exec(section.id)?.[1];
  if (date) n.date = date;
  if (kids.length) n.children = kids;
  return n;
}
const leaves = nodes => nodes.flatMap(n => n.children ? leaves(n.children) : [n]);

const out = {
  source: 'apps/reader-demo/src/books/original-publications.json + apps/reader-demo/src/App.tsx:7-9',
  extracted: new Date().toISOString().slice(0, 10),
  books: books.map(b => {
    const tree = b.sections.map(node);
    const all = leaves(tree);
    // A node with children and fewer than 40 words of its own is a group heading, not a chapter.
    const groups = tree.filter(n => n.children && n.words < 40).length;
    return {
      id: b.id, title: b.title, subtitle: b.subtitle ?? null, author: b.author, description: b.description,
      sourceUrl: b.sourceUrl ?? null, badge: b.home?.badge ?? null, authorNote: b.home?.authorNote ?? null,
      license: b.home?.license?.label ?? null, identity: identity(b.id), cover: `cover-${b.id}.jpg`,
      counts: { groups, readable: all.length, entries: tree.length + tree.reduce((s, n) => s + (n.children?.length ?? 0), 0), words: all.reduce((s, n) => s + n.words, 0) },
      categories: [...new Set(b.sections.map(s => s.category).filter(Boolean))].filter(c => b.sections.every(s => !s.children)),
      tree,
    };
  }),
};
writeFileSync(join(here, 'data-books-frontpage-2026-10-25.json'), JSON.stringify(out, null, 1));
for (const b of out.books) console.log(b.id, JSON.stringify(b.counts), 'categories', b.categories.length);
