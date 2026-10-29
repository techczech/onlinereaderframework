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
  if not target.exists():subprocess.run(['magick',str(rendered),'-trim','+repage',str(target)],check=True)
  text=text.replace('media/'+asset.name,'media/'+target.name)
(root/'source/edition-czech-navigator.md').write_text(text)
subprocess.run(['pandoc',str(root/'source/edition-czech-navigator.md'),'-f','markdown','-t','html5','--wrap=none','-o',str(root/'source/edition-czech-navigator.html')],check=True)
html=(root/'source/edition-czech-navigator.html').read_text()
# Explicit publication roles; source heading numbers are not reading-unit authority.
chapter_ids=['nouns','adjectives','pronouns','numerals','verbs','adverbs','prepositions','conjunctions','how-and-when-czech-words-change-their-forms','how-parts-of-speech-interact-when-combined-in-a-sentence']
lead_ins={'there-are-some-which-are-almost-exception-proof','the-rest-are-shared-by-two-genders-about-5050'}
# Stable ordinal identities are bound to the immutable manuscript SHA in the conversion receipt.
table_number=0
def identify_table(match):
 global table_number
 table_number+=1
 return '<table id="czech-table-'+str(table_number)+'"'+match[1]+'>'
html=re.sub(r'<table([^>]*)>',identify_table,html)
class TableText(HTMLParser):
 def __init__(self):super().__init__();self.active=False;self.value=''
 def handle_starttag(self,t,a):
  if t=='table':self.active=True
 def handle_endtag(self,t):
  if t=='table':self.active=False
 def handle_data(self,d):
  if self.active:self.value+=d
table10=re.findall(r'<table\b.*?</table>',html,re.S)[9]
reviewed=TableText();reviewed.feed(table10)
table_reviews=[dict(id='czech-table-10',source=reviewed.value,columns=['Singular','kamarád','muž'],reason='Read case rows and model forms in source context; independent case rows, fixed identity column, explicit singular model headers; no merged cells. Sol 2026-10-29.')]
parts=re.split(r'(?=<h2\b)',html)
sections=[]
roles=[]
for part in parts:
 title=re.search(r'<h2[^>]*>(.*?)</h2>',part,re.S)
 title=re.sub('<[^>]+>','',title[1]) if title else 'Title and contents'
 ident=re.search(r'<h2[^>]*id="([^"]+)"',part)
 parent_id=ident[1] if ident else 'title-and-contents'
 units=re.split(r'(?=<h3 id="(?:'+ '|'.join(chapter_ids)+r')")',part) if parent_id=='parts-of-speech-nouns-verbs-and-more' else [part]
 parent=None
 for index,unit in enumerate(units):
  opening=re.search(r'<h([23])[^>]*id="([^"]+)"[^>]*>(.*?)</h\1>',unit,re.S)
  uid=opening[2] if index and opening else parent_id
  label=re.sub('<[^>]+>','',opening[3]) if index and opening else title
  stack=[]
  def mapped(m):
   level=int(m[1]); attrs=m[2]; body=m[3]
   anchor=re.search(r'id="([^"]+)"',attrs)
   anchor=anchor[1] if anchor else ''
   if anchor in lead_ins:
    roles.append(dict(id=anchor,role='lead-in',unit=uid))
    return '<p'+attrs+'><strong>'+body+'</strong></p>'
   while stack and stack[-1]>=level: stack.pop()
   stack.append(level)
   target=min(6,len(stack))
   roles.append(dict(id=anchor,role='title' if target==1 else 'local',level=target,unit=uid))
   return '<h'+str(target)+attrs+'>'+body+'</h'+str(target)+'>'
  unit=re.sub(r'<h([2-6])([^>]*)>(.*?)</h\1>',mapped,unit,flags=re.S)
  section=dict(id=uid,title=label,content=unit,format='html',category='Parts of speech' if index else '')
  if index:
   parent.setdefault('children',[]).append(section)
  else:
   sections.append(section);parent=section
html=''.join(s['content']+''.join(c['content'] for c in s.get('children',[])) for s in sections)
import runpy
integrate=runpy.run_path(str(root/'scripts/semantic-czech-navigator.py'))['integrate']
roles,table_reviews=integrate(root,sections,html,roles)
html=''.join(s['content']+''.join(c['content'] for c in s.get('children',[])) for s in sections)
(root/'source/edition-czech-navigator.html').write_text(html)
(root/'source/heading-roles-czech-navigator.json').write_text(json.dumps(dict(chapters=chapter_ids,lead_ins=sorted(lead_ins),headings=roles,method='Reviewed semantic roles with exact reproducible source snapshot and heading/table bindings'),ensure_ascii=False,indent=2))
book=dict(id='czech-language-navigator-reference-candidate',title='Czech Language Navigator',author='Dominik Lukeš and Jitka Kauerová',description=notice,appearance=dict(readerLayout='atlas',tableControls=True,tableReviews=table_reviews,paper='#faf7ef',ink='#192e43',accent='#bb432e',cover=dict(src='cover-czech-navigator-v1.jpg',alt='Czech Language Navigator cover')),sections=sections,navigation=dict(homeDepth=2,sidebarDepth=3,showHomeContents=True),downloads=[dict(label='Download EPUB',href='czech-language-navigator-reference.epub')])
# Reproduce compatibility from exact retained anchors, including non-heading Word bookmarks.
anchor_owners={}
all_units=[unit for section in sections for unit in [section,*section.get('children',[])]]
assert len(all_units)==22
class AnchorIds(HTMLParser):
 def __init__(self):super().__init__();self.ids=[]
 def handle_starttag(self,tag,attrs):
  self.ids.extend(value for name,value in attrs if name=='id' and value is not None)
for unit in all_units:
 anchors=AnchorIds();anchors.feed(unit['content'])
 for anchor in anchors.ids:
  assert anchor not in anchor_owners or anchor_owners[anchor]==unit['id'], 'Conflicting anchor owner'
  anchor_owners[anchor]=unit['id']
book['compatibility']=dict(version='czech-parts-2026-10-29',anchorOwners=anchor_owners,splitSections={'parts-of-speech-nouns-verbs-and-more':['parts-of-speech-nouns-verbs-and-more',*chapter_ids]})
(root/'book-czech-navigator.json').write_text(json.dumps(book,ensure_ascii=False,indent=2))
# Transform Pandoc's parsed heading nodes by exact source ID; tables stay untouched.
ast=json.loads(subprocess.check_output(['pandoc',str(root/'source/edition-czech-navigator.md'),'-f','markdown','-t','json']))
role_by_id={r['id']:r for r in roles}
def map_ast(value):
 if isinstance(value,dict):
  if value.get('t')=='Header':
   level,attrs,inlines=value['c'];role=role_by_id.get(attrs[0])
   if role:
    if role['role']=='lead-in':return dict(t='Para',c=[dict(t='Span',c=[attrs,[dict(t='Strong',c=inlines)]])])
    value['c'][0]=role['level']
  return {k:map_ast(v) for k,v in value.items()}
 if isinstance(value,list):return [map_ast(v) for v in value]
 return value
ast=map_ast(ast)
(root/'source/edition-czech-navigator-epub.json').write_text(json.dumps(ast,ensure_ascii=False))
subprocess.run(['pandoc',str(root/'source/edition-czech-navigator-epub.json'),'-f','json','--resource-path',str(root/'public'),'-t','epub3','--toc','--split-level=1','--epub-cover-image',str(root/'public/cover-czech-navigator-v1.jpg'),'--metadata','description='+notice,'--metadata','lang=en','--metadata','title=Czech Language Navigator','--metadata','author=Dominik Lukeš and Jitka Kauerová','-o',str(root/'public/czech-language-navigator-reference.epub')],check=True)
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
