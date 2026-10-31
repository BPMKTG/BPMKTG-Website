/* ──────────────────────────────────────────────────────────────
   The preamble every content write runs: auth, origin, rate limit,
   client lookup. Both endpoints do exactly the same thing here, and
   two copies would be two places for the ownership check to drift.
   ────────────────────────────────────────────────────────────── */

import {
  isValidSlug,
  normaliseSlug,
  portalNotFound,
  readViewer,
  sessionSecret,
  type Viewer,
} from './portal-auth';
import { fetchCalendar, fetchContentSchema, findClientBySlug, type ClientRecord } from './portal-notion';
import {
  WRITE_LIMIT,
  WRITE_WINDOW_SECONDS,
  isJsonRequest,
  isSameOrigin,
  readJsonBody,
} from './portal-write';
import type { PortalContentSchema } from '../data/portal-content';

export interface WriteEnv {
  NOTION_TOKEN: string;
  PORTAL_SECRET?: string;
}

export interface WriteContext {
  slug: string;
  /** Who is writing. Decides what the row is stamped with, and
   *  nothing else: an admin sees and may change exactly what the
   *  client may. */
  viewer: Viewer;
  record: ClientRecord;
  body: Record<string, unknown>;
  /** Null when the caller said it does not need it. A step write only
   *  sets a Status that is checked against a fixed list, so there is
   *  nothing for Notion's content schema to validate. */
  schema: PortalContentSchema | null;
  /** Moment ids this client may link a card to. */
  allowedCampaigns: string[];
}

export interface BeginOptions {
  /** Content writes validate buckets, formats and platforms against
   *  Notion's own schema, which costs a request. Step writes do not. */
  schema?: boolean;
}

/** Everything that can go wrong returns the same 404 the rest of the
 *  portal uses. A write endpoint that said "wrong client" would be a
 *  way to ask whether a page id belongs to someone. */
export async function beginWrite(
  request: Request,
  env: WriteEnv,
  rawSlug: unknown,
  opts: BeginOptions = {},
): Promise<{ ok: true; ctx: WriteContext } | { ok: false; response: Response }> {
  const fail = { ok: false as const, response: portalNotFound() };

  if (!env.NOTION_TOKEN) {
    console.error("portal: NOTION_TOKEN isn't set");
    return fail;
  }
  if (!isSameOrigin(request) || !isJsonRequest(request)) return fail;

  const slug = normaliseSlug(rawSlug as string);
  if (!isValidSlug(slug)) return fail;

  const viewer = await readViewer(request, sessionSecret(env), slug);
  if (!viewer) return fail;

  if (await overWriteLimit(slug)) {
    console.error('portal: write rate limit hit', slug);
    return fail;
  }

  const body = await readJsonBody(request);
  if (!body) return fail;

  const record = await findClientBySlug(env.NOTION_TOKEN, slug);
  if (!record || !record.portalEnabled) return fail;

  // The campaigns a client may link to are exactly the moments their
  // own calendar already shows them. Anything else is another client's
  // row, or one we hid.
  //
  // Reading the calendar costs several Notion requests, and a save is
  // usually one blurred text field, so it is only read when the patch
  // actually names a campaign. No list means no campaign may be set,
  // which is the safe direction to be wrong in.
  const wantsCampaign = 'campaign' in body;
  const [calendar, schema] = await Promise.all([
    wantsCampaign
      ? fetchCalendar(env.NOTION_TOKEN, record.pageId, record.client.artist)
      : Promise.resolve([]),
    opts.schema === false
      ? Promise.resolve(null)
      : fetchContentSchema(env.NOTION_TOKEN),
  ]);
  const allowedCampaigns = calendar
    .filter((i) => i.momentType)
    .map((i) => i.id)
    .filter(Boolean);

  return { ok: true, ctx: { slug, viewer, record, body, schema, allowedCampaigns } };
}

/* ── per-client write limit ────────────────────────────────────
   Per colo, like the sign-in limiter, and for the same reason: it is
   cheap and it stops a script pointed at one portal. */

const wlKey = (name: string, slug: string) =>
  `https://portal-wl.invalid/${name}/${encodeURIComponent(slug)}`;

/**
 * One counter, named, per client, per window.
 *
 * Exported because not every write costs the same. A content save is
 * one Notion request; moving a campaign is thirty, so it answers to a
 * tighter counter of its own rather than spending one token out of
 * thirty and multiplying by thirty on the way out.
 */
export async function overLimit(
  name: string, slug: string, limit: number, seconds: number,
): Promise<boolean> {
  try {
    const cache = caches.default;
    const key = wlKey(name, slug);
    const hit = await cache.match(key);
    const n = hit ? Number(await hit.text()) : 0;
    const count = Number.isFinite(n) ? n : 0;
    if (count >= limit) return true;
    await cache.put(key, new Response(String(count + 1), {
      headers: { 'Cache-Control': `max-age=${seconds}` },
    }));
    return false;
  } catch {
    // A limiter that throws must not take the endpoint with it.
    return false;
  }
}

const overWriteLimit = (slug: string) =>
  overLimit('w', slug, WRITE_LIMIT, WRITE_WINDOW_SECONDS);

/** A write invalidates the 60s payload cache, or the client saves
 *  something and watches the page show them the old value. */
export async function bustDataCache(slug: string): Promise<void> {
  try {
    await caches.default.delete(`https://portal-data.invalid/${slug}`);
  } catch { /* a stale cache is a worse bug than a failed delete */ }
}

export function writeOk(body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
