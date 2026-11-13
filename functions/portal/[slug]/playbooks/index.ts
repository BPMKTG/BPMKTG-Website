/* ──────────────────────────────────────────────────────────────
   GET /portal/<slug>/playbooks — the playbooks as this client gets
   them, and the changes they have asked for.

   Requires this client's session, or an admin's. Read-only.

   What is sent is built field by field in clientPlaybooks: a title,
   which day, who does it, where and why. Our Notes on a step are not
   in it, and neither is any override we have drafted and not approved.
   Their approved changes are already applied, so the timeline they
   read is the plan they will actually get.
   ────────────────────────────────────────────────────────────── */

import {
  isValidSlug, normaliseSlug, portalNotFound, readViewer, sessionSecret,
} from '../../../../src/server/portal-auth';
import { findClientBySlug } from '../../../../src/server/portal-notion';
import { fetchMasters, fetchOverrides } from '../../../../src/server/playbooks';
import { clientPlaybooks, clientRequests } from '../../../../src/data/playbooks';

interface Env { NOTION_TOKEN: string; PORTAL_SECRET?: string }

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.NOTION_TOKEN) return portalNotFound();
  const slug = normaliseSlug(params.slug as string);
  if (!isValidSlug(slug)) return portalNotFound();
  const viewer = await readViewer(request, sessionSecret(env), slug);
  if (!viewer) return portalNotFound();
  const record = await findClientBySlug(env.NOTION_TOKEN, slug);
  if (!record || !record.portalEnabled) return portalNotFound();

  try {
    const [masters, overrides] = await Promise.all([
      fetchMasters(env.NOTION_TOKEN), fetchOverrides(env.NOTION_TOKEN, record.pageId),
    ]);
    return new Response(JSON.stringify({
      ok: true,
      playbooks: clientPlaybooks(masters, overrides, record.pageId),
      requests: clientRequests(masters, overrides, record.pageId),
    }), { status: 200, headers: {
      'Content-Type': 'application/json', 'Cache-Control': 'no-store, private',
      'X-Robots-Tag': 'noindex, nofollow, noarchive', 'Referrer-Policy': 'no-referrer',
    } });
  } catch (err) {
    console.error('portal: reading playbooks threw', slug, err);
    return portalNotFound();
  }
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET') return next();
  return portalNotFound();
};
