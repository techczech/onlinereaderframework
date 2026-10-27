import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-color-scheme: dark)';
const query = (): MediaQueryList | null => { try { return typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(QUERY) : null; } catch { return null; } };
const subscribe = (listener: () => void): (() => void) => {
  const list = query();
  list?.addEventListener?.('change', listener);
  return () => list?.removeEventListener?.('change', listener);
};
/** Whether the computer is set to dark, kept current while the page is open. The server (and the first hydration pass) report light. */
export function useSystemDark(): boolean {
  return useSyncExternalStore(subscribe, () => query()?.matches ?? false, () => false);
}
/** The same answer read once, for a first value outside rendering. */
export const systemDarkNow = (): boolean => query()?.matches ?? false;
