import os,json,urllib.request,urllib.error,tomllib,pathlib
BASE='https://api.cloudflare.com/client/v4'
def api(p,method='GET',data=None,oauth=False):
 token=tomllib.loads((pathlib.Path.home()/'.wrangler/config/default.toml').read_text())['oauth_token'] if oauth else os.environ['CLOUDFLARE_API_TOKEN']
 req=urllib.request.Request(BASE+p,data=json.dumps(data).encode() if data else None,headers={'Authorization':'Bearer '+token,'Content-Type':'application/json'},method=method)
 try:
  with urllib.request.urlopen(req,timeout=30) as r: return json.load(r)
 except urllib.error.HTTPError as e: return {'status':e.code,'body':json.loads(e.read())}
z=api('/zones?name=dominiklukes.net');print('zones',json.dumps(z));
if not z.get('success'):raise SystemExit(1)
zone=z['result'][0];assert zone['account']['id']=='b6ae5bced06492ee6f0c8f92776804da'
p='/zones/'+zone['id']+'/dns_records?name=czechnavigator.dominiklukes.net'
d=api(p);print('exact DNS',json.dumps(d));
if not d.get('success'):raise SystemExit(2)
assert not d['result'],'Existing record: stop and inspect'
pages='/accounts/b6ae5bced06492ee6f0c8f92776804da/pages/projects/czechnavigator/domains'
r=api(pages,'POST',{'name':'czechnavigator.dominiklukes.net'},True);print('associate',json.dumps(r));
if not r.get('success'):raise SystemExit(3)
r=api('/zones/'+zone['id']+'/dns_records','POST',{'type':'CNAME','name':'czechnavigator','content':'czechnavigator.pages.dev','proxied':True,'ttl':1});print('create DNS',json.dumps(r));
print('domains',json.dumps(api(pages,oauth=True)))
