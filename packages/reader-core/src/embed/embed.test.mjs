import assert from 'node:assert/strict';
import test from 'node:test';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const build = process.env.EMBED_TEST_BUILD;
assert.ok(build, 'Run through test-embed.mjs');
const model = await import(pathToFileURL(path.join(build, 'embed/embed-model.js')).href);
const { checkPublicationEmbeds } = await import(pathToFileURL(path.join(build, 'embed/embed-check.js')).href);
const { renderPublicationContent, publicationContentToText } = await import(pathToFileURL(path.join(build, 'publication-content/index.js')).href);

const good = { id: 'cognition-explorer', sectionId: 'cognition', anchor: 'explorer-text', src: 'cognition-explorer/index.html', title: 'Cognition Explorer diagram' };
const one = item => model.validatePublicationEmbeds({ items: [item] });

test('a sound descriptor is normalised', () => {
  const { embeds, problems } = one(good);
  assert.deepEqual(problems, []);
  assert.deepEqual(embeds, [{ id: 'cognition-explorer', sectionId: 'cognition', anchor: 'reader-content-explorer-text', root: 'embeds/', path: 'embeds/cognition-explorer/index.html',
    title: 'Cognition Explorer diagram', height: { initial: 480, min: 240, max: 1600 }, resize: true }]);
  assert.equal(one({ ...good, anchor: 'reader-content-explorer-text' }).embeds[0].anchor, 'reader-content-explorer-text');
  assert.deepEqual(one({ ...good, height: { initial: 10, min: 300, max: 99999 } }).embeds[0].height, { initial: 300, min: 300, max: 4000 });
});

test('resource paths outside the local embed folder are refused', () => {
  const refused = ['https://evil.test/x.html', '//evil.test/x.html', '/embeds/x.html', '../x.html', 'a/../../x.html', 'a/./x.html', '%2e%2e/x.html', 'a%2Fb.html',
    'a\\b.html', 'x.html?y=1', 'x.html#y', 'javascript:alert(1)', 'data:text/html,<script>1</script>', 'blob:x', 'x.htm', 'x.js', '.hidden/x.html', 'a//x.html', '',
    'a/b/c/d/e/f/g/h/i/x.html', 'x'.repeat(201) + '.html', ' x.html', 'x.html ', 'a..b.html'];
  for (const src of refused) assert.equal(one({ ...good, src }).embeds.length, 0, `src ${JSON.stringify(src)} must be refused`);
  for (const root of ['/embeds/', 'embeds', 'https://evil.test/', '../embeds/', './embeds/', 'em beds/', 'embeds/../', '']) {
    assert.equal(model.validatePublicationEmbeds({ root, items: [good] }).embeds.length, 0, `root ${JSON.stringify(root)} must be refused`);
  }
  assert.equal(model.validatePublicationEmbeds({ root: 'interactive/v1/', items: [good] }).embeds[0].path, 'interactive/v1/cognition-explorer/index.html');
});

test('identity, text and height fields are constrained', () => {
  for (const bad of [{ id: 'Upper' }, { id: '-x' }, { id: 'x-' }, { id: 'a'.repeat(65) }, { id: 'a b' }, { sectionId: '' }, { anchor: '1x' }, { anchor: 'a b' }, { anchor: 'x"y' },
    { title: '' }, { title: 'ab' }, { title: 'x'.repeat(201) }, { title: 42 }, { caption: '' }, { caption: 'x'.repeat(301) },
    { height: { initial: Number.NaN } }, { height: { max: Infinity } }, { height: { min: '300' } }, { height: { min: 900, max: 400 } }, { resize: 'yes' }]) {
    assert.equal(one({ ...good, ...bad }).embeds.length, 0, `must refuse ${JSON.stringify(bad)}`);
  }
  const twice = model.validatePublicationEmbeds({ items: [good, good, { ...good, id: 'other' }] });
  assert.equal(twice.embeds.length, 1, 'duplicate id and duplicate anchor are both refused');
  assert.equal(twice.problems.length, 2);
  assert.equal(model.validatePublicationEmbeds(false).embeds.length, 0);
  assert.equal(model.validatePublicationEmbeds({ items: 'nope' }).embeds.length, 0);
  assert.equal(one({ ...good, title: 'Title <b>with</b>\n tags' }).embeds[0].title, 'Title <b>with</b> tags', 'title is kept as text; React renders it as text');
});

test('runtime URL resolution stays on the page origin inside the root', () => {
  const resolve = (base, pathname = 'embeds/a/index.html', root = 'embeds/') => model.resolvePublicationEmbedUrl(pathname, root, base)?.href ?? null;
  assert.equal(resolve('https://book.example/'), 'https://book.example/embeds/a/index.html');
  assert.equal(resolve('https://book.example/chapter-2?x=1#y'), 'https://book.example/embeds/a/index.html');
  assert.equal(resolve('https://example.org/sub/reader/'), 'https://example.org/sub/reader/embeds/a/index.html');
  assert.equal(resolve('file:///tmp/book/index.html'), null, 'file pages are refused');
  assert.equal(resolve('about:blank'), null);
  assert.equal(resolve('not a url'), null);
  assert.equal(resolve('https://book.example/', '../x.html'), null, 'path must begin with the root');
  assert.equal(resolve('https://book.example/', 'embeds/../x.html'), null);
  assert.equal(resolve('https://book.example/', '//evil.test/embeds/a.html', '//evil.test/'), null);
});

test('height messages: only an exact, bounded payload from an opaque origin', () => {
  const bounds = { min: 240, max: 1600 };
  const read = (data, origin = 'null') => model.readPublicationEmbedHeight(origin, data, bounds);
  const message = height => ({ type: 'reader-embed:height', version: 1, height });
  assert.equal(read(message(700)), 700);
  assert.equal(read(message(700.4)), 700);
  assert.equal(read(message(5)), 240, 'clamped to min');
  assert.equal(read(message(90000)), 1600, 'clamped to max');
  for (const origin of ['https://book.example', 'https://evil.test', '', 'NULL', 'null ']) assert.equal(read(message(700), origin), null, `origin ${origin}`);
  for (const bad of [null, undefined, 700, '700', JSON.stringify(message(700)), [message(700)], message(Number.NaN), message(Infinity), message(-1), message(100001), message('700'),
    { ...message(700), extra: 1 }, { type: 'reader-embed:height', height: 700 }, { ...message(700), version: 2 }, { ...message(700), type: 'reader-embed:navigate' },
    Object.assign(Object.create({ inherited: true }), message(700)), new (class Payload { constructor() { Object.assign(this, message(700)); } })()]) {
    assert.equal(read(bad), null, `payload ${String(JSON.stringify(bad))?.slice(0, 80)}`);
  }
  assert.equal(read(Object.assign(Object.create(null), message(500))), 500, 'a null-prototype structured clone is accepted');
});

const prose = 'Pre-coding activates prior knowledge; decoding turns letters into words; encoding builds a mental model of the text; re-coding turns it into notes.';
const book = sections => ({ id: 'embed-test', title: 'T', author: 'A', description: 'D', sections });

test('build check requires a real prose alternative at the anchor', () => {
  const embeds = { items: [good] };
  assert.deepEqual(checkPublicationEmbeds(book([{ id: 'cognition', title: 'C', category: 'c', format: 'html', content: `<h2>Explorer</h2><div id="explorer-text"><p>${prose}</p></div>` }]), embeds), []);
  assert.deepEqual(checkPublicationEmbeds(book([{ id: 'parent', title: 'P', category: 'c', content: '', children: [{ id: 'cognition', title: 'C', category: 'c', content: `<div id="explorer-text">\n\n${prose}\n\n</div>` }] }]), embeds), [], 'nested Markdown section');
  const problems = sections => checkPublicationEmbeds(book(sections), embeds).join('\n');
  assert.match(problems([{ id: 'other', title: 'O', category: 'c', content: 'x' }]), /section "cognition" is not in book/);
  assert.match(problems([{ id: 'cognition', title: 'C', category: 'c', content: 'No anchor here.' }]), /anchor "reader-content-explorer-text" is not in section/);
  assert.match(problems([{ id: 'cognition', title: 'C', category: 'c', format: 'html', content: '<div id="explorer-text">Click a node.</div>' }]), /prose alternative has 13 characters/);
  assert.match(problems([{ id: 'cognition', title: 'C', category: 'c', format: 'html', content: `<p>See <span id="explorer-text">${prose}</span></p>` }]), /anchor is a <span>/);
  assert.match(problems([{ id: 'cognition', title: 'C', category: 'c', format: 'html', content: `<div id="explorer-text">${prose}</div><div id="explorer-text">${prose}</div>` }]), /used by more than one element/);
  assert.match(checkPublicationEmbeds(book([]), { items: [{ ...good, src: '../x.html' }] }).join('\n'), /src must be a relative path/);
});

test('manuscript HTML still cannot create frames, scripts or embed chrome', () => {
  const hostile = `<iframe src="embeds/a/index.html"></iframe><script>alert(1)</script><object data="x"></object><embed src="x">
    <figure data-publication-embed="cognition-explorer" class="publication-embed"><p>Forged chrome text</p></figure>
    <div id="explorer-text" onclick="alert(1)" style="display:none" data-reader-embed="x"><p>${prose}</p></div>`;
  const html = renderPublicationContent(hostile, 'html');
  assert.doesNotMatch(html, /<iframe|<script|<object|<embed|onclick|style=|data-publication-embed|data-reader-embed/i);
  assert.match(html, /id="reader-content-explorer-text"/);
  assert.match(publicationContentToText(hostile, 'html'), /Forged chrome text/, 'a forged class cannot hide manuscript text from search or speech');
});
