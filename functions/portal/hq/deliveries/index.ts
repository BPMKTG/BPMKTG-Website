/* ──────────────────────────────────────────────────────────────
   /portal/hq/deliveries — what we owe a client who posts for
   themselves: photo sets and footage batches.

     POST   { clientId, title, kind, momentId?, due? }   add one
     PATCH  { id, stage?, link?, title?, due?, drop? }    change one

   Admin only. A client reads their deliveries on their Content tab
   and changes nothing: every stage of a delivery is our work.

   Only for a client whose type has deliveries (see
   src/data/client-types.ts). An artist's month is counted in posts,
   and a delivery row on an artist would be a piece the month counter
   could not see.

   Nothing in a request names a Notion property. The body is read
   field by field in src/data/deliveries.ts, and a page is only ever
   changed after Notion has been asked again whose it is and whether it
   is a delivery at all.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import {
  createContentPage, fetchOwnedMoment, fetchPage, findClientById, isNotionId,
  readRelation, updateContentPage,
} from '../../../../src/server/portal-notion';
import { beginPlaybookWrite } from '../../../../src/server/playbooks';
import { cleanDeliveryPatch, cleanNewDelivery } from '../../../../src/data/deliveries';
import {
  deliveryPatchProperties, isDeliveryPage, newDeliveryProperties, shapeDelivery,
} from '../../../../src/server/deliveries';

type Env = HqEnv & HqDataEnv & { NOTION_TOKEN: string };

const same = (a: unknown, b: unknown) =>
  String(a ?? '').replace(/-/g, '').toLowerCase() === String(b ?? '').replace(/-/g, '').toLowerCase();

async function forget(env: Env, slug: string | null): Promise<void> {
  await Promise.all([dropHq(env), slug ? dropPortalData(slug) : Promise.resolve()]);
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const begun = await beginPlaybookWrite(request, env);
  if (!begun.ok) return begun.response;
  const { body } = begun;

  const clientId = typeof body.clientId === 'string' && isNotionId(body.clientId) ? body.clientId : null;
  if (!clientId) return hqJson({ ok: false, error: 'invalid', rejected: ['clientId'] }, 400);
  const cleaned = cleanNewDelivery(body, isNotionId);
  if (!cleaned.ok) return hqJson({ ok: false, error: 'invalid', rejected: cleaned.rejected }, 400);

  const client = await findClientById(env.NOTION_TOKEN, clientId);
  if (!client) return portalNotFound();
  if (!client.type.features.deliveries) {
    return hqJson({ ok: false, error: 'not_for_this_client',
      message: 'Deliveries are for clients who post for themselves. This client is counted in posts.' }, 400);
  }
  // The competition it hangs off has to be one of this client's
  // moments. An id from another client, or a step, is refused rather
  // than quietly linked.
  if (cleaned.value.momentId
      && !(await fetchOwnedMoment(env.NOTION_TOKEN, client.pageId, cleaned.value.momentId))) {
    return hqJson({ ok: false, error: 'invalid', rejected: ['momentId'] }, 400);
  }

  const made = await createContentPage(env.NOTION_TOKEN, newDeliveryProperties(cleaned.value, client.pageId));
  if (!made) return hqJson({ ok: false, error: 'notion_write_failed' }, 502);
  await forget(env, client.slug || null);
  return hqJson({ ok: true, id: made.id });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  const begun = await beginPlaybookWrite(request, env);
  if (!begun.ok) return begun.response;
  const { body } = begun;

  const id = typeof body.id === 'string' && isNotionId(body.id) ? body.id : null;
  if (!id) return hqJson({ ok: false, error: 'invalid', rejected: ['id'] }, 400);

  const page = await fetchPage(env.NOTION_TOKEN, id);
  // A post is not a delivery. This endpoint changes a status with no
  // questions asked, which is right for our own deliveries and would
  // be a way round every rule the content board has for a post.
  if (!page || page.object !== 'page' || page.archived || !isDeliveryPage(page)) return portalNotFound();
  const clientId = readRelation(page.properties?.['Client'])[0] ?? null;
  const client = clientId ? await findClientById(env.NOTION_TOKEN, clientId) : null;
  if (!client || !same(client.pageId, clientId)) return portalNotFound();

  const { value, rejected } = cleanDeliveryPatch(body);
  // Dropped, not deleted: it leaves the tracker and stays in Notion.
  if (body.drop === true) value.status = 'Skipped';
  if (rejected.length) return hqJson({ ok: false, error: 'invalid', rejected }, 400);
  const props = deliveryPatchProperties(value);
  if (!Object.keys(props).length) return hqJson({ ok: false, error: 'invalid', rejected: ['nothing'] }, 400);

  const saved = await updateContentPage(env.NOTION_TOKEN, id, props);
  if (!saved) return hqJson({ ok: false, error: 'notion_write_failed' }, 502);
  await forget(env, client.slug || null);
  const after = await fetchPage(env.NOTION_TOKEN, id);
  return hqJson({ ok: true, delivery: after ? shapeDelivery(after) : null });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST' || request.method === 'PATCH') return next();
  return portalNotFound();
};
