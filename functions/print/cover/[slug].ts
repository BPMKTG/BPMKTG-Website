/* ──────────────────────────────────────────────────────────────
   GET /print/cover/<slug> — the stored cover photo for one client.

   Exists for one reason: the thing that renders a report is a headless
   browser in Cloudflare's network, and it carries none of our cookies.
   It can be handed a signed URL for the page, so it also has to be
   handed one for the page's <img>, or the cover is a grey rectangle in
   every PDF we produce.

   Narrow on purpose. The caller names a client, not a file. Which
   object is served comes out of that client's cover pointer in R2, so
   there is no key in this URL: nothing to traverse, nothing to
   enumerate, and no way to ask for another client's anything. A slug
   with no stored cover is a 404, which is also what the template
   wants, since the fallback is to draw the grid.
   ────────────────────────────────────────────────────────────── */

import { readCoverPointer, type CoverEnv } from '../../../src/server/cover';
import { allowPrintCover, type PrintEnv } from '../../../src/server/print-route';
import { portalNotFound } from '../../../src/server/portal-auth';

interface Env extends PrintEnv, CoverEnv {}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const gate = await allowPrintCover(request, env, params.slug);
  if (!gate.ok) return gate.response;

  if (!env.REPORTS_BUCKET) {
    console.error('print: REPORTS_BUCKET is not bound, no cover can be served');
    return portalNotFound();
  }

  const pointer = await readCoverPointer(env, gate.slug);
  if (!pointer?.key) return portalNotFound();

  const object = await env.REPORTS_BUCKET.get(pointer.key);
  if (!object) {
    // The pointer outlived the object. Not an error worth failing a
    // render over: the template falls back to the grid.
    console.warn('print: cover pointer names a missing object', gate.slug, pointer.key);
    return portalNotFound();
  }

  return new Response(object.body, {
    headers: {
      // What Drive actually sent, which is a JPEG in practice but is
      // whatever it is. Never sniffed, never guessed from the key.
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
