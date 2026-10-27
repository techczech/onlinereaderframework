import { useEffect, useId, useRef, useState } from 'react';
import { useReadingSupport } from './use-reading-support.js';
import type { ReadingSupportPreferences } from './reading-preferences.js';
export interface ReadingSupportControlsProps { bookId: string; inline?: boolean; }
/** Non-modal disclosure: normal Tab order reaches the article and every exit. */
export function ReadingSupportControls({ bookId, inline = false }: ReadingSupportControlsProps): React.JSX.Element {
  const { preferences: p, update, reset, storageStatus } = useReadingSupport(bookId);
  const [open, setOpen] = useState(false);
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const number = (key: keyof ReadingSupportPreferences, label: string, min: number, max: number, step: number, unit: string) =>
    <NumberField label={label} min={min} max={max} step={step} unit={unit} value={p[key] as number} onChange={value => update({[key]:value})} />;
  return <div className="reading-support-controls" onKeyDown={event => {
    if (!inline && event.key === 'Escape' && open) { event.preventDefault(); event.stopPropagation(); setOpen(false); trigger.current?.focus(); }
  }}>
    {!inline && <button ref={trigger} type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}>Text and focus</button>}
    {(inline || open) && <section id={id} aria-label="Text and focus" className="reading-support-settings">
      <fieldset><legend>Text display</legend>
        <label className="reading-support-field">Typeface<select aria-label="Typeface" value={p.fontFamily} onChange={e => update({fontFamily:e.target.value as 'serif' | 'sans'})}><option value="serif">Serif</option><option value="sans">Sans serif</option></select></label>
        {number('fontSize', 'Text size', 16, 28, 1, 'px')}
        {number('lineHeight', 'Line height', 1.2, 2.4, 0.1, 'times text size')}
        {number('paragraphSpacing', 'Paragraph spacing', 0, 40, 1, 'px')}
        {number('letterSpacing', 'Letter spacing', 0, 0.12, 0.01, 'em')}
      </fieldset>
      <fieldset><legend>Reading focus</legend>
        <label className="reading-support-field">Reading assistance<select aria-label="Reading assistance" value={p.overlay} onChange={e => update({overlay:e.target.value as ReadingSupportPreferences['overlay']})}><option value="off">Off</option><option value="paragraph">Paragraph focus</option><option value="line-window">Line window</option><option value="ruler">Ruler</option></select></label>
        <label className="reading-support-field">Window height<select aria-label="Window height" value={p.lines} onChange={e => update({lines:Number(e.target.value) as 1 | 3 | 5})}>{[1,3,5].map(n => <option key={n} value={n}>{n} {n === 1 ? 'line' : 'lines'}</option>)}</select></label>
        <label className="reading-support-field">Ruler covers<select aria-label="Ruler covers" value={p.rulerLines} onChange={e => update({rulerLines:Number(e.target.value) as 1 | 2 | 3})}>{[1,2,3].map(n => <option key={n} value={n}>{n === 1 ? '1 line' : `${n} lines`}</option>)}</select></label>
        {number('dim', 'Dimming', 0.1, 1, 0.05, '(0.1–1)')}
        <p>Move the pointer or tap a paragraph to follow your reading. Focus the reading text and use Up or Down to move between paragraphs. Escape turns reading assistance off.</p>
      </fieldset>
      {storageStatus === 'unavailable' && <p role="status">Settings work for this visit but could not be saved on this device.</p>}
      <div className="reading-support-actions"><button type="button" onClick={reset}>Reset text and focus</button>{!inline && <button type="button" onClick={() => { setOpen(false); trigger.current?.focus(); }}>Close text and focus</button>}</div>
    </section>}
  </div>;
}

/** Keep incomplete numeric input local so typing "24" is not reset after its first digit. */
function NumberField({label, min, max, step, unit, value, onChange}: {
  label: string; min: number; max: number; step: number; unit: string; value: number; onChange(value: number): void;
}): React.JSX.Element {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);
  return <label className="reading-support-field"><span>{label}</span><span>
    <input aria-label={label} type="number" min={min} max={max} step={step} value={draft}
      onChange={event => { const text = event.target.value; setDraft(text); const next = event.target.valueAsNumber;
        if (text !== '' && Number.isFinite(next) && next >= min && next <= max) onChange(next);
      }} onBlur={() => setDraft(String(value))} /> {unit}
  </span></label>;
}
