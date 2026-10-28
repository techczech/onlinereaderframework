/** Compile the embed model and check into a temporary folder, then run the node tests against it. */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const core = path.resolve(directory, '../..');
const output = mkdtempSync(path.join(directory, '.test-build-'));
try {
  const compile = spawnSync(process.execPath, [
    'node_modules/typescript/bin/tsc', 'src/embed/embed-model.ts', 'src/embed/embed-check.ts',
    '--outDir', output, '--rootDir', 'src', '--target', 'ES2020', '--module', 'NodeNext',
    '--moduleResolution', 'NodeNext', '--strict', '--skipLibCheck', '--esModuleInterop', '--declaration', 'false', '--jsx', 'react-jsx',
  ], { stdio: 'inherit', cwd: core });
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    const tests = spawnSync(process.execPath, ['--test', path.join(directory, 'embed.test.mjs')], {
      stdio: 'inherit', cwd: core, env: { ...process.env, EMBED_TEST_BUILD: output },
    });
    process.exitCode = tests.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
