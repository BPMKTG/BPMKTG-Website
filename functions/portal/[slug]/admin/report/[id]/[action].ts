/* ──────────────────────────────────────────────────────────────
   Admin actions on one monthly report.

     GET  …/admin/report/<id>/preview   redirect to the print route
     POST …/admin/report/<id>/pdf       regenerate the PDF only
     POST …/admin/report/<id>/publish   PDF, Notion, portal, email

   Admin only. The guard in src/server/admin-guard.ts is the whole
   permission check; nothing below re-derives it.

   Publish is the only action here with a side effect a client sees,
   and the order it does things in is deliberate:

     1  resolve the cover photo       Drive, read once, into R2
     2  render and store the PDF      nothing is announced that does not exist
     3  flip the Notion row           the portal now shows it
     4  send the email                last, because it cannot be undone

   Step one cannot fail the action. A cover is decoration; a report is
   the deliverable. Whatever goes wrong in Drive, `refreshCover` comes
   back with a source and the render carries on. See src/server/cover.ts.

   A failure at step 1 changes nothing. A failure at step 2 leaves a
   PDF in R2 that nobody is pointed at, which costs a few hundred
   kilobytes and is otherwise invisible. The email is last because it
   is the only step that reaches a person, and sending it before the
   portal could show the report is how you get a client clicking a
   button that is not there yet.
   ────────────────────────────────────────────────────────────── */

import { monthLabel } from '../../../../../../src/data/print';
import { adminJson, beginAdmin, reason, type AdminEnv } from '../../../../../../src/server/admin-guard';
import { refreshCover } from '../../../../../../src/server/cover';
import { portalNotFound } from '../../../../../../src/server/portal-auth';
import { loadReport } from '../../../../../../src/server/report-data';
import { publishSnapshot, setSnapshotPdf } from '../../../../../../src/server/report-publish';
import { mintPrintToken, printSecret } from '../../../../../../src/server/print-token';
import {
  canRender,
  generatePdf,
  renderPdf,
  putPdf,
  reportKey,
  type PdfEnv,
} from '../../../../../../src/server/pdf';
import {
  sendReportMail,
  type ReportMailEnv,
} from '../../../../../../src/server/report-mail';

interface Env extends AdminEnv, PdfEnv, ReportMailEnv {
  /** The Drive service account, for the cover photo. Optional: a
   *  deployment without it falls back to the Hero Photo. */
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
}

/** Where the client finds it. The hash is the portal's own router. */
const reportsTab = (origin: string, slug: string) => `${origin}/portal/${slug}#/reports`;

/** The URL stored in Notion and shown in the portal. Our endpoint, not
 *  R2's: the session check lives there. */
const fileUrl = (origin: string, slug: string, key: string) =>
  `${origin}/portal/${slug}/files/${key}`;

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  if (params.action !== 'preview') return portalNotFound();

  const gate = await beginAdmin(request, env, params.slug, params.id);
  if (!gate.ok) return gate.response;

  // A redirect rather than a rendered page, because `bp_admin` has
  // Path=/portal and does not reach /print. This endpoint is inside
  // that path, so the cookie arrives here, and it hands over a signed
  // token that works for ten minutes.
  const token = await mintPrintToken(printSecret(env), 'report', gate.ctx.id);
  const to = `/print/report/${gate.ctx.id}?t=${encodeURIComponent(token)}`;
  return new Response(null, {
    status: 302,
    headers: { Location: to, 'Cache-Control': 'no-store' },
  });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const action = params.action;
  if (action !== 'pdf' && action !== 'publish') return portalNotFound();

  const gate = await beginAdmin(request, env, params.slug, params.id, { write: true });
  if (!gate.ok) return gate.response;
  const { ctx } = gate;

  if (!canRender(env) || !env.REPORTS_BUCKET) {
    console.error('portal: browser rendering credentials or REPORTS_BUCKET missing');
    return adminJson({ ok: false, error: 'not_configured' }, 503);
  }

  const loaded = await loadReport(env.NOTION_TOKEN, ctx.id);
  if (!loaded) return portalNotFound();
  // The snapshot has to belong to the client in the URL. Without this
  // an admin action on one portal could publish another client's row,
  // which would then be served from the wrong prefix.
  if (loaded.client.pageId.replace(/-/g, '') !== ctx.record.pageId.replace(/-/g, '')) {
    console.error('portal: snapshot does not belong to this client', ctx.id, ctx.slug);
    return portalNotFound();
  }

  const key = reportKey(ctx.record.slug, loaded.input.snapshot.date);
  const url = fileUrl(ctx.origin, ctx.record.slug, key);

  // Before the render, so the print route reads a copy that matches
  // what Drive holds right now. Never throws.
  const cover = await refreshCover(env, printSecret(env), ctx.record.slug, ctx.record.pageId);

  try {
    if (action === 'pdf') {
      await generatePdf(env, ctx.origin, 'report', ctx.id, key);
      // Keep the stored URL in step with the file we just wrote, so a
      // regenerate after a slug change does not leave a dead link.
      await setSnapshotPdf(env.NOTION_TOKEN, ctx.id, url, ctx.viewer.role);
      return adminJson({ ok: true, key, url, cover });
    }

    // Publish. The bytes are kept so the email can attach the very
    // file the client will download, rather than fetching it back out
    // of R2 and hoping they match.
    const pdf = await renderPdf(env, ctx.origin, 'report', ctx.id);
    await putPdf(env, key, pdf);

    const written = await publishSnapshot(env.NOTION_TOKEN, ctx.id, url, ctx.viewer.role);
    if (!written) return adminJson({ ok: false, error: 'notion_write_failed' }, 502);

    const month = monthLabel(loaded.input.snapshot.date);
    const mail = await sendReportMail(env, {
      snapshotId: ctx.id,
      to: ctx.record.portalEmails,
      artist: ctx.record.client.artist,
      monthIso: loaded.input.snapshot.date,
      win: loaded.input.snapshot.win,
      portalUrl: reportsTab(ctx.origin, ctx.record.slug),
      pdf,
      filename: `${ctx.record.slug}-${month ? month.toLowerCase().replace(/\s+/g, '-') : 'report'}.pdf`,
    });

    return adminJson({ ok: true, key, url, mail, cover });
  } catch (err) {
    console.error('portal: report action failed', action, ctx.id, err);
    // The reason travels back to the panel. Everything that reaches
    // here is admin-only and the renderer redacts the signed token
    // from its own message, so this tells Mason what broke rather
    // than making him go and find a log stream.
    return adminJson({ ok: false, error: 'render_failed', detail: reason(err) }, 502);
  }
};
