/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/client — quick add a lead.

   Admin only, through the same gate as the rest of HQ, and the only
   route in this codebase that creates a Clients row.

   What it may set is a short list in hq-write.ts: the artist's name,
   a lead source, a next action and its date, and Stage = Lead. It
   cannot set Portal Key, Portal Emails or Portal Enabled, which is
   the point. A create path that could write those is a create path
   that could hand somebody a working portal, and portal access stays
   a deliberate act in Notion.
   ────────────────────────────────────────────────────────────── */

import { beginHq, hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { buildNewLead } from '../../../../src/server/hq-write';
import { portalNotFound } from '../../../../src/server/portal-auth';
import { CLIENTS_DB, notionHeaders } from '../../../../src/server/portal-notion';
import { isJsonRequest, isSameOrigin, readJsonBody, stampEdit } from '../../../../src/server/portal-write';

interface Env extends HqEnv, HqDataEnv {}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  if (!isSameOrigin(request) || !isJsonRequest(request)) return portalNotFound();

  const body = await readJsonBody(request);
  if (!body) return portalNotFound();

  const { properties, error } = buildNewLead(body);
  if (!properties) return hqJson({ ok: false, error }, 400);

  let created: any;
  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders(env.NOTION_TOKEN),
      body: JSON.stringify({
        parent: { database_id: CLIENTS_DB },
        properties: stampEdit(properties, 'admin'),
      }),
    });
    if (!res.ok) {
      console.error('hq: lead create failed', res.status, await res.text());
      return hqJson({ ok: false, error: 'create_failed' }, 502);
    }
    created = await res.json();
  } catch (err) {
    console.error('hq: lead create threw', err);
    return hqJson({ ok: false, error: 'create_failed' }, 502);
  }

  await dropHq(env);
  return hqJson({ ok: true, id: String(created?.id ?? '') });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
