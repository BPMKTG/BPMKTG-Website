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
  'Media',
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
 * Where a client may move a card that is OURS to post, and nowhere
 * else. A row the client posts is theirs end to end and never reaches
 * this table; see canClientMove.
 *
 * It is short on purpose. On our work the client has exactly two
 * things to say: "that cut is fine" or "change it". Everything else on
 * the row describes work on our side, and a client announcing it would
 * be telling us something had happened that had not. The film tick is
 * the one further move, and it is conditional on the card being one
 * they film, so it lives in canClientMove rather than here.
 */
export const CLIENT_STATUS_MOVES: Record<ContentStatus, ContentStatus[]> = {
  'Idea':             [],
  'Planned':          [],
  'Filmed':           [],
  'Footage In':       [],
  'Editing':          [],
  'Ready for Review': ['Approved', 'Editing'],
  'Approved':         [],
  'Scheduled':        [],
  'Posted':           [],
  'Skipped':          [],
};

/* ── who makes it ─────────────────────────────────────────────── */

export const CONTENT_SOURCES = ['Client Films', 'Show Media', 'Flyer / Graphic'] as const;
export type ContentSource = typeof CONTENT_SOURCES[number];

/** The client has to point a camera at themselves for this one. */
export function clientFilms(source: string | null): boolean {
  return source === 'Client Films';
}

/* ── what it is ───────────────────────────────────────────────── */

export const CONTENT_MEDIA = ['Video', 'Photo', 'Carousel', 'Graphic', 'Story'] as const;
export type ContentMedia = typeof CONTENT_MEDIA[number];

/** Media that is put together at a desk. Nobody films a flyer, so a
 *  card of one of these never says "film" whatever its Source says:
 *  every row a client adds is stamped Client Films, including the
 *  carousel they plan to assemble from photos they already have. */
const NEVER_FILMED: readonly string[] = ['Graphic', 'Photo', 'Carousel'];

/** Does making this piece start with a camera pointed at the client? */
export function isFilmJob(item: { source: string | null; media?: string | null }): boolean {
  return clientFilms(item.source) && !NEVER_FILMED.includes(item.media ?? '');
}

/* ── where it came from, and whether it counts ────────────────── */

/**
 * Derived, never stored. A row is part of a campaign when it is linked
 * to a moment; otherwise it is an idea while it is still only that, and
 * a standalone piece once it is moving.
 */
export type ContentOrigin = 'campaign' | 'idea' | 'standalone';

export function originOf(item: { campaign: readonly string[]; status: string | null }): ContentOrigin {
  if (item.campaign.length) return 'campaign';
  return item.status === 'Idea' ? 'idea' : 'standalone';
}

/**
 * Does this row count toward what we owe the client this month?
 *
 * Ours to post, not dropped, and dated. A client posting ten things
 * themselves discharges nothing we promised, and a piece with no date
 * is not in any month yet. One row is one deliverable however many
 * platforms it goes out on.
 */
export function countsToward(item: {
  postedBy?: string | null; status: string | null; postDate: string | null;
}): boolean {
  return item.postedBy === 'Blueprint' && item.status !== 'Skipped' && !!item.postDate;
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
 *  Three things a client may do, and the server holds them to it:
 *    - anything at all on a row they post, because we are not in the
 *      loop on it;
 *    - answer a cut that is waiting on them, yes or no;
 *    - tick "filmed" on a card they film, and untick it.
 *  Everything else is ours, and is answered with DRAG_BLOCKED. */
export function canClientMove(from: string | null, to: string, who: MoveWho = {}): boolean {
  if (!isContentStatus(to)) return false;
  if (from === to) return true;
  if (who.postedBy === 'Client') return true;
  // A row that does not exist yet: the quick-add form, which only ever
  // makes an idea or a planned card.
  if (!isContentStatus(from)) return to === 'Idea' || to === 'Planned';
  if (CLIENT_STATUS_MOVES[from].includes(to)) return true;
  // The film tick. Only on a card they film: on ours, Filmed is a fact
  // we recorded, and a client setting it would be inventing footage.
  if (clientFilms(who.source)) {
    if (from === 'Planned' && to === 'Filmed') return true;
    if (from === 'Filmed' && (to === 'Planned' || to === 'Footage In')) return true;
  }
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
  media?: string | null;
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
  // What the piece is. Writable so "Plan it" can say an idea is a
  // carousel rather than a video, and held to rows the client owns:
  // Media on one of ours feeds the month's breakdown, and that is not
  // theirs to recount. The server makes that distinction, not this map.
  media:        'Media',
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

/* ── previewing the cut ───────────────────────────────────────── */

/**
 * How an Edit Link can be shown inside the drawer, or null when the
 * honest answer is "open it in a new tab".
 *
 * Only shapes we can name are embedded. A link is typed into Notion by
 * hand, so this recognises a handful of hosts by their own URL shapes
 * and builds the embed address itself, rather than putting whatever
 * was pasted into a frame. Anything else stays a link.
 */
export interface EditPreview { kind: 'video' | 'image' | 'frame'; src: string }

export function editPreview(raw: string | null | undefined): EditPreview | null {
  let u: URL;
  try { u = new URL(String(raw ?? '')); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  const path = u.pathname;

  if (/\.(mp4|webm|mov|m4v)$/i.test(path)) return { kind: 'video', src: u.toString() };
  if (/\.(jpe?g|png|webp|gif|avif)$/i.test(path)) return { kind: 'image', src: u.toString() };

  if (host === 'drive.google.com') {
    const id = /^\/file\/d\/([\w-]{10,})/.exec(path)?.[1]
      ?? (path === '/open' ? u.searchParams.get('id') : null);
    if (id && /^[\w-]{10,}$/.test(id)) {
      return { kind: 'frame', src: `https://drive.google.com/file/d/${id}/preview` };
    }
    return null;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be') {
    const id = host === 'youtu.be' ? path.slice(1)
      : path === '/watch' ? u.searchParams.get('v')
      : /^\/shorts\/([\w-]+)/.exec(path)?.[1];
    if (id && /^[\w-]{6,20}$/.test(id)) {
      return { kind: 'frame', src: `https://www.youtube-nocookie.com/embed/${id}` };
    }
    return null;
  }
  if (host === 'vimeo.com') {
    const id = /^\/(\d{5,12})$/.exec(path)?.[1];
    return id ? { kind: 'frame', src: `https://player.vimeo.com/video/${id}` } : null;
  }
  return null;
}

/* ── the feedback thread ──────────────────────────────────────── */

/**
 * Feedback is one text field in Notion, and a review is a
 * conversation. Rather than a second database for five lines of back
 * and forth, each note is stored as a stamped line:
 *
 *     [2026-11-13 · Client] Cut the intro, the logo sits too long.
 *     [2026-11-14 · Blueprint] New cut is up.
 *
 * which still reads as plain notes to anyone looking at the row in
 * Notion. The stamp is written by the server from the signed session,
 * never by the request, so a note cannot claim to be from someone
 * else. Text typed into the field by hand, before any of this, is
 * kept and shown as one undated note.
 */
export interface FeedbackEntry {
  who: 'Client' | 'Blueprint' | null;
  day: string | null;
  text: string;
}

const FEEDBACK_STAMP = /^\[(\d{4}-\d{2}-\d{2}) · (Client|Blueprint)\] ?/;

export function parseFeedback(raw: string | null | undefined): FeedbackEntry[] {
  const out: FeedbackEntry[] = [];
  let open: FeedbackEntry | null = null;
  for (const line of String(raw ?? '').split('\n')) {
    const m = FEEDBACK_STAMP.exec(line);
    if (m) {
      open = { who: m[2] as 'Client' | 'Blueprint', day: m[1], text: line.slice(m[0].length) };
      out.push(open);
    } else if (open) {
      open.text += `\n${line}`;
    } else if (line.trim()) {
      open = { who: null, day: null, text: line };
      out.push(open);
    }
  }
  return out.map((e) => ({ ...e, text: e.text.trim() })).filter((e) => e.text);
}

/** The newest note, which is what a card has room for. */
export function latestFeedback(raw: string | null | undefined): FeedbackEntry | null {
  const all = parseFeedback(raw);
  return all.length ? all[all.length - 1] : null;
}

/**
 * The field with one more note on the end.
 *
 * Notion caps what we store at MAX_TEXT. When the thread outgrows it
 * the oldest notes go first: the note that matters is the one somebody
 * has not acted on yet, and that is never the oldest.
 */
export function appendFeedback(
  raw: string | null | undefined,
  who: 'Client' | 'Blueprint',
  day: string,
  text: string,
): string {
  const note = text.trim();
  if (!note) return String(raw ?? '');
  const lines = parseFeedback(raw).map((e) =>
    e.who && e.day ? `[${e.day} · ${e.who}] ${e.text}` : e.text);
  lines.push(`[${day} · ${who}] ${note}`);
  while (lines.length > 1 && lines.join('\n').length > MAX_TEXT) lines.shift();
  return lines.join('\n').slice(-MAX_TEXT);
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
  /** Video, Photo, Carousel, Graphic or Story. Null on a row nobody
   *  has classified, which reads as a video everywhere it matters. */
  media: string | null;
}

/** The option lists, read from the Notion schema rather than hardcoded,
 *  so a bucket added in Notion appears in the portal without a deploy. */
export interface PortalContentSchema {
  bucket: PortalOption[];
  format: PortalOption[];
  platforms: PortalOption[];
  status: PortalOption[];
  media: PortalOption[];
}

/* ── pipeline stages ──────────────────────────────────────────── */

/**
 * Five stages, the same five for every kind of piece.
 *
 * The board used to have eight columns, three of them the one status
 * Planned split by who made the thing, and it read as a film schedule
 * with graphics bolted on. A flyer has no "to film" and no "filmed".
 * What every piece does have is: someone is planning it, someone is
 * making it, someone is checking it, it is ready, it is out. Whose move
 * it is inside a stage is said on the card (see nextMove), not by the
 * column.
 */
export type Stage = 'plan' | 'make' | 'review' | 'ready' | 'posted';

export const STAGE_ORDER: Stage[] = ['plan', 'make', 'review', 'ready', 'posted'];

export const STAGE_TITLE: Record<Stage, string> = {
  plan:   'Plan',
  make:   'Make',
  review: 'Review',
  ready:  'Ready',
  posted: 'Posted',
};

/** The Notion statuses each stage holds, first one first. */
export const STAGE_STATUSES: Record<Stage, ContentStatus[]> = {
  plan:   ['Planned'],
  make:   ['Filmed', 'Footage In', 'Editing'],
  review: ['Ready for Review'],
  ready:  ['Approved', 'Scheduled'],
  posted: ['Posted'],
};

/**
 * Which column a card sits in, or null when it is not on the board.
 *
 * An idea is not on the board: it lives in Ideas until someone plans
 * it. A skipped card is nowhere. This is status and nothing else; how
 * much Posted history a view shows is the view's business
 * (see postedRecently).
 */
export function stageOf(item: { status: string | null }): Stage | null {
  for (const stage of STAGE_ORDER) {
    if ((STAGE_STATUSES[stage] as readonly string[]).includes(item.status ?? '')) return stage;
  }
  return null;
}

/** Days of Posted history a board keeps when nobody has asked for a
 *  particular month. Sean alone has more than a hundred posts behind
 *  him, and a column of all of them buries the five that are moving. */
export const POSTED_WINDOW_DAYS = 30;

export function postedRecently(item: { postDate: string | null }, now: Date = new Date()): boolean {
  const d = parseNotionDate(item.postDate);
  if (!d) return true;
  return (now.getTime() - d.getTime()) / 86_400_000 <= POSTED_WINDOW_DAYS;
}

/**
 * The status a drop into this column writes.
 *
 * A column's first status, with two exceptions the board is built
 * around. Make writes Editing, because one of us dragging a card into
 * Make means work has started, not that footage has appeared. Ready
 * writes Approved, which happens to be its first status anyway and is
 * named so nobody "fixes" it to Scheduled.
 *
 * The client's Make is different on one kind of card. The only way
 * work starts on a piece they film is that they filmed it, so their
 * drop there is the film tick: Filmed, not Editing.
 */
export function dropStatus(
  item: { source: string | null; media?: string | null },
  stage: Stage,
  role: 'client' | 'admin' = 'admin',
): ContentStatus {
  switch (stage) {
    case 'plan':   return 'Planned';
    case 'make':   return role === 'client' && isFilmJob(item) ? 'Filmed' : 'Editing';
    case 'review': return 'Ready for Review';
    case 'ready':  return 'Approved';
    case 'posted': return 'Posted';
  }
}

/**
 * May this viewer drop this card in this column?
 *
 * One function for both surfaces. An admin may move any card to any
 * column, which is the whole point of the HQ board; a client is held
 * to canClientMove. The portal asks this to decide what to dim, and
 * the server asks the same question again before it writes, because a
 * dimmed column is a courtesy and not a lock.
 */
export function canDrop(
  item: { status: string | null; source: string | null; postedBy: string | null; media?: string | null },
  stage: Stage,
  role: 'client' | 'admin',
): boolean {
  if (role === 'admin') return true;
  const to = dropStatus(item, stage, 'client');
  return canClientMove(item.status, to, { postedBy: item.postedBy, source: item.source });
}

/* ── the next move ────────────────────────────────────────────── */

export type Waiting = 'Blueprint' | 'Client';

export interface NextMove {
  /** One line, in the voice of whoever is reading. */
  text: string;
  /** Whose move it is, or null once there is nothing left to do. The
   *  "Waiting on" filter is this and nothing else. */
  waiting: Waiting | null;
}

/** Who the client is to the reader: their name in HQ, "You" to them. */
export interface Voice { name: string; you?: boolean }

const MONTHS_3 = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 13" from a Notion day, read as the day it says and not shifted
 *  by whatever timezone the reader is in. */
export function shortDay(iso: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso ?? '');
  if (!m) return '';
  return `${MONTHS_3[Number(m[2]) - 1] ?? ''} ${Number(m[3])}`.trim();
}

/** What we are doing to a piece while it is in the edit, by what it is. */
function makingVerb(media: string | null | undefined): string {
  if (media === 'Graphic' || media === 'Story') return 'designing';
  if (media === 'Photo' || media === 'Carousel') return 'selecting';
  return 'editing';
}

/**
 * The one line on a card that says what happens next and who does it.
 *
 * Derived from Media, Source and Status, so it cannot drift from the
 * row the way a typed "next step" would. Film By appears in exactly one
 * of these lines, the one where the client has a camera job, and
 * nowhere else on the card.
 */
export function nextMove(
  item: {
    status: string | null; source: string | null; media?: string | null;
    filmBy: string | null; postDate: string | null; postedBy?: string | null;
  },
  voice: Voice,
): NextMove | null {
  const them = voice.you ? 'You' : voice.name;
  const posts = shortDay(item.postDate);
  switch (item.status) {
    case 'Planned': {
      if (isFilmJob(item)) {
        const by = shortDay(item.filmBy);
        const verb = voice.you ? 'film' : 'films';
        return { text: by ? `${them} ${verb} by ${by}` : `${them} ${verb} this one`, waiting: 'Client' };
      }
      // A piece the client is putting together themselves and posting
      // themselves is not something we are making, whatever its media.
      const theirs = item.postedBy === 'Client' && clientFilms(item.source);
      const maker = theirs ? them : 'Blueprint';
      return {
        text: posts ? `${maker} making · posts ${posts}` : `${maker} making`,
        waiting: theirs ? 'Client' : 'Blueprint',
      };
    }
    case 'Filmed':
    case 'Footage In':
      return { text: 'Blueprint to edit', waiting: 'Blueprint' };
    case 'Editing':
      return { text: `Blueprint ${makingVerb(item.media)}`, waiting: 'Blueprint' };
    case 'Ready for Review':
      return { text: voice.you ? 'Yours to approve' : `${them} to approve`, waiting: 'Client' };
    case 'Approved':
    case 'Scheduled':
      return {
        text: posts ? `Posts ${posts}` : 'Ready to post',
        waiting: item.postedBy === 'Client' ? 'Client' : 'Blueprint',
      };
    case 'Posted':
      return { text: posts ? `Posted ${posts}` : 'Posted', waiting: null };
    default:
      return null;   // Idea, Skipped, anything unknown
  }
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

/* ── the Ideas list ───────────────────────────────────────────── */

/**
 * The client's backlog: everything that is still only an idea, plus
 * the pieces they are making on their own that have not gone out yet.
 *
 * Campaign rows are never here, with one exception that is not really
 * one: an Idea linked to a moment is still an idea, and it has to live
 * somewhere, because the board will not show it.
 */
export function inIdeas(item: { status: string | null; campaign: readonly string[] }): boolean {
  if (item.status === 'Idea') return true;
  if (item.status === 'Posted' || item.status === 'Skipped') return false;
  return originOf(item) === 'standalone';
}

/** Still only an idea, as opposed to a standalone piece on its way. */
export function isIdea(item: { status: string | null }): boolean {
  return item.status === 'Idea';
}
