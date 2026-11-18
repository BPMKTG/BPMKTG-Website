/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/content — the client creates an idea.

   The only fields a new row can carry are the ones in
   CLIENT_EDITABLE. Everything that says WHOSE row it is and WHERE it
   came from is set here, not by the request: Client is this slug's
   client, Source is Client Films, Posted By is Client, Last Edited By
   is Client. A request that tries to set them is ignored.

   One of us can also create a piece that is ours to post, from the
   month counter. That is decided by the signed session, in
   newContentOwner.
   ────────────────────────────────────────────────────────────── */

import { portalNotFound } from '../../../../src/server/portal-auth';
import { createContentPage } from '../../../../src/server/portal-notion';
import { buildContentProperties, newContentOwner, stampEdit } from '../../../../src/server/portal-write';
import {
  beginWrite,
  bustDataCache,
  writeOk,
  type WriteEnv,
} from '../../../../src/server/portal-write-shared';

export const onRequestPost: PagesFunction<WriteEnv> = async ({ request, env, params }) => {
  const begun = await beginWrite(request, env, params.slug);
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  // beginWrite only skips the schema when asked to, and a content
  // write never asks. Narrowed rather than assumed.
  if (!ctx.schema) return portalNotFound();

  const { properties, rejected } = buildContentProperties(ctx.body, {
    schema: ctx.schema,
    allowedCampaigns: ctx.allowedCampaigns,
    // A new row has no status yet, so canClientMove only lets the
    // request ask for Idea or Planned.
    currentStatus: null,
    role: ctx.viewer.role,
    freeBuckets: ctx.record.type.features.ownBuckets,
  });

  // "Add a piece", from the month counter in HQ: a row that is OURS to
  // make and post. Only one of us can ask for it, and it is the session
  // that says so, not the body: a client sending `piece: true` gets an
  // idea of their own like any other request.
  const owner = newContentOwner(ctx.viewer.role, ctx.body);
  const ours = owner.ours;

  // A card with no title is not a card. Everything else is optional.
  if (!properties['Content']) return portalNotFound();
  if (rejected.length) console.error('portal: content create dropped fields', ctx.slug, rejected.join(','));

  // Dated means planned, undated means idea. The client does not have
  // to think about status at all to add something to the well.
  if (!properties['Status']) {
    // The quick-add form always sends both date keys, empty or not, so
    // the property is present either way. It is the start date inside
    // it that says whether this is planned or still just an idea.
    const hasDate = (prop: any) => !!prop?.date?.start;
    const dated = hasDate(properties['Post Date']) || hasDate(properties['Film By']);
    properties['Status'] = { select: { name: dated ? 'Planned' : 'Idea' } };
  }

  // A piece that counts has to be dated, or it is in no month at all.
  if (ours && !(properties['Post Date'] as any)?.date?.start) return portalNotFound();

  const item = await createContentPage(env.NOTION_TOKEN, {
    ...stampEdit(properties, ctx.viewer.role),
    Client: { relation: [{ id: ctx.record.pageId }] },
    ...owner.properties,
    'Hide from Client': { checkbox: false },
  });

  if (!item) return portalNotFound();
  await bustDataCache(ctx.slug, env);
  return writeOk({ ok: true, item });
};

export const onRequest: PagesFunction<WriteEnv> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
