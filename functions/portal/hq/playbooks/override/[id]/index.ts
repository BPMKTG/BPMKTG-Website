/* ──────────────────────────────────────────────────────────────
   PATCH /portal/hq/playbooks/override/<id> — edit, approve, decline
   or delete one override.

   Admin only. The row is fetched and proved to be in the Playbook
   Overrides database before anything is written.

   Approving is the one move with a rule: the override, as it will
   stand after this write, has to say completely what it does. A
   client's request arrives as a reason and nothing else, and approving
   that would approve nothing.

   Approving changes what future campaigns get. It does NOT touch a
   campaign that is already running: that is a separate, explicit
   action, at /apply.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../../../src/server/hq-auth';
import { portalNotFound } from '../../../../../../src/server/portal-auth';
import { isNotionId } from '../../../../../../src/server/portal-notion';
import {
  beginPlaybookWrite, buildOverrideProperties, fetchMasters, fetchOwnedOverride,
  shapeOverride, updatePage, vocabularyOf,
} from '../../../../../../src/server/playbooks';
import { overrideProblem, type PlaybookOverride } from '../../../../../../src/data/playbooks';

export const onRequestPatch: PagesFunction<HqEnv> = async ({ request, env, params }) => {
  const id = String(params.id ?? '');
  if (!isNotionId(id)) return portalNotFound();
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;
  const { body } = gate;

  const existing = await fetchOwnedOverride(env.NOTION_TOKEN, id);
  if (!existing) return portalNotFound();

  if (body.archive === true) {
    const gone = await updatePage(env.NOTION_TOKEN, id, { archived: true }, 'an override');
    return gone ? hqJson({ ok: true, archived: true, id }) : hqJson({ ok: false, error: 'write_failed' }, 502);
  }

  const masters = await fetchMasters(env.NOTION_TOKEN);
  const { properties, rejected } = buildOverrideProperties(body, {
    masterIds: masters.map((m) => m.id), playbooks: vocabularyOf(masters).playbooks, role: 'admin',
  });
  if (rejected.length || !Object.keys(properties).length) {
    return hqJson({ ok: false, error: 'invalid', rejected }, 400);
  }

  // The override as it will stand once this is written.
  const after: PlaybookOverride = { ...existing };
  const pick = <K extends keyof PlaybookOverride>(key: string, to: K) => {
    if (key in body) (after[to] as unknown) = body[key] as unknown;
  };
  pick('changeType', 'changeType'); pick('newOffset', 'newOffset'); pick('newFlow', 'newFlow');
  pick('newTitle', 'newTitle'); pick('playbook', 'playbook'); pick('masterStepId', 'masterStepId');
  pick('status', 'status');
  if (after.status === 'Approved') {
    const problem = overrideProblem(after);
    if (problem) return hqJson({ ok: false, error: 'incomplete', detail: problem }, 400);
  }

  const page = await updatePage(env.NOTION_TOKEN, id, { properties }, 'an override');
  if (!page) return hqJson({ ok: false, error: 'write_failed' }, 502);
  return hqJson({ ok: true, override: shapeOverride(page) });
};

export const onRequest: PagesFunction<HqEnv> = async ({ request, next }) => {
  if (request.method === 'PATCH') return next();
  return portalNotFound();
};
