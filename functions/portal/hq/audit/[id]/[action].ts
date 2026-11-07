/* ──────────────────────────────────────────────────────────────
   Actions on a prospect teardown.

     GET  /portal/hq/audit/<id>/preview   redirect to the print route
     POST /portal/hq/audit/<id>/pdf       generate or regenerate it
     POST /portal/hq/audit/<id>/share     mint a share link  { days? }
     POST /portal/hq/audit/<id>/revoke    kill the share link

   The pair to the portal's own admin/audit route, and it exists for
   one reason: a prospect teardown has no client, so it has no portal,
   so there is no slug to put in that route's URL. The portal version
   papers over this by acting on whichever portal happens to be open,
   which means a prospect's stored PDF link points at an unrelated
   client's files route. HQ has no portal open, so it needs its own.

   This route handles ONLY the audits that have no client. An audit
   with a client goes through /portal/<slug>/admin/audit/<id>/…, where
   the "does this row belong to this client" check lives, and is
   refused here. One document, one path.

   Nothing is emailed from here, and the only URL this creates that
   somebody outside Blueprint can open is the share link, which is a
   revocable record in KV rather than a guessable address.
   ────────────────────────────────────────────────────────────── */

import { loadAudit } from '../../../../../src/server/audit-data';
import { beginHq, hqJson, type HqEnv } from '../../../../../src/server/hq-auth';
import { reason } from '../../../../../src/server/admin-guard';
import { isNotionId } from '../../../../../src/server/portal-notion';
import { portalNotFound } from '../../../../../src/server/portal-auth';
import { setAuditShareLink } from '../../../../../src/server/report-publish';
import { mintPrintToken, printSecret } from '../../../../../src/server/print-token';
import { isJsonRequest, isSameOrigin, readJsonBody } from '../../../../../src/server/portal-write';
import {
  auditKey,
  canRender,
  generatePdf,
  type PdfEnv,
} from '../../../../../src/server/pdf';
import {
  DEFAULT_SHARE_DAYS,
  createShareLink,
  revokeShareLink,
  tokenFromShareUrl,
  type ShareStore,
} from '../../../../../src/server/share-link';

interface Env extends HqEnv, PdfEnv {
  PORTAL_KV?: ShareStore;
  PRINT_SIGNING_SECRET?: string;
}

/** Same clamp as the portal route: `0` means no expiry, anything
 *  unreadable falls back to the default, and a year is the ceiling so
 *  a typo cannot mint something permanent. */
function shareDays(body: Record<string, unknown> | null): number | null {
  const raw = body?.days;
  if (raw === 0 || raw === '0') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SHARE_DAYS;
  return Math.min(365, Math.round(n));
}

/**
 * The audit this request is about, if this route is the right one for
 * it.
 *
 * An id that is not an id, an audit that does not exist and an audit
 * that belongs to a client all answer the same 404. The last of those
 * is the point: it is not an error Mason can hit from HQ, because the
 * tab sends a client audit to the portal route, and refusing it here
 * means this route can never be the one that skips the ownership
 * check.
 */
async function loadProspect(env: Env, rawId: unknown) {
  if (typeof rawId !== 'string' || !isNotionId(rawId)) return null;
  const loaded = await loadAudit(env.NOTION_TOKEN, rawId);
  if (!loaded) return null;
  if (loaded.row.clientId) {
    console.warn('hq: a client audit was sent to the prospect route', rawId);
    return null;
  }
  return loaded;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  if (params.action !== 'preview') return portalNotFound();

  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;

  const loaded = await loadProspect(env, params.id);
  if (!loaded) return portalNotFound();

  // A redirect rather than a rendered page: bp_admin has Path=/portal
  // and does not reach /print, so the print route is opened with a
  // signed token that is good for ten minutes.
  const token = await mintPrintToken(printSecret(env), 'audit', loaded.row.id);
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/print/audit/${encodeURIComponent(loaded.row.id)}?t=${encodeURIComponent(token)}`,
      'Cache-Control': 'no-store',
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const action = params.action;
  if (action !== 'pdf' && action !== 'share' && action !== 'revoke') return portalNotFound();

  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  // Same pair as every other HQ write: the Origin header, and a
  // content type a cross-site form cannot set.
  if (!isSameOrigin(request) || !isJsonRequest(request)) return portalNotFound();

  const loaded = await loadProspect(env, params.id);
  if (!loaded) return portalNotFound();
  const id = loaded.row.id;

  // Keyed by the subject, which for a prospect is the Prospect Name.
  // loadProspect has already refused anything with a client, so
  // loaded.slug is null here by construction.
  const key = auditKey(loaded.input.subject, id);

  if (action === 'revoke') {
    if (!env.PORTAL_KV) {
      console.error('hq: PORTAL_KV is not bound, a share link cannot be revoked');
      return hqJson({ ok: false, error: 'not_configured' }, 503);
    }
    const token = tokenFromShareUrl(loaded.row.shareLink);
    if (token) await revokeShareLink(env.PORTAL_KV, token);
    await setAuditShareLink(env.NOTION_TOKEN, id, null);
    return hqJson({ ok: true, revoked: Boolean(token) });
  }

  if (action === 'share') {
    if (!env.PORTAL_KV) {
      console.error('hq: PORTAL_KV is not bound, no share link can be minted');
      return hqJson({ ok: false, error: 'not_configured' }, 503);
    }
    // The PDF has to exist before a link to it does. A share link that
    // 404s is worse than no share link, because it has already been
    // sent by the time anybody finds out.
    const stored = await env.REPORTS_BUCKET?.head(key);
    if (!stored) return hqJson({ ok: false, error: 'no_pdf_yet' }, 409);

    // One live link per audit: minting a second revokes the first, so
    // "send them a new link" also means the old one stops working.
    const previous = tokenFromShareUrl(loaded.row.shareLink);
    if (previous) await revokeShareLink(env.PORTAL_KV, previous);

    const { token, expiresAt } = await createShareLink(
      env.PORTAL_KV,
      { auditId: id, key, subject: loaded.input.subject },
      shareDays(await readJsonBody(request)),
    );
    const shareUrl = `${new URL(request.url).origin}/a/${token}`;
    await setAuditShareLink(env.NOTION_TOKEN, id, shareUrl);
    return hqJson({ ok: true, url: shareUrl, expiresAt });
  }

  if (!canRender(env) || !env.REPORTS_BUCKET) {
    console.error('hq: browser rendering credentials or REPORTS_BUCKET missing');
    return hqJson({ ok: false, error: 'not_configured' }, 503);
  }

  try {
    await generatePdf(env, new URL(request.url).origin, 'audit', id, key);
    // Deliberately no setAuditPdf. That property holds a
    // /portal/<slug>/files/<key> URL and a prospect has no slug, so
    // there is no honest value to write. The stored file is reached
    // through the share link, which is the only way a prospect was
    // ever going to open it.
    return hqJson({ ok: true, key, missing: loaded.input.missing });
  } catch (err) {
    console.error('hq: prospect audit pdf failed', id, err);
    return hqJson({ ok: false, error: 'render_failed', detail: reason(err) }, 502);
  }
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'POST') return next();
  return portalNotFound();
};
