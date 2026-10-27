import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const directory = path.dirname(fileURLToPath(import.meta.url));
const output = mkdtempSync(path.join(directory, '.test-build-'));
try {
  const compile = spawnSync(process.execPath, [
    'node_modules/typescript/bin/tsc', 'src/publication-content/index.ts',
    '--outDir', output, '--target', 'ES2020', '--module', 'NodeNext',
    '--moduleResolution', 'NodeNext', '--strict', '--skipLibCheck',
    '--esModuleInterop', '--declaration', 'false',
  ], { stdio: 'inherit' });
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    const tests = spawnSync(process.execPath, ['--test', 'src/publication-content/publication-content.test.mjs'], {
      stdio: 'inherit', env: { ...process.env, PUBLICATION_CONTENT_TEST_MODULE: path.join(output, 'index.js') },
    });
    process.exitCode = tests.status ?? 1;
  }
} finally {
  rmSync(output, { recursive: true, force: true });
}
