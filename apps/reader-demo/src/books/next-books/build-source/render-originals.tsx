/** Server-renders each ORIGINAL section exactly as the app shows it (chrome included), as HTML, for the source-accounting check.
 *  Usage: tsx render-originals.tsx <academic-source> <readability-source> <out.json> */
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { academicHomeSummaries } from './home-summaries.js';

const [academicSrc, readabilitySrc, out] = process.argv.slice(2).map(p => resolve(p));
async function renderer(src: string) {
  const req = createRequire(resolve(src, 'package.json'));
  return { React: req('react'), render: req('react-dom/server').renderToStaticMarkup as (n: any) => string, load: (p: string) => import(pathToFileURL(resolve(src, p)).href) };
}
// Academic: DetailSection is the app's per-section page (title, summary, body, related buttons, approach/tools cards).
const A = await renderer(academicSrc);
const constants = await A.load('constants.tsx');
const { DetailSection } = await A.load('components/DetailSection.tsx');
const academic: Record<string, string> = {};
for (const p of constants.ALL_SECTIONS) academic[p.id] = A.render(A.React.createElement(DetailSection, { point: p, onNavigate: () => {} }));
// Readability: Content is the app's section router; NavigationProvider supplies link handling.
const R = await renderer(readabilitySrc);
const types = await R.load('types.ts');
const { Content } = await R.load('components/Content.tsx');
const { NavigationProvider } = await R.load('context/NavigationContext.tsx');
const readability: Record<string, string> = {};
for (const item of types.NAV_SECTIONS) {
  const html = R.render(R.React.createElement(NavigationProvider, { onNavigate: () => {} }, R.React.createElement(Content, { activeSection: item.id, onNavigate: () => {} })));
  readability[item.id] = html;
}
writeFileSync(out, JSON.stringify({ academic, readability, homepageSummaries: { academic: Object.values(academicHomeSummaries(academicSrc)), readability: types.NAV_SECTIONS.map((item: any) => item.description) } }, null, 1));
console.log('original renders', Object.keys(academic).length, Object.keys(readability).length);
