/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/pending — answer something a client added.

     { id, action: 'seen' }                a moment they created
     { id, action: 'confirm', pieces? }    a step of ours they added
     { id, action: 'skip' }                that step is not happening

   Admin only. A client can add their own events and plan them with a
   playbook, but a step that is OUR work is created waiting ("Pending
   Blueprint" ticked) and owes nothing until one of us confirms it
   here. Confirming is what creates its post, or its photo set or
   footage batch. What we take on is decided here, not by a form.

   Only a row that is actually pending can be answered.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import { isNotionId } from '../../../../src/server/portal-notion';
import { beginPlaybookWrite } from '../../../../src/server/playbooks';
import { clientFacts } from '../../../../src/server/pieces';
import { answerPending } from '../../../../src/server/playbook-apply';

type Env = HqEnv & HqDataEnv;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;
  const { body } = gate;
  const id = typeof body.id === 'string' && isNotionId(body.id) ? body.id : null;
  const action = typeof body.action === 'string' ? body.action : '';
  if (!id) return hqJson({ ok: false, error: 'invalid', rejected: ['id'] }, 400);
  const pieces = typeof body.pieces === 'number' && Number.isInteger(body.pieces) ? body.pieces : null;

  const out = await answerPending(env.NOTION_TOKEN, id, action, pieces, async (clientPageId) => {
    if (!isNotionId(clientPageId)) return null;
    const facts = await clientFacts(env.NOTION_TOKEN, clientPageId);
    return facts ? { pageId: clientPageId, artist: facts.artist, slug: facts.slug, type: facts.type } : null;
  });
  if (out.status === 404) return portalNotFound();
  if (out.status === 200) await Promise.all([dropHq(env), out.slug ? dropPortalData(out.slug) : Promise.resolve()]);
  return hqJson(out.body, out.status);
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
