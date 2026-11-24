/* ──────────────────────────────────────────────────────────────
   GET /portal/start — where the installed app opens.

   The client app's start address. It shows nothing: it sends the
   device on.

     its last portal      when the device carries the routing hint
     HQ                   when one of us is signed in and there is none
     the sign-in screen   otherwise

   The hint is a slug and only a slug (see lastSlugCookie). Nothing is
   opened here and nothing is decided here: the portal it points at
   checks the session itself and sends anyone without the right one to
   the sign-in screen, the same as it does for a typed address.

   Every address this can send someone to is under /portal/, so the
   app never leaves its own window on the way in.
   ────────────────────────────────────────────────────────────── */

import { hqViewer, type HqEnv } from '../../src/server/hq-auth';
import { LAST_COOKIE_NAME, readCookie, startTarget } from '../../src/server/portal-auth';

export const onRequestGet: PagesFunction<HqEnv> = async ({ request, env }) => {
  const hint = readCookie(request.headers.get('Cookie'), LAST_COOKIE_NAME);
  let admin = false;
  try { admin = !!env.NOTION_TOKEN && !!(await hqViewer(request, env)); } catch { admin = false; }
  return new Response(null, {
    status: 302,
    headers: {
      Location: startTarget(hint, admin),
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
};

export const onRequest: PagesFunction<HqEnv> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'HEAD') return next();
  return new Response(null, { status: 405 });
};
