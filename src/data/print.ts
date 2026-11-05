// ─────────────────────────────────────────────────────────────
// Report and audit PDFs: field names, formatting and every
// calculation that turns Notion rows into a page model.
//
// PURE. Nothing here talks to Notion, reads a secret, or builds
// HTML. Same arrangement as portal.ts, for the same reason: the
// property names have to match Notion character for character, and
// the arithmetic behind "▲ 17% vs Oct" is the part most worth having
// a test point at.
//
// The division of labour is deliberate:
//
//   print.ts          what the numbers mean      (this file, tested)
//   print-*.ts        what the page looks like   (server, HTML)
//   report-data.ts    where the rows come from   (server, Notion)
//
// A page template never does arithmetic and never reaches for a
// Notion property name. It is handed a model built here.
// ─────────────────────────────────────────────────────────────

import {
  METRIC_SEPARATOR,
  SONG_STREAM_TARGET,
  daysUntil,
  goalProgress,
  parseNotionDate,
  showsInMonth,
  songsAtTarget,
  weeklyPaceNeeded,
  type GoalProgress,
  type PortalCalendarItem,
  type PortalClient,
} from './portal';

/* ── Notion field names ───────────────────────────────────────
   Every property these PDFs read, named once. A name that drifts in
   Notion fails here, in one place, rather than in six templates.
   ────────────────────────────────────────────────────────────── */

/** KPI Snapshots fields the report reads beyond the metrics. */
export const REPORT_SNAPSHOT_FIELDS = [
  'Summary',
  'Win',
  'Watch',
  'Focus 1',
  'Focus 2',
  'Focus 3',
  'Release Notes',
  'Published',
  'Report PDF',
  'Published At',
] as const;

/** Audits fields, in the order the cover and scorecard want them. */
export const AUDIT_FIELDS = [
  'Audit',
  'Prospect Name',
  'Audience',
  'Status',
  'Audit Date',
  'Data Window',
  'Platforms Reviewed',
  'Short Version',
  'Positioning Read',
  'Offer',
  'Book a Call Link',
  'Published',
  'Audit PDF',
  'Share Link',
] as const;

/**
 * The eight scorecard properties, in the order the canvas lists them.
 *
 * `label` is what the scorecard row says. `note` is the key a
 * "Scorecard notes" bullet is matched on, which is the property name
 * with the "Score · " prefix dropped, because that is how they are
 * written in the page body.
 */
export const SCORE_FIELDS = [
  { prop: 'Score · Profile and positioning', label: 'Profile and positioning' },
  { prop: 'Score · Posting consistency', label: 'Posting consistency' },
  { prop: 'Score · Hook strength', label: 'Hook strength' },
  { prop: 'Score · Format fit', label: 'Format fit for the scene' },
  { prop: 'Score · Show leverage', label: 'Show leverage' },
  { prop: 'Score · Release leverage', label: 'Release leverage' },
  { prop: 'Score · Fan capture', label: 'Fan capture (owned audience)' },
  { prop: 'Score · Brand clarity', label: 'Brand clarity' },
] as const;

/** The key a scorecard-notes bullet is looked up by. */
export const scoreNoteKey = (prop: string): string =>
  prop.startsWith('Score · ') ? prop.slice('Score · '.length) : prop;

/** Out of this many. Eight scores, five points each. */
export const SCORE_MAX = SCORE_FIELDS.length * 5;

/** A score at or below this is drawn orange and reads "priority to fix". */
export const SCORE_PRIORITY_AT = 2;

/* ── Rollups the at-a-glance tiles are built from ─────────────── */

/** Views across every platform that reports them, for one tile. */
export const VIEW_ROLLUP = [
  'Instagram · Views (28d)',
  'TikTok · Views (28d)',
  'Facebook · Views (28d)',
  'YouTube · Views (28d)',
] as const;

/** Net follower movement across every platform that reports it. */
export const NET_FOLLOW_ROLLUP = [
  'Instagram · Net Follows (28d)',
  'TikTok · Net Follows (28d)',
  'Facebook · Net Follows (28d)',
] as const;

/**
 * Sums the named metrics that are present.
 *
 * Returns null when NONE of them are, which is the difference between
 * "no views this month" and "we have not filled the views in yet". A
 * tile reading 0 because a column is blank is a lie the client has no
 * way to see through.
 */
export function rollup(
  metrics: Record<string, number>,
  names: readonly string[],
): number | null {
  let total = 0;
  let found = false;
  for (const name of names) {
    const v = metrics[name];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    total += v;
    found = true;
  }
  return found ? total : null;
}

/* ── the platform table ───────────────────────────────────────── */

/** How a value is printed. */
export type NumFormat = 'int' | 'compact' | 'pct' | 'sec';
/** How the change column is printed. */
export type ChangeFormat = 'abs' | 'pct' | 'pts' | 'sec';

export interface MetricRow {
  prop: string;
  label: string;
  fmt: NumFormat;
  change: ChangeFormat;
  /** True for a row the canvas does not have. Printed only while
   *  there is room on the page. See MAX_TABLE_ROWS. */
  extra?: boolean;
}

export interface MetricGroup {
  name: string;
  rows: MetricRow[];
}

/**
 * How many metric rows fit on page four.
 *
 * Measured, not guessed: the content box is 848px tall, the heading
 * block and its gap take about 70, a group row is 32 and a data row 29,
 * so five group rows and a 30px table head leave room for twenty.
 *
 * The page is `overflow:hidden`, so going over does not spill onto a
 * seventh sheet. It silently cuts the last row in half instead, which
 * is worse. Hence a cap rather than trust.
 */
export const MAX_TABLE_ROWS = 20;

/**
 * Page four, in full.
 *
 * The change column differs by row on purpose. A follower count moving
 * by 369 is the useful fact; views moving by 15% is. An engagement rate
 * is quoted in points, because "engagement up 7%" reads as though the
 * rate were 7% when it moved by half of one.
 *
 * The nineteen rows the canvas names come first. The rest are marked
 * `extra`: Mason fills more columns than one page can hold, so they are
 * printed for a client whose numbers leave room and dropped for one
 * whose do not, rather than being left out of the report for everyone.
 */
export const PLATFORM_TABLE: MetricGroup[] = [
  {
    name: 'Instagram',
    rows: [
      { prop: 'Instagram · Followers', label: 'Followers', fmt: 'int', change: 'abs' },
      { prop: 'Instagram · Views (28d)', label: 'Views', fmt: 'compact', change: 'pct' },
      { prop: 'Instagram · Reach (28d)', label: 'Reach', fmt: 'compact', change: 'pct' },
      { prop: 'Instagram · Engagement', label: 'Engagement rate', fmt: 'pct', change: 'pts' },
      { prop: 'Instagram · Avg Watch Time (sec)', label: 'Avg watch time', fmt: 'sec', change: 'sec' },
      { prop: 'Instagram · Avg Views', label: 'Avg views per post', fmt: 'int', change: 'pct', extra: true },
      { prop: 'Instagram · Posts', label: 'Posts', fmt: 'int', change: 'abs', extra: true },
    ],
  },
  {
    name: 'TikTok',
    rows: [
      { prop: 'TikTok · Followers', label: 'Followers', fmt: 'int', change: 'abs' },
      { prop: 'TikTok · Views (28d)', label: 'Views', fmt: 'compact', change: 'pct' },
      { prop: 'TikTok · Shares (28d)', label: 'Shares', fmt: 'int', change: 'pct' },
      { prop: 'TikTok · Profile Views (28d)', label: 'Profile views', fmt: 'compact', change: 'pct' },
      { prop: 'TikTok · Engagement', label: 'Engagement rate', fmt: 'pct', change: 'pts', extra: true },
      { prop: 'TikTok · Posts', label: 'Posts', fmt: 'int', change: 'abs', extra: true },
    ],
  },
  {
    name: 'Facebook · YouTube',
    rows: [
      { prop: 'Facebook · Views (28d)', label: 'Facebook views', fmt: 'compact', change: 'pct' },
      { prop: 'YouTube · Subscribers', label: 'YouTube subscribers', fmt: 'int', change: 'abs' },
      { prop: 'YouTube · Views (28d)', label: 'YouTube views', fmt: 'int', change: 'abs' },
      { prop: 'Facebook · Followers', label: 'Facebook followers', fmt: 'int', change: 'abs', extra: true },
      { prop: 'YouTube · Watch Hours (28d)', label: 'YouTube watch hours', fmt: 'int', change: 'abs', extra: true },
    ],
  },
  {
    name: 'Streaming',
    rows: [
      { prop: 'Spotify · Monthly Listeners', label: 'Spotify monthly listeners', fmt: 'int', change: 'pct' },
      { prop: 'Spotify · Streams (28d)', label: 'Spotify streams', fmt: 'int', change: 'pct' },
      { prop: 'Spotify · Saves (28d)', label: 'Spotify saves', fmt: 'int', change: 'pct' },
      { prop: 'Apple Music · Plays (28d)', label: 'Apple Music plays', fmt: 'int', change: 'pct' },
      { prop: 'SoundCloud · Followers', label: 'SoundCloud followers', fmt: 'int', change: 'abs' },
      { prop: 'Spotify · Followers', label: 'Spotify followers', fmt: 'int', change: 'abs', extra: true },
      { prop: 'Spotify · Playlist Adds (28d)', label: 'Spotify playlist adds', fmt: 'int', change: 'pct', extra: true },
    ],
  },
  {
    name: 'Owned audience',
    rows: [
      { prop: 'Email + SMS List', label: 'Email + SMS list', fmt: 'int', change: 'abs' },
      { prop: 'Email · Open Rate', label: 'Email open rate', fmt: 'pct', change: 'pts' },
      { prop: 'Email · Click Rate', label: 'Email click rate', fmt: 'pct', change: 'pts', extra: true },
    ],
  },
];

/** One printed row of the platform table. */
export interface TableRow {
  label: string;
  now: string;
  last: string;
  base: string;
  change: Delta;
}

export interface TableGroup {
  name: string;
  rows: TableRow[];
}

/**
 * Page four, resolved against three snapshots.
 *
 * A row is dropped when this month has no value for it: a report is
 * better off not mentioning Apple Music than carrying a line of
 * dashes. A group with no surviving rows goes with it, so an artist
 * who is not on Spotify has no Streaming band at all.
 *
 * Then the cap. Canvas rows are kept whatever happens; `extra` rows
 * are dropped from the bottom up until the page fits.
 */
export function platformTable(
  current: Record<string, number>,
  previous: Record<string, number> | null,
  baseline: Record<string, number> | null,
): TableGroup[] {
  const groups: TableGroup[] = [];

  for (const group of PLATFORM_TABLE) {
    const rows: Array<TableRow & { extra: boolean }> = [];
    for (const row of group.rows) {
      const now = get(current, row.prop);
      if (now === null) continue;
      const last = previous ? get(previous, row.prop) : null;
      const base = baseline ? get(baseline, row.prop) : null;
      rows.push({
        label: row.label,
        now: formatValue(now, row.fmt),
        last: last === null ? '—' : formatValue(last, row.fmt),
        base: base === null ? '—' : formatValue(base, row.fmt),
        change: delta(now, last, row.change),
        extra: row.extra === true,
      });
    }
    if (rows.length) groups.push({ name: group.name, rows });
  }

  // Trim from the back: the last extra row of the last group that has
  // one goes first, so the top of the page stays stable month to month.
  let count = groups.reduce((n, g) => n + g.rows.length, 0);
  for (let g = groups.length - 1; g >= 0 && count > MAX_TABLE_ROWS; g--) {
    const rows = groups[g].rows as Array<TableRow & { extra: boolean }>;
    for (let r = rows.length - 1; r >= 0 && count > MAX_TABLE_ROWS; r--) {
      if (!rows[r].extra) continue;
      rows.splice(r, 1);
      count--;
    }
  }

  return groups.filter((g) => g.rows.length > 0);
}

/* ── numbers ──────────────────────────────────────────────────── */

/** 1874 -> "1,874". */
export function int(value: number): string {
  return Math.round(value).toLocaleString('en-US');
}

/**
 * 212400 -> "212.4K", 1380 -> "1,380".
 *
 * The threshold is 10,000 rather than 1,000: "1.4K" hides a number a
 * client can read at a glance, while "212,418" in a 40px tile is a
 * wall. Above a million it goes to one decimal again.
 */
export function compact(value: number): string {
  const n = Math.abs(value);
  if (n >= 1_000_000) return `${trimZero(value / 1_000_000)}M`;
  if (n >= 10_000) return `${trimZero(value / 1_000)}K`;
  return int(value);
}

function trimZero(value: number): string {
  const s = value.toFixed(1);
  return s.endsWith('.0') ? s.slice(0, -2) : s;
}

/** 0.079 -> "7.9%". Notion holds rates as decimals. */
export function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

/** 7 -> "7s". */
export function secs(value: number): string {
  return `${Math.round(value)}s`;
}

export function formatValue(value: number, fmt: NumFormat): string {
  if (fmt === 'pct') return pct(value);
  if (fmt === 'sec') return secs(value);
  if (fmt === 'compact') return compact(value);
  return int(value);
}

/* ── deltas ───────────────────────────────────────────────────── */

export interface Delta {
  /** Which way it moved. 'flat' when it did not, or when we cannot say. */
  dir: 'up' | 'down' | 'flat';
  /** Printed change, already formatted. Null when there is no comparison. */
  text: string | null;
}

/**
 * This month against last month, printed the way the row wants it.
 *
 * Returns a null text when there is nothing to compare against, which
 * is month one of a term: the baseline IS this month, and "0% vs last
 * month" would be a statement about a month that does not exist.
 *
 * A percentage change off a previous value of zero is also refused.
 * Going from 0 to 400 is not "up 40000%", it is "+400", so the row
 * falls back to the absolute change.
 */
export function delta(
  current: number | null,
  previous: number | null,
  mode: ChangeFormat,
): Delta {
  if (current === null || previous === null) return { dir: 'flat', text: null };

  const diff = current - previous;
  const dir = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat';
  if (diff === 0) return { dir, text: 'No change' };

  const sign = diff > 0 ? '+' : '−'; // a real minus sign, not a hyphen
  const abs = Math.abs(diff);

  if (mode === 'pts') return { dir, text: `${sign}${(abs * 100).toFixed(1)} pts` };
  if (mode === 'sec') return { dir, text: `${sign}${Math.round(abs)}s` };
  if (mode === 'pct' && previous !== 0) {
    return { dir, text: `${sign}${Math.round((abs / Math.abs(previous)) * 100)}%` };
  }
  return { dir, text: `${sign}${compact(abs)}` };
}

/** The headline form: "▲ 17% vs Oct". The arrow is drawn, not typed. */
export function deltaPercent(current: number | null, previous: number | null): Delta {
  return delta(current, previous, 'pct');
}

/* ── dates ────────────────────────────────────────────────────── */

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const SHORT = MONTHS.map((m) => m.slice(0, 3));

/** "2026-11-01" -> "November 2026". */
export function monthLabel(iso: string | null): string {
  const d = parseNotionDate(iso);
  return d ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '';
}

/** "2026-11-01" -> "Nov 2026". */
export function monthShort(iso: string | null): string {
  const d = parseNotionDate(iso);
  return d ? `${SHORT[d.getMonth()]} ${d.getFullYear()}` : '';
}

/** "2026-11-15" -> "Nov 15". */
export function dayLabel(iso: string | null): string {
  const d = parseNotionDate(iso);
  return d ? `${SHORT[d.getMonth()]} ${d.getDate()}` : '';
}

/** "2026-10-26" -> "October 26, 2026". */
export function longDate(iso: string | null): string {
  const d = parseNotionDate(iso);
  return d ? `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}` : '';
}

/** Just the month, for a delta label: "vs Oct". */
export function monthAbbr(iso: string | null): string {
  const d = parseNotionDate(iso);
  return d ? SHORT[d.getMonth()] : '';
}

/** "2026-11-01" -> "Nov 1 – Nov 30, 2026". */
export function reportingPeriod(iso: string | null): string {
  const d = parseNotionDate(iso);
  if (!d) return '';
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return `${SHORT[d.getMonth()]} 1 – ${SHORT[last.getMonth()]} ${last.getDate()}, ${last.getFullYear()}`;
}

/** The first and last day of the month a date falls in, as plain days. */
export function monthRange(iso: string | null): { start: string; end: string } | null {
  const d = parseNotionDate(iso);
  if (!d) return null;
  const y = d.getFullYear();
  const m = d.getMonth();
  const last = new Date(y, m + 1, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return { start: `${y}-${pad(m + 1)}-01`, end: `${y}-${pad(m + 1)}-${pad(last)}` };
}

/** The same month, n months along. Day is always the 1st. */
export function shiftMonth(iso: string | null, months: number): string | null {
  const d = parseNotionDate(iso);
  if (!d) return null;
  const next = new Date(d.getFullYear(), d.getMonth() + months, 1);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`;
}

/** Is this plain date inside the range, ends included? */
export function inRange(iso: string | null, range: { start: string; end: string } | null): boolean {
  if (!iso || !range) return false;
  const day = iso.slice(0, 10);
  return day >= range.start && day <= range.end;
}

/** "2026-11" for an R2 key. */
export function monthKey(iso: string | null): string {
  const d = parseNotionDate(iso);
  if (!d) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

/* ── text that carries structure ──────────────────────────────── */

/**
 * "Lock the release — it sets every other date" -> both halves.
 *
 * Mason writes these with an em dash, which is how the field is
 * documented in Notion. An en dash and a spaced hyphen are accepted
 * too, because nobody should lose a focus card to a keyboard.
 */
export function splitTitled(raw: string | null): { title: string; why: string | null } | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const m = /\s+[—–-]\s+/.exec(s);
  if (!m) return { title: s, why: null };
  return {
    title: s.slice(0, m.index).trim(),
    why: s.slice(m.index + m[0].length).trim() || null,
  };
}

/**
 * "Formats: worship-rave live moments, ..." -> label and text.
 *
 * Split on the FIRST colon only, and only when the label before it is
 * short. A bullet reading "The fix: point every crowd..." is a label;
 * one reading "Average watch time on reels is 4 to 9 seconds: openers
 * are not holding people" is a sentence that happens to contain a
 * colon, and turning its first eleven words into a bold label would
 * wreck the row.
 */
export function splitLabelled(raw: string | null): { label: string | null; text: string } {
  const s = (raw ?? '').trim();
  const i = s.indexOf(':');
  if (i <= 0 || i > 40) return { label: null, text: s };
  return { label: s.slice(0, i).trim(), text: s.slice(i + 1).trim() };
}

export interface Opportunity {
  title: string;
  impact: string | null;
  effort: string | null;
  why: string | null;
  firstMove: string | null;
}

/**
 * "Title | Impact | Effort | Why | First move" -> an opportunity card.
 *
 * Missing trailing fields are allowed: a half-written opportunity
 * renders as much of itself as exists rather than dropping out. A line
 * with no pipes at all is a title.
 */
export function parseOpportunity(raw: string | null): Opportunity | null {
  const s = (raw ?? '').trim();
  if (!s) return null;
  const parts = s.split('|').map((p) => p.trim());
  const at = (i: number) => (parts[i] ? parts[i] : null);
  return {
    title: parts[0] || '',
    impact: at(1),
    effort: at(2),
    why: at(3),
    firstMove: at(4),
  };
}

/** Impact and effort are drawn as tags, and the tag is coloured by
 *  what it says. Anything we do not recognise is drawn neutral. */
export type TagTone = 'good' | 'warn' | 'bad' | 'info';

export function impactTone(value: string | null): TagTone {
  const s = (value ?? '').toLowerCase();
  if (s.startsWith('high')) return 'warn';
  return 'info';
}

export function effortTone(value: string | null): TagTone {
  const s = (value ?? '').toLowerCase();
  if (s.startsWith('low')) return 'good';
  if (s.startsWith('high')) return 'bad';
  if (s.startsWith('med')) return 'warn';
  return 'info';
}

/** The status pill in the profile-and-positioning table. */
export function statusTone(value: string | null): TagTone {
  const s = (value ?? '').trim().toLowerCase();
  if (s === 'yes' || s === 'strong' || s === 'good') return 'good';
  if (s === 'no' || s === 'missing') return 'bad';
  return 'warn';
}

/* ── the audit page body ──────────────────────────────────────── */

/**
 * The H2 headings the audit reads, exactly as they are written.
 *
 * A heading that is not here is ignored; a heading here that is not in
 * the page means its block is skipped and a warning is logged. That is
 * the whole contract between Mason's writing and the PDF, so it lives
 * in one list rather than being spelled out again at each use.
 */
export const AUDIT_HEADINGS = [
  'Snapshot: music and business',
  'Snapshot: social',
  'Profile and positioning',
  "What's working",
  "What's not",
  'The pattern',
  'Audience and engagement',
  'Show and release momentum',
  'Footage and assets',
  'Scorecard notes',
  'Top opportunities',
  'Recommended direction',
  'Next 30 days',
  'For our call',
] as const;

export type AuditHeading = typeof AUDIT_HEADINGS[number];

/** One heading's worth of page body, already flattened. */
export interface AuditSection {
  /** Table rows, header row dropped. Empty for a prose section. */
  rows: string[][];
  /** Bullets, to-dos and numbered items, in order. */
  items: string[];
  /** Paragraphs, in order. */
  paragraphs: string[];
}

export const EMPTY_SECTION: AuditSection = { rows: [], items: [], paragraphs: [] };

/** Is there anything to draw? Used to hide a block cleanly. */
export function hasContent(s: AuditSection | undefined): boolean {
  if (!s) return false;
  return s.rows.length > 0 || s.items.length > 0 || s.paragraphs.length > 0;
}

/**
 * Finds the bullet for one score, by its label.
 *
 * Matched on the label before the colon, case-insensitively, because
 * "Fan capture: ..." should reach the "Score · Fan capture" row even
 * though the scorecard prints it as "Fan capture (owned audience)".
 */
export function scoreNote(section: AuditSection | undefined, key: string): string | null {
  if (!section) return null;
  const want = key.trim().toLowerCase();
  for (const item of section.items) {
    const { label, text } = splitLabelled(item);
    if (label && label.toLowerCase() === want) return text || null;
  }
  return null;
}

/** The three footage columns, pulled off bullets by their labels. */
export const FOOTAGE_COLUMNS = [
  { key: 'What exists', label: 'What exists', tone: 'good' as TagTone },
  { key: 'Missing', label: 'Missing', tone: 'bad' as TagTone },
  { key: 'Capture plan', label: 'Capture plan', tone: 'info' as TagTone },
];

/* ── images ───────────────────────────────────────────────────── */

/**
 * A cover photo URL the renderer can actually load.
 *
 * A Google Drive share link is a web page, not an image, so an <img>
 * pointed at one renders nothing. The file id out of that link does
 * work as an image, provided the file is shared with anyone who has
 * the link; a private file 403s and the cover falls back to the grid,
 * which is the right way to fail.
 *
 * Anything that is not Drive is passed through if it is https, and
 * dropped otherwise: a cover is not worth an http subresource on a
 * page we are about to hand a client.
 */
export function heroImageUrl(raw: string | null): string | null {
  const url = (raw ?? '').trim();
  if (!url || !/^https:\/\//i.test(url)) return null;

  const drive = /^https:\/\/(?:drive|docs)\.google\.com\/.*?(?:\/d\/|[?&]id=)([A-Za-z0-9_-]{10,})/.exec(url);
  if (drive) return `https://lh3.googleusercontent.com/d/${drive[1]}=w1600`;

  return url;
}

/**
 * Which part of a cover photo survives the crop.
 *
 * The frame is 688 by 400 and a photo almost never is, so
 * `object-fit: cover` throws some of it away. Which part it throws
 * away is the difference between a portrait and a photograph of a
 * chin, and the person who knows is the person who took it. So the
 * Clients row carries a Cover Focus and this is the only place the
 * three words become CSS.
 *
 * Blank, unrecognised, or a fourth option somebody adds to the Notion
 * select next year all come out as Center, because a cover that is
 * cropped the ordinary way is never a bug report.
 */
export type CoverFocus = 'top' | 'center' | 'bottom';

export function coverFocus(raw: string | null | undefined): CoverFocus {
  const value = (raw ?? '').trim().toLowerCase();
  if (value === 'top') return 'top';
  if (value === 'bottom') return 'bottom';
  return 'center';
}

/** The `object-position` for a focus. Horizontally always centred: a
 *  cover is a 1.7:1 letterbox, so the crop that matters is vertical. */
export function coverPosition(focus: CoverFocus): string {
  if (focus === 'top') return '50% 0%';
  if (focus === 'bottom') return '50% 100%';
  return '50% 50%';
}

/**
 * A name broken across lines the way the audit cover sets it.
 *
 * The canvas puts the first name over the last, so the break is at the
 * last space. One word stays one line, and a line too long for the
 * frame still wraps on its own: this decides where the deliberate
 * break goes, not where every break goes.
 */
export function coverNameLines(name: string): string[] {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) return parts.length ? [parts[0]] : [];
  const last = parts.pop() as string;
  return [parts.join(' '), last];
}

/**
 * Does this name need the smaller size?
 *
 * Orbitron Bold at 72px runs about 45px to the character, so roughly
 * fifteen of them fill the 688px frame. Past that the line wraps, the
 * title grows by 72px, and on the audit cover it lands on the score
 * dial. Fourteen is that limit with one character of margin.
 *
 * Measured rather than guessed: the three-line case was found by
 * rendering "The Brooklyn Midnight Collective" and reading the boxes
 * off the page, where it overlapped the dial by 24px.
 */
export const COVER_TITLE_MAX_CHARS = 14;

export function coverTitleTight(name: string): boolean {
  return coverNameLines(name).some((line) => line.length > COVER_TITLE_MAX_CHARS);
}

/* ── the report model ─────────────────────────────────────────── */

/** One KPI Snapshot, as the report needs it. */
export interface ReportSnapshot {
  id: string;
  date: string | null;
  type: string | null;
  metrics: Record<string, number>;
  growthScore: number | null;
  summary: string | null;
  win: string | null;
  watch: string | null;
  focus: [string | null, string | null, string | null];
  releaseNotes: string | null;
  published: boolean;
  reportPdf: string | null;
  publishedAt: string | null;
}

/** One Content Pipeline row, as the report needs it. */
export interface ReportPost {
  title: string;
  bucket: string | null;
  source: string | null;
  platforms: string[];
  postDate: string | null;
  views: number | null;
  shares: number | null;
  saves: number | null;
}

/** Everything a monthly report is built from. */
export interface ReportInput {
  client: PortalClient;
  slug: string;
  /** The month being reported. */
  snapshot: ReportSnapshot;
  /** The previous PUBLISHED snapshot, or null in month one. */
  previous: ReportSnapshot | null;
  /** The term's Baseline snapshot, or null. */
  baseline: ReportSnapshot | null;
  /**
   * Content Pipeline rows across two months: this month's Posted rows,
   * which the results pages read, and next month's planned rows, which
   * the last page lists as what we are filming. Each page filters to
   * the half it wants.
   */
  posts: ReportPost[];
  /** Campaign Calendar rows for this client. Moments and steps. */
  calendar: PortalCalendarItem[];
  /** Release numbers, by moment id. */
  releaseStats: Record<string, ReleaseStats>;
  /** Term progress, "Month 1 of 6". */
  termMonth: { month: number; total: number } | null;
  /** The cover photo, already resolved to something an <img> can load:
   *  our own cover route when a Drive photo was stored, the Hero Photo
   *  URL when it was not, null for the grid. */
  heroImage: string | null;
  coverFocus: CoverFocus;
}

export interface ReleaseStats {
  plays: number | null;
  downloads: number | null;
  djSupport: number | null;
  streams: number | null;
}

/* ── tiles ────────────────────────────────────────────────────── */

export interface Tile {
  label: string;
  value: string;
  delta: Delta;
  deltaLabel: string | null;
  baseline: string | null;
}

/**
 * The four at-a-glance tiles.
 *
 * A tile with no current value is dropped rather than drawn empty, so
 * a client whose email list we do not track does not get a card
 * reading "Email + SMS list —".
 */
export function glanceTiles(input: ReportInput): Tile[] {
  const cur = input.snapshot.metrics;
  const prev = input.previous?.metrics ?? null;
  const base = input.baseline?.metrics ?? null;
  const vs = monthAbbr(input.previous?.date ?? null);

  const pick = (
    label: string,
    read: (m: Record<string, number>) => number | null,
    fmt: NumFormat,
    change: ChangeFormat = 'pct',
  ): Tile | null => {
    const value = read(cur);
    if (value === null) return null;
    const previous = prev ? read(prev) : null;
    const baseline = base ? read(base) : null;
    return {
      label,
      value: formatValue(value, fmt),
      delta: delta(value, previous, change),
      deltaLabel: previous !== null && vs ? `vs ${vs}` : null,
      // The baseline is only worth printing when it is a different
      // month: in month one it IS this month, and "Baseline 212.4K"
      // under "212.4K" is noise.
      baseline:
        baseline !== null && input.baseline?.date !== input.snapshot.date
          ? `Baseline ${formatValue(baseline, fmt)}`
          : null,
    };
  };

  const tiles: Array<Tile | null> = [
    pick('Total views (28 days)', (m) => rollup(m, VIEW_ROLLUP), 'compact'),
    pick('Net new followers', (m) => rollup(m, NET_FOLLOW_ROLLUP), 'int', 'pct'),
    pick('Spotify streams (28 days)', (m) => get(m, 'Spotify · Streams (28d)'), 'int'),
    pick('Email + SMS list', (m) => get(m, 'Email + SMS List'), 'int', 'abs'),
  ];
  return tiles.filter((t): t is Tile => t !== null);
}

/** A metric, or null when the column is empty. */
export function get(metrics: Record<string, number>, name: string): number | null {
  const v = metrics[name];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/* ── goals ────────────────────────────────────────────────────── */

export interface GoalCard {
  label: string;
  /** "3,486 of 5,000" is split so the number can be set larger. */
  value: string;
  of: string | null;
  progress: GoalProgress;
  note: string | null;
  /** Orange when the bar is measured against a baseline rather than a
   *  target the client set. */
  accent: 'navy' | 'orange';
}

/**
 * The 90-day goal cards.
 *
 * Only goals with a target in Notion are drawn. The fourth card, which
 * the canvas calls "Content that gets shared", has no target field: it
 * is measured against the baseline instead and drawn in orange so it
 * does not read as a goal the client agreed to.
 */
export function goalCards(input: ReportInput): GoalCard[] {
  const { client } = input;
  const cur = input.snapshot.metrics;
  const base = input.baseline?.metrics ?? null;
  const out: GoalCard[] = [];
  const deadline = client.goalDeadline;

  const igTarget = client.goalInstagramFollowers;
  const igNow = get(cur, 'Instagram · Followers');
  const igBase = base ? get(base, 'Instagram · Followers') : null;
  if (igTarget && igNow !== null) {
    const p = goalProgress(igBase ?? igNow, igNow, igTarget);
    const pace = weeklyPaceNeeded(igNow, igTarget, deadline, dateOf(input.snapshot.date));
    out.push({
      label: 'Instagram followers',
      value: int(igNow),
      of: `of ${int(igTarget)}`,
      progress: p,
      note: paceNote(igBase, pace, igTarget, deadline),
      accent: 'navy',
    });
  }

  const songTarget = client.goalSongsAt10k;
  if (songTarget) {
    const done = songsAtTarget(input.calendar);
    out.push({
      label: `Songs past ${compact(SONG_STREAM_TARGET)} streams`,
      value: int(done),
      of: `of ${int(songTarget)}`,
      progress: goalProgress(0, done, songTarget),
      note: nextReleaseNote(input),
      accent: 'navy',
    });
  }

  const showTarget = client.goalShowsPerMonth;
  if (showTarget) {
    const when = dateOf(input.snapshot.date);
    const played = showsInMonth(input.calendar, when, client.termStart);
    out.push({
      label: 'Shows this month',
      value: int(played),
      of: `of ${int(showTarget)}`,
      progress: goalProgress(0, played, showTarget),
      note: showNote(input),
      accent: 'navy',
    });
  }

  const shares = get(cur, 'TikTok · Shares (28d)');
  const sharesBase = base ? get(base, 'TikTok · Shares (28d)') : null;
  if (shares !== null) {
    // No target exists for this one, so the bar runs from the baseline
    // to twice the baseline: a doubling is the shape of "it is working".
    const ceiling = sharesBase ? sharesBase * 2 : Math.max(shares, 1);
    out.push({
      label: 'Content that gets shared',
      value: int(shares),
      of: 'shares',
      progress: goalProgress(sharesBase ?? 0, shares, ceiling),
      note: sharesBase
        ? `TikTok shares, last 28 days · baseline ${int(sharesBase)}`
        : 'TikTok shares, last 28 days',
      accent: 'orange',
    });
  }

  return out;
}

function dateOf(iso: string | null): Date {
  return parseNotionDate(iso) ?? new Date();
}

function paceNote(
  baseline: number | null,
  pace: number | null,
  target: number,
  deadline: string | null,
): string | null {
  const parts: string[] = [];
  if (baseline !== null) parts.push(`Started at ${int(baseline)}`);
  if (pace !== null && deadline) {
    parts.push(`need ~${int(Math.ceil(pace))}/week to hit ${int(target)} by ${dayLabel(deadline)}`);
  } else if (deadline && daysUntil(deadline, new Date()) !== null) {
    parts.push(`target date ${dayLabel(deadline)}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

/** The next release after the report month, named, for the songs card. */
function nextReleaseNote(input: ReportInput): string | null {
  const range = monthRange(input.snapshot.date);
  if (!range) return null;
  const next = input.calendar
    .filter((i) => isMoment(i) && isRelease(i) && (i.date ?? '') > range.end)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0];
  return next ? `${next.title} drops ${dayLabel(next.date)}` : null;
}

/** The shows played this month, named, for the shows card. */
function showNote(input: ReportInput): string | null {
  const range = monthRange(input.snapshot.date);
  const shows = input.calendar
    .filter((i) => isMoment(i) && isShow(i) && inRange(i.date, range))
    .map((i) => `${i.title}, ${dayLabel(i.date)}`);
  return shows.length ? shows.join(' · ') : null;
}

/* ── calendar helpers ─────────────────────────────────────────── */

export const isMoment = (i: PortalCalendarItem): boolean => i.kind === 'Moment';
export const isShow = (i: PortalCalendarItem): boolean =>
  (i.momentType ?? '').toLowerCase().includes('show')
  || (i.momentType ?? '').toLowerCase().includes('festival');
export const isRelease = (i: PortalCalendarItem): boolean =>
  (i.momentType ?? '').toLowerCase().includes('release');

/* ── what we shipped ──────────────────────────────────────────── */

export interface Tally {
  label: string;
  count: number;
}

/** Posted content, counted by bucket, biggest first. */
export function byBucket(posts: ReportPost[]): Tally[] {
  return tally(posts.map((p) => p.bucket));
}

/** Posted content, counted by where the footage came from. */
export function bySource(posts: ReportPost[]): Tally[] {
  return tally(posts.map((p) => p.source));
}

function tally(values: Array<string | null>): Tally[] {
  const counts = new Map<string, number>();
  for (const v of values) {
    const key = (v ?? '').trim();
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Campaign steps in the month, and how many are finished. */
export function stepProgress(
  calendar: PortalCalendarItem[],
  range: { start: string; end: string } | null,
): { done: number; total: number } {
  const steps = calendar.filter((i) => !isMoment(i) && inRange(i.date, range));
  return {
    done: steps.filter((s) => s.status === 'Done').length,
    total: steps.length,
  };
}

/** The five posts the client should be proudest of. */
export function topPosts(posts: ReportPost[], limit = 5): ReportPost[] {
  return posts
    .filter((p) => typeof p.views === 'number')
    .sort((a, b) => (b.views ?? 0) - (a.views ?? 0))
    .slice(0, limit);
}

/** "Reel · 18.2K views · 640 shares". Only the parts that exist. */
export function postLine(post: ReportPost): string {
  const parts: string[] = [];
  const where = post.platforms[0] ?? post.bucket;
  if (where) parts.push(where);
  if (post.views !== null) parts.push(`${compact(post.views)} views`);
  if (post.shares !== null) parts.push(`${int(post.shares)} shares`);
  else if (post.saves !== null) parts.push(`${int(post.saves)} saves`);
  return parts.join(' · ');
}

/* ── shows ────────────────────────────────────────────────────── */

export interface ShowBar {
  title: string;
  date: string | null;
  sold: number;
  capacity: number | null;
  /** 0 to 1 of the tallest bar, for the chart. */
  height: number;
  soldOut: boolean;
}

/**
 * Every show with a ticket count, oldest first, scaled to the tallest.
 *
 * Shows with no ticket count are left out: a bar of height zero reads
 * as a show nobody came to rather than one we have not counted.
 */
export function showBars(calendar: PortalCalendarItem[], upTo: string | null): ShowBar[] {
  const shows = calendar
    .filter((i) => isMoment(i) && isShow(i) && typeof i.ticketsSold === 'number')
    .filter((i) => !upTo || (i.date ?? '') <= upTo)
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));

  const tallest = shows.reduce((max, s) => Math.max(max, s.ticketsSold ?? 0), 0);

  return shows.map((s) => {
    const sold = s.ticketsSold ?? 0;
    const capacity = typeof s.capacity === 'number' ? s.capacity : null;
    return {
      title: s.title,
      date: s.date,
      sold,
      capacity,
      height: tallest > 0 ? sold / tallest : 0,
      soldOut: capacity !== null && sold >= capacity,
    };
  });
}

export interface ShowStat {
  label: string;
  value: string;
  note: string | null;
  tone: 'good' | 'plain';
}

/** The four cards beside the ticket chart. */
export function showStats(bars: ShowBar[]): ShowStat[] {
  if (!bars.length) return [];
  const last = bars[bars.length - 1];
  const prior = bars.length > 1 ? bars[bars.length - 2] : null;
  const out: ShowStat[] = [];

  out.push({
    label: 'Last show',
    value: int(last.sold),
    note: prior ? `${signed(last.sold - prior.sold)} vs ${prior.title}` : last.title,
    tone: prior && last.sold > prior.sold ? 'good' : 'plain',
  });

  if (last.capacity) {
    out.push({
      label: 'Sell-through',
      value: `${Math.round((last.sold / last.capacity) * 100)}%`,
      note: `${int(last.sold)} of ${int(last.capacity)} cap`,
      tone: 'plain',
    });
  }

  const total = bars.reduce((sum, b) => sum + b.sold, 0);
  out.push({
    label: 'Avg per show',
    value: int(Math.round(total / bars.length)),
    note: `${bars.length} ${bars.length === 1 ? 'show' : 'shows'} tracked`,
    tone: 'plain',
  });

  const soldOut = bars.filter((b) => b.soldOut);
  if (soldOut.length) {
    out.push({
      label: 'Sold out',
      value: int(soldOut.length),
      note: soldOut.map((b) => b.title).join(', '),
      tone: 'plain',
    });
  }

  return out;
}

function signed(n: number): string {
  return n > 0 ? `+${int(n)}` : n < 0 ? `−${int(Math.abs(n))}` : 'level';
}

/* ── releases ─────────────────────────────────────────────────── */

export interface ReleaseBlock {
  title: string;
  date: string | null;
  playbook: string | null;
  where: string | null;
  stats: Array<{ label: string; value: string }>;
  worked: string | null;
  next: { title: string; date: string | null } | null;
}

/**
 * The release that dropped this month, with the numbers it has.
 *
 * Every stat card is dropped when its number is missing. A remix that
 * only lives on SoundCloud has plays and downloads and nothing else,
 * and four cards reading "—" would be worse than one card reading a
 * real number.
 */
export function releaseBlock(input: ReportInput): ReleaseBlock | null {
  const range = monthRange(input.snapshot.date);
  const released = input.calendar
    .filter((i) => isMoment(i) && isRelease(i) && inRange(i.date, range))
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))[0];
  if (!released) return null;

  const s = input.releaseStats[released.id] ?? {
    plays: null, downloads: null, djSupport: null, streams: null,
  };

  const stats: Array<{ label: string; value: string }> = [];
  if (s.plays !== null) stats.push({ label: 'Plays', value: int(s.plays) });
  if (s.downloads !== null) stats.push({ label: 'Downloads', value: int(s.downloads) });
  if (s.streams !== null) stats.push({ label: 'Streams to date', value: int(s.streams) });

  // New emails is the month's movement on the owned-audience list, not
  // a number anyone types against a release. It is the honest version
  // of "this release brought us N fans".
  const emails = get(input.snapshot.metrics, 'Email + SMS List');
  const emailsPrev = input.previous ? get(input.previous.metrics, 'Email + SMS List') : null;
  if (emails !== null && emailsPrev !== null && emails > emailsPrev) {
    stats.push({ label: 'New emails', value: `+${int(emails - emailsPrev)}` });
  }

  if (s.djSupport !== null) stats.push({ label: 'DJ support', value: int(s.djSupport) });

  const next = input.calendar
    .filter((i) => isMoment(i) && isRelease(i) && (i.date ?? '') > (range?.end ?? ''))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))[0];

  return {
    title: released.title,
    date: released.date,
    playbook: released.playbook,
    where: released.where,
    stats,
    worked: input.snapshot.releaseNotes,
    next: next ? { title: next.title, date: next.date } : null,
  };
}

/* ── next month ───────────────────────────────────────────────── */

export interface FocusCard {
  n: number;
  title: string;
  why: string | null;
}

export function focusCards(snapshot: ReportSnapshot): FocusCard[] {
  return snapshot.focus
    .map((raw, i) => {
      const split = splitTitled(raw);
      return split ? { n: i + 1, title: split.title, why: split.why } : null;
    })
    .filter((f): f is FocusCard => f !== null);
}

export interface DatedRow {
  month: string;
  day: string;
  title: string;
  note: string | null;
  /** Orange when it is on the client rather than on us. */
  accent: 'navy' | 'orange';
}

/** Next month's moments, for the "on the calendar" column. */
export function nextMonthMoments(input: ReportInput): DatedRow[] {
  const next = monthRange(shiftMonth(input.snapshot.date, 1));
  return input.calendar
    .filter((i) => isMoment(i) && inRange(i.date, next))
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    .map((i) => {
      const d = parseNotionDate(i.date);
      return {
        month: d ? SHORT[d.getMonth()].toUpperCase() : '',
        day: d ? String(d.getDate()) : '',
        title: i.title,
        note: momentNote(i),
        accent: i.tentative ? 'orange' : 'navy',
      };
    });
}

function momentNote(i: PortalCalendarItem): string | null {
  const parts: string[] = [];
  if (i.momentType) parts.push(i.momentType);
  if (i.where) parts.push(i.where);
  else if (i.venueCity) parts.push(i.venueCity);
  return parts.length ? parts.join(' · ') : null;
}

export interface CheckRow {
  text: string;
  accent: 'navy' | 'orange';
}

/** What the client has to film next month. */
export function filmList(input: ReportInput, posts: ReportPost[]): CheckRow[] {
  const next = monthRange(shiftMonth(input.snapshot.date, 1));
  return posts
    .filter((p) => inRange(p.postDate, next))
    .map((p) => ({ text: p.title, accent: 'navy' as const }));
}

/** The client's own open steps next month. */
export function clientTodos(input: ReportInput): CheckRow[] {
  const next = monthRange(shiftMonth(input.snapshot.date, 1));
  return input.calendar
    .filter((i) => !isMoment(i) && i.owner === 'Client' && inRange(i.date, next))
    .filter((i) => i.status !== 'Done' && i.status !== 'Skipped')
    .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
    .map((i) => ({
      text: i.date ? `${i.title} · by ${dayLabel(i.date)}` : i.title,
      accent: 'orange' as const,
    }));
}

/* ── the audit model ──────────────────────────────────────────── */

export interface AuditInput {
  id: string;
  title: string;
  /** The artist this is about: the client's name, or the prospect's. */
  subject: string;
  audience: 'Client' | 'Prospect';
  /** Draft rows print a DRAFT flag in the header. */
  status: 'Draft' | 'Ready' | 'Sent' | null;
  auditDate: string | null;
  dataWindow: string | null;
  platformsReviewed: string | null;
  shortVersion: string | null;
  positioningRead: string | null;
  offer: string | null;
  bookACallLink: string | null;
  scores: Record<string, number | null>;
  sections: Partial<Record<AuditHeading, AuditSection>>;
  /** Headings the page body did not have. Logged, never printed. */
  missing: AuditHeading[];
  /** The client's portal slug, for the closing band. Null for prospects. */
  slug: string | null;
  /** Same cover rule as a monthly report, for a client audit. A
   *  prospect teardown never reaches the Drive folder, because there
   *  is no client and therefore no folder to reach. */
  coverImage: string | null;
  coverFocus: CoverFocus;
}

/** The scorecard total, and whether it is complete enough to print. */
export function scoreTotal(scores: Record<string, number | null>): number | null {
  let total = 0;
  let found = false;
  for (const { prop } of SCORE_FIELDS) {
    const v = scores[prop];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    total += v;
    found = true;
  }
  return found ? total : null;
}

/** The fraction of the cover dial that is filled. */
export function scoreFraction(total: number | null): number {
  if (total === null) return 0;
  return Math.min(1, Math.max(0, total / SCORE_MAX));
}
