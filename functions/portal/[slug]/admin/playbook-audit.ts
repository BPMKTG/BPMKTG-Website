/* ──────────────────────────────────────────────────────────────
   POST   /portal/<slug>/admin/playbook-audit — upload this client's
                                               own Playbook Audit.
   DELETE /portal/<slug>/admin/playbook-audit — take it away, so they
                                               read the general one.

   Admin only, same-origin only. The body of a POST is the PDF itself.
   Replace is the only mode: one client, one audit, one key.

   Two writes: the bytes into R2, then the Clients row's `Playbook
   Audit` pointed at them. The pointer is what says the client has an
   audit of their own, so an upload whose pointer did not land is said
   out loud rather than called a success.

   What a client reads comes back through /portal/<slug>/files/<key>
   with every other PDF, behind the session check that lives there.
   ────────────────────────────────────────────────────────────── */

import { adminJson, beginAdminClient, reason, type AdminEnv } from '../../../../src/server/admin-guard';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import { patchPage } from '../../../../src/server/portal-notion';
import { stampEdit } from '../../../../src/server/portal-write';
import {
  SITE_ORIGIN, clientAuditUrl, deleteClientAudit, putClientAudit, readPdfUpload, type AuditEnv,
} from '../../../../src/server/playbook-audit';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';

interface Env extends AdminEnv, AuditEnv, HqDataEnv {}

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const gate = await beginAdminClient(request, env, params.slug, { write: true });
  if (!gate.ok) return gate.response;
  const { ctx } = gate;
  if (!env.REPORTS_BUCKET) return adminJson({ ok: false, error: 'not_configured' }, 503);

  const up = await readPdfUpload(request);
  if (!up.ok) return adminJson({ ok: false, error: up.error, detail: up.detail }, up.status);
  try {
    const audit = await putClientAudit(env, ctx.record.slug, up.bytes);
    // The whole address, so it is a link somebody can click in Notion.
    // It still opens only for a session that is allowed to read it.
    const pointed = await patchPage(env.NOTION_TOKEN, ctx.record.pageId,
      stampEdit({ 'Playbook Audit': { url: `${SITE_ORIGIN}${clientAuditUrl(ctx.record.slug)}` } }, 'admin'),
      'playbook audit');
    await Promise.all([dropPortalData(ctx.record.slug), dropHq(env)]);
    return adminJson({
      ok: true, audit,
      warning: pointed ? undefined
        : 'The PDF is stored, but the Playbook Audit column in Notion did not update, '
          + 'so this client is still shown the general audit.',
    });
  } catch (err) {
    console.error('portal: storing a playbook audit failed', ctx.slug, err);
    return adminJson({ ok: false, error: 'store_failed', detail: reason(err) }, 502);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  const gate = await beginAdminClient(request, env, params.slug, { write: true });
  if (!gate.ok) return gate.response;
  const { ctx } = gate;
  // The pointer first: once it is gone the client reads the general
  // audit, whether or not the old file is still in the bucket.
  const cleared = await patchPage(env.NOTION_TOKEN, ctx.record.pageId,
    stampEdit({ 'Playbook Audit': { url: null } }, 'admin'), 'playbook audit');
  if (!cleared) return adminJson({ ok: false, error: 'write_failed', detail: 'Notion did not take the change.' }, 502);
  try { await deleteClientAudit(env, ctx.record.slug); } catch (err) {
    console.error('portal: removing a playbook audit file failed', ctx.slug, err);
  }
  await Promise.all([dropPortalData(ctx.record.slug), dropHq(env)]);
  return adminJson({ ok: true, removed: true });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST' || request.method === 'DELETE') return next();
  return portalNotFound();
};
