/* ──────────────────────────────────────────────────────────────
   GET  /portal/hq/playbook-audit — the general Playbook Audit, as a
                                    PDF, for one of us.
   POST /portal/hq/playbook-audit — upload it, replacing the last.

   Admin only. The general audit is the one every client is shown
   unless they have one of their own. Clients read it through their
   own files route; this address is HQ's, because HQ has no client to
   borrow a files route from.
   ────────────────────────────────────────────────────────────── */

import { beginHq, hqJson, type HqEnv } from '../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../src/server/hq-data';
import { portalNotFound } from '../../../src/server/portal-auth';
import { isSameOrigin } from '../../../src/server/portal-write';
import {
  AUDIT_FILE, GENERAL_AUDIT_KEY, putGeneralAudit, readPdfUpload, type AuditEnv,
} from '../../../src/server/playbook-audit';

interface Env extends HqEnv, AuditEnv, HqDataEnv {}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  const object = await env.REPORTS_BUCKET?.get(GENERAL_AUDIT_KEY);
  if (!object) return portalNotFound();
  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${AUDIT_FILE}"`,
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  if (!isSameOrigin(request)) return portalNotFound();
  if (!env.REPORTS_BUCKET) return hqJson({ ok: false, error: 'not_configured' }, 503);
  const up = await readPdfUpload(request);
  if (!up.ok) return hqJson({ ok: false, error: up.error, detail: up.detail }, up.status);
  try {
    const audit = await putGeneralAudit(env, up.bytes);
    await dropHq(env);
    return hqJson({ ok: true, audit });
  } catch (err) {
    console.error('hq: storing the general playbook audit failed', err);
    return hqJson({ ok: false, error: 'store_failed', detail: err instanceof Error ? err.message : String(err) }, 502);
  }
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'POST') return next();
  return portalNotFound();
};
