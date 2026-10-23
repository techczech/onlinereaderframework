import { mkdtempSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
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
  console.log('Bundled service import without DOM globals passed; browser-only generation fails clearly.');
  const core = resolve(root, 'packages/reader-core');
  const esmOutput = resolve(scratch, 'native-esm');
  const compile = spawnSync(process.execPath, [
    'node_modules/typescript/bin/tsc', 'src/services/publication-epub/index.ts',
    '--target', 'ES2020', '--module', 'ESNext', '--moduleResolution', 'Bundler',
    '--strict', '--skipLibCheck', '--esModuleInterop', '--lib', 'ES2020,DOM,DOM.Iterable',
    '--rootDir', 'src', '--outDir', esmOutput,
  ], { cwd: core, stdio: 'inherit' });
  if (compile.status !== 0) throw new Error('Isolated EPUB TypeScript compilation failed');
  const serviceUrl = pathToFileURL(resolve(esmOutput, 'services/publication-epub/index.js')).href;
  const native = spawnSync(process.execPath, ['--input-type=module', '-e', `
    import assert from 'node:assert/strict';
    const api = await import(${JSON.stringify(serviceUrl)});
    assert.equal(typeof api.generatePublicationEpub, 'function');
    assert.equal(typeof api.downloadPublicationEpub, 'function');
    await assert.rejects(api.generatePublicationEpub({}), /requires browser/);
  `], { stdio: 'inherit' });
  if (native.status !== 0) throw new Error('Native ESM service import failed');
  console.log('Isolated EPUB TypeScript compilation and native ESM service import passed without DOM globals.');
  const result = spawnSync(resolve(root, '../book-engine/.venv/bin/python'), [resolve(directory, 'check-publication-epub.py'), resolve(scratch, 'browser-check.js'), root, scratch, ...process.argv.slice(2)], { stdio: 'inherit', env: { ...process.env, TMPDIR: scratch } });
  process.exitCode = result.status ?? 1;
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
