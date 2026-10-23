/** Run the two bounded, normally installed tarball consumers; keep per-version evidence. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const build = resolve(root, 'build');
mkdirSync(build, { recursive: true });
const pythonOption = process.argv.indexOf('--python');
const python = pythonOption < 0 ? resolve(root, '../book-engine/.venv/bin/python') : process.argv[pythonOption + 1];
const flags = ['--online', '--candidate-react19-peers'].filter(flag => process.argv.includes(flag));
const runs = [];
const sha256 = path => createHash('sha256').update(readFileSync(path)).digest('hex');
function run(command, args, log) {
  const result = spawnSync(command, args, { cwd: root, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  writeFileSync(resolve(build, log), (result.stdout ?? '') + (result.stderr ?? '') + (result.error ? String(result.error) : ''));
  assert.equal(result.status, 0, `Compatibility check failed; see build/${log}`);
}
for (const version of ['18.3.1', '19.2.0']) {
  run(process.execPath, [resolve(root, 'scripts/verify-reader-package.mjs'), '--react-version', version, ...flags], `log-reader-react-${version}-package.txt`);
  const evidence = JSON.parse(readFileSync(resolve(build, `evidence-reader-package-react-${version}.json`), 'utf8'));
  assert.equal(evidence.sha256, sha256(resolve(root, evidence.versionedArtifact)));
  run(python, [resolve(root, 'scripts/check-reader-react-compatibility.py'), '--react-version', version], `log-reader-react-${version}-browser.txt`);
  const browser = JSON.parse(readFileSync(resolve(build, `reader-react-${version}-browser/evidence-reader-react-browser.json`), 'utf8'));
  assert.equal(browser.result, 'passed');
  assert.equal(browser.tarballSha256, evidence.sha256);
  runs.push({ ...evidence, browser });
  console.log(`React ${version}: normal peers, strict host types, native Node and bundled browser interactions passed.`);
}
assert.equal(runs[0].sha256, runs[1].sha256, 'Both hosts must test identical package bytes');
assert.equal(sha256(resolve(build, 'reader-core-verified.tgz')), runs[1].sha256);
writeFileSync(resolve(build, 'evidence-reader-react-compatibility.json'), JSON.stringify({ result: 'passed', checkedAt: new Date().toISOString(), sameTarballBothHosts: true, runs }, null, 2) + '\n');
