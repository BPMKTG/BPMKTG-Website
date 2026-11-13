/* ──────────────────────────────────────────────────────────────
   The Content tab, on both screens.

   Three ways to look at one pipeline:

     Campaigns  the rows that belong to a moment, a lane per moment,
                soonest moment first. This is how the work is sold
                and how it is planned, so it is the default.
     Ideas      the client's backlog: what is still only an idea, and
                what they are making on their own. A list, because an
                idea has no stage to be in a column of.
     All        one board, no grouping.

   Filters narrow all three and are remembered per browser. "Waiting
   on" is not a field anywhere: it is whose move the card's next-move
   line says it is, so the filter and the card cannot disagree.

   Below 768px the board becomes a list grouped by stage with a menu
   on each card, because five columns on a phone is five slivers and
   there is no dragging on a touch screen worth the name.

   The host supplies the cards, who is reading, and how to save. This
   file decides nothing about what may be saved.
   ────────────────────────────────────────────────────────────── */

import type { MomentRef } from '../data/portal';
import {
  campaignLanes,
  inIdeas,
  isFiltering,
  isIdea,
  matchesFilters,
  monthLabel,
  nextMove,
  originOf,
  postedRecently,
  postMonths,
  shortDay,
  stageOf,
  CONTENT_MEDIA,
  NO_FILTERS,
  STAGE_TITLE,
  type CampaignLane,
  type ContentFilters,
  type PortalContentItem,
  type PortalContentSchema,
  type Voice,
} from '../data/portal-content';
import { isPhone, MEDIA_ICON, type Board } from './portal-board';
import { clear, el, icon, qq } from './portal-dom';
import { openSheet, sheetField, sheetSubmit } from './portal-sheet';

export type ContentTab = 'campaigns' | 'ideas' | 'all';

const TABS: Array<[ContentTab, string]> = [
  ['campaigns', 'Campaigns'], ['ideas', 'Ideas'], ['all', 'All'],
];

export interface ContentViewHost {
  /** Where this screen remembers its tab and filters. */
  storeKey: string;
  role: () => 'client' | 'admin';
  /** Every card in scope, unfiltered. */
  items: () => PortalContentItem[];
  schema: () => PortalContentSchema;
  board: () => Board;
  voice: (c: PortalContentItem) => Voice;
  momentRef: (c: PortalContentItem) => MomentRef | null;
  openCard: (c: PortalContentItem) => void;
  save: (c: PortalContentItem, patch: Record<string, unknown>,
         local: Partial<PortalContentItem>) => Promise<boolean>;
  /** Open the "new idea" form, where this screen has one. */
  newIdea?: () => void;
  toast: (text: string, bad?: boolean) => void;
  empty: (title: string, body: string) => HTMLElement;
  /** Today as an ISO day, the host's idea of it. */
  today: () => string;
  /** Draw the whole tab again. The host owns the mount. */
  redraw: () => void;
  /** HQ across clients: whose card, and whose lane. */
  clientOf?: (c: PortalContentItem) => string | null;
  /** Extra blocks above the switch: the month counter, the review
   *  strip. Each gets the filtered-by-nothing cards and may return
   *  null to draw nothing. */
  above?: Array<(view: ContentViewApi) => HTMLElement | null>;
}

/** What a block drawn above the switch may ask of the view. */
export interface ContentViewApi {
  filters: () => ContentFilters;
  setFilter: (k: keyof ContentFilters, v: string) => void;
  tab: () => ContentTab;
  setTab: (t: ContentTab) => void;
}

export interface ContentView {
  draw: (root: HTMLElement) => void;
  api: ContentViewApi;
}

interface Saved {
  tab: ContentTab;
  f: ContentFilters;
  /** Lanes the reader has opened or closed by hand, by moment id. A
   *  lane not named here follows the default. */
  open: string[];
  closed: string[];
}

export function createContentView(host: ContentViewHost): ContentView {
  const S: Saved = { tab: 'campaigns', f: { ...NO_FILTERS }, open: [], closed: [] };

  /* ── remembering ──────────────────────────────────────────────── */
  (function load() {
    try {
      const raw = localStorage.getItem(host.storeKey);
      if (!raw) return;
      const v = JSON.parse(raw) as Partial<Saved>;
      if (v.tab === 'campaigns' || v.tab === 'ideas' || v.tab === 'all') S.tab = v.tab;
      for (const k of Object.keys(NO_FILTERS) as Array<keyof ContentFilters>) {
        // The search box is a thing you type into now, not a setting.
        if (k !== 'search' && typeof v.f?.[k] === 'string') S.f[k] = v.f[k] as string;
      }
      const ids = (x: unknown) => (Array.isArray(x) ? x.filter((i): i is string => typeof i === 'string') : []);
      S.open = ids(v.open);
      S.closed = ids(v.closed);
    } catch { /* a browser that will not remember is not an error */ }
  })();

  function remember() {
    try {
      localStorage.setItem(host.storeKey, JSON.stringify({
        tab: S.tab, f: { ...S.f, search: '' }, open: S.open, closed: S.closed,
      }));
    } catch { /* same */ }
  }

  const api: ContentViewApi = {
    filters: () => S.f,
    setFilter: (k, v) => { S.f[k] = v; remember(); host.redraw(); },
    tab: () => S.tab,
    setTab: (t) => { S.tab = t; remember(); host.redraw(); },
  };

  /* ── what is showing ──────────────────────────────────────────── */

  const momentId = (c: PortalContentItem) => host.momentRef(c)?.id ?? null;

  function filtered(): PortalContentItem[] {
    return host.items().filter((c) =>
      matchesFilters(c, S.f, { voice: host.voice(c), momentId: momentId(c) }));
  }

  /** A saved filter can outlive what it pointed at: a moment that has
   *  passed out of the window, a month with nothing left in it. Rather
   *  than show an empty board nobody can explain, it is dropped. */
  function pruneFilters(all: PortalContentItem[]) {
    let changed = false;
    if (S.f.moment && !all.some((c) => momentId(c) === S.f.moment)) { S.f.moment = ''; changed = true; }
    if (S.f.month && !postMonths(all).includes(S.f.month)) { S.f.month = ''; changed = true; }
    if (changed) remember();
  }

  /* ── the toolbar ──────────────────────────────────────────────── */

  function toolbar(all: PortalContentItem[], shown: PortalContentItem[]): HTMLElement {
    const wrap = el('div', 'pt-conbar');

    const top = el('div', 'pt-toolbar');
    const seg = el('div', 'pt-seg');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'Content view');
    const counts: Record<ContentTab, number> = {
      campaigns: shown.filter((c) => originOf(c) === 'campaign' && !!stageOf(c)).length,
      ideas: shown.filter(inIdeas).length,
      // What the board will actually draw, not every post there ever was.
      all: onBoard(shown).length,
    };
    for (const [t, text] of TABS) {
      const b = el('button');
      b.type = 'button';
      b.dataset.tab = t;
      b.setAttribute('aria-pressed', String(S.tab === t));
      b.append(el('span', undefined, text), el('span', 'pt-seg-n pt-num', String(counts[t])));
      b.addEventListener('click', () => api.setTab(t));
      seg.appendChild(b);
    }
    top.append(seg, el('span', 'pt-toolbar-spacer'));

    const search = el('input', 'pt-input pt-input-search') as HTMLInputElement;
    search.type = 'search';
    search.placeholder = 'Search titles';
    search.setAttribute('aria-label', 'Search content');
    search.value = S.f.search;
    search.addEventListener('input', () => {
      S.f.search = search.value;
      host.redraw();
      const again = qq<HTMLInputElement>('.pt-conbar .pt-input-search')[0];
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    });
    top.appendChild(search);

    if (host.newIdea) {
      const add = el('button', 'pt-btn pt-btn-primary pt-btn-add');
      add.type = 'button';
      add.append(icon('plus'), el('span', undefined, 'New idea'));
      add.addEventListener('click', () => host.newIdea!());
      top.appendChild(add);
    }
    wrap.appendChild(top);

    /* the filters */
    const row = el('div', 'pt-filters');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Filters');
    const pick = (key: keyof ContentFilters, label: string, opts: Array<[string, string]>) => {
      const sel = el('select', 'pt-select pt-filter') as HTMLSelectElement;
      sel.setAttribute('aria-label', label);
      sel.dataset.filter = key;
      if (S.f[key]) sel.classList.add('pt-filter-on');
      for (const [v, text] of opts) {
        const o = el('option', undefined, text) as HTMLOptionElement;
        o.value = v;
        if (S.f[key] === v) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => api.setFilter(key, sel.value));
      row.appendChild(sel);
    };

    const media = host.schema().media.length ? host.schema().media.map((o) => o.name) : [...CONTENT_MEDIA];
    pick('media', 'Filter by media', [['', 'Any media'], ...media.map((m) => [m, m] as [string, string])]);

    // In the client's own portal the other party is "you"; across a
    // roster it is whichever client the card belongs to.
    const them = host.role() === 'client' ? 'you' : 'the client';
    pick('waiting', 'Filter by who it is waiting on',
      [['', 'Waiting on anyone'], ['Blueprint', 'Waiting on Blueprint'], ['Client', `Waiting on ${them}`]]);
    pick('postedBy', 'Filter by who posts it',
      [['', 'Posted by anyone'], ['Blueprint', 'Blueprint posts'], ['Client', host.role() === 'client' ? 'You post' : 'Client posts']]);

    const moments = new Map<string, string>();
    for (const c of all) {
      const m = host.momentRef(c);
      if (!m || moments.has(m.id)) continue;
      const who = host.clientOf?.(c);
      moments.set(m.id, who ? `${who} · ${m.title}` : m.title);
    }
    if (moments.size) {
      pick('moment', 'Filter by moment',
        [['', 'Any moment'], ...[...moments].sort((a, b) => a[1].localeCompare(b[1]))]);
    }
    const months = postMonths(all);
    if (months.length) {
      pick('month', 'Filter by month',
        [['', 'Any month'], ...months.map((ym) => [ym, monthLabel(ym)] as [string, string])]);
    }
    if (isFiltering(S.f)) {
      const clear = el('button', 'pt-filter-clear', 'Clear filters');
      clear.type = 'button';
      clear.addEventListener('click', () => { S.f = { ...NO_FILTERS }; remember(); host.redraw(); });
      row.appendChild(clear);
    }
    wrap.appendChild(row);
    return wrap;
  }

  /* ── Campaigns ────────────────────────────────────────────────── */

  const laneKey = (l: CampaignLane<PortalContentItem>) => l.moment?.id ?? 'unlinked';

  /** Open unless everything in it has gone out, and then only if the
   *  reader has not said otherwise. A finished campaign is history;
   *  the ones still moving are what the page is for. */
  function laneOpen(l: CampaignLane<PortalContentItem>): boolean {
    const k = laneKey(l);
    if (S.open.includes(k)) return true;
    if (S.closed.includes(k)) return false;
    return l.posted < l.total;
  }

  function toggleLane(l: CampaignLane<PortalContentItem>) {
    const k = laneKey(l);
    const now = !laneOpen(l);
    S.open = S.open.filter((x) => x !== k);
    S.closed = S.closed.filter((x) => x !== k);
    (now ? S.open : S.closed).push(k);
    remember();
    host.redraw();
  }

  function laneEl(l: CampaignLane<PortalContentItem>): HTMLElement {
    const open = laneOpen(l);
    const sec = el('section', 'pt-lane');
    sec.dataset.lane = laneKey(l);

    const head = el('button', 'pt-lane-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(open));
    const chev = icon('chev', 'pt-lane-chev');
    head.appendChild(chev);

    const who = l.items.length ? host.clientOf?.(l.items[0]) ?? null : null;
    const title = l.moment ? l.moment.title : 'Other campaign work';
    const name = el('span', 'pt-lane-title');
    if (who) name.appendChild(el('span', 'pt-lane-who', `${who} · `));
    name.appendChild(document.createTextNode(title));
    head.appendChild(name);
    if (l.moment?.momentType) head.appendChild(el('span', 'pt-tag', l.moment.momentType));
    if (l.moment?.date) head.appendChild(el('span', 'pt-lane-date pt-num', shortDay(l.moment.date)));
    head.appendChild(el('span', 'pt-toolbar-spacer'));

    const tally = el('span', 'pt-lane-tally');
    tally.appendChild(el('span', 'pt-num', `${l.posted} of ${l.total} posted`));
    const bar = el('span', 'pt-lane-bar');
    const fill = el('span');
    fill.style.width = `${l.total ? Math.round((100 * l.posted) / l.total) : 0}%`;
    bar.appendChild(fill);
    tally.appendChild(bar);
    head.appendChild(tally);
    head.addEventListener('click', () => toggleLane(l));
    sec.appendChild(head);

    if (open) {
      const body = el('div', 'pt-lane-body');
      const opts = { inCampaign: true };
      body.appendChild(isPhone() ? host.board().list(l.items, opts) : host.board().lane(l.items, opts));
      sec.appendChild(body);
    }
    return sec;
  }

  function campaignsEl(shown: PortalContentItem[]): HTMLElement {
    const lanes = campaignLanes(
      shown.filter((c) => !!stageOf(c)), (c) => host.momentRef(c), host.today());
    if (!lanes.length) {
      return isFiltering(S.f)
        ? host.empty('Nothing matches that', 'Try a different filter to see the rest of the campaigns.')
        : host.empty('No campaign content yet',
                     'When a show or a release has posts planned around it, they line up here by campaign.');
    }
    const wrap = el('div', 'pt-lanes');
    for (const l of lanes) wrap.appendChild(laneEl(l));
    return wrap;
  }

  /* ── All ──────────────────────────────────────────────────────── */

  /** The cards the All board draws. Posted history is kept to a month
   *  unless a month was asked for, in which case it is shown whole. */
  function onBoard(shown: PortalContentItem[]): PortalContentItem[] {
    const now = new Date(`${host.today()}T00:00:00`);
    return shown.filter((c) => {
      const st = stageOf(c);
      return !!st && (st !== 'posted' || !!S.f.month || postedRecently(c, now));
    });
  }

  function allEl(shown: PortalContentItem[]): HTMLElement {
    const now = new Date(`${host.today()}T00:00:00`);
    const live = onBoard(shown);
    if (!live.length) {
      return isFiltering(S.f)
        ? host.empty('Nothing matches that', 'Try a different filter to see the rest of the board.')
        : host.empty('Nothing is moving yet', 'A card joins the board as soon as it is planned.');
    }
    const wrap = el('div', 'pt-boardwrap');
    wrap.appendChild(isPhone() ? host.board().list(live) : host.board().lane(live));
    if (!S.f.month) {
      const older = shown.filter((c) => stageOf(c) === 'posted' && !postedRecently(c, now)).length;
      if (older) {
        wrap.appendChild(el('p', 'pt-board-older',
          `${older} older post${older === 1 ? '' : 's'} not shown. Pick a month to see them.`));
      }
    }
    return wrap;
  }

  /* ── Ideas ────────────────────────────────────────────────────── */

  function planSheet(c: PortalContentItem) {
    openSheet('Plan it', (form, close) => {
      form.appendChild(el('p', 'pt-sheet-note',
        `Give "${c.title}" a date and it moves out of Ideas and onto the board.`));
      const when = el('input', 'pt-input') as HTMLInputElement;
      when.type = 'date';
      when.required = true;
      when.min = host.today();
      when.value = c.postDate ?? '';
      form.appendChild(sheetField('Post date', when));

      const media = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
      const names = host.schema().media.length ? host.schema().media.map((o) => o.name) : [...CONTENT_MEDIA];
      for (const m of names) {
        const o = el('option', undefined, m) as HTMLOptionElement;
        o.value = m;
        if ((c.media ?? 'Video') === m) o.selected = true;
        media.appendChild(o);
      }
      form.appendChild(sheetField('What is it', media));

      const go = sheetSubmit(form, 'Plan it');
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const iso = when.value;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) { when.focus(); return; }
        go.disabled = true;
        const patch = { status: 'Planned', postDate: iso, media: media.value };
        const ok = await host.save(c, patch, patch);
        go.disabled = false;
        if (ok) { host.toast(`Planned for ${shortDay(iso)}`); close(); }
      });
    });
  }

  function ideaRow(c: PortalContentItem): HTMLElement {
    const li = el('li', 'pt-idea');
    const open = el('button', 'pt-idea-open');
    open.type = 'button';
    open.setAttribute('aria-label', `Open ${c.title}`);
    open.addEventListener('click', () => host.openCard(c));
    open.appendChild(el('span', 'pt-idea-title', c.title));
    const meta = el('span', 'pt-idea-meta');
    const who = host.clientOf?.(c) ?? null;
    if (who) meta.appendChild(el('span', 'pt-ccard-who', who));
    const media = c.media ?? 'Video';
    const m = el('span', 'pt-ccard-media');
    m.append(icon(MEDIA_ICON[media] ?? 'video'), el('span', undefined, media));
    meta.appendChild(m);
    if (!isIdea(c)) {
      const move = nextMove(c, host.voice(c));
      const st = stageOf(c);
      if (st) meta.appendChild(el('span', 'pt-tag', STAGE_TITLE[st]));
      if (move) meta.appendChild(el('span', undefined, move.text));
    } else if (c.notes) {
      meta.appendChild(el('span', 'pt-idea-notes', c.notes));
    }
    open.appendChild(meta);
    li.appendChild(open);

    if (isIdea(c)) {
      const plan = el('button', 'pt-btn pt-idea-plan', 'Plan it');
      plan.type = 'button';
      plan.addEventListener('click', () => planSheet(c));
      li.appendChild(plan);
    }
    return li;
  }

  function ideasEl(shown: PortalContentItem[]): HTMLElement {
    const mine = shown.filter(inIdeas);
    if (!mine.length) {
      return isFiltering(S.f)
        ? host.empty('Nothing matches that', 'Try a different filter to see the rest of the ideas.')
        : host.empty('The idea well is empty', 'Jot one down and it lands here, ready to plan.');
    }
    const wrap = el('div', 'pt-ideas');

    const section = (title: string, rows: PortalContentItem[], color?: string) => {
      if (!rows.length) return;
      const sec = el('section', 'pt-ideas-sec');
      const head = el('div', 'pt-ideas-head');
      const h = el('h3', color ? `pt-bchip pt-nc-${color}` : undefined, title);
      head.append(h, el('span', 'pt-board-count pt-num', String(rows.length)));
      sec.appendChild(head);
      const list = el('ul', 'pt-idealist');
      for (const c of rows) list.appendChild(ideaRow(c));
      sec.appendChild(list);
      wrap.appendChild(sec);
    };

    // What is already moving comes first: it has a date on it.
    const moving = mine.filter((c) => !isIdea(c))
      .sort((a, b) => (a.postDate ?? '9999').localeCompare(b.postDate ?? '9999'));
    section('Planned on their own', moving);

    const ideas = mine.filter(isIdea);
    const buckets = host.schema().bucket;
    for (const b of buckets) section(b.name, ideas.filter((c) => c.bucket === b.name), b.color);
    const known = new Set(buckets.map((b) => b.name));
    section('No bucket yet', ideas.filter((c) => !c.bucket || !known.has(c.bucket)));
    return wrap;
  }

  /* ── the tab ──────────────────────────────────────────────────── */

  function draw(root: HTMLElement) {
    // Where each lane was scrolled to, so a save does not throw the
    // board back to its first column.
    const scroll = new Map<string, number>();
    for (const sc of qq('[data-board-scroll]', root)) {
      scroll.set(sc.closest<HTMLElement>('[data-lane]')?.dataset.lane ?? '', sc.scrollLeft);
    }
    clear(root);

    const all = host.items();
    pruneFilters(all);
    const shown = filtered();
    host.board().begin();

    for (const block of host.above ?? []) {
      const node = block(api);
      if (node) root.appendChild(node);
    }
    root.appendChild(toolbar(all, shown));

    const body = el('div', 'pt-conbody');
    body.dataset.tab = S.tab;
    body.appendChild(S.tab === 'campaigns' ? campaignsEl(shown)
      : S.tab === 'ideas' ? ideasEl(shown)
      : allEl(shown));
    root.appendChild(body);

    for (const sc of qq('[data-board-scroll]', root)) {
      const at = scroll.get(sc.closest<HTMLElement>('[data-lane]')?.dataset.lane ?? '');
      if (at) sc.scrollLeft = at;
    }
  }

  return { draw, api };
}
