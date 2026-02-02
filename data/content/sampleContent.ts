import readme from '../../README.md?raw';
import { SectionConfig } from '../../types';
import { parseMarkdownToSections } from '../../utils/markdownParser';

export const SAMPLE_CONTENT: SectionConfig[] = parseMarkdownToSections(readme, {
  sectionHeadingLevel: 'auto',
  fallbackTitle: 'Reader Framework'
});
