import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('./toolbar-model.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const m = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const defaults = { dark: false, fontFamily: 'serif', fontSize: 20, lineHeight: 1.7, paragraphSpacing: 16, letterSpacing: 0, maxWidth: 'md' };

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
  assert.deepEqual(m.DIM_LEVELS.map(level => level.value), [0.2, 0.35, 0.5]);
  assert.equal(m.dimLevel(0.35).label, 'Medium');
  assert.equal(m.dimLevel(0.4), null);
});
test('badges count only what differs from the book defaults', () => {
  assert.equal(m.formattingChanges(defaults, defaults), 0);
  assert.equal(m.formattingChanges({ ...defaults, fontSize: 22, dark: true, maxWidth: 'lg' }, defaults), 3);
  assert.equal(m.formattingChanges({ ...defaults, lineHeight: 1.7000001 }, defaults), 0);
  assert.equal(m.assistChanges({ focus: 'off', overlay: 'off', immersive: false }), 0);
  assert.equal(m.assistChanges({ focus: 'paragraph', overlay: 'ruler', immersive: true }), 3);
});
test('assist summary states what is actually on', () => {
  assert.equal(m.assistSummary({ focus: 'off', overlay: 'off', immersive: false, lines: 3 }), 'Nothing is on.');
  assert.equal(m.assistSummary({ focus: 'paragraph', overlay: 'line-window', immersive: true, lines: 1 }), 'On: other paragraphs faded, one-line window, navigation hidden.');
  assert.match(m.assistSummary({ focus: 'off', overlay: 'ruler', immersive: false, lines: 3 }), /reading ruler/);
});
test('letter spacing reads Normal at zero', () => {
  assert.equal(m.letterSpacingLabel(0), 'Normal');
  assert.equal(m.letterSpacingLabel(0.04), '0.04 em');
});
