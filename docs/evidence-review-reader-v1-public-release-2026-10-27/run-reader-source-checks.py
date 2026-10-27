from pathlib import Path
import os, json, shutil, subprocess, tempfile, tarfile, hashlib, re, datetime
root=Path(__file__).resolve().parents[2]; out=Path(__file__).resolve().parent
scratch=Path(tempfile.mkdtemp(prefix='scratch-reader-source-install-',dir=out)); records=[]; result={};
def run(label,command,cwd,env,timeout=180):
 p=subprocess.run(command,cwd=cwd,env=env,capture_output=True,text=True,timeout=timeout)
 (out/f'log-reader-source-{label}.txt').write_text(p.stdout+p.stderr)
 rec={'label':label,'command':command,'cwdRelativeToScratch':str(Path(cwd).relative_to(scratch)) if Path(cwd).is_relative_to(scratch) else 'owning repository','exitCode':p.returncode,'log':f'log-reader-source-{label}.txt'}
 records.append(rec);print(label,'exit',p.returncode,flush=True);return p
try:
 candidate=scratch/'public-reader-source'; cache=scratch/'npm-cache';
 with tarfile.open(root/'build/reader-source-release.tar.gz','r:gz') as tar:tar.extractall(scratch,filter='data')
 core=candidate/'packages/reader-core';env=os.environ.copy();
 for key in list(env):
  if key.lower().startswith('npm_config_'):del env[key]
 (scratch/'empty-user.npmrc').write_text('');(scratch/'empty-global.npmrc').write_text('')
 env.update({'NPM_CONFIG_CACHE':str(cache),'NPM_CONFIG_USERCONFIG':str(scratch/'empty-user.npmrc'),'NPM_CONFIG_GLOBALCONFIG':str(scratch/'empty-global.npmrc'),'NPM_CONFIG_UPDATE_NOTIFIER':'false','NPM_CONFIG_AUDIT':'false','NPM_CONFIG_FUND':'false'})
 result['node']=run('node-version',['node','--version'],candidate,env).stdout.strip();result['npm']=run('npm-version',['npm','--version'],candidate,env).stdout.strip()
 seed_env=env.copy();seed_env.pop('NPM_CONFIG_CACHE',None)
 seed=run('cache-seed',['node',str(out/'probe-reader-source-guards.mjs'),str(cache)],root,seed_env)
 # The exporter locates the shared read-only cache through npm config; only that locating subprocess uses the original configuration.
 result['cacheSeedExit']=seed.returncode
 install=run('offline-install',['npm','ci','--prefix','packages/reader-core','--offline','--ignore-scripts','--no-audit','--no-fund','--min-release-age=7','--cache',str(cache)],candidate,env)
 result['actualOfflineInstallExit']=install.returncode
 if install.returncode:
  install=run('registry-install',['npm','ci','--prefix','packages/reader-core','--ignore-scripts','--no-audit','--no-fund','--min-release-age=7','--registry=https://registry.npmjs.org','--cache',str(cache)],candidate,env)
  result['actualRegistryInstallExit']=install.returncode
 if install.returncode:
  shutil.rmtree(core/'node_modules',ignore_errors=True)
  shutil.copytree(root/'packages/reader-core/node_modules',core/'node_modules',symlinks=True)
  result['dependencyMode']='copied existing core node_modules; independent offline npm ci did not pass'
 else:result['dependencyMode']='actual npm ci from lockfile, scripts disabled, own cache, no audit, no credentials'
 lock=json.loads((core/'package-lock.json').read_text());mismatches=[];missing=[]
 for name,entry in lock['packages'].items():
  if not name:continue
  p=core/name/'package.json'
  if p.exists():
   installed=json.loads(p.read_text()).get('version');
   if installed!=entry['version']:mismatches.append({'path':name,'locked':entry['version'],'installed':installed})
  elif not entry.get('optional'):missing.append(name)
 result['dependencyVersionMismatches']=mismatches;result['nonOptionalDependenciesMissing']=missing
 build=run('build',['npm','run','build'],candidate,env);assert build.returncode==0
 tests=run('public-tests',['npm','test'],candidate,env);assert tests.returncode==0
 native=run('native-import',['npm','run','test:native'],candidate,env);assert native.returncode==0
 css=(core/'dist/reader.css').read_bytes();result['generatedCssSha256']=hashlib.sha256(css).hexdigest();assert result['generatedCssSha256']=='e19a2aa55ec9d853b9a77a15086dcce6b6433b50b8bdff57d50bbed63f0501a4'
 refs=re.findall(r'''url\(['"]?(\./fonts/[^)'"\s]+)''',css.decode());assert refs and all((core/'dist'/r).is_file() for r in refs)
 result['localFontReferences']=len(refs);result['cssHasExternalResource']=bool(re.search(r'https?://',re.sub(r'/\*[\s\S]*?\*/','',css.decode())));assert not result['cssHasExternalResource']
 for family in ['inter','merriweather','material-symbols-outlined']:assert (core/f'dist/fonts/LICENSE-{family}.txt').read_bytes()==(core/f'notices/LICENSE-{family}.txt').read_bytes()
 readme=(candidate/'README.md').read_text(); snippets=re.findall(r'```tsx\n(.*?)\n```',readme,re.S)
 for i,snippet in enumerate(snippets):
  target=core/f'review-readme-example-{i}.tsx';target.write_text(("const markdownText = '# A section\\n\\nExample.';\n" if 'markdownText' in snippet else '')+snippet+'\n')
  probe=run(f'readme-tsx-{i}',['node',str(core/'node_modules/typescript/bin/tsc'),'--noEmit','--strict','--skipLibCheck','--jsx','react-jsx','--module','NodeNext','--moduleResolution','NodeNext','--target','ES2022','--esModuleInterop',target.name],core,env);assert probe.returncode==0
 agent=re.findall(r'```js\n(.*?)\n```',readme,re.S)[0]
 target=core/'review-readme-agent.mjs';target.write_text("const book={id:'example',title:'Example',author:'Review',description:'Synthetic',sections:[{id:'start',title:'Start',category:'Test',content:'# Start\\n\\nSample.'}]};\n"+agent+"\nimport assert from 'node:assert/strict';\nassert(out.files.some(f=>f.path==='agent/example/chapters/start.md'));\nconst api=await import('reader-core');for(const name of ['renderPublicationContent','publicationContentToText','getPublicationHeadings','generatePublicationEpub','publicationDisplayTitle','FRONT_PAGE_LAYOUTS','ListeningPanel','ReadingSupportControls','exportHighlightsToMarkdown','buildLlmsText'])assert(['function','object'].includes(typeof api[name]),name);\nconsole.log('README agent example and named exports passed.');\n")
 probe=run('readme-agent',['node',target.name],core,env);assert probe.returncode==0
 result['focusedChecksPassed']=True
except Exception as e:
 result['error']=str(e);raise
finally:
 shutil.rmtree(scratch)
 result.update({'records':records,'scratchRemoved':not scratch.exists(),'finishedAt':datetime.datetime.now(datetime.timezone.utc).isoformat()})
 (out/'result-reader-source-checks.json').write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({k:v for k,v in result.items() if k!='records'},indent=2),flush=True)
