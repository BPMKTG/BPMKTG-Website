/* ──────────────────────────────────────────────────────────────
   Admin actions on one growth audit.

     GET  …/admin/audit/<id>/preview   redirect to the print route
     POST …/admin/audit/<id>/pdf       generate or regenerate the PDF
     POST …/admin/audit/<id>/share     mint a share link  { days? }
     POST …/admin/audit/<id>/revoke    kill the share link

   Admin only, through the same guard as the report actions.

   Audits are generated on demand rather than on publish, because an
   audit is not a monthly cadence: Mason writes one, reads the PDF,
   edits the Notion page, and generates again. Nothing is emailed from
   here. A client audit appears in their portal when Published is
   ticked in Notion; a prospect audit reaches them as a share link,
   which is the only thing on this route that creates a URL somebody
   outside Blueprint can open.

   The audit's own client relation decides which portal it lives
   under, and this endpoint refuses an audit belonging to a different
   client than the slug in the URL. A prospect audit has no client, so
   it is reachable from any portal Mason has open, which is correct:
   it is not anybody's.
   ────────────────────────────────────────────────────────────── */

import { loadAudit } from '../../../../../../src/server/audit-data';
import { adminJson, beginAdmin, reason, type AdminEnv } from '../../../../../../src/server/admin-guard';
import { refreshCover } from '../../../../../../src/server/cover';
import { portalNotFound } from '../../../../../../src/server/portal-auth';
import { setAuditPdf, setAuditShareLink } from '../../../../../../src/server/report-publish';
import { mintPrintToken, printSecret } from '../../../../../../src/server/print-token';
import { readJsonBody } from '../../../../../../src/server/portal-write';
import {
  auditKey,
  canRender,
  generatePdf,
  type PdfEnv,
} from '../../../../../../src/server/pdf';
import {
  DEFAULT_SHARE_DAYS,
  createShareLink,
  revokeShareLink,
  tokenFromShareUrl,
  type ShareStore,
} from '../../../../../../src/server/share-link';

interface Env extends AdminEnv, PdfEnv {
  PORTAL_KV?: ShareStore;
  /** The Drive service account, for a client audit's cover photo. */
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
}

const fileUrl = (origin: string, slug: string, key: string) =>
  `${origin}/portal/${slug}/files/${key}`;

/** How long a share link lives. `0` means no expiry; anything else is
 *  clamped to a year so a typo cannot mint something permanent. */
function shareDays(body: Record<string, unknown> | null): number | null {
  const raw = body?.days;
  if (raw === 0 || raw === '0') return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_SHARE_DAYS;
  return Math.min(365, Math.round(n));
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  if (params.action !== 'preview') return portalNotFound();

  const gate = await beginAdmin(request, env, params.slug, params.id);
  if (!gate.ok) return gate.response;

  const token = await mintPrintToken(printSecret(env), 'audit', gate.ctx.id);
  const to = `/print/audit/${gate.ctx.id}?t=${encodeURIComponent(token)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: to, 'Cache-Control': 'no-store' },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const action = params.action;
  if (action !== 'pdf' && action !== 'share' && action !== 'revoke') return portalNotFound();

  const gate = await beginAdmin(request, env, params.slug, params.id, { write: true });
  if (!gate.ok) return gate.response;
  const { ctx } = gate;

  const loaded = await loadAudit(env.NOTION_TOKEN, ctx.id);
  if (!loaded) return portalNotFound();

  // A client audit belongs to exactly one portal. A prospect audit
  // belongs to none, so there is nothing to compare and any portal
  // will do.
  if (loaded.row.clientId
    && loaded.row.clientId.replace(/-/g, '') !== ctx.record.pageId.replace(/-/g, '')) {
    console.error('portal: audit does not belong to this client', ctx.id, ctx.slug);
    return portalNotFound();
  }

  // Keyed by the subject, not by the slug, so a prospect teardown gets
  // its own folder rather than landing under whichever portal Mason
  // happened to have open.
  const key = auditKey(loaded.slug ?? loaded.input.subject, ctx.id);
  const url = fileUrl(ctx.origin, ctx.record.slug, key);

  if (action === 'revoke') {
    if (!env.PORTAL_KV) {
      console.error('portal: PORTAL_KV is not bound, a share link cannot be revoked');
      return adminJson({ ok: false, error: 'not_configured' }, 503);
    }
    const token = tokenFromShareUrl(loaded.row.shareLink);
    if (token) await revokeShareLink(env.PORTAL_KV, token);
    await setAuditShareLink(env.NOTION_TOKEN, ctx.id, null);
    return adminJson({ ok: true, revoked: Boolean(token) });
  }

  if (action === 'share') {
    if (!env.PORTAL_KV) {
      console.error('portal: PORTAL_KV is not bound, no share link can be minted');
      return adminJson({ ok: false, error: 'not_configured' }, 503);
    }
    // The PDF has to exist before a link to it does. A share link that
    // 404s is worse than no share link, because it has already been
    // sent by the time anyone finds out.
    const stored = await env.REPORTS_BUCKET?.head(key);
    if (!stored) return adminJson({ ok: false, error: 'no_pdf_yet' }, 409);

    // One live link per audit: minting a second revokes the first, so
    // "send them a new link" also means the old one stops working.
    const previous = tokenFromShareUrl(loaded.row.shareLink);
    if (previous) await revokeShareLink(env.PORTAL_KV, previous);

    const { token, expiresAt } = await createShareLink(
      env.PORTAL_KV,
      { auditId: ctx.id, key, subject: loaded.input.subject },
      shareDays(await readJsonBody(request)),
    );
    const shareUrl = `${ctx.origin}/a/${token}`;
    await setAuditShareLink(env.NOTION_TOKEN, ctx.id, shareUrl);
    return adminJson({ ok: true, url: shareUrl, expiresAt });
  }

  if (!canRender(env) || !env.REPORTS_BUCKET) {
    console.error('portal: browser rendering credentials or REPORTS_BUCKET missing');
    return adminJson({ ok: false, error: 'not_configured' }, 503);
  }

  // Only a client audit has a Drive folder behind it. A prospect
  // teardown is nobody's client yet, so its cover is the Hero Photo if
  // the row happens to point at a client, and the grid otherwise.
  const cover = loaded.input.audience === 'Client'
    ? await refreshCover(env, printSecret(env), ctx.record.slug, ctx.record.pageId)
    : null;

  try {
    await generatePdf(env, ctx.origin, 'audit', ctx.id, key);
    await setAuditPdf(env.NOTION_TOKEN, ctx.id, url);
    return adminJson({ ok: true, key, url, missing: loaded.input.missing, cover });
  } catch (err) {
    console.error('portal: audit pdf failed', ctx.id, err);
    return adminJson({ ok: false, error: 'render_failed', detail: reason(err) }, 502);
  }
};
