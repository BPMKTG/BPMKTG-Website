/* ──────────────────────────────────────────────────────────────
   GET /portal/hq/app.webmanifest — the Blueprint HQ app, for us only.

   A manifest is what makes a page installable, and this one installs
   "Blueprint HQ". It is served to a signed-in admin and to nobody
   else, and it is linked only from the HQ page, so there is no page a
   client can reach that offers it and no address that hands it over.

   Its id is its own, so a phone with both apps holds two apps, not
   one that changed its name. Its scope is all of /portal/ so that a
   client's portal opened from HQ stays inside the HQ window; its
   start address is HQ.

   Its icon is the one thing that is not light: the mark on a dark
   tile with the orange HQ badge, so it is told apart from a client's
   app at a glance on a home screen. Everything else is the portal's
   own: theme_color is the top bar
   (white, see .pt-topbar) and background_color is the page (--pt-bg).
   ────────────────────────────────────────────────────────────── */

import { beginHq, type HqEnv } from '../../../src/server/hq-auth';

export const HQ_MANIFEST = {
  id: '/portal/hq',
  name: 'Blueprint HQ',
  short_name: 'Blueprint HQ',
  description: 'Blueprint HQ.',
  start_url: '/portal/hq',
  scope: '/portal/',
  display: 'standalone',
  orientation: 'any',
  background_color: '#f6f9fc',
  theme_color: '#ffffff',
  icons: [
    { src: '/brand/app/hq-dark-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/brand/app/hq-dark-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/brand/app/hq-dark-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
};

export const onRequestGet: PagesFunction<HqEnv> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  return new Response(JSON.stringify(HQ_MANIFEST), {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'private, no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
};

export const onRequest: PagesFunction<HqEnv> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'HEAD') return next();
  return new Response(null, { status: 405 });
};
