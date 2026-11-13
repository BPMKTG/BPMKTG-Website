/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/playbooks/override — "+ Override".

   Admin only. Creates one client's exception to one playbook. It may
   be created Draft or Approved; Approved is refused unless the
   override says completely what it does, because an approved override
   that changes nothing reads as a change that silently failed.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../../src/server/hq-auth';
import { portalNotFound } from '../../../../../src/server/portal-auth';
import { CLIENTS_DB, fetchPage, isNotionId, normaliseNotionId } from '../../../../../src/server/portal-notion';
import {
  beginPlaybookWrite, buildOverrideProperties, createIn, fetchMasters,
  shapeOverride, vocabularyOf, OVERRIDES_DB,
} from '../../../../../src/server/playbooks';
import { overrideProblem } from '../../../../../src/data/playbooks';

export const onRequestPost: PagesFunction<HqEnv> = async ({ request, env }) => {
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;
  const { body } = gate;

  // The client it is for has to be a real Clients row.
  const clientId = typeof body.clientId === 'string' && isNotionId(body.clientId) ? body.clientId : null;
  if (!clientId) return hqJson({ ok: false, error: 'invalid', rejected: ['clientId'] }, 400);
  const client = await fetchPage(env.NOTION_TOKEN, clientId);
  if (!client || normaliseNotionId(String(client?.parent?.database_id ?? '')) !== normaliseNotionId(CLIENTS_DB)) {
    return portalNotFound();
  }

  const masters = await fetchMasters(env.NOTION_TOKEN);
  const { properties, rejected } = buildOverrideProperties(body, {
    masterIds: masters.map((m) => m.id), playbooks: vocabularyOf(masters).playbooks, role: 'admin',
  });
  if (rejected.length) return hqJson({ ok: false, error: 'invalid', rejected }, 400);
  if (!properties['Change']) return hqJson({ ok: false, error: 'invalid', rejected: ['change'] }, 400);

  const props = {
    ...properties,
    Client: { relation: [{ id: clientId }] },
    Status: properties['Status'] ?? { select: { name: 'Draft' } },
    'Requested By': { select: { name: 'Blueprint' } },
  };
  // Shape it as it would be read back, to ask the one question that
  // matters before it is written.
  const draft = shapeOverride({ id: 'new', properties: asRead(props), created_time: null });
  if (draft.status === 'Approved') {
    const problem = overrideProblem(draft);
    if (problem) return hqJson({ ok: false, error: 'incomplete', detail: problem }, 400);
  }

  const page = await createIn(env.NOTION_TOKEN, OVERRIDES_DB, props, 'an override');
  if (!page) return hqJson({ ok: false, error: 'write_failed' }, 502);
  return hqJson({ ok: true, override: shapeOverride(page) });
};

/** Properties in the shape Notion writes are not quite the shape it
 *  reads: a read carries a `type` tag and plain_text. This fills those
 *  in so the same reader can look at a row before it exists. */
function asRead(props: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(props)) {
    const type = Object.keys(v)[0];
    const val = v[type];
    out[k] = type === 'title' || type === 'rich_text'
      ? { type, [type]: (val ?? []).map((t: any) => ({ plain_text: t?.text?.content ?? '' })) }
      : { type, [type]: val };
  }
  return out;
}

export const onRequest: PagesFunction<HqEnv> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
