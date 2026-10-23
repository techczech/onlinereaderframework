import { mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from '../../../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
const directory = dirname(fileURLToPath(import.meta.url));
const root = resolve(directory, '../../../../..');
const scratch = mkdtempSync(resolve(directory, '.epub-verification-'));
try {
  await build({ entryPoints: [resolve(directory, 'publication-epub.browser-test.mjs')], bundle: true, format: 'iife', platform: 'browser', outfile: resolve(scratch, 'browser-check.js') });
  await build({ entryPoints: [resolve(directory, 'index.ts')], bundle: true, format: 'cjs', platform: 'node', outfile: resolve(scratch, 'ssr-import.cjs') });
  const ssr = spawnSync(process.execPath, ['-e', `const assert = require('node:assert/strict'); const api = require(${JSON.stringify(resolve(scratch, 'ssr-import.cjs'))}); assert.equal(typeof api.generatePublicationEpub, 'function'); assert.equal(typeof api.downloadPublicationEpub, 'function'); api.generatePublicationEpub({}).then(() => process.exitCode = 1, error => assert.match(error.message, /requires browser/));`], { stdio: 'inherit' });
  if (ssr.status !== 0) throw new Error('SSR import check failed');
  console.log('SSR import without DOM globals passed; browser-only generation fails clearly.');
  const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), [resolve(directory, 'check-publication-epub.py'), resolve(scratch, 'browser-check.js'), root, scratch, ...process.argv.slice(2)], { stdio: 'inherit' });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
