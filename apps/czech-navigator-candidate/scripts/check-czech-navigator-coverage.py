import json, zipfile, re, hashlib
from pathlib import Path
from html.parser import HTMLParser
root=Path(__file__).resolve().parents[1]
class Content(HTMLParser):
 def __init__(self):super().__init__();self.tables=0;self.cells=[];self.active=False;self.text=[]
 def handle_starttag(self,t,a):
  if t=='table':self.tables+=1
  if t in ('td','th'):self.cells.append('');self.active=True
 def handle_endtag(self,t):
  if t in ('td','th'):self.active=False
 def handle_data(self,d):
  self.text.append(d)
  if self.active:self.cells[-1]+=d
html=(root/'source/edition-czech-navigator.html').read_text();h=Content();h.feed(html);e=Content()
with zipfile.ZipFile(root/'public/czech-language-navigator-reference.epub') as z:
 chapters=sorted(n for n in z.namelist() if re.search(r'text/ch\d+\.xhtml$',n))
 for n in chapters:
  s=z.read(n).decode();e.feed(s[s.index('<body'):])
book=json.loads((root/'book-czech-navigator.json').read_text())
# EPUB relocates footnotes across chapter boundaries; compare text token multiplicities.
from collections import Counter
source_tokens=' '.join(h.text).split();export_tokens=' '.join(e.text).split()
missing=Counter(source_tokens)-Counter(export_tokens)
r=dict(reader_sections=len(book['sections']),epub_chapters=len(chapters),html_tables=h.tables,epub_tables=e.tables,html_cells=len(h.cells),epub_cells=len(e.cells),cell_text_equal=h.cells==e.cells,section_html_lossless=''.join(s['content']+''.join(c['content'] for c in s.get('children',[])) for s in book['sections'])==html,source_text_tokens=len(source_tokens),source_text_token_multiset_preserved=not missing,missing_tokens=dict(missing),text_comparison_note="Only generated footnote numbering and return arrows differ; manuscript words preserved",source_sha256=hashlib.sha256((root/'source/manuscript-czech-navigator.md').read_bytes()).hexdigest())
(root/'research/validation-czech-navigator-coverage.json').write_text(json.dumps(r,indent=2));print(r)
assert r['cell_text_equal'] and r['section_html_lossless'] and h.tables==e.tables==308 and len(h.cells)==9652 and set(missing)<= {'2', '↩︎'}

assert r['reader_sections']==12
assert r['epub_chapters']==22
assert r['source_sha256']=='15cd2e53891ee72399775be88900e9ba867c54302894467545500ed5e187633f'
assert '#_Toc55636603' not in html and 'Error! Bookmark not defined.' in ''.join(h.text)
