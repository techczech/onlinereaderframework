/** Read-aloud controller and vendored ReadFlex player, no DOM: voices, skip, speed, errors, stale callbacks, ownership.
 * The fake engine here is SYNTHETIC: it records what would be spoken and lets the test emit boundary, end and error events itself. */
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const directory = fileURLToPath(new URL('.', import.meta.url));
const core = resolve(directory, '../../..');
let scratch, flex, controllerApi, speakableApi;
before(async () => {
  scratch = mkdtempSync(resolve(directory, '.test-read-aloud-'));
  const sources = ['flex-speech.ts', 'read-aloud-controller.ts', 'read-aloud-speakable.ts', '../publication-html.ts'].map(name => resolve(directory, name));
  execFileSync(process.execPath, [resolve(core, 'node_modules/typescript/bin/tsc'), ...sources, '--outDir', scratch, '--rootDir', resolve(core, 'src'), '--target', 'ES2020', '--module', 'ESNext', '--moduleResolution', 'Bundler', '--lib', 'ES2020,DOM,DOM.Iterable', '--strict', '--skipLibCheck'], { stdio: 'pipe' });
  flex = await import(pathToFileURL(resolve(scratch, 'original/read-aloud/flex-speech.js')).href);
  controllerApi = await import(pathToFileURL(resolve(scratch, 'original/read-aloud/read-aloud-controller.js')).href);
  speakableApi = await import(pathToFileURL(resolve(scratch, 'original/read-aloud/read-aloud-speakable.js')).href);
});
after(() => { if (scratch) rmSync(scratch, { recursive: true, force: true }); });

test('the vendored ReadFlex player is byte-identical to the recorded source file', () => {
  const hash = createHash('sha256').update(readFileSync(resolve(directory, 'flex-speech.ts'))).digest('hex');
  assert.equal(hash, '6de33926ef26f3b6aa2a31262c1b79dff975fa354f3c7059e8a6781b7a57de62');
});

const voices = [
  { default: false, lang: 'cs-CZ', name: 'Zuzana', voiceURI: 'cs-1' },
  { default: true, lang: 'en-GB', name: 'Daniel', voiceURI: 'en-gb-1' },
  { default: false, lang: 'en-US', name: 'Samantha (Enhanced)', voiceURI: 'en-us-premium', localService: true },
];
const TEXT = 'First sentence here. Second one follows! Third closes it.\n\nNew paragraph starts. It has two sentences.';
function parts(text = TEXT) {
  const segments = []; const pieces = []; let spoken = '';
  text.split('\n\n').forEach((paragraph, index) => {
    if (spoken) spoken += '\n\n';
    const from = spoken.length; spoken += paragraph;
    segments.push({ blockId: `block-${index}`, kind: 'paragraph', sourceFrom: from, sourceTo: spoken.length, spokenFrom: from, spokenTo: spoken.length });
    pieces.push({ sourceFrom: from, sourceTo: spoken.length, spokenFrom: from, spokenTo: spoken.length });
  });
  return { speakable: { segments, pieces, text: spoken }, model: { text: spoken, points: [] } };
}
function fixture(options = {}) {
  const fake = options.shared?.fake ?? flex.fakeSpeechCapabilities(options.voices ?? voices);
  const log = options.shared?.log ?? { cancels: 0, rates: [], handlers: [], order: [] };
  const base = { ...fake, speak(text, spoken, handlers) { log.order.push('speak'); log.handlers.push(handlers); fake.speak(text, spoken, handlers); }, cancel() { log.cancels++; if (!options.silentCancel) fake.cancel(); }, setRate(rate) { log.rates.push(rate); fake.setRate(rate); },
    resume() { log.order.push('resume'); fake.resume(); }, busy: options.busy, engine: options.shared?.engine, reportsStart: options.reportsStart };
  const store = { value: options.saved ?? { voiceURI: null, rate: 1, follow: true }, writes: 0 };
  const controller = new controllerApi.ReadAloudController({
    capability: options.noEngine ? null : base, language: options.language, silenceMs: options.silenceMs,
    onEngage: options.engage ? () => { log.order.push('engage'); } : undefined,
    storage: { read: () => store.value, write: value => { store.value = value; store.writes++; return true; } },
  });
  controller.load(parts(options.text));
  controller.refreshVoices(true);
  return { controller, fake, log, store, snap: () => controller.getSnapshot() };
}

test('loading a chapter never starts speech; Start begins at the requested position', () => {
  const { controller, fake, snap } = fixture();
  assert.equal(snap().status, 'idle'); assert.equal(fake.spoken.length, 0);
  controller.start(TEXT.indexOf('New paragraph'));
  assert.equal(snap().status, 'speaking');
  assert.equal(fake.spoken.at(-1).text, 'New paragraph starts.');
  assert.deepEqual(snap().sentence, { from: TEXT.indexOf('New paragraph'), to: TEXT.indexOf('New paragraph') + 'New paragraph starts.'.length });
  assert.equal(snap().paragraph, 2); assert.equal(snap().paragraphs, 2);
});

test('voices: saved choice, then book language, then the system default; missing saved voice falls back', () => {
  assert.equal(fixture({ saved: { voiceURI: 'en-gb-1', rate: 1, follow: true } }).snap().voiceURI, 'en-gb-1');
  assert.equal(fixture({ language: 'cs' }).snap().voiceName, 'Zuzana');
  assert.equal(fixture().snap().voiceURI, 'en-us-premium', 'ReadFlex prefers an installed premium or enhanced voice');
  const gone = fixture({ saved: { voiceURI: 'removed', rate: 1, follow: true }, voices: [voices[1]] });
  assert.equal(gone.snap().voiceURI, 'en-gb-1'); assert.equal(gone.snap().chosenVoiceURI, 'removed', 'the saved choice is kept in case the voice returns');
  const none = fixture({ voices: [] });
  assert.equal(none.snap().voiceURI, null); assert.equal(none.snap().voiceName, 'System voice');
  none.controller.start(0);
  assert.equal(none.snap().status, 'speaking', 'no listed voices still reads with the browser default');
});

test('choosing a voice or speed is saved and applied to the next utterance', () => {
  const { controller, fake, store, snap } = fixture();
  controller.start(0);
  controller.setVoice('cs-1');
  assert.equal(store.value.voiceURI, 'cs-1');
  assert.equal(fake.spoken.at(-1).voiceURI, 'cs-1');
  assert.equal(fake.spoken.at(-1).text, 'First sentence here.', 'a voice change continues from the current sentence');
  controller.setVoice(null);
  assert.equal(store.value.voiceURI, null);
  controller.setRate(1.5);
  assert.equal(store.value.rate, 1.5); assert.equal(fake.spoken.at(-1).rate, 1.5);
  assert.equal(snap().status, 'speaking');
});

test('skip moves by sentence and paragraph from the current place, and resumes reading', () => {
  const { controller, fake, snap } = fixture();
  controller.start(0);
  controller.skip('sentence', 1); assert.equal(fake.spoken.at(-1).text, 'Second one follows!');
  controller.skip('sentence', 1); controller.skip('sentence', 1);
  assert.equal(fake.spoken.at(-1).text, 'New paragraph starts.', 'sentence skip crosses a paragraph boundary');
  controller.skip('paragraph', -1); assert.equal(fake.spoken.at(-1).text, 'First sentence here.', 'previous paragraph starts at its first sentence');
  controller.skip('sentence', -1); assert.equal(fake.spoken.at(-1).text, 'First sentence here.', 'skipping back at the start stays put');
  controller.pause(); assert.equal(snap().status, 'paused');
  controller.skip('paragraph', 1);
  assert.equal(snap().status, 'speaking'); assert.equal(fake.spoken.at(-1).text, 'New paragraph starts.');
});

test('a speed change restarts the current sentence, not the chapter', () => {
  const { controller, fake, snap } = fixture();
  controller.start(0); controller.skip('sentence', 1);
  const before = fake.spoken.length;
  controller.setRate(1.8);
  assert.equal(fake.spoken.length, before + 1); assert.equal(fake.spoken.at(-1).text, 'Second one follows!');
  assert.equal(snap().rate, 1.8);
});

test('word highlighting appears only after the engine reports a real boundary', () => {
  const { controller, fake, snap } = fixture();
  controller.start(0);
  assert.equal(snap().word, null); assert.equal(snap().wordTiming, 'sentence');
  fake.emitBoundary(6);
  assert.equal(snap().wordTiming, 'boundary');
  assert.deepEqual(snap().word, { from: 6, to: 14 }, 'the word "sentence" in the first sentence');
  fake.emitBoundary(15);
  assert.deepEqual(snap().word, { from: 15, to: 19 });
});

test('stop clears the highlight; pause keeps the position; sentences end into the next', () => {
  const { controller, fake, snap } = fixture();
  controller.start(0); fake.emitEnd();
  assert.equal(fake.spoken.at(-1).text, 'Second one follows!');
  controller.pause();
  assert.equal(snap().status, 'paused'); assert.ok(snap().sentence, 'a paused reading keeps the sentence marked');
  controller.resume(); assert.equal(snap().status, 'speaking');
  controller.stop();
  assert.equal(snap().status, 'idle'); assert.equal(snap().sentence, null); assert.equal(snap().word, null);
});

test('reaching the end returns to idle without a problem', () => {
  const { controller, fake, snap } = fixture({ text: 'Only one sentence.' });
  controller.start(0); fake.emitEnd();
  assert.equal(snap().status, 'idle'); assert.equal(snap().problem, null); assert.equal(snap().sentence, null);
});

test('an engine error is reported plainly and does not leave the controller reading', () => {
  const { controller, fake, snap } = fixture();
  controller.start(0); fake.emitError('synthesis-failed');
  assert.equal(snap().status, 'idle'); assert.match(snap().problem, /could not read aloud \(synthesis-failed\)/);
  controller.start(0); assert.equal(snap().problem, null, 'Start clears the previous problem'); assert.equal(snap().status, 'speaking');
  fake.emitError('not-allowed'); assert.match(snap().problem, /blocked speech/);
});

test('another page cancelling our speech is reported, not shown as reading', () => {
  const { controller, fake, snap } = fixture();
  controller.start(0); fake.emitError('canceled');
  assert.equal(snap().status, 'idle'); assert.match(snap().problem, /stopped by the browser or another page/);
});

test('a stale end or boundary from a stopped or replaced utterance cannot advance or clear newer playback', () => {
  const { controller, fake, log, snap } = fixture();
  const handlers = log.handlers;
  controller.start(0);
  controller.stop();
  controller.start(0);
  const spokenCount = fake.spoken.length;
  handlers[0].onEnd(); handlers[0].onBoundary(8);
  assert.equal(fake.spoken.length, spokenCount, 'the old utterance ending does not start the next sentence');
  assert.equal(snap().status, 'speaking'); assert.equal(snap().wordTiming, 'sentence');
  handlers[0].onError('interrupted');
  assert.equal(snap().status, 'speaking', 'a late cancellation of the old utterance does not clear the new one');
});

test('ownership: an idle controller never cancels shared speech; a speaking one does on dispose', () => {
  const idle = fixture();
  idle.controller.stop(); idle.controller.dispose(); idle.controller.load(parts('Changed. Text.'));
  assert.equal(idle.log.cancels, 0);
  const speaking = fixture();
  speaking.controller.start(0); const before = speaking.log.cancels;
  speaking.controller.dispose();
  assert.ok(speaking.log.cancels > before); assert.equal(speaking.snap().status, 'idle');
  const replaced = fixture(); replaced.controller.start(0); replaced.controller.load(parts('Different chapter. Here.'));
  assert.equal(replaced.snap().status, 'idle', 'new chapter text stops the old reading');
});

test('no speech engine: honest unavailable state, Start explains, nothing throws', () => {
  const { controller, snap } = fixture({ noEngine: true });
  assert.equal(snap().available, false);
  controller.start(0); controller.skip('sentence', 1); controller.pause(); controller.setRate(1.2); controller.stop();
  assert.equal(snap().status, 'idle'); assert.match(snap().problem, /cannot read aloud/);
});

test('an utterance that shows no sign of life is reported instead of reading forever', async () => {
  const { controller, snap } = fixture({ silenceMs: 20 });
  controller.start(0);
  await new Promise(done => setTimeout(done, 80));
  assert.equal(snap().status, 'idle'); assert.match(snap().problem, /has not started speaking/);
  const busy = fixture({ silenceMs: 20, busy: () => true });
  busy.controller.start(0);
  await new Promise(done => setTimeout(done, 30));
  assert.equal(busy.snap().status, 'speaking', 'an engine that reports it is speaking is given more time');
  busy.controller.stop();
});

const shared = () => ({ fake: flex.fakeSpeechCapabilities(voices), engine: {}, log: { cancels: 0, rates: [], handlers: [], order: [] } });
const wait = ms => new Promise(done => setTimeout(done, ms));

test('two readers over one engine: the newer one takes it, and the older one can no longer stop or hear it', () => {
  for (const silentCancel of [false, true]) {
    const engine = shared();
    const a = fixture({ shared: engine, silentCancel }); const b = fixture({ shared: engine, silentCancel });
    a.controller.start(0);
    const aHandlers = engine.log.handlers.at(-1);
    b.controller.start(0);
    assert.equal(a.snap().status, 'idle', 'the superseded reader stops reading at once, even if the engine never says so');
    assert.equal(b.snap().status, 'speaking');
    const cancelsAfterTakeover = engine.log.cancels;
    // Everything the older reader can still do is invisible to the engine and to B.
    a.controller.stop(); a.controller.pause(); a.controller.resume(); a.controller.skip('sentence', 1); a.controller.load(parts('Other. Text.')); a.controller.dispose();
    assert.equal(engine.log.cancels, cancelsAfterTakeover, 'the older reader never cancels the engine again');
    assert.equal(b.snap().status, 'speaking');
    // Late callbacks from A's cancelled utterance, delivered after B started, change nothing.
    const sentence = b.snap().sentence;
    aHandlers.onBoundary(5); aHandlers.onEnd(); aHandlers.onError('interrupted'); aHandlers.onError('canceled');
    assert.equal(b.snap().status, 'speaking'); assert.deepEqual(b.snap().sentence, sentence); assert.equal(b.snap().problem, null);
    b.controller.dispose();
    assert.equal(b.snap().status, 'idle');
  }
});

test('taking the engine from a paused reader clears the engine pause; only the new owner can pause or resume it', () => {
  const engine = shared();
  const state = { paused: false };
  const { pause, resume } = engine.fake;
  engine.fake.pause = () => { state.paused = true; pause.call(engine.fake); };
  engine.fake.resume = () => { state.paused = false; resume.call(engine.fake); };
  const a = fixture({ shared: engine }); const b = fixture({ shared: engine });
  a.controller.start(0); a.controller.pause();
  assert.equal(state.paused, true);
  b.controller.start(0);
  assert.equal(state.paused, false, 'the new owner clears the predecessor\'s engine pause before its utterance');
  assert.equal(a.snap().status, 'idle'); assert.equal(b.snap().status, 'speaking');
  // Old reader cannot pause, resume or cancel the new speech.
  a.controller.pause(); a.controller.resume(); a.controller.stop();
  assert.equal(state.paused, false); assert.equal(b.snap().status, 'speaking');
  b.controller.pause(); assert.equal(state.paused, true);
  a.controller.resume(); assert.equal(state.paused, true, 'old reader cannot resume the new owner');
  b.controller.resume(); assert.equal(state.paused, false);
});

test('a reader can take the engine back, and its own late callbacks are still ignored', () => {
  const engine = shared();
  const a = fixture({ shared: engine }); const b = fixture({ shared: engine });
  a.controller.start(0); b.controller.start(0); a.controller.start(0);
  assert.equal(a.snap().status, 'speaking'); assert.equal(b.snap().status, 'idle');
  const old = engine.log.handlers[0]; old.onEnd(); old.onError('interrupted');
  assert.equal(a.snap().status, 'speaking'); assert.equal(a.snap().sentence.from, 0);
});

test('a reader that never spoke does not claim the engine and leaves a speaking reader alone', () => {
  const engine = shared();
  const a = fixture({ shared: engine }); const idle = fixture({ shared: engine });
  a.controller.start(0); const cancels = engine.log.cancels;
  idle.controller.stop(); idle.controller.dispose(); idle.controller.load(parts('Changed. Text.'));
  assert.equal(engine.log.cancels, cancels); assert.equal(a.snap().status, 'speaking');
});

test('watchdog: an engine that reports starts and is speaking is never stopped for lacking word events', async () => {
  const engine = shared();
  let busy = true;
  const a = fixture({ shared: engine, silenceMs: 20, reportsStart: true, busy: () => busy });
  a.controller.start(0);
  engine.log.handlers.at(-1).onStart();
  await wait(220);
  assert.equal(a.snap().status, 'speaking', 'past many silence intervals, with no boundary events, the utterance is still running');
  assert.equal(a.snap().problem, null);
  busy = false;
  await wait(60);
  assert.equal(a.snap().status, 'idle'); assert.match(a.snap().problem, /stopped reading without saying why/);
});

test('watchdog: a slow voice may start late; one that never starts is reported after a bounded wait', async () => {
  const slow = fixture({ silenceMs: 20, reportsStart: true, busy: () => true });
  slow.controller.start(0);
  await wait(70);
  assert.equal(slow.snap().status, 'speaking', 'three intervals without a start event is not yet a failure for an engine that says it is speaking');
  slow.log.handlers.at(-1).onStart();
  await wait(150);
  assert.equal(slow.snap().status, 'speaking');
  slow.controller.stop();
  const never = fixture({ silenceMs: 20, reportsStart: true, busy: () => true });
  never.controller.start(0);
  await wait(260);
  assert.equal(never.snap().status, 'idle'); assert.match(never.snap().problem, /has not started speaking/);
});

test('watchdog: pausing before the voice starts does not lose or spend the wait; resuming re-arms it', async () => {
  const a = fixture({ silenceMs: 20, reportsStart: true, busy: () => true });
  a.controller.start(0);
  a.controller.pause();
  await wait(200);
  assert.equal(a.snap().status, 'paused', 'a pause longer than the whole start window is not an error');
  assert.equal(a.snap().problem, null);
  a.controller.resume();
  await wait(60);
  assert.equal(a.snap().status, 'speaking');
  a.log.handlers.at(-1).onStart();
  await wait(150);
  assert.equal(a.snap().status, 'speaking');
  a.controller.stop();
  const b = fixture({ silenceMs: 20, reportsStart: true, busy: () => true });
  b.controller.start(0); b.controller.pause(); b.controller.resume();
  await wait(260);
  assert.equal(b.snap().status, 'idle', 'an engine that never starts after a resume is still reported'); assert.match(b.snap().problem, /has not started speaking/);
});

test('watchdog: an engine that gives no start events is judged only by whether it says it is speaking', async () => {
  const busy = fixture({ silenceMs: 20, busy: () => true });
  busy.controller.start(0);
  await wait(200);
  assert.equal(busy.snap().status, 'speaking');
  busy.controller.stop();
});

test('engage: the host hook runs before the engine speaks or resumes, once per engagement, on every start path', () => {
  const a = fixture({ engage: true });
  a.controller.start(0);
  assert.deepEqual(a.log.order.slice(0, 2), ['engage', 'speak'], 'Start');
  a.log.order.length = 0;
  // Sentence to sentence inside one reading is not a new engagement.
  a.log.handlers.at(-1).onEnd();
  assert.deepEqual(a.log.order, ['speak']);
  a.controller.skip('sentence', 1);
  assert.ok(!a.log.order.includes('engage'), 'skipping while speaking');
  a.log.order.length = 0;
  a.controller.pause(); a.controller.resume();
  assert.deepEqual(a.log.order, ['engage', 'resume'], 'Resume');
  a.log.order.length = 0;
  a.controller.pause(); a.controller.skip('sentence', 1);
  // Cancelling a paused engine first un-pauses it (nothing is queued then); the hook still precedes the new utterance.
  assert.ok(a.log.order.includes('engage') && a.log.order.indexOf('engage') < a.log.order.indexOf('speak'), 'skip from paused');
  a.controller.stop(); a.log.order.length = 0;
  a.controller.toggle(0);
  assert.deepEqual(a.log.order.slice(0, 2), ['engage', 'speak'], 'toggle from idle (the keyboard shortcut path)');
});

test('word ranges follow Unicode words, not bytes', () => {
  const text = 'Naïve café — 東京タワー, x² and don’t.';
  const word = offset => { const range = speakableApi.wordRangeAt(text, offset); return range && text.slice(range.from, range.to); };
  assert.equal(word(0), 'Naïve'); assert.equal(word(6), 'café'); assert.equal(word(13), '東京タワー'); assert.equal(word(text.indexOf('don')), 'don’t');
});
