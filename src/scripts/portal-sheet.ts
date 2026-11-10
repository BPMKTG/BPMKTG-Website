/**
 * The sheet: one short question, answered and gone.
 *
 * A modal that both the client portal and Blueprint HQ put on screen,
 * driven entirely by markup that is already on the page. A screen
 * opts in by carrying the five data attributes:
 *
 *   [data-sheet-scrim]  the backdrop
 *   [data-sheet]        the dialog
 *   [data-sheet-title]  its heading
 *   [data-sheet-close]  the X
 *   [data-sheet-body]   a <form>, replaced on every open
 *
 * Without them openSheet does nothing, which is the right failure: a
 * screen that has not got a sheet should not get a half-drawn one.
 */
import { el, q, show } from './portal-dom';

let SHEET_FOCUS: HTMLElement | null = null;

export function openSheet(
  title: string,
  build: (form: HTMLFormElement, close: () => void) => void,
) {
  const sheet = q('[data-sheet]');
  const scrim = q('[data-sheet-scrim]');
  const head = q('[data-sheet-title]');
  const body = q<HTMLFormElement>('[data-sheet-body]');
  if (!sheet || !scrim || !head || !body) return;
  SHEET_FOCUS = document.activeElement as HTMLElement;
  head.textContent = title;

  // A fresh form, not a cleared one. Clearing the children leaves the
  // previous sheet's submit listener on the element, so the next sheet
  // you submitted would run that one too, against the inputs it had
  // captured: adding a second idea quietly added the first one again.
  // cloneNode(false) keeps the attributes and takes none of the
  // listeners.
  const form = body.cloneNode(false) as HTMLFormElement;
  body.replaceWith(form);

  build(form, closeSheet);
  show(scrim, true);
  show(sheet, true);
  requestAnimationFrame(() => {
    scrim.dataset.open = 'true';
    sheet.dataset.open = 'true';
    q<HTMLElement>('input, select, textarea, button', form)?.focus();
  });
  document.addEventListener('keydown', onSheetKey);
}

export function closeSheet() {
  const sheet = q('[data-sheet]');
  const scrim = q('[data-sheet-scrim]');
  if (!sheet || !scrim || sheet.hidden) return;
  sheet.dataset.open = 'false';
  scrim.dataset.open = 'false';
  document.removeEventListener('keydown', onSheetKey);
  window.setTimeout(() => { show(sheet, false); show(scrim, false); }, 200);
  SHEET_FOCUS?.focus();
  SHEET_FOCUS = null;
}

function onSheetKey(ev: KeyboardEvent) {
  if (ev.key === 'Escape') { ev.preventDefault(); closeSheet(); }
}

/** A labelled control for the sheet. Plainer than the drawer's fields:
 *  the sheet saves on submit, not on blur. */
export function sheetField(label: string, node: HTMLElement): HTMLElement {
  const wrap = el('div', 'pt-field');
  const id = `pt-s-${label.toLowerCase().replace(/[^a-z]+/g, '-')}`;
  const lab = el('label', 'pt-field-label', label);
  (lab as HTMLLabelElement).htmlFor = id;
  node.id = id;
  wrap.append(lab, node);
  return wrap;
}

export function sheetSubmit(form: HTMLFormElement, text: string): HTMLButtonElement {
  const b = el('button', 'pt-btn pt-btn-primary') as HTMLButtonElement;
  b.type = 'submit';
  b.textContent = text;
  const row = el('div', 'pt-sheet-foot');
  row.appendChild(b);
  form.appendChild(row);
  return b;
}

/** Wire the sheet's own X and backdrop. Called once per screen. */
export function bindSheet() {
  q('[data-sheet-close]')?.addEventListener('click', closeSheet);
  q('[data-sheet-scrim]')?.addEventListener('click', closeSheet);
}
