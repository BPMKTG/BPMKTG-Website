/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/playbooks/update — bring one client's running
   campaigns up to the playbooks as they are now.

   Admin only. It never applies a playbook. It edits rows that already
   exist, in place, and creates only the one or two steps the audit
   added. What the body carries says which of four things it does:

     { clientId, dryRun: true, ... }
         The plan, row by row, and what each month would come to.
         Nothing is written. This is always the first call.

     { clientId, ... }                      start a run
     { clientId, run, ... }                 carry it on
         Write the plan. The first call snapshots every row it will
         touch to R2 and answers with the snapshot's key as `run`;
         each call writes a limited number of rows and says how many
         are left, and the page repeats it until that is zero.

     { clientId, run, verify: true }
         The checks, made against Notion as it now stands: no moment
         with two open steps from one master, as many pieces past
         Planned in every month as before, no Done step changed.

     { clientId, undo: true, run?, from? }
         Put every row of a run back as the snapshot has it, and
         archive the steps the run created. The newest run, unless
         `run` names another.

   The options are the same on every call, so the plan is the same
   plan: `noDates` (moments scheduled by hand), `exclude` (steps to
   leave alone) and `moments` (only these).

   Every write is to a row that came back from a query filtered on
   this client. The run key is checked to be one of this client's
   before it is read.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import { CALENDAR_DB, isNotionId, normaliseNotionId } from '../../../../src/server/portal-notion';
import { beginPlaybookWrite, createIn, stepProperties } from '../../../../src/server/playbooks';
import { archiveRow, clientFacts, patchRow, PIECE_WRITE_BUDGET } from '../../../../src/server/pieces';
import {
  buildSnapshot, getSnapshot, isSnapshotKey, latestSnapshotKey, pieceWrite, putSnapshot,
  readUpdateState, stepWrite, type SnapshotBucket,
} from '../../../../src/server/playbook-update';
import { checkUpdate, planUpdate, type UpdateOptions } from '../../../../src/data/playbook-update';
import { counterMonths, shiftMonth } from '../../../../src/data/portal-content';

interface Env extends HqEnv, HqDataEnv {
  REPORTS_BUCKET?: SnapshotBucket;
}

const idList = (v: unknown): string[] | null =>
  v === undefined ? [] : Array.isArray(v) && v.every((x) => typeof x === 'string' && isNotionId(x)) ? v as string[] : null;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;
  const { body } = gate;

  const clientId = typeof body.clientId === 'string' && isNotionId(body.clientId) ? body.clientId : null;
  if (!clientId) return hqJson({ ok: false, error: 'invalid' }, 400);
  const noDates = idList(body.noDates);
  const exclude = idList(body.exclude);
  const only = body.moments === undefined ? undefined : idList(body.moments);
  if (!noDates || !exclude || only === null) return hqJson({ ok: false, error: 'invalid' }, 400);

  const facts = await clientFacts(env.NOTION_TOKEN, clientId);
  if (!facts) return portalNotFound();
  const bucket = env.REPORTS_BUCKET;
  const drop = () => Promise.all([dropHq(env), facts.slug ? dropPortalData(facts.slug) : Promise.resolve()]);
  const run = body.run === undefined ? null : body.run;
  if (run !== null && !isSnapshotKey(run, clientId)) return hqJson({ ok: false, error: 'invalid', rejected: ['run'] }, 400);

  /* ── put a run back ────────────────────────────────────────── */
  if (body.undo === true) {
    if (!bucket) return hqJson({ ok: false, error: 'no_bucket', detail: 'There is nowhere the snapshots are kept, so there is nothing to undo from.' }, 503);
    const key = (run as string | null) ?? await latestSnapshotKey(bucket, clientId);
    const snap = key ? await getSnapshot(bucket, key) : null;
    if (!key || !snap) return hqJson({ ok: false, error: 'gone', detail: 'There is no update to undo.' }, 404);
    if (snap.undone) return hqJson({ ok: false, error: 'gone', detail: 'That update was already undone.' }, 409);
    // Rows first, then the steps the run made. `from` is how far the
    // last call got, so a long undo is several short ones.
    const todo = [
      ...snap.rows.map((r) => ({ id: r.id, restore: r.restore as Record<string, unknown> | null })),
      ...snap.created.map((id) => ({ id, restore: null })),
    ];
    const from = typeof body.from === 'number' && Number.isInteger(body.from) && body.from >= 0 ? body.from : 0;
    let done = 0;
    let failed = 0;
    for (const r of todo.slice(from, from + PIECE_WRITE_BUDGET)) {
      const ok = r.restore
        ? await patchRow(env.NOTION_TOKEN, r.id, { ...r.restore, 'Last Edited By': { select: { name: 'Blueprint' } } }, 'undoing a playbook update')
        : await archiveRow(env.NOTION_TOKEN, r.id, 'removing a step an update added');
      if (ok) done++; else failed++;
    }
    const next = from + done + failed;
    const remaining = Math.max(0, todo.length - next);
    if (!remaining && !failed) {
      snap.undone = new Date().toISOString();
      await putSnapshot(bucket, snap);
    }
    await drop();
    return hqJson({ ok: failed === 0, run: key, restored: done, failed, next, remaining, total: todo.length });
  }

  const today = new Date().toISOString().slice(0, 10);
  const state = await readUpdateState(env.NOTION_TOKEN, clientId, facts.artist);

  /* ── the checks, after a run ───────────────────────────────── */
  if (body.verify === true) {
    if (!bucket || !run) return hqJson({ ok: false, error: 'invalid' }, 400);
    const snap = await getSnapshot(bucket, run as string);
    if (!snap) return hqJson({ ok: false, error: 'gone' }, 404);
    const failures = checkUpdate(snap.baseline, state.steps, state.pieces, state.moments, state.masters);
    if (failures.length) console.error('hq: a playbook update FAILED its checks', run, failures.join(' | '));
    return hqJson({ ok: failures.length === 0, verified: true, failures });
  }

  const opts: UpdateOptions = { today, artist: facts.artist, noDates, exclude, ...(only ? { moments: only } : {}) };
  // Last month through four months on: the months a running campaign
  // can still change.
  const first = shiftMonth(today.slice(0, 7), 0);
  const months = [...new Set([...counterMonths(today), ...[0, 1, 2, 3, 4].map((n) => shiftMonth(first, n))])].sort();
  const plan = planUpdate(state.steps, state.moments, state.masters, state.pieces, opts, months);
  const momentTitle = new Map(state.moments.map((m) => [normaliseNotionId(m.id), m]));

  if (body.dryRun === true) {
    let last: { key: string; at: string; rows: number; undone: boolean } | null = null;
    if (bucket) {
      const key = await latestSnapshotKey(bucket, clientId);
      const snap = key ? await getSnapshot(bucket, key) : null;
      if (key && snap) last = { key, at: snap.at, rows: snap.rows.length + snap.created.length, undone: !!snap.undone };
    }
    return hqJson({
      ok: true, dryRun: true, today, canWrite: !!bucket, last,
      counts: plan.counts, writes: plan.writes, duplicates: plan.duplicates, months: plan.months,
      moments: state.moments
        .filter((m) => plan.rows.some((r) => normaliseNotionId(r.momentId ?? '') === normaliseNotionId(m.id)))
        .sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))
        .map((m) => ({ id: m.id, title: m.title, date: m.date, noDates: noDates.some((id) => normaliseNotionId(id) === normaliseNotionId(m.id)) })),
      rows: plan.rows,
    });
  }

  /* ── write it ──────────────────────────────────────────────── */
  if (!bucket) {
    return hqJson({ ok: false, error: 'no_bucket',
      detail: 'The snapshot bucket is not bound, so this cannot be undone. Nothing was written.' }, 503);
  }
  const acting = plan.rows.filter((r) => r.action === 'skip' || r.action === 'update' || r.action === 'add');
  let key = run as string | null;
  let snap = key ? await getSnapshot(bucket, key) : null;
  if (key && !snap) return hqJson({ ok: false, error: 'gone', detail: 'That run can no longer be found.' }, 404);
  if (!key) {
    if (!acting.length) return hqJson({ ok: true, run: null, written: 0, remaining: 0 });
    // Before anything is written: every row this run will touch, as
    // it stands. If this throws, the request fails and nothing moved.
    snap = buildSnapshot(clientId, new Date().toISOString(), 'hq', plan.rows, state);
    key = await putSnapshot(bucket, snap);
  }

  const stepOf = new Map(state.steps.map((s) => [normaliseNotionId(s.id), s]));
  const pieceOf = new Map(state.pieces.map((p) => [normaliseNotionId(p.id), p]));
  let budget = PIECE_WRITE_BUDGET;
  let written = 0;
  let rowsDone = 0;
  let stopped = false;
  const createdNow: string[] = [];
  for (const row of acting) {
    const cost = 1 + row.pieces.length;
    if (cost > budget) break;
    if (row.action === 'add' && row.add) {
      const moment = momentTitle.get(normaliseNotionId(row.momentId ?? ''));
      const page = await createIn(env.NOTION_TOKEN, CALENDAR_DB, stepProperties({
        title: row.add.title, playbook: row.add.playbook, phase: row.add.phase, offset: row.add.offset,
        date: row.add.date, flow: row.add.flow, owner: row.add.owner, type: row.add.type,
        notes: row.add.notes, where: row.add.where, why: row.add.why, brief: row.add.brief,
      }, clientId, row.momentId as string, { hidden: !!moment?.hidden }), 'a step the playbook gained');
      budget--;
      if (!page) { stopped = true; break; }
      createdNow.push(String(page.id));
      written++;
      rowsDone++;
      continue;
    }
    const step = stepOf.get(normaliseNotionId(row.stepId));
    if (!step) continue;
    const ok = await patchRow(env.NOTION_TOKEN, step.id, stepWrite(row, step), 'updating a step to its master');
    budget--;
    if (!ok) { stopped = true; break; }
    written++;
    for (const c of row.pieces) {
      const piece = pieceOf.get(normaliseNotionId(c.id));
      budget--;
      if (!piece) continue;
      if (await patchRow(env.NOTION_TOKEN, piece.id, pieceWrite(c, piece), 'updating a piece with its step')) written++;
      else stopped = true;
    }
    if (stopped) break;
    rowsDone++;
  }
  if (createdNow.length && snap) {
    // The snapshot learns what was made, so undo can remove it.
    snap.created.push(...createdNow);
    await putSnapshot(bucket, snap);
  }
  await drop();
  return hqJson({
    ok: !stopped || rowsDone > 0,
    run: key, written, rows: rowsDone, remaining: acting.length - rowsDone, stopped,
  });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
