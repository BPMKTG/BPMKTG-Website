/* ──────────────────────────────────────────────────────────────
   GET /portal/<slug>/admin/cover — which photo the reports will use.

   Admin only, and read-only. A client has one Report Covers folder in
   Drive and every document reads it, so this is a property of the
   client rather than of a month, which is why it is not an action on a
   snapshot id.

   Nothing here calls Google. Opening the publishing panel should cost
   one Notion read and one R2 read, not a round trip to an OAuth
   endpoint; the Drive lookup happens when Mason presses Publish or
   Regenerate and is written down for this endpoint to report.
   ────────────────────────────────────────────────────────────── */

import { adminJson, beginAdminClient, type AdminEnv } from '../../../../src/server/admin-guard';
import { coverStatus, type CoverEnv } from '../../../../src/server/cover';
import { printSecret } from '../../../../src/server/print-token';

interface Env extends AdminEnv, CoverEnv {
  PRINT_SIGNING_SECRET?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const gate = await beginAdminClient(request, env, params.slug);
  if (!gate.ok) return gate.response;

  const cover = await coverStatus(
    env,
    printSecret(env),
    gate.ctx.record.slug,
    gate.ctx.record.pageId,
  );
  return adminJson({ ok: true, cover });
};
