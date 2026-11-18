/* ──────────────────────────────────────────────────────────────
   Applying a playbook, on the server: what is read to make the plan,
   and how the plan is written.

   SERVER ONLY. The plan itself is src/data/playbook-apply.ts; this
   file fetches what it needs, and turns its rows into Notion pages.

   Two callers: HQ (one of us, applying to any client) and the portal
   (a client, applying to themselves). Both hand over a client they
   have already established from a signed session and a Clients row.
   Nothing here reads a client, an Owner or a Flow from a request.

   Never writes to a master. Every row it creates is a copy with Is
   Playbook unticked, or a Content Pipeline row.
   ────────────────────────────────────────────────────────────── */

import { isArtist, type ClientTypeConfig } from '../data/client-types';
import { deliverableOfFlow, type DeliverableKind, type NewDelivery } from '../data/deliveries';
import {
  isDeliverableFlow, piecesForStep, planMissingPieces, type PieceStep, type PlannedPiece,
} from '../data/pieces';
import {
  cleanNewMoment, isPerTeam, lateNote, momentTitleFor, planApplyRun, planUndo, MAX_TEAM_PIECES,
  type ApplyRow, type ExistingStep,
} from '../data/playbook-apply';
import { effectivePlaybook, isRetiredPlaybook, mastersForType } from '../data/playbooks';
import { isDeliveryPage, newDeliveryProperties } from './deliveries';
import {
  archiveRow, createPiece, fetchClientCalendar, fetchLinkedPieces, patchRow, shapeStep, PIECE_WRITE_BUDGET,
} from './pieces';
import { createIn, fetchMasters, fetchOverrides, stepProperties, vocabularyOf } from './playbooks';
import {
  CALENDAR_DB, CONTENT_DB, fetchPage, normaliseNotionId, queryAll, readCheckbox, readDate, readRelation,
  readSelect, readText,
} from './portal-notion';

export interface ApplyClient {
  pageId: string;
  /** The Clients row's title, taken off the front of a moment's name. */
  artist: string;
  slug: string | null;
  type: ClientTypeConfig;
}

export const MASTER_PROP = 'Master Step ID';
export const PENDING_PROP = 'Pending Blueprint';

const same = (a: unknown, b: unknown): boolean =>
  !!a && !!b && normaliseNotionId(String(a)) === normaliseNotionId(String(b));
const select = (name: string | null) => ({ select: name ? { name } : null });
const rich = (v: string | null) => ({ rich_text: v ? [{ text: { content: v.slice(0, 1900) } }] : [] });
const editor = (role: 'admin' | 'client') => select(role === 'admin' ? 'Blueprint' : 'Client');

/** A delivery row, as much as applying reads. */
interface DeliveryRow { id: string; stepId: string | null; status: string | null }

async function fetchDeliveryRows(token: string, clientPageId: string): Promise<DeliveryRow[]> {
  const rows = await queryAll(token, CONTENT_DB, {
    filter: { and: [
      { property: 'Client', relation: { contains: clientPageId } },
      { property: 'Deliverable', select: { is_not_empty: true } },
    ] },
  });
  return rows
    .filter((page: any) => readRelation(page?.properties?.['Client']).some((id) => same(id, clientPageId)))
    .filter(isDeliveryPage)
    .map((page: any) => ({
      id: String(page.id),
      stepId: readRelation(page.properties?.['Campaign'])[0] ?? null,
      status: readSelect(page.properties?.['Status']),
    }));
}

/** One of a step's rows, titled so several can be told apart. */
function deliveryFor(
  kind: DeliverableKind, momentTitle: string, stepTitle: string, i: number, n: number,
  stepId: string, due: string | null,
): NewDelivery {
  const base = `${momentTitle} ${stepTitle}`.trim().slice(0, 170);
  return { title: n > 1 ? `${base} · ${i} of ${n}` : base, kind, due, momentId: stepId };
}

/** The Pieces a copy carries: the number given for a per-team step,
 *  otherwise exactly what its master says, blank included. */
const copyPieces = (row: ApplyRow): number | null =>
  (row.perTeam ? (row.pieces || null) : row.masterPieces);

/** The Notion page a plan row becomes. */
export function copyProperties(
  row: ApplyRow, client: ApplyClient, momentId: string, hidden: boolean,
  role: 'admin' | 'client', today: string,
): Record<string, unknown> {
  const base = stepProperties({
    title: row.title, playbook: row.playbook, phase: row.phase, offset: row.offset, date: row.date,
    flow: row.flow, owner: row.owner, type: row.type, notes: row.notes, where: row.where, why: row.why,
    priority: row.priority, defaultMedia: row.defaultMedia, pieces: copyPieces(row),
    brief: row.brief, asksNotes: row.asksNotes,
  }, client.pageId, momentId, { hidden });
  return {
    ...base,
    // A step that owes a delivery carries what the tracker reads off
    // it, the same three a step that owes a post carries.
    ...(deliverableOfFlow(row.flow) ? {
      Priority: select(row.priority),
      'Default Media': select(row.defaultMedia),
      Pieces: { number: copyPieces(row) },
    } : {}),
    [MASTER_PROP]: rich(row.key),
    Status: select(row.status),
    ...(row.status === 'Skipped'
      ? { Notes: rich([row.notes, lateNote(today)].filter(Boolean).join('\n')) } : {}),
    ...(row.pending ? { [PENDING_PROP]: { checkbox: true } } : {}),
    ...(isArtist(client.type) ? {} : { 'Client Type': select(client.type.notion) }),
    'Last Edited By': editor(role),
  };
}

export interface ApplyAsk {
  momentId: string;
  playbook: string;
  dryRun: boolean;
  keep: string[];
  pieces: Record<string, number>;
}

/** Reads a request's apply options. Nothing here is trusted beyond
 *  its shape: which client, and who is asking, come from the caller. */
export function readApplyAsk(body: Record<string, unknown>, isId: (v: unknown) => boolean): ApplyAsk | null {
  if (typeof body.momentId !== 'string' || !isId(body.momentId)) return null;
  if (typeof body.playbook !== 'string' || !body.playbook.trim()) return null;
  const keep = Array.isArray(body.keep) ? body.keep.filter((k): k is string => typeof k === 'string').slice(0, 80) : [];
  const pieces: Record<string, number> = {};
  if (body.pieces && typeof body.pieces === 'object' && !Array.isArray(body.pieces)) {
    for (const [k, v] of Object.entries(body.pieces as Record<string, unknown>).slice(0, 40)) {
      if (typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= MAX_TEAM_PIECES) pieces[k] = v;
    }
  }
  return { momentId: body.momentId, playbook: body.playbook.trim(), dryRun: body.dryRun === true, keep, pieces };
}

export interface ApplyAnswer { status: number; body: Record<string, unknown> }

const toExisting = (s: PieceStep): ExistingStep => ({
  id: s.id, title: s.title, momentId: s.momentId, date: s.date, status: s.status,
  playbook: s.playbook, defaultMedia: s.defaultMedia, masterId: s.masterId ?? null,
});

/**
 * Plan, and unless it is a dry run, write.
 *
 * One call writes a limited number of rows and says what is left, so
 * the page asks again until nothing is. Every call plans from what
 * Notion holds now, which is what makes a second call, a double click
 * and "apply it again next week" all safe: a step that is there is
 * never made twice.
 */
export async function runApply(
  token: string, client: ApplyClient, ask: ApplyAsk, role: 'admin' | 'client', today: string,
): Promise<ApplyAnswer> {
  const [every, overrides, cal] = await Promise.all([
    fetchMasters(token),
    fetchOverrides(token, client.pageId),
    fetchClientCalendar(token, client.pageId, client.artist),
  ]);
  // Only this client's type of playbook exists for them.
  const masters = mastersForType(every, client.type.id);
  if (!vocabularyOf(masters).playbooks.includes(ask.playbook)) {
    return { status: 400, body: { ok: false, error: 'invalid', rejected: ['playbook'] } };
  }
  if (isRetiredPlaybook(ask.playbook)) {
    return { status: 400, body: { ok: false, error: 'retired', detail: 'Retired steps are not a playbook and cannot be applied.' } };
  }
  const moment = cal.moments.find((m) => same(m.id, ask.momentId));
  if (!moment) return { status: 404, body: { ok: false, error: 'not_found' } };
  // A client plans what they can see. A moment we are holding back is
  // not theirs to build on.
  if (role === 'client' && moment.hidden) return { status: 404, body: { ok: false, error: 'not_found' } };

  const effective = effectivePlaybook(masters, overrides, ask.playbook, client.pageId);
  const onMoment = cal.steps.filter((s) => same(s.momentId, ask.momentId));
  const titleOf = (id: string | null) => cal.moments.find((m) => same(m.id, id))?.title ?? null;
  const plan = planApplyRun(effective, moment, onMoment.map(toExisting), cal.steps.map(toExisting), titleOf,
    { today, role, keep: ask.keep, pieces: ask.pieces });

  /* What steps this playbook already has here still owe. */
  const mine = onMoment.filter((s) => s.playbook === ask.playbook && !s.pending
    && s.status !== 'Skipped' && s.status !== 'Moved');
  const gym = client.type.features.deliveries;
  const [linked, deliveries] = await Promise.all([
    gym ? Promise.resolve([]) : fetchLinkedPieces(token, client.pageId),
    gym ? fetchDeliveryRows(token, client.pageId) : Promise.resolve([] as DeliveryRow[]),
  ]);
  const owedPosts: PlannedPiece[] = gym ? [] : planMissingPieces(onMoment, [moment], linked, { stepIds: mine.map((s) => s.id) });
  const owedDeliveries: Array<{
    step: PieceStep; kind: DeliverableKind; missing: number; have: number; want: number; perTeam: boolean; sized: boolean;
  }> = [];
  // Per-team steps already here with no number on them yet. They owe
  // rows nobody can count until one of us says how many teams.
  const owedNeeds: string[] = [];
  if (gym && role === 'admin') {
    for (const s of mine) {
      const kind = deliverableOfFlow(s.flow);
      if (!kind || s.status === 'Done') continue;
      const have = deliveries.filter((d) => same(d.stepId, s.id)).length;
      const stored = typeof s.pieces === 'number' && s.pieces >= 1 ? Math.round(s.pieces) : null;
      const perTeam = isPerTeam(s.notes);
      const asked = ask.pieces[s.id];
      // A number already on the step stands. One given now is written
      // onto the step, so the next apply does not have to ask again.
      const want = stored ?? (perTeam ? (asked ?? 0) : 1);
      if (perTeam && !stored && !asked && !have) { owedNeeds.push(s.id); }
      if (want > have || (perTeam && !stored && !asked && !have)) {
        owedDeliveries.push({ step: s, kind, missing: Math.max(0, want - have), have, want, perTeam, sized: !!stored || !!asked });
      }
    }
  }
  const owedCount = owedPosts.length + owedDeliveries.reduce((n, d) => n + d.missing, 0);

  /* What the new steps owe. */
  const future: PieceStep[] = plan.rows.map((r, i) => ({
    id: `new:${i}`, title: r.title, playbook: r.playbook, phase: r.phase, flow: r.flow,
    status: r.status, date: r.date, momentId: ask.momentId, priority: r.priority,
    defaultMedia: r.defaultMedia, pieces: r.masterPieces, hidden: moment.hidden,
  }));
  const everyStep = [...onMoment, ...future];
  const newPosts = plan.rows.map((r, i) => (r.owes === 'post' && r.pieces > 0 && isDeliverableFlow(r.flow)
    ? piecesForStep(future[i], moment, everyStep) : []));
  const rowCount = (r: ApplyRow, i: number) => (r.owes === 'post' ? newPosts[i].length : r.owes ? r.pieces : 0);
  const pieceCount = plan.rows.reduce((n, r, i) => n + rowCount(r, i), 0) + owedCount;

  const facts = {
    moment: moment.title, momentDate: moment.date, playbook: ask.playbook,
    alreadyThere: plan.alreadyThere, alreadyApplied: plan.alreadyThere > 0,
    skipped: plan.skipped, needs: [...plan.needs, ...owedNeeds],
  };

  if (ask.dryRun) {
    return { status: 200, body: {
      ok: true, dryRun: true, ...facts,
      steps: plan.rows.map((r, i) => ({
        key: r.key, title: r.title, date: r.date, offset: r.offset, phase: r.phase,
        flow: r.flow, owner: r.owner, priority: r.priority, marks: r.marks,
        late: r.late, status: r.status, pending: r.pending, perTeam: r.perTeam,
        owes: r.owes, pieces: rowCount(r, i), overlap: r.overlap,
      })),
      pieceCount, owedCount,
      // What steps already on the moment still owe, so the page can
      // ask for a team count where one is missing.
      owed: owedDeliveries.map((o) => ({
        key: o.step.id, title: o.step.title, date: o.step.date, owes: o.kind,
        missing: o.missing, perTeam: o.perTeam && !o.sized,
      })),
    } };
  }

  // A per-team step with no number cannot be written: how many rows
  // it owes is the one thing the plan cannot work out for itself.
  if (plan.needs.length || owedNeeds.length) {
    return { status: 400, body: { ok: false, error: 'needs_pieces', rejected: [...plan.needs, ...owedNeeds], ...facts } };
  }

  let budget = PIECE_WRITE_BUDGET;
  let created = 0;
  let piecesCreated = 0;
  let stopped = false;
  const createdIds: string[] = [];
  for (let i = 0; i < plan.rows.length; i++) {
    const row = plan.rows[i];
    const cost = 1 + rowCount(row, i);
    // A step and everything it owes go in one request or not at all,
    // unless it owes more than a request can ever hold.
    if (cost > budget && budget < PIECE_WRITE_BUDGET) break;
    const page = await createIn(token, CALENDAR_DB,
      copyProperties(row, client, ask.momentId, moment.hidden, role, today), 'a step');
    if (!page) { stopped = true; break; }
    budget--;
    created++;
    const made = shapeStep(page);
    createdIds.push(made.id);
    if (row.owes === 'post') {
      for (const piece of newPosts[i]) {
        if (budget < 1) break;
        const ok = await createPiece(token, { ...piece, stepId: made.id }, client.pageId);
        budget--;
        if (!ok) { stopped = true; break; }
        piecesCreated++;
      }
    } else if (row.owes) {
      for (let n = 1; n <= row.pieces; n++) {
        if (budget < 1) break;
        const d = deliveryFor(row.owes, moment.title, row.title, n, row.pieces, made.id, row.date);
        const ok = await createIn(token, CONTENT_DB,
          { ...newDeliveryProperties(d, client.pageId), 'Hide from Client': { checkbox: !!moment.hidden } }, 'a delivery');
        budget--;
        if (!ok) { stopped = true; break; }
        piecesCreated++;
      }
    }
    if (stopped) break;
  }
  // Rows that steps already here still owe: a write that stopped
  // halfway, or a step whose rows were never made.
  if (!stopped && created === plan.rows.length) {
    for (const piece of owedPosts) {
      if (budget < 1) break;
      const ok = await createPiece(token, piece, client.pageId);
      budget--;
      if (!ok) { stopped = true; break; }
      piecesCreated++;
    }
    for (const o of owedDeliveries) {
      // The team count just given is kept on the step itself.
      if (o.perTeam && !(typeof o.step.pieces === 'number' && o.step.pieces >= 1) && o.want > 0 && budget > 0) {
        await patchRow(token, o.step.id, { Pieces: { number: o.want }, 'Last Edited By': editor(role) }, 'sizing a per-team step');
        budget--;
      }
      for (let n = o.have + 1; n <= o.want && !stopped; n++) {
        if (budget < 1) break;
        const d = deliveryFor(o.kind, moment.title, o.step.title, n, o.want, o.step.id, o.step.date);
        const ok = await createIn(token, CONTENT_DB,
          { ...newDeliveryProperties(d, client.pageId), 'Hide from Client': { checkbox: !!moment.hidden } }, 'a delivery');
        budget--;
        if (!ok) { stopped = true; break; }
        piecesCreated++;
      }
    }
  }

  return { status: 200, body: {
    ok: !stopped || created > 0 || piecesCreated > 0,
    created, remaining: plan.rows.length - created,
    piecesCreated, piecesRemaining: Math.max(0, pieceCount - piecesCreated),
    createdIds, stopped, ...facts,
  } };
}

/**
 * Take back what an apply made, as far as is safe. See planUndo for
 * what "safe" is. Rows are archived, which Notion keeps for thirty
 * days, never deleted outright.
 */
export async function runUndo(
  token: string, client: ApplyClient, momentId: string, stepIds: readonly string[],
): Promise<ApplyAnswer> {
  const gym = client.type.features.deliveries;
  const [cal, linked, deliveries] = await Promise.all([
    fetchClientCalendar(token, client.pageId, client.artist, { momentId }),
    gym ? Promise.resolve([]) : fetchLinkedPieces(token, client.pageId),
    gym ? fetchDeliveryRows(token, client.pageId) : Promise.resolve([] as DeliveryRow[]),
  ]);
  // Only steps on this moment, which the query above already limited.
  const steps = cal.steps.filter((s) => same(s.momentId, momentId))
    .map((s) => ({ id: s.id, title: s.title, status: s.status, masterId: s.masterId ?? null }));
  const rows = [
    ...linked.flatMap((p) => p.campaign.map((stepId) => ({ id: p.id, stepId, status: p.status }))),
    ...deliveries.filter((d) => d.stepId).map((d) => ({ id: d.id, stepId: d.stepId as string, status: d.status })),
  ];
  const plan = planUndo(stepIds, steps, rows);
  let budget = PIECE_WRITE_BUDGET;
  let removed = 0;
  let left = 0;
  for (const r of plan.remove) {
    if (r.rows.length + 1 > budget) { left++; continue; }
    let ok = true;
    for (const id of r.rows) { budget--; if (!(await archiveRow(token, id, 'undoing an apply'))) { ok = false; break; } }
    if (!ok) { left++; continue; }
    budget--;
    if (await archiveRow(token, r.id, 'undoing an apply')) removed++; else left++;
  }
  return { status: 200, body: { ok: true, removed, remaining: left, kept: plan.kept } };
}

/** A new moment for this client. `by` is who is adding it: a client's
 *  own is flagged so HQ is told. */
export async function createMoment(
  token: string, client: ApplyClient, body: Record<string, unknown>, role: 'admin' | 'client',
): Promise<ApplyAnswer> {
  const cleaned = cleanNewMoment(body, client.type.moments.map((m) => m.type));
  if (!cleaned.ok) return { status: 400, body: { ok: false, error: 'invalid', rejected: cleaned.rejected } };
  const m = cleaned.value;
  const page = await createIn(token, CALENDAR_DB, {
    Item: { title: [{ text: { content: momentTitleFor(client.artist, m) } }] },
    Kind: select('Moment'),
    'Moment Type': select(m.momentType),
    Date: { date: { start: m.date, ...(m.dateEnd ? { end: m.dateEnd } : {}) } },
    'Venue / City': rich(m.city),
    Client: { relation: [{ id: client.pageId }] },
    ...(isArtist(client.type) ? {} : { 'Client Type': select(client.type.notion) }),
    Notes: rich(m.notes),
    Status: select('Not Started'),
    'Is Playbook': { checkbox: false },
    'Hide from Client': { checkbox: false },
    ...(role === 'client' ? { [PENDING_PROP]: { checkbox: true } } : {}),
    'Last Edited By': editor(role),
  }, 'a moment');
  if (!page) return { status: 502, body: { ok: false, error: 'write_failed' } };
  return { status: 200, body: { ok: true, moment: {
    id: String(page.id), title: `${m.event}${m.city ? ` (${m.city})` : ''}`, date: m.date,
    dateEnd: m.dateEnd, momentType: m.momentType,
  } } };
}

/**
 * One of us answers something a client added.
 *
 *   seen      a moment they created: noted, flag cleared
 *   confirm   a step of ours they added: it is ours now, and what it
 *             owes is created
 *   skip      that step is not happening: Skipped, flag cleared
 */
export async function answerPending(
  token: string, pageId: string, action: string, pieces: number | null,
  clientOf: (clientPageId: string) => Promise<ApplyClient | null>,
): Promise<ApplyAnswer & { slug?: string | null }> {
  const page = await fetchPage(token, pageId);
  const p = page?.properties ?? {};
  if (!page || page.object !== 'page' || page.archived || readCheckbox(p['Is Playbook'])
      || !readCheckbox(p[PENDING_PROP])) {
    return { status: 404, body: { ok: false, error: 'not_found' } };
  }
  const client = await clientOf(readRelation(p['Client'])[0] ?? '');
  if (!client) return { status: 404, body: { ok: false, error: 'not_found' } };
  const clear = { [PENDING_PROP]: { checkbox: false }, 'Last Edited By': select('Blueprint') };
  const kind = readSelect(p['Kind']);

  if (kind === 'Moment') {
    if (action !== 'seen') return { status: 400, body: { ok: false, error: 'invalid', rejected: ['action'] } };
    const ok = await patchRow(token, pageId, clear, 'noting a client’s moment');
    return { status: ok ? 200 : 502, body: { ok: !!ok }, slug: client.slug };
  }
  if (action === 'skip') {
    const ok = await patchRow(token, pageId, { ...clear, Status: select('Skipped') }, 'skipping a pending step');
    return { status: ok ? 200 : 502, body: { ok: !!ok }, slug: client.slug };
  }
  if (action !== 'confirm') return { status: 400, body: { ok: false, error: 'invalid', rejected: ['action'] } };

  const step = shapeStep(page);
  const momentId = step.momentId;
  const cal = momentId
    ? await fetchClientCalendar(token, client.pageId, client.artist, { momentId })
    : { steps: [], moments: [] };
  const moment = cal.moments.find((m) => same(m.id, momentId)) ?? null;
  const kindOwed = deliverableOfFlow(step.flow);
  const perTeam = isPerTeam(readText(p['Notes']));
  let count = 0;
  if (kindOwed) {
    count = perTeam ? (pieces ?? 0) : (typeof step.pieces === 'number' && step.pieces >= 1 ? Math.round(step.pieces) : 1);
    if (count < 1 || count > MAX_TEAM_PIECES) {
      return { status: 400, body: { ok: false, error: 'needs_pieces', rejected: ['pieces'] } };
    }
  }
  const cleared = await patchRow(token, pageId,
    { ...clear, ...(kindOwed && perTeam ? { Pieces: { number: count } } : {}) }, 'confirming a pending step');
  if (!cleared) return { status: 502, body: { ok: false, error: 'write_failed' } };

  let made = 0;
  if (kindOwed) {
    for (let n = 1; n <= count; n++) {
      const d = deliveryFor(kindOwed, moment?.title ?? '', step.title, n, count, step.id, readDate(p['Date']));
      const ok = await createIn(token, CONTENT_DB,
        { ...newDeliveryProperties(d, client.pageId), 'Hide from Client': { checkbox: !!step.hidden } }, 'a delivery');
      if (!ok) break;
      made++;
    }
  } else if (isDeliverableFlow(step.flow)) {
    const confirmed = { ...step, pending: false };
    const others = cal.steps.map((s) => (same(s.id, step.id) ? confirmed : s));
    for (const piece of piecesForStep(confirmed, moment, others)) {
      if (!(await createPiece(token, piece, client.pageId))) break;
      made++;
    }
  }
  return { status: 200, body: { ok: true, confirmed: true, pieces: made }, slug: client.slug };
}
