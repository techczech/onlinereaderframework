/** Build from an empty generated directory so packages cannot contain stale declarations or source maps. */
import { rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
const core = resolve(dirname(fileURLToPath(import.meta.url)), '../packages/reader-core');
rmSync(resolve(core, 'dist'), { recursive: true, force: true });
execFileSync(process.execPath, [resolve(core, 'node_modules/typescript/bin/tsc'), '-p', resolve(core, 'tsconfig.json')], { cwd: core, stdio: 'inherit' });
