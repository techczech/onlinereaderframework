/** Pure rules for the reader toolbar controls: steps, dimming levels and "changed from default" counts. Theme has its own small control and is not part of Formatting. */
export type MaxWidthChoice = 'sm' | 'md' | 'lg' | 'full';
/** Widths in the toolbar, with the text width each gives where the window has room (default type size): about 500, 590, 725 px and the full column. */
export const WIDTH_CHOICES: readonly { value: MaxWidthChoice; label: string }[] = [{ value: 'sm', label: 'Narrow' }, { value: 'md', label: 'Normal' }, { value: 'lg', label: 'Wide' }, { value: 'full', label: 'Full' }];
export type ToolbarMenuId = 'listen' | 'formatting' | 'assist' | 'theme';

export interface FormattingState {
  fontFamily: 'serif' | 'sans'; fontSize: number; lineHeight: number;
  paragraphSpacing: number; letterSpacing: number; maxWidth: MaxWidthChoice;
}
/** One exclusive assistance choice. `immersive` is whether navigation is hidden, which is on by default while an assistance is. */
export interface AssistState { overlay: 'off' | 'paragraph' | 'line-window' | 'ruler'; immersive: boolean; }

/** Overlay dimming. Kept equal to DIM_LEVELS in reading-preferences.ts; the toolbar model test checks it. */
export const DIM_LEVELS = [{ label: 'Light', value: 0.72 }, { label: 'Medium', value: 0.9 }, { label: 'Dark', value: 1 }] as const;
export const ASSIST_CHOICES = [{ value: 'off', label: 'Off', icon: 'block' }, { value: 'paragraph', label: 'Paragraph', icon: 'view_headline' }, { value: 'line-window', label: 'Line window', icon: 'crop_landscape' }, { value: 'ruler', label: 'Ruler', icon: 'straighten' }] as const;
export const SIZE_LIMITS = { fontSize: [16, 28, 1], lineHeight: [1.2, 2.4, 0.1], paragraphSpacing: [0, 40, 2], letterSpacing: [0, 0.12, 0.02] } as const;

/** Move a stepper value one step inside its bounds, without floating-point drift. */
export function stepValue(key: keyof typeof SIZE_LIMITS, value: number, direction: 1 | -1): number {
  const [min, max, step] = SIZE_LIMITS[key];
  const next = Math.round((value + direction * step) * 1000) / 1000;
  return Math.min(max, Math.max(min, next));
}
export const atLimit = (key: keyof typeof SIZE_LIMITS, value: number, direction: 1 | -1): boolean => stepValue(key, value, direction) === value;

/** The dimming level that matches a stored value exactly, or null when an older saved value sits between levels. */
export function dimLevel(value: number): (typeof DIM_LEVELS)[number] | null {
  return DIM_LEVELS.find(level => Math.abs(level.value - value) < 0.001) ?? null;
}

export function formattingChanges(current: FormattingState, defaults: FormattingState): number {
  return (Object.keys(defaults) as (keyof FormattingState)[]).filter(key => {
    const a = current[key], b = defaults[key];
    return typeof a === 'number' && typeof b === 'number' ? Math.abs(a - b) > 0.0001 : a !== b;
  }).length;
}
/** Line height and dimming only matter while an assistance is on, so they are not counted as separate changes. Hiding navigation counts only when it is the reader's own choice with nothing else on:
 * with an assistance on it is the default, and the assistance is the one change. */
export function assistChanges(state: AssistState): number {
  return state.overlay !== 'off' ? 1 : Number(state.immersive);
}

export const letterSpacingLabel = (value: number): string => value < 0.005 ? 'Normal' : `${value.toFixed(2)} em`;
export const lineHeightLabel = (value: number): string => value.toFixed(1);

/** Plain statement of what is currently on, for the Assist menu. */
export function assistSummary(state: AssistState & { lines: number; rulerLines?: number }): string {
  const parts: string[] = [];
  if (state.overlay === 'paragraph') parts.push('other paragraphs faded');
  if (state.overlay === 'line-window') parts.push(`${state.lines === 1 ? 'one-line' : `${state.lines}-line`} window`);
  if (state.overlay === 'ruler') parts.push(`reading ruler over the next ${state.rulerLines === 2 ? 'two lines' : state.rulerLines === 3 ? 'three lines' : 'line'}`);
  if (state.immersive) parts.push('navigation hidden');
  return parts.length ? `On: ${parts.join(', ')}.` : 'Nothing is on.';
}
/** Name of the current assistance for the Assist icon's tooltip and accessible name; null when none is on. */
export const assistName = (overlay: AssistState['overlay']): string | null => overlay === 'off' ? null : ASSIST_CHOICES.find(choice => choice.value === overlay)!.label;
