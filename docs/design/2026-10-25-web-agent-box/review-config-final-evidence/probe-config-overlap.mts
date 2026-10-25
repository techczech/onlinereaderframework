import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {agentLocations} from '../../../../packages/reader-core/src/agent-export/agent-location.ts';
const siteUrl='https://public.example.org/',documentUrl='https://public.example.org/sub/reader/?book=b&section=c',path=siteUrl+'sub/reader/static/agent/';
const actual=agentLocations({siteUrl,documentUrl,path});
const expected={local:'https://public.example.org/sub/reader/static/agent/',public:'https://public.example.org/static/agent/'};
const passed=JSON.stringify(actual)===JSON.stringify(expected);
fs.writeFileSync(fileURLToPath(new URL('./overlap-observation.json',import.meta.url)),JSON.stringify({siteUrl,documentUrl,path,actual,expected,passed,assessment:'Existing current-page prefix priority in a same-host overlapping configuration. Both addresses remain inside their validated prefixes. No new safety bypass; directory interpretation is the conflicting-config limitation accepted by the controlling review brief.'},null,2)+'\n');
console.log(passed?'PASS existing current-page prefix priority':'FAIL overlap priority changed');process.exitCode=passed?0:1;
