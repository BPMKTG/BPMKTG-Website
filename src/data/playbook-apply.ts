// ─────────────────────────────────────────────────────────────
// Applying a playbook to a moment: the plan.
//
// A playbook is a list of master steps, each so many days before or
// after a moment. Applying one copies those steps onto a real moment
// of one client's, with that client's approved overrides already in,
// and creates the work each step owes: a Blueprint post for an
// artist, a photo set or a footage batch for a gym.
//
// This file works out WHAT would be written, as data, so the preview
// and the write are the same list and a test can read it. It writes
// nothing and talks to nothing.
//
// The rules, in the order they are applied to each step:
//
//   already there   A step this playbook already put on this moment
//                   is never made twice. It is recognised by the
//                   master's id stored on the copy, or, on steps from
//                   before that id was kept, by its title.
//   late            A step whose day has already passed is created as
//                   Skipped, so the plan says what was missed without
//                   putting a to-do in the past. One of us can keep it
//                   live instead. A skipped step owes nothing.
//   pending         When the CLIENT applies a playbook, a step that is
//                   ours to do is created waiting for us to confirm
//                   it, and owes nothing until we do. What we take on
//                   in a month is ours to decide, not a form's.
//   per team        A step whose notes say "One piece per ..." needs a
//                   number before it can be applied.
// ─────────────────────────────────────────────────────────────

import { deliverableOfFlow, type DeliverableKind } from './deliveries';
import { isDeliverableFlow, MAX_PIECES } from './pieces';
import type { EffectiveStep } from './playbooks';
import { ALL_STEP_FLOWS, flowOwner, type StepFlow } from './portal';

export type ApplyMark = 'reworded' | 'shifted' | 'reassigned' | 'added';

/** The most rows one per-team step may ask for. A gym has a dozen
 *  teams, not a hundred, and every row is a write. */
export const MAX_TEAM_PIECES = 24;

export interface ApplyMoment {
  id: string;
  title: string;
  /** The start day. A multi-day moment is counted from its first. */
  date: string | null;
  hidden?: boolean;
}

/** A step already on a calendar, as much as the plan reads. */
export interface ExistingStep {
  id: string;
  title: string;
  momentId: string | null;
  date: string | null;
  status: string | null;
  playbook?: string | null;
  defaultMedia?: string | null;
  /** The master it was copied from, when that was kept. */
  masterId?: string | null;
}

export interface ApplyRow {
  /** EffectiveStep.key: the master's id, or `add:<override id>`. */
  key: string;
  masterId: string | null;
  title: string;
  playbook: string;
  phase: string | null;
  offset: number | null;
  date: string | null;
  flow: StepFlow;
  owner: 'Blueprint' | 'Client';
  type: 'Content' | 'Admin';
  priority: string | null;
  defaultMedia: string | null;
  notes: string | null;
  where: string | null;
  why: string | null;
  brief: string | null;
  asksNotes: boolean;
  /** What an approved override did to it. */
  marks: ApplyMark[];
  /** Its day is before today. */
  late: boolean;
  /** As it will be created. */
  status: 'Not Started' | 'Skipped';
  /** Created waiting for one of us to confirm it. */
  pending: boolean;
  /** Needs a number of rows from whoever is applying. */
  perTeam: boolean;
  /** What it owes, and how many. Zero when skipped or pending. */
  owes: 'post' | DeliverableKind | null;
  pieces: number;
  /** Pieces as the master has it, which is what the copy carries
   *  unless a per-team number was given. */
  masterPieces: number | null;
  /** A step within three days on another campaign that looks like it. */
  overlap: string | null;
}

export interface ApplyPlan {
  rows: ApplyRow[];
  /** Steps this playbook already has on this moment. */
  alreadyThere: number;
  /** Left out by an approved skip. */
  skipped: string[];
  /** Per-team steps still waiting for a number. */
  needs: string[];
}

export interface ApplyOptions {
  today: string;
  /** Who is applying. A client's Blueprint steps wait for us. */
  role: 'admin' | 'client';
  /** Late steps to create live anyway, by key. Admin only. */
  keep?: readonly string[];
  /** Rows for a per-team step, by key. */
  pieces?: Readonly<Record<string, number>>;
}

const DAY = /^\d{4}-\d{2}-\d{2}/;
const dayOf = (v: string | null | undefined): string | null => (v && DAY.test(v) ? v.slice(0, 10) : null);

function plusDays(day: string, n: number): string | null {
  const t = Date.parse(`${day.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return new Date(t + n * 86400000).toISOString().slice(0, 10);
}

const sameId = (a: unknown, b: unknown): boolean =>
  !!a && !!b && String(a).replace(/-/g, '').toLowerCase() === String(b).replace(/-/g, '').toLowerCase();

const norm = (t: string | null | undefined): string =>
  (t ?? '').toLowerCase().replace(/\([^)]*\)/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();

/** Does this step's note ask for one row per team? */
export function isPerTeam(notes: string | null | undefined): boolean {
  return /\bone piece per\b/i.test(notes ?? '');
}

/**
 * Flow, Owner and Type, never blank.
 *
 * A copy with no Flow is drawn on no layer, and one with no Owner can
 * be ticked by nobody. A master should have all three; where one does
 * not, each is read off the others, and the last resort is our own
 * task, which is the one answer that hides nothing from us.
 *
 * A flow that owes a delivery is the exception to "Owner wins": it is
 * kept whatever Owner says, and Owner is read off it. What we owe a
 * gym is decided by Flow alone, so a master with a stale Owner cannot
 * turn a photo set into a post of ours.
 */
export function completeStep(s: { flow: string | null; owner: string | null; type: string | null }): {
  flow: StepFlow; owner: 'Blueprint' | 'Client'; type: 'Content' | 'Admin';
} {
  const known = (ALL_STEP_FLOWS as readonly string[]).includes(s.flow ?? '') ? s.flow as StepFlow : null;
  if (known && deliverableOfFlow(known)) {
    return { flow: known, owner: flowOwner(known) ?? 'Client', type: 'Content' };
  }
  const owner: 'Blueprint' | 'Client' = s.owner === 'Client' || s.owner === 'Blueprint'
    ? s.owner : (known ? flowOwner(known) : null) ?? 'Blueprint';
  const posts = known ? /posts/.test(known) : s.type === 'Content';
  const type: 'Content' | 'Admin' = s.type === 'Content' || s.type === 'Admin' ? s.type : posts ? 'Content' : 'Admin';
  const flow: StepFlow = known && flowOwner(known) === owner ? known
    : owner === 'Client' ? (type === 'Content' ? 'Client makes + posts' : 'Client task')
    : (type === 'Content' ? 'Blueprint makes + posts' : 'Blueprint task');
  return { flow, owner, type };
}

/** What an approved override did to a step, read off what it changed. */
export function marksOf(s: EffectiveStep): ApplyMark[] {
  const out: ApplyMark[] = [];
  if (s.added) out.push('added');
  if (s.was.title !== undefined) out.push('reworded');
  if ('offset' in s.was) out.push('shifted');
  if ('flow' in s.was) out.push('reassigned');
  return out;
}

/** Is this playbook step already on the moment? */
function alreadyOn(s: EffectiveStep, onMoment: readonly ExistingStep[]): boolean {
  const titles = new Set([s.title, s.was.title].filter(Boolean).map((t) => (t as string).trim().toLowerCase()));
  return onMoment.some((e) => (s.masterId && sameId(e.masterId, s.masterId))
    || (e.masterId && sameId(e.masterId, s.key))
    // A copy from before the master's id was kept is known by its
    // title, under the name it has now or the one the master gives it.
    || (!e.masterId && titles.has(e.title.trim().toLowerCase())));
}

/**
 * A step on another of this client's campaigns that this one would
 * land on top of: within three days, and the same kind of thing (the
 * same Default Media, or near enough the same title).
 */
export function overlapFor(
  row: { title: string; date: string | null; defaultMedia: string | null }, momentId: string,
  others: readonly ExistingStep[], momentTitle: (id: string | null) => string | null,
): string | null {
  const day = dayOf(row.date);
  if (!day) return null;
  const at = Date.parse(`${day}T00:00:00Z`);
  for (const o of others) {
    if (!o.momentId || sameId(o.momentId, momentId)) continue;
    if (o.status === 'Skipped' || o.status === 'Moved') continue;
    const od = dayOf(o.date);
    if (!od) continue;
    const gap = Math.abs(Date.parse(`${od}T00:00:00Z`) - at) / 86400000;
    if (gap > 3) continue;
    const sameMedia = !!row.defaultMedia && row.defaultMedia === (o.defaultMedia ?? null);
    const sameTitle = !!norm(row.title) && norm(row.title) === norm(o.title);
    if (!sameMedia && !sameTitle) continue;
    const where = momentTitle(o.momentId) ?? 'another campaign';
    return `${gap === 0 ? 'Same day as' : `${gap} day${gap === 1 ? '' : 's'} from`} "${o.title}" on ${where}`;
  }
  return null;
}

/**
 * The plan: every step this playbook would put on this moment.
 *
 * `steps` is the playbook as this client gets it, overrides in.
 * `onMoment` is what the moment has already; `others` is the rest of
 * the client's calendar, for overlaps.
 */
export function planApplyRun(
  steps: readonly EffectiveStep[], moment: ApplyMoment,
  onMoment: readonly ExistingStep[], others: readonly ExistingStep[],
  momentTitle: (id: string | null) => string | null, opts: ApplyOptions,
): ApplyPlan {
  const keep = new Set(opts.role === 'admin' ? (opts.keep ?? []) : []);
  const rows: ApplyRow[] = [];
  const needs: string[] = [];
  let alreadyThere = 0;
  const start = dayOf(moment.date);

  for (const s of steps) {
    if (s.skipped) continue;
    if (alreadyOn(s, onMoment)) { alreadyThere += 1; continue; }

    const done = completeStep(s);
    const date = start && s.offset !== null ? plusDays(start, s.offset) : null;
    const late = !!date && date < opts.today;
    const skippedLate = late && !keep.has(s.key);
    // A client's own step is theirs to add. One of ours waits for us,
    // and so does one of theirs that has us shoot: the step is hers,
    // but the delivery behind it is our work, and what we take on
    // stays our decision.
    const delivery = deliverableOfFlow(done.flow);
    const pending = opts.role === 'client' && (done.owner === 'Blueprint' || !!delivery) && !skippedLate;
    const live = !skippedLate && !pending;

    const owes: ApplyRow['owes'] = delivery ?? (isDeliverableFlow(done.flow) ? 'post' : null);
    // A delivery is one row per step, whatever the step's Pieces and
    // however many teams it is "one per": not every team goes to every
    // competition, so the step stands for the batch, as it does on the
    // calendar. Only a post of ours is still counted per team.
    const perTeam = owes === 'post' && isPerTeam(s.notes);
    let pieces = 0;
    if (owes && live) {
      if (perTeam) {
        const asked = opts.pieces?.[s.key];
        if (typeof asked === 'number' && Number.isInteger(asked) && asked >= 1 && asked <= MAX_TEAM_PIECES) pieces = asked;
        else needs.push(s.key);
      } else {
        const n = typeof s.pieces === 'number' && s.pieces >= 1 ? Math.min(MAX_PIECES, Math.round(s.pieces)) : 1;
        pieces = delivery ? 1 : n;
      }
    }

    rows.push({
      key: s.key, masterId: s.masterId, title: s.title, playbook: s.playbook, phase: s.phase,
      offset: s.offset, date, ...done,
      priority: s.priority ?? null, defaultMedia: s.defaultMedia ?? null,
      notes: s.notes, where: s.where, why: s.why, brief: s.brief ?? null, asksNotes: !!s.asksNotes,
      marks: marksOf(s), late, status: skippedLate ? 'Skipped' : 'Not Started', pending,
      perTeam, owes, pieces, masterPieces: typeof s.pieces === 'number' ? s.pieces : null,
      overlap: skippedLate ? null : overlapFor(
        { title: s.title, date, defaultMedia: s.defaultMedia ?? null }, moment.id, others, momentTitle),
    });
  }
  rows.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999') || (a.offset ?? 0) - (b.offset ?? 0));
  return {
    rows, alreadyThere,
    skipped: steps.filter((s) => s.skipped).map((s) => s.title),
    needs,
  };
}

/** What the note on a late step says, so the reason is on the row. */
export function lateNote(today: string): string {
  return `Skipped when the playbook was applied on ${today}: its day had already passed.`;
}

/* ── undo ─────────────────────────────────────────────────────── */

export interface UndoStep { id: string; title: string; status: string | null; masterId: string | null; pending?: boolean }
export interface UndoRow { id: string; stepId: string; status: string | null }

/**
 * What undoing an apply may take back.
 *
 * Only a step this apply made (it carries a master id), that nobody
 * has touched since (still Not Started), and whose work has not
 * started (every row it owes is still Planned). Anything else is left
 * where it is and named, because by then it is somebody's work and not
 * a mistake to tidy away.
 */
export function planUndo(
  asked: readonly string[], steps: readonly UndoStep[], rows: readonly UndoRow[],
): { remove: Array<{ id: string; rows: string[] }>; kept: Array<{ id: string; title: string; why: string }> } {
  const remove: Array<{ id: string; rows: string[] }> = [];
  const kept: Array<{ id: string; title: string; why: string }> = [];
  for (const id of asked) {
    const step = steps.find((s) => sameId(s.id, id));
    if (!step) continue;
    const mine = rows.filter((r) => sameId(r.stepId, step.id));
    if (!step.masterId) { kept.push({ id: step.id, title: step.title, why: 'not made by applying a playbook' }); continue; }
    if (step.status !== 'Not Started' && step.status !== 'Skipped') {
      kept.push({ id: step.id, title: step.title, why: `already ${step.status ?? 'changed'}` }); continue;
    }
    const started = mine.find((r) => r.status !== 'Planned' && r.status !== 'Skipped');
    if (started) { kept.push({ id: step.id, title: step.title, why: `its work is already ${started.status}` }); continue; }
    remove.push({ id: step.id, rows: mine.map((r) => r.id) });
  }
  return { remove, kept };
}

/* ── a new moment ─────────────────────────────────────────────── */

export const MAX_EVENT_NAME = 120;
export const MAX_CITY = 80;
export const MAX_MOMENT_NOTES = 1000;

export interface NewMoment {
  event: string;
  city: string | null;
  momentType: string;
  date: string;
  dateEnd: string | null;
  notes: string | null;
}

const isDay = (v: unknown): v is string => {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const t = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
};
const line = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.replace(/\s+/g, ' ').trim();
  return s && s.length <= max ? s : null;
};

/**
 * A new moment, checked. The Moment Type has to be one this client's
 * type has, which is the only thing that stops a gym being given a
 * Release or an artist a Competition.
 */
export function cleanNewMoment(
  body: Record<string, unknown>, momentTypes: readonly string[],
): { ok: true; value: NewMoment } | { ok: false; rejected: string[] } {
  const rejected: string[] = [];
  const event = line(body.event, MAX_EVENT_NAME);
  if (!event) rejected.push('event');
  const momentType = typeof body.momentType === 'string' && momentTypes.includes(body.momentType) ? body.momentType : null;
  if (!momentType) rejected.push('momentType');
  if (!isDay(body.date)) rejected.push('date');
  const endRaw = body.dateEnd === undefined || body.dateEnd === null || body.dateEnd === '' ? null : body.dateEnd;
  if (endRaw !== null && (!isDay(endRaw) || (isDay(body.date) && endRaw < body.date))) rejected.push('dateEnd');
  const cityRaw = body.city === undefined || body.city === null || body.city === '' ? null : body.city;
  const city = cityRaw === null ? null : line(cityRaw, MAX_CITY);
  if (cityRaw !== null && !city) rejected.push('city');
  const notesRaw = typeof body.notes === 'string' ? body.notes.trim() : '';
  if (notesRaw.length > MAX_MOMENT_NOTES) rejected.push('notes');
  if (rejected.length || !event || !momentType) return { ok: false, rejected };
  const end = endRaw as string | null;
  return { ok: true, value: {
    event, city, momentType, date: body.date as string,
    // A one-day moment has no end. Notion draws "Dec 6 → Dec 6" otherwise.
    dateEnd: end && end !== body.date ? end : null,
    notes: notesRaw || null,
  } };
}

/** "[Client] · [Event] ([City])", the way every moment is titled. */
export function momentTitleFor(client: string, m: { event: string; city: string | null }): string {
  return `${client} · ${m.event}${m.city ? ` (${m.city})` : ''}`;
}
