/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/trim — trim a month that is over its cap.

   Admin only, one client and one month at a time. Four things, told
   apart by what the body carries:

     { clientId, month, dryRun: true }
         The suggestions: every piece that could go, in the order to
         cut them, with as many ticked as the month is over.

     { clientId, month, cut: [ids], move: [ids] }
         Do it. A cut piece goes to Skipped, and so does its step once
         every piece the step has is Skipped. A moved piece goes to the
         same weekday next month and takes its step with it. Each row
         touched gets a line in Notes saying when and why. Answers with
         an undo token and the film sessions the trim has left with
         nothing to film for.

     { clientId, undo: token, sessions: [ids] }
         Skip those film sessions. Only ones the trim behind that token
         really did empty: the list is worked out again here.

     { clientId, undo: token, revert: true }
         Put everything behind that token back as it was.

   Nothing in the request says what a piece is or why it is going. The
   ids are checked against the plan worked out here from Notion, so
   only a counted, Planned, non-Core piece of this client's in this
   month can be cut, and the reason written down is ours.

   The undo record is page ids and the values they held, kept in KV
   for twelve hours and handed to the browser as an opaque token, for
   the same reason a move's is: a browser that could post its own "put
   these pages back to these values" could write to any page it knew.
   ────────────────────────────────────────────────────────────── */

import { hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import { isNotionId, normaliseNotionId } from '../../../../src/server/portal-notion';
import { beginPlaybookWrite } from '../../../../src/server/playbooks';
import {
  clientFacts, fetchClientCalendar, fetchLinkedPieces, fetchMonthPieces, patchRow,
  type PieceRow,
} from '../../../../src/server/pieces';
import {
  appendNote, moveNote, sessionsNoLongerNeeded, suggestTrims, trimNote,
  type PieceStep, type TrimPiece,
} from '../../../../src/data/pieces';
import { countsToward, monthBounds, MONTH_CAP } from '../../../../src/data/portal-content';

interface Env extends HqEnv, HqDataEnv {}

const MONTH = /^\d{4}-(0[1-9]|1[0-2])$/;
/** Pieces one request will cut or move. Each is up to two writes, a
 *  piece and its step, and the reads come out of the same budget. The
 *  page sends a longer list in batches of this many. */
export const MAX_TRIM_ROWS = 12;
const UNDO_SECONDS = 12 * 60 * 60;
const undoKey = (token: string) => `trim:${token}`;

/** One row's worth of change, with what it held before. */
interface Undo {
  id: string;
  kind: 'piece' | 'step';
  status?: string | null;
  date?: string | null;
  notes: string | null;
}
interface TrimRecord {
  clientId: string;
  month: string;
  /** Steps this trim took out of the plan, for the film-session rule. */
  trimmedSteps: string[];
  rows: Undo[];
  exp: number;
}

function newToken(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

const same = (a: unknown, b: unknown) =>
  normaliseNotionId(String(a ?? '')) === normaliseNotionId(String(b ?? ''));
const select = (v: string | null) => ({ select: v ? { name: v } : null });
const notes = (v: string | null) => ({ rich_text: v ? [{ text: { content: v.slice(0, 2000) } }] : [] });
const stamp = { 'Last Edited By': select('Blueprint') };
const ids = (v: unknown): string[] | null =>
  Array.isArray(v) && v.every((x) => typeof x === 'string' && isNotionId(x)) ? v as string[] : null;

async function readRecord(env: Env, token: unknown, clientId: string): Promise<TrimRecord | null> {
  if (typeof token !== 'string' || !/^[0-9a-f]{32}$/.test(token) || !env.PORTAL_KV) return null;
  const raw = await env.PORTAL_KV.get(undoKey(token));
  if (!raw) return null;
  try {
    const rec = JSON.parse(raw) as TrimRecord;
    if (!rec || !same(rec.clientId, clientId) || !Array.isArray(rec.rows)) return null;
    if (rec.exp * 1000 <= Date.now()) return null;
    return rec;
  } catch {
    return null;
  }
}

async function writeRecord(env: Env, token: string, rec: TrimRecord): Promise<boolean> {
  if (!env.PORTAL_KV) return false;
  try {
    await env.PORTAL_KV.put(undoKey(token), JSON.stringify(rec), { expirationTtl: UNDO_SECONDS });
    return true;
  } catch (err) {
    console.error('hq: storing a trim undo record threw', err);
    return false;
  }
}

const sessionRow = (s: PieceStep, title: (id: string | null) => string | null) => ({
  id: s.id, title: s.title, date: s.date, moment: title(s.momentId),
});

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;
  const { body } = gate;

  const clientId = typeof body.clientId === 'string' && isNotionId(body.clientId) ? body.clientId : null;
  if (!clientId) return hqJson({ ok: false, error: 'invalid' }, 400);
  const facts = await clientFacts(env.NOTION_TOKEN, clientId);
  if (!facts) return portalNotFound();
  const today = new Date().toISOString().slice(0, 10);
  const drop = () => Promise.all([dropHq(env), facts.slug ? dropPortalData(facts.slug) : Promise.resolve()]);

  /* ── put it back ───────────────────────────────────────────── */
  if (body.revert === true) {
    const rec = await readRecord(env, body.undo, clientId);
    if (!rec) return hqJson({ ok: false, error: 'gone', detail: 'That trim can no longer be undone.' }, 410);
    let done = 0;
    let failed = 0;
    // Steps first: a step that comes back before its pieces is merely
    // early, while pieces that come back under a skipped step would be
    // counted toward a month for a job nobody is doing.
    for (const row of [...rec.rows].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'step' ? -1 : 1))) {
      const props: Record<string, unknown> = { ...stamp, Notes: notes(row.notes) };
      if (row.status !== undefined) props.Status = select(row.status);
      if (row.date !== undefined) props[row.kind === 'piece' ? 'Post Date' : 'Date'] = { date: row.date ? { start: row.date } : null };
      if (await patchRow(env.NOTION_TOKEN, row.id, props, 'undoing a trim')) done++; else failed++;
    }
    if (!failed && env.PORTAL_KV) await env.PORTAL_KV.delete(undoKey(body.undo as string));
    await drop();
    return hqJson({ ok: failed === 0, undone: done, failed });
  }

  const cal = await fetchClientCalendar(env.NOTION_TOKEN, clientId, facts.artist);
  const momentTitle = (id: string | null) => cal.moments.find((m) => same(m.id, id))?.title ?? null;

  /* ── skip the film sessions it emptied ─────────────────────── */
  if ('sessions' in body) {
    const want = ids(body.sessions);
    const rec = await readRecord(env, body.undo, clientId);
    if (!want || !rec) return hqJson({ ok: false, error: 'invalid' }, 400);
    const idle = sessionsNoLongerNeeded(cal.steps, rec.trimmedSteps);
    const chosen = idle.filter((s) => want.some((id) => same(id, s.id)));
    const line = trimNote(today, 'no pieces left to film for');
    let skipped = 0;
    for (const s of chosen) {
      const ok = await patchRow(env.NOTION_TOKEN, s.id,
        { ...stamp, Status: select('Skipped'), Notes: notes(appendNote(s.notes, line)) }, 'skipping a film session');
      if (!ok) continue;
      skipped++;
      rec.rows.push({ id: s.id, kind: 'step', status: s.status, notes: s.notes ?? null });
    }
    if (skipped) await writeRecord(env, body.undo as string, rec);
    await drop();
    return hqJson({ ok: skipped === chosen.length, skipped });
  }

  /* ── the month, and what could go ──────────────────────────── */
  const month = typeof body.month === 'string' && MONTH.test(body.month) ? body.month : null;
  if (!month) return hqJson({ ok: false, error: 'invalid', rejected: ['month'] }, 400);
  const { first, last } = monthBounds(month);
  const rows = await fetchMonthPieces(env.NOTION_TOKEN, clientId, first, last);
  const counted = rows.filter((p) => countsToward(p));
  const stepIdOf = (p: PieceRow): string | null =>
    p.campaign.find((id) => cal.steps.some((s) => same(s.id, id))) ?? null;
  const pieces: TrimPiece[] = counted.map((p) => ({
    id: p.id, title: p.title, status: p.status, postDate: p.postDate, media: p.media ?? null, stepId: stepIdOf(p),
  }));
  const plan = suggestTrims(pieces, cal.steps, cal.moments, MONTH_CAP);

  if (body.dryRun === true) {
    return hqJson({ ok: true, dryRun: true, month, cap: MONTH_CAP, canUndo: !!env.PORTAL_KV, ...plan });
  }

  /* ── do it ─────────────────────────────────────────────────── */
  const cut = ids(body.cut ?? []);
  const move = ids(body.move ?? []);
  if (!cut || !move) return hqJson({ ok: false, error: 'invalid' }, 400);
  if (!cut.length && !move.length) return hqJson({ ok: false, error: 'invalid', detail: 'Nothing was ticked.' }, 400);
  if (cut.length + move.length > MAX_TRIM_ROWS) {
    return hqJson({ ok: false, error: 'too_many', detail: `Trim ${MAX_TRIM_ROWS} at a time.` }, 400);
  }
  const rowOf = (id: string) => plan.rows.find((r) => same(r.pieceId, id));
  const cutRows = cut.map(rowOf);
  const moveRows = move.map(rowOf);
  // Every id has to be a candidate of this plan, and nothing may be
  // both cut and moved. One bad id refuses the lot: a list that is
  // partly wrong is a list nobody should act on.
  if (cutRows.some((r) => !r) || moveRows.some((r) => !r || !r.canMove || !r.moveTo)
      || cut.some((id) => move.some((m) => same(m, id)))) {
    return hqJson({ ok: false, error: 'stale', detail: 'The month has changed since that list was made. Open it again.' }, 409);
  }

  const linked = await fetchLinkedPieces(env.NOTION_TOKEN, clientId);
  const rowById = new Map(rows.map((p) => [normaliseNotionId(p.id), p]));
  const rec: TrimRecord = {
    clientId, month, trimmedSteps: [], rows: [],
    exp: Math.floor(Date.now() / 1000) + UNDO_SECONDS,
  };
  const goneNow = new Set<string>();
  let cutDone = 0, movedDone = 0, stepsDone = 0, failed = 0;

  for (const r of cutRows) {
    const piece = rowById.get(normaliseNotionId(r!.pieceId));
    if (!piece) { failed++; continue; }
    const line = trimNote(today, r!.reason);
    const ok = await patchRow(env.NOTION_TOKEN, piece.id,
      { ...stamp, Status: select('Skipped'), Notes: notes(appendNote(piece.notes, line)) }, 'trimming a piece');
    if (!ok) { failed++; continue; }
    cutDone++;
    goneNow.add(normaliseNotionId(piece.id));
    rec.rows.push({ id: piece.id, kind: 'piece', status: piece.status, notes: piece.notes ?? null });
  }
  // A step goes when every piece it has is gone: the ones just cut,
  // and any that were Skipped already. A flyer with one row left
  // stays in the plan.
  const stepsHit = new Set(cutRows.map((r) => r!.stepId).filter((id): id is string => !!id).map(normaliseNotionId));
  for (const sid of stepsHit) {
    const step = cal.steps.find((s) => same(s.id, sid));
    if (!step || ['Done', 'Skipped', 'Moved'].includes(step.status ?? '')) continue;
    const mine = linked.filter((p) => p.campaign.some((id) => same(id, sid)));
    const allGone = mine.length > 0
      && mine.every((p) => p.status === 'Skipped' || goneNow.has(normaliseNotionId(p.id)));
    if (!allGone) continue;
    const reason = cutRows.find((r) => r!.stepId && same(r!.stepId, sid))!.reason;
    const ok = await patchRow(env.NOTION_TOKEN, step.id,
      { ...stamp, Status: select('Skipped'), Notes: notes(appendNote(step.notes, trimNote(today, reason))) }, 'trimming a step');
    if (!ok) { failed++; continue; }
    stepsDone++;
    rec.trimmedSteps.push(step.id);
    rec.rows.push({ id: step.id, kind: 'step', status: step.status, notes: step.notes ?? null });
    step.status = 'Skipped';
  }

  for (const r of moveRows) {
    const piece = rowById.get(normaliseNotionId(r!.pieceId));
    if (!piece || !piece.postDate) { failed++; continue; }
    const line = moveNote(today, piece.postDate.slice(0, 10));
    const ok = await patchRow(env.NOTION_TOKEN, piece.id,
      { ...stamp, 'Post Date': { date: { start: r!.moveTo } }, Notes: notes(appendNote(piece.notes, line)) }, 'moving a piece a month');
    if (!ok) { failed++; continue; }
    movedDone++;
    rec.rows.push({ id: piece.id, kind: 'piece', date: piece.postDate, notes: piece.notes ?? null });
    // Its step goes with it when this is the only piece the step has
    // left in play, so the calendar and the pipeline keep agreeing.
    const step = r!.stepId ? cal.steps.find((s) => same(s.id, r!.stepId)) : null;
    if (!step || ['Done', 'Skipped', 'Moved'].includes(step.status ?? '')) continue;
    const others = linked.filter((p) => p.campaign.some((id) => same(id, step.id))
      && !same(p.id, piece.id) && p.status !== 'Skipped');
    if (others.length) continue;
    const moved = await patchRow(env.NOTION_TOKEN, step.id,
      { ...stamp, Date: { date: { start: r!.moveTo } }, Notes: notes(appendNote(step.notes, line)) }, 'moving a step a month');
    if (!moved) { failed++; continue; }
    stepsDone++;
    rec.rows.push({ id: step.id, kind: 'step', date: step.date, notes: step.notes ?? null });
    step.date = r!.moveTo;
  }

  let token = '';
  if (rec.rows.length) {
    token = newToken();
    if (!await writeRecord(env, token, rec)) token = '';
  }
  await drop();
  const idle = sessionsNoLongerNeeded(cal.steps, rec.trimmedSteps);
  return hqJson({
    ok: failed === 0,
    cut: cutDone, moved: movedDone, steps: stepsDone, failed,
    landsAt: plan.planned - cutDone - movedDone,
    undo: token || undefined,
    sessions: idle.map((s) => sessionRow(s, momentTitle)),
  });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
