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
const flat = s => s.flatMap(x => [x, ...flat(x.children ?? [])]);
const front = text => { const m = text.match(/^---\n([\s\S]*?)\n---\n/); return m ? { raw: m[1], body: text.slice(m[0].length) } : null; };













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



test('prompts point at the book and chapter addresses and ask for citations; the attached prompt names no address', () => {
  const links = mod.agentBookLinks('https://h.example/sub/agent/', 'b');
  const p = mod.agentPrompt({ title: 'T', author: 'A', indexUrl: links.index, fullUrl: links.full });
  assert.ok(p.includes('https://h.example/sub/agent/b/index.md') && p.includes('/b/full.md') && /Cite chapter titles/.test(p));
  const c = mod.agentPrompt({ title: 'T', author: 'A', indexUrl: links.index, fullUrl: links.full, chapterTitle: 'Ch', chapterUrl: links.chapter('c1') });
  assert.ok(c.includes('/b/chapters/c1.md'));
  assert.ok(!/https?:|\.md/.test(mod.agentAttachedPrompt({ title: 'T', author: 'A' })));
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

// Public URL boundary (2026-10-25 configuration review). Credentials in these fixtures are the synthetic `u:p`, never real ones.
const PRIVATE_OR_MALFORMED_SITES = [
  'javascript:alert(1)', 'JaVaScRiPt:alert(1)', 'data:text/html,hi', 'file:///tmp/book', 'ftp://example.org/',
  'https://u:p@example.org/sub/', 'https://u@example.org/', 'https://@example.org/', 'https://example.org/sub/?x=1', 'https://example.org/sub/#frag',
  'https://example.org/sub/?', 'https://example.org/sub/#', 'https:example.org/sub/', 'https:/example.org/', 'https:///', 'https://example.org\\sub/',
  'https://example.org/sub/../escape/', 'https://example.org/sub/%2e%2e/escape/', 'https://example.org/sub/%2E%2E/escape/', 'https://example.org/sub/./x/', 'https://example.org/sub/.%2e/x/',
  'https://example.org/a%2fb/', 'https://example.org/a%5cb/', 'https://example.org/a%zz/', 'https://example.org/a%00/', 'https://exa\tmple.org/', 'https://example.org/a b/', 'https://example.org/a\nb/',
  'https://example.org/a)[x](https://evil.example/', '\u0000https://example.org/', 'https://example.org./',
  'http://127.0.0.1:8773/', 'http://100.85.55.122:8773/', 'http://[::ffff:127.0.0.1]/', 'http://[::ffff:7f00:1]/', 'http://[::ffff:10.0.0.1]/', 'http://[::ffff:192.168.1.1]/',
  'http://[::ffff:172.16.0.1]/', 'http://[::ffff:100.85.55.122]/', 'http://[::127.0.0.1]/', 'http://[64:ff9b::10.0.0.1]/', 'http://[fe80::1]/', 'http://[fd00::1]/', 'http://[::1]/',
  'http://127.1/', 'http://0x7f.0.0.1/', 'http://2130706433/', 'http://0177.0.0.1/', 'https://localhost./', 'https://LOCALHOST/', 'https://box.local./', 'https://box.tail123.ts.net./',
  'https://printer.home.arpa/', 'https://myserver/', null, 5, {}, ['https://example.org/'], '  ',
];

test('canonicalSiteUrl applies the exact-URL rules to the raw value before the URL parser can repair it', () => {
  for (const [input, expected] of [['https://example.org', 'https://example.org/'], ['HTTPS://Example.ORG/Sub', 'https://example.org/Sub/'], ['http://public.example.org:8080/a/b', 'http://public.example.org:8080/a/b/'],
    ['https://example.org/b%C3%BCcher/', 'https://example.org/b%C3%BCcher/'], ['http://8.8.8.8/', 'http://8.8.8.8/'], ['http://[2606:4700::1]/', 'http://[2606:4700::1]/'], ['https://sub.example.org/a/b//', 'https://sub.example.org/a/b/']]) {
    assert.equal(mod.canonicalSiteUrl(input), expected, input);
  }
  for (const bad of PRIVATE_OR_MALFORMED_SITES) assert.equal(mod.canonicalSiteUrl(bad), undefined, JSON.stringify(bad));
});

test('private-host aliases are private: final DNS dots, numeric IPv4 forms and IPv4 inside IPv6', () => {
  for (const host of ['localhost.', 'LOCALHOST', 'box.local.', 'box.tail123.ts.net.', 'printer.home.arpa', '[::ffff:127.0.0.1]', '::ffff:7f00:1', '[::ffff:a00:1]', '[::ffff:c0a8:101]',
    '[::ffff:ac10:1]', '127.1', '0x7f.0.0.1', '2130706433', '[fe80::1]', '[fd12::1]', '[ff02::1]', '[::]', '[64:ff9b::a00:1]', '[2002:c0a8:101::1]', '', 'a b', null, 5]) {
    assert.equal(mod.isPrivateHost(host), true, JSON.stringify(host));
  }
  for (const host of ['example.org', 'example.org.', '8.8.8.8', '[2606:4700::1]', '[::ffff:8.8.8.8]', '100.63.1.1']) assert.equal(mod.isPrivateHost(host), false, host);
});

test('both generators refuse an unusable public address before producing any file, and never echo it', () => {
  const book = fixtureBook([{ id: 'c', title: 'C', category: 'x', content: 'x' }]);
  const good = mod.buildAgentBook(book, { siteUrl: 'https://Example.org/sub' });
  assert.equal(good.siteUrl, 'https://example.org/sub/');
  assert.ok(good.files.every(f => !f.content.includes('Example.org')) && good.manifest.links.index === 'https://example.org/sub/agent/b/index.md');
  for (const relative of [undefined, '']) assert.equal(mod.buildAgentBook(book, { siteUrl: relative }).siteUrl, undefined);
  for (const bad of PRIVATE_OR_MALFORMED_SITES) {
    const label = JSON.stringify(bad);
    const refused = error => /siteUrl|public address/i.test(error.message) && !error.message.includes('u:p') && !error.message.includes('127.0.0.1');
    assert.throws(() => mod.buildAgentBook(book, { siteUrl: bad }), refused, label);
    assert.throws(() => mod.buildAgentRootIndex([good], { siteUrl: bad }), refused, label);
    // A hand-made export cannot carry an address the generator would have refused.
    assert.throws(() => mod.buildAgentRootIndex([{ ...good, siteUrl: bad }]), refused, label);
  }
  const root = mod.buildAgentRootIndex([{ ...good, siteUrl: 'https://Example.org/sub' }]);
  assert.ok(root.content.includes('(https://example.org/sub/agent/b/index.md)') && !root.content.includes('Example.org'));
});

const urlModule = () => import(pathToFileURL(path.join(root, 'agent-export/agent-location.js')).href);

test('the reader box rebases its folder from the current reader root onto the public reader prefix', async () => {
  const { agentLocations } = await urlModule();
  const site = 'https://public.example.org/sub/reader/';
  for (const documentUrl of ['http://127.0.0.1:8773/sub/reader/?book=b&section=c', 'http://127.0.0.1:8773/sub/reader/index.html#x']) {
    for (const directory of ['agent', 'static/agent']) {
      const local = `http://127.0.0.1:8773/sub/reader/${directory}/`;
      const generated = mod.buildAgentBook(fixtureBook([{ id: 'c', title: 'C', category: 'x', content: 'x' }]), { siteUrl: site, directory });
      for (const path_ of [`${directory}/`, `./${directory}`, `/sub/reader/${directory}/`, local]) {
        const where = agentLocations({ path: path_, siteUrl: site, documentUrl });
        assert.deepEqual(where, { local, public: `${site}${directory}/` }, path_);
        assert.equal(mod.agentBookLinks(where.public, 'b').index, generated.manifest.links.index, path_);
      }
      // A folder written as its full public address still downloads from the page being previewed.
      assert.deepEqual(agentLocations({ path: `${site}${directory}/`, siteUrl: site, documentUrl }), { local, public: `${site}${directory}/` });
    }
  }
  assert.deepEqual(agentLocations({ path: '/static/agent/', siteUrl: 'https://public.example.org/', documentUrl: 'http://127.0.0.1:8773/?book=b' }),
    { local: 'http://127.0.0.1:8773/static/agent/', public: 'https://public.example.org/static/agent/' });
  assert.deepEqual(agentLocations({ siteUrl: site, documentUrl: 'http://127.0.0.1:8773/sub/reader/' }), { local: 'http://127.0.0.1:8773/sub/reader/agent/', public: `${site}agent/` });
  // Public page without a configured address: its own reader root is the public prefix.
  assert.deepEqual(agentLocations({ path: 'static/agent/', documentUrl: 'https://public.example.org/sub/reader/?book=b' }), { local: `${site}static/agent/`, public: `${site}static/agent/` });
  // Server render: no page address yet, so only the public folder is known.
  assert.deepEqual(agentLocations({ path: '/sub/reader/static/agent/', siteUrl: site }), { public: `${site}static/agent/` });
  assert.deepEqual(agentLocations({ path: 'static/agent/', siteUrl: site }), { public: `${site}static/agent/` });
  assert.deepEqual(agentLocations({ path: 'agent/' }), {});
  assert.deepEqual(agentLocations({ path: 'agent/', documentUrl: 'file:///Users/reader/dist/index.html' }), { local: 'file:///Users/reader/dist/agent/' });
});

test('a folder given as its full public address: downloads under the current reader root, the prompt under siteUrl, whatever the two prefixes are', async () => {
  const { agentLocations } = await urlModule();
  const book = fixtureBook([{ id: 'c', title: 'C', category: 'x', content: 'x' }]);
  for (const site of ['https://public.example.org/', 'https://public.example.org/sub/reader/', 'https://books.example.net:8443/a/b/']) {
    for (const page of ['http://127.0.0.1:18793/', 'http://127.0.0.1:18793/sub/reader/', 'http://127.0.0.1:18793/preview/x/', 'http://box.local:8773/r/', 'https://public.example.org/sub/reader/']) {
      for (const query of ['', '?book=b', '?book=b&section=c', 'index.html?book=b#top']) {
        for (const directory of ['agent', 'static/agent', 'a/b/agent']) {
          const generated = mod.buildAgentBook(book, { siteUrl: site, directory });
          for (const path_ of [`${site}${directory}/`, `${site}${directory}`]) {
            const where = agentLocations({ path: path_, siteUrl: site, documentUrl: `${page}${query}` });
            const label = `${path_} on ${page}${query}`;
            assert.deepEqual(where, { local: `${page}${directory}/`, public: `${site}${directory}/` }, label);
            assert.equal(mod.agentBookLinks(where.public, 'b').index, generated.manifest.links.index, label);
          }
        }
      }
    }
    // Server render: only the public folder is known.
    assert.deepEqual(agentLocations({ path: `${site}static/agent/`, siteUrl: site }), { public: `${site}static/agent/` });
  }
  // The same public origin outside siteUrl, another origin, or a lookalike host is still refused for the default folder under the current root.
  const site = 'https://public.example.org/sub/reader/', documentUrl = 'http://127.0.0.1:18793/preview/?book=b';
  for (const bad of ['https://public.example.org/sub/static/agent/', 'https://public.example.org/sub/reader-other/agent/', 'http://public.example.org/sub/reader/agent/', 'https://public.example.org:444/sub/reader/agent/',
    'https://cdn.example.net/sub/reader/static/agent/', '//cdn.example.net/static/agent/', 'https://public.example.org.evil.example/sub/reader/static/agent/', `${site}../agent/`, `${site}static/%2fagent/`]) {
    assert.deepEqual(agentLocations({ path: bad, siteUrl: site, documentUrl }), { local: 'http://127.0.0.1:18793/preview/agent/', public: `${site}agent/` }, bad);
  }
});

test('an unsafe or out-of-scope folder is ignored for the default folder; it never becomes an active link', async () => {
  const { agentLocations } = await urlModule();
  const site = 'https://public.example.org/sub/reader/';
  for (const documentUrl of ['http://127.0.0.1:8773/sub/reader/?book=b', 'https://public.example.org/sub/reader/?book=b', undefined]) {
    const fallback = agentLocations({ path: 'agent/', siteUrl: site, documentUrl });
    for (const bad of ['javascript:alert(1);void(0)//x', 'JAVASCRIPT:alert(1)', ' javascript:alert(1)', 'java\tscript:alert(1)', 'data:text/html,x', 'vbscript:x', 'file:///etc/', 'blob:https://public.example.org/x',
      '../agent/', '%2e%2e/agent/', '%2E%2E/agent/', '.%2e/agent/', 'agent/%2f/x', 'a%5c..%5cb', '..\\agent\\', 'static/../../agent/', 'agent/./x', '/sub/agent/', '/agent/', '/sub/reader/../agent/',
      'https://evil.example/agent/', '//evil.example/agent/', 'https://u:p@public.example.org/sub/reader/agent/', 'https://public.example.org/sub/other/agent/', 'http://127.0.0.1:8773/other/agent/',
      'agent/?x=1', 'agent/#x', 'agent/?', 'a b/', 'agent%zz/', 'static\\agent\\', 'static/age\tnt/', 'static/agent%2F', '', null, 5, {}]) {
      const where = agentLocations({ path: bad, siteUrl: site, documentUrl });
      assert.deepEqual(where, fallback, `${JSON.stringify(bad)} on ${documentUrl}`);
      for (const href of Object.values(where)) assert.match(href, /^https?:\/\/[^/]+\/sub\/reader\/agent\/$/, JSON.stringify(bad));
    }
  }
});

test('a private or malformed configured address is ignored: no private address reaches a hosted-fetch prompt', async () => {
  const { agentLocations } = await urlModule();
  for (const bad of PRIVATE_OR_MALFORMED_SITES) {
    assert.deepEqual(agentLocations({ path: 'agent/', siteUrl: bad, documentUrl: 'http://127.0.0.1:8773/sub/reader/' }), { local: 'http://127.0.0.1:8773/sub/reader/agent/' }, JSON.stringify(bad));
    assert.deepEqual(agentLocations({ path: 'agent/', siteUrl: bad, documentUrl: 'https://public.example.org/sub/reader/' }), { local: 'https://public.example.org/sub/reader/agent/', public: 'https://public.example.org/sub/reader/agent/' }, JSON.stringify(bad));
  }
  for (const page of ['http://localhost.:8773/', 'http://[::ffff:127.0.0.1]/', 'https://box.tail123.ts.net./r/', 'http://100.85.55.122:8773/']) {
    const where = agentLocations({ path: 'agent/', documentUrl: page });
    assert.equal(where.public, undefined, page);
    assert.ok(where.local?.endsWith('/agent/'), page);
  }
});
