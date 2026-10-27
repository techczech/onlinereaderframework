import {
  chooseInstalledVoice, createSpeechPlayer, normaliseSpeechRate, webSpeechCapabilities,
  type SpeechCapabilities, type SpeechHandlers, type SpeechPlayer, type SpeechPlayerState, type SpeechVoice, type SpokenRange,
} from './flex-speech.js';
import { wordRangeAt, type PublicationSpeakable } from './read-aloud-speakable.js';

export interface ReadAloudPreferences {
  /** null means automatic: the voice that best matches the book's language. */
  voiceURI: string | null;
  rate: number;
  /** Keep the sentence being read in view. */
  follow: boolean;
}
export const DEFAULT_READ_ALOUD_PREFERENCES: ReadAloudPreferences = { voiceURI: null, rate: 1, follow: true };

export interface ReadAloudStorage { read(): ReadAloudPreferences; write(value: ReadAloudPreferences): boolean }

export type ReadAloudStatus = 'idle' | 'speaking' | 'paused';

export interface ReadAloudSnapshot {
  /** False when the browser has no speech engine at all. */
  available: boolean;
  status: ReadAloudStatus;
  /** A plain statement of why reading is not happening, kept until the next Start. */
  problem: string | null;
  voices: SpeechVoice[];
  /** True once the browser has had time to report its voices; an empty list is then final for now. */
  voicesSettled: boolean;
  /** The voice in use: the saved choice, or the automatic pick. */
  voiceURI: string | null;
  voiceName: string;
  /** What the reader chose: a voice, or null for automatic. */
  chosenVoiceURI: string | null;
  rate: number;
  follow: boolean;
  /** Source ranges in the canonical publication text. Both are null while idle. */
  sentence: SpokenRange | null;
  word: SpokenRange | null;
  /** 'boundary' only when the engine has reported real word positions for this reading. */
  wordTiming: 'boundary' | 'sentence';
  paragraph: number | null;
  paragraphs: number;
}

interface Taps {
  /** Runs synchronously, before an utterance is handed to the engine. */
  spoke(): void;
  /** Runs synchronously, before a paused utterance is resumed. */
  resumed(): void;
  /** The engine itself said the current utterance began. */
  started(): void;
  progress(): void;
  boundary(): void;
  failed(error: string): void;
  /** Another controller took the shared engine; this one no longer owns any speech. */
  superseded(): void;
}

type StartAwareHandlers = SpeechHandlers & { onStart?(): void };

/** The browser has one speech engine however many readers are mounted, so one controller at a time owns it. */
interface EngineSlot { owner: object | null; supersede: (() => void) | null; paused: boolean }
const engineSlots = new WeakMap<object, EngineSlot>();
const slotFor = (engine: object): EngineSlot => {
  let slot = engineSlots.get(engine);
  if (!slot) { slot = { owner: null, supersede: null, paused: false }; engineSlots.set(engine, slot); }
  return slot;
};

const CANCELLATION = /^(?:canceled|interrupted)$/u;

/** Wrap any SpeechCapabilities so a callback from an utterance that was cancelled or replaced cannot change newer playback.
 * Browsers differ on whether a cancelled utterance later reports end, error or nothing, and the player expects exactly one
 * cancellation acknowledgement per cancel(). So cancel() acknowledges itself, synchronously, to the utterance it cancelled
 * (or to the next one, when nothing was in flight), and every later event from a cancelled utterance is dropped.
 */
export function guardCapability(
  base: SpeechCapabilities, taps: Taps, busy: () => boolean = () => false, engine: object = base,
): SpeechCapabilities & { busy(): boolean; claim(): void; release(): void } {
  const token = {};
  const slot = slotFor(engine);
  const owns = () => slot.owner === token;
  /** Take the shared engine. Whoever held it is told first and, from then on, can neither stop nor hear this speech. */
  const claim = () => {
    if (owns()) return;
    const previous = slot.supersede;
    slot.owner = token;
    slot.supersede = () => taps.superseded();
    previous?.();
    // The engine's pause flag is shared and outlives the reader that set it: the new owner clears it, discarding the old speech first.
    if (slot.paused) { base.cancel(); base.resume(); slot.paused = false; }
  };
  let epoch = 0;
  let inFlight: SpeechHandlers | null = null;
  let unacknowledged = false;
  return {
    sourceKind: base.sourceKind,
    busy,
    claim,
    release() { if (owns()) { slot.owner = null; slot.supersede = null; } },
    cancel() {
      epoch++;
      // Only the owner may silence the engine: a superseded reader must not cancel the one that replaced it.
      if (owns()) {
        base.cancel();
        // A paused engine stays paused across cancel in some browsers; the next utterance would never start.
        if (slot.paused) { base.resume(); slot.paused = false; }
      }
      const cancelled = inFlight;
      inFlight = null;
      if (cancelled) cancelled.onError('interrupted'); else unacknowledged = true;
    },
    pause() { if (!owns()) return; slot.paused = true; base.pause(); },
    resume() { if (!owns()) return; taps.resumed(); slot.paused = false; base.resume(); },
    setRate: rate => base.setRate(rate),
    seekToSourceOffset: base.seekToSourceOffset?.bind(base),
    voices: () => base.voices(),
    speak(text, options, handlers) {
      const mine = epoch;
      const live = () => mine === epoch;
      const guarded: StartAwareHandlers = {
        onStart() { if (!live()) return; taps.started(); },
        onBoundary(charIndex) { if (!live()) return; taps.progress(); taps.boundary(); handlers.onBoundary(charIndex); },
        onEnd() { if (!live()) return; inFlight = null; taps.progress(); handlers.onEnd(); },
        onError(error) {
          if (!live()) return;
          inFlight = null; taps.progress(); taps.failed(error);
          handlers.onError(error);
        },
      };
      claim();
      taps.spoke();
      inFlight = handlers;
      base.speak(text, options, guarded);
      // The cancel that preceded the very first utterance had nothing to acknowledge it; the player ignores this one.
      if (unacknowledged) { unacknowledged = false; handlers.onError('interrupted'); }
    },
  };
}

function problemFor(error: string): string {
  if (CANCELLATION.test(error)) return 'Reading was stopped by the browser or another page. Press Start to read again.';
  if (error === 'not-allowed') return 'The browser blocked speech until you interact with the page. Press Start again.';
  if (error === 'voice-unavailable' || error === 'language-unavailable') return 'That voice is not available in this browser. Choose another voice, then press Start.';
  return `The browser could not read aloud (${error}). Choose another voice or press Start to try again.`;
}

/** Voice for this reading: the reader's choice if still installed, else the best match for the book's language, else ReadFlex's default pick. */
export function pickVoice(voices: readonly SpeechVoice[], chosen: string | null, language?: string): { name: string; voiceURI: string | null } {
  if (chosen) {
    const saved = voices.find(voice => voice.voiceURI === chosen);
    if (saved) return { name: saved.name, voiceURI: saved.voiceURI };
  }
  const primary = (language ?? '').toLowerCase().split('-')[0];
  const matching = primary ? voices.filter(voice => voice.lang.toLowerCase().split(/[-_]/)[0] === primary) : [];
  return chooseInstalledVoice(matching.length ? matching : voices, null);
}

/** What a speech engine adds to the player's capabilities for the reader. */
export interface ReadAloudEngine {
  /** True while the engine says it is speaking. */
  busy?(): boolean;
  /** The shared engine object, so controllers over one browser engine know about each other. Defaults to the capability itself. */
  engine?: object;
  /** True when the engine reports the start of each utterance. Without start events only busy() is evidence of life. */
  reportsStart?: boolean;
}

/** A started-but-unconfirmed utterance gets this many silence intervals before it is reported as never started. */
const START_ROUNDS = 5;

export interface ReadAloudOptions {
  /** Null when the browser has no speech engine. */
  capability: (SpeechCapabilities & ReadAloudEngine) | null;
  /** Runs synchronously, once per Start, Resume or skip-from-pause, before the engine is asked to speak. The host pauses other audio here. */
  onEngage?: () => void;
  storage: ReadAloudStorage;
  language?: string;
  /** How long a started utterance may show no sign of life before the controller reports it honestly. */
  silenceMs?: number;
}

/** One listener owns one player. It starts nothing by itself and cancels speech only while it is the one speaking. */
export class ReadAloudController {
  private readonly listeners = new Set<() => void>();
  private readonly player: SpeechPlayer | null = null;
  private readonly guarded: (SpeechCapabilities & { busy(): boolean; claim(): void; release(): void }) | null = null;
  private preferences: ReadAloudPreferences;
  private parts: PublicationSpeakable | null = null;
  private sourceText = '';
  private realBoundary = false;
  private problem: string | null = null;
  private voices: SpeechVoice[] = [];
  private settled = false;
  private activeVoiceURI: string | null = null;
  private voiceName = 'System default voice';
  private quiet: ReturnType<typeof setTimeout> | null = null;
  private quietRounds = 0;
  private startSeen = false;
  private engaged = false;
  private current: ReadAloudSnapshot;

  constructor(private readonly options: ReadAloudOptions) {
    this.preferences = options.storage.read();
    this.preferences = { ...this.preferences, rate: normaliseSpeechRate(this.preferences.rate) };
    if (options.capability) {
      const base = options.capability;
      this.guarded = guardCapability(base, {
        spoke: () => { this.engage(); this.startSeen = false; this.armSilence(); },
        resumed: () => { this.engage(); this.armSilence(); },
        started: () => { this.startSeen = true; },
        progress: () => this.clearSilence(),
        boundary: () => { this.realBoundary = true; },
        failed: error => { this.problem = problemFor(error); },
        superseded: () => this.releaseEngine(),
      }, () => base.busy?.() ?? false, base.engine ?? base);
      this.player = createSpeechPlayer(this.guarded, state => this.onState(state), () => this.onFinish(), this.preferences.rate);
    }
    this.current = this.derive(null);
  }

  subscribe = (listener: () => void): (() => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  getSnapshot = (): ReadAloudSnapshot => this.current;

  /** Attach the chapter text. Anything still being read belongs to the previous text, so it is stopped first. */
  load(parts: PublicationSpeakable): void {
    if (this.player && this.current.status !== 'idle') this.player.stop();
    this.parts = parts;
    this.sourceText = parts.model.text;
    this.player?.load(parts.speakable);
    this.publish(this.player?.state() ?? null);
  }

  refreshVoices(settled = false): void {
    let voices: SpeechVoice[] = [];
    try { voices = this.guarded?.voices() ?? []; } catch { voices = []; }
    this.voices = voices;
    this.settled = this.settled || settled;
    this.applyVoice();
    this.publish(this.player?.state() ?? null);
  }

  /** Start, pause or resume. `offset` is the source position to start from when idle. */
  toggle(offset = 0): void {
    const status = this.current.status;
    if (status === 'speaking') this.pause();
    else if (status === 'paused') this.resume();
    else this.start(offset);
  }

  start(offset = 0): void {
    if (!this.player || !this.parts) {
      this.problem = this.guarded ? 'Open a chapter to read it aloud.' : 'This browser cannot read aloud.';
      this.publish(null);
      return;
    }
    this.problem = null;
    this.realBoundary = false;
    this.refreshVoices();
    // Take the shared engine before anything else: a reader that was speaking is stopped without touching the engine.
    this.guarded?.claim();
    this.player.playFrom(offset);
  }

  pause(): void { this.player?.pause(); }
  resume(): void { this.player?.resume(); }

  /** Stop only speech this controller is producing; an idle controller never touches the shared engine. */
  stop(): void {
    if (!this.player || this.current.status === 'idle') return;
    this.clearSilence();
    this.player.stop();
  }

  /** Skipping resumes reading from the new place, whether reading or paused. */
  skip(unit: 'sentence' | 'paragraph', direction: 1 | -1): void {
    if (!this.player || this.current.status === 'idle') return;
    this.realBoundary = false;
    if (unit === 'sentence') { this.player.skipSentence(direction); return; }
    if (direction === 1) { this.player.skipParagraph(1); return; }
    // The player's backward paragraph skip lands on the last sentence of the previous paragraph; reading starts at its first.
    const segments = this.parts?.speakable.segments ?? [];
    const here = this.current.paragraph ?? 1;
    const target = segments[Math.max(0, here - 2)];
    if (target?.sourceFrom != null) this.player.playFrom(target.sourceFrom);
  }

  setVoice(voiceURI: string | null): void {
    this.preferences = { ...this.preferences, voiceURI };
    this.options.storage.write(this.preferences);
    this.realBoundary = false;
    this.applyVoice();
    this.publish(this.player?.state() ?? null);
  }

  /** The new speed applies from the sentence being read, not from the start of the chapter. */
  setRate(rate: number): void {
    const next = normaliseSpeechRate(rate);
    this.preferences = { ...this.preferences, rate: next };
    this.options.storage.write(this.preferences);
    if (!this.player) { this.publish(null); return; }
    this.player.setRate(next);
    const sentence = this.current.sentence;
    if (this.current.status === 'speaking' && sentence) { this.realBoundary = false; this.player.moveTo(sentence.from); }
  }

  setFollow(follow: boolean): void {
    this.preferences = { ...this.preferences, follow };
    this.options.storage.write(this.preferences);
    this.publish(this.player?.state() ?? null);
  }

  /** Release this controller's speech. Safe to call twice; the controller can be used again afterwards. */
  dispose(): void {
    this.stop();
    this.clearSilence();
    this.guarded?.release();
  }

  /** Another controller took the engine: this reading is over, and nothing it does from here reaches the new speech. */
  private releaseEngine(): void {
    this.clearSilence();
    if (this.player && this.current.status !== 'idle') this.player.stop();
  }

  private engage(): void {
    if (this.engaged) return;
    this.engaged = true;
    this.options.onEngage?.();
  }

  private applyVoice(): void {
    const picked = pickVoice(this.voices, this.preferences.voiceURI, this.options.language);
    this.voiceName = picked.name;
    if (picked.voiceURI !== this.activeVoiceURI) {
      this.activeVoiceURI = picked.voiceURI;
      this.player?.setVoice(picked.voiceURI);
    }
  }

  private armSilence(): void {
    this.clearSilence();
    this.quietRounds = 0;
    this.scheduleSilence();
  }
  private scheduleSilence(): void {
    this.quiet = setTimeout(() => {
      this.quiet = null;
      if (this.current.status !== 'speaking') return;
      const busy = this.guarded?.busy() ?? false;
      const reportsStart = this.options.capability?.reportsStart === true;
      if (reportsStart) {
        // Start events exist, so an utterance that has begun is alive for as long as the engine says it is speaking, boundary events or not.
        if (this.startSeen && busy) { this.scheduleSilence(); return; }
        // One that has not begun gets a bounded wait: a slow voice may take a while, but not forever.
        if (!this.startSeen && ++this.quietRounds < START_ROUNDS) { this.scheduleSilence(); return; }
      } else if (busy) { this.scheduleSilence(); return; }
      this.problem = this.startSeen
        ? 'The browser stopped reading without saying why. Press Start to read again.'
        : 'The browser accepted the text but has not started speaking. Choose another voice or check the system voice settings, then press Start.';
      this.player?.stop();
    }, this.options.silenceMs ?? 6000);
  }
  private clearSilence(): void {
    if (this.quiet) { clearTimeout(this.quiet); this.quiet = null; }
  }

  private onFinish(): void { this.clearSilence(); }

  private onState(state: SpeechPlayerState): void {
    if (state.status === 'idle') this.clearSilence();
    // The next Start or Resume is a new engagement.
    if (state.status !== 'speaking') this.engaged = false;
    this.publish(state);
  }

  private derive(state: SpeechPlayerState | null): ReadAloudSnapshot {
    const status = state?.status ?? 'idle';
    const sentence = status === 'idle' ? null : state?.activeSentence ?? null;
    const word = status === 'speaking' && this.realBoundary && sentence && state?.sourceOffset != null
      && state.sourceOffset >= sentence.from && state.sourceOffset < sentence.to
      ? wordRangeAt(this.sourceText, state.sourceOffset) : null;
    const segments = this.parts?.speakable.segments ?? [];
    const index = state?.activeBlockId ? segments.findIndex(segment => segment.blockId === state.activeBlockId) : -1;
    return {
      available: !!this.guarded, status,
      problem: status === 'idle' ? this.problem : null,
      voices: this.voices, voicesSettled: this.settled,
      voiceURI: this.activeVoiceURI, voiceName: this.voiceName, chosenVoiceURI: this.preferences.voiceURI,
      rate: this.preferences.rate, follow: this.preferences.follow,
      sentence, word: word && sentence && word.to > sentence.to ? { from: word.from, to: sentence.to } : word,
      wordTiming: this.realBoundary ? 'boundary' : 'sentence',
      paragraph: status === 'idle' || index < 0 ? null : index + 1, paragraphs: segments.length,
    };
  }

  private publish(state: SpeechPlayerState | null): void {
    this.current = this.derive(state);
    this.listeners.forEach(listener => listener());
  }
}

/** The browser's own speech engine, or null where a page has none (for example an insecure or very old context). */
export function browserReadAloudCapability(host: typeof globalThis = globalThis): (SpeechCapabilities & Required<ReadAloudEngine>) | null {
  const synth = host.speechSynthesis;
  if (!synth || typeof (host as unknown as { SpeechSynthesisUtterance?: unknown }).SpeechSynthesisUtterance === 'undefined') return null;
  const base = webSpeechCapabilities();
  return {
    ...base, engine: synth, reportsStart: true, busy: () => !!synth.speaking,
    // The player's own Web Speech adapter listens for boundary, end and error only. The engine's start event is the one honest sign
    // that a voice without word boundaries has begun, so it is attached to the utterance as the adapter hands it to the engine.
    speak(text, options, handlers) {
      const onStart = (handlers as StartAwareHandlers).onStart;
      if (!onStart) { base.speak(text, options, handlers); return; }
      const original = synth.speak;
      const own = Object.prototype.hasOwnProperty.call(synth, 'speak');
      synth.speak = function (this: SpeechSynthesis, utterance: SpeechSynthesisUtterance) {
        utterance.addEventListener?.('start', onStart);
        return original.call(this, utterance);
      };
      try { base.speak(text, options, handlers); }
      finally { if (own) synth.speak = original; else delete (synth as { speak?: unknown }).speak; }
    },
  };
}
