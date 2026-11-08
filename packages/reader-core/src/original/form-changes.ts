// Inline word-form markup (ending added, changed, removed, knock-on change) is
// authored by a book as spans with form-* classes; a changed piece carries the
// replaced letters in data-form-from. This adds a per-table switch that hides
// or shows the markup, and replays the changes as a short animation when the
// markup is switched back on.
const ANIMATION_MS = 2300;

export function addFormChangeToggle(table: HTMLTableElement, header: HTMLElement, wrapper: HTMLElement, before: Element | null): (() => void) | undefined {
  if (!table.querySelector('.form-word')) return undefined;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'publication-table-forms';
  const glyph = document.createElement('span');
  glyph.className = 'material-symbols-outlined';
  glyph.setAttribute('aria-hidden', 'true');
  glyph.textContent = 'format_color_text';
  button.append(glyph);
  let timer = 0;
  const label = (on: boolean) => {
    const text = on ? 'Hide word changes' : 'Show word changes';
    button.setAttribute('aria-label', text); button.title = text;
    button.setAttribute('aria-pressed', String(on));
  };
  label(true);
  button.onclick = () => {
    const turningOn = wrapper.classList.contains('publication-forms-off');
    wrapper.classList.toggle('publication-forms-off', !turningOn);
    label(turningOn);
    window.clearTimeout(timer);
    if (turningOn) timer = animateFormChanges(table);
    else clearAnimation(table);
  };
  header.insertBefore(button, before);
  return () => { window.clearTimeout(timer); clearAnimation(table); };
}

/** Shows each replaced piece briefly, then lets the new one take its place. */
export function animateFormChanges(table: HTMLTableElement): number {
  clearAnimation(table);
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return 0;
  table.querySelectorAll<HTMLElement>('[data-form-from]').forEach(element => {
    const from = element.getAttribute('data-form-from');
    if (!from) return;
    const old = document.createElement('span');
    old.className = 'form-from';
    old.setAttribute('aria-hidden', 'true');
    old.textContent = from;
    element.before(old);
  });
  table.classList.add('form-animating');
  return window.setTimeout(() => clearAnimation(table), ANIMATION_MS);
}

function clearAnimation(table: HTMLTableElement) {
  table.querySelectorAll('.form-from').forEach(node => node.remove());
  table.classList.remove('form-animating');
}
