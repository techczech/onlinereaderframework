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
  const prefs = p.normaliseReadingPreferences({fontFamily:'sans', fontSize:28, lineHeight:2.4, paragraphSpacing:40, letterSpacing:0.12, overlay:'ruler', focus:'paragraph', lines:5, dim:0.6});
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
