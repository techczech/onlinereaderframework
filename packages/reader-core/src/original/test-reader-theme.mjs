import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('./reader-theme.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const t = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);

test('theme follows the computer by default; Light and Dark are explicit', () => {
  assert.deepEqual(t.THEME_CHOICES.map(choice => choice.value), ['system', 'light', 'dark']);
  assert.equal(t.resolveDark('system', true), true);
  assert.equal(t.resolveDark('system', false), false);
  assert.equal(t.resolveDark('light', true), false, 'an explicit Light ignores a dark computer');
  assert.equal(t.resolveDark('dark', false), true);
  assert.ok(t.isThemeChoice('system') && !t.isThemeChoice('auto') && !t.isThemeChoice(true) && !t.isThemeChoice(null));
});
test('legacy dark-mode boolean: no record follows the computer; a value equal to the computer is not claimed as a choice; a differing one is kept', () => {
  assert.equal(t.initialThemeChoice(null, true), 'system');
  assert.equal(t.initialThemeChoice(undefined, false), 'system');
  assert.equal(t.initialThemeChoice('dark', false), 'system', 'a malformed value is ignored');
  assert.equal(t.initialThemeChoice(false, false), 'system', 'the old default false is not an explicit Light');
  assert.equal(t.initialThemeChoice(true, true), 'system');
  assert.equal(t.initialThemeChoice(true, false), 'dark', 'dark on a light computer was chosen');
  assert.equal(t.initialThemeChoice(false, true), 'light', 'light on a dark computer was chosen');
});
test('tooltip text states the choice and what Follow computer means now', () => {
  assert.equal(t.themeDescription('system', true), 'Follow computer (now dark)');
  assert.equal(t.themeDescription('system', false), 'Follow computer (now light)');
  assert.equal(t.themeDescription('light', true), 'Light');
  assert.equal(t.themeDescription('dark', false), 'Dark');
  assert.deepEqual(['system', 'light', 'dark'].map(t.themeIcon), ['brightness_auto', 'light_mode', 'dark_mode']);
});
