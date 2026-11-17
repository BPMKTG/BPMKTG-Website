// ─────────────────────────────────────────────────────────────
// "Update campaigns to current playbook".
//
// The masters change: steps are renamed, moved, given a brief,
// retired. Campaigns already on a client's calendar were copied from
// the masters as they were, and nothing connects a copy back to the
// row it came from. This file is the plan for bringing those copies
// up to date IN PLACE. It never applies a playbook, and the only step
// it ever creates is one of the few named in AUDIT_ADDS.
//
// Everything here is a decision, and none of it is a write: the
// server reads the rows into these shapes, shows what planUpdate
// returns, and writes it only when asked. The rules, in the order
// they are applied to a step:
//
//   match    which master a step came from: by title, by a city or
//            track name standing in a placeholder, or by an alias for
//            the wording it had before. No match is reported, never
//            guessed at.
//   freeze   a step that is done, skipped, moved, in the past, or
//            whose piece is already being made is not touched at all.
//   retire   a step whose master was retired is skipped, and its
//            Planned pieces with it.
//   update   otherwise: the new title (keeping the client's own
//            words), the brief and the fields that describe the piece,
//            and a new date if the master's offset moved, unless the
//            date was set by hand.
// ─────────────────────────────────────────────────────────────

import { addDaysIso, isRetiredPlaybook, playbooksOfPhase, type MasterStep } from './playbooks';
import {
  isDeliverableFlow, planMissingPieces, type ExistingPiece, type PieceMoment, type PieceStep,
} from './pieces';
import { countsToward } from './portal-content';

/* ── shapes ───────────────────────────────────────────────────── */

/** The checkbox a master ticks to give the client's card a note box.
 *  In the plan it travels as 'Yes' or nothing, like every other field
 *  the plan copies. */
export const ASKS_FIELD = 'Ask for Notes';

export interface UpStep extends PieceStep {
  offset: number | null;
  brief: string | null;
  where: string | null;
  why: string | null;
  /** The step asks the client for a note. Absent reads as no. */
  asksNotes?: boolean;
}

export interface UpPiece extends ExistingPiece {
  postedBy: string | null;
  notes: string | null;
}

export interface UpdateOptions {
  today: string;
  /** The client's name, for "artist" in a title. */
  artist: string;
  /** Moments that are mid-flight and scheduled by hand: titles and
   *  briefs are still brought up to date, no date is changed, and
   *  nothing is added. */
  noDates?: readonly string[];
  /** Moments where a date set by hand may be moved all the same. For
   *  a campaign that is being brought into line on purpose: a step
   *  goes to the day the playbook now gives it, unless that day has
   *  already passed. `noDates` wins if a moment is in both. */
  redate?: readonly string[];
  /** Steps to leave exactly as they are, whatever the plan says. */
  exclude?: readonly string[];
  /** Only these moments. Absent means every moment the client has. */
  moments?: readonly string[];
}

export type UpdateAction = 'frozen' | 'kept' | 'unmatched' | 'current' | 'skip' | 'update' | 'add';

export interface FieldChange { field: string; from: string | null; to: string | null }

export interface PieceChange {
  id: string;
  title: string;
  /** What is set on the row. */
  status?: string;
  postDate?: string;
  note?: string;
  /** What it held, for the table. */
  was: { status: string | null; postDate: string | null };
}

export interface UpdateRow {
  /** Empty for a step that would be added. */
  stepId: string;
  momentId: string | null;
  title: string;
  date: string | null;
  status: string | null;
  playbook: string | null;
  action: UpdateAction;
  /** Why it is frozen, kept or unmatched; what the update is. */
  why: string;
  /** The master it was matched to, and how. */
  master: string | null;
  matchedBy: 'title' | 'placeholder' | 'alias' | 'retired' | null;
  changes: FieldChange[];
  pieces: PieceChange[];
  /** Things worth a second look that the plan did not act on. */
  flags: string[];
  /** A note appended to the step's Notes. */
  note?: string;
  /** For an add: everything the new step is. */
  add?: {
    title: string; playbook: string; phase: string | null; offset: number | null; date: string;
    flow: string | null; owner: string | null; type: string | null;
    brief: string | null; where: string | null; why: string | null; notes: string | null;
    asksNotes?: boolean;
  };
}

export interface MonthCount {
  month: string;
  /** Pieces that count today: rows that exist. */
  pieces: { before: number; after: number };
  /** What the month comes to once every open step has its piece. */
  projected: { before: number; after: number };
}

export interface UpdatePlan {
  rows: UpdateRow[];
  months: MonthCount[];
  /** Notion writes the plan comes to. */
  writes: number;
  counts: Record<UpdateAction, number>;
  /** Moments that would be left with two open steps from one master. */
  duplicates: string[];
}

/* ── vocabulary ───────────────────────────────────────────────── */

/** The line written on a step, and its pieces, when its master was
 *  retired. It names the audit so the reason is still readable in a
 *  year. */
export const RETIRED_NOTE = 'Retired in playbook audit Nov 16';

const CLOSED: readonly string[] = ['Done', 'Skipped', 'Moved'];
/** Statuses that mean a piece is being made, or has been. */
export const PAST_PLANNED: readonly string[] = ['Filmed', 'Footage In', 'Editing',
  'Ready for Review', 'Approved', 'Scheduled', 'Posted'];

/** Words in Notes that say a date was chosen by a person. */
const HAND_DATED = /\b(reschedul\w*|moved to|moved from|pushed (?:to|back)|pulled (?:forward|back)|hard deadline|was (?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w* \d)/i;

const sameId = (id: unknown): string => String(id ?? '').replace(/-/g, '').toLowerCase();
const day = (iso: string | null | undefined): string => (iso ?? '').slice(0, 10);

/** A title, as two of them are compared: case, curly quotes and
 *  stray spaces are not differences. */
export function normTitle(t: string | null | undefined): string {
  return (t ?? '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
    .replace(/\s+/g, ' ').trim().toLowerCase();
}

/* ── aliases: what a master used to be called ─────────────────── */

export interface Alias {
  playbook: string;
  /** How the master's title starts today. Not the whole title, so a
   *  small edit to the master does not orphan its aliases. */
  master: string;
  /** Titles the step had before, word for word. */
  was?: readonly string[];
  /** Wordings with a track or a name in them. A group called
   *  `moment` or `artist` is carried into the new title. */
  like?: readonly RegExp[];
  /** The new title when the old one named the track. */
  named?: string;
  /** Old titles that are matched but never renamed, with the reason:
   *  the old wording carries something the new one does not. */
  keep?: Readonly<Record<string, string>>;
}

/**
 * The titles the masters had before the audit of 16 November 2026,
 * and the wordings Sean's calendar was given by hand.
 *
 * Each one is evidence, not a guess: an old title is listed against
 * the master that now sits in the same playbook, phase and day, or
 * the only master left once every other one was accounted for. A
 * title that is not here and is not a master's is reported as
 * unmatched.
 */
export const AUDIT_ALIASES: readonly Alias[] = [
  /* Release Rollout */
  { playbook: 'Release Rollout', master: '🎥 Film: studio session',
    like: [/^🎥 film: (?<moment>.+?) studio session \(/i],
    named: '🎥 Film: {moment} studio session (making-of, hook snippet, jamming to the track)',
    keep: { 'capture studio footage and test the track as an id at shows (film the drop reaction)':
      'its title also covers testing the track as an ID, which the new title does not' } },
  { playbook: 'Release Rollout', master: '🎥 Film: vibing to the drop',
    like: [/^🎥 film: (?:you dancing\/)?vibing to the (?<moment>.+?) drop \(vertical, 2–3 takes, different spots\)$/i],
    named: '🎥 Film: vibing to the {moment} drop (vertical, 2–3 takes, different spots)' },
  { playbook: 'Release Rollout', master: 'ID clip: crowd reaction to the unreleased drop', was: ['Unlabeled snippet of the hook'] },
  { playbook: 'Release Rollout', master: 'How I made it', was: ['Behind the process'] },
  { playbook: 'Release Rollout', master: 'Final-week stories', was: ['Countdown story series'] },
  { playbook: 'Release Rollout', master: 'Release day video', was: ['Full hook clip'] },
  { playbook: 'Release Rollout', master: 'Announce: "out Friday"', was: ['Push the best performing cut'] },
  { playbook: 'Release Rollout', master: 'Send promo copies to your DJ contacts', was: ['Send promo copies to target DJs'] },
  // Renamed on 17 November: the same master row, seen before and after.
  { playbook: 'Release Rollout', master: 'Hit check: pick the best cut for the announce', was: ['Check which cut performed best'] },

  /* Release Sprint */
  { playbook: 'Release Sprint', master: 'Send promo copies to your DJ contacts', was: ['Send promo copies to target DJs'] },
  { playbook: 'Release Sprint', master: 'ID clip: drop reaction from a show',
    was: ['Drop reaction clip from a show, or a studio snippet of the hook'] },
  { playbook: 'Release Sprint', master: 'Announce: "out Friday"', was: ['Announce: artwork, release date, pre-save link'] },
  { playbook: 'Release Sprint', master: 'Only if the track is not going to streaming',
    was: ['Launch a free download gated behind a follow or email'] },

  /* Remix Drop */
  { playbook: 'Remix Drop', master: 'Set up the free download gate', was: ['Set up the free download gate (follow + email)'] },
  { playbook: 'Remix Drop', master: '🎥 Film: vibing to the remix drop',
    like: [/^🎥 film: (?:you )?(?:dancing\/reacting|vibing) to the (?<moment>.+?) drop \(vertical, 2–3 takes\)$/i],
    named: '🎥 Film: vibing to the {moment} drop (vertical, 2–3 takes)' },
  { playbook: 'Remix Drop', master: 'Share the drop post to your story',
    was: ['Drop day post and story with the link, DM everyone who commented'] },

  /* Pre-Show */
  { playbook: 'Pre-Show', master: 'Get show details from the promoter',
    was: ['Lock show details: name, flyer, ticket or RSVP link, set time, lineup, handles'] },
  { playbook: 'Pre-Show', master: 'Announce: crowd clip ending on the flyer', was: ['Announce: flyer, date, ticket link'] },
  { playbook: 'Pre-Show', master: 'Ask the promoter and venue',
    was: ['Ask the venue and supporting acts for a collab post and location tags'] },
  { playbook: 'Pre-Show', master: 'Ticket giveaway:',
    was: ['Ticket giveaway: tag a friend to win',
          'Ticket giveaway: artist talks to camera, tag a friend to win (comps from the promoter)'],
    like: [/^ticket giveaway: (?<artist>\S+) talks to camera, tag a friend to win$/i] },
  { playbook: 'Pre-Show', master: 'Repost or collab with support acts', was: ['Repost or collab with support acts'] },
  { playbook: 'Pre-Show', master: 'Check ticket count with the promoter',
    was: ['Check the ticket count; if soft, boost the best clip'] },
  { playbook: 'Pre-Show', master: '🎥 Film: ticket giveaway talk-to-camera',
    was: ['🎥 Film: ticket giveaway talk-to-camera (vertical, 15–30s)'] },

  /* Show Night */
  { playbook: 'Show Night', master: 'Confirm the shot list with the shooter',
    was: ['Confirm brief and shot list with the shooter'] },

  /* Post-Show */
  { playbook: 'Post-Show', master: 'ID drop clip', was: ['Clip built around the track'] },
  { playbook: 'Post-Show', master: 'Full set upload', was: ['Full set upload or long-form recap'] },
];

/**
 * Steps the audit added to a playbook, which a running campaign gets
 * once if it has nothing like them. `skipIf` is tested against every
 * step title already on the moment, whatever its status.
 */
export const AUDIT_ADDS: ReadonlyArray<{ playbook: string; master: string; skipIf: RegExp }> = [
  { playbook: 'Release Rollout', master: 'Play it as an ID at every show',
    skipIf: /\bID\b[^.]*\b(?:show|shows|rave)\b|\b(?:play|test)\w*\b[^.]*\bas an ID\b/i },
  { playbook: 'Remix Drop', master: 'Clear the remix', skipIf: /^clear the remix\b/i },
  // The hit checks, added to the masters on 17 November. Release
  // Rollout has two steps that start "Hit check": the older one picks
  // the cut for the announce and is a rename, not an add, so each
  // pattern here is the opening of one master and no other.
  { playbook: 'Release Rollout', master: 'Hit check: if a clip is at', skipIf: /^hit check: if a clip is at\b/i },
  { playbook: 'Release Sprint', master: 'Hit check: if a clip is at', skipIf: /^hit check: if a clip is at\b/i },
  { playbook: 'Remix Drop', master: 'Hit check: if the tease is at', skipIf: /^hit check: if the tease is at\b/i },
  { playbook: 'Pre-Show', master: 'Hit check: if a show clip is at', skipIf: /^hit check: if a show clip is at\b/i },
  { playbook: 'Post-Show', master: 'Hit check: if a show clip is at', skipIf: /^hit check: if a show clip is at\b/i },
];

/* ── match ────────────────────────────────────────────────────── */

export interface Match {
  master: MasterStep;
  by: 'title' | 'placeholder' | 'alias' | 'retired';
  retired: boolean;
  /** Words lifted out of the old title to carry into the new one. */
  city?: string;
  moment?: string;
  artist?: string;
  alias?: Alias;
  /** Set when the step is matched but must keep its own title. */
  keep?: string;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** The master a step came from, or null. Never a guess: a title is a
 *  master's own, a master's with a place filled in, or listed. */
export function matchMaster(
  step: { title: string; playbook: string | null }, masters: readonly MasterStep[],
): Match | null {
  if (!step.playbook) return null;
  const title = normTitle(step.title);
  const live = masters.filter((m) => m.playbook === step.playbook);

  const exact = live.find((m) => normTitle(m.title) === title);
  if (exact) return { master: exact, by: 'title', retired: false };

  // "catch me in [city]" on the master is "catch me in Austin" here,
  // and "artist talks to camera" is "Sean talks to camera". Everything
  // else in the title has to be the master's, word for word.
  for (const m of live) {
    if (!/\[city\]/i.test(m.title) && !/\bartist\b/.test(m.title)) continue;
    const re = new RegExp(`^${escapeRe(normTitle(m.title))
      .replace(/\\\[city\\\]/g, '(?<city>.+?)')
      .replace(/\bartist\b/, '(?<artist>\\S+)')}$`, 'i');
    const hit = re.exec(title);
    if (!hit) continue;
    // Lifted from the title as it was typed, so the capitals survive.
    const asTyped = (found: string | undefined) => {
      if (!found) return undefined;
      const at = step.title.toLowerCase().indexOf(found);
      return at >= 0 ? step.title.slice(at, at + found.length) : found;
    };
    return { master: m, by: 'placeholder', retired: false,
             city: asTyped(hit.groups?.city), artist: asTyped(hit.groups?.artist) };
  }

  // A retired master keeps its title and its phase, and the phase says
  // which playbook it was in. The same title can be live in one
  // playbook and retired from another.
  const retired = masters.find((m) => isRetiredPlaybook(m.playbook)
    && normTitle(m.title) === title && playbooksOfPhase(m.phase).includes(step.playbook as string));
  if (retired) return { master: retired, by: 'retired', retired: true };

  for (const a of AUDIT_ALIASES) {
    if (a.playbook !== step.playbook) continue;
    const master = live.find((m) => normTitle(m.title).startsWith(normTitle(a.master)));
    if (!master) continue;
    const keep = a.keep?.[title];
    if (keep) return { master, by: 'alias', retired: false, alias: a, keep };
    if (a.was?.some((w) => normTitle(w) === title)) return { master, by: 'alias', retired: false, alias: a };
    for (const re of a.like ?? []) {
      const hit = re.exec(step.title.trim());
      if (hit) {
        return { master, by: 'alias', retired: false, alias: a,
                 moment: hit.groups?.moment, artist: hit.groups?.artist };
      }
    }
  }
  return null;
}

/**
 * What the step should be called now, or null to leave its title.
 *
 * The master's title, with the client's own words put back: the city
 * in a "[city]", the track in a title that named it, their name where
 * the master says "artist". A title that names the track and has no
 * wording to carry it into is left as it was written, because losing
 * the track's name is worse than keeping last month's phrasing.
 */
export function renameFor(
  step: { title: string }, match: Match, momentName: string | null, artist: string,
): { title: string | null; flag?: string } {
  if (match.retired) return { title: null };
  if (match.keep) return { title: null, flag: `Title left as it is: ${match.keep}.` };
  let next = match.master.title;
  if (match.city) next = next.replace(/\[city\]/gi, match.city);

  const first = artist.trim().split(/\s+/)[0] ?? '';
  const named = match.artist ?? (first && new RegExp(`\\b${escapeRe(first)}\\b`, 'i').test(step.title) ? first : '');
  if (named && /\bartist\b/.test(next)) next = next.replace(/\bartist\b/, named);

  const track = (match.moment ?? '').trim();
  const moment = (momentName ?? '').trim();
  const names = (s: string) => !!moment && s.toLowerCase().includes(moment.toLowerCase());
  if (track && match.alias?.named && moment && track.toLowerCase() === moment.toLowerCase()) {
    next = match.alias.named.replace('{moment}', moment);
  } else if (names(step.title) && !names(next)) {
    if (match.alias?.named) next = match.alias.named.replace('{moment}', moment);
    else return { title: null, flag: `Title left as it is: it names ${moment}, and the new wording has nowhere to put that.` };
  }
  return { title: normTitle(next) === normTitle(step.title) ? null : next };
}

/* ── the plan ─────────────────────────────────────────────────── */

const show = (v: string | number | null | undefined): string | null =>
  (v === null || v === undefined || v === '' ? null : String(v));

/** Was this step's date chosen by a person rather than by its offset? */
export function handDated(
  step: { notes?: string | null; date: string | null; offset: number | null }, momentDate: string | null,
): string | null {
  if (HAND_DATED.test(step.notes ?? '')) return 'its Notes say the date was set by hand';
  if (step.offset === null) return 'it has no offset, so its date was placed by hand';
  const due = momentDate ? addDaysIso(momentDate, step.offset) : null;
  if (due && day(step.date) && due !== day(step.date)) {
    return `it sits on ${day(step.date)}, not the ${due} its own offset gives`;
  }
  return null;
}

/**
 * Everything "update campaigns to current playbook" would do for one
 * client, and what each month would come to.
 */
export function planUpdate(
  steps: readonly UpStep[],
  moments: readonly PieceMoment[],
  masters: readonly MasterStep[],
  pieces: readonly UpPiece[],
  opts: UpdateOptions,
  months: readonly string[] = [],
): UpdatePlan {
  const { today } = opts;
  const noDates = new Set((opts.noDates ?? []).map(sameId));
  const redate = new Set((opts.redate ?? []).map(sameId));
  const excluded = new Set((opts.exclude ?? []).map(sameId));
  const only = opts.moments ? new Set(opts.moments.map(sameId)) : null;
  const momentOf = new Map(moments.map((m) => [sameId(m.id), m]));
  const piecesOf = new Map<string, UpPiece[]>();
  for (const p of pieces) {
    for (const id of p.campaign) {
      const k = sameId(id);
      if (!piecesOf.has(k)) piecesOf.set(k, []);
      piecesOf.get(k)!.push(p);
    }
  }

  const rows: UpdateRow[] = [];
  for (const step of steps) {
    if (only && !only.has(sameId(step.momentId))) continue;
    const moment = momentOf.get(sameId(step.momentId)) ?? null;
    const mine = piecesOf.get(sameId(step.id)) ?? [];
    const match = matchMaster(step, masters);
    const row: UpdateRow = {
      stepId: step.id, momentId: step.momentId, title: step.title, date: day(step.date) || null,
      status: step.status, playbook: step.playbook, action: 'current', why: '',
      master: match?.master.title ?? null, matchedBy: match?.by ?? null,
      changes: [], pieces: [], flags: [],
    };
    rows.push(row);

    /* freeze */
    const frozen = CLOSED.includes(step.status ?? '') ? `It is ${step.status}.`
      : day(step.date) && day(step.date) < today ? `Its date, ${day(step.date)}, has passed.`
      : mine.some((p) => PAST_PLANNED.includes(p.status ?? ''))
        ? `Its piece is already ${mine.find((p) => PAST_PLANNED.includes(p.status ?? ''))!.status}.`
        : null;
    if (frozen) { row.action = 'frozen'; row.why = frozen; continue; }
    if (excluded.has(sameId(step.id))) { row.action = 'kept'; row.why = 'Left out of this update on purpose.'; continue; }
    if (!match) {
      row.action = 'unmatched';
      row.why = 'No master has this title, and it is not a wording we know. Nothing is changed.';
      continue;
    }

    /* retire */
    if (match.retired) {
      row.action = 'skip';
      row.why = 'Its master was retired.';
      row.note = RETIRED_NOTE;
      row.changes.push({ field: 'Status', from: step.status, to: 'Skipped' });
      for (const p of mine) {
        if (p.status !== 'Planned') continue;
        row.pieces.push({ id: p.id, title: p.title, status: 'Skipped', note: RETIRED_NOTE,
                          was: { status: p.status, postDate: p.postDate } });
      }
      continue;
    }

    /* update */
    const m = match.master;
    const renamed = renameFor(step, match, moment?.title ?? null, opts.artist);
    if (renamed.flag) row.flags.push(renamed.flag);
    if (renamed.title) row.changes.push({ field: 'Item', from: step.title, to: renamed.title });

    const copy: Array<[string, string | number | null, string | number | null | undefined]> = [
      ['Brief', step.brief, m.brief],
      ['Priority', step.priority, m.priority],
      ['Default Media', step.defaultMedia, m.defaultMedia],
      ['Pieces', step.pieces, m.pieces],
      ['Where', step.where, m.where],
      ['Why It Matters', step.why, m.why],
      // Switched on from the master, never off: a step that has a
      // note written on it keeps the box the note was written in.
      [ASKS_FIELD, step.asksNotes ? 'Yes' : null, m.asksNotes ? 'Yes' : null],
    ];
    for (const [field, has, wants] of copy) {
      // A master with nothing to say does not empty what a step has.
      if (wants === null || wants === undefined || wants === '') continue;
      if (String(has ?? '').trim() === String(wants).trim()) continue;
      row.changes.push({ field, from: show(has), to: show(wants) });
    }

    if (step.flow && m.flow && step.flow !== m.flow) {
      row.flags.push(`Flow is "${step.flow}" and the master says "${m.flow}". Flow is never changed here.`);
    }

    if (typeof step.offset === 'number' && typeof m.offset === 'number' && step.offset !== m.offset) {
      const due = moment?.date ? addDaysIso(moment.date, m.offset) : null;
      const moved = `The master moved from ${step.offset} to ${m.offset} days`;
      // On a moment being brought into line on purpose, a date set by
      // hand does not hold the step back.
      const hand = redate.has(sameId(step.momentId)) ? null : handDated(step, moment?.date ?? null);
      if (noDates.has(sameId(step.momentId))) {
        row.flags.push(`${moved}. This moment is scheduled by hand, so the date is left${due ? ` (it would be ${due})` : ''}.`);
      } else if (hand) {
        row.flags.push(`${moved}, but ${hand}. The date is left${due ? ` (it would be ${due})` : ''}.`);
      } else if (!due) {
        row.flags.push(`${moved}, and the moment has no date to count from.`);
      } else if (due < today) {
        row.flags.push(`${moved}, which puts it on ${due}, already past. The date is left.`);
      } else {
        row.changes.push({ field: 'Offset (days)', from: String(step.offset), to: String(m.offset) });
        if (due !== day(step.date)) {
          row.changes.push({ field: 'Date', from: day(step.date) || null, to: due });
          for (const p of mine) {
            if (p.status !== 'Planned' || day(p.postDate) === due) continue;
            row.pieces.push({ id: p.id, title: p.title, postDate: due,
                              was: { status: p.status, postDate: p.postDate } });
          }
        }
      }
    }

    if (row.changes.length) {
      row.action = 'update';
      const kinds: string[] = [];
      if (row.changes.some((c) => c.field === 'Item')) kinds.push('rename');
      if (row.changes.some((c) => c.field === 'Date')) kinds.push('re-date');
      if (row.changes.some((c) => !['Item', 'Date', 'Offset (days)'].includes(c.field))) {
        kinds.push(kinds.length ? 'brief' : 'brief only');
      }
      if (!kinds.length) kinds.push('offset');
      row.why = kinds.join(' + ');
    } else {
      row.action = 'current';
      row.why = 'Already matches its master.';
    }
  }

  /* add */
  for (const moment of moments) {
    if (only && !only.has(sameId(moment.id))) continue;
    if (noDates.has(sameId(moment.id)) || !moment.date) continue;
    const here = steps.filter((s) => sameId(s.momentId) === sameId(moment.id));
    for (const add of AUDIT_ADDS) {
      // Only a campaign that is still running this playbook: one with
      // a step of it that is not done, skipped or moved.
      if (!here.some((s) => s.playbook === add.playbook && !CLOSED.includes(s.status ?? ''))) continue;
      const master = masters.find((m) => m.playbook === add.playbook
        && normTitle(m.title).startsWith(normTitle(add.master)));
      if (!master || typeof master.offset !== 'number') continue;
      if (here.some((s) => add.skipIf.test(s.title) || normTitle(s.title) === normTitle(master.title))) continue;
      const date = addDaysIso(moment.date, master.offset);
      if (!date || date < today) continue;
      rows.push({
        stepId: '', momentId: moment.id, title: master.title, date, status: 'Not Started',
        playbook: add.playbook, action: 'add', why: 'New in the playbook, and this campaign has nothing like it.',
        master: master.title, matchedBy: 'title', changes: [], pieces: [], flags: [],
        add: {
          title: master.title, playbook: add.playbook, phase: master.phase, offset: master.offset, date,
          flow: master.flow, owner: master.owner, type: master.type,
          brief: master.brief ?? null, where: master.where, why: master.why, notes: master.notes,
          asksNotes: !!master.asksNotes,
        },
      });
    }
  }

  /* what the months come to */
  const after = applyPlan(steps, pieces, rows);
  const count = (ps: readonly UpPiece[], ym: string) =>
    ps.filter((p) => countsToward(p) && day(p.postDate).slice(0, 7) === ym).length;
  const owed = (ss: readonly UpStep[], ps: readonly UpPiece[], ym: string) =>
    planMissingPieces(ss, moments, ps, { months: [ym] }).length;
  const monthRows: MonthCount[] = months.map((month) => {
    const b = count(pieces, month), a = count(after.pieces, month);
    return {
      month,
      pieces: { before: b, after: a },
      projected: { before: b + owed(steps, pieces, month), after: a + owed(after.steps, after.pieces, month) },
    };
  });

  const counts = { frozen: 0, kept: 0, unmatched: 0, current: 0, skip: 0, update: 0, add: 0 };
  let writes = 0;
  for (const r of rows) {
    counts[r.action]++;
    if (r.action === 'skip' || r.action === 'update' || r.action === 'add') writes += 1 + r.pieces.length;
  }
  return { rows, months: monthRows, writes, counts, duplicates: duplicateMasters(after.steps, moments, masters) };
}

/** The steps and pieces as they would stand once a plan is written.
 *  Nothing is written: this is the same arithmetic, on copies. */
export function applyPlan(
  steps: readonly UpStep[], pieces: readonly UpPiece[], rows: readonly UpdateRow[],
): { steps: UpStep[]; pieces: UpPiece[] } {
  const byStep = new Map(rows.filter((r) => r.stepId).map((r) => [sameId(r.stepId), r]));
  const pieceSet = new Map<string, PieceChange>();
  for (const r of rows) for (const p of r.pieces) pieceSet.set(sameId(p.id), p);

  const outSteps: UpStep[] = steps.map((s) => {
    const r = byStep.get(sameId(s.id));
    if (!r || (r.action !== 'skip' && r.action !== 'update')) return s;
    const next: UpStep = { ...s };
    for (const c of r.changes) {
      if (c.field === 'Status') next.status = c.to;
      else if (c.field === 'Item') next.title = c.to ?? s.title;
      else if (c.field === 'Date') next.date = c.to;
      else if (c.field === 'Offset (days)') next.offset = c.to === null ? null : Number(c.to);
      else if (c.field === 'Brief') next.brief = c.to;
      else if (c.field === 'Priority') next.priority = c.to;
      else if (c.field === 'Default Media') next.defaultMedia = c.to;
      else if (c.field === 'Pieces') next.pieces = c.to === null ? null : Number(c.to);
      else if (c.field === 'Where') next.where = c.to;
      else if (c.field === 'Why It Matters') next.why = c.to;
      else if (c.field === ASKS_FIELD) next.asksNotes = c.to === 'Yes';
    }
    return next;
  });
  for (const r of rows) {
    if (r.action !== 'add' || !r.add) continue;
    outSteps.push({
      id: `add:${sameId(r.momentId)}:${normTitle(r.add.title)}`, title: r.add.title, playbook: r.add.playbook,
      phase: r.add.phase, flow: r.add.flow, status: 'Not Started', date: r.add.date, momentId: r.momentId,
      priority: null, defaultMedia: null, pieces: null, offset: r.add.offset,
      brief: r.add.brief, where: r.add.where, why: r.add.why, notes: r.add.notes,
      asksNotes: !!r.add.asksNotes,
    });
  }
  const outPieces = pieces.map((p) => {
    const c = pieceSet.get(sameId(p.id));
    return c ? { ...p, status: c.status ?? p.status, postDate: c.postDate ?? p.postDate } : p;
  });
  return { steps: outSteps, pieces: outPieces };
}

/* ── the checks made after writing ────────────────────────────── */

/** Moments with two open steps that come from the same master. */
export function duplicateMasters(
  steps: readonly UpStep[], moments: readonly PieceMoment[], masters: readonly MasterStep[],
): string[] {
  const name = new Map(moments.map((m) => [sameId(m.id), m.title]));
  const seen = new Map<string, number>();
  for (const s of steps) {
    if (CLOSED.includes(s.status ?? '') || !s.momentId) continue;
    const match = matchMaster(s, masters);
    if (!match || match.retired) continue;
    const k = `${sameId(s.momentId)}\u0000${sameId(match.master.id)}\u0000${match.master.title}`;
    seen.set(k, (seen.get(k) ?? 0) + 1);
  }
  const out: string[] = [];
  for (const [k, n] of seen) {
    if (n < 2) continue;
    const [mid, , title] = k.split('\u0000');
    out.push(`${name.get(mid) ?? 'A moment'} has ${n} open steps from "${title}"`);
  }
  return out.sort();
}

/** Pieces past Planned, counted by the month they post in. */
export function pastPlannedByMonth(pieces: readonly { status: string | null; postDate: string | null }[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of pieces) {
    if (!PAST_PLANNED.includes(p.status ?? '')) continue;
    const ym = day(p.postDate).slice(0, 7) || 'undated';
    out[ym] = (out[ym] ?? 0) + 1;
  }
  return out;
}

/** A Done step, as one line: if the line changes, the step did. */
export function doneSignature(s: UpStep): string {
  return [s.title, day(s.date), s.status, s.offset, s.brief, s.priority, s.defaultMedia, s.pieces,
          s.where, s.why, s.notes].map((v) => String(v ?? '')).join('\u0001');
}

export interface UpdateBaseline {
  pastPlanned: Record<string, number>;
  /** Done steps, id to signature. */
  done: Record<string, string>;
}

export function baselineOf(steps: readonly UpStep[], pieces: readonly UpPiece[]): UpdateBaseline {
  const done: Record<string, string> = {};
  for (const s of steps) if (s.status === 'Done') done[sameId(s.id)] = doneSignature(s);
  return { pastPlanned: pastPlannedByMonth(pieces), done };
}

/**
 * What must be true after an update, checked against how things stood
 * before it. An empty list is a pass. Anything else is a failure to
 * be shown as one, not a warning to scroll past.
 */
export function checkUpdate(
  before: UpdateBaseline,
  steps: readonly UpStep[], pieces: readonly UpPiece[],
  moments: readonly PieceMoment[], masters: readonly MasterStep[],
): string[] {
  const fails: string[] = [...duplicateMasters(steps, moments, masters)];
  const now = pastPlannedByMonth(pieces);
  for (const ym of new Set([...Object.keys(before.pastPlanned), ...Object.keys(now)])) {
    const was = before.pastPlanned[ym] ?? 0, is = now[ym] ?? 0;
    if (was !== is) fails.push(`Pieces past Planned in ${ym} went from ${was} to ${is}`);
  }
  const byId = new Map(steps.map((s) => [sameId(s.id), s]));
  for (const [id, sig] of Object.entries(before.done)) {
    const s = byId.get(id);
    if (!s) fails.push(`A Done step is gone (${id})`);
    else if (doneSignature(s) !== sig) fails.push(`A Done step changed: "${s.title}"`);
  }
  return fails;
}

/** Is a step one that delivers a piece? Re-exported for the table. */
export { isDeliverableFlow };
