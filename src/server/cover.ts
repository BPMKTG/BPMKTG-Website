/* ──────────────────────────────────────────────────────────────
   Which photo goes on the cover, and where the copy of it lives.

   SERVER ONLY.

   The rule, in order:

     1  the newest image in the client's Drive "Report Covers" folder
     2  the Clients row's Hero Photo URL
     3  the blue grid, which is the template's own background

   Resolved on Publish and on Regenerate, never on a render. That
   split is the point of this file. A render has to be fast and it has
   to be certain, and "fast and certain" is not what you get from
   three Google round trips on the critical path of a headless Chrome
   with a thirty second timeout. So the decision is made once, by an
   admin pressing a button, and written down: the bytes go into R2 and
   a small JSON pointer next to them records what was chosen and why.
   The print route reads the pointer and nothing else, which means
   Browser Rendering never talks to Drive and a report cannot start
   failing because somebody changed a Drive permission on a Tuesday.

   Nothing in here throws. Every failure is a fallback plus a log line
   naming the source that was used, because a photo is decoration and
   a report is the deliverable.
   ────────────────────────────────────────────────────────────── */

import { coverFocus, heroImageUrl, type CoverFocus } from '../data/print';
import {
  accessToken,
  driveFolderId,
  fetchCoverBytes,
  findCoversFolder,
  googleCredentials,
  listCoverImages,
  pickNewest,
} from './google-drive';
import { fileSlug } from './pdf';
import { mintPrintToken } from './print-token';
import { fetchPage, readSelect, readUrl } from './portal-notion';

/** Where a cover came from. The admin panel prints this, so the
 *  wording is the wording Mason reads. */
export type CoverSource = 'covers' | 'hero' | 'grid';

export const COVER_SOURCE_LABELS: Record<CoverSource, string> = {
  covers: 'Report Covers',
  hero: 'Hero Photo',
  grid: 'Grid',
};

export interface CoverPointer {
  source: CoverSource;
  /** The R2 key of the stored copy, when there is one. */
  key: string | null;
  /** The Drive filename, for the admin panel. */
  filename: string | null;
  fileId: string | null;
  /** The Hero Photo URL, when that is what was used. */
  hero: string | null;
  /** When the decision was made. */
  at: string;
  /** Why it is not the Drive folder, in a sentence. Null when it is. */
  note: string | null;
}

export interface CoverEnv {
  REPORTS_BUCKET?: R2Bucket;
  NOTION_TOKEN: string;
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
}

/* ── keys ─────────────────────────────────────────────────────── */

/**
 * `reports/sean-comma/covers/1enuxela-dtyxqquuwxhlkw-qemjmpo8p.jpg`
 *
 * The Drive file id, slugged. Slugged because this key is also a URL
 * path on the files endpoint, whose whitelist is lowercase letters,
 * digits and hyphens and will stay that way: a key format that admits
 * capitals and underscores is a key format somebody has to re-audit.
 * Two Drive ids differing only in case would collide, which is a
 * sentence worth writing down and not worth defending against.
 */
export function coverKey(slug: string, fileId: string): string {
  return `reports/${fileSlug(slug)}/covers/${fileSlug(fileId)}.jpg`;
}

/** The pointer. One per client, overwritten on every resolve, which is
 *  what makes a removed Drive folder fall back cleanly instead of
 *  leaving last month's photo in place forever. */
export function pointerKey(slug: string): string {
  return `reports/${fileSlug(slug)}/covers/current.json`;
}

/* ── the client's two fields ──────────────────────────────────── */

export interface CoverFields {
  folder: string | null;
  hero: string | null;
  focus: CoverFocus;
}

/**
 * Client Folder, Hero Photo and Cover Focus, read straight off the
 * Clients row.
 *
 * Deliberately not on `PortalClient`. That type is the portal's
 * payload and every field on it ships to a browser; a private Drive
 * folder link has no business there, and the portal has no use for it.
 * So these three are read here, server side, by the two callers that
 * need them.
 */
export async function clientCoverFields(token: string, clientPageId: string): Promise<CoverFields> {
  const page = await fetchPage(token, clientPageId);
  const p = page?.properties ?? {};
  return {
    folder: readUrl(p['Client Folder']),
    hero: heroImageUrl(readUrl(p['Hero Photo'])),
    focus: coverFocus(readSelect(p['Cover Focus'])),
  };
}

/* ── the pointer in R2 ────────────────────────────────────────── */

export async function readCoverPointer(env: CoverEnv, slug: string): Promise<CoverPointer | null> {
  if (!env.REPORTS_BUCKET) return null;
  try {
    const object = await env.REPORTS_BUCKET.get(pointerKey(slug));
    if (!object) return null;
    const parsed: any = JSON.parse(await object.text());
    if (!parsed || typeof parsed.source !== 'string') return null;
    return parsed as CoverPointer;
  } catch (err) {
    console.warn('cover: pointer unreadable', slug, err);
    return null;
  }
}

async function writeCoverPointer(env: CoverEnv, slug: string, pointer: CoverPointer): Promise<void> {
  if (!env.REPORTS_BUCKET) return;
  await env.REPORTS_BUCKET.put(pointerKey(slug), JSON.stringify(pointer), {
    httpMetadata: {
      contentType: 'application/json',
      cacheControl: 'private, max-age=0, must-revalidate',
    },
  });
}

/**
 * Drop cover copies this client is no longer using.
 *
 * Best effort and swallowed: a left-behind JPEG costs a few hundred
 * kilobytes against a ten gigabyte free tier, and failing a publish
 * over tidying up would be a poor trade.
 */
async function pruneOldCovers(env: CoverEnv, slug: string, keep: string): Promise<void> {
  if (!env.REPORTS_BUCKET) return;
  try {
    const prefix = `reports/${fileSlug(slug)}/covers/`;
    const listed = await env.REPORTS_BUCKET.list({ prefix });
    const stale = listed.objects
      .map((o) => o.key)
      .filter((key) => key !== keep && key !== pointerKey(slug));
    if (stale.length) await env.REPORTS_BUCKET.delete(stale);
  } catch (err) {
    console.warn('cover: could not prune old covers', slug, err);
  }
}

/**
 * The URL a print page should point its cover <img> at, or null.
 *
 * Relative, so it resolves against whichever deployment is rendering:
 * a preview branch serves its own cover route rather than reaching
 * into production's. The token is minted per render and lasts ten
 * minutes, which is the page's own lifetime.
 *
 * Null means "there is no stored Drive cover", and the caller leaves
 * the template's Hero Photo fallback in place.
 */
export async function storedCoverUrl(
  env: CoverEnv,
  secret: string,
  slug: string | null,
): Promise<string | null> {
  if (!slug) return null;
  const pointer = await readCoverPointer(env, slug);
  if (!pointer?.key) return null;
  const token = await mintPrintToken(secret, 'cover', slug);
  return `/print/cover/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`;
}

/* ── the decision ─────────────────────────────────────────────── */

const now = () => new Date().toISOString();

const fallback = (source: Exclude<CoverSource, 'covers'>, hero: string | null, note: string | null): CoverPointer => ({
  source,
  key: null,
  filename: null,
  fileId: null,
  hero: source === 'hero' ? hero : null,
  at: now(),
  note,
});

/**
 * Pick a cover, store it, write the pointer, and say what happened.
 *
 * `fields` is passed in rather than read here so the caller that
 * already has the Clients row does not fetch it twice.
 *
 * Every branch writes a pointer, including the two that did not find a
 * photo. That is what makes removing the Drive folder work: the next
 * publish records "grid", the print route reads "grid", and the stale
 * JPEG in R2 stops being referenced in the same breath.
 */
export async function resolveCover(
  env: CoverEnv,
  slug: string,
  fields: CoverFields,
): Promise<CoverPointer> {
  const settle = async (pointer: CoverPointer): Promise<CoverPointer> => {
    try {
      await writeCoverPointer(env, slug, pointer);
    } catch (err) {
      console.error('cover: pointer could not be written', slug, err);
    }
    console.log(`cover: ${slug} using ${pointer.source}`, pointer.filename ?? pointer.note ?? '');
    return pointer;
  };

  const heroOrGrid = (note: string | null) => fields.hero
    ? fallback('hero', fields.hero, note)
    : fallback('grid', null, note);

  if (!env.REPORTS_BUCKET) {
    // Nowhere to put a copy, so there is no point fetching one.
    return heroOrGrid('no R2 bucket is bound');
  }

  const folderId = driveFolderId(fields.folder);
  if (!folderId) {
    return settle(heroOrGrid(
      fields.folder ? 'Client Folder is not a Drive folder link' : 'Client Folder is empty',
    ));
  }

  const creds = googleCredentials(env);
  if (!creds) {
    return settle(heroOrGrid('GOOGLE_SERVICE_ACCOUNT_JSON is not set'));
  }

  try {
    const token = await accessToken(creds);

    const coversId = await findCoversFolder(token, folderId);
    if (!coversId) {
      return settle(heroOrGrid('no "Report Covers" folder in the client folder'));
    }

    const newest = pickNewest(await listCoverImages(token, coversId));
    if (!newest) {
      return settle(heroOrGrid('"Report Covers" has no jpg, png or webp in it'));
    }

    const { bytes, contentType, via } = await fetchCoverBytes(token, newest);
    const key = coverKey(slug, newest.id);

    await env.REPORTS_BUCKET.put(key, bytes, {
      httpMetadata: {
        // Whatever Drive sent. The key says .jpg because that is what
        // Drive's rendition is in practice; the stored type is the
        // truth and the route serves this header, not the extension.
        contentType: contentType || 'image/jpeg',
        cacheControl: 'private, max-age=0, must-revalidate',
      },
    });

    console.log(`cover: ${slug} stored ${bytes.byteLength} bytes via ${via}`);
    await pruneOldCovers(env, slug, key);

    return settle({
      source: 'covers',
      key,
      filename: newest.name,
      fileId: newest.id,
      hero: null,
      at: now(),
      note: null,
    });
  } catch (err) {
    // A revoked share, a rejected key, a photo too big to use. The
    // report still goes out; the panel says which source it used.
    const why = err instanceof Error ? err.message : String(err);
    console.error('cover: Drive lookup failed, falling back', slug, why);
    return settle(heroOrGrid(why.slice(0, 200)));
  }
}

/* ── what the admin panel shows ───────────────────────────────── */

/**
 * The cover, as one line of UI.
 *
 * `image` is something an <img> in the panel can load: our own cover
 * route for a stored Drive photo, the Hero Photo URL when that is what
 * is in use, null for the grid. The panel draws a swatch for null
 * rather than a broken image.
 */
export interface CoverStatus {
  source: CoverSource;
  label: string;
  filename: string | null;
  focus: CoverFocus;
  image: string | null;
  note: string | null;
}

async function toStatus(
  secret: string,
  slug: string,
  pointer: CoverPointer,
  focus: CoverFocus,
): Promise<CoverStatus> {
  let image: string | null = null;
  if (pointer.source === 'covers' && pointer.key) {
    const token = await mintPrintToken(secret, 'cover', slug);
    image = `/print/cover/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`;
  } else if (pointer.source === 'hero') {
    image = pointer.hero;
  }

  return {
    source: pointer.source,
    label: COVER_SOURCE_LABELS[pointer.source],
    filename: pointer.filename,
    focus,
    image,
    note: pointer.note,
  };
}

/**
 * Resolve the cover afresh and report what was chosen.
 *
 * Called by Publish and Regenerate, before the render, so the stored
 * copy the print route reads is the one this action just decided on.
 */
export async function refreshCover(
  env: CoverEnv,
  secret: string,
  slug: string,
  clientPageId: string,
): Promise<CoverStatus> {
  const fields = await clientCoverFields(env.NOTION_TOKEN, clientPageId);
  const pointer = await resolveCover(env, slug, fields);
  return toStatus(secret, slug, pointer, fields.focus);
}

/**
 * What the cover is now, without changing anything.
 *
 * Read-only on purpose: opening the admin panel must not reach out to
 * Google. Before the first publish there is no pointer, so this says
 * what the next render would use rather than inventing a source, which
 * is the difference between "Grid" and a blank line.
 */
export async function coverStatus(
  env: CoverEnv,
  secret: string,
  slug: string,
  clientPageId: string,
): Promise<CoverStatus> {
  const fields = await clientCoverFields(env.NOTION_TOKEN, clientPageId);
  const stored = await readCoverPointer(env, slug);
  const pointer = stored ?? (fields.hero
    ? fallback('hero', fields.hero, 'no cover has been generated yet')
    : fallback('grid', null, 'no cover has been generated yet'));
  return toStatus(secret, slug, pointer, fields.focus);
}
