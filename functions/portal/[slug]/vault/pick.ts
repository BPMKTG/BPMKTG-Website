/* ──────────────────────────────────────────────────────────────
   GET /portal/<slug>/vault/pick   what a file can be held for.

   This client's posts and campaigns, for the "Hold for" and "Made
   from" pickers. Ours only: it lists rows we are holding back from
   the client, which is why a client asking gets the portal's 404.
   ────────────────────────────────────────────────────────────── */

import { portalNotFound } from '../../../../src/server/portal-auth';
import { beginVault, pickList, vaultJson, vaultRecord, type VaultRouteEnv } from '../../../../src/server/vault';

export const onRequestGet: PagesFunction<VaultRouteEnv> = async ({ request, env, params }) => {
  const begun = await beginVault(request, env, params.slug, { post: false });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  if (!ctx.admin) return portalNotFound();
  const record = await vaultRecord(env, ctx);
  if (!record) return portalNotFound();
  return vaultJson({ ok: true, ...(await pickList(env.NOTION_TOKEN, record)) });
};

export const onRequest: PagesFunction<VaultRouteEnv> = async ({ request, next }) => {
  if (request.method === 'GET') return next();
  return portalNotFound();
};
