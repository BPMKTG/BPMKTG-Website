/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/logout — put the cookies out.

   Clears both: a client has only their own, an admin has only the
   admin one, and clearing a cookie that was never set costs nothing.
   Guessing which one is there is how a log-out leaves someone logged
   in on a shared laptop.

   Takes no body and checks no session. There is nothing to protect:
   the worst a forged request can do is sign someone out.
   ────────────────────────────────────────────────────────────── */

import {
  clearCookies,
  isValidSlug,
  normaliseSlug,
  portalNotFound,
} from '../../../src/server/portal-auth';

export const onRequestPost: PagesFunction<unknown> = async ({ params }) => {
  const slug = normaliseSlug(params.slug as string);
  if (!isValidSlug(slug)) return portalNotFound();

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  });
  for (const c of clearCookies(slug)) headers.append('Set-Cookie', c);

  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};

export const onRequest: PagesFunction<unknown> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
