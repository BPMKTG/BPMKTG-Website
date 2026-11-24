/* ──────────────────────────────────────────────────────────────
   Slides: a post that is several files, in order.

   A carousel or a story sequence is up to twenty photos and videos.
   Each one is a Drive file, and each one gets a preview from the same
   service a single file does (src/data/preview.ts): a web-sized image,
   or a web-playable video with a poster, in R2, behind the portal's
   own sign-in.

   Where things live:

     the list     one JSON file in R2 per item, the manifest. Which
                  Drive files, in which order, and what is recorded
                  about each one's preview. It is too long for a
                  Notion text field, and it changes every time a
                  conversion moves on, which is not an edit of the card
     Notion       one field, "Slides Manifest", holding the manifest's
                  key. That is the whole of what Notion knows
     the files    filed under the item exactly as a single preview's
                  are, one random version per build, so the address a
                  page asks and the route that answers are unchanged

   This file is the rules, and talks to nothing. src/server/slides.ts
   is the part that reads Drive and R2.
   ────────────────────────────────────────────────────────────── */

import {
  driveFileId, itemPreview, versionOfKey, type ItemPreview, type StoredPreview,
} from './preview';

/** The one Notion field. Never sent to a browser. */
export const SLIDES_FIELD = 'Slides Manifest';

export const MAX_SLIDES = 20;

/** The kinds of post that are made of slides. */
export const SLIDE_MEDIA: readonly string[] = ['Carousel', 'Story'];

export function isSlideMedia(media: string | null | undefined): boolean {
  return SLIDE_MEDIA.includes(String(media ?? ''));
}

/* ── the manifest ─────────────────────────────────────────────── */

export interface Slide {
  /** Eight hex characters, random, never reused. A slide keeps its id
   *  when it is moved, so "slide 3" in a request is never trusted to
   *  mean the third one. */
  id: string;
  /** The Drive file it is. */
  file: string;
  /** The file's name, when Drive has told us. For us only. */
  name: string | null;
  preview: StoredPreview;
}

export interface SlideManifest {
  v: 1;
  /** The item it belongs to, as 32 hex characters. */
  item: string;
  /** The Drive folder the list was last matched to, if it was. */
  folder: string | null;
  slides: Slide[];
  updated: string;
}

const hex = (id: string): string => id.replace(/-/g, '').toLowerCase();

export function isSlideId(v: unknown): v is string {
  return typeof v === 'string' && /^[0-9a-f]{8}$/.test(v);
}

const isDriveId = (v: unknown): v is string => typeof v === 'string' && /^[\w-]{10,200}$/.test(v);

/**
 * The R2 key of an item's manifest, or null when a part of it is not
 * the shape it must be. Built from the client's slug and the item's
 * id and nothing else, so what is written in Notion is only ever
 * compared with this, never used as an address.
 */
export function slidesKey(owner: string, itemId: string): string | null {
  const item = hex(itemId);
  if (!/^[a-z0-9][a-z0-9-]{0,80}$/.test(owner) || !/^[0-9a-f]{32}$/.test(item)) return null;
  return `previews/${owner}/${item}/slides.json`;
}

export const EMPTY_PREVIEW: StoredPreview = {
  status: null, imageKey: null, thumbKey: null, videoKey: null, source: null, detail: null,
};

export function blankManifest(itemId: string): SlideManifest {
  return { v: 1, item: hex(itemId), folder: null, slides: [], updated: new Date(0).toISOString() };
}

const str = (v: unknown, max: number): string | null =>
  (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/**
 * A manifest out of whatever was in the file, or null.
 *
 * Read as if a stranger wrote it. A key is kept only if it is one of
 * this item's own preview files, because keys read from here are
 * later deleted from R2, and a manifest must not be a way to name
 * somebody else's file.
 */
export function parseManifest(raw: unknown, itemId: string): SlideManifest | null {
  const o = raw as any;
  if (!o || typeof o !== 'object' || o.v !== 1 || o.item !== hex(itemId) || !Array.isArray(o.slides)) return null;
  const seen = new Set<string>();
  const slides: Slide[] = [];
  for (const s of o.slides) {
    if (slides.length >= MAX_SLIDES) break;
    if (!s || !isSlideId(s.id) || !isDriveId(s.file) || seen.has(s.id)) continue;
    seen.add(s.id);
    const p = s.preview ?? {};
    const key = (k: unknown): string | null => (versionOfKey(str(k, 200), itemId) ? String(k).trim() : null);
    slides.push({
      id: s.id,
      file: s.file,
      name: str(s.name, 200),
      preview: {
        status: str(p.status, 20),
        imageKey: key(p.imageKey),
        thumbKey: key(p.thumbKey),
        videoKey: key(p.videoKey),
        source: isDriveId(p.source) ? p.source : null,
        detail: str(p.detail, 500),
      },
    });
  }
  return {
    v: 1,
    item: hex(itemId),
    folder: isDriveId(o.folder) ? o.folder : null,
    slides,
    updated: str(o.updated, 40) ?? new Date(0).toISOString(),
  };
}

/* ── a pasted link ────────────────────────────────────────────── */

export type SlideSource = { kind: 'file'; id: string } | { kind: 'folder'; id: string };

/**
 * What a pasted Drive link is: one file, a folder, or neither.
 *
 * A folder is told from its address (".../folders/<id>"), which is
 * what the address bar shows when one is open. Anything else that
 * names a Drive file is a file.
 */
export function slideSource(raw: string | null | undefined): SlideSource | null {
  let u: URL;
  try { u = new URL(String(raw ?? '').trim()); } catch { return null; }
  if (u.protocol !== 'https:') return null;
  const host = u.hostname.replace(/^www\./, '').toLowerCase();
  if (host === 'drive.google.com') {
    const m = /^\/drive\/(?:u\/\d+\/)?(?:mobile\/)?folders\/([\w-]{10,200})\/?$/.exec(u.pathname);
    if (m) return { kind: 'folder', id: m[1] };
  }
  const file = driveFileId(u.toString());
  return file ? { kind: 'file', id: file } : null;
}

export const driveFileLink = (fileId: string): string => `https://drive.google.com/file/d/${fileId}/view`;
export const driveFolderLink = (folderId: string): string => `https://drive.google.com/drive/folders/${folderId}`;

/* ── changing the list ────────────────────────────────────────── */

const stamped = (m: SlideManifest, slides: Slide[], folder = m.folder): SlideManifest =>
  ({ ...m, slides, folder, updated: new Date().toISOString() });

export type AddResult =
  | { ok: true; manifest: SlideManifest }
  | { ok: false; why: 'full' }
  /** `n` is which slide already is that file, counted from one. */
  | { ok: false; why: 'duplicate'; n: number };

/** One more slide on the end. The same file twice is a mistake, not a
 *  carousel, so it is refused and the reader is told where it is. */
export function addSlide(m: SlideManifest, file: string, id: string, name: string | null = null): AddResult {
  const at = m.slides.findIndex((s) => s.file === file);
  if (at !== -1) return { ok: false, why: 'duplicate', n: at + 1 };
  if (m.slides.length >= MAX_SLIDES) return { ok: false, why: 'full' };
  return { ok: true, manifest: stamped(m, [...m.slides, { id, file, name, preview: { ...EMPTY_PREVIEW } }]) };
}

export function removeSlide(m: SlideManifest, id: string): { manifest: SlideManifest; removed: Slide | null } {
  const removed = m.slides.find((s) => s.id === id) ?? null;
  if (!removed) return { manifest: m, removed: null };
  return { manifest: stamped(m, m.slides.filter((s) => s.id !== id)), removed };
}

/** The same slides in a new order, or null when `ids` is not exactly
 *  the slides there are: a list drawn a moment ago is not allowed to
 *  drop the slide that was added since. */
export function reorderSlides(m: SlideManifest, ids: unknown): SlideManifest | null {
  if (!Array.isArray(ids) || ids.length !== m.slides.length) return null;
  const by = new Map(m.slides.map((s) => [s.id, s]));
  const out: Slide[] = [];
  for (const id of ids) {
    const s = isSlideId(id) ? by.get(id) : undefined;
    if (!s) return null;
    by.delete(id);
    out.push(s);
  }
  if (out.every((s, i) => s === m.slides[i])) return m;
  return stamped(m, out);
}

/** One slide's preview record, replaced. Null when the slide has gone
 *  since, which whoever was building its preview needs to know. */
export function setSlidePreview(m: SlideManifest, id: string, preview: StoredPreview): SlideManifest | null {
  if (!m.slides.some((s) => s.id === id)) return null;
  return { ...m, slides: m.slides.map((s) => (s.id === id ? { ...s, preview } : s)), updated: new Date().toISOString() };
}

/**
 * Filenames the way a person orders them: "2.jpg" before "10.jpg",
 * and case does not matter. Written out rather than left to the
 * runtime's own collation, so a folder sorts the same everywhere.
 */
export function naturalCompare(a: string, b: string): number {
  const parts = (s: string): string[] => s.toLowerCase().match(/\d+|\D+/g) ?? [];
  const x = parts(a), y = parts(b);
  for (let i = 0; i < Math.min(x.length, y.length); i += 1) {
    if (x[i] === y[i]) continue;
    const dx = /^\d/.test(x[i]), dy = /^\d/.test(y[i]);
    if (dx && dy) {
      const nx = BigInt(x[i]), ny = BigInt(y[i]);
      if (nx !== ny) return nx < ny ? -1 : 1;
      // The same number written two ways: the shorter first.
      if (x[i].length !== y[i].length) return x[i].length - y[i].length;
      continue;
    }
    return x[i] < y[i] ? -1 : 1;
  }
  if (x.length !== y.length) return x.length - y.length;
  return a < b ? -1 : a > b ? 1 : 0;
}

export interface FolderFile { id: string; name: string }

/**
 * The list, made to match a folder: every file in it, by filename.
 *
 * A slide whose file is still in the folder is kept as it is, with
 * its preview, so matching again does not rebuild what has not
 * changed. Slides whose files have left the folder are handed back,
 * for their previews to be cleared away. `over` is how many files
 * past twenty were left out.
 */
export function matchFolder(
  m: SlideManifest, folderId: string, files: FolderFile[], newId: () => string,
): { manifest: SlideManifest; removed: Slide[]; added: number; over: number } {
  const unique = new Map<string, FolderFile>();
  for (const f of files) if (isDriveId(f.id) && !unique.has(f.id)) unique.set(f.id, f);
  const sorted = [...unique.values()].sort((a, b) => naturalCompare(a.name, b.name) || (a.id < b.id ? -1 : 1));
  const kept = sorted.slice(0, MAX_SLIDES);
  const have = new Map(m.slides.map((s) => [s.file, s]));
  let added = 0;
  const slides: Slide[] = kept.map((f) => {
    const was = have.get(f.id);
    if (was) return { ...was, name: f.name.slice(0, 200) || was.name };
    added += 1;
    return { id: newId(), file: f.id, name: f.name.slice(0, 200) || null, preview: { ...EMPTY_PREVIEW } };
  });
  const still = new Set(slides.map((s) => s.id));
  return {
    manifest: stamped(m, slides, folderId),
    removed: m.slides.filter((s) => !still.has(s.id)),
    added,
    over: sorted.length - kept.length,
  };
}

/* ── what a viewer is sent ────────────────────────────────────── */

/**
 * One slide, as a page is sent it. Like `ItemPreview`, it holds no
 * key and no field name: a state, a kind, the version that is the
 * one part of the address the page cannot work out, and the size of
 * the picture so the frame can be drawn before it loads.
 */
export interface SlideView {
  id: string;
  /** The original, for "Open original". */
  link: string;
  preview: ItemPreview;
  /** The small copy exists. */
  thumb?: true;
  w?: number;
  h?: number;
  /** The filename. For us only. */
  name?: string;
}

/** The picture's size out of a Ready line ("... 1080×1920 ..."). */
export function detailSize(detail: string | null | undefined): { w: number; h: number } | null {
  const m = /(?:^|[\s,])(\d{2,5})×(\d{2,5})(?:[\s,]|$)/.exec(String(detail ?? ''));
  if (!m) return null;
  const w = Number(m[1]), h = Number(m[2]);
  return w >= 16 && h >= 16 ? { w, h } : null;
}

export function slideViews(m: SlideManifest | null, itemId: string, opts: { admin?: boolean } = {}): SlideView[] {
  if (!m) return [];
  return m.slides.map((s) => {
    const link = driveFileLink(s.file);
    const preview = itemPreview(link, s.preview, itemId, opts) ?? { state: 'pending' as const };
    const size = preview.state === 'ready' ? detailSize(s.preview.detail) : null;
    const thumb = preview.state === 'ready' && !!preview.v && versionOfKey(s.preview.thumbKey, itemId) === preview.v;
    return {
      id: s.id,
      link,
      preview,
      ...(thumb ? { thumb: true as const } : {}),
      ...(size ?? {}),
      ...(opts.admin && s.name ? { name: s.name } : {}),
    };
  });
}

/** What an item carries about its slides, on either screen. */
export interface WithSlides {
  media?: string | null;
  slides?: SlideView[];
}

/** Does this item show as slides? Only a Carousel or a Story with at
 *  least one. Everything else is its Edit Link, as it always was. */
export function showsSlides(c: WithSlides): boolean {
  return isSlideMedia(c.media) && (c.slides?.length ?? 0) > 0;
}

/* ── the frame ────────────────────────────────────────────────── */

export const STORY_RATIO = 9 / 16;
/** What the frame is until the first slide's size is known. */
export const DEFAULT_RATIO = 4 / 5;
const TALLEST = 9 / 16;
const WIDEST = 1.91;

/**
 * The frame's width over its height.
 *
 * A story is 9:16. A carousel takes its first slide's shape and every
 * slide after it is cropped to that, which is what Instagram does.
 * Held between 9:16 and 1.91:1 so one odd file cannot make a frame a
 * sliver.
 */
export function frameRatio(media: string | null | undefined, first: { w?: number; h?: number } | null | undefined): number {
  if (media === 'Story') return STORY_RATIO;
  const w = Number(first?.w), h = Number(first?.h);
  if (!(w > 0) || !(h > 0)) return DEFAULT_RATIO;
  return Math.min(WIDEST, Math.max(TALLEST, w / h));
}

/* ── the size of a picture, from its first bytes ──────────────── */

const be16 = (b: Uint8Array, o: number): number => (b[o] << 8) | b[o + 1];
const be32 = (b: Uint8Array, o: number): number => ((b[o] << 24) | (b[o + 1] << 16) | (b[o + 2] << 8) | b[o + 3]) >>> 0;
const le16 = (b: Uint8Array, o: number): number => b[o] | (b[o + 1] << 8);
const le24 = (b: Uint8Array, o: number): number => b[o] | (b[o + 1] << 8) | (b[o + 2] << 16);

/**
 * How big an image is, read from the start of the file: JPEG, PNG,
 * GIF or WebP. Null for anything else, or when the size is not in
 * what was read, and the page then measures the picture itself.
 */
export function imageSize(b: Uint8Array): { w: number; h: number } | null {
  const ok = (w: number, h: number) => (w >= 1 && h >= 1 && w <= 65535 && h <= 65535 ? { w, h } : null);
  if (b.length >= 24 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    return ok(be32(b, 16), be32(b, 20));
  }
  if (b.length >= 10 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return ok(le16(b, 6), le16(b, 8));
  if (b.length >= 30 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
      && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) {
    const kind = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (kind === 'VP8X') return ok(le24(b, 24) + 1, le24(b, 27) + 1);
    if (kind === 'VP8 ') return ok(le16(b, 26) & 0x3fff, le16(b, 28) & 0x3fff);
    if (kind === 'VP8L') {
      const n = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return ok((n & 0x3fff) + 1, ((n >>> 14) & 0x3fff) + 1);
    }
    return null;
  }
  if (b.length >= 4 && b[0] === 0xff && b[1] === 0xd8) {
    for (let o = 2; o + 9 < b.length;) {
      if (b[o] !== 0xff) { o += 1; continue; }
      const marker = b[o + 1];
      if (marker === 0xff) { o += 1; continue; }
      // Markers that stand alone, with no length after them.
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { o += 2; continue; }
      const len = be16(b, o + 2);
      // A start-of-frame, which is where a JPEG says how big it is.
      // Not C4, C8 or CC: those share the range and are other things.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return ok(be16(b, o + 7), be16(b, o + 5));
      }
      if (len < 2) return null;
      o += 2 + len;
    }
  }
  return null;
}
