/** Whether the side outline ("On this page") is folded away, kept per book on this device.
 * The choice is only a view preference: no chapter text, location or note is stored or changed.
 * Where browser storage is blocked the choice still lasts for the visit (module memory).
 */
export const outlineStorageKey = (bookId: string): string => `publication-reader:${encodeURIComponent(bookId)}:outline:v1`;
export type OutlineStorage = Pick<Storage, 'getItem' | 'setItem'>;

const visit = new Map<string, boolean>();

export function readOutlineCollapsed(bookId: string, storage?: Pick<OutlineStorage, 'getItem'> | null): boolean {
  const remembered = visit.get(bookId);
  if (remembered !== undefined) return remembered;
  try { return storage?.getItem(outlineStorageKey(bookId)) === 'collapsed'; } catch { return false; }
}

/** Returns false when the choice could not be saved on the device; it still holds for this visit. */
export function writeOutlineCollapsed(bookId: string, collapsed: boolean, storage?: Pick<OutlineStorage, 'setItem'> | null): boolean {
  visit.set(bookId, collapsed);
  try { storage?.setItem(outlineStorageKey(bookId), collapsed ? 'collapsed' : 'open'); return !!storage; } catch { return false; }
}

/** Test seam: forget what this visit remembered. */
export function forgetOutlineVisit(): void { visit.clear(); }

export function browserStorage(): Storage | null {
  try { return typeof window === 'undefined' ? null : window.localStorage; } catch { return null; }
}
