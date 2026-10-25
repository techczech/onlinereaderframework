import type { ReactNode } from 'react';
import type { PublicationEpubOptions } from '../services/publication-epub/index.js';
import type { FrontPageLayoutKey } from './frontpage/frontpage-layouts.js';

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
  labels?: { search?: string; tableOfContents?: string; readingSettings?: string; listen?: string; contents?: string; fullContents?: string };
  navigation?: {
    /** Number of visible tree levels, including roots. Default: 2. Zero hides the list. */
    homeDepth?: number;
    /** Maximum sidebar tree levels. Omit to allow every level. */
    sidebarDepth?: number;
    showHomeContents?: boolean;
  };
  appearance?: {
    /** CSS colour values, validated as colours and scoped to this reader. */
    accent?: string;
    paper?: string;
    ink?: string;
    masthead?: 'editorial' | 'practical' | 'literary';
    cover?: { src: string; alt: string };
    /** Front-page layout for this book. Omitted or unrecognised values keep the classic home page. */
    frontPageLayout?: FrontPageLayoutKey;
  };
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

/** Where the book's generated agent files are served (see agent-export). The reader links to them; it never calls an AI service itself. */
export interface PublicationAgentAccess {
  /** Folder of generated files, relative to the page or an absolute address. Default `agent/`. */
  path?: string;
}

export interface PublicationReaderProps {
  book: PublicationBook;
  coaching?: PublicationCoaching;
  audio?: readonly import('./listening/listening-types.js').PublicationAudioTrack[];
  /** Supply image bytes for self-contained export; false disables generated EPUB. */
  epub?: PublicationEpubOptions | false;
  /** Show "Ask an agent to help you read this" and link the generated agent files. Off unless the host generated them. */
  agent?: PublicationAgentAccess | false;
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
