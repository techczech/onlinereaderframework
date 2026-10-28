/** Foundations of Readability: convert the ORIGINAL block data (read-only) to Markdown sections.
 *  Interactive blocks become prose alternatives (HTML anchors for the embed contract). UI chrome is not printed.
 *  Usage: tsx build-readability.tsx <source-repo> <out-dir> */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { escapeHtml, literalAfter } from './lib.js';

const [src, outDir] = process.argv.slice(2).map(p => resolve(p));
mkdirSync(outDir, { recursive: true });
const read = (p: string) => readFileSync(resolve(src, p), 'utf8');
const load = async (p: string) => import(pathToFileURL(resolve(src, p)).href);

// ---- verbatim literals taken from the original components (build fails when they move) ----
function between(text: string, start: string, end: string): string {
  const a = text.indexOf(start); if (a < 0) throw new Error(`missing: ${start}`);
  const b = text.indexOf(end, a + start.length); if (b < 0) throw new Error(`missing end: ${end}`);
  return text.slice(a + start.length, b);
}
const dyslexiaSrc = read('components/interactive/DyslexiaSimulator.tsx');
const fontSrc = read('components/interactive/FontSpacingAdjuster.tsx');
const checkerSrc = read('components/tools/ReadabilityChecker.tsx');
const checklistSrc = read('components/tools/SimpleLanguageChecklist.tsx');
const slideSrc = read('components/interactive/SlideSimulation.tsx');
const SAMPLE = between(dyslexiaSrc, 'text-slate-600 blur-[0.3px]\'\n          }\n        `}>\n          ', '\n        </p>').trim();
const FONT_SAMPLE = between(fontSrc, 'leading-tight">\n          ', '\n        </div>').trim();
if (SAMPLE !== FONT_SAMPLE) throw new Error('sample paragraphs differ between simulator and adjuster');
const DYSLEXIA_INTRO_HTML = between(dyslexiaSrc, '<p className="text-slate-600 mb-6">', '</p>'); // contains a control sentence
const CHECKER_DEFAULT = between(checkerSrc, 'useState("', '");');
const CHECKLIST: { label: string }[] = literalAfter(checklistSrc, 'const INITIAL_CHECKLIST: ChecklistItem[] =');
const CHECKLIST_HEADING = between(checklistSrc, '<h3 className="font-bold text-slate-700">', '</h3>');
const DETAIL_SLIDE = between(slideSrc, '<p className="text-sm font-bold text-slate-800 leading-tight">', '</p>');
const DETAIL_POINT = between(slideSrc, 'uppercase tracking-wide mb-1">', '</p>');

// ---- RichText (same grammar as components/blocks/RichText.tsx) ----
const mdEscape = (s: string) => s.replace(/([\\`*<>|])/g, '\\$1').replace(/^(\s*)([#+\-]|\d+[.)])(\s)/, '$1\\$2$3').replace(/_/g, '\\_').replace(/\[/g, '\\[');
function rich(content: string, htmlMode = false): string {
  // Same grammar as RichText.tsx, except that a link address may contain one level of balanced parentheses.
  // The original stops at the first ")" and so truncates DOI addresses such as ...S0022-5371(81)90301-7.
  const LINK = /\[.*?\]\((?:[^()]|\([^()]*\))*\)/.source;
  const parts = content.split(new RegExp(`(${LINK})|(\\*\\*.*?\\*\\*)|(_.*?_)`, 'g')).filter(Boolean);
  return parts.map(part => {
    const link = part.match(/^\[(.*?)\]\(((?:[^()]|\([^()]*\))*)\)$/);
    if (link) {
      const [, text, href] = link;
      if (href.includes('(')) drop('link address repaired', 'evidence', `${href} (the original app cuts the address at the first parenthesis)`);
      const target = href.startsWith('http') ? href : `#/${href}`;
      return htmlMode ? `<a href="${escapeHtml(target)}">${escapeHtml(text)}</a>` : `[${mdEscape(text)}](${target})`;
    }
    if (part.startsWith('**') && part.endsWith('**')) return htmlMode ? `<strong>${escapeHtml(part.slice(2, -2))}</strong>` : `**${mdEscape(part.slice(2, -2))}**`;
    if (part.startsWith('_') && part.endsWith('_')) return htmlMode ? `<em>${escapeHtml(part.slice(1, -1))}</em>` : `*${mdEscape(part.slice(1, -1))}*`;
    return htmlMode ? escapeHtml(part) : mdEscape(part);
  }).join('');
}
const plainRich = (s: string) => rich(s, true);

// ---- embeds ----
interface EmbedRecord { id: string; sectionId: string; anchor: string; title: string; caption: string; height: { initial: number; min: number; max: number }; alternativeSource: string }
const embeds: EmbedRecord[] = [];
const accounting: { kind: string; where: string; detail: string }[] = [];
const drop = (kind: string, where: string, detail: string) => accounting.push({ kind, where, detail });

const alt = (id: string, intro: string, body: string) => `<div id="${id}"><p><strong>Text version of the interactive demonstration.</strong> ${intro}</p>${body}</div>`;
const sampleBlockquote = `<blockquote><p>${escapeHtml(SAMPLE)}</p></blockquote>`;

import { transformSync } from 'esbuild';
/** The analysis is the original code: the body of useMemo in ReadabilityChecker.tsx, type-stripped by esbuild, never retyped. */
const analysisBody = between(checkerSrc, 'const analysis = useMemo(() => {', '}, [textInput]);');
const analysisJs = transformSync(`(textInput: string) => {${analysisBody}}`, { loader: 'ts' }).code.trim().replace(/;$/, '');
const analyse: (t: string) => { sentences: any[]; totalWords: number; sentenceCount: number; avgWords: number } = new Function(`return ${analysisJs}`)();

// ---- block conversion ----
const embedForStep: Record<string, (ctx: Ctx) => string> = {};
interface Ctx { sectionId: string; stepId?: string }
function indent(md: string, pad: string) { return md.split('\n').map((l, i) => (l ? (i === 0 ? l : pad + l) : l)).join('\n'); }
const hasSlides = (b: any) => b.type === 'comparison' && b.items.some((i: any) => Array.isArray(i.content) && i.content.some((c: any) => c.type === 'slide-simulation'));

function slideAlt(block: any, ctx: Ctx): string {
  const items = block.items.map((item: any) => {
    const s = item.content[0];
    const d = s.data || {};
    let described = '';
    switch (s.variant) {
      case 'text-heavy': described = `A single slide titled “${escapeHtml(d.title)}” with ${d.items.length} bullet points: <ul>${d.items.map((x: string) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`; break;
      case 'structured-sequence': described = `Three slides: an introduction slide with the title “${escapeHtml(d.labels[0])}”, a summary slide with six icons and short placeholder bars, and a detail slide, “${escapeHtml(DETAIL_POINT)}” followed by “${DETAIL_SLIDE.replace(/<span[^>]*>(.*?)<\/span>/g, '$1').replace(/\.$/, '')}.”`; break;
      case 'small-graphic': described = `A slide titled “${escapeHtml(d.title)}” with a small two-box graphic (Point 1, Point 2) and the small paragraph: “${escapeHtml(d.items[0])}”`; break;
      case 'zoomed-graphic': described = 'A slide filled by an enlarged graphic of two circles, labelled Point 1 and Point 2, each with a subpoint, and no other text.'; break;
      case 'split-attention': described = `A slide titled “${escapeHtml(d.title)}” with ${d.items.length} bullet points on the left and a photograph on the right: <ul>${d.items.map((x: string) => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`; break;
      case 'immersive': described = `A slide whose photograph fills the whole slide, with a title panel reading “${escapeHtml(d.title)}” and the reference “${escapeHtml(d.labels[0])}”.`; break;
      default: throw new Error(`unknown slide variant ${s.variant}`);
    }
    return `<li><strong>${escapeHtml(item.title)}</strong> (${item.variant === 'positive' ? 'the better version' : 'the weaker version'}): ${described} <em>${escapeHtml(s.caption)}</em></li>`;
  }).join('');
  return alt(`${ctx.stepId}-text`, 'The weaker and the better version of the slide are shown side by side.', `<ul>${items}</ul>`);
}

function highlightSentence(a: ReturnType<typeof analyse>): string {
  const flagged = a.sentences.filter(s => s.status !== 'ok');
  if (!flagged.length) return 'No sentence is highlighted.';
  return flagged.map(s => `Sentence ${s.id + 1} (${s.count} words) is highlighted ${s.status === 'error' ? 'red' : 'orange'}.`).join(' ');
}
function interactive(block: any, ctx: Ctx): string {
  switch (block.component) {
    case 'dyslexia-simulator': {
      const intro = DYSLEXIA_INTRO_HTML.replace(/ Click the box to see the text clearly\./, '').replace(/<strong>(.*?)<\/strong>/g, '<strong>$1</strong>');
      drop('control sentence', ctx.sectionId, 'Click the box to see the text clearly.');
      drop('control label', ctx.sectionId, 'Click to reveal');
      embeds.push({ id: 'cramped-text-reveal', sectionId: ctx.sectionId, anchor: 'cramped-text-reveal-text', title: 'Cramped text and the same text made clear', caption: 'Select the box to switch between cramped and clear text.', height: { initial: 520, min: 320, max: 900 }, alternativeSource: 'components/interactive/DyslexiaSimulator.tsx' });
      return alt('cramped-text-reveal-text', intro.replace(/\.$/, '') + '.', `<p>The box first shows this paragraph cramped: small justified serif type, lines packed tightly, letters and words squeezed together and slightly blurred. Selecting the box shows the same paragraph in clear, spaced sans-serif type.</p>${sampleBlockquote}<p><strong>Seeing text like this increases:</strong></p><ul><li>Visual tiredness</li><li>Stress &amp; anxiety</li><li>Reluctance to read</li></ul>`);
    }
    case 'font-adjuster': {
      drop('control labels', ctx.sectionId, 'Decrease/Increase font size, Reset (buttons)');
      embeds.push({ id: 'font-spacing-adjuster', sectionId: ctx.sectionId, anchor: 'font-spacing-adjuster-text', title: 'The same paragraph at 12pt, 14pt and an adjustable size', caption: 'Make the last paragraph larger or smaller with the buttons.', height: { initial: 700, min: 400, max: 1400 }, alternativeSource: 'components/interactive/FontSpacingAdjuster.tsx' });
      return alt('font-spacing-adjuster-text', 'The same paragraph is shown three times with different type settings.', `${sampleBlockquote}<ul><li><strong>Text at 12pt / 1x spacing</strong> (Standard): ordinary size with tight line spacing.</li><li><strong>Text at 14pt / 1x spacing</strong> (Larger Font): larger type with the same tight line spacing.</li><li><strong>Optimal + Adjustable</strong>: starts at 20px with 1.5 line spacing; the reader can enlarge it up to 40px and reduce it to 14px in steps of 2px, and reset it to 20px.</li></ul>`);
    }
    case 'readability-checker': {
      const a = analyse(CHECKER_DEFAULT);
      drop('control labels', ctx.sectionId, 'Input Text, Clear, Analysis Results, placeholder text');
      embeds.push({ id: 'readability-checker', sectionId: ctx.sectionId, anchor: 'readability-checker-text', title: 'Readability Checker: sentence length in your own text', caption: 'Type or paste text to see its sentences measured.', height: { initial: 820, min: 520, max: 2000 }, alternativeSource: 'components/tools/ReadabilityChecker.tsx' });
      return alt('readability-checker-text', 'The checker splits a text into sentences, counts the words in each and reports three figures: the number of sentences, the total number of words and the average number of words per sentence (shown in amber when above 20, otherwise green).', `<p>Sentences of more than 20 words are highlighted orange; sentences of more than 35 words are highlighted red. Each sentence shows its word count on hover.</p><p>The checker opens with this sample text:</p><blockquote><p>${escapeHtml(CHECKER_DEFAULT)}</p></blockquote><p>For the sample the checker reports ${a.sentenceCount} sentences, ${a.totalWords} words and an average of ${a.avgWords} words per sentence. ${highlightSentence(a)}</p>`);
    }
    case 'checklist': {
      drop('control text', ctx.sectionId, 'Go through your document item by item. Add notes to give feedback or track changes. (and tick boxes, note buttons)');
      return `### ${mdEscape(CHECKLIST_HEADING)}\n\n` + CHECKLIST.map(c => `- ${mdEscape(c.label)}`).join('\n');
    }
    case 'link-to-section': return `[${mdEscape(block.data.text)}](#/${block.data.target})`;
    default: throw new Error(`unhandled interactive ${block.component}`);
  }
}

/** Block content inside a table cell: inline HTML (text and lists only), so the table stays one Markdown table. */
function cellHtml(list: any[]): string {
  return list.map(b => {
    if (b.type === 'text' && !b.variant) return rich(b.content, true);
    if (b.type === 'list' && b.variant !== 'ordered' && !b.columns) return `<ul>${b.items.map((it: any) => { if (typeof it.content !== 'string') throw new Error('nested block in cell list'); return `<li>${it.title ? `<strong>${escapeHtml(it.title)}</strong> ` : ''}${rich(it.content, true)}</li>`; }).join('')}</ul>`;
    throw new Error(`unsupported block in table cell: ${b.type}/${b.variant}`);
  }).join('<br>');
}
function blocks(list: any[], ctx: Ctx): string {
  return list.map(b => block(b, ctx)).filter(Boolean).join('\n\n');
}
const asMd = (c: any, ctx: Ctx) => (typeof c === 'string' ? rich(c) : blocks(c, ctx));
function block(b: any, ctx: Ctx): string {
  switch (b.type) {
    case 'text': {
      const t = rich(b.content);
      if (b.variant === 'heading-2') return `### ${t}`;
      if (b.variant === 'heading-3') return `#### ${t}`;
      if (b.variant === 'quote') return `> ${t}`;
      return t;
    }
    case 'list': {
      const ordered = b.variant === 'ordered';
      return b.items.map((it: any, i: number) => {
        const marker = ordered ? `${i + 1}. ` : '- ';
        const pad = ' '.repeat(marker.length);
        const body = asMd(it.content, ctx);
        if (it.title && (ordered || typeof it.content !== 'string')) return marker + indent(`**${mdEscape(it.title)}**\n\n${body}`.replace(/\n\n/g, '\n\n'), pad);
        return marker + indent(it.title ? `**${mdEscape(it.title)}** ${body}` : body, pad);
      }).join(ordered ? '\n' : '\n');
    }
    case 'callout': {
      const label = b.title || (b.variant === 'tip' ? 'Tip' : b.variant === 'warning' ? 'Important' : '');
      const inner = (label ? `**${mdEscape(label)}**\n\n` : '') + asMd(b.content, ctx);
      return inner.split('\n').map(l => (l ? `> ${l}` : '>')).join('\n');
    }
    case 'comparison': {
      if (hasSlides(b)) { const html = slideAlt(b, ctx); const e = slideEmbed(ctx); embeds.push(e); return html; }
      return b.items.map((it: any) => `${it.title ? `**${mdEscape(it.title)}**\n\n` : ''}${asMd(it.content, ctx)}`).join('\n\n');
    }
    case 'image': return `![${mdEscape(b.alt)}](${b.src})${b.label ? `\n\n**${mdEscape(b.label)}**` : ''}${b.caption ? `\n\n*${rich(b.caption)}*` : ''}`;
    case 'stat-grid': return b.items.map((s: any) => `- **${mdEscape(s.value)}** ${mdEscape(s.label)}${s.description ? `. ${mdEscape(s.description)}` : ''}`).join('\n');
    case 'table': {
      const cell = (c: any) => (typeof c === 'string' ? rich(c) : cellHtml(c)).replace(/\|/g, '\\|');
      return [`| ${b.headers.map((h: string) => mdEscape(h)).join(' | ')} |`, `| ${b.headers.map(() => '---').join(' | ')} |`, ...b.rows.map((r: any) => `| ${r.cells.map(cell).join(' | ')} |`)].join('\n');
    }
    case 'slide-simulation': throw new Error('slide simulation outside a comparison');
    case 'interactive': return interactive(b, ctx);
    default: throw new Error(`unknown block type ${b.type}`);
  }
}
function slideEmbed(ctx: Ctx): EmbedRecord {
  const meta: Record<string, [string, string, string]> = {
    'one-bullet': ['slides-one-bullet', 'One crowded slide against an introduction, summary and detail sequence', 'Compare a crowded slide with the same content split across slides.'],
    'remove-text': ['slides-extraneous-text', 'A small graphic with a paragraph against the same graphic enlarged', 'Compare a small graphic and small text with the graphic filling the slide.'],
    zooming: ['slides-zooming-images', 'A photograph beside text against a full-slide photograph', 'Compare split attention with an image that sets the context.']
  };
  const [id, title, caption] = meta[ctx.stepId!];
  return { id, sectionId: ctx.sectionId, anchor: `${ctx.stepId}-text`, title, caption, height: { initial: 640, min: 320, max: 1400 }, alternativeSource: 'components/interactive/SlideSimulation.tsx' };
}

// ---- sections ----
const types = await load('types.ts');
const nav: { title: string; items: { id: string; title: string; description: string }[] }[] = types.NAV_GROUPS;
const dataModules: Record<string, [string, string]> = {
  'five-principles': ['fivePrinciplesData', 'data/content/fivePrinciplesData.tsx'], 'how-people-read': ['howPeopleReadData', 'data/content/howPeopleReadData.tsx'],
  'cognitive-load': ['cognitiveLoadData', 'data/content/cognitiveLoadData.tsx'], '10-simple-things-docs': ['tenSimpleThingsDocsData', 'data/content/tenSimpleThingsDocsData.tsx'],
  '10-simple-things-ppt': ['tenSimpleThingsPptData', 'data/content/tenSimpleThingsPptData.tsx'], 'formatting-examples': ['formattingExamplesData', 'data/content/formattingExamplesData.tsx'],
  'slide-formatting-examples': ['slideFormattingExamplesData', 'data/content/slideFormattingExamplesData.tsx'], '3-steps-simple': ['threeStepsSimpleData', 'data/content/threeStepsSimpleData.tsx'],
  examples: ['examplesSimplifiedData', 'data/content/examplesSimplifiedData.tsx'], acronyms: ['jargonAcronymsData', 'data/content/jargonAcronymsData.tsx'],
  accessibility: ['accessibilityData', 'data/content/accessibilityData.tsx'], evidence: ['evidenceData', 'data/content/evidenceData.tsx']
};
const sections: any[] = [];
for (const group of nav) for (const item of group.items) {
  const ctx: Ctx = { sectionId: item.id };
  let md: string; let leaves: any = null;
  if (dataModules[item.id]) {
    const [name, file] = dataModules[item.id];
    const config = (await load(file))[name];
    if (typeof config.intro === 'object' && !Array.isArray(config.intro) && config.intro) throw new Error(`intro of ${item.id} is a React node`);
    const parts = [`# ${mdEscape(config.title)}`];
    if (config.intro?.length) parts.push(blocks(config.intro, ctx));
    for (const step of config.steps) {
      if (!step.blocks) throw new Error(`step ${step.id} of ${item.id} has legacy React content`);
      parts.push(`## ${mdEscape(step.title)}`, blocks(step.blocks, { sectionId: item.id, stepId: step.id }));
    }
    md = parts.filter(Boolean).join('\n\n'); leaves = config;
  } else if (item.id === 'readability-tool') {
    const intro = between(read('components/sections/ReadabilityToolSection.tsx'), 'leading-relaxed">\n        ', '\n      </p>').trim();
    md = `# ${item.title}\n\n${intro}\n\n${interactive({ component: 'readability-checker' }, ctx)}`;
  } else if (item.id === 'checklist') {
    const intro = between(read('components/sections/ChecklistSection.tsx'), 'leading-relaxed">\n        ', '\n      </p>').trim();
    md = `# Simple Language Checklist\n\n${intro}\n\n${CHECKLIST.map(c => `- ${mdEscape(c.label)}`).join('\n')}`;
    drop('control text', item.id, 'Go through your document item by item. Add notes to give feedback or track changes.');
  } else throw new Error(`no source for ${item.id}`);
  sections.push({ id: item.id, title: item.title, category: group.title, description: item.description, format: 'markdown', content: md + '\n' });
}
const home = read('components/Home.tsx');
writeFileSync(resolve(outDir, 'readability-sections.json'), JSON.stringify({ groups: nav.map(g => ({ title: g.title, ids: g.items.map(i => i.id) })), sections, embeds, accounting, checkerDefault: CHECKER_DEFAULT, analysisJs, sample: SAMPLE, homeSource: home }, null, 1));
console.log('sections', sections.length, 'embeds', embeds.map(e => e.id).join(','), 'dropped', accounting.length);
