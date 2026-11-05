/* ──────────────────────────────────────────────────────────────
   GET /a/<token> — a prospect's audit, by private link.

   The only route in the portal that serves a document to somebody
   with no account. What makes that safe is not the URL being long: it
   is that the link is a stored record (src/server/share-link.ts) and
   can be revoked, and that the record is the only place the audit id
   lives. The token says nothing about whose audit it opens.

     /a/<token>          the audit as a web page
     /a/<token>?pdf=1    the stored PDF

   The web page is rendered from the same templates as the PDF, so a
   prospect reading it in a browser and a prospect opening the
   attachment see one document. It is rendered live rather than served
   from R2 so that a correction Mason makes in Notion shows up on the
   link, which is the difference between a share link and a file.

   An expired or revoked token, a malformed one, and a token for an
   audit that has since been deleted all answer the same 404.
   ────────────────────────────────────────────────────────────── */

import { loadAudit } from '../../src/server/audit-data';
import { renderAudit } from '../../src/server/print-audit';
import { printResponse } from '../../src/server/print-route';
import { portalNotFound } from '../../src/server/portal-auth';
import { fileSlug } from '../../src/server/pdf';
import { readShareLink, type ShareStore } from '../../src/server/share-link';

interface Env {
  NOTION_TOKEN: string;
  PORTAL_KV?: ShareStore;
  REPORTS_BUCKET?: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.NOTION_TOKEN) {
    console.error("share: NOTION_TOKEN isn't set");
    return portalNotFound();
  }
  if (!env.PORTAL_KV) {
    console.error('share: PORTAL_KV is not bound, share links cannot be read');
    return portalNotFound();
  }

  const record = await readShareLink(env.PORTAL_KV, String(params.token ?? ''));
  if (!record) return portalNotFound();

  const url = new URL(request.url);
  if (url.searchParams.get('pdf')) {
    if (!env.REPORTS_BUCKET) {
      console.error('share: REPORTS_BUCKET is not bound');
      return portalNotFound();
    }
    const object = await env.REPORTS_BUCKET.get(record.key);
    if (!object) return portalNotFound();
    return new Response(object.body, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${fileSlug(record.subject)}-growth-audit.pdf"`,
        // The link is the permission and the link can be revoked, so
        // nothing about this response may be cached anywhere shared.
        'Cache-Control': 'no-store, private',
        'X-Robots-Tag': 'noindex, nofollow, noarchive',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  try {
    const loaded = await loadAudit(env.NOTION_TOKEN, record.auditId);
    if (!loaded) return portalNotFound();
    return printResponse(renderAudit(loaded.input));
  } catch (err) {
    console.error('share: audit render failed', record.auditId, err);
    return portalNotFound();
  }
};
