/* ──────────────────────────────────────────────────────────────
   HTML to PDF, and PDF into R2.

   SERVER ONLY.

   Browser Rendering drives a real Chrome against our own print route
   and captures it. That is a deliberate choice over building the PDF
   by hand: the document is already a web page, it is designed as one,
   and a client who opens the share link and a client who downloads
   the PDF should be looking at the same thing.

   Three things make the capture deterministic:

     the signed token      the renderer can reach the route at all
     data-print-ready      the fonts are applied and the images decoded
     preferCSSPageSize     the page's own 816x1056 is the paper size

   Without the second one `networkidle` fires between "the font
   downloaded" and "the font is in use", and you get a PDF set in
   Times roughly one time in ten. Which is the worst possible rate,
   because it passes every time you check it.

   ── why the REST API and not the BROWSER binding ──

   Pages Functions support only a subset of Workers bindings, and
   Browser Rendering is not in it. There is no `BROWSER` to bind on a
   Pages project, so the binding version of this file could never have
   run here however the dashboard was configured.

   The REST API does the same job over HTTP with an API token, and
   costs us the one thing a binding gives for free: a credential to
   store. In exchange it drops @cloudflare/puppeteer, which was ten
   megabytes of dependency that imported `node:buffer` and therefore
   needed the nodejs_compat flag set on the project before anything in
   functions/ would deploy at all.
   ────────────────────────────────────────────────────────────── */

import { monthKey } from '../data/print';
import { mintPrintToken, printSecret, type PrintKind } from './print-token';

/** How long to wait for the page to say it is ready. A cold Browser
 *  Rendering session plus a 6-page layout is a few seconds; the page's
 *  own fallback fires at 8. */
const READY_TIMEOUT_MS = 20_000;

/** The navigation itself. Separate from the readiness wait, because a
 *  slow origin and a page that never signals ready are different
 *  faults and the logs should be able to tell them apart. */
const GOTO_TIMEOUT_MS = 30_000;

/**
 * The API path, new name first.
 *
 * Cloudflare renamed Browser Rendering to Browser Run and moved the
 * endpoint with it. The product docs give `browser-run`; the API
 * reference still prints `browser-rendering`. One of them is a legacy
 * alias and there is no way to tell which from the outside, so this
 * tries the current name and falls back once on a 404.
 *
 * Only on a 404. A 401 is a bad token and a 400 is a bad body, and
 * retrying either against the other path turns one clear error in the
 * log into two confusing ones.
 */
const API_PATHS = ['browser-run', 'browser-rendering'] as const;

export interface PdfEnv {
  REPORTS_BUCKET: R2Bucket;
  /** The Cloudflare account the Browser Rendering call is billed to. */
  CF_ACCOUNT_ID?: string;
  /** An API token with Browser Rendering Write, and nothing else. */
  CF_BROWSER_TOKEN?: string;
  PRINT_SIGNING_SECRET?: string;
  PORTAL_SECRET?: string;
  NOTION_TOKEN: string;
}

/** Is this deployment able to render at all? The admin endpoints ask
 *  before they start, so a missing credential is a clean 503 rather
 *  than a failure halfway through a publish. */
export function canRender(env: PdfEnv): boolean {
  return Boolean(env.CF_ACCOUNT_ID && env.CF_BROWSER_TOKEN);
}

/**
 * A path segment safe to put in an R2 key.
 *
 * Prospect names come off a form and go straight into a key, so this
 * has to be strict rather than tidy: letters, digits and single
 * hyphens, nothing else. An empty result becomes "unnamed" rather than
 * an empty segment, which would collapse two slashes and change the
 * shape of the key.
 */
export function fileSlug(raw: string | null | undefined): string {
  const s = (raw ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
  return s || 'unnamed';
}

/** `reports/sean-comma/2026-11-kpi-report.pdf` */
export function reportKey(slug: string, monthIso: string | null): string {
  return `reports/${fileSlug(slug)}/${monthKey(monthIso) || 'undated'}-kpi-report.pdf`;
}

/** `audits/sean-comma/<auditId>.pdf`. The id rather than the date,
 *  because two audits in one month is normal and overwriting the first
 *  with the second is not. */
export function auditKey(subject: string, auditId: string): string {
  return `audits/${fileSlug(subject)}/${fileSlug(auditId)}.pdf`;
}

/**
 * Renders one print route and returns the PDF bytes.
 *
 * `origin` is this deployment's own origin, taken from the incoming
 * request, so a preview branch renders its own print route rather than
 * production's.
 */
export async function renderPdf(
  env: PdfEnv,
  origin: string,
  kind: PrintKind,
  id: string,
): Promise<Uint8Array> {
  if (!canRender(env)) {
    throw new Error('browser rendering is not configured');
  }

  const token = await mintPrintToken(printSecret(env), kind, id);
  const url = `${origin}/print/${kind}/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;

  const body = JSON.stringify({
    url,
    // The viewport is the sheet. A narrower one makes the media
    // queries and the grid resolve against the wrong width before
    // print styles apply, which shows up as clipped cards.
    viewport: { width: 816, height: 1056, deviceScaleFactor: 2 },
    gotoOptions: { waitUntil: 'networkidle0', timeout: GOTO_TIMEOUT_MS },
    // The whole reason the template sets this attribute. See above.
    waitForSelector: { selector: 'html[data-print-ready="1"]', timeout: READY_TIMEOUT_MS },
    pdfOptions: {
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
    },
  });

  let res: Response | null = null;
  for (const path of API_PATHS) {
    res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/${path}/pdf`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.CF_BROWSER_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body,
      },
    );
    if (res.status !== 404) break;
    console.warn(`pdf: ${path}/pdf answered 404, trying the other spelling`);
  }

  if (!res || !res.ok) {
    // Cloudflare's JSON error names the real cause: a token without
    // Browser Run Edit, an origin it could not reach, a selector that
    // never appeared. Worth logging whole, because without it every
    // failure looks identical from the portal.
    const detail = res ? await res.text().catch(() => '') : '';
    console.error('pdf: browser rendering failed', res?.status, detail.slice(0, 500));
    throw new Error(`browser rendering returned ${res?.status ?? 'no response'}`);
  }

  return new Uint8Array(await res.arrayBuffer());
}

/** Writes the PDF to R2, overwriting whatever was at that key. */
export async function putPdf(env: PdfEnv, key: string, body: Uint8Array): Promise<void> {
  await env.REPORTS_BUCKET.put(key, body, {
    httpMetadata: {
      contentType: 'application/pdf',
      // Served through our own endpoint behind a session check, so it
      // must never sit in a shared cache.
      cacheControl: 'private, max-age=0, must-revalidate',
    },
  });
}

/** Render and store in one step. Returns the key it wrote. */
export async function generatePdf(
  env: PdfEnv,
  origin: string,
  kind: PrintKind,
  id: string,
  key: string,
): Promise<string> {
  const body = await renderPdf(env, origin, kind, id);
  await putPdf(env, key, body);
  return key;
}
