/* ──────────────────────────────────────────────────────────────
   GET /portal/<slug>/files/<key> — one PDF out of R2.

   R2 has no public URL here on purpose. Every byte is served through
   this endpoint, behind the same session check as the rest of the
   portal, so a link to a report works for the client it belongs to
   and for nobody else. Forwarding it to a friend gets them a 404.

   The ownership rule is the whole security of this file: a client may
   fetch keys under their own prefix and no others. It is checked
   against the slug in the URL AND against the record the slug
   resolves to, so a key cannot be smuggled in with "../" or with
   another client's prefix. An admin may fetch anything, which is how
   Mason checks a PDF before it goes out.
   ────────────────────────────────────────────────────────────── */

import {
  isValidSlug,
  normaliseSlug,
  portalNotFound,
  readViewer,
  sessionSecret,
} from '../../../../src/server/portal-auth';
import { findClientBySlug } from '../../../../src/server/portal-notion';

interface Env {
  NOTION_TOKEN: string;
  PORTAL_SECRET?: string;
  REPORTS_BUCKET?: R2Bucket;
}

/** The prefixes a client of this slug owns. Nothing else is theirs. */
const ownedPrefixes = (slug: string) => [`reports/${slug}/`, `audits/${slug}/`];

/**
 * Is this a key we are willing to look up at all?
 *
 * Deliberately narrow: lowercase letters, digits, hyphens, slashes
 * and a .pdf on the end. No dots anywhere else, so there is no "../"
 * to normalise away, and no encoded one either, because the segments
 * arrive already decoded and a dot would fail this test.
 */
function isSafeKey(key: string): boolean {
  if (key.length > 200) return false;
  if (!/^[a-z0-9/-]+\.pdf$/.test(key)) return false;
  return !key.includes('//') && !key.startsWith('/');
}

/** "2026-11-kpi-report.pdf" -> "Sean Comma 2026-11 report.pdf" is
 *  nicer, but the key's own basename is honest and never collides. */
function filename(key: string): string {
  return key.split('/').pop() || 'report.pdf';
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.NOTION_TOKEN) {
    console.error("portal: NOTION_TOKEN isn't set");
    return portalNotFound();
  }
  if (!env.REPORTS_BUCKET) {
    console.error('portal: REPORTS_BUCKET is not bound, no file can be served');
    return portalNotFound();
  }

  const slug = normaliseSlug(params.slug as string);
  if (!isValidSlug(slug)) return portalNotFound();

  // Auth before the key is even looked at, so a stranger cannot use
  // this endpoint to find out which keys exist.
  const viewer = await readViewer(request, sessionSecret(env), slug);
  if (!viewer) return portalNotFound();

  const parts = params.key;
  const key = Array.isArray(parts) ? parts.join('/') : String(parts ?? '');
  if (!isSafeKey(key)) return portalNotFound();

  if (viewer.role !== 'admin') {
    // The slug in the URL is not enough: a client's cookie is scoped
    // to their own path, but the record is what says this slug is
    // really theirs, and the prefix is built from that.
    const record = await findClientBySlug(env.NOTION_TOKEN, slug);
    if (!record || !record.portalEnabled) return portalNotFound();
    if (!ownedPrefixes(record.slug).some((p) => key.startsWith(p))) return portalNotFound();
  }

  const object = await env.REPORTS_BUCKET.get(key);
  if (!object) return portalNotFound();

  return new Response(object.body, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename(key)}"`,
      // Private, because the URL is not the permission: the cookie is.
      'Cache-Control': 'private, max-age=0, must-revalidate',
      'X-Robots-Tag': 'noindex, nofollow, noarchive',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
