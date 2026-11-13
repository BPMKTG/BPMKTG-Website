/* ──────────────────────────────────────────────────────────────
   The month counter: what gets us to twenty-five.

   A tier is sold as a number of our posts a month, and the only way
   to know whether a month is on track is to count it. This is the
   count, where the work is, with the list behind the number one click
   away so "28" can be read as twenty-eight named pieces.

   Two voices. In HQ it is a working tool: the 15 to 25 band, red when
   a month is outside it, how many short or over, and a button to add
   a piece. In the client portal it is a statement, "Blueprint is
   making 21 pieces for you this month", with the same list and nothing
   to press.

   The counting itself is monthCount in the data layer. Nothing here
   decides what counts.
   ────────────────────────────────────────────────────────────── */

import {
  monthBounds,
  monthCount,
  monthLabel,
  shortDay,
  MONTH_CAP,
  MONTH_MIN,
  type MonthCount,
  type PortalContentItem,
} from '../data/portal-content';
import { MEDIA_ICON } from './portal-board';
import type { ContentViewApi } from './portal-content-view';
import { el, icon } from './portal-dom';
import { openSheet, sheetField, sheetSubmit } from './portal-sheet';

/** One client's worth of cards. HQ across a roster has several. */
export interface CounterGroup {
  key: string;
  /** The artist, shown only when there is more than one group. */
  name: string;
  items: PortalContentItem[];
}

export interface CounterHost {
  role: () => 'client' | 'admin';
  groups: () => CounterGroup[];
  /** The months that can be counted whole, oldest first. */
  months: () => string[];
  today: () => string;
  momentOf: (c: PortalContentItem) => string | null;
  openCard: (c: PortalContentItem) => void;
  /** HQ only: create a Planned piece of ours in that month. */
  addPiece?: (group: CounterGroup,
              piece: { title: string; media: string; postDate: string }) => Promise<boolean>;
  mediaOptions: () => string[];
  redraw: () => void;
}

export function createCounter(host: CounterHost): (view: ContentViewApi) => HTMLElement | null {
  /** Which month is being counted. Starts on this one every visit: a
   *  counter left on last month would quietly be read as today's. */
  let month = '';
  /** Whose lists are open, by group key. */
  const open = new Set<string>();

  function addSheet(group: CounterGroup, ym: string) {
    openSheet(`Add a piece for ${monthLabel(ym)}`, (form, close) => {
      const title = el('input', 'pt-input') as HTMLInputElement;
      title.required = true;
      title.maxLength = 200;
      title.placeholder = 'What is the piece';
      form.appendChild(sheetField('Title', title));

      const media = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
      for (const m of host.mediaOptions()) {
        const o = el('option', undefined, m) as HTMLOptionElement;
        o.value = m;
        media.appendChild(o);
      }
      form.appendChild(sheetField('What is it', media));

      const { first, last } = monthBounds(ym);
      const today = host.today();
      const when = el('input', 'pt-input') as HTMLInputElement;
      when.type = 'date';
      when.required = true;
      when.min = first;
      when.max = last;
      when.value = today >= first && today <= last ? today : first;
      form.appendChild(sheetField('Post date', when));
      form.appendChild(el('p', 'pt-sheet-note',
        `It is created as Planned, ours to post, for ${group.name}.`));

      const go = sheetSubmit(form, 'Add it');
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const name = title.value.trim();
        const iso = when.value;
        if (!name) { title.focus(); return; }
        if (iso < first || iso > last) { when.focus(); return; }
        go.disabled = true;
        const ok = await host.addPiece!(group, { title: name, media: media.value, postDate: iso });
        go.disabled = false;
        if (ok) close();
      });
    });
  }

  /** The bar: where the month stands against the band it should be
   *  in. The band is drawn, not just implied by colour, so the reading
   *  survives a greyscale screen. */
  function bar(c: MonthCount<PortalContentItem>): HTMLElement {
    const max = Math.max(MONTH_CAP + 5, c.planned);
    const pct = (n: number) => `${Math.min(100, (100 * n) / max)}%`;
    const track = el('div', 'pt-count-track');
    track.setAttribute('role', 'img');
    track.setAttribute('aria-label',
      `${c.planned} planned and ${c.posted} posted, against a target of ${MONTH_MIN} to ${MONTH_CAP}`);
    const band = el('span', 'pt-count-band');
    band.style.left = pct(MONTH_MIN);
    band.style.width = `${(100 * (MONTH_CAP - MONTH_MIN)) / max}%`;
    const planned = el('span', 'pt-count-fill');
    planned.style.width = pct(c.planned);
    const posted = el('span', 'pt-count-done');
    posted.style.width = pct(c.posted);
    track.append(band, planned, posted);
    for (const n of [MONTH_MIN, MONTH_CAP]) {
      const tick = el('span', 'pt-count-tick pt-num', String(n));
      tick.style.left = pct(n);
      track.appendChild(tick);
    }
    return track;
  }

  function listEl(c: MonthCount<PortalContentItem>): HTMLElement {
    // "Over cap" is our problem to fix, not a thing to tell a client
    // about their own month: to them the 26th piece is a piece.
    const flagOver = host.role() === 'admin';
    const table = el('ol', 'pt-count-list');
    for (const r of c.rows) {
      const li = el('li', 'pt-count-row');
      const done = r.item.status === 'Posted';
      const over = flagOver && r.overCap;
      if (done) li.dataset.done = 'true';
      if (over) li.dataset.over = 'true';
      const b = el('button', 'pt-count-rowbtn');
      b.type = 'button';
      b.addEventListener('click', () => host.openCard(r.item));
      b.appendChild(el('span', 'pt-count-n pt-num', String(r.n)));
      const check = el('span', 'pt-count-check');
      check.setAttribute('aria-label', done ? 'Posted' : 'Not posted yet');
      if (done) check.appendChild(icon('check'));
      b.appendChild(check);
      b.appendChild(el('span', 'pt-count-title', r.item.title));
      const media = r.item.media ?? 'Video';
      const m = el('span', 'pt-ccard-media');
      m.append(icon(MEDIA_ICON[media] ?? 'video'), el('span', undefined, media));
      b.appendChild(m);
      b.appendChild(el('span', 'pt-count-moment', host.momentOf(r.item) ?? ''));
      b.appendChild(el('span', 'pt-count-date pt-num', shortDay(r.item.postDate)));
      b.appendChild(el('span', 'pt-tag', r.item.status ?? ''));
      if (over) b.appendChild(el('span', 'pt-tag pt-tag-over', 'over cap'));
      li.appendChild(b);
      table.appendChild(li);
    }
    return table;
  }

  function monthPicker(months: string[]): HTMLElement {
    const nav = el('div', 'pt-count-month');
    const i = months.indexOf(month);
    const step = (by: number, label: string, glyph: string) => {
      const b = el('button', 'pt-count-step');
      b.type = 'button';
      b.setAttribute('aria-label', label);
      b.appendChild(icon(glyph));
      const to = months[i + by];
      b.disabled = !to;
      b.addEventListener('click', () => { if (to) { month = to; host.redraw(); } });
      return b;
    };
    nav.append(step(-1, 'Previous month', 'chev-left'),
               el('span', 'pt-count-monthname', monthLabel(month)),
               step(1, 'Next month', 'chev'));
    return nav;
  }

  function groupEl(group: CounterGroup, many: boolean, view: ContentViewApi): HTMLElement {
    const admin = host.role() === 'admin';
    const c = monthCount(group.items, month);
    const sec = el('section', 'pt-count');
    sec.dataset.group = group.key;
    // Red is ours to see. To the client a month is what we are making,
    // not a target we might be missing.
    if (admin) sec.dataset.state = c.state;

    const head = el('div', 'pt-count-head');
    const isOpen = open.has(group.key);
    const main = el('button', 'pt-count-main');
    main.type = 'button';
    main.setAttribute('aria-expanded', String(isOpen));
    main.title = isOpen ? 'Hide the list' : 'See every piece that counts';
    if (many) main.appendChild(el('span', 'pt-count-who', group.name));
    const now = month === host.today().slice(0, 7);
    if (admin) {
      const line = el('span', 'pt-count-line');
      line.append(
        el('strong', 'pt-num', String(c.planned)),
        el('span', undefined, ` of ${MONTH_CAP} planned · `),
        el('strong', 'pt-num', String(c.posted)),
        el('span', undefined, ' posted'));
      main.appendChild(line);
    } else {
      const when = now ? 'this month' : `in ${monthLabel(month).split(' ')[0]}`;
      main.appendChild(el('span', 'pt-count-line',
        c.planned
          ? `Blueprint is making ${c.planned} piece${c.planned === 1 ? '' : 's'} for you ${when} · ${c.posted} live`
          : `Nothing of ours is dated ${when} yet`));
    }
    main.appendChild(icon('chev', 'pt-count-chev'));
    main.addEventListener('click', () => {
      if (open.has(group.key)) open.delete(group.key); else open.add(group.key);
      host.redraw();
    });
    head.appendChild(main);

    if (admin) {
      const note = el('div', 'pt-count-note');
      if (c.state === 'under') {
        note.appendChild(el('span', 'pt-count-flag', `${c.short} short`));
        if (host.addPiece) {
          const add = el('button', 'pt-btn pt-count-add');
          add.type = 'button';
          add.append(icon('plus'), el('span', undefined, 'Add a piece'));
          add.addEventListener('click', () => addSheet(group, month));
          note.appendChild(add);
        }
      } else if (c.state === 'over') {
        note.appendChild(el('span', 'pt-count-flag', `${c.over} over, trim or move`));
      } else {
        note.appendChild(el('span', 'pt-count-fine', 'On target'));
      }
      head.appendChild(note);
    }
    sec.appendChild(head);

    if (admin) {
      sec.appendChild(bar(c));
      // What the month is made of. Each chip narrows the board below
      // to that media in this month, which is the same set the chip
      // counted.
      if (c.byMedia.length) {
        const chips = el('div', 'pt-count-chips');
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', 'Filter by media');
        const f = view.filters();
        for (const m of c.byMedia) {
          const on = f.media === m.media && f.month === month;
          const b = el('button', 'pt-count-chip' + (on ? ' pt-count-chip-on' : ''));
          b.type = 'button';
          b.setAttribute('aria-pressed', String(on));
          b.append(icon(MEDIA_ICON[m.media] ?? 'video'),
                   el('span', undefined, m.media), el('strong', 'pt-num', String(m.n)));
          b.addEventListener('click', () => {
            view.setFilters(on ? { media: '', month: '' } : { media: m.media, month });
          });
          chips.appendChild(b);
        }
        sec.appendChild(chips);
      }
    } else if (c.planned) {
      const track = el('div', 'pt-count-track pt-count-track-plain');
      track.setAttribute('role', 'img');
      track.setAttribute('aria-label', `${c.posted} of ${c.planned} live`);
      const done = el('span', 'pt-count-done');
      done.style.width = `${(100 * c.posted) / c.planned}%`;
      track.appendChild(done);
      sec.appendChild(track);
    }

    if (isOpen) {
      sec.appendChild(c.rows.length
        ? listEl(c)
        : el('p', 'pt-count-none', `Nothing of ours is dated in ${monthLabel(month)} yet.`));
    }
    return sec;
  }

  return (view) => {
    const groups = host.groups();
    if (!groups.length) return null;
    const months = host.months();
    const current = host.today().slice(0, 7);
    if (!month || !months.includes(month)) {
      month = months.includes(current) ? current : months[months.length - 1] ?? current;
    }
    const wrap = el('div', 'pt-counts');
    wrap.appendChild(monthPicker(months.length ? months : [month]));
    for (const g of groups) wrap.appendChild(groupEl(g, groups.length > 1, view));
    return wrap;
  };
}

