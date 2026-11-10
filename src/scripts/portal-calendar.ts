/**
 * The calendar, as one thing both screens build.
 *
 * This is the client portal's calendar, lifted whole: month, week and
 * agenda views, the layer chips, the quick views, the Unscheduled
 * tray, the "+N more" popover, and drag-and-drop with the moment
 * cascade. HQ draws the same calendar over every client at once.
 *
 * Everything the two screens do differently goes through the host:
 * where to draw, which layers exist, who is looking, what a row opens,
 * what a drag writes. The host supplies the writes rather than the
 * module calling the API itself, so neither screen can quietly get a
 * weaker permission check than the other: `role` is passed through to
 * the same `canSetStepDate` either way.
 *
 * It holds no module-level state. Each `createCalendar` call owns its
 * own view state and its own storage key, so two calendars can be
 * alive at once without reading each other's prefs.
 */
import {
  canSetStepDate,
  isFilmStep,
  isStepDone,
  parseNotionDate,
  showsOnCalendar,
  stepLayers,
  type CalendarLayer,
  type PortalCalendarItem,
  type PortalContentItem,
  type PortalMoment,
} from '../data/portal';
import { contentPhase, type ContentPhase } from '../data/portal-content';
import {
  clear, el, fmtDate, fmtDateShort, fmtDayLong, icon, isNarrow, isoOf,
  keyOf, q, qq, sameDay, show, todayStart, DOW, MONTHS,
} from './portal-dom';

/** A calendar row that is really a Content Pipeline card. The calendar
 *  shows one card twice when it has both a film date and a post date,
 *  which is why the role rides along with the row. */
export type CalRow = PortalCalendarItem & {
  content?: PortalContentItem;
  contentRole?: 'post' | 'film';
};

/** The bucket options the tray groups and colours by. */
export interface CalendarSchema {
  bucket: Array<{ name: string; color: string }>;
}

/**
 * What a screen has to provide to get a calendar.
 *
 * The write members (`moveStep`, `askMoveMoment`, `saveCard`) are the
 * screen's own, already-permission-checked save paths. The module
 * decides whether a row may be dragged at all, with `canSetStepDate`
 * and the host's `role`, and then hands the write over.
 */
export interface CalendarHost {
  /** Where to draw. Null while the view is not mounted. */
  root(): HTMLElement | null;
  /** 'client' or 'admin'. Passed straight to `canSetStepDate`. */
  role(): string;
  /** localStorage key for this screen's view prefs. */
  store: string;
  /** The layers this screen has, in chip order. */
  layers(): CalendarLayer[];
  /** The Content Pipeline cards this screen knows about. */
  content(): PortalContentItem[];
  /** Bucket options, for tray grouping and chip colour. */
  schema(): CalendarSchema;
  /** Rows to show besides the calendar's own: the content cards,
   *  already turned into rows. */
  extraRows(): PortalCalendarItem[];
  /** Put the screen on the calendar view, if it is not already. */
  showCalendar(): void;

  /* how a row looks */
  kindOf(it: PortalCalendarItem): string;
  kindLabel(kind: string): string;
  momentKind(m: PortalMoment): 'show' | 'release' | 'moment';
  bucketColor(name: string | null): string;

  /* what a row offers */
  canTick(it: PortalCalendarItem): boolean;
  tickBox(it: PortalCalendarItem, big?: boolean): HTMLElement;
  itemRow(it: PortalCalendarItem, pad?: boolean): HTMLLIElement;
  openItem(it: PortalCalendarItem): void;
  openCard(c: PortalContentItem): void;
  toast(text: string, bad?: boolean): void;

  /* the writes */
  moveStep(it: PortalCalendarItem, iso: string): Promise<void>;
  askMoveMoment(it: PortalCalendarItem, iso: string): boolean;
  saveCard(
    id: string,
    patch: Record<string, unknown>,
    local: Partial<PortalContentItem>,
  ): Promise<boolean>;
}

export function createCalendar(H: CalendarHost) {
  /** The calendar rows as they came from the server. CAL.items is this,
   *  minus the steps that are off the calendar, plus the content rows,
   *  rebuilt after every content save. */
  let CAL_BASE: PortalCalendarItem[] = [];

  /**
   * Skipped and Moved steps are dropped here rather than in
   * passesFilter, so they are gone from every view, every count, the
   * campaign picker and the "+N more" alike: a step nobody is going to
   * do is not a thing the calendar has an opinion about.
   */
  function syncCalendarContent() {
    CAL.items = CAL_BASE.filter(showsOnCalendar).concat(H.extraRows());
  }

  /* ── calendar ──────────────────────────────────────────────── */
  type CalView = 'month' | 'week' | 'agenda';

  /**
   * One calendar holds everything, and the layers decide what you are
   * looking at. This replaced a single-choice dropdown: a client who
   * wanted their shoots AND their own to-dos, but not our task list,
   * could not say so with one <select>.
   */
  type Layer = CalendarLayer;

  /** What each layer is called. Every layer there is, including the one
   *  this screen does not draw: DAY_ORDER and the "+N more" popover
   *  rank and label by layer, and those have to stay total. The chips
   *  come from H.layers() below, which is the shorter list. */
  const LAYER_LABEL = new Map<Layer, string>([
    ['moments',   'Shows & releases'],
    ['posts',     'Posts'],
    ['films',     'Film days'],
    ['todos',     'Your to-dos'],
    ['blueprint', 'Blueprint tasks'],
  ]);

  const PHASES: Array<[ContentPhase, string]> = [
    ['planned', 'Planned'], ['progress', 'In progress'], ['posted', 'Posted'],
  ];

  const CAL = {
    view: 'month' as CalView,
    cursor: todayStart(),
    /** Every layer this viewer has is the default: the calendar is
     *  the whole plan. Filled in by renderCalendar, once the payload
     *  has said who is looking. */
    layers: new Set<Layer>(),
    /** Empty means every bucket, not none. */
    buckets: new Set<string>(),
    phase: '' as '' | ContentPhase,
    /** A moment id, or '' for every campaign. */
    campaign: '',
    selected: null as Date | null,
    items: [] as PortalCalendarItem[],
    /** The unscheduled tray, desktop only. */
    tray: true,
    traySearch: '',
  };

  /** Every campaign a client could filter by: the moments on their own
   *  calendar, plus any moment a step points at that is not itself
   *  visible, so a filter never offers a name with nothing behind it. */
  function campaigns(): PortalMoment[] {
    const byId = new Map<string, PortalMoment>();
    for (const it of CAL.items) {
      if (it.moment) byId.set(it.moment.id, it.moment);
      if (it.id && H.kindOf(it) !== 'content' && H.kindOf(it) !== 'todo' && it.momentType) {
        byId.set(it.id, { id: it.id, title: it.title, momentType: it.momentType, date: it.date });
      }
    }
    const now = todayStart();
    const t = (m: PortalMoment) => parseNotionDate(m.date)?.getTime() ?? Infinity;
    // Upcoming first, soonest at the top; past campaigns fall below.
    return Array.from(byId.values()).sort((a, b) => {
      const ua = t(a) >= now.getTime(), ub = t(b) >= now.getTime();
      if (ua !== ub) return ua ? -1 : 1;
      return ua ? t(a) - t(b) : t(b) - t(a);
    });
  }

  function campaignName(id: string): string {
    return campaigns().find((m) => m.id === id)?.title ?? 'This campaign';
  }

  function filterToCampaign(id: string) {
    CAL.campaign = id;
    CAL.selected = null;
    // Land on the month the campaign lives in, not whatever was on screen.
    const d = parseNotionDate(campaigns().find((m) => m.id === id)?.date ?? null);
    if (d) CAL.cursor = d;
    drawCalendar();
    // The hash change redraws the shell; if we are already on the
    // calendar it does nothing, which is why the draw comes first.
    H.showCalendar();
  }

  /** A post the client puts up themselves, still to go out. It is two
   *  things at once: a post on the calendar, and a job on their list,
   *  so it answers to either layer. */
  function isClientPostTodo(c: PortalContentItem): boolean {
    return c.postedBy === 'Client' && c.status !== 'Posted' && c.status !== 'Skipped';
  }

  /**
   * A campaign step whose job is to put something out.
   *
   * Drawn as a post wherever it appears, and sitting in the Posts
   * layer beside the content board's own cards, because from the
   * client's side there is no difference: both are a thing that goes
   * out on a day. Which database it lives in is our bookkeeping.
   */
  function isCampaignPost(it: PortalCalendarItem): boolean {
    if ((it as CalRow).content) return false;
    if (it.momentType || it.kind === 'Moment') return false;
    // A step marked with the clapperboard is the filming, not the
    // post, so it does not wear the post pill either.
    if (isFilmStep(it)) return false;
    return it.type === 'Content';
  }

  /**
   * Which layers an item belongs to. Some belong to two.
   *
   * A step's layers are stepLayers() in src/data/portal.ts, where the
   * rule is tested and where HQ reads it from too. This function is
   * the part that only the portal has: the content board's own rows,
   * which are not steps and have no Owner or Type.
   *
   * An item in two layers is drawn once and shows if EITHER is on,
   * which is what passesFilter does with this list.
   */
  function layersOf(it: PortalCalendarItem): Layer[] {
    const row = it as CalRow;
    if (row.content && row.contentRole) {
      if (row.contentRole === 'film') return ['films'];
      return isClientPostTodo(row.content) ? ['posts', 'todos'] : ['posts'];
    }
    // A moment is a moment whoever owns it: it is the thing the steps
    // are counting down to, not a task.
    if (it.momentType) return ['moments'];

    // Owner and Type are each two-valued, so every step lands in at
    // least one layer and there is nothing to catch.
    return stepLayers(it);
  }

  function passesFilter(it: PortalCalendarItem): boolean {
    // A campaign filter keeps the moment itself as well as its steps:
    // the release date is the point the steps are counting down to.
    if (CAL.campaign && it.id !== CAL.campaign && it.moment?.id !== CAL.campaign) return false;
    if (!layersOf(it).some((l) => CAL.layers.has(l))) return false;

    // Bucket and status describe content and nothing else. They narrow
    // the content on the calendar and leave the campaign around it
    // standing: picking "Skit" should not hide the show you are making
    // skits for.
    const c = (it as CalRow).content;
    if (!c) return true;
    if (CAL.buckets.size && !(c.bucket && CAL.buckets.has(c.bucket))) return false;
    if (CAL.phase && contentPhase(c.status) !== CAL.phase) return false;
    return true;
  }

  /** Whether the calendar is showing a slice rather than all of it. */
  function calFiltering(): boolean {
    return CAL.layers.size !== H.layers().length
      || CAL.buckets.size > 0 || !!CAL.phase || !!CAL.campaign;
  }

  /* ── quick views ──────────────────────────────────────────────
     A named set of layers, because "show me my week" is one thought
     and four chip taps. */
  type Quick = 'everything' | 'content' | 'week' | 'campaigns';

  const QUICK: Array<[Quick, string, () => Layer[]]> = [
    ['everything', 'Everything',   () => H.layers()],
    ['content',    'Content only', () => ['posts', 'films']],
    ['week',       'My week',      () => ['todos', 'films']],
    // Campaigns means a moment and the work behind it. Here that is
    // the moment: the work behind it is ours, and the layer it sits in
    // is on our own screen rather than this one.
    ['campaigns',  'Campaigns',    () => ['moments']],
  ];

  /** "My week" means the week grid, except at phone width where a
   *  seven-column grid is unreadable and Agenda says the same thing. */
  function quickWants(q: Quick): CalView | null {
    return q === 'week' ? (isNarrow() ? 'agenda' : 'week') : null;
  }

  /** The tab to light up, worked out from the state rather than stored
   *  beside it, so toggling a chip by hand cannot leave a tab lying. */
  function activeQuick(): Quick | '' {
    for (const [k, , layersOfQuick] of QUICK) {
      const want = quickWants(k);
      if (want && CAL.view !== want) continue;
      const layers = layersOfQuick();
      if (layers.length !== CAL.layers.size) continue;
      if (layers.every((l) => CAL.layers.has(l))) return k;
    }
    return '';
  }

  function applyQuick(k: Quick) {
    const entry = QUICK.find(([q]) => q === k)!;
    CAL.layers = new Set(entry[2]());
    const want = quickWants(k);
    if (want) CAL.view = want;
    // The week grid belongs to My week. Left behind, "Campaigns" would
    // show one week of a campaign that runs for months. Agenda is a
    // deliberate choice and is left alone.
    else if (CAL.view === 'week') CAL.view = isNarrow() ? 'agenda' : 'month';
    CAL.selected = null;
    saveCalPrefs();
    drawCalendar();
  }

  /* ── remembering the choice ───────────────────────────────────
     Per device, because which layers matter depends on whether you
     are at a desk or holding a phone on the way to a shoot. The key
     is the host's, so HQ remembers its own view without stepping on
     the client portal's. */

  function saveCalPrefs() {
    try {
      localStorage.setItem(H.store, JSON.stringify({
        layers: Array.from(CAL.layers), view: CAL.view, tray: CAL.tray,
      }));
    } catch { /* a browser that will not remember is not an error */ }
  }

  /** Whether a view was restored, so the caller knows not to pick one. */
  function loadCalPrefs(): boolean {
    try {
      const raw = localStorage.getItem(H.store);
      if (!raw) return false;
      const v = JSON.parse(raw) as { layers?: unknown; view?: unknown; tray?: unknown };
      if (Array.isArray(v.layers)) {
        // A stored layer this screen no longer has is dropped, so a
        // browser that remembers Blueprint tasks from before does not
        // resurrect a chip that is not there.
        const mine = H.layers();
        const keep = v.layers.filter((l): l is Layer => mine.includes(l as Layer));
        // Every layer off is a blank calendar, which nobody meant to
        // leave behind. An empty set falls back to all of it.
        if (keep.length) CAL.layers = new Set(keep);
      }
      if (typeof v.tray === 'boolean') CAL.tray = v.tray;
      if (v.view === 'month' || v.view === 'week' || v.view === 'agenda') {
        CAL.view = v.view;
        return true;
      }
      return false;
    } catch {
      return false;   // unreadable storage is the same as none
    }
  }

  function renderCalendar(items: PortalCalendarItem[]) {
    CAL_BASE = items;
    // Every layer this screen has, before prefs get a say.
    CAL.layers = new Set(H.layers());
    syncCalendarContent();
    const restored = loadCalPrefs();
    // On a phone a month grid of chips is unreadable, so Agenda leads
    // unless this device said otherwise last time. A week grid is the
    // one view that cannot survive the trip to phone width.
    if (!restored) CAL.view = isNarrow() ? 'agenda' : 'month';
    else if (isNarrow() && CAL.view === 'week') CAL.view = 'agenda';
    // Open on the month that actually has something in it.
    const first = CAL.items.find((i) => parseNotionDate(i.date));
    const now = todayStart();
    const firstDate = first ? parseNotionDate(first.date)! : now;
    CAL.cursor = firstDate > now ? firstDate : now;
    drawCalendar();
  }

  function drawCalendar() {
    const root = H.root();
    if (!root) return;
    clear(root);
    root.appendChild(calToolbar());
    root.appendChild(quickTabs());
    root.appendChild(layerChips());

    const visible = CAL.items.filter(passesFilter);
    if (!visible.length) {
      const e = el('div', 'pt-empty');
      const ic = el('div', 'pt-empty-icon');
      ic.appendChild(icon('cal'));
      e.append(
        ic,
        el('h3', undefined, calFiltering()
          ? 'Nothing matches that'
          : 'Nothing on the calendar yet'),
        el('p', undefined, calFiltering()
          ? 'Turn a layer back on, or clear a filter, to see the rest of your calendar.'
          : 'Shows, releases and content steps appear here as we plan them.'),
      );
      root.appendChild(e);
      return;
    }

    // On a phone the month grid is dots, so a day has to be open for
    // the view to say anything at all. Today when today is on screen,
    // otherwise the first day of the month that has something in it.
    if (isNarrow() && CAL.view === 'month' && !CAL.selected) {
      const now = todayStart();
      const thisMonth = (d: Date) =>
        d.getFullYear() === CAL.cursor.getFullYear() && d.getMonth() === CAL.cursor.getMonth();
      const dates = visible
        .map((i) => parseNotionDate(i.date))
        .filter((d): d is Date => !!d && thisMonth(d))
        .sort((a, b) => a.getTime() - b.getTime());
      // Today, unless today is empty: opening on "Nothing scheduled on
      // this day" teaches a client the view is broken. Then the next
      // day with something on it, then today anyway.
      CAL.selected = dates.find((d) => sameDay(d, now))
        ?? dates.find((d) => d >= now)
        ?? dates[dates.length - 1]
        ?? (thisMonth(now) ? now : null);
    }

    const grid = el('div');
    if (CAL.view === 'agenda') grid.appendChild(agendaView(visible));
    else if (CAL.view === 'week') grid.appendChild(weekView(visible));
    else grid.appendChild(monthView(visible));

    if (isNarrow() && CAL.view === 'month' && CAL.selected) {
      grid.appendChild(selectedDayList(visible));
    }

    // The tray is a desktop idea: it exists so a card can be dragged
    // out of it onto a day, and there is no dragging on a phone.
    const tray = isNarrow() || CAL.view === 'agenda' ? null : unscheduledTray();
    if (tray) {
      const split = el('div', 'pt-calwrap');
      split.append(grid, tray);
      root.appendChild(split);
    } else {
      root.appendChild(grid);
    }
  }

  function calToolbar(): HTMLElement {
    const bar = el('div', 'pt-toolbar');

    const nav = el('div', 'pt-navgroup');
    const prev = el('button', 'pt-btn pt-btn-icon');
    prev.type = 'button';
    prev.setAttribute('aria-label', CAL.view === 'week' ? 'Previous week' : 'Previous month');
    prev.appendChild(icon('chev-left'));
    prev.addEventListener('click', () => stepCursor(-1));
    const next = el('button', 'pt-btn pt-btn-icon');
    next.type = 'button';
    next.setAttribute('aria-label', CAL.view === 'week' ? 'Next week' : 'Next month');
    next.appendChild(icon('chev'));
    next.addEventListener('click', () => stepCursor(1));
    nav.append(prev, next);

    const today = el('button', 'pt-btn', 'Today');
    today.type = 'button';
    today.addEventListener('click', () => { CAL.cursor = todayStart(); CAL.selected = null; drawCalendar(); });

    const label = el('span', 'pt-month-label',
      `${MONTHS[CAL.cursor.getMonth()]} ${CAL.cursor.getFullYear()}`);

    bar.append(nav, today, label, el('span', 'pt-toolbar-spacer'));

    const seg = el('div', 'pt-seg');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'Calendar view');
    for (const [v, text] of [['month', 'Month'], ['week', 'Week'], ['agenda', 'Agenda']] as const) {
      const b = el('button', undefined, text);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(CAL.view === v));
      b.addEventListener('click', () => {
        CAL.view = v;
        CAL.selected = null;
        saveCalPrefs();
        drawCalendar();
      });
      seg.appendChild(b);
    }

    bar.appendChild(seg);
    return bar;
  }

  /** Four named slices of the same calendar. */
  function quickTabs(): HTMLElement {
    const row = el('div', 'pt-calrow');

    const tabs = el('div', 'pt-quick');
    tabs.setAttribute('role', 'group');
    tabs.setAttribute('aria-label', 'Quick views');
    const on = activeQuick();
    for (const [k, text] of QUICK) {
      const b = el('button', 'pt-quick-tab' + (k === on ? ' pt-quick-on' : ''), text);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(k === on));
      b.addEventListener('click', () => applyQuick(k));
      tabs.appendChild(b);
    }
    row.append(tabs, el('span', 'pt-toolbar-spacer'));

    /* bucket, multi-select, in the Notion colours */
    if (H.schema().bucket.length) {
      const d = el('details', 'pt-multi') as HTMLDetailsElement;
      const s = el('summary', 'pt-select pt-multi-sum');
      s.appendChild(el('span', undefined,
        CAL.buckets.size ? `Bucket · ${CAL.buckets.size}` : 'Every bucket'));
      s.appendChild(icon('chev'));
      d.appendChild(s);
      const panel = el('div', 'pt-multi-panel');
      for (const o of H.schema().bucket) {
        const lab = el('label', `pt-multi-opt pt-nc-${o.color}`);
        const box = el('input') as HTMLInputElement;
        box.type = 'checkbox';
        box.checked = CAL.buckets.has(o.name);
        box.addEventListener('change', () => {
          if (box.checked) CAL.buckets.add(o.name); else CAL.buckets.delete(o.name);
          CAL.selected = null;
          drawCalendar();
          // The panel is rebuilt by the redraw, so it is reopened here
          // rather than left shut under the pointer mid-selection.
          q<HTMLDetailsElement>('.pt-multi')?.setAttribute('open', '');
        });
        lab.append(box, el('span', 'pt-multi-dot'), el('span', undefined, o.name));
        panel.appendChild(lab);
      }
      if (CAL.buckets.size) {
        const clear = el('button', 'pt-multi-clear', 'Clear');
        clear.type = 'button';
        clear.addEventListener('click', () => { CAL.buckets.clear(); drawCalendar(); });
        panel.appendChild(clear);
      }
      d.appendChild(panel);
      row.appendChild(d);
    }

    const list = campaigns();
    if (list.length) {
      const camp = el('select', 'pt-select') as HTMLSelectElement;
      camp.setAttribute('aria-label', 'Filter by campaign');
      const any = el('option', undefined, 'Every campaign') as HTMLOptionElement;
      any.value = '';
      camp.appendChild(any);
      for (const m of list) {
        const d = parseNotionDate(m.date);
        const o = el('option', undefined,
          d ? `${m.title} · ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getDate()}` : m.title) as HTMLOptionElement;
        o.value = m.id;
        if (CAL.campaign === m.id) o.selected = true;
        camp.appendChild(o);
      }
      camp.addEventListener('change', () => {
        if (camp.value) { filterToCampaign(camp.value); return; }
        CAL.campaign = '';
        CAL.selected = null;
        drawCalendar();
      });
      row.appendChild(camp);
    }

    const phase = el('select', 'pt-select') as HTMLSelectElement;
    phase.setAttribute('aria-label', 'Filter by status');
    for (const [v, text] of [['', 'Any status'], ...PHASES] as Array<[string, string]>) {
      const o = el('option', undefined, text) as HTMLOptionElement;
      o.value = v;
      if (CAL.phase === v) o.selected = true;
      phase.appendChild(o);
    }
    phase.addEventListener('change', () => {
      CAL.phase = phase.value as '' | ContentPhase;
      CAL.selected = null;
      drawCalendar();
    });
    row.appendChild(phase);

    if (!isNarrow() && CAL.view !== 'agenda') {
      const n = unscheduled().length;
      const t = el('button', 'pt-btn' + (CAL.tray ? ' pt-btn-on' : ''));
      t.type = 'button';
      t.setAttribute('aria-pressed', String(CAL.tray));
      t.appendChild(icon('folder'));
      t.appendChild(el('span', undefined, `Unscheduled · ${n}`));
      t.addEventListener('click', () => {
        CAL.tray = !CAL.tray;
        saveCalPrefs();
        drawCalendar();
      });
      row.appendChild(t);
    }

    if (CAL.campaign) {
      const chipEl = el('span', 'pt-filter-chip');
      chipEl.appendChild(el('span', undefined, campaignName(CAL.campaign)));
      const x = el('button');
      x.type = 'button';
      x.setAttribute('aria-label', 'Clear campaign filter');
      x.appendChild(icon('close'));
      x.addEventListener('click', () => { CAL.campaign = ''; drawCalendar(); });
      chipEl.appendChild(x);
      row.appendChild(chipEl);
    }
    return row;
  }

  /** The five layers, all on by default. */
  function layerChips(): HTMLElement {
    const row = el('div', 'pt-layers');
    row.setAttribute('role', 'group');
    row.setAttribute('aria-label', 'Calendar layers');
    for (const k of H.layers()) {
      const text = LAYER_LABEL.get(k) ?? k;
      const on = CAL.layers.has(k);
      const b = el('button', `pt-layer pt-layer-${k}` + (on ? ' pt-layer-on' : ''));
      b.type = 'button';
      b.setAttribute('aria-pressed', String(on));
      b.append(el('span', 'pt-layer-key'), el('span', undefined, text));
      b.addEventListener('click', () => {
        if (on) CAL.layers.delete(k); else CAL.layers.add(k);
        CAL.selected = null;
        saveCalPrefs();
        drawCalendar();
      });
      row.appendChild(b);
    }
    row.appendChild(layerHelp());
    return row;
  }

  /**
   * Two things a row of chips cannot say on its own: what a dashed
   * outline means, and that a post wears its bucket's colour rather
   * than one colour of its own. They used to be a legend strip under
   * the grid, which spent a row of height on every view explaining
   * what nobody was asking about most of the time.
   */
  function layerHelp(): HTMLElement {
    const d = el('details', 'pt-help') as HTMLDetailsElement;
    const sum = el('summary', 'pt-help-sum');
    sum.setAttribute('aria-label', 'What the colours and outlines mean');
    sum.appendChild(el('span', undefined, '?'));
    d.appendChild(sum);

    const panel = el('div', 'pt-help-panel');
    panel.appendChild(el('h4', undefined, 'Reading the calendar'));
    for (const [cls, text] of [
      ['pt-legend-post', 'A post, in its bucket colour'],
      ['pt-legend-film', 'A shoot: dashed, and written "Film \u00b7"'],
      ['pt-legend-tentative', 'Dashed anywhere else means tentative'],
      ['pt-legend-show', 'A show'],
      ['pt-legend-release', 'A release'],
      ['pt-legend-todo', 'Something on you'],
    ] as const) {
      const r = el('div', 'pt-help-row');
      r.append(el('span', `pt-legend-key ${cls}`), el('span', undefined, text));
      panel.appendChild(r);
    }
    panel.appendChild(el('p', undefined,
      'A post with \u21b3 under it belongs to that campaign. It counts as a '
      + 'post either way, so Posts shows it next to the ones off your board.'));
    panel.appendChild(el('p', undefined,
      'A step marked \u{1F3A5} is the filming rather than the post, so it '
      + 'sits in Film days next to the shoots off your content board.'));
    panel.appendChild(el('p', undefined,
      'A post that has already gone out steps back and wears a tick.'));
    panel.appendChild(el('p', undefined,
      'Drag anything you own to another day. Drag a show or a release and '
      + 'its whole campaign follows, once you have said yes.'));
    d.appendChild(panel);
    return d;
  }

  function stepCursor(dir: number) {
    const c = new Date(CAL.cursor);
    if (CAL.view === 'week') c.setDate(c.getDate() + dir * 7);
    else c.setMonth(c.getMonth() + dir, 1);
    CAL.cursor = c;
    CAL.selected = null;
    drawCalendar();
  }

  /**
   * What a day reads, top to bottom. The moment is the headline, then
   * what is on the client, then the content, then our own tasks. With
   * only three chips to spend before the day collapses into "+N more",
   * the cut has to fall on our side of the list, not theirs.
   */
  const DAY_ORDER: Layer[] = ['moments', 'todos', 'posts', 'films', 'blueprint'];

  /**
   * Which of its layers an item is read as, when it belongs to more
   * than one. Only layers that are switched on count: under "Content
   * only" a post the client still has to put up is a post, because
   * the to-do layer it also belongs to is not on screen to explain
   * itself. The fallback keeps the function total.
   */
  function dayRank(it: PortalCalendarItem): number {
    const ls = layersOf(it);
    let best = DAY_ORDER.length;
    for (const l of ls) {
      if (CAL.layers.has(l)) best = Math.min(best, DAY_ORDER.indexOf(l));
    }
    if (best < DAY_ORDER.length) return best;
    for (const l of ls) best = Math.min(best, DAY_ORDER.indexOf(l));
    return best;
  }

  function sortDay(items: PortalCalendarItem[]): PortalCalendarItem[] {
    return items.slice().sort((a, b) => dayRank(a) - dayRank(b));
  }

  /* ── dragging onto a day ──────────────────────────────────────
     Desktop only; a phone gets a Move button in the drawer, because a
     drag inside a scrolling month grid on a touch screen is a fight.

     Three things can be dragged and they are not the same weight:

       a content card    one date, one row, no questions
       a step            one date, one row, no questions
       a moment          the whole campaign, so it asks first

     None of this is a permission. It decides what gets a handle; the
     server decides again on every drop, from the signed cookie. */

  type Drag =
    | { kind: 'card'; card: PortalContentItem }
    | { kind: 'step'; item: PortalCalendarItem }
    | { kind: 'moment'; item: PortalCalendarItem };

  let CALDRAG: Drag | null = null;

  /** Whether the client may give this card a date at all. One we post,
   *  and one already posted, are theirs to read and not to move. */
  function canSchedule(c: PortalContentItem): boolean {
    return c.status !== 'Posted' && c.postedBy !== 'Blueprint';
  }

  const isMomentRow = (it: PortalCalendarItem) => !!it.momentType || it.kind === 'Moment';

  /** A step this viewer may drag. Their own, and in a state that is
   *  still part of the plan; any of them when one of us is looking. */
  function canDragStep(it: PortalCalendarItem): boolean {
    if ((it as CalRow).content) return false;
    if (isMomentRow(it)) return false;
    if (!it.id || !it.date) return false;
    return canSetStepDate(it, H.role());
  }

  /** A moment can be dragged by whoever can see it. Moving one is a
   *  question rather than an edit, and the question is the same one we
   *  get asked: the dialog is where it is decided. */
  function canDragMoment(it: PortalCalendarItem): boolean {
    if ((it as CalRow).content) return false;
    if (!isMomentRow(it)) return false;
    return !!it.id && !!it.date;
  }

  /** Why this row will not move, in words, or '' when it will. The
   *  cursor and the tooltip say it before anyone tries to drag. */
  function dragBlock(it: PortalCalendarItem): string {
    if ((it as CalRow).content) return '';
    if (isMomentRow(it) || !it.id || !it.date) return '';
    if (canSetStepDate(it, H.role())) return '';
    if (it.owner !== 'Client') return 'Blueprint handles this one';
    return 'We took this step out of the plan';
  }

  /**
   * The pill that follows the pointer.
   *
   * A small opaque label that says what is moving. The alternative is
   * the browser's default drag image, a screenshot of the element,
   * which inside a cramped month cell is a clipped sliver of a chip
   * with the cell's background showing through.
   *
   * pointer-events: none matters: elementFromPoint has to find the day
   * under the cursor, not the thing being dragged.
   */
  function dragGhost(text: string, cls: string): HTMLElement {
    const g = el('div', `pt-ghost pt-ghost-live ${cls}`.trim(), text);
    document.body.appendChild(g);
    return g;
  }

  /**
   * Dragging, by hand, on pointer events.
   *
   * This used to be the HTML5 drag API, which never fired on touch in
   * Safari: an iPhone client could see the chips and not move one. The
   * HQ pipeline board already did it this way, and the three things
   * that make it work there make it work here:
   *
   *   touch-action: none on the node, or Safari scrolls the month
   *   instead of starting the drag;
   *   setPointerCapture, so the moves keep arriving once the pointer
   *   leaves the chip, which in a month cell it does at once;
   *   a ghost with pointer-events: none, so the day under the cursor
   *   is what elementFromPoint finds.
   *
   * A drag only begins after a few pixels of movement, so the tick box
   * and the title button inside a chip are still buttons.
   */
  const DRAG_START_PX = 5;

  function attachDrag(
    node: HTMLElement,
    label: string,
    ghostCls: string,
    make: () => Drag,
    dragCls = 'pt-chip-dragging',
  ) {
    // Said on the element, not just in JavaScript: the grab cursor and
    // the touch-action override are styled off it, and it is what a
    // test can read to ask whether this row moves.
    node.dataset.drag = '1';

    let startX = 0, startY = 0;
    let ghost: HTMLElement | null = null;
    let over: HTMLElement | null = null;
    let live = false;
    let id = -1;
    let swallowClick = false;

    const clearOver = () => {
      if (over) over.classList.remove('pt-cal-cell-drop');
      over = null;
    };

    const stop = () => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
      document.removeEventListener('pointercancel', onCancel);
      if (ghost) { ghost.remove(); ghost = null; }
      node.classList.remove(dragCls);
      document.body.classList.remove('pt-dragging');
      clearOver();
      live = false;
      CALDRAG = null;
      if (id !== -1 && node.hasPointerCapture?.(id)) node.releasePointerCapture(id);
      id = -1;
    };

    function onMove(ev: Event) {
      const e = ev as PointerEvent;
      if (id === -1 || e.pointerId !== id) return;

      if (!live) {
        if (Math.abs(e.clientX - startX) < DRAG_START_PX
          && Math.abs(e.clientY - startY) < DRAG_START_PX) return;
        live = true;
        CALDRAG = make();
        node.classList.add(dragCls);
        // Every day in the grid lights its edge, so it reads as a thing
        // with places to be put rather than a page that went pale.
        document.body.classList.add('pt-dragging');
        ghost = dragGhost(label, ghostCls);
        // Capture is taken HERE and not on pointerdown. Taking it early
        // retargets the compatibility mouse events too, and a chip is
        // made of buttons: the tick box would stop ticking.
        try { node.setPointerCapture(id); } catch { /* nothing to hold */ }
      }
      if (!ghost) return;
      e.preventDefault();

      ghost.style.left = `${e.clientX + 14}px`;
      ghost.style.top = `${e.clientY + 16}px`;

      const under = document.elementFromPoint(e.clientX, e.clientY);
      const cell = (under?.closest('[data-cal-day]') ?? null) as HTMLElement | null;
      if (cell !== over) {
        clearOver();
        over = cell;
        if (over) over.classList.add('pt-cal-cell-drop');
      }
    }

    function onUp(ev: Event) {
      const e = ev as PointerEvent;
      if (id === -1 || e.pointerId !== id) return;
      const iso = over?.dataset.calDay ?? '';
      const d = live ? CALDRAG : null;
      // A drag that ends back where it started would otherwise read as
      // a click and open the drawer on top of the move.
      swallowClick = live;
      stop();
      if (!d || !iso) return;
      if (d.kind === 'card') void scheduleCard(d.card, iso);
      else if (d.kind === 'step') void H.moveStep(d.item, iso);
      else H.askMoveMoment(d.item, iso);
    }

    function onCancel(ev: Event) {
      const e = ev as PointerEvent;
      if (id === -1 || e.pointerId !== id) return;
      stop();
    }

    node.addEventListener('pointerdown', (ev) => {
      const e = ev as PointerEvent;
      if (e.button !== 0 && e.pointerType === 'mouse') return;
      if (id !== -1) return;
      startX = e.clientX; startY = e.clientY;
      id = e.pointerId;
      // On the document, because the pointer leaves a month cell at
      // once and the node would stop hearing about it. The listeners
      // come off again in stop().
      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
      document.addEventListener('pointercancel', onCancel);
    });

    node.addEventListener('click', (ev) => {
      if (!swallowClick) return;
      swallowClick = false;
      ev.preventDefault();
      ev.stopPropagation();
    }, true);
  }

  /** The not-allowed cursor and the reason, on a row that will not
   *  move. Said once, on the element, so it is there before the drag
   *  that would have failed. */
  function markUndraggable(node: HTMLElement, why: string) {
    node.classList.add('pt-chip-locked');
    node.title = node.title ? `${node.title}\n${why}` : why;
  }

  /**
   * A day that something can be dropped on.
   *
   * There are no listeners on the cell: the drag reads the day off the
   * attribute with elementFromPoint, so a cell is a target purely by
   * being labelled one. That also means a cell redrawn mid-drag is
   * still a target, which the old dragenter/dragleave pair was not.
   */
  function dayDropTarget(cell: HTMLElement, day: Date) {
    cell.dataset.calDay = isoOf(day);
  }

  async function scheduleCard(c: PortalContentItem, iso: string) {
    if (c.postDate === iso) return;
    if (!canSchedule(c)) { H.toast('That one is ours to schedule.', true); return; }
    const had = c.postDate;
    const patch: Record<string, unknown> = { postDate: iso };
    const local: Partial<PortalContentItem> = { postDate: iso };
    // A dated idea is not an idea any more, and the board would put it
    // nowhere. The create endpoint defaults the same way.
    if (c.status === 'Idea') { patch.status = 'Planned'; local.status = 'Planned'; }
    if (await H.saveCard(c.id, patch, local)) {
      H.toast(had ? `Moved to ${fmtDate(iso)}` : `Scheduled for ${fmtDate(iso)}`);
    }
  }

  function byDay(items: PortalCalendarItem[]): Map<string, PortalCalendarItem[]> {
    const m = new Map<string, PortalCalendarItem[]>();
    for (const it of items) {
      const d = parseNotionDate(it.date);
      if (!d) continue;
      const k = keyOf(d);
      const arr = m.get(k);
      if (arr) arr.push(it); else m.set(k, [it]);
    }
    return m;
  }

  function monthView(items: PortalCalendarItem[]): HTMLElement {
    const wrap = el('div', 'pt-cal');
    const dow = el('div', 'pt-cal-dow');
    for (const d of DOW) dow.appendChild(el('div', undefined, d));
    wrap.appendChild(dow);

    const grid = el('div', 'pt-cal-grid');
    const map = byDay(items);
    const today = todayStart();

    const first = new Date(CAL.cursor.getFullYear(), CAL.cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    const last = new Date(CAL.cursor.getFullYear(), CAL.cursor.getMonth() + 1, 0);
    const weeks = Math.ceil((first.getDay() + last.getDate()) / 7);

    for (let i = 0; i < weeks * 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      const inMonth = day.getMonth() === CAL.cursor.getMonth();
      const cell = el('div', 'pt-cal-cell' + (inMonth ? '' : ' pt-cal-cell-out'));
      if (sameDay(day, today)) cell.classList.add('pt-cal-cell-today');
      if (CAL.selected && sameDay(day, CAL.selected)) cell.classList.add('pt-cal-cell-selected');

      const dayItems = sortDay(map.get(keyOf(day)) ?? []);

      if (isNarrow()) {
        const btn = el('button', 'pt-cal-date pt-num', String(day.getDate()));
        btn.type = 'button';
        btn.setAttribute('aria-label', `${fmtDayLong(day)}, ${dayItems.length} item${dayItems.length === 1 ? '' : 's'}`);
        btn.addEventListener('click', () => { CAL.selected = day; drawCalendar(); });
        cell.appendChild(btn);
        if (dayItems.length) {
          const dots = el('div', 'pt-dots');
          for (const it of dayItems.slice(0, 4)) dots.appendChild(el('span', `pt-dot pt-dot-${H.kindOf(it)}`));
          cell.appendChild(dots);
        }
      } else {
        cell.appendChild(el('span', 'pt-cal-date pt-num', String(day.getDate())));
        for (const it of dayItems.slice(0, 3)) cell.appendChild(chip(it));
        if (dayItems.length > 3) {
          const more = el('button', 'pt-chip-more', `+${dayItems.length - 3} more`);
          more.type = 'button';
          more.addEventListener('click', (ev) => {
            ev.stopPropagation();
            openPopover(more, day, dayItems);
          });
          cell.appendChild(more);
        }
        dayDropTarget(cell, day);
      }
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  function chip(it: PortalCalendarItem): HTMLElement {
    const row = it as CalRow;
    // A content card wears its bucket's colour, because on the board it
    // already does. Film dates are the same colour, dashed: the same
    // piece of content, one step earlier.
    if (row.content && row.contentRole) {
      const c = row.content;
      const done = c.status === 'Posted';
      const b = el('button', `pt-chip pt-chip-${row.contentRole} pt-nc-${H.bucketColor(c.bucket)}`
        + (done ? ' pt-chip-done' : ''));
      b.type = 'button';
      // A post that already went out is a record, not a plan, so it
      // steps back and wears a tick rather than shouting at the month.
      if (done) b.appendChild(icon('check', 'pt-chip-tick'));
      b.appendChild(el('span', 'pt-chip-title', it.title));
      if (row.moment) b.appendChild(el('span', 'pt-chip-moment', row.moment.title));
      b.title = row.contentRole === 'film'
        ? `Film by: ${c.title}`
        : `Posts: ${c.title}${c.bucket ? ` · ${c.bucket}` : ''}`;
      b.addEventListener('click', (ev) => { ev.stopPropagation(); H.openItem(it); });

      // A post date the client owns can be dragged to another day. A
      // film date cannot: the shoot is planned around other things.
      if (row.contentRole === 'post' && canSchedule(c) && !isNarrow()) {
        attachDrag(b, c.title, `pt-nc-${H.bucketColor(c.bucket)}`,
                   () => ({ kind: 'card', card: c }));
      }
      return b;
    }
    const k = H.kindOf(it);
    const m = it.moment;
    // A campaign step that posts something wears the post pill, not a
    // task's. It goes out on a day on a channel, which is what a post
    // is; that it came off a playbook rather than the content board is
    // our bookkeeping, not something the client should have to decode.
    // It has no bucket of its own, so it takes the colour an unbucketed
    // card takes, and the ↳ campaign line underneath says where it
    // came from.
    const asPost = isCampaignPost(it);
    // The fill says what KIND of work this is; the left edge says which
    // campaign it belongs to. Two campaigns in one week are otherwise a
    // wall of identical blue.
    const asFilm = !(it as CalRow).content && isFilmStep(it);
    const cls = (asPost
      ? `pt-chip pt-chip-post pt-nc-${H.bucketColor(null)}`
      : asFilm
        ? `pt-chip pt-chip-film pt-nc-${H.bucketColor(null)}`
        : `pt-chip pt-chip-${k}`)
      + (it.tentative ? ' pt-chip-tentative' : '')
      + (m ? ` pt-edge-${H.momentKind(m)}` : '');
    const label = m
      ? `${H.kindLabel(k)}: ${it.title} — part of ${m.title}`
      : `${H.kindLabel(k)}: ${it.title}`;

    // A step the client owns carries its box here too, so a week can be
    // cleared from the month without opening anything. A button cannot
    // hold a button, so the chip becomes a box and a title beside it.
    if (H.canTick(it)) {
      const done = isStepDone(it);
      const wrap = el('div', cls + ' pt-chip-tick-row' + (done ? ' pt-chip-done' : ''));
      const open = el('button', 'pt-chip-open');
      open.type = 'button';
      open.appendChild(el('span', 'pt-chip-title', it.title));
      if (m) open.appendChild(el('span', 'pt-chip-moment', m.title));
      open.title = label;
      open.addEventListener('click', (ev) => { ev.stopPropagation(); H.openItem(it); });
      wrap.append(H.tickBox(it), open);
      if (!isNarrow() && canDragStep(it)) {
        attachDrag(wrap, it.title, '', () => ({ kind: 'step', item: it }));
      }
      return wrap;
    }

    const b = el('button', cls);
    b.type = 'button';
    b.appendChild(el('span', 'pt-chip-title', it.title));
    if (m) b.appendChild(el('span', 'pt-chip-moment', m.title));
    b.title = label;
    b.addEventListener('click', (ev) => { ev.stopPropagation(); H.openItem(it); });

    if (!isNarrow()) {
      // A moment first: dragging one is the big move, and a row cannot
      // be both. Then a step. Then, for everything else, the reason it
      // is staying put, so the cursor says so before anyone tries.
      if (canDragMoment(it)) {
        attachDrag(b, it.title, 'pt-ghost-moment', () => ({ kind: 'moment', item: it }));
      } else if (canDragStep(it)) {
        attachDrag(b, it.title, '', () => ({ kind: 'step', item: it }));
      } else {
        const why = dragBlock(it);
        if (why) markUndraggable(b, why);
      }
    }
    return b;
  }

  function weekView(items: PortalCalendarItem[]): HTMLElement {
    const wrap = el('div', 'pt-cal');
    const map = byDay(items);
    const today = todayStart();
    const start = new Date(CAL.cursor);
    start.setDate(start.getDate() - start.getDay());

    const dow = el('div', 'pt-cal-dow');
    for (let i = 0; i < 7; i++) {
      const d = new Date(start); d.setDate(start.getDate() + i);
      dow.appendChild(el('div', undefined, `${DOW[i]} ${d.getDate()}`));
    }
    wrap.appendChild(dow);

    const grid = el('div', 'pt-week');
    for (let i = 0; i < 7; i++) {
      const day = new Date(start); day.setDate(start.getDate() + i);
      const cell = el('div', 'pt-cal-cell');
      if (sameDay(day, today)) cell.classList.add('pt-cal-cell-today');
      for (const it of sortDay(map.get(keyOf(day)) ?? [])) cell.appendChild(chip(it));
      if (!isNarrow()) dayDropTarget(cell, day);
      grid.appendChild(cell);
    }
    wrap.appendChild(grid);
    return wrap;
  }

  function agendaView(items: PortalCalendarItem[]): HTMLElement {
    const wrap = el('div');
    const today = todayStart();
    // The agenda follows the cursor, like the other two views. It used
    // to list every dated row there was, which was fine with a handful
    // of campaign steps and useless against a year of posted history:
    // the month buttons appeared to do nothing and February was four
    // thousand pixels up.
    const dated = items.filter((i) => {
      const d = parseNotionDate(i.date);
      return !!d && d.getFullYear() === CAL.cursor.getFullYear()
                 && d.getMonth() === CAL.cursor.getMonth();
    });
    if (!dated.length) {
      const e = el('div', 'pt-empty');
      const ic = el('div', 'pt-empty-icon');
      ic.appendChild(icon('cal'));
      e.append(ic,
        el('h3', undefined, `Nothing in ${MONTHS[CAL.cursor.getMonth()]}`),
        el('p', undefined, calFiltering()
          ? 'Turn a layer back on, or step to another month.'
          : 'Step to another month to see what is planned.'));
      wrap.appendChild(e);
      return wrap;
    }
    const map = byDay(dated);
    const keys = Array.from(map.keys()).sort((a, b) => {
      const [ay, am, ad] = a.split('-').map(Number);
      const [by, bm, bd] = b.split('-').map(Number);
      return new Date(ay, am, ad).getTime() - new Date(by, bm, bd).getTime();
    });

    for (const k of keys) {
      const [y, m, d] = k.split('-').map(Number);
      const day = new Date(y, m, d);
      const group = el('section', 'pt-agenda-day');
      const head = el('h3', 'pt-agenda-date' + (sameDay(day, today) ? ' pt-agenda-date-today' : ''));
      head.appendChild(el('span', undefined, fmtDayLong(day)));
      if (sameDay(day, today)) head.appendChild(el('span', 'pt-tag', 'Today'));
      group.appendChild(head);
      const list = el('ul');
      const day_ = sortDay(map.get(k)!);
      const pad = day_.some(H.canTick);
      for (const it of day_) list.appendChild(H.itemRow(it, pad));
      group.appendChild(list);
      wrap.appendChild(group);
    }
    return wrap;
  }

  function selectedDayList(items: PortalCalendarItem[]): HTMLElement {
    const day = CAL.selected!;
    const map = byDay(items);
    const dayItems = map.get(keyOf(day)) ?? [];
    const card = el('section', 'pt-card');
    card.style.marginTop = 'var(--pt-4)';
    const head = el('div', 'pt-card-head');
    head.appendChild(el('h2', undefined, fmtDayLong(day)));
    card.appendChild(head);
    const body = el('div', 'pt-card-body');
    if (!dayItems.length) {
      body.appendChild(el('p', 'pt-kpi-note', 'Nothing scheduled on this day.'));
    } else {
      const list = el('ul');
      const pad = dayItems.some(H.canTick);
      for (const it of dayItems) list.appendChild(H.itemRow(it, pad));
      body.appendChild(list);
    }
    card.appendChild(body);
    return card;
  }

  /* ── the unscheduled tray ─────────────────────────────────────
     A well of cards with no post date, beside the month. It is a
     staging area rather than a view of the calendar, so the layer
     chips and the filters above do not touch it: it has its own
     search, and grouping by bucket does the rest. */

  function unscheduled(): PortalContentItem[] {
    return H.content().filter(
      (c) => (c.status === 'Idea' || c.status === 'Planned') && !c.postDate);
  }

  function unscheduledTray(): HTMLElement | null {
    if (!CAL.tray) return null;
    const all = unscheduled();
    const aside = el('aside', 'pt-tray');

    const head = el('div', 'pt-tray-head');
    head.appendChild(el('h3', undefined, 'Unscheduled'));
    head.appendChild(el('span', 'pt-tray-n pt-num', String(all.length)));
    const x = el('button', 'pt-tray-close');
    x.type = 'button';
    x.setAttribute('aria-label', 'Hide unscheduled');
    x.appendChild(icon('close'));
    x.addEventListener('click', () => { CAL.tray = false; saveCalPrefs(); drawCalendar(); });
    head.appendChild(x);
    aside.appendChild(head);

    const search = el('input', 'pt-input pt-tray-search') as HTMLInputElement;
    search.type = 'search';
    search.placeholder = 'Title or shoot code';
    search.setAttribute('aria-label', 'Search unscheduled');
    search.value = CAL.traySearch;
    search.addEventListener('input', () => {
      CAL.traySearch = search.value;
      drawCalendar();
      const again = q<HTMLInputElement>('.pt-tray-search');
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    });
    aside.appendChild(search);

    const needle = CAL.traySearch.trim().toLowerCase();
    const items = needle
      ? all.filter((c) => c.title.toLowerCase().includes(needle)
          || (c.shootCode ?? '').toLowerCase().includes(needle))
      : all;

    if (!items.length) {
      aside.appendChild(el('p', 'pt-tray-none',
        all.length ? 'Nothing matches that.' : 'Everything you have has a date on it.'));
      return aside;
    }

    aside.appendChild(el('p', 'pt-tray-hint', 'Drag one onto a day to give it a post date.'));

    const groups = new Map<string, PortalContentItem[]>();
    for (const c of items) {
      const k = c.bucket ?? '';
      const arr = groups.get(k);
      if (arr) arr.push(c); else groups.set(k, [c]);
    }
    // Bucket order follows Notion, so the tray and the Ideas board
    // read in the same order. No bucket at all sorts last.
    const order = H.schema().bucket.map((o) => o.name);
    const keys = Array.from(groups.keys()).sort((a, b) =>
      (a ? order.indexOf(a) : order.length) - (b ? order.indexOf(b) : order.length));

    const body = el('div', 'pt-tray-body');
    for (const k of keys) {
      const list = groups.get(k)!;
      const g = el('div', 'pt-tray-group' + (k ? ` pt-nc-${H.bucketColor(k)}` : ''));
      const gh = el('div', 'pt-tray-group-head');
      gh.append(
        el('span', 'pt-tray-dot'),
        el('span', undefined, k || 'No bucket yet'),
        el('span', 'pt-tray-gn pt-num', String(list.length)),
      );
      g.appendChild(gh);
      for (const c of list) g.appendChild(trayCard(c));
      body.appendChild(g);
    }
    aside.appendChild(body);
    return aside;
  }

  function trayCard(c: PortalContentItem): HTMLElement {
    const card = el('article', 'pt-traycard');
    const open = el('button', 'pt-traycard-open');
    open.type = 'button';
    open.setAttribute('aria-label', `Open ${c.title}`);
    open.appendChild(el('span', 'pt-traycard-title', c.title));
    if (c.filmBy) {
      open.appendChild(el('span', 'pt-traycard-meta', `Film by ${fmtDateShort(c.filmBy)}`));
    }
    open.addEventListener('click', () => H.openCard(c));
    card.appendChild(open);

    if (canSchedule(c)) {
      const grip = el('span', 'pt-traycard-grip');
      grip.setAttribute('aria-hidden', 'true');
      grip.appendChild(icon('grip'));
      card.appendChild(grip);
      attachDrag(
        card, c.title, `pt-nc-${H.bucketColor(c.bucket)}`,
        () => ({ kind: 'card', card: c }), 'pt-traycard-dragging',
      );
    } else {
      card.classList.add('pt-traycard-locked');
      card.title = 'We put this one out, so we schedule it.';
    }
    return card;
  }

  /* ── "+N more" popover ─────────────────────────────────────── */
  let POP: HTMLElement | null = null;

  function closePopover() { if (POP) { POP.remove(); POP = null; } }

  function openPopover(anchor: HTMLElement, day: Date, items: PortalCalendarItem[]) {
    closePopover();
    const pop = el('div', 'pt-popover');
    pop.appendChild(el('div', 'pt-popover-title', fmtDayLong(day)));
    // A day that overflowed is a day with several kinds of thing on
    // it, so the popover says which is which rather than handing over
    // one more undifferentiated list.
    for (let i = 0; i < DAY_ORDER.length; i++) {
      const inLayer = items.filter((it) => dayRank(it) === i);
      if (!inLayer.length) continue;
      pop.appendChild(el('div', 'pt-popover-group',
        LAYER_LABEL.get(DAY_ORDER[i]) ?? DAY_ORDER[i]));
      for (const it of inLayer) pop.appendChild(chip(it));
    }
    document.body.appendChild(pop);

    const r = anchor.getBoundingClientRect();
    const top = Math.min(r.bottom + window.scrollY + 4, window.scrollY + window.innerHeight - 330);
    const left = Math.min(r.left + window.scrollX, window.scrollX + window.innerWidth - 268);
    pop.style.top = `${Math.max(window.scrollY + 8, top)}px`;
    pop.style.left = `${Math.max(8, left)}px`;
    POP = pop;

    setTimeout(() => {
      document.addEventListener('click', onDocClick, { once: true });
    }, 0);
  }
  function onDocClick(ev: MouseEvent) {
    if (POP && !POP.contains(ev.target as Node)) closePopover();
    else if (POP) setTimeout(() => document.addEventListener('click', onDocClick, { once: true }), 0);
  }


  /**
   * Show every show and release and nothing else: the "+N more
   * releases" shortcut from a screen that is not the calendar, which
   * is why it routes as well as drawing.
   */
  function showAllMoments() {
    CAL.campaign = '';
    CAL.layers = new Set<Layer>(['moments']);
    CAL.view = isNarrow() ? 'agenda' : 'month';
    CAL.selected = null;
    saveCalPrefs();
    drawCalendar();
    H.showCalendar();
  }

  /**
   * The window crossed the line between phone and desk. The caller
   * redraws; this just settles the state first, because a drag cannot
   * survive the components under it being replaced.
   */
  function onWidthChange() {
    CAL.view = isNarrow() ? 'agenda' : 'month';
    CAL.selected = null;
    CALDRAG = null;
    saveCalPrefs();
  }

  return {
    /** First draw: take the rows, restore prefs, pick a view. */
    render: renderCalendar,
    /** Redraw in place, keeping the view, cursor and filters. */
    draw: drawCalendar,
    /** Rebuild CAL.items after a content save. */
    sync: syncCalendarContent,
    /** The server rows, for the screen's own lookups. */
    rows: () => CAL_BASE,
    /** Replace the server rows after a refresh, without redrawing. */
    setRows: (items: PortalCalendarItem[]) => { CAL_BASE = items; },
    /** The view state, so a screen can set a filter before drawing. */
    state: CAL,
    /** The moments, newest first, for a campaign picker. */
    campaigns,
    /** Narrow to one campaign and show it. */
    filterToCampaign,
    /** Close the "+N more" popover, e.g. on a route change. */
    closePopover,
    /** Whether this row may be dragged, for the host's own writes. */
    canDragStep,
    /** Whether a moment may be dragged, cascade and all. */
    canDragMoment,
    /** Whether a row is a moment rather than a step. */
    isMomentRow,
    /** Whether a content card is ours to schedule. */
    canSchedule,
    /** Put an unscheduled card on a day. */
    scheduleCard,
    /** Shows and releases only, routed to. */
    showAllMoments,
    /** Settle the state after a phone/desk width change. */
    onWidthChange,
  };
}

export type Calendar = ReturnType<typeof createCalendar>;
