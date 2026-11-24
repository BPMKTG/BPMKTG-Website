/* ──────────────────────────────────────────────────────────────
   /portal/<slug>/vault/sync   bring one client's Vault up to date.

     GET    where the sync is, for a page that is watching one run
     POST   "Sync now". Runs the sync and answers when it is done.
            { more: true } carries on with thumbnails after a sync
            that ran out of room for them

   Ours only: a client asking gets the portal's 404. Drive is read
   and nothing in it is changed (see src/server/vault-drive.ts).
   ────────────────────────────────────────────────────────────── */

import { portalNotFound } from '../../../../src/server/portal-auth';
import { beginVault, vaultJson, vaultRecord, vaultRefuse, type VaultRouteEnv } from '../../../../src/server/vault';
import { serviceAccountEmail } from '../../../../src/server/google-drive';
import { syncRow } from '../../../../src/server/vault-db';
import { syncClient, syncStatus } from '../../../../src/server/vault-sync';

export const onRequestGet: PagesFunction<VaultRouteEnv> = async ({ request, env, params }) => {
  const begun = await beginVault(request, env, params.slug, { post: false });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  if (!ctx.admin) return portalNotFound();
  const row = await syncRow(ctx.db, ctx.client);
  return vaultJson({ ok: true, sync: syncStatus(row, { now: Date.now(), admin: true, email: serviceAccountEmail(env) }) });
};

export const onRequestPost: PagesFunction<VaultRouteEnv> = async ({ request, env, params }) => {
  const begun = await beginVault(request, env, params.slug, { post: true });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  if (!ctx.admin) return portalNotFound();
  const record = await vaultRecord(env, ctx);
  if (!record) return portalNotFound();

  const before = syncStatus(await syncRow(ctx.db, ctx.client), { now: Date.now(), admin: true });
  // Only thumbnails are left from a sync that finished a moment ago:
  // the folders are not listed a second time for them.
  const thumbsOnly = ctx.body.more === true && before.thumbsLeft > 0 && !!before.okAt && Date.now() - before.okAt < 15 * 60 * 1000;
  const out = await syncClient(env, record, { thumbsOnly });
  if (!out.ok) {
    return out.why === 'not_configured'
      ? vaultRefuse('not_configured', out.note, 503)
      : vaultJson({ ok: false, error: 'failed', message: out.note, sync: out.status ?? null }, 502);
  }
  return vaultJson({ ok: true, busy: 'busy' in out, more: out.more, sync: out.status });
};

export const onRequest: PagesFunction<VaultRouteEnv> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'POST') return next();
  return portalNotFound();
};
