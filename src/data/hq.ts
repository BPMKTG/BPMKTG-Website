/* ──────────────────────────────────────────────────────────────
   The rules behind Blueprint HQ.

   Pure functions and constants only: no Notion, no fetch, no DOM.
   Everything here is reachable from the test entry, which is the point
   of keeping it out of the page and out of the data layer.

   Three things live here.

     1. What counts as a to-do on the Today tab, and which of the three
        sections it falls into.
     2. Which of those rows a tick box or a snooze may act on. HQ never
        decides that for itself: it asks the same predicates the portal's
        own write endpoints ask, so a button HQ offers is a button the
        server will honour.
     3. Later, the client health rules, which the spec asks be kept in
        one place.
   ────────────────────────────────────────────────────────────── */

import { canSetStepStatus, canSetStepDate, cleanItemTitle, flowOf, isFilmStep } from './portal';
import { countsToward, MONTH_CAP, MONTH_MIN, STAGE_STATUSES } from './portal-content';

/* ── the window ───────────────────────────────────────────────── */

/**
 * How far "This week" reaches.
 *
 * Seven days rather than "until Sunday": on a Friday a week-boundary
 * version of this list would be almost empty and would say nothing
 * about the week that actually matters, which is the next seven days.
 */
export const WEEK_DAYS = 7;

/** How far ahead the shows-and-releases strip looks. From the spec. */
export const STRIP_DAYS = 14;

/* ── what a row is ────────────────────────────────────────────── */

export type HqOwner = 'blueprint' | 'client';

/** Where a Today row came from. The tick and the snooze take a
 *  different route for each, so the row has to carry it. */
export type HqRowKind = 'step' | 'content' | 'next-action';

export type HqBucket = 'overdue' | 'today' | 'week';

/**
 * The campaign a row belongs to, as a row needs to say it.
 *
 * Flattened onto the row rather than looked up at draw time: the
 * Today list and the Clients cards both show it, grouping by campaign
 * sorts by its date, and none of them should each be doing their own
 * pass over the calendar to find a moment by id.
 */
export interface HqMomentRef {
  id: string;
  title: string;
  /** The moment's own date, which is what campaign order means. Null
   *  for a moment with no date yet, which sorts last. */
  date: string | null;
  /** Show, Release, Festival and so on, for the chip's colour. */
  type: string | null;
  clientSlug: string;
}

export interface HqRow {
  /** Unique within the list. Kind-prefixed because a client page id
   *  and a calendar page id could in principle collide in the DOM. */
  key: string;
  kind: HqRowKind;
  /** The Notion page the write goes to. For a next action that is the
   *  client's own row, which is why it is not always a task id. */
  id: string;
  clientSlug: string;
  clientName: string;
  title: string;
  owner: HqOwner;
  /** The word shown in the row's type chip. */
  type: string | null;
  status: string | null;
  date: string;
  bucket: HqBucket;
  /** Whether HQ may offer a tick box, and what it would write. */
  tickTo: string | null;
  /** Whether HQ may offer a snooze. */
  snoozable: boolean;
  /** The campaign this row is part of, or null for a row that is not
   *  part of one: a next action, or a step with no moment. */
  moment: HqMomentRef | null;
  /** Notes, as a one-line subtitle. This is where the reason a step
   *  moved gets written, which is the thing you want to read without
   *  opening Notion. */
  notes: string | null;
  /** Who makes it and who posts it, as a chip. Derived where Notion
   *  has not got round to setting Flow, which is most rows. */
  flow: string | null;
}

/* ── statuses that are not to-dos ─────────────────────────────── */

/**
 * Calendar statuses that take a step off the Today list.
 *
 * Done is finished. Skipped and Moved are steps we took out of the
 * plan. None of the three is work outstanding, so none of them is
 * overdue, however old the date is.
 */
export const STEP_SETTLED = ['Done', 'Skipped', 'Moved'] as const;

/** Content statuses that are not work outstanding. */
export const CONTENT_SETTLED = ['Posted', 'Skipped'] as const;

const settled = (list: readonly string[], status: string | null) =>
  list.includes(status ?? '');

/* ── days ─────────────────────────────────────────────────────── */

/** Today as a plain ISO day, read at UTC like every other date in
 *  this codebase so a late evening never counts as tomorrow. */
export function isoToday(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** An ISO day, N days on from a plain ISO day. */
export function addDays(day: string, n: number): string {
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t)) return day;
  return new Date(t + n * 86400000).toISOString().slice(0, 10);
}

/**
 * Which section a dated row belongs in, or null for a row that is
 * further out than this list goes.
 */
export function bucketFor(
  date: string | null, now: Date = new Date(), weekDays = WEEK_DAYS,
): HqBucket | null {
  if (!date) return null;
  const today = isoToday(now);
  if (date < today) return 'overdue';
  if (date === today) return 'today';
  return date <= addDays(today, weekDays) ? 'week' : null;
}

/* ── notes ────────────────────────────────────────────────────── */

/**
 * A Notes field as one line.
 *
 * Notion text is multi-line and these notes run long. The row shows a
 * subtitle, not a paragraph, so newlines collapse to a separator and
 * the rest is left to CSS to cut: a hard character limit here would
 * put an ellipsis in the middle of a line that had room to spare.
 */
export const NOTE_SEP = ' \u00b7 ';

export function oneLine(text: string | null | undefined): string | null {
  const t = (text ?? '').split(/\r?\n+/).map((l) => l.trim()).filter(Boolean);
  return t.length ? t.join(NOTE_SEP) : null;
}

/* ── campaigns ────────────────────────────────────────────────── */

/**
 * Every moment on the calendar, by page id.
 *
 * A moment is a row in the same database as the steps that hang off
 * it, so there is nothing to fetch: the Kind=Moment rows in the
 * payload ARE the campaigns. Built once per draw and handed to the row
 * builders, so a list of two hundred rows does not do two hundred
 * scans of the calendar looking for its moment.
 *
 * A moment with no client is skipped: the chip links into a client's
 * portal, and one with nowhere to go is not a link.
 *
 * The artist prefix comes off here. Calendar titles are written for
 * our board ("Sean Comma · Faith Rave"), and HQ's data layer cannot
 * strip it because it reads every client's rows in one query before it
 * knows whose each row is. By this point the client is in hand, and a
 * chip that said the artist's name next to a row that already carries
 * it would be saying it twice.
 */
export function momentIndex(
  steps: RowStep[], byId: Map<string, RowClient>,
): Map<string, HqMomentRef> {
  const out = new Map<string, HqMomentRef>();
  for (const s of steps) {
    if (s.kind !== 'Moment') continue;
    const client = s.clientId ? byId.get(s.clientId) : undefined;
    if (!client) continue;
    const { title } = cleanItemTitle(s.title ?? '', client.artist);
    out.set(s.id, {
      id: s.id,
      title: title || 'Untitled moment',
      date: s.date,
      type: s.momentType,
      clientSlug: client.slug,
    });
  }
  return out;
}

/* ── building the rows ────────────────────────────────────────── */

/** Only what this module reads, so the tests can hand it a literal. */
export interface RowClient {
  pageId: string;
  slug: string;
  artist: string;
  stage: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
}

export interface RowStep {
  id: string;
  clientId: string | null;
  momentId: string | null;
  title: string;
  kind: string | null;
  momentType: string | null;
  type: string | null;
  owner: string | null;
  status: string | null;
  date: string | null;
  notes: string | null;
  flow?: string | null;
}

export interface RowContent {
  id: string;
  clientId: string | null;
  postedBy?: string | null;
  campaignId: string | null;
  title: string;
  status: string | null;
  postDate: string | null;
  format: string | null;
  notes: string | null;
}

/** Stages whose next action is nobody's to-do any more. */
export const DEAD_STAGES = ['Ended'] as const;

/* ── what we owe this month ────────────────────────────────────────
   A tier is sold as a number of posts a month and the only way to
   know whether we are delivering it is to count. Our posts, not
   theirs: a client posting ten things themselves does not discharge
   anything we promised. */

// The band lives with the counter, which is the thing that shows it.
export const DELIVERABLES_MIN = MONTH_MIN;
export const DELIVERABLES_MAX = MONTH_CAP;

export interface Deliverables {
  /** "Nov", for the label. */
  month: string;
  /** Ours, dated inside the month. */
  total: number;
  /** Of those, the ones that have gone out. */
  posted: number;
  /** Too few planned, or too many: either is a plan to fix now
   *  rather than on the last day of the month. */
  off: boolean;
  label: string;
}

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function deliverables(
  cards: Array<{ postedBy?: string | null; postDate: string | null; status: string | null }>,
  now: Date = new Date(),
): Deliverables {
  const ym = isoToday(now).slice(0, 7);
  // One definition of "counts", shared with the month counter, so the
  // number on a client card and the number on their Content page are
  // the same number.
  const mine = cards.filter((c) => countsToward(c) && c.postDate!.slice(0, 7) === ym);
  const total = mine.length;
  const posted = mine.filter((c) => c.status === 'Posted').length;
  const month = MONTH_SHORT[Number(ym.slice(5, 7)) - 1] ?? ym;
  return {
    month,
    total,
    posted,
    off: total < DELIVERABLES_MIN || total > DELIVERABLES_MAX,
    label: `${month}: ${posted} / ${total} posted`,
  };
}

/**
 * Every outstanding step, as Today rows.
 *
 * Moments are left out: a show is not a task, and the spec gives shows
 * and releases their own strip above the list. Steps of every owner are
 * in, which is the whole reason HQ exists.
 */
export function stepRows(
  steps: RowStep[],
  byId: Map<string, RowClient>,
  now: Date = new Date(),
  moments: Map<string, HqMomentRef> = momentIndex(steps, byId),
): HqRow[] {
  const out: HqRow[] = [];
  for (const s of steps) {
    if (s.kind === 'Moment') continue;
    if (settled(STEP_SETTLED, s.status)) continue;
    const bucket = bucketFor(s.date, now);
    if (!bucket || !s.date) continue;
    const client = s.clientId ? byId.get(s.clientId) : undefined;
    if (!client) continue;

    const owner: HqOwner = s.owner === 'Client' ? 'client' : 'blueprint';
    // Asked, not assumed. These are the same two predicates the step
    // endpoint runs, so a tick HQ draws is a tick the server accepts.
    const row = { owner: s.owner, status: s.status };
    out.push({
      key: `step:${s.id}`,
      kind: 'step',
      id: s.id,
      clientSlug: client.slug,
      clientName: client.artist,
      title: s.title || 'Untitled step',
      owner,
      type: s.type,
      status: s.status,
      date: s.date,
      bucket,
      tickTo: canSetStepStatus(row, 'Done', 'admin') ? 'Done' : null,
      snoozable: canSetStepDate(row, 'admin'),
      moment: (s.momentId ? moments.get(s.momentId) : undefined) ?? null,
      notes: oneLine(s.notes),
      flow: flowOf(s),
    });
  }
  return out;
}

/**
 * Content with a post date, as Today rows.
 *
 * Content has no Owner column, so it counts as ours. That is nearly
 * always true in practice, and the filter says "Mine" rather than
 * "assigned to me", so a card sitting in our edit queue belongs there.
 *
 * The tick is offered only where the content rules already allow
 * Posted. A card in Editing cannot jump to Posted, and HQ must not
 * draw a box that the server would refuse.
 */
export function contentRows(
  items: RowContent[],
  byId: Map<string, RowClient>,
  now: Date = new Date(),
  moments: Map<string, HqMomentRef> = new Map(),
): HqRow[] {
  const out: HqRow[] = [];
  for (const c of items) {
    if (settled(CONTENT_SETTLED, c.status)) continue;
    const bucket = bucketFor(c.postDate, now);
    if (!bucket || !c.postDate) continue;
    const client = c.clientId ? byId.get(c.clientId) : undefined;
    if (!client) continue;

    out.push({
      key: `content:${c.id}`,
      kind: 'content',
      id: c.id,
      clientSlug: client.slug,
      clientName: client.artist,
      title: c.title || 'Untitled post',
      owner: 'blueprint',
      type: c.format ?? 'Content',
      status: c.status,
      date: c.postDate,
      bucket,
      // Ticking a post off means it went out, so the box is only drawn
      // on a post that is ready to: Approved or Scheduled. This used to
      // borrow the client's status table, which said the same thing
      // until that table was cut down to the two answers a client has.
      tickTo: (STAGE_STATUSES.ready as readonly string[]).includes(c.status ?? '') ? 'Posted' : null,
      snoozable: true,
      moment: (c.campaignId ? moments.get(c.campaignId) : undefined) ?? null,
      notes: oneLine(c.notes),
    });
  }
  return out;
}

/**
 * A client's own Next Action, as a Today row.
 *
 * Always ours: it is the next thing WE do about that client, which is
 * why a lead with an overdue next action shows up here next to a step
 * on an active account.
 */
export function nextActionRows(
  clients: RowClient[], now: Date = new Date(),
): HqRow[] {
  const out: HqRow[] = [];
  for (const c of clients) {
    if ((DEAD_STAGES as readonly string[]).includes(c.stage ?? '')) continue;
    const bucket = bucketFor(c.nextActionDate, now);
    if (!bucket || !c.nextActionDate) continue;

    out.push({
      key: `next:${c.pageId}`,
      kind: 'next-action',
      id: c.pageId,
      clientSlug: c.slug,
      clientName: c.artist,
      title: c.nextAction?.trim() || 'Next action',
      owner: 'blueprint',
      // Not the Stage. Every other row puts a content or step type in
      // this slot, and a stage name sitting among Reel and Access
      // reads as a status rather than a kind of work. The Pipeline tab
      // is where a stage belongs.
      type: 'Next action',
      status: null,
      date: c.nextActionDate,
      bucket,
      // Ticking a next action clears the date rather than writing a
      // status: the Clients row has no status to write.
      tickTo: 'clear',
      snoozable: true,
      // A next action is about the client rather than about a campaign,
      // and the Clients row has no notes field.
      moment: null,
      notes: null,
    });
  }
  return out;
}

/* ── the list ─────────────────────────────────────────────────── */

export type HqFilter = 'mine' | 'clients' | 'all';

export function matchesFilter(row: HqRow, filter: HqFilter): boolean {
  if (filter === 'all') return true;
  return filter === 'mine' ? row.owner === 'blueprint' : row.owner === 'client';
}

/**
 * Sorted the way the list reads: by day, then the client's name, then
 * the title. Within a section every row is equally due, so the only
 * useful second key is the one that groups a client's rows together.
 */
export function sortRows(rows: HqRow[]): HqRow[] {
  return rows.slice().sort((a, b) =>
    a.date.localeCompare(b.date)
    || a.clientName.localeCompare(b.clientName)
    || a.title.localeCompare(b.title));
}

export interface HqToday {
  overdue: HqRow[];
  today: HqRow[];
  week: HqRow[];
}

/** Every outstanding row, filtered, sorted and split into sections. */
export function buildToday(
  input: { clients: RowClient[]; steps: RowStep[]; content: RowContent[] },
  filter: HqFilter = 'all',
  now: Date = new Date(),
): HqToday {
  const byId = new Map(input.clients.map((c) => [c.pageId, c]));
  // Once, and handed to both builders: a step finds its moment here
  // and a content card finds the same one, so the chip on a post and
  // the chip on the step promoting it cannot disagree.
  const moments = momentIndex(input.steps, byId);
  const all = [
    ...stepRows(input.steps, byId, now, moments),
    ...contentRows(input.content, byId, now, moments),
    ...nextActionRows(input.clients, now),
  ].filter((r) => matchesFilter(r, filter));

  return {
    overdue: sortRows(all.filter((r) => r.bucket === 'overdue')),
    today: sortRows(all.filter((r) => r.bucket === 'today')),
    week: sortRows(all.filter((r) => r.bucket === 'week')),
  };
}

/* ── grouped by campaign ──────────────────────────────────────── */

export interface HqCampaignGroup {
  /** Null for the rows that belong to no campaign. */
  moment: HqMomentRef | null;
  /** What the section is called. */
  title: string;
  rows: HqRow[];
}

/** The section rows with no campaign are collected under. */
export const NO_CAMPAIGN = 'No campaign';

/**
 * The same rows, one section per moment, in campaign order.
 *
 * Campaign order is the moment's own date, not the rows' dates: the
 * point of this view is to read a rollout as a rollout, so the show
 * that is a fortnight out comes after the one that is on Saturday even
 * if it has an overdue step and the other does not. Within a section
 * the rows keep the list's own order, which is by day.
 *
 * A moment with no date sorts last among the campaigns, and the rows
 * that belong to no campaign come after all of them: a next action, or
 * a step nobody hung off a moment, is not a campaign and should not be
 * mistaken for the start of one.
 */
export function groupByCampaign(rows: HqRow[]): HqCampaignGroup[] {
  const groups = new Map<string, HqCampaignGroup>();
  const loose: HqRow[] = [];

  for (const r of rows) {
    if (!r.moment) { loose.push(r); continue; }
    const g = groups.get(r.moment.id);
    if (g) { g.rows.push(r); continue; }
    groups.set(r.moment.id, {
      moment: r.moment,
      title: r.moment.title,
      rows: [r],
    });
  }

  const out = [...groups.values()].sort((a, b) =>
    // An undated moment has no place in the order, so it goes last
    // rather than first, which is where an empty string would sort it.
    (a.moment!.date ?? '9999-99-99').localeCompare(b.moment!.date ?? '9999-99-99')
    || a.title.localeCompare(b.title));

  if (loose.length) out.push({ moment: null, title: NO_CAMPAIGN, rows: loose });
  return out;
}

/* ── the strip ────────────────────────────────────────────────── */

export interface StripItem {
  id: string;
  clientSlug: string;
  clientName: string;
  title: string;
  momentType: string | null;
  venueCity: string | null;
  date: string;
  days: number;
}

/**
 * Shows and releases in the next fortnight, every client.
 *
 * Moments only, and only forward: this strip answers "what is coming",
 * so a show last week does not belong in it even though the calendar
 * still holds it.
 */
export function stripItems(
  steps: Array<RowStep & { momentType?: string | null; venueCity?: string | null }>,
  byId: Map<string, RowClient>,
  now: Date = new Date(),
  days = STRIP_DAYS,
): StripItem[] {
  const today = isoToday(now);
  const until = addDays(today, days);
  const out: StripItem[] = [];

  for (const s of steps) {
    if (s.kind !== 'Moment') continue;
    if (!s.date || s.date < today || s.date > until) continue;
    if (settled(['Skipped', 'Moved'], s.status)) continue;
    const client = s.clientId ? byId.get(s.clientId) : undefined;
    if (!client) continue;

    out.push({
      id: s.id,
      clientSlug: client.slug,
      clientName: client.artist,
      title: s.title || 'Untitled',
      momentType: s.momentType ?? null,
      venueCity: s.venueCity ?? null,
      date: s.date,
      days: Math.max(0, Math.round(
        (Date.parse(`${s.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000)),
    });
  }

  return out.sort((a, b) =>
    a.date.localeCompare(b.date) || a.clientName.localeCompare(b.clientName));
}

/* ── snooze ───────────────────────────────────────────────────── */

/**
 * Where a snooze lands.
 *
 * Measured from the later of today and the row's own date, so snoozing
 * something three weeks overdue by a day puts it on tomorrow rather
 * than back in the overdue pile, which is what "+1 day" means when you
 * are looking at a list of things you are late on.
 */
export function snoozeTo(date: string, days: number, now: Date = new Date()): string {
  const today = isoToday(now);
  return addDays(date > today ? date : today, days);
}

/* ══════════════════════════════════════════════════════════════
   CLIENT HEALTH

   The spec asks that these rules live in one config file. This is
   that file, and HEALTH below is the whole of it: every threshold a
   colour depends on is a named constant here, and every rule is one
   entry in HEALTH_RULES with the sentence it shows on hover.

   Nothing else in HQ decides a colour. The Clients tab reads the
   verdict and draws it.
   ══════════════════════════════════════════════════════════════ */

export const HEALTH = {
  /** This many of a client's own to-dos overdue is a yellow. One or
   *  two is a normal week; three is a client who has stopped. */
  CLIENT_OVERDUE_YELLOW: 3,
  /** Silence this long is a yellow. A week with nothing posted is the
   *  earliest a content account reads as stalled. */
  QUIET_DAYS_YELLOW: 7,
  /** Last month's report is due by this day of this month. Late on
   *  the day after, not on the day itself. */
  REPORT_DUE_DAY: 5,
  /** A release this close with steps still open is a red. */
  RELEASE_RED_DAYS: 14,
  /** How far ahead a Rate Step-Up shows on the card. */
  STEP_UP_NOTICE_DAYS: 30,
  /** The window behind and ahead that "posts this week" counts. */
  POST_WEEK_DAYS: 7,
} as const;

export type Health = 'green' | 'yellow' | 'red';

/** Worst wins, and the order here is that ranking. */
export const HEALTH_ORDER: Health[] = ['green', 'yellow', 'red'];

/** Everything a rule is allowed to look at. Assembled once per client
 *  by clientFacts() so the rules stay pure and testable. */
export interface ClientFacts {
  stage: string | null;
  /** Our own steps, overdue. */
  overdueBlueprint: number;
  /** Theirs. */
  overdueClient: number;
  /** Days since the last thing actually went out, or null when
   *  nothing has in the window we hold. */
  daysSinceLastPost: number | null;
  postedThisWeek: number;
  scheduledThisWeek: number;
  /** The day the most recent published report went out. */
  lastReport: string | null;
  /** Whether a report has been published inside this calendar month. */
  reportThisMonth: boolean;
  /** True once the client has a whole month behind them. A client who
   *  signed this month has no previous month to report on, and must
   *  not go red for not having reported it. */
  monthToReport: boolean;
  /** Days to the next release, and how many of its steps are open. */
  releaseInDays: number | null;
  releaseStepsOpen: number;
  dayOfMonth: number;
}

export interface HealthRule {
  id: string;
  level: Health;
  when: (f: ClientFacts) => boolean;
  /** The sentence shown on hover. Written as a fact, not a telling
   *  off: the card says what is true, and you decide what it means. */
  reason: (f: ClientFacts) => string;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const HEALTH_RULES: HealthRule[] = [
  {
    id: 'blueprint-overdue',
    level: 'yellow',
    when: (f) => f.overdueBlueprint > 0,
    reason: (f) => `${plural(f.overdueBlueprint, 'task', 'tasks')} of ours overdue`,
  },
  {
    id: 'client-overdue',
    level: 'yellow',
    when: (f) => f.overdueClient >= HEALTH.CLIENT_OVERDUE_YELLOW,
    reason: (f) => `${f.overdueClient} client to-dos overdue`,
  },
  {
    id: 'quiet',
    level: 'yellow',
    when: (f) => f.daysSinceLastPost === null
      || f.daysSinceLastPost >= HEALTH.QUIET_DAYS_YELLOW,
    reason: (f) => f.daysSinceLastPost === null
      ? 'nothing posted in the last month'
      : `nothing posted in ${plural(f.daysSinceLastPost, 'day', 'days')}`,
  },
  {
    id: 'report-late',
    level: 'red',
    when: (f) => f.monthToReport
      && f.dayOfMonth > HEALTH.REPORT_DUE_DAY
      && !f.reportThisMonth,
    reason: () => `no report published yet this month, and it was due by the ${HEALTH.REPORT_DUE_DAY}th`,
  },
  {
    id: 'release-at-risk',
    level: 'red',
    when: (f) => f.releaseInDays !== null
      && f.releaseInDays <= HEALTH.RELEASE_RED_DAYS
      && f.releaseStepsOpen > 0,
    reason: (f) => `a release in ${plural(f.releaseInDays ?? 0, 'day', 'days')} with ${plural(f.releaseStepsOpen, 'step', 'steps')} still open`,
  },
];

export interface HealthVerdict {
  level: Health;
  /** Every rule that fired, worst first. Shown on hover. */
  reasons: string[];
}

/** The colour, and why. Worst level wins; green has no reasons. */
export function clientHealth(f: ClientFacts): HealthVerdict {
  const fired = HEALTH_RULES.filter((r) => r.when(f));
  if (!fired.length) return { level: 'green', reasons: [] };

  const level = fired.reduce<Health>((worst, r) =>
    HEALTH_ORDER.indexOf(r.level) > HEALTH_ORDER.indexOf(worst) ? r.level : worst, 'green');

  // Worst first, so the hover opens with the thing that set the
  // colour rather than making you read to the end for it.
  const sorted = fired.slice().sort((a, b) =>
    HEALTH_ORDER.indexOf(b.level) - HEALTH_ORDER.indexOf(a.level));

  return { level, reasons: sorted.map((r) => r.reason(f)) };
}

/* ── assembling the facts ─────────────────────────────────────── */

/** Which clients the Clients tab shows. From the spec. */
export const CARD_STAGES = ['Onboarding', 'Active'] as const;

/** A calendar row with its moment columns. Every row HQ fetches has
 *  them; Today simply does not need them. */
export interface FactStep extends RowStep {
  momentId?: string | null;
  momentType?: string | null;
}

/** A client as the Clients tab reads one: the Today fields plus the
 *  commercial columns a card shows. */
export interface CardClient extends RowClient {
  tier?: string | null;
  monthlyRate?: number | null;
  fullRate?: number | null;
  termStart?: string | null;
  termEnd?: string | null;
  rateStepUp?: string | null;
  /* The links the detail page offers. Optional because the Today
     tab's clients never carry them. */
  clientFolder?: string | null;
  contentVault?: string | null;
  driveFolder?: string | null;
  brandKit?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  brandBriefPdf?: string | null;
}

export interface FactInput {
  steps: FactStep[];
  content: RowContent[];
  /** Published snapshots carry the day they went out. */
  snapshots: Array<{ clientId: string | null; published: boolean; date: string | null; publishedAt: string | null }>;
}

function dayOf(value: string | null): string | null {
  return value ? String(value).slice(0, 10) : null;
}

export function clientFacts(
  client: CardClient, input: FactInput, now: Date = new Date(),
): ClientFacts {
  const today = isoToday(now);
  const mine = input.steps.filter((s) => s.clientId === client.pageId);
  const theirContent = input.content.filter((c) => c.clientId === client.pageId);

  const openStep = (s: FactStep) => s.kind !== 'Moment' && !settled(STEP_SETTLED, s.status);
  const overdue = mine.filter((s) => openStep(s) && s.date !== null && s.date < today);

  // The last thing that actually went out.
  const posted = theirContent
    .filter((c) => c.status === 'Posted' && c.postDate && c.postDate <= today)
    .map((c) => c.postDate as string)
    .sort();
  const last = posted.length ? posted[posted.length - 1] : null;

  const weekBack = addDays(today, -HEALTH.POST_WEEK_DAYS + 1);
  const weekOn = addDays(today, HEALTH.POST_WEEK_DAYS - 1);

  // Published reports, newest first.
  const reports = input.snapshots
    .filter((s) => s.clientId === client.pageId && s.published)
    .map((s) => dayOf(s.publishedAt) ?? dayOf(s.date))
    .filter((d): d is string => Boolean(d))
    .sort();
  const lastReport = reports.length ? reports[reports.length - 1] : null;
  const month = today.slice(0, 7);

  // The next release, and whether its plan is done.
  const releases = mine
    .filter((s) => s.kind === 'Moment'
      && s.momentType === 'Release'
      && s.date && s.date >= today
      && !settled(['Skipped', 'Moved'], s.status))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
  const release = releases[0] ?? null;
  const releaseStepsOpen = release
    ? mine.filter((s) => openStep(s) && s.momentId === release.id).length
    : 0;

  // A client with no term start, or one that began this month, has no
  // previous month to have reported on.
  const started = client.stage === 'Active' || client.stage === 'Onboarding';
  const monthToReport = Boolean(
    started && client.termStart && client.termStart.slice(0, 7) < month);

  return {
    stage: client.stage,
    overdueBlueprint: overdue.filter((s) => s.owner !== 'Client').length,
    overdueClient: overdue.filter((s) => s.owner === 'Client').length,
    daysSinceLastPost: last
      ? Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${last}T00:00:00Z`)) / 86400000)
      : null,
    postedThisWeek: theirContent.filter((c) =>
      c.status === 'Posted' && c.postDate && c.postDate >= weekBack && c.postDate <= today).length,
    scheduledThisWeek: theirContent.filter((c) =>
      !settled(CONTENT_SETTLED, c.status) && c.postDate
      && c.postDate >= today && c.postDate <= weekOn).length,
    lastReport,
    reportThisMonth: Boolean(lastReport && lastReport.slice(0, 7) === month),
    monthToReport,
    releaseInDays: release?.date
      ? Math.round((Date.parse(`${release.date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86400000)
      : null,
    releaseStepsOpen,
    dayOfMonth: Number(today.slice(8, 10)),
  };
}

/** Days until a date, or null. Negative once it has passed. */
export function daysUntilDay(day: string | null, now: Date = new Date()): number | null {
  if (!day) return null;
  const t = Date.parse(`${day}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return Math.round((t - Date.parse(`${isoToday(now)}T00:00:00Z`)) / 86400000);
}

/** Whether a Rate Step-Up is close enough to put on the card. */
export function stepUpSoon(day: string | null, now: Date = new Date()): number | null {
  const n = daysUntilDay(day, now);
  if (n === null || n < 0 || n > HEALTH.STEP_UP_NOTICE_DAYS) return null;
  return n;
}

/* ══════════════════════════════════════════════════════════════
   THE PIPELINE VOCABULARY

   Shared by the Pipeline board in the browser and the write
   endpoints on the server. Both have to mean exactly the same thing
   by a stage name: Notion's API CREATES a select option it does not
   recognise rather than refusing it, so a list that drifted would
   quietly add a column to the board.
   ══════════════════════════════════════════════════════════════ */

/**
 * The pipeline columns, in order.
 *
 * Also the only Stage values this endpoint will write. They have to
 * match the Notion select exactly, because a name Notion does not know
 * would be created as a new option by the API rather than refused.
 */
export const HQ_STAGES = [
  'Lead', 'Call Booked', 'Proposal Sent', 'Onboarding', 'Active', 'Paused', 'Ended',
] as const;

export type HqStage = typeof HQ_STAGES[number];

export function isHqStage(v: unknown): v is HqStage {
  return typeof v === 'string' && (HQ_STAGES as readonly string[]).includes(v);
}

/** A next action is a line, not a document. */
export const MAX_NEXT_ACTION = 200;

/** Trimmed, length-capped, and empty becomes null so clearing works. */
export function cleanNextAction(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  // Newlines out: this lands in a one-line Notion text column and on
  // one line of a pipeline card.
  const s = v.replace(/\s+/g, ' ').trim().slice(0, MAX_NEXT_ACTION);
  return s || null;
}

/** A URL column in Notion, and an href in a client's browser. Long
 *  enough for a signed Drive link, which is the longest address a
 *  brief realistically arrives as. */
export const MAX_BRIEF_URL = 1500;

/**
 * A pasted brand brief link, or null to clear it.
 *
 * `undefined` means "present but not usable", which the caller turns
 * into a rejection rather than a silent drop. Only http and https:
 * this value is handed to the client's browser as a link to click,
 * and the two web schemes are the entire list of things a document
 * can sensibly arrive as.
 */
export function cleanBriefUrl(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s) return null;
  if (s.length > MAX_BRIEF_URL) return undefined;
  let u: URL;
  try {
    u = new URL(s);
  } catch {
    return undefined;
  }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return undefined;
  return u.toString();
}

/**
 * The lead sources, exactly as the Notion select holds them.
 *
 * Closed for the same reason the stages are: the API creates an
 * option it does not recognise rather than refusing it, so a typo
 * here would quietly add a sixth source to the board.
 */
export const LEAD_SOURCES = [
  'Referral', 'Outreach', 'Inbound', 'Show Media Client', 'Network',
] as const;

export type LeadSource = typeof LEAD_SOURCES[number];

export function isLeadSource(v: unknown): v is LeadSource {
  return typeof v === 'string' && (LEAD_SOURCES as readonly string[]).includes(v);
}

/** An artist name is a title, not an essay. */
export const MAX_ARTIST = 120;

/** Every new lead starts here. Quick add is for the top of the
 *  funnel; anything further along is a row you make in Notion. */
export const NEW_LEAD_STAGE: HqStage = 'Lead';

/* ══════════════════════════════════════════════════════════════
   4 · REPORTS

   What the Reports tab needs that a snapshot row does not already
   say: whether a draft is thin, and in what way.

   Nothing in here decides whether a report MAY be published. The
   server decides that, and it will publish a snapshot with every
   field blank, because sometimes a month genuinely is a baseline
   with three numbers in it. This is the list Mason reads before he
   presses the button, not a gate in front of it.
   ══════════════════════════════════════════════════════════════ */

/** The part of a snapshot these rules look at. The payload hands over
 *  the whole shaped row; naming the subset keeps a test honest about
 *  what actually feeds a verdict. */
export interface SnapshotFacts {
  date: string | null;
  metrics: Record<string, number>;
  win: string | null;
  watch: string | null;
  summary: string | null;
  focus: readonly (string | null)[];
}

export interface ReportGap {
  /** The snapshot field, for a test and for a stable key. */
  field: string;
  /** What it is called in Notion. */
  label: string;
  /** Where its absence shows in the document the client opens. */
  where: string;
  /**
   * True when the document comes out WRONG without it rather than
   * merely thinner.
   *
   * The templates skip an absent section, so most of these produce a
   * shorter report and nothing worse. The blocking three do not: a
   * month with no date cannot be compared to the month before it, a
   * month with no numbers has four empty tiles where the headline
   * should be, and the biggest win is both the first line of the
   * document and the line the email quotes.
   */
  blocking: boolean;
}

/** Every field the Reports tab checks, in the order it reads them. */
export const REPORT_FIELDS: readonly ReportGap[] = [
  { field: 'date', label: 'Date', where: 'the month on every page', blocking: true },
  { field: 'metrics', label: 'Metrics', where: 'the four tiles', blocking: true },
  { field: 'win', label: 'Biggest Win', where: 'the headline and the email', blocking: true },
  { field: 'watch', label: 'Watch', where: 'the second card', blocking: false },
  { field: 'summary', label: 'Summary', where: '"From Mason" in the portal', blocking: false },
  { field: 'focus', label: 'Focus 1-3', where: "next month's cards", blocking: false },
] as const;

const filled = (v: string | null | undefined): boolean => Boolean(v && v.trim());

/** Does this snapshot have that field? One place, so the tab and a
 *  test cannot disagree about what counts as present. */
function hasField(s: SnapshotFacts, field: string): boolean {
  if (field === 'date') return filled(s.date);
  if (field === 'metrics') return Object.keys(s.metrics ?? {}).length > 0;
  if (field === 'win') return filled(s.win);
  if (field === 'watch') return filled(s.watch);
  if (field === 'summary') return filled(s.summary);
  // Any one of the three is enough. Three empty focus cards is a
  // missing section; two is a deliberately short one.
  if (field === 'focus') return (s.focus ?? []).some(filled);
  return true;
}

/** What is not written yet, in the order REPORT_FIELDS lists it. */
export function reportGaps(s: SnapshotFacts): ReportGap[] {
  return REPORT_FIELDS.filter((g) => !hasField(s, g.field));
}

/** Is a gap one that makes the document wrong? */
export function blocksPublish(gaps: readonly ReportGap[]): boolean {
  return gaps.some((g) => g.blocking);
}

/* ── which pile a row goes in ─────────────────────────────────── */

interface DatedRow {
  date: string | null;
  published: boolean;
}

/** Undated last, then newest first. Both piles sort the same way so
 *  a month does not jump when it is published. */
function byDateDesc(a: DatedRow, b: DatedRow): number {
  return String(b.date ?? '').localeCompare(String(a.date ?? ''));
}

export function reportDrafts<T extends DatedRow>(rows: readonly T[]): T[] {
  return rows.filter((r) => !r.published).sort(byDateDesc);
}

export function reportPublished<T extends DatedRow>(rows: readonly T[]): T[] {
  return rows.filter((r) => r.published).sort(byDateDesc);
}

/* ── audits ───────────────────────────────────────────────────── */

interface AuditLike {
  audience: string;
  status: string | null;
  auditDate: string | null;
}

/** Audit order: Draft first, then Ready, then Sent, and newest first
 *  inside each. The ones with work left on them come to the top. */
const AUDIT_STATUS_ORDER = ['Draft', 'Ready', 'Sent'] as const;

export function sortAudits<T extends AuditLike>(rows: readonly T[]): T[] {
  const rank = (s: string | null) => {
    const i = (AUDIT_STATUS_ORDER as readonly string[]).indexOf(s ?? '');
    return i === -1 ? AUDIT_STATUS_ORDER.length : i;
  };
  return [...rows].sort((a, b) =>
    rank(a.status) - rank(b.status)
    || String(b.auditDate ?? '').localeCompare(String(a.auditDate ?? '')));
}

/**
 * Which route an action on this document goes through.
 *
 * A snapshot and a client audit belong to exactly one portal, and the
 * portal's admin route is where the "does this row belong to this
 * client" check lives, so they go through it. A prospect teardown
 * belongs to no portal at all: HQ has its own route for those rather
 * than borrowing some unrelated client's slug to satisfy the URL.
 *
 * Null means there is nowhere to send it. That is only ever a report
 * whose client has no Intake Slug, which is a Notion row to fix
 * rather than a button to draw: the portal route it would need is
 * keyed by slug, so there is no URL that reaches it.
 */
export function docBase(
  kind: 'report' | 'audit', id: string, slug: string | null,
): string | null {
  const safe = encodeURIComponent(id);
  if (slug) return `/portal/${encodeURIComponent(slug)}/admin/${kind}/${safe}`;
  return kind === 'audit' ? `/portal/hq/audit/${safe}` : null;
}

/* ── the calendar, across clients ──────────────────────────────────
   HQ draws the client portal's calendar over every live client at
   once. Three things that calendar does not have to think about come
   up the moment there is more than one client on it: whose row is
   whose, which clients are on screen, and the fact that two shows on
   one night is now a thing that can happen. These are those rules,
   away from the DOM so they can be tested. */

/** The stages HQ's calendar covers. A prospect has no plan yet and an
 *  ended client's plan is history; either on the calendar is noise. */
export const CAL_STAGES = ['Onboarding', 'Active'] as const;

export function onCalendar(client: { stage: string | null }): boolean {
  return (CAL_STAGES as readonly string[]).includes(client.stage ?? '');
}

/**
 * The colour ring client chips are drawn from.
 *
 * These are the Notion palette names the portal already styles as
 * `.pt-nc-*`, so a client's colour is a slot rather than a hex and the
 * chip, the dot and the filter button cannot drift apart. Default and
 * the two greys are left out: a client has to be distinguishable from
 * an unbucketed card.
 */
export const CLIENT_COLORS = [
  'blue', 'orange', 'green', 'purple', 'pink', 'red', 'yellow', 'brown',
] as const;

/**
 * A client's colour, decided by their slug and nothing else.
 *
 * Deliberately not "their position in the list": assigning by order
 * means taking on a client repaints everyone else's chips, and the
 * colour is the thing we are asking someone to recognise at a glance.
 * A hash is stable for the life of the slug. Two clients can collide,
 * which is why the name is in every chip's tooltip and beside the
 * colour in the filter bar: the colour is a shortcut, not the label.
 */
export function clientColor(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 100003;
  return CLIENT_COLORS[h % CLIENT_COLORS.length];
}

/** Two of these on one day, across clients, is worth a second look. */
export const CLASH_SHOW_TYPES = ['Show', 'Release'] as const;

export interface ClashRow {
  momentType: string | null;
  kind: string | null;
  title: string | null;
  flow?: string | null;
  clientSlug?: string | null;
  contentRole?: 'post' | 'film';
}

/** A show or a release: something with an audience on a given night. */
export function isShowOrRelease(row: ClashRow): boolean {
  const mt = (row.momentType ?? '').toLowerCase();
  if (!mt && row.kind !== 'Moment') return false;
  return (CLASH_SHOW_TYPES as readonly string[]).some((t) => mt.includes(t.toLowerCase()))
    || mt.includes('drop') || mt.includes('single');
}

/** A day with a camera on it: a client film session step, or a card
 *  whose shoot date this is. */
export function isFilmSession(row: ClashRow): boolean {
  if (row.contentRole === 'film') return true;
  if (row.flow === 'Client film session') return true;
  return isFilmStep({ title: row.title ?? null });
}

/**
 * Why a day is worth a second look, in words, or null.
 *
 * Only across clients: two of Sean's shows on one night is Sean's
 * problem and he already knows. Two clients playing the same night, or
 * two shoots on one day, is ours, because one of us has to be at both.
 */
export function dayClash(rows: ClashRow[]): string | null {
  const shows = new Set<string>();
  const films = new Set<string>();
  for (const r of rows) {
    const who = r.clientSlug ?? '';
    if (isShowOrRelease(r)) shows.add(who);
    else if (isFilmSession(r)) films.add(who);
  }
  const parts: string[] = [];
  if (shows.size > 1) parts.push(`${shows.size} clients have a show or release`);
  if (films.size > 1) parts.push(`${films.size} clients are filming`);
  if (!parts.length) return null;
  return `${parts.join(', and ')} on this day`;
}
