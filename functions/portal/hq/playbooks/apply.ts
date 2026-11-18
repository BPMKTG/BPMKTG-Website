/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/playbooks/apply — put a playbook on a moment.

     { clientId, momentId, playbook, dryRun: true }   the preview
     { clientId, momentId, playbook, keep?, pieces? } write it
     { clientId, momentId, undo: [stepId, ...] }      take it back

   Admin only. A step is a copy of a master (Is Playbook unticked),
   dated from the moment's first day, with the client's Approved
   overrides already in. Steps that owe something get it: a Blueprint
   post for an artist, a photo set or a footage batch for a gym.

   The plan is src/data/playbook-apply.ts and the writing is
   src/server/playbook-apply.ts, shared with the client's own
   /portal/<slug>/playbooks/apply. What differs here is who is asking:
   one of us may keep a late step live, and nothing we add waits for
   anyone to confirm it.

   Safe to call twice. A step this playbook already put on this
   moment is recognised by the master id kept on the copy and is not
   made again, so "apply it again" only ever adds what is missing.

   One request writes a limited number of rows and says how many are
   left; the page asks again until none are.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import { isNotionId } from '../../../../src/server/portal-notion';
import { beginPlaybookWrite } from '../../../../src/server/playbooks';
import { clientFacts } from '../../../../src/server/pieces';
import { readApplyAsk, runApply, runUndo, type ApplyClient } from '../../../../src/server/playbook-apply';

type Env = HqEnv & HqDataEnv;

const today = () => new Date().toISOString().slice(0, 10);

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;
  const { body } = gate;

  const clientId = typeof body.clientId === 'string' && isNotionId(body.clientId) ? body.clientId : null;
  if (!clientId) return hqJson({ ok: false, error: 'invalid', rejected: ['clientId'] }, 400);
  const facts = await clientFacts(env.NOTION_TOKEN, clientId);
  if (!facts) return portalNotFound();
  const client: ApplyClient = { pageId: clientId, artist: facts.artist, slug: facts.slug, type: facts.type };
  const forget = () => Promise.all([dropHq(env), facts.slug ? dropPortalData(facts.slug) : Promise.resolve()]);

  if (Array.isArray(body.undo)) {
    const momentId = typeof body.momentId === 'string' && isNotionId(body.momentId) ? body.momentId : null;
    const ids = body.undo.filter((id): id is string => typeof id === 'string' && isNotionId(id)).slice(0, 80);
    if (!momentId || !ids.length) return hqJson({ ok: false, error: 'invalid' }, 400);
    const out = await runUndo(env.NOTION_TOKEN, client, momentId, ids);
    await forget();
    return hqJson(out.body, out.status);
  }

  const ask = readApplyAsk(body, isNotionId);
  if (!ask) return hqJson({ ok: false, error: 'invalid' }, 400);
  const out = await runApply(env.NOTION_TOKEN, client, ask, 'admin', today());
  if (out.status === 404) return portalNotFound();
  if (!ask.dryRun && out.status === 200) await forget();
  return hqJson(out.body, out.status);
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
