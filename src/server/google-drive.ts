/* ──────────────────────────────────────────────────────────────
   Google Drive, read-only, as a service account.

   SERVER ONLY. Never reached by a client request: the only callers
   are the admin Publish and Regenerate endpoints.

   Why a service account and not an OAuth app: nobody has to be signed
   in for a report to render. A Pages Function runs with no user, at a
   time nobody chose, and the thing it needs is one folder per client
   that Mason has deliberately shared with one robot address. That is
   the whole access model, and it has two properties worth keeping:

     the folders stay private       no "anyone with the link"
     revoking is one Drive click    unshare the folder, done

   The credential is a Pages secret, GOOGLE_SERVICE_ACCOUNT_JSON, and
   the scope asked for is drive.readonly. A key that can only read is
   the right key for a job that only reads, and it means the worst case
   for a leaked secret is "someone saw the client's photos", not
   "someone emptied the client's Drive".
   ────────────────────────────────────────────────────────────── */

/** Read, and nothing else. */
const SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';

/** An access token is good for an hour; we ask for one per action and
 *  never store it. A publish happens a few times a month. */
const TOKEN_TTL_SECONDS = 3600;

/** The subfolder a cover is read from. Matched case-insensitively,
 *  because "Report covers" and "REPORT COVERS" are the same folder to
 *  everyone except a string comparison. */
export const COVERS_FOLDER = 'report covers';

/** The image types a cover may be. A HEIC off an iPhone is not here
 *  on purpose: Chrome cannot decode one, so accepting it would put a
 *  broken image on a cover and call it success. */
export const COVER_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
] as const;

/** Wider than the frame needs at 2x (688x400 CSS, so 1376x800 device
 *  pixels), which leaves room for the layout to grow without anyone
 *  having to re-upload a photo. */
export const COVER_WIDTH = 2400;

/** Asked for when 2400 does not come back.
 *
 *  Drive renders its own images on demand, and on a very large
 *  original it sometimes declines the biggest size and serves a
 *  smaller one happily. Sean's first cover is a 29MB camera JPEG, so
 *  this is not a hypothetical. 1600 is still comfortably above the
 *  1376 device pixels the frame actually uses, so the retry costs
 *  nothing anybody can see. */
export const COVER_FALLBACK_WIDTH = 1600;

/** A hard ceiling on what we will pull out of Drive and put in R2.
 *  Drive's own 2400px rendition is a few hundred kilobytes; this only
 *  fires when we have fallen back to the original file, and it is
 *  there so one 60-megapixel RAW export cannot make a render crawl. */
export const MAX_COVER_BYTES = 10 * 1024 * 1024;

export interface GoogleCredentials {
  clientEmail: string;
  privateKey: string;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string | null;
  /** Drive's own resized rendition. Short-lived and unauthenticated,
   *  which is exactly what makes it useful: it is already a small JPEG
   *  and a Worker cannot resize one itself. */
  thumbnailLink: string | null;
  size: number | null;
}

/* ── the credential ───────────────────────────────────────────── */

/**
 * The service account out of the secret, or null.
 *
 * Null rather than throwing, because every caller's answer to "no
 * Google credential" is the same: fall back to the Hero Photo and log
 * it. A missing secret is a deployment that has not been set up yet,
 * not an error in a render.
 */
export function googleCredentials(env: { GOOGLE_SERVICE_ACCOUNT_JSON?: string }): GoogleCredentials | null {
  const raw = (env.GOOGLE_SERVICE_ACCOUNT_JSON ?? '').trim();
  if (!raw) return null;

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.error('drive: GOOGLE_SERVICE_ACCOUNT_JSON is not JSON');
    return null;
  }

  const clientEmail = typeof parsed?.client_email === 'string' ? parsed.client_email : '';
  const privateKey = typeof parsed?.private_key === 'string' ? parsed.private_key : '';
  if (!clientEmail || !privateKey.includes('PRIVATE KEY')) {
    console.error('drive: GOOGLE_SERVICE_ACCOUNT_JSON has no client_email or private_key');
    return null;
  }

  return { clientEmail, privateKey };
}

/** The address Mason shares each folder with. Safe to print in an
 *  admin answer: it is an identifier, not a secret, and knowing it
 *  grants nothing. */
export function serviceAccountEmail(env: { GOOGLE_SERVICE_ACCOUNT_JSON?: string }): string | null {
  return googleCredentials(env)?.clientEmail ?? null;
}

/* ── signing ──────────────────────────────────────────────────── */

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const b64urlText = (text: string): string => b64url(new TextEncoder().encode(text));

/** PEM to the DER bytes WebCrypto wants. */
export function pkcs8Bytes(pem: string): Uint8Array {
  const body = pem.replace(/-----[^-]*-----/g, '').replace(/\s+/g, '');
  const raw = atob(body);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

/** The claim set Google wants for a service-account grant. Its own
 *  function so a test can read it without signing anything. */
export function assertionClaims(clientEmail: string, now = Date.now()) {
  const iat = Math.floor(now / 1000);
  return {
    iss: clientEmail,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat,
    exp: iat + TOKEN_TTL_SECONDS,
  };
}

async function signedAssertion(creds: GoogleCredentials, now = Date.now()): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const body = `${b64urlText(JSON.stringify(header))}.${b64urlText(JSON.stringify(assertionClaims(creds.clientEmail, now)))}`;

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pkcs8Bytes(creds.privateKey),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(body),
  );

  return `${body}.${b64url(new Uint8Array(sig))}`;
}

/**
 * An access token, or a thrown error naming what Google said.
 *
 * Throws rather than returning null because by this point we have a
 * credential and a folder and the caller asked for a photo; "the key
 * is rejected" is something Mason needs to read, not something to
 * swallow. The caller catches it and falls back.
 */
export async function accessToken(creds: GoogleCredentials, now = Date.now()): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await signedAssertion(creds, now),
    }),
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`Google refused the service account key (${res.status}). ${detail}`);
  }

  const json: any = await res.json().catch(() => null);
  const token = typeof json?.access_token === 'string' ? json.access_token : '';
  if (!token) throw new Error('Google returned no access token');
  return token;
}

/* ── folder ids ───────────────────────────────────────────────── */

/**
 * The folder id out of whatever Drive URL was pasted into Notion.
 *
 * Handles the three shapes Drive hands out, and refuses anything else
 * rather than guessing: a Sheet URL pasted into Client Folder by
 * mistake should come back null and fall through to the Hero Photo,
 * not send a query naming a spreadsheet as a parent.
 */
export function driveFolderId(raw: string | null | undefined): string | null {
  const url = (raw ?? '').trim();
  if (!url) return null;

  const patterns = [
    /drive\.google\.com\/drive\/(?:u\/\d+\/)?folders\/([A-Za-z0-9_-]{10,})/,
    /drive\.google\.com\/open\?(?:[^#]*&)?id=([A-Za-z0-9_-]{10,})/,
    /drive\.google\.com\/drive\/(?:u\/\d+\/)?mobile\/folders\/([A-Za-z0-9_-]{10,})/,
  ];
  for (const re of patterns) {
    const m = re.exec(url);
    if (m) return m[1];
  }
  return null;
}

/* ── listing ──────────────────────────────────────────────────── */

async function driveList(token: string, query: Record<string, string>): Promise<any[]> {
  const params = new URLSearchParams({
    ...query,
    // Both flags, so a folder living in a Shared Drive works the same
    // as one in My Drive. Without them a Shared Drive folder lists as
    // empty, which looks exactly like "no photos in there".
    supportsAllDrives: 'true',
    includeItemsFromAllDrives: 'true',
  });

  const res = await fetch(`${DRIVE_FILES}?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`Drive returned ${res.status}. ${detail}`);
  }

  const json: any = await res.json().catch(() => null);
  return Array.isArray(json?.files) ? json.files : [];
}

/**
 * The Report Covers subfolder directly inside this folder, or null.
 *
 * Subfolders are listed and matched here rather than asked for by
 * name, because Drive's `name =` is an exact match and the spec says
 * case-insensitive. One level only: "only look there" means a photo
 * filed two folders deep is not a cover, which is the behaviour that
 * lets a client reorganise their Drive without changing their report.
 */
export async function findCoversFolder(token: string, parentId: string): Promise<string | null> {
  const files = await driveList(token, {
    q: `'${parentId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
    fields: 'files(id,name)',
    pageSize: '200',
  });

  const match = files.find(
    (f: any) => String(f?.name ?? '').trim().toLowerCase() === COVERS_FOLDER,
  );
  return match ? String(match.id) : null;
}

/** Is this row an image we can actually put on a cover? */
export function isCoverImage(file: { mimeType?: unknown }): boolean {
  const type = String(file?.mimeType ?? '').toLowerCase();
  return (COVER_TYPES as readonly string[]).includes(type);
}

function shapeFile(f: any): DriveFile {
  const size = Number(f?.size);
  return {
    id: String(f?.id ?? ''),
    name: String(f?.name ?? ''),
    mimeType: String(f?.mimeType ?? ''),
    modifiedTime: typeof f?.modifiedTime === 'string' ? f.modifiedTime : null,
    thumbnailLink: typeof f?.thumbnailLink === 'string' ? f.thumbnailLink : null,
    size: Number.isFinite(size) && size > 0 ? size : null,
  };
}

/**
 * The newest image in a folder, by modifiedTime.
 *
 * Sorted here as well as asked for in order, because `orderBy` is a
 * request and a tie is resolved by whatever Drive feels like. Two
 * photos uploaded in the same second is a thing that happens when you
 * drag four files in at once, and "whichever" is not a specification.
 */
export function pickNewest(files: DriveFile[]): DriveFile | null {
  const usable = files.filter((f) => f.id && isCoverImage(f));
  if (!usable.length) return null;

  return usable.slice().sort((a, b) => {
    const at = a.modifiedTime ?? '';
    const bt = b.modifiedTime ?? '';
    if (at !== bt) return at < bt ? 1 : -1;
    // Same instant: the id, so the answer is at least stable between
    // two renders of the same report.
    return a.id < b.id ? 1 : -1;
  })[0];
}

export async function listCoverImages(token: string, folderId: string): Promise<DriveFile[]> {
  const types = COVER_TYPES.map((t) => `mimeType = '${t}'`).join(' or ');
  const files = await driveList(token, {
    q: `'${folderId}' in parents and trashed = false and (${types})`,
    fields: 'files(id,name,mimeType,modifiedTime,thumbnailLink,size)',
    orderBy: 'modifiedTime desc',
    pageSize: '50',
  });
  return files.map(shapeFile);
}

/* ── the bytes ────────────────────────────────────────────────── */

/**
 * Drive's own rendition of this file at `px` on the long edge, or null
 * when the link is not one we recognise.
 *
 * This is the whole resize story, and it is worth being plain about
 * why. A Worker has no image decoder: it cannot open a JPEG, resample
 * it and write it back out. Cloudflare Images can, but it is billed
 * per transformation, needs the zone enabled, and fetches the source
 * by URL itself, which an authenticated Drive read cannot survive.
 * Drive, meanwhile, already renders every image it stores at whatever
 * size you ask for. So we ask it, and store what it sends.
 */
export function thumbnailAt(link: string | null, px = COVER_WIDTH): string | null {
  const url = (link ?? '').trim();
  if (!url || !/^https:\/\//i.test(url)) return null;

  // googleusercontent links end in a size directive: =s220, =w220-h220,
  // sometimes with a crop suffix. Replace the whole directive.
  const sized = url.replace(/=[swh]\d+(?:-[a-z0-9]+)*$/i, `=s${px}`);
  if (sized !== url) return sized;

  return null;
}

export interface CoverBytes {
  bytes: Uint8Array;
  contentType: string;
  /** Which of the two paths produced these bytes. Logged, so a cover
   *  that is unexpectedly huge can be explained. */
  via: 'thumbnail' | 'original';
}

/**
 * The image, resized if Drive will do it and whole if it will not.
 *
 * The thumbnail is tried first and unauthenticated, which is how those
 * links work: they are signed and short-lived. If it is missing or
 * declines, the original comes down through the API with the bearer
 * token, which always works but can be enormous, so it is refused past
 * MAX_COVER_BYTES. Refused, not truncated: half a JPEG is a broken
 * image, and the caller's fallback is a working cover.
 */
async function tryThumbnail(file: DriveFile, px: number): Promise<CoverBytes | null> {
  const url = thumbnailAt(file.thumbnailLink, px);
  if (!url) return null;

  // No Authorization header: these links carry their own signature and
  // are meant to be fetched plain. Sending a bearer token to
  // googleusercontent would be sending a credential somewhere it is
  // not needed, which is never a good trade.
  const res = await fetch(url).catch(() => null);
  if (!res || !res.ok) {
    console.warn(`drive: no ${px}px rendition for ${file.id}`, res?.status ?? 'fetch failed');
    return null;
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (!bytes.byteLength) {
    console.warn(`drive: empty ${px}px rendition for ${file.id}`);
    return null;
  }

  return {
    bytes,
    contentType: res.headers.get('Content-Type') || 'image/jpeg',
    via: 'thumbnail',
  };
}

export async function fetchCoverBytes(token: string, file: DriveFile): Promise<CoverBytes> {
  for (const px of [COVER_WIDTH, COVER_FALLBACK_WIDTH]) {
    const got = await tryThumbnail(file, px);
    if (got) return got;
  }

  // Nothing left but the original, and a Worker cannot shrink it. A
  // 29MB camera JPEG put on a cover is a render that times out, so it
  // is refused and the caller falls back to a cover that works.
  if (file.size !== null && file.size > MAX_COVER_BYTES) {
    throw new Error(
      `${file.name} is ${Math.round(file.size / 1024 / 1024)}MB and Drive would not resize it.`
      + ` Put a smaller export in Report Covers, around 2400px wide.`,
    );
  }

  const res = await fetch(`${DRIVE_FILES}/${encodeURIComponent(file.id)}?alt=media&supportsAllDrives=true`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const detail = (await res.text().catch(() => '')).slice(0, 200);
    throw new Error(`Drive would not send ${file.name} (${res.status}). ${detail}`);
  }

  const bytes = new Uint8Array(await res.arrayBuffer());
  if (bytes.byteLength > MAX_COVER_BYTES) {
    throw new Error(`${file.name} is larger than the ${MAX_COVER_BYTES / 1024 / 1024}MB cover limit`);
  }

  return {
    bytes,
    contentType: file.mimeType || 'image/jpeg',
    via: 'original',
  };
}
