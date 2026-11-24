/* ──────────────────────────────────────────────────────────────
   Notifications: who is told what, and what it says.

   The rules only. Nothing in here signs, encrypts, stores or sends
   (see src/server/push.ts for those), so every decision about a
   notification can be tested without a phone.

   Two audiences, and they never mix:

     a client   "New content needs your review"
                "Now editing: [item]", "Scheduled: [item]", "Posted: [item]"
                "Shot: [delivery]", "Delivered: [delivery]" (a gym)
                "Your monthly report is ready"

     us         "[Client] approved [item]"
                "[Client] requested changes on [item]"
                "[Client] filmed [item]", "[Client] sent footage for [item]"
                "[Client] submitted a new idea"
                "Preview failed: [item]"

   A device says yes or no to each kind separately. A kind it has said
   no to is never sent to it.
   ────────────────────────────────────────────────────────────── */

/* ── kinds ────────────────────────────────────────────────────── */

export const CLIENT_KINDS = ['review', 'progress', 'report'] as const;
export const ADMIN_KINDS = ['approved', 'changes', 'footage', 'idea', 'preview'] as const;
export type ClientKind = typeof CLIENT_KINDS[number];
export type AdminKind = typeof ADMIN_KINDS[number];
export type PushKind = ClientKind | AdminKind;
export type PushAudience = 'client' | 'admin';

/** What each kind is called on the settings screen. */
export const PUSH_KIND_LABEL: Record<PushKind, string> = {
  review: 'New content needs your review',
  progress: 'Your content moves forward (editing, scheduled, posted, delivered)',
  report: 'Your monthly report is ready',
  approved: 'A client approved something',
  changes: 'A client requested changes',
  footage: 'A client filmed something or sent footage',
  idea: 'A client submitted a new idea',
  preview: 'A preview failed',
};

export const kindsFor = (audience: PushAudience): readonly PushKind[] =>
  (audience === 'admin' ? ADMIN_KINDS : CLIENT_KINDS);

export type PushPrefs = Partial<Record<PushKind, boolean>>;

/**
 * A device's choices, cleaned: only this audience's kinds, each a
 * plain yes or no, and yes for any it has not been asked about. A
 * client's device can never end up subscribed to one of ours.
 */
export function cleanPrefs(raw: unknown, audience: PushAudience): PushPrefs {
  const src = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw as Record<string, unknown> : {};
  const out: PushPrefs = {};
  for (const k of kindsFor(audience)) out[k] = src[k] !== false;
  return out;
}

export const wants = (prefs: PushPrefs | undefined, kind: PushKind): boolean => prefs?.[kind] !== false;

/* ── a subscription ───────────────────────────────────────────── */

export interface PushSubscriptionKeys { p256dh: string; auth: string }
export interface StoredSubscription {
  endpoint: string;
  keys: PushSubscriptionKeys;
  prefs: PushPrefs;
  /** Whose device it is, for ours: the admin's handle. */
  who?: string;
  at: string;
}

/** The services a browser's push address can belong to. We POST to
 *  the address a page hands us, so it is only ever one of these: a
 *  page must not be able to point our server at a host of its choosing. */
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^[a-z0-9-]+\.push\.apple\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.push\.services\.mozilla\.com$/,
  /^[a-z0-9-]+\.notify\.windows\.com$/,
];

const B64URL = /^[A-Za-z0-9_-]+$/;

/** How many bytes a base64url string holds, without decoding it. */
const byteLength = (s: string): number => Math.floor((s.length * 3) / 4);

/**
 * A subscription as a browser hands it over, or null.
 *
 * Checked by shape and by host: an https address at a known push
 * service, a 65 byte public key and a 16 byte secret. Anything else is
 * not a subscription, whatever else it is.
 */
export function cleanSubscription(raw: unknown): { endpoint: string; keys: PushSubscriptionKeys } | null {
  const s = raw && typeof raw === 'object' ? raw as Record<string, any> : null;
  if (!s || typeof s.endpoint !== 'string' || s.endpoint.length > 1000) return null;
  let u: URL;
  try { u = new URL(s.endpoint); } catch { return null; }
  if (u.protocol !== 'https:' || u.username || u.password || (u.port && u.port !== '443')) return null;
  if (!PUSH_HOSTS.some((re) => re.test(u.hostname.toLowerCase()))) return null;
  const p256dh = typeof s.keys?.p256dh === 'string' ? s.keys.p256dh.replace(/=+$/, '') : '';
  const auth = typeof s.keys?.auth === 'string' ? s.keys.auth.replace(/=+$/, '') : '';
  if (!B64URL.test(p256dh) || !B64URL.test(auth)) return null;
  if (byteLength(p256dh) !== 65 || byteLength(auth) !== 16) return null;
  return { endpoint: u.toString(), keys: { p256dh, auth } };
}

/** The most devices one person keeps. A phone, a tablet, a laptop and
 *  a few reinstalls; past that the oldest goes. */
export const MAX_DEVICES = 10;

/** One person's devices with this one added or replaced, newest last. */
export function withDevice(list: readonly StoredSubscription[], sub: StoredSubscription): StoredSubscription[] {
  const rest = list.filter((d) => d.endpoint !== sub.endpoint);
  return [...rest, sub].slice(-MAX_DEVICES);
}

/* ── what a notification says ─────────────────────────────────── */

export interface PushMessage {
  title: string;
  body: string;
  /** Where a tap goes. Always inside /portal/. */
  url: string;
  /** Notifications with the same tag replace each other on the device. */
  tag: string;
}

const hex = (id: string): string => id.replace(/-/g, '').toLowerCase();
const short = (s: string, n = 90): string => {
  const t = (s ?? '').replace(/\s+/g, ' ').trim();
  return t.length > n ? `${t.slice(0, n - 1).trimEnd()}…` : t;
};

/** Where a tap on a card's notification lands: that card, in that
 *  client's portal. Ours open the same address; the sign-in decides
 *  what it shows. */
export const cardUrl = (slug: string, id: string): string => `/portal/${slug}#/content/${hex(id)}`;

/* ── a client's review notification, batched ──────────────────── */

/** Items that reach review within this long of the first become one
 *  notification. */
export const REVIEW_BATCH_MS = 10 * 60 * 1000;

export interface ReviewBatch { first: number; ids: string[] }

/**
 * The batch after these items join it.
 *
 * A batch opens with the first item and takes everything that arrives
 * in the ten minutes after. Something that arrives later than that
 * opens a new one. An item already in the batch does not count twice,
 * so saving the same card again cannot inflate "5 posts".
 */
export function addToBatch(prev: ReviewBatch | null, ids: readonly string[], now: number): ReviewBatch {
  const fresh = ids.map(hex);
  if (!prev || now - prev.first >= REVIEW_BATCH_MS) return { first: now, ids: [...new Set(fresh)] };
  return { first: prev.first, ids: [...new Set([...prev.ids, ...fresh])] };
}

/**
 * What the client is told about a batch.
 *
 * One item names it and opens it. Several are counted and open the
 * review list. Either way the tag is the same, so on the device a
 * later one replaces the earlier one: five items inside ten minutes
 * end as ONE notification reading "5 posts need your review", not
 * five notifications.
 */
export function reviewMessage(slug: string, batch: ReviewBatch, firstTitle: string | null): PushMessage {
  const n = batch.ids.length;
  if (n <= 1) {
    return {
      title: 'New content needs your review',
      body: short(firstTitle ?? '') || 'Open Blueprint to take a look.',
      url: batch.ids[0] ? cardUrl(slug, batch.ids[0]) : `/portal/${slug}#/content`,
      tag: 'review',
    };
  }
  return {
    title: `${n} posts need your review`,
    body: 'Open Blueprint to go through them.',
    url: `/portal/${slug}#/content`,
    tag: 'review',
  };
}

export function reportMessage(slug: string, label: string | null): PushMessage {
  return {
    title: 'Your monthly report is ready',
    body: label ? short(label) : 'Open Blueprint to read it.',
    url: `/portal/${slug}#/reports`,
    tag: 'report',
  };
}

/* ── ours ─────────────────────────────────────────────────────── */

export function adminMessage(
  kind: AdminKind, o: { client: string; slug: string | null; item: string; id: string | null; status?: string | null },
): PushMessage {
  const client = short(o.client || 'A client', 40);
  const item = short(o.item || 'an item', 70);
  const to = o.slug && o.id ? cardUrl(o.slug, o.id) : '/portal/hq';
  const tag = `${kind}-${o.id ? hex(o.id).slice(0, 12) : 'x'}`;
  switch (kind) {
    case 'approved': return { title: `${client} approved ${item}`, body: 'It is ready to schedule.', url: to, tag };
    case 'changes': return { title: `${client} requested changes on ${item}`, body: 'Open it to read their note.', url: to, tag };
    case 'footage': return o.status === 'Footage In'
      ? { title: `${client} sent footage for ${item}`, body: 'It is ready for us to edit.', url: to, tag }
      : { title: `${client} filmed ${item}`, body: 'The footage is on its way.', url: to, tag };
    case 'idea': return { title: `${client} submitted a new idea`, body: item, url: to, tag };
    case 'preview': return { title: `Preview failed: ${item}`, body: `${client}. It is under Previews to fix.`, url: '/portal/hq#/today', tag };
  }
}

/* ── a client's progress notifications, batched the same way ──── */

/** One thing that moved: a card or a delivery, and where it moved to. */
export interface ProgressEvent {
  id: string;
  title: string;
  /** How the move is said: "Now editing", "Scheduled", "Delivered". */
  label: string;
  /** Where a tap goes for this one on its own. */
  url: string;
}

/** A move is counted once per item and stage, so the same card going
 *  to Editing and then to Scheduled is two updates, and the same save
 *  sent twice is one. */
export const progressKey = (e: { id: string; label: string }): string =>
  `${hex(e.id)}${e.label.toLowerCase().replace(/[^a-z]/g, '')}`;

/**
 * What the client is told about progress. One update names the item
 * and what happened to it. Several inside ten minutes are counted and
 * open the Content tab, and replace each other on the device, so
 * marking eight deliveries as shot is one notification, not eight.
 */
export function progressMessage(slug: string, batch: ReviewBatch, first: ProgressEvent | null): PushMessage {
  const n = batch.ids.length;
  if (n <= 1 && first) {
    return { title: short(`${first.label}: ${first.title}`, 110), body: 'Open Blueprint to see it.', url: first.url, tag: 'progress' };
  }
  return {
    title: `${n} updates on your content`,
    body: 'Open Blueprint to see what moved.',
    url: `/portal/${slug}#/content`,
    tag: 'progress',
  };
}

/* ── which status moves tell whom ─────────────────────────────── */

/** A card moved to one of these BY US tells the client. */
export const CLIENT_TOLD: Record<string, string> = {
  Editing: 'Now editing',
  'Ready for Review': 'Ready for your review',
  Scheduled: 'Scheduled',
  Posted: 'Posted',
};

/** A card moved to one of these BY THE CLIENT tells us. */
export const ADMIN_TOLD: readonly string[] = ['Filmed', 'Footage In', 'Approved'];

export type StatusNotice =
  | { to: 'client'; kind: 'review' }
  | { to: 'client'; kind: 'progress'; label: string }
  | { to: 'admin'; kind: 'approved' | 'changes' | 'footage' }
  | null;

/**
 * Who a status move is news to, if anyone.
 *
 * Always the OTHER side: a move one of us makes is told to the
 * client, a move the client makes is told to us, and nobody is told
 * about their own click. Only a real move counts. The status was one
 * thing and is now another; a caption, a date or a note changed on a
 * card that stays where it is tells nobody.
 *
 *   by us, to       Editing, Scheduled, Posted   → the client, progress
 *                   Ready for Review             → the client, review
 *   by the client   Filmed, Footage In           → us, footage
 *                   Approved                     → us, approved
 *                   Ready for Review → Editing   → us, changes
 */
export function statusNotice(
  role: 'admin' | 'client', before: string | null | undefined, after: string | null | undefined,
): StatusNotice {
  if (!after || after === before) return null;
  if (role === 'admin') {
    if (after === REVIEW_STATUS) return { to: 'client', kind: 'review' };
    return after in CLIENT_TOLD ? { to: 'client', kind: 'progress', label: CLIENT_TOLD[after] } : null;
  }
  if (after === 'Approved') return { to: 'admin', kind: 'approved' };
  if (after === 'Filmed' || after === 'Footage In') return { to: 'admin', kind: 'footage' };
  if (after === 'Editing' && before === REVIEW_STATUS) return { to: 'admin', kind: 'changes' };
  return null;
}

/* ── when a review notification is owed ───────────────────────── */

/** The status that means "waiting on the client". */
export const REVIEW_STATUS = 'Ready for Review';

/**
 * Did this save move a card INTO review?
 *
 * Only the move counts: the status was something else and is now
 * Ready for Review. A caption, some on-screen text, a date or a note
 * changed on a card that was already in review is not a move, and
 * says nothing to anybody.
 */
export function enteredReview(before: string | null | undefined, after: string | null | undefined): boolean {
  return after === REVIEW_STATUS && before !== REVIEW_STATUS;
}

/**
 * Which cards a sweep should announce, and what to remember.
 *
 * A status changed directly in Notion never passes through our save,
 * so HQ looks for it when it loads: a card in review that we have not
 * announced is announced once, and forgotten again when it leaves
 * review, so the next time it comes back it is announced again.
 *
 * The very first sweep announces nothing. Everything already in
 * review on the day this ships has been there a while, and telling a
 * client about all of it at once would be noise, not news.
 */
export function sweepReview(
  known: readonly string[] | null, inReview: readonly string[],
): { announce: string[]; remember: string[] } {
  const now = [...new Set(inReview.map(hex))];
  if (known === null) return { announce: [], remember: now };
  const seen = new Set(known.map(hex));
  return { announce: now.filter((id) => !seen.has(id)), remember: now };
}
