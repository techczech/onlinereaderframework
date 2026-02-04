export type SectionId = string;

export type BlockType =
  | 'text'
  | 'list'
  | 'callout'
  | 'code'
  | 'hr'
  | 'comparison'
  | 'image'
  | 'table'
  | 'stat-grid'
  | 'interactive'
  | 'slide-simulation';

export interface BlockBase {
  id: string;
  type: BlockType;
}

export interface TextBlock extends BlockBase {
  type: 'text';
  variant: 'heading' | 'subheading' | 'paragraph' | 'quote';
  content: string;
  level?: number;
}

export interface ListBlock extends BlockBase {
  type: 'list';
  variant: 'bullet' | 'ordered' | 'checklist' | 'grid';
  items: string[];
}

export interface CalloutBlock extends BlockBase {
  type: 'callout';
  tone: 'tip' | 'warning' | 'example' | 'note';
  title?: string;
  content: string;
}

export interface CodeBlock extends BlockBase {
  type: 'code';
  language?: string;
  content: string;
}

export interface HrBlock extends BlockBase {
  type: 'hr';
}

export type Block = TextBlock | ListBlock | CalloutBlock | CodeBlock | HrBlock;

export interface SectionConfig {
  id: SectionId;
  title: string;
  summary?: string;
  category?: string;
  order: number;
  blocks: Block[];
  tags?: string[];
  level?: number;
}

export interface SearchIndexEntry {
  id: SectionId;
  title: string;
  excerpt: string;
  keywords?: string[];
}

export interface Highlight {
  id: string;
  sectionId: SectionId;
  text: string;
  date: number;
}
