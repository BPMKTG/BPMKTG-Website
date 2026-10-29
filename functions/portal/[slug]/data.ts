/* ──────────────────────────────────────────────────────────────
   GET /portal/<slug>/data — the client's own whitelisted data.

   Requires a session cookie: either this client's own, or the admin
   cookie, which opens every client's portal. Knows nothing about how
   either was obtained.

   An admin sees EXACTLY what the client sees. The only thing the
   payload says about them is `viewer`, which the header uses to draw a
   client switcher and a log-out.

   Everything it returns was assembled property by property from the
   whitelists in src/data/portal.ts. No Notion page object reaches this
   file intact.
   ────────────────────────────────────────────────────────────── */

import {
  fetchCalendar,
  fetchContent,
  fetchContentSchema,
  fetchPortalClients,
  fetchSnapshots,
  findClientBySlug,
} from '../../../src/server/portal-notion';
import {
  DATA_CACHE_SECONDS,
  isValidSlug,
  normaliseSlug,
  portalNotFound,
  readViewer,
  sessionSecret,
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
  const viewer = await readViewer(request, sessionSecret(env), slug);
  if (!viewer) return portalNotFound();

  // The switcher's list is the one thing an admin gets that a client
  // does not, so it is fetched per request and never cached with the
  // payload. The cached body is identical for both roles.
  const clients = viewer.role === 'admin'
    ? await fetchPortalClients(env.NOTION_TOKEN).catch((err) => {
        console.error('portal: listing clients for the switcher threw', err);
        return [];
      })
    : [];
  const viewerBlock = { role: viewer.role, ...(clients.length ? { clients } : {}) };

  const cache = caches.default;
  const key = cacheKey(slug);

  const hit = await cache.match(key).catch(() => undefined);
  if (hit) return withHeaders(await graft(hit, viewerBlock), 'hit');

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

  return withHeaders(await graft(cacheable, viewerBlock), 'miss');
};

/** Puts `viewer` on the payload on the way out.
 *
 *  Not baked into the cached body: the cache is per client, not per
 *  viewer, and one admin's client list must never be served to the
 *  client whose portal it was cached in. Cheaper than it looks, and a
 *  great deal cheaper than two cache entries that can disagree. */
async function graft(res: Response, viewer: unknown): Promise<Response> {
  const payload = await res.clone().json() as Record<string, unknown>;
  payload.viewer = viewer;
  return new Response(JSON.stringify(payload), { headers: res.headers });
}

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
