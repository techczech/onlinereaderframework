import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { build } from '../../../apps/reader-demo/node_modules/vite/dist/node/index.js';
import react from '../../../apps/reader-demo/node_modules/@vitejs/plugin-react/dist/index.js';
import { releasePlugin } from '../../../apps/reader-demo/scripts/release/release-plugin';
import { planEdition } from '../../../apps/reader-demo/scripts/release/edition-plan';
import { defaultPreviousSiteDir } from '../../../apps/reader-demo/scripts/release/previous-site';
import { releaseBooks } from '../../../apps/reader-demo/scripts/release/release-books';
import { canonicalSites } from '../../../apps/reader-demo/src/canonical-sites';
const root = process.cwd(), app = path.join(root, 'apps/reader-demo');
const ids = ['academic-productivity', 'developing-competence'];
const covers = Object.fromEntries(ids.map(id => [id, fs.readFileSync(path.join(app, `public/covers/${id}.jpg`)).toString('base64')]));
for (const id of [...ids, 'academic-reading']) {
  const plan = planEdition({ book: releaseBooks.find(b => b.id === id)!, site: canonicalSites[id], appRoot: app, previousSiteDir: defaultPreviousSiteDir(root) });
  const result: any = await build({ configFile: false, root: app, publicDir: false, base: plan.base, plugins: [react(), releasePlugin(plan, app)], resolve: { alias: { 'reader-core': path.join(root, 'packages/reader-core/src/index.ts') }, dedupe: ['react', 'react-dom'] }, define: { __READER_RELEASE_BOOK__: JSON.stringify(id) }, build: { write: false } });
  const js = result.output.filter((f: any) => f.type === 'chunk').map((f: any) => f.code).join('\n');
  for (const other of ids) assert.equal(js.includes(covers[other]), other === id, `${id}: embedded cover ${other}`);
  console.log(JSON.stringify({ id, ownCoverOnly: true, jsBytes: js.length }));
}
