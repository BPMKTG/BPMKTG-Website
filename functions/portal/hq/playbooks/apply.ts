/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/playbooks/apply — put a playbook on a moment.

   Admin only. Creates the playbook's steps on one client's moment,
   dated from the moment, AS THAT CLIENT GETS THEM: their approved
   overrides are applied on the way in. A shifted step lands on its
   shifted day, a reassigned one carries its new Flow and Owner, a
   skipped one is not created and an added one is. Draft, Requested
   and Declined overrides are ignored.

   Every step that delivers something gets its Content Pipeline rows
   in the same pass, straight after the step itself, so a campaign is
   never left as a calendar with no pieces behind it. Priority,
   Default Media and Pieces are copied from the master onto the step,
   and the rows are made from the step.

   The moment has to be one of that client's own. Steps already on it
   under the same title are left out, so applying twice does not double
   a campaign; and a step of this playbook that is already there with
   no rows gets them, so a run that stopped halfway is finished by
   running it again. `dryRun: true` returns the list and writes nothing.

   One request makes a limited number of writes and says how many
   steps and rows are left. The page repeats it until that is zero.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import { CALENDAR_DB, isNotionId, normaliseNotionId } from '../../../../src/server/portal-notion';
import {
  beginPlaybookWrite, createIn, fetchMasters,
  fetchOverrides, stepProperties, vocabularyOf,
} from '../../../../src/server/playbooks';
import {
  clientFacts, createPiece, fetchClientCalendar, fetchLinkedPieces, shapeStep,
  PIECE_WRITE_BUDGET,
} from '../../../../src/server/pieces';
import { effectivePlaybook, isRetiredPlaybook, planApply } from '../../../../src/data/playbooks';
import { isDeliverableFlow, piecesForStep, planMissingPieces, type PieceStep } from '../../../../src/data/pieces';

interface Env extends HqEnv, HqDataEnv {}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;
  const { body } = gate;

  const clientId = typeof body.clientId === 'string' && isNotionId(body.clientId) ? body.clientId : null;
  const momentId = typeof body.momentId === 'string' && isNotionId(body.momentId) ? body.momentId : null;
  if (!clientId || !momentId) return hqJson({ ok: false, error: 'invalid' }, 400);

  const facts0 = await clientFacts(env.NOTION_TOKEN, clientId);
  if (!facts0) return portalNotFound();
  const [masters, overrides, cal, linked] = await Promise.all([
    fetchMasters(env.NOTION_TOKEN),
    fetchOverrides(env.NOTION_TOKEN, clientId),
    fetchClientCalendar(env.NOTION_TOKEN, clientId, facts0.artist, { momentId }),
    fetchLinkedPieces(env.NOTION_TOKEN, clientId),
  ]);
  const playbook = typeof body.playbook === 'string' && vocabularyOf(masters).playbooks.includes(body.playbook)
    ? body.playbook : null;
  if (!playbook) return hqJson({ ok: false, error: 'invalid', rejected: ['playbook'] }, 400);
  // Retired steps are kept to be read, not run.
  if (isRetiredPlaybook(playbook)) {
    return hqJson({ ok: false, error: 'retired', detail: 'Retired steps are not a playbook and cannot be applied.' }, 400);
  }

  const moment = cal.moments.find((m) => normaliseNotionId(m.id) === normaliseNotionId(momentId));
  if (!moment) return portalNotFound();

  const effective = effectivePlaybook(masters, overrides, playbook, clientId);
  const onMoment = cal.steps.filter((s) => normaliseNotionId(s.momentId ?? '') === normaliseNotionId(momentId));
  const plan = planApply(effective, moment.date, onMoment.map((s) => s.title));

  // What the steps about to be made will be, as the piece planner
  // reads them. Film sessions among them are what date a Film By, so
  // the whole campaign is planned together before any of it exists.
  const future: PieceStep[] = plan.map((s, i) => ({
    id: `new:${i}`, title: s.title, playbook: s.playbook, phase: s.phase, flow: s.flow,
    status: 'Not Started', date: s.date, momentId, priority: s.priority ?? null,
    defaultMedia: s.defaultMedia ?? null, pieces: s.pieces ?? null, hidden: moment.hidden,
  }));
  const everyStep = [...onMoment, ...future];
  const newPieces = future.map((f) => (isDeliverableFlow(f.flow) ? piecesForStep(f, moment, everyStep) : []));
  // Steps of this playbook already on the moment that have no rows.
  // The whole moment is handed over so a Film By can find its
  // session; only this playbook's steps are planned for.
  const owed = planMissingPieces(onMoment, [moment], linked, {
    stepIds: onMoment.filter((s) => s.playbook === playbook).map((s) => s.id),
  });

  const pieceTotal = newPieces.reduce((n, list) => n + list.length, 0) + owed.length;
  const facts = {
    moment: moment.title,
    playbook,
    skipped: effective.filter((s) => s.skipped).map((s) => s.title),
    changed: effective.filter((s) => !s.skipped && (s.added || s.overrideIds.length)).map((s) => s.title),
    alreadyThere: effective.filter((s) => !s.skipped).length - plan.length,
  };
  if (body.dryRun === true) {
    return hqJson({
      ok: true, dryRun: true, ...facts,
      steps: plan.map((s, i) => ({ title: s.title, date: s.date, flow: s.flow, pieces: newPieces[i].length })),
      pieces: [...newPieces.flat(), ...owed].map((p) => ({
        title: p.title, date: p.postDate, media: p.media, source: p.source, filmBy: p.filmBy,
      })),
      pieceCount: pieceTotal,
    });
  }

  // A step and its rows are written together or not at all in this
  // request: a step is only started when there is budget for it and
  // everything it owes.
  let budget = PIECE_WRITE_BUDGET;
  let created = 0;
  let piecesCreated = 0;
  let stopped = false;
  for (let i = 0; i < plan.length; i++) {
    const cost = 1 + newPieces[i].length;
    if (cost > budget) break;
    const page = await createIn(env.NOTION_TOKEN, CALENDAR_DB,
      stepProperties(plan[i], clientId, momentId, { hidden: moment.hidden }), 'a step');
    if (!page) { stopped = true; break; }
    budget--;
    created++;
    const made = shapeStep(page);
    for (const piece of newPieces[i]) {
      const ok = await createPiece(env.NOTION_TOKEN, { ...piece, stepId: made.id }, clientId);
      budget--;
      if (!ok) { stopped = true; break; }
      piecesCreated++;
    }
    if (stopped) break;
  }
  let owedCreated = 0;
  if (!stopped && created === plan.length) {
    for (const piece of owed) {
      if (budget < 1) break;
      const ok = await createPiece(env.NOTION_TOKEN, piece, clientId);
      budget--;
      if (!ok) { stopped = true; break; }
      owedCreated++;
    }
  }
  piecesCreated += owedCreated;

  await Promise.all([dropHq(env), facts0.slug ? dropPortalData(facts0.slug) : Promise.resolve()]);
  const remaining = plan.length - created;
  const piecesRemaining = pieceTotal - piecesCreated;
  return hqJson({
    // Nothing written and something still to write is the only failure.
    ok: !stopped || created > 0 || piecesCreated > 0,
    created, remaining, piecesCreated, piecesRemaining, stopped, ...facts,
  });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
