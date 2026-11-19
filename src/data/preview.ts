/* ──────────────────────────────────────────────────────────────
   Previews: our own copy of a file that lives in Google Drive.

   A Drive link used to be shown by putting Google's player in a
   frame. That only plays for someone signed in to a Google account
   with access, in a browser that lets Google read its sign-in from
   inside a frame, which an iPhone does not. So a preview is now a
   copy we keep ourselves: a web-sized image, or a web-playable video
   with a poster, in R2, served behind the portal's own sign-in.

   This file is the rules, and nothing in it talks to Drive, to the
   converter, to R2 or to Notion (see src/server/preview.ts for those).
   It is written to be used for more than content cards: anything that
   has "a Drive link, an owner, and an id" can have a preview, which
   is what the Content Vault will need.

   The words:

     source    the Drive file a preview was made from, by file id
     version   a random name for one build of a preview. It is part of
               every key, so a rebuilt preview has new addresses and
               an old address cannot be guessed from a new one
     variant   which file of the build: image, thumb or video
   ────────────────────────────────────────────────────────────── */

/* ── the Notion fields ────────────────────────────────────────── */

/** The fields a preview is recorded in. None of these is ever sent to
 *  a client: what a client is sent is `ItemPreview`, below. */
export const PREVIEW_FIELDS = {
  status: 'Preview Status',
  image: 'Preview Image Key',
  thumb: 'Preview Thumb Key',
  video: 'Preview Video Key',
  source: 'Preview Source',
  detail: 'Preview Detail',
} as const;

export const PREVIEW_FIELD_NAMES: readonly string[] = Object.values(PREVIEW_FIELDS);

export const PREVIEW_STATUSES = ['Converting', 'Ready', 'Failed'] as const;
export type PreviewStatus = typeof PREVIEW_STATUSES[number];

/** What Notion holds about one item's preview, read as plain values. */
export interface StoredPreview {
  status: string | null;
  imageKey: string | null;
  thumbKey: string | null;
  videoKey: string | null;
  source: string | null;
  detail: string | null;
}

/* ── the Drive file behind a link ─────────────────────────────── */

/**
 * The file id out of a Drive link, or null.
 *
 * Only a link to one file. A folder is not something a preview can be
 * made of, and anything that is not Drive is somebody else's player
 * (YouTube, Vimeo) or a direct file, which are shown as they always
 * were.
 */
export function driveFileId(raw: string | null | undefined): string | null {
  let u: URL;
  try { u = new URL(String(raw ?? '').trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  if (host !== 'drive.google.com' && host !== 'docs.google.com') return null;
  const id = /^\/file\/(?:u\/\d+\/)?d\/([\w-]{10,})/.exec(u.pathname)?.[1]
    ?? ((u.pathname === '/open' || u.pathname === '/uc') ? u.searchParams.get('id') : null);
  return id && /^[\w-]{10,200}$/.test(id) ? id : null;
}

/* ── keys ─────────────────────────────────────────────────────── */

export const PREVIEW_VARIANTS = ['image', 'thumb', 'video'] as const;
export type PreviewVariant = typeof PREVIEW_VARIANTS[number];

const VARIANT_FILE: Record<PreviewVariant, string> = {
  image: 'image.jpg',
  thumb: 'thumb.jpg',
  video: 'video.mp4',
};

export const VARIANT_TYPE: Record<PreviewVariant, string> = {
  image: 'image/jpeg',
  thumb: 'image/jpeg',
  video: 'video/mp4',
};

export function isPreviewVariant(v: unknown): v is PreviewVariant {
  return typeof v === 'string' && (PREVIEW_VARIANTS as readonly string[]).includes(v);
}

const hex = (id: string): string => id.replace(/-/g, '').toLowerCase();

/** A version is sixteen hex characters and nothing else. */
export function isPreviewVersion(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{16}$/.test(v);
}

/** An owner is a client's slug: the same thing their reports are
 *  filed under, and the thing their session is bound to. */
function isOwner(v: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,80}$/.test(v);
}

/**
 * The R2 key of one file of one build, or null when any part of it is
 * not the shape it must be.
 *
 * Built here and nowhere else, from parts that are each checked, so a
 * key can never be assembled from something a request typed: there is
 * no dot, slash or percent sign that survives into it.
 */
export function previewKey(owner: string, itemId: string, version: string, variant: PreviewVariant): string | null {
  const item = hex(itemId);
  if (!isOwner(owner) || !/^[0-9a-f]{32}$/.test(item) || !isPreviewVersion(version) || !isPreviewVariant(variant)) return null;
  return `previews/${owner}/${item}/${version}/${VARIANT_FILE[variant]}`;
}

/** The version a stored key belongs to, or null if it is not one of
 *  ours for this item. The owner in it is not checked here: the page
 *  asks under its own slug, and a file filed under another is simply
 *  not found, which the next look repairs. */
export function versionOfKey(key: string | null | undefined, itemId: string): string | null {
  const m = /^previews\/[a-z0-9-]+\/([0-9a-f]{32})\/([0-9a-f]{16})\/(image\.jpg|thumb\.jpg|video\.mp4)$/.exec(String(key ?? ''));
  if (!m || m[1] !== hex(itemId)) return null;
  return m[2];
}

/* ── what a viewer is told ────────────────────────────────────── */

/**
 * A preview, as a page is sent it.
 *
 * No key and no Notion field: a state, what kind of thing it is, and
 * the version, which is the one part of the address the page cannot
 * work out for itself. `why` is for us only and is never put on a
 * client's payload.
 */
export interface ItemPreview {
  state: 'ready' | 'pending' | 'failed';
  kind?: 'image' | 'video';
  v?: string;
  /** A video's poster exists. */
  poster?: boolean;
  why?: string;
}

/**
 * The preview of an item with this link, from what Notion holds.
 *
 * Undefined when the link is not a Drive file: there is nothing for
 * us to make, and the page shows the link as it always did. Anything
 * stored that was made from a different file is not this link's
 * preview, so it reads as pending until the new one is built.
 */
export function itemPreview(
  link: string | null | undefined, stored: StoredPreview, itemId: string,
  opts: { admin?: boolean } = {},
): ItemPreview | undefined {
  const fileId = driveFileId(link);
  if (!fileId) return undefined;
  if (stored.source !== fileId) return { state: 'pending' };
  if (stored.status === 'Failed') {
    return { state: 'failed', ...(opts.admin && stored.detail ? { why: stored.detail } : {}) };
  }
  if (stored.status !== 'Ready') return { state: 'pending' };
  const video = versionOfKey(stored.videoKey, itemId);
  const image = versionOfKey(stored.imageKey, itemId);
  if (video) return { state: 'ready', kind: 'video', v: video, ...(image === video ? { poster: true } : {}) };
  if (image) return { state: 'ready', kind: 'image', v: image };
  // Ready with no key we recognise: the record and the files have
  // come apart. Pending, so the next look rebuilds it.
  return { state: 'pending' };
}

/** Where a page asks for one file of a preview. One address for a
 *  client and for us: the sign-in decides who may have it. */
export function previewUrl(owner: string, itemId: string, version: string, variant: PreviewVariant): string {
  return `/portal/${owner}/preview/${hex(itemId)}/${version}/${variant}`;
}

/* ── what to do next ──────────────────────────────────────────── */

/** How long an upload may sit with no converter job before it is
 *  taken to have died and is started again. */
export const UPLOAD_STALE_MS = 6 * 60 * 1000;
/** How long a conversion may run before it is called a failure. */
export const CONVERT_TIMEOUT_MS = 45 * 60 * 1000;

export interface PreviewJob { version: string; started: number; job: string | null }

/** The job written into Preview Detail while converting, read back. */
export function parseJob(detail: string | null | undefined): PreviewJob | null {
  const m = /^Converting · v ([0-9a-f]{16}) · started (\d{4}-\d\d-\d\dT[\d:.]+Z)(?: · job ([0-9a-f]{32}))?/.exec(String(detail ?? ''));
  if (!m) return null;
  const started = Date.parse(m[2]);
  return Number.isFinite(started) ? { version: m[1], started, job: m[3] ?? null } : null;
}

export function jobDetail(job: PreviewJob): string {
  return `Converting · v ${job.version} · started ${new Date(job.started).toISOString()}${job.job ? ` · job ${job.job}` : ''}`;
}

export type PreviewStep =
  | { do: 'none' }
  /** Make it from the start. */
  | { do: 'build'; fileId: string }
  /** Someone else is uploading it right now. */
  | { do: 'wait' }
  /** Ask the converter how it is getting on. */
  | { do: 'check'; fileId: string; job: PreviewJob & { job: string } }
  | { do: 'fail'; why: string };

/**
 * What to do about one item's preview, from its link and what Notion
 * holds. Pure, so every branch can be tested without a network.
 *
 * `force` is "try again": a failure stays a failure until someone
 * asks, or until the link is changed to a different file, so one bad
 * file is not re-sent to the converter on every page load.
 */
export function planPreview(
  link: string | null | undefined, stored: StoredPreview, now: number, opts: { force?: boolean } = {},
): PreviewStep {
  const fileId = driveFileId(link);
  if (!fileId) return { do: 'none' };
  if (opts.force) return { do: 'build', fileId };
  if (stored.source !== fileId) return { do: 'build', fileId };
  if (stored.status === 'Ready' || stored.status === 'Failed') return { do: 'none' };
  if (stored.status === 'Converting') {
    const job = parseJob(stored.detail);
    if (!job) return { do: 'build', fileId };
    if (now - job.started > CONVERT_TIMEOUT_MS) return { do: 'fail', why: 'The converter did not finish in 45 minutes.' };
    if (job.job) return { do: 'check', fileId, job: { ...job, job: job.job } };
    return now - job.started > UPLOAD_STALE_MS ? { do: 'build', fileId } : { do: 'wait' };
  }
  return { do: 'build', fileId };
}

/* ── what kind of file it is ──────────────────────────────────── */

/** HEIC is here because Drive renders one for us; we never serve the
 *  original, only the JPEG it makes. */
const IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'image/gif', 'image/tiff', 'image/bmp'];

export function fileKind(mimeType: string | null | undefined): 'image' | 'video' | null {
  const t = String(mimeType ?? '').toLowerCase();
  if (IMAGE_TYPES.includes(t)) return 'image';
  if (t.startsWith('video/')) return 'video';
  return null;
}

/** The long edge of the web copy, and of the small one. */
export const IMAGE_PX = 1600;
export const THUMB_PX = 400;
/** The largest original we will send to the converter. Past this the
 *  honest answer is "export a smaller file", not a twenty-minute
 *  upload that may not finish. */
export const MAX_VIDEO_BYTES = 800 * 1024 * 1024;
/** One piece of an upload. The converter wants at least 5 MiB, in a
 *  multiple of 256 KiB, the same for every piece but the last. */
export const UPLOAD_CHUNK = 50 * 1024 * 1024;

/* ── byte ranges ──────────────────────────────────────────────── */

export interface ByteRange { offset: number; length: number }

/**
 * One `Range` header against a file of `size` bytes.
 *
 * 'all' when there is no header or it is not one we answer (several
 * ranges, another unit): the whole file is a correct answer to those.
 * Null when the range is past the end, which is a 416. A phone will
 * not play a video from a server that does not answer ranges, so this
 * is not optional.
 */
export function parseRange(header: string | null | undefined, size: number): ByteRange | 'all' | null {
  const m = /^bytes=(\d*)-(\d*)$/.exec(String(header ?? '').trim());
  if (!m || (m[1] === '' && m[2] === '')) return 'all';
  if (size <= 0) return null;
  if (m[1] === '') {
    const suffix = Number(m[2]);
    if (!Number.isFinite(suffix) || suffix <= 0) return null;
    const length = Math.min(suffix, size);
    return { offset: size - length, length };
  }
  const start = Number(m[1]);
  const end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start >= size || end < start) return null;
  return { offset: start, length: end - start + 1 };
}

/* ── reading an MP4's own description of itself ───────────────── */

export interface Mp4Facts {
  /** The index is before the picture data, so playback can start
   *  without the whole file. Null when neither was in what we read. */
  faststart: boolean | null;
  codec: string | null;
  width: number | null;
  height: number | null;
}

const u32 = (b: Uint8Array, o: number): number => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const fourcc = (b: Uint8Array, o: number): string => String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]);

const VIDEO_CODECS: Record<string, string> = {
  avc1: 'H.264', avc3: 'H.264', hvc1: 'HEVC', hev1: 'HEVC', av01: 'AV1', vp09: 'VP9',
};

/**
 * What the start of an MP4 says about it: whether it is "faststart",
 * which codec the picture is in, and how big the picture is.
 *
 * Given only the first part of the file, because that is all this
 * needs when the file is laid out for the web, and the absence of the
 * index there is itself the answer when it is not.
 */
export function probeMp4(head: Uint8Array): Mp4Facts {
  let moov = -1, mdat = -1, moovEnd = -1;
  for (let o = 0; o + 8 <= head.length;) {
    let size = u32(head, o);
    const type = fourcc(head, o + 4);
    if (size === 1 && o + 16 <= head.length) size = u32(head, o + 8) * 2 ** 32 + u32(head, o + 12);
    if (type === 'moov' && moov < 0) { moov = o; moovEnd = Math.min(head.length, o + size); }
    if (type === 'mdat' && mdat < 0) mdat = o;
    if (size < 8) break;
    o += size;
  }
  const facts: Mp4Facts = {
    faststart: moov >= 0 ? (mdat < 0 || moov < mdat) : (mdat >= 0 ? false : null),
    codec: null, width: null, height: null,
  };
  if (moov < 0) return facts;
  // The picture's sample entry: its four letters, then 78 bytes of
  // fixed fields, of which bytes 24 to 27 after the name are the
  // width and the height.
  for (let o = moov + 8; o + 32 <= moovEnd; o++) {
    const name = fourcc(head, o);
    if (!(name in VIDEO_CODECS)) continue;
    const w = (head[o + 28] << 8) | head[o + 29];
    const h = (head[o + 30] << 8) | head[o + 31];
    if (w >= 16 && h >= 16 && w <= 16384 && h <= 16384) {
      facts.codec = VIDEO_CODECS[name]; facts.width = w; facts.height = h;
      break;
    }
  }
  return facts;
}

/** Is this what we promise a phone: H.264, no bigger than 1080p, and
 *  laid out to start playing straight away? */
export function mp4IsWebReady(f: Mp4Facts): boolean {
  if (f.faststart !== true || f.codec !== 'H.264' || !f.width || !f.height) return false;
  return Math.min(f.width, f.height) <= 1080 && Math.max(f.width, f.height) <= 1920;
}

const mb = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(bytes < 10 * 1024 * 1024 ? 1 : 0)} MB`;

/** One line for Preview Detail when a build is done, so the row says
 *  what was made without anyone opening R2. */
export function readyDetail(kind: 'image' | 'video', bytes: number, facts?: Mp4Facts | null): string {
  if (kind === 'image') return `Ready · image, ${mb(bytes)}`;
  const f = facts ?? { faststart: null, codec: null, width: null, height: null };
  const size = f.width && f.height ? `${f.width}×${f.height}` : 'size unknown';
  const start = f.faststart === true ? 'faststart' : f.faststart === false ? 'NOT faststart' : 'faststart unknown';
  const line = `Ready · video, ${size} ${f.codec ?? 'codec unknown'}, ${start}, ${mb(bytes)}`;
  return facts && !mp4IsWebReady(f) ? `${line} · CHECK: not the web format we expect` : line;
}

/** A failure, said so that the fix is in the sentence. */
export function failureDetail(why: string): string {
  return `Failed · ${why}`.slice(0, 480);
}
