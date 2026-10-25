/** Compiles the agent-export module and runs agent-export.test.mjs against it (temporary output removed afterwards). */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const directory = path.dirname(fileURLToPath(import.meta.url));
const output = mkdtempSync(path.join(directory, '.test-build-'));
try {
  const compile = spawnSync(process.execPath, ['node_modules/typescript/bin/tsc', 'src/agent-export/index.ts', 'src/original/publication-model.ts', 'src/original/reading-support/anchored-reading.ts',
    '--rootDir', 'src', '--outDir', output, '--target', 'ES2020', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', '--strict', '--skipLibCheck', '--esModuleInterop', '--declaration', 'false'], { stdio: 'inherit', cwd: path.resolve(directory, '../..') });
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    const tests = spawnSync(process.execPath, ['--test', path.join(directory, 'agent-export.test.mjs')], { stdio: 'inherit', env: { ...process.env, AGENT_EXPORT_TEST_ROOT: output } });
    process.exitCode = tests.status ?? 1;
  }
} finally { rmSync(output, { recursive: true, force: true }); }
