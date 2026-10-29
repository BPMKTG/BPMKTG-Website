/* ──────────────────────────────────────────────────────────────
   POST /portal/login/start — ask for a code.

   Answers the same thing to everyone: a 200 with the same sentence,
   whether the address belongs to a client, to an admin, to a client
   whose portal we switched off, or to nobody at all.

   That is the whole design. An endpoint that said "no such account"
   would be a way to ask whether a given artist is a Blueprint client,
   and a way to harvest which of a leaked address list is ours.
   ────────────────────────────────────────────────────────────── */

import {
  failureCount,
  portalNotFound,
  recordFailure,
  sha256Hex,
  RL_LIMIT,
} from '../../../src/server/portal-auth';
import { findClientByEmail } from '../../../src/server/portal-notion';
import {
  CODE_SECONDS,
  NEUTRAL,
  hashCode,
  looksLikeEmail,
  makeCode,
  normaliseEmail,
  overRequestLimit,
  parseAdminEmails,
  putCode,
  sendCode,
  type CodeStore,
  type PendingCode,
} from '../../../src/server/portal-login';

interface Env {
  NOTION_TOKEN: string;
  /** Workers KV. Without it there is nowhere durable to keep a code,
   *  so sign-in is off rather than unreliable. */
  PORTAL_KV?: CodeStore;
  ADMIN_EMAILS?: string;
  RESEND_API_KEY?: string;
  PORTAL_MAIL_FROM?: string;
}

const MAX_BODY = 1024;

/** The one answer. No cache, no index, no detail. */
function neutral(): Response {
  return new Response(JSON.stringify({ ok: true, message: NEUTRAL }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow',
    },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.NOTION_TOKEN) {
    console.error("portal: NOTION_TOKEN isn't set");
    return neutral();
  }
  if (!env.PORTAL_KV) {
    // Deliberately still neutral. A login that is not configured and a
    // login that refused you should look the same from outside.
    console.error('portal: PORTAL_KV is not bound, sign-in is off');
    return neutral();
  }

  const ip = request.headers.get('CF-Connecting-IP') ?? '0.0.0.0';
  const cache = caches.default;
  // Per IP, checked before Notion is touched. The per-address limit
  // below is the one that protects an inbox; this one stops a script
  // walking a list of addresses from one machine.
  if ((await failureCount(cache, ip)) >= RL_LIMIT) return neutral();

  let email = '';
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) return neutral();
    const body = JSON.parse(raw) as { email?: unknown };
    email = normaliseEmail(body.email);
  } catch {
    return neutral();
  }

  if (!looksLikeEmail(email)) {
    await recordFailure(cache, ip);
    return neutral();
  }

  const emailHash = await sha256Hex(email);

  // Five an hour, per address. Checked before the lookup, so a flood
  // against one address does not turn into a flood against Notion.
  if (await overRequestLimit(env.PORTAL_KV, emailHash)) {
    console.error('portal: code requests over the hourly limit');
    return neutral();
  }

  const admins = parseAdminEmails(env.ADMIN_EMAILS);
  let pending: PendingCode | null = null;
  let artist = '';

  const code = makeCode();
  const exp = Math.floor(Date.now() / 1000) + CODE_SECONDS;

  if (admins.includes(email)) {
    pending = { hash: await hashCode(email, code), email, role: 'admin', slug: '', exp, tries: 0 };
  } else {
    try {
      const record = await findClientByEmail(env.NOTION_TOKEN, email);
      if (record) {
        artist = record.client.artist;
        pending = {
          hash: await hashCode(email, code),
          email,
          role: 'client',
          slug: record.slug,
          exp,
          tries: 0,
        };
      }
    } catch (err) {
      console.error('portal: client lookup by email threw', err);
    }
  }

  // An address nobody has gets the same answer, and gets it here
  // rather than earlier, so the work done is roughly the same either
  // way. Nothing is stored and nothing is sent.
  if (!pending) return neutral();

  await putCode(env.PORTAL_KV, emailHash, pending);
  // Whether the mail went is logged, never answered. A client who
  // learned that sending failed would have learned the address exists.
  await sendCode(env, email, code, artist);

  return neutral();
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
