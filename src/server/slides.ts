/* ──────────────────────────────────────────────────────────────
   Slides, the part that talks to R2 and to Drive.

   SERVER ONLY. The rules are in src/data/slides.ts.

   A slide's preview is made by the same one function a single file's
   is, `advancePreview`, one step per look. The only thing that is
   different here is where the result is recorded: in the item's
   manifest in R2 rather than in six Notion fields.

   The manifest is changed by more than one thing at once: someone
   dragging slides into a new order while a conversion finishes for
   one of them. So it is never written blind. Every change reads the
   file, makes its change to what it read, and writes only if the file
   is still the one it read; if it is not, it reads again and makes
   the change again. A reorder and a finished conversion both land.
   ────────────────────────────────────────────────────────────── */

import { fileKind, planPreview, type StoredPreview } from '../data/preview';
import {
  blankManifest, driveFileLink, driveFolderLink, parseManifest, setSlidePreview, slideViews, slidesKey,
  type FolderFile, type SlideManifest, type SlideView,
} from '../data/slides';
import { accessToken, googleCredentials } from './google-drive';
import { advancePreview, discardPreview, type PreviewEnv } from './preview';

export type SlidesEnv = PreviewEnv;

export function newSlideId(): string {
  const b = new Uint8Array(4);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/* ── the manifest in R2 ───────────────────────────────────────── */

interface Held { manifest: SlideManifest; etag: string | null }

/** The manifest as R2 has it. Null when there is not one, or when it
 *  is not a manifest for this item, which reads as "no slides". */
export async function readManifest(bucket: R2Bucket | undefined, owner: string, itemId: string): Promise<Held | null> {
  const key = slidesKey(owner, itemId);
  if (!bucket || !key) return null;
  try {
    const object = await bucket.get(key);
    if (!object) return null;
    const manifest = parseManifest(await object.json().catch(() => null), itemId);
    return manifest ? { manifest, etag: object.etag } : null;
  } catch (err) {
    console.error('slides: could not read a manifest', key, err);
    return null;
  }
}

export interface Changed { manifest: SlideManifest; changed: boolean }

/**
 * Make one change to an item's manifest, safely against anything else
 * changing it at the same moment. See the top of the file.
 *
 * `change` is handed the manifest as it stands (a blank one when
 * there is none) and returns what it should become, or null for "as
 * it is". It may be called more than once, so it must do nothing but
 * work out its answer. Null back from here means it could not be
 * stored.
 */
export async function changeManifest(
  bucket: R2Bucket | undefined, owner: string, itemId: string,
  change: (m: SlideManifest) => SlideManifest | null,
): Promise<Changed | null> {
  const key = slidesKey(owner, itemId);
  if (!bucket || !key) return null;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const held = await readManifest(bucket, owner, itemId);
    const current = held?.manifest ?? blankManifest(itemId);
    const next = change(current);
    if (!next || next === current) return { manifest: current, changed: false };
    try {
      const put = await bucket.put(key, JSON.stringify(next), {
        httpMetadata: { contentType: 'application/json' },
        // Only if it is still the file that was read. With no file
        // yet there is nothing to compare, and the first write wins.
        ...(held?.etag ? { onlyIf: { etagMatches: held.etag } } : {}),
      });
      if (put) return { manifest: next, changed: true };
    } catch (err) {
      console.error('slides: could not write a manifest', key, err);
      return null;
    }
  }
  console.error('slides: a manifest kept changing under a write', key);
  return null;
}

/** An item with no slides has no manifest. */
export async function dropManifest(bucket: R2Bucket | undefined, owner: string, itemId: string): Promise<void> {
  const key = slidesKey(owner, itemId);
  if (!bucket || !key) return;
  try { await bucket.delete(key); } catch (err) { console.error('slides: could not delete a manifest', key, err); }
}

/* ── a Drive folder ───────────────────────────────────────────── */

export type FolderAnswer =
  | { ok: true; files: FolderFile[] }
  /** A secret is missing, or Google refused the key. */
  | { ok: false; why: 'not_configured'; note: string }
  /** The folder is not shared with us, or is not there. */
  | { ok: false; why: 'unreadable'; email: string }
  | { ok: false; why: 'try_later'; note: string };

/**
 * Every image and video directly inside a Drive folder.
 *
 * One level only: a subfolder is somebody's "old versions", not more
 * slides. Shortcuts and documents are left out, because neither has
 * a preview.
 */
export async function listFolderMedia(env: SlidesEnv, folderId: string): Promise<FolderAnswer> {
  const creds = googleCredentials(env);
  if (!creds) return { ok: false, why: 'not_configured', note: 'GOOGLE_SERVICE_ACCOUNT_JSON is not set.' };
  let token: string;
  try { token = await accessToken(creds); } catch (err) {
    console.error('slides: Google refused the key', err);
    return { ok: false, why: 'not_configured', note: 'Google refused the service account key.' };
  }
  const files: FolderFile[] = [];
  let pageToken = '';
  for (let page = 0; page < 5; page += 1) {
    const params = new URLSearchParams({
      // The id is checked to be letters, digits, dashes and
      // underscores before it gets here, so it cannot close the quote.
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'nextPageToken,files(id,name,mimeType)',
      pageSize: '1000',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
      ...(pageToken ? { pageToken } : {}),
    });
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (!res) return { ok: false, why: 'try_later', note: 'Drive did not answer.' };
    if (res.status === 404 || res.status === 403) return { ok: false, why: 'unreadable', email: creds.clientEmail };
    if (!res.ok) return { ok: false, why: 'try_later', note: `Drive answered ${res.status}.` };
    const json: any = await res.json().catch(() => null);
    for (const f of Array.isArray(json?.files) ? json.files : []) {
      if (fileKind(f?.mimeType)) files.push({ id: String(f?.id ?? ''), name: String(f?.name ?? '') });
    }
    pageToken = typeof json?.nextPageToken === 'string' ? json.nextPageToken : '';
    if (!pageToken) break;
  }
  // A folder we cannot see lists as empty rather than refusing, when
  // it sits in a drive we can otherwise reach. Asking for the folder
  // itself tells the two apart.
  if (!files.length) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?fields=id&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null);
    if (res && (res.status === 404 || res.status === 403)) return { ok: false, why: 'unreadable', email: creds.clientEmail };
  }
  return { ok: true, files };
}

/* ── moving the previews on ───────────────────────────────────── */

const samePreview = (a: StoredPreview, b: StoredPreview): boolean =>
  a.status === b.status && a.imageKey === b.imageKey && a.thumbKey === b.thumbKey
  && a.videoKey === b.videoKey && a.source === b.source && a.detail === b.detail;

export interface SlidesSubject { owner: string; itemId: string; title: string }

export interface SlidesProgress {
  /** The manifest as it now stands. Null when the item has none. */
  manifest: SlideManifest | null;
  changed: boolean;
  /** Slides that became failures in this call, counted from one. */
  newlyFailed: number[];
  /** Something is missing on our side, in words. */
  setup?: string;
}

/**
 * Move an item's slides on: each one that is not done takes one step.
 *
 * A bounded amount of work per call, the same bargain the single
 * preview makes: a few images (each is a couple of seconds), at most
 * one video sent to the converter (the slow step), and a look at the
 * conversions already running. Whoever is watching asks again.
 *
 * One slide failing is that slide's business. The loop goes on to the
 * next, and the failure is recorded on the one it belongs to.
 */
export async function advanceSlides(
  env: SlidesEnv, subject: SlidesSubject,
  opts: { retry?: string | null; verify?: string | null; now?: number; builds?: number; checks?: number } = {},
): Promise<SlidesProgress> {
  const bucket = env.REPORTS_BUCKET;
  const held = await readManifest(bucket, subject.owner, subject.itemId);
  if (!held) return { manifest: null, changed: false, newlyFailed: [] };

  const now = opts.now ?? Date.now();
  const started = Date.now();
  const maxBuilds = opts.builds ?? 4;
  const maxChecks = opts.checks ?? 6;
  let latest = held.manifest;
  let changed = false;
  let builds = 0, checks = 0, uploaded = false;
  let setup: string | undefined;
  const newlyFailed: number[] = [];

  for (const [i, slide] of held.manifest.slides.entries()) {
    const link = driveFileLink(slide.file);
    const force = opts.retry === slide.id;
    const verify = opts.verify === slide.id;
    const step = planPreview(link, slide.preview, now, { force });
    if (step.do === 'wait') continue;
    if (step.do === 'none' && !verify) continue;

    const heavy = step.do === 'build';
    if (heavy) {
      // Not after a video has gone up in this call, and not once the
      // call has already run long: the rest wait their turn.
      if (builds >= maxBuilds || uploaded || Date.now() - started > 20_000) continue;
      builds += 1;
    } else {
      if (checks >= maxChecks) continue;
      checks += 1;
    }

    // Two people can be looking at the same post at once (a drawer
    // open in HQ, the client's own page), and each look takes a step.
    // So a step only records its result if the slide is still as this
    // step found it. If someone else got there first, theirs stands,
    // and what this step made is cleared away rather than left behind.
    let base = slide.preview;
    const save = async (next: StoredPreview): Promise<boolean> => {
      /** What the slide holds instead: undefined when the slide has
       *  gone, null when the write is ours to make. */
      let standing: StoredPreview | null | undefined;
      const out = await changeManifest(bucket, subject.owner, subject.itemId, (m) => {
        const now = m.slides.find((s) => s.id === slide.id);
        standing = now ? now.preview : undefined;
        if (!now || !samePreview(now.preview, base)) return null;
        standing = null;
        return setSlidePreview(m, slide.id, next);
      });
      if (out) latest = out.manifest;
      if (!out) return false;
      if (standing !== null) {
        const kept = new Set(standing ? [standing.imageKey, standing.thumbKey, standing.videoKey] : []);
        const ours = (key: string | null): string | null => (key && !kept.has(key) ? key : null);
        await discardPreview(env, {
          ...next, status: null, imageKey: ours(next.imageKey), thumbKey: ours(next.thumbKey), videoKey: ours(next.videoKey),
        });
        return false;
      }
      base = next;
      changed = changed || out.changed;
      return true;
    };

    const out = await advancePreview(env, {
      owner: subject.owner,
      itemId: subject.itemId,
      title: `${subject.title} · slide ${i + 1}`,
      link,
      stored: slide.preview,
    }, save, { force, verify, now });

    if (out.outcome === 'not_configured') { setup = out.note ?? 'Previews are not set up.'; break; }
    if (heavy && out.outcome === 'converting') uploaded = true;
    if (out.outcome === 'failed' && slide.preview.status !== 'Failed') newlyFailed.push(i + 1);
    if (out.note && out.outcome !== 'converting' && out.outcome !== 'ready') {
      console.log('slides:', subject.owner, subject.itemId, `slide ${i + 1}`, out.outcome, out.note);
    }
  }

  return { manifest: latest, changed, newlyFailed, ...(setup ? { setup } : {}) };
}

/* ── what a page is sent ──────────────────────────────────────── */

export interface SlidesAnswer {
  slides: SlideView[];
  /** The folder the list was matched to, as a link. For us only. */
  folder?: string | null;
}

export function slidesAnswer(m: SlideManifest | null, itemId: string, opts: { admin?: boolean } = {}): SlidesAnswer {
  return {
    slides: slideViews(m, itemId, opts),
    ...(opts.admin ? { folder: m?.folder ? driveFolderLink(m.folder) : null } : {}),
  };
}

/** An item that says it has slides, and somewhere to put them. */
export interface SlideHolder {
  id: string;
  multi?: true;
  slides?: SlideView[];
  slidesFolder?: string;
}

/**
 * Put each item's slides on it, for the items that have any.
 *
 * `multi` is read from Notion ("this item has a manifest") and is all
 * that says which items to ask R2 about, so a client with no
 * carousels costs nothing here. An item whose manifest cannot be read
 * is sent with no slides rather than taking the page down.
 */
export async function attachSlides<T extends SlideHolder>(
  bucket: R2Bucket | undefined, items: T[], ownerOf: (item: T) => string | null,
  opts: { admin?: boolean } = {},
): Promise<void> {
  const wanted = items.filter((c) => c.multi);
  if (!bucket || !wanted.length) return;
  // A few at a time: a Worker holds only so many requests open.
  for (let i = 0; i < wanted.length; i += 6) {
    await Promise.all(wanted.slice(i, i + 6).map(async (c) => {
      const owner = ownerOf(c);
      if (!owner) return;
      const held = await readManifest(bucket, owner, c.id);
      if (!held) return;
      const answer = slidesAnswer(held.manifest, c.id, opts);
      if (answer.slides.length) c.slides = answer.slides;
      if (answer.folder) c.slidesFolder = answer.folder;
    }));
  }
}
