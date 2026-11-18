/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/moments — one of us adds a moment for a client.

     { clientId, event, city?, momentType, date, dateEnd?, notes? }

   Admin only. The moment is titled "[Client] · [Event] ([City])", and
   its Moment Type has to be one the client's type has: a gym cannot be
   given a Release, nor an artist a Competition. Client Type is copied
   from the client. Nothing in the request names a Notion property.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import { isNotionId } from '../../../../src/server/portal-notion';
import { beginPlaybookWrite } from '../../../../src/server/playbooks';
import { clientFacts } from '../../../../src/server/pieces';
import { createMoment } from '../../../../src/server/playbook-apply';

type Env = HqEnv & HqDataEnv;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;
  const clientId = typeof gate.body.clientId === 'string' && isNotionId(gate.body.clientId) ? gate.body.clientId : null;
  if (!clientId) return hqJson({ ok: false, error: 'invalid', rejected: ['clientId'] }, 400);
  const facts = await clientFacts(env.NOTION_TOKEN, clientId);
  if (!facts) return portalNotFound();
  const out = await createMoment(env.NOTION_TOKEN,
    { pageId: clientId, artist: facts.artist, slug: facts.slug, type: facts.type }, gate.body, 'admin');
  if (out.status === 200) await Promise.all([dropHq(env), facts.slug ? dropPortalData(facts.slug) : Promise.resolve()]);
  return hqJson(out.body, out.status);
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
