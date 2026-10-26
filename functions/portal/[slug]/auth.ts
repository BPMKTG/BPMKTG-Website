/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/auth — exchange a portal key for a session.

   Lives under the client's own path so the cookie it sets, scoped to
   /portal/<slug>, is actually sent back to the data endpoint next to
   it. A shared /api/portal endpoint could not read that cookie.

   This is the ONLY place that knows what a portal key is. Replacing it
   with Cloudflare Access means verifying the Access JWT here instead
   and minting the same session; nothing downstream changes.
   ────────────────────────────────────────────────────────────── */

import { findClientBySlug } from '../../../src/server/portal-notion';
import {
  checkPortalKey,
  failureCount,
  isValidSlug,
  mintSession,
  normaliseSlug,
  portalNotFound,
  recordFailure,
  sessionCookie,
  sessionSecret,
  RL_LIMIT,
} from '../../../src/server/portal-auth';

interface Env {
  NOTION_TOKEN: string;
  PORTAL_SECRET?: string;
}

/** Bounded so a huge body cannot be used to burn Function time. */
const MAX_BODY = 4096;

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.NOTION_TOKEN) {
    console.error("portal: NOTION_TOKEN isn't set");
    return portalNotFound();
  }

  const slug = normaliseSlug(params.slug as string);
  if (!isValidSlug(slug)) return portalNotFound();

  const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
  const cache = caches.default;

  // Checked before Notion is touched, so a brute force costs the
  // attacker a request and costs us nothing.
  if ((await failureCount(cache, ip)) >= RL_LIMIT) return portalNotFound();

  let key = '';
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return portalNotFound();
    const body = JSON.parse(raw) as { key?: unknown };
    key = typeof body.key === 'string' ? body.key : '';
  } catch {
    return portalNotFound();
  }

  let record: Awaited<ReturnType<typeof findClientBySlug>> = null;
  try {
    record = await findClientBySlug(env.NOTION_TOKEN, slug);
  } catch (err) {
    console.error('portal: client lookup threw', err);
    return portalNotFound();
  }

  // An unknown slug still runs a compare against a blank key, so a
  // request for a client that does not exist takes about as long as one
  // for a client whose key is wrong.
  const ok = await checkPortalKey(key, record?.portalKey ?? '', record?.portalEnabled ?? false);

  if (!ok) {
    await recordFailure(cache, ip);
    return portalNotFound();
  }

  const token = await mintSession(sessionSecret(env), slug);

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': sessionCookie(slug, token),
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
};

/** Anything other than POST looks exactly like a portal that is not
 *  there, rather than advertising that this path is an endpoint. */
export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
