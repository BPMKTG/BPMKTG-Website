/* ──────────────────────────────────────────────────────────────
   Web Push: signing, encrypting, storing and sending.

   SERVER ONLY. What a notification says and who it is for is decided
   in src/data/push.ts; this file is the part that talks to a browser's
   push service and to KV.

   There is no library here, on purpose. A Pages Function has
   WebCrypto and fetch, which is everything the two standards need:

     VAPID  (RFC 8292)   a short signed token that says the message is
                         from this site. Signed with VAPID_PRIVATE_KEY.
     aes128gcm (RFC 8291) the message itself, encrypted so that only
                         the one browser it is for can read it. The
                         push service in the middle carries bytes it
                         cannot open.

   The encryption is checked against the worked example in RFC 8291,
   byte for byte, in the tests.

   Where things are kept, all in PORTAL_KV:

     push:c:<slug>        a client's devices
     push:a               our devices
     push:batch:<slug>    the review batch that is open, if one is
     push:rv:<slug>       which cards in review have been announced

   A device a push service says is gone (404 or 410) is forgotten on
   the spot, so a deleted app stops costing a request.

   Nothing here throws at a caller. A notification is a courtesy on
   top of a save that has already happened, and a save must not fail
   because a phone could not be reached.
   ────────────────────────────────────────────────────────────── */

import {
  REVIEW_BATCH_MS, addToBatch, adminMessage, cleanPrefs, mediaReadyMessage, progressKey, progressMessage, reportMessage,
  reviewMessage, sweepReview, vaultFilesMessage, wants, withDevice,
  type AdminKind, type ProgressEvent, type PushAudience, type PushKind, type PushMessage, type PushPrefs,
  type ReviewBatch, type StoredSubscription,
} from '../data/push';

export interface PushKv {
  get: (key: string) => Promise<string | null>;
  put: (key: string, value: string, opts?: { expirationTtl?: number }) => Promise<void>;
  delete: (key: string) => Promise<void>;
}

export interface PushEnv {
  VAPID_PUBLIC_KEY?: string;
  VAPID_PRIVATE_KEY?: string;
  PORTAL_KV?: PushKv;
}

/** Who a push service can contact about our messages. A web address
 *  rather than a person's email: it is sent with every notification. */
const VAPID_SUBJECT = 'https://blueprint-marketing.com';

/* ── bytes ────────────────────────────────────────────────────── */

export function b64uToBytes(s: string): Uint8Array {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  const raw = atob(pad);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export function bytesToB64u(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const utf8 = (s: string): Uint8Array => new TextEncoder().encode(s);

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/* ── the keys ─────────────────────────────────────────────────── */

export interface PushConfig { publicKey: string; privateKey: string }

/**
 * The key pair out of the two secrets, or null.
 *
 * Null when either is missing or is not the shape it must be: a 65
 * byte public point and a 32 byte private number. With no keys there
 * are no notifications and nothing else changes; the settings screen
 * says they are not set up.
 */
export function pushConfig(env: PushEnv): PushConfig | null {
  const publicKey = (env.VAPID_PUBLIC_KEY ?? '').trim().replace(/=+$/, '');
  const privateKey = (env.VAPID_PRIVATE_KEY ?? '').trim().replace(/=+$/, '');
  if (!/^[A-Za-z0-9_-]+$/.test(publicKey) || !/^[A-Za-z0-9_-]+$/.test(privateKey)) return null;
  try {
    const pub = b64uToBytes(publicKey);
    if (pub.length !== 65 || pub[0] !== 4 || b64uToBytes(privateKey).length !== 32) return null;
  } catch { return null; }
  return { publicKey, privateKey };
}

/* ── VAPID ────────────────────────────────────────────────────── */

/**
 * The Authorization header for one push service.
 *
 * The token names the service it is for (the origin of the device's
 * push address), so a token for Apple is no use at Google, and it is
 * good for twelve hours.
 */
export async function vapidAuthorization(endpoint: string, cfg: PushConfig, now = Date.now()): Promise<string> {
  const pub = b64uToBytes(cfg.publicKey);
  const key = await crypto.subtle.importKey('jwk', {
    kty: 'EC', crv: 'P-256',
    x: bytesToB64u(pub.slice(1, 33)), y: bytesToB64u(pub.slice(33, 65)), d: cfg.privateKey,
  }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const head = bytesToB64u(utf8(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const body = bytesToB64u(utf8(JSON.stringify({
    aud: new URL(endpoint).origin,
    exp: Math.floor(now / 1000) + 12 * 60 * 60,
    sub: VAPID_SUBJECT,
  })));
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, utf8(`${head}.${body}`));
  return `vapid t=${head}.${body}.${bytesToB64u(new Uint8Array(sig))}, k=${cfg.publicKey}`;
}

/* ── encryption (RFC 8291, aes128gcm) ─────────────────────────── */

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8));
}

/**
 * One message, encrypted for one device.
 *
 * `fixed` exists for the test that checks this against the RFC's own
 * example, where the salt and the sender's key are given. In use both
 * are made fresh for every message, which is what the standard needs:
 * the same key and salt must never encrypt two messages.
 */
export async function encryptPush(
  plaintext: Uint8Array, keys: { p256dh: string; auth: string },
  fixed?: { salt: Uint8Array; local: CryptoKeyPair },
): Promise<Uint8Array> {
  const uaPublic = b64uToBytes(keys.p256dh);
  const authSecret = b64uToBytes(keys.auth);
  const ua = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const local = fixed?.local ?? await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const shared = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: ua }, local.privateKey, 256));

  // Two rounds: the first binds the shared secret to both public keys
  // and to the device's own secret, the second makes the key and the
  // nonce for this one message from a fresh salt.
  const ikm = await hkdf(authSecret, shared, concat(utf8('WebPush: info\0'), uaPublic, asPublic), 32);
  const salt = fixed?.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, utf8('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, utf8('Content-Encoding: nonce\0'), 12);

  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // 0x02 after the text marks this as the last (and only) record.
  const sealed = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce, tagLength: 128 }, key, concat(plaintext, new Uint8Array([2]))));

  // salt, record size (4096, big-endian), key length, our public key.
  const header = concat(salt, new Uint8Array([0, 0, 0x10, 0, asPublic.length]), asPublic);
  return concat(header, sealed);
}

/* ── sending ──────────────────────────────────────────────────── */

export type SendResult = 'sent' | 'gone' | 'failed';

/** One message to one device. 'gone' means the push service says the
 *  device no longer exists, and the caller forgets it. */
export async function sendPush(
  cfg: PushConfig, sub: { endpoint: string; keys: { p256dh: string; auth: string } }, message: PushMessage,
  opts: { topic?: string } = {},
): Promise<SendResult> {
  try {
    const body = await encryptPush(utf8(JSON.stringify(message)), sub.keys);
    const res = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: await vapidAuthorization(sub.endpoint, cfg),
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        // Kept for a day if the device is off, then dropped: a review
        // notice a week late is worse than none.
        TTL: '86400',
        Urgency: 'normal',
        // A push service holds one undelivered message per topic, so a
        // phone that was off wakes to one, not five.
        ...(opts.topic ? { Topic: opts.topic } : {}),
      },
      body,
    });
    if (res.status === 404 || res.status === 410) return 'gone';
    if (res.status >= 200 && res.status < 300) return 'sent';
    console.error('push: a push service refused a message', new URL(sub.endpoint).hostname, res.status, (await res.text().catch(() => '')).slice(0, 160));
    return 'failed';
  } catch (err) {
    console.error('push: sending threw', err);
    return 'failed';
  }
}

/* ── the store ────────────────────────────────────────────────── */

const clientKey = (slug: string): string => `push:c:${slug}`;
const ADMIN_KEY = 'push:a';
const batchKey = (slug: string): string => `push:batch:${slug}`;
const knownKey = (slug: string): string => `push:rv:${slug}`;

async function readJson<T>(kv: PushKv, key: string): Promise<T | null> {
  try {
    const raw = await kv.get(key);
    return raw ? JSON.parse(raw) as T : null;
  } catch { return null; }
}

const storeKey = (audience: PushAudience, slug: string | null): string | null =>
  (audience === 'admin' ? ADMIN_KEY : slug ? clientKey(slug) : null);

async function devices(kv: PushKv, key: string): Promise<StoredSubscription[]> {
  const list = await readJson<StoredSubscription[]>(kv, key);
  return Array.isArray(list) ? list.filter((d) => d && typeof d.endpoint === 'string' && d.keys) : [];
}

/** Remember this device, with its choices. */
export async function saveDevice(
  env: PushEnv, audience: PushAudience, slug: string | null,
  sub: { endpoint: string; keys: { p256dh: string; auth: string } }, prefs: unknown, who: string | null,
): Promise<PushPrefs | null> {
  const key = storeKey(audience, slug);
  if (!env.PORTAL_KV || !key) return null;
  const clean = cleanPrefs(prefs, audience);
  const list = await devices(env.PORTAL_KV, key);
  await env.PORTAL_KV.put(key, JSON.stringify(withDevice(list, {
    endpoint: sub.endpoint, keys: sub.keys, prefs: clean, ...(who ? { who } : {}), at: new Date().toISOString(),
  })));
  return clean;
}

/** This device's choices, or null when we do not know it. */
export async function deviceState(env: PushEnv, audience: PushAudience, slug: string | null, endpoint: string): Promise<PushPrefs | null> {
  const key = storeKey(audience, slug);
  if (!env.PORTAL_KV || !key) return null;
  const found = (await devices(env.PORTAL_KV, key)).find((d) => d.endpoint === endpoint);
  return found ? cleanPrefs(found.prefs, audience) : null;
}

export async function forgetDevice(env: PushEnv, audience: PushAudience, slug: string | null, endpoint: string): Promise<void> {
  const key = storeKey(audience, slug);
  if (!env.PORTAL_KV || !key) return;
  const list = await devices(env.PORTAL_KV, key);
  const rest = list.filter((d) => d.endpoint !== endpoint);
  if (rest.length !== list.length) await env.PORTAL_KV.put(key, JSON.stringify(rest));
}

/**
 * One message to every device under a key that wants this kind.
 * Returns how many were sent, and forgets the devices that are gone.
 */
async function deliver(env: PushEnv, key: string, kind: PushKind, message: PushMessage, topic?: string): Promise<number> {
  const cfg = pushConfig(env);
  if (!cfg || !env.PORTAL_KV) return 0;
  const list = await devices(env.PORTAL_KV, key);
  const to = list.filter((d) => wants(d.prefs, kind));
  if (!to.length) return 0;
  const results = await Promise.all(to.map((d) => sendPush(cfg, d, message, { topic })));
  const gone = new Set(to.filter((_, i) => results[i] === 'gone').map((d) => d.endpoint));
  if (gone.size) {
    // Read again before writing: a device may have been added while
    // the messages were on their way.
    const now = await devices(env.PORTAL_KV, key);
    await env.PORTAL_KV.put(key, JSON.stringify(now.filter((d) => !gone.has(d.endpoint))));
  }
  return results.filter((r) => r === 'sent').length;
}

/* ── the notifications ────────────────────────────────────────── */

/**
 * "New content needs your review", for cards that have just moved
 * into review.
 *
 * Batched on the device, not on a timer, because a Pages Function has
 * no timer: the first card is announced at once, and each further
 * card inside ten minutes REPLACES that notification with the running
 * count. Five cards end as one notification that says five.
 */
export async function notifyReview(
  env: PushEnv, slug: string, cards: ReadonlyArray<{ id: string; title: string }>, now = Date.now(),
): Promise<number> {
  if (!env.PORTAL_KV || !cards.length || !pushConfig(env)) return 0;
  try {
    const kv = env.PORTAL_KV;
    const prev = await readJson<ReviewBatch>(kv, batchKey(slug));
    const batch = addToBatch(prev && Array.isArray(prev.ids) ? prev : null, cards.map((c) => c.id), now);
    // Nothing new joined: the same card saved into review twice.
    if (prev && batch.first === prev.first && batch.ids.length === prev.ids.length) return 0;
    await kv.put(batchKey(slug), JSON.stringify(batch), { expirationTtl: Math.ceil(REVIEW_BATCH_MS / 1000) + 120 });
    // Announced here, so HQ's sweep does not announce it a second time.
    const known = await readJson<string[]>(kv, knownKey(slug));
    if (Array.isArray(known)) await kv.put(knownKey(slug), JSON.stringify([...new Set([...known, ...batch.ids])]));
    return await deliver(env, clientKey(slug), 'review', reviewMessage(slug, batch, cards[0]?.title ?? null), 'review');
  } catch (err) {
    console.error('push: review notification failed', slug, err);
    return 0;
  }
}

/**
 * "Now editing", "Scheduled", "Posted", "Shot", "Delivered": something
 * of the client's moved forward because one of us moved it.
 *
 * Batched like review, with its own ten-minute window: the first is
 * said at once and names the item, and each further one replaces it
 * with the count.
 */
export async function notifyProgress(
  env: PushEnv, slug: string, events: readonly ProgressEvent[], now = Date.now(),
): Promise<number> {
  if (!env.PORTAL_KV || !events.length || !pushConfig(env)) return 0;
  try {
    const kv = env.PORTAL_KV;
    const key = `${batchKey(slug)}:progress`;
    const prev = await readJson<ReviewBatch>(kv, key);
    const batch = addToBatch(prev && Array.isArray(prev.ids) ? prev : null, events.map(progressKey), now);
    if (prev && batch.first === prev.first && batch.ids.length === prev.ids.length) return 0;
    await kv.put(key, JSON.stringify(batch), { expirationTtl: Math.ceil(REVIEW_BATCH_MS / 1000) + 120 });
    return await deliver(env, clientKey(slug), 'progress', progressMessage(slug, batch, events[0] ?? null), 'progress');
  } catch (err) {
    console.error('push: progress notification failed', slug, err);
    return 0;
  }
}

/**
 * Cards that reached review without passing through our own save: a
 * status changed in Notion itself. Called when HQ loads.
 */
export async function sweepReviewFor(
  env: PushEnv, slug: string, inReview: ReadonlyArray<{ id: string; title: string }>, now = Date.now(),
): Promise<number> {
  if (!env.PORTAL_KV || !pushConfig(env)) return 0;
  try {
    const known = await readJson<string[]>(env.PORTAL_KV, knownKey(slug));
    const plan = sweepReview(Array.isArray(known) ? known : null, inReview.map((c) => c.id));
    const same = Array.isArray(known) && known.length === plan.remember.length && plan.remember.every((id) => known.includes(id));
    if (!same) await env.PORTAL_KV.put(knownKey(slug), JSON.stringify(plan.remember));
    if (!plan.announce.length) return 0;
    const hex = (id: string) => id.replace(/-/g, '').toLowerCase();
    return await notifyReview(env, slug, inReview.filter((c) => plan.announce.includes(hex(c.id))), now);
  } catch (err) {
    console.error('push: review sweep failed', slug, err);
    return 0;
  }
}

/**
 * "Your monthly report is ready", once per report.
 *
 * Publishing the same month again (a corrected PDF, a second click)
 * must not tell the client twice, so the report's id is claimed in KV
 * before anything is sent, the same way the email is.
 */
export async function notifyReport(env: PushEnv, slug: string, label: string | null, reportId: string): Promise<number> {
  try {
    if (!env.PORTAL_KV || !pushConfig(env)) return 0;
    const claim = `push:rpt:${reportId.replace(/-/g, '').toLowerCase()}`;
    if (await env.PORTAL_KV.get(claim)) return 0;
    await env.PORTAL_KV.put(claim, new Date().toISOString(), { expirationTtl: 400 * 24 * 60 * 60 });
    return await deliver(env, clientKey(slug), 'report', reportMessage(slug, label), 'report');
  } catch (err) {
    console.error('push: report notification failed', slug, err);
    return 0;
  }
}

/** "[Client]: 12 new files", to us. See vaultFilesMessage. */
export async function notifyVaultFiles(env: PushEnv, o: { client: string; slug: string; count: number }): Promise<number> {
  try {
    if (o.count < 1) return 0;
    return await deliver(env, ADMIN_KEY, 'files', vaultFilesMessage(o), 'vault');
  } catch (err) {
    console.error('push: vault files notification failed', o.slug, err);
    return 0;
  }
}

/** "Your [moment] media is ready", to the client. Only ever called by
 *  the route behind "Announce delivery". */
export async function notifyMediaReady(env: PushEnv, slug: string, moment: string): Promise<number> {
  try {
    return await deliver(env, clientKey(slug), 'media', mediaReadyMessage(slug, moment), 'media');
  } catch (err) {
    console.error('push: media notification failed', slug, err);
    return 0;
  }
}

export async function notifyAdmins(
  env: PushEnv, kind: Exclude<AdminKind, 'files'>, o: { client: string; slug: string | null; item: string; id: string | null; status?: string | null },
): Promise<number> {
  try { return await deliver(env, ADMIN_KEY, kind, adminMessage(kind, o)); } catch (err) {
    console.error('push: admin notification failed', kind, err);
    return 0;
  }
}

/* ── cards moved into review in Notion itself ─────────────────── */

/**
 * Announce every card that is in review and has not been announced.
 *
 * Our own save announces a card the moment it is moved. A status
 * changed in Notion never passes through that save, so HQ runs this
 * when it loads fresh data. `cards` is every card in review that a
 * client can see, across all clients; `slugs` is every client with a
 * portal, so one whose last card has left review is updated too.
 */
export async function sweepAllReview(
  env: PushEnv, slugs: readonly string[], cards: ReadonlyArray<{ slug: string; id: string; title: string }>,
): Promise<number> {
  if (!env.PORTAL_KV || !pushConfig(env)) return 0;
  let sent = 0;
  for (const slug of slugs) {
    sent += await sweepReviewFor(env, slug, cards.filter((c) => c.slug === slug));
  }
  return sent;
}
