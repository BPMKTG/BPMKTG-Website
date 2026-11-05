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
import { editedBy } from './portal-write';

/* ── snapshots ────────────────────────────────────────────────── */

/**
 * Stamps who did it, the same way every other portal write does.
 *
 * The vocabulary is shared with `stampEdit`, but the shape is not:
 * on Content Pipeline and Campaign Calendar `Last Edited By` is a
 * Select, and on KPI Snapshots it is a Text column. Writing a
 * `{ select: … }` into a Text property is a 400 from Notion, not a
 * silently ignored field, so the two cannot share one writer.
 *
 * Every write to a snapshot goes through here, not just Publish. A
 * Regenerate that left yesterday's name behind would make the column
 * mean "who last published" on some rows and "who last touched this"
 * on others, and Content Pipeline's rule is the second one.
 *
 * The audit writes below do not stamp, because the Audits database
 * has no such column to stamp.
 */
export function stampSnapshotEdit(
  role: 'client' | 'admin',
  props: Record<string, unknown>,
): Record<string, unknown> {
  return {
    ...props,
    'Last Edited By': { rich_text: [{ text: { content: editedBy(role) } }] },
  };
}

/**
 * Marks a month published: the PDF URL, the date, the switch, and who
 * did it.
 *
 * One PATCH, so the four cannot disagree. A row with Published true
 * and no Report PDF would show a client a Reports entry with nothing
 * to download, and that is exactly the state a two-step write leaves
 * behind when the second step fails.
 *
 * `role` comes from the signed session the admin guard already read.
 * In practice it is always 'admin', because a client cannot reach any
 * endpoint that calls this; it is threaded through rather than
 * hardcoded so the stamp keeps telling the truth if that ever stops
 * being so.
 */
export async function publishSnapshot(
  token: string,
  snapshotId: string,
  pdfUrl: string,
  role: 'client' | 'admin' = 'admin',
  now = new Date(),
): Promise<boolean> {
  return patchPage(token, snapshotId, stampSnapshotEdit(role, {
    'Report PDF': { url: pdfUrl },
    'Published At': { date: { start: now.toISOString().slice(0, 10) } },
    Published: { checkbox: true },
  }), 'snapshot publish');
}

/** Just the PDF URL, for a Regenerate on a month already published. */
export async function setSnapshotPdf(
  token: string,
  snapshotId: string,
  pdfUrl: string,
  role: 'client' | 'admin' = 'admin',
): Promise<boolean> {
  return patchPage(
    token,
    snapshotId,
    stampSnapshotEdit(role, { 'Report PDF': { url: pdfUrl } }),
    'snapshot pdf',
  );
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
