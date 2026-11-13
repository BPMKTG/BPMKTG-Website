// ─────────────────────────────────────────────────────────────
// Playbooks: the masters, a client's overrides, and what the two
// make together.
//
// A playbook is a set of Campaign Calendar rows with Is Playbook
// ticked: steps placed by an offset in days from a moment. Applying
// one to a client's moment copies its steps onto their calendar.
//
// An override is one client's standing exception to one playbook:
// this step earlier, that one ours rather than theirs, this one not
// at all. It lives in its own database and changes nothing by itself.
// Only an Approved override applies, and only where something asks
// for the playbook as that client sees it:
//
//   - the timeline drawn for that client, in HQ and in their portal
//   - a playbook being applied to one of their moments
//   - the explicit "apply to open steps" button, never automatically
//
// Draft, Requested and Declined overrides are shown and never applied.
//
// Nothing here talks to Notion. The server reads rows into these
// shapes and writes back what the planners return.
// ─────────────────────────────────────────────────────────────

import { flowOwner, isStepFlow, type StepFlow } from './portal';

/* ── shapes ───────────────────────────────────────────────────── */

export interface MasterStep {
  id: string;
  title: string;
  playbook: string;
  phase: string | null;
  /** Days from the moment. Negative is before it. */
  offset: number | null;
  flow: string | null;
  owner: string | null;
  type: string | null;
  notes: string | null;
  where: string | null;
  why: string | null;
  /** The playbook's own placeholder moment, which is what lets Notion
   *  compute an Auto Date for a master. A new master step has to be
   *  hung off the same one. */
  momentId: string | null;
  /** Ticked on a master we do not want a client reading. None are
   *  today; the flag is honoured so ticking one works. */
  hideFromClient?: boolean;
}

export const OVERRIDE_STATUSES = ['Draft', 'Requested', 'Approved', 'Declined'] as const;
export type OverrideStatus = typeof OVERRIDE_STATUSES[number];

export const CHANGE_TYPES = ['Shift timing', 'Reassign', 'Skip', 'Add step', 'Reword'] as const;
export type ChangeType = typeof CHANGE_TYPES[number];

export interface PlaybookOverride {
  id: string;
  /** The row's own title: a sentence about the change. */
  change: string;
  clientId: string | null;
  playbook: string | null;
  masterStepId: string | null;
  changeType: string | null;
  newOffset: number | null;
  newFlow: string | null;
  newTitle: string | null;
  reason: string | null;
  status: string | null;
  requestedBy: string | null;
  created: string | null;
}

/** One step of a playbook as one client gets it. */
export interface EffectiveStep {
  /** The master's id, or `add:<override id>` for a step that exists
   *  only because of an override. */
  key: string;
  masterId: string | null;
  title: string;
  playbook: string;
  phase: string | null;
  offset: number | null;
  flow: string | null;
  owner: string | null;
  type: string | null;
  notes: string | null;
  where: string | null;
  why: string | null;
  /** What the master says, for each thing an override changed. Absent
   *  means unchanged. */
  was: { title?: string; offset?: number | null; flow?: string | null };
  /** Still listed, so the timeline can show it struck through, but
   *  never created. */
  skipped: boolean;
  added: boolean;
  /** The overrides that made this step what it is. */
  overrideIds: string[];
}

const sameId = (id: unknown): string => String(id ?? '').replace(/-/g, '').toLowerCase();

/* ── saying an offset ─────────────────────────────────────────── */

/** "21 days before", "1 day after", "On the day". */
export function offsetLabel(offset: number | null): string {
  if (offset === null || !Number.isFinite(offset)) return 'No day set';
  if (offset === 0) return 'On the day';
  const n = Math.abs(offset);
  return `${n} day${n === 1 ? '' : 's'} ${offset < 0 ? 'before' : 'after'}`;
}

/** Who does a step, in the two words a client uses. */
export function stepWho(step: { flow: string | null; owner: string | null }): 'You' | 'Blueprint' {
  const owner = (isStepFlow(step.flow) ? flowOwner(step.flow) : null) ?? step.owner;
  return owner === 'Client' ? 'You' : 'Blueprint';
}

/* ── is an override ready to mean something ───────────────────── */

/**
 * Why this override cannot be approved yet, or null when it can.
 *
 * A client's request arrives as a reason and nothing else: they say
 * what bothers them, not which column to change. Approving that as it
 * stands would approve nothing, so an override has to say what it
 * does before it can be switched on.
 */
export function overrideProblem(o: PlaybookOverride): string | null {
  if (!o.clientId) return 'It is not linked to a client.';
  const needsStep = 'Pick the step it changes.';
  switch (o.changeType) {
    case 'Shift timing':
      if (!o.masterStepId) return needsStep;
      return o.newOffset === null ? 'Say the new offset in days.' : null;
    case 'Reassign':
      if (!o.masterStepId) return needsStep;
      return isStepFlow(o.newFlow) ? null : 'Pick the new flow.';
    case 'Skip':
      return o.masterStepId ? null : needsStep;
    case 'Reword':
      if (!o.masterStepId) return needsStep;
      return (o.newTitle ?? '').trim() ? null : 'Say the new wording.';
    case 'Add step':
      if (!o.playbook) return 'Say which playbook it is added to.';
      if (!(o.newTitle ?? '').trim()) return 'Give the new step a title.';
      if (o.newOffset === null) return 'Say which day it lands on.';
      return isStepFlow(o.newFlow) ? null : 'Pick who does it.';
    default:
      return 'Say what kind of change it is first.';
  }
}

/** Does this override apply to anything at all right now? */
export function isApplied(o: PlaybookOverride): boolean {
  return o.status === 'Approved' && overrideProblem(o) === null;
}

/* ── a playbook, as one client gets it ────────────────────────── */

/** The phase an added step should sit in: whichever phase the nearest
 *  master step at or before its day is in, so it lands in a group that
 *  makes sense rather than in one of its own. */
export function nearestPhase(masters: readonly MasterStep[], offset: number | null): string | null {
  if (offset === null) return null;
  let best: MasterStep | null = null;
  for (const m of masters) {
    if (m.offset === null) continue;
    if (!best) { best = m; continue; }
    const d = Math.abs(m.offset - offset), bd = Math.abs((best.offset as number) - offset);
    // On a tie, the earlier step: a new step joins the group it follows.
    if (d < bd || (d === bd && m.offset <= offset && (best.offset as number) > offset)) best = m;
  }
  return best?.phase ?? null;
}

/**
 * One playbook's steps with one client's Approved overrides applied.
 *
 * With no client, or a client with nothing approved, this is the
 * master, step for step. Overrides are applied oldest first, so two on
 * the same step compose in the order they were made.
 */
export function effectivePlaybook(
  masters: readonly MasterStep[],
  overrides: readonly PlaybookOverride[],
  playbook: string,
  clientId: string | null,
): EffectiveStep[] {
  const mine = masters.filter((m) => m.playbook === playbook);
  const byId = new Map(mine.map((m) => [sameId(m.id), m]));
  const steps = new Map<string, EffectiveStep>(mine.map((m) => [sameId(m.id), {
    key: m.id, masterId: m.id, title: m.title, playbook: m.playbook, phase: m.phase,
    offset: m.offset, flow: m.flow, owner: m.owner, type: m.type,
    notes: m.notes, where: m.where, why: m.why,
    was: {}, skipped: false, added: false, overrideIds: [],
  }]));
  const added: EffectiveStep[] = [];

  const live = clientId
    ? overrides
      .filter((o) => isApplied(o) && sameId(o.clientId) === sameId(clientId))
      .sort((a, b) => (a.created ?? '').localeCompare(b.created ?? ''))
    : [];

  for (const o of live) {
    if (o.changeType === 'Add step') {
      if (o.playbook !== playbook) continue;
      const flow = o.newFlow as StepFlow;
      added.push({
        key: `add:${o.id}`, masterId: null, title: (o.newTitle ?? '').trim(), playbook,
        phase: nearestPhase(mine, o.newOffset), offset: o.newOffset, flow,
        owner: flowOwner(flow),
        // A step that makes a post is content; anything else is a job.
        type: /posts/.test(flow) ? 'Content' : 'Admin',
        notes: o.reason, where: null, why: null,
        was: {}, skipped: false, added: true, overrideIds: [o.id],
      });
      continue;
    }
    const step = steps.get(sameId(o.masterStepId));
    const master = byId.get(sameId(o.masterStepId));
    if (!step || !master) continue;   // an override on another playbook's step
    step.overrideIds.push(o.id);
    switch (o.changeType) {
      case 'Shift timing':
        if (!('offset' in step.was)) step.was.offset = master.offset;
        step.offset = o.newOffset;
        break;
      case 'Reassign':
        if (!('flow' in step.was)) step.was.flow = master.flow;
        step.flow = o.newFlow;
        step.owner = flowOwner(o.newFlow as StepFlow);
        break;
      case 'Reword':
        if (!('title' in step.was)) step.was.title = master.title;
        step.title = (o.newTitle ?? '').trim();
        break;
      case 'Skip':
        step.skipped = true;
        break;
    }
  }

  return [...steps.values(), ...added].sort((a, b) =>
    (a.offset ?? 9999) - (b.offset ?? 9999) || a.title.localeCompare(b.title));
}

/** Steps under their phases, phases in the order they happen. */
export function byPhase<T extends { phase: string | null; offset: number | null }>(
  steps: readonly T[],
): Array<{ phase: string; steps: T[] }> {
  const groups = new Map<string, T[]>();
  for (const s of steps) {
    const k = s.phase ?? 'No phase';
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(s);
  }
  const first = (list: T[]) => Math.min(...list.map((s) => s.offset ?? 9999));
  return [...groups].map(([phase, list]) => ({ phase, steps: list }))
    .sort((a, b) => first(a.steps) - first(b.steps) || a.phase.localeCompare(b.phase));
}

/** The playbooks there are, in the order a campaign runs through them
 *  where we know it, alphabetical after. */
const PLAYBOOK_ORDER = ['Release Rollout', 'Release Sprint', 'Remix Drop',
  'Pre-Show', 'Show Night', 'Post-Show'];

export function playbookNames(masters: readonly MasterStep[]): string[] {
  const rank = (n: string) => { const i = PLAYBOOK_ORDER.indexOf(n); return i === -1 ? 99 : i; };
  return [...new Set(masters.map((m) => m.playbook))]
    .sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
}

/* ── applying a playbook to a moment ──────────────────────────── */

/** An ISO day, N days on from another. */
export function addDaysIso(day: string, n: number): string | null {
  const t = Date.parse(`${day.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(t)) return null;
  return new Date(t + n * 86_400_000).toISOString().slice(0, 10);
}

export interface PlannedStep {
  title: string;
  playbook: string;
  phase: string | null;
  offset: number | null;
  /** The moment's date plus the offset, or null when either is missing. */
  date: string | null;
  flow: string | null;
  owner: string | null;
  type: string | null;
  notes: string | null;
  where: string | null;
  why: string | null;
}

/**
 * The steps to create when a playbook is applied to a moment.
 *
 * Takes the playbook as the client gets it, so their Approved
 * overrides are already in: a shifted step lands on its shifted day, a
 * reassigned one has its new Flow and Owner, a skipped one is not here
 * at all and an added one is. Steps already on the moment under the
 * same title are left out, so applying twice does not double a
 * campaign.
 */
export function planApply(
  steps: readonly EffectiveStep[],
  momentDate: string | null,
  existingTitles: readonly string[] = [],
): PlannedStep[] {
  const have = new Set(existingTitles.map((t) => t.trim().toLowerCase()));
  return steps
    .filter((s) => !s.skipped && !have.has(s.title.trim().toLowerCase()))
    .map((s) => ({
      title: s.title, playbook: s.playbook, phase: s.phase, offset: s.offset,
      date: momentDate && s.offset !== null ? addDaysIso(momentDate, s.offset) : null,
      flow: s.flow, owner: s.owner, type: s.type,
      notes: s.notes, where: s.where, why: s.why,
    }));
}

/* ── applying one override to campaigns already running ───────── */

/** A step on a client's calendar, as much as the planner reads. */
export interface OpenStep {
  id: string;
  title: string;
  playbook: string | null;
  phase: string | null;
  offset: number | null;
  status: string | null;
  momentId: string | null;
}

export interface UpcomingMoment {
  id: string;
  title: string;
  date: string | null;
}

export type OverrideWrite =
  | { kind: 'patch'; stepId: string; momentId: string; momentTitle: string; stepTitle: string;
      says: string; set: { offset?: number; date?: string | null; flow?: string; owner?: string | null;
                           status?: string; title?: string } }
  | { kind: 'create'; momentId: string; momentTitle: string; step: PlannedStep };

/** Statuses a step can still be changed in. Done is history, and a
 *  step someone skipped or moved by hand was a decision already. */
const STILL_OPEN: readonly string[] = ['Not Started', 'In Progress'];

/**
 * Does this calendar step come from this master?
 *
 * By title first, which is how nearly every copy matches. A copy that
 * was reworded on the calendar no longer does, so the fallback is the
 * place it sits: the same offset in the same phase, when that place
 * belongs to exactly one master. Anything looser would let an
 * override land on the wrong step.
 */
export function stepFromMaster(
  step: OpenStep, master: MasterStep, playbookMasters: readonly MasterStep[],
): boolean {
  if (step.playbook !== master.playbook) return false;
  if (step.title.trim() === master.title.trim()) return true;
  if (playbookMasters.some((m) => m.title.trim() === step.title.trim())) return false;
  if (step.offset === null || step.offset !== master.offset || step.phase !== master.phase) return false;
  return playbookMasters.filter((m) => m.offset === master.offset && m.phase === master.phase).length === 1;
}

/**
 * What "apply to open steps in upcoming moments" would write.
 *
 * Approving an override changes what future campaigns get and leaves
 * running ones alone. This is the other half, and it is only ever run
 * on purpose: the list it returns is shown before anything is written.
 * Only steps that are still open, on moments that have not happened.
 */
export function planOverrideOnOpen(
  o: PlaybookOverride,
  masters: readonly MasterStep[],
  steps: readonly OpenStep[],
  moments: readonly UpcomingMoment[],
  today: string,
): OverrideWrite[] {
  if (!isApplied(o)) return [];
  const ahead = new Map(moments
    .filter((m) => !!m.date && m.date.slice(0, 10) >= today)
    .map((m) => [sameId(m.id), m]));
  const out: OverrideWrite[] = [];

  if (o.changeType === 'Add step') {
    const pb = masters.filter((m) => m.playbook === o.playbook);
    const flow = o.newFlow as StepFlow;
    for (const m of ahead.values()) {
      const onMoment = steps.filter((s) => sameId(s.momentId) === sameId(m.id));
      // Only campaigns that are actually running this playbook.
      if (!onMoment.some((s) => s.playbook === o.playbook)) continue;
      const title = (o.newTitle ?? '').trim();
      if (onMoment.some((s) => s.title.trim().toLowerCase() === title.toLowerCase())) continue;
      out.push({
        kind: 'create', momentId: m.id, momentTitle: m.title,
        step: {
          title, playbook: o.playbook as string, phase: nearestPhase(pb, o.newOffset),
          offset: o.newOffset, date: addDaysIso(m.date as string, o.newOffset as number),
          flow, owner: flowOwner(flow), type: /posts/.test(flow) ? 'Content' : 'Admin',
          notes: o.reason, where: null, why: null,
        },
      });
    }
    return out;
  }

  const master = masters.find((m) => sameId(m.id) === sameId(o.masterStepId));
  if (!master) return [];
  const pb = masters.filter((m) => m.playbook === master.playbook);
  for (const s of steps) {
    const m = ahead.get(sameId(s.momentId));
    if (!m || !STILL_OPEN.includes(s.status ?? '')) continue;
    if (!stepFromMaster(s, master, pb)) continue;
    const base = { kind: 'patch' as const, stepId: s.id, momentId: m.id, momentTitle: m.title, stepTitle: s.title };
    switch (o.changeType) {
      case 'Shift timing': {
        if (s.offset === o.newOffset) break;
        const date = addDaysIso(m.date as string, o.newOffset as number);
        out.push({ ...base, says: `moves to ${offsetLabel(o.newOffset)}`,
                   set: { offset: o.newOffset as number, date } });
        break;
      }
      case 'Reassign':
        out.push({ ...base, says: `becomes ${o.newFlow}`,
                   set: { flow: o.newFlow as string, owner: flowOwner(o.newFlow as StepFlow) } });
        break;
      case 'Skip':
        out.push({ ...base, says: 'is skipped', set: { status: 'Skipped' } });
        break;
      case 'Reword': {
        const title = (o.newTitle ?? '').trim();
        if (title === s.title.trim()) break;
        out.push({ ...base, says: `is reworded to "${title}"`, set: { title } });
        break;
      }
    }
  }
  return out;
}

/* ── what a client is sent ────────────────────────────────────── */

/** One step of a timeline, as the client's browser receives it.
 *  Built field by field: Notes are ours, and never in here. */
export interface ClientPlaybookStep {
  /** The master's id, which is what "Request a change" refers to.
   *  Empty for a step that exists only because of an override. */
  key: string;
  title: string;
  offset: number | null;
  who: 'You' | 'Blueprint';
  where: string | null;
  why: string | null;
  /** An approved change of theirs is in this step. */
  changed: boolean;
}

export interface ClientPlaybook {
  name: string;
  phases: Array<{ phase: string; steps: ClientPlaybookStep[] }>;
}

export interface ClientRequest {
  id: string;
  /** The step it is about, by title, or null for a request about the
   *  playbook as a whole. */
  step: string | null;
  playbook: string | null;
  reason: string | null;
  status: string | null;
  created: string | null;
}

/** Every playbook as this client gets it: their approved overrides
 *  applied, skipped steps gone, hidden masters left out. */
export function clientPlaybooks(
  masters: readonly MasterStep[], overrides: readonly PlaybookOverride[], clientId: string,
): ClientPlaybook[] {
  const hidden = new Set(masters.filter((m) => m.hideFromClient).map((m) => m.id));
  return playbookNames(masters).map((name) => {
    const steps = effectivePlaybook(masters, overrides, name, clientId)
      .filter((s) => !s.skipped && !(s.masterId && hidden.has(s.masterId)));
    return {
      name,
      phases: byPhase(steps).map((g) => ({
        phase: g.phase,
        steps: g.steps.map((s) => ({
          key: s.masterId ?? '',
          title: s.title,
          offset: s.offset,
          who: stepWho(s),
          where: s.where,
          why: s.why,
          changed: s.added || s.overrideIds.length > 0,
        })),
      })),
    };
  }).filter((p) => p.phases.length);
}

/** The requests this client made, newest first. Overrides we drafted
 *  for them are not theirs to see until they are approved, and then
 *  they show up as the changed step, not as a request. */
export function clientRequests(
  masters: readonly MasterStep[], overrides: readonly PlaybookOverride[], clientId: string,
): ClientRequest[] {
  const title = new Map(masters.map((m) => [sameId(m.id), m.title]));
  return overrides
    .filter((o) => sameId(o.clientId) === sameId(clientId) && o.requestedBy === 'Client')
    .sort((a, b) => (b.created ?? '').localeCompare(a.created ?? ''))
    .map((o) => ({
      id: o.id,
      step: o.masterStepId ? title.get(sameId(o.masterStepId)) ?? null : null,
      playbook: o.playbook,
      reason: o.reason,
      status: o.status,
      created: o.created,
    }));
}
