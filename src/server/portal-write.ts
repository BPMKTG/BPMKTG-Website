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
  // only move a card where CLIENT_STATUS_MOVES allows, whatever the
  // request says. "Editing" is ours to set.
  if ('status' in body) {
    const wanted = cleanPatchSelect(body.status, names(ctx.schema.status));
    if (typeof wanted === 'string' && canClientMove(ctx.currentStatus, wanted)) {
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

  return { properties: props, rejected };
}

/** Stamped on every client write, so the Notion board shows at a
 *  glance who last touched a row. Never taken from the request. */
export function stampClientEdit(props: Record<string, unknown>): Record<string, unknown> {
  return { ...props, 'Last Edited By': { select: { name: 'Client' } } };
}
