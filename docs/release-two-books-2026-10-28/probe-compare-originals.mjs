// Evidence: compare the three original editions built from the committed source (baseline) and from the working tree (after).
// Every non-bundle file must be byte-identical, except pages, which may differ only in the hashed bundle file names; bundle file names and counts are reported.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const [baseline, after] = process.argv.slice(2).map(p => path.resolve(p));
const walk = (dir, rel = '') => fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(dir, path.join(rel, e.name)) : [path.join(rel, e.name)]);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const report = {};
let ok = true;
for (const book of ['linguistics', 'deliberate-practice', 'language-muscle']) {
  const a = path.join(baseline, book), b = path.join(after, book);
  const fa = walk(a).sort(), fb = walk(b).sort();
  const plain = list => list.filter(f => !f.startsWith('assets/'));
  const r = { filesBaseline: fa.length, filesAfter: fb.length, nonBundleFiles: plain(fa).length, identical: 0, pagesDifferingOnlyInBundleNames: 0, differing: [], onlyBaseline: [], onlyAfter: [],
    bundleBaseline: fa.filter(f => f.startsWith('assets/')), bundleAfter: fb.filter(f => f.startsWith('assets/')) };
  const setB = new Set(plain(fb));
  for (const f of plain(fa)) {
    if (!setB.has(f)) { r.onlyBaseline.push(f); continue; }
    const x = fs.readFileSync(path.join(a, f)), y = fs.readFileSync(path.join(b, f));
    if (x.equals(y)) { r.identical++; continue; }
    const norm = t => t.toString('utf8').replace(/assets\/[\w-]+\.(js|css)/g, 'assets/BUNDLE.$1');
    if (f.endsWith('.html') && norm(x) === norm(y)) { r.pagesDifferingOnlyInBundleNames++; continue; }
    r.differing.push({ file: f, baseline: sha(x), after: sha(y) });
  }
  for (const f of plain(fb)) if (!fs.existsSync(path.join(a, f))) r.onlyAfter.push(f);
  if (r.differing.length || r.onlyBaseline.length || r.onlyAfter.length || r.bundleBaseline.length !== r.bundleAfter.length) ok = false;
  report[book] = r;
}
console.log(JSON.stringify({ ok, report }, null, 1));
process.exitCode = ok ? 0 : 1;
