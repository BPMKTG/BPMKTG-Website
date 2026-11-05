/* ──────────────────────────────────────────────────────────────
   Short-lived tokens for the print routes.

   SERVER ONLY.

   A print route renders a client's whole month, or a whole audit, as
   an unauthenticated-looking HTML page. It has to, because the thing
   that screenshots it is a headless browser in Cloudflare's network
   that carries none of our cookies. So the page is reachable two ways
   and no others:

     the admin cookie      Mason, previewing in his own browser
     one of these tokens   the renderer, for ten minutes, for one id

   The token is scoped to a single document. A token minted to render
   Sean's October report cannot be replayed against November's, or
   against an audit, because the kind and the id are both signed. It
   expires in ten minutes, which is roughly thirty times longer than a
   render takes and still short enough that a token in a log line is
   not a leak of the document.

   What it is not: a share link. A prospect's audit link is a separate,
   revocable record (see functions/a/[token].ts), because "ten minutes"
   is the wrong lifetime for something you email to someone.
   ────────────────────────────────────────────────────────────── */

import { hmacHex, sessionSecret, timingSafeEqual } from './portal-auth';

export type PrintKind = 'report' | 'audit';

const V = 'p1';

/** Ten minutes, per the spec. Long enough for a cold Browser Rendering
 *  session plus a retry; short enough not to matter if it is logged. */
export const PRINT_TOKEN_SECONDS = 600;

/**
 * The print signing secret.
 *
 * `PRINT_SIGNING_SECRET` when it is set, which is what the dashboard
 * binding is for. Otherwise the session secret, so a preview branch
 * renders before anyone has added the binding. Signed tokens are not
 * optional, but a second secret should not be the thing standing
 * between a fresh environment and a working preview.
 */
export function printSecret(env: {
  PRINT_SIGNING_SECRET?: string;
  PORTAL_SECRET?: string;
  NOTION_TOKEN: string;
}): string {
  const own = env.PRINT_SIGNING_SECRET;
  if (own && own.length >= 16) return own;
  return sessionSecret(env);
}

const message = (kind: PrintKind, id: string, exp: number) => `${V}:${kind}:${id}:${exp}`;

/** A token good for one document for ten minutes. */
export async function mintPrintToken(
  secret: string,
  kind: PrintKind,
  id: string,
  now = Date.now(),
): Promise<string> {
  const exp = Math.floor(now / 1000) + PRINT_TOKEN_SECONDS;
  const sig = await hmacHex(secret, message(kind, id, exp));
  return `${V}.${exp}.${sig}`;
}

/**
 * True when this token was minted for this exact document and has not
 * expired.
 *
 * The kind and the id come from the route, not from the token, so
 * there is nothing in the token to tamper with: a signature over a
 * different document simply does not match. Every failure returns
 * false with no detail, because the caller answers 404 either way.
 */
export async function verifyPrintToken(
  secret: string,
  kind: PrintKind,
  id: string,
  token: string | null,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [v, expRaw, sig] = parts;
  if (v !== V) return false;
  // Bounded before it reaches the HMAC, so a megabyte of query string
  // is rejected by a regex rather than by a hash.
  if (!/^\d{1,12}$/.test(expRaw) || !/^[0-9a-f]{64}$/.test(sig)) return false;

  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp * 1000 <= now) return false;

  const expected = await hmacHex(secret, message(kind, id, exp));
  return timingSafeEqual(sig, expected);
}
