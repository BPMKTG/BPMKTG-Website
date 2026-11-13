/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/playbooks/request — the client asks for a
   change to a step.

   Creates one Playbook Overrides row: Status = Requested, Requested By
   = Client, linked to this slug's client and to the step. The request
   supplies the step and a reason and nothing else. Who it is for is
   the session's client, never the body's; what the change is, and
   whether it is approved, are ours to say in HQ.

   The step has to be a real master step. Anything else is the portal's
   404, the same as a row that does not exist.
   ────────────────────────────────────────────────────────────── */

import { portalNotFound } from '../../../../src/server/portal-auth';
import { normaliseNotionId, isNotionId } from '../../../../src/server/portal-notion';
import { beginWrite, writeOk, type WriteEnv } from '../../../../src/server/portal-write-shared';
import { editedBy } from '../../../../src/server/portal-write';
import {
  buildOverrideProperties, createIn, fetchMasters, fetchOverrides, OVERRIDES_DB,
} from '../../../../src/server/playbooks';
import { clientRequests } from '../../../../src/data/playbooks';

export const onRequestPost: PagesFunction<WriteEnv> = async ({ request, env, params }) => {
  const begun = await beginWrite(request, env, params.slug, { schema: false });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;

  const stepId = typeof ctx.body.step === 'string' && isNotionId(ctx.body.step) ? ctx.body.step : null;
  if (!stepId) return portalNotFound();
  const masters = await fetchMasters(env.NOTION_TOKEN);
  const master = masters.find((m) => normaliseNotionId(m.id) === normaliseNotionId(stepId));
  if (!master || master.hideFromClient) return portalNotFound();

  // Built as a client, whoever is signed in: this route only ever
  // writes a reason. One of us wanting to do more does it in HQ.
  const { properties } = buildOverrideProperties({ reason: ctx.body.reason }, {
    masterIds: [], playbooks: [], role: 'client',
  });
  const reason = (properties['Reason'] as any)?.rich_text?.[0]?.text?.content;
  if (!reason) return portalNotFound();   // a request with no reason is not one

  const page = await createIn(env.NOTION_TOKEN, OVERRIDES_DB, {
    ...properties,
    Change: { title: [{ text: { content: `Request: ${master.title}`.slice(0, 200) } }] },
    Client: { relation: [{ id: ctx.record.pageId }] },
    Playbook: { select: { name: master.playbook } },
    'Master Step': { relation: [{ id: master.id }] },
    Status: { select: { name: 'Requested' } },
    'Requested By': { select: { name: editedBy(ctx.viewer.role) } },
  }, 'a change request');
  if (!page) return portalNotFound();

  const overrides = await fetchOverrides(env.NOTION_TOKEN, ctx.record.pageId);
  return writeOk({ ok: true, requests: clientRequests(masters, overrides, ctx.record.pageId) });
};

export const onRequest: PagesFunction<WriteEnv> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
