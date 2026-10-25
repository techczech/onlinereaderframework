import React, { useRef } from 'react';

export interface Choice<T extends string | number> { value: T; label: string; style?: React.CSSProperties }

/** Radio group of pressed buttons; arrow keys move the choice, as for native radios. */
export function ChoiceGroup<T extends string | number>({ label, value, choices, onChange }: { label: string; value: T | null; choices: readonly Choice<T>[]; onChange(value: T): void }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = choices.findIndex(choice => choice.value === value);
  const move = (event: React.KeyboardEvent, index: number) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    const next = (index + delta + choices.length) % choices.length;
    onChange(choices[next].value);
    refs.current[next]?.focus();
  };
  return <div role="radiogroup" aria-label={label} className="publication-choice-group">
    {choices.map((choice, index) => <button key={String(choice.value)} type="button" role="radio" aria-checked={index === selected}
      tabIndex={index === selected || (selected < 0 && index === 0) ? 0 : -1} ref={element => { refs.current[index] = element; }} style={choice.style}
      onClick={() => onChange(choice.value)} onKeyDown={event => move(event, index)}>{choice.label}</button>)}
  </div>;
}

export function Switch({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange(value: boolean): void; hint?: string }) {
  return <div className="publication-menu-row">
    <span className="publication-menu-row-text"><span>{label}</span>{hint && <small>{hint}</small>}</span>
    <button type="button" role="switch" aria-checked={checked} aria-label={label} className="publication-switch" onClick={() => onChange(!checked)}><span aria-hidden="true" /></button>
  </div>;
}

export function Stepper({ label, icon, text, onStep, minDisabled, maxDisabled }: { label: string; icon: string; text: string; onStep(direction: 1 | -1): void; minDisabled: boolean; maxDisabled: boolean }) {
  return <div className="publication-menu-row" role="group" aria-label={label}>
    <span className="publication-menu-row-text"><span aria-hidden="true" className="material-symbols-outlined publication-menu-icon">{icon}</span><span>{label}</span></span>
    <span className="publication-stepper">
      <button type="button" aria-label={`Decrease ${label.toLowerCase()}`} disabled={minDisabled} onClick={() => onStep(-1)}>−</button>
      <output aria-label={`${label}: ${text}`}>{text}</output>
      <button type="button" aria-label={`Increase ${label.toLowerCase()}`} disabled={maxDisabled} onClick={() => onStep(1)}>+</button>
    </span>
  </div>;
}
