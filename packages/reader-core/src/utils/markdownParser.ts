import { SectionConfig } from '../types';

type Block = SectionConfig['blocks'][number];

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface MarkdownParseOptions {
  sectionHeadingLevel?: HeadingLevel | 'auto';
  fallbackTitle?: string;
}

function countHeadings(lines: string[]) {
  const counts: Record<HeadingLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
  for (const rawLine of lines) {
    const match = rawLine.trim().match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      counts[match[1].length as HeadingLevel] += 1;
    }
  }
  return counts;
}

function resolveSectionLevel(lines: string[], option: MarkdownParseOptions['sectionHeadingLevel']): HeadingLevel {
  if (option && option !== 'auto') return option;
  const counts = countHeadings(lines);
  if (counts[1] > 1) return 1;
  if (counts[2] > 0) return 2;
  return 1;
}

export function parseMarkdownToSections(markdown: string, options: MarkdownParseOptions = {}): SectionConfig[] {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  const sectionLevel = resolveSectionLevel(lines, options.sectionHeadingLevel || 'auto');
  const fallbackTitle = options.fallbackTitle || 'Imported Guide';

  const sections: SectionConfig[] = [];
  let currentSection: SectionConfig | null = null;
  let paragraphBuffer: string[] = [];
  let listBuffer: { type: 'bullet' | 'ordered'; items: string[] } | null = null;
  let blockIndex = 0;
  let foundH1Title: string | null = null;
  let inCodeBlock = false;
  let codeLanguage: string | undefined;
  let codeBuffer: string[] = [];

  const flushParagraph = () => {
    if (!currentSection || paragraphBuffer.length === 0) return;
    const content = paragraphBuffer.join(' ').trim();
    if (content) {
      currentSection.blocks.push({
        id: `p-${blockIndex++}`,
        type: 'text',
        variant: 'paragraph',
        content
      });
    }
    paragraphBuffer = [];
  };

  const flushList = () => {
    if (!currentSection || !listBuffer) return;
    currentSection.blocks.push({
      id: `list-${blockIndex++}`,
      type: 'list',
      variant: listBuffer.type,
      items: listBuffer.items
    });
    listBuffer = null;
  };

  const flushCode = () => {
    if (!currentSection || codeBuffer.length === 0) return;
    currentSection.blocks.push({
      id: `code-${blockIndex++}`,
      type: 'code',
      language: codeLanguage,
      content: codeBuffer.join('\n')
    });
    codeBuffer = [];
    codeLanguage = undefined;
  };

  const ensureSection = (title: string, level: HeadingLevel = sectionLevel) => {
    const sectionId = slugify(title) || `section-${sections.length + 1}`;
    currentSection = {
      id: sectionId,
      title,
      order: sections.length + 1,
      blocks: [],
      level
    };
    sections.push(currentSection);
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    const codeFenceMatch = line.match(/^```(\w+)?$/);
    if (codeFenceMatch) {
      flushParagraph();
      flushList();
      if (inCodeBlock) {
        inCodeBlock = false;
        flushCode();
      } else {
        inCodeBlock = true;
        codeLanguage = codeFenceMatch[1];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(rawLine.replace(/\r$/, ''));
      continue;
    }

    if (line === '') {
      flushParagraph();
      flushList();
      continue;
    }

    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) {
      flushParagraph();
      flushList();
      if (!currentSection) {
        ensureSection(foundH1Title || fallbackTitle, sectionLevel);
      }
      const section: SectionConfig | undefined = currentSection ?? sections[sections.length - 1];
      if (!section) {
        continue;
      }
      currentSection = section;
      section.blocks.push({
        id: `hr-${blockIndex++}`,
        type: 'hr'
      });
      continue;
    }

    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length as HeadingLevel;
      const text = headingMatch[2].trim();

      if (level === 1 && !foundH1Title) {
        foundH1Title = text;
      }

      if (level === sectionLevel) {
        ensureSection(text, level);
        continue;
      }

      if (!currentSection) {
        ensureSection(foundH1Title || fallbackTitle, sectionLevel);
      }
      const section = currentSection;
      if (!section) {
        continue;
      }

      const relativeLevel = level - sectionLevel;
      const variant = relativeLevel <= 1 ? 'heading' : 'subheading';
      section.blocks.push({
        id: `h-${slugify(text) || blockIndex++}`,
        type: 'text',
        variant,
        content: text,
        level
      });
      continue;
    }

    const orderedMatch = line.match(/^\d+\.\s+(.+)$/);
    if (orderedMatch) {
      flushParagraph();
      if (!listBuffer || listBuffer.type !== 'ordered') {
        flushList();
        listBuffer = { type: 'ordered', items: [] };
      }
      listBuffer.items.push(orderedMatch[1].trim());
      continue;
    }

    const bulletMatch = line.match(/^[-*+]\s+(.+)$/);
    if (bulletMatch) {
      flushParagraph();
      if (!listBuffer || listBuffer.type !== 'bullet') {
        flushList();
        listBuffer = { type: 'bullet', items: [] };
      }
      listBuffer.items.push(bulletMatch[1].trim());
      continue;
    }

    if (!currentSection) {
      ensureSection(foundH1Title || fallbackTitle, sectionLevel);
    }
    paragraphBuffer.push(line);
  }

  flushParagraph();
  flushList();
  flushCode();

  if (sections.length === 0) {
    ensureSection(foundH1Title || fallbackTitle, sectionLevel);
  }

  return sections;
}

export function parseMarkdownToSection(markdown: string, fallbackTitle = 'Imported Guide'): SectionConfig {
  return parseMarkdownToSections(markdown, { fallbackTitle })[0];
}
