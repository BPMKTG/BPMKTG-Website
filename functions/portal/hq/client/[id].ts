/* ──────────────────────────────────────────────────────────────
   PATCH /portal/hq/client/<id> — Stage, Next Action, Next Action Date.

   Admin only, through the same gate as the rest of HQ. There is no
   client-facing equivalent of this route and there must not be: these
   are our columns about a client, not theirs.

   The id comes from the URL, so it comes from whoever is asking. Being
   an admin is not licence to write any page the Notion token can
   reach: a confused request, or a cross-origin one that somehow got
   past the origin check, could otherwise put a Stage select onto a
   calendar row or a report snapshot. So the page is fetched first and
   its parent database is checked against Clients. Anything else is the
   portal's 404.

   Only three fields, and the whitelist in hq-write.ts decides which
   Notion property each one touches. Every write stamps Last Edited By
   = Blueprint through the shared editedBy(), because a Notion board
   that cannot tell our edits from the client's is a board nobody
   trusts.
   ────────────────────────────────────────────────────────────── */

import { beginHq, hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { buildHqClientProperties } from '../../../../src/server/hq-write';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import {
  CLIENTS_DB,
  fetchPage,
  normaliseNotionId,
  patchPage,
  readText,
} from '../../../../src/server/portal-notion';
import { isJsonRequest, isSameOrigin, readJsonBody, stampEdit } from '../../../../src/server/portal-write';

/** A Notion page id, dashed or not. Anything else never reaches the
 *  API: a path segment is not a safe thing to put in a URL. */
const ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

interface Env extends HqEnv, HqDataEnv {}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;

  // The gate proves who is asking. These two prove the asking came
  // from our own page rather than from somebody else's, which is the
  // part a cookie alone cannot tell us.
  if (!isSameOrigin(request) || !isJsonRequest(request)) return portalNotFound();

  const id = String(params.id ?? '');
  if (!ID.test(id)) return portalNotFound();

  const body = await readJsonBody(request);
  if (!body) return portalNotFound();

  const { properties, rejected } = buildHqClientProperties(body);
  // A patch that named nothing we write is not a patch. Reporting the
  // rejections rather than a bare 404 matters here: this endpoint is
  // only ever called by our own page, so a rejection is a bug in it.
  if (!Object.keys(properties).length) {
    return hqJson({ ok: false, error: 'nothing_to_write', rejected }, 400);
  }

  const page = await fetchPage(env.NOTION_TOKEN, id);
  if (!page) return portalNotFound();
  const parent = String(page?.parent?.database_id ?? '');
  if (!parent || normaliseNotionId(parent) !== normaliseNotionId(CLIENTS_DB)) {
    console.error('hq: refused a client write to a page outside Clients', id);
    return portalNotFound();
  }

  const saved = await patchPage(
    env.NOTION_TOKEN, id, stampEdit(properties, 'admin'), 'hq client',
  );
  if (!saved) return hqJson({ ok: false, error: 'write_failed' }, 502);

  // Both caches. HQ's because every tab reads this row, and the
  // client's own portal because Stage is one of the fields it shows.
  const slug = (readText(page?.properties?.['Intake Slug']) ?? '').trim().toLowerCase();
  await Promise.all([dropHq(env), slug ? dropPortalData(slug) : Promise.resolve()]);

  return hqJson({ ok: true, id, rejected });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'PATCH') return next();
  return portalNotFound();
};
