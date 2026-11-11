import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { DEFAULT_READING_PREFERENCES, effectiveFontSize } from '../reading-support/reading-preferences.js';
import { useViewportWidth } from '../reading-support/use-viewport-width.js';
import { useAnchoredReadingSupport } from '../reading-support/use-anchored-reading.js';
import type { ReadingSupportController } from '../reading-support/index.js';
import { ChoiceGroup, Stepper, Switch } from './controls.js';
import type { ReadAloudSnapshot } from '../read-aloud/read-aloud-controller.js';
import type { ReadAloudActions } from '../read-aloud/use-read-aloud.js';
import { ReadAloudTransport, ReadAloudVoiceControls, readAloudStatusText } from '../read-aloud/ReadAloudControls.js';
import {
  ASSIST_CHOICES, DIM_LEVELS, WIDTH_CHOICES, assistChanges, assistName, assistSummary, atLimit, dimLevel, formattingChanges, letterSpacingLabel, lineHeightLabel, stepValue,
  type FormattingState, type MaxWidthChoice, type ToolbarMenuId,
} from './toolbar-model.js';
import { THEME_CHOICES, themeDescription, themeIcon, type ThemeChoice } from '../reader-theme.js';


export interface ReaderToolbarProps {
  navigationLabel: string; navigationOpen: boolean; onToggleNavigation(): void;
  title: string; onHome(): void; isHome: boolean; listenLabel: string;
  support: ReadingSupportController;
  /** Colour theme: its own small control, separate from Formatting. `systemDark` is what Follow computer currently resolves to. */
  themeChoice: ThemeChoice; systemDark: boolean; onTheme(value: ThemeChoice): void;
  maxWidth: MaxWidthChoice; onMaxWidth(value: MaxWidthChoice): void;
  immersive: boolean; onImmersive(value: boolean): void;
  /** Null while no chapter is open (the front page) or the chapter has not mounted. */
  readAloud: ReadAloudSnapshot | null; readAloudActions: ReadAloudActions | null; language?: string;
  hasRecordedAudio: boolean; onOpenRecordedAudio(trigger: HTMLElement | null): void;
  onOpenNotes(): void; onOpenShortcuts(): void;
  /** The side outline ("On this page"), when the layout offers a toolbar button for it. */
  outline?: { open: boolean; onToggle(): void };
  /** Atlas: a hamburger at the left while the contents is closed and, when `outline` is given, a list icon at the right; both icon-only with tooltips. */
  panelToggles?: boolean;
  /** Atlas: the reading tools can be folded into one button; the choice is kept per book on this device. */
  bookId?: string;
}

const minimisedKey = (bookId: string) => `publication-toolbar-minimised:${bookId}`;
function readMinimised(bookId?: string): boolean {
  if (!bookId) return false;
  try { return window.localStorage.getItem(minimisedKey(bookId)) === '1'; } catch { return false; }
}
function writeMinimised(bookId: string | undefined, value: boolean) {
  if (!bookId) return;
  try { if (value) window.localStorage.setItem(minimisedKey(bookId), '1'); else window.localStorage.removeItem(minimisedKey(bookId)); } catch { /* Kept for this visit only. */ }
}

const MENUS: { id: Exclude<ToolbarMenuId, 'theme'>; label: string; icon: string }[] = [
  { id: 'listen', label: 'Listen', icon: 'headphones' },
  { id: 'formatting', label: 'Formatting', icon: 'text_fields' },
  { id: 'assist', label: 'Assist', icon: 'eyeglasses' },
];
const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), [tabindex]:not([tabindex="-1"])';

/** Listen, Formatting, Assist, Notes and Theme: five separate icon-only controls whose names show on hover and keyboard focus. Menus are non-modal so text can still be selected. */
export function ReaderToolbar(props: ReaderToolbarProps) {
  const { support, readAloud, readAloudActions } = props;
  const speech = readAloud?.status ?? 'idle';
  const p = support.preferences;
  const anchoredAvailable = useAnchoredReadingSupport();
  const anchoredOn = p.anchored && anchoredAvailable;
  const [open, setOpen] = useState<ToolbarMenuId | null>(null);
  const [minimisedChoice, setMinimisedChoice] = useState(() => readMinimised(props.bookId));
  const minimised = !!props.panelToggles && minimisedChoice;
  const restoreRef = useRef<HTMLButtonElement>(null);
  const minimiseRef = useRef<HTMLButtonElement>(null);
  const moveFocus = useRef<'restore' | 'minimise' | null>(null);
  const setMinimised = (value: boolean) => { setOpen(null); moveFocus.current = value ? 'restore' : 'minimise'; setMinimisedChoice(value); writeMinimised(props.bookId, value); };
  // The button that was pressed disappears, so focus goes to the one that replaces it.
  useEffect(() => {
    const target = moveFocus.current === 'restore' ? restoreRef.current : moveFocus.current === 'minimise' ? minimiseRef.current : null;
    moveFocus.current = null;
    target?.focus({ preventScroll: true });
  }, [minimised]);
  const actions = useRef<HTMLDivElement>(null);
  const buttons = useRef<Partial<Record<ToolbarMenuId, HTMLButtonElement | null>>>({});
  const panel = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef(false);
  const lastFocus = useRef<{ group: Element | null } | null>(null);
  // Where focus goes when a menu closes: the control that opened it, which for Listen may be the docked transport.
  const opener = useRef<HTMLElement | null>(null);
  const dockPrimary = useRef<HTMLButtonElement>(null);
  const focusDockNext = useRef(false);
  const close = useCallback((returnFocus: boolean) => {
    setOpen(current => {
      if (current && returnFocus) {
        const target = opener.current?.isConnected ? opener.current : buttons.current[current];
        target?.focus();
      }
      return null;
    });
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
  // The menus are popovers: the browser closes them on Escape and on a press anywhere else (the text included, without taking focus or
  // clearing a selection). The two handlers below keep React's state in step and put focus back where it came from.
  const openRef = useRef(open);
  openRef.current = open;
  // A press on the button that opened the menu light-dismisses it before the button's own click arrives; that click must not open it again.
  const dismissed = useRef<{ id: ToolbarMenuId; at: number } | null>(null);
  const lastPress = useRef<{ target: Node; at: number } | null>(null);
  useLayoutEffect(() => {
    const element = panel.current;
    if (!open || !element) return;
    if (!element.matches(':popover-open')) element.showPopover();
    const place = () => {
      const bar = actions.current?.getBoundingClientRect();
      if (!bar) return;
      element.style.setProperty('--menu-top', `${Math.round(bar.bottom + 8)}px`);
      element.style.setProperty('--menu-right', `${Math.max(0, Math.round(document.documentElement.clientWidth - bar.right))}px`);
    };
    place();
    const onBeforeToggle = (event: Event) => {
      if ((event as Event & { newState?: string }).newState !== 'closed') return;
      if (openRef.current && lastPress.current && performance.now() - lastPress.current.at < 1000 && actions.current?.contains(lastPress.current.target)) dismissed.current = { id: openRef.current, at: performance.now() };
      // Focus inside the menu goes back to the control that opened it; after a press elsewhere it has already moved on and is left alone.
      const target = opener.current?.isConnected ? opener.current : openRef.current ? buttons.current[openRef.current] : null;
      if (element.contains(document.activeElement)) target?.focus();
      setOpen(null);
    };
    const onPress = (event: PointerEvent) => { lastPress.current = { target: event.target as Node, at: performance.now() }; };
    document.addEventListener('pointerdown', onPress, true);
    element.addEventListener('beforetoggle', onBeforeToggle);
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      document.removeEventListener('pointerdown', onPress, true);
      element.removeEventListener('beforetoggle', onBeforeToggle);
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open === 'theme', open !== null]);

  // Escape dismisses a visible tooltip (hovered or focused) without moving focus or closing anything; a new hover or focus on a control shows it again.
  const [tipDismissed, setTipDismissed] = useState(false);
  const pointerOver = useRef(false);
  const rearmTip = useCallback(() => setTipDismissed(false), []);
  const tipProps = { onPointerEnter: rearmTip, onFocus: rearmTip };
  useEffect(() => {
    const dismiss = (event: KeyboardEvent) => {
      const bar = actions.current;
      if (event.key !== 'Escape' || event.defaultPrevented || !bar) return;
      if (bar.querySelector('[aria-expanded="true"]') || !(pointerOver.current || bar.contains(document.activeElement))) return;
      setTipDismissed(true);
    };
    document.addEventListener('keydown', dismiss);
    return () => document.removeEventListener('keydown', dismiss);
  }, []);

  // A menu opened from outside the tools (the read-aloud dock) unfolds them, since the menus live there.
  const toggle = (id: ToolbarMenuId, from?: HTMLElement | null) => { const last = dismissed.current; dismissed.current = null; if (last && last.id === id && performance.now() - last.at < 400) return; if (minimised) { setMinimisedChoice(false); writeMinimised(props.bookId, false); } opener.current = from ?? buttons.current[id] ?? null; focusOnOpen.current = open !== id; setOpen(open === id ? null : id); };
  const viewport = useViewportWidth();
  const fontSize = effectiveFontSize(p, viewport);
  const formatting: FormattingState = { fontFamily: p.fontFamily, fontSize, lineHeight: p.lineHeight, paragraphSpacing: p.paragraphSpacing, letterSpacing: p.letterSpacing, maxWidth: props.maxWidth };
  const d = DEFAULT_READING_PREFERENCES;
  const formattingDefaults: FormattingState = { fontFamily: d.fontFamily, fontSize: effectiveFontSize({ fontSize: d.fontSize, fontSizeChosen: false }, viewport), lineHeight: d.lineHeight, paragraphSpacing: d.paragraphSpacing, letterSpacing: d.letterSpacing, maxWidth: 'md' };
  const counts: Record<ToolbarMenuId, number> = {
    listen: 0, theme: 0, formatting: formattingChanges(formatting, formattingDefaults),
    assist: assistChanges({ overlay: p.overlay, immersive: props.immersive, anchored: anchoredOn }),
  };
  const shown = (key: 'fontSize' | 'lineHeight' | 'paragraphSpacing' | 'letterSpacing') => key === 'fontSize' ? fontSize : p[key];
  const step = (key: 'fontSize' | 'lineHeight' | 'paragraphSpacing' | 'letterSpacing') => (direction: 1 | -1) => support.update({ [key]: stepValue(key, shown(key), direction) });
  const stepper = (key: 'fontSize' | 'lineHeight' | 'paragraphSpacing' | 'letterSpacing', label: string, icon: string, text: string) =>
    <Stepper label={label} icon={icon} text={text} onStep={step(key)} minDisabled={atLimit(key, shown(key), -1)} maxDisabled={atLimit(key, shown(key), 1)} />;

  const level = dimLevel(p.dim);
  // After Start the menu has closed; focus moves to the docked transport, or to Try again when nothing started.
  useEffect(() => {
    if (!focusDockNext.current || !(readAloud && (readAloud.status !== 'idle' || readAloud.problem))) return;
    focusDockNext.current = false;
    dockPrimary.current?.focus({ preventScroll: true });
  }, [readAloud]);
  const startReading = () => { if (!readAloudActions) return; focusDockNext.current = true; close(false); readAloudActions.start(); };

  return <>
  <header className="publication-toolbar" data-navigation-open={props.navigationOpen || undefined}>
    {props.panelToggles
      // Atlas: the hamburger shows only while the contents is closed; the open panel has its own close button in the same corner, so one control is visible per state.
      ? !props.navigationOpen && <button type="button" className="publication-navigation-toggle publication-toolbar-control publication-panel-toggle" onClick={props.onToggleNavigation} aria-expanded={false} aria-controls="publication-sidebar" aria-label={props.navigationLabel} data-tooltip={props.navigationLabel}>
          <span aria-hidden="true" className="material-symbols-outlined">menu</span>
        </button>
      : <button className="publication-navigation-toggle" onClick={props.onToggleNavigation} aria-expanded={props.navigationOpen} aria-label={props.navigationOpen ? 'Close navigation' : 'Open navigation'}>
          <span aria-hidden="true" className="material-symbols-outlined">menu</span><span>{props.navigationLabel}</span>
        </button>}
    {/* Atlas: the toolbar holds controls only. The book's title card is in the contents panel and Home leads the breadcrumb, so a title here only repeated them and changed with the panel's state. */}
    {!props.panelToggles && <button className="publication-toolbar-identity" onClick={props.onHome} title={props.title}>{props.title}</button>}
    {minimised && <button type="button" ref={restoreRef} className="publication-toolbar-control publication-toolbar-restore" onClick={() => setMinimised(false)} aria-label="Show reading tools" data-tooltip="Show reading tools">
      <span aria-hidden="true" className="material-symbols-outlined">more_horiz</span>
    </button>}
    {!minimised && <div className="publication-toolbar-actions" ref={actions} onPointerEnter={() => { pointerOver.current = true; }} onPointerLeave={() => { pointerOver.current = false; }} data-tip-dismissed={tipDismissed || undefined}>
      {MENUS.map(menu => {
        // Icon only: the name is the accessible name and the tooltip (hover and keyboard focus), plus the current state where there is one.
        const stateText = menu.id === 'listen' && speech !== 'idle' ? (speech === 'speaking' ? 'reading aloud' : 'paused') : menu.id === 'assist' ? assistName(p.overlay, anchoredOn) : null;
        const base = menu.id === 'listen' ? props.listenLabel : menu.label;
        return <button key={menu.id} type="button" ref={element => { buttons.current[menu.id] = element; }} className="publication-toolbar-control"
          data-tooltip={stateText ? `${base}: ${stateText}` : base}
          data-active={open === menu.id || (menu.id === 'listen' && speech !== 'idle') || (menu.id === 'assist' && counts.assist > 0) || undefined}
          aria-expanded={open === menu.id} aria-controls={open === menu.id ? `publication-menu-${menu.id}` : undefined}
          aria-label={stateText ? `${base}: ${stateText}` : base} onClick={() => toggle(menu.id)} {...tipProps}>
          <span aria-hidden="true" className="material-symbols-outlined">{menu.icon}</span>
        </button>;
      })}
      <button type="button" className="publication-toolbar-control publication-toolbar-notes" data-tooltip="Notes" onClick={() => { close(false); props.onOpenNotes(); }} aria-label="Open notes and highlights" {...tipProps}>
        <span aria-hidden="true" className="material-symbols-outlined">ink_highlighter</span>
      </button>
      {/* Atlas keeps Theme with the other reading tools; the panel toggles at the two ends are the separate group. */}
      {!props.panelToggles && <span className="publication-toolbar-divider" aria-hidden="true" />}
      <button type="button" ref={element => { buttons.current.theme = element; }} className="publication-toolbar-control publication-toolbar-theme" data-tooltip={`Theme: ${themeDescription(props.themeChoice, props.systemDark)}`}
        data-active={open === 'theme' || undefined} aria-expanded={open === 'theme'} aria-controls={open === 'theme' ? 'publication-menu-theme' : undefined}
        aria-label={`Theme: ${themeDescription(props.themeChoice, props.systemDark)}`} onClick={() => toggle('theme')} {...tipProps}>
        <span aria-hidden="true" className="material-symbols-outlined">{themeIcon(props.themeChoice)}</span>
      </button>

      {open === 'theme' && <div ref={panel} id="publication-menu-theme" role="group" aria-label="Theme" className="publication-menu publication-theme-menu" data-reader-menu {...{ popover: 'auto' }}>
        <ChoiceGroup label="Theme" stacked value={props.themeChoice} onChange={props.onTheme} choices={THEME_CHOICES} />
        <small className="publication-menu-note">{props.themeChoice === 'system'
          ? `Follows your computer's light or dark setting, which is ${props.systemDark ? 'dark' : 'light'} now.`
          : 'Kept for this book on this device. Choose Follow computer to follow your computer again.'}</small>
      </div>}

      {open && open !== 'theme' && <div ref={panel} id={`publication-menu-${open}`} role="group" aria-label={MENUS.find(menu => menu.id === open)!.label} className="publication-menu" data-reader-menu {...{ popover: 'auto' }}>
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
            {readAloud && readAloudActions && !props.isHome && readAloud.available && <ReadAloudVoiceControls snapshot={readAloud} actions={readAloudActions} language={props.language} />}
            <div className="publication-menu-row">
              <span className="publication-menu-row-text"><small role="status">{readAloudStatusText(readAloud, props.isHome)}</small></span>
              <span className="publication-menu-buttons">
                {speech === 'idle'
                  ? <button type="button" className="publication-menu-action" disabled={props.isHome || !readAloud?.available} onClick={startReading}>
                      <span aria-hidden="true" className="material-symbols-outlined">play_arrow</span>Start</button>
                  : <>
                    <button type="button" className="publication-menu-action" onClick={speech === 'speaking' ? readAloudActions?.pause : readAloudActions?.resume}>
                      <span aria-hidden="true" className="material-symbols-outlined">{speech === 'speaking' ? 'pause' : 'play_arrow'}</span>{speech === 'speaking' ? 'Pause' : 'Resume'}</button>
                    <button type="button" className="publication-menu-action" onClick={readAloudActions?.stop}><span aria-hidden="true" className="material-symbols-outlined">stop</span>Stop</button>
                  </>}
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
          <section aria-label="Reset" className="publication-menu-reset">
            <button type="button" className="publication-menu-action" disabled={counts.formatting === 0} onClick={() => {
              support.update({ fontFamily: d.fontFamily, fontSize: d.fontSize, fontSizeChosen: false, lineHeight: d.lineHeight, paragraphSpacing: d.paragraphSpacing, letterSpacing: d.letterSpacing });
              props.onMaxWidth('md');
            }}><span aria-hidden="true" className="material-symbols-outlined">restart_alt</span>Reset formatting</button>
            <small>{support.storageStatus === 'unavailable' ? 'Settings work for this visit but could not be saved on this device.' : 'Saved for this book on this device.'}</small>
          </section>
          <section aria-labelledby="menu-typeface"><h3 id="menu-typeface">Typeface</h3>
            <ChoiceGroup label="Typeface" value={p.fontFamily} onChange={value => support.update({ fontFamily: value })}
              choices={[{ value: 'serif', label: 'Serif', style: { fontFamily: 'Merriweather, Georgia, serif' } }, { value: 'sans', label: 'Sans', style: { fontFamily: 'Inter, system-ui, sans-serif' } }]} /></section>
          <section aria-label="Size and spacing">
            {stepper('fontSize', 'Text size', 'format_size', `${fontSize} px`)}
            {stepper('lineHeight', 'Line spacing', 'format_line_spacing', lineHeightLabel(p.lineHeight))}
            {stepper('paragraphSpacing', 'Paragraph spacing', 'vertical_align_center', `${p.paragraphSpacing} px`)}
            {stepper('letterSpacing', 'Letter spacing', 'format_letter_spacing', letterSpacingLabel(p.letterSpacing))}
          </section>
          <section aria-labelledby="menu-width"><h3 id="menu-width">Text width</h3>
            <ChoiceGroup label="Text width" value={props.maxWidth} onChange={props.onMaxWidth}
              choices={WIDTH_CHOICES} />
            <small className="publication-menu-note">Sets the text column. Narrower windows limit it; the outline stays beside the text.</small></section>
        </>}

        {open === 'assist' && <>
          <section aria-labelledby="menu-overlay"><h3 id="menu-overlay">Reading assistance <kbd>R</kbd></h3>
            <ChoiceGroup label="Reading assistance" stacked value={p.overlay} onChange={value => support.update({ overlay: value })} choices={ASSIST_CHOICES} />
            <small className="publication-menu-note">{p.overlay === 'paragraph' ? 'Fades the paragraphs you are not on.'
              : p.overlay === 'line-window' ? 'Shades the page except a window of lines.'
              : p.overlay === 'ruler' ? 'Covers the lines just below the one you are on.' : 'Choose one to help keep your place.'}</small>
            {p.overlay === 'line-window' && <><h4 id="menu-lines">Window height</h4>
              <ChoiceGroup label="Window height" value={p.lines} onChange={value => support.update({ lines: value })}
                choices={[{ value: 1, label: '1 line' }, { value: 3, label: '3 lines' }, { value: 5, label: '5 lines' }]} /></>}
            {p.overlay === 'ruler' && <><h4 id="menu-ruler-lines">Ruler covers</h4>
              <ChoiceGroup label="Ruler covers" value={p.rulerLines} onChange={value => support.update({ rulerLines: value })}
                choices={[{ value: 1, label: '1 line' }, { value: 2, label: '2 lines' }, { value: 3, label: '3 lines' }]} /></>}
            {p.overlay !== 'off' && <><h4>Dimming</h4>
              <ChoiceGroup label="Dimming" value={level?.value ?? null} onChange={value => support.update({ dim: value })} choices={DIM_LEVELS.map(item => ({ value: item.value, label: item.label }))} />
              {!level && <small className="publication-menu-note">A saved custom dimming of {p.dim.toFixed(2)} is in use. Choose a level to replace it.</small>}</>}
            {p.overlay !== 'off' && <small className="publication-menu-note">Follows your pointer, a tap, or the Up and Down keys in the text. Escape in the text turns it off.</small>}</section>
          <section aria-labelledby="menu-anchored"><h3 id="menu-anchored">Anchored reading</h3>
            <Switch label="Anchored reading" icon="match_word" checked={anchoredOn} disabled={!anchoredAvailable}
              hint={anchoredAvailable ? 'Emphasises the first letters of every word. Display only; the text is unchanged.' : 'This browser cannot mark the first letters of words without changing the text, so it is not available here.'}
              onChange={value => support.update({ anchored: value })} />
            {anchoredOn && <ChoiceGroup label="Emphasis style" value={p.leadStyle} onChange={value => support.update({ leadStyle: value })}
              choices={[{ value: 'contrast', label: 'Contrast' }, { value: 'colour', label: 'Colour' }]} />}</section>
          <section aria-labelledby="menu-page"><h3 id="menu-page">Page</h3>
            <Switch label="Hide navigation" checked={props.immersive} hint={p.overlay !== 'off' ? 'Hidden while reading assistance is on; switch it on again to show it. Key F.' : 'Hides the contents and the page outline. Key F.'} onChange={props.onImmersive} /></section>
          <footer>
            <p role="status" className="publication-menu-state">{assistSummary({ overlay: p.overlay, immersive: props.immersive, anchored: anchoredOn, lines: p.lines, rulerLines: p.rulerLines })}</p>
            <button type="button" className="publication-menu-action" disabled={counts.assist === 0} onClick={() => { if (p.overlay !== 'off' || p.anchored) support.update({ overlay: 'off', lines: d.lines, rulerLines: d.rulerLines, dim: d.dim, anchored: false, leadStyle: d.leadStyle }); else props.onImmersive(false); }}>
              <span aria-hidden="true" className="material-symbols-outlined">restart_alt</span>Turn all off</button>
            <button type="button" className="publication-menu-action" onClick={() => { close(true); props.onOpenShortcuts(); }}><span aria-hidden="true" className="material-symbols-outlined">keyboard</span>Keyboard shortcuts</button>
          </footer>
        </>}
      </div>}
    </div>}
    {props.panelToggles && !minimised && <button type="button" ref={minimiseRef} className="publication-toolbar-control publication-toolbar-minimise" onClick={() => setMinimised(true)} aria-label="Hide reading tools" data-tooltip="Hide reading tools">
      <span aria-hidden="true" className="material-symbols-outlined">chevron_right</span>
    </button>}
    {props.outline && <button type="button" data-outline-toggle className="publication-panel-toggle publication-toolbar-control publication-toolbar-outline" aria-expanded={props.outline.open} aria-controls="toc-container" aria-label="On this page" data-tooltip="On this page"
      onClick={() => { close(false); props.outline!.onToggle(); }}>
      <span aria-hidden="true" className="material-symbols-outlined">toc</span>
    </button>}
  </header>
  {readAloud && readAloudActions && (readAloud.status !== 'idle' || readAloud.problem) && !props.isHome &&
    <ReadAloudTransport ref={dockPrimary} snapshot={readAloud} actions={readAloudActions} onOpenSettings={trigger => toggle('listen', trigger)} />}
  </>;
}
