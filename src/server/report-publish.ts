/* ──────────────────────────────────────────────────────────────
   The Notion writes behind Publish.

   SERVER ONLY. Every function here is admin-only by the time it is
   called: the endpoints check the admin cookie first, and nothing in
   this file re-derives permission.

   Kept apart from report-data.ts so that the read path is provably a
   read path. A preview imports the loader; only the publish endpoint
   imports this.
   ────────────────────────────────────────────────────────────── */

import { patchPage } from './portal-notion';

/* ── snapshots ────────────────────────────────────────────────── */

/**
 * Marks a month published: the PDF URL, the date, and the switch.
 *
 * One PATCH, so the three cannot disagree. A row with Published true
 * and no Report PDF would show a client a Reports entry with nothing
 * to download, and that is exactly the state a two-step write leaves
 * behind when the second step fails.
 *
 * KPI Snapshots has no `Last Edited By` column, unlike Content
 * Pipeline and Campaign Calendar. Nothing is stamped, and nothing
 * should be: the client cannot write to this database at all, so
 * every row in it is already ours.
 */
export async function publishSnapshot(
  token: string,
  snapshotId: string,
  pdfUrl: string,
  now = new Date(),
): Promise<boolean> {
  return patchPage(token, snapshotId, {
    'Report PDF': { url: pdfUrl },
    'Published At': { date: { start: now.toISOString().slice(0, 10) } },
    Published: { checkbox: true },
  }, 'snapshot publish');
}

/** Just the PDF URL, for a Regenerate on a month already published. */
export async function setSnapshotPdf(
  token: string,
  snapshotId: string,
  pdfUrl: string,
): Promise<boolean> {
  return patchPage(token, snapshotId, { 'Report PDF': { url: pdfUrl } }, 'snapshot pdf');
}

/* ── audits ───────────────────────────────────────────────────── */

export async function setAuditPdf(
  token: string,
  auditId: string,
  pdfUrl: string,
): Promise<boolean> {
  return patchPage(token, auditId, { 'Audit PDF': { url: pdfUrl } }, 'audit pdf');
}

/**
 * Sets or clears the share link.
 *
 * Clearing writes an explicit null rather than an empty string, which
 * Notion stores as a URL of "" and then renders as a dead link.
 */
export async function setAuditShareLink(
  token: string,
  auditId: string,
  url: string | null,
): Promise<boolean> {
  return patchPage(token, auditId, { 'Share Link': { url: url || null } }, 'audit share link');
}
