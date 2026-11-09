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

   ── where the pointer lives ──────────────────────────────────
   R2 holds the bytes; the Clients row's `Brand Brief PDF` property
   holds the answer to "is there one, and where". An upload writes
   both. That property is also how a brief that is NOT ours gets in:
   paste the address of a Doc, a Figma file or a Canva link and the
   client gets that instead, with no bytes on our side. One client,
   one brief, either kind, one place to look.

   Which is why `readBrief` takes the pointer rather than going
   straight to the bucket: a HEAD can only ever find a PDF of ours,
   and half the briefs are not.
   ────────────────────────────────────────────────────────────── */

import { fileSlug } from './pdf';
import type { PortalBrief } from '../data/portal';

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
export type BriefInfo = PortalBrief;

export interface BriefEnv {
  REPORTS_BUCKET?: R2Bucket;
}

/** Is this URL the one we hand out for this client's own PDF?
 *
 *  Compared against what `briefUrl` builds rather than sniffed for
 *  "/files/", so a link that merely looks like ours is treated as
 *  somebody else's and opened as a link, not HEADed in our bucket. */
export function isOurBriefUrl(url: string, slug: string): boolean {
  const mine = briefUrl(slug);
  try {
    // Absolute or root-relative: an upload writes the root-relative
    // form, but a human pasting from the address bar writes the whole
    // thing, and both name the same object.
    const path = new URL(url, 'https://blueprint-marketing.com').pathname;
    return path === mine;
  } catch {
    return false;
  }
}

/** "figma.com". The bare host, for a subtitle under a link. */
export function briefHost(url: string): string | null {
  try {
    const h = new URL(url).hostname.replace(/^www\./, '');
    return h || null;
  } catch {
    return null;
  }
}

/** Only these open from a client's browser. A brief is a document
 *  somebody sent us the address of, so the two web schemes are the
 *  whole list: `javascript:` and `data:` are not links. */
export function isSafeBriefUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * The brief for this client, or null.
 *
 * `pointer` is the Clients row's `Brand Brief PDF`, which is the
 * single answer to "does this client have a brief, and where". Three
 * cases, in this order:
 *
 *   - it points at our own file  → HEAD R2 for the size and the date
 *   - it points anywhere else    → a link, with no bytes to measure
 *   - it is empty                → HEAD R2 anyway, because a brief
 *     uploaded before this property was written still exists and the
 *     client should still see it. One HEAD, only when the column is
 *     blank.
 *
 * A HEAD, not a GET: this runs on every portal load and the bytes are
 * only ever wanted by the browser that clicks the link. A bucket that
 * is not bound, or a throw from R2, reads as "no brief" rather than
 * taking the portal down over a decoration.
 */
export async function readBrief(
  env: BriefEnv, slug: string, pointer?: string | null,
): Promise<BriefInfo | null> {
  const url = (pointer ?? '').trim();

  if (url && !isOurBriefUrl(url, slug)) {
    // Somebody else's document. Refused rather than passed through if
    // it is not a web link: this ends up as an href in the client's
    // browser.
    if (!isSafeBriefUrl(url)) {
      console.error('portal: the brand brief link is not http(s)', slug);
      return null;
    }
    return { url, kind: 'link', size: null, uploaded: null, host: briefHost(url) };
  }

  if (!env.REPORTS_BUCKET) return null;
  try {
    const head = await env.REPORTS_BUCKET.head(briefKey(slug));
    if (!head) return null;
    return {
      url: briefUrl(slug),
      kind: 'pdf',
      size: head.size,
      uploaded: head.uploaded ? head.uploaded.toISOString() : null,
      host: null,
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
  return {
    url: briefUrl(slug),
    kind: 'pdf',
    size: body.byteLength,
    uploaded: new Date().toISOString(),
    host: null,
  };
}

/** "1.1 MB". For a client deciding whether to tap it on a phone. */
export function fileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
