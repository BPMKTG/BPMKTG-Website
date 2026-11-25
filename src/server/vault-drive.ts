/* ──────────────────────────────────────────────────────────────
   The Content Vault's view of Google Drive.

   SERVER ONLY, and READ ONLY. The service account's key asks for
   drive.readonly and nothing here sends Drive anything but a
   question: no file is renamed, moved, copied or deleted, and no
   original is downloaded. What Drive already knows about a file (its
   size in pixels, how long it runs, a thumbnail it has already drawn)
   is all that is asked for.

   Three things are done here:

     which folders     a client's Footage Drop and Finished Content,
                       found inside their Drive Folder, and their
                       Archive folders, by link
     whether we may    a folder counts as shared only when it, or a
                       folder above it, has been shared with the
                       service account by name. "Anyone with the
                       link" would let us read it today and is not
                       relied on: it is somebody else's setting, and
                       it is how a folder ends up public
     what is in them   every image and video under a folder, however
                       deep, with the folders it was found through
   ────────────────────────────────────────────────────────────── */

import { DROP_FOLDER, FINISHED_FOLDER, FOLDER_MIME, SHORTCUT_MIME, isVaultMedia } from '../data/vault';
import { accessToken, driveFolderId, googleCredentials, thumbnailAt } from './google-drive';

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const ID = /^[\w-]{10,200}$/;

export interface DriveEnv { GOOGLE_SERVICE_ACCOUNT_JSON?: string }

/* ── the key ──────────────────────────────────────────────────── */

/** One access token per isolate, kept in memory for most of its
 *  hour and nowhere else. A grid of thumbnails being made on demand
 *  is a few dozen requests in a second, and each would otherwise sign
 *  and ask for its own. */
let held: { email: string; token: string; until: number } | null = null;

export type Google = { ok: true; token: string; email: string } | { ok: false; note: string };

export async function google(env: DriveEnv, now = Date.now()): Promise<Google> {
  const creds = googleCredentials(env);
  if (!creds) return { ok: false, note: 'GOOGLE_SERVICE_ACCOUNT_JSON is not set.' };
  if (held && held.email === creds.clientEmail && held.until > now) return { ok: true, token: held.token, email: creds.clientEmail };
  try {
    const token = await accessToken(creds, now);
    held = { email: creds.clientEmail, token, until: now + 45 * 60 * 1000 };
    return { ok: true, token, email: creds.clientEmail };
  } catch (err) {
    console.error('vault: Google refused the key', err);
    return { ok: false, note: 'Google refused the service account key.' };
  }
}

/* ── asking Drive ─────────────────────────────────────────────── */

/** Counted, so a sync knows how much of a request's allowance it has
 *  spent. */
export interface Meter { calls: number }

async function ask(token: string, url: string, meter?: Meter): Promise<{ status: number; json: any }> {
  if (meter) meter.calls += 1;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } }).catch(() => null);
  if (!res) return { status: 0, json: null };
  const json: any = await res.json().catch(() => null);
  return { status: res.status, json };
}

/** Drive says "slow down" as a 403 with a reason, and as a 429. Both
 *  are "try later", never "not shared". */
function isRateLimit(status: number, json: any): boolean {
  if (status === 429) return true;
  const reason = String(json?.error?.errors?.[0]?.reason ?? json?.error?.status ?? '');
  return status === 403 && /rateLimit|userRateLimit|RESOURCE_EXHAUSTED/i.test(reason);
}

export interface DriveFolder {
  id: string;
  name: string;
  /** Shared with the service account by name, here or above. */
  shared: boolean;
}

export type FolderLook =
  | { ok: true; folder: DriveFolder }
  /** Not there for us at all, or readable only by its link. */
  | { ok: false; why: 'not_shared'; name: string | null }
  /** There, and not a folder. */
  | { ok: false; why: 'not_found' }
  | { ok: false; why: 'error'; note: string };

const LOOK_FIELDS = 'id,name,mimeType,trashed,sharedWithMeTime,ownedByMe,parents,driveId';

/**
 * Look at one folder: is it there, and is it shared with us by name?
 *
 * A folder shared with the service account says when
 * (sharedWithMeTime). A folder inside one that was shared says
 * nothing itself, so the folders above it are asked in turn. One we
 * can read with nothing above it shared with us is being read by its
 * link, and that is answered as not shared.
 */
export async function lookAtFolder(token: string, id: string, meter?: Meter): Promise<FolderLook> {
  if (!ID.test(id)) return { ok: false, why: 'not_found' };
  let at = id;
  let first: { id: string; name: string } | null = null;
  for (let depth = 0; depth < 12; depth += 1) {
    const got = await ask(token, `${DRIVE_FILES}/${encodeURIComponent(at)}?fields=${encodeURIComponent(LOOK_FIELDS)}&supportsAllDrives=true`, meter);
    if (isRateLimit(got.status, got.json) || got.status === 0 || got.status >= 500) {
      return { ok: false, why: 'error', note: `Drive answered ${got.status || 'nothing'}.` };
    }
    if (got.status === 404 || got.status === 403) {
      // The folder itself is not there for us. A folder above one we
      // can read that is not there for us is the top of what we see.
      return first ? { ok: false, why: 'not_shared', name: first.name } : { ok: false, why: 'not_shared', name: null };
    }
    if (got.status !== 200 || !got.json) return { ok: false, why: 'error', note: `Drive answered ${got.status}.` };
    const f = got.json;
    if (!first) {
      if (f.trashed === true || f.mimeType !== FOLDER_MIME) return { ok: false, why: 'not_found' };
      first = { id: String(f.id), name: String(f.name ?? '') };
    }
    // In a shared drive, being able to see it is being a member.
    if (typeof f.sharedWithMeTime === 'string' || f.ownedByMe === true || typeof f.driveId === 'string') {
      return { ok: true, folder: { ...first, shared: true } };
    }
    const parent = Array.isArray(f.parents) && typeof f.parents[0] === 'string' ? f.parents[0] : null;
    if (!parent || !ID.test(parent)) break;
    at = parent;
  }
  return { ok: false, why: 'not_shared', name: first?.name ?? null };
}

/** The Drive facts a Vault row is made from. */
export interface DriveItem {
  id: string;
  name: string;
  mimeType: string;
  size: number | null;
  createdTime: string | null;
  modifiedTime: string | null;
  thumbnailLink: string | null;
  parent: string | null;
  width: number | null;
  height: number | null;
  rotation: number | null;
  taken: string | null;
  durationMs: number | null;
}

const ITEM_FIELDS = 'id,name,mimeType,size,createdTime,modifiedTime,thumbnailLink,parents,'
  + 'imageMediaMetadata(width,height,rotation,time),videoMediaMetadata(width,height,durationMillis)';

const num = (v: unknown): number | null => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

export function shapeItem(f: any): DriveItem {
  const img = f?.imageMediaMetadata ?? null;
  const vid = f?.videoMediaMetadata ?? null;
  return {
    id: String(f?.id ?? ''),
    name: String(f?.name ?? ''),
    mimeType: String(f?.mimeType ?? ''),
    size: num(f?.size),
    createdTime: typeof f?.createdTime === 'string' ? f.createdTime : null,
    modifiedTime: typeof f?.modifiedTime === 'string' ? f.modifiedTime : null,
    thumbnailLink: typeof f?.thumbnailLink === 'string' ? f.thumbnailLink : null,
    parent: Array.isArray(f?.parents) && typeof f.parents[0] === 'string' ? f.parents[0] : null,
    width: num(img?.width ?? vid?.width),
    height: num(img?.height ?? vid?.height),
    rotation: img && Number.isFinite(Number(img.rotation)) ? Number(img.rotation) : null,
    taken: typeof img?.time === 'string' ? img.time : null,
    durationMs: num(vid?.durationMillis),
  };
}

/** How many folders are asked about in one question. */
export const PARENTS_PER_ASK = 20;

export type Page =
  | { ok: true; items: DriveItem[]; shortcuts: number; next: string | null }
  | { ok: false; note: string };

/**
 * One page of what is directly inside these folders: folders, images
 * and videos. `next` is where the page after it starts, or null at
 * the end; it is good for hours, so a listing can be put down between
 * pages and picked up again.
 */
export async function listPage(token: string, parents: readonly string[], pageToken: string | null, meter?: Meter): Promise<Page> {
  // Each id is checked to be letters, digits, dashes and underscores
  // before it is put between the quotes.
  const within = parents.filter((p) => ID.test(p)).map((p) => `'${p}' in parents`).join(' or ');
  if (!within) return { ok: true, items: [], shortcuts: 0, next: null };
  const q = `(${within}) and trashed = false and (mimeType = '${FOLDER_MIME}' or mimeType = '${SHORTCUT_MIME}'`
    + ` or mimeType contains 'image/' or mimeType contains 'video/')`;
  const params = new URLSearchParams({
    q, fields: `nextPageToken,files(${ITEM_FIELDS})`, pageSize: '1000',
    supportsAllDrives: 'true', includeItemsFromAllDrives: 'true', ...(pageToken ? { pageToken } : {}),
  });
  let got = await ask(token, `${DRIVE_FILES}?${params}`, meter);
  // Told to slow down, or a passing fault: once more, a little later.
  if (isRateLimit(got.status, got.json) || got.status === 0 || got.status >= 500) {
    await new Promise((r) => setTimeout(r, 1200));
    got = await ask(token, `${DRIVE_FILES}?${params}`, meter);
  }
  if (got.status !== 200 || !got.json) return { ok: false, note: `Drive answered ${got.status || 'nothing'} while listing.` };
  const items: DriveItem[] = [];
  let shortcuts = 0;
  for (const f of Array.isArray(got.json.files) ? got.json.files : []) {
    if (f?.mimeType === SHORTCUT_MIME) { shortcuts += 1; continue; }
    items.push(shapeItem(f));
  }
  return { ok: true, items, shortcuts, next: typeof got.json.nextPageToken === 'string' ? got.json.nextPageToken : null };
}

type Kids = { ok: true; items: DriveItem[]; shortcuts: number } | { ok: false; note: string };

/** Everything directly inside these folders that is a folder, an
 *  image or a video. Every page of the answer. */
async function childrenOf(token: string, parents: readonly string[], meter?: Meter): Promise<Kids> {
  const items: DriveItem[] = [];
  let shortcuts = 0;
  let pageToken: string | null = null;
  for (let page = 0; page < 200; page += 1) {
    const got = await listPage(token, parents, pageToken, meter);
    if (!got.ok) return got;
    items.push(...got.items);
    shortcuts += got.shortcuts;
    pageToken = got.next;
    if (!pageToken) return { ok: true, items, shortcuts };
  }
  return { ok: false, note: 'A folder has more pages than we will read.' };
}

/** A file found under a root, with the folders it was found through. */
export interface WalkedFile extends DriveItem {
  /** Folder names from the root down to the file's own folder. */
  folders: string[];
}

export type Walk =
  | { ok: true; files: WalkedFile[]; folders: number; shortcuts: number }
  | { ok: false; note: string };

/** The most folders one root is followed through. A tree past this
 *  is not a shoot folder; it is somebody's whole drive. */
export const MAX_FOLDERS = 5000;

/**
 * Every image and video under a folder, however deep.
 *
 * A level at a time, twenty folders to a question, so a shoot with
 * forty subfolders is a handful of questions and not forty. It ends
 * in one of two ways: everything under the root, or a refusal. There
 * is no "most of it", because a file left out of a listing is a file
 * a sync would go on to mark as missing.
 */
export async function walkFolder(token: string, rootId: string, meter?: Meter): Promise<Walk> {
  const files: WalkedFile[] = [];
  const pathOf = new Map<string, string[]>([[rootId, []]]);
  let level = [rootId];
  let shortcuts = 0;
  while (level.length) {
    const next: string[] = [];
    for (let i = 0; i < level.length; i += PARENTS_PER_ASK) {
      const got = await childrenOf(token, level.slice(i, i + PARENTS_PER_ASK), meter);
      if (!got.ok) return got;
      shortcuts += got.shortcuts;
      for (const item of got.items) {
        const above = (item.parent && pathOf.get(item.parent)) || [];
        if (item.mimeType === FOLDER_MIME) {
          // A folder already walked (it has two parents, or Drive
          // listed it twice) is not walked again.
          if (pathOf.has(item.id)) continue;
          pathOf.set(item.id, [...above, item.name]);
          next.push(item.id);
        } else if (isVaultMedia(item.mimeType)) {
          files.push({ ...item, folders: above });
        }
      }
    }
    if (pathOf.size > MAX_FOLDERS) return { ok: false, note: `More than ${MAX_FOLDERS} folders under one root.` };
    level = next;
  }
  return { ok: true, files, folders: pathOf.size, shortcuts };
}

/**
 * Footage Drop and Finished Content, found directly inside a
 * client's Drive Folder. Either may not be there.
 */
export async function findSourceFolders(
  token: string, driveFolderUrl: string | null, meter?: Meter,
): Promise<{ look: FolderLook | null; drop: DriveFolder | null; finished: DriveFolder | null }> {
  const id = driveFolderId(driveFolderUrl);
  if (!id) return { look: null, drop: null, finished: null };
  const look = await lookAtFolder(token, id, meter);
  if (!look.ok) return { look, drop: null, finished: null };
  const params = new URLSearchParams({
    q: `'${id}' in parents and trashed = false and mimeType = '${FOLDER_MIME}'`,
    fields: 'files(id,name)', pageSize: '1000', supportsAllDrives: 'true', includeItemsFromAllDrives: 'true',
  });
  const got = await ask(token, `${DRIVE_FILES}?${params}`, meter);
  if (got.status !== 200 || !got.json) {
    return { look: { ok: false, why: 'error', note: `Drive answered ${got.status || 'nothing'}.` }, drop: null, finished: null };
  }
  const named = (want: string): DriveFolder | null => {
    const f = (got.json.files ?? []).find((x: any) => String(x?.name ?? '').replace(/\s+/g, ' ').trim().toLowerCase() === want);
    return f ? { id: String(f.id), name: String(f.name), shared: true } : null;
  };
  return { look, drop: named(DROP_FOLDER), finished: named(FINISHED_FOLDER) };
}

/* ── one file ─────────────────────────────────────────────────── */

export type OneFile =
  | { ok: true; item: DriveItem; trashed: boolean }
  | { ok: false; gone: boolean; status: number };

/** What Drive says about one file now. Its thumbnail address is good
 *  for a few hours, so one that is needed later is asked for again. */
export async function driveItem(token: string, fileId: string, meter?: Meter): Promise<OneFile> {
  if (!ID.test(fileId)) return { ok: false, gone: true, status: 400 };
  const got = await ask(token, `${DRIVE_FILES}/${encodeURIComponent(fileId)}?fields=${encodeURIComponent(`${ITEM_FIELDS},trashed`)}&supportsAllDrives=true`, meter);
  if (isRateLimit(got.status, got.json)) return { ok: false, gone: false, status: got.status };
  if (got.status === 404 || got.status === 403) return { ok: false, gone: true, status: got.status };
  if (got.status !== 200 || !got.json) return { ok: false, gone: false, status: got.status };
  return { ok: true, item: shapeItem(got.json), trashed: got.json.trashed === true };
}

/**
 * Drive's own drawing of a file at `px` on its long edge, as a
 * response whose body has not been read, or null.
 *
 * The address carries its own signature and is fetched plain: the
 * bearer token is not sent anywhere it is not needed.
 */
export async function driveDrawing(link: string | null, px: number, meter?: Meter): Promise<Response | null> {
  const url = thumbnailAt(link, px);
  if (!url) return null;
  if (meter) meter.calls += 1;
  const res = await fetch(url).catch(() => null);
  if (!res || !res.ok) { try { await res?.body?.cancel(); } catch { /* nothing to free */ } return null; }
  return res;
}
