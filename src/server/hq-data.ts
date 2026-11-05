/* ──────────────────────────────────────────────────────────────
   Every client at once, for Blueprint HQ.

   SERVER ONLY.

   The portal reads one client and is allowed to be leisurely about
   it. HQ reads all of them, four databases deep, and has to do it
   inside a Worker's CPU budget on every tab switch. Three things keep
   that honest:

     one payload        every tab is drawn from a single read
     parallel queries   five Notion calls at once, not one after another
     KV for 90 seconds  the second load of the day costs one KV get

   The cache is shared, not per-admin: HQ shows the same thing to
   everyone who can open it, and there is exactly one of us. Any HQ
   write drops it, so a tick or a drag is visible immediately rather
   than up to a minute and a half later.

   Nothing in here is whitelisted the way the portal payload is, and
   that is deliberate: this never reaches a client. The gate in
   hq-auth.ts is what makes that true, so nothing may serve this
   without going through it.
   ────────────────────────────────────────────────────────────── */

import {
  CALENDAR_DB,
  CLIENTS_DB,
  CONTENT_DB,
  SNAPSHOTS_DB,
  queryAll,
  readCheckbox,
  readDate,
  readNumber,
  readRelation,
  readSelect,
  readText,
  readUrl,
} from './portal-notion';
import { AUDITS_DB, shapeAuditRow, type AuditRow } from './audit-data';
import { shapeReportSnapshot } from './report-data';
import type { ReportSnapshot } from '../data/print';
import { cleanItemTitle, parseNotionDate } from '../data/portal';

/* ── how much, and for how long ───────────────────────────────── */

/** KV TTL. The spec asks for 60 to 120 seconds; 90 is the middle of
 *  it, and every write drops the entry anyway. */
export const HQ_TTL_SECONDS = 90;

/** Bumped whenever the shape below changes, so a deploy cannot serve
 *  a cached payload the new UI does not understand. */
export const HQ_CACHE_KEY = 'hq:v1';

/** How far back and forward the calendar is read. Today needs the
 *  overdue tail, the fourteen-day strip needs the near future, and a
 *  client card wants the next show after that. Everything outside
 *  this window is nobody's today. */
export const CAL_BACK_DAYS = 60;
export const CAL_FORWARD_DAYS = 120;

/** Content is only ever asked about as "this week" and "overdue", so
 *  it needs a much shorter memory than the calendar. */
export const CONTENT_BACK_DAYS = 30;
export const CONTENT_FORWARD_DAYS = 60;

/* ── the shapes ───────────────────────────────────────────────── */

export interface HqClient {
  pageId: string;
  slug: string;
  artist: string;
  stage: string | null;
  tier: string | null;
  monthlyRate: number | null;
  fullRate: number | null;
  leadSource: string | null;
  nextAction: string | null;
  nextActionDate: string | null;
  termStart: string | null;
  termEnd: string | null;
  rateStepUp: string | null;
  portalEnabled: boolean;
  beta: boolean;
  /** Links the client detail page offers. */
  clientFolder: string | null;
  contentVault: string | null;
  driveFolder: string | null;
  brandKit: string | null;
  roadmapLink: string | null;
  instagram: string | null;
  tiktok: string | null;
  brandBriefPdf: string | null;
}

/** A calendar row, flattened. HQ does not resolve moment relations
 *  the way the portal does: it shows a list, not a story. */
export interface HqCalItem {
  id: string;
  clientId: string | null;
  title: string;
  kind: string | null;
  momentType: string | null;
  type: string | null;
  owner: string | null;
  status: string | null;
  date: string | null;
  venueCity: string | null;
  hidden: boolean;
}

export interface HqContentItem {
  id: string;
  clientId: string | null;
  title: string;
  status: string | null;
  postDate: string | null;
  bucket: string | null;
  format: string | null;
}

/** A snapshot as the report pipeline already shapes it, plus the
 *  client it belongs to. Reusing that shaper rather than reading the
 *  properties again is the point: the Reports tab publishes through
 *  the same endpoints, so it has to agree with them about what a
 *  draft is and which fields are missing. */
export type HqSnapshot = ReportSnapshot & { clientId: string | null };

export interface HqPayload {
  clients: HqClient[];
  calendar: HqCalItem[];
  content: HqContentItem[];
  snapshots: HqSnapshot[];
  audits: AuditRow[];
  /** When this payload was assembled, ISO. */
  built: string;
}

export interface HqDataEnv {
  NOTION_TOKEN: string;
  PORTAL_KV?: {
    get: (key: string) => Promise<string | null>;
    put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
    delete: (key: string) => Promise<void>;
  };
}

/* ── dates ────────────────────────────────────────────────────── */

/** An ISO day, N days from now. Notion's date filters take these. */
export function dayOffset(days: number, from = new Date()): string {
  const d = new Date(from.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/* ── the reads ────────────────────────────────────────────────── */

function shapeClient(page: any): HqClient {
  const p = page.properties ?? {};
  return {
    pageId: String(page.id),
    slug: (readText(p['Intake Slug']) ?? '').trim().toLowerCase(),
    artist: readText(p['Artist']) ?? '',
    stage: readSelect(p['Stage']),
    tier: readSelect(p['Tier']),
    monthlyRate: readNumber(p['Monthly Rate']),
    fullRate: readNumber(p['Full Rate']),
    leadSource: readSelect(p['Lead Source']),
    nextAction: readText(p['Next Action']),
    nextActionDate: readDate(p['Next Action Date']),
    termStart: readDate(p['Term Start']),
    termEnd: readDate(p['Term End']),
    rateStepUp: readDate(p['Rate Step-Up']),
    portalEnabled: readCheckbox(p['Portal Enabled']),
    beta: readCheckbox(p['Beta']),
    clientFolder: readUrl(p['Client Folder']),
    contentVault: readUrl(p['Content Vault']),
    driveFolder: readUrl(p['Drive Folder']),
    brandKit: readUrl(p['Brand Kit']),
    roadmapLink: readUrl(p['Roadmap Link']),
    instagram: readUrl(p['Instagram']),
    tiktok: readUrl(p['TikTok']),
    brandBriefPdf: readUrl(p['Brand Brief PDF']),
  };
}

async function readClients(token: string): Promise<HqClient[]> {
  const rows = await queryAll(token, CLIENTS_DB, {});
  return rows.map(shapeClient).filter((c) => c.artist);
}

/**
 * The calendar, every client, around today.
 *
 * Playbook templates are excluded in the query: they are rows with
 * offsets rather than dates and they outnumber everything else.
 * `Hide from Client` is NOT excluded — this is our own screen, and a
 * step we hid from a client is still a step we owe them.
 */
async function readCalendar(token: string, now: Date): Promise<HqCalItem[]> {
  const rows = await queryAll(token, CALENDAR_DB, {
    filter: { property: 'Is Playbook', checkbox: { equals: false } },
  });

  const from = dayOffset(-CAL_BACK_DAYS, now);
  const to = dayOffset(CAL_FORWARD_DAYS, now);
  const out: HqCalItem[] = [];

  for (const page of rows) {
    const p = page.properties ?? {};
    // Date first, then the Auto Date formula, exactly as the portal
    // does it: a step with no explicit date is placed by its offset
    // from the moment it hangs off.
    const date = readDate(p['Date']) ?? readFormulaDay(p['Auto Date']);
    // Undated rows are kept: they are nobody's "today" but they are
    // somebody's unfinished step, and the Clients tab counts them.
    if (date && (date < from || date > to)) continue;

    const artist = '';
    const { title } = cleanItemTitle(readText(p['Item']) ?? '', artist);
    out.push({
      id: String(page.id),
      clientId: readRelation(p['Client'])[0] ?? null,
      title,
      kind: readSelect(p['Kind']),
      momentType: readSelect(p['Moment Type']),
      type: readSelect(p['Type']),
      owner: readSelect(p['Owner']),
      status: readSelect(p['Status']),
      date,
      venueCity: readText(p['Venue / City']),
      hidden: readCheckbox(p['Hide from Client']),
    });
  }
  return out;
}

/** Notion formula dates arrive under a different shape to date
 *  properties. Same helper the portal has, kept local because the
 *  portal's is not exported. */
function readFormulaDay(p: any): string | null {
  const f = p?.formula;
  if (!f) return null;
  if (f.type === 'date') return f.date?.start ? String(f.date.start).slice(0, 10) : null;
  if (f.type === 'string' && f.string) return String(f.string).slice(0, 10);
  return null;
}

async function readContent(token: string, now: Date): Promise<HqContentItem[]> {
  const rows = await queryAll(token, CONTENT_DB, {
    filter: {
      and: [
        { property: 'Post Date', date: { on_or_after: dayOffset(-CONTENT_BACK_DAYS, now) } },
        { property: 'Post Date', date: { on_or_before: dayOffset(CONTENT_FORWARD_DAYS, now) } },
      ],
    },
  });

  return rows.map((page: any) => {
    const p = page.properties ?? {};
    return {
      id: String(page.id),
      clientId: readRelation(p['Client'])[0] ?? null,
      title: readText(p['Content']) ?? '',
      status: readSelect(p['Status']),
      postDate: readDate(p['Post Date']),
      bucket: readSelect(p['Bucket']),
      format: readSelect(p['Format']),
    };
  });
}

async function readSnapshots(token: string): Promise<HqSnapshot[]> {
  const rows = await queryAll(token, SNAPSHOTS_DB, {
    sorts: [{ property: 'Date', direction: 'descending' }],
  });
  return rows.map((page: any) => ({
    ...shapeReportSnapshot(page),
    clientId: readRelation(page?.properties?.Client)[0] ?? null,
  }));
}

async function readAudits(token: string): Promise<AuditRow[]> {
  const rows = await queryAll(token, AUDITS_DB, {});
  return rows.map(shapeAuditRow);
}

/* ── assembling it ────────────────────────────────────────────── */

export interface HqBuild {
  payload: HqPayload;
  timing: { totalMs: number; cached: boolean; parts?: Record<string, number> };
}

/**
 * The whole of HQ, from cache or from Notion.
 *
 * Five queries in parallel rather than in sequence: they do not
 * depend on each other, and Notion's rate limit is about requests per
 * second, not concurrent ones. One of them failing takes the page
 * down rather than drawing a half-empty HQ that looks like a client
 * has no work on.
 */
export async function hqBuild(env: HqDataEnv, now = new Date()): Promise<HqBuild> {
  const started = Date.now();

  const cached = await readCache(env);
  if (cached) {
    return { payload: cached, timing: { totalMs: Date.now() - started, cached: true } };
  }

  const token = env.NOTION_TOKEN;
  const marks: Record<string, number> = {};
  const timed = async <T>(name: string, run: () => Promise<T>): Promise<T> => {
    const t = Date.now();
    try { return await run(); } finally { marks[name] = Date.now() - t; }
  };

  const [clients, calendar, content, snapshots, audits] = await Promise.all([
    timed('clients', () => readClients(token)),
    timed('calendar', () => readCalendar(token, now)),
    timed('content', () => readContent(token, now)),
    timed('snapshots', () => readSnapshots(token)),
    timed('audits', () => readAudits(token)),
  ]);

  const payload: HqPayload = {
    clients, calendar, content, snapshots, audits,
    built: new Date().toISOString(),
  };

  await writeCache(env, payload);
  return { payload, timing: { totalMs: Date.now() - started, cached: false, parts: marks } };
}

async function readCache(env: HqDataEnv): Promise<HqPayload | null> {
  if (!env.PORTAL_KV) return null;
  try {
    const raw = await env.PORTAL_KV.get(HQ_CACHE_KEY);
    return raw ? JSON.parse(raw) as HqPayload : null;
  } catch (err) {
    // A cache that cannot be read is a slow page, not a broken one.
    console.error('hq: reading the cache threw', err);
    return null;
  }
}

async function writeCache(env: HqDataEnv, payload: HqPayload): Promise<void> {
  if (!env.PORTAL_KV) {
    console.warn('hq: PORTAL_KV is not bound, so every load re-reads Notion');
    return;
  }
  try {
    await env.PORTAL_KV.put(HQ_CACHE_KEY, JSON.stringify(payload), {
      expirationTtl: HQ_TTL_SECONDS,
    });
  } catch (err) {
    console.error('hq: writing the cache threw', err);
  }
}

/** Forgets the payload. Every HQ write calls this, so the next load
 *  shows what just happened rather than what was true a minute ago. */
export async function dropHq(env: HqDataEnv): Promise<void> {
  if (!env.PORTAL_KV) return;
  try {
    await env.PORTAL_KV.delete(HQ_CACHE_KEY);
  } catch (err) {
    console.error('hq: dropping the cache threw', err);
  }
}

/* ── small shared helpers the tabs need ───────────────────────── */

/** Today as an ISO day, in the one place that decides it. */
export function today(now = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Is this ISO day before today? Undated is never overdue. */
export function isOverdue(day: string | null, now = new Date()): boolean {
  return Boolean(day) && String(day) < today(now);
}

/** Days from today to an ISO day. Negative is in the past. */
export function daysAway(day: string | null, now = new Date()): number | null {
  const d = parseNotionDate(day);
  if (!d) return null;
  const a = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((a - b) / 86_400_000);
}
