"""Record a read-only local dependency/output snapshot, only into this owned folder.
This does not build, pack, execute dependencies, or certify transformed-code absence.
"""
import collections
import datetime
import hashlib
import json
from pathlib import Path
import re

OUT = Path(__file__).resolve().parent
ROOT = OUT.parent.parent
if (OUT / 'evidence-reader-output-exclusion-2026-10-23.json').exists():
    raise SystemExit('Snapshot already complete; preserve it and use a separate authorised destination for a refresh.')
TARGETS = {'encode-utf8', 'dlv', '@esbuild/darwin-arm64', '@rollup/rollup-darwin-arm64'}
def digest(b): return hashlib.sha256(b).hexdigest()
def identity(f):
    b = f.read_bytes()
    return {'path': str(f.relative_to(ROOT)), 'bytes': len(b), 'sha256': digest(b)}
def resolve(name, origin):
    for parent in [origin, *origin.parents]:
        f = parent / 'node_modules' / name / 'package.json'
        if f.is_file(): return f.resolve()
    return None

def graph(root):
    start = ROOT / root / 'package.json'
    queue = collections.deque([start.resolve()])
    seen = set(); nodes = []; missing = []
    while queue:
        f = queue.popleft()
        if f in seen: continue
        seen.add(f)
        data = json.loads(f.read_text())
        groups = ['dependencies', 'optionalDependencies', 'peerDependencies']
        edges = []
        for group in groups:
            for name in sorted(data.get(group, {})):
                located = resolve(name, f.parent)
                edges.append({'group': group, 'name': name, 'resolved_manifest': str(located.relative_to(ROOT)) if located else None})
                if located: queue.append(located)
                else: missing.append({'from': str(f.relative_to(ROOT)), 'group': group, 'name': name})
        nodes.append({**identity(f), 'name': data.get('name'), 'version': data.get('version'), 'edges': edges})
    return {'root': root, 'edge_policy': 'dependencies + optionalDependencies + peerDependencies; excludes devDependencies at every node', 'nodes': nodes, 'unresolved': missing,
            'target_nodes': [{'name': n['name'], 'version': n['version'], 'path': n['path']} for n in nodes if n['name'] in TARGETS]}

inputs = ['package.json','packages/reader-core/package.json','packages/reader-core/package-lock.json','packages/reader-core/tsconfig.json','apps/reader-demo/package.json','apps/reader-demo/package-lock.json','apps/reader-demo/vite.config.ts','apps/reader-demo/tailwind.config.cjs','apps/reader-demo/postcss.config.cjs','scripts/build-reader-core.mjs','scripts/build-reader-styles.mjs','apps/reader-demo/node_modules/tailwindcss/package.json','apps/reader-demo/node_modules/tailwindcss/lib/lib/setupContextUtils.js','apps/reader-demo/node_modules/tailwindcss/lib/lib/evaluateTailwindFunctions.js','apps/reader-demo/node_modules/esbuild/lib/main.js','apps/reader-demo/node_modules/rollup/dist/native.js','packages/reader-core/node_modules/qrcode/package.json','packages/reader-core/node_modules/qrcode/lib/core/byte-data.js']
result = {'captured_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(), 'agent': 'Codex implementation sub-agent', 'method_limits': ['No build or pack was executed.', 'Declared runtime graph is overinclusive but cannot detect undeclared or computed imports.', 'String/byte checks do not prove absence of minified or otherwise transformed JavaScript.', 'Existing output may be stale; this records a snapshot, not final release acceptance.'], 'inputs': [], 'runtime_graphs': [], 'source_target_mentions': [], 'output_trees': []}
for rel in inputs:
    f = ROOT / rel
    if f.is_file():
        entry = identity(f)
        if f.suffix in ['.mjs', '.ts', '.cjs'] and 'node_modules' not in f.parts:
            entry['text'] = f.read_text()
        elif 'node_modules' in f.parts:
            entry['relevant_lines'] = [{'line': i, 'text': line} for i,line in enumerate(f.read_text().splitlines(),1) if any(s in line for s in ['dlv', 'encode-utf8', 'darwin-arm64', '@rollup/rollup-', 'packageBase', 'bin/esbuild'])]
        result['inputs'].append(entry)
for root in ['packages/reader-core','apps/reader-demo']: result['runtime_graphs'].append(graph(root))
patterns = [r'(?<![\w-])dlv(?![\w-])',r'@esbuild/darwin-arm64',r'@rollup/rollup-darwin-arm64',r'encode-utf8']
for tree in ['packages/reader-core/src','apps/reader-demo/src']:
    files = []
    for f in sorted((ROOT/tree).rglob('*')):
        if f.is_file() and f.suffix in ['.js','.ts','.tsx','.jsx','.mjs','.cjs']:
            files.append(identity(f))
            text = f.read_text()
            for pattern in patterns:
                for match in re.finditer(pattern,text):
                    result['source_target_mentions'].append({'path': str(f.relative_to(ROOT)), 'pattern': pattern, 'line': text[:match.start()].count('\n')+1})
    result.setdefault('source_trees',[]).append({'root': tree, 'files': files})
needles = []
for rel in ['apps/reader-demo/node_modules/@esbuild/darwin-arm64/bin/esbuild', 'apps/reader-demo/node_modules/@rollup/rollup-darwin-arm64/rollup.darwin-arm64.node','apps/reader-demo/node_modules/dlv/index.js','apps/reader-demo/node_modules/dlv/dist/dlv.js','apps/reader-demo/node_modules/dlv/dist/dlv.es.js','apps/reader-demo/node_modules/dlv/dist/dlv.umd.js']:
    f = ROOT/rel
    if f.is_file(): needles.append((identity(f), f.read_bytes()))
result['excluded_candidate_files'] = [n for n,b in needles]
for tree in ['packages/reader-core/dist','apps/reader-demo/dist']:
    entries=[]
    if (ROOT/tree).is_dir():
        for f in sorted((ROOT/tree).rglob('*')):
            if not f.is_file(): continue
            b=f.read_bytes(); entry=identity(f)
            entry['contains_verbatim_candidates']=[n['path'] for n,v in needles if v in b]
            entry['target_name_matches']=[s for s in ['@esbuild/darwin-arm64','@rollup/rollup-darwin-arm64','dlv'] if s.encode() in b] if f.suffix in ['.js','.css','.html','.json'] else []
            entries.append(entry)
    result['output_trees'].append({'root':tree, 'exists': (ROOT/tree).is_dir(), 'files':entries})
p=OUT/'evidence-reader-output-exclusion-2026-10-23.json'
with p.open('x') as w: w.write(json.dumps(result,indent=2)+'\n')
print(json.dumps({'runtime_target_nodes':[g['target_nodes'] for g in result['runtime_graphs']], 'unresolved_runtime_edges':[len(g['unresolved']) for g in result['runtime_graphs']], 'source_target_mentions':result['source_target_mentions'], 'output_file_counts':{t['root']:len(t['files']) for t in result['output_trees']},'verbatim_or_name_matches':[f for t in result['output_trees'] for f in t['files'] if f['contains_verbatim_candidates'] or f['target_name_matches']]},indent=2))
