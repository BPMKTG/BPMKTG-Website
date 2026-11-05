/* ──────────────────────────────────────────────────────────────
   The brand brief: one PDF per client, in R2.

   SERVER ONLY.

   Unlike a report or an audit there is no Notion row behind this and
   no month attached to it. A client has one brand brief, it lives at
   one key, and uploading a new one replaces it:

     briefs/<clientSlug>/brand-brief.pdf

   A fixed key rather than a dated one is the whole design. There is
   nothing to list, nothing to pick between and nothing to clean up,
   and "is there a brief?" is a single HEAD rather than a listing. The
   cost is that the old one is gone the moment a new one lands, which
   is what "replace on re-upload" means and is the behaviour asked
   for: the brief is a living document, not a record of a month.

   Nothing here serves bytes. The brief is read back through
   /portal/<slug>/files/<key> with every other PDF, behind the same
   session check, which is why briefs/ had to be added to the prefixes
   that endpoint will hand to a client.
   ────────────────────────────────────────────────────────────── */

import { fileSlug } from './pdf';

/** The only name a brief ever has. See the note above. */
export const BRIEF_FILE = 'brand-brief.pdf';

/**
 * As big as a brief is allowed to be.
 *
 * Generous for a text-and-swatches document and still small enough to
 * hold in a Worker while it is checked: the bytes are read in full so
 * the header can be sniffed, rather than streamed straight into R2 on
 * the uploader's word about what they are.
 */
export const MAX_BRIEF_BYTES = 25 * 1024 * 1024;

/** `briefs/sean-comma/brand-brief.pdf` */
export function briefKey(slug: string): string {
  return `briefs/${fileSlug(slug)}/${BRIEF_FILE}`;
}

/** Where the client fetches it. Root-relative on purpose: this goes
 *  into the cached payload, and a baked-in origin would be wrong the
 *  moment a preview deployment and production share a cache entry. */
export function briefUrl(slug: string): string {
  return `/portal/${slug}/files/${briefKey(slug)}`;
}

/**
 * Is this actually a PDF?
 *
 * The browser's Content-Type is the uploader's claim about the file,
 * and this endpoint stores the result under a key we then serve as
 * application/pdf. So the bytes get the last word: every PDF begins
 * with %PDF- and anything that does not is refused rather than
 * stored and handed to a client as one.
 */
export function looksLikePdf(bytes: Uint8Array): boolean {
  if (bytes.length < 5) return false;
  const magic = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
  return magic.every((b, i) => bytes[i] === b);
}

/** What the portal says about a brief that exists. */
export interface BriefInfo {
  url: string;
  /** Bytes, so the client can see what they are about to download. */
  size: number;
  /** When it was uploaded, ISO. Null if R2 did not say. */
  uploaded: string | null;
}

export interface BriefEnv {
  REPORTS_BUCKET?: R2Bucket;
}

/**
 * The brief for this client, or null.
 *
 * A HEAD, not a GET: this runs on every portal load and the bytes are
 * only ever wanted by the browser that clicks the link. A bucket that
 * is not bound, or a throw from R2, reads as "no brief" rather than
 * taking the portal down over a decoration.
 */
export async function readBrief(env: BriefEnv, slug: string): Promise<BriefInfo | null> {
  if (!env.REPORTS_BUCKET) return null;
  try {
    const head = await env.REPORTS_BUCKET.head(briefKey(slug));
    if (!head) return null;
    return {
      url: briefUrl(slug),
      size: head.size,
      uploaded: head.uploaded ? head.uploaded.toISOString() : null,
    };
  } catch (err) {
    console.error('portal: reading the brand brief threw', slug, err);
    return null;
  }
}

/** Stores the brief, replacing whatever was there. */
export async function putBrief(
  env: BriefEnv, slug: string, body: Uint8Array,
): Promise<BriefInfo> {
  if (!env.REPORTS_BUCKET) throw new Error('REPORTS_BUCKET is not bound');
  const key = briefKey(slug);
  await env.REPORTS_BUCKET.put(key, body, {
    httpMetadata: {
      contentType: 'application/pdf',
      // Served through our own endpoint behind a session check, so it
      // must never sit in a shared cache.
      cacheControl: 'private, max-age=0, must-revalidate',
    },
  });
  return { url: briefUrl(slug), size: body.byteLength, uploaded: new Date().toISOString() };
}

/** "1.1 MB". For a client deciding whether to tap it on a phone. */
export function fileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
