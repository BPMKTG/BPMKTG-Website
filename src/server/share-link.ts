/* ──────────────────────────────────────────────────────────────
   Share links: /a/<token> for a prospect's audit.

   SERVER ONLY.

   A prospect has no portal and no sign-in, so the audit reaches them
   as an unguessable URL. Three properties make that acceptable:

     128 bits of randomness   it cannot be found by guessing
     a stored record          it can be revoked, which a signed token cannot
     an optional expiry       it can be made to stop working on its own

   The record is the whole point of using KV here rather than another
   HMAC token. An HMAC link is valid until it expires and there is no
   way to take it back; a prospect who becomes a competitor keeps it.
   A record can be deleted, and the link dies the moment it is.

   The token is the key. Nothing in the URL says whose audit it is, so
   the link leaks nothing when it is forwarded, and the audit id is
   only ever read out of the record.
   ────────────────────────────────────────────────────────────── */

export interface ShareStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

export interface ShareRecord {
  /** The Audits page id this link opens. */
  auditId: string;
  /** The R2 key of the PDF, so serving it needs no Notion call. */
  key: string;
  /** Who it is about, for the filename and the page title. */
  subject: string;
  createdAt: string;
  /** ISO, or null for a link with no expiry. */
  expiresAt: string | null;
}

/** 30 days, per the spec's optional expiry. Mason picks per link. */
export const DEFAULT_SHARE_DAYS = 30;

const kvKey = (token: string) => `share:${token}`;

/** 32 hex characters: 128 bits out of the platform CSPRNG. Long
 *  enough that guessing is not a threat model, short enough to paste
 *  into a message without wrapping. */
export function newShareToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isShareToken(value: string | null | undefined): boolean {
  return typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
}

/**
 * Stores a new link and returns its token.
 *
 * `days` of 0 or null means no expiry, in which case the record has no
 * TTL and lives until it is revoked.
 */
export async function createShareLink(
  store: ShareStore,
  record: Omit<ShareRecord, 'createdAt' | 'expiresAt'>,
  days: number | null = DEFAULT_SHARE_DAYS,
  now = Date.now(),
): Promise<{ token: string; expiresAt: string | null }> {
  const token = newShareToken();
  const ttl = days && days > 0 ? Math.round(days * 24 * 60 * 60) : null;
  const expiresAt = ttl ? new Date(now + ttl * 1000).toISOString() : null;

  const full: ShareRecord = {
    ...record,
    createdAt: new Date(now).toISOString(),
    expiresAt,
  };
  await store.put(kvKey(token), JSON.stringify(full), ttl ? { expirationTtl: ttl } : undefined);
  return { token, expiresAt };
}

/**
 * The record behind a token, or null.
 *
 * KV's own TTL does most of the expiry work, but the stored date is
 * checked too: KV deletes lazily, so a link can briefly outlive its
 * expiry, and "briefly" is not a thing to explain to a client.
 */
export async function readShareLink(
  store: ShareStore,
  token: string,
  now = Date.now(),
): Promise<ShareRecord | null> {
  if (!isShareToken(token)) return null;
  const raw = await store.get(kvKey(token));
  if (!raw) return null;

  let record: ShareRecord;
  try {
    record = JSON.parse(raw) as ShareRecord;
  } catch {
    console.error('share: unreadable record', token.slice(0, 8));
    return null;
  }
  if (!record?.auditId || !record?.key) return null;
  if (record.expiresAt && Date.parse(record.expiresAt) <= now) return null;
  return record;
}

export async function revokeShareLink(store: ShareStore, token: string): Promise<void> {
  if (!isShareToken(token)) return;
  await store.delete(kvKey(token));
}

/** The token out of a stored share URL, so revoking can work from the
 *  Notion field alone. */
export function tokenFromShareUrl(url: string | null | undefined): string | null {
  const m = /\/a\/([0-9a-f]{32})\b/.exec(url ?? '');
  return m ? m[1] : null;
}
