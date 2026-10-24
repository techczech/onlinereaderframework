import type { PublicationSection } from './types.js';

/** A section is a reading page unless it is an empty structural group (topic) with children. */
export function isReadableSection(section: PublicationSection): boolean {
  return !!section.content.trim() || !(section.children?.length);
}

/** Ancestors of `id`, outermost first; empty when `id` is a root or unknown. */
export function sectionAncestors(sections: PublicationSection[], id: string, trail: PublicationSection[] = []): PublicationSection[] {
  for (const section of sections) {
    if (section.id === id) return trail;
    const found = sectionAncestors(section.children ?? [], id, [...trail, section]);
    if (found.length) return found;
  }
  return [];
}

/** Levels in the book's own section tree, where top-level sections are depth 1. */
export function sectionTreeDepth(sections: PublicationSection[]): number {
  return sections.reduce((deepest, section) => Math.max(deepest, 1 + sectionTreeDepth(section.children ?? [])), 0);
}

/** An explicit `navigation.sidebarDepth` wins; otherwise the sidebar shows every level of the tree. */
export function sidebarDepth(sections: PublicationSection[], explicit?: number): number {
  return explicit === undefined || Number.isNaN(explicit) ? sectionTreeDepth(sections) : explicit;
}

/** Nearest readable neighbours in book order, skipping empty topic groups. */
export function readableNeighbours(flat: PublicationSection[], currentId: string) {
  const index = flat.findIndex(section => section.id === currentId);
  if (index < 0) return { prev: null, next: null };
  return {
    prev: flat.slice(0, index).reverse().find(isReadableSection) ?? null,
    next: flat.slice(index + 1).find(isReadableSection) ?? null,
  };
}

/** Progress counts chapters with text, never empty groups or the app guide. */
export function chapterProgress(flat: PublicationSection[], read: ReadonlySet<string>) {
  const chapters = flat.filter(section => section.category !== 'App Guide' && section.content.trim());
  return { read: chapters.filter(section => read.has(section.id)).length, total: chapters.length };
}

/** Manual toggles win; otherwise the current page's ancestors (or itself) are open. */
export function sidebarExpanded(section: PublicationSection, onCurrentPath: boolean, manual: Readonly<Record<string, boolean>>): boolean {
  return manual[section.id] ?? (onCurrentPath || !!section.defaultExpanded);
}

/** Arriving inside a topic reopens it even if the reader had closed it; topics the reader opened stay open. */
export function dropClosedOnPath(manual: Readonly<Record<string, boolean>>, path: readonly string[]): Record<string, boolean> {
  const next: Record<string, boolean> = {};
  for (const [id, open] of Object.entries(manual)) if (open || !path.includes(id)) next[id] = open;
  return next;
}
