from pathlib import Path
import subprocess,json,re,hashlib
from html.parser import HTMLParser
root=Path(__file__).resolve().parents[1]
source=root/'source/manuscript-czech-navigator.md'
text=source.read_text()
notice='Version 1. Check back for updates with more interactive features.'
old='**Revised Edition\\\nPREVIEW**\n\n**NOTE:** This is a draft of an expanded revised edition. More material\nwill be added and further revisions will be made.'
assert text.count(old)==1
text=text.replace(old, '**Version 1**\n\nCheck back for updates with more interactive features.')
# Only derivative asset references and the documented dangling link change; the archived manuscript remains byte-identical.
text=text.replace('extracted/navigator/main/media/media/','media/')
# The archive has one dangling Word bookmark. Unwrap only this exact link in
# both derivatives; preserve its visible diagnostic and the archived source.
broken='[**Error! Bookmark not defined.**](#_Toc55636603)'
assert text.count(broken) == 1, 'Recheck source defect before generating editions'
text=text.replace(broken, '**Error! Bookmark not defined.**')
# LibreOffice Draw renders each exact WMF; keep originals and avoid basename collisions.
for asset in (root/'public/media').glob('*.wmf'):
 rendered=root/'research/wmf-render'/asset.with_suffix('.png').name
 if rendered.exists():
  target=asset.with_name(asset.stem+'-wmf.png')
  subprocess.run(['magick',str(rendered),'-trim','+repage',str(target)],check=True)
  text=text.replace('media/'+asset.name,'media/'+target.name)
(root/'source/edition-czech-navigator.md').write_text(text)
subprocess.run(['pandoc',str(root/'source/edition-czech-navigator.md'),'-f','markdown','-t','html5','--wrap=none','-o',str(root/'source/edition-czech-navigator.html')],check=True)
html=(root/'source/edition-czech-navigator.html').read_text()
parts=re.split(r'(?=<h2\b)',html)
sections=[]
for i,part in enumerate(parts):
 title=re.search(r'<h2[^>]*>(.*?)</h2>',part,re.S)
 title=re.sub('<[^>]+>','',title[1]) if title else 'Title and contents'
 ident=re.search(r'<h2[^>]*id="([^"]+)"',part)
 sections.append(dict(id=ident[1] if ident else 'title-and-contents',title=title,content=part,format='html'))
book=dict(id='czech-language-navigator-reference-candidate',title='Czech Language Navigator',author='Dominik Lukeš and Jitka Kauerová',description=notice,appearance=dict(cover=dict(src='cover-czech-navigator-v1.jpg',alt='Czech Language Navigator cover')),sections=sections,navigation=dict(homeDepth=2,sidebarDepth=3,showHomeContents=True),downloads=[dict(label='Download EPUB',href='czech-language-navigator-reference.epub')])
(root/'book-czech-navigator.json').write_text(json.dumps(book,ensure_ascii=False,indent=2))
subprocess.run(['pandoc',str(root/'source/edition-czech-navigator.md'),'--resource-path',str(root/'public'),'-t','epub3','--toc','--split-level=2','--epub-cover-image',str(root/'public/cover-czech-navigator-v1.jpg'),'--metadata','description='+notice,'--metadata','lang=en','--metadata','title=Czech Language Navigator','--metadata','author=Dominik Lukeš and Jitka Kauerová','-o',str(root/'public/czech-language-navigator-reference.epub')],check=True)
class Counts(HTMLParser):
 def __init__(self):super().__init__();self.tags={};self.cells=[];self.active=False
 def handle_starttag(self,t,a):
  self.tags[t]=self.tags.get(t,0)+1
  if t in ['td','th']:self.cells.append('');self.active=True
 def handle_endtag(self,t):
  if t in ['td','th']:self.active=False
 def handle_data(self,d):
  if self.active:self.cells[-1]+=d
counts=Counts();counts.feed(html)
receipt=dict(source='Preserved archive Markdown extraction; NOT verified against latest Word',sha256=hashlib.sha256(source.read_bytes()).hexdigest(),chapters=[dict(id=s['id'],title=s['title']) for s in sections],html_counts=counts.tags,table_cell_text_sha256=hashlib.sha256(json.dumps(counts.cells,ensure_ascii=False).encode()).hexdigest(),limitations=['Latest Word and PDF reads time out in OneDrive','No Word-to-HTML fidelity claim','Original manuscript licence states CC BY-NC-SA 4.0; preserved without relicensing','WMF figures deterministically rendered with LibreOffice Draw; original WMFs retained','Original Collocation bookmark _Toc55636603 has no supported target; only its hyperlink is unwrapped in web and EPUB derivatives, retaining exact visible text','Only derivative Revised Edition PREVIEW and draft NOTE replaced with approved Version 1 notice; all other manuscript wording preserved'])
(root/'research/evidence-czech-navigator-conversion.json').write_text(json.dumps(receipt,ensure_ascii=False,indent=2))
print(json.dumps({'sections':len(sections),'tables':counts.tags.get('table',0),'cells':len(counts.cells)},ensure_ascii=False))
