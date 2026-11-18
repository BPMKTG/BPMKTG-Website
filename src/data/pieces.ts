// ─────────────────────────────────────────────────────────────
// Pieces: the Content Pipeline rows a campaign step owes.
//
// A "deliverable step" is a step whose Flow says we post something:
// "Blueprint makes + posts" or "Client films → Blueprint edits +
// posts". Every one of those is a piece of content we owe the client,
// and a piece only counts toward the month once it is a row in the
// Content Pipeline. This file is the rules for turning the one into
// the other, keeping the two in step afterwards, and choosing what to
// cut when a month has too many.
//
//   plan      which rows a step needs, and what each one says
//   sync      what follows when a step moves or is dropped
//   trims     what to suggest cutting from a month that is over
//
// Nothing here talks to Notion. The server reads rows into these
// shapes and writes back what the planners return, and the tests hold
// the planners to the spec without a network.
// ─────────────────────────────────────────────────────────────

import { CONTENT_MEDIA, MONTH_CAP } from './portal-content';

/* ── vocabulary ───────────────────────────────────────────────── */

export const CLIENT_FILMS_FLOW = 'Client films → Blueprint edits + posts';
export const FILM_SESSION_FLOW = 'Client film session';
export const DELIVERABLE_FLOWS: readonly string[] = ['Blueprint makes + posts', CLIENT_FILMS_FLOW];

export function isDeliverableFlow(flow: string | null | undefined): boolean {
  return !!flow && DELIVERABLE_FLOWS.includes(flow);
}

export const PRIORITIES = ['Core', 'Standard', 'Filler'] as const;
export type Priority = typeof PRIORITIES[number];

export function isPriority(v: unknown): v is Priority {
  return typeof v === 'string' && (PRIORITIES as readonly string[]).includes(v);
}

export function isPieceMedia(v: unknown): v is string {
  return typeof v === 'string' && (CONTENT_MEDIA as readonly string[]).includes(v);
}

/** The most rows one step may ask for. Nothing asks for more than
 *  three today; the cap is so a typo of 30 does not make thirty rows. */
export const MAX_PIECES = 6;

/** How many rows a step is worth. Blank is one. */
export function pieceCount(pieces: number | null | undefined): number {
  if (typeof pieces !== 'number' || !Number.isFinite(pieces)) return 1;
  return Math.min(MAX_PIECES, Math.max(1, Math.round(pieces)));
}

/** Statuses a step is finished with, one way or another. Nothing is
 *  created for these and nothing of theirs is moved. */
const STEP_CLOSED: readonly string[] = ['Done', 'Skipped', 'Moved'];
/** Out of the plan. A step in one of these feeds nothing. */
const STEP_OUT: readonly string[] = ['Skipped', 'Moved'];

const sameId = (id: unknown): string => String(id ?? '').replace(/-/g, '').toLowerCase();

/* ── shapes ───────────────────────────────────────────────────── */

/** A step on a client's calendar, as much as these rules read. */
export interface PieceStep {
  id: string;
  title: string;
  playbook: string | null;
  phase: string | null;
  flow: string | null;
  status: string | null;
  /** Date, or the Auto Date when no Date was set by hand. */
  date: string | null;
  momentId: string | null;
  priority: string | null;
  defaultMedia: string | null;
  pieces: number | null;
  hidden?: boolean;
  notes?: string | null;
  /** Who does it, as Notion's Owner says. */
  owner?: string | null;
  /** The master it was copied from, when applying kept it. */
  masterId?: string | null;
  /** Added by the client and waiting for one of us to confirm. A
   *  pending step owes nothing yet. */
  pending?: boolean;
}

export interface PieceMoment {
  id: string;
  /** The moment's name with the artist prefix already taken off. */
  title: string;
  date: string | null;
  momentType: string | null;
}

/** A Content Pipeline row, as much as these rules read. */
export interface ExistingPiece {
  id: string;
  title: string;
  status: string | null;
  postDate: string | null;
  /** The steps it is linked to through Campaign. */
  campaign: readonly string[];
  media?: string | null;
  postedBy?: string | null;
  notes?: string | null;
}

/** A row to create. */
export interface PlannedPiece {
  stepId: string;
  stepTitle: string;
  momentTitle: string | null;
  title: string;
  media: string | null;
  source: string;
  bucket: string | null;
  platforms: string[];
  postDate: string | null;
  /** Only on a piece the client films. */
  filmBy: string | null;
  priority: string | null;
  /** The step is hidden from the client, so its piece is too. */
  hidden: boolean;
}

/* ── plan: what a step's rows say ─────────────────────────────── */

/** The three rows a show announce is: a crowd clip for the feed that
 *  ends on the flyer, the flyer as a story, and the event page banner. */
export const FLYER_SET: ReadonlyArray<{ suffix: string; media: string }> = [
  { suffix: ' · Feed clip', media: 'Video' },
  { suffix: ' · IG story', media: 'Story' },
  { suffix: ' · Event banner', media: 'Graphic' },
];

export const MAX_PIECE_TITLE = 200;

interface Variant { suffix: string; media: string | null; flyer: boolean }

/** The rows one step asks for. One, unless Pieces says otherwise:
 *  three is the flyer set, and any other number is that many of the
 *  step's own media, numbered. */
function variantsOf(step: PieceStep): Variant[] {
  const n = pieceCount(step.pieces);
  const media = isPieceMedia(step.defaultMedia) ? step.defaultMedia : null;
  if (n === 1) return [{ suffix: '', media, flyer: false }];
  if (n === FLYER_SET.length) return FLYER_SET.map((v) => ({ ...v, flyer: true }));
  return Array.from({ length: n }, (_, i) => ({ suffix: ` · ${i + 1} of ${n}`, media, flyer: false }));
}

/** "[Moment name] [step title]", with the suffix kept whole when the
 *  two together run past what a title holds. */
export function pieceTitle(momentTitle: string | null, stepTitle: string, suffix = ''): string {
  const base = `${(momentTitle ?? '').trim()} ${stepTitle.trim()}`.trim();
  return base.slice(0, MAX_PIECE_TITLE - suffix.length).trimEnd() + suffix;
}

/** Who makes it. The Flow decides first: if the client films it, that
 *  is the source whatever it turns into. After that a graphic or a
 *  story is drawn, and anything else is cut from footage we hold. */
export function pieceSource(flow: string | null, media: string | null): string {
  if (flow === CLIENT_FILMS_FLOW) return 'Client Films';
  if (media === 'Graphic' || media === 'Story') return 'Flyer / Graphic';
  return 'Show Media';
}

const BUCKET_BY_PLAYBOOK: Record<string, string> = {
  'Pre-Show': 'Show Promo',
  'Show Night': 'Show Promo',
  'Release Rollout': 'Release Promo',
  'Release Sprint': 'Release Promo',
  'Remix Drop': 'Release Promo',
  'Post-Show': 'Live Performance',
};

export function pieceBucket(playbook: string | null, media: string | null, flyer: boolean): string | null {
  if (flyer) return 'Flyer';
  if (media === 'Carousel') return 'Carousel';
  return BUCKET_BY_PLAYBOOK[playbook ?? ''] ?? null;
}

/** Where it goes out. A row with no media yet is counted as a video
 *  everywhere else, so it is here too. */
export function piecePlatforms(media: string | null): string[] {
  if (media === 'Story') return ['Instagram'];
  if (media === 'Video' || !media) return ['Instagram', 'TikTok', 'Facebook'];
  return ['Instagram', 'Facebook'];
}

const day = (iso: string | null | undefined): string => (iso ?? '').slice(0, 10);

/**
 * The film day a piece is waiting on: the nearest film session at or
 * before it, in the same moment. A session that was skipped or moved
 * out films nothing.
 */
export function filmByFor(step: PieceStep, steps: readonly PieceStep[]): string | null {
  const on = day(step.date);
  if (!on || !step.momentId) return null;
  let best = '';
  for (const s of steps) {
    if (s.flow !== FILM_SESSION_FLOW || STEP_OUT.includes(s.status ?? '')) continue;
    if (sameId(s.momentId) !== sameId(step.momentId)) continue;
    const d = day(s.date);
    if (d && d <= on && d > best) best = d;
  }
  return best || null;
}

/** Every row one step asks for, whether or not any exist yet. */
export function piecesForStep(
  step: PieceStep, moment: PieceMoment | null, steps: readonly PieceStep[],
): PlannedPiece[] {
  return variantsOf(step).map((v) => {
    const source = pieceSource(step.flow, v.media);
    return {
      stepId: step.id,
      stepTitle: step.title,
      momentTitle: moment?.title ?? null,
      title: pieceTitle(moment?.title ?? null, step.title, v.suffix),
      media: v.media,
      source,
      bucket: pieceBucket(step.playbook, v.media, v.flyer),
      platforms: piecePlatforms(v.media),
      postDate: day(step.date) || null,
      filmBy: source === 'Client Films' ? filmByFor(step, steps) : null,
      priority: isPriority(step.priority) ? step.priority : null,
      hidden: !!step.hidden,
    };
  });
}

/**
 * The rows still to create for these steps.
 *
 * A deliverable step that is still open and has nothing linked to it
 * gets all of its rows. A step with anything linked is left alone,
 * with one exception: a step worth several rows where some of OUR
 * rows are there and some are not, which is what a write that stopped
 * halfway leaves behind. Then only the missing ones are planned. A
 * row somebody made by hand under another name covers its step, and
 * is never added to.
 *
 * Run twice, the second run plans nothing.
 */
export function planMissingPieces(
  steps: readonly PieceStep[],
  moments: readonly PieceMoment[],
  existing: readonly ExistingPiece[],
  only: { stepIds?: readonly string[]; months?: readonly string[] } = {},
): PlannedPiece[] {
  const momentOf = new Map(moments.map((m) => [sameId(m.id), m]));
  const linked = new Map<string, ExistingPiece[]>();
  for (const p of existing) {
    for (const id of p.campaign) {
      const k = sameId(id);
      if (!linked.has(k)) linked.set(k, []);
      linked.get(k)!.push(p);
    }
  }
  const wantStep = only.stepIds ? new Set(only.stepIds.map(sameId)) : null;
  const wantMonth = only.months ? new Set(only.months) : null;

  const out: PlannedPiece[] = [];
  for (const step of steps) {
    if (!isDeliverableFlow(step.flow) || STEP_CLOSED.includes(step.status ?? '')) continue;
    // A step the client added that we have not confirmed owes nothing.
    if (step.pending) continue;
    if (wantStep && !wantStep.has(sameId(step.id))) continue;
    if (wantMonth && !wantMonth.has(day(step.date).slice(0, 7))) continue;
    const want = piecesForStep(step, momentOf.get(sameId(step.momentId)) ?? null, steps);
    const have = linked.get(sameId(step.id)) ?? [];
    if (!have.length) { out.push(...want); continue; }
    const titles = new Set(have.map((p) => p.title.trim().toLowerCase()));
    const ours = want.filter((w) => titles.has(w.title.trim().toLowerCase()));
    if (want.length > 1 && ours.length) {
      out.push(...want.filter((w) => !titles.has(w.title.trim().toLowerCase())));
    }
  }
  return out.sort((a, b) =>
    (a.postDate ?? '9999').localeCompare(b.postDate ?? '9999') || a.title.localeCompare(b.title));
}

/** Deliverable steps that are still open and have nothing linked:
 *  what the calendar's "No piece yet" chip counts. */
export function stepsWithoutPieces(
  steps: readonly PieceStep[], existing: readonly ExistingPiece[],
): PieceStep[] {
  const linked = new Set(existing.flatMap((p) => p.campaign.map(sameId)));
  return steps.filter((s) => isDeliverableFlow(s.flow)
    // A step the client added that we have not confirmed owes nothing.
    && !s.pending
    && !STEP_CLOSED.includes(s.status ?? '') && !linked.has(sameId(s.id)));
}

/* ── sync: a step and its rows are one piece of work ──────────── */

/**
 * The rows that follow a step to a new day.
 *
 * Only a Planned row. Once a piece is filmed, in the edit or
 * scheduled, its date is somebody's decision and a step moving on the
 * calendar does not get to overrule it.
 */
export function piecesToFollow<T extends { status: string | null; postDate: string | null }>(
  pieces: readonly T[], stepDate: string | null,
): T[] {
  const to = day(stepDate);
  if (!to) return [];
  return pieces.filter((p) => p.status === 'Planned' && day(p.postDate) !== to);
}

/** The rows dropped with a step that is skipped: the Planned ones,
 *  for the same reason. Work already started is not thrown away by a
 *  status change on a different row. */
export function piecesToSkip<T extends { status: string | null }>(pieces: readonly T[]): T[] {
  return pieces.filter((p) => p.status === 'Planned');
}

/**
 * Is the step dropped because its rows were?
 *
 * Only when every row it has is Skipped. That is the same rule for a
 * step with one row and a flyer with three: skipping the story cut
 * does not cancel the announcement.
 */
export function stepSkippedByPieces(pieces: readonly { status: string | null }[]): boolean {
  return pieces.length > 0 && pieces.every((p) => p.status === 'Skipped');
}

/* ── trims: what to cut from a month that is over ─────────────── */

/** A piece that counts toward the month being trimmed. */
export interface TrimPiece {
  id: string;
  title: string;
  status: string | null;
  postDate: string | null;
  media: string | null;
  /** The step it delivers, when it is linked to one. */
  stepId: string | null;
}

export interface TrimRow {
  pieceId: string;
  stepId: string | null;
  title: string;
  postDate: string;
  media: string;
  /** Standard or Filler. A piece with no priority is read as Standard. */
  tier: 'Standard' | 'Filler';
  playbook: string | null;
  momentTitle: string | null;
  /** One line on why this one, in the words that go in the note. */
  reason: string;
  /** Ticked when the sheet opens. Exactly as many as the month is over,
   *  or every candidate when there are fewer than that. */
  suggested: boolean;
  /** "Move to next month" is offered: a post-show or long-tail piece
   *  is not tied to a day the way an announce is. */
  canMove: boolean;
  /** Where a move would put it: the same weekday, the first one that
   *  falls in the next month. */
  moveTo: string | null;
}

export interface TrimPlan {
  /** Counted pieces in the month. */
  planned: number;
  /** How many past the cap. Zero when the month is fine. */
  over: number;
  /** Every candidate, in the order to cut them. */
  rows: TrimRow[];
  /** How many past the cap would be left even if every suggestion were
   *  taken: there is nothing cuttable left, only Core and work already
   *  under way. */
  stillOver: number;
}

/** Which campaigns give ground first. A remix is the smallest thing we
 *  run; a show's afterglow goes before its build-up; a release keeps
 *  its pieces longest. */
const CUT_RANK: Record<string, number> = {
  'Remix Drop': 0,
  'Post-Show': 1,
  'Pre-Show': 2,
  'Show Night': 3,
  'Release Sprint': 4,
  'Release Rollout': 4,
};
/** A piece on no playbook we know sits with the shows: after a remix,
 *  before a release. */
const CUT_RANK_UNKNOWN = 3;

/** Days either side of another moment's big day that count as
 *  competing with it. */
export const COMPETE_DAYS = 3;

const dayNumber = (iso: string): number => Math.round(Date.parse(`${iso.slice(0, 10)}T00:00:00Z`) / 86_400_000);
const isoOf = (n: number): string => new Date(n * 86_400_000).toISOString().slice(0, 10);
/** Monday of the week a day is in, as a day number. */
const weekOf = (iso: string): number => { const n = dayNumber(iso); return n - ((n + 3) % 7); };

/** The same weekday, the first one in the month after. */
export function nextMonthSameWeekday(iso: string): string | null {
  const d = day(iso);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return null;
  const month = d.slice(0, 7);
  let n = dayNumber(d);
  for (let i = 0; i < 6; i++) {
    n += 7;
    if (isoOf(n).slice(0, 7) !== month) return isoOf(n);
  }
  return null;
}

/** May this piece be pushed a month instead of cut? */
export function canMoveToNextMonth(step: { playbook: string | null; phase: string | null } | null): boolean {
  if (!step) return false;
  return step.playbook === 'Post-Show' || /long tail/i.test(step.phase ?? '');
}

interface KeyDay { momentId: string; momentTitle: string; day: number; what: string }

/** The days a moment cannot share: a release's drop day, and the day
 *  any moment is announced. */
function keyDays(steps: readonly PieceStep[], moments: readonly PieceMoment[]): KeyDay[] {
  const out: KeyDay[] = [];
  const name = new Map(moments.map((m) => [sameId(m.id), m.title]));
  for (const m of moments) {
    if (m.momentType === 'Release' && day(m.date)) {
      out.push({ momentId: sameId(m.id), momentTitle: m.title, day: dayNumber(m.date!), what: 'release day' });
    }
  }
  for (const s of steps) {
    if (!s.momentId || !day(s.date) || STEP_OUT.includes(s.status ?? '')) continue;
    if (!/^\s*announce\b/i.test(s.title)) continue;
    out.push({
      momentId: sameId(s.momentId), momentTitle: name.get(sameId(s.momentId)) ?? 'another moment',
      day: dayNumber(s.date!), what: 'announce',
    });
  }
  return out;
}

/**
 * What to cut from a month that is over its cap.
 *
 * Candidates are counted pieces that are still only Planned and are
 * not Core. Core is never suggested, and neither is anything already
 * past Planned: that is work under way, and cutting it throws the
 * work away as well as the slot.
 *
 * The order, from the first to go:
 *   1. Filler before Standard.
 *   2. Within a tier, a near-duplicate first: two candidates in the
 *      same week with the same media from different moments are one
 *      too many, and the one that would have gone sooner goes.
 *   3. Then by campaign: a remix, then a show (after it before before
 *      it), then a release.
 *   4. Then a piece landing within three days of another moment's
 *      release day or announce, because it competes with it.
 *   5. Then the latest in the month.
 *
 * Exactly as many are suggested as the month is over. With fewer
 * candidates than that, all of them are, and `stillOver` says how far
 * short that leaves it.
 */
export function suggestTrims(
  pieces: readonly TrimPiece[],
  steps: readonly PieceStep[],
  moments: readonly PieceMoment[],
  cap: number = MONTH_CAP,
): TrimPlan {
  const planned = pieces.length;
  const over = Math.max(0, planned - cap);
  const stepOf = new Map(steps.map((s) => [sameId(s.id), s]));
  const momentOf = new Map(moments.map((m) => [sameId(m.id), m]));
  const keys = keyDays(steps, moments);

  interface Cand {
    piece: TrimPiece; step: PieceStep | null; moment: PieceMoment | null;
    tier: 'Standard' | 'Filler'; rank: number; competes: KeyDay | null; overlap: string | null;
  }
  const cands: Cand[] = [];
  for (const piece of pieces) {
    if (piece.status !== 'Planned' || !day(piece.postDate)) continue;
    const step = piece.stepId ? stepOf.get(sameId(piece.stepId)) ?? null : null;
    if (step?.priority === 'Core') continue;
    const moment = step?.momentId ? momentOf.get(sameId(step.momentId)) ?? null : null;
    const n = dayNumber(piece.postDate!);
    const mine = moment ? sameId(moment.id) : '';
    const competes = keys
      .filter((k) => k.momentId !== mine && Math.abs(k.day - n) <= COMPETE_DAYS)
      .sort((a, b) => Math.abs(a.day - n) - Math.abs(b.day - n))[0] ?? null;
    cands.push({
      piece, step, moment,
      tier: step?.priority === 'Filler' ? 'Filler' : 'Standard',
      rank: CUT_RANK[step?.playbook ?? ''] ?? CUT_RANK_UNKNOWN,
      competes, overlap: null,
    });
  }

  const base = (a: Cand, b: Cand): number =>
    (a.tier === b.tier ? 0 : a.tier === 'Filler' ? -1 : 1)
    || a.rank - b.rank
    || (a.competes ? 0 : 1) - (b.competes ? 0 : 1)
    || day(b.piece.postDate).localeCompare(day(a.piece.postDate))
    || a.piece.title.localeCompare(b.piece.title);
  cands.sort(base);

  // Near-duplicates. For each pair, the one earlier in the order above
  // is the one to lose, and it says which piece it doubles.
  for (let i = 0; i < cands.length; i++) {
    for (let j = cands.length - 1; j > i; j--) {
      const a = cands[i], b = cands[j];
      if (!a.moment || !b.moment || sameId(a.moment.id) === sameId(b.moment.id)) continue;
      if ((a.piece.media ?? 'Video') !== (b.piece.media ?? 'Video')) continue;
      if (weekOf(a.piece.postDate!) !== weekOf(b.piece.postDate!)) continue;
      a.overlap = b.piece.title;
      break;
    }
  }
  cands.sort((a, b) =>
    (a.tier === b.tier ? 0 : a.tier === 'Filler' ? -1 : 1)
    || (a.overlap ? 0 : 1) - (b.overlap ? 0 : 1)
    || base(a, b));

  const rows: TrimRow[] = cands.map((c, i) => {
    const bits = [c.tier, c.step?.playbook ?? 'no campaign'];
    let reason = bits.join(', ');
    if (c.overlap) reason += `, overlaps with ${c.overlap}`;
    else if (c.competes) reason += `, within ${COMPETE_DAYS} days of ${c.competes.momentTitle}'s ${c.competes.what}`;
    if (!c.step?.priority) reason += ', no priority set';
    const movable = canMoveToNextMonth(c.step);
    return {
      pieceId: c.piece.id,
      stepId: c.step?.id ?? null,
      title: c.piece.title,
      postDate: day(c.piece.postDate),
      media: c.piece.media ?? 'Video',
      tier: c.tier,
      playbook: c.step?.playbook ?? null,
      momentTitle: c.moment?.title ?? null,
      reason,
      suggested: i < over,
      canMove: movable,
      moveTo: movable ? nextMonthSameWeekday(c.piece.postDate!) : null,
    };
  });
  return { planned, over, rows, stillOver: Math.max(0, over - rows.length) };
}

/** The line written into Notes on a trimmed piece and its step. */
export function trimNote(today: string, reason: string): string {
  return `Trimmed ${today}: over monthly cap (${reason})`;
}

/** The line written when a piece is pushed a month instead. */
export function moveNote(today: string, from: string): string {
  return `Moved ${today}: over monthly cap (was ${from})`;
}

/** Notes with one more line on the end. */
export function appendNote(notes: string | null | undefined, line: string): string {
  const was = (notes ?? '').trimEnd();
  return was ? `${was}\n${line}` : line;
}

/** Notes with that exact line taken back out, for an undo. */
export function removeNote(notes: string | null | undefined, line: string): string {
  return (notes ?? '').split('\n').filter((l) => l.trim() !== line.trim()).join('\n').trim();
}

/**
 * Film sessions a trim has left with nothing to film for.
 *
 * A session feeds the "Client films" steps between it and the next
 * session in the same moment. If every one of those is now out of the
 * plan, and at least one went in this trim, the session is listed. A
 * session that still feeds anything, a step with no rows yet included,
 * is never listed, and neither is one that is already done.
 */
export function sessionsNoLongerNeeded(
  steps: readonly PieceStep[], trimmedStepIds: readonly string[],
): PieceStep[] {
  const trimmed = new Set(trimmedStepIds.map(sameId));
  const byMoment = new Map<string, PieceStep[]>();
  for (const s of steps) {
    if (!s.momentId || !day(s.date)) continue;
    const k = sameId(s.momentId);
    if (!byMoment.has(k)) byMoment.set(k, []);
    byMoment.get(k)!.push(s);
  }
  const out: PieceStep[] = [];
  for (const list of byMoment.values()) {
    const sessions = list
      .filter((s) => s.flow === FILM_SESSION_FLOW && !STEP_OUT.includes(s.status ?? ''))
      .sort((a, b) => day(a.date).localeCompare(day(b.date)));
    sessions.forEach((session, i) => {
      if (session.status === 'Done') return;
      const from = day(session.date);
      const until = sessions[i + 1] ? day(sessions[i + 1].date) : '9999';
      const fed = list.filter((s) => s.flow === CLIENT_FILMS_FLOW && day(s.date) >= from && day(s.date) < until);
      if (!fed.length) return;
      if (fed.some((s) => !STEP_OUT.includes(s.status ?? ''))) return;
      if (!fed.some((s) => trimmed.has(sameId(s.id)))) return;
      out.push(session);
    });
  }
  return out.sort((a, b) => day(a.date).localeCompare(day(b.date)));
}
