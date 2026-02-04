import { SectionConfig } from '../types';

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function renderBlocks(sections: SectionConfig[]) {
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

function renderToc(sections: SectionConfig[]) {
  const tocLines: string[] = ['## Contents'];
  sections.forEach((section) => {
    tocLines.push(`- ${section.title}`);
  });
  return tocLines.join('\n');
}

export function buildLlmsText(sections: SectionConfig[], title = 'Reader Framework') {
  return [
    `# ${title}`,
    '',
    'A reader-first framework for teaching materials and guides.',
    '',
    renderToc(sections),
    '',
    '## Content',
    renderBlocks(sections)
  ].join('\n');
}

export function downloadLlmsTxt(sections: SectionConfig[], title = 'Reader Framework') {
  const content = buildLlmsText(sections, title);
  const blob = new Blob([content], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugify(title)}.llms.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
