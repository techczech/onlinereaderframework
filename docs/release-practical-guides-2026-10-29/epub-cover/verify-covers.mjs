import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { build } from '../../../apps/reader-demo/node_modules/esbuild/lib/main.js';
const root = process.cwd();
const output = path.resolve('docs/release-practical-guides-2026-10-29/epub-cover');
const scratch = fs.mkdtempSync(path.join(output, '.scratch-'));
try {
  const fixtures = {};
  for (const [id, chapters] of [['academic-productivity', 7], ['developing-competence', 9]]) {
    const selected = JSON.parse(fs.readFileSync('docs/design/2026-10-29-next-practical-guides/selected-covers.json')).books.find(b => b.book === id);
    fixtures[id] = { chapters, sha256: selected.sha256, base64: fs.readFileSync(`apps/reader-demo/public/covers/${id}.jpg`).toString('base64'), book: JSON.parse(fs.readFileSync(`apps/reader-demo/src/books/next-books/${id}.book.json`)) };
  }
  const controls = [...JSON.parse(fs.readFileSync('apps/reader-demo/src/books/original-publications.json')), ...['academic-reading-framework', 'readability-foundations'].map(id => JSON.parse(fs.readFileSync(`apps/reader-demo/src/books/next-books/${id}.book.json`)))];
  fs.writeFileSync(path.join(scratch, 'controls.json'), JSON.stringify({ books: controls, svg: fs.readFileSync('apps/reader-demo/src/books/assets/command-line_gray.svg', 'utf8') }));
  fs.writeFileSync(path.join(scratch, 'fixtures.json'), JSON.stringify(fixtures));
  fs.writeFileSync(path.join(scratch, 'index.html'), '<!doctype html><html><body></body></html>');
  await build({ entryPoints: ['packages/reader-core/src/services/publication-epub/publication-epub-covers.browser-test.mjs'], bundle: true, format: 'iife', platform: 'browser', outfile: path.join(scratch, 'test.js') });
  const python = `
import json,sys,base64,hashlib
from pathlib import Path
from playwright.sync_api import sync_playwright
scratch,out=map(Path,sys.argv[1:])
with sync_playwright() as p:
 shells=sorted((Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))
 browser=p.chromium.launch(executable_path=str(shells[-1]),headless=True)
 try:
  page=browser.new_page(accept_downloads=True)
  page.goto((scratch/'index.html').as_uri())
  requests=[]
  page.route('**/*',lambda route:(requests.append(route.request.url),route.abort()))
  fixtures=json.loads((scratch/'fixtures.json').read_text())
  page.evaluate('(fixtures)=>window.coverFixtures=fixtures',fixtures)
  page.add_script_tag(path=str(scratch/'test.js'))
  results=[]
  for id in fixtures:
   with page.expect_download() as event:
    page.evaluate('(id)=>window.downloadCoverBook(id)',id)
   target=out/(id+'.epub')
   event.value.save_as(target)
   data=target.read_bytes()
   result=page.evaluate('([data,id])=>window.checkCoverZip(data,id)',[base64.b64encode(data).decode(),id])
   result['downloadSha256']=hashlib.sha256(data).hexdigest()
   results.append(result)
  page.evaluate('(controls)=>window.coverControls=controls',json.loads((scratch/'controls.json').read_text()))
  results.append(page.evaluate('window.noCoverControls()'))
  results.append(page.evaluate('window.coverNegatives()'))
  assert not requests,requests
  print(json.dumps({'results':results,'network':requests,'browser':browser.version},indent=2))
 finally: browser.close()
`;
  const result = spawnSync(path.resolve('../book-engine/.venv/bin/python'), ['-c', python, scratch, output], { encoding: 'utf8', env: { ...process.env, TMPDIR: scratch } });
  fs.writeFileSync(path.join(output, 'log-covers.txt'), result.stdout + result.stderr);
  process.stdout.write(result.stdout + result.stderr);
  process.exitCode = result.status ?? 1;
} finally { fs.rmSync(scratch, { recursive: true, force: true }); }
