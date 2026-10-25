import json,sys
r=json.load(open(f'results-{sys.argv[1]}.json'))
print('notes missing',sum(1 for n in r['notes'] if n['count']!=1),'/',len(r['notes']),'| out of viewport',sum(1 for n in r['notes'] if n['count'] and not n['inViewport']))
print('drawer',r['notesDrawer'])
s=r['search'];print('search focus failures',sum(1 for x in s if not x['ok']),'/',len(s),'| scrolled',sum(1 for x in s if x['scroll']!=x['scrollBefore']))
for x in s:
  if not x['ok']: print('  ',x['width'],x['book'],x['layout'],x['tag'],x['value'])
c=[x for x in r['contrast'] if x['isDark']==x['dark']]
print('contrast views',len(c),'; dark below 4.5:',sum(1 for x in c if x['dark'] and any(v['ratio']<4.5 for v in x['worst'].values())),'; light below 4.5:',sum(1 for x in c if not x['dark'] and any(v['ratio']<4.5 for v in x['worst'].values())))
for x in c:
  low={k:(v['ratio'],v['text']) for k,v in x['worst'].items() if v['ratio']<4.5}
  if low: print('  ',x['width'],x['book'],x['layout'],'dark' if x['dark'] else 'light',low)
for k,v in r['depth'].items(): print(k,'groups',len(v['groups']),'entries',v['entries'],'full control',v['fullAvailable'])
for f in r.get('focus',[]): print('focus',f)
for c in r['contrast']:
  if c['dark'] and c['isDark'] and c['layout']=='opus-search-map' and c['width']==1440: print('dark map',c['book'],{k:(v['ratio'],v['fg'],v['bg']) for k,v in c['worst'].items()})
