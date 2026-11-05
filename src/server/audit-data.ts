/* ──────────────────────────────────────────────────────────────
   Where a growth audit's content comes from.

   SERVER ONLY.

   An audit is half database row and half page body. The row holds the
   scores and the short summaries; the body holds the fourteen long
   sections, parsed by notion-blocks.ts. This file puts the two halves
   together into an `AuditInput` and resolves who the audit is about.

   Reads, never writes.
   ────────────────────────────────────────────────────────────── */

import {
  AUDIT_FIELDS,
  SCORE_FIELDS,
  scoreTotal,
  type AuditInput,
} from '../data/print';
import {
  cleanText,
  type PortalAdminAudit,
  type PortalAudit,
} from '../data/portal';
import { clientCoverFields } from './cover';
import { fetchAuditBody } from './notion-blocks';
import {
  fetchPage,
  findClientById,
  queryAll,
  readCheckbox,
  readDate,
  readNumber,
  readRelation,
  readSelect,
  readText,
  readUrl,
} from './portal-notion';

/** The Audits database. Its data source is
 *  collection://1e6ce8c0-7f8e-466b-8e68-f7ac3d9f6f8d. */
export const AUDITS_DB = 'cd8929fa-d1ae-453c-be1a-c4b9d478c580';

const F = AUDIT_FIELDS;

/* ── the row ──────────────────────────────────────────────────── */

export interface AuditRow {
  id: string;
  title: string;
  clientId: string | null;
  prospectName: string | null;
  audience: 'Client' | 'Prospect';
  status: 'Draft' | 'Ready' | 'Sent' | null;
  auditDate: string | null;
  dataWindow: string | null;
  platformsReviewed: string | null;
  shortVersion: string | null;
  positioningRead: string | null;
  offer: string | null;
  bookACallLink: string | null;
  published: boolean;
  auditPdf: string | null;
  shareLink: string | null;
  scores: Record<string, number | null>;
}

function status(value: string | null): AuditRow['status'] {
  return value === 'Draft' || value === 'Ready' || value === 'Sent' ? value : null;
}

export function shapeAuditRow(page: any): AuditRow {
  const p = page.properties ?? {};
  const scores: Record<string, number | null> = {};
  for (const { prop } of SCORE_FIELDS) scores[prop] = readNumber(p[prop]);

  return {
    id: String(page.id),
    title: readText(p[F[0]]) ?? '',
    clientId: readRelation(p.Client)[0] ?? null,
    prospectName: cleanText(readText(p[F[1]])),
    // Anything other than an explicit Prospect is treated as a client
    // audit, which is the safer default: a client audit never prints
    // an offer or a price.
    audience: readSelect(p[F[2]]) === 'Prospect' ? 'Prospect' : 'Client',
    status: status(readSelect(p[F[3]])),
    auditDate: readDate(p[F[4]]),
    dataWindow: cleanText(readText(p[F[5]])),
    platformsReviewed: cleanText(readText(p[F[6]])),
    shortVersion: cleanText(readText(p[F[7]])),
    positioningRead: cleanText(readText(p[F[8]])),
    offer: cleanText(readText(p[F[9]])),
    bookACallLink: readUrl(p[F[10]]),
    published: readCheckbox(p[F[11]]),
    auditPdf: readUrl(p[F[12]]),
    shareLink: readUrl(p[F[13]]),
    scores,
  };
}

/** Every audit for one client, newest first. Used by the portal's
 *  Reports tab and by the admin panel. */
export async function fetchClientAudits(
  token: string,
  clientPageId: string,
): Promise<AuditRow[]> {
  const results = await queryAll(token, AUDITS_DB, {
    filter: { property: 'Client', relation: { contains: clientPageId } },
    sorts: [{ property: 'Audit Date', direction: 'descending' }],
  });
  return results.map(shapeAuditRow);
}

/* ── the portal's view ────────────────────────────────────────── */

/**
 * One audit as a client may see it.
 *
 * Built field by field from `PortalAudit`, the same way every other
 * portal type is built. The row carries an offer, a share link and
 * eight separate scores; none of them are copied here, and the only
 * number that is, the total, is one the PDF already prints on its
 * cover.
 */
export function toPortalAudit(row: AuditRow): PortalAudit {
  return {
    id: row.id,
    title: row.title,
    auditDate: row.auditDate,
    dataWindow: row.dataWindow,
    platformsReviewed: row.platformsReviewed,
    shortVersion: row.shortVersion,
    pdf: row.auditPdf,
    score: scoreTotal(row.scores),
  };
}

/** Is this audit one the client is meant to have?
 *
 *  Both conditions matter. Published is the switch Mason ticks; the
 *  audience check is what stops a prospect teardown that happens to
 *  be linked to a client row from appearing in their portal. */
export function isClientVisible(row: AuditRow): boolean {
  return row.published && row.audience === 'Client';
}

/** The audits a client sees, newest first. */
export async function fetchPortalAudits(
  token: string,
  clientPageId: string,
): Promise<PortalAudit[]> {
  const rows = await fetchClientAudits(token, clientPageId);
  return rows.filter(isClientVisible).map(toPortalAudit);
}

/** Every audit for this client, drafts included, as the admin panel
 *  shows them. Admin-only: this is grafted onto the payload per
 *  request and never cached. */
export function toAdminAudit(row: AuditRow): PortalAdminAudit {
  return {
    id: row.id,
    title: row.title,
    auditDate: row.auditDate,
    audience: row.audience,
    status: row.status,
    published: row.published,
    pdf: row.auditPdf,
    shareLink: row.shareLink,
  };
}

/* ── the whole thing ──────────────────────────────────────────── */

export interface LoadedAudit {
  input: AuditInput;
  row: AuditRow;
  /** Null for a prospect teardown. */
  slug: string | null;
}

/**
 * Everything one audit is made of, or null.
 *
 * The subject is the client's own Artist name when there is a client
 * relation, and Prospect Name otherwise. An audit with neither has
 * nobody to be about, so it does not render: a cover reading "Growth
 * Audit" with a blank name is worse than a 404 Mason can see.
 */
export async function loadAudit(token: string, auditId: string): Promise<LoadedAudit | null> {
  const page = await fetchPage(token, auditId);
  if (!page) return null;

  const row = shapeAuditRow(page);
  const client = row.clientId ? await findClientById(token, row.clientId) : null;
  const subject = client?.client.artist || row.prospectName || '';
  if (!subject) {
    console.error('audit: row has no client and no prospect name', auditId);
    return null;
  }

  // The Hero Photo and the crop, when there is a client to read them
  // off. A prospect teardown has neither, and gets the grid.
  const cover = row.clientId ? await clientCoverFields(token, row.clientId) : null;

  const body = await fetchAuditBody(token, auditId);
  if (body.missing.length) {
    // A warning, not a failure. The templates skip what is absent, and
    // the admin panel shows this list so Mason can see which heading
    // he has not written yet.
    console.warn('audit: missing headings', auditId, body.missing);
  }

  return {
    row,
    slug: client?.slug ?? null,
    input: {
      id: row.id,
      title: row.title,
      subject,
      audience: row.audience,
      status: row.status,
      auditDate: row.auditDate,
      dataWindow: row.dataWindow,
      platformsReviewed: row.platformsReviewed,
      shortVersion: row.shortVersion,
      positioningRead: row.positioningRead,
      offer: row.offer,
      bookACallLink: row.bookACallLink,
      scores: row.scores,
      sections: body.sections,
      missing: body.missing,
      slug: client?.slug ?? null,
      // The fallback. A client audit has its Drive cover swapped in by
      // the route, the same way a monthly report does; a prospect
      // teardown keeps whatever is here, which is the Hero Photo or
      // nothing. See functions/print/audit/[id].ts.
      coverImage: cover?.hero ?? null,
      coverFocus: cover?.focus ?? 'center',
    },
  };
}
