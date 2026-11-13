/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/playbooks/apply — put a playbook on a moment.

   Admin only. Creates the playbook's steps on one client's moment,
   dated from the moment, AS THAT CLIENT GETS THEM: their approved
   overrides are applied on the way in. A shifted step lands on its
   shifted day, a reassigned one carries its new Flow and Owner, a
   skipped one is not created and an added one is. Draft, Requested
   and Declined overrides are ignored.

   The moment has to be one of that client's own. Steps already on it
   under the same title are left out, so applying twice does not double
   a campaign. `dryRun: true` returns the list and writes nothing.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import { CALENDAR_DB, isNotionId, normaliseNotionId } from '../../../../src/server/portal-notion';
import {
  beginPlaybookWrite, clientSlugOf, createIn, fetchClientSteps, fetchMasters,
  fetchOverrides, stepProperties, vocabularyOf, MAX_PLAYBOOK_WRITES,
} from '../../../../src/server/playbooks';
import { effectivePlaybook, planApply } from '../../../../src/data/playbooks';

interface Env extends HqEnv, HqDataEnv {}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;
  const { body } = gate;

  const clientId = typeof body.clientId === 'string' && isNotionId(body.clientId) ? body.clientId : null;
  const momentId = typeof body.momentId === 'string' && isNotionId(body.momentId) ? body.momentId : null;
  if (!clientId || !momentId) return hqJson({ ok: false, error: 'invalid' }, 400);

  const [masters, overrides, cal] = await Promise.all([
    fetchMasters(env.NOTION_TOKEN),
    fetchOverrides(env.NOTION_TOKEN, clientId),
    fetchClientSteps(env.NOTION_TOKEN, clientId),
  ]);
  const playbook = typeof body.playbook === 'string' && vocabularyOf(masters).playbooks.includes(body.playbook)
    ? body.playbook : null;
  if (!playbook) return hqJson({ ok: false, error: 'invalid', rejected: ['playbook'] }, 400);

  // The moment must be this client's. fetchClientSteps only returns
  // rows related to them, so being in that list is the proof.
  const moment = cal.moments.find((m) => normaliseNotionId(m.id) === normaliseNotionId(momentId));
  if (!moment) return portalNotFound();

  const effective = effectivePlaybook(masters, overrides, playbook, clientId);
  const onMoment = cal.steps.filter((s) => normaliseNotionId(s.momentId ?? '') === normaliseNotionId(momentId));
  const plan = planApply(effective, moment.date, onMoment.map((s) => s.title));
  const facts = {
    moment: moment.title,
    playbook,
    skipped: effective.filter((s) => s.skipped).map((s) => s.title),
    changed: effective.filter((s) => !s.skipped && (s.added || s.overrideIds.length)).map((s) => s.title),
    alreadyThere: effective.filter((s) => !s.skipped).length - plan.length,
  };
  if (body.dryRun === true) {
    return hqJson({ ok: true, dryRun: true, ...facts, steps: plan.map((s) => ({ title: s.title, date: s.date, flow: s.flow })) });
  }

  let created = 0;
  for (const step of plan.slice(0, MAX_PLAYBOOK_WRITES)) {
    const page = await createIn(env.NOTION_TOKEN, CALENDAR_DB, stepProperties(step, clientId, momentId), 'a step');
    if (!page) break;
    created++;
  }
  const slug = await clientSlugOf(env.NOTION_TOKEN, clientId);
  await Promise.all([dropHq(env), slug ? dropPortalData(slug) : Promise.resolve()]);
  return hqJson({ ok: created > 0 || !plan.length, created, remaining: plan.length - created, ...facts });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
