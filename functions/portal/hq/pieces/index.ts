/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/pieces — create the pieces a client's steps owe.

   Admin only. For one client: every step that delivers something
   (Flow is "Blueprint makes + posts" or "Client films → Blueprint
   edits + posts"), is still open, and has no Content Pipeline row
   linked to it, gets its rows. Done, Skipped and Moved steps are left
   alone. This is the job that used to be done by hand whenever the
   calendar's "No piece yet" chip was not zero.

   `dryRun: true` returns the list and writes nothing, and that is
   what the page shows before anything is created. `months` narrows it
   to steps dated in those months ("2026-12").

   It is safe to run twice: a step that has a row is not planned
   again, so the second run creates nothing. One request creates a
   limited number of rows and says how many are left; the page repeats
   it until that is zero.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import { isNotionId } from '../../../../src/server/portal-notion';
import { beginPlaybookWrite } from '../../../../src/server/playbooks';
import {
  clientFacts, createPieces, fetchClientCalendar, fetchLinkedPieces, PIECE_WRITE_BUDGET,
} from '../../../../src/server/pieces';
import { planMissingPieces, stepsWithoutPieces } from '../../../../src/data/pieces';

interface Env extends HqEnv, HqDataEnv {}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;
  const { body } = gate;

  const clientId = typeof body.clientId === 'string' && isNotionId(body.clientId) ? body.clientId : null;
  if (!clientId) return hqJson({ ok: false, error: 'invalid' }, 400);
  let months: string[] | undefined;
  if ('months' in body) {
    if (!Array.isArray(body.months) || !body.months.every((m) => typeof m === 'string' && MONTH.test(m))) {
      return hqJson({ ok: false, error: 'invalid', rejected: ['months'] }, 400);
    }
    months = body.months as string[];
  }

  const facts = await clientFacts(env.NOTION_TOKEN, clientId);
  if (!facts) return portalNotFound();
  const [cal, linked] = await Promise.all([
    fetchClientCalendar(env.NOTION_TOKEN, clientId, facts.artist),
    fetchLinkedPieces(env.NOTION_TOKEN, clientId),
  ]);
  const plan = planMissingPieces(cal.steps, cal.moments, linked, months ? { months } : {});

  if (body.dryRun === true) {
    const open = stepsWithoutPieces(cal.steps, linked);
    return hqJson({
      ok: true, dryRun: true,
      count: plan.length,
      steps: new Set(plan.map((p) => p.stepId)).size,
      // Every step with nothing behind it, whatever month was asked
      // for, so the page can offer the months there are.
      months: [...new Set(open.map((s) => (s.date ?? '').slice(0, 7)))].sort(),
      pieces: plan.map((p) => ({
        title: p.title, step: p.stepTitle, moment: p.momentTitle, date: p.postDate,
        media: p.media, source: p.source, bucket: p.bucket, platforms: p.platforms,
        filmBy: p.filmBy, priority: p.priority,
      })),
    });
  }

  const created = await createPieces(env.NOTION_TOKEN, plan, clientId, PIECE_WRITE_BUDGET);
  await Promise.all([dropHq(env), facts.slug ? dropPortalData(facts.slug) : Promise.resolve()]);
  return hqJson({
    ok: created > 0 || !plan.length,
    created,
    remaining: plan.length - created,
  });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
