/** Adapted from ReadFlex reading-preferences.ts (inspected 2026-10-24).
 * Per-book identity, guarded writes and the online reader's bounds are local changes.
 * Theme remains owned by the parent reader. No content is persisted here.
 */
/** WriteFlex's lead style, minus bold (see anchored-reading.ts). Anything unknown falls back to 'contrast', as in WriteFlex's normaliseLeadStyle. */
export type LeadStyle = 'contrast' | 'colour';
export const normaliseLeadStyle = (value: unknown): LeadStyle => value === 'colour' ? 'colour' : 'contrast';
export interface ReadingSupportPreferences {
  fontFamily: 'serif' | 'sans';
  fontSize: number;
  lineHeight: number;
  paragraphSpacing: number;
  letterSpacing: number;
  /** Derived mirror of `overlay === 'paragraph'`, kept so older callers that read or patch `focus` still work. `overlay` is the one stored choice. */
  focus: 'off' | 'paragraph';
  /** One exclusive reading-assist choice: fade other paragraphs, a line window, or a ruler under the current line. */
  overlay: 'off' | 'paragraph' | 'line-window' | 'ruler';
  lines: 1 | 3 | 5;
  /** How many visual lines beneath the current one the ruler covers. */
  rulerLines: 1 | 2 | 3;
  /** Strength of the overlay shade: one of DIM_LEVELS, or a custom value in range. */
  dim: number;
  /** 3 = dim uses the levels below. Absent in first-release settings, whose three named presets are migrated once; 2 values are kept as saved. */
  dimVersion: 3;
  /** Anchored reading from WriteFlex: the first letters of each word are emphasised. Independent of the overlay (it is typography, the overlay is geometry). */
  anchored: boolean;
  /** How the emphasis shows (WriteFlex's lead style): contrast against softer text, or the accent colour. */
  leadStyle: LeadStyle;
  /** True once the reader has chosen a text size, so the width-dependent default no longer applies. */
  fontSizeChosen: boolean;
}
/** Overlay dimming: light .72, medium .9, dark 1 (fully opaque). The reader asked for darker than WriteFlex's .5/.72/.9, so each name moved up one step. */
export const DIM_LEVELS = [{ label: 'Light', value: 0.72 }, { label: 'Medium', value: 0.9 }, { label: 'Dark', value: 1 }] as const;
/** The three named presets of the first release (no dimVersion); a saved value equal to one of these was a Light, Medium or Dark choice and keeps its name. */
const FIRST_RELEASE_DIM_PRESETS: readonly (readonly [number, number])[] = [[0.2, 0.72], [0.35, 0.9], [0.5, 1]];
export const DEFAULT_READING_PREFERENCES: Readonly<ReadingSupportPreferences> = Object.freeze({
  fontFamily: 'serif', fontSize: 20, lineHeight: 1.7, paragraphSpacing: 16,
  letterSpacing: 0, focus: 'off', overlay: 'off', lines: 3, rulerLines: 1, dim: 0.9, dimVersion: 3, anchored: false, leadStyle: 'contrast', fontSizeChosen: false,
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
  const dim = bounded(value, 0.1, 1, DEFAULT_READING_PREFERENCES.dim);
  if (version === 2 || version === 3) return dim;
  // First-release settings: only the three exact presets are a named choice and keep their name; any other value is kept as it was.
  // Version 2 values are numbers the reader saw as shades, so they are not renamed: a saved .72 is now Light and a saved .9 is Medium.
  return FIRST_RELEASE_DIM_PRESETS.find(([old]) => Math.abs(old - dim) < 0.001)?.[1] ?? dim;
}
const OVERLAYS = ['off', 'paragraph', 'line-window', 'ruler'] as const;
/** The stored overlay. Settings that predate the unified choice kept paragraph focus in its own field: it becomes the overlay only when no overlay was active, so an active overlay wins. */
function normaliseOverlay(overlay: unknown, focus: unknown): ReadingSupportPreferences['overlay'] {
  const chosen = typeof overlay === 'string' && (OVERLAYS as readonly string[]).includes(overlay) ? overlay as ReadingSupportPreferences['overlay'] : 'off';
  return chosen === 'off' && focus === 'paragraph' ? 'paragraph' : chosen;
}
export function normaliseReadingPreferences(value: unknown): ReadingSupportPreferences {
  const v = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
  const d = DEFAULT_READING_PREFERENCES;
  const overlay = normaliseOverlay(v.overlay, v.focus);
  return {
    fontFamily: v.fontFamily === 'sans' ? 'sans' : 'serif',
    fontSize: bounded(v.fontSize, 16, 28, d.fontSize),
    lineHeight: bounded(v.lineHeight, 1.2, 2.4, d.lineHeight),
    paragraphSpacing: bounded(v.paragraphSpacing, 0, 40, d.paragraphSpacing),
    letterSpacing: bounded(v.letterSpacing, 0, 0.12, d.letterSpacing),
    // A single enum makes the exclusion between paragraph focus, line window and ruler structural.
    focus: overlay === 'paragraph' ? 'paragraph' : 'off', overlay,
    lines: normaliseLineFocusSize(v.lines), rulerLines: normaliseRulerLines(v.rulerLines),
    dim: normaliseDim(v.dim, v.dimVersion), dimVersion: 3,
    anchored: v.anchored === true, leadStyle: normaliseLeadStyle(v.leadStyle),
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
