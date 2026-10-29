import re,json,hashlib,html
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'source/edition-czech-navigator.html'
s=SOURCE.read_text(); sha=lambda x:hashlib.sha256(x.encode()).hexdigest()
clean=lambda x:' '.join(html.unescape(re.sub('<[^>]*>',' ',x)).split())
hs=[]
for m in re.finditer(r'<h([1-6])\b([^>]*)>(.*?)</h\1>',s,re.S):
 idm=re.search(r'id="([^"]*)"',m[2]);hs.append(dict(id=idm[1] if idm else None,text=clean(m[3]),source_level=int(m[1]),offset=m.start(),end=m.end(),line=s.count('\n',0,m.start())+1))
ts=[]
stack=[]; matches=[]
for tag in re.finditer(r'</?table\b[^>]*>',s):
 if tag[0].startswith('</'): matches.append((stack.pop(),tag.end()))
 else: stack.append(tag.start())
class Match:
 def __init__(self,a,b): self.a,self.b=a,b
 def __getitem__(self,k): return s[self.a:self.b]
 def start(self): return self.a
 def end(self): return self.b
for i,(a,b) in enumerate(sorted(matches),1):
 m=Match(a,b)
 rows=[]
 for ri,r in enumerate(re.finditer(r'<tr\b[^>]*>(.*?)</tr>',m[0],re.S)):
  cells=[]
  for ci,c in enumerate(re.finditer(r'<(td|th)\b([^>]*)>(.*?)</\1>',r[1],re.S)):
   attrs=dict(re.findall(r'(\w+)="([^"]*)"',c[2]));cells.append(dict(id=f'r{ri+1}c{ci+1}',text=clean(c[3]),tag=c[1],rowspan=int(attrs.get('rowspan',1)),colspan=int(attrs.get('colspan',1))))
  rows.append(cells)
 preceding=[h for h in hs if h['offset']<m.start()]
 ts.append(dict(ordinal=i,sha256=sha(m[0]),line=s.count('\n',0,m.start())+1,offset=m.start(),end=m.end(),preceding_heading=preceding[-1]['id'] if preceding else None,before=clean(s[max(0,m.start()-1300):m.start()]),after=clean(s[m.end():m.end()+1000]),rows=rows))
if __name__=='__main__':
 import sys
 kind=sys.argv[1]; a=int(sys.argv[2]); b=int(sys.argv[3])
 if kind=='tables':
  for t in ts[a-1:b]:
   print('\nTABLE',t['ordinal'],t['preceding_heading'],'BEFORE',t['before'][-320:],'AFTER',t['after'][:180])
   for r in t['rows']:print(' | '.join(c['text']+(f" [{c['rowspan']}x{c['colspan']}]" if c['rowspan']*c['colspan']>1 else '') for c in r))
 else:
  for i,h in enumerate(hs[a:b],a):
   end=hs[i+1]['offset'] if i+1<len(hs) else len(s)
   print(i,h['id'],h['text'],'|',clean(s[h['end']:end])[:350])
