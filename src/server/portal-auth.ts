/* ──────────────────────────────────────────────────────────────
   Client portal: key check, session cookie, rate limit.

   SERVER ONLY.

   Two steps on purpose, kept apart:

     1. ESTABLISH IDENTITY. Today that is a portal key in the link.
        Tomorrow it can be a Cloudflare Access JWT. Only `checkPortalKey`
        and the /auth endpoint know which.
     2. CARRY IT. A short signed token in an HttpOnly cookie, scoped to
        the one client's path.

   Swapping step 1 for Cloudflare Access means replacing one function
   and leaving the session, the cookie and the data endpoint alone.
   ────────────────────────────────────────────────────────────── */

export const COOKIE_NAME = 'bp_portal';
/** 30 days, as a link a client bookmarks is the normal way back in. */
export const SESSION_SECONDS = 30 * 24 * 60 * 60;

/** Failed key checks allowed per IP per window, then everything 404s. */
export const RL_LIMIT = 8;
export const RL_WINDOW_SECONDS = 600;

/** How long a client's Notion data is reused. Notion's rate limit is
 *  ~3 requests/second and one portal load costs three queries. */
export const DATA_CACHE_SECONDS = 60;

/* ── slug ─────────────────────────────────────────────────────── */

/**
 * Slugs go into a Set-Cookie Path and into cache keys, so they are
 * validated rather than escaped. Anything that is not an obvious slug
 * is simply not a client.
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,98}[a-z0-9]$/.test(slug) || /^[a-z0-9]$/.test(slug);
}

/** The slug as it appears in a URL path, lowercased and bounded. */
export function normaliseSlug(raw: string | undefined | null): string {
  return String(raw ?? '').trim().toLowerCase().slice(0, 100);
}

/* ── constant-time compare ────────────────────────────────────── */

const encoder = new TextEncoder();

async function sha256(value: string): Promise<Uint8Array> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value));
  return new Uint8Array(digest);
}

/**
 * Compares two secrets without leaking where they differ.
 *
 * Both sides are hashed first. That makes the comparison fixed-length,
 * so the time it takes says nothing about the length of the real key
 * either, which a plain byte-by-byte loop over the raw strings would
 * still give away.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

/**
 * Does this key open this client's portal?
 *
 * Returns the same false for a disabled portal, a blank stored key and
 * a wrong key. The caller must not distinguish them either.
 */
export async function checkPortalKey(
  supplied: string,
  stored: string,
  portalEnabled: boolean,
): Promise<boolean> {
  // A blank stored key would otherwise match a blank ?key=, which is to
  // say it would open every client who has not been given one yet.
  // Still runs the compare, so a client with no key set takes the same
  // time as one with a key.
  const usable = portalEnabled && stored.length > 0;
  const ok = await timingSafeEqual(supplied, stored);
  return usable && ok;
}

/* ── session token ────────────────────────────────────────────── */

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

async function hmac(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(message));
  return hex(new Uint8Array(sig));
}

/**
 * `<expiry>.<signature>`.
 *
 * The slug is signed but not stored in the token: the cookie is already
 * scoped to that client's path, and signing the slug is what stops a
 * cookie from one portal being replayed at another if that scoping is
 * ever loosened.
 */
export async function mintSession(secret: string, slug: string, now = Date.now()): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_SECONDS;
  return `${exp}.${await hmac(secret, `${slug}:${exp}`)}`;
}

export async function verifySession(
  secret: string,
  slug: string,
  token: string | null,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot === -1) return false;

  const exp = Number(token.slice(0, dot));
  if (!Number.isFinite(exp) || exp * 1000 <= now) return false;

  const expected = await hmac(secret, `${slug}:${exp}`);
  return timingSafeEqual(token.slice(dot + 1), expected);
}

export function sessionCookie(slug: string, token: string): string {
  return [
    `${COOKIE_NAME}=${token}`,
    `Path=/portal/${slug}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${SESSION_SECONDS}`,
  ].join('; ');
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(';')) {
    const eq = part.indexOf('=');
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}

/* ── rate limit ───────────────────────────────────────────────── */

/**
 * Counts failed key checks per IP in the Cache API.
 *
 * Honest about what this is: a speed bump, not a guarantee. The cache
 * is per-datacenter and the read-modify-write races, so a determined
 * attacker spread across colos gets more than RL_LIMIT tries. It costs
 * nothing and it stops the obvious case, which is someone pointing a
 * script at one slug. A Cloudflare Rate Limiting rule is the real
 * answer and is written up in docs/PORTAL_SETUP.md.
 */
async function rlKey(ip: string): Promise<string> {
  // Hashed so a cache dump is not a list of visitor IPs.
  return `https://portal-rl.invalid/${hex(await sha256(ip)).slice(0, 32)}`;
}

export async function failureCount(cache: Cache, ip: string): Promise<number> {
  try {
    const hit = await cache.match(await rlKey(ip));
    if (!hit) return 0;
    const n = Number(await hit.text());
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export async function recordFailure(cache: Cache, ip: string): Promise<void> {
  try {
    const key = await rlKey(ip);
    const next = (await failureCount(cache, ip)) + 1;
    await cache.put(
      key,
      new Response(String(next), {
        headers: { 'Cache-Control': `max-age=${RL_WINDOW_SECONDS}` },
      }),
    );
  } catch {
    /* A rate limiter that throws must not take the endpoint with it. */
  }
}

/* ── the one failure response ─────────────────────────────────── */

/**
 * Unknown slug, wrong key, disabled portal, a key for a different
 * client, rate limited, Notion down. All of them end here.
 *
 * Nothing in the status, body or headers says which, because anything
 * that distinguishes them turns this endpoint into a way to ask whether
 * a given artist is a Blueprint client.
 */
export function portalNotFound(): Response {
  return new Response(JSON.stringify({ ok: false, error: 'not_found' }), {
    status: 404,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

/** The signing secret. PORTAL_SECRET when set; otherwise the Notion
 *  token, which is already a high-entropy secret present in every
 *  environment that can serve a portal at all. Rotating the Notion
 *  token then signs everyone out, which is a fair trade for not
 *  requiring a second secret before the portal works. */
export function sessionSecret(env: { PORTAL_SECRET?: string; NOTION_TOKEN: string }): string {
  return env.PORTAL_SECRET && env.PORTAL_SECRET.length >= 16 ? env.PORTAL_SECRET : env.NOTION_TOKEN;
}
