/** Academic Reading Framework: render the ORIGINAL constants.tsx (read-only), swap interactive widgets for markers,
 *  convert to Markdown, write the book JSON and the raw diagram HTML used by the embed build.
 *  Usage: tsx build-academic.tsx <source-repo> <out-dir> */
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { htmlToMarkdown, literalAfter, escapeHtml } from './lib.js';

const [src, outDir] = process.argv.slice(2).map(p => resolve(p));
mkdirSync(outDir, { recursive: true });
const req = createRequire(resolve(src, 'package.json'));
const React = req('react');
const { renderToStaticMarkup } = req('react-dom/server');
const constants = await import(pathToFileURL(resolve(src, 'constants.tsx')).href);
const explorerSource = readFileSync(resolve(src, 'components/CognitionExplorer.tsx'), 'utf8');
const NODES: any[] = literalAfter(explorerSource, 'const NODES: Node[] =');
const EDGES: any[] = literalAfter(explorerSource, 'const EDGES: Edge[] =');
const { CognitionExplorer } = await import(pathToFileURL(resolve(src, 'components/CognitionExplorer.tsx')).href);

const ARTICULATION = 'my-8 flex flex-col gap-3 max-w-2xl mx-auto';
const SUMMARY = 'my-8 mx-auto max-w-xl';
const diagramHtml: Record<string, string> = {};
const marker = (id: string) => React.createElement('p', null, `@@EMBED:${id}@@`);
/** Walk the React element tree of the original content; widgets become markers, nothing else changes. */
function swap(node: any): any {
  if (node == null || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map(swap);
  if (!React.isValidElement(node)) return node;
  const el = node as React.ReactElement<any>;
  if (el.type === CognitionExplorer) return marker('cognition-explorer');
  if (typeof el.type === 'string' && el.type === 'div' && (el.props.className === ARTICULATION || el.props.className === SUMMARY)) {
    const id = el.props.className === ARTICULATION ? 'reading-articulation-layers' : 'reading-simplified-summary';
    diagramHtml[id] = renderToStaticMarkup(el);
    return marker(id);
  }
  if (el.props && el.props.children !== undefined) return React.cloneElement(el, undefined, ...React.Children.toArray(swap(el.props.children)));
  return el;
}
const html = (n: any) => (n ? renderToStaticMarkup(swap(n)) : '');

const byId = new Map<string, any>(constants.ALL_SECTIONS.map((p: any) => [p.id, p]));
const groups = constants.NAV_STRUCTURE.map((g: any) => ({ groupTitle: g.groupTitle ?? 'Overview', items: g.items.map((i: any) => ({ id: i.id, label: i.label })) }));
const order = groups.flatMap((g: any) => g.items.map((i: any) => ({ ...i, group: g.groupTitle })));

const sections = order.map((item: any) => {
  const p = byId.get(item.id);
  const parts = [
    `<h2>${escapeHtml(p.title)}</h2>`,
    `<p>${escapeHtml(p.shortDescription)}</p>`,
    html(p.fullDescription),
    html(p.extraContent),
    (p.relatedLinks || []).map((l: any) => `<p><a href="#/${l.id}">${escapeHtml(l.label)}</a></p>`).join(''),
    p.approach ? `<h3>Choosing the Approach</h3>${html(p.approach)}` : '',
    p.tools ? `<h3>Choosing Tools</h3>${html(p.tools)}` : '',
  ];
  return { id: p.id, title: p.title, category: item.group, navLabel: item.label, html: parts.join('\n') };
});

writeFileSync(resolve(outDir, 'academic-sections.json'), JSON.stringify({ title: constants.APP_TITLE, subtitle: constants.APP_SUBTITLE, groups, sections }, null, 1));
writeFileSync(resolve(outDir, 'academic-diagrams.json'), JSON.stringify({ diagrams: diagramHtml, nodes: NODES, edges: EDGES, explorerSsr: renderToStaticMarkup(React.createElement(CognitionExplorer)) }, null, 1));
console.log('sections', sections.length, 'diagrams', Object.keys(diagramHtml), 'nodes', NODES.length, 'edges', EDGES.length);
