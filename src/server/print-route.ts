/* ──────────────────────────────────────────────────────────────
   The guard both print routes run, and the response they return.

   SERVER ONLY.

   A print route is the one place in this codebase that serves a whole
   client document from a URL with no session in it. That is a
   deliberate hole, and it is exactly this wide:

     a signed token for THIS document, minted in the last ten minutes
     or the admin cookie, if the request carries one

   Note the second one does not fire in production. `bp_admin` has
   Path=/portal, so a browser does not send it to /print, which is a
   narrower cookie than this route would like and a better cookie than
   this route deserves. It is accepted here for a local `wrangler pages
   dev` session and for the day that path changes; the way Mason
   actually opens a preview is the admin Preview endpoint, which checks
   the cookie where it IS sent and then redirects with a token.

   Everything that fails returns the same 404 the portal uses. A print
   route that said "expired token" would be a way to learn that a
   snapshot id is real.
   ────────────────────────────────────────────────────────────── */

import {
  ADMIN_COOKIE_NAME,
  portalNotFound,
  readCookie,
  sessionSecret,
  verifyAdminSession,
} from './portal-auth';
import { isNotionId } from './portal-notion';
import { printSecret, verifyPrintToken, type PrintKind } from './print-token';

export interface PrintEnv {
  NOTION_TOKEN: string;
  PORTAL_SECRET?: string;
  PRINT_SIGNING_SECRET?: string;
}

/**
 * May this request render this document?
 *
 * Returns the validated id, or a 404 response to send back. The id is
 * returned rather than trusted from the caller so there is one place
 * that decides what a page id looks like.
 */
export async function allowPrint(
  request: Request,
  env: PrintEnv,
  kind: PrintKind,
  rawId: unknown,
): Promise<{ ok: true; id: string } | { ok: false; response: Response }> {
  const fail = { ok: false as const, response: portalNotFound() };

  if (!env.NOTION_TOKEN) {
    console.error("print: NOTION_TOKEN isn't set");
    return fail;
  }
  if (typeof rawId !== 'string' || !isNotionId(rawId)) return fail;
  const id = rawId;

  const url = new URL(request.url);
  const token = url.searchParams.get('t');
  if (await verifyPrintToken(printSecret(env), kind, id, token)) {
    return { ok: true, id };
  }

  const admin = await verifyAdminSession(
    sessionSecret(env),
    readCookie(request.headers.get('Cookie'), ADMIN_COOKIE_NAME),
  );
  if (admin) return { ok: true, id };

  return fail;
}

/**
 * One rendered document.
 *
 * `no-store` because the URL carries a token that stops working, and a
 * cached copy would outlive it. `noindex` as well as the meta tag in
 * the page, because a header is the only one a crawler sees on a
 * response it does not parse.
 */
export function printResponse(html: string): Response {
  return new Response(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
