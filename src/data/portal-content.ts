// ─────────────────────────────────────────────────────────────
// Client portal: the Content Pipeline.
//
// This is the first part of the portal a client can WRITE to, so it
// carries two whitelists rather than one:
//
//   CONTENT_FIELDS       what may be read OUT of Notion
//   CLIENT_EDITABLE      what may be written IN
//
// The second one is the load-bearing list. A browser can send any JSON
// it likes to the write endpoint, so the server decides what a client
// is allowed to change, never the request. Everything not named below
// is dropped silently: Edit Link, Posted By, Source and Hide from
// Client are ours, and a client editing "Hide from Client" could hand
// themselves rows we deliberately kept back.
//
// Nothing here talks to Notion or reads a secret.
// ─────────────────────────────────────────────────────────────

import { parseNotionDate } from './portal';

/* ── read whitelist ───────────────────────────────────────────── */

export const CONTENT_FIELDS = [
  'Content',
  'Status',
  'Bucket',
  'Format',
  'Source',
  'Film By',
  'Post Date',
  'Posted By',
  'Platforms',
  'Campaign',
  'Shoot Code',
  'On-Screen Text',
  'Caption',
  'Notes',
  'Feedback',
  'Footage Link',
  'Edit Link',
  'Post Link',
] as const;

/** A tripwire, the same as the other databases have. `Hide from Client`
 *  decides whether a row ships at all, so it must never ship WITH it:
 *  a client who can see the flag can see which rows we held back. */
export const CONTENT_NEVER_SEND = ['Hide from Client', 'Last Edited By', 'Client'] as const;

/* ── statuses ─────────────────────────────────────────────────── */

export const CONTENT_STATUSES = [
  'Idea', 'Planned', 'Filmed', 'Footage In', 'Editing',
  'Ready for Review', 'Approved', 'Scheduled', 'Posted', 'Skipped',
] as const;

export type ContentStatus = typeof CONTENT_STATUSES[number];

/**
 * Where a client may move a card, and nowhere else.
 *
 * Editing and Scheduled are ours to reach on our own: they describe
 * work on our side, and a client announcing "Editing" would be telling
 * us something had happened that had not. The one exception is a card
 * sitting in Your review, where "Request changes" hands it back to us,
 * and that IS the client saying something happened. Approved → Posted
 * is allowed because a client who posts it themselves is the only one
 * who knows.
 *
 * Two further moves are conditional and so live in canClientMove
 * rather than here: filmed-and-back, which only makes sense on a card
 * the client films, and anything at all on a card the client posts.
 */
export const CLIENT_STATUS_MOVES: Record<ContentStatus, ContentStatus[]> = {
  'Idea':             ['Planned', 'Skipped'],
  'Planned':          ['Idea', 'Filmed', 'Skipped'],
  'Filmed':           ['Footage In', 'Skipped'],
  'Footage In':       ['Skipped'],
  'Editing':          ['Skipped'],
  'Ready for Review': ['Approved', 'Editing', 'Skipped'],
  'Approved':         ['Posted', 'Skipped'],
  'Scheduled':        ['Posted', 'Skipped'],
  'Posted':           ['Skipped'],
  'Skipped':          ['Idea'],
};

/* ── who makes it ─────────────────────────────────────────────── */

export const CONTENT_SOURCES = ['Client Films', 'Show Media', 'Flyer / Graphic'] as const;
export type ContentSource = typeof CONTENT_SOURCES[number];

/** The client has to point a camera at themselves for this one. */
export function clientFilms(source: string | null): boolean {
  return source === 'Client Films';
}

/** We make it out of material we already hold. There is nothing for
 *  the client to do, which is why these get a column of their own
 *  rather than sitting in To film with a date they cannot act on. */
export function weMake(source: string | null): boolean {
  return source === 'Show Media' || source === 'Flyer / Graphic';
}

/** What a card says under its title: the only date on it that the
 *  reader can act on. Film By belongs to the client and only appears
 *  on a card they film; everything else is counting down to a post. */
export interface CardDate { label: 'Film by' | 'Posts'; date: string }

/** Statuses where the camera has already rolled, so a Film By on the
 *  card is history rather than something anyone still has to do. */
const SHOT_ALREADY: readonly string[] = ['Filmed', 'Footage In', 'Editing',
  'Ready for Review', 'Approved', 'Scheduled', 'Posted'];

export function cardDate(
  item: {
    source: string | null; filmBy: string | null; postDate: string | null;
    status?: string | null;
  },
): CardDate | null {
  if (clientFilms(item.source) && item.filmBy && !SHOT_ALREADY.includes(item.status ?? '')) {
    return { label: 'Film by', date: item.filmBy };
  }
  if (item.postDate) return { label: 'Posts', date: item.postDate };
  return null;
}

/** What the toast says when a client tries to drag one of ours. */
export const DRAG_BLOCKED = 'Blueprint moves this one';

/**
 * The three words a client uses for where something is, as opposed to
 * the ten Notion statuses behind them. The calendar filters on this,
 * and it lives here so it cannot drift from CONTENT_STATUSES above.
 */
export type ContentPhase = 'planned' | 'progress' | 'posted';

export function contentPhase(status: string | null): ContentPhase | null {
  switch (status) {
    case 'Idea':
    case 'Planned':          return 'planned';
    case 'Filmed':
    case 'Footage In':
    case 'Editing':
    case 'Ready for Review':
    case 'Approved':
    case 'Scheduled':        return 'progress';
    case 'Posted':           return 'posted';
    default:                 return null;   // Skipped, anything unknown
  }
}

export function isContentStatus(v: unknown): v is ContentStatus {
  return typeof v === 'string' && (CONTENT_STATUSES as readonly string[]).includes(v);
}

/** The two things about a card, beyond the status it is in, that can
 *  widen what a client may do with it. */
export interface MoveWho {
  /** Posted By. A client who posts it owns the whole row. */
  postedBy?: string | null;
  /** Source. Only a card the client films can come back out of Filmed. */
  source?: string | null;
}

/** May a client move this card from `from` to `to`? Staying put is
 *  always fine, which is what a save that touches other fields does.
 *
 *  `who` is optional so that a caller asking the plain question still
 *  gets the plain answer. Passed, it can only ever widen the result:
 *  there is no card a client may do LESS with than the table says. */
export function canClientMove(from: string | null, to: string, who: MoveWho = {}): boolean {
  if (!isContentStatus(to)) return false;
  if (from === to) return true;
  // A row the client posts is theirs from idea to posted, so they move
  // it wherever they like. We are not in the loop on it at all.
  if (who.postedBy === 'Client') return true;
  if (!isContentStatus(from)) return to === 'Idea' || to === 'Planned';
  if (CLIENT_STATUS_MOVES[from].includes(to)) return true;
  // Dragged into Filmed by mistake, dragged back out. Only on a card
  // they film: on ours, Filmed is a fact we recorded.
  if (from === 'Filmed' && to === 'Planned' && clientFilms(who.source)) return true;
  return false;
}

/* ── write whitelist ──────────────────────────────────────────── */

/** The shape a client sends. Every key is optional; absent means
 *  "leave it alone", which is what a field-at-a-time autosave needs. */
export interface ContentPatch {
  title?: string | null;
  status?: string | null;
  bucket?: string | null;
  format?: string[];
  filmBy?: string | null;
  postDate?: string | null;
  platforms?: string[];
  campaign?: string[];
  shootCode?: string | null;
  onScreenText?: string | null;
  caption?: string | null;
  notes?: string | null;
  feedback?: string | null;
  footageLink?: string | null;
  postLink?: string | null;
}

/** patch key -> Notion property name. The ONLY properties a client
 *  write may ever touch; `Last Edited By` is added by the server. */
export const CLIENT_EDITABLE: Record<keyof ContentPatch, string> = {
  title:        'Content',
  status:       'Status',
  bucket:       'Bucket',
  format:       'Format',
  filmBy:       'Film By',
  postDate:     'Post Date',
  platforms:    'Platforms',
  campaign:     'Campaign',
  shootCode:    'Shoot Code',
  onScreenText: 'On-Screen Text',
  caption:      'Caption',
  notes:        'Notes',
  feedback:     'Feedback',
  footageLink:  'Footage Link',
  postLink:     'Post Link',
};

/** Properties a client may read but never write. Named so a test can
 *  assert the two lists stay disjoint. */
export const CLIENT_READ_ONLY = ['Edit Link', 'Posted By', 'Source', 'Hide from Client'] as const;

export const MAX_TITLE = 200;
export const MAX_TEXT = 2000;

/* ── validation ───────────────────────────────────────────────── */

/** Trimmed, length-capped, empty-means-clear. */
export function cleanPatchText(v: unknown, max: number): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s) return null;
  return s.slice(0, max);
}

/**
 * A link we are willing to store and later render as an anchor.
 *
 * http and https only. A `javascript:` URL in Post Link would be
 * written by one client and clicked by us in the Notion row.
 */
export function cleanPatchUrl(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s) return null;
  if (s.length > MAX_TEXT) return undefined;
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

/** A plain YYYY-MM-DD, or null to clear it. Notion accepts more, but
 *  the portal only ever sets whole days, and narrower is safer. */
export function cleanPatchDate(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  return Number.isNaN(Date.parse(`${s}T00:00:00Z`)) ? undefined : s;
}

/** One of the options the schema actually has. A select value Notion
 *  does not know would either error or silently create an option. */
export function cleanPatchSelect(v: unknown, options: readonly string[]): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  if (!s) return null;
  return options.includes(s) ? s : undefined;
}

export function cleanPatchMulti(v: unknown, options: readonly string[]): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const out: string[] = [];
  for (const x of v) {
    if (typeof x === 'string' && options.includes(x) && !out.includes(x)) out.push(x);
  }
  return out;
}

/** Relation ids, kept only when they are moments this client can see.
 *  An id from another client's calendar is dropped, not rejected: the
 *  rest of the save is still legitimate. */
export function cleanPatchRelation(v: unknown, allowed: readonly string[]): string[] | undefined {
  if (!Array.isArray(v)) return undefined;
  const ok = new Set(allowed.map(normaliseId));
  const out: string[] = [];
  for (const x of v) {
    if (typeof x !== 'string') continue;
    const id = normaliseId(x);
    if (ok.has(id) && !out.includes(id)) out.push(id);
  }
  return out;
}

/** Notion ids travel both dashed and undashed. Compared one way. */
export function normaliseId(id: string): string {
  return id.replace(/-/g, '').toLowerCase();
}

/* ── shapes the browser receives ──────────────────────────────── */

export interface PortalOption {
  name: string;
  /** The Notion colour name, mapped to a portal token in CSS. */
  color: string;
}

export interface PortalContentItem {
  id: string;
  title: string;
  status: string | null;
  bucket: string | null;
  format: string[];
  source: string | null;
  filmBy: string | null;
  postDate: string | null;
  postedBy: string | null;
  platforms: string[];
  campaign: string[];
  shootCode: string | null;
  onScreenText: string | null;
  caption: string | null;
  notes: string | null;
  feedback: string | null;
  footageLink: string | null;
  editLink: string | null;
  postLink: string | null;
}

/** The option lists, read from the Notion schema rather than hardcoded,
 *  so a bucket added in Notion appears in the portal without a deploy. */
export interface PortalContentSchema {
  bucket: PortalOption[];
  format: PortalOption[];
  platforms: PortalOption[];
  status: PortalOption[];
}

/* ── pipeline stages ──────────────────────────────────────────── */

export type Stage = 'upNext' | 'planned' | 'toFilm' | 'filmed' | 'editing'
  | 'review' | 'ready' | 'posted';

export const STAGE_ORDER: Stage[] = ['upNext', 'planned', 'toFilm', 'filmed',
  'editing', 'review', 'ready', 'posted'];

export const STAGE_TITLE: Record<Stage, string> = {
  upNext:  'Up next',
  planned: 'Planned',
  toFilm:  'To film',
  filmed:  'Filmed',
  editing: 'In edit',
  review:  'Your review',
  ready:   'Ready to post',
  posted:  'Posted',
};

/** Said under each column heading, so a client reading the board knows
 *  whose move it is without being told. */
export const STAGE_NOTE: Record<Stage, string | null> = {
  upNext:  'We are making these',
  planned: null,
  toFilm:  'Yours to film',
  filmed:  null,
  editing: null,
  review:  'Yours to approve',
  ready:   null,
  posted:  null,
};

/** Days of Posted history the pipeline keeps. Older posts live in the
 *  Posted view, which is the whole archive. */
export const POSTED_WINDOW_DAYS = 30;

/**
 * Which pipeline column a card sits in, or null when it does not
 * belong in the pipeline at all (an undated idea, a skipped card, a
 * post older than the window).
 */
export function stageOf(
  item: {
    status: string | null; filmBy: string | null; postDate: string | null;
    source?: string | null;
  },
  now: Date = new Date(),
): Stage | null {
  switch (item.status) {
    // A dated idea is not an idea any more. The Ideas board is the
    // undated well, so without this a card someone gave a date to in
    // Notion while leaving the status alone would appear on no board
    // at all, which is worse than being in the wrong column.
    case 'Idea':
      if (!item.postDate && !item.filmBy) return null;
      return beforeCamera(item);
    case 'Planned':          return beforeCamera(item);
    case 'Filmed':
    case 'Footage In':       return 'filmed';
    case 'Editing':          return 'editing';
    case 'Ready for Review': return 'review';
    case 'Approved':
    case 'Scheduled':        return 'ready';
    case 'Posted': {
      const d = parseNotionDate(item.postDate);
      if (!d) return 'posted';
      const age = (now.getTime() - d.getTime()) / 86_400_000;
      return age <= POSTED_WINDOW_DAYS ? 'posted' : null;
    }
    default: return null;   // Skipped, anything unrecognised
  }
}

/**
 * Which of the three pre-camera columns a card starts in.
 *
 * All three are the same Notion status, Planned. What separates them is
 * Source, that is, whose move it is: the client films one, we make
 * another, and a card with no Source yet is nobody's until someone
 * says. A Film By date does NOT put a card in To film any more. It
 * used to, which is how a flyer we were drawing ended up in the
 * client's "to film" pile with a date they could do nothing about.
 */
function beforeCamera(item: { source?: string | null }): Stage {
  if (clientFilms(item.source ?? null)) return 'toFilm';
  if (weMake(item.source ?? null)) return 'upNext';
  return 'planned';
}

/**
 * The status a drop into this column means, or null when this card
 * cannot go in this column at all.
 *
 * stageOf is many statuses to one column; this is the one status a
 * drop sets. The three pre-camera columns need the guard: they share
 * the status Planned and differ only by Source, so a drop into the
 * wrong one of them would write Planned and then watch the card
 * reappear exactly where it was. Refusing up front is honest, where a
 * silent bounce looks like a bug.
 */
export function dropStatus(item: { source: string | null }, stage: Stage): ContentStatus | null {
  switch (stage) {
    case 'toFilm':  return clientFilms(item.source) ? 'Planned' : null;
    case 'upNext':  return weMake(item.source) ? 'Planned' : null;
    case 'planned': return clientFilms(item.source) || weMake(item.source) ? null : 'Planned';
    case 'filmed':  return 'Filmed';
    case 'editing': return 'Editing';
    case 'review':  return 'Ready for Review';
    case 'ready':   return 'Approved';
    case 'posted':  return 'Posted';
  }
}

/**
 * May this viewer drop this card in this column?
 *
 * One function for both surfaces. An admin may move any card to any
 * column it can hold, which is the whole point of the HQ board; a
 * client is held to canClientMove. The portal UI asks this to decide
 * what to dim, and the server asks the same question again before it
 * writes, because a dimmed column is a courtesy and not a lock.
 */
export function canDrop(
  item: { status: string | null; source: string | null; postedBy: string | null },
  stage: Stage,
  role: 'client' | 'admin',
): boolean {
  const to = dropStatus(item, stage);
  if (!to) return false;
  if (role === 'admin') return true;
  return canClientMove(item.status, to, { postedBy: item.postedBy, source: item.source });
}

/** What the client's two review buttons mean. Kept here so the button
 *  and the server agree on which status each one lands on. */
export type ReviewAction = 'approve' | 'changes';
export const REVIEW_TARGET: Record<ReviewAction, ContentStatus> = {
  approve: 'Approved',
  changes: 'Editing',
};
export const REVIEW_LABEL: Record<ReviewAction, string> = {
  approve: 'Approve',
  changes: 'Request changes',
};

/** The Ideas board: his Asana "idea well". Undated, not yet moving. */
export function isIdea(item: { status: string | null; postDate: string | null }): boolean {
  return (item.status === 'Idea' || item.status === 'Planned') && !item.postDate;
}
