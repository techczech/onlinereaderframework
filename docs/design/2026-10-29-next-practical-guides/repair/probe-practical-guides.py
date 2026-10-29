import pathlib,json,re,hashlib,subprocess,time,zipfile,xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright
out=pathlib.Path(__file__).resolve().parent
root=out.parents[3]
books=root/'apps/reader-demo/src/books/next-books'
folio=pathlib.Path('/Users/dominiklukes/gitrepos/02_writing-creation/writing/books/web-published')
norm=lambda s:re.sub(r'\s+',' ',re.sub(r'[*_#>`|\[\]()]','',s)).strip()
result={'canonical':{},'runtime':[]}
paths=list(books.glob('*productivity*'))+list(books.glob('*competence*'))+[root/'apps/reader-demo/src/books/demo-books.ts',root/'apps/reader-demo/src/books/original-publications.json']+list((root/'packages/reader-core/src').rglob('*'))
for b in ['academic-productivity','developing-competence']:
 data=json.loads((books/(b+'.book.json')).read_text()); text=norm(' '.join(s['content'] for s in data['sections']))
 result['canonical'][b]=[]
 for p in sorted((folio/b).glob('*.md')):
  body=p.read_text().split('---',2)[-1].strip(); lines=[x.strip() for x in body.splitlines() if x.strip() and not x.startswith('#')]
  missing=[x for x in lines if norm(x) not in text]
  result['canonical'][b].append({'file':str(p),'missingLines':missing,'sha256':hashlib.sha256(p.read_bytes()).hexdigest()});paths.append(p)
sourcepaths=[]
for b in ['academic-productivity','developing-competence']:
 sourcepaths += [p for p in (root.parent/b).rglob('*') if p.is_file() and not any(x in p.parts for x in ['node_modules','.git','dist'])]
paths+=sourcepaths
before={str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in paths if p.is_file()}
server=subprocess.Popen(['python3','-m','http.server','0','--bind','127.0.0.1','--directory',str(root/'apps/reader-demo/dist')],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
# use a fixed distinct port so URL is deterministic
server.terminate();server.wait()
server=subprocess.Popen(['python3','-m','http.server','5199','--bind','127.0.0.1','--directory',str(root/'apps/reader-demo/dist')],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL)
try:
 time.sleep(.5)
 with sync_playwright() as p:
  shell=sorted((pathlib.Path.home()/'Library/Caches/ms-playwright').glob('chromium_headless_shell-*/chrome-headless-shell-mac-arm64/chrome-headless-shell'))[-1]
  browser=p.chromium.launch(executable_path=str(shell),headless=True)
  try:
   page=browser.new_page(accept_downloads=True)
   for b,query,target,negative in [('academic-productivity','Voice Dream Reader','Listen: Read with your ears','Encyclopaedic Knowledge'),('developing-competence','Encyclopaedic Knowledge','From Knowledge to Fluency','Voice Dream Reader')]:
    data=json.loads((books/(b+'.book.json')).read_text());page.goto('http://127.0.0.1:5199/?book='+b);page.wait_for_timeout(500)
    assert data['title'] in page.title()
    with page.expect_download() as pending:page.get_by_role('button',name='Download eBook',exact=True).click()
    download=pending.value
    try:
     with zipfile.ZipFile(download.path()) as z:
      chapters=[n for n in z.namelist() if '/Text/chapter-' in n and n.endswith('.xhtml')]
      assert len(chapters)==len(data['sections'])
      for n in z.namelist():
       if n.endswith(('.xhtml','.opf','.ncx')):ET.fromstring(z.read(n))
      body=' '.join(z.read(n).decode() for n in chapters);assert query in body and negative not in body
      tables=body.count('<table');assert tables==(1 if b=='academic-productivity' else 2)
      if b=='developing-competence':
       import html
       assert 'Engagement Types' in body and 'Accessibility' in body
       for section in data['sections'][7:]:
        for paragraph in section['content'].split('\n\n'):
         if not paragraph.startswith('#') and paragraph.strip(): assert paragraph.strip() in html.unescape(body), paragraph
    finally:download.delete()
    for s in data['sections']:
     page.get_by_role('button',name=s['title'],exact=True).first.click();page.wait_for_timeout(80);assert s['id'] in page.url
    page.get_by_role('button',name='Search',exact=True).first.click() if page.get_by_role('button',name='Search',exact=True).count() else None
    field=page.get_by_placeholder('Search',exact=True);field.fill(query);page.wait_for_timeout(200)
    page.get_by_role('button',name=target,exact=True).first.click();page.wait_for_timeout(100);assert page.get_by_role('heading',name=target,exact=True).count()
    field.fill(negative);page.wait_for_timeout(100);assert re.search(r'0\s+results found',page.inner_text('body'),re.I),page.inner_text('body')
    agent=page.request.get('http://127.0.0.1:5199/agent/'+b+'/full.md');assert agent.ok and query in agent.text() and negative not in agent.text()
    manifest=json.loads(page.request.get('http://127.0.0.1:5199/agent/'+b+'/manifest.json').text())
    assert [s['id'] for s in manifest['sections']]==[s['id'] for s in data['sections']]
    result['runtime'].append({'book':b,'chapters':len(data['sections']),'searchPositiveAndForeignNegative':True,'agentOrder':True,'epubXml':True,'epubTables':tables})
   for b in ['deliberate-practice','language-muscle','linguistics','academic-reading','readability-foundations']:
    page.goto('http://127.0.0.1:5199/?book='+b);page.wait_for_timeout(200)
    assert page.get_by_role('button',name='Download eBook',exact=True).count()
    assert page.request.get('http://127.0.0.1:5199/agent/'+b+'/full.md').ok
    result['runtime'].append({'existingBook':b,'homeAndAgent':True})
  finally:browser.close()
finally:
 server.terminate();server.wait()
 result['hashes']=before
 result['changedDuringProbe']=[p for p,h in before.items() if hashlib.sha256(pathlib.Path(p).read_bytes()).hexdigest()!=h]
 (out/'evidence-practical-guides.json').write_text(json.dumps(result,indent=2))
print(json.dumps(result['runtime'],indent=2))
