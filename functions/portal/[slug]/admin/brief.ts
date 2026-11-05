/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/admin/brief — upload the brand brief.

   Admin only, same-origin only. The body is the PDF itself rather
   than a multipart form: there is exactly one file and no fields, so
   a form boundary would be ceremony around a single value.

   Replace is the only mode. One client, one brief, one key, and the
   new bytes land on top of the old ones. See src/server/brief.ts.

   What a client gets out of this is handled somewhere else entirely:
   the brief is read back through /portal/<slug>/files/<key> like
   every other PDF, behind the session check that already lives there.
   This endpoint writes and says what it wrote.
   ────────────────────────────────────────────────────────────── */

import {
  adminJson,
  beginAdminClient,
  reason,
  type AdminEnv,
} from '../../../../src/server/admin-guard';
import {
  MAX_BRIEF_BYTES,
  looksLikePdf,
  putBrief,
  type BriefEnv,
} from '../../../../src/server/brief';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';

interface Env extends AdminEnv, BriefEnv {}

/** The size cap as a sentence, because "too big" is not actionable. */
const tooBig = (bytes: number) =>
  `That file is ${(bytes / 1024 / 1024).toFixed(1)}MB and the limit is `
  + `${MAX_BRIEF_BYTES / 1024 / 1024}MB. Export it again at a smaller size.`;

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  const gate = await beginAdminClient(request, env, params.slug, { write: true });
  if (!gate.ok) return gate.response;
  const { ctx } = gate;

  if (!env.REPORTS_BUCKET) {
    console.error('portal: REPORTS_BUCKET is not bound, no brief can be stored');
    return adminJson({ ok: false, error: 'not_configured' }, 503);
  }

  // The declared length first, so an oversized upload is refused
  // before its bytes are pulled into the Worker.
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_BRIEF_BYTES) {
    return adminJson({ ok: false, error: 'too_big', detail: tooBig(declared) }, 413);
  }

  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch (err) {
    console.error('portal: reading the brief upload threw', ctx.slug, err);
    return adminJson({ ok: false, error: 'unreadable', detail: reason(err) }, 400);
  }

  // And again on what actually arrived: Content-Length is the
  // uploader's claim, not a measurement.
  if (bytes.byteLength > MAX_BRIEF_BYTES) {
    return adminJson({ ok: false, error: 'too_big', detail: tooBig(bytes.byteLength) }, 413);
  }
  if (!bytes.byteLength) {
    return adminJson({ ok: false, error: 'empty', detail: 'That file was empty.' }, 400);
  }
  // Stored under a key we serve as application/pdf, so the bytes have
  // to agree. A .pdf extension is a filename, not evidence.
  if (!looksLikePdf(bytes)) {
    return adminJson(
      { ok: false, error: 'not_pdf', detail: 'That is not a PDF. The brief has to be one.' },
      400,
    );
  }

  try {
    const brief = await putBrief(env, ctx.record.slug, bytes);
    // The payload is cached for a minute and the brief rides in it,
    // so without this the client's own portal would keep saying there
    // is nothing there for up to a minute after it arrived.
    await dropPortalData(ctx.record.slug);
    return adminJson({ ok: true, brief });
  } catch (err) {
    console.error('portal: storing the brand brief failed', ctx.slug, err);
    return adminJson({ ok: false, error: 'store_failed', detail: reason(err) }, 502);
  }
};

/** Anything else here is not a thing. Same 404 as the rest. */
export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
