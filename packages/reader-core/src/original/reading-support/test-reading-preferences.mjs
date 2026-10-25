import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const source = readFileSync(new URL('./reading-preferences.ts', import.meta.url), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext } }).outputText;
const p = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
test('hostile storage and invalid ranges return safe preferences', () => {
  for (const value of [null, [], 'bad', 42, {fontSize: Infinity, lineHeight: 0, paragraphSpacing: -1, letterSpacing: 2, overlay: 'both'}]) {
    assert.deepEqual(p.normaliseReadingPreferences(value), p.DEFAULT_READING_PREFERENCES);
  }
  const denied = { getItem() { throw Error('denied'); }, setItem() { throw Error('full'); } };
  assert.deepEqual(p.readReadingPreferences('a', denied), p.DEFAULT_READING_PREFERENCES);
  assert.equal(p.writeReadingPreferences('a', p.DEFAULT_READING_PREFERENCES, denied), false);
});
test('per-book round trip and reset values remain bounded', () => {
  const items = new Map();
  const storage = { getItem: k => items.get(k) ?? null, setItem: (k,v) => items.set(k,v) };
  const prefs = p.normaliseReadingPreferences({fontFamily:'sans', fontSize:28, lineHeight:2.4, paragraphSpacing:40, letterSpacing:0.12, overlay:'ruler', lines:5, rulerLines:3, dim:0.9, dimVersion:3, fontSizeChosen:true});
  assert.equal(p.writeReadingPreferences('book:a', prefs, storage), true);
  assert.deepEqual(p.readReadingPreferences('book:a', storage), prefs);
  assert.deepEqual(p.readReadingPreferences('book:b', storage), p.DEFAULT_READING_PREFERENCES);
  storage.setItem(p.readingSupportStorageKey('book:a'), '{bad');
  assert.deepEqual(p.readReadingPreferences('book:a', storage), p.DEFAULT_READING_PREFERENCES);
});
test('WriteFlex line-size normalisation and exclusive overlay choice', () => {
  assert.equal(p.normaliseLineFocusSize(1), 1);
  assert.equal(p.normaliseLineFocusSize('5'), 5);
  assert.equal(p.normaliseLineFocusSize(8), 3);
  assert.equal(p.normaliseReadingPreferences({overlay:'line-window'}).overlay, 'line-window');
  assert.equal(p.normaliseReadingPreferences({overlay:['line-window','ruler']}).overlay, 'off');
});

test('dimming: Light .72, Medium .9, Dark 1; first-release names keep their name; version 2 numbers are kept', () => {
  assert.deepEqual(p.DIM_LEVELS.map(level => [level.label, level.value]), [['Light', 0.72], ['Medium', 0.9], ['Dark', 1]]);
  assert.equal(p.DEFAULT_READING_PREFERENCES.dim, 0.9, 'the default stays Medium by name');
  for (const [old, now] of [[0.2, 0.72], [0.35, 0.9], [0.5, 1]]) assert.equal(p.normaliseReadingPreferences({ dim: old }).dim, now, `first-release ${old} was a named level`);
  assert.equal(p.normaliseReadingPreferences({ dim: 0.6 }).dim, 0.6, 'a value that was never a preset stays as it was');
  // Version 2 values are the numbers the reader saw: the old Dark .9 is now Medium and the old Medium .72 is now Light, with no change of shade.
  for (const value of [0.5, 0.72, 0.9, 0.95]) assert.equal(p.normaliseReadingPreferences({ dim: value, dimVersion: 2 }).dim, value);
  const saved = p.normaliseReadingPreferences({ dim: 0.35 });
  assert.equal(saved.dimVersion, 3);
  assert.equal(p.normaliseReadingPreferences({ ...saved, dim: 0.5 }).dim, 0.5, 'a migrated value is not migrated again');
  assert.equal(p.normaliseReadingPreferences({ dim: 1, dimVersion: 3 }).dim, 1);
  assert.equal(p.normaliseReadingPreferences({ dim: 1.2, dimVersion: 3 }).dim, 0.9, 'out of range falls back');
  assert.equal(p.normaliseReadingPreferences({ fontFamily: 'sans', overlay: 'ruler', dim: 0.5 }).overlay, 'ruler', 'other preferences are preserved');
});
test('paragraph focus is one of the exclusive overlay choices; stored separate focus migrates once', () => {
  const n = value => p.normaliseReadingPreferences(value);
  assert.equal(n({ overlay: 'paragraph' }).overlay, 'paragraph');
  assert.equal(n({ overlay: 'paragraph' }).focus, 'paragraph', 'focus mirrors the choice');
  assert.equal(n({ focus: 'paragraph' }).overlay, 'paragraph', 'older paragraph focus with no overlay becomes the paragraph choice');
  assert.equal(n({ focus: 'paragraph', overlay: 'off' }).overlay, 'paragraph');
  for (const overlay of ['line-window', 'ruler']) {
    const both = n({ focus: 'paragraph', overlay });
    assert.equal(both.overlay, overlay, 'an active overlay wins over stored paragraph focus');
    assert.equal(both.focus, 'off');
  }
  assert.equal(n({ focus: 'off', overlay: 'off' }).overlay, 'off');
  assert.equal(n({ focus: 'paragraph', overlay: 'bogus' }).overlay, 'paragraph');
  const kept = n({ fontFamily: 'sans', fontSize: 24, lines: 5, rulerLines: 2, focus: 'paragraph' });
  assert.deepEqual([kept.fontFamily, kept.fontSize, kept.lines, kept.rulerLines], ['sans', 24, 5, 2], 'other format preferences are not reset');
});
test('ruler coverage is 1, 2 or 3 lines and defaults to one', () => {
  assert.equal(p.DEFAULT_READING_PREFERENCES.rulerLines, 1);
  for (const [value, want] of [[1, 1], [2, 2], [3, 3], [5, 1], ['2', 2], [0, 1], [null, 1]]) assert.equal(p.normaliseRulerLines(value), want);
});
test('a text size the reader chose is honoured; the default eases down on narrower windows', () => {
  const auto = { fontSize: 20, fontSizeChosen: false };
  assert.deepEqual([1600, 1440, 1366, 1280, 1100, 1024, 390].map(width => p.effectiveFontSize(auto, width)), [20, 20, 19, 19, 19, 18, 18]);
  for (const width of [1600, 1280, 390]) assert.equal(p.effectiveFontSize({ fontSize: 20, fontSizeChosen: true }, width), 20);
  assert.equal(p.normaliseReadingPreferences({ fontSize: 22 }).fontSizeChosen, true, 'older saved size other than the default was a choice');
  assert.equal(p.normaliseReadingPreferences({ fontSize: 20 }).fontSizeChosen, false);
});
