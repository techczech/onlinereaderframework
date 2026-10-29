"""Red mutations for the guards changed in the v1.1.0 source release. Each mutation weakens one guard in a source file, runs the check that should
catch it, records the exit code, then restores the file and verifies its SHA-256. A mutation is 'caught' when the check exits non-zero.
Usage (repository root): python3 docs/release-reader-v1-1-2026-10-29/check-guard-red-mutations.py
Writes docs/release-reader-v1-1-2026-10-29/check-guard-red-mutations.json. Exit 0 only if every mutation is caught and every file is restored."""
import hashlib, json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
EXPORTER = 'scripts/prepare-reader-source-release.mjs'
EXAMPLE = 'examples/reader-example'

MUTATIONS = [
    ('M1 embed-test literal exception loses its exact count and line context', EXPORTER,
     """literals: ['file:///tmp/book/index.html'], count: 1,\n    context: "assert.equal(resolve('file:///tmp/book/index.html'), null, 'file pages are refused');",""",
     """literals: ['file:///tmp/book/index.html'], count: 1,""", ['node', EXPORTER, '--self-test']),
    ('M2 allowlist admits the whole example folder by pattern', EXPORTER,
     "return fixedPaths.has(path) ||", "return fixedPaths.has(path) || path.startsWith('examples/') ||", ['node', EXPORTER, '--self-test']),
    ('M3 retirement skips the previous archive hash check', EXPORTER,
     "  assert.equal(hash(readFileSync(archivePath)), previous.sha256, 'Previous archive does not match its manifest; refusing to retire or replace it');\n", "",
     ['node', EXPORTER, '--self-test']),
    ('M4 retirement skips member hash checks of the previous candidate', EXPORTER,
     "        assert.equal(hash(bytes), listed.get(path), `Previous candidate member differs from its manifest: ${path}`);\n", "",
     ['node', EXPORTER, '--self-test']),
    ('M5 example embed policy drops connect-src none (drift from release policy)', f'{EXAMPLE}/hosting-headers.mjs',
     """  "connect-src 'none'", "form-action 'none'", "base-uri 'none'", "frame-ancestors 'self'",\n].join('; ');\n\nexport const EMBED_ROOT""",
     """  "form-action 'none'", "base-uri 'none'", "frame-ancestors 'self'",\n].join('; ');\n\nexport const EMBED_ROOT""", ['node', EXPORTER]),
    ('M6 example build tool no longer pinned exactly', f'{EXAMPLE}/package.json', '"vite": "7.3.7"', '"vite": "^7.3.7"', ['node', EXPORTER]),
    ('M7 example headers keep the reader framing ban on embeds', f'{EXAMPLE}/hosting-headers.mjs',
     "detach: ['Content-Security-Policy', 'X-Frame-Options']", "detach: ['Content-Security-Policy']", ['node', '--test', 'test-example.mjs']),
    ('M8 preview server accepts hidden and dot names', f'{EXAMPLE}/serve.mjs',
     "if (parts.some(part => !part || part.startsWith('.'))) return null;", "if (parts.some(part => !part)) return null;", ['node', '--test', 'test-example.mjs']),
    ('M9 build without embeds still writes the embed folder', f'{EXAMPLE}/build.mjs',
     "if (withEmbeds) {\n  // The embed document", "if (true) {\n  // The embed document",
     ['sh', '-c', 'node build.mjs --without-embeds && node --test test-example.mjs']),
]

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

results, ok = [], True
for name, rel, before, after, command in MUTATIONS:
    path = ROOT / rel
    original = path.read_bytes()
    original_hash = sha(path)
    text = original.decode('utf8')
    assert text.count(before) == 1, f'{name}: mutation anchor not found exactly once'
    try:
        path.write_text(text.replace(before, after), encoding='utf8')
        cwd = ROOT if EXPORTER in command else ROOT / EXAMPLE
        run = subprocess.run(command, cwd=cwd, capture_output=True, text=True, timeout=600)
        tail = (run.stdout + run.stderr).strip().splitlines()[-4:]
    finally:
        path.write_bytes(original)
    restored = sha(path) == original_hash
    caught = run.returncode != 0
    ok = ok and caught and restored
    results.append({'mutation': name, 'file': rel, 'command': ' '.join(command), 'exitCode': run.returncode, 'caught': caught, 'restored': restored,
                    'tail': [line.replace(str(ROOT), '[repository]') for line in tail]})
    print(('CAUGHT ' if caught else 'MISSED ') + name + ('' if restored else ' (NOT RESTORED)'))

# Leave the default example build in place.
subprocess.run(['node', 'build.mjs'], cwd=ROOT / EXAMPLE, capture_output=True, check=True)
out = Path(__file__).with_name('check-guard-red-mutations.json')
out.write_text(json.dumps({'allCaughtAndRestored': ok, 'results': results}, indent=2) + '\n', encoding='utf8')
sys.exit(0 if ok else 1)
