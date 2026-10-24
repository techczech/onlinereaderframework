import React, { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { ListeningController } from './listening-controller.js';
import { LISTENING_SPEEDS, listeningTime } from './listening-model.js';
import type { ListeningPanelProps } from './listening-types.js';

/** Keep mounted outside the article/layout subtree; hiding the parent preserves playback. */
export function ListeningPanel(props: ListeningPanelProps): React.ReactElement {
  const boundaryCallback = useRef(props.onBoundary);
  boundaryCallback.current = props.onBoundary;
  const [controller] = useState(() => new ListeningController({ onBoundary: boundary => boundaryCallback.current?.(boundary) }));
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot);
  const id = useId();
  const panel = useRef<HTMLElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<HTMLElement | null | undefined>(undefined);
  useEffect(() => {
    controller.configure({ bookId: props.bookId, sections: props.sections, currentSectionId: props.currentSectionId, tracks: props.tracks });
  }, [controller, props.bookId, props.sections, props.currentSectionId, props.tracks]);
  useEffect(() => {
    if (opener.current === undefined) opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    closeButton.current?.focus();
    const onPageHide = () => controller.pause();
    window.addEventListener('pagehide', onPageHide);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      controller.dispose();
      if (panel.current?.contains(document.activeElement)) opener.current?.focus();
    };
  }, [controller]);
  useEffect(() => {
    if (props.pauseSignal !== undefined) controller.pause();
  }, [controller, props.pauseSignal]);
  const play = () => {
    props.onPlaybackStart?.();
    void controller.play();
  };
  const close = () => {
    props.onClose();
    queueMicrotask(() => {
      const focusInside = panel.current?.contains(document.activeElement);
      if ((focusInside || document.activeElement === document.body) && opener.current?.isConnected) opener.current.focus();
    });
  };
  const select = (sectionId: string) => {
    controller.selectSection(sectionId); props.onSelectSection(sectionId);
  };
  const previous = controller.adjacentSection(-1), next = controller.adjacentSection(1);
  const previousPassage = controller.passageTime(-1), nextPassage = controller.passageTime(1);
  const hasTrack = state.recordedSectionIds.includes(state.sectionId);
  const seekable = hasTrack && state.duration > 0 && state.status !== 'error';
  const section = props.sections.find(section => section.id === state.sectionId);
  const track = props.tracks?.find(track => track.sectionId === state.sectionId);
  const status = state.status === 'loading' ? 'Loading recording…' : state.status === 'playing' ? 'Playing'
    : state.status === 'ended' ? 'Recording ended' : state.status === 'paused' ? 'Paused' : '';
  return (
    <section ref={panel} className="reader-listening-panel" role="region" aria-labelledby={`${id}-title`}
      onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(); } }}>
      <header>
        <h2 id={`${id}-title`}>Recorded audiobook</h2>
        <button type="button" ref={closeButton} aria-label="Close recorded audiobook" onClick={close}>Close</button>
      </header>
      {!state.recordedSectionIds.length ? <p>No recording for this book yet</p> : <>
        <label className="listening-chapter" htmlFor={`${id}-chapter`}>Recorded chapter
          <select id={`${id}-chapter`} value={state.sectionId} onChange={event => select(event.target.value)}>
            {!props.sections.some(section => section.id === state.sectionId) && <option value={state.sectionId}>Choose a chapter</option>}
            {props.sections.map(section => <option key={section.id} value={section.id}>{section.title}{state.recordedSectionIds.includes(section.id) ? '' : ' — no recording'}</option>)}
          </select>
        </label>
        {track?.label && hasTrack && <p>{track.label}</p>}
        {!hasTrack && <p>No recording for this chapter.</p>}
        <div className="listening-row" role="group" aria-label="Recorded chapter controls">
          <button type="button" disabled={!previous} onClick={() => previous && select(previous)}>Previous recorded chapter</button>
          <button type="button" disabled={!hasTrack} aria-label={state.requestedPlay ? 'Pause recording' : 'Play recording'}
            onClick={() => state.requestedPlay ? controller.pause() : play()}>{state.requestedPlay ? 'Pause' : 'Play'}</button>
          <button type="button" disabled={!next} onClick={() => next && select(next)}>Next recorded chapter</button>
        </div>
        <div className="listening-row" role="group" aria-label="Recording time controls">
          <button type="button" disabled={!seekable} onClick={() => controller.skip(-15)}>Back 15 seconds</button>
          <button type="button" disabled={!seekable} onClick={() => controller.skip(15)}>Forward 15 seconds</button>
        </div>
        <label htmlFor={`${id}-seek`}>Recording position{section ? ` — ${section.title}` : ''}</label>
        <input className="listening-seek" id={`${id}-seek`} type="range" min={0} max={state.duration || 1} step={0.1}
          value={Math.min(state.time, state.duration || 0)} disabled={!seekable}
          aria-valuetext={`${listeningTime(state.time)} of ${listeningTime(state.duration)}`}
          onChange={event => controller.seek(Number(event.target.value))} />
        <p aria-hidden="true">{listeningTime(state.time)} / {listeningTime(state.duration)}</p>
        <label htmlFor={`${id}-speed`}>Playback speed </label>
        <select id={`${id}-speed`} value={state.speed} onChange={event => controller.setSpeed(Number(event.target.value))}>
          {LISTENING_SPEEDS.map(speed => <option key={speed} value={speed}>{speed}×</option>)}
        </select>
        {state.hasAlignment && <>
          <div className="listening-row" role="group" aria-label="Measured passage controls">
            <button type="button" disabled={!seekable || previousPassage === null} onClick={() => previousPassage !== null && controller.seek(previousPassage)}>Previous passage</button>
            <button type="button" disabled={!seekable || nextPassage === null} onClick={() => nextPassage !== null && controller.seek(nextPassage)}>Next passage</button>
          </div>
          {props.onBoundary && <label><input type="checkbox" checked={state.followText} onChange={event => controller.setFollowText(event.target.checked)} /> Follow text</label>}
        </>}
        <p role="status" aria-live="polite">{status}</p>
        {state.error && <p role="alert">{state.error}</p>}
      </>}
      {!state.storageAvailable && <p role="status">Listening progress cannot be saved in this browser. Playback still works.</p>}
    </section>
  );
}
