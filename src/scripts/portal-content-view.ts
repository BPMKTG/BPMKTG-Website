/* ──────────────────────────────────────────────────────────────
   The Content tab, on both screens.

   Two sides, and a row is on exactly one of them:

     My Content  the rows that belong to no campaign. The client's own
                 board, in their own vocabulary: Ideas by bucket, the
                 pipeline they film and post through, and the archive.
                 Drawn by portal-own-content.ts.
     Campaigns   the rows that belong to a moment, a lane per moment,
                 soonest first, five stages, with a line on every card
                 saying whose move it is.

   The month counter and the review strip sit above both, because
   neither is about one side.

   HQ across clients has no My Content side: there is no "my" when the
   page is the whole roster. It is Campaigns, with a switch that lays
   each client's own content in as one more lane.

   Below 768px a board becomes a list grouped by stage with a menu on
   each card, because five columns on a phone is five slivers and there
   is no dragging on a touch screen worth the name.

   The host supplies the cards, who is reading, and how to save. This
   file decides nothing about what may be saved.
   ────────────────────────────────────────────────────────────── */

import type { MomentRef } from '../data/portal';
import {
  campaignLanes,
  contentSide,
  isFiltering,
  matchesFilters,
  monthLabel,
  postedRecently,
  postMonths,
  shortDay,
  stageOf,
  CONTENT_MEDIA,
  NO_FILTERS,
  type CampaignLane,
  type ContentFilters,
  type PortalContentItem,
  type PortalContentSchema,
  type Voice,
} from '../data/portal-content';
import { isPhone, type Board } from './portal-board';
import { clear, el, icon, qq } from './portal-dom';
import type { OwnContent } from './portal-own-content';

export type ContentTab = 'own' | 'campaigns';

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
  /**
   * The My Content side: the rows with no campaign, drawn by the
   * restored board. Absent on a screen that has no "my", which is HQ
   * across the roster.
   */
  own?: { label: string; board: () => OwnContent };
  /**
   * HQ across clients: offer "Client's own content", which lays each
   * client's own rows into the campaign view as one more lane.
   */
  ownToggle?: string;
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
  /** Several at once, with one redraw. */
  setFilters: (patch: Partial<ContentFilters>) => void;
  tab: () => ContentTab;
  setTab: (t: ContentTab) => void;
}

export interface ContentView {
  draw: (root: HTMLElement) => void;
  api: ContentViewApi;
}

interface Saved {
  tab: ContentTab;
  /** HQ across clients: whether client-owned rows are laid in. */
  withOwn: boolean;
  f: ContentFilters;
  /** Lanes the reader has opened or closed by hand, by moment id. A
   *  lane not named here follows the default. */
  open: string[];
  closed: string[];
}

export function createContentView(host: ContentViewHost): ContentView {
  // The client's own board comes first where there is one: it is the
  // side they work in every day.
  const S: Saved = {
    tab: host.own ? 'own' : 'campaigns', withOwn: false,
    f: { ...NO_FILTERS }, open: [], closed: [],
  };

  /* ── remembering ──────────────────────────────────────────────── */
  (function load() {
    try {
      const raw = localStorage.getItem(host.storeKey);
      if (!raw) return;
      const v = JSON.parse(raw) as Partial<Saved> & { tab?: string };
      // "ideas" and "all" were tabs of the layout this replaced. Both
      // were where the client's own rows lived.
      if (v.tab === 'campaigns') S.tab = 'campaigns';
      else if (v.tab === 'own' || v.tab === 'ideas' || v.tab === 'all') S.tab = 'own';
      if (!host.own) S.tab = 'campaigns';
      if (typeof v.withOwn === 'boolean') S.withOwn = v.withOwn;
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
        tab: S.tab, withOwn: S.withOwn, f: { ...S.f, search: '' }, open: S.open, closed: S.closed,
      }));
    } catch { /* same */ }
  }

  const api: ContentViewApi = {
    filters: () => S.f,
    setFilter: (k, v) => { S.f[k] = v; remember(); host.redraw(); },
    // A filter is about the campaign side, so setting one from outside
    // (a chip on the counter) goes there to show what it narrowed.
    setFilters: (patch) => {
      S.f = { ...S.f, ...patch };
      if (Object.values(patch).some(Boolean)) S.tab = 'campaigns';
      remember();
      host.redraw();
    },
    tab: () => S.tab,
    setTab: (t) => { S.tab = t; remember(); host.redraw(); },
  };

  /* ── what is showing ──────────────────────────────────────────── */

  const momentId = (c: PortalContentItem) => host.momentRef(c)?.id ?? null;

  const ownRows = (): PortalContentItem[] => host.items().filter((c) => contentSide(c) === 'own');
  const campaignRows = (): PortalContentItem[] => host.items().filter((c) => contentSide(c) === 'campaign');

  /** The rows the campaign side is drawing: campaign rows, plus each
   *  client's own where the switch for that is on. */
  function campaignSide(): PortalContentItem[] {
    return S.withOwn && host.ownToggle ? host.items() : campaignRows();
  }

  function filtered(): PortalContentItem[] {
    return campaignSide().filter((c) =>
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

  /* ── the switch, and the campaign side's filters ──────────────── */

  function switchEl(): HTMLElement | null {
    if (!host.own) return null;
    const seg = el('div', 'pt-seg pt-sides');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'Which content');
    const live = (c: PortalContentItem) => c.status !== 'Posted' && c.status !== 'Skipped';
    const tabs: Array<[ContentTab, string, number]> = [
      ['own', host.own.label, ownRows().filter(live).length],
      ['campaigns', 'Campaigns', campaignRows().filter(live).length],
    ];
    for (const [t, text, n] of tabs) {
      const b = el('button');
      b.type = 'button';
      b.dataset.tab = t;
      b.setAttribute('aria-pressed', String(S.tab === t));
      b.append(el('span', undefined, text), el('span', 'pt-seg-n pt-num', String(n)));
      b.addEventListener('click', () => api.setTab(t));
      seg.appendChild(b);
    }
    return seg;
  }

  function filterBar(all: PortalContentItem[]): HTMLElement {
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

    const search = el('input', 'pt-input pt-input-search') as HTMLInputElement;
    search.type = 'search';
    search.placeholder = 'Search titles';
    search.setAttribute('aria-label', 'Search campaign content');
    search.value = S.f.search;
    search.addEventListener('input', () => {
      S.f.search = search.value;
      host.redraw();
      const again = qq<HTMLInputElement>('.pt-filters .pt-input-search')[0];
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    });
    row.appendChild(search);

    if (host.ownToggle) {
      const lab = el('label', 'pt-own-toggle');
      const box = el('input') as HTMLInputElement;
      box.type = 'checkbox';
      box.checked = S.withOwn;
      box.dataset.ownToggle = '1';
      box.addEventListener('change', () => { S.withOwn = box.checked; remember(); host.redraw(); });
      lab.append(box, el('span', undefined, host.ownToggle));
      row.appendChild(lab);
    }

    if (isFiltering(S.f)) {
      const clear = el('button', 'pt-filter-clear', 'Clear filters');
      clear.type = 'button';
      clear.addEventListener('click', () => { S.f = { ...NO_FILTERS }; remember(); host.redraw(); });
      row.appendChild(clear);
    }
    return row;
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

  /**
   * Each client's own content, as one more lane.
   *
   * Only on HQ across clients, and only when asked for. The same five
   * stages as the lanes above it, so the page reads as one board: an
   * idea is not on it, and Posted keeps to the last month, since a
   * client's archive would otherwise bury everything else.
   */
  function ownLanes(shown: PortalContentItem[]): HTMLElement[] {
    const now = new Date(`${host.today()}T00:00:00`);
    const by = new Map<string, PortalContentItem[]>();
    for (const c of shown) {
      if (contentSide(c) !== 'own') continue;
      const st = stageOf(c);
      if (!st || (st === 'posted' && !postedRecently(c, now))) continue;
      const who = host.clientOf?.(c) ?? '';
      if (!by.has(who)) by.set(who, []);
      by.get(who)!.push(c);
    }
    return [...by].sort((a, b) => a[0].localeCompare(b[0])).map(([who, items]) => {
      const key = `own:${who}`;
      const posted = items.filter((c) => c.status === 'Posted').length;
      const open = S.open.includes(key) || !S.closed.includes(key);
      const sec = el('section', 'pt-lane pt-lane-own');
      sec.dataset.lane = key;
      const head = el('button', 'pt-lane-head');
      head.type = 'button';
      head.setAttribute('aria-expanded', String(open));
      head.appendChild(icon('chev', 'pt-lane-chev'));
      const name = el('span', 'pt-lane-title');
      if (who) name.appendChild(el('span', 'pt-lane-who', `${who} · `));
      name.appendChild(document.createTextNode('Their own content'));
      head.append(name, el('span', 'pt-tag pt-tag-todo', 'Not a campaign'), el('span', 'pt-toolbar-spacer'));
      head.appendChild(el('span', 'pt-lane-tally pt-num', `${posted} of ${items.length} posted`));
      head.addEventListener('click', () => {
        S.open = S.open.filter((x) => x !== key);
        S.closed = S.closed.filter((x) => x !== key);
        (open ? S.closed : S.open).push(key);
        remember();
        host.redraw();
      });
      sec.appendChild(head);
      if (open) {
        const body = el('div', 'pt-lane-body');
        const opts = { inCampaign: true };
        body.appendChild(isPhone() ? host.board().list(items, opts) : host.board().lane(items, opts));
        sec.appendChild(body);
      }
      return sec;
    });
  }

  function campaignsEl(shown: PortalContentItem[]): HTMLElement {
    const lanes = campaignLanes(
      shown.filter((c) => !!stageOf(c)), (c) => host.momentRef(c), host.today());
    const own = S.withOwn && host.ownToggle ? ownLanes(shown) : [];
    if (!lanes.length && !own.length) {
      return isFiltering(S.f)
        ? host.empty('Nothing matches that', 'Try a different filter to see the rest of the campaigns.')
        : host.empty('No campaign content yet',
                     'When a show or a release has posts planned around it, they line up here by campaign.');
    }
    const wrap = el('div', 'pt-lanes');
    for (const l of lanes) wrap.appendChild(laneEl(l));
    for (const node of own) wrap.appendChild(node);
    return wrap;
  }

  /* ── the tab ──────────────────────────────────────────────────── */

  /** Which board a scroller is, so its position goes back to the same
   *  board after a redraw and not to whichever one is drawn first. */
  const scrollKey = (sc: HTMLElement): string =>
    sc.closest<HTMLElement>('[data-lane]')?.dataset.lane
    ?? `own:${sc.closest<HTMLElement>('[data-own-view]')?.dataset.ownView ?? ''}`;

  function draw(root: HTMLElement) {
    // Where each lane was scrolled to, so a save does not throw the
    // board back to its first column.
    const scroll = new Map<string, number>();
    for (const sc of qq('[data-board-scroll]', root)) {
      scroll.set(scrollKey(sc), sc.scrollLeft);
    }
    clear(root);

    const all = campaignSide();
    pruneFilters(all);
    host.board().begin();

    for (const block of host.above ?? []) {
      const node = block(api);
      if (node) root.appendChild(node);
    }
    const sw = switchEl();
    if (sw) root.appendChild(sw);

    const body = el('div', 'pt-conbody');
    body.dataset.tab = S.tab;
    if (S.tab === 'own' && host.own) {
      body.appendChild(host.own.board().draw());
    } else {
      body.appendChild(filterBar(all));
      body.appendChild(campaignsEl(filtered()));
    }
    root.appendChild(body);

    for (const sc of qq('[data-board-scroll]', root)) {
      const at = scroll.get(scrollKey(sc));
      if (at) sc.scrollLeft = at;
    }
  }

  return { draw, api };
}
