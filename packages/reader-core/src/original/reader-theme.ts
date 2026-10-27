/** The reader's colour theme: follow the computer by default, or an explicit Light or Dark kept per book. Pure rules; the live system query is in use-system-dark.ts. */
export type ThemeChoice = 'system' | 'light' | 'dark';
export const THEME_CHOICES: readonly { value: ThemeChoice; label: string; icon: string }[] = [
  { value: 'system', label: 'Follow computer', icon: 'brightness_auto' },
  { value: 'light', label: 'Light', icon: 'light_mode' },
  { value: 'dark', label: 'Dark', icon: 'dark_mode' },
];
export const isThemeChoice = (value: unknown): value is ThemeChoice => value === 'system' || value === 'light' || value === 'dark';
export const resolveDark = (choice: ThemeChoice, systemDark: boolean): boolean => choice === 'dark' || (choice === 'system' && systemDark);

/** First theme for a book that has no saved theme choice.
 * The old reader saved a dark-mode boolean on every visit, starting from the computer's setting, so a stored value never says whether the reader chose it.
 * A value equal to the computer's setting now is therefore not claimed as a choice and follows the computer. A value that differs can only be a choice
 * (or the computer's setting changing since the first visit; the reader can pick Follow computer), so it is kept as Light or Dark. No stored value follows the computer.
 */
export function initialThemeChoice(legacyDark: unknown, systemDark: boolean): ThemeChoice {
  if (typeof legacyDark !== 'boolean' || legacyDark === systemDark) return 'system';
  return legacyDark ? 'dark' : 'light';
}

/** Name for the toolbar tooltip and accessible name: the choice, and for Follow computer what it follows now. */
export function themeDescription(choice: ThemeChoice, systemDark: boolean): string {
  return choice === 'system' ? `Follow computer (now ${systemDark ? 'dark' : 'light'})` : choice === 'dark' ? 'Dark' : 'Light';
}
export const themeIcon = (choice: ThemeChoice): string => THEME_CHOICES.find(item => item.value === choice)!.icon;
