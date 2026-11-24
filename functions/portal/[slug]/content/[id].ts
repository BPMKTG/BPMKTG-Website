/* ──────────────────────────────────────────────────────────────
   PATCH /portal/<slug>/content/<id> — the client edits one card.

   The id comes from the URL, which means it comes from whoever is
   asking. So before anything is written, the page is fetched and its
   Client relation is checked against this slug's client, and its
   Hide from Client flag is checked again. A row that fails either is
   indistinguishable from a row that does not exist.
   ────────────────────────────────────────────────────────────── */

import { cardUrl, statusNotice } from '../../../../src/data/push';
import { portalNotFound } from '../../../../src/server/portal-auth';
import {
  fetchOwnedContent,
  syncStepFromCard,
  updateContentPage,
} from '../../../../src/server/portal-notion';
import { buildContentProperties, editedBy, stampEdit } from '../../../../src/server/portal-write';
import { skipStepsOfPiece } from '../../../../src/server/pieces';
import { attachSlides } from '../../../../src/server/slides';
import { notifyAdmins, notifyProgress, notifyReview, type PushEnv } from '../../../../src/server/push';
import type { VaultDbEnv } from '../../../../src/server/vault-db';
import { logPostedUses } from '../../../../src/server/vault-sync';
import {
  beginWrite,
  bustDataCache,
  writeOk,
  type WriteEnv,
} from '../../../../src/server/portal-write-shared';

type Env = WriteEnv & PushEnv & VaultDbEnv & { REPORTS_BUCKET?: R2Bucket };

/** A Notion page id, dashed or not. Anything else never reaches the
 *  API: a path segment is not a safe thing to put in a URL. */
const ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params, waitUntil }) => {
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
    // request, is what decides which moves are legal. So are Posted By
    // and Source: a client owns a row they post, campaign or no
    // campaign, and only a card they film can come back out of
    // Filmed. All three off the page.
    currentStatus: owned.item.status,
    postedBy: owned.item.postedBy,
    source: owned.item.source,
    role: ctx.viewer.role,
    freeBuckets: ctx.record.type.features.ownBuckets,
    // A note is added to the thread as Notion holds it, and dated by
    // us. Neither is the request's to say.
    currentFeedback: owned.item.feedback,
    today: new Date().toISOString().slice(0, 10),
  });

  if (rejected.length) console.error('portal: content patch dropped fields', ctx.slug, rejected.join(','));
  // Nothing survived validation. The row is untouched and the client
  // is told nothing changed, rather than being shown a false "Saved".
  if (!Object.keys(properties).length) {
    await attachSlides(env.REPORTS_BUCKET, [owned.item], () => ctx.slug, { admin: ctx.viewer.role === 'admin' });
    return writeOk({ ok: true, item: owned.item, changed: false });
  }

  const item = await updateContentPage(env.NOTION_TOKEN, id, stampEdit(properties, ctx.viewer.role));
  if (!item) return portalNotFound();
  // The answer replaces the card on the page, so it carries the
  // card's slides the same as the first load did.
  await attachSlides(env.REPORTS_BUCKET, [item], () => ctx.slug, { admin: ctx.viewer.role === 'admin' });

  // The campaign step this card hangs off follows it across the Posted
  // line, in either direction. Only when the line was actually
  // crossed: a save that touches a caption must not re-tick anything.
  const wasPosted = owned.item.status === 'Posted';
  const nowPosted = item.status === 'Posted';
  if (wasPosted !== nowPosted && item.campaign.length) {
    const touched = await syncStepFromCard(
      env.NOTION_TOKEN, ctx.record.pageId, item.campaign, nowPosted,
      editedBy(ctx.viewer.role),
    );
    if (touched.length) console.log('portal: card', nowPosted ? 'posted' : 'un-posted',
      'synced step(s)', touched.join(','));
  }

  // The Content Vault's usage log follows the same line: a file this
  // card uses is Used once the card is Posted, and not if it comes
  // back out. After the answer, and it changes nothing about the card.
  // A moment's pause first, so the pipeline it reads has caught up
  // with the save. A deployment with no Vault does nothing here.
  if (wasPosted !== nowPosted && env.VAULT_DB) {
    waitUntil((async () => {
      await new Promise((r) => setTimeout(r, 1500));
      await logPostedUses(env, ctx.record);
    })());
  }

  // A piece that is dropped takes its step with it, when it was the
  // last piece the step had. A flyer step with three rows is only out
  // of the plan when all three are.
  if (owned.item.status !== 'Skipped' && item.status === 'Skipped' && item.campaign.length) {
    try {
      const gone = await skipStepsOfPiece(
        env.NOTION_TOKEN, ctx.record.pageId, item.campaign, editedBy(ctx.viewer.role));
      if (gone.length) console.log('portal: card skipped, so skipped step(s)', gone.join(','));
    } catch (err) {
      console.error('portal: a card was skipped but its step was not', id, err);
    }
  }

  await bustDataCache(ctx.slug, env);

  // Notifications, after the answer and never instead of it. Each is
  // about a MOVE, read off the status before and after this save, so
  // a caption, a date or a note changed on a card says nothing. It is
  // always the other side that is told: see statusNotice.
  const notice = statusNotice(ctx.viewer.role, owned.item.status, item.status);
  if (notice?.to === 'client' && notice.kind === 'review') {
    waitUntil(notifyReview(env, ctx.slug, [{ id: item.id, title: item.title }]));
  } else if (notice?.to === 'client') {
    waitUntil(notifyProgress(env, ctx.slug, [{
      id: item.id, title: item.title, label: notice.label, url: cardUrl(ctx.slug, item.id),
    }]));
  } else if (notice?.to === 'admin') {
    waitUntil(notifyAdmins(env, notice.kind, {
      client: ctx.record.client.artist, slug: ctx.slug, item: item.title, id: item.id, status: item.status,
    }));
  }
  return writeOk({ ok: true, item, changed: true });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'PATCH') return next();
  return portalNotFound();
};
