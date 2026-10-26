/* ──────────────────────────────────────────────────────────────
   Client portal: everything that talks to Notion.

   SERVER ONLY. Nothing in src/pages imports this, so it never reaches
   a browser bundle. It is split out of the Pages Functions because the
   auth endpoint and the data endpoint both need the client lookup, and
   a second copy of that lookup is a second place for the slug rules to
   drift.

   Every function here returns already-whitelisted values. A raw Notion
   page object must not escape this file: that is the one rule that
   keeps a rate or an internal note from reaching the browser.
   ────────────────────────────────────────────────────────────── */

import {
  CLIENT_FIELDS,
  CALENDAR_FIELDS,
  SNAPSHOT_FIELDS,
  isMetricProp,
  isVisibleToClient,
  cleanItemTitle,
  type PortalClient,
  type PortalCalendarItem,
  type PortalSnapshot,
} from '../data/portal';

const NOTION_VERSION = '2022-06-28';

export const CLIENTS_DB = 'b495a24f-96c3-4108-8d78-106fd6228e14';
export const CALENDAR_DB = 'cb355a1b-fc2b-4550-86f2-f572b4a5040f';
export const SNAPSHOTS_DB = 'd34fe42f-89da-4260-b2b1-14f932b71124';

/** Notion pages 100 rows at a time. A long-running client could have a
 *  few hundred calendar rows, so every query follows the cursor. */
const PAGE_SIZE = 100;
/** Hard stop, so a runaway cursor cannot spin a Function forever. */
const MAX_PAGES = 12;

export const notionHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Notion-Version': NOTION_VERSION,
  'Content-Type': 'application/json',
});

/* ── property readers ──────────────────────────────────────────
   Notion wraps every value in a type tag. These pull a plain value
   out and return null rather than throwing when a property is absent,
   because "absent" is normal: an empty Notion cell and a property that
   was renamed look the same from here.
   ────────────────────────────────────────────────────────────── */

type Prop = Record<string, any> | undefined;

function readText(p: Prop): string | null {
  if (!p) return null;
  const parts = p.type === 'title' ? p.title : p.type === 'rich_text' ? p.rich_text : null;
  if (!Array.isArray(parts)) return null;
  const s = parts.map((t: any) => t?.plain_text ?? '').join('').trim();
  return s || null;
}

function readSelect(p: Prop): string | null {
  return p?.type === 'select' ? (p.select?.name ?? null) : null;
}

function readMultiSelect(p: Prop): string[] {
  if (p?.type !== 'multi_select' || !Array.isArray(p.multi_select)) return [];
  return p.multi_select.map((o: any) => String(o?.name ?? '')).filter(Boolean);
}

function readCheckbox(p: Prop): boolean {
  return p?.type === 'checkbox' ? Boolean(p.checkbox) : false;
}

function readUrl(p: Prop): string | null {
  if (p?.type !== 'url') return null;
  const raw = typeof p.url === 'string' ? p.url.trim() : '';
  if (!raw) return null;
  // Only http(s) reaches the browser. These render as links a client
  // clicks, and a javascript: or data: URL typed into Notion would
  // otherwise become a live link in their browser.
  return /^https?:\/\//i.test(raw) ? raw : null;
}

function readDate(p: Prop): string | null {
  return p?.type === 'date' ? (p.date?.start ?? null) : null;
}

function readNumber(p: Prop): number | null {
  if (p?.type !== 'number') return null;
  return typeof p.number === 'number' && Number.isFinite(p.number) ? p.number : null;
}

/** A formula whose result is a date or a date-shaped string. */
function readFormulaDate(p: Prop): string | null {
  if (p?.type !== 'formula') return null;
  const f = p.formula;
  if (!f) return null;
  if (f.type === 'date') return f.date?.start ?? null;
  if (f.type === 'string' && typeof f.string === 'string') {
    return /^\d{4}-\d{2}-\d{2}/.test(f.string.trim()) ? f.string.trim() : null;
  }
  return null;
}

/* ── paged query ───────────────────────────────────────────────── */

async function queryAll(
  token: string,
  databaseId: string,
  body: Record<string, unknown>,
): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const res = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
      method: 'POST',
      headers: notionHeaders(token),
      body: JSON.stringify({ ...body, page_size: PAGE_SIZE, start_cursor: cursor }),
    });

    if (!res.ok) {
      // The body names the offending property, which is the only useful
      // thing when a name drifts. Logged, never returned: it can echo
      // values from the database.
      console.error('portal: notion query failed', databaseId, res.status, await res.text());
      throw new Error('notion query failed');
    }

    const data = (await res.json()) as { results?: any[]; has_more?: boolean; next_cursor?: string };
    out.push(...(data.results ?? []));
    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor;
  }

  return out;
}

/* ── client lookup ─────────────────────────────────────────────── */

export interface ClientRecord {
  pageId: string;
  /** The stored key, for the caller to compare. Never leaves the server. */
  portalKey: string;
  portalEnabled: boolean;
  client: PortalClient;
}

/**
 * The one Client whose Intake Slug matches, or null.
 *
 * Exactly one, deliberately. Two clients sharing a slug is a data
 * problem, and guessing between them would hand one client's portal to
 * the other.
 */
export async function findClientBySlug(token: string, slug: string): Promise<ClientRecord | null> {
  const results = await queryAll(token, CLIENTS_DB, {
    filter: { property: 'Intake Slug', rich_text: { equals: slug } },
  });

  if (results.length !== 1) {
    if (results.length > 1) console.error('portal: slug matches more than one client', slug);
    return null;
  }

  const page = results[0];
  const p = page.properties ?? {};

  return {
    pageId: String(page.id),
    portalKey: readText(p['Portal Key']) ?? '',
    portalEnabled: readCheckbox(p['Portal Enabled']),
    // Built field by field from CLIENT_FIELDS. Nothing else on the page
    // is read, so nothing else can ship.
    client: {
      artist: readText(p[CLIENT_FIELDS[0]]) ?? '',
      tier: readSelect(p[CLIENT_FIELDS[1]]),
      stage: readSelect(p[CLIENT_FIELDS[2]]),
      termStart: readDate(p[CLIENT_FIELDS[3]]),
      termEnd: readDate(p[CLIENT_FIELDS[4]]),
      announcement: readText(p[CLIENT_FIELDS[5]]),
      driveFolder: readUrl(p[CLIENT_FIELDS[6]]),
      contentVault: readUrl(p[CLIENT_FIELDS[7]]),
      roadmapLink: readUrl(p[CLIENT_FIELDS[8]]),
      accessComplete: readCheckbox(p[CLIENT_FIELDS[9]]),
    },
  };
}

/* ── calendar ──────────────────────────────────────────────────── */

export async function fetchCalendar(
  token: string,
  clientPageId: string,
  artist: string,
): Promise<PortalCalendarItem[]> {
  // Notion filters the same way the visibility rule does. The rule runs
  // again below on every row, so a filter that silently stops matching
  // cannot widen what the client sees.
  const results = await queryAll(token, CALENDAR_DB, {
    filter: {
      and: [
        { property: 'Client', relation: { contains: clientPageId } },
        { property: 'Is Playbook', checkbox: { equals: false } },
        { property: 'Hide from Client', checkbox: { equals: false } },
        {
          or: [
            { property: 'Kind', select: { equals: 'Moment' } },
            { property: 'Type', select: { equals: 'Content' } },
            { property: 'Owner', select: { equals: 'Client' } },
          ],
        },
      ],
    },
  });

  const items: PortalCalendarItem[] = [];

  for (const page of results) {
    const p = page.properties ?? {};

    const row = {
      isPlaybook: readCheckbox(p['Is Playbook']),
      hideFromClient: readCheckbox(p['Hide from Client']),
      kind: readSelect(p['Kind']),
      type: readSelect(p['Type']),
      owner: readSelect(p['Owner']),
    };
    if (!isVisibleToClient(row)) continue;

    const { title, tentative } = cleanItemTitle(readText(p[CALENDAR_FIELDS[0]]) ?? '', artist);

    items.push({
      title,
      tentative,
      kind: row.kind,
      momentType: readSelect(p[CALENDAR_FIELDS[2]]),
      // Date first, then the Auto Date formula. A step with no explicit
      // date is positioned by its offset from the moment it belongs to,
      // and the formula is where that lands.
      date: readDate(p[CALENDAR_FIELDS[3]]) ?? readFormulaDate(p['Auto Date']),
      status: readSelect(p[CALENDAR_FIELDS[4]]),
      type: row.type,
      owner: row.owner,
      playbook: readSelect(p[CALENDAR_FIELDS[7]]),
      phase: readSelect(p[CALENDAR_FIELDS[8]]),
      where: readText(p[CALENDAR_FIELDS[9]]),
      whyItMatters: readText(p[CALENDAR_FIELDS[10]]),
      venueCity: readText(p[CALENDAR_FIELDS[11]]),
      ticketLink: readUrl(p[CALENDAR_FIELDS[12]]),
    });
  }

  // Undated rows sort last; the UI groups by month and needs a date.
  items.sort((a, b) => {
    if (!a.date && !b.date) return a.title.localeCompare(b.title);
    if (!a.date) return 1;
    if (!b.date) return -1;
    return a.date.localeCompare(b.date);
  });

  return items;
}

/* ── snapshots ─────────────────────────────────────────────────── */

export async function fetchSnapshots(token: string, clientPageId: string): Promise<PortalSnapshot[]> {
  const results = await queryAll(token, SNAPSHOTS_DB, {
    filter: { property: 'Client', relation: { contains: clientPageId } },
    sorts: [{ property: 'Date', direction: 'ascending' }],
  });

  return results.map((page: any) => {
    const p = page.properties ?? {};
    const metrics: Record<string, number> = {};

    // Only number-typed properties are even considered, and only those
    // whose names pass isMetricProp. Notes is text; nothing numeric in
    // this database is sensitive, but the rule is what keeps it that
    // way when someone adds a column.
    for (const [name, prop] of Object.entries(p)) {
      if (name === SNAPSHOT_FIELDS[3]) continue; // growth score, sent on its own
      const value = readNumber(prop as Prop);
      if (value === null) continue;
      if (!isMetricProp(name)) continue;
      metrics[name] = value;
    }

    return {
      date: readDate(p[SNAPSHOT_FIELDS[0]]),
      type: readSelect(p[SNAPSHOT_FIELDS[1]]),
      dataSource: readMultiSelect(p[SNAPSHOT_FIELDS[2]]),
      growthScore: readNumber(p[SNAPSHOT_FIELDS[3]]),
      metrics,
    };
  });
}
