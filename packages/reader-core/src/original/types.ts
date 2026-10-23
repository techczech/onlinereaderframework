import type { ReactNode } from 'react';
import type { PublicationEpubOptions } from '../services/publication-epub/index.js';

export type PublicationContentFormat = 'markdown' | 'html';
export type FontSize = 'sm' | 'base' | 'lg' | 'xl';
export type LineHeight = 'tight' | 'normal' | 'relaxed' | 'loose';
export type MaxWidth = 'sm' | 'md' | 'lg' | 'full';

export interface PublicationSection {
  /** Unique within the book; `home` is reserved for the reader home page. */
  id: string;
  title: string;
  category: string;
  content: string;
  format?: PublicationContentFormat;
  children?: PublicationSection[];
  defaultExpanded?: boolean;
}

export interface PublicationBook {
  /** Stable identifier used to namespace all saved reader data. */
  id: string;
  title: string;
  author: string;
  subtitle?: string;
  description: string;
  sections: PublicationSection[];
  downloads?: { label: string; href: string }[];
  sourceUrl?: string;
  language?: string;
  home?: {
    badge?: string;
    overviewTitle?: string;
    overviewDescription?: string;
    authorNote?: string;
    features?: { title: string; description: string; icon?: string }[];
    license?: { label: string; href: string; imageUrl?: string };
  };
}

/** Optional host-owned extension. The reader contains no AI client or network service. */
export interface PublicationCoaching {
  label?: string;
  render: (context: { book: PublicationBook; section?: PublicationSection; onClose: () => void }) => ReactNode;
}

export interface PublicationReaderProps {
  book: PublicationBook;
  coaching?: PublicationCoaching;
  /** Supply image bytes for self-contained export; false disables generated EPUB. */
  epub?: PublicationEpubOptions | false;
}

export interface Highlight {
  id: string;
  text: string;
  sectionId: string;
  sectionTitle: string;
  author?: string;
  date: number;
  note?: string;
}

export interface Reflection {
  id: string;
  sectionId: string;
  sectionTitle: string;
  content: string;
  date: number;
}
