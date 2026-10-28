// ─────────────────────────────────────────────────────────────
// Client portal: field whitelists and pure shaping.
//
// ONE definition, used by the Pages Functions that query Notion and by
// the tests. Same arrangement as intake.ts, for the same reason: the
// property names have to match the Notion databases character for
// character, and two copies would eventually disagree.
//
// The rule that matters here is the WHITELIST. Every database this
// portal touches holds things a client must never see: their own rate,
// our internal notes, the portal key itself. So nothing is ever copied
// wholesale from a Notion page. A property reaches the browser only
// because it is named below, and a new property added in Notion is
// invisible here until someone adds it on purpose.
//
// Nothing in this file talks to Notion or reads a secret, so it is safe
// to import anywhere and cheap to test.
// ─────────────────────────────────────────────────────────────

/* ── Clients ──────────────────────────────────────────────────── */

/** Clients properties the browser is allowed to receive. */
export const CLIENT_FIELDS = [
  'Artist',
  'Tier',
  'Stage',
  'Term Start',
  'Term End',
  'Client Announcement',
  'Drive Folder',
  'Content Vault',
  'Roadmap Link',
  'Access Complete',
  '90-Day Goals',
  'Goal Deadline',
  'Goal · Instagram Followers',
  'Goal · Songs at 10K Streams',
  'Goal · Shows per Month',
] as const;

/** Named purely so a test can assert they never appear in output.
 *  The whitelist above is what actually enforces this; this list is a
 *  tripwire, so that deleting a name from CLIENT_FIELDS by accident
 *  fails loudly rather than silently widening what ships. */
export const CLIENT_NEVER_SEND = [
  'Portal Key',
  'Portal Enabled',
  'Monthly Rate',
  'Full Rate',
  'Notes',
  'Next Action',
  'Next Action Date',
  'Email',
  'Phone',
  'Lead Source',
  'Access Granted',
  'Beta',
  'Genre / Niche',
  'Primary Contact',
  'Contract Signed',
  'Rate Step-Up',
  'Intake Slug',
] as const;

/* ── Campaign Calendar ────────────────────────────────────────── */

export const CALENDAR_FIELDS = [
  'Item',
  'Kind',
  'Moment Type',
  'Date',
  'Status',
  'Type',
  'Owner',
  'Playbook',
  'Phase',
  'Where',
  'Why It Matters',
  'Venue / City',
  'Ticket or RSVP Link',
  'Moment',
  'Streams to Date',
  'Tickets Sold',
] as const;

export const CALENDAR_NEVER_SEND = ['Notes', 'Offset (days)', 'Is Playbook', 'Hide from Client'] as const;

/* ── KPI Snapshots ────────────────────────────────────────────── */

export const SNAPSHOT_FIELDS = ['Date', 'Type', 'Data Source', 'Growth Score (/40)'] as const;

export const SNAPSHOT_NEVER_SEND = ['Notes', 'Snapshot'] as const;

/** Numeric columns that are metrics but do not follow "Platform · Metric". */
export const EXTRA_METRICS = ['Email + SMS List', 'Shows This Month', 'Tickets Sold'] as const;

/** Separator Notion uses in metric names: a middle dot, spaced. */
export const METRIC_SEPARATOR = ' · ';

/**
 * Is this KPI property a metric the client may see?
 *
 * Deliberately a rule rather than a fixed list, so a new platform metric
 * added in Notion shows up without a deploy. It is still a whitelist: a
 * name has to look like "Platform · Metric" or be named in EXTRA_METRICS,
 * and the caller only ever offers it number-typed properties. "Notes" is
 * text, and a hypothetical "Monthly Rate" would match neither shape.
 */
export function isMetricProp(name: string): boolean {
  if ((EXTRA_METRICS as readonly string[]).includes(name)) return true;
  return name.includes(METRIC_SEPARATOR);
}

/** Engagement is stored as a decimal (0.042), shown as a percent. */
export function isEngagementMetric(name: string): boolean {
  return name.endsWith(`${METRIC_SEPARATOR}Engagement`);
}

/** 0.042 -> "4.2%". One decimal: engagement rates below 0.1% are noise. */
export function formatEngagement(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** The platform half of "Instagram · Followers", or null for the rest. */
export function metricPlatform(name: string): string | null {
  const i = name.indexOf(METRIC_SEPARATOR);
  return i === -1 ? null : name.slice(0, i);
}

/** The metric half of "Instagram · Followers". */
export function metricLabel(name: string): string {
  const i = name.indexOf(METRIC_SEPARATOR);
  return i === -1 ? name : name.slice(i + METRIC_SEPARATOR.length);
}

/* ── Calendar visibility ──────────────────────────────────────── */

export interface VisibilityInput {
  isPlaybook: boolean;
  hideFromClient: boolean;
  kind: string | null;
  type: string | null;
  owner: string | null;
}

/**
 * Does this calendar row belong in the client's portal?
 *
 * Notion filters the query the same way, but this runs again on every
 * row that comes back. A filter is a performance decision; this is the
 * actual rule, and it is the thing the tests point at.
 *
 * Admin steps stay hidden UNLESS the client owns them, because an admin
 * step the client has to do is a to-do, not back-office noise.
 */
export function isVisibleToClient(row: VisibilityInput): boolean {
  if (row.isPlaybook) return false;
  if (row.hideFromClient) return false;
  return row.kind === 'Moment' || row.type === 'Content' || row.owner === 'Client';
}

/* ── Title cleanup ────────────────────────────────────────────── */

export interface CleanedTitle {
  title: string;
  tentative: boolean;
}

/**
 * Calendar titles are written for our board, not for the client.
 *
 * They carry an artist prefix ("Sean Comma · Announce the single"),
 * which is pure noise inside that artist's own portal, and a literal
 * "(TENTATIVE)" marker, which belongs in the UI as a tag rather than in
 * the middle of a sentence.
 */
export function cleanItemTitle(raw: string, artist: string): CleanedTitle {
  let title = (raw ?? '').trim();

  const prefix = `${(artist ?? '').trim()}${METRIC_SEPARATOR}`;
  if (artist && title.toLowerCase().startsWith(prefix.toLowerCase())) {
    title = title.slice(prefix.length).trim();
  }

  const tentative = /\(tentative\)/i.test(title);
  if (tentative) {
    title = title.replace(/\s*\(tentative\)\s*/gi, ' ').trim();
  }

  // Collapse whitespace left behind by either removal.
  title = title.replace(/\s{2,}/g, ' ').trim();

  return { title, tentative };
}

/* ── Term progress ────────────────────────────────────────────── */

export interface TermProgress {
  month: number;
  total: number;
  /** 0 to 1, for the bar. */
  fraction: number;
  /** Which side of the term today falls on. */
  state: 'before' | 'during' | 'after';
  /** Whole days until Term Start. 0 unless state is 'before'. */
  daysUntilStart: number;
}

/** Parses "YYYY-MM-DD" (or an ISO datetime) as a LOCAL date.
 *  `new Date('2026-10-22')` is parsed as UTC midnight, which renders as
 *  the 21st anywhere west of Greenwich. Date-only values have no
 *  timezone, so they are built field by field instead. */
export function parseNotionDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) {
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/**
 * "Month 2 of 6", plus which side of the term today is on.
 *
 * The term is INCLUSIVE of both end months: Nov 1 -> Apr 30 is six
 * months, not five. Counting the difference in month index alone gives
 * five, which is the off-by-one this used to ship.
 *
 * Before the term starts there is no "month 1" to be in yet, so the
 * caller gets state 'before' and a day count instead; after it ends,
 * 'after'. Clamping both into "month N of T" is what made a portal
 * opened a week early read as though work was already underway.
 */
export function termProgress(
  start: string | null,
  end: string | null,
  now: Date = new Date(),
): TermProgress | null {
  const s = parseNotionDate(start);
  const e = parseNotionDate(end);
  if (!s || !e || e <= s) return null;

  // Inclusive: the start month and the end month both count.
  const spanMonths = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  const total = Math.max(1, spanMonths + 1);

  const DAY = 24 * 60 * 60 * 1000;
  const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const today = midnight(now);

  if (today < midnight(s)) {
    return {
      month: 0,
      total,
      fraction: 0,
      state: 'before',
      daysUntilStart: Math.max(1, Math.round((midnight(s) - today) / DAY)),
    };
  }

  if (today > midnight(e)) {
    return { month: total, total, fraction: 1, state: 'after', daysUntilStart: 0 };
  }

  const elapsed = (now.getFullYear() - s.getFullYear()) * 12 + (now.getMonth() - s.getMonth());
  const month = Math.min(total, Math.max(1, elapsed + 1));

  // The bar runs to the END of the last day, so the final day is full.
  const span = midnight(e) + DAY - midnight(s);
  const fraction = Math.min(1, Math.max(0, (today - midnight(s)) / span));

  return { month, total, fraction, state: 'during', daysUntilStart: 0 };
}

/* ── To-dos ───────────────────────────────────────────────────── */

/** Statuses that take a row off the client's to-do list. */
export const CLOSED_STATUSES = ['Done', 'Skipped'] as const;

export function isOpenClientTodo(row: { owner: string | null; status: string | null }): boolean {
  if (row.owner !== 'Client') return false;
  return !(CLOSED_STATUSES as readonly string[]).includes(row.status ?? '');
}

/* ── Shapes the browser receives ──────────────────────────────── */

export interface PortalClient {
  artist: string;
  tier: string | null;
  stage: string | null;
  termStart: string | null;
  termEnd: string | null;
  announcement: string | null;
  driveFolder: string | null;
  contentVault: string | null;
  roadmapLink: string | null;
  accessComplete: boolean;
  /** The client's own words, shown as a quote on Home. */
  goals: string | null;
  goalDeadline: string | null;
  goalInstagramFollowers: number | null;
  goalSongsAt10k: number | null;
  goalShowsPerMonth: number | null;
}

/** The moment a step belongs to, flattened to four fields.
 *
 *  A relation could carry the whole related page. It carries these
 *  four and nothing else, so a moment's Notes or Offset cannot ride
 *  into the browser on the back of a step. */
export interface PortalMoment {
  id: string;
  title: string;
  momentType: string | null;
  date: string | null;
}

export interface PortalCalendarItem {
  title: string;
  tentative: boolean;
  kind: string | null;
  momentType: string | null;
  date: string | null;
  status: string | null;
  type: string | null;
  owner: string | null;
  playbook: string | null;
  phase: string | null;
  where: string | null;
  whyItMatters: string | null;
  venueCity: string | null;
  ticketLink: string | null;
  /** The Notion page id, so steps can be grouped by their moment. */
  id: string;
  /** For a step: the moment it promotes. Null for a moment itself. */
  moment: PortalMoment | null;
  /** Release moments only. */
  streamsToDate: number | null;
  /** Show moments only. */
  ticketsSold: number | null;
}

export interface PortalSnapshot {
  date: string | null;
  type: string | null;
  dataSource: string[];
  growthScore: number | null;
  /** Metric name -> value. Only metrics that actually have a number. */
  metrics: Record<string, number>;
}

export interface PortalPayload {
  client: PortalClient;
  calendar: PortalCalendarItem[];
  snapshots: PortalSnapshot[];
}

/** Headline metrics, in the order the Reports section shows them.
 *  Anything with no data on either snapshot is hidden, so this list is
 *  an ordering, not a promise that all of them exist. */
export const HEADLINE_METRICS = [
  'Instagram · Followers',
  'TikTok · Followers',
  'YouTube · Subscribers',
  'Spotify · Monthly Listeners',
  'Spotify · Followers',
  'SoundCloud · Followers',
  'Facebook · Followers',
  'Threads · Followers',
  'X · Followers',
  'Email + SMS List',
] as const;

/* ── 90-day goals ─────────────────────────────────────────────── */

/** A song "counts" at this many streams. The goal is named for it. */
export const SONG_STREAM_TARGET = 10_000;

export interface GoalProgress {
  baseline: number;
  current: number;
  target: number;
  /** Movement since the baseline, which is what the client did. */
  gained: number;
  /** 0 to 1 of the way from baseline to target. */
  fraction: number;
}

/**
 * Progress from where they started to where they said they would be.
 *
 * Measured from the BASELINE, not from zero: a client who starts at
 * 3,117 of 5,000 has not already done 62% of the work, they have done
 * none of it yet. Starting the bar at the baseline is the only version
 * that moves when they move.
 */
export function goalProgress(baseline: number, current: number, target: number): GoalProgress {
  const span = target - baseline;
  const gained = current - baseline;
  const fraction = span <= 0
    ? (current >= target ? 1 : 0)
    : Math.min(1, Math.max(0, gained / span));
  return { baseline, current, target, gained, fraction };
}

/**
 * Is this text a placeholder rather than a value?
 *
 * A Notion text column gets filled with an em dash or "TBD" when there
 * is nothing to say yet. That is a person writing "blank", and it
 * reaches a client as "Your to-do · —" or a drawer row reading
 * "Channel —". Treated as empty, those rows simply do not appear.
 */
const PLACEHOLDER = /^(?:[-–—]+|n\/?a|tbd|tba|none|null)$/i;

export function cleanText(value: string | null): string | null {
  if (value === null) return null;
  const s = value.trim();
  return !s || PLACEHOLDER.test(s) ? null : s;
}

/** Release moments that have cleared the stream target. */
export function songsAtTarget(
  items: Array<{ momentType: string | null; streamsToDate: number | null }>,
  target: number = SONG_STREAM_TARGET,
): number {
  return items.filter(
    (i) => (i.momentType ?? '').toLowerCase().includes('release')
      && typeof i.streamsToDate === 'number'
      && i.streamsToDate >= target,
  ).length;
}

/**
 * Show moments in the same calendar month as `when`.
 *
 * Shows played before the term started are not ours to count. Without
 * `termStart` the month on its own decides, which is what the calendar
 * page wants; the goal card always passes it.
 */
export function showsInMonth(
  items: Array<{ kind: string | null; momentType: string | null; date: string | null }>,
  when: Date = new Date(),
  termStart: string | null = null,
): number {
  const start = parseNotionDate(termStart);
  return items.filter((i) => {
    if (!(i.momentType ?? '').toLowerCase().includes('show')) return false;
    const d = parseNotionDate(i.date);
    if (!d) return false;
    if (start && d < start) return false;
    return d.getFullYear() === when.getFullYear() && d.getMonth() === when.getMonth();
  }).length;
}

/**
 * The weekly pace that still reaches `target` by `deadline`.
 *
 * Null when there is no deadline, when it has passed, or when the goal
 * is already met: a number of followers per week is only useful advice
 * while there is still time to act on it.
 */
export function weeklyPaceNeeded(
  current: number, target: number, deadline: string | null, now: Date = new Date(),
): number | null {
  if (current >= target) return null;
  const days = daysUntil(deadline, now);
  if (days === null || days <= 0) return null;
  return (target - current) / (days / 7);
}

/**
 * Shows per month since the term started.
 *
 * Counts part months as whole ones, because a client three weeks into
 * month one has not played "shows per 0.7 months". The floor of 1 is
 * what stops the average reading as infinity on day two.
 */
export function showsPerMonthAverage(
  items: Array<{ kind: string | null; momentType: string | null; date: string | null }>,
  termStart: string | null,
  now: Date = new Date(),
): number | null {
  const start = parseNotionDate(termStart);
  if (!start || now < start) return null;

  const shows = items.filter((i) => {
    if (!(i.momentType ?? '').toLowerCase().includes('show')) return false;
    const d = parseNotionDate(i.date);
    return !!d && d >= start && d <= now;
  }).length;

  const months = Math.max(
    1,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()) + 1,
  );
  return shows / months;
}

/** Whole days from today to a date. Negative once it has passed. */
export function daysUntil(date: string | null, now: Date = new Date()): number | null {
  const d = parseNotionDate(date);
  if (!d) return null;
  const DAY = 24 * 60 * 60 * 1000;
  const midnight = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  return Math.round((midnight(d) - midnight(now)) / DAY);
}
