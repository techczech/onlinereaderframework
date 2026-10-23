"""Fetch bounded official notice evidence; write only beside this script.
Run with python3. No package installation, lifecycle scripts or archive extraction.
Existing evidence bytes are preserved; use a new authorised destination for refreshes.
"""
import base64
import datetime
import difflib
import hashlib
import io
import json
from pathlib import Path
import tarfile
import urllib.error
import urllib.request

OUT = Path(__file__).resolve().parent
ROOT = OUT.parent.parent
if (OUT / 'provenance-reader-notices-2026-10-23.json').exists():
    raise SystemExit('Snapshot already complete; preserve it and use a separate authorised destination for a refresh.')
RECEIPT = {'captured_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
           'agent': 'Codex implementation sub-agent', 'sources': [], 'packages': [], 'comparisons': []}

def sha(b): return hashlib.sha256(b).hexdigest()
def save(path, b):
    f = OUT / path
    f.parent.mkdir(parents=True, exist_ok=True)
    if f.exists():
        assert f.read_bytes() == b, f'Existing evidence differs: {path}'
    else:
        with f.open('xb') as w: w.write(b)
    return {'path': path, 'bytes': len(b), 'sha256': sha(b)}
def fetch(path, url, retain=True):
    cached = OUT / path
    if retain and cached.is_file():
        b = cached.read_bytes()
        RECEIPT['sources'].append({'url': url, 'path': path, 'bytes': len(b), 'sha256': sha(b),
            'read_from_prior_attempt': True, 'archive_mtime_utc': datetime.datetime.fromtimestamp(cached.stat().st_mtime, datetime.timezone.utc).isoformat()})
        return b
    request = urllib.request.Request(url, headers={'User-Agent': 'reader-notice-evidence', 'Accept': '*/*'})
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            b = response.read()
            entry = {'url': url, 'final_url': response.url, 'http_status': response.status,
                     'captured_at_utc': datetime.datetime.now(datetime.timezone.utc).isoformat(),
                     'bytes': len(b), 'sha256': sha(b)}
    except urllib.error.HTTPError as error:
        RECEIPT['sources'].append({'url': url, 'http_status': error.code, 'retained': False})
        return None
    if retain: entry.update(save(path, b))
    else: entry['retained'] = False
    RECEIPT['sources'].append(entry)
    return b

def compare(label, a, b):
    entry = {'label': label, 'left_sha256': sha(a), 'right_sha256': sha(b), 'bytes_equal': a == b}
    RECEIPT['comparisons'].append(entry)
    return a == b

specs = [
 ('encode-utf8-1.0.3', 'encode-utf8', '1.0.3', 'LinusU/encode-utf8', 'v1.0.3', 'b8e591da66e5942caa59cf7b1922d91b95ed49ea', 'packages/reader-core/node_modules/encode-utf8'),
 ('dlv-1.1.3', 'dlv', '1.1.3', 'developit/dlv', '1.1.3', 'e636db817a96e4ca4710b407163fb992748b3b80', 'apps/reader-demo/node_modules/dlv'),
 ('esbuild-darwin-arm64-0.28.2', '@esbuild%2fdarwin-arm64', '0.28.2', 'evanw/esbuild', 'v0.28.2', '609683d892977362a0f99026cb74b96263d728a9', 'apps/reader-demo/node_modules/@esbuild/darwin-arm64'),
 ('rollup-darwin-arm64-4.64.7', '@rollup%2frollup-darwin-arm64', '4.64.7', 'rollup/rollup', 'v4.64.7', '5f658604845ca7fb4d8e8a27a9e68e166c6f9973', 'apps/reader-demo/node_modules/@rollup/rollup-darwin-arm64')]
for slug, package, version, repo, tag, commit, installed in specs:
    metadata = json.loads(fetch(f'{slug}/npm-version.json', f'https://registry.npmjs.org/{package}/{version}'))
    assert metadata['version'] == version and metadata['gitHead'] == commit
    ref = json.loads(fetch(f'{slug}/github-tag-ref.json', f'https://api.github.com/repos/{repo}/git/ref/tags/{tag}'))
    obj = ref['object']
    if obj['type'] == 'tag':
        obj = json.loads(fetch(f'{slug}/github-tag-object.json', obj['url']))['object']
    assert obj['type'] == 'commit' and obj['sha'] == commit
    upstream_manifest = 'npm/@esbuild/darwin-arm64/package.json' if slug.startswith('esbuild') else 'npm/darwin-arm64/package.json' if slug.startswith('rollup') else 'package.json'
    upstream = fetch(f'{slug}/upstream-package.json', f'https://raw.githubusercontent.com/{repo}/{commit}/{upstream_manifest}')
    if not slug.startswith('rollup'):
        assert json.loads(upstream)['version'] == version
    else:
        assert json.loads(upstream)['name'] == metadata['name']
        root_manifest = fetch(f'{slug}/upstream-root-package.json', f'https://raw.githubusercontent.com/{repo}/{commit}/package.json')
        assert json.loads(root_manifest)['version'] == version
        fetch(f'{slug}/upstream-prepublish.js', f'https://raw.githubusercontent.com/{repo}/{commit}/scripts/prepublish.js')
    data = fetch(f'{slug}/npm-tarball.tgz', metadata['dist']['tarball'], retain=slug.startswith(('encode', 'dlv')))
    integrity = 'sha512-' + base64.b64encode(hashlib.sha512(data).digest()).decode()
    assert integrity == metadata['dist']['integrity']
    assert hashlib.sha1(data).hexdigest() == metadata['dist']['shasum']
    members = []
    with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
        for member in archive.getmembers():
            if not member.isfile(): continue
            b = archive.extractfile(member).read()
            assert member.name.startswith('package/')
            rel = member.name.removeprefix('package/')
            local = ROOT / installed / rel
            entry = {'tar_member': member.name, 'bytes': len(b), 'sha256': sha(b), 'installed_path': str(local.relative_to(ROOT)), 'installed_exists': local.is_file()}
            if local.is_file():
                installed_bytes = local.read_bytes()
                entry.update(installed_sha256=sha(installed_bytes), installed_bytes_equal=installed_bytes == b)
            if slug.startswith(('encode', 'dlv')):
                entry['archive_copy'] = save(f'{slug}/tar-members/{rel}', b)['path']
            members.append(entry)
    RECEIPT['packages'].append({'name': metadata['name'], 'version': version, 'slug': slug,
                              'commit': commit, 'tag': tag, 'tag_equals_npm_gitHead': True,
                              'npm_sha512_integrity_verified': True, 'npm_sha1_verified': True,
                              'tarball_sha256': sha(data), 'tar_members': members})
    if slug.startswith(('encode', 'dlv')):
        fetch(f'{slug}/github-release-tree.json', f'https://api.github.com/repos/{repo}/git/trees/{commit}?recursive=1')
        index = fetch(f'{slug}/upstream-index.js', f'https://raw.githubusercontent.com/{repo}/{commit}/index.js')
        assert compare(f'{slug}: installed index vs exact tagged upstream index', (ROOT / installed / 'index.js').read_bytes(), index)
    if slug.startswith('encode'):
        fetch(f'{slug}/release-LICENCE-http404.txt', f'https://raw.githubusercontent.com/{repo}/{commit}/LICENCE')
        later = '87cba02f7ddf8792f2e60c4b1a7c1eccf6daa3d2'
        fetch(f'{slug}/github-licence-addition-commit.json', f'https://api.github.com/repos/{repo}/commits/{later}')
        fetch(f'{slug}/upstream-later-LICENCE.txt', f'https://raw.githubusercontent.com/{repo}/{later}/LICENCE')
        later_index = fetch(f'{slug}/upstream-later-index.js', f'https://raw.githubusercontent.com/{repo}/{later}/index.js')
        compare('encode-utf8: exact 1.0.3 index vs licence-addition index', index, later_index)
        save(f'{slug}/diff-index-release-to-licence-addition.patch', ''.join(difflib.unified_diff(index.decode().splitlines(True), later_index.decode().splitlines(True), fromfile=f'{commit}/index.js', tofile=f'{later}/index.js')).encode())
        fetch(f'{slug}/github-licence-issue-6.json', f'https://api.github.com/repos/{repo}/issues/6')
        fetch(f'{slug}/github-licence-issue-6-comments.json', f'https://api.github.com/repos/{repo}/issues/6/comments')
    if slug.startswith('esbuild'):
        for source, name in [('LICENSE.md', 'upstream-LICENSE.md'), ('npm/esbuild/LICENSE.md', 'upstream-npm-esbuild-LICENSE.md'), ('internal/xxhash/LICENSE.txt', 'upstream-xxhash-LICENSE.txt'), ('go.mod', 'upstream-go.mod'), ('lib/npm/node-platform.ts', 'upstream-node-platform.ts')]:
            fetch(f'{slug}/{name}', f'https://raw.githubusercontent.com/{repo}/{commit}/{source}')
        compare('esbuild exact upstream notice vs installed sibling esbuild notice', (OUT/f'{slug}/upstream-npm-esbuild-LICENSE.md').read_bytes(), (ROOT/'apps/reader-demo/node_modules/esbuild/LICENSE.md').read_bytes())
    if slug.startswith('rollup'):
        for source, name in [('LICENSE.md', 'upstream-LICENSE.md'), ('LICENSE-CORE.md', 'upstream-LICENSE-CORE.md'), ('native.js', 'upstream-native.js'), ('rust/bindings_napi/Cargo.toml', 'upstream-native-Cargo.toml')]:
            fetch(f'{slug}/{name}', f'https://raw.githubusercontent.com/{repo}/{commit}/{source}')
        compare('rollup exact upstream notice vs installed sibling rollup notice', (OUT/f'{slug}/upstream-LICENSE.md').read_bytes(), (ROOT/'apps/reader-demo/node_modules/rollup/LICENSE.md').read_bytes())
    print(slug + ': metadata/tag/tarball/member checks saved', flush=True)
save('provenance-reader-notices-2026-10-23.json', (json.dumps(RECEIPT, indent=2, ensure_ascii=False)+'\n').encode())
