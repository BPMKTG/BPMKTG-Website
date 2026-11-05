/* ──────────────────────────────────────────────────────────────
   The gate on Blueprint HQ.

   SERVER ONLY.

   HQ is not a portal with extra buttons. It is every client at once:
   rates, pipeline, leads, what each of them owes us. A client session
   must not reach it, and neither must an admin cookie belonging to
   somebody who has since been taken off the list.

   So the check is two things, not one:

     the bp_admin cookie      signed, unexpired, and ours
     ADMIN_EMAILS             the address inside it, still listed

   The second is what makes removal work. The cookie lasts thirty days
   and nothing revokes it; checking the address against the secret on
   every request means taking a name out of ADMIN_EMAILS locks them
   out of HQ on their next click rather than next month.

   Failure is the portal's 404, the same one a stranger gets for a
   client that does not exist. HQ does not announce itself.
   ────────────────────────────────────────────────────────────── */

import { parseAdminEmails } from './portal-login';
import {
  ADMIN_COOKIE_NAME,
  portalNotFound,
  readCookie,
  sessionSecret,
  sha256Hex,
  verifyAdminSession,
} from './portal-auth';

/** How much of the email hash the session carries. Set by
 *  functions/portal/login/verify.ts, which signs `emailHash.slice(0,
 *  16)`; a test holds the two together. */
export const HANDLE_CHARS = 16;

export interface HqEnv {
  NOTION_TOKEN: string;
  PORTAL_SECRET?: string;
  ADMIN_EMAILS?: string;
}

export interface HqViewer {
  /** The handle carried in the cookie: the first 16 hex of the
   *  address's SHA-256. The address itself is never in a cookie. */
  who: string;
  /** The ADMIN_EMAILS entry it matched, so HQ can say whose session
   *  this is. Admin-only payload, and it never leaves this gate. */
  email: string;
}

/**
 * The admin behind this request, or null.
 *
 * Deliberately not `readViewer`: that one falls back to a client
 * session, which is exactly what must never open HQ.
 */
export async function hqViewer(
  request: Request, env: HqEnv, now = Date.now(),
): Promise<HqViewer | null> {
  const token = readCookie(request.headers.get('Cookie'), ADMIN_COOKIE_NAME);
  const who = await verifyAdminSession(sessionSecret(env), token, now);
  if (!who) return null;

  // An admin cookie is only ever minted for a listed address, so this
  // is about the list having CHANGED since. Without it, taking
  // somebody off ADMIN_EMAILS does nothing for a month.
  //
  // The cookie carries a handle, not an address: the first 16 hex of
  // the SHA-256, the same slice login signs in. So the list is hashed
  // to meet it rather than the other way round, and HQ never needs
  // the address to be in a cookie to know whose session this is.
  const admins = parseAdminEmails(env.ADMIN_EMAILS);
  if (!admins.length) {
    console.error('hq: ADMIN_EMAILS is not set, so nobody can open HQ');
    return null;
  }

  for (const email of admins) {
    const handle = (await sha256Hex(email)).slice(0, HANDLE_CHARS);
    if (handle === who) return { who, email };
  }

  console.warn('hq: a valid admin cookie for an address no longer listed');
  return null;
}

/** The gate, as one call. Returns the viewer or the response to send. */
export async function beginHq(
  request: Request, env: HqEnv,
): Promise<{ ok: true; viewer: HqViewer } | { ok: false; response: Response }> {
  if (!env.NOTION_TOKEN) {
    console.error("hq: NOTION_TOKEN isn't set");
    return { ok: false, response: portalNotFound() };
  }
  const viewer = await hqViewer(request, env);
  if (!viewer) return { ok: false, response: portalNotFound() };
  return { ok: true, viewer };
}

/** A JSON answer from HQ. Never cached by the browser: everything in
 *  here is somebody's rate or somebody's pipeline. */
export function hqJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
