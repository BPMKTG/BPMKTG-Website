/* ──────────────────────────────────────────────────────────────
   GET /portal/login — the sign-in screen.

   Explicit, rather than left to /portal/[slug], because "login" is a
   slug-shaped word and the door should not depend on which of two
   routes Pages decides is more specific.

   Like the portal shell, this is the static page Astro builds, fetched
   through ASSETS so it does not come back through this Function.
   ────────────────────────────────────────────────────────────── */

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

const PAGE = '/portal/login/';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(PAGE, request.url).toString();
  const res = await env.ASSETS.fetch(new Request(url, { method: 'GET' }));

  return new Response(res.body, {
    status: res.ok ? 200 : 404,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
      'Referrer-Policy': 'no-referrer',
    },
  });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'HEAD') return next();
  return new Response(null, { status: 405 });
};
