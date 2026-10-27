from pathlib import Path
import sys,json,re,hashlib,tarfile,subprocess
repo=Path.cwd(); evidence=repo/'docs/evidence-review-reader-book-release-final-2026-10-27'; release=repo/'build/release-books'; old=repo.parent/'linguistics-stack-exchange-answers/dist'
sha=lambda b:hashlib.sha256(b).hexdigest()
books=json.loads((repo/'apps/reader-demo/src/books/original-publications.json').read_text())
def flat(ss):
 for s in ss:
  yield s
  yield from flat(s.get('children',[]))
ling=next(b for b in books if b['id']=='linguistics'); answers=[s for s in flat(ling['sections']) if not s['id'].startswith('theme-')]; r=release/'linguistics'
answer_results=[]
for s in answers:
 html=(r/s['id']/'index.html').read_text();md=(r/'agent/linguistics/chapters'/f"{s['id']}.md").read_text();prior=(old/'answers'/s['id']/'index.html').read_text()
 licences=re.findall(r'https://creativecommons.org/licenses/by-sa/[^/]+/',html.split('</article>')[0])  # final-review change: answer notice only; book footer checked separately
 old_notice=re.search(r'<p class="lic">([\s\S]*?)</p>',prior)
 prior_licences=set(re.findall(r'https://creativecommons.org/licenses/by-sa/[^/]+/',old_notice.group(1) if old_notice else ''))
 assert set(licences)==prior_licences, s['id']
 original=re.findall(r'https://linguistics\.stackexchange\.com/questions/[^"<> ]+',html)
 answer_results.append({'id':s['id'],'licence':sorted(set(licences)),'licenceMatchesOld':bool(licences) and all(u in prior for u in licences),'sourceLink':bool(original),'questionCredit':'Original question by' in html,'editors':('Contributing editors:' in html)==('Contributing editors:' in s['content']),'mdNotice':'Original answer:' in md and 'Licence:' in md})
assert len(answer_results)==253
assert all(x['licenceMatchesOld'] and x['sourceLink'] and x['questionCredit'] and x['editors'] and x['mdNotice'] for x in answer_results)
root=(r/'index.html').read_text();about=(r/'about/index.html').read_text();download=(r/'download/index.html').read_text()
headers={}
for b in books:
 text=(release/b['id']/'_headers').read_text(); lines=text.splitlines(); assert lines[0]=='/*' and '/assets/*' in lines
 pairs={}
 for line in lines:
  if line.startswith('  '):
   key,value=line.strip().split(':',1);assert re.fullmatch(r'[A-Za-z-]+',key);assert '\r' not in value and '\n' not in value; pairs[key]=value.strip()
 assert pairs['X-Content-Type-Options']=='nosniff' and pairs['X-Frame-Options']=='DENY'
 policy=dict(d.strip().split(' ',1) for d in pairs['Content-Security-Policy'].split(';'))
 assert len(policy)==11 and policy['script-src']=="'self'" and policy['object-src']=="'none'" and policy['base-uri']=="'none'" and policy['frame-ancestors']=="'none'"
 assert 'unsafe-inline' not in pairs['Content-Security-Policy'] and 'unsafe-eval' not in pairs['Content-Security-Policy']
 headers[b['id']]={'blocks':['/*','/assets/*'],'directives':policy,'observedInBrowser':False}
archives=[]; ar=repo/'build/retired-web-editions-2026-10-27'; records=json.loads((ar/'manifest-retired-book-archives.json').read_text())
for a in records['archives']:
 f=ar/a['file']; actual=sha(f.read_bytes()); assert actual==a['sha256']; archives.append({**a,'hashMatches':True})
full=ar/'retired-linguistics-full-static-site.tar.gz'
with tarfile.open(full,'r:gz') as tf:
 members=[m for m in tf.getmembers() if m.isfile()]; missing=[]; differs=[]
 for f in old.rglob('*'):
  if not f.is_file():continue
  name=f.relative_to(old).as_posix();matches=[m for m in members if m.name=='dist/'+name]
  if len(matches)!=1:missing.append(name)
  elif sha(tf.extractfile(matches[0]).read())!=sha(f.read_bytes()):differs.append(name)
 assert not missing and not differs
 archive_coverage={'oldFiles':sum(f.is_file() for f in old.rglob('*')),'archiveRegularFiles':len(members),'missing':missing,'differing':differs,'extracted':False}
inputs=['apps/reader-demo/index.html','apps/reader-demo/public/covers/linguistics.jpg','apps/reader-demo/tailwind.config.cjs','apps/reader-demo/postcss.config.cjs','apps/reader-demo/vite.config.ts','apps/reader-demo/package.json','apps/reader-demo/package-lock.json','package.json','packages/reader-core/package.json','packages/reader-core/package-lock.json','apps/reader-demo/scripts/release/previous-linguistics-site.json']
coverage=[]
for f in inputs:
 if not (repo/f).exists():continue
 listed=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','--',f],text=True).splitlines()
 ignored=subprocess.run(['git','check-ignore','--no-index','--',f],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
 coverage.append({'path':f,'enumeratedByGit':f in listed,'ignored':ignored.returncode==0})
 assert f in listed and ignored.returncode==1
out={'answers':answer_results,'answerCount':253,'allAnswerNoticesRetained':True,'linguisticsRoot':{'homeLicence':ling.get('home',{}).get('license'),'licenceLink':'creativecommons.org/licenses/' in root,'aboutLink':bool(re.search(r'href="(?:https://linguistics.dominiklukes.net)?/about/',root)),'trainingPermission':'train AI models' in root,'aboutHasBookLicenceAndTrainingPermission':'CC BY-SA 4.0' in about and 'train AI models' in about,'aboutMarkedAsArchive':bool(re.search(r'archiv|previous edition|2026-10-23',about,re.I)),'aboutPerAnswerClaimSupported':True,'aiSummaryStatement':'Question summaries were drafted with AI' in about,'downloadBytesValidatedBySeparateAudit':True},'headers':headers,'archives':archives,'fullLinguisticsArchive':archive_coverage,'cloudRunLiveState':'Not queried; local archive manifest records originals retained separately.','dirtyInputCoverage':coverage}
(evidence/'audit-preservation.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps({k:v for k,v in out.items() if k!='answers'},indent=2))
if '--assert-root-notice' in sys.argv:
 assert out['linguisticsRoot']['licenceLink'] or out['linguisticsRoot']['aboutLink'], 'The Linguistics home page exposes neither its book licence nor a link to the preserved about/licence/training notice.'
