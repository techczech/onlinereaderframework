/** Assemble the two book JSON files, the embed manifest and the provenance record from the scratch renders.
 *  Usage: tsx assemble.ts <scratch-dir> */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { escapeHtml, htmlToMarkdown, sha256 } from './lib.js';
import { academicHomeSummaries } from './home-summaries.js';

const here = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(here, '..');
const scratch = resolve(process.argv[2]);
const ACADEMIC = '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/academic-reading-framework';
const READABILITY_WT = '/Users/dominiklukes/worktrees/guides/readability-foundations';
const READABILITY = '/Users/dominiklukes/gitrepos/07_webapps-websites/05_publications/readability-foundations';
const readJson = (f: string) => JSON.parse(readFileSync(resolve(scratch, f), 'utf8'));

// ---------------- Academic ----------------
const ac = readJson('academic-sections.json');
const dg = readJson('academic-diagrams.json');

function academicHtmlToMarkdown(html: string): string {
  const tables: string[] = [];
  const stripped = html.replace(/ class="[^"]*"/g, '').replace(/<table>[\s\S]*?<\/table>/g, t => {
    if (/<th[ >]/.test(t)) return t;                       // header rows become Markdown tables
    const compact = t.replace(/>\s+</g, '><').replace(/\s*\n\s*/g, '');
    tables.push(compact);
    return `<p>@@TABLE:${tables.length - 1}@@</p>`;
  });
  let md = htmlToMarkdown(stripped);
  tables.forEach((t, i) => { md = md.replace(`@@TABLE:${i}@@`, t); });
  return md;
}

/** Keep heading levels in order (no jump from # to ###): a heading may be at most one level below the previous heading. */
function orderHeadings(md: string): string {
  let previous = 1;
  return md.split('\n').map(line => {
    const m = line.match(/^(#{1,6}) (.*)$/);
    if (!m) return line;
    const level = Math.min(m[1].length, previous + 1);
    previous = level;
    return `${'#'.repeat(level)} ${m[2]}`;
  }).join('\n');
}
const text = (html: string) => html.replace(/<[^>]+>/g, '').trim();
const NODE_TYPE_LABEL: Record<string, string> = { mode: 'Cognitive Mode', process: 'Activity', activity: 'Activity' }; // as in the original info panel
const byId = new Map<string, any>(dg.nodes.map((n: any) => [n.id, n]));
function explorerAlternative(): string {
  const modes = dg.nodes.filter((n: any) => n.type === 'mode'), acts = dg.nodes.filter((n: any) => n.type !== 'mode');
  const rows = [...new Set(dg.nodes.map((n: any) => n.y))].sort((a: any, b: any) => a - b).map(y => dg.nodes.filter((n: any) => n.y === y).sort((a: any, b: any) => a.x - b.x).map((n: any) => n.label));
  const nodeItems = dg.nodes.map((n: any) => `<li><strong>${escapeHtml(n.label)}</strong> (${NODE_TYPE_LABEL[n.type]}): ${escapeHtml(n.description)}</li>`).join('');
  const edgeItems = dg.nodes.map((n: any) => {
    const out = dg.edges.filter((e: any) => e.source === n.id);
    if (!out.length) return '';
    return `<li><strong>${escapeHtml(n.label)}</strong><ul>${out.map((e: any) => `<li>${escapeHtml(e.label)}: ${escapeHtml(byId.get(e.target).label)}${e.dashed ? ' (dashed arrow: facilitation or support)' : ''}</li>`).join('')}</ul></li>`;
  }).join('');
  return `<div id="cognition-explorer-text"><p><strong>Text version of the interactive diagram.</strong> The map shows ${dg.nodes.length} nodes: ${modes.length} cognitive modes (${modes.map((n: any) => escapeHtml(n.label)).join(', ')}), shown in blue, and ${acts.length} activities (${acts.map((n: any) => escapeHtml(n.label)).join(', ')}), shown in grey. They are arranged in rows from top to bottom: ${rows.map(r => r.map(escapeHtml).join(', ')).join('; ')}. Arrows join the nodes; selecting a node in the map shows its definition and highlights the arrows that connect it.</p><p><strong>Definitions</strong></p><ul>${nodeItems}</ul><p><strong>Arrows, listed by the node they start from</strong> (relationship: target)</p><ul>${edgeItems}</ul></div>`;
}
function articulationAlternative(): string {
  const html = dg.diagrams['reading-articulation-layers'];
  const items = [...html.matchAll(/<span class="text-lg font-semibold text-slate-900">([^<]*)<\/span><\/div><div class="text-right[^"]*">((?:<div>[^<]*<\/div>)+)<\/div>/g)].map(m => ({ title: m[1], details: [...m[2].matchAll(/<div>([^<]*)<\/div>/g)].map(d => d[1]) }));
  const caption = text(html.match(/<div class="mt-2 text-center[^>]*>([^<]*)<\/div>/)![1]);
  if (items.length !== 5) throw new Error('articulation diagram changed');
  return `<div id="reading-articulation-layers-text"><p><strong>Text version of the diagram.</strong> ${escapeHtml(caption)}. Five levels of reading are stacked from top to bottom, each with its parts:</p><ul>${items.map(i => `<li><strong>${escapeHtml(i.title)}</strong>: ${i.details.map(escapeHtml).join('; ')}</li>`).join('')}</ul></div>`;
}
function summaryAlternative(): string {
  const html = dg.diagrams['reading-simplified-summary'];
  const labels = [...html.matchAll(/>([^<>]+)<\/div>/g)].map(m => m[1]);
  const [caption] = labels.filter(l => l.startsWith('Diagram:'));
  const blocks = labels.filter(l => !l.startsWith('Diagram:'));
  if (blocks.join('|') !== 'Decoding|Pre-coding|Encoding|Re-coding|Manipulation') throw new Error('summary diagram changed: ' + blocks.join('|'));
  return `<div id="reading-simplified-summary-text"><p><strong>Text version of the diagram.</strong> ${escapeHtml(caption)}. Five blocks are stacked in three layers. At the top is <strong>Decoding</strong>. In the middle, side by side, are <strong>Pre-coding</strong>, <strong>Encoding</strong> and <strong>Re-coding</strong>. At the bottom, spanning the full width, is <strong>Manipulation</strong>.</p></div>`;
}
const alternatives: Record<string, string> = { 'cognition-explorer': explorerAlternative(), 'reading-articulation-layers': articulationAlternative(), 'reading-simplified-summary': summaryAlternative() };

const academicSummaries = academicHomeSummaries(ACADEMIC);
const withSummary = (content: string, summary?: string): string => !summary || content.includes(summary) ? content : content.replace(/^(# [^\n]+\n)/, (_match, heading: string) => `${heading}\n${summary}\n`);
const academicSections = ac.sections.map((s: any) => {
  let md = orderHeadings(academicHtmlToMarkdown(s.html));
  md = md.replace(/^@@EMBED:([a-z-]+)@@$/gm, (_m: string, id: string) => alternatives[id]);
  if (/@@/.test(md)) throw new Error(`unresolved marker in ${s.id}`);
  return { id: s.id, title: s.title, category: s.category, format: 'markdown', content: withSummary(md + '\n', academicSummaries[s.id]) };
});

const academicEmbeds = [
  { id: 'cognition-explorer', sectionId: 'cognition-explorer', anchor: 'cognition-explorer-text', src: 'cognition-explorer/index.html', title: 'Cognition Explorer: interactive map of the cognitive processes in academic reading', caption: 'Select a node to see its definition and the arrows that connect it.', height: { initial: 700, min: 420, max: 1100 }, resize: true,
    placement: 'immediately before the text version, after the introductory paragraph and before "How to read this map:"' },
  { id: 'reading-articulation-layers', sectionId: 'cognition', anchor: 'reading-articulation-layers-text', src: 'reading-articulation-layers/index.html', title: 'Articulation of Reading: five levels of reading', caption: 'Diagram: Articulation of Reading Process', height: { initial: 460, min: 300, max: 800 }, resize: true,
    placement: 'under the heading "Articulation of Reading"' },
  { id: 'reading-simplified-summary', sectionId: 'cognition', anchor: 'reading-simplified-summary-text', src: 'reading-simplified-summary/index.html', title: 'Simplified graphical summary of decoding, pre-coding, encoding, re-coding and manipulation', caption: 'Diagram: Simplified Graphical Summary', height: { initial: 300, min: 220, max: 600 }, resize: true,
    placement: 'under the heading "Graphical summary"' }
];

// ---------------- Readability ----------------
const rd = readJson('readability-sections.json');
const readabilityEmbeds = rd.embeds.map((e: any) => ({ id: e.id, sectionId: e.sectionId, anchor: e.anchor, src: `${e.id}/index.html`, title: e.title, caption: e.caption, height: e.height, resize: true,
  placement: `immediately before the text version in section "${e.sectionId}"` }));

// ---------------- books ----------------
const academicBook = {
  id: 'academic-reading',
  title: ac.title,
  subtitle: ac.subtitle,
  author: 'Dominik Lukeš',
  description: 'An interactive guide to increasing reading productivity based on the Academic Reading Framework.',
  // Existing public catalogue address (dlnet guides.json). The final dominiklukes.net book path is not decided; do not invent one.
  sourceUrl: 'https://academicreading.edutools.fyi',
  navigation: { homeDepth: 2, showHomeContents: true },
  appearance: { accent: '#0369a1', paper: '#f6f9fb', ink: '#1f2933', masthead: 'editorial', cover: { src: '/covers/academic-reading.jpg', alt: 'Increasing Reading Productivity cover with linked landscape panels on dark blue paper' } },
  home: { authorNote: 'Developed by Dominik Lukeš for the Reading and Writing Innovation Lab' },
  sections: academicSections
};
const readabilityBook = {
  id: 'readability-foundations',
  title: 'Foundations of Readability',
  subtitle: 'Create accessible, easy-to-process documents and presentations',
  author: 'Dominik Lukeš',
  description: 'An interactive guide on document and presentation readability principles based on the work of Dominik Lukeš.',
  sourceUrl: 'https://readability.edutools.fyi/',
  navigation: { homeDepth: 2, showHomeContents: true },
  appearance: { accent: '#4338ca', paper: '#f8f7fd', ink: '#23223a', masthead: 'practical', cover: { src: '/covers/readability-foundations.jpg', alt: 'Foundations of Readability cover with a cream cut-paper page and a coral tab' } },
  home: { authorNote: 'Dominik Lukeš, CC BY • Version from May 2023', license: { label: 'CC BY (Creative Commons Attribution), as stated in the original guide', href: 'https://creativecommons.org/licenses/by/' } },
  sections: rd.sections.map((s: any) => ({ id: s.id, title: s.title, category: s.category, format: 'markdown', content: withSummary(orderHeadings(s.content), s.description) }))
};
writeFileSync(resolve(outDir, 'academic-reading-framework.book.json'), JSON.stringify(academicBook, null, 2) + '\n');
writeFileSync(resolve(outDir, 'readability-foundations.book.json'), JSON.stringify(readabilityBook, null, 2) + '\n');
writeFileSync(resolve(outDir, 'embed-manifest.json'), JSON.stringify({
  description: 'Host-side embed descriptors per embed-contract.md v1 (docs/design/2026-10-28-two-book-conversion/embed-contract.md). `src` is relative to the embeds root; files are under apps/reader-demo/interactives/<book>/<id>/index.html. `placement` is explanatory, not part of the descriptor.',
  books: {
    'academic-reading': { bookFile: 'academic-reading-framework.book.json', interactivesDir: 'interactives/academic-reading-framework', items: academicEmbeds },
    'readability-foundations': { bookFile: 'readability-foundations.book.json', interactivesDir: 'interactives/readability-foundations', items: readabilityEmbeds }
  }
}, null, 2) + '\n');
writeFileSync(resolve(scratch, 'assembled.json'), JSON.stringify({ academicEmbeds, readabilityEmbeds, accounting: rd.accounting }, null, 1));
console.log('wrote books:', academicSections.length, 'academic sections,', readabilityBook.sections.length, 'readability sections; embeds', academicEmbeds.length + readabilityEmbeds.length);
