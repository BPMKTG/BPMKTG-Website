/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/playbooks/step — add a step to a playbook.

   Admin only. A master step is a Campaign Calendar row with Is
   Playbook ticked, hung off its playbook's placeholder moment. The
   playbook, phase and flow all have to be ones Notion already has.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../../src/server/hq-auth';
import { portalNotFound } from '../../../../../src/server/portal-auth';
import { CALENDAR_DB } from '../../../../../src/server/portal-notion';
import {
  beginPlaybookWrite, buildNewMaster, createIn, fetchMasters, shapeMaster, vocabularyOf,
} from '../../../../../src/server/playbooks';

export const onRequestPost: PagesFunction<HqEnv> = async ({ request, env }) => {
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;

  const masters = await fetchMasters(env.NOTION_TOKEN);
  const built = buildNewMaster(gate.body, vocabularyOf(masters), masters);
  if (built.rejected.length) return hqJson({ ok: false, error: 'invalid', rejected: built.rejected }, 400);

  const page = await createIn(env.NOTION_TOKEN, CALENDAR_DB, built.properties, 'a master step');
  const step = page ? shapeMaster(page) : null;
  if (!step) return hqJson({ ok: false, error: 'write_failed' }, 502);
  return hqJson({ ok: true, step });
};

export const onRequest: PagesFunction<HqEnv> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
