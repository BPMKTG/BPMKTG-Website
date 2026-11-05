/* ──────────────────────────────────────────────────────────────
   HTML to PDF, and PDF into R2.

   SERVER ONLY.

   Cloudflare Browser Rendering drives a real Chrome against our own
   print route and captures it. That is a deliberate choice over
   building the PDF by hand: the document is already a web page, it is
   designed as one, and a client who opens the share link and a client
   who downloads the PDF should be looking at the same thing.

   Three things make the capture deterministic:

     the signed token      the renderer can reach the route at all
     data-print-ready      the fonts are applied and the images decoded
     preferCSSPageSize     the page's own 816x1056 is the paper size

   Without the second one `networkidle` fires between "the font
   downloaded" and "the font is in use", and you get a PDF set in
   Times roughly one time in ten. Which is the worst possible rate,
   because it passes every time you check it.
   ────────────────────────────────────────────────────────────── */

import puppeteer from '@cloudflare/puppeteer';
import { monthKey } from '../data/print';
import { mintPrintToken, printSecret, type PrintKind } from './print-token';

/** How long to wait for the page to say it is ready. A cold Browser
 *  Rendering session plus a 6-page layout is a few seconds; the page's
 *  own fallback fires at 8. */
const READY_TIMEOUT_MS = 20_000;

export interface PdfEnv {
  BROWSER: Fetcher;
  REPORTS_BUCKET: R2Bucket;
  PRINT_SIGNING_SECRET?: string;
  PORTAL_SECRET?: string;
  NOTION_TOKEN: string;
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
  const token = await mintPrintToken(printSecret(env), kind, id);
  const url = `${origin}/print/${kind}/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;

  const browser = await puppeteer.launch(env.BROWSER);
  try {
    const page = await browser.newPage();
    // The viewport is the sheet. A narrower one makes the media
    // queries and the grid resolve against the wrong width before
    // print styles apply, which shows up as clipped cards.
    await page.setViewport({ width: 816, height: 1056, deviceScaleFactor: 2 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await page.waitForSelector('html[data-print-ready="1"]', { timeout: READY_TIMEOUT_MS });

    const pdf = await page.pdf({
      format: 'Letter',
      printBackground: true,
      preferCSSPageSize: true,
    });
    return new Uint8Array(pdf);
  } finally {
    // Always. A session left open holds a Browser Rendering slot until
    // it times out, and the next publish then fails for no visible
    // reason.
    await browser.close();
  }
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
