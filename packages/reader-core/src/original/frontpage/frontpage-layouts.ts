/** The six approved front-page layouts. Keys are stable configuration values; labels are for documentation and host choosers. */
export const FRONT_PAGE_LAYOUTS = [
  { key: 'sol-jacket', label: 'Jacket', summary: 'Cover and title page across the top, contents underneath.' },
  { key: 'sol-reading-desk', label: 'Reading desk', summary: 'Compact masthead, a tinted start or continue panel beside the contents.' },
  { key: 'sol-open-contents', label: 'Open contents', summary: 'Narrow book column beside a wide, searchable contents list.' },
  { key: 'opus-title-contents', label: 'Title beside contents', summary: 'Title page on the left, kept in view, with the contents on the right.' },
  { key: 'opus-search-map', label: 'Search and topic map', summary: 'Short masthead, a large search field and each group as a tile.' },
  { key: 'opus-colour-band', label: 'Colour band', summary: 'A band in the book colour with the cover overlapping it, then numbered contents rows.' },
] as const;

export type FrontPageLayoutKey = (typeof FRONT_PAGE_LAYOUTS)[number]['key'];

const keys: ReadonlySet<string> = new Set(FRONT_PAGE_LAYOUTS.map(layout => layout.key));

/** A valid layout key, or undefined for anything else (omitted, misspelt, wrong type). Undefined selects the classic home page. */
export function frontPageLayoutKey(value: unknown): FrontPageLayoutKey | undefined {
  return typeof value === 'string' && keys.has(value) ? value as FrontPageLayoutKey : undefined;
}
