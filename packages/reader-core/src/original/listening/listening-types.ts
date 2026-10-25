/** Measured seconds and half-open UTF-16 offsets into the host's canonical rendered section text.
 * The host must adapt coordinates and verify that recording and rendered text match.
 * Raw Markdown/manuscript offsets are not accepted as equivalent coordinates.
 */
export interface PublicationAudioAlignment {
  start: number;
  end: number;
  charStart: number;
  charEnd: number;
}

export interface PublicationAudioTrack {
  sectionId: string;
  src: string;
  label?: string;
  alignment?: readonly PublicationAudioAlignment[];
}

export interface ListeningBoundary {
  sectionId: string;
  charStart: number;
  charEnd: number;
}

export interface ListeningPanelProps {
  bookId: string;
  sections: readonly { id: string; title: string }[];
  currentSectionId: string;
  onSelectSection(id: string): void;
  onClose(): void;
  tracks?: readonly PublicationAudioTrack[];
  /** Called only while Follow text is enabled; null clears the transient highlight. */
  onBoundary?(boundary: ListeningBoundary | null): void;
  /** Runs synchronously before user-requested Play/Resume, so the host can stop browser speech. */
  onPlaybackStart?(): void;
  /** Change this value to pause recorded playback before starting browser speech. */
  pauseSignal?: number;
  /** Hands the host a function that pauses recorded playback at once, for the moment before browser speech is submitted. Called with null on unmount. */
  registerPause?(pause: (() => void) | null): void;
}

export type ListeningStatus = 'missing' | 'loading' | 'paused' | 'playing' | 'ended' | 'error';
export interface ListeningSnapshot {
  bookId: string;
  sectionId: string;
  status: ListeningStatus;
  time: number;
  duration: number;
  speed: number;
  requestedPlay: boolean;
  error: string | null;
  storageAvailable: boolean;
  recordedSectionIds: readonly string[];
  hasAlignment: boolean;
  followText: boolean;
}
