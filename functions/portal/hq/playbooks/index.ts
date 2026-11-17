/* ──────────────────────────────────────────────────────────────
   GET /portal/hq/playbooks — every master step and every override.

   Admin only. Not part of /portal/hq/data on purpose: the playbooks
   are a hundred rows that change a few times a year, and adding them
   to the payload every tab waits on would slow all of HQ down for the
   sake of one tab.
   ────────────────────────────────────────────────────────────── */

import { beginHq, hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { portalNotFound } from '../../../../src/server/portal-auth';
import { fetchMasters, fetchOverrides } from '../../../../src/server/playbooks';
import { readAuditRoster, readGeneralAudit, type AuditEnv } from '../../../../src/server/playbook-audit';

interface Env extends HqEnv, AuditEnv {}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  try {
    const [masters, overrides, general, roster] = await Promise.all([
      fetchMasters(env.NOTION_TOKEN), fetchOverrides(env.NOTION_TOKEN),
      // The Playbook Audit: the general one, and who has their own.
      readGeneralAudit(env), readAuditRoster(env.NOTION_TOKEN, env),
    ]);
    return hqJson({ ok: true, masters, overrides, audit: { general, clients: roster } });
  } catch (err) {
    console.error('hq: reading the playbooks threw', err);
    return hqJson({ ok: false, error: 'read_failed' }, 502);
  }
};

export const onRequest: PagesFunction<HqEnv> = async ({ request, next }) => {
  if (request.method === 'GET') return next();
  return portalNotFound();
};
