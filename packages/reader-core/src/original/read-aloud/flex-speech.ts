export interface SpeechVoice {
  default: boolean;
  lang: string;
  name: string;
  voiceURI: string;
  localService?: boolean;
}

export const KOKORO_VOICES = ["alloy", "liam", "fable", "heart", "adam", "emma", "czech"] as const;
export type KokoroVoice = (typeof KOKORO_VOICES)[number];

export interface RenderedAlignmentPoint {
  from: number;
  to: number;
  start: number;
  end: number;
}

export type RenderedAlignmentCoordinateSystem = "body";

export interface RenderedAlignmentOrigin {
  coordinateSystem: RenderedAlignmentCoordinateSystem;
  readingSurfaceOffset: number;
}

export interface RenderedAlignment {
  origin: RenderedAlignmentOrigin;
  points: RenderedAlignmentPoint[];
}

export interface RenderedAudiobook {
  audioUrl: string;
  alignment: RenderedAlignment;
  bundleHash: string;
  createdAt: string;
  engine: string;
  modelRevision: string;
  voice: KokoroVoice;
  rate: number;
}

export interface SpeechHandlers {
  onBoundary(charIndex: number): void;
  onEnd(): void;
  onError(error: string): void;
}

/** The live speech half of the host seam. Rendered audio can implement the same player contract later. */
export interface SpeechCapabilities {
  /** Rendered audiobook adapters use "rendered" and publish aligned boundaries through the same handlers. */
  sourceKind: "live" | "rendered";
  cancel(): void;
  pause(): void;
  resume(): void;
  setRate(rate: number): void;
  seekToSourceOffset?(offset: number): void;
  speak(
    text: string,
    options: { delivery: SpokenSegment["kind"]; rate: number; voiceURI: string | null },
    handlers: SpeechHandlers,
  ): void;
  voices(): SpeechVoice[];
}

export function premiumSpeechVoices(voices: readonly SpeechVoice[]): SpeechVoice[] {
  return voices.filter((voice) => {
    const marker = /\((?:Premium|Enhanced)\)/iu.test(voice.name);
    const uriMarker = /(?:premium|enhanced)/iu.test(voice.voiceURI);
    // Chromium exposes macOS premium/enhanced voices as local services. A
    // marker is still required because localService alone also covers basic voices.
    return marker || (uriMarker && voice.localService === true);
  }).map((voice) => ({ ...voice }));
}

export function renderedAudioIsStale(
  recording: Pick<RenderedAudiobook, "bundleHash">,
  current: Pick<RenderedAudiobook, "bundleHash">,
): boolean {
  return recording.bundleHash !== current.bundleHash;
}

export function renderedOffsetBoundary(alignment: RenderedAlignment): {
  readingOffsetAtTime(time: number): number | null;
  timeAtReadingOffset(offset: number): number | null;
} {
  const alignmentOffsetAtTime = (time: number): number | null => {
    const point = alignment.points.find((candidate) => time >= candidate.start && time < candidate.end);
    if (!point) return null;
    const ratio = (time - point.start) / Math.max(0.001, point.end - point.start);
    return Math.min(point.to, point.from + Math.floor((point.to - point.from) * ratio));
  };
  const alignmentOffsetForReadingOffset = (offset: number): number =>
    offset - alignment.origin.readingSurfaceOffset;
  const readingOffsetForAlignmentOffset = (offset: number): number =>
    alignment.origin.readingSurfaceOffset + offset;

  return {
    readingOffsetAtTime(time) {
      const offset = alignmentOffsetAtTime(time);
      return offset === null ? null : readingOffsetForAlignmentOffset(offset);
    },
    timeAtReadingOffset(offset) {
      const alignmentOffset = alignmentOffsetForReadingOffset(offset);
      const point = alignment.points.find((candidate) =>
        alignmentOffset >= candidate.from && alignmentOffset < candidate.to);
      return point?.start ?? null;
    },
  };
}

export interface SpokenPiece {
  sourceFrom: number | null;
  sourceTo: number | null;
  spokenFrom: number;
  spokenTo: number;
}

export interface SpokenSegment {
  blockId: string;
  kind: "announcement" | "heading" | "paragraph";
  sourceFrom: number | null;
  sourceTo: number | null;
  spokenFrom: number;
  spokenTo: number;
}

export interface Speakable {
  pieces?: SpokenPiece[];
  segments: SpokenSegment[];
  text: string;
}

export interface SpokenRange {
  from: number;
  to: number;
}

export interface SpeechPlayerState {
  activeBlockId: string | null;
  activeIndex: number | null;
  activeSentence: SpokenRange | null;
  rate: number;
  sourceOffset: number | null;
  status: "idle" | "paused" | "speaking";
  voiceURI: string | null;
}

export interface SpeechPlayer {
  load(speakable: Speakable): void;
  moveTo(sourceOffset: number): void;
  pause(): void;
  playFrom(sourceOffset: number): void;
  restoreAt(sourceOffset: number, status: "paused" | "speaking"): void;
  resume(): void;
  setRate(rate: number): void;
  setVoice(voiceURI: string | null): void;
  skipParagraph(direction: 1 | -1): void;
  skipSentence(direction: 1 | -1): void;
  state(): SpeechPlayerState;
  stop(): void;
}

export const MIN_SPEECH_RATE = 0.5;
export const MAX_SPEECH_RATE = 2.5;
export const SPEECH_RATE_STEP = 0.1;

const TERMINATORS = new Set([".", "!", "?", "…"]);
const CLOSERS = new Set(["”", "’", "\"", "'", ")", "]"]);
const ABBREVIATIONS = new Set([
  "e.g", "i.e", "etc", "cf", "vs", "viz", "ca", "al", "et al",
  "dr", "prof", "mr", "mrs", "ms", "st", "rev", "jr", "sr",
  "fig", "no", "vol", "ch", "p", "pp", "ed", "eds",
]);

function tokenBefore(text: string, position: number): string {
  let start = position;
  while (start > 0 && /[\p{L}.]/u.test(text[start - 1]!)) start--;
  return text.slice(start, position).replace(/^\.+/, "");
}

/** Prose-aware segmentation lifted into the shared speech package. */
export function segmentSentences(text: string, from = 0): SpokenRange[] {
  const sentences: SpokenRange[] = [];
  let start = 0;
  while (start < text.length && /\s/u.test(text[start]!)) start++;
  let index = start;
  while (index < text.length) {
    if (!TERMINATORS.has(text[index]!)) {
      index++;
      continue;
    }
    let runEnd = index + 1;
    while (runEnd < text.length && TERMINATORS.has(text[runEnd]!)) runEnd++;
    let end = runEnd;
    while (end < text.length && CLOSERS.has(text[end]!)) end++;
    let next = end;
    while (next < text.length && /\s/u.test(text[next]!)) next++;
    const atEnd = end >= text.length;
    const opensNext = next < text.length && /[\p{Lu}\p{N}“‘"'(\[]/u.test(text[next]!);
    const token = tokenBefore(text, index);
    const abbreviation = ABBREVIATIONS.has(token.toLocaleLowerCase("en"));
    const initial = token.length === 1 && /\p{Lu}/u.test(token);
    const decimal = index > 0 && /\d/u.test(text[index - 1]!)
      && runEnd < text.length && /\d/u.test(text[runEnd]!);
    if ((atEnd || (next > end && opensNext)) && !abbreviation && !initial && !decimal) {
      if (end > start) sentences.push({ from: start + from, to: end + from });
      start = next;
      index = next;
    } else {
      index = Math.max(index + 1, end);
    }
  }
  let tail = text.length;
  while (tail > start && /\s/u.test(text[tail - 1]!)) tail--;
  if (tail > start) sentences.push({ from: start + from, to: tail + from });
  return sentences;
}

export function normaliseSpeechRate(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) return 1;
  return Math.max(MIN_SPEECH_RATE, Math.min(
    MAX_SPEECH_RATE,
    Math.round(numeric * 10) / 10,
  ));
}

export function chooseInstalledVoice(
  voices: readonly SpeechVoice[],
  savedVoiceURI: string | null,
): { name: string; voiceURI: string | null } {
  const saved = savedVoiceURI
    ? voices.find((voice) => voice.voiceURI === savedVoiceURI)
    : undefined;
  if (saved) return { name: saved.name, voiceURI: saved.voiceURI };
  const premium = premiumSpeechVoices(voices)[0];
  if (premium) return { name: premium.name, voiceURI: premium.voiceURI };
  const systemDefault = voices.find((voice) => voice.default) ?? voices[0];
  return systemDefault
    ? { name: systemDefault.name, voiceURI: systemDefault.voiceURI }
    : { name: "System voice", voiceURI: null };
}

function sourceOffsetAt(speakable: Speakable, spokenOffset: number): number | null {
  for (const piece of speakable.pieces ?? []) {
    if (spokenOffset < piece.spokenFrom || spokenOffset >= piece.spokenTo) continue;
    if (piece.sourceFrom === null || piece.sourceTo === null) return null;
    return Math.min(piece.sourceTo, piece.sourceFrom + spokenOffset - piece.spokenFrom);
  }
  const segment = speakable.segments.find(
    (candidate) => spokenOffset >= candidate.spokenFrom && spokenOffset < candidate.spokenTo,
  );
  if (!segment || segment.sourceFrom === null || segment.sourceTo === null) return null;
  return Math.min(segment.sourceTo, segment.sourceFrom + spokenOffset - segment.spokenFrom);
}

function sourceRangeForSentence(speakable: Speakable, sentence: SpokenRange): SpokenRange | null {
  let from: number | null = null;
  let to: number | null = null;
  for (let offset = sentence.from; offset < sentence.to; offset++) {
    const mapped = sourceOffsetAt(speakable, offset);
    if (mapped === null) continue;
    from ??= mapped;
    to = mapped + 1;
  }
  return from === null || to === null ? null : { from, to };
}

interface PreparedSentence {
  segmentIndex: number;
  spoken: SpokenRange;
  source: SpokenRange | null;
}

function sentencesForSegment(speakable: Speakable, segmentIndex: number): PreparedSentence[] {
  const segment = speakable.segments[segmentIndex];
  if (!segment) return [];
  return segmentSentences(
    speakable.text.slice(segment.spokenFrom, segment.spokenTo),
    segment.spokenFrom,
  ).map((spoken) => ({
    segmentIndex,
    source: sourceRangeForSentence(speakable, spoken),
    spoken,
  }));
}

function allSentences(speakable: Speakable): PreparedSentence[] {
  return speakable.segments.flatMap((_segment, index) => sentencesForSegment(speakable, index));
}

export function createSpeechPlayer(
  capability: SpeechCapabilities,
  onState: (state: SpeechPlayerState) => void,
  onFinish: () => void = () => {},
  initialRate?: number,
): SpeechPlayer {
  let speakable: Speakable | null = null;
  let sentences: PreparedSentence[] = [];
  let activeIndex = -1;
  let deliberateCancellation = false;
  let relocatedWhilePaused = false;
  let current: SpeechPlayerState = {
    activeBlockId: null,
    activeIndex: null,
    activeSentence: null,
    rate: normaliseSpeechRate(initialRate ?? 1),
    sourceOffset: null,
    status: "idle",
    voiceURI: null,
  };
  if (initialRate !== undefined) capability.setRate(current.rate);

  const publish = (): void => onState({
    ...current,
    activeSentence: current.activeSentence ? { ...current.activeSentence } : null,
  });

  const setActiveState = (sentence: PreparedSentence, status: "paused" | "speaking"): void => {
    const segment = speakable!.segments[sentence.segmentIndex]!;
    current = {
      ...current,
      activeBlockId: segment.blockId,
      activeIndex,
      activeSentence: sentence.source,
      sourceOffset: sentence.source?.from ?? current.sourceOffset,
      status,
    };
    publish();
  };

  const speakActive = (exactSourceOffset?: number): void => {
    if (!speakable || activeIndex < 0 || activeIndex >= sentences.length) return;
    const sentence = sentences[activeIndex]!;
    const segment = speakable.segments[sentence.segmentIndex]!;
    setActiveState(sentence, "speaking");
    if (exactSourceOffset !== undefined) {
      current = { ...current, sourceOffset: exactSourceOffset };
      publish();
    }
    const spokenText = capability.sourceKind === "rendered"
      ? speakable.text
      : speakable.text.slice(sentence.spoken.from, sentence.spoken.to);
    const playbackIndex = activeIndex;
    capability.speak(spokenText, {
      delivery: segment.kind,
      rate: current.rate,
      voiceURI: current.voiceURI,
    }, {
      onBoundary(charIndex) {
        if (!speakable || (capability.sourceKind !== "rendered" && activeIndex !== playbackIndex)) return;
        const sourceOffset = capability.sourceKind === "rendered"
          ? charIndex
          : sourceOffsetAt(speakable, sentence.spoken.from + charIndex);
        if (sourceOffset !== null) current = { ...current, sourceOffset };
        if (capability.sourceKind === "rendered" && sourceOffset !== null) {
          const nextActiveIndex = sentences.findIndex((candidate) => candidate.source
            && sourceOffset >= candidate.source.from
            && sourceOffset < candidate.source.to);
          const active = sentences[nextActiveIndex];
          if (active) {
            activeIndex = nextActiveIndex;
            current = {
              ...current,
              activeBlockId: speakable.segments[active.segmentIndex]!.blockId,
              activeIndex,
              activeSentence: active.source,
            };
          }
        }
        publish();
      },
      onEnd() {
        if (capability.sourceKind !== "rendered" && activeIndex !== playbackIndex) return;
        if (capability.sourceKind === "rendered") {
          current = { ...current, status: "idle" };
          publish();
          onFinish();
          return;
        }
        if (activeIndex + 1 >= sentences.length) {
          current = { ...current, status: "idle" };
          publish();
          onFinish();
          return;
        }
        activeIndex++;
        speakActive();
      },
      onError(error) {
        if (deliberateCancellation && /^(?:canceled|interrupted)$/u.test(error)) {
          deliberateCancellation = false;
          return;
        }
        if (activeIndex !== playbackIndex) return;
        current = { ...current, status: "idle" };
        publish();
      },
    });
    if (capability.sourceKind === "rendered" && sentence.source) {
      capability.seekToSourceOffset?.(exactSourceOffset ?? sentence.source.from);
    }
  };

  const restartAt = (index: number, exactSourceOffset?: number): void => {
    if (!speakable || sentences.length === 0) return;
    deliberateCancellation = true;
    capability.cancel();
    activeIndex = Math.max(0, Math.min(sentences.length - 1, index));
    relocatedWhilePaused = false;
    speakActive(exactSourceOffset);
  };

  const sentenceIndexAt = (sourceOffset: number): number => {
    const containing = sentences.findIndex((sentence) =>
      sentence.source && sourceOffset >= sentence.source.from && sourceOffset < sentence.source.to);
    const following = sentences.findIndex((sentence) =>
      sentence.source && sentence.source.from >= sourceOffset);
    return containing >= 0 ? containing : following >= 0 ? following : sentences.length - 1;
  };

  return {
    load(next) {
      speakable = next;
      sentences = allSentences(next);
      activeIndex = -1;
      relocatedWhilePaused = false;
    },
    moveTo(sourceOffset) {
      if (!speakable || sentences.length === 0 || current.status === "idle") return;
      const target = sentenceIndexAt(sourceOffset);
      if (current.status === "speaking") {
        restartAt(target, capability.sourceKind === "rendered" ? sourceOffset : undefined);
        return;
      }
      deliberateCancellation = true;
      capability.cancel();
      activeIndex = target;
      relocatedWhilePaused = true;
      setActiveState(sentences[activeIndex]!, "paused");
    },
    pause() {
      if (current.status !== "speaking") return;
      capability.pause();
      current = { ...current, status: "paused" };
      publish();
    },
    playFrom(sourceOffset) {
      if (!speakable || sentences.length === 0) return;
      restartAt(
        sentenceIndexAt(sourceOffset),
        capability.sourceKind === "rendered" ? sourceOffset : undefined,
      );
    },
    restoreAt(sourceOffset, status) {
      if (!speakable || sentences.length === 0) return;
      deliberateCancellation = true;
      capability.cancel();
      activeIndex = sentenceIndexAt(sourceOffset);
      relocatedWhilePaused = false;
      speakActive(sourceOffset);
      if (status === "paused") {
        capability.pause();
        current = { ...current, status: "paused" };
        publish();
      }
    },
    resume() {
      if (current.status !== "paused") return;
      if (relocatedWhilePaused) {
        relocatedWhilePaused = false;
        speakActive();
        return;
      }
      capability.resume();
      current = { ...current, status: "speaking" };
      publish();
    },
    setRate(rate) {
      current = { ...current, rate: normaliseSpeechRate(rate) };
      capability.setRate(current.rate);
      publish();
    },
    setVoice(voiceURI) {
      if (voiceURI === current.voiceURI) return;
      current = { ...current, voiceURI };
      if (current.status !== "idle" && activeIndex >= 0) restartAt(activeIndex);
      else publish();
    },
    skipParagraph(direction) {
      if (!speakable || activeIndex < 0) return;
      const currentSegment = sentences[activeIndex]!.segmentIndex;
      const targetSegment = currentSegment + direction;
      let target = direction > 0
        ? sentences.findIndex((sentence) => sentence.segmentIndex >= targetSegment)
        : -1;
      if (direction < 0) {
        for (let index = sentences.length - 1; index >= 0; index--) {
          if (sentences[index]!.segmentIndex <= targetSegment) {
            target = index;
            break;
          }
        }
      }
      if (target >= 0) restartAt(target);
    },
    skipSentence(direction) {
      if (activeIndex < 0) return;
      const target = activeIndex + direction;
      if (target >= 0 && target < sentences.length) restartAt(target);
    },
    state: () => ({
      ...current,
      activeSentence: current.activeSentence ? { ...current.activeSentence } : null,
    }),
    stop() {
      deliberateCancellation = true;
      capability.cancel();
      current = { ...current, activeSentence: null, status: "idle" };
      publish();
    },
  };
}

export function webSpeechCapabilities(): SpeechCapabilities {
  const outstanding = new Set<SpeechSynthesisUtterance>();
  const synthesiser = (): SpeechSynthesis => {
    if (!globalThis.speechSynthesis) {
      throw new Error("System speech is unavailable in this host.");
    }
    return globalThis.speechSynthesis;
  };
  return {
    sourceKind: "live",
    cancel() {
      synthesiser().cancel();
      outstanding.clear();
    },
    pause: () => synthesiser().pause(),
    resume: () => synthesiser().resume(),
    setRate(rate) {
      const normal = normaliseSpeechRate(rate);
      for (const utterance of outstanding) utterance.rate = normal;
    },
    speak(text, options, handlers) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = normaliseSpeechRate(options.rate);
      utterance.pitch = options.delivery === "heading" ? 0.88 : 1;
      if (options.voiceURI) {
        utterance.voice = synthesiser().getVoices()
          .find((voice) => voice.voiceURI === options.voiceURI) ?? null;
      }
      outstanding.add(utterance);
      utterance.onboundary = (event) => handlers.onBoundary(event.charIndex);
      utterance.onend = () => {
        outstanding.delete(utterance);
        handlers.onEnd();
      };
      utterance.onerror = (event) => {
        outstanding.delete(utterance);
        handlers.onError(event.error);
      };
      synthesiser().speak(utterance);
    },
    voices: () => synthesiser().getVoices().map((voice) => ({
      default: voice.default,
      lang: voice.lang,
      name: voice.name,
      voiceURI: voice.voiceURI,
      localService: voice.localService,
    })),
  };
}

export function renderedSpeechCapabilities(
  audiobook: RenderedAudiobook,
  onTime: (time: number) => void = () => {},
): SpeechCapabilities {
  let audio: HTMLAudioElement | null = null;
  let handlers: SpeechHandlers | null = null;
  let rate = 1;
  const offsets = renderedOffsetBoundary(audiobook.alignment);
  const ensureAudio = (): HTMLAudioElement => {
    if (audio) return audio;
    audio = new Audio(audiobook.audioUrl);
    audio.preload = "auto";
    audio.ontimeupdate = () => {
      const time = audio?.currentTime ?? 0;
      onTime(time);
      const offset = offsets.readingOffsetAtTime(time);
      if (offset !== null) handlers?.onBoundary(offset);
    };
    audio.onended = () => handlers?.onEnd();
    audio.onerror = () => handlers?.onError("rendered-audio-error");
    return audio;
  };
  return {
    sourceKind: "rendered",
    cancel() {
      const current = audio;
      if (!current) return;
      current.pause();
      current.currentTime = 0;
      handlers = null;
    },
    pause: () => audio?.pause(),
    resume: () => { void audio?.play(); },
    setRate(next) {
      rate = normaliseSpeechRate(next);
      if (audio) audio.playbackRate = rate;
    },
    seekToSourceOffset(offset) {
      const time = offsets.timeAtReadingOffset(offset);
      if (time !== null && audio) audio.currentTime = time;
    },
    speak(_text, options, nextHandlers) {
      const current = ensureAudio();
      handlers = nextHandlers;
      current.playbackRate = rate = normaliseSpeechRate(options.rate);
      void current.play().catch(() => nextHandlers.onError("rendered-audio-playback-refused"));
    },
    voices: () => [],
  };
}

export function fakeSpeechCapabilities(
  installedVoices: SpeechVoice[] = [],
): SpeechCapabilities & {
  emitBoundary(charIndex: number): void;
  emitEnd(): void;
  emitError(error: string): void;
  spoken: Array<{ delivery: SpokenSegment["kind"]; rate: number; text: string; voiceURI: string | null }>;
} {
  const spoken: Array<{ delivery: SpokenSegment["kind"]; rate: number; text: string; voiceURI: string | null }> = [];
  let handlers: SpeechHandlers | null = null;
  return {
    sourceKind: "live",
    cancel() {
      const interrupted = handlers;
      handlers = null;
      interrupted?.onError("interrupted");
    },
    emitBoundary: (charIndex) => handlers?.onBoundary(charIndex),
    emitEnd() {
      const ending = handlers;
      handlers = null;
      ending?.onEnd();
    },
    emitError(error) {
      const failing = handlers;
      handlers = null;
      failing?.onError(error);
    },
    pause() {},
    resume() {},
    setRate() {},
    speak(text, options, nextHandlers) {
      spoken.push({ delivery: options.delivery, rate: options.rate, text, voiceURI: options.voiceURI });
      handlers = nextHandlers;
    },
    spoken,
    voices: () => [...installedVoices],
  };
}
