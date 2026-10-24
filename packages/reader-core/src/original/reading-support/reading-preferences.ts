/** Adapted from ReadFlex reading-preferences.ts (inspected 2026-10-24).
 * Per-book identity, guarded writes and the online reader's bounds are local changes.
 * Theme remains owned by the parent reader. No content is persisted here.
 */
export interface ReadingSupportPreferences {
  fontFamily: 'serif' | 'sans';
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  letterSpacing: number;
  focus: 'off' | 'paragraph';
  overlay: 'off' | 'line-window' | 'ruler';
  lines: 1 | 3 | 5;
  dim: number;
}
export const DEFAULT_READING_PREFERENCES: Readonly<ReadingSupportPreferences> = Object.freeze({
  fontFamily: 'serif', fontSize: 20, lineHeight: 1.7, paragraphSpacing: 16,
  letterSpacing: 0, focus: 'off', overlay: 'off', lines: 3, dim: 0.35,
});
/** Copied from WriteFlex editor/line-overlay.ts; no CodeMirror imports required. */
export function normaliseLineFocusSize(value: unknown): 1 | 3 | 5 {
  const n = Number(value);
  return n === 1 || n === 5 ? n : 3;
}
function bounded(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}
export function normaliseReadingPreferences(value: unknown): ReadingSupportPreferences {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const d = DEFAULT_READING_PREFERENCES;
  return {
    fontFamily: v.fontFamily === 'sans' ? 'sans' : 'serif',
    fontSize: bounded(v.fontSize, 16, 28, d.fontSize),
    lineHeight: bounded(v.lineHeight, 1.2, 2.4, d.lineHeight),
    paragraphSpacing: bounded(v.paragraphSpacing, 0, 40, d.paragraphSpacing),
    letterSpacing: bounded(v.letterSpacing, 0, 0.12, d.letterSpacing),
    focus: v.focus === 'paragraph' ? 'paragraph' : 'off',
    // A single enum makes WriteFlex's line/ruler exclusion structural.
    overlay: v.overlay === 'line-window' || v.overlay === 'ruler' ? v.overlay : 'off',
    lines: normaliseLineFocusSize(v.lines), dim: bounded(v.dim, 0.1, 0.6, d.dim),
  };
}
export const readingSupportStorageKey = (bookId: string): string => `publication-reader:${encodeURIComponent(bookId)}:reading-support:v1`;
export type ReadingSupportStorage = Pick<Storage, 'getItem' | 'setItem'>;
export function readReadingPreferences(bookId: string, storage: Pick<ReadingSupportStorage, 'getItem'>): ReadingSupportPreferences {
  try { return normaliseReadingPreferences(JSON.parse(storage.getItem(readingSupportStorageKey(bookId)) ?? 'null')); }
  catch { return { ...DEFAULT_READING_PREFERENCES }; }
}
export function writeReadingPreferences(bookId: string, preferences: ReadingSupportPreferences, storage: Pick<ReadingSupportStorage, 'setItem'>): boolean {
  try { storage.setItem(readingSupportStorageKey(bookId), JSON.stringify(normaliseReadingPreferences(preferences))); return true; }
  catch { return false; }
}
