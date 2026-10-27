import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const directory = fileURLToPath(new URL('.', import.meta.url));
const core = resolve(directory, '../../..');
let scratch, api;
before(async () => {
  scratch = mkdtempSync(resolve(directory, '.test-listening-'));
  const sources = readdirSync(directory).filter(name => /\.(ts|tsx)$/.test(name));
  assert.ok(sources.length, 'The recorded listening module must exist');
  execFileSync(process.execPath, [resolve(core, 'node_modules/typescript/bin/tsc'), ...sources.map(name => resolve(directory, name)), '--outDir', scratch, '--target', 'ES2020', '--module', 'ESNext', '--moduleResolution', 'Bundler', '--jsx', 'react-jsx', '--lib', 'ES2020,DOM,DOM.Iterable', '--strict', '--skipLibCheck'], { stdio: 'pipe' });
  api = await import(pathToFileURL(resolve(scratch, 'index.js')).href);
});
after(() => { if (scratch) rmSync(scratch, { recursive: true, force: true }); });

class Media extends EventTarget {
  src = ''; currentTime = 0; duration = NaN; playbackRate = 1; paused = true; readyState = 0;
  playCalls = 0; loads = 0; rejection = null; pending = null;
  load() { this.loads++; }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  play() {
    this.playCalls++; if (this.rejection) return Promise.reject(this.rejection);
    this.paused = false;
    if (this.pending) return this.pending;
    this.dispatchEvent(new Event('playing')); return Promise.resolve();
  }
  ready(duration = 120) { this.duration = duration; this.readyState = 1; this.dispatchEvent(new Event('loadedmetadata')); }
  tick(time) { this.currentTime = time; this.dispatchEvent(new Event('timeupdate')); }
}
const sections = [{ id: 'one', title: 'First' }, { id: 'gap', title: 'Text only' }, { id: 'three', title: 'Third' }];
const tracks = [{ sectionId: 'one', src: '/one.wav' }, { sectionId: 'three', src: '/three.wav' }];
function fixture(options = {}) {
  const values = options.values ?? new Map(); const media = [];
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) };
  const controller = new api.ListeningController({ createAudio: () => { const audio = new Media(); media.push(audio); return audio; }, storage: () => storage, ...options });
  const configure = (bookId = 'book', currentSectionId = 'one', recordings = tracks) => controller.configure({ bookId, sections, currentSectionId, tracks: recordings });
  configure(); return { controller, values, media, configure };
}
const flush = () => new Promise(resolve => setImmediate(resolve));

test('native Node import exports the React panel without browser globals', () => {
  assert.equal(typeof api.ListeningPanel, 'function');
  assert.equal(typeof window, 'undefined'); assert.equal(typeof Audio, 'undefined');
});
test('source validation rejects executable and disguised schemes while permitting recorded URLs', () => {
  for (const src of ['javascript:alert(1)', 'data:audio/wav;base64,AAA', 'file:///a.wav', 'ftp://a/a.wav', 'java\nscript:alert(1)', '\\evil\\a', '', '   ']) assert.equal(api.safeRecordingSource(src), null, src);
  for (const src of ['./one.wav', '/one.wav', '../one.wav', 'https://example.test/a.mp3', 'http://localhost/a', 'blob:https://example.test/abc', '//example.test/a']) assert.equal(api.safeRecordingSource(src), src);
});
test('alignment accepts only finite, non-overlapping, ordered measured ranges', () => {
  const valid = [{ start: 0, end: 1, charStart: 0, charEnd: 5 }, { start: 2, end: 3, charStart: 6, charEnd: 9 }];
  assert.deepEqual(api.validRecordingAlignment(valid), valid);
  for (const invalid of [[{ ...valid[0], end: Infinity }], [{ ...valid[0], charEnd: 0 }], [{ ...valid[0], charStart: .5 }], [valid[1], valid[0]], [valid[0], { ...valid[1], start: .5 }], [valid[0], { ...valid[1], charStart: 4 }]]) assert.deepEqual(api.validRecordingAlignment(invalid), []);
});
test('restore is ready at saved position and speed without autoplay; positions stay per book', async () => {
  const f = fixture(); const c = f.controller;
  f.media[0].ready(); await c.play(); f.media[0].tick(37); c.setSpeed(1.5);
  c.selectSection('three'); f.media.at(-1).ready(); f.media.at(-1).tick(18); c.dispose();
  const resumed = fixture({ values: f.values });
  assert.equal(resumed.controller.getSnapshot().sectionId, 'three');
  resumed.media[0].ready();
  assert.equal(resumed.media[0].currentTime, 18); assert.equal(resumed.media[0].playbackRate, 1.5);
  assert.equal(resumed.media[0].playCalls, 0); assert.equal(resumed.controller.getSnapshot().status, 'paused');
  resumed.configure('other'); resumed.media.at(-1).ready();
  assert.equal(resumed.media.at(-1).currentTime, 0); assert.equal(resumed.media.at(-1).playbackRate, 1);
  resumed.configure('book'); resumed.media.at(-1).ready(); assert.equal(resumed.media.at(-1).currentTime, 18);
  resumed.controller.dispose();
});
test('chapter navigation follows publication order, skips missing recordings and clamps seeking', () => {
  const f = fixture(); const c = f.controller; f.media[0].ready();
  c.seek(45); c.skip(15); assert.equal(c.getSnapshot().time, 60); c.skip(-150); assert.equal(c.getSnapshot().time, 0);
  c.seek(1000); assert.equal(c.getSnapshot().time, 120);
  assert.equal(c.adjacentSection(1), 'three'); assert.equal(c.adjacentSection(-1), null);
  c.selectSection('gap'); assert.equal(c.getSnapshot().status, 'missing'); assert.equal(c.adjacentSection(1), 'three'); assert.equal(c.adjacentSection(-1), 'one');
  c.selectSection('three'); f.media.at(-1).ready(); assert.equal(c.adjacentSection(1), null); c.dispose();
});
test('view/settings rerenders and fresh equivalent arrays preserve the same playing audio', async () => {
  const f = fixture(); f.media[0].ready(); await f.controller.play(); f.media[0].tick(22);
  f.controller.configure({ bookId: 'book', currentSectionId: 'one', sections: sections.map(s => ({ ...s })), tracks: tracks.map(t => ({ ...t })) });
  assert.equal(f.media.length, 1); assert.equal(f.controller.getSnapshot().time, 22); assert.equal(f.controller.getSnapshot().status, 'playing');
  f.configure('book', 'gap'); assert.equal(f.controller.getSnapshot().status, 'missing'); assert.equal(f.media[0].paused, true); f.controller.dispose();
});
test('rejected play, media errors and retry have truthful states', async () => {
  const f = fixture(); const c = f.controller; const audio = f.media[0]; audio.ready(); audio.rejection = new Error('NotAllowedError');
  await c.play(); assert.equal(c.getSnapshot().status, 'error'); assert.match(c.getSnapshot().error, /play/i);
  audio.rejection = null; await c.play(); assert.equal(c.getSnapshot().status, 'playing');
  audio.dispatchEvent(new Event('error')); assert.equal(c.getSnapshot().status, 'error'); assert.equal(audio.paused, true);
  await c.play(); assert.equal(f.media.length, 2); f.media.at(-1).ready(); await flush(); assert.equal(c.getSnapshot().status, 'playing'); c.dispose();
});
test('pending play and obsolete media events cannot change a new book or restart after pause', async () => {
  const f = fixture(); const c = f.controller; const old = f.media[0]; old.ready();
  let reject; old.pending = new Promise((_, r) => { reject = r; }); const pending = c.play();
  f.configure('next-book'); const current = f.media.at(-1); current.ready();
  old.tick(99); old.dispatchEvent(new Event('error')); reject(new Error('stale rejection')); await pending;
  assert.equal(c.getSnapshot().bookId, 'next-book'); assert.equal(c.getSnapshot().status, 'paused'); assert.equal(c.getSnapshot().time, 0);
  let resolve; current.pending = new Promise(r => { resolve = r; }); const next = c.play(); c.pause(); resolve(); await next;
  current.dispatchEvent(new Event('playing')); assert.equal(c.getSnapshot().status, 'paused'); assert.equal(current.paused, true); c.dispose();
});
test('loading, buffering and ended transitions preserve intent without auto-advancing', async () => {
  const f = fixture(); const c = f.controller; const audio = f.media[0]; assert.equal(c.getSnapshot().status, 'loading');
  await c.play(); c.pause(); audio.ready(); assert.equal(audio.playCalls, 0);
  await c.play(); audio.dispatchEvent(new Event('waiting')); assert.equal(c.getSnapshot().status, 'loading');
  audio.dispatchEvent(new Event('playing')); assert.equal(c.getSnapshot().status, 'playing');
  audio.currentTime = 120; audio.dispatchEvent(new Event('ended')); assert.equal(c.getSnapshot().status, 'ended'); assert.equal(f.media.length, 1);
  await c.play(); assert.equal(audio.currentTime, 0); assert.equal(c.getSnapshot().status, 'playing'); c.dispose();
});
test('storage denial, corrupt records, prototype names, changed assets and nonfinite inputs stay safe', () => {
  const denied = fixture({ storage: () => { throw new Error('blocked'); } }); denied.media[0].ready(); denied.controller.seek(12); assert.equal(denied.controller.getSnapshot().storageAvailable, false); denied.controller.dispose();
  const quota = fixture({ storage: () => ({ getItem: () => null, setItem() { throw new Error('quota'); } }) }); quota.media[0].ready(); quota.controller.seek(12); assert.equal(quota.controller.getSnapshot().time, 12); quota.controller.dispose();
  const f = fixture(); f.media[0].ready(); f.media[0].tick(60); f.controller.dispose();
  const g = fixture({ values: f.values }); g.configure('book', 'one', [{ sectionId: 'one', src: '/new.wav' }]); g.media.at(-1).ready(); assert.equal(g.media.at(-1).currentTime, 0);
  g.controller.seek(NaN); g.controller.setSpeed(Infinity); assert.equal(g.controller.getSnapshot().time, 0); assert.equal(g.controller.getSnapshot().speed, 1); g.controller.dispose();
  for (const corrupt of ['{', 'null', '[]', '{"version":1,"sectionId":"three","speed":-2,"positions":{"three":{"src":"/three.wav","time":"99"}}}']) {
    const values = new Map([[api.listeningStorageKey('book'), corrupt]]); const h = fixture({ values }); h.media[0]?.ready(); assert.equal(h.controller.getSnapshot().time, 0); assert.equal(h.controller.getSnapshot().speed, 1); h.controller.dispose();
  }
  const proto = fixture(); proto.controller.configure({ bookId: 'a:b', currentSectionId: '__proto__', sections: [{ id: '__proto__', title: 'Safe ID' }], tracks: [{ sectionId: '__proto__', src: '/proto.wav' }] }); proto.media.at(-1).ready(); proto.media.at(-1).tick(7); proto.controller.dispose();
  assert.notEqual(api.listeningStorageKey('a:b'), api.listeningStorageKey('a%3Ab'));
});
test('boundaries contain only supplied measured spans, clear in gaps/errors and never interpolate', async () => {
  const spans = [{ start: 1, end: 4, charStart: 20, charEnd: 50 }]; const boundaries = [];
  const f = fixture({ onBoundary: b => boundaries.push(b) }); f.configure('book', 'one', [{ sectionId: 'one', src: '/one.wav', alignment: spans }]);
  const audio = f.media.at(-1); audio.ready(); f.controller.setFollowText(true); await f.controller.play(); audio.tick(2);
  assert.deepEqual(boundaries.at(-1), { sectionId: 'one', charStart: 20, charEnd: 50 });
  audio.tick(3); assert.equal(boundaries.filter(Boolean).length, 1); audio.tick(5); assert.equal(boundaries.at(-1), null);
  audio.tick(2); audio.dispatchEvent(new Event('error')); assert.equal(boundaries.at(-1), null); f.controller.dispose();
});
test('empty or unsafe tracks never create audio or substitute browser speech', async () => {
  const f = fixture(); f.controller.dispose();
  for (const recordings of [[], [{ sectionId: 'one', src: 'javascript:alert(1)' }]]) {
    const g = fixture(); g.configure('empty', 'one', recordings); const count = g.media.length; assert.equal(g.controller.getSnapshot().status, 'missing'); await g.controller.play(); assert.equal(g.media.length, count); g.controller.dispose();
  }
});

test('passage skipping uses supplied starts, honours gaps and disables without measurements', () => {
  const f = fixture(); const c = f.controller;
  f.media[0].ready(); assert.equal(c.passageTime(1), null);
  f.configure('book', 'one', [{ sectionId: 'one', src: '/one.wav', alignment: [{ start: 1, end: 4, charStart: 0, charEnd: 8 }, { start: 8, end: 12, charStart: 10, charEnd: 20 }] }]);
  c.seek(2); assert.equal(c.passageTime(-1), 1); assert.equal(c.passageTime(1), 8);
  c.seek(8); assert.equal(c.passageTime(-1), 1); assert.equal(c.passageTime(1), null);
  c.seek(6); assert.equal(c.passageTime(-1), 1); assert.equal(c.passageTime(1), 8); c.dispose();
});
test('Follow text is opt-in, clears on disable and rejects spans outside duration', () => {
  const boundaries = []; const f = fixture({ onBoundary: b => boundaries.push(b) });
  f.configure('book', 'one', [{ sectionId: 'one', src: '/one.wav', alignment: [{ start: 0, end: 10, charStart: 0, charEnd: 8 }] }]);
  f.media[0].ready(); f.media[0].tick(3); assert.equal(boundaries.filter(Boolean).length, 0);
  f.controller.setFollowText(true); assert.deepEqual(boundaries.at(-1), { sectionId: 'one', charStart: 0, charEnd: 8 });
  f.controller.setFollowText(false); assert.equal(boundaries.at(-1), null);
  f.configure('book', 'one', [{ sectionId: 'one', src: '/one.wav', alignment: [{ start: 0, end: 200, charStart: 0, charEnd: 8 }] }]);
  f.controller.setFollowText(true); assert.equal(f.controller.passageTime(1), null); assert.equal(boundaries.at(-1), null); f.controller.dispose();
});
test('pause and book changes capture the final media clock between timeupdate events', async () => {
  const f = fixture(); const c = f.controller; f.media[0].ready(); await c.play();
  f.media[0].currentTime = 33; c.pause(); assert.equal(c.getSnapshot().time, 33);
  f.media[0].currentTime = 34; f.configure('other'); f.configure('book'); f.media.at(-1).ready();
  assert.equal(c.getSnapshot().time, 34); c.dispose();
});
test('late metadata after media failure and obsolete pause events do not override current intent', async () => {
  const f = fixture(); const c = f.controller; const media = f.media[0]; media.ready(); await c.play();
  media.dispatchEvent(new Event('pause')); assert.equal(c.getSnapshot().status, 'playing');
  media.dispatchEvent(new Event('error')); media.ready(); assert.equal(c.getSnapshot().status, 'error'); c.dispose();
});
test('a changed source reloads even when the host acknowledges the already selected chapter', () => {
  const f = fixture(); const c = f.controller; f.media[0].ready(); c.selectSection('three'); f.media.at(-1).ready();
  f.configure('book', 'three', [{ sectionId: 'three', src: '/replacement.wav' }]);
  assert.equal(f.media.at(-1).src, '/replacement.wav'); assert.equal(c.getSnapshot().time, 0); c.dispose();
});
