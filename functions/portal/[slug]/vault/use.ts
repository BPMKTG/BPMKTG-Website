/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/vault/use   "Use in a post".

     { ids: [<file>, ...], title?: "..." }

   Makes an Idea in this client's Content Pipeline: one file attached
   to it, or several as its slides in the order given. A client makes
   one in their own pipeline and nowhere else; so does one of us
   standing in their Vault.

   This is the one place the Vault writes outside itself, and all it
   ever makes is a new Idea. It changes no existing card, stage,
   campaign or playbook, and the Idea it makes is the client's to
   post, so it is not counted toward what we owe in a month.
   ────────────────────────────────────────────────────────────── */

import { MAX_USE_IDS, cleanIds } from '../../../../src/data/vault';
import { portalNotFound } from '../../../../src/server/portal-auth';
import { overLimit } from '../../../../src/server/portal-write-shared';
import { notifyAdmins } from '../../../../src/server/push';
import { beginVault, useInPost, vaultJson, vaultRecord, vaultRefuse, type VaultRouteEnv } from '../../../../src/server/vault';
import { filesById } from '../../../../src/server/vault-db';

export const onRequestPost: PagesFunction<VaultRouteEnv> = async ({ request, env, params, waitUntil }) => {
  const begun = await beginVault(request, env, params.slug, { post: true });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  if (await overLimit('vu', ctx.slug, 20, 600)) return vaultJson({ ok: false, error: 'slow_down' }, 429);

  if (Array.isArray(ctx.body.ids) && ctx.body.ids.length > MAX_USE_IDS) {
    return vaultRefuse('too_many', `A post holds up to ${MAX_USE_IDS} files. Pick fewer.`);
  }
  const ids = cleanIds(ctx.body.ids, MAX_USE_IDS);
  if (!ids) return portalNotFound();
  const record = await vaultRecord(env, ctx);
  if (!record || !record.portalEnabled) return portalNotFound();

  // The files as the Vault holds them. The request names ids; which
  // Drive file each one is comes from our own record.
  const files = await filesById(ctx.db, ctx.client, ids, { admin: true });
  if (!files.length) return portalNotFound();
  const out = await useInPost(env, ctx, record, files, ctx.body.title);
  if (!out.ok) return vaultRefuse(out.error, out.message, out.error === 'try_later' ? 502 : 400);

  // A client added something of their own. We are told, the same as
  // for any idea they add.
  if (ctx.viewer.role === 'client') {
    waitUntil(notifyAdmins(env, 'idea', { client: record.client.artist, slug: ctx.slug, item: out.title, id: out.id }));
  }
  return vaultJson(out);
};

export const onRequest: PagesFunction<VaultRouteEnv> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
