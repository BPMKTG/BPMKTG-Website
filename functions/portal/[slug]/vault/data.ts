/* ──────────────────────────────────────────────────────────────
   GET /portal/<slug>/vault/data   one client's Content Vault.

   Every file, the usage log, and where the sync is. Sent whole: a
   client has a few thousand files at most, and with all of them on
   the page a filter is a keystroke rather than a request.

   A client is sent their own files and nothing that is ours: not
   what a file is held for, not which files are waiting on a show,
   not the folders' links, not the address folders are shared with.
   ────────────────────────────────────────────────────────────── */

import { portalNotFound } from '../../../../src/server/portal-auth';
import { beginVault, vaultJson, type VaultRouteEnv } from '../../../../src/server/vault';
import { announcedShows, listFiles, listMade, listUses, syncRow } from '../../../../src/server/vault-db';
import { serviceAccountEmail } from '../../../../src/server/google-drive';
import { syncStatus } from '../../../../src/server/vault-sync';

export const onRequestGet: PagesFunction<VaultRouteEnv> = async ({ request, env, params }) => {
  const begun = await beginVault(request, env, params.slug, { post: false });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  const [files, uses, row, announced, made] = await Promise.all([
    listFiles(ctx.db, ctx.client, { admin: ctx.admin }),
    listUses(ctx.db, ctx.client),
    syncRow(ctx.db, ctx.client),
    announcedShows(ctx.db, ctx.client),
    ctx.admin ? listMade(ctx.db, ctx.client) : Promise.resolve([]),
  ]);
  const status = syncStatus(row, { now: Date.now(), admin: ctx.admin, email: ctx.admin ? serviceAccountEmail(env) : null });
  return vaultJson({
    ok: true,
    role: ctx.viewer.role,
    slug: ctx.slug,
    files,
    uses,
    announced,
    // A client is told when their Vault was last brought up to date.
    sync: ctx.admin ? status : { okAt: status.okAt, never: status.never },
    ...(ctx.admin ? { made } : {}),
  });
};

export const onRequest: PagesFunction<VaultRouteEnv> = async ({ request, next }) => {
  if (request.method === 'GET') return next();
  return portalNotFound();
};
