import { Highlight, SectionConfig } from '../types';

export function exportHighlightsToMarkdown(highlights: Highlight[], sections: SectionConfig[]) {
  const sectionsById = new Map(sections.map((section) => [section.id, section.title]));

  const grouped = highlights.reduce<Record<string, Highlight[]>>((acc, highlight) => {
    acc[highlight.sectionId] = acc[highlight.sectionId] || [];
    acc[highlight.sectionId].push(highlight);
    return acc;
  }, {});

  const lines: string[] = ['# Highlights', ''];

  Object.keys(grouped).forEach((sectionId) => {
    const sectionTitle = sectionsById.get(sectionId) || sectionId;
    lines.push(`## ${sectionTitle}`);
    grouped[sectionId]
      .sort((a, b) => b.date - a.date)
      .forEach((item) => {
        lines.push(`- ${item.text}`);
      });
    lines.push('');
  });

  const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'highlights.md';
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
