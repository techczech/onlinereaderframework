import subprocess, pathlib, json, time, io, zipfile, xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright
root=pathlib.Path(__file__).resolve().parents[3]
out=pathlib.Path(__file__).resolve().parent
server=subprocess.Popen(['python3','-m','http.server','5198','--bind','127.0.0.1','--directory',str(root/'apps/reader-demo/dist')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
results=[]
try:
 time.sleep(1)
 with sync_playwright() as p:
  shell=sorted((pathlib.Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
  browser=p.chromium.launch(executable_path=str(shell),headless=True)
  page=browser.new_page(accept_downloads=True)
  for book in ['academic-productivity','developing-competence']:
   page.goto('http://127.0.0.1:5198/?book='+book+'&review=1');page.wait_for_timeout(700)
   data=json.loads((root/'apps/reader-demo/src/books/next-books'/f'{book}.book.json').read_text())
   assert data['title'] in page.title()
   with page.expect_download() as pending:
    page.get_by_role('button',name='Download eBook',exact=True).click()
   downloaded=pending.value
   with zipfile.ZipFile(downloaded.path()) as z:
    chapters=[n for n in z.namelist() if '/Text/chapter-' in n and n.endswith('.xhtml')]
    assert len(chapters)==7,chapters
    for name in z.namelist():
     if name.endswith(('.xhtml','.opf','.ncx')): ET.fromstring(z.read(name))
    body=' '.join(z.read(n).decode() for n in chapters)
    assert ('Voice Dream Reader' if book=='academic-productivity' else 'Encyclopaedic Knowledge') in body
    if book=='developing-competence': assert body.count('<table')==2
   downloaded.delete()
   for section in data['sections']:
    page.get_by_role('button',name=section['title'],exact=True).first.click()
    page.wait_for_timeout(100)
    assert section['id'] in page.url,(section['id'],page.url)
    assert page.get_by_role('heading',name=section['title'],exact=True).count()>0
   external=page.get_by_role('link',name=('Tools, hardware and AI searches on the original app' if book=='academic-productivity' else 'Self-assessment, framework builder and AI development planning on the original app'))
   assert external.get_attribute('href')==data['sourceUrl']
   results.append({'book':book,'chapters':7,'epubXml':'valid','epubTables':2 if book=='developing-competence' else 1,'externalTools':'original app root','chapterRoutes':'all seven passed'})
   page.screenshot(path=str(out/('screenshot-'+book+'.png')),full_page=True)
  keys=page.evaluate('Object.keys(localStorage)')
  for book in ['academic-productivity','developing-competence']:
   assert f'publication-reader:{book}:lastSection' in keys
   assert f'publication-reader:{book}:readSections' in keys
  results.append({'storageKeys':keys})
  browser.close()
 (out/'check-browser-epub.json').write_text(json.dumps(results,indent=2))
finally:
 server.terminate();server.wait()
