/** Install the actual tarball in an isolated consumer; remove installation scratch on every exit. */
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const online = process.argv.includes('--online');
const buildRoot = resolve(root, 'build');
mkdirSync(buildRoot, { recursive: true });
const scratch = mkdtempSync(resolve(buildRoot, 'package-consumer-'));
try {
  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const packed = JSON.parse(execFileSync(npm, ['pack', '--json', '--pack-destination', scratch], { cwd: resolve(root, 'packages/reader-core'), encoding: 'utf8' }))[0];
  const contents = packed.files.map(file => file.path);
  for (const required of ['dist/index.js', 'dist/index.d.ts', 'dist/reader.css']) {
    if (!contents.includes(required)) throw new Error(`Package is missing ${required}`);
  }
  if (contents.some(name => /original-publications|\.env|^docs\/|^research\//.test(name))) throw new Error('Private/demo input leaked into package');
  writeFileSync(resolve(scratch, 'package.json'), JSON.stringify({ private: true, type: 'module' }));
  execFileSync(npm, ['install', ...(online ? [] : ['--offline']), '--ignore-scripts', '--no-audit', '--no-fund', resolve(scratch, packed.filename), 'react@18.3.1', 'react-dom@18.3.1'], { cwd: scratch, stdio: 'inherit' });
  writeFileSync(resolve(scratch, 'index.html'), '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Installed reader package verification</title></head><body><div id="root"></div><script type="module" src="/consumer.jsx"></script></body></html>');
  writeFileSync(resolve(scratch, 'consumer.jsx'), `import React from 'react';
import {createRoot} from 'react-dom/client';
import {PublicationReader, ReaderShell, renderPublicationContent} from 'reader-core';
import 'reader-core/reader.css';
if(typeof ReaderShell !== 'function' || !renderPublicationContent('**Available**').includes('<strong>')) throw new Error('Public API unavailable');
const book={id:'package-verification',title:'Installed reader package',author:'Framework verification',description:'Original reader components, loaded through the packaged public API.',home:{features:[{title:'Installed package',description:'Styles and fonts are distributed with the reader.'}]},sections:[{id:'introduction',title:'Introduction',category:'Verification',content:'# Rich content\\n\\nText with **working memory**, a [reference](https://example.org), and a note.[^1]\\n\\n[^1]: Preserved note.\\n\\n| First | Second |\\n| --- | --- |\\n| One | Two |'}]};
createRoot(document.getElementById('root')).render(<PublicationReader book={book}/>);`);
  const { build } = await import(pathToFileURL(resolve(root, 'apps/reader-demo/node_modules/vite/dist/node/index.js')).href);
  await build({ configFile: false, root: scratch, base: './', build: { outDir: resolve(buildRoot, 'packaged-consumer-dist'), emptyOutDir: true }, resolve: { dedupe: ['react', 'react-dom'] } });
  writeFileSync(resolve(buildRoot, 'evidence-reader-package.json'), JSON.stringify({ name: packed.name, version: packed.version, integrity: packed.integrity, files: contents, uncompressedBytes: packed.unpackedSize, result: `tarball installed ${online ? 'with registry access' : 'offline'} and consumer production build passed` }, null, 2) + '\n');
  console.log('Installed package consumer built successfully; installation scratch removed.');
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
