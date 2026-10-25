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
  /** How many visual lines beneath the current one the ruler covers. */
  rulerLines: 1 | 2 | 3;
  /** Strength of the overlay shade: one of DIM_LEVELS, or a custom value in range. */
  dim: number;
  /** 2 = dim uses the WriteFlex levels below. Absent in older saved settings, whose three presets are migrated once. */
  dimVersion: 2;
  /** True once the reader has chosen a text size, so the width-dependent default no longer applies. */
  fontSizeChosen: boolean;
}
/** WriteFlex line-overlay dimming: light .5, medium .72, dark .9 (app.css .wf-lo-dim). */
export const DIM_LEVELS = [{ label: 'Light', value: 0.5 }, { label: 'Medium', value: 0.72 }, { label: 'Dark', value: 0.9 }] as const;
/** The three presets of the first release; saved values equal to one of these were a Light, Medium or Dark choice. */
const LEGACY_DIM_PRESETS: readonly (readonly [number, number])[] = [[0.2, 0.5], [0.35, 0.72], [0.5, 0.9]];
export const DEFAULT_READING_PREFERENCES: Readonly<ReadingSupportPreferences> = Object.freeze({
  fontFamily: 'serif', fontSize: 20, lineHeight: 1.7, paragraphSpacing: 16,
  letterSpacing: 0, focus: 'off', overlay: 'off', lines: 3, rulerLines: 1, dim: 0.72, dimVersion: 2, fontSizeChosen: false,
});
/** Copied from WriteFlex editor/line-overlay.ts; no CodeMirror imports required. */
export function normaliseLineFocusSize(value: unknown): 1 | 3 | 5 {
  const n = Number(value);
  return n === 1 || n === 5 ? n : 3;
}
function bounded(value: unknown, min: number, max: number, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback;
}
export function normaliseRulerLines(value: unknown): 1 | 2 | 3 {
  const n = Number(value);
  return n === 2 || n === 3 ? n : 1;
}
function normaliseDim(value: unknown, version: unknown): number {
  const dim = bounded(value, 0.1, 0.95, DEFAULT_READING_PREFERENCES.dim);
  if (version === 2) return dim;
  // Older settings: only the three exact presets are a named choice; any other value is kept as it was.
  return LEGACY_DIM_PRESETS.find(([old]) => Math.abs(old - dim) < 0.001)?.[1] ?? dim;
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
    lines: normaliseLineFocusSize(v.lines), rulerLines: normaliseRulerLines(v.rulerLines),
    dim: normaliseDim(v.dim, v.dimVersion), dimVersion: 2,
    // Saved before this flag existed: a size other than the old default was certainly chosen.
    fontSizeChosen: typeof v.fontSizeChosen === 'boolean' ? v.fontSizeChosen : bounded(v.fontSize, 16, 28, d.fontSize) !== d.fontSize,
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

/** The text size in use. A reader's own choice always wins; otherwise the default eases down on narrower windows so the page is not oversized. */
export function effectiveFontSize(preferences: Pick<ReadingSupportPreferences, 'fontSize' | 'fontSizeChosen'>, viewportWidth: number): number {
  if (preferences.fontSizeChosen) return preferences.fontSize;
  return viewportWidth >= 1440 ? preferences.fontSize : viewportWidth >= 1100 ? Math.min(preferences.fontSize, 19) : Math.min(preferences.fontSize, 18);
}
