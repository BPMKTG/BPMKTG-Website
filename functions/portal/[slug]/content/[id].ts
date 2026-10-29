/* ──────────────────────────────────────────────────────────────
   PATCH /portal/<slug>/content/<id> — the client edits one card.

   The id comes from the URL, which means it comes from whoever is
   asking. So before anything is written, the page is fetched and its
   Client relation is checked against this slug's client, and its
   Hide from Client flag is checked again. A row that fails either is
   indistinguishable from a row that does not exist.
   ────────────────────────────────────────────────────────────── */

import { portalNotFound } from '../../../../src/server/portal-auth';
import { fetchOwnedContent, updateContentPage } from '../../../../src/server/portal-notion';
import { buildContentProperties, stampEdit } from '../../../../src/server/portal-write';
import {
  beginWrite,
  bustDataCache,
  writeOk,
  type WriteEnv,
} from '../../../../src/server/portal-write-shared';

/** A Notion page id, dashed or not. Anything else never reaches the
 *  API: a path segment is not a safe thing to put in a URL. */
const ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export const onRequestPatch: PagesFunction<WriteEnv> = async ({ request, env, params }) => {
  const id = String(params.id ?? '');
  if (!ID.test(id)) return portalNotFound();

  const begun = await beginWrite(request, env, params.slug);
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  // beginWrite only skips the schema when asked to, and a content
  // write never asks. Narrowed rather than assumed.
  if (!ctx.schema) return portalNotFound();

  const owned = await fetchOwnedContent(env.NOTION_TOKEN, ctx.record.pageId, id);
  if (!owned) return portalNotFound();

  const { properties, rejected } = buildContentProperties(ctx.body, {
    schema: ctx.schema,
    allowedCampaigns: ctx.allowedCampaigns,
    // The status it is in NOW, read from Notion rather than from the
    // request, is what decides which moves are legal.
    currentStatus: owned.item.status,
  });

  if (rejected.length) console.error('portal: content patch dropped fields', ctx.slug, rejected.join(','));
  // Nothing survived validation. The row is untouched and the client
  // is told nothing changed, rather than being shown a false "Saved".
  if (!Object.keys(properties).length) {
    return writeOk({ ok: true, item: owned.item, changed: false });
  }

  const item = await updateContentPage(env.NOTION_TOKEN, id, stampEdit(properties, ctx.viewer.role));
  if (!item) return portalNotFound();

  await bustDataCache(ctx.slug);
  return writeOk({ ok: true, item, changed: true });
};

export const onRequest: PagesFunction<WriteEnv> = async ({ request, next }) => {
  if (request.method === 'PATCH') return next();
  return portalNotFound();
};
