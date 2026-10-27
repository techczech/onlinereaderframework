from pathlib import Path
import hashlib,json,tarfile,datetime,sys,re
root=Path(__file__).resolve().parents[2]; out=Path(__file__).resolve().parent
sha=lambda b: hashlib.sha256(b).hexdigest()
b=root/'build'; c=b/'public-reader-source'; e=json.loads((b/'reader-source-release.evidence.json').read_text()); m=json.loads((b/'reader-source-release.manifest.json').read_text()); data=(b/'reader-source-release.tar.gz').read_bytes()
expected='c030a57cb4aeb1ec30ea15d023f7acf76e0de243b95692c706e0786c1058223d'
assert sha(data)==expected==m['sha256']==e['archive']['sha256']
assert len(data)==m['bytes']==223581
candidate={str(p.relative_to(c)):p.read_bytes() for p in c.rglob('*') if p.is_file()}
assert not any(p.is_symlink() for p in c.rglob('*'))
manifest={f['path']:f for f in m['files']}; assert len(manifest)==len(m['files'])==125==len(candidate)
assert set(manifest)==set(candidate)
for p,bs in candidate.items(): assert len(bs)==manifest[p]['bytes'] and sha(bs)==manifest[p]['sha256'],p
with tarfile.open(b/'reader-source-release.tar.gz','r:gz') as tar:
 members=tar.getmembers(); assert len(members)==125
 names=[]
 for member in members:
  assert member.isfile() and member.name.startswith('public-reader-source/')
  p=member.name.removeprefix('public-reader-source/');assert '..' not in Path(p).parts
  assert tar.extractfile(member).read()==candidate[p],p
  names.append(p)
 assert len(set(names))==len(names) and set(names)==set(manifest)
p=json.loads(candidate['provenance-reader-source.json']); projected={f['path']:f for f in p['exportedInputs']}
assert set(projected)==set(candidate)-{'provenance-reader-source.json'}
for name,f in projected.items():assert f['sha256']==sha(candidate[name]) and f['bytes']==len(candidate[name]),name
input_drift=[v['path'] for v in e['inputHashes'] if not (root/v['path']).exists() or sha((root/v['path']).read_bytes())!=v['sha256']]
for dest,src in [('README.md','README.md'),('LICENSING.md','LICENSING.md'),('scripts/test-reader-native-import.mjs','test-reader-native-import.mjs'),('docs/index.html','site/index.html'),('docs/style.css','site/style.css')]: assert candidate[dest]==(root/'scripts/templates/reader-source-release'/src).read_bytes(),dest
assert candidate['LICENSE']==candidate['packages/reader-core/LICENSE']==(root/'LICENSE').read_bytes()
standard='''MIT License

Copyright (c) 2026 Dominik Lukeš

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
'''
assert candidate['LICENSE'].decode()==standard
pkgs=[json.loads(candidate[x]) for x in ['package.json','packages/reader-core/package.json']]
for pkg in pkgs:assert pkg['version']=='1.0.0' and pkg['license']=='MIT' and pkg['private'] is True and pkg['author']=='Dominik Lukeš'
lock=json.loads(candidate['packages/reader-core/package-lock.json']);assert lock['version']==lock['packages']['']['version']=='1.0.0' and lock['packages']['']['license']=='MIT'
core=pkgs[1]
for field in ['dependencies','devDependencies','peerDependencies']:assert core[field]==lock['packages'][''][field]
for family in ['inter','merriweather','material-symbols-outlined']:
 notice=candidate[f'packages/reader-core/notices/LICENSE-{family}.txt'];assert notice==(root/f'packages/reader-core/node_modules/@fontsource/{family}/LICENSE').read_bytes()
 assert b'SIL OPEN FONT LICENSE Version 1.1' in notice or b'SIL OPEN FONT LICENSE' in notice
record={'observedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'archiveSha256':sha(data),'archiveBytes':len(data),'fileCount':125,'archiveCandidateManifestExact':True,'provenanceProjectionExact':True,'exactStandardMIT':True,'metadataAndLockConsistent':True,'fontNoticesByteIdentical':True,'builderInputDrift':input_drift,'inputs':{v['path']:sha((root/v['path']).read_bytes()) for v in e['inputHashes']},'candidate':{p:sha(v) for p,v in candidate.items()},'evidenceSha256':sha((b/'reader-source-release.evidence.json').read_bytes()),'manifestSha256':sha((b/'reader-source-release.manifest.json').read_bytes()),'receiptSha256':sha((root/'docs/result-reader-v1-source-release-2026-10-27.md').read_bytes())}
(out/('snapshot-reader-source-end.json' if '--end' in sys.argv else 'snapshot-reader-source-start.json')).write_text(json.dumps(record,indent=2)+'\n')
print(json.dumps({k:v for k,v in record.items() if k not in ['inputs','candidate']},indent=2))
if '--end' in sys.argv:
 start=json.loads((out/'snapshot-reader-source-start.json').read_text());changes={k:[p for p,h in record[k].items() if ({entry['path']:entry['digest'] for entry in start[k]} if isinstance(start[k],list) else start[k]).get(p)!=h] for k in ['inputs','candidate']}; print('Changes during review:',json.dumps(changes))
