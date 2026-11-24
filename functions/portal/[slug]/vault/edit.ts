/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/vault/edit   change one file, or many.

     { ids: [...], star: true }
     { ids: [...], tagsAdd: ["crowd"], tagsRemove: ["blurry"] }
     { ids: [...], notes: "..." }

   and, from one of us only:

     { ids: [...], rating: "Hero" }        or null to clear
     { ids: [...], source: "Phone" }
     { ids: [...], type: "Graphic" }
     { ids: [...], show: "Revival After Dark" }
     { ids: [...], confirmShow: true }     take each file's guess
     { ids: [...], hold: { kind, id } }    or null to let go
     { ids: [...], used: true }
     { ids: [...], madeFrom: { id, on } }

   Who may change what is decided by the signed session and the list
   in src/data/vault.ts, never by the request. A field that is not
   the asker's is dropped; if nothing is left, nothing is written and
   the answer says so. The ids are only ever matched against this
   client's own rows, so an id from another Vault changes nothing.
   ────────────────────────────────────────────────────────────── */

import { cleanIds, cleanVaultEdit } from '../../../../src/data/vault';
import { portalNotFound } from '../../../../src/server/portal-auth';
import { fetchPage, readSelect } from '../../../../src/server/portal-notion';
import { overLimit } from '../../../../src/server/portal-write-shared';
import {
  beginVault, editNeedsNotion, holdTarget, vaultJson, vaultRecord, vaultRefuse, type VaultRouteEnv,
} from '../../../../src/server/vault';
import { editFiles, filesById, setMadeFrom, type HoldTarget } from '../../../../src/server/vault-db';
import { logPostedUses } from '../../../../src/server/vault-sync';

export const onRequestPost: PagesFunction<VaultRouteEnv> = async ({ request, env, params, waitUntil }) => {
  const begun = await beginVault(request, env, params.slug, { post: true });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  if (await overLimit('ve', ctx.slug, 240, 60)) return vaultJson({ ok: false, error: 'slow_down' }, 429);

  const ids = cleanIds(ctx.body.ids);
  if (!ids) return portalNotFound();
  const { edit, rejected } = cleanVaultEdit(ctx.body, ctx.viewer.role);
  if (rejected.length) console.error('vault: edit dropped fields', ctx.slug, ctx.viewer.role, rejected.join(','));
  if (!Object.keys(edit).length) return vaultJson({ ok: true, changed: 0, files: [] });

  const now = Date.now();
  let hold: HoldTarget | null = null;
  if (editNeedsNotion(edit)) {
    const record = await vaultRecord(env, ctx);
    if (!record) return portalNotFound();
    if (edit.hold) {
      hold = await holdTarget(env.NOTION_TOKEN, record, edit.hold);
      if (!hold) return vaultRefuse('hold', 'That post or campaign is not one of this client\'s any more.');
    }
    if (edit.madeFrom) {
      const post = await holdTarget(env.NOTION_TOKEN, record, { kind: 'item', id: edit.madeFrom.id });
      if (!post) return vaultRefuse('post', 'That post is not one of this client\'s any more.');
      await setMadeFrom(ctx.db, ctx.client, ids, { id: post.id, title: post.title }, edit.madeFrom.on, now);
      // If the post is already out, the log should say so now.
      const page = await fetchPage(env.NOTION_TOKEN, post.id);
      if (readSelect(page?.properties?.['Status']) === 'Posted') {
        waitUntil(logPostedUses(env, record));
      }
    }
  }

  const changed = await editFiles(ctx.db, ctx.client, ids, edit, { now, hold, today: new Date(now).toISOString().slice(0, 10) });
  // The files as they now stand, so the page shows what was saved
  // rather than what it hoped was.
  const files = await filesById(ctx.db, ctx.client, ids, { admin: ctx.admin });
  return vaultJson({ ok: true, changed, files });
};

export const onRequest: PagesFunction<VaultRouteEnv> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
