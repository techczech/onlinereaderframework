import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DEFAULT_READING_PREFERENCES } from '../reading-support/reading-preferences.js';
import type { ReadingSupportController } from '../reading-support/index.js';
import { ChoiceGroup, Stepper, Switch } from './controls.js';
import {
  DIM_LEVELS, assistChanges, assistSummary, atLimit, dimLevel, formattingChanges, letterSpacingLabel, lineHeightLabel, stepValue,
  type FormattingState, type MaxWidthChoice, type ToolbarMenuId,
} from './toolbar-model.js';

export type SpeechState = 'idle' | 'speaking' | 'paused';

export interface ReaderToolbarProps {
  navigationLabel: string; navigationOpen: boolean; onToggleNavigation(): void;
  title: string; onHome(): void; isHome: boolean; listenLabel: string;
  support: ReadingSupportController;
  isDark: boolean; defaultDark: boolean; onDark(value: boolean): void;
  maxWidth: MaxWidthChoice; onMaxWidth(value: MaxWidthChoice): void;
  immersive: boolean; onImmersive(value: boolean): void;
  speech: SpeechState; speechAvailable: boolean; onToggleSpeech(): void; onStopSpeech(): void;
  hasRecordedAudio: boolean; onOpenRecordedAudio(trigger: HTMLElement | null): void;
  onOpenNotes(): void; onOpenShortcuts(): void;
}

const MENUS: { id: ToolbarMenuId; label: string; icon: string }[] = [
  { id: 'listen', label: 'Listen', icon: 'headphones' },
  { id: 'formatting', label: 'Formatting', icon: 'text_fields' },
  { id: 'assist', label: 'Assist', icon: 'eyeglasses' },
];
const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Listen, Formatting, Assist and Notes: four separate labelled controls. Menus are non-modal so text can still be selected. */
export function ReaderToolbar(props: ReaderToolbarProps) {
  const { support, speech } = props;
  const p = support.preferences;
  const [open, setOpen] = useState<ToolbarMenuId | null>(null);
  const actions = useRef<HTMLDivElement>(null);
  const buttons = useRef<Partial<Record<ToolbarMenuId, HTMLButtonElement | null>>>({});
  const panel = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef(false);
  const lastFocus = useRef<{ group: Element | null } | null>(null);
  const close = useCallback((returnFocus: boolean) => {
    setOpen(current => { if (current && returnFocus) buttons.current[current]?.focus(); return null; });
  }, []);

  // Opening moves focus into the menu once; later setting changes never move it.
  useEffect(() => {
    if (!open || !focusOnOpen.current) return;
    focusOnOpen.current = false;
    const visible = Array.from(panel.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []).filter(element => element.tabIndex >= 0 && element.getClientRects().length);
    (visible.find(element => element.matches('[aria-checked="true"]')) ?? visible.find(element => !element.closest('.publication-menu-sheet-head')) ?? visible[0])?.focus({ preventScroll: true });
  }, [open]);
  // An action that disables the button holding focus (Reset, a stepper at its limit) must not drop focus out of the menu.
  useEffect(() => {
    if (!open) { lastFocus.current = null; return; }
    const element = panel.current;
    if (!element) return;
    const remember = (event: FocusEvent) => { lastFocus.current = { group: (event.target as Element).closest('section, footer') }; };
    element.addEventListener('focusin', remember);
    return () => element.removeEventListener('focusin', remember);
  }, [open]);
  useEffect(() => {
    const element = panel.current;
    const active = document.activeElement;
    // Chromium leaves a button that has just become disabled as the active element, so that counts as lost focus too.
    if (!open || !element || !lastFocus.current || (element.contains(active) && !active?.matches(':disabled'))) return;
    const usable = (root: Element) => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(item => item.tabIndex >= 0 && item.getClientRects().length);
    const near = lastFocus.current.group && element.contains(lastFocus.current.group) ? usable(lastFocus.current.group) : [];
    const candidates = near.length ? near : usable(element).filter(item => !item.closest('.publication-menu-sheet-head'));
    (candidates.find(item => item.matches('[aria-checked="true"]')) ?? candidates[0])?.focus({ preventScroll: true });
  });
  // A press anywhere else, including in the text, closes the menu without taking focus or clearing a selection.
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!actions.current?.contains(event.target as Node)) setOpen(null); };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);

  const toggle = (id: ToolbarMenuId) => { focusOnOpen.current = open !== id; setOpen(open === id ? null : id); };
  const formatting: FormattingState = { dark: props.isDark, fontFamily: p.fontFamily, fontSize: p.fontSize, lineHeight: p.lineHeight, paragraphSpacing: p.paragraphSpacing, letterSpacing: p.letterSpacing, maxWidth: props.maxWidth };
  const d = DEFAULT_READING_PREFERENCES;
  const formattingDefaults: FormattingState = { dark: props.defaultDark, fontFamily: d.fontFamily, fontSize: d.fontSize, lineHeight: d.lineHeight, paragraphSpacing: d.paragraphSpacing, letterSpacing: d.letterSpacing, maxWidth: 'md' };
  const counts: Record<ToolbarMenuId, number> = {
    listen: 0, formatting: formattingChanges(formatting, formattingDefaults),
    assist: assistChanges({ focus: p.focus, overlay: p.overlay, immersive: props.immersive }),
  };
  const step = (key: 'fontSize' | 'lineHeight' | 'paragraphSpacing' | 'letterSpacing') => (direction: 1 | -1) => support.update({ [key]: stepValue(key, p[key], direction) });
  const stepper = (key: 'fontSize' | 'lineHeight' | 'paragraphSpacing' | 'letterSpacing', label: string, icon: string, text: string) =>
    <Stepper label={label} icon={icon} text={text} onStep={step(key)} minDisabled={atLimit(key, p[key], -1)} maxDisabled={atLimit(key, p[key], 1)} />;

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (!open) return;
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); close(true); return; }
    if (event.key !== 'Tab' || !panel.current?.contains(event.target as Node)) return;
    const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(element => element.tabIndex >= 0 && element.getClientRects().length);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  const level = dimLevel(p.dim);
  const speechText = speech === 'speaking' ? 'Reading this chapter aloud.' : speech === 'paused' ? 'Browser read-aloud is paused.' : null;

  return <header className="publication-toolbar">
    <button className="publication-navigation-toggle" onClick={props.onToggleNavigation} aria-expanded={props.navigationOpen} aria-label={props.navigationOpen ? 'Close navigation' : 'Open navigation'}>
      <span aria-hidden="true" className="material-symbols-outlined">menu</span><span>{props.navigationLabel}</span>
    </button>
    <button className="publication-toolbar-identity" onClick={props.onHome} title={props.title}>{props.title}</button>
    {speech !== 'idle' && <div className="publication-speech-status" role="group" aria-label="Browser read-aloud">
      <span aria-hidden="true" className="material-symbols-outlined">record_voice_over</span>
      <span>{speech === 'speaking' ? 'Reading aloud' : 'Paused'}</span>
      <button type="button" aria-label={speech === 'speaking' ? 'Pause reading aloud' : 'Resume reading aloud'} onClick={props.onToggleSpeech}><span aria-hidden="true" className="material-symbols-outlined">{speech === 'speaking' ? 'pause' : 'play_arrow'}</span></button>
      <button type="button" aria-label="Stop reading aloud" onClick={props.onStopSpeech}><span aria-hidden="true" className="material-symbols-outlined">stop</span></button>
    </div>}
    <div className="publication-toolbar-actions" ref={actions} onKeyDown={onKeyDown}>
      {MENUS.map(menu => <button key={menu.id} type="button" ref={element => { buttons.current[menu.id] = element; }} className="publication-toolbar-control"
        data-active={open === menu.id || (menu.id === 'listen' && speech !== 'idle') || undefined}
        aria-haspopup="dialog" aria-expanded={open === menu.id} aria-controls={open === menu.id ? `publication-menu-${menu.id}` : undefined}
        aria-label={counts[menu.id] ? `${menu.id === 'listen' ? props.listenLabel : menu.label}, ${counts[menu.id]} changed` : menu.id === 'listen' ? props.listenLabel : menu.label} onClick={() => toggle(menu.id)}>
        <span aria-hidden="true" className="material-symbols-outlined">{menu.icon}</span>
        <span aria-hidden="true">{menu.id === 'listen' ? props.listenLabel : menu.label}</span>
        {counts[menu.id] > 0 && <span aria-hidden="true" className="publication-toolbar-badge">{counts[menu.id]}</span>}
      </button>)}
      {!props.isHome && <button type="button" className="publication-toolbar-control publication-toolbar-notes" onClick={() => { close(false); props.onOpenNotes(); }} aria-label="Open notes and highlights">
        <span aria-hidden="true" className="material-symbols-outlined">ink_highlighter</span><span aria-hidden="true">Notes</span>
      </button>}

      {open && <div ref={panel} id={`publication-menu-${open}`} role="dialog" aria-label={MENUS.find(menu => menu.id === open)!.label} className="publication-menu" data-reader-menu>
        <div className="publication-menu-sheet-head">
          <span className="publication-menu-handle" aria-hidden="true" />
          <div role="group" aria-label="Menu" className="publication-menu-switch">
            {MENUS.map(menu => <button key={menu.id} type="button" aria-pressed={open === menu.id} onClick={() => { focusOnOpen.current = false; setOpen(menu.id); }}>
              <span aria-hidden="true" className="material-symbols-outlined">{menu.icon}</span>{menu.id === 'listen' ? props.listenLabel : menu.label}</button>)}
            <button type="button" aria-label="Close menu" onClick={() => close(true)}><span aria-hidden="true" className="material-symbols-outlined">close</span></button>
          </div>
        </div>

        {open === 'listen' && <>
          <section aria-labelledby="menu-listen-aloud">
            <h3 id="menu-listen-aloud">Read aloud</h3>
            <div className="publication-menu-row">
              <span className="publication-menu-row-text"><span>Browser voice</span><small>{props.isHome ? 'Open a chapter to read it aloud.' : !props.speechAvailable ? 'This browser has no read-aloud voice.' : speechText ?? 'Reads this chapter. Key A starts and pauses.'}</small></span>
              <span className="publication-menu-buttons">
                <button type="button" className="publication-menu-action" disabled={props.isHome || !props.speechAvailable} onClick={props.onToggleSpeech}>
                  <span aria-hidden="true" className="material-symbols-outlined">{speech === 'speaking' ? 'pause' : 'play_arrow'}</span>{speech === 'speaking' ? 'Pause' : speech === 'paused' ? 'Resume' : 'Start'}</button>
                {speech !== 'idle' && <button type="button" className="publication-menu-action" onClick={props.onStopSpeech}><span aria-hidden="true" className="material-symbols-outlined">stop</span>Stop</button>}
              </span>
            </div>
          </section>
          {props.hasRecordedAudio && <section aria-labelledby="menu-listen-recorded">
            <h3 id="menu-listen-recorded">Recorded audiobook</h3>
            <div className="publication-menu-row">
              <span className="publication-menu-row-text"><span>Recording</span><small>Opens the player. Starting it pauses the browser voice.</small></span>
              <button type="button" className="publication-menu-action" onClick={() => { const trigger = buttons.current.listen ?? null; close(false); props.onOpenRecordedAudio(trigger); }}>
                <span aria-hidden="true" className="material-symbols-outlined">headphones</span>Open player</button>
            </div>
          </section>}
        </>}

        {open === 'formatting' && <>
          <section aria-labelledby="menu-theme"><h3 id="menu-theme">Theme</h3>
            <ChoiceGroup label="Theme" value={props.isDark ? 'dark' : 'paper'} onChange={value => props.onDark(value === 'dark')}
              choices={[{ value: 'paper', label: 'Book paper' }, { value: 'dark', label: 'Dark' }]} /></section>
          <section aria-labelledby="menu-typeface"><h3 id="menu-typeface">Typeface</h3>
            <ChoiceGroup label="Typeface" value={p.fontFamily} onChange={value => support.update({ fontFamily: value })}
              choices={[{ value: 'serif', label: 'Serif', style: { fontFamily: 'Merriweather, Georgia, serif' } }, { value: 'sans', label: 'Sans', style: { fontFamily: 'Inter, system-ui, sans-serif' } }]} /></section>
          <section aria-label="Size and spacing">
            {stepper('fontSize', 'Text size', 'format_size', `${p.fontSize} px`)}
            {stepper('lineHeight', 'Line spacing', 'format_line_spacing', lineHeightLabel(p.lineHeight))}
            {stepper('paragraphSpacing', 'Paragraph spacing', 'vertical_align_center', `${p.paragraphSpacing} px`)}
            {stepper('letterSpacing', 'Letter spacing', 'format_letter_spacing', letterSpacingLabel(p.letterSpacing))}
          </section>
          <section aria-labelledby="menu-width"><h3 id="menu-width">Text width</h3>
            <ChoiceGroup label="Text width" value={props.maxWidth} onChange={props.onMaxWidth}
              choices={[{ value: 'sm', label: 'Narrow' }, { value: 'md', label: 'Normal' }, { value: 'lg', label: 'Wide' }, { value: 'full', label: 'Full' }]} />
            <small className="publication-menu-note">The width sets the text column; chapter navigation sits beside it.</small></section>
          <footer>
            <button type="button" className="publication-menu-action" disabled={counts.formatting === 0} onClick={() => {
              support.update({ fontFamily: d.fontFamily, fontSize: d.fontSize, lineHeight: d.lineHeight, paragraphSpacing: d.paragraphSpacing, letterSpacing: d.letterSpacing });
              props.onMaxWidth('md'); props.onDark(props.defaultDark);
            }}><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span>Reset formatting</button>
            <small>{support.storageStatus === 'unavailable' ? 'Settings work for this visit but could not be saved on this device.' : 'Saved for this book on this device.'}</small>
          </footer>
        </>}

        {open === 'assist' && <>
          <section aria-labelledby="menu-focus"><h3 id="menu-focus">Focus on a paragraph</h3>
            <Switch label="Paragraph focus" checked={p.focus === 'paragraph'} hint="Fades the paragraphs you are not on." onChange={value => support.update({ focus: value ? 'paragraph' : 'off' })} /></section>
          <section aria-labelledby="menu-overlay"><h3 id="menu-overlay">Reading overlay <kbd>R</kbd></h3>
            <ChoiceGroup label="Reading overlay" value={p.overlay} onChange={value => support.update({ overlay: value })}
              choices={[{ value: 'off', label: 'Off' }, { value: 'line-window', label: 'Line window' }, { value: 'ruler', label: 'Ruler' }]} />
            {p.overlay === 'line-window' && <><h4 id="menu-lines">Window height</h4>
              <ChoiceGroup label="Window height" value={p.lines} onChange={value => support.update({ lines: value })}
                choices={[{ value: 1, label: '1 line' }, { value: 3, label: '3 lines' }, { value: 5, label: '5 lines' }]} /></>}
            {p.overlay !== 'off' && <><h4>Dimming</h4>
              <ChoiceGroup label="Dimming" value={level?.value ?? null} onChange={value => support.update({ dim: value })} choices={DIM_LEVELS.map(item => ({ value: item.value, label: item.label }))} />
              {!level && <small className="publication-menu-note">A saved custom dimming of {p.dim.toFixed(2)} is in use. Choose a level to replace it.</small>}</>}
            <small className="publication-menu-note">Follows your pointer, a tap, or the Up and Down keys in the text. Escape in the text turns focus and overlay off.</small></section>
          <section aria-labelledby="menu-page"><h3 id="menu-page">Page</h3>
            <Switch label="Hide navigation" checked={props.immersive} hint="Hides the contents and the page outline. Key F." onChange={props.onImmersive} /></section>
          <footer>
            <p role="status" className="publication-menu-state">{assistSummary({ focus: p.focus, overlay: p.overlay, immersive: props.immersive, lines: p.lines })}</p>
            <button type="button" className="publication-menu-action" disabled={counts.assist === 0} onClick={() => { support.update({ focus: 'off', overlay: 'off', lines: d.lines, dim: d.dim }); props.onImmersive(false); }}>
              <span aria-hidden="true" className="material-symbols-outlined">restart_alt</span>Turn all off</button>
            <button type="button" className="publication-menu-action" onClick={() => { close(false); props.onOpenShortcuts(); }}><span aria-hidden="true" className="material-symbols-outlined">keyboard</span>Keyboard shortcuts</button>
          </footer>
        </>}
      </div>}
    </div>
  </header>;
}
