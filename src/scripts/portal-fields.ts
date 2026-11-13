/* ──────────────────────────────────────────────────────────────
   The editable fields of a drawer: a label, a quiet "Saved" that
   appears after a save, and the control.

   They lived inside the client portal until HQ needed the same
   drawer. Two copies of an autosaving field is two places for a save
   to go missing, so there is one, and both screens import it.

   Nothing here knows what it is editing or where the save goes. Each
   editor calls onSave with the new value and its own tick; the caller
   decides whether the tick is earned.
   ────────────────────────────────────────────────────────────── */

import { el, icon } from './portal-dom';

export type Tick = HTMLElement;

/** Label, a quiet tick that appears after a save, and the control. */
/** How long "Saved" stays up. */
const TICK_MS = 1800;

/**
 * The field that last saved, and until when it should say so.
 *
 * A save redraws the drawer with the row as the server now holds it,
 * which replaces every field, including the one whose tick was about
 * to light. So the tick is remembered by which field it belongs to
 * rather than by the node, and a field drawn while its save is still
 * fresh comes up already ticked.
 */
let FLASH: { key: string; until: number } | null = null;

function lightTick(tick: Tick, ms: number) {
  tick.dataset.on = 'true';
  window.setTimeout(() => { tick.dataset.on = 'false'; }, ms);
}

/** Label, a quiet tick that appears after a save, and the control. */
export function fieldShell(label: string): { wrap: HTMLElement; tick: Tick; slot: HTMLElement } {
  const wrap = el('div', 'pt-field');
  const head = el('div', 'pt-field-head');
  const id = `pt-f-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  const lab = el('label', 'pt-field-label', label);
  (lab as HTMLLabelElement).htmlFor = id;
  head.appendChild(lab);
  const tick = el('span', 'pt-field-tick');
  tick.dataset.key = id;
  tick.setAttribute('role', 'status');
  tick.appendChild(icon('check'));
  tick.appendChild(el('span', undefined, 'Saved'));
  head.appendChild(tick);
  wrap.appendChild(head);
  const slot = el('div', 'pt-field-slot');
  slot.dataset.fieldId = id;
  wrap.appendChild(slot);
  const left = FLASH && FLASH.key === id ? FLASH.until - Date.now() : 0;
  if (left > 0) lightTick(tick, left);
  return { wrap, tick, slot };
}

export function flashTick(tick: Tick) {
  FLASH = { key: tick.dataset.key ?? '', until: Date.now() + TICK_MS };
  lightTick(tick, TICK_MS);
  // The node this was called with may already have been replaced by a
  // redraw. Its successor is the one on screen.
  const live = tick.dataset.key
    ? document.querySelector<HTMLElement>(`.pt-field-tick[data-key="${tick.dataset.key}"]`)
    : null;
  if (live && live !== tick) lightTick(live, TICK_MS);
}

export function textField(
  label: string,
  value: string | null,
  placeholder: string,
  max: number,
  onSave: (v: string | null, tick: Tick) => void,
  opts: { lines?: number; mono?: boolean } = {},
): HTMLElement {
  const { wrap, tick, slot } = fieldShell(label);
  const input = opts.lines
    ? el('textarea', 'pt-input pt-textarea') as HTMLTextAreaElement
    : el('input', 'pt-input') as HTMLInputElement;
  if (opts.lines) (input as HTMLTextAreaElement).rows = opts.lines;
  if (opts.mono) input.classList.add('pt-num');
  input.id = slot.dataset.fieldId!;
  input.placeholder = placeholder;
  input.maxLength = max;
  input.value = value ?? '';
  // Blur, not keystroke: one save per edit, and no save while the
  // client is still mid-sentence.
  input.addEventListener('blur', () => {
    const next = input.value.trim();
    if (next === (value ?? '')) return;
    onSave(next || null, tick);
  });
  slot.appendChild(input);
  return wrap;
}

export function urlField(
  label: string,
  value: string | null,
  placeholder: string,
  onSave: (v: string | null, tick: Tick) => void,
): HTMLElement {
  const { wrap, tick, slot } = fieldShell(label);
  const row = el('div', 'pt-field-row');
  const input = el('input', 'pt-input') as HTMLInputElement;
  input.id = slot.dataset.fieldId!;
  input.type = 'url';
  input.placeholder = placeholder;
  input.value = value ?? '';
  input.addEventListener('blur', () => {
    const next = input.value.trim();
    if (next === (value ?? '')) return;
    onSave(next || null, tick);
  });
  row.appendChild(input);
  if (value) {
    const a = el('a', 'pt-field-open') as HTMLAnchorElement;
    a.href = value;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.setAttribute('aria-label', `Open ${label}`);
    a.appendChild(icon('ext'));
    row.appendChild(a);
  }
  slot.appendChild(row);
  return wrap;
}

export function dateField(
  label: string,
  value: string | null,
  onSave: (v: string | null, tick: Tick) => void,
): HTMLElement {
  const { wrap, tick, slot } = fieldShell(label);
  const input = el('input', 'pt-input') as HTMLInputElement;
  input.id = slot.dataset.fieldId!;
  input.type = 'date';
  input.value = (value ?? '').slice(0, 10);
  input.addEventListener('change', () => {
    const next = input.value;
    if (next === (value ?? '').slice(0, 10)) return;
    onSave(next || null, tick);
  });
  slot.appendChild(input);
  return wrap;
}

export function selectEditor(
  label: string,
  value: string | null,
  options: Array<{ name: string; color: string; label?: string }>,
  blank: string | null,
  onSave: (v: string | null, tick: Tick) => void,
): HTMLElement {
  const { wrap, tick, slot } = fieldShell(label);
  const sel = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
  sel.id = slot.dataset.fieldId!;
  if (blank !== null) {
    const o = el('option', undefined, blank) as HTMLOptionElement;
    o.value = '';
    if (!value) o.selected = true;
    sel.appendChild(o);
  }
  for (const opt of options) {
    const o = el('option', undefined, opt.label ?? opt.name) as HTMLOptionElement;
    o.value = opt.name;
    if (value === opt.name) o.selected = true;
    sel.appendChild(o);
  }
  sel.addEventListener('change', () => onSave(sel.value || null, tick));
  slot.appendChild(sel);
  return wrap;
}

export function multiEditor(
  label: string,
  values: string[],
  options: Array<{ name: string; color: string }>,
  onSave: (v: string[], tick: Tick) => void,
): HTMLElement {
  const { wrap, tick, slot } = fieldShell(label);
  if (!options.length) { wrap.remove(); return el('span'); }
  const set = el('div', 'pt-chipset');
  set.setAttribute('role', 'group');
  set.setAttribute('aria-label', label);
  let picked = values.slice();
  for (const opt of options) {
    const b = el('button', `pt-setchip pt-nc-${opt.color}`, opt.name);
    b.type = 'button';
    const sync = () => {
      const on = picked.includes(opt.name);
      b.setAttribute('aria-pressed', String(on));
      b.classList.toggle('pt-setchip-on', on);
    };
    sync();
    b.addEventListener('click', () => {
      picked = picked.includes(opt.name)
        ? picked.filter((v) => v !== opt.name)
        : [...picked, opt.name];
      sync();
      onSave(picked.slice(), tick);
    });
    set.appendChild(b);
  }
  slot.appendChild(set);
  return wrap;
}
