/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/vault/open/<file>   open one file.

     {}                 its web-sized picture, made now if this is
                        the first time anyone has opened it. For a
                        video that is the poster
     { play: true }     and convert the video, one step per call.
                        The page asks again while it waits
     { verify: true }   "I tried to show that and could not": the
                        copies are checked and made again if gone
     { retry: true }    ours only: convert it again from the start

   The files themselves are served by /portal/<slug>/preview/..., the
   same route and the same sign-in every other preview uses. A video
   longer than five minutes is not converted because someone tapped
   Play: it shows its poster and "Open original".
   ────────────────────────────────────────────────────────────── */

import { isVaultId } from '../../../../../src/data/vault';
import { portalNotFound } from '../../../../../src/server/portal-auth';
import { overLimit } from '../../../../../src/server/portal-write-shared';
import { beginVault, openFile, vaultJson, type VaultRouteEnv } from '../../../../../src/server/vault';

export const onRequestPost: PagesFunction<VaultRouteEnv> = async ({ request, env, params }) => {
  const id = String(params.id ?? '');
  if (!isVaultId(id)) return portalNotFound();
  const begun = await beginVault(request, env, params.slug, { post: true });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  // A page that is waiting on a conversion asks every few seconds.
  if (await overLimit('vo', ctx.slug, 400, 600)) return vaultJson({ ok: false, error: 'slow_down' }, 429);
  const out = await openFile(env, ctx, id, {
    play: ctx.body.play === true, verify: ctx.body.verify === true, retry: ctx.body.retry === true,
  });
  return out ? vaultJson(out) : portalNotFound();
};

export const onRequest: PagesFunction<VaultRouteEnv> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
