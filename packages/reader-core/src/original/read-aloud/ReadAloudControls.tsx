import React, { forwardRef } from 'react';
import type { SpeechVoice } from './flex-speech.js';
import type { ReadAloudSnapshot } from './read-aloud-controller.js';
import type { ReadAloudActions } from './use-read-aloud.js';
import { Switch } from '../toolbar/controls.js';

export const READ_ALOUD_SPEEDS = [0.7, 0.8, 0.9, 1, 1.1, 1.2, 1.3, 1.5, 1.8, 2] as const;
const speedLabel = (rate: number) => `${rate.toFixed(1)}×`;

/** Plain statement of what read-aloud is doing or why it is not. */
export function readAloudStatusText(snapshot: ReadAloudSnapshot | null, isHome: boolean): string {
  if (isHome || !snapshot) return 'Open a chapter to read it aloud.';
  if (!snapshot.available) return 'This browser cannot read aloud. The recorded audiobook, if the book has one, still works.';
  if (snapshot.problem) return snapshot.problem;
  if (snapshot.status === 'speaking') return `Reading aloud with ${snapshot.voiceName}.`;
  if (snapshot.status === 'paused') return 'Paused. Resume continues from this sentence.';
  return 'Starts at the first paragraph in view. Key A starts and pauses.';
}

function voiceLabel(voice: SpeechVoice): string {
  return `${voice.name} (${voice.lang || 'language unknown'})${voice.default ? ', system default' : ''}`;
}

/** Voice and speed choices: the voices the browser really reports, grouped by whether they match the book's language. */
export function ReadAloudVoiceControls({ snapshot, actions, language }: { snapshot: ReadAloudSnapshot; actions: ReadAloudActions; language?: string }) {
  const primary = (language ?? '').toLowerCase().split('-')[0];
  const matches = (voice: SpeechVoice) => !!primary && voice.lang.toLowerCase().split(/[-_]/)[0] === primary;
  const matching = snapshot.voices.filter(matches);
  const others = snapshot.voices.filter(voice => !matches(voice));
  const option = (voice: SpeechVoice) => <option key={voice.voiceURI} value={voice.voiceURI}>{voiceLabel(voice)}</option>;
  const empty = snapshot.voices.length === 0;
  return <>
    <div className="publication-menu-row publication-menu-field">
      <label htmlFor="publication-read-aloud-voice" className="publication-menu-row-text"><span>Voice</span></label>
      <select id="publication-read-aloud-voice" disabled={!snapshot.available || empty} value={snapshot.chosenVoiceURI ?? ''}
        onChange={event => actions.setVoice(event.target.value || null)}>
        <option value="">Automatic ({snapshot.voiceName})</option>
        {matching.length > 0 && <optgroup label="Matches this book's language">{matching.map(option)}</optgroup>}
        {others.length > 0 && (matching.length > 0 ? <optgroup label="Other voices">{others.map(option)}</optgroup> : others.map(option))}
      </select>
    </div>
    {snapshot.available && empty && <small className="publication-menu-note">{snapshot.voicesSettled
      ? 'The browser reports no voices of its own, so it will use its default voice.'
      : 'Waiting for the browser to list its voices…'}</small>}
    <div className="publication-menu-row publication-menu-field">
      <label htmlFor="publication-read-aloud-speed" className="publication-menu-row-text"><span>Speed</span></label>
      <select id="publication-read-aloud-speed" disabled={!snapshot.available} value={snapshot.rate.toFixed(1)}
        onChange={event => actions.setRate(Number(event.target.value))}>
        {READ_ALOUD_SPEEDS.map(rate => <option key={rate} value={rate.toFixed(1)}>{speedLabel(rate)}</option>)}
      </select>
    </div>
    <Switch label="Keep the sentence in view" checked={snapshot.follow} onChange={actions.setFollow}
      hint="Scrolls to follow the reading, never while you select text or use a field." />
  </>;
}

/** The compact transport that stays outside the article while reading, so the text is never covered. */
export const ReadAloudTransport = forwardRef<HTMLButtonElement, { snapshot: ReadAloudSnapshot; actions: ReadAloudActions; onOpenSettings(trigger: HTMLElement): void }>(
  function ReadAloudTransport({ snapshot, actions, onOpenSettings }, primary) {
    const active = snapshot.status !== 'idle';
    const detail = snapshot.paragraph ? ` · paragraph ${snapshot.paragraph} of ${snapshot.paragraphs}` : '';
    const text = snapshot.problem ?? (snapshot.status === 'paused' ? `Paused${detail}` : `Reading aloud with ${snapshot.voiceName}${detail}`);
    const skip = (label: string, icon: string, unit: 'sentence' | 'paragraph', direction: 1 | -1) =>
      <button type="button" aria-label={label} title={label} onClick={() => actions.skip(unit, direction)}><span aria-hidden="true" className="material-symbols-outlined">{icon}</span></button>;
    return <div className="publication-read-aloud-dock" role="group" aria-label="Read aloud" data-state={active ? snapshot.status : 'problem'}>
      <span aria-hidden="true" className="material-symbols-outlined publication-read-aloud-mark">{active ? 'record_voice_over' : 'voice_over_off'}</span>
      <p role="status" className="publication-read-aloud-status">{text}</p>
      <span className="publication-read-aloud-buttons">
        {active ? <>
          {skip('Previous paragraph', 'skip_previous', 'paragraph', -1)}
          {skip('Previous sentence', 'fast_rewind', 'sentence', -1)}
          <button type="button" ref={primary} data-dock-primary="" aria-label={snapshot.status === 'speaking' ? 'Pause reading aloud' : 'Resume reading aloud'} title={snapshot.status === 'speaking' ? 'Pause' : 'Resume'}
            onClick={() => snapshot.status === 'speaking' ? actions.pause() : actions.resume()}>
            <span aria-hidden="true" className="material-symbols-outlined">{snapshot.status === 'speaking' ? 'pause' : 'play_arrow'}</span></button>
          {skip('Next sentence', 'fast_forward', 'sentence', 1)}
          {skip('Next paragraph', 'skip_next', 'paragraph', 1)}
          <button type="button" aria-label="Stop reading aloud" title="Stop" onClick={actions.stop}><span aria-hidden="true" className="material-symbols-outlined">stop</span></button>
        </> : <button type="button" ref={primary} data-dock-primary="" aria-label="Try reading aloud again" title="Try again" onClick={actions.start}>
          <span aria-hidden="true" className="material-symbols-outlined">replay</span></button>}
        <button type="button" aria-label="Voice and speed" title="Voice and speed" onClick={event => onOpenSettings(event.currentTarget)}>
          <span aria-hidden="true" className="material-symbols-outlined">tune</span></button>
      </span>
    </div>;
  });
