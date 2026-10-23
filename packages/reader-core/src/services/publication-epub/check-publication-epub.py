"""Exercise the browser exporter, then inspect actual ZIP/XML bytes and EPUBCheck."""
import base64
import json
import hashlib
from datetime import datetime, timezone
from importlib.metadata import version
import shutil
import subprocess
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET
from playwright.sync_api import sync_playwright

bundle, root, scratch = map(Path, sys.argv[1:4])
books = json.loads((root / 'apps/reader-demo/src/books/original-publications.json').read_text())
asset_file = Path(sys.argv[4]) if len(sys.argv) > 4 else None
assets = json.loads(asset_file.read_text()) if asset_file else {}
with sync_playwright() as p:
    cached_shells = sorted((Path.home() / 'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
    browser = p.chromium.launch(headless=True, executable_path=str(cached_shells[-1]) if cached_shells else None)
    try:
        page = browser.new_page(accept_downloads=True)
        requests = []
        page.route('**/*', lambda route: (requests.append(route.request.url), route.abort()))
        page.set_content('<!doctype html><html><head><title>EPUB verification</title></head><body></body></html>')
        page.add_script_tag(path=str(bundle))
        with page.expect_download() as download:
            result = page.evaluate('async ({books, assets}) => window.runPublicationEpubChecks(books, assets)', {'books': books, 'assets': assets})
        assert download.value.suggested_filename.endswith('.epub')
        assert not requests, f'Unexpected network requests: {requests}'
        browser_version = browser.version
    finally:
        browser.close()

reports = []
for archive in result.pop('archives'):
    target = scratch / (archive['name'] + '.epub')
    target.write_bytes(base64.b64decode(archive['base64']))
    with zipfile.ZipFile(target) as z:
        entries = z.infolist()
        assert entries[0].filename == 'mimetype'
        assert entries[0].compress_type == zipfile.ZIP_STORED
        assert z.read('mimetype') == b'application/epub+zip'
        assert len(z.namelist()) == len(set(z.namelist()))
        for name in z.namelist():
            assert not name.startswith('/') and '..' not in Path(name).parts
            if name.endswith(('.xml', '.opf', '.xhtml', '.svg')):
                ET.fromstring(z.read(name))
        opf = ET.fromstring(z.read('OEBPS/content.opf'))
        manifest = opf.find('{http://www.idpf.org/2007/opf}manifest')
        for item in manifest:
            assert 'OEBPS/' + item.attrib['href'] in z.namelist()
    report = {'archive': archive['name'], 'bytes': target.stat().st_size, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest(), 'zip_xml': 'passed'}
    if shutil.which('epubcheck'):
        check = subprocess.run(['epubcheck', str(target)], capture_output=True, text=True)
        report['epubcheck_exit'] = check.returncode
        report['epubcheck'] = check.stdout + check.stderr
        print(json.dumps(report, ensure_ascii=False), flush=True)
        assert check.returncode == 0, report['epubcheck']
        assert '0 warnings' in report['epubcheck'], report['epubcheck']
    else:
        report['epubcheck'] = 'unavailable'
    reports.append(report)
sources = [
    Path('/Users/dominiklukes/worktrees/guides/building-your-language-muscle/services/epubService.ts'),
    Path('/Users/dominiklukes/worktrees/guides/deliberate-practice-guide/utils/epubGenerator.ts'),
    root / 'packages/reader-core/src/publication-content/index.ts',
    root / 'packages/reader-core/src/original/types.ts',
    root / 'apps/reader-demo/src/books/original-publications.json',
]
if asset_file: sources.append(asset_file.resolve())
evidence = {
    'date': datetime.now(timezone.utc).isoformat(),
    'scope': 'Browser service, actual archive bytes, XML, EPUBCheck; parent owns packaged integration and UI acceptance.',
    'runtime': {'playwright': version('playwright'), 'chromium': browser_version, 'executable': str(cached_shells[-1]) if cached_shells else 'Playwright default'},
    'ssr_import': 'passed without DOM globals; generation rejected with browser requirement',
    **result, 'network_requests': requests, 'archives': reports,
    'sources': [{'path': str(source), 'sha256': hashlib.sha256(source.read_bytes()).hexdigest()} for source in sources],
}
Path(__file__).with_name('report-publication-epub-verification.json').write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + '\n')
print(json.dumps(evidence, ensure_ascii=False, indent=2))
