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
  type PortalMoment,
  SNAPSHOT_FIELDS,
  isMetricProp,
  isVisibleToClient,
  cleanItemTitle,
  cleanText,
  type PortalClient,
  type PortalCalendarItem,
  type PortalSnapshot,
} from '../data/portal';
import {
  CONTENT_FIELDS,
  type PortalContentItem,
  type PortalContentSchema,
  type PortalOption,
} from '../data/portal-content';

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
  // cleanText here rather than in the browser: a column filled with an
  // em dash means "nothing yet", and the whole payload is better off
  // never carrying the placeholder in the first place.
  return cleanText(parts.map((t: any) => t?.plain_text ?? '').join(''));
}

function readSelect(p: Prop): string | null {
  return p?.type === 'select' ? cleanText(p.select?.name ?? null) : null;
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

/** Related page ids, nothing else. A relation never carries the
 *  related page's own properties into the payload. */
function readRelation(p: Prop): string[] {
  const r = p as any;
  if (r?.type !== 'relation' || !Array.isArray(r.relation)) return [];
  return r.relation.map((x: any) => String(x?.id ?? '')).filter(Boolean);
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

/** How many moments outside the visible set we will go and fetch.
 *  Bounded so a calendar full of cross-links cannot turn one portal
 *  load into a hundred Notion calls. */
const MAX_MOMENT_FETCH = 25;

/** One page by id, or null. Never throws: a moment we cannot read is a
 *  step without a campaign label, not a dead portal. */
async function fetchPage(token: string, id: string): Promise<any | null> {
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${id}`, { headers: notionHeaders(token) });
    if (!res.ok) {
      console.error('portal: moment fetch failed', id, res.status);
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error('portal: moment fetch threw', id, err);
    return null;
  }
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
      goals: readText(p[CLIENT_FIELDS[10]]),
      goalDeadline: readDate(p[CLIENT_FIELDS[11]]),
      goalInstagramFollowers: readNumber(p[CLIENT_FIELDS[12]]),
      goalSongsAt10k: readNumber(p[CLIENT_FIELDS[13]]),
      goalShowsPerMonth: readNumber(p[CLIENT_FIELDS[14]]),
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

  /* Pass one: shape every visible row, remembering which moment each
     step points at. The moment itself is resolved afterwards, because
     a step can reference a moment that is not in this result set. */
  type Raw = { item: PortalCalendarItem; momentId: string | null };
  const raws: Raw[] = [];
  const byId = new Map<string, any>();

  for (const page of results) {
    byId.set(String(page.id), page);

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

    raws.push({
      momentId: readRelation(p[CALENDAR_FIELDS[13]])[0] ?? null,
      item: {
        id: String(page.id),
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
        moment: null,
        streamsToDate: readNumber(p[CALENDAR_FIELDS[14]]),
        ticketsSold: readNumber(p[CALENDAR_FIELDS[15]]),
        capacity: readNumber(p[CALENDAR_FIELDS[16]]),
      },
    });
  }

  /* Pass two: resolve the moments. Most are already here, because a
     moment a client can see came back with the same query. The rest
     are fetched by id, capped, and each one is checked to belong to
     THIS client before anything from it is used. A relation is only
     ever as trustworthy as the row it points at. */
  const wanted = new Set(raws.map((r) => r.momentId).filter((id): id is string => !!id));
  const missing = [...wanted].filter((id) => !byId.has(id)).slice(0, MAX_MOMENT_FETCH);

  if (missing.length) {
    const fetched = await Promise.all(missing.map((id) => fetchPage(token, id)));
    for (const page of fetched) {
      if (!page) continue;
      const rel = readRelation((page.properties ?? {})['Client']);
      if (!rel.includes(clientPageId)) {
        console.error('portal: moment relation points outside this client', String(page.id));
        continue;
      }
      byId.set(String(page.id), page);
    }
  }

  const moments = new Map<string, PortalMoment>();
  for (const id of wanted) {
    const page = byId.get(id);
    if (!page) continue;
    const p = page.properties ?? {};
    const { title } = cleanItemTitle(readText(p[CALENDAR_FIELDS[0]]) ?? '', artist);
    // Four fields, built one at a time. Nothing else on the moment page
    // is read, so nothing else can ship.
    moments.set(id, {
      id,
      title,
      momentType: readSelect(p[CALENDAR_FIELDS[2]]),
      date: readDate(p[CALENDAR_FIELDS[3]]) ?? readFormulaDate(p['Auto Date']),
    });
  }

  const items: PortalCalendarItem[] = raws.map(({ item, momentId }) => {
    // A moment does not belong to itself.
    if (momentId && item.kind !== 'Moment') {
      item.moment = moments.get(momentId) ?? null;
    }
    return item;
  });

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

/* ── Content Pipeline ──────────────────────────────────────────
   The first database a client can write to, so everything here is
   written twice over: the read filters on Hide from Client, and every
   write re-fetches the page and checks ownership again before it
   touches anything. A request is never trusted about which row it is
   allowed to change.
   ────────────────────────────────────────────────────────────── */

export const CONTENT_DB = '086468af-a36c-414a-9dd0-e13fca387a42';

/** One Notion page, shaped field by field into the client's view. */
function shapeContent(page: any): PortalContentItem {
  const p = page.properties ?? {};
  return {
    id: String(page.id),
    title: cleanItemTitle(readText(p[CONTENT_FIELDS[0]]) ?? ''),
    status: readSelect(p[CONTENT_FIELDS[1]]),
    bucket: readSelect(p[CONTENT_FIELDS[2]]),
    format: readMultiSelect(p[CONTENT_FIELDS[3]]),
    source: readSelect(p[CONTENT_FIELDS[4]]),
    filmBy: readDate(p[CONTENT_FIELDS[5]]),
    postDate: readDate(p[CONTENT_FIELDS[6]]),
    postedBy: readSelect(p[CONTENT_FIELDS[7]]),
    platforms: readMultiSelect(p[CONTENT_FIELDS[8]]),
    campaign: readRelation(p[CONTENT_FIELDS[9]]),
    shootCode: readText(p[CONTENT_FIELDS[10]]),
    onScreenText: readText(p[CONTENT_FIELDS[11]]),
    caption: readText(p[CONTENT_FIELDS[12]]),
    notes: readText(p[CONTENT_FIELDS[13]]),
    feedback: readText(p[CONTENT_FIELDS[14]]),
    footageLink: readUrl(p[CONTENT_FIELDS[15]]),
    editLink: readUrl(p[CONTENT_FIELDS[16]]),
    postLink: readUrl(p[CONTENT_FIELDS[17]]),
  };
}

export async function fetchContent(
  token: string,
  clientPageId: string,
): Promise<PortalContentItem[]> {
  // Failing soft, and only here. The Content Pipeline is one database
  // among four, and a client whose portal went dark because that one
  // is not shared with the integration yet would lose their calendar
  // and their reports too. A read that fails shows nothing; it is the
  // ownership checks on the WRITE side that must never degrade.
  let results: any[];
  try {
    results = await queryAll(token, CONTENT_DB, {
      filter: {
        and: [
          { property: 'Client', relation: { contains: clientPageId } },
          { property: 'Hide from Client', checkbox: { equals: false } },
        ],
      },
    });
  } catch (err) {
    console.error('portal: content fetch failed', err);
    return [];
  }

  // The filter is belt; this is braces. If the filter ever stops
  // matching the way we think it does, a hidden row still cannot ship.
  return results
    .filter((page: any) => !readCheckbox((page.properties ?? {})['Hide from Client']))
    .map(shapeContent);
}

/**
 * The select and multi-select options, read from the live schema.
 *
 * Buckets are Sean's own vocabulary and he will add more. Reading them
 * at runtime means a new bucket shows up in his portal the moment he
 * adds it in Notion, with its colour, and no deploy.
 */
export async function fetchContentSchema(token: string): Promise<PortalContentSchema> {
  const empty: PortalContentSchema = { bucket: [], format: [], platforms: [], status: [] };
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${CONTENT_DB}`, {
      headers: notionHeaders(token),
    });
    if (!res.ok) {
      console.error('portal: content schema fetch failed', res.status);
      return empty;
    }
    const db = (await res.json()) as any;
    const props = db.properties ?? {};
    const opts = (name: string): PortalOption[] => {
      const p = props[name];
      const list = p?.type === 'select' ? p.select?.options
        : p?.type === 'multi_select' ? p.multi_select?.options
        : null;
      if (!Array.isArray(list)) return [];
      return list.map((o: any) => ({ name: String(o?.name ?? ''), color: String(o?.color ?? 'default') }))
        .filter((o: PortalOption) => o.name);
    };
    return {
      bucket: opts('Bucket'),
      format: opts('Format'),
      platforms: opts('Platforms'),
      status: opts('Status'),
    };
  } catch (err) {
    console.error('portal: content schema fetch threw', err);
    return empty;
  }
}

/**
 * The one content row with this id that belongs to this client.
 *
 * Returns null for a row that does not exist, belongs to someone else,
 * or is hidden. The caller turns every one of those into the same 404,
 * so a forged id cannot be used to probe which rows exist.
 */
export async function fetchOwnedContent(
  token: string,
  clientPageId: string,
  pageId: string,
): Promise<{ page: any; item: PortalContentItem } | null> {
  const page = await fetchPage(token, pageId);
  if (!page || page.object !== 'page' || page.archived) return null;

  const p = page.properties ?? {};
  const owners = readRelation(p['Client']).map((id) => id.replace(/-/g, ''));
  if (!owners.includes(clientPageId.replace(/-/g, ''))) {
    console.error('portal: content write aimed at another client', pageId);
    return null;
  }
  if (readCheckbox(p['Hide from Client'])) return null;

  return { page, item: shapeContent(page) };
}

/** PATCH one page's properties. Properties are built by the caller
 *  from CLIENT_EDITABLE; nothing from the request reaches Notion
 *  except as a value inside one of those. */
export async function updateContentPage(
  token: string,
  pageId: string,
  properties: Record<string, unknown>,
): Promise<PortalContentItem | null> {
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${pageId}`, {
      method: 'PATCH',
      headers: notionHeaders(token),
      body: JSON.stringify({ properties }),
    });
    if (!res.ok) {
      console.error('portal: content update failed', pageId, res.status, await res.text());
      return null;
    }
    return shapeContent(await res.json());
  } catch (err) {
    console.error('portal: content update threw', pageId, err);
    return null;
  }
}

export async function createContentPage(
  token: string,
  properties: Record<string, unknown>,
): Promise<PortalContentItem | null> {
  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders(token),
      body: JSON.stringify({ parent: { database_id: CONTENT_DB }, properties }),
    });
    if (!res.ok) {
      console.error('portal: content create failed', res.status, await res.text());
      return null;
    }
    return shapeContent(await res.json());
  } catch (err) {
    console.error('portal: content create threw', err);
    return null;
  }
}
