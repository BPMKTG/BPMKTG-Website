/* ──────────────────────────────────────────────────────────────
   GET /print/audit/<auditId> — one growth audit, as a page.

   Same guard as the report route. A prospect never reaches this URL:
   their link is /a/<token>, which serves the stored PDF and a web
   view of it, and which can be revoked. This route exists for the
   renderer and for Mason's preview.
   ────────────────────────────────────────────────────────────── */

import { renderAudit } from '../../../src/server/print-audit';
import { loadAudit } from '../../../src/server/audit-data';
import { allowPrint, printResponse, type PrintEnv } from '../../../src/server/print-route';
import { portalNotFound } from '../../../src/server/portal-auth';

export const onRequestGet: PagesFunction<PrintEnv> = async ({ request, env, params }) => {
  const gate = await allowPrint(request, env, 'audit', params.id);
  if (!gate.ok) return gate.response;

  try {
    const loaded = await loadAudit(env.NOTION_TOKEN, gate.id);
    if (!loaded) return portalNotFound();
    return printResponse(renderAudit(loaded.input));
  } catch (err) {
    console.error('print: audit render failed', gate.id, err);
    return portalNotFound();
  }
};
