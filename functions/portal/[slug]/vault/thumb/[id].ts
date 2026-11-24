/* ──────────────────────────────────────────────────────────────
   GET /portal/<slug>/vault/thumb/<file>   a thumbnail, made if need be.

   A grid asks our preview route for a thumbnail it knows the version
   of. It asks here for one that has not been made yet, and for one
   whose address did not answer. Either way the picture is made from
   Drive's own small drawing of the file, kept, and sent.

   Behind the same sign-in as everything else, and private: it may be
   kept by this person's browser and by nothing in between.
   ────────────────────────────────────────────────────────────── */

import { isVaultId } from '../../../../../src/data/vault';
import { portalNotFound } from '../../../../../src/server/portal-auth';
import { overLimit } from '../../../../../src/server/portal-write-shared';
import { beginVault, thumbFor, type VaultRouteEnv } from '../../../../../src/server/vault';

export const onRequestGet: PagesFunction<VaultRouteEnv> = async ({ request, env, params }) => {
  const id = String(params.id ?? '');
  if (!isVaultId(id) || !env.REPORTS_BUCKET) return portalNotFound();
  const begun = await beginVault(request, env, params.slug, { post: false });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  if (await overLimit('vt', ctx.slug, 4000, 600)) return portalNotFound();
  const made = await thumbFor(env, ctx, id);
  const object = made ? await env.REPORTS_BUCKET.get(made.key) : null;
  if (!object) return portalNotFound();
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType || 'image/jpeg',
      'Content-Length': String(object.size),
      // Short, because this address has no version in it: the grid
      // moves to the versioned one the next time it loads.
      'Cache-Control': 'private, max-age=600',
      'Content-Disposition': 'inline',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
    },
  });
};

export const onRequest: PagesFunction<VaultRouteEnv> = async ({ request, next }) => {
  if (request.method === 'GET') return next();
  return portalNotFound();
};
