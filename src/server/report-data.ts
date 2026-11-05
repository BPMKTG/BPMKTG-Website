/* ──────────────────────────────────────────────────────────────
   Where a monthly report's rows come from.

   SERVER ONLY.

   This file is the only one that knows a report is made out of five
   Notion queries. It hands back a `ReportInput`, which is the whole
   contract: data/print.ts does the arithmetic on it and print-report.ts
   draws it, and neither of them ever names a Notion property.

   Reads, never writes. Publishing is in report-publish.ts, so a
   preview cannot change a row by accident.
   ────────────────────────────────────────────────────────────── */

import {
  REPORT_SNAPSHOT_FIELDS,
  monthRange,
  shiftMonth,
  type ReleaseStats,
  type ReportInput,
  type ReportPost,
  type ReportSnapshot,
} from '../data/print';
import {
  SNAPSHOT_FIELDS,
  cleanText,
  isMetricProp,
  termProgress,
  parseNotionDate,
  type PortalAdminSnapshot,
} from '../data/portal';
import { CONTENT_FIELDS } from '../data/portal-content';
import { clientCoverFields } from './cover';
import {
  CALENDAR_DB,
  CONTENT_DB,
  SNAPSHOTS_DB,
  fetchCalendar,
  fetchPage,
  findClientById,
  queryAll,
  readCheckbox,
  readDate,
  readMultiSelect,
  readNumber,
  readRelation,
  readSelect,
  readText,
  readUrl,
  type ClientRecord,
  type Prop,
} from './portal-notion';

const F = REPORT_SNAPSHOT_FIELDS;

/* ── snapshots ────────────────────────────────────────────────── */

/**
 * One KPI Snapshots row, with everything the report reads.
 *
 * Wider than the portal's `PortalSnapshot`, which carries only what a
 * client sees on the Progress tab. Win, Watch and the three Focus
 * lines are report copy; they reach a client through the PDF, which is
 * why they are read here rather than being added to the portal
 * payload's whitelist.
 */
export function shapeReportSnapshot(page: any): ReportSnapshot {
  const p = page.properties ?? {};
  const metrics: Record<string, number> = {};

  // Same rule as the portal: number-typed, and the name has to look
  // like a metric. A rate column added to this database tomorrow does
  // not become a tile.
  for (const [name, prop] of Object.entries(p)) {
    if (name === SNAPSHOT_FIELDS[3]) continue; // growth score, read on its own
    const value = readNumber(prop as Prop);
    if (value === null) continue;
    if (!isMetricProp(name)) continue;
    metrics[name] = value;
  }

  return {
    id: String(page.id),
    date: readDate(p[SNAPSHOT_FIELDS[0]]),
    type: readSelect(p[SNAPSHOT_FIELDS[1]]),
    metrics,
    growthScore: readNumber(p[SNAPSHOT_FIELDS[3]]),
    summary: cleanText(readText(p[F[0]])),
    win: cleanText(readText(p[F[1]])),
    watch: cleanText(readText(p[F[2]])),
    focus: [
      cleanText(readText(p[F[3]])),
      cleanText(readText(p[F[4]])),
      cleanText(readText(p[F[5]])),
    ],
    releaseNotes: cleanText(readText(p[F[6]])),
    published: readCheckbox(p[F[7]]),
    reportPdf: readUrl(p[F[8]]),
    publishedAt: readDate(p[F[9]]),
  };
}

/** The client this snapshot belongs to, as a page id. */
function snapshotClientId(page: any): string | null {
  return readRelation(page?.properties?.Client)[0] ?? null;
}

/**
 * Every snapshot for one client, newest first.
 *
 * Fetched whole rather than filtered to the two rows a report needs,
 * because "the previous published snapshot" and "the baseline" are
 * both answers to questions about the series, and a client has a
 * couple of dozen rows at most.
 */
export async function clientSnapshots(token: string, clientPageId: string): Promise<ReportSnapshot[]> {
  const results = await queryAll(token, SNAPSHOTS_DB, {
    filter: { property: 'Client', relation: { contains: clientPageId } },
    sorts: [{ property: 'Date', direction: 'descending' }],
  });
  return results.map(shapeReportSnapshot);
}

/**
 * One snapshot as the admin panel lists it.
 *
 * Drafts included, which is the only reason this exists: the client
 * payload hides an unpublished month entirely, and Mason needs to see
 * exactly those rows in order to publish them.
 */
export function toAdminSnapshot(s: ReportSnapshot): PortalAdminSnapshot {
  return {
    id: s.id,
    date: s.date,
    type: s.type,
    published: s.published,
    win: s.win,
    reportPdf: s.reportPdf,
    publishedAt: s.publishedAt,
  };
}

/* ── posts ────────────────────────────────────────────────────── */

const C = CONTENT_FIELDS;

function shapePost(page: any): ReportPost {
  const p = page.properties ?? {};
  return {
    title: readText(p[C[0]]) ?? '',
    bucket: readSelect(p[C[2]]),
    source: readSelect(p[C[4]]),
    platforms: readMultiSelect(p[C[8]]),
    postDate: readDate(p[C[6]]),
    views: readNumber(p['Views']),
    shares: readNumber(p['Shares']),
    saves: readNumber(p['Saves']),
  };
}

/**
 * The posts a report needs: what shipped this month, and what is
 * planned for next.
 *
 * Two queries rather than one, because the two halves have different
 * rules. This month only counts if it actually went out, so Status is
 * Posted. Next month cannot be Posted yet, so anything not Skipped
 * counts: that half is the "what we are filming" list on the last
 * page, not a results table.
 *
 * `Hide from Client` is false in both. A row we held back from the
 * portal must not reappear in a PDF, which is the same document read
 * by the same person.
 */
async function reportPosts(token: string, clientPageId: string, monthIso: string | null) {
  const month = monthRange(monthIso);
  const next = monthRange(shiftMonth(monthIso, 1));
  if (!month || !next) return [];

  const base = (extra: Record<string, unknown>[]) => ({
    filter: {
      and: [
        { property: 'Client', relation: { contains: clientPageId } },
        { property: 'Hide from Client', checkbox: { equals: false } },
        ...extra,
      ],
    },
  });

  const [posted, planned] = await Promise.all([
    queryAll(token, CONTENT_DB, base([
      { property: 'Status', select: { equals: 'Posted' } },
      { property: 'Post Date', date: { on_or_after: month.start } },
      { property: 'Post Date', date: { on_or_before: month.end } },
    ])),
    queryAll(token, CONTENT_DB, base([
      { property: 'Status', select: { does_not_equal: 'Skipped' } },
      { property: 'Post Date', date: { on_or_after: next.start } },
      { property: 'Post Date', date: { on_or_before: next.end } },
    ])),
  ]);

  return [...posted, ...planned].map(shapePost);
}

/* ── release numbers ──────────────────────────────────────────── */

/**
 * Plays, downloads and DJ support, by moment id.
 *
 * A second read of the calendar, deliberately. `fetchCalendar` builds
 * the client's portal payload and its whitelist is the thing stopping
 * an internal column from reaching a browser; widening it so a PDF can
 * read three numbers would spend that protection on convenience. This
 * query returns four numbers and a page id, and nothing else.
 */
async function releaseStats(
  token: string,
  clientPageId: string,
): Promise<Record<string, ReleaseStats>> {
  const results = await queryAll(token, CALENDAR_DB, {
    filter: {
      and: [
        { property: 'Client', relation: { contains: clientPageId } },
        { property: 'Kind', select: { equals: 'Moment' } },
      ],
    },
  });

  const out: Record<string, ReleaseStats> = {};
  for (const page of results) {
    const p = page.properties ?? {};
    out[String(page.id)] = {
      plays: readNumber(p['Plays']),
      downloads: readNumber(p['Downloads']),
      djSupport: readNumber(p['DJ Support']),
      streams: readNumber(p['Streams to Date']),
    };
  }
  return out;
}

/* ── the cover photo ──────────────────────────────────────────── */

/*
 * Read fresh on every load rather than taken from the stored pointer,
 * so that changing Cover Focus in Notion shows up in the next Preview
 * instead of waiting for someone to press Regenerate. The photo
 * itself cannot work that way: it lives in R2 and is chosen by an
 * admin action. See src/server/cover.ts.
 */

/* ── the whole thing ──────────────────────────────────────────── */

export interface LoadedReport {
  input: ReportInput;
  client: ClientRecord;
}

/**
 * Everything one monthly report is made of, or null.
 *
 * Null when the snapshot does not exist or has no client, which the
 * route answers as a 404. A snapshot that exists but is not published
 * still loads: that is what Preview is for, and the template draws a
 * DRAFT flag on it.
 */
export async function loadReport(token: string, snapshotId: string): Promise<LoadedReport | null> {
  const page = await fetchPage(token, snapshotId);
  if (!page) return null;

  const clientId = snapshotClientId(page);
  if (!clientId) {
    console.error('report: snapshot has no client', snapshotId);
    return null;
  }

  const snapshot = shapeReportSnapshot(page);
  const client = await findClientById(token, clientId);
  if (!client) {
    console.error('report: client not found', snapshotId, clientId);
    return null;
  }

  const [series, posts, calendar, stats, cover] = await Promise.all([
    clientSnapshots(token, clientId),
    reportPosts(token, clientId, snapshot.date),
    fetchCalendar(token, clientId, client.client.artist),
    releaseStats(token, clientId),
    clientCoverFields(token, clientId),
  ]);

  const day = (snapshot.date ?? '').slice(0, 10);
  // The previous PUBLISHED snapshot, baseline included. An unpublished
  // row is a month still being written, and comparing against one
  // would make a delta move under the client as Mason typed.
  const previous = series.find(
    (s) => s.id !== snapshot.id
      && s.published
      && (s.date ?? '').slice(0, 10) < day,
  ) ?? null;
  const baseline = series.find((s) => s.type === 'Baseline' && s.id !== snapshot.id) ?? null;

  const when = parseNotionDate(snapshot.date);
  const term = when
    ? termProgress(client.client.termStart, client.client.termEnd, when)
    : null;

  return {
    client,
    input: {
      client: client.client,
      slug: client.slug,
      snapshot,
      previous,
      baseline,
      posts,
      calendar,
      releaseStats: stats,
      termMonth: term && term.state === 'during'
        ? { month: term.month, total: term.total }
        : null,
      // The Hero Photo, which is the fallback. The route swaps in the
      // stored Drive cover when there is one: see functions/print.
      heroImage: cover.hero,
      coverFocus: cover.focus,
    },
  };
}
