/* ──────────────────────────────────────────────────────────────
   GET /portal/<slug>/vault/moment/<moment>   one Moment's files.

   The Vault files linked to one Moment in the Campaign Calendar, for
   the Moment's own drawer in HQ: what there is, and its gaps strip.
   Behind the same sign-in as the rest of the Vault. The files are
   only ever this slug's client's, whatever id is asked for, and a
   file is only ever linked to a Moment that client can see.
   ────────────────────────────────────────────────────────────── */

import { notionHex } from '../../../../../src/data/vault';
import { portalNotFound } from '../../../../../src/server/portal-auth';
import { beginVault, vaultJson, type VaultRouteEnv } from '../../../../../src/server/vault';
import { filesOfMoment } from '../../../../../src/server/vault-db';

export const onRequestGet: PagesFunction<VaultRouteEnv> = async ({ request, env, params }) => {
  const id = notionHex(String(params.id ?? ''));
  if (!id) return portalNotFound();
  const begun = await beginVault(request, env, params.slug, { post: false });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  const files = await filesOfMoment(ctx.db, ctx.client, id, { admin: ctx.admin });
  return vaultJson({ ok: true, files });
};

export const onRequest: PagesFunction<VaultRouteEnv> = async ({ request, next }) => {
  if (request.method === 'GET') return next();
  return portalNotFound();
};
