/* ──────────────────────────────────────────────────────────────
   The guard every admin action runs.

   SERVER ONLY.

   The portal's write endpoints let a client change their own rows, so
   their guard asks "is this viewer allowed to touch this client". This
   one is simpler and stricter: admin or nothing. Generating a PDF,
   publishing a month and minting a share link are all Mason's, and a
   client holding a valid session for their own portal must not be able
   to reach any of them.

   Same failure as everywhere else: one 404, no detail. An endpoint
   that answered 403 would tell a client that the action exists.
   ────────────────────────────────────────────────────────────── */

import {
  isValidSlug,
  normaliseSlug,
  portalNotFound,
  readViewer,
  sessionSecret,
  type Viewer,
} from './portal-auth';
import { findClientBySlug, isNotionId, type ClientRecord } from './portal-notion';
import { isSameOrigin } from './portal-write';

export interface AdminEnv {
  NOTION_TOKEN: string;
  PORTAL_SECRET?: string;
}

export interface AdminContext {
  slug: string;
  viewer: Viewer;
  record: ClientRecord;
  /** The Notion page id from the route, already validated. */
  id: string;
  origin: string;
}

export interface AdminGuardOptions {
  /** POST actions check the Origin header as well as the cookie, so a
   *  form on another site cannot publish a month. A GET preview does
   *  not, because it is a link Mason clicks. */
  write?: boolean;
}

export async function beginAdmin(
  request: Request,
  env: AdminEnv,
  rawSlug: unknown,
  rawId: unknown,
  opts: AdminGuardOptions = {},
): Promise<{ ok: true; ctx: AdminContext } | { ok: false; response: Response }> {
  const fail = { ok: false as const, response: portalNotFound() };

  if (!env.NOTION_TOKEN) {
    console.error("portal: NOTION_TOKEN isn't set");
    return fail;
  }
  if (opts.write && !isSameOrigin(request)) return fail;

  const slug = normaliseSlug(rawSlug as string);
  if (!isValidSlug(slug)) return fail;
  if (typeof rawId !== 'string' || !isNotionId(rawId)) return fail;

  const viewer = await readViewer(request, sessionSecret(env), slug);
  if (!viewer || viewer.role !== 'admin') return fail;

  const record = await findClientBySlug(env.NOTION_TOKEN, slug);
  if (!record) return fail;

  return {
    ok: true,
    ctx: { slug, viewer, record, id: rawId, origin: new URL(request.url).origin },
  };
}

/**
 * A thrown thing, as a sentence an admin can act on.
 *
 * These endpoints are admin-only and the renderer already redacts the
 * signed token from its own message, so the real cause goes back to
 * the panel rather than only to a log stream nobody has open at the
 * moment the button is pressed.
 */
export function reason(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err ?? '');
  return text.trim().slice(0, 300) || 'no reason given';
}

/** A JSON answer for an admin action. Never cached. */
export function adminJson(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}
