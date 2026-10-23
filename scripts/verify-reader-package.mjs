/** Install the actual tarball in an isolated consumer; remove installation scratch on every exit. */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync, cpSync, symlinkSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync, spawnSync } from 'node:child_process';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const online = process.argv.includes('--online');
const buildRoot = resolve(root, 'build');
mkdirSync(buildRoot, { recursive: true });
const scratch = mkdtempSync(resolve(buildRoot, 'package-consumer-'));
try {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  // Build a monorepo containing only core and its build scripts. The demo, manuscripts
  // and original worktrees are deliberately absent; shared dist is never touched.
  const isolatedRoot = resolve(scratch, 'standalone');
  const isolatedCore = resolve(isolatedRoot, 'packages/reader-core');
  cpSync(resolve(root, 'packages/reader-core'), isolatedCore, {
    recursive: true,
    filter: source => !['node_modules', 'dist'].includes(source.split(/[\\/]/).at(-1)),
  });
  mkdirSync(resolve(isolatedRoot, 'scripts'), { recursive: true });
  for (const script of ['build-reader-core.mjs', 'build-reader-styles.mjs']) {
    cpSync(resolve(root, 'scripts', script), resolve(isolatedRoot, 'scripts', script));
  }
  symlinkSync(resolve(root, 'packages/reader-core/node_modules'), resolve(isolatedCore, 'node_modules'), 'dir');
  execFileSync(npm, ['--prefix', 'packages/reader-core', 'run', 'build'], { cwd: isolatedRoot, stdio: 'inherit' });
  assert.ok(existsSync(resolve(isolatedCore, 'dist/reader.css')), 'Standalone core build must create its exported reader.css');
  const css = readFileSync(resolve(isolatedCore, 'dist/reader.css'), 'utf8');
  const fontURLs = [...css.matchAll(/url\((?:['"])?(\.\/fonts\/[^)'"]+)/g)].map(match => match[1]);
  assert.ok(fontURLs.length > 0, 'Standalone build must emit bundled font references');
  for (const url of fontURLs) assert.ok(existsSync(resolve(isolatedCore, 'dist', url)), `Missing font: ${url}`);
  assert.ok(!/https?:\/\//.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'Packaged CSS must not fetch external resources');
  for (const family of ['inter', 'merriweather', 'material-symbols-outlined']) {
    assert.ok(existsSync(resolve(isolatedCore, `dist/fonts/LICENSE-${family}.txt`)), `Missing ${family} notice`);
  }
  const originalCSS = readFileSync(resolve(isolatedCore, 'src/original/reader-original.css'), 'utf8');
  assert.ok(css.includes(originalCSS), 'Original reader CSS must be copied without alteration');
  for (const selector of ['.antialiased', '.prose', '.animate-fade-in-up', '.animate-bounce-in', '.text-emerald-800', '.border-emerald-300', '.dark\\:']) {
    assert.ok(css.includes(selector), `Missing original reader styling: ${selector}`);
  }
  const fixtureClasses = readFileSync(resolve(isolatedCore, 'styles/publication-classes.txt'), 'utf8')
    .split('\n').filter(line => !line.startsWith('#')).join(' ').trim().split(/\s+/);
  assert.ok(fixtureClasses.length >= 66, 'Publication class fixture must supply the extracted HTML classes');
  for (const className of fixtureClasses) {
    const selector = '.' + className.replace(/([^a-zA-Z0-9_-])/g, '\\$1');
    assert.ok(css.includes(selector), `Missing publication HTML class: ${className}`);
  }
  if (process.argv.includes('--standalone-only')) {
    console.log(`Standalone core build passed: CSS, ${fontURLs.length} local font references and three font notices.`);
    process.exitCode = 0;
  } else {
    const packed = JSON.parse(execFileSync(npm, ['pack', '--json', '--ignore-scripts', '--pack-destination', scratch], { cwd: isolatedCore, encoding: 'utf8' }))[0];
    const tarball = resolve(scratch, packed.filename);
    const sha256 = createHash('sha256').update(readFileSync(tarball)).digest('hex');
    const auditRun = spawnSync(process.execPath, [resolve(root, 'scripts/audit-reader-distribution.mjs'), '--summary', '--pack', tarball], { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
    assert.ok([0, 1].includes(auditRun.status), `Distribution auditor failed to run: ${auditRun.stderr}`);
    const audit = JSON.parse(auditRun.stdout);
    assert.equal(audit.pack.sha256, sha256);
    assert.deepEqual(audit.pack.issues, [], 'Actual tarball must pass source/private/manuscript exclusions');
    console.log(`Packed file exclusions passed; installed notice inventory has ${audit.issues.filter(issue => issue.code !== 'optional-not-installed').length} findings (recorded separately).`);
    const contents = packed.files.map(file => file.path);
    for (const required of ['dist/index.js', 'dist/index.d.ts', 'dist/reader.css']) {
      if (!contents.includes(required)) throw new Error(`Package is missing ${required}`);
    }
    if (contents.some(name => /original-publications|\.env|^src\/|\.map$|^styles\/|^docs\/|^research\//.test(name))) throw new Error('Private/demo input leaked into package');
    writeFileSync(resolve(scratch, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
    execFileSync(npm, ['install', ...(online ? [] : ['--offline']), '--ignore-scripts', '--no-audit', '--no-fund', '--min-release-age=7', resolve(scratch, packed.filename), 'react@18.3.1', 'react-dom@18.3.1'], { cwd: scratch, stdio: 'inherit' });
    // Execute native ESM in a fresh Node process: no bundler or DOM globals.
    execFileSync(process.execPath, ['--input-type=module', '-e', `
  import assert from 'node:assert/strict';
  for (const name of ['window', 'document', 'DOMParser', 'XMLSerializer']) assert.equal(typeof globalThis[name], 'undefined');
  const api = await import('reader-core');
  for (const name of ['PublicationReader', 'ReaderShell', 'parseMarkdownToSections', 'generateEpub', 'generatePublicationEpub', 'downloadPublicationEpub']) {
    assert.equal(typeof api[name], 'function', name + ' must remain exported');
  }
  assert.ok(api.renderPublicationContent('**Available**').includes('<strong>Available</strong>'));
  const book = {id:'native-import', title:'Native import', author:'Verification', sections:[]};
  await assert.rejects(api.generatePublicationEpub(book), /requires browser DOMParser and XMLSerializer/);
  await assert.rejects(api.downloadPublicationEpub(book), /requires browser DOMParser and XMLSerializer/);
  console.log('Native Node tarball import and browser-only EPUB rejection passed.');
  `], { cwd: scratch, stdio: 'inherit' });
    writeFileSync(resolve(scratch, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Installed reader package verification</title></head><body><div id="root"></div><script type="module" src="/consumer.jsx"></script></body></html>');
    writeFileSync(resolve(scratch, 'consumer.jsx'), `import React from 'react';
  import {createRoot} from 'react-dom/client';
  import {PublicationReader, ReaderShell, renderPublicationContent} from 'reader-core';
  import 'reader-core/reader.css';
  if(typeof ReaderShell !== 'function' || !renderPublicationContent('**Available**').includes('<strong>')) throw new Error('Public API unavailable');
  const book={id:'package-verification',title:'Installed reader package',author:'Framework verification',description:'Original reader components, loaded through the packaged public API.',home:{features:[{title:'Installed package',description:'Styles and fonts are distributed with the reader.'}]},sections:[{id:'introduction',title:'Introduction',category:'Verification',content:'# Rich content\\n\\nText with **working memory**, a [reference](https://example.org), and a note.[^1]\\n\\n[^1]: Preserved note.\\n\\n| First | Second |\\n| --- | --- |\\n| One | Two |'}]};
  createRoot(document.getElementById('root')).render(<PublicationReader book={book}/>);`);
    const { build } = await import(pathToFileURL(resolve(root, 'apps/reader-demo/node_modules/vite/dist/node/index.js')).href);
    await build({ logLevel: 'warn', configFile: false, root: scratch, base: './', build: { outDir: resolve(buildRoot, 'packaged-consumer-dist'), emptyOutDir: true }, resolve: { dedupe: ['react', 'react-dom'] } });
    writeFileSync(resolve(buildRoot, 'evidence-reader-package.json'), JSON.stringify({ name: packed.name, version: packed.version, node: process.version, npm: execFileSync(npm, ['--version'], { encoding: 'utf8' }).trim(), sha256, integrity: packed.integrity, files: contents, fontReferences: fontURLs.length, stylesheetSha256: createHash('sha256').update(css).digest('hex'), coreLockSha256: createHash('sha256').update(readFileSync(resolve(isolatedCore, 'package-lock.json'))).digest('hex'), packIssues: audit.pack.issues, installedInventoryIssues: audit.issues, uncompressedBytes: packed.unpackedSize, standaloneCoreBuild: true, nativeNodeImport: true, browserOnlyEpubRejection: true, result: `tarball installed ${online ? 'with registry access' : 'offline'} and consumer production build passed` }, null, 2) + '\n');
    console.log('Installed package consumer built successfully; installation scratch removed.');
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
