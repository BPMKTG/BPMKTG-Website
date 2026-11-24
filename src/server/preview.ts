/* ──────────────────────────────────────────────────────────────
   The preview service: a Drive file in, our own copy in R2 out.

   SERVER ONLY. The rules are in src/data/preview.ts; this file is the
   part that talks to Google Drive (as the read-only service account),
   to Cloudflare Stream (the video converter) and to R2.

   One function does the work, `advancePreview`. It is given a link,
   what is already recorded about that link's preview, and a way to
   record what happens next, and it takes ONE step:

     an image         fetched from Drive at two sizes, stored. Done.
     a video, first   uploaded to the converter. Recorded as Converting.
     a video, later   the converter is asked how it is getting on.
                      When the MP4 is ready it is copied into R2 with
                      a poster, the converter's copy is deleted, and
                      it is recorded as Ready.

   One maker at a time. A step that is about to make or record
   something takes the item's claim first (see claimKey), so two
   looks at the same card a moment apart make one preview, not two.

   One step per call, because a conversion takes a minute or two and a
   request should not sit open for it, and because a Pages Function
   has no clock of its own: there is no job runner here. Whoever looks
   at the item next (a page that is open and waiting, HQ loading, the
   client opening the card) moves it on. That also makes it heal
   itself: a preview whose file has gone missing is rebuilt by the
   next look.

   It knows nothing about content cards. A card's six Notion fields
   are read and written by the small adapter at the bottom, and
   anything else with a Drive link (the Content Vault) can bring its
   own.

   What is never done here: the original is never served, a Drive
   address is never handed to a browser, and a missing credential is
   never recorded as a failure of the file.
   ────────────────────────────────────────────────────────────── */

import {
  CONVERT_TIMEOUT_MS, IMAGE_PX, MAX_VIDEO_BYTES, PREVIEW_FIELDS, THUMB_PX, UPLOAD_CHUNK,
  claimBody, claimIsStale, claimKey, failureDetail, fileKind, jobDetail, parseClaim, parseJob, planPreview,
  previewKey, probeMp4, readyDetail,
  type PreviewJob, type StoredPreview,
} from '../data/preview';
import { imageSize } from '../data/slides';
import { accessToken, googleCredentials, thumbnailAt } from './google-drive';

const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const CF_API = 'https://api.cloudflare.com/client/v4/accounts';

export interface PreviewEnv {
  GOOGLE_SERVICE_ACCOUNT_JSON?: string;
  /** The account id the site already has, for PDF rendering. The
   *  longer name is read too, in case that is the one that was set. */
  CF_ACCOUNT_ID?: string;
  CLOUDFLARE_ACCOUNT_ID?: string;
  CLOUDFLARE_STREAM_TOKEN?: string;
  REPORTS_BUCKET?: R2Bucket;
}

/** The thing a preview is for. `owner` is a client's slug. */
export interface PreviewSubject {
  owner: string;
  itemId: string;
  title: string;
  link: string | null;
  stored: StoredPreview;
}

export type PreviewOutcome =
  /** Nothing to do: no Drive link, already ready, or a failure nobody
   *  has asked to retry. */
  | 'idle'
  | 'ready'
  | 'converting'
  | 'failed'
  /** A secret or a binding is missing. Nothing was recorded. */
  | 'not_configured'
  /** Drive or the converter did not answer. Nothing was recorded, so
   *  the next look tries again. */
  | 'try_later'
  /** Another look is making this one, or has just made it. This look
   *  did nothing; `stored` is the record as it now stands. */
  | 'busy';

export interface PreviewResult { outcome: PreviewOutcome; stored: StoredPreview; note?: string }

type Save = (next: StoredPreview) => Promise<boolean>;

/* ── small things ─────────────────────────────────────────────── */

function newVersion(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/** A body of known length, as a stream where the runtime can do that
 *  and as bytes where it cannot. R2 and the converter both need to be
 *  told the length up front; a Worker can pass a stream straight
 *  through without holding the file, which is the point for a video. */
async function sized(res: Response): Promise<{ body: ReadableStream | ArrayBuffer; length: number; done: Promise<unknown> }> {
  const length = Number(res.headers.get('Content-Length'));
  const Fixed = (globalThis as any).FixedLengthStream;
  if (res.body && Number.isFinite(length) && length > 0 && typeof Fixed === 'function') {
    const pipe = new Fixed(length);
    return { body: pipe.readable, length, done: res.body.pipeTo(pipe.writable) };
  }
  const bytes = await res.arrayBuffer();
  return { body: bytes, length: bytes.byteLength, done: Promise.resolve() };
}

async function putFrom(bucket: R2Bucket, key: string, res: Response, contentType: string): Promise<number> {
  const { body, length, done } = await sized(res);
  await Promise.all([bucket.put(key, body as any, { httpMetadata: { contentType } }), done]);
  return length;
}

async function drop(bucket: R2Bucket, keys: Array<string | null | undefined>): Promise<void> {
  const real = keys.filter((k): k is string => typeof k === 'string' && k.startsWith('previews/'));
  if (!real.length) return;
  try { await bucket.delete(real); } catch (err) { console.error('preview: could not delete old files', err); }
}

/* ── Drive ────────────────────────────────────────────────────── */

interface DriveMeta {
  id: string; name: string; mimeType: string; size: number | null; thumbnailLink: string | null; trashed: boolean;
}

type DriveAnswer =
  | { ok: true; file: DriveMeta }
  /** The file is not there for us: not shared, deleted, or no such id. */
  | { ok: false; gone: true; status: number }
  /** Drive is having a moment. */
  | { ok: false; gone: false; status: number };

async function driveMeta(token: string, fileId: string): Promise<DriveAnswer> {
  const params = new URLSearchParams({
    fields: 'id,name,mimeType,size,thumbnailLink,trashed',
    supportsAllDrives: 'true',
  });
  const res = await fetch(`${DRIVE_FILES}/${encodeURIComponent(fileId)}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).catch(() => null);
  if (!res) return { ok: false, gone: false, status: 0 };
  if (res.status === 404 || res.status === 403) return { ok: false, gone: true, status: res.status };
  if (!res.ok) return { ok: false, gone: false, status: res.status };
  const f: any = await res.json().catch(() => null);
  const size = Number(f?.size);
  return { ok: true, file: {
    id: String(f?.id ?? fileId),
    name: String(f?.name ?? ''),
    mimeType: String(f?.mimeType ?? ''),
    size: Number.isFinite(size) && size > 0 ? size : null,
    thumbnailLink: typeof f?.thumbnailLink === 'string' ? f.thumbnailLink : null,
    trashed: f?.trashed === true,
  } };
}

/** Drive's own rendition at `px` on the long edge. These links carry
 *  their own signature and are fetched plain: the bearer token is not
 *  sent anywhere it is not needed. */
async function driveRendition(link: string | null, px: number): Promise<Response | null> {
  const url = thumbnailAt(link, px);
  if (!url) return null;
  const res = await fetch(url).catch(() => null);
  return res && res.ok ? res : null;
}

/* ── the converter (Cloudflare Stream) ────────────────────────── */

interface StreamConfig { account: string; token: string }

function streamConfig(env: PreviewEnv): StreamConfig | null {
  const account = (env.CF_ACCOUNT_ID || env.CLOUDFLARE_ACCOUNT_ID || '').trim();
  const token = (env.CLOUDFLARE_STREAM_TOKEN ?? '').trim();
  return /^[0-9a-f]{32}$/i.test(account) && token ? { account, token } : null;
}

const streamUrl = (c: StreamConfig, path = ''): string => `${CF_API}/${c.account}/stream${path}`;
const streamAuth = (c: StreamConfig): Record<string, string> => ({ Authorization: `Bearer ${c.token}` });

async function streamJson(c: StreamConfig, path: string, init: RequestInit = {}): Promise<{ status: number; result: any; errors: string }> {
  const res = await fetch(streamUrl(c, path), {
    ...init,
    headers: { ...streamAuth(c), ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(init.headers ?? {}) },
  }).catch(() => null);
  if (!res) return { status: 0, result: null, errors: 'no answer' };
  const json: any = await res.json().catch(() => null);
  const errors = Array.isArray(json?.errors) ? json.errors.map((e: any) => String(e?.message ?? '')).filter(Boolean).join('; ') : '';
  return { status: res.status, result: json?.result ?? null, errors };
}

const b64 = (text: string): string => {
  let s = '';
  for (const b of new TextEncoder().encode(text)) s += String.fromCharCode(b);
  return btoa(s);
};

/**
 * Send one Drive file to the converter, in pieces, and return its job
 * id there.
 *
 * Pulled from Drive a piece at a time with a Range request and pushed
 * straight on, so the file is never held whole. The converter's copy
 * needs a signed address to be watched or downloaded, so it is not
 * public for the few minutes it exists.
 */
async function uploadToConverter(
  c: StreamConfig, googleToken: string, file: DriveMeta, name: string,
): Promise<{ ok: true; job: string } | { ok: false; why: string; retry: boolean }> {
  const total = file.size ?? 0;
  const create = await fetch(streamUrl(c), {
    method: 'POST',
    headers: {
      ...streamAuth(c),
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(total),
      'Upload-Metadata': `name ${b64(name.slice(0, 120) || 'preview')},requiresignedurls`,
    },
  }).catch(() => null);
  if (!create) return { ok: false, why: 'The converter did not answer.', retry: true };
  if (create.status === 401 || create.status === 403) {
    return { ok: false, why: 'The converter refused our key. Check CLOUDFLARE_STREAM_TOKEN has Stream edit rights and Stream is turned on.', retry: true };
  }
  const location = create.headers.get('Location');
  const job = create.headers.get('stream-media-id') ?? '';
  if (create.status !== 201 || !location || !/^[0-9a-f]{32}$/.test(job)) {
    const detail = (await create.text().catch(() => '')).slice(0, 160);
    // Out of prepaid minutes reads as a 4xx with a message. It is our
    // account, not the file, so it is not held against the file.
    return { ok: false, why: `The converter would not take the upload (${create.status}). ${detail}`.trim(), retry: true };
  }
  const target = new URL(location, streamUrl(c)).toString();

  for (let offset = 0; offset < total; offset += UPLOAD_CHUNK) {
    const end = Math.min(offset + UPLOAD_CHUNK, total) - 1;
    const part = await fetch(`${DRIVE_FILES}/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`, {
      headers: { Authorization: `Bearer ${googleToken}`, Range: `bytes=${offset}-${end}` },
    }).catch(() => null);
    if (!part || (part.status !== 206 && part.status !== 200)) {
      await streamJson(c, `/${job}`, { method: 'DELETE' });
      return { ok: false, why: `Drive would not send the file (${part?.status ?? 'no answer'}). Try again.`, retry: false };
    }
    const { body, done } = await sized(part);
    const [sent] = await Promise.all([
      fetch(target, {
        method: 'PATCH',
        headers: {
          ...streamAuth(c),
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': String(offset),
          'Content-Type': 'application/offset+octet-stream',
        },
        body: body as any,
      }).catch(() => null),
      done.catch(() => null),
    ]);
    if (!sent || sent.status !== 204) {
      await streamJson(c, `/${job}`, { method: 'DELETE' });
      return { ok: false, why: `The upload to the converter stopped part way (${sent?.status ?? 'no answer'}). Try again.`, retry: false };
    }
  }
  return { ok: true, job };
}

/** A signed, short-lived name for the converter's copy, good for
 *  fetching its MP4 and its thumbnails. */
async function converterToken(c: StreamConfig, job: string): Promise<string | null> {
  const got = await streamJson(c, `/${job}/token`, {
    method: 'POST',
    body: JSON.stringify({ downloadable: true, exp: Math.floor(Date.now() / 1000) + 1800 }),
  });
  const token = typeof got.result?.token === 'string' ? got.result.token : '';
  return token || null;
}

/* ── the claim ────────────────────────────────────────────────── */

interface Claim { key: string; token: string }

/** `claim` is null when there was nowhere to put one, and the step
 *  goes ahead without, as it did before there were claims. */
type Taken = { ok: true; claim: Claim | null } | { ok: false };

/**
 * Take an item's claim, or find it taken.
 *
 * R2 is asked to store the file only if there is none, which it
 * decides for everyone at once: of any number asking in the same
 * moment, one is told yes. A claim that was never let go (its step
 * was cut off) is taken over once it is old, and only by one taker,
 * by writing over exactly the file that was read.
 *
 * It never stands in the way of a preview being made at all. If R2
 * cannot be asked, or answers in a way that makes no sense (refused,
 * with nothing there), the step goes ahead unclaimed and says so in
 * the log: a preview made twice is better than one never made.
 */
async function takeClaim(bucket: R2Bucket, owner: string, itemId: string, now: number): Promise<Taken> {
  const key = claimKey(owner, itemId);
  if (!key) return { ok: true, claim: null };
  const token = newVersion();
  const body = claimBody({ token, at: now });
  const meta = { httpMetadata: { contentType: 'application/json' } };
  // Ours only if it is ours when read back: the last word on who
  // holds it is the file, not what the write said.
  const confirm = async (): Promise<Taken> => {
    const there = await bucket.get(key);
    const held = there ? parseClaim(await there.json().catch(() => null)) : null;
    return held?.token === token ? { ok: true, claim: { key, token } } : { ok: false };
  };
  try {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const made = await bucket.put(key, body, { ...meta, onlyIf: new Headers({ 'If-None-Match': '*' }) });
      if (made) return await confirm();
      const there = await bucket.get(key);
      // Let go between the two. Ask once more.
      if (!there) continue;
      const held = parseClaim(await there.json().catch(() => null));
      if (!claimIsStale(held, now)) return { ok: false };
      const took = await bucket.put(key, body, { ...meta, onlyIf: { etagMatches: there.etag } });
      return took ? await confirm() : { ok: false };
    }
    console.error('preview: a claim was refused twice with nothing there, going ahead without one', key);
    return { ok: true, claim: null };
  } catch (err) {
    console.error('preview: could not take a claim, going ahead without one', key, err);
    return { ok: true, claim: null };
  }
}

/** Let a claim go, if it is still ours. One that was taken over
 *  because this step ran long belongs to whoever took it. */
async function releaseClaim(bucket: R2Bucket, claim: Claim): Promise<void> {
  try {
    const there = await bucket.get(claim.key);
    const held = there ? parseClaim(await there.json().catch(() => null)) : null;
    if (held?.token === claim.token) await bucket.delete(claim.key);
  } catch (err) {
    console.error('preview: could not let a claim go', claim.key, err);
  }
}

/* ── the one step ─────────────────────────────────────────────── */

const same = (a: StoredPreview, b: StoredPreview): boolean =>
  a.status === b.status && a.imageKey === b.imageKey && a.thumbKey === b.thumbKey
  && a.videoKey === b.videoKey && a.source === b.source && a.detail === b.detail;

export interface AdvanceOptions {
  force?: boolean;
  verify?: boolean;
  now?: number;
  /**
   * The record as it stands this moment, read again from where it is
   * kept; null when it could not be read.
   *
   * Give this when the record is kept somewhere that writes whatever
   * it is handed (a card's six fields in Notion). It turns the claim
   * on: before the step makes or records anything it takes the
   * item's claim and reads the record again, and if another look has
   * moved it on since `subject.stored` was read, this one stands
   * down. Leave it out when the record has its own way of refusing a
   * late write (a slide in its manifest).
   */
  reread?: () => Promise<StoredPreview | null>;
}

/** Null to go ahead; otherwise the answer to give instead. */
type Hold = () => Promise<PreviewResult | null>;

/**
 * Move one preview on by one step. See the top of the file.
 *
 * `force` is "try again", from HQ. `verify` is "the page tried to play
 * it and could not": a Ready preview is checked against R2 and
 * rebuilt if its files are not there, which is what happens when a
 * preview was recorded by one environment and is being read in
 * another.
 */
export async function advancePreview(
  env: PreviewEnv, subject: PreviewSubject, save: Save, opts: AdvanceOptions = {},
): Promise<PreviewResult> {
  const now = opts.now ?? Date.now();
  const bucket = env.REPORTS_BUCKET;
  const { reread } = opts;
  const mine: { claim: Claim | null } = { claim: null };
  let held = false;

  // Asked for only by a step that is about to make or record
  // something, so a look that finds nothing to do, or a conversion
  // still running, costs nothing more than it did.
  const hold: Hold = async () => {
    if (held || !reread || !bucket) return null;
    const taken = await takeClaim(bucket, subject.owner, subject.itemId, now);
    if (!taken.ok) return { outcome: 'busy', stored: subject.stored };
    mine.claim = taken.claim;
    held = true;
    // The claim says nobody else is at work now. It does not say
    // nobody finished a moment ago, after this look read the record.
    const standing = await reread();
    if (!standing) return { outcome: 'try_later', stored: subject.stored, note: 'The preview record could not be read again.' };
    return same(standing, subject.stored) ? null : { outcome: 'busy', stored: standing };
  };

  try {
    return await takeStep(env, subject, save, opts, now, hold);
  } finally {
    if (mine.claim && bucket) await releaseClaim(bucket, mine.claim);
  }
}

async function takeStep(
  env: PreviewEnv, subject: PreviewSubject, save: Save, opts: AdvanceOptions, now: number, hold: Hold,
): Promise<PreviewResult> {
  const { stored } = subject;
  const bucket = env.REPORTS_BUCKET;
  const finish = async (next: StoredPreview, outcome: PreviewOutcome, note?: string): Promise<PreviewResult> => {
    if (same(next, stored)) return { outcome, stored, note };
    const ok = await save(next);
    return ok ? { outcome, stored: next, note } : { outcome: 'try_later', stored, note: 'The preview could not be recorded.' };
  };
  const fail = async (fileId: string, why: string): Promise<PreviewResult> => {
    const lost = await hold();
    if (lost) return lost;
    const next: StoredPreview = {
      status: 'Failed', imageKey: null, thumbKey: null, videoKey: null, source: fileId, detail: failureDetail(why),
    };
    const ok = await save(next);
    return ok ? { outcome: 'failed', stored: next, note: why } : { outcome: 'try_later', stored, note: 'The preview could not be recorded.' };
  };

  let step = planPreview(subject.link, stored, now, { force: opts.force });

  if (step.do === 'none' && opts.verify && stored.status === 'Ready' && bucket) {
    const key = stored.videoKey ?? stored.imageKey;
    const there = key ? await bucket.head(key).catch(() => null) : null;
    if (!there) step = planPreview(subject.link, stored, now, { force: true });
  }

  if (step.do === 'none') return { outcome: stored.status === 'Ready' ? 'ready' : stored.status === 'Failed' ? 'failed' : 'idle', stored };
  if (step.do === 'wait') return { outcome: 'converting', stored };
  if (step.do === 'fail') return fail(stored.source ?? '', step.why);

  if (!bucket) return { outcome: 'not_configured', stored, note: 'The R2 bucket is not bound.' };

  /* ── a conversion in progress ── */
  if (step.do === 'check') {
    const c = streamConfig(env);
    if (!c) return { outcome: 'not_configured', stored, note: 'CF_ACCOUNT_ID or CLOUDFLARE_STREAM_TOKEN is not set.' };
    const { job } = step;
    const info = await streamJson(c, `/${job.job}`);
    if (info.status === 404) return fail(step.fileId, 'The converter no longer has this video. Try again.');
    if (info.status !== 200 || !info.result) return { outcome: 'try_later', stored, note: `The converter answered ${info.status}.` };
    const state = String(info.result?.status?.state ?? '');
    if (state === 'error') {
      const lost = await hold();
      if (lost) return lost;
      await streamJson(c, `/${job.job}`, { method: 'DELETE' });
      const reason = String(info.result?.status?.errorReasonText ?? info.result?.status?.errorReasonCode ?? 'It could not read the file.');
      return fail(step.fileId, `The converter could not convert this video. ${reason}`);
    }
    if (info.result.readyToStream !== true) return { outcome: 'converting', stored, note: `Converting (${state || 'queued'}).` };

    // Converted. Ask for the MP4, which is made on request.
    let dl = await streamJson(c, `/${job.job}/downloads`);
    if (!dl.result?.default) {
      dl = await streamJson(c, `/${job.job}/downloads`, { method: 'POST' });
      if (dl.status >= 400) return { outcome: 'try_later', stored, note: `The converter would not make the MP4 (${dl.status}). ${dl.errors}` };
    }
    const mp4 = dl.result?.default;
    if (String(mp4?.status ?? '') === 'error') {
      const lost = await hold();
      if (lost) return lost;
      await streamJson(c, `/${job.job}`, { method: 'DELETE' });
      return fail(step.fileId, 'The converter could not make an MP4 of this video.');
    }
    if (String(mp4?.status ?? '') !== 'ready' || typeof mp4?.url !== 'string') {
      return { outcome: 'converting', stored, note: 'Making the MP4.' };
    }

    // The MP4 is ready to bring home: one look does that. A second
    // that got here at the same moment would find the converter's
    // copy deleted under it and record a failure over a good preview.
    const lost = await hold();
    if (lost) return lost;

    const token = await converterToken(c, job.job);
    if (!token) return { outcome: 'try_later', stored, note: 'The converter would not sign a download.' };
    const signed = (url: string): string => url.replace(job.job, token);

    const videoKey = previewKey(subject.owner, subject.itemId, job.version, 'video');
    const imageKey = previewKey(subject.owner, subject.itemId, job.version, 'image');
    const thumbKey = previewKey(subject.owner, subject.itemId, job.version, 'thumb');
    if (!videoKey || !imageKey || !thumbKey) return fail(step.fileId, 'This item has no valid id to file a preview under.');

    const file = await fetch(signed(mp4.url)).catch(() => null);
    if (!file || !file.ok) return { outcome: 'try_later', stored, note: `The MP4 would not download (${file?.status ?? 'no answer'}).` };
    const bytes = await putFrom(bucket, videoKey, file, 'video/mp4');

    // The poster: a frame a little way in, so it is not a black first
    // frame. Kept whole and no larger than the video.
    let poster = false;
    let thumb = false;
    const frameUrl = typeof info.result.thumbnail === 'string' ? info.result.thumbnail : null;
    const at = Math.max(0, Math.min(2, Math.floor(Number(info.result.duration) / 2) || 0));
    if (frameUrl) {
      for (const [key, px] of [[imageKey, 1920], [thumbKey, THUMB_PX]] as const) {
        const u = new URL(signed(frameUrl));
        u.search = new URLSearchParams({ time: `${at}s`, width: String(px), height: String(px), fit: 'clip' }).toString();
        const img = await fetch(u.toString()).catch(() => null);
        if (img && img.ok) {
          await putFrom(bucket, key, img, img.headers.get('Content-Type') || 'image/jpeg');
          if (key === imageKey) poster = true; else thumb = true;
        }
      }
    }

    const head = await bucket.get(videoKey, { range: { offset: 0, length: 2 * 1024 * 1024 } }).catch(() => null);
    const facts = head ? probeMp4(new Uint8Array(await head.arrayBuffer())) : null;

    await streamJson(c, `/${job.job}`, { method: 'DELETE' });
    const old = [stored.imageKey, stored.thumbKey, stored.videoKey].filter((k) => k && k !== videoKey && k !== imageKey && k !== thumbKey);
    const done = await finish({
      status: 'Ready', videoKey, imageKey: poster ? imageKey : null, thumbKey: thumb ? thumbKey : null,
      source: step.fileId, detail: readyDetail('video', bytes, facts),
    }, 'ready');
    if (done.outcome === 'ready') await drop(bucket, old);
    return done;
  }

  /* ── from the start ── */
  const creds = googleCredentials(env);
  if (!creds) return { outcome: 'not_configured', stored, note: 'GOOGLE_SERVICE_ACCOUNT_JSON is not set.' };
  let google: string;
  try { google = await accessToken(creds); } catch (err) {
    console.error('preview: Google refused the key', err);
    return { outcome: 'not_configured', stored, note: 'Google refused the service account key.' };
  }

  // From here on something is made. One look makes it.
  const lost = await hold();
  if (lost) return lost;

  const meta = await driveMeta(google, step.fileId);
  if (!meta.ok) {
    if (!meta.gone) return { outcome: 'try_later', stored, note: `Drive answered ${meta.status}.` };
    return fail(step.fileId, `Drive will not show us this file. Share it, or the folder it is in, with ${creds.clientEmail} as a Viewer.`);
  }
  const { file } = meta;
  if (file.trashed) return fail(step.fileId, 'This file is in the Drive trash.');
  const kind = fileKind(file.mimeType);
  if (!kind) return fail(step.fileId, `"${file.name}" is a ${file.mimeType || 'file of an unknown type'}. Only an image or a video has a preview.`);

  const version = newVersion();
  const imageKey = previewKey(subject.owner, subject.itemId, version, 'image');
  const thumbKey = previewKey(subject.owner, subject.itemId, version, 'thumb');
  if (!imageKey || !thumbKey) return fail(step.fileId, 'This item has no valid id to file a preview under.');
  const old = [stored.imageKey, stored.thumbKey, stored.videoKey];

  if (kind === 'image') {
    const big = await driveRendition(file.thumbnailLink, IMAGE_PX);
    if (!big) return fail(step.fileId, `Drive has not made a web-sized copy of "${file.name}" yet. Try again in a few minutes.`);
    const bytes = await putFrom(bucket, imageKey, big, big.headers.get('Content-Type') || 'image/jpeg');
    const small = await driveRendition(file.thumbnailLink, THUMB_PX);
    if (small) await putFrom(bucket, thumbKey, small, small.headers.get('Content-Type') || 'image/jpeg');
    // How big the copy is, read back from its own first bytes, so a
    // frame can be drawn the right shape before the picture loads.
    const start = await bucket.get(imageKey, { range: { offset: 0, length: 256 * 1024 } }).catch(() => null);
    const size = start ? imageSize(new Uint8Array(await start.arrayBuffer())) : null;
    const done = await finish({
      status: 'Ready', imageKey, thumbKey: small ? thumbKey : null, videoKey: null,
      source: step.fileId, detail: readyDetail('image', bytes, null, size),
    }, 'ready');
    if (done.outcome === 'ready') await drop(bucket, old);
    return done;
  }

  /* a video */
  const c = streamConfig(env);
  if (!c) return { outcome: 'not_configured', stored, note: 'CF_ACCOUNT_ID or CLOUDFLARE_STREAM_TOKEN is not set.' };
  if (!file.size) return fail(step.fileId, `Drive does not know the size of "${file.name}". It may still be uploading.`);
  if (file.size > MAX_VIDEO_BYTES) {
    return fail(step.fileId, `"${file.name}" is ${(file.size / 1024 / 1024 / 1024).toFixed(1)} GB. Export a version under ${Math.round(MAX_VIDEO_BYTES / 1024 / 1024)} MB and link that.`);
  }

  // Recorded as Converting BEFORE the upload, so a second look while
  // it is going up waits instead of uploading it again.
  const job: PreviewJob = { version, started: now, job: null };
  const claimed: StoredPreview = {
    status: 'Converting', imageKey: stored.imageKey, thumbKey: stored.thumbKey, videoKey: stored.videoKey,
    source: step.fileId, detail: jobDetail(job),
  };
  if (!(await save(claimed))) return { outcome: 'try_later', stored, note: 'The preview could not be recorded.' };

  const sent = await uploadToConverter(c, google, file, `${subject.owner} · ${subject.title}`);
  if (!sent.ok) {
    console.error('preview: upload failed', subject.itemId, sent.why);
    // Stopped part way: recorded as a failure with "try again", or
    // every look at the card would send the whole file again.
    if (!sent.retry) return fail(step.fileId, sent.why);
    // Refused at the door (our key, our account): nothing went up, so
    // it is put back as it was and the next look asks again.
    await save(stored);
    return { outcome: 'try_later', stored, note: sent.why };
  }
  const next: StoredPreview = { ...claimed, detail: jobDetail({ ...job, job: sent.job }) };
  if (!(await save(next))) {
    await streamJson(c, `/${sent.job}`, { method: 'DELETE' });
    return { outcome: 'try_later', stored: claimed, note: 'The conversion could not be recorded.' };
  }
  return { outcome: 'converting', stored: next, note: 'Uploaded. Converting.' };
}

/**
 * Clear away what one preview has made: its files in R2, and the
 * converter's copy if a conversion was still running. For a preview
 * whose subject has gone (a slide taken out of a post), so nothing
 * is left behind that nobody will ever look at, or pay to keep.
 */
export async function discardPreview(env: PreviewEnv, stored: StoredPreview): Promise<void> {
  if (env.REPORTS_BUCKET) await drop(env.REPORTS_BUCKET, [stored.imageKey, stored.thumbKey, stored.videoKey]);
  const job = stored.status === 'Converting' ? parseJob(stored.detail) : null;
  const c = streamConfig(env);
  if (job?.job && c) await streamJson(c, `/${job.job}`, { method: 'DELETE' });
}

/** How long a page should wait before asking again. */
export const PREVIEW_POLL_MS = 5000;
export { CONVERT_TIMEOUT_MS };

/* ── a content card's preview, in Notion ──────────────────────── */

const rich = (text: string | null): Record<string, unknown> =>
  ({ rich_text: text ? [{ text: { content: text.slice(0, 1900) } }] : [] });

export { readStoredPreview } from './portal-notion';

/** The six preview fields and nothing else. A preview is not an edit
 *  of the card, so Last Edited By is left exactly as it was. */
export function storedPreviewProperties(s: StoredPreview): Record<string, unknown> {
  return {
    [PREVIEW_FIELDS.status]: { select: s.status ? { name: s.status } : null },
    [PREVIEW_FIELDS.image]: rich(s.imageKey),
    [PREVIEW_FIELDS.thumb]: rich(s.thumbKey),
    [PREVIEW_FIELDS.video]: rich(s.videoKey),
    [PREVIEW_FIELDS.source]: rich(s.source),
    [PREVIEW_FIELDS.detail]: rich(s.detail),
  };
}
