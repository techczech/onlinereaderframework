import type { PublicationBook, PublicationSection } from '../types.js';
import { flattenPublicationSections, publicationDisplayTitle } from '../publication-model.js';
import { chapterProgress, isReadableSection } from '../sidebar-model.js';

/** Contents with 40 or fewer listed entries open in full; longer books open on their groups. */
export const FULL_CONTENTS_AUTO_LIMIT = 40;

export interface FrontPageEntry {
  section: PublicationSection;
  /** 0 for a group's direct entries, one more for each deeper tree level. */
  depth: number;
  /** False for an empty structural heading, which is shown but cannot be opened. */
  readable: boolean;
}

export interface FrontPageGroup {
  key: string;
  title: string;
  /** branch: a tree node with children; category: display-only label over a flat run of sections; single: one entry with no group above it. */
  kind: 'branch' | 'category' | 'single';
  /** The group's own page, present only when the tree node has text. */
  section?: PublicationSection;
  /** Entries shown when the group is open; for a single group, the one entry. */
  entries: FrontPageEntry[];
  /** Readable pages the group lists, its own page included. */
  count: number;
  /** False for groups holding only the app guide, which are not numbered as content. */
  numbered: boolean;
}

export interface FrontPageContents {
  groups: FrontPageGroup[];
  /** Readable pages listed across all groups. */
  total: number;
  /** True when Full contents shows anything beyond Contents. */
  hasDepth: boolean;
}

function homeDepth(book: PublicationBook): number {
  const depth = book.navigation?.homeDepth ?? 2;
  return Number.isNaN(depth) ? Infinity : Math.max(0, Math.floor(depth));
}

function descendants(sections: PublicationSection[], depth: number, level = 0): FrontPageEntry[] {
  if (depth <= 0) return [];
  return sections.flatMap(section => [
    { section, depth: level, readable: isReadableSection(section) },
    ...descendants(section.children ?? [], depth - 1, level + 1),
  ]);
}

/** The nearest readable pages below structural headings, whatever their depth. Reading pages are not entered, so their own children stay under the cap. */
function liftedReadable(sections: PublicationSection[]): FrontPageEntry[] {
  return sections.flatMap(section => isReadableSection(section) ? [{ section, depth: 0, readable: true }] : liftedReadable(section.children ?? []));
}

const guideOnly = (entries: FrontPageEntry[]) => entries.length > 0 && entries.every(entry => entry.section.category === 'App Guide');
const readableCount = (entries: FrontPageEntry[]) => entries.filter(entry => entry.readable).length;

/**
 * The home contents as the reader would list them. Source order and ids are preserved.
 * Tree books group by their top-level sections. Flat books group runs of equal `category` for display only;
 * those headings are not sections and cannot be opened. `navigation.homeDepth` caps the levels shown, counting
 * category headings of a flat book as the first level; zero hides everything. A structural topic without its own page is never dropped
 * for lying below the cap: it lists the nearest readable pages under it instead.
 */
export function frontPageContents(book: PublicationBook): FrontPageContents {
  const depth = homeDepth(book);
  const empty = { groups: [], total: 0, hasDepth: false };
  if (depth === 0) return empty;
  const nested = book.sections.some(section => section.children?.length);
  const groups: FrontPageGroup[] = [];
  const single = (section: PublicationSection): FrontPageGroup => {
    const entries = [{ section, depth: 0, readable: isReadableSection(section) }];
    return { key: section.id, title: section.title, kind: 'single', entries, count: readableCount(entries), numbered: !guideOnly(entries) };
  };
  if (nested) {
    for (const root of book.sections) {
      if (!root.children?.length) { groups.push(single(root)); continue; }
      const own = root.content.trim() ? root : undefined;
      let entries = descendants(root.children, depth - 1);
      // The cap limits nesting; a structural topic with no page of its own must still list the pages it holds, or it would be an empty level.
      if (!own && !readableCount(entries)) entries = liftedReadable(root.children);
      const count = readableCount(entries) + (own ? 1 : 0);
      if (!count) continue;
      groups.push({ key: root.id, title: root.title, kind: 'branch', section: own, entries, count, numbered: true });
    }
  } else {
    let run: PublicationSection[] = [];
    const flush = () => {
      if (!run.length) return;
      const [first] = run;
      if (depth < 2 || (run.length === 1 && first.category === first.title)) run.forEach(section => groups.push(single(section)));
      else {
        const entries = run.map(section => ({ section, depth: 0, readable: isReadableSection(section) }));
        groups.push({ key: `category:${groups.length}:${first.category}`, title: first.category, kind: 'category', entries, count: readableCount(entries), numbered: !guideOnly(entries) });
      }
      run = [];
    };
    for (const section of book.sections) {
      if (run.length && run[0].category !== section.category) flush();
      run.push(section);
    }
    flush();
  }
  return { groups, total: groups.reduce((sum, group) => sum + group.count, 0), hasDepth: groups.some(group => group.kind !== 'single') };
}

/** Full contents opens first when the whole list is short; a long reference book opens on its groups. */
export function defaultFullContents(contents: FrontPageContents): boolean {
  return contents.total <= FULL_CONTENTS_AUTO_LIMIT;
}

export interface FrontPageMatch { entry: FrontPageEntry; context?: string }

/** Title matches across every listed level, in book order, including entries inside closed groups. Group headings that are pages match too. */
export function frontPageMatches(contents: FrontPageContents, query: string): FrontPageMatch[] {
  const text = query.trim().toLocaleLowerCase();
  if (!text) return [];
  const matches: FrontPageMatch[] = [];
  for (const group of contents.groups) {
    const context = group.kind === 'single' ? undefined : group.title;
    if (group.section && isReadableSection(group.section) && group.section.title.toLocaleLowerCase().includes(text)) {
      matches.push({ entry: { section: group.section, depth: 0, readable: true }, context });
    }
    for (const entry of group.entries) if (entry.readable && entry.section.title.toLocaleLowerCase().includes(text)) matches.push({ entry, context });
  }
  return matches;
}

export interface FrontPageTargets {
  /** First reading page in book order, as the classic Start button opens it. */
  start?: PublicationSection;
  /** The last page the reader opened, only when it still exists and can be read. */
  resume?: PublicationSection;
}

/** The app guide is not where a reader resumes from. */
export function frontPageTargets(book: PublicationBook, lastSectionId?: string | null): FrontPageTargets {
  const flat = flattenPublicationSections(book.sections);
  const last = lastSectionId ? flat.find(section => section.id === lastSectionId) : undefined;
  return {
    start: flat.find(isReadableSection),
    resume: last && isReadableSection(last) && last.category !== 'App Guide' ? last : undefined,
  };
}

/** Chapters read of the book's chapters, using the same count as the sidebar. Null until something has been read. */
export function frontPageProgress(book: PublicationBook, read: ReadonlySet<string>) {
  const progress = chapterProgress(flattenPublicationSections(book.sections), read);
  return progress.read > 0 ? progress : null;
}

export interface FrontPageTitle {
  /** The full title as the reader joins it elsewhere. */
  full: string;
  title: string;
  /** Present when the subtitle is a short continuation of the title (a split title) and shown inline after it. */
  continuation?: string;
  /** Present when the subtitle is a separate line. */
  subtitle?: string;
}

/** Splits the established display title for layout only: a short subtitle that simply follows the title is a continuation, anything longer is a subtitle line. */
export function frontPageTitle(book: PublicationBook): FrontPageTitle {
  const full = publicationDisplayTitle(book);
  const title = book.title.trim();
  const subtitle = book.subtitle?.trim();
  if (!subtitle || !title) return { full, title: full };
  if (full === `${title} ${subtitle}` && subtitle.split(/\s+/).length <= 3) return { full, title, continuation: subtitle };
  return { full, title, subtitle };
}
