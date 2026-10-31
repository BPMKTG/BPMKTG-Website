/* ──────────────────────────────────────────────────────────────
   Moving a moment, and the steps that hang off it.

   SERVER ONLY, but pure: no fetch, no Notion, no clock. The endpoint
   reads the rows, hands them here, and writes what comes back.

   The reason this is its own file is that a cascade is the one write in
   the portal that touches many rows at once. Working out WHICH rows,
   and what each one becomes, is the part that has to be right, and it
   is much easier to be sure of when it can be read on one screen and
   tested without a network.

   Two rules it exists to hold:

     1. A FROZEN STEP DOES NOT MOVE. Skipped, Moved and Done are the
        record of what happened. The release slipping a week does not
        retroactively change the day we skipped something.
     2. THE PLAN IS REVERSIBLE. Every write records the value it
        replaced, so Undo is a replay of the old values rather than an
        arithmetic guess at the inverse.
   ────────────────────────────────────────────────────────────── */

import { isIsoDay, isMoveDays, movesWithMoment, shiftIsoDay } from '../data/portal';

/**
 * The most steps one cascade will move.
 *
 * Not a taste decision: every step is its own Notion write, and a
 * Worker gets a fixed budget of outgoing requests per incoming one.
 * Forty steps plus the moment plus the reads sits comfortably inside
 * the smallest of those budgets. Past this we refuse the whole thing
 * and say so, because half a moved campaign is worse than none.
 */
export const MAX_CASCADE_STEPS = 40;

/** The little of a step that moving it needs to know. */
export interface MoveStep {
  id: string;
  status: string | null;
  date: string | null;
  /** Shifted along with the start when a row ever has a range. Nothing
   *  in Campaign Calendar does today, which is exactly why it is
   *  carried rather than dropped: a range added later must not be
   *  silently flattened to a single day. */
  dateEnd?: string | null;
}

/** One row's worth of change, with the value it replaces. */
export interface MoveWrite {
  id: string;
  from: string | null;
  fromEnd?: string | null;
  to: string;
  toEnd?: string | null;
}

export interface MovePlan {
  /** Days asked for, echoed back so a caller cannot drift from it. */
  days: number;
  /** The moment's own change. */
  moment: MoveWrite;
  /** The steps that move with it, in the order they will be written. */
  steps: MoveWrite[];
  /** Linked steps left alone because they are frozen. Counted so the
   *  dialog can be honest about what a drag does and does not do. */
  frozen: number;
}

/**
 * What a cascade will do, decided before anything is written.
 *
 * Returns null when there is nothing legitimate to do: a move of zero
 * or more than the cap, a moment with no date to move from, a date
 * Notion gave us that is not a date, or more steps than the cap.
 */
export function planMomentMove(
  moment: { id: string; date: string | null; dateEnd?: string | null },
  steps: MoveStep[],
  days: number,
): MovePlan | null {
  if (!isMoveDays(days)) return null;
  if (!isIsoDay(moment.date)) return null;
  if (steps.length > MAX_CASCADE_STEPS) {
    console.error('portal: a cascade of', steps.length, 'steps is too many');
    return null;
  }

  const to = shiftIsoDay(moment.date, days);
  if (!to) return null;

  const writes: MoveWrite[] = [];
  let frozen = 0;

  for (const step of steps) {
    // A step is identified by its own row, and a moment cannot be its
    // own step. Both are guards against a relation pointing oddly.
    if (!step.id || step.id === moment.id) continue;
    if (!movesWithMoment(step)) { frozen += 1; continue; }
    // A step with no date is positioned by nothing, so there is
    // nothing to shift. It is not frozen either: it was never placed.
    if (!isIsoDay(step.date)) continue;

    const next = shiftIsoDay(step.date, days);
    if (!next) continue;

    const write: MoveWrite = { id: step.id, from: step.date, to: next };
    if (isIsoDay(step.dateEnd) || (typeof step.dateEnd === 'string' && step.dateEnd)) {
      const end = shiftIsoDay(step.dateEnd as string, days);
      if (end) { write.fromEnd = step.dateEnd as string; write.toEnd = end; }
    }
    writes.push(write);
  }

  const mw: MoveWrite = { id: moment.id, from: moment.date, to };
  if (typeof moment.dateEnd === 'string' && moment.dateEnd) {
    const end = shiftIsoDay(moment.dateEnd, days);
    if (end) { mw.fromEnd = moment.dateEnd; mw.toEnd = end; }
  }

  return { days, moment: mw, steps: writes, frozen };
}

/**
 * The same plan, backwards.
 *
 * Built from the recorded `from` values rather than by shifting by
 * -days, so a row somebody else edited in between is put back to what
 * it was when we changed it, and a row we never wrote is never
 * touched. An entry whose old value was empty is dropped: clearing a
 * date is not the opposite of moving one.
 */
export function reverseWrites(writes: MoveWrite[]): MoveWrite[] {
  const out: MoveWrite[] = [];
  for (const w of writes) {
    if (!isIsoDay(w.from)) continue;
    const back: MoveWrite = { id: w.id, from: w.to, to: w.from };
    if (w.fromEnd && w.toEnd) { back.fromEnd = w.toEnd; back.toEnd = w.fromEnd; }
    out.push(back);
  }
  return out;
}

/** The Notion date property for one write. */
export function dateProperty(w: MoveWrite): Record<string, unknown> {
  return { Date: { date: w.toEnd ? { start: w.to, end: w.toEnd } : { start: w.to } } };
}

/* ── what the undo record holds ───────────────────────────────── */

/**
 * A cascade, kept so it can be taken back.
 *
 * Page ids and dates, nothing else. It is stored server-side and handed
 * to the browser as an opaque token, because a browser that could post
 * its own list of "put these pages back to these dates" would be a
 * browser that could write any date to any page it knew the id of.
 */
export interface MoveUndo {
  slug: string;
  momentId: string;
  /** How far it moved, so the toast after an undo can say so. */
  days: number;
  /** Every write that actually landed. Each one carries the value it
   *  replaced, which is what the undo writes back. */
  writes: MoveWrite[];
  exp: number;
}

/**
 * Cascades one client may run in a minute.
 *
 * Separate from the ordinary write limit and much tighter, because one
 * of these is thirty Notion requests rather than one. Thirty ordinary
 * writes a minute is a person typing; thirty cascades a minute is
 * nine hundred requests, and the thing it would break is our Notion
 * integration for every client at once.
 */
export const MOVE_LIMIT = 6;
export const MOVE_WINDOW_SECONDS = 60;

/** How long Undo stays good. Longer than the toast, because the toast
 *  is the prompt and not the deadline: a client who notices a minute
 *  later should still be able to say so from the drawer. */
export const UNDO_SECONDS = 15 * 60;

export function isMoveUndo(value: unknown): value is MoveUndo {
  if (!value || typeof value !== 'object') return false;
  const u = value as Partial<MoveUndo>;
  return typeof u.slug === 'string'
    && typeof u.momentId === 'string'
    && typeof u.days === 'number'
    && typeof u.exp === 'number'
    && Array.isArray(u.writes)
    && u.writes.every((w) => w && typeof w.id === 'string' && isIsoDay(w.to));
}
