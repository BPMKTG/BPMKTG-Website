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
 * Editing, Ready for Review and Scheduled are ours: they describe work
 * on our side, and a client moving a card into "Editing" would be
 * telling us something had happened that had not. Approved → Posted is
 * allowed because a client who posts it themselves is the only one who
 * knows.
 */
export const CLIENT_STATUS_MOVES: Record<ContentStatus, ContentStatus[]> = {
  'Idea':             ['Planned', 'Skipped'],
  'Planned':          ['Idea', 'Filmed', 'Skipped'],
  'Filmed':           ['Footage In', 'Skipped'],
  'Footage In':       ['Skipped'],
  'Editing':          ['Skipped'],
  'Ready for Review': ['Approved', 'Skipped'],
  'Approved':         ['Posted', 'Skipped'],
  'Scheduled':        ['Posted', 'Skipped'],
  'Posted':           ['Skipped'],
  'Skipped':          ['Idea'],
};

export function isContentStatus(v: unknown): v is ContentStatus {
  return typeof v === 'string' && (CONTENT_STATUSES as readonly string[]).includes(v);
}

/** May a client move this card from `from` to `to`? Staying put is
 *  always fine, which is what a save that touches other fields does. */
export function canClientMove(from: string | null, to: string): boolean {
  if (!isContentStatus(to)) return false;
  if (from === to) return true;
  if (!isContentStatus(from)) return to === 'Idea' || to === 'Planned';
  return CLIENT_STATUS_MOVES[from].includes(to);
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

export type Stage = 'planned' | 'toFilm' | 'filmed' | 'editing' | 'review' | 'ready' | 'posted';

export const STAGE_ORDER: Stage[] = ['planned', 'toFilm', 'filmed', 'editing', 'review', 'ready', 'posted'];

export const STAGE_TITLE: Record<Stage, string> = {
  planned: 'Planned',
  toFilm:  'To film',
  filmed:  'Filmed',
  editing: 'In edit',
  review:  'Your review',
  ready:   'Ready to post',
  posted:  'Posted',
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
  item: { status: string | null; filmBy: string | null; postDate: string | null },
  now: Date = new Date(),
): Stage | null {
  switch (item.status) {
    // A dated idea is not an idea any more. The Ideas board is the
    // undated well, so without this a card someone gave a date to in
    // Notion while leaving the status alone would appear on no board
    // at all, which is worse than being in the wrong column.
    case 'Idea':
      if (!item.postDate && !item.filmBy) return null;
      return item.filmBy ? 'toFilm' : 'planned';
    case 'Planned':          return item.filmBy ? 'toFilm' : 'planned';
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

/** The Ideas board: his Asana "idea well". Undated, not yet moving. */
export function isIdea(item: { status: string | null; postDate: string | null }): boolean {
  return (item.status === 'Idea' || item.status === 'Planned') && !item.postDate;
}
