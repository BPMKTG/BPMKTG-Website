/**
 * The pieces every portal screen builds itself out of.
 *
 * These were written twice, once in src/pages/portal/index.astro and
 * once in src/pages/portal/hq-ui.astro, which is how HQ ended up with
 * a month list of "Jan" and the client portal with one of "January".
 * They live here now so a third screen cannot start a third copy.
 *
 * Everything here builds nodes and sets textContent. None of the
 * values that pass through are ours: they come out of a Notion
 * database, and a title pasted in from somewhere else must never be
 * able to run as markup in a client's browser. There is no innerHTML
 * in this file, and there is none in anything that imports it.
 */
import { parseNotionDate } from '../data/portal';

export const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K, cls?: string, text?: string,
): HTMLElementTagNameMap[K] => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
};

export const q = <T extends HTMLElement>(sel: string, root: ParentNode = document) =>
  root.querySelector<T>(sel);

export const qq = <T extends HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));

export const show = (n: Element | null, on: boolean) => {
  if (n) (n as HTMLElement).hidden = !on;
};

export const clear = (n: Element | null) => {
  while (n && n.firstChild) n.removeChild(n.firstChild);
};

const SVGNS = 'http://www.w3.org/2000/svg';

export const svgEl = <K extends keyof SVGElementTagNameMap>(
  tag: K, attrs: Record<string, string | number> = {},
): SVGElementTagNameMap[K] => {
  const n = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
  return n;
};

/** An icon from the sprite, without innerHTML. */
export const icon = (name: string, cls?: string): SVGSVGElement => {
  const s = svgEl('svg', { 'aria-hidden': 'true', focusable: 'false' });
  if (cls) s.setAttribute('class', cls);
  const u = svgEl('use');
  u.setAttribute('href', `#pt-i-${name}`);
  s.appendChild(u);
  return s;
};

/* ── dates, as a person reads them ──────────────────────────────
   Local time, from a Date. HQ's own date helpers read an ISO day
   string at UTC instead, which is the right thing for a row that is
   a plain day with no time on it. The two are not interchangeable,
   so they are not merged: these are the ones the calendar grid uses,
   because a grid is drawn in the reader's own week. */

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
export const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));
export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const fmtDate = (iso: string | null) => {
  const d = parseNotionDate(iso);
  return d ? `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : '';
};

/** "Jan 30", for a sentence that already says which year it means. */
export const fmtDateShort = (iso: string | null) => {
  const d = parseNotionDate(iso);
  return d ? `${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}` : '';
};

export const fmtDayLong = (d: Date) =>
  `${DOW[d.getDay()]}, ${MONTHS_SHORT[d.getMonth()]} ${d.getDate()}`;

export const fmtNumber = (n: number) =>
  n.toLocaleString('en-US', { maximumFractionDigits: 0 });

export const todayStart = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };

export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear()
  && a.getMonth() === b.getMonth()
  && a.getDate() === b.getDate();

export const keyOf = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/**
 * The one width the portal changes its mind at.
 *
 * Below this a seven-column month grid is dots rather than words, so
 * the calendar leads with Agenda and the unscheduled tray, which only
 * exists to be dragged out of, is not drawn at all.
 */
export const isNarrow = () => window.matchMedia('(max-width: 900px)').matches;

/** An ISO day from a Date, in the reader's own timezone. */
export const isoOf = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
