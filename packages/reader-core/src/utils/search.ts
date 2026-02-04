import { SectionConfig, SearchIndexEntry } from '../types';

export function buildSearchIndex(sections: SectionConfig[]): SearchIndexEntry[] {
  return sections.map((section) => {
    const excerpt = section.blocks
      .map((block) => {
        if (block.type === 'text') return block.content;
        if (block.type === 'list') return block.items.join(' ');
        if (block.type === 'callout') return `${block.title || ''} ${block.content}`.trim();
        return '';
      })
      .join(' ')
      .slice(0, 240);

    return {
      id: section.id,
      title: section.title,
      excerpt
    };
  });
}

export function searchIndex(index: SearchIndexEntry[], query: string): SearchIndexEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return index.filter((entry) => {
    return (
      entry.title.toLowerCase().includes(q) ||
      entry.excerpt.toLowerCase().includes(q) ||
      (entry.keywords || []).some((kw) => kw.toLowerCase().includes(q))
    );
  });
}
