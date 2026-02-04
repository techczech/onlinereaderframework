import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMarkdown } from '../../packages/reader-core/src/index';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function renderBlocks(sections: ReturnType<typeof parseMarkdown>) {
  const lines: string[] = [];
  sections.forEach((section) => {
    lines.push(`# ${section.title}`);
    section.blocks.forEach((block) => {
      if (block.type === 'text') {
        if (block.variant === 'heading' || block.variant === 'subheading') {
          lines.push(`## ${block.content}`);
        } else {
          lines.push(block.content || '');
        }
      }
      if (block.type === 'list') {
        block.items.forEach((item) => lines.push(`- ${item}`));
      }
      if (block.type === 'callout') {
        if (block.title) lines.push(`**${block.title}**`);
        lines.push(block.content || '');
      }
      if (block.type === 'code') {
        lines.push('```');
        lines.push(block.content || '');
        lines.push('```');
      }
    });
    lines.push('');
  });
  return lines.join('\n');
}

function renderToc(sections: ReturnType<typeof parseMarkdown>) {
  const tocLines: string[] = ['## Contents'];
  sections.forEach((section) => {
    tocLines.push(`- ${section.title}`);
  });
  return tocLines.join('\n');
}

async function main() {
  const markdownPath = path.resolve(__dirname, '../src/defaultMarkdown.md');
  const markdown = await fs.readFile(markdownPath, 'utf-8');
  const sections = parseMarkdown(markdown, { sectionHeadingLevel: 'auto', fallbackTitle: 'Reader Framework' });
  const content = [
    '# Reader Framework',
    '',
    'A reader-first framework for teaching materials and guides.',
    '',
    renderToc(sections),
    '',
    '## Source',
    '- Generated from defaultMarkdown.md',
    '',
    '## Content',
    renderBlocks(sections)
  ].join('\n');

  const target = path.resolve(__dirname, '../public/llms.txt');
  await fs.writeFile(target, content, 'utf-8');
  console.log(`Wrote ${target}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
