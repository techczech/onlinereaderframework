import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const results=JSON.parse(readFileSync(new URL('./result-reader-source-guards.json',import.meta.url),'utf8'));
const named=name=>results.tests.find(t=>t.name===name);
if(process.argv[2]==='privacy') {
 assert.ok(named('longer-private-url-survives-filter-and-final-audit').issues.length>0,'A non-allowlisted private file address must fail the final audit after generic-test filtering.');
} else if(process.argv[2]==='writes') {
 assert.equal(named('archive-output-symlink-overwrites-outside-canary').canaryChanged,false,'The named archive must not follow a symlink and overwrite an outside file.');
 assert.equal(named('build-directory-symlink-allows-outside-cleanup-and-writes').outsideCanaryDeleted,false);
} else throw Error('Choose privacy or writes.');
