import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import path from 'node:path';
import ts from 'typescript';
const root = process.env.AGENT_EXPORT_TEST_ROOT;
const here = path.dirname(fileURLToPath(import.meta.url));
const mod = await import(pathToFileURL(path.join(root, 'agent-export/index.js')).href);
const model = await import(pathToFileURL(path.join(root, 'original/publication-model.js')).href);
const anchored = await import(pathToFileURL(path.join(root, 'original/reading-support/anchored-reading.js')).href);
const books = JSON.parse(readFileSync(path.join(here, '../../../../apps/reader-demo/src/books/original-publications.json'), 'utf8'));
const flat = s => s.flatMap(x => [x, ...flat(x.children ?? [])]);
const EXPECTED = { 'deliberate-practice': [21, 21], 'language-muscle': [12, 12], linguistics: [262, 253] };
const front = text => { const m = text.match(/^---\n([\s\S]*?)\n---\n/); return m ? { raw: m[1], body: text.slice(m[0].length) } : null; };
const exports_ = Object.fromEntries(books.map(b => [b.id, mod.buildAgentBook(b)]));

test('every book: all section ids in reading order, counts, and one file per section', () => {
  for (const book of books) {
    const out = exports_[book.id], sections = flat(book.sections);
    assert.deepEqual(out.manifest.sections.map(s => s.id), sections.map(s => s.id), book.id);
    assert.deepEqual(out.manifest.sections.map(s => s.order), sections.map((_, i) => i + 1));
    assert.equal(out.manifest.counts.sections, EXPECTED[book.id][0]);
    assert.equal(out.manifest.counts.withText, EXPECTED[book.id][1]);
    const chapterFiles = out.files.filter(f => f.path.includes('/chapters/'));
    assert.equal(chapterFiles.length, sections.length);
    assert.equal(new Set(chapterFiles.map(f => f.path)).size, sections.length);
    assert.ok(out.manifest.counts.words > 1000 && out.manifest.counts.characters > out.manifest.counts.words);
  }
});

test('markdown sections are preserved byte for byte in chapter files and, in order, in full.md', () => {
  for (const book of books.filter(b => b.id !== 'language-muscle')) {
    const out = exports_[book.id];
    const full = out.files.find(f => f.path.endsWith('/full.md')).content;
    let cursor = 0;
    for (const section of flat(book.sections)) {
      const file = out.files.find(f => f.path.endsWith(`/chapters/${mod.agentSegment(section.id)}.md`));
      const { raw, body } = front(file.content);
      assert.ok(raw.includes(`section_id: ${JSON.stringify(section.id)}`));
      if (!section.content.trim()) { assert.match(body, /no text of its own/); continue; }
      assert.ok(body.includes(section.content), `${section.id} verbatim in chapter file`);
      const at = full.indexOf(section.content, cursor);
      assert.ok(at >= cursor, `${section.id} in full.md after the previous section`);
      cursor = at + 1;
    }
  }
});

test('code, tables, footnote-like attribution, source lines and the image link survive', () => {
  const dp = exports_['deliberate-practice'].files.find(f => f.path.endsWith('/full.md')).content;
  assert.ok(dp.includes('https://www.notion.so/icons/command-line_gray.svg'));
  const source = flat(books.find(b => b.id === 'deliberate-practice').sections).map(s => s.content).join('\n');
  for (const m of source.match(/```[\s\S]*?```/g) ?? []) assert.ok(dp.includes(m));
  for (const row of (source.match(/^\|.*\|$/gm) ?? [])) assert.ok(dp.includes(row));
  const ling = exports_.linguistics.files.find(f => f.path.endsWith('/full.md')).content;
  assert.equal((ling.match(/Original answer: \[/g) ?? []).length, 253);
  assert.equal((ling.match(/Licence: \[/g) ?? []).length, 253);
});

test('html sections keep their structure through the reader sanitiser, with a title heading added', () => {
  const lm = books.find(b => b.id === 'language-muscle'), out = exports_['language-muscle'];
  for (const section of flat(lm.sections)) {
    const file = out.files.find(f => f.path.endsWith(`/chapters/${mod.agentSegment(section.id)}.md`));
    const { raw, body } = front(file.content);
    assert.ok(raw.includes('format: "html"'));
    assert.match(body, /^\s*(# |<h1)/);
    assert.ok((body.match(/<(p|ul|ol|h[1-6]|table)[\s>]/g) ?? []).length >= (section.content.match(/<(p|ul|ol|h[1-6]|table)[\s>]/g) ?? []).length);
    assert.ok(!/<script|onclick=|javascript:/i.test(body));
  }
});

test('every relative link in every generated file resolves to a generated file; no private paths or browser state', () => {
  const base = 'https://example.test/sub/';
  const paths = new Set(Object.values(exports_).flatMap(o => o.files.map(f => f.path)).concat('llms.txt'));
  const root = mod.buildAgentRootIndex(Object.values(exports_));
  const files = [root, ...Object.values(exports_).flatMap(o => o.files)];
  let checked = 0;
  for (const file of files) {
    assert.ok(!/\/Users\/|\/private\/|localStorage|highlights/.test(file.content.replace(/highlight/gi, '')) || !/\/Users\//.test(file.content), file.path);
    assert.ok(!file.content.includes('/Users/'), file.path);
    const own = new URL(file.path, base);
    const links = file.path.endsWith('.json') ? [] : [...file.content.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1]).filter(l => !/^(<|https?:|#)/.test(l) && !l.includes('?'));
    const fm = [...file.content.matchAll(/^(?:previous|next|book_index|full_text): "([^"]+)"$/gm)].map(m => m[1]);
    for (const link of [...links, ...fm]) {
      const target = new URL(link, own);
      assert.ok(target.href.startsWith(base), `${file.path} -> ${link}`);
      assert.ok(paths.has(target.pathname.slice('/sub/'.length)), `${file.path} -> ${link} (${target.pathname})`);
      checked++;
    }
    // reader links stay inside the site and carry the book and section parameters
    for (const m of file.content.matchAll(/\]\(((?:\.\.\/|\.\/)+\?book=[^)]+)\)/g)) assert.ok(new URL(m[1], own).href.startsWith(base));
  }
  assert.ok(checked > 1500, `links checked: ${checked}`);
});

test('siteUrl makes every link absolute; relative output has none of that host', () => {
  const out = mod.buildAgentBook(books[0], { siteUrl: 'https://books.example.org/reader' });
  const text = out.files.map(f => f.content).join('\n');
  assert.ok(text.includes('https://books.example.org/reader/agent/'));
  assert.ok(text.includes('https://books.example.org/reader/?book=deliberate-practice&section=about-this-guide'));
  assert.ok(!exports_['deliberate-practice'].files.some(f => f.content.includes('books.example.org')));
  const root = mod.buildAgentRootIndex([out], { siteUrl: 'https://books.example.org/reader' });
  assert.ok(root.content.includes('(https://books.example.org/reader/agent/deliberate-practice/index.md)'));
});

test('book and section ids become safe, distinct path segments; unusable ids are refused', () => {
  const segs = ['../x', 'a/b', '..', '.', '%2e%2e', 'é', 'é', 'a b', 'a~b', 'a_b'].map(mod.agentSegment);
  assert.equal(new Set(segs).size, segs.length);
  for (const s of segs) assert.match(s, /^[A-Za-z0-9_~-]+$/);
  assert.throws(() => mod.agentSegment(''));
  assert.throws(() => mod.agentSegment('x'.repeat(300)));
  const book = { id: '../evil/book', title: 'T', author: 'A', description: '', sections: [{ id: 's/../1', title: 'S', category: 'c', content: 'x' }] };
  const out = mod.buildAgentBook(book);
  for (const f of out.files) { assert.ok(!f.path.includes('..') && f.path.split('/').length <= 4); assert.ok(f.path.startsWith('agent/~')); }
  assert.throws(() => mod.buildAgentBook({ ...book, sections: [book.sections[0], book.sections[0]] }));
  assert.throws(() => mod.buildAgentBook({ ...book, sections: [{ ...book.sections[0], id: 'home' }] }));
});

test('reader links match the reader\'s own publicationUrl; private hosts are recognised', () => {
  const ours = mod.readerLink('https://h.example/sub/', 'b 1', 'c/2');
  assert.equal(ours, model.publicationUrl('https://h.example/sub/', 'b 1', 'c/2').href);
  for (const host of ['localhost', '127.0.0.1', '10.1.2.3', '192.168.0.4', '172.16.0.1', '100.85.55.122', '100.64.0.1', '100.127.9.9', 'mac.local', 'box.tail1234.ts.net', '[::1]', 'myserver']) assert.equal(mod.isPrivateHost(host), true, host);
  for (const host of ['dominiklukes.net', 'books.example.org', '8.8.8.8', '100.63.1.1', '100.128.0.1', '172.32.0.1']) assert.equal(mod.isPrivateHost(host), false, host);
});

test('prompts point at the book and chapter addresses and ask for citations; the attached prompt names no address', () => {
  const links = mod.agentBookLinks('https://h.example/sub/agent/', 'b');
  const p = mod.agentPrompt({ title: 'T', author: 'A', indexUrl: links.index, fullUrl: links.full });
  assert.ok(p.includes('https://h.example/sub/agent/b/index.md') && p.includes('/b/full.md') && /Cite chapter titles/.test(p));
  const c = mod.agentPrompt({ title: 'T', author: 'A', indexUrl: links.index, fullUrl: links.full, chapterTitle: 'Ch', chapterUrl: links.chapter('c1') });
  assert.ok(c.includes('/b/chapters/c1.md'));
  assert.ok(!/https?:|\.md/.test(mod.agentAttachedPrompt({ title: 'T', author: 'A' })));
});

test('anchored reading: leadLength is WriteFlex\'s own, and lead spans follow its word walk', async () => {
  const source = readFileSync('/Users/dominiklukes/gitrepos/06_apps-utilities/01_desktop-apps/writeflex-desktop/src/renderer/src/editor/sentences.ts', 'utf8');
  const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
  const wf = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
  const words = ['a', 'to', 'the', 'work', 'memory', 'fluency', 'practice', 'deliberate', 'extraordinary', 'écrivain', 'naïveté', '“quoted”', "don't", '3.5', '–', 'Привет', 'Straße', 'żółć', 'ａｂｃ', '日本語', 'x'.repeat(40)];
  for (const w of words) assert.equal(anchored.leadLength(w), wf.leadLength(w), w);
  const text = 'The “quoted” écrivain wrote naïveté, don\'t 3.5 –  Привет';
  const spans = anchored.leadSpans(text);
  const tokens = [...text.matchAll(/\S+/g)];
  assert.equal(spans.length, tokens.length);
  spans.forEach((s, i) => { assert.equal(s.from, tokens[i].index); assert.equal(s.to - s.from, Math.min(wf.leadLength(tokens[i][0]), tokens[i][0].length)); });
  assert.equal(anchored.normaliseLeadStyle('bold'), 'contrast');
  assert.equal(anchored.normaliseLeadStyle('colour'), 'colour');
});

const fixtureBook = (sections, extra = {}) => ({ id: 'b', title: 'T', author: 'A', description: '', sections, ...extra });
const chapterOf = (out, id) => out.files.find(f => f.path.endsWith(`/chapters/${mod.agentSegment(id)}.md`)).content;
const bodyOf = text => text.slice(text.indexOf('\n---\n', 4) + '\n---\n'.length + 1);

test('Markdown is exported verbatim, including trailing newlines, spaces and a code hard break', () => {
  for (const content of ['# H\n\nText ends here.\n\n', 'Plain, one trailing space \n', 'Line one  \nline two\\\nthree\n```\ncode  \n```\n  ', 'No newline at all']) {
    const out = mod.buildAgentBook(fixtureBook([{ id: 'c', title: 'C', category: 'x', content }]));
    const body = bodyOf(chapterOf(out, 'c'));
    assert.equal(body.endsWith(content), true, JSON.stringify(content));
    assert.equal(body, `${/^\s*#[ \t]+\S/.test(content) ? '' : '# C\n\n'}${content}`, JSON.stringify(content));
    const full = out.files.find(f => f.path.endsWith('/full.md')).content;
    assert.ok(full.includes(`\n\n${content}\n\n`) || full.endsWith(`${content}\n`), `full.md keeps ${JSON.stringify(content)}`);
  }
});

test('the directory option is validated by both generators before any path is produced', () => {
  const book = fixtureBook([{ id: 'c', title: 'C', category: 'x', content: 'x' }]);
  for (const directory of ['../outside', '/absolute', 'safe/../../outside', '..', '', '.', './', 'a//b', 'a\\b', '%2e%2e/x', 'https://evil.example/x', 'file:///tmp/x', 'a/b:c', 'a\0b', 'a b', null, 5]) {
    assert.throws(() => mod.buildAgentBook(book, { directory }), /directory/i, JSON.stringify(directory));
    assert.throws(() => mod.buildAgentRootIndex([mod.buildAgentBook(book)], { directory }), /directory/i, JSON.stringify(directory));
  }
  assert.equal(mod.agentDirectory('./agent/'), 'agent');
  assert.equal(mod.agentDirectory('./static/./agent//'.replace('//', '/')), 'static/agent');
  for (const directory of ['agent', './agent', 'static/agent/', 'v1.2/agent_x']) {
    const out = mod.buildAgentBook(book, { directory });
    for (const file of out.files) assert.ok(!file.path.split('/').includes('..') && !file.path.startsWith('/') && file.path.startsWith(`${mod.agentDirectory(directory)}/`), file.path);
  }
});

test('a nested directory keeps every reader link pointing at the reader root', () => {
  const book = fixtureBook([{ id: 'c', title: 'C', category: 'x', content: 'x' }]);
  const out = mod.buildAgentBook(book, { directory: 'safe/nested' });
  for (const file of out.files.filter(f => !f.path.endsWith('.json'))) {
    const own = new URL(file.path, 'https://books.example/sub/');
    for (const m of file.content.matchAll(/reader_url: "([^"]+)"|\]\(((?:\.\.\/|\.\/)+\?book=[^)]+)\)/g)) {
      const url = new URL(JSON.parse(`"${m[1] ?? m[2]}"`), own);
      assert.equal(url.pathname, '/sub/', `${file.path} ${m[1] ?? m[2]}`);
    }
    for (const m of file.content.matchAll(/^(?:previous|next|book_index|full_text): "([^"]+)"$/gm)) assert.ok(out.files.some(f => f.path === new URL(m[1], own).pathname.slice('/sub/'.length)), `${file.path} -> ${m[1]}`);
  }
  const reader = new URL(out.manifest.sections[0].readerUrl, 'https://books.example/sub/safe/nested/b/index.md');
  assert.equal(reader.pathname, '/sub/');
  const root = mod.buildAgentRootIndex([out], { directory: 'safe/nested' });
  assert.ok(root.content.includes('(safe/nested/b/index.md)'));
});

test('reader chapter references resolve to exported chapter files in chapter and full-book contexts', () => {
  const html = '<p>See <a href="#/two">the second</a>, <a href="#/two#reader-content-part">its part</a>, <a href="?book=b&amp;section=two">query form</a>, <a href="#/%C3%A9">encoded</a>, <a href="#/missing">gone</a>, <a href="?book=other&amp;section=two">other book</a>, <a href="https://cite.example/x#/two">citation</a>, <a href="#local">local</a>, <a href="#/">start</a>.</p><pre><code>&lt;a href="#/two"&gt;sample&lt;/a&gt; and #/two</code></pre>';
  const book = fixtureBook([{ id: 'one', title: 'One', category: 'x', format: 'html', content: html }, { id: 'two', title: 'Two', category: 'x', content: '# Two\n\ntext' }, { id: 'é', title: 'E', category: 'x', content: 'e' }]);
  const out = mod.buildAgentBook(book);
  const chapter = chapterOf(out, 'one');
  const full = out.files.find(f => f.path.endsWith('/full.md')).content;
  const expectChapter = [['href="two.md"', 2], ['href="two.md#reader-content-part"', 1], ['href="~e9~.md"', 1], ['href="../index.md"', 1]];
  for (const [text, n] of expectChapter) assert.equal(chapter.split(text).length - 1, n, `${text} in chapter`);
  const expectFull = [['href="chapters/two.md"', 2], ['href="chapters/two.md#reader-content-part"', 1], ['href="chapters/~e9~.md"', 1], ['href="index.md"', 1]];
  for (const [text, n] of expectFull) assert.equal(full.split(text).length - 1, n, `${text} in full.md`);
  for (const text of [chapter, full]) {
    assert.ok(text.includes('href="#/missing"') && text.includes('href="?book=other&#x26;section=two"') && text.includes('href="https://cite.example/x#/two"') && text.includes('href="#local"'));
    assert.ok(text.includes('&#x3C;a href="#/two">sample') && text.includes('and #/two'), 'code example untouched');
    assert.ok(text.includes('>the second</a>'), 'link text kept');
  }
  assert.deepEqual(out.manifest.unresolvedLinks, [{ section: 'one', href: '#/missing' }]);
  const absolute = mod.buildAgentBook(book, { siteUrl: 'https://books.example/sub' });
  assert.ok(chapterOf(absolute, 'one').includes('href="https://books.example/sub/agent/b/chapters/two.md"'));
});

test('real Language Muscle step-2 links to the Fine-tuning your aims chapter file', () => {
  const out = exports_['language-muscle'], chapter = chapterOf(out, 'step-2');
  assert.ok(!chapter.includes('href="#/fine-tuning-aims"'));
  const target = /href="([^"]*fine-tuning-aims\.md)"/.exec(chapter)?.[1];
  assert.ok(target, 'resolved href');
  const resolved = new URL(target, 'https://books.example/sub/agent/language-muscle/chapters/step-2.md').pathname.slice('/sub/'.length);
  assert.ok(out.files.some(f => f.path === resolved), resolved);
  assert.deepEqual(out.manifest.unresolvedLinks, []);
  const full = out.files.find(f => f.path.endsWith('/full.md')).content;
  assert.ok(full.includes('href="chapters/fine-tuning-aims.md"') && !full.includes('href="#/fine-tuning-aims"'));
});

test('Markdown reader references stay verbatim; resolved files are listed in a note after the section', () => {
  const content = '# One\n\nSee [two](#/two) and [bad](#/nope) and [out](https://cite.example/#/two).\n\n```md\n[code](#/two)\n```\n\nInline `[x](#/two)` too.\n';
  const book = fixtureBook([{ id: 'one', title: 'One', category: 'x', content }, { id: 'two', title: 'Two', category: 'x', content: 'two' }]);
  const out = mod.buildAgentBook(book);
  const body = bodyOf(chapterOf(out, 'one'));
  assert.ok(body.startsWith(content), 'authored Markdown kept byte for byte');
  const note = body.slice(content.length);
  assert.match(note, /\[two\]\(two\.md\) \(written as `#\/two`\)/);
  assert.match(note, /bad: `#\/nope` has no exported file/);
  assert.equal((note.match(/#\/two/g) ?? []).length, 1, 'code and citation are not annotated');
  assert.deepEqual(out.manifest.unresolvedLinks, [{ section: 'one', href: '#/nope' }]);
  assert.equal(bodyOf(chapterOf(mod.buildAgentBook(fixtureBook([{ id: 'p', title: 'P', category: 'x', content: 'plain' }])), 'p')), '# P\n\nplain');
});

test('whitespace-only Markdown keeps its bytes; only an empty string gets the structural explanation', () => {
  for (const content of [' \n\t  ', '\n', ' ', 'x  \n\n  ']) {
    const out = mod.buildAgentBook(fixtureBook([{ id: 'raw', title: 'raw', category: 'x', content }, { id: 'after', title: 'After', category: 'x', content: 'AFTER' }]));
    assert.equal(bodyOf(chapterOf(out, 'raw')), `# raw\n\n${content}`, JSON.stringify(content));
  }
  const empty = mod.buildAgentBook(fixtureBook([{ id: 'raw', title: 'raw', category: 'x', content: '' }]));
  assert.match(bodyOf(chapterOf(empty, 'raw')), /^# raw\n\nThis section has no text of its own/);
});
