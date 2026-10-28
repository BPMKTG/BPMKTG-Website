/* ──────────────────────────────────────────────────────────────
   GET /portal/<slug>/data — the client's own whitelisted data.

   Requires the session cookie set by ../auth. Knows nothing about
   portal keys, which is what lets the sign-in step be replaced later
   without touching this file.

   Everything it returns was assembled property by property from the
   whitelists in src/data/portal.ts. No Notion page object reaches this
   file intact.
   ────────────────────────────────────────────────────────────── */

import {
  fetchCalendar,
  fetchContent,
  fetchContentSchema,
  fetchSnapshots,
  findClientBySlug,
} from '../../../src/server/portal-notion';
import {
  COOKIE_NAME,
  DATA_CACHE_SECONDS,
  isValidSlug,
  normaliseSlug,
  portalNotFound,
  readCookie,
  sessionSecret,
  verifySession,
} from '../../../src/server/portal-auth';
import type { PortalPayload } from '../../../src/data/portal';

interface Env {
  NOTION_TOKEN: string;
  PORTAL_SECRET?: string;
}

/** Cache key for one client's assembled payload. The hostname is not
 *  routable, so nothing can fetch this out of the cache over HTTP. */
const cacheKey = (slug: string) => `https://portal-data.invalid/${slug}`;

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.NOTION_TOKEN) {
    console.error("portal: NOTION_TOKEN isn't set");
    return portalNotFound();
  }

  const slug = normaliseSlug(params.slug as string);
  if (!isValidSlug(slug)) return portalNotFound();

  // Auth first, always. The cache is read only after the session is
  // verified, so a cached payload can never be served to a stranger.
  const token = readCookie(request.headers.get('Cookie'), COOKIE_NAME);
  if (!(await verifySession(sessionSecret(env), slug, token))) return portalNotFound();

  const cache = caches.default;
  const key = cacheKey(slug);

  const hit = await cache.match(key).catch(() => undefined);
  if (hit) return withHeaders(hit, 'hit');

  let payload: PortalPayload;
  try {
    const record = await findClientBySlug(env.NOTION_TOKEN, slug);
    // A valid session for a client who has since been deleted or had
    // their portal switched off gets the same 404 as everyone else.
    if (!record || !record.portalEnabled) return portalNotFound();

    const [calendar, snapshots, content, contentSchema] = await Promise.all([
      fetchCalendar(env.NOTION_TOKEN, record.pageId, record.client.artist),
      fetchSnapshots(env.NOTION_TOKEN, record.pageId),
      fetchContent(env.NOTION_TOKEN, record.pageId),
      fetchContentSchema(env.NOTION_TOKEN),
    ]);

    payload = { client: record.client, calendar, snapshots, content, contentSchema };
  } catch (err) {
    console.error('portal: data build threw', err);
    return portalNotFound();
  }

  const body = JSON.stringify(payload);

  // s-maxage, not max-age: the shared cache may keep this for a minute,
  // the client's browser must not keep it at all.
  const cacheable = new Response(body, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': `s-maxage=${DATA_CACHE_SECONDS}`,
    },
  });
  await cache.put(key, cacheable.clone()).catch(() => {});

  return withHeaders(cacheable, 'miss');
};

/** The browser never caches a portal payload, whatever the shared cache
 *  did. Re-headered on the way out rather than at construction so the
 *  cached copy keeps its s-maxage. */
function withHeaders(res: Response, state: 'hit' | 'miss'): Response {
  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow',
      'X-Portal-Cache': state,
    },
  });
}

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET') return next();
  return portalNotFound();
};
