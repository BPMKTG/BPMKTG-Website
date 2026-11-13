/* ──────────────────────────────────────────────────────────────
   Client portal: the shared half of every write.

   SERVER ONLY. Two endpoints use this — create and update — and they
   must agree exactly on what a client is allowed to send, so the
   decision lives here once.

   The shape of the thing is: a request is a bag of untrusted JSON. It
   is never spread into a Notion payload. Every field is looked up by
   name in CLIENT_EDITABLE, validated by type, and written into a
   fresh object. A key we do not recognise does not survive the trip.
   ────────────────────────────────────────────────────────────── */

import {
  CLIENT_EDITABLE,
  MAX_TEXT,
  MAX_TITLE,
  canClientMove,
  cleanPatchDate,
  cleanPatchMulti,
  cleanPatchRelation,
  cleanPatchSelect,
  cleanPatchText,
  cleanPatchUrl,
  appendFeedback,
  type ContentPatch,
  type PortalContentSchema,
} from '../data/portal-content';

/** Writes per client per minute. Generous for a person typing, mean
 *  for a script: autosave fires on blur, not per keystroke. */
export const WRITE_LIMIT = 30;
export const WRITE_WINDOW_SECONDS = 60;

/* ── request guards ───────────────────────────────────────────── */

/**
 * Is this request from our own page?
 *
 * The session cookie is SameSite=Lax, which already stops a
 * cross-site form POST from carrying it. This is the second lock: a
 * request with no Origin and no Referer is rejected too, because every
 * fetch() the portal makes has one.
 */
export function isSameOrigin(request: Request): boolean {
  const self = new URL(request.url).origin;
  const origin = request.headers.get('Origin');
  if (origin) return origin === self;

  const referer = request.headers.get('Referer');
  if (referer) {
    try { return new URL(referer).origin === self; } catch { return false; }
  }
  return false;
}

/** Only JSON, and only a body small enough to be a form. */
export function isJsonRequest(request: Request): boolean {
  const ct = request.headers.get('Content-Type') ?? '';
  return ct.split(';')[0].trim().toLowerCase() === 'application/json';
}

export const MAX_BODY_BYTES = 32 * 1024;

export async function readJsonBody(request: Request): Promise<Record<string, unknown> | null> {
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_BYTES) return null;
    const parsed = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/* ── patch → Notion properties ────────────────────────────────── */

const names = (opts: { name: string }[]) => opts.map((o) => o.name);

export interface BuildContext {
  schema: PortalContentSchema;
  /** Moment page ids this client is allowed to link to. */
  allowedCampaigns: readonly string[];
  /** The status the row is in now, or null when creating. */
  currentStatus: string | null;
  /**
   * Posted By and Source as Notion holds them, read off the page that
   * was just fetched and never off the request. Both widen what a
   * client may do with this one row: they own a row they post, and
   * only a card they film can come back out of Filmed.
   */
  postedBy?: string | null;
  source?: string | null;
  /**
   * Who is asking. One of us moves any card to any column, which is
   * what the HQ board is for; absent means client, so a caller that
   * forgets this gets the tighter answer rather than the looser one.
   */
  role?: 'client' | 'admin';
  /** The Feedback field as it stands, for a note to be added to. */
  currentFeedback?: string | null;
  /** Today as an ISO day, stamped on a note. Passed in so the rule is
   *  testable and the clock is the server's, not the request's. */
  today?: string;
}

export interface BuildResult {
  properties: Record<string, unknown>;
  /** Fields the client sent that were refused. Logged, never returned
   *  in detail: it would tell a prober which names are real. */
  rejected: string[];
}

/**
 * Turn an untrusted patch into Notion properties.
 *
 * Returns only what passed. A field that fails validation is dropped
 * and named in `rejected`; the rest of the save still goes through,
 * because a client who pasted a bad link should not lose the caption
 * they typed in the same breath.
 */
export function buildContentProperties(body: Record<string, unknown>, ctx: BuildContext): BuildResult {
  const props: Record<string, unknown> = {};
  const rejected: string[] = [];

  const take = <T>(key: keyof ContentPatch, value: T | undefined, write: (v: T) => unknown) => {
    if (!(key in body)) return;
    if (value === undefined) { rejected.push(String(key)); return; }
    props[CLIENT_EDITABLE[key]] = write(value);
  };

  const richText = (v: string | null) => ({ rich_text: v ? [{ text: { content: v } }] : [] });
  const dateProp = (v: string | null) => ({ date: v ? { start: v } : null });
  const selectProp = (v: string | null) => ({ select: v ? { name: v } : null });
  const multiProp = (v: string[]) => ({ multi_select: v.map((name) => ({ name })) });

  take('title', cleanPatchText(body.title, MAX_TITLE),
    (v) => ({ title: v ? [{ text: { content: v } }] : [] }));

  // Status is the one field with a rule beyond its type: a client may
  // only move a card where canClientMove allows, whatever the request
  // says. This is the check the dimmed column and the toast are a
  // picture of, and it is the one that actually holds: a client can
  // send this endpoint any JSON they like.
  if ('status' in body) {
    const wanted = cleanPatchSelect(body.status, names(ctx.schema.status));
    const mayMove = typeof wanted === 'string' && (
      ctx.role === 'admin'
      || canClientMove(ctx.currentStatus, wanted,
                       { postedBy: ctx.postedBy, source: ctx.source })
    );
    if (typeof wanted === 'string' && mayMove) {
      props[CLIENT_EDITABLE.status] = selectProp(wanted);
    } else {
      rejected.push('status');
    }
  }

  take('bucket', cleanPatchSelect(body.bucket, names(ctx.schema.bucket)), selectProp);
  take('format', cleanPatchMulti(body.format, names(ctx.schema.format)), multiProp);
  take('platforms', cleanPatchMulti(body.platforms, names(ctx.schema.platforms)), multiProp);
  take('filmBy', cleanPatchDate(body.filmBy), dateProp);
  take('postDate', cleanPatchDate(body.postDate), dateProp);
  take('campaign', cleanPatchRelation(body.campaign, ctx.allowedCampaigns),
    (v) => ({ relation: v.map((id) => ({ id })) }));
  take('shootCode', cleanPatchText(body.shootCode, MAX_TEXT), richText);
  take('onScreenText', cleanPatchText(body.onScreenText, MAX_TEXT), richText);
  take('caption', cleanPatchText(body.caption, MAX_TEXT), richText);
  take('notes', cleanPatchText(body.notes, MAX_TEXT), richText);
  take('feedback', cleanPatchText(body.feedback, MAX_TEXT), richText);
  take('footageLink', cleanPatchUrl(body.footageLink), (v) => ({ url: v }));
  take('postLink', cleanPatchUrl(body.postLink), (v) => ({ url: v }));

  // Media says what a piece is, and on one of ours it feeds the month's
  // count. So a client sets it on a row they own (or one they are
  // creating, which will be theirs) and nowhere else.
  if ('media' in body) {
    const owns = ctx.role === 'admin' || ctx.postedBy === 'Client' || ctx.currentStatus === null;
    const wanted = cleanPatchSelect(body.media, names(ctx.schema.media ?? []));
    if (owns && wanted !== undefined) props[CLIENT_EDITABLE.media] = selectProp(wanted);
    else rejected.push('media');
  }

  // One more note on the thread. The request supplies the words and
  // nothing else: who said it comes from the session and the day from
  // the server, so a note cannot be backdated or signed as us.
  if ('feedbackAdd' in body) {
    const note = cleanPatchText(body.feedbackAdd, MAX_TEXT);
    if (typeof note === 'string' && ctx.today) {
      const thread = appendFeedback(ctx.currentFeedback ?? null, editedBy(ctx.role ?? 'client'), ctx.today, note);
      props[CLIENT_EDITABLE.feedback] = richText(thread);
    } else {
      rejected.push('feedbackAdd');
    }
  }

  // The cut itself. Ours to attach and nobody else's: a client who
  // could point Edit Link anywhere could put any page in front of us
  // under the words "watch the edit".
  if ('editLink' in body) {
    const link = cleanPatchUrl(body.editLink);
    if (ctx.role === 'admin' && link !== undefined) props['Edit Link'] = { url: link };
    else rejected.push('editLink');
  }

  return { properties: props, rejected };
}

/**
 * The two names a `Last Edited By` can hold, and the only place the
 * mapping from a session role to one of them is written down.
 *
 * Taken from the signed session, never from the request. When one of
 * us is standing in a client's portal the row says Blueprint, because
 * "the client changed this" has to keep meaning that.
 *
 * Shared with report-publish.ts, which stamps the same two words into
 * a column that happens to be typed Text rather than Select. The two
 * writers must keep agreeing on the vocabulary or the Notion board
 * ends up filtering on words that only half the rows use.
 */
export function editedBy(role: 'client' | 'admin'): 'Blueprint' | 'Client' {
  return role === 'admin' ? 'Blueprint' : 'Client';
}

/**
 * Stamped on every write, so the Notion board shows at a glance who
 * last touched a row.
 *
 * Content Pipeline and Campaign Calendar both type this column as a
 * Select, hence the shape here.
 */
export function stampEdit(
  props: Record<string, unknown>,
  role: 'client' | 'admin',
): Record<string, unknown> {
  return { ...props, 'Last Edited By': { select: { name: editedBy(role) } } };
}
