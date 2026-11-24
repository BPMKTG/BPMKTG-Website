/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/vault/announce   "Announce delivery".

     { show: "Revival After Dark" }

   Tells the client "Your Revival After Dark media is ready", on the
   devices where they have turned notifications on. Ours only, and
   only ever because one of us tapped the button: nothing else in the
   Vault says anything to a client. A sync that finds two hundred
   files tells us, not them.

   A show with no files in the Vault is not announced. If none of the
   client's devices could be told, the answer says so and nothing is
   recorded as announced.
   ────────────────────────────────────────────────────────────── */

import { MAX_SHOW_CHARS } from '../../../../src/data/vault';
import { portalNotFound } from '../../../../src/server/portal-auth';
import { overLimit } from '../../../../src/server/portal-write-shared';
import { notifyMediaReady } from '../../../../src/server/push';
import { beginVault, vaultJson, vaultRecord, vaultRefuse, type VaultRouteEnv } from '../../../../src/server/vault';
import { markAnnounced, showFileCount } from '../../../../src/server/vault-db';

export const onRequestPost: PagesFunction<VaultRouteEnv> = async ({ request, env, params }) => {
  const begun = await beginVault(request, env, params.slug, { post: true });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  if (!ctx.admin) return portalNotFound();
  if (await overLimit('va', ctx.slug, 10, 600)) return vaultJson({ ok: false, error: 'slow_down' }, 429);

  const show = typeof ctx.body.show === 'string' ? ctx.body.show.trim().slice(0, MAX_SHOW_CHARS) : '';
  if (!show) return portalNotFound();
  const record = await vaultRecord(env, ctx);
  if (!record) return portalNotFound();
  if (!record.portalEnabled) return vaultRefuse('portal_off', 'This client\'s portal is off, so there is nobody to tell.');
  const files = await showFileCount(ctx.db, ctx.client, show);
  if (!files) return vaultRefuse('empty', 'That show has no files in the Vault.');

  const sent = await notifyMediaReady(env, ctx.slug, show);
  if (!sent) {
    return vaultJson({
      ok: true, sent: 0, announced: null,
      message: 'Nobody was told: none of this client\'s devices has notifications turned on.',
    });
  }
  const now = Date.now();
  await markAnnounced(ctx.db, ctx.client, show, now);
  return vaultJson({ ok: true, sent, announced: now, files });
};

export const onRequest: PagesFunction<VaultRouteEnv> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
