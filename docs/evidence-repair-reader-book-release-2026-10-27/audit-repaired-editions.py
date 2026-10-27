"""Read-only audit of the three repaired release editions (build/release-books/) against the previous Linguistics site and the icon decision.
Run from the repository root: python3 -I docs/evidence-repair-reader-book-release-2026-10-27/audit-repaired-editions.py
Writes audit-repaired-editions.json next to this file. Reads only; writes nothing else."""
import hashlib, json, os, re, sys

repo = os.getcwd()
root = os.path.join(repo, 'build', 'release-books')
old = os.path.normpath(os.path.join(repo, '..', 'linguistics-stack-exchange-answers'))
here = os.path.dirname(os.path.abspath(__file__))
sha = lambda data: hashlib.sha256(data).hexdigest()
read = lambda p: open(p, 'rb').read()
out = {'editions': {}}

def files_of(folder):
    found = []
    for base, dirs, names in os.walk(folder):
        for name in dirs + names:
            if os.path.islink(os.path.join(base, name)): raise SystemExit(f'symlink: {os.path.join(base, name)}')
        found += [os.path.relpath(os.path.join(base, n), folder) for n in names]
    return sorted(found)

icon_patterns = [rb'notion\.so/icons', rb'command-line_gray', rb'M15 3\.125H5c-1\.544']
for book in ['linguistics', 'deliberate-practice', 'language-muscle']:
    folder = os.path.join(root, book)
    manifest = json.load(open(os.path.join(root, f'{book}.manifest.json')))
    names = files_of(folder)
    listed = {f['path']: f['sha256'] for f in manifest['files']}
    disk = {n: sha(read(os.path.join(folder, n))) for n in names}
    tree = sha('\n'.join(f"{f['sha256']}  {f['path']}" for f in manifest['files']).encode())
    icon_hits = [n for n in names if any(re.search(p, read(os.path.join(folder, n))) for p in icon_patterns)]
    notion_any = sorted({n for n in names if b'notion.so' in read(os.path.join(folder, n))})
    html = [n for n in names if n.endswith('.html')]
    scripts_in_standalone = [n for n in ['404.html', 'about/index.html', 'download/index.html'] if n in names and b'<script' in read(os.path.join(folder, n))]
    out['editions'][book] = {
        'files': len(names), 'manifestMatchesDisk': listed == disk, 'treeHashMatches': tree == manifest['treeSha256'], 'treeSha256': manifest['treeSha256'],
        'sourceTreeDirty': manifest['sourceTreeDirty'], 'sourceHead': manifest['sourceHead'], 'checksFailures': manifest['checks']['failures'],
        'originalIconFiles': icon_hits, 'filesMentioningNotionSo': notion_any, 'hasHeaders': '_headers' in names, 'has404': '404.html' in names,
        'scriptInStandalonePages': scripts_in_standalone, 'htmlFiles': len(html),
        'markerLeft': [n for n in html if b'<!--ORF_' in read(os.path.join(folder, n))],
        'pagesNotOneHtmlHeadTitle': [n for n in html if n not in ('404.html', 'about/index.html', 'download/index.html') and not (
            len(re.findall(rb'<html[\s>]', read(os.path.join(folder, n)))) == 1 and len(re.findall(rb'<head[\s>]', read(os.path.join(folder, n)))) == 1
            and len(re.findall(rb'<title>', read(os.path.join(folder, n)).split(b'</head>')[0])) == 1)],
        'headers': read(os.path.join(folder, '_headers')).decode() if '_headers' in names else None,
    }

dp = os.path.join(root, 'deliberate-practice')
icon_repo = read(os.path.join(repo, 'apps/reader-demo/src/books/assets/terminal-icon.svg'))
page = read(os.path.join(dp, 'limitations-working-memory/index.html')).decode()
chapter = read(os.path.join(dp, 'agent/deliberate-practice/chapters/limitations-working-memory.md')).decode()
bundle = b''.join(read(os.path.join(dp, 'assets', n)) for n in os.listdir(os.path.join(dp, 'assets')) if n.endswith('.js'))
out['deliberatePracticeIcon'] = {
    'mediaFileEqualsRepoIcon': read(os.path.join(dp, 'media/terminal-icon.svg')) == icon_repo, 'repoIconSha256': sha(icon_repo),
    'staticPageImg': re.findall(r'<img[^>]*>', page), 'agentChapterImg': re.findall(r'<img[^>]*>', chapter),
    'bundleHasReleaseIconHref': b'/media/terminal-icon.svg' in bundle, 'bundleHasReleaseIconSvg': icon_repo.strip() in bundle or json.dumps(icon_repo.decode()).encode()[1:-1] in bundle,
    'notionPageLinkKept': sorted(set(re.findall(r'https://www\.notion\.so/[A-Za-z0-9-]+', read(os.path.join(dp, 'agent/deliberate-practice/full.md')).decode()))),
}

ling = os.path.join(root, 'linguistics')
dist = os.path.join(old, 'dist')
old_files = [f for f in files_of(dist) if not f.startswith(('pagefind/', 'assets/'))]
new_files = set(files_of(ling))
md = [f for f in old_files if f.endswith('.md')]
def chapter_for(path):
    base = os.path.basename(path)[:-3]
    return f'agent/linguistics/chapters/{"theme-" + base if path.startswith("sections/") else base}.md'
out['linguisticsPreviousSite'] = {
    'oldFilesOutsidePagefindAndAssets': len(old_files),
    'oldPathsMissingInNewEdition': [f for f in old_files if f not in new_files],
    'oldMarkdownPaths': len(md),
    'oldMarkdownPathsEqualToNewChapterBytes': sum(read(os.path.join(ling, f)) == read(os.path.join(ling, chapter_for(f))) for f in md),
    'llmsFullEqualsFullMd': read(os.path.join(ling, 'llms-full.txt')) == read(os.path.join(ling, 'agent/linguistics/full.md')),
    'downloads': {f: {'new': sha(read(os.path.join(ling, f))), 'old': sha(read(os.path.join(dist, f)))} for f in ['download/key-issues-in-language.epub', 'download/key-issues-in-language.pdf']},
    'aboutMainVerbatim': re.search(r'<main>([\s\S]*?)</main>', read(os.path.join(dist, 'about/index.html')).decode()).group(1) in read(os.path.join(ling, 'about/index.html')).decode(),
    'downloadMainVerbatim': re.search(r'<main>([\s\S]*?)</main>', read(os.path.join(dist, 'download/index.html')).decode()).group(1) in read(os.path.join(ling, 'download/index.html')).decode(),
    'notFoundMainVerbatim': re.search(r'<main>([\s\S]*?)</main>', read(os.path.join(dist, '404.html')).decode()).group(1) in read(os.path.join(ling, '404.html')).decode(),
}
# Same original snapshot: the new import's Linguistics source hashes against the source snapshot the previous build recorded.
provenance = json.load(open(os.path.join(repo, 'apps/reader-demo/src/books/original-publications-provenance.json')))['sources']
new_sources = {s['source']: s['sha256'] for s in provenance if s['book'] == 'linguistics'}
snapshot = json.load(open(os.path.join(old, 'build/round-two-source-after.json')))
common = [k for k in new_sources if k in snapshot]
out['linguisticsSourceSnapshot'] = {
    'compared': 'apps/reader-demo/src/books/original-publications-provenance.json (linguistics) against linguistics-stack-exchange-answers/build/round-two-source-after.json',
    'newImportSources': len(new_sources), 'inPreviousSnapshot': len(common), 'identical': sum(new_sources[k] == snapshot[k] for k in common),
    'notInPreviousSnapshot': [k for k in new_sources if k not in snapshot],
    'limit': 'The previous build recorded this snapshot; nothing records which snapshot the dist/ EPUB and PDF were built from beyond their build time (2026-10-23).',
}
json.dump(out, open(os.path.join(here, 'audit-repaired-editions.json'), 'w'), indent=2)
print(json.dumps({b: {k: v for k, v in e.items() if k != 'headers'} for b, e in out['editions'].items()}, indent=1))
print(json.dumps({k: out[k] for k in ['deliberatePracticeIcon', 'linguisticsPreviousSite', 'linguisticsSourceSnapshot']}, indent=1))
