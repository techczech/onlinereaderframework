/** Checks the built example in dist/ (run `npm run build` or `npm run build:no-embeds` first). Node only; no browser. */
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkPublicationEmbeds, publicationContentToText } from 'reader-core';
import { exampleBook, exampleEmbeds } from './src/example-book.mjs';
import { CONTENT_SECURITY_POLICY, EMBED_CONTENT_SECURITY_POLICY, headerRules, headersFor, renderHeaders } from './hosting-headers.mjs';
import { createPreviewServer, fileFor } from './serve.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, 'dist');
const built = JSON.parse(readFileSync(resolve(dist, 'example-build.json'), 'utf8'));
const read = path => readFileSync(resolve(dist, path), 'utf8');
const ALTERNATIVE = 'Text version of the interactive example.';

test('the reader page loads only its own built files', () => {
  const html = read('index.html');
  assert.match(html, /<script type="module" crossorigin src="\.\/assets\/[^"]+\.js"><\/script>/);
  assert.match(html, /<link rel="stylesheet" crossorigin href="\.\/assets\/[^"]+\.css">/);
  assert.doesNotMatch(html, /(?:src|href)="(?:https?:)?\/\//, 'no outside script or style');
  const css = read(html.match(/href="\.\/(assets\/[^"]+\.css)"/)[1]);
  const fonts = [...css.matchAll(/url\(([^)]+\.woff2)\)/g)].map(match => match[1]);
  assert.ok(fonts.length > 0, 'bundled fonts');
  for (const font of fonts) assert.ok(existsSync(resolve(dist, 'assets', font.replace(/^\.\//, ''))), font);
});

test('the embed registry matches the book, and the text version is ordinary content', () => {
  assert.deepEqual(checkPublicationEmbeds(exampleBook, exampleEmbeds), []);
  const section = exampleBook.sections.flatMap(s => [s, ...(s.children ?? [])]).find(s => s.id === 'line-spacing');
  assert.ok(publicationContentToText(section.content, section.format).includes(ALTERNATIVE));
});

test('agent files carry the text version and no frame', () => {
  const full = built.agentFiles.find(path => path.endsWith('/full.md'));
  assert.ok(full, 'full-text agent file');
  const text = read(full);
  assert.ok(text.includes(ALTERNATIVE));
  assert.doesNotMatch(text, /<iframe|line-spacing\.html/);
  assert.ok(built.agentFiles.some(path => path.endsWith('/manifest.json')));
});

test('embeds are present only in a build with embeds, inline and self-contained', () => {
  const embed = resolve(dist, 'embeds/line-spacing.html');
  if (!built.embeds) { assert.equal(existsSync(resolve(dist, 'embeds')), false, 'no embeds folder'); return; }
  const html = readFileSync(embed, 'utf8');
  assert.ok(html.includes("'reader-embed:height'") && html.includes('startReaderEmbedHeightReporting();'), 'height helper inlined');
  assert.doesNotMatch(html, /<script[^>]+src=|<link[^>]+href=|https?:\/\/|localStorage|sessionStorage|document\.cookie|\bfetch\(|XMLHttpRequest|\bexport\b|reader-embed-child/);
});

test('headers: reader pages are strict, embeds are sandboxed with no network', () => {
  const rules = headerRules({ embeds: built.embeds });
  assert.equal(read('_headers'), renderHeaders(rules));
  const page = headersFor(rules, '/');
  assert.equal(page.get('content-security-policy'), CONTENT_SECURITY_POLICY);
  assert.equal(page.get('x-frame-options'), 'DENY');
  const embed = headersFor(rules, '/embeds/line-spacing.html');
  if (built.embeds) {
    assert.equal(embed.get('content-security-policy'), EMBED_CONTENT_SECURITY_POLICY);
    assert.equal(embed.has('x-frame-options'), false);
    assert.match(EMBED_CONTENT_SECURITY_POLICY, /^sandbox allow-scripts; default-src 'none';.*connect-src 'none'/);
    assert.doesNotMatch(EMBED_CONTENT_SECURITY_POLICY, /allow-same-origin|allow-popups|allow-top-navigation|allow-forms/);
  } else assert.equal(embed.get('content-security-policy'), CONTENT_SECURITY_POLICY);
});

test('the preview server refuses paths outside dist and hidden or encoded names', () => {
  for (const path of ['/../package.json', '/%2e%2e/package.json', '/assets/..%2f..%2fpackage.json', '/.hidden', '/a%5cb', '/%00', '/embeds%2f..%2f..%2fbuild.mjs']) {
    assert.equal(fileFor(dist, path), null, path);
  }
  assert.ok(fileFor(dist, '/'));
  // A real folder with a hidden file, a hidden file in a subfolder and a link: none of them may be served.
  const fixture = mkdtempSync(resolve(here, '.test-serve-'));
  try {
    writeFileSync(resolve(fixture, 'index.html'), 'ok');
    writeFileSync(resolve(fixture, '.secret'), 'hidden');
    mkdirSync(resolve(fixture, 'sub')); writeFileSync(resolve(fixture, 'sub/.hidden'), 'hidden');
    symlinkSync(resolve(fixture, 'index.html'), resolve(fixture, 'link.html'));
    assert.equal(fileFor(fixture, '/index.html'), resolve(fixture, 'index.html'));
    for (const path of ['/.secret', '/sub/.hidden', '/%2esecret', '/link.html']) assert.equal(fileFor(fixture, path), null, path);
  } finally { rmSync(fixture, { recursive: true, force: true }); }
});

test('the preview server sends the hosting headers', async () => {
  const server = createPreviewServer(dist);
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const page = await fetch(base + '/');
    assert.equal(page.status, 200);
    assert.equal(page.headers.get('content-security-policy'), CONTENT_SECURITY_POLICY);
    const agent = await fetch(base + '/' + built.agentFiles[0]);
    assert.equal(agent.status, 200);
    const embed = await fetch(base + '/embeds/line-spacing.html');
    if (built.embeds) {
      assert.equal(embed.status, 200);
      assert.equal(embed.headers.get('content-security-policy'), EMBED_CONTENT_SECURITY_POLICY);
      assert.equal(embed.headers.get('x-frame-options'), null);
    } else assert.equal(embed.status, 404);
    assert.equal((await fetch(base + '/%2e%2e/package.json')).status, 404);
  } finally { await new Promise(done => server.close(done)); }
});


test('the build refuses linked embed source files and directories before replacing dist', () => {
  const scratch = mkdtempSync(resolve(here, '.test-build-source-'));
  try {
    const outside = resolve(scratch, 'outside');
    mkdirSync(outside);
    writeFileSync(resolve(outside, 'line-spacing.html'), '<p>OUTSIDE_SOURCE_CANARY</p><!-- reader-embed-child -->');
    for (const kind of ['leaf', 'directory']) {
      const root = resolve(scratch, kind); mkdirSync(root);
      for (const name of ['build.mjs', 'hosting-headers.mjs', 'index.html']) cpSync(resolve(here, name), resolve(root, name));
      cpSync(resolve(here, 'src'), resolve(root, 'src'), { recursive: true });
      if (kind === 'leaf') { mkdirSync(resolve(root, 'embeds')); symlinkSync(resolve(outside, 'line-spacing.html'), resolve(root, 'embeds/line-spacing.html')); }
      else symlinkSync(outside, resolve(root, 'embeds'));
      mkdirSync(resolve(root, 'dist')); writeFileSync(resolve(root, 'dist/previous.txt'), 'PREVIOUS_BUILD');
      const result = spawnSync(process.execPath, ['build.mjs'], { cwd: root, encoding: 'utf8' });
      assert.notEqual(result.status, 0, `${kind}: linked source must be refused`);
      assert.match(result.stderr, /linked|symbolic/i, `${kind}: explicit source-boundary refusal`);
      assert.equal(readFileSync(resolve(root, 'dist/previous.txt'), 'utf8'), 'PREVIOUS_BUILD', 'refuse before replacing output');
      assert.equal(existsSync(resolve(root, 'dist/embeds')), false, 'outside source not copied');
    }
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});

test('the preview refuses linked default roots, ancestors and build metadata', async () => {
  const scratch = mkdtempSync(resolve(here, '.test-preview-root-'));
  try {
    const outside = resolve(scratch, 'outside'); mkdirSync(outside);
    writeFileSync(resolve(outside, 'example-build.json'), '{"embeds":false}');
    writeFileSync(resolve(outside, 'index.html'), 'OUTSIDE_PREVIEW_CANARY');
    const copied = resolve(scratch, 'copied'); mkdirSync(copied);
    for (const name of ['serve.mjs', 'hosting-headers.mjs']) cpSync(resolve(here, name), resolve(copied, name));
    symlinkSync(outside, resolve(copied, 'dist'));
    const serverModule = await import(pathToFileURL(resolve(copied, 'serve.mjs')).href);
    assert.equal(serverModule.fileFor(resolve(copied, 'dist'), '/'), null);
    assert.throws(() => serverModule.createPreviewServer(), /linked|real|metadata|root/i, 'default dist root is validated before metadata read');
    const alias = resolve(scratch, 'alias'); symlinkSync(scratch, alias);
    assert.equal(fileFor(resolve(alias, 'outside'), '/'), null, 'linked ancestor is refused');
    assert.throws(() => createPreviewServer(resolve(alias, 'outside')), /linked|real|metadata|root/i);
    const metadata = resolve(scratch, 'metadata'); mkdirSync(metadata);
    symlinkSync(resolve(outside, 'example-build.json'), resolve(metadata, 'example-build.json'));
    assert.throws(() => createPreviewServer(metadata), /linked|real|metadata|root/i, 'metadata leaf is refused');
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});

test('a preview root replaced by a link after startup cannot serve outside files', async () => {
  const scratch = mkdtempSync(resolve(here, '.test-preview-swap-'));
  let server;
  try {
    const root = resolve(scratch, 'dist'), outside = resolve(scratch, 'outside');
    mkdirSync(root); mkdirSync(outside);
    writeFileSync(resolve(root, 'example-build.json'), '{"embeds":false}');
    writeFileSync(resolve(outside, 'canary.txt'), 'OUTSIDE_AFTER_START');
    server = createPreviewServer(root);
    await new Promise(done => server.listen(0, '127.0.0.1', done));
    renameSync(root, resolve(scratch, 'original-dist')); symlinkSync(outside, root);
    const response = await fetch(`http://127.0.0.1:${server.address().port}/canary.txt`);
    assert.equal(response.status, 404);
    assert.doesNotMatch(await response.text(), /OUTSIDE_AFTER_START/);
  } finally {
    if (server?.listening) await new Promise(done => server.close(done));
    rmSync(scratch, { recursive: true, force: true });
  }
});
