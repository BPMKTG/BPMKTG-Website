/* ──────────────────────────────────────────────────────────────
   GET /portal/hq — the Blueprint HQ shell.

   Unlike the client portal, which serves the same HTML for every slug
   precisely so the URL gives nothing away, this one is gated at the
   shell: a non-admin gets the portal's 404 and never learns there is
   an HQ here at all.

   The markup itself is the static page Astro builds at /portal/hq-ui/,
   fetched through the ASSETS binding. It holds no data. Everything
   real arrives from /portal/hq/data, which runs the same gate again,
   because a shell that leaked would still be an empty frame.

   This file sits at functions/portal/hq/ so it wins over the
   [slug] route next door: a literal path segment beats a parameter.
   ────────────────────────────────────────────────────────────── */

import { beginHq, type HqEnv } from '../../../src/server/hq-auth';

interface Env extends HqEnv {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

const SHELL = '/portal/hq-ui/';
const SIGN_IN = '/portal/login/';

/**
 * The sign-in screen, in place, for anyone not signed in as one of us.
 *
 * It used to be a 404. The installed HQ app opens here with no
 * session the first time (a home-screen app on an iPhone does not
 * share Safari's sign-in), and a 404 there is a dead end with no way
 * to sign in. Showing the sign-in screen gives nothing away: every
 * other address under /portal/, real or invented, already leads to
 * this same screen. It is the page /portal/login serves, so it links
 * the client app's manifest, never HQ's.
 */
async function signIn(request: Request, env: Env): Promise<Response> {
  const res = await env.ASSETS.fetch(new Request(new URL(SIGN_IN, request.url).toString(), { method: 'GET' }));
  return new Response(res.body, {
    status: res.ok ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
    },
  });
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return signIn(request, env);

  const shellUrl = new URL(SHELL, request.url).toString();
  const res = await env.ASSETS.fetch(new Request(shellUrl, { method: 'GET' }));
  if (!res.ok) {
    console.error('hq: the shell asset is missing, which is a broken deploy');
    return new Response('HQ is not built', { status: 500 });
  }

  return new Response(res.body, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'Referrer-Policy': 'no-referrer',
    },
  });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'HEAD') return next();
  return new Response(null, { status: 405 });
};
