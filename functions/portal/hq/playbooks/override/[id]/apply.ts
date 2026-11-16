/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/playbooks/override/<id>/apply — "apply to open
   steps in upcoming moments".

   Admin only, and only ever on purpose. Approving an override changes
   what future campaigns get; this is the separate step that reaches
   into campaigns already on the calendar.

   `dryRun: true` returns what would be written and writes nothing,
   which is what the page shows before it asks for the real thing.
   Only open steps (Not Started, In Progress) on moments that have not
   happened are touched. A step that is Done, Skipped or Moved was a
   decision somebody already made.

   Writes are capped per request, so a long list is applied in batches
   and the answer says how many are left.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../../../src/server/hq-data';
import { dropPortalData, portalNotFound } from '../../../../../../src/server/portal-auth';
import { CALENDAR_DB, isNotionId } from '../../../../../../src/server/portal-notion';
import {
  beginPlaybookWrite, clientSlugOf, createIn, fetchClientSteps, fetchMasters,
  fetchOwnedOverride, stepProperties, updatePage,
} from '../../../../../../src/server/playbooks';
import {
  fetchLinkedPieces, patchRow, PIECE_WRITE_BUDGET, type PieceRow,
} from '../../../../../../src/server/pieces';
import { piecesToFollow, piecesToSkip } from '../../../../../../src/data/pieces';
import { isApplied, planOverrideOnOpen, type OverrideWrite } from '../../../../../../src/data/playbooks';

interface Env extends HqEnv, HqDataEnv {}

function patchProps(w: Extract<OverrideWrite, { kind: 'patch' }>): Record<string, unknown> {
  const p: Record<string, unknown> = { 'Last Edited By': { select: { name: 'Blueprint' } } };
  if (w.set.offset !== undefined) p['Offset (days)'] = { number: w.set.offset };
  if (w.set.date !== undefined) p['Date'] = { date: w.set.date ? { start: w.set.date } : null };
  if (w.set.flow !== undefined) p['Flow'] = { select: { name: w.set.flow } };
  if (w.set.owner !== undefined) p['Owner'] = { select: w.set.owner ? { name: w.set.owner } : null };
  if (w.set.status !== undefined) p['Status'] = { select: { name: w.set.status } };
  if (w.set.title !== undefined) p['Item'] = { title: [{ text: { content: w.set.title } }] };
  return p;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String(params.id ?? '');
  if (!isNotionId(id)) return portalNotFound();
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;

  const override = await fetchOwnedOverride(env.NOTION_TOKEN, id);
  if (!override) return portalNotFound();
  if (!isApplied(override) || !override.clientId) {
    return hqJson({ ok: false, error: 'not_approved', detail: 'Only an approved override can be applied.' }, 400);
  }

  const [masters, cal] = await Promise.all([
    fetchMasters(env.NOTION_TOKEN), fetchClientSteps(env.NOTION_TOKEN, override.clientId),
  ]);
  const today = new Date().toISOString().slice(0, 10);
  const plan = planOverrideOnOpen(override, masters, cal.steps, cal.moments, today);

  const summary = plan.map((w) => (w.kind === 'patch'
    ? { kind: w.kind, moment: w.momentTitle, step: w.stepTitle, says: w.says }
    : { kind: w.kind, moment: w.momentTitle, step: w.step.title, says: `is added for ${w.step.date ?? 'no date'}` }));
  if (gate.body.dryRun === true) return hqJson({ ok: true, dryRun: true, writes: summary });

  // A step that changes day takes its Planned pieces with it, and a
  // step that is skipped takes them out with it. The pieces are read
  // once, and a step is only started when there is budget for it and
  // everything that follows from it, so nothing is left half done.
  const touchesPieces = plan.some((w) => w.kind === 'patch'
    && (w.set.date !== undefined || w.set.status === 'Skipped'));
  const linked: PieceRow[] = touchesPieces
    ? await fetchLinkedPieces(env.NOTION_TOKEN, override.clientId) : [];
  const same = (a: string, b: string) => a.replace(/-/g, '') === b.replace(/-/g, '');
  const stamp = { 'Last Edited By': { select: { name: 'Blueprint' } } };

  let budget = PIECE_WRITE_BUDGET;
  let done = 0;
  let pieces = 0;
  for (const w of plan) {
    let follow: Array<{ id: string; properties: Record<string, unknown> }> = [];
    if (w.kind === 'patch') {
      const mine = linked.filter((p) => p.campaign.some((id) => same(id, w.stepId)));
      if (w.set.status === 'Skipped') {
        follow = piecesToSkip(mine).map((p) => ({ id: p.id, properties: { ...stamp, Status: { select: { name: 'Skipped' } } } }));
      } else if (w.set.date) {
        follow = piecesToFollow(mine, w.set.date).map((p) => ({ id: p.id, properties: { ...stamp, 'Post Date': { date: { start: w.set.date } } } }));
      }
    }
    if (1 + follow.length > budget) break;
    const ok = w.kind === 'patch'
      ? await updatePage(env.NOTION_TOKEN, w.stepId, { properties: patchProps(w) }, 'a step')
      : await createIn(env.NOTION_TOKEN, CALENDAR_DB, stepProperties(w.step, override.clientId, w.momentId), 'a step');
    if (!ok) break;
    budget--;
    done++;
    for (const f of follow) {
      budget--;
      if (await patchRow(env.NOTION_TOKEN, f.id, f.properties, 'a piece following its step')) pieces++;
    }
  }

  const slug = await clientSlugOf(env.NOTION_TOKEN, override.clientId);
  await Promise.all([dropHq(env), slug ? dropPortalData(slug) : Promise.resolve()]);
  return hqJson({ ok: done > 0 || !plan.length, done, pieces, remaining: plan.length - done, writes: summary.slice(0, done) });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
