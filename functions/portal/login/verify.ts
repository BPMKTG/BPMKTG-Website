/* ──────────────────────────────────────────────────────────────
   POST /portal/login/verify — hand the code back, get a session.

   On success this sets the cookie and says which portal to open. On
   anything else it says the same thing: the code was wrong. Not "no
   such address", not "expired", not "too many tries", because each of
   those is a different fact about somebody's account.

   Which portal a client opens is decided HERE, from the address the
   code was issued to, not from anything in this request. A client
   cannot ask for a session on a slug that is not theirs, because the
   slug in the request is never read for a client at all.
   ────────────────────────────────────────────────────────────── */

import {
  adminCookie,
  clearAdminCookie,
  clearClientCookie,
  failureCount,
  isValidSlug,
  mintAdminSession,
  mintClientSession,
  normaliseSlug,
  portalNotFound,
  recordFailure,
  sessionCookie,
  sessionSecret,
  sha256Hex,
  RL_LIMIT,
} from '../../../src/server/portal-auth';
import { fetchPortalClients } from '../../../src/server/portal-notion';
import {
  checkCode,
  isCodeShaped,
  looksLikeEmail,
  normaliseEmail,
  takeCode,
  type CodeStore,
} from '../../../src/server/portal-login';

interface Env {
  NOTION_TOKEN: string;
  PORTAL_SECRET?: string;
  PORTAL_KV?: CodeStore;
}

const MAX_BODY = 1024;

/** The one refusal. Wrong code, expired code, no code, an address that
 *  never asked, too many guesses: all of it reads the same. */
function refused(): Response {
  return new Response(
    JSON.stringify({ ok: false, error: 'bad_code', message: "That code didn't work. Ask for a new one." }),
    {
      status: 400,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'X-Robots-Tag': 'noindex, nofollow',
      },
    },
  );
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.NOTION_TOKEN || !env.PORTAL_KV) {
    console.error('portal: sign-in is not configured');
    return refused();
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
  const cache = caches.default;
  if ((await failureCount(cache, ip)) >= RL_LIMIT) return refused();

  let email = '';
  let code = '';
  let want = '';
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return refused();
    const body = JSON.parse(raw) as { email?: unknown; code?: unknown; want?: unknown };
    email = normaliseEmail(body.email);
    code = typeof body.code === 'string' ? body.code.replace(/\D/g, '').slice(0, 6) : '';
    // The portal they were standing in when they were sent here. Only
    // ever a hint, and only ever honoured for an admin.
    want = normaliseSlug(body.want);
  } catch {
    return refused();
  }

  if (!looksLikeEmail(email) || !isCodeShaped(code)) {
    await recordFailure(cache, ip);
    return refused();
  }

  const emailHash = await sha256Hex(email);
  const pending = await takeCode(env.PORTAL_KV, emailHash);
  if (!pending) {
    await recordFailure(cache, ip);
    return refused();
  }

  // checkCode is what deletes the record on success and counts the
  // guess on failure. Ten wrong guesses burn the code.
  if (!(await checkCode(env.PORTAL_KV, emailHash, pending, code))) {
    await recordFailure(cache, ip);
    return refused();
  }

  const secret = sessionSecret(env as { PORTAL_SECRET?: string; NOTION_TOKEN: string });
  // A short, stable handle for the person, signed into the session.
  const who = emailHash.slice(0, 16);

  if (pending.role === 'admin') {
    let clients: Array<{ slug: string; artist: string }> = [];
    try {
      clients = await fetchPortalClients(env.NOTION_TOKEN);
    } catch (err) {
      console.error('portal: listing clients for an admin threw', err);
    }
    if (!clients.length) {
      console.error('portal: an admin signed in but no client has a portal switched on');
      return refused();
    }
    // Back to the portal they came from when it is a real one, else
    // the first client alphabetically. Either way the admin cookie
    // opens all of them.
    const slug = clients.some((c) => c.slug === want) ? want : clients[0].slug;

    // The client cookie for the portal we are about to open is cleared
    // as well. The admin cookie outranks it anyway, but leaving a
    // client's session behind on our browser is not a thing to do.
    return ok(
      { ok: true, slug, role: 'admin' },
      [adminCookie(await mintAdminSession(secret, who)), clearClientCookie(slug)],
    );
  }

  const slug = pending.slug;
  if (!isValidSlug(slug)) {
    console.error('portal: a client code carried a slug that is not one', slug);
    return refused();
  }

  // An admin cookie left on this browser would outrank the session
  // this client just created, and they would be looking at their own
  // portal with our permissions. Out it goes.
  return ok(
    { ok: true, slug, role: 'client' },
    [sessionCookie(slug, await mintClientSession(secret, slug, who)), clearAdminCookie()],
  );
};

function ok(body: unknown, cookies: string[]): Response {
  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  for (const c of cookies) headers.append('Set-Cookie', c);
  return new Response(JSON.stringify(body), { status: 200, headers });
}

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
