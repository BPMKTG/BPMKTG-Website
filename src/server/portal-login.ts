/* ──────────────────────────────────────────────────────────────
   Signing in: a six-digit code, sent to an email address that is
   already written down in Notion.

   SERVER ONLY.

   Three rules this file exists to hold:

     1. NOTHING LEAKS. An address we have never heard of, an address
        on a client whose portal is off, and an address that is on a
        client all produce the same answer, take about the same work,
        and leave the same trace. Asking this endpoint whether someone
        is a Blueprint client must not be a thing that works.
     2. THE CODE LIVES SOMEWHERE REAL. Workers KV, not the Cache API.
        The cache is per-datacenter: a code written in one colo may not
        be readable from another thirty seconds later, which is a login
        that fails at random. With no KV binding, sign-in is off.
     3. ONE CODE, ONE USE. The record is deleted the moment a code is
        accepted, and the attempt counter lives in the record, so ten
        wrong guesses burn the code rather than the clock.
   ────────────────────────────────────────────────────────────── */

import { sha256Hex, timingSafeEqual } from './portal-auth';

/** How long a code is good for. Long enough to go and find the email,
 *  short enough that a code read over someone's shoulder is stale. */
export const CODE_SECONDS = 10 * 60;

/** Codes one address may ask for per hour. */
export const CODE_REQUESTS_PER_HOUR = 5;
export const CODE_REQUEST_WINDOW = 60 * 60;

/** Guesses allowed against one code before it is burned. */
export const CODE_ATTEMPTS = 10;

/** The one thing we say back, whatever happened. */
export const NEUTRAL = 'If that email has access, we sent a code.';

/* ── email addresses ──────────────────────────────────────────── */

/**
 * The form an address is compared in: trimmed and lowercased.
 *
 * No further cleverness. Stripping dots or +tags would mean two people
 * who typed different addresses were treated as the same person, and
 * for a login that decides who sees whose numbers, that is the wrong
 * way to be wrong.
 */
export function normaliseEmail(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim().toLowerCase().slice(0, 254) : '';
}

/** Enough of an address to be worth a Notion lookup. Deliberately not
 *  a full RFC check: the real test is whether it is written in Notion. */
export function looksLikeEmail(value: string): boolean {
  return /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/.test(value);
}

/** Notion holds these comma-separated in one text field. */
export function parseEmailList(raw: string | null | undefined): string[] {
  return String(raw ?? '')
    .split(/[,;\n]/)
    .map((e) => normaliseEmail(e))
    .filter((e) => e.length > 0);
}

/** The admins, from the ADMIN_EMAILS secret. Same comma-separated
 *  shape as Notion's, so there is one format to remember. */
export function parseAdminEmails(raw: string | undefined): string[] {
  return parseEmailList(raw);
}

/* ── the code ─────────────────────────────────────────────────── */

/**
 * Six digits, from the platform's cryptographic random source.
 *
 * Rejection sampling rather than `% 1000000`: a plain modulo over
 * 2^32 makes the low codes very slightly likelier, and a code space
 * this small has no room to give anything away.
 */
export function makeCode(): string {
  const buf = new Uint32Array(1);
  const limit = Math.floor(0xffffffff / 1000000) * 1000000;
  let n: number;
  do {
    crypto.getRandomValues(buf);
    n = buf[0];
  } while (n >= limit);
  return String(n % 1000000).padStart(6, '0');
}

export function isCodeShaped(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9]{6}$/.test(value);
}

/* ── where a pending code lives ───────────────────────────────── */

/** The slice of Workers KV this needs. Typed here rather than pulling
 *  in the full binding, so the tests can hand it a Map. */
export interface CodeStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

/** What a pending sign-in is. The address is kept so the verify step
 *  does not have to trust the one in the request body, and the role
 *  and slug are decided when the code is sent rather than again when
 *  it comes back. */
export interface PendingCode {
  /** Hash of the code, never the code. A KV dump is not a list of
   *  live sign-ins. */
  hash: string;
  email: string;
  role: 'client' | 'admin';
  /** The client this code opens. Empty for an admin, who gets all. */
  slug: string;
  exp: number;
  tries: number;
}

const codeKey = (emailHash: string) => `code:${emailHash}`;
const rateKey = (emailHash: string) => `rate:${emailHash}`;

/** The code is salted with the address, so two people holding the same
 *  six digits do not hash to the same value. */
export function hashCode(email: string, code: string): Promise<string> {
  return sha256Hex(`${email}:${code}`);
}

export async function putCode(
  store: CodeStore,
  emailHash: string,
  pending: PendingCode,
): Promise<void> {
  await store.put(codeKey(emailHash), JSON.stringify(pending), {
    // KV expires it too, so a code cannot outlive its window even if
    // nobody ever comes back to use it.
    expirationTtl: CODE_SECONDS,
  });
}

export async function takeCode(
  store: CodeStore,
  emailHash: string,
): Promise<PendingCode | null> {
  const raw = await store.get(codeKey(emailHash));
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as PendingCode;
    if (typeof p.hash !== 'string' || typeof p.email !== 'string') return null;
    return p;
  } catch {
    return null;
  }
}

/**
 * Check a guess against the pending code.
 *
 * Whatever the answer, the record moves: a right answer deletes it, so
 * the code is single use; a wrong one writes the attempt back, so ten
 * guesses is ten guesses and not ten thousand.
 */
export async function checkCode(
  store: CodeStore,
  emailHash: string,
  pending: PendingCode,
  guess: string,
  now = Date.now(),
): Promise<boolean> {
  if (pending.exp * 1000 <= now || pending.tries >= CODE_ATTEMPTS) {
    await store.delete(codeKey(emailHash));
    return false;
  }

  const ok = await timingSafeEqual(await hashCode(pending.email, guess), pending.hash);
  if (ok) {
    await store.delete(codeKey(emailHash));
    return true;
  }

  const next = { ...pending, tries: pending.tries + 1 };
  if (next.tries >= CODE_ATTEMPTS) await store.delete(codeKey(emailHash));
  else {
    await store.put(codeKey(emailHash), JSON.stringify(next), {
      expirationTtl: Math.max(1, pending.exp - Math.floor(now / 1000)),
    });
  }
  return false;
}

/* ── how often one address may ask ────────────────────────────── */

/**
 * Five codes an hour, per address.
 *
 * The window starts at the first request and does not slide, which is
 * the simple version: someone who burns five in a minute waits out the
 * rest of the hour. Counted per address rather than per IP, because
 * the thing being protected is one person's inbox.
 */
export async function overRequestLimit(
  store: CodeStore,
  emailHash: string,
  now = Date.now(),
): Promise<boolean> {
  const key = rateKey(emailHash);
  const raw = await store.get(key);
  const seconds = Math.floor(now / 1000);

  let count = 0;
  let until = seconds + CODE_REQUEST_WINDOW;
  if (raw) {
    try {
      const v = JSON.parse(raw) as { n: number; until: number };
      if (Number.isFinite(v.n) && Number.isFinite(v.until) && v.until > seconds) {
        count = v.n;
        until = v.until;
      }
    } catch { /* a corrupt counter starts again rather than locks out */ }
  }

  if (count >= CODE_REQUESTS_PER_HOUR) return true;

  await store.put(key, JSON.stringify({ n: count + 1, until }), {
    expirationTtl: Math.max(1, until - seconds),
  });
  return false;
}

/* ── the email itself ─────────────────────────────────────────── */

export interface MailEnv {
  RESEND_API_KEY?: string;
  /** Who it comes from. Must be a verified sender on the Resend
   *  account, which is what the DNS records are for. */
  PORTAL_MAIL_FROM?: string;
}

export const DEFAULT_FROM = 'Blueprint Marketing <noreply@bpmktg.com>';

export function codeSubject(code: string): string {
  // The code is in the subject line as well as the body, because on a
  // phone that is the whole job done from the notification.
  return `${code} is your Blueprint portal code`;
}

export function codeText(code: string, artist: string): string {
  const who = artist ? `the ${artist} portal` : 'your Blueprint portal';
  return [
    `Your code for ${who} is:`,
    '',
    code,
    '',
    'It works once and lasts ten minutes.',
    '',
    'If you did not ask for this, you can ignore it. Nothing has',
    'changed and nobody has been let in.',
    '',
    'Blueprint Marketing',
  ].join('\n');
}

/**
 * Hand the code to Resend.
 *
 * Returns whether it went. The caller does NOT pass that on: a client
 * who learns that sending failed learns that the address was one we
 * would have sent to. It is logged instead, where it is useful to us
 * and to nobody else.
 */
export async function sendCode(
  env: MailEnv,
  to: string,
  code: string,
  artist: string,
): Promise<boolean> {
  if (!env.RESEND_API_KEY) {
    console.error('portal: RESEND_API_KEY is not set, no code was sent');
    return false;
  }
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: env.PORTAL_MAIL_FROM || DEFAULT_FROM,
        to: [to],
        subject: codeSubject(code),
        text: codeText(code, artist),
      }),
    });
    if (!res.ok) {
      console.error('portal: sending a code failed', res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error('portal: sending a code threw', err);
    return false;
  }
}
