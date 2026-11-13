/* ──────────────────────────────────────────────────────────────
   PATCH /portal/hq/playbooks/step/<id> — edit or archive a master.

   Admin only. This changes the playbook for every client, for future
   campaigns; the page says so before it sends anything.

   The id is a path segment, so before anything is written the row is
   fetched and proved to be a master step: in Campaign Calendar, Is
   Playbook ticked, Kind = Step. A client's step fails that and gets
   the portal's 404, so this endpoint cannot be pointed at one.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../../src/server/hq-auth';
import { portalNotFound } from '../../../../../src/server/portal-auth';
import { isNotionId } from '../../../../../src/server/portal-notion';
import {
  beginPlaybookWrite, buildMasterProperties, fetchMasters, fetchOwnedMaster,
  shapeMaster, updatePage, vocabularyOf,
} from '../../../../../src/server/playbooks';

export const onRequestPatch: PagesFunction<HqEnv> = async ({ request, env, params }) => {
  const id = String(params.id ?? '');
  if (!isNotionId(id)) return portalNotFound();
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;

  const master = await fetchOwnedMaster(env.NOTION_TOKEN, id);
  if (!master) return portalNotFound();

  if (gate.body.archive === true) {
    const gone = await updatePage(env.NOTION_TOKEN, id, { archived: true }, 'a master step');
    return gone ? hqJson({ ok: true, archived: true, id }) : hqJson({ ok: false, error: 'write_failed' }, 502);
  }

  const masters = await fetchMasters(env.NOTION_TOKEN);
  const { properties, rejected } = buildMasterProperties(gate.body, vocabularyOf(masters));
  if (rejected.length || !Object.keys(properties).length) {
    return hqJson({ ok: false, error: 'invalid', rejected }, 400);
  }
  const page = await updatePage(env.NOTION_TOKEN, id, { properties }, 'a master step');
  const step = page ? shapeMaster(page) : null;
  if (!step) return hqJson({ ok: false, error: 'write_failed' }, 502);
  return hqJson({ ok: true, step });
};

export const onRequest: PagesFunction<HqEnv> = async ({ request, next }) => {
  if (request.method === 'PATCH') return next();
  return portalNotFound();
};
