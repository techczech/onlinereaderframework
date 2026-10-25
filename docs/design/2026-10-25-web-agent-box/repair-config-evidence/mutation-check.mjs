/** Reintroduces each reviewed defect, one at a time, into the fixed source and runs the focused agent-export suite: every mutation must make at least one test fail (a compile error does not count).
 * Each file is restored byte for byte in a finally step and its hash checked. Run from the repository root: node <this file> */
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const sha = text => createHash('sha256').update(text).digest('hex');
const core = 'packages/reader-core/src/agent-export/';
const mutations = [
  ['P2-1 public folder hardcoded to agent/', 'agent-location.ts', 'public: `${publicSite}${found.directory}/`', 'public: `${publicSite}agent/`'],
  ['P2-2 generator accepts raw siteUrl', 'agent-export.ts', "  const siteUrl = requireSiteUrl(options.siteUrl);\n  // Folders", "  const siteUrl = options.siteUrl ? String(options.siteUrl).replace(/\\/*$/, '/') : undefined;\n  // Folders"],
  ['P2-2 root index trusts AgentBookExport.siteUrl', 'agent-export.ts', 'requireSiteUrl(bookSite, `siteUrl of the export', '((v: unknown, _w: string) => v as string | undefined)(bookSite, `siteUrl of the export'],
  ['P2-3 final DNS dot not stripped', 'agent-url.ts', ".replace(/^\\[|\\]$/g, '').replace(/\\.+$/, '')", ".replace(/^\\[|\\]$/g, '')"],
  ['P2-3 IPv4-mapped IPv6 not classified', 'agent-url.ts', '(w[5] === 0xffff || w[5] === 0)) return embedded', '(w[5] === 0)) return embedded'],
  ['P2-4 raw folder rules not checked (escapes, controls, query, credentials)', 'agent-location.ts', "if (typeof path !== 'string' || !path || UNSAFE_TEXT.test(path) || /[?#@]/.test(path)) return undefined;", "if (typeof path !== 'string' || !path) return undefined;"],
  ['P2-4 raw dot segments of a folder not checked', 'agent-location.ts', "if (pathPart.split('/').some(dotSegment)) return undefined;", ''],
  ['P2-4 prefix containment not checked', 'agent-location.ts', 'if (!prefix || !target.startsWith(prefix)) continue;', 'if (!prefix) continue;'],
  ['P3 raw escapes and controls not checked', 'agent-url.ts', 'if (!exact || UNSAFE_TEXT.test(raw)) return undefined;', 'if (!exact) return undefined;'],
  ['P3 raw dot segments and final dot not checked', 'agent-url.ts', "if (!authority || /\\.(?::\\d*)?$/.test(authority) || path.split('/').some(dotSegment)) return undefined;", 'if (!authority) return undefined;'],
];
const results = [];
for (const [name, file, from, to] of mutations) {
  const target = core + file, original = readFileSync(target, 'utf8');
  if (!original.includes(from)) { results.push({ name, error: 'mutation text not found' }); continue; }
  try {
    writeFileSync(target, original.replace(from, () => to));
    const run = spawnSync('npm', ['run', 'test:agent-export', '--prefix', 'packages/reader-core'], { encoding: 'utf8' });
    const failed = (run.stdout.match(/^✖ (?!failing tests)(.+?) \(/gm) ?? []).map(line => line.slice(2).replace(/ \($/, ''));
    results.push({ name, file, exitCode: run.status, caught: run.status !== 0 && failed.length > 0, failingTests: [...new Set(failed)] });
  } finally {
    writeFileSync(target, original);
    if (sha(readFileSync(target, 'utf8')) !== sha(original)) throw new Error(`${target} was not restored`);
  }
}
console.log(JSON.stringify(results, null, 2));
process.exit(results.every(r => r.caught) ? 0 : 1);
