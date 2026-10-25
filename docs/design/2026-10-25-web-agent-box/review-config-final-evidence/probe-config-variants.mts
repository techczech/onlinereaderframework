import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import React from '../../../../packages/reader-core/node_modules/react/index.js';
import {renderToString} from '../../../../packages/reader-core/node_modules/react-dom/server.js';
import {buildAgentBook,buildAgentRootIndex} from '../../../../packages/reader-core/src/agent-export/index.ts';
import {canonicalSiteUrl,isPrivateHost} from '../../../../packages/reader-core/src/agent-export/agent-paths.ts';
import {agentLocations} from '../../../../packages/reader-core/src/agent-export/agent-location.ts';
import {AgentAccess} from '../../../../packages/reader-core/src/original/agent/AgentAccess.tsx';
const here=path.dirname(fileURLToPath(import.meta.url));
const checks:any[]=[];const check=(name:string,passed:boolean,detail?:any)=>{checks.push({name,passed,detail});console.log(`${passed?'PASS':'FAIL'} ${name}`)};
const book:any={id:'review-book',title:'Review book',author:'Public author',description:'Public description',sections:[{id:'chapter one/..',title:'Chapter one',category:'Text',content:'Exact authored text.'}]};
const good=buildAgentBook(book);const site='https://public.example.org/sub/reader/';const page='http://127.0.0.1:18793/sub/reader/?book=b&section=x';
const bads=['https:example.org/sub/','https://example.org/sub/../x','https://example.org/sub/.%2e/x','https://example.org/sub/%2E./x','https://example.org/sub/?','https://example.org/sub/#','https://u:p@example.org/','http://127.1/','http://0x7f000001/','http://0177.0.0.1/','http://[::ffff:172.31.255.255]/','http://[::ffff:192.168.255.254]/','http://[::ffff:100.127.255.255]/','https://localhost。/','https://box.tail123.ts.net．/','https://ｌｏｃａｌｈｏｓｔ/','https://box.localdomain./','https://example.org/a%2Fb','https://example.org/a%5Cb',null,0,{},false];
for(const v of bads){
 check('bad canonical '+JSON.stringify(v),canonicalSiteUrl(v)===undefined);
 for(const [label,fn] of [['book',()=>buildAgentBook(book,{siteUrl:v as any})],['root-option',()=>buildAgentRootIndex([good],{siteUrl:v as any})],['root-export',()=>buildAgentRootIndex([{...good,siteUrl:v as any}])]] as const){
  let message='';try{fn()}catch(e){message=String((e as Error).message)}
  check(label+' refuses '+JSON.stringify(v),!!message&&!message.includes('u:p')&&!message.includes(String(v)),message);
 }
}
const valid=['https://public.example.org/Sub/Reader/','https://xn--bcher-kva.example/','https://bücher.example/','https://example.org:8443/','http://8.8.4.4/','http://100.63.255.254/','http://[2001:4860:4860::8888]/','https://[2606:4700:4700::1111]:8443/sub/','http://[::ffff:8.8.8.8]/'];
for(const v of valid){const c=canonicalSiteUrl(v);let accepted=false;try{accepted=buildAgentBook(book,{siteUrl:v}).siteUrl===c}catch{}check('ordinary public form '+v,!!c&&accepted,c)}
const unsafe=['%252e%252e/agent/','%25252e%25252e/agent/','static/%252fagent/','static/%255cagent/','/sub/reader-other/static/agent/','/Sub/reader/static/agent/','https://public.example.org/sub/reader-other/static/agent/','https://public.example.org.evil.example/sub/reader/static/agent/','//evil.example/sub/reader/static/agent/','static//agent/','static/./agent/','static/.../agent/','static/agent?','static/agent#','java\tscript:alert(1)','https://u:p@public.example.org/sub/reader/static/agent/','static/%E2%80%A4%E2%80%A4/agent/'];
for(const v of unsafe){check('unsafe folder fallback '+v,JSON.stringify(agentLocations({path:v,siteUrl:site,documentUrl:page}))===JSON.stringify(agentLocations({siteUrl:site,documentUrl:page})));}
for(const v of ['static/agent/','././static/agent/','/sub/reader/static/agent/','http://127.0.0.1:18793/sub/reader/static/agent/'])check('safe folder rebases '+v,JSON.stringify(agentLocations({path:v,siteUrl:site,documentUrl:page}))===JSON.stringify({local:'http://127.0.0.1:18793/sub/reader/static/agent/',public:site+'static/agent/'}));
for(const documentUrl of ['http://127.0.0.1:18793/sub/reader/','http://127.0.0.1:18793/preview/']){
 const actual=agentLocations({path:site+'static/agent/',siteUrl:site,documentUrl});
 const expected={local:new URL('./static/agent/',documentUrl).href,public:site+'static/agent/'};
 check('canonical absolute folder retains local preview '+documentUrl,JSON.stringify(actual)===JSON.stringify(expected),{actual,expected});
}
for(const access of [{},{path:undefined},{siteUrl:site},{siteUrl:site,path:undefined},{siteUrl:site,path:'static/agent/'},{siteUrl:'https://u:p@example.org/'}]){
 try{const html=renderToString(React.createElement(AgentAccess,{book,access,variant:'panel'}));check('SSR no DOM '+JSON.stringify(access),!html.includes('u:p'),{length:html.length})}catch(e){check('SSR no DOM '+JSON.stringify(access),false,String(e))}
}
const observations={trailingDotPublic:{canonical:canonicalSiteUrl('https://public.example.org./')??null,private:isPrivateHost('public.example.org.')},outerWhitespace:canonicalSiteUrl(' \thttps://public.example.org/sub/\n'),doubleEncodedOrigin:canonicalSiteUrl('https://public.example.org/sub/%252e%252e/x/')};
fs.writeFileSync(path.join(here,'variants-results.json'),JSON.stringify({checks,observations},null,2)+'\n');
const fail=checks.filter(x=>!x.passed).length;console.log(`${checks.length} checks; ${fail} failures`);process.exitCode=fail?1:0;
