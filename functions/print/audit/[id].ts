/* ──────────────────────────────────────────────────────────────
   GET /print/audit/<auditId> — one growth audit, as a page.

   Same guard as the report route. A prospect never reaches this URL:
   their link is /a/<token>, which serves the stored PDF and a web
   view of it, and which can be revoked. This route exists for the
   renderer and for Mason's preview.
   ────────────────────────────────────────────────────────────── */

import { storedCoverUrl, type CoverEnv } from '../../../src/server/cover';
import { renderAudit } from '../../../src/server/print-audit';
import { loadAudit } from '../../../src/server/audit-data';
import { allowPrint, printResponse, type PrintEnv } from '../../../src/server/print-route';
import { printSecret } from '../../../src/server/print-token';
import { portalNotFound } from '../../../src/server/portal-auth';

interface Env extends PrintEnv, CoverEnv {}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const gate = await allowPrint(request, env, 'audit', params.id);
  if (!gate.ok) return gate.response;

  try {
    const loaded = await loadAudit(env.NOTION_TOKEN, gate.id);
    if (!loaded) return portalNotFound();

    // Only a client audit reaches the Drive folder. A prospect
    // teardown keeps the Hero Photo the loader found, or the grid: the
    // folder belongs to a client relationship that does not exist yet.
    const cover = loaded.input.audience === 'Client'
      ? await storedCoverUrl(env, printSecret(env), loaded.slug)
      : null;
    const input = cover ? { ...loaded.input, coverImage: cover } : loaded.input;

    return printResponse(renderAudit(input));
  } catch (err) {
    console.error('print: audit render failed', gate.id, err);
    return portalNotFound();
  }
};
