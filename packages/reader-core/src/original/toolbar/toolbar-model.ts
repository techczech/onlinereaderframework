/** Pure rules for the four reader toolbar controls: steps, dimming levels and "changed from default" counts. */
export type MaxWidthChoice = 'sm' | 'md' | 'lg' | 'full';
export type ToolbarMenuId = 'listen' | 'formatting' | 'assist';

export interface FormattingState {
  dark: boolean; fontFamily: 'serif' | 'sans'; fontSize: number; lineHeight: number;
  paragraphSpacing: number; letterSpacing: number; maxWidth: MaxWidthChoice;
}
export interface AssistState { focus: 'off' | 'paragraph'; overlay: 'off' | 'line-window' | 'ruler'; immersive: boolean; }

export const DIM_LEVELS = [{ label: 'Light', value: 0.2 }, { label: 'Medium', value: 0.35 }, { label: 'Dark', value: 0.5 }] as const;
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
/** Line height and dimming only matter while an overlay is on, so they are not counted as separate changes. */
export function assistChanges(state: AssistState): number {
  return Number(state.focus !== 'off') + Number(state.overlay !== 'off') + Number(state.immersive);
}

export const letterSpacingLabel = (value: number): string => value < 0.005 ? 'Normal' : `${value.toFixed(2)} em`;
export const lineHeightLabel = (value: number): string => value.toFixed(1);

/** Plain statement of what is currently on, for the Assist menu. */
export function assistSummary(state: AssistState & { lines: number }): string {
  const parts: string[] = [];
  if (state.focus === 'paragraph') parts.push('other paragraphs faded');
  if (state.overlay === 'line-window') parts.push(`${state.lines === 1 ? 'one-line' : `${state.lines}-line`} window`);
  if (state.overlay === 'ruler') parts.push('reading ruler');
  if (state.immersive) parts.push('navigation hidden');
  return parts.length ? `On: ${parts.join(', ')}.` : 'Nothing is on.';
}
