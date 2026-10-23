import { MarkdownParseOptions, parseMarkdownToSections } from '../utils/markdownParser.js';
import { SectionConfig } from '../types.js';

export function parseMarkdown(markdown: string, options: MarkdownParseOptions = {}): SectionConfig[] {
  return parseMarkdownToSections(markdown, options);
}

export function normalizeSections(sections: SectionConfig[]): SectionConfig[] {
  return sections.map((section, index) => ({
    ...section,
    order: section.order ?? index + 1
  }));
}
