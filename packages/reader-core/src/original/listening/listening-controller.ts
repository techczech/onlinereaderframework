import { emptySavedListening, listeningStorageKey, readSavedListening, safeRecordingSource, validListeningSpeed, validRecordingAlignment } from './listening-model.js';
import type { ListeningStorage, SavedListening } from './listening-model.js';
import type { ListeningBoundary, ListeningPanelProps, ListeningSnapshot, PublicationAudioAlignment, PublicationAudioTrack } from './listening-types.js';

type Configuration = Pick<ListeningPanelProps, 'bookId' | 'sections' | 'currentSectionId' | 'tracks'>;
interface ControllerOptions {
  createAudio?: () => HTMLAudioElement;
  storage?: () => ListeningStorage | undefined;
  onBoundary?: (boundary: ListeningBoundary | null) => void;
}

/** Instance-owned media; construction and native Node import never touch browser globals. */
export class ListeningController {
  private config: Configuration | null = null;
  private recordings = new Map<string, PublicationAudioTrack>();
  private saved: SavedListening = emptySavedListening();
  private audio: HTMLAudioElement | null = null;
  private removeListeners: (() => void) | null = null;
  private generation = 0;
  private attempt = 0;
  private mediaFailed = false;
  private metadataReady = false;
  private activeSource: string | null = null;
  private boundaryKey = '';
  private listeners = new Set<() => void>();
  private snapshot: ListeningSnapshot = {
    bookId: '', sectionId: '', status: 'missing', time: 0, duration: 0, speed: 1,
    requestedPlay: false, error: null, storageAvailable: true, recordedSectionIds: [], hasAlignment: false, followText: false,
  };
  constructor(private options: ControllerOptions = {}) {}
  getSnapshot = (): ListeningSnapshot => this.snapshot;
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener); return () => { this.listeners.delete(listener); };
  };
  private update(patch: Partial<ListeningSnapshot>): void {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach(listener => listener());
  }
  private storage(): ListeningStorage | undefined {
    return this.options.storage ? this.options.storage() : typeof window === 'undefined' ? undefined : window.localStorage;
  }
  private persist(): void {
    if (!this.config) return;
    if (this.audio && this.metadataReady && !this.mediaFailed && Number.isFinite(this.audio.currentTime)) {
      const time = Math.max(0, this.audio.currentTime);
      if (time !== this.snapshot.time) this.update({ time });
    }
    this.saved.sectionId = this.snapshot.sectionId;
    this.saved.speed = this.snapshot.speed;
    if (this.activeSource) this.saved.positions[this.snapshot.sectionId] = { src: this.activeSource, time: this.snapshot.time };
    try {
      const storage = this.storage();
      if (!storage) throw new Error('Storage unavailable');
      storage.setItem(listeningStorageKey(this.config.bookId), JSON.stringify(this.saved));
    } catch {
      if (this.snapshot.storageAvailable) this.update({ storageAvailable: false });
    }
  }
  configure(next: Configuration): void {
    const bookChanged = !this.config || this.config.bookId !== next.bookId;
    const sectionChanged = this.config?.currentSectionId !== next.currentSectionId;
    const oldSource = this.recordings.get(this.snapshot.sectionId)?.src;
    if (bookChanged) this.releaseAudio();
    this.config = next;
    this.recordings = new Map();
    const ids = new Set(next.sections.map(section => section.id));
    for (const track of next.tracks ?? []) {
      const src = safeRecordingSource(track.src);
      if (src && ids.has(track.sectionId) && !this.recordings.has(track.sectionId)) {
        this.recordings.set(track.sectionId, { ...track, src, alignment: validRecordingAlignment(track.alignment) });
      }
    }
    const recordedSectionIds = next.sections.filter(section => this.recordings.has(section.id)).map(section => section.id);
    if (bookChanged) {
      let storageAvailable = true;
      this.saved = emptySavedListening();
      try {
        const storage = this.storage();
        if (!storage) throw new Error('Storage unavailable');
        this.saved = readSavedListening(storage.getItem(listeningStorageKey(next.bookId)));
      } catch { storageAvailable = false; }
      const sectionId = this.recordings.has(this.saved.sectionId) ? this.saved.sectionId
        : ids.has(next.currentSectionId) ? next.currentSectionId : next.sections[0]?.id ?? '';
      this.update({ bookId: next.bookId, sectionId, speed: this.saved.speed, storageAvailable, recordedSectionIds, followText: false });
      this.loadSection(sectionId);
    } else {
      this.update({ recordedSectionIds });
      const sectionId = sectionChanged ? next.currentSectionId
        : ids.has(this.snapshot.sectionId) ? this.snapshot.sectionId : next.sections[0]?.id ?? '';
      if (sectionId !== this.snapshot.sectionId || oldSource !== this.recordings.get(sectionId)?.src) {
        this.loadSection(sectionId);
      } else {
        this.update({ hasAlignment: this.alignment().length > 0 }); this.emitBoundary();
      }
    }
  }
  private releaseAudio(): void {
    this.persist();
    this.generation++; this.attempt++;
    this.removeListeners?.(); this.removeListeners = null;
    const audio = this.audio; this.audio = null; this.metadataReady = false; this.activeSource = null;
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    this.clearBoundary();
  }
  private loadSection(sectionId: string): void {
    this.releaseAudio();
    const track = this.recordings.get(sectionId);
    const position = this.saved.positions[sectionId];
    const time = track && position?.src === track.src ? position.time : 0;
    this.mediaFailed = false; this.activeSource = track?.src ?? null;
    this.update({ sectionId, time, duration: 0, status: track ? 'loading' : 'missing', requestedPlay: false, error: null, hasAlignment: false });
    this.persist();
    if (!track) return;
    const generation = this.generation;
    try {
      const audio = (this.options.createAudio ?? (() => new Audio()))();
      this.audio = audio; audio.preload = 'metadata'; audio.playbackRate = this.snapshot.speed;
      const valid = () => this.audio === audio && this.generation === generation;
      const registrations: [string, EventListener][] = [];
      const on = (event: string, callback: () => void) => {
        const guarded = () => { if (valid()) callback(); };
        audio.addEventListener(event, guarded); registrations.push([event, guarded]);
      };
      this.removeListeners = () => registrations.forEach(([event, callback]) => audio.removeEventListener(event, callback));
      const ready = () => {
        if (this.mediaFailed) return;
        const duration = Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0;
        this.metadataReady = true;
        audio.currentTime = duration ? Math.min(this.snapshot.time, duration) : this.snapshot.time;
        audio.playbackRate = this.snapshot.speed;
        this.update({ duration, time: audio.currentTime, status: this.snapshot.requestedPlay ? 'loading' : 'paused' });
        this.update({ hasAlignment: this.alignment().length > 0 });
        this.persist(); this.emitBoundary();
        if (this.snapshot.requestedPlay) void this.requestPlay(audio);
      };
      on('loadedmetadata', ready);
      on('durationchange', () => {
        if (!this.metadataReady) return;
        this.update({ duration: Number.isFinite(audio.duration) && audio.duration > 0 ? audio.duration : 0 });
        this.update({ hasAlignment: this.alignment().length > 0 }); this.emitBoundary();
      });
      on('timeupdate', () => {
        if (!this.metadataReady || this.mediaFailed) return;
        if (Number.isFinite(audio.currentTime)) this.update({ time: Math.max(0, audio.currentTime) });
        this.persist(); this.emitBoundary();
      });
      on('playing', () => {
        if (this.mediaFailed || !this.snapshot.requestedPlay) { audio.pause(); return; }
        this.update({ status: 'playing', error: null });
      });
      on('pause', () => {
        if (!audio.paused || this.snapshot.status === 'error' || this.snapshot.status === 'ended') return;
        this.attempt++; this.update({ requestedPlay: false, status: this.metadataReady ? 'paused' : 'loading' }); this.persist();
      });
      on('waiting', () => { if (this.snapshot.requestedPlay) this.update({ status: 'loading' }); });
      on('stalled', () => { if (this.snapshot.requestedPlay) this.update({ status: 'loading' }); });
      on('ended', () => {
        this.attempt++;
        this.update({ status: 'ended', requestedPlay: false, time: this.snapshot.duration || this.snapshot.time });
        this.persist(); this.clearBoundary();
      });
      on('error', () => { this.mediaFailed = true; this.fail('The recording could not be loaded. Check the connection, then try Play again.'); });
      audio.src = track.src; audio.load();
    } catch { this.mediaFailed = true; this.fail('The recording could not be loaded. Try Play again.'); }
  }
  selectSection(sectionId: string): void {
    if (sectionId === this.snapshot.sectionId) return;
    this.loadSection(sectionId);
  }
  adjacentSection(direction: -1 | 1): string | null {
    const sections = this.config?.sections ?? [];
    const index = sections.findIndex(section => section.id === this.snapshot.sectionId);
    for (let i = index + direction; i >= 0 && i < sections.length; i += direction) {
      if (this.recordings.has(sections[i].id)) return sections[i].id;
    }
    return null;
  }
  async play(): Promise<void> {
    if (!this.recordings.has(this.snapshot.sectionId)) return;
    if (this.mediaFailed) this.loadSection(this.snapshot.sectionId);
    if (!this.audio || this.mediaFailed) return;
    if (this.snapshot.status === 'ended') this.seek(0);
    this.update({ requestedPlay: true, error: null, status: 'loading' });
    if (this.metadataReady) await this.requestPlay(this.audio);
  }
  private async requestPlay(audio: HTMLAudioElement): Promise<void> {
    const generation = this.generation, attempt = ++this.attempt;
    try {
      await audio.play();
      if (generation !== this.generation || this.audio !== audio) audio.pause();
      else if (attempt === this.attempt && !this.snapshot.requestedPlay) audio.pause();
    } catch {
      if (generation === this.generation && attempt === this.attempt && this.audio === audio) {
        this.fail('Playback could not start. Press Play to try again.');
      }
    }
  }
  pause(): void {
    this.attempt++;
    this.update({ requestedPlay: false, status: this.snapshot.status === 'playing' || this.snapshot.status === 'loading' && this.metadataReady ? 'paused' : this.snapshot.status });
    this.audio?.pause(); this.persist();
  }
  seek(time: number): void {
    if (!Number.isFinite(time) || !this.audio || !this.metadataReady || this.mediaFailed) return;
    const target = Math.max(0, Math.min(time, this.snapshot.duration || Number.MAX_SAFE_INTEGER));
    try { this.audio.currentTime = target; }
    catch { this.fail('The recording could not seek to this position. Try Play again.'); return; }
    this.update({ time: target, status: this.snapshot.status === 'ended' ? 'paused' : this.snapshot.status });
    this.persist(); this.emitBoundary();
  }
  skip(seconds: number): void { this.seek(this.snapshot.time + seconds); }
  setSpeed(speed: number): void {
    const valid = validListeningSpeed(speed);
    if (this.audio) this.audio.playbackRate = valid;
    this.update({ speed: valid }); this.persist();
  }
  private alignment(): readonly PublicationAudioAlignment[] {
    const points = this.recordings.get(this.snapshot.sectionId)?.alignment ?? [];
    return this.snapshot.duration > 0 && points.every(point => point.end <= this.snapshot.duration) ? points : [];
  }
  passageTime(direction: -1 | 1): number | null {
    const points = this.alignment();
    if (direction === 1) return points.find(point => point.start > this.snapshot.time)?.start ?? null;
    return [...points].reverse().find(point => point.start < this.snapshot.time)?.start ?? null;
  }
  setFollowText(enabled: boolean): void { this.update({ followText: enabled }); this.emitBoundary(); }
  private emitBoundary(): void {
    const point = this.snapshot.followText && this.snapshot.status !== 'error' && this.snapshot.status !== 'ended'
      ? this.alignment().find(point => this.snapshot.time >= point.start && this.snapshot.time < point.end) : undefined;
    if (!point) { this.clearBoundary(); return; }
    const boundary: ListeningBoundary = { sectionId: this.snapshot.sectionId, charStart: point.charStart, charEnd: point.charEnd };
    const key = JSON.stringify(boundary);
    if (key !== this.boundaryKey) { this.boundaryKey = key; this.options.onBoundary?.(boundary); }
  }
  private clearBoundary(): void {
    if (this.boundaryKey) { this.boundaryKey = ''; this.options.onBoundary?.(null); }
  }
  private fail(error: string): void {
    this.attempt++;
    this.update({ status: 'error', error, requestedPlay: false });
    this.audio?.pause(); this.clearBoundary(); this.persist();
  }
  dispose(): void { this.releaseAudio(); this.config = null; }
}
