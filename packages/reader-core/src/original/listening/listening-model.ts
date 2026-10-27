import type { PublicationAudioAlignment } from './listening-types.js';

export const LISTENING_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2, 2.5, 3] as const;
export function validListeningSpeed(value: unknown): number {
  return typeof value === 'number' && LISTENING_SPEEDS.some(speed => speed === value) ? value : 1;
}

/** No browser globals: relative paths are checked against a fixed HTTP origin. */
export function safeRecordingSource(value: unknown): string | null {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f\\]/u.test(value)) return null;
  const src = value.trim();
  if (!src) return null;
  try {
    return ['http:', 'https:', 'blob:'].includes(new URL(src, 'https://recording.invalid/').protocol) ? src : null;
  } catch { return null; }
}

/** Reject the whole alignment rather than silently repairing or estimating a span. */
export function validRecordingAlignment(value: unknown): readonly PublicationAudioAlignment[] {
  if (!Array.isArray(value)) return [];
  let previousTime = 0, previousChar = 0;
  const points: PublicationAudioAlignment[] = [];
  for (const point of value) {
    if (!point || !Number.isFinite(point.start) || !Number.isFinite(point.end)
      || point.start < previousTime || point.end <= point.start
      || !Number.isSafeInteger(point.charStart) || !Number.isSafeInteger(point.charEnd)
      || point.charStart < previousChar || point.charEnd <= point.charStart) return [];
    points.push({ start: point.start, end: point.end, charStart: point.charStart, charEnd: point.charEnd });
    previousTime = point.end; previousChar = point.charEnd;
  }
  return points;
}

export function listeningStorageKey(bookId: string): string {
  return `publication-recorded-listening:v1:${encodeURIComponent(bookId)}`;
}
export interface ListeningStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}
export interface SavedListening {
  version: 1;
  sectionId: string;
  speed: number;
  positions: Record<string, { src: string; time: number }>;
}
export function emptySavedListening(): SavedListening {
  return { version: 1, sectionId: '', speed: 1, positions: Object.create(null) };
}
export function readSavedListening(raw: string | null): SavedListening {
  const result = emptySavedListening();
  try {
    const value = JSON.parse(raw ?? 'null');
    if (!value || Array.isArray(value) || value.version !== 1) return result;
    result.sectionId = typeof value.sectionId === 'string' ? value.sectionId : '';
    result.speed = validListeningSpeed(value.speed);
    if (value.positions && typeof value.positions === 'object' && !Array.isArray(value.positions)) {
      for (const [id, entry] of Object.entries(value.positions)) {
        const point = entry as { src?: unknown; time?: unknown } | null;
        const src = safeRecordingSource(point?.src);
        if (src && typeof point?.time === 'number' && Number.isFinite(point.time) && point.time >= 0 && point.time <= Number.MAX_SAFE_INTEGER) {
          result.positions[id] = { src, time: point.time };
        }
      }
    }
  } catch { /* Corrupt storage restores defaults without breaking playback. */ }
  return result;
}

export function listeningTime(seconds: number): string {
  const whole = Number.isFinite(seconds) && seconds >= 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor(whole / 60) % 60;
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`
    : `${minutes}:${String(whole % 60).padStart(2, '0')}`;
}
