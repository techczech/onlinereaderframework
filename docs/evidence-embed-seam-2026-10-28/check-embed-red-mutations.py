import subprocess, sys, shutil, pathlib, json
root = pathlib.Path('.').resolve()
core = root / 'packages/reader-core'
M = [
 ('R1 frame gains allow-same-origin', 'packages/reader-core/src/embed/embed-model.ts', "export const PUBLICATION_EMBED_SANDBOX = 'allow-scripts';", "export const PUBLICATION_EMBED_SANDBOX = 'allow-scripts allow-same-origin';", 'browser'),
 ('R2 message source identity not checked', 'packages/reader-core/src/embed/PublicationEmbedFrame.tsx', "if (!source || event.source !== source) return;", "if (!source) return;", 'browser'),
 ('R3 embed chrome counted in text model', 'packages/reader-core/src/original/publication-html.ts', ", .publication-margin-note, [data-publication-embed]')", ", .publication-margin-note')", 'browser'),
 ('R4 release headers without embed rule', 'apps/reader-demo/scripts/release/headers.ts', "${options.embedRoot === undefined ? '' : embedSecurityHeaders(options.embedRoot)}`;", "`;", 'browser'),
 ('R5 message listener never removed', 'packages/reader-core/src/embed/PublicationEmbedFrame.tsx', "      window.removeEventListener('message', listener);\n", "", 'browser'),
 ('R6 height accepted from any origin', 'packages/reader-core/src/embed/embed-model.ts', "  if (origin !== 'null') return null;\n", "", 'unit'),
 ('R7 dot-dot path segments accepted', 'packages/reader-core/src/embed/embed-model.ts', "segment !== '..' && !segment.includes('..')", "true", 'unit'),
]
out = []
for name, rel, old, new, kind in M:
    path = root / rel
    original = path.read_text()
    assert original.count(old) == 1, (name, original.count(old))
    try:
        path.write_text(original.replace(old, new))
        cmd = ['node', 'src/embed/test-embed-headless.mjs'] if kind == 'browser' else ['node', 'src/embed/test-embed.mjs']
        r = subprocess.run(cmd, cwd=core, capture_output=True, text=True, timeout=300)
        text = r.stdout + r.stderr
        if kind == 'browser':
            start = text.find('[\n'); failed = []
            try:
                failed = [x['name'] for x in json.loads(text[start:text.rfind(']') + 1]) if not x['pass']]
            except Exception: failed = ['(harness error) ' + text[-300:]]
        else:
            failed = [line.strip() for line in text.splitlines() if line.strip().startswith('✖')]
        out.append({'mutation': name, 'exit': r.returncode, 'red': r.returncode != 0, 'failed_checks': failed})
    finally:
        path.write_text(original)
    assert path.read_text() == original
print(json.dumps(out, indent=1))
sys.exit(0 if all(o['red'] for o in out) else 1)
