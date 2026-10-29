/* ──────────────────────────────────────────────────────────────
   Client portal: sessions, cookies, rate limit.

   SERVER ONLY.

   Two steps on purpose, kept apart:

     1. ESTABLISH IDENTITY. A six-digit code sent to an email address
        Notion says may open this portal. Only portal-login.ts and the
        /portal/login endpoints know that.
     2. CARRY IT. A short signed token in an HttpOnly cookie.

   There are two of those cookies, because there are two kinds of
   viewer:

     bp_portal  Path=/portal/<slug>   one client, their own portal.
     bp_admin   Path=/portal          us, in any client's portal.

   The admin cookie is checked first and wins. Both carry a role, so a
   future /admin dashboard reads the same session rather than inventing
   a second way in.
   ────────────────────────────────────────────────────────────── */

export const COOKIE_NAME = 'bp_portal';
export const ADMIN_COOKIE_NAME = 'bp_admin';
/** 30 days, as signing in once a month is the most anyone should have
 *  to do to look at their own calendar. */
export const SESSION_SECONDS = 30 * 24 * 60 * 60;

/** Failed sign-ins allowed per IP per window, then everything 404s. */
export const RL_LIMIT = 8;
export const RL_WINDOW_SECONDS = 600;

/** Who is looking. The role is carried in the signed token rather than
 *  worked out again from an email on every request. */
export type Role = 'client' | 'admin';

export interface Viewer {
  role: Role;
  /** A short hash of the email, for logs and for a future dashboard.
   *  The address itself never goes into a cookie. */
  who: string;
}

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

const hex = (bytes: Uint8Array) =>
  Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');

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
/** SHA-256 as hex. Used to turn an email address into a key that can
 *  sit in a cookie, a log line or a cache key without being an email
 *  address. */
export async function sha256Hex(value: string): Promise<string> {
  return hex(await sha256(value));
}

export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const [ha, hb] = await Promise.all([sha256(a), sha256(b)]);
  let diff = 0;
  for (let i = 0; i < ha.length; i++) diff |= ha[i] ^ hb[i];
  return diff === 0;
}

/* ── session token ────────────────────────────────────────────── */

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
 * A session token: `v2.<expiry>.<who>.<signature>`.
 *
 * The scope is signed but not stored in the token. For a client that
 * scope is their slug, so a cookie lifted from one portal cannot be
 * replayed at another even if the cookie Path is ever loosened. For an
 * admin there is no slug, which is the whole point of the admin cookie.
 *
 * `v2` is deliberate. Tokens minted by the old shared-link sign-in have
 * no version prefix and no longer verify, so every link that used to
 * carry a key now lands on the sign-in screen.
 */
const TOKEN_V = 'v2';

async function mint(secret: string, scope: string, who: string, now: number): Promise<string> {
  const exp = Math.floor(now / 1000) + SESSION_SECONDS;
  const sig = await hmac(secret, `${scope}:${exp}:${who}`);
  return `${TOKEN_V}.${exp}.${who}.${sig}`;
}

async function verify(
  secret: string,
  scope: string,
  token: string | null,
  now: number,
): Promise<string | null> {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 4) return null;
  const [v, expRaw, who, sig] = parts;
  if (v !== TOKEN_V) return null;
  // `who` is signed, so a tampered one fails the compare below anyway.
  // It is bounded here so a megabyte of cookie never reaches the HMAC.
  if (!/^[0-9a-f]{1,32}$/.test(who)) return null;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 <= now) return null;

  const expected = await hmac(secret, `${scope}:${exp}:${who}`);
  return (await timingSafeEqual(sig, expected)) ? who : null;
}

const clientScope = (slug: string) => `s:${slug}`;
const ADMIN_SCOPE = 'a:blueprint';

export function mintClientSession(
  secret: string, slug: string, who: string, now = Date.now(),
): Promise<string> {
  return mint(secret, clientScope(slug), who, now);
}

export function mintAdminSession(
  secret: string, who: string, now = Date.now(),
): Promise<string> {
  return mint(secret, ADMIN_SCOPE, who, now);
}

export function verifyClientSession(
  secret: string, slug: string, token: string | null, now = Date.now(),
): Promise<string | null> {
  return verify(secret, clientScope(slug), token, now);
}

export function verifyAdminSession(
  secret: string, token: string | null, now = Date.now(),
): Promise<string | null> {
  return verify(secret, ADMIN_SCOPE, token, now);
}

/**
 * Who, if anyone, may look at this client's portal.
 *
 * The admin cookie is checked first: it is scoped to /portal rather
 * than to one client, so an admin keeps one session while they switch
 * between clients. A client's own cookie only ever reaches their own
 * path.
 *
 * Returns null for no cookie, a cookie for another client, an expired
 * one, a forged one, and a token minted before this version. Every one
 * of those ends at the same 404.
 */
export async function readViewer(
  request: Request,
  secret: string,
  slug: string,
  now = Date.now(),
): Promise<Viewer | null> {
  const header = request.headers.get('Cookie');

  const admin = await verifyAdminSession(secret, readCookie(header, ADMIN_COOKIE_NAME), now);
  if (admin) return { role: 'admin', who: admin };

  const client = await verifyClientSession(secret, slug, readCookie(header, COOKIE_NAME), now);
  if (client) return { role: 'client', who: client };

  return null;
}

/* ── cookies ──────────────────────────────────────────────────── */

function cookie(name: string, value: string, path: string, seconds: number): string {
  return [
    `${name}=${value}`,
    `Path=${path}`,
    'HttpOnly',
    'Secure',
    'SameSite=Lax',
    `Max-Age=${seconds}`,
  ].join('; ');
}

export function sessionCookie(slug: string, token: string): string {
  return cookie(COOKIE_NAME, token, `/portal/${slug}`, SESSION_SECONDS);
}

export function adminCookie(token: string): string {
  return cookie(ADMIN_COOKIE_NAME, token, '/portal', SESSION_SECONDS);
}

/** Both of the cookies a sign-out has to clear. A client only ever has
 *  the first; clearing one that was never set costs nothing, and
 *  guessing which is set is how a log-out leaves someone logged in. */
export function clearCookies(slug: string): string[] {
  return [clearClientCookie(slug), clearAdminCookie()];
}

/** Cleared when a client signs in on a browser one of us used.
 *
 *  Without this, a stale admin cookie would quietly outrank the
 *  session the client just created, and they would be looking at
 *  their own portal with our permissions. */
export function clearAdminCookie(): string {
  return cookie(ADMIN_COOKIE_NAME, '', '/portal', 0);
}

/** The mirror of it: cleared when one of us signs in on a browser the
 *  client used. */
export function clearClientCookie(slug: string): string {
  return cookie(COOKIE_NAME, '', `/portal/${slug}`, 0);
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
 * Counts failed sign-ins per IP in the Cache API.
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
 * Unknown slug, no session, a session for a different client, a
 * disabled portal, rate limited, Notion down. All of them end here.
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
