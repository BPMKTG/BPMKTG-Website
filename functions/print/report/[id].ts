/* ──────────────────────────────────────────────────────────────
   GET /print/report/<snapshotId> — one monthly report, as a page.

   Never public: see src/server/print-route.ts for exactly how wide
   the hole is. This file is the plumbing.

   The same URL serves Browser Rendering (which captures it as a PDF)
   and Mason's own browser (which shows it on a grey field with
   shadows, from the @media screen block in print-css.ts). One
   document, one code path, so a PDF cannot drift from the preview it
   was approved in.
   ────────────────────────────────────────────────────────────── */

import { storedCoverUrl, type CoverEnv } from '../../../src/server/cover';
import { renderReport } from '../../../src/server/print-report';
import { loadReport } from '../../../src/server/report-data';
import { allowPrint, printResponse, type PrintEnv } from '../../../src/server/print-route';
import { printSecret } from '../../../src/server/print-token';
import { portalNotFound } from '../../../src/server/portal-auth';

interface Env extends PrintEnv, CoverEnv {}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const gate = await allowPrint(request, env, 'report', params.id);
  if (!gate.ok) return gate.response;

  try {
    const loaded = await loadReport(env.NOTION_TOKEN, gate.id);
    if (!loaded) return portalNotFound();

    // The Drive cover, if an admin has resolved one. It wins over the
    // Hero Photo the loader put there, which stays as the fallback.
    const cover = await storedCoverUrl(env, printSecret(env), loaded.client.slug);
    const input = cover ? { ...loaded.input, heroImage: cover } : loaded.input;

    return printResponse(renderReport(input));
  } catch (err) {
    // Logged with the id, answered without it. A 500 that quoted the
    // Notion error would echo row content into a browser.
    console.error('print: report render failed', gate.id, err);
    return portalNotFound();
  }
};
