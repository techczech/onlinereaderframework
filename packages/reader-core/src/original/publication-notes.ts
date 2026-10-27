import type { Highlight, Reflection } from './types.js';

/** Original grouped Markdown export, now including section reflections and book identity. */
export function publicationNotesMarkdown(title: string, highlights: Highlight[], reflections: Reflection[]): string {
  const grouped = new Map<string, { highlights: Highlight[]; reflections: Reflection[] }>();
  for (const item of [...highlights, ...reflections]) {
    if (!grouped.has(item.sectionId)) grouped.set(item.sectionId, { highlights: [], reflections: [] });
    const group = grouped.get(item.sectionId)!;
    if ('text' in item) group.highlights.push(item);
    else group.reflections.push(item);
  }
  let markdown = `# My ${title} Notes & Highlights\n\n`;
  for (const group of grouped.values()) {
    markdown += `## ${group.highlights[0]?.sectionTitle ?? group.reflections[0].sectionTitle}\n\n`;
    for (const highlight of group.highlights) {
      markdown += `> ${highlight.text.replace(/\n/g, '\n> ')}\n>\n> — ${highlight.author ?? ''}, *${highlight.sectionTitle}*\n\n`;
      if (highlight.note?.trim()) markdown += `**Note:**\n${highlight.note.trim()}\n\n`;
    }
    for (const reflection of group.reflections) markdown += `### Reflection\n\n${reflection.content}\n\n`;
    markdown += '---\n\n';
  }
  return markdown;
}

export function exportPublicationNotes(id: string, title: string, highlights: Highlight[], reflections: Reflection[]): void {
  const url = URL.createObjectURL(new Blob([publicationNotesMarkdown(title, highlights, reflections)], { type: 'text/markdown;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${id.replace(/[^a-z0-9-]/gi, '-')}-notes.md`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
