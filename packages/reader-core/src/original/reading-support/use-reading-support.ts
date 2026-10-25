import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_READING_PREFERENCES, normaliseReadingPreferences, readReadingPreferences, readingSupportStorageKey, writeReadingPreferences, type ReadingSupportPreferences } from './reading-preferences.js';
export interface ReadingSupportController {
  preferences: Readonly<ReadingSupportPreferences>;
  update(patch: Partial<ReadingSupportPreferences>): void;
  reset(): void;
  storageStatus: 'saved' | 'unavailable';
}
type Snapshot = { preferences: ReadingSupportPreferences; storageStatus: 'saved' | 'unavailable' };
const cache = new Map<string, Snapshot>();
const listeners = new Map<string, Set<() => void>>();
const serverSnapshot: Snapshot = { preferences: { ...DEFAULT_READING_PREFERENCES }, storageStatus: 'saved' };
function snapshot(bookId: string): Snapshot {
  let value = cache.get(bookId);
  if (!value) {
    try { value = { preferences: readReadingPreferences(bookId, window.localStorage), storageStatus: 'saved' }; }
    catch { value = { preferences: { ...DEFAULT_READING_PREFERENCES }, storageStatus: 'unavailable' }; }
    cache.set(bookId, value);
  }
  return value;
}
function notify(bookId: string): void { listeners.get(bookId)?.forEach(listener => listener()); }
/** Call independently in the toolbar and content: instances share live state by book. */
export function useReadingSupport(bookId: string): ReadingSupportController {
  const subscribe = useCallback((listener: () => void) => {
    const group = listeners.get(bookId) ?? new Set();
    group.add(listener); listeners.set(bookId, group);
    const onStorage = (event: StorageEvent): void => {
      if (event.key === null || event.key === readingSupportStorageKey(bookId)) { cache.delete(bookId); notify(bookId); }
    };
    window.addEventListener('storage', onStorage);
    return () => { group.delete(listener); if (!group.size) listeners.delete(bookId); window.removeEventListener('storage', onStorage); };
  }, [bookId]);
  const current = useSyncExternalStore(subscribe, useCallback(() => snapshot(bookId), [bookId]), () => serverSnapshot);
  const set = useCallback((preferences: ReadingSupportPreferences) => {
    let saved = false;
    try { saved = writeReadingPreferences(bookId, preferences, window.localStorage); } catch { /* Blocked storage still permits in-memory settings. */ }
    cache.set(bookId, { preferences, storageStatus: saved ? 'saved' : 'unavailable' }); notify(bookId);
  }, [bookId]);
  return {
    ...current,
    // Choosing a text size ends the width-dependent default; a patch that says otherwise (Reset) wins.
    update: patch => set(normaliseReadingPreferences({ ...snapshot(bookId).preferences, ...('fontSize' in patch && !('fontSizeChosen' in patch) ? { fontSizeChosen: true } : {}), ...patch })),
    reset: () => set({ ...DEFAULT_READING_PREFERENCES }),
  };
}
