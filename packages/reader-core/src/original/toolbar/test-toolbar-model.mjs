import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('./toolbar-model.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const m = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const defaults = { fontFamily: 'serif', fontSize: 20, lineHeight: 1.7, paragraphSpacing: 16, letterSpacing: 0, maxWidth: 'md' };

test('steppers stay inside the saved-preference bounds without float drift', () => {
  assert.equal(m.stepValue('fontSize', 28, 1), 28);
  assert.equal(m.stepValue('fontSize', 16, -1), 16);
  assert.equal(m.stepValue('lineHeight', 1.7, 1), 1.8);
  assert.equal(m.stepValue('lineHeight', 2.3, 1), 2.4);
  assert.equal(m.stepValue('letterSpacing', 0.1, 1), 0.12);
  assert.equal(m.stepValue('paragraphSpacing', 39, 1), 40);
  assert.ok(m.atLimit('letterSpacing', 0, -1) && !m.atLimit('letterSpacing', 0, 1));
});
test('dimming levels map to saved values; older in-between values are reported as custom', () => {
  assert.deepEqual(m.DIM_LEVELS.map(level => level.value), [0.72, 0.9, 1], 'light .72, medium .9, dark 1');
  assert.equal(m.dimLevel(0.72).label, 'Light');
  assert.equal(m.dimLevel(0.9).label, 'Medium');
  assert.equal(m.dimLevel(1).label, 'Dark');
  assert.equal(m.dimLevel(0.4), null);
  assert.equal(m.dimLevel(0.5), null, 'an older saved Light is a custom value now');
});
test('changed-setting counts drive Reset and the Assist active state, never a number on a button', () => {
  assert.equal(m.formattingChanges(defaults, defaults), 0);
  assert.equal(m.formattingChanges({ ...defaults, fontSize: 22, maxWidth: 'lg' }, defaults), 2);
  assert.equal(m.formattingChanges({ ...defaults, lineHeight: 1.7000001 }, defaults), 0);
  assert.equal(m.assistChanges({ overlay: 'off', immersive: false }), 0);
  assert.equal(m.assistChanges({ overlay: 'ruler', immersive: true }), 1, 'hidden navigation is the default while an assistance is on, so it is not a second change');
  assert.equal(m.assistChanges({ overlay: 'off', immersive: true }), 1, 'a reader who hid navigation by hand with nothing else on has one change');
});
test('assist summary states what is actually on', () => {
  assert.equal(m.assistSummary({ overlay: 'off', immersive: false, lines: 3 }), 'Nothing is on.');
  assert.equal(m.assistSummary({ overlay: 'line-window', immersive: true, lines: 1 }), 'On: one-line window, navigation hidden.');
  assert.equal(m.assistSummary({ overlay: 'paragraph', immersive: false, lines: 3 }), 'On: other paragraphs faded.');
  assert.match(m.assistSummary({ overlay: 'ruler', immersive: false, lines: 3 }), /reading ruler/);
  assert.deepEqual(m.ASSIST_CHOICES.map(choice => choice.label), ['Off', 'Paragraph', 'Line window', 'Ruler']);
  assert.equal(m.assistName('off'), null);
  assert.equal(m.assistName('line-window'), 'Line window');
});
test('letter spacing reads Normal at zero', () => {
  assert.equal(m.letterSpacingLabel(0), 'Normal');
  assert.equal(m.letterSpacingLabel(0.04), '0.04 em');
});
test('Notes is offered on the front page as on a chapter page; only read-aloud depends on being in a chapter', () => {
  const toolbar = readFileSync(new URL('./ReaderToolbar.tsx', import.meta.url), 'utf8');
  const notes = toolbar.match(/(\{[^{}]*&&\s*)?<button[^>]*publication-toolbar-notes[^>]*>/);
  assert.ok(notes, 'a Notes control exists');
  assert.ok(!notes[1], 'Notes is not conditional on the page');
  assert.match(toolbar, /disabled=\{props\.isHome \|\| !readAloud\?\.available\}/);
});

test('no numeric badge on Formatting or Assist, and Reset formatting leads the Formatting menu', () => {
  const toolbar = readFileSync(new URL('./ReaderToolbar.tsx', import.meta.url), 'utf8');
  assert.ok(!/publication-toolbar-badge/.test(toolbar), 'no count bubble');
  assert.ok(!/changed`/.test(toolbar), 'the accessible name carries no count');
  const formatting = toolbar.slice(toolbar.indexOf("open === 'formatting'"), toolbar.indexOf("open === 'assist'"));
  assert.ok(formatting.indexOf('Reset formatting') > 0 && formatting.indexOf('Reset formatting') < formatting.indexOf('menu-typeface'), 'Reset sits before the first setting');
});
test('theme is its own small icon control and is not in Formatting', () => {
  const toolbar = readFileSync(new URL('./ReaderToolbar.tsx', import.meta.url), 'utf8');
  const formatting = toolbar.slice(toolbar.indexOf("open === 'formatting'"), toolbar.indexOf("open === 'assist'"));
  assert.ok(!/Theme|Book paper|isDark|onDark/.test(formatting), 'no theme control in Formatting');
  assert.match(toolbar, /publication-toolbar-theme/);
  // Icon only: no visible text node in the five toolbar controls.
  const controls = toolbar.slice(toolbar.indexOf('{MENUS.map'), toolbar.indexOf("{open === 'theme'"));
  assert.ok(!/<span aria-hidden="true">/.test(controls), 'no label span beside the icons');
  assert.equal((controls.match(/data-tooltip=/g) ?? []).length, 3, 'tooltips for the menus, Notes and Theme');
});
test('toolbar dim levels equal the preference levels', () => {
  const prefs = readFileSync(new URL('../reading-support/reading-preferences.ts', import.meta.url), 'utf8');
  const levels = text => [...text.matchAll(/value: (0\.\d+)/g)].map(match => match[1]).slice(0, 3).join();
  assert.equal(levels(prefs), levels(source));
});
