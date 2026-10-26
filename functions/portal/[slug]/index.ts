/* ──────────────────────────────────────────────────────────────
   GET /portal/<slug> — the portal shell.

   Serves the SAME html for every slug, real or invented, and checks
   nothing. That is the point: if a real client's portal returned a page
   and an invented slug returned Cloudflare's 404, the URL alone would
   answer "is this artist a Blueprint client?". Whether there is anything
   behind the door is decided by ./auth and ./data, which answer
   identically when there is not.

   The shell is the static page Astro builds at /portal/. It is fetched
   through the ASSETS binding, which goes straight to the asset store
   and does not come back through this Function.
   ────────────────────────────────────────────────────────────── */

interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
}

const SHELL = '/portal/';

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const shellUrl = new URL(SHELL, request.url).toString();
  const res = await env.ASSETS.fetch(new Request(shellUrl, { method: 'GET' }));

  // A missing shell means a broken deploy, not a missing client. Still
  // answers with the same shape rather than leaking a build problem.
  const status = res.ok ? 200 : 404;

  return new Response(res.body, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      // No shared caching: the shell is cheap, and a cached portal URL
      // in an intermediary is a liability for no gain.
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
