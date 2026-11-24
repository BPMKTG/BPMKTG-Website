/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/vault/cron   the daily sync.

   A Pages site has no clock of its own, so a small scheduled Worker
   (workers/vault-sync) calls this once a day, and keeps calling
   until the answer says there is no more to do. Each call syncs one
   client.

   There is no cookie here, because there is no person. The Worker
   sends a secret both sides were given by hand (VAULT_CRON_SECRET),
   as a bearer token. Without the secret set on this side, or with
   the wrong one sent, this is the portal's 404, the same as a page
   that does not exist. It can do nothing but start a sync, which
   reads Drive and changes nothing in it.
   ────────────────────────────────────────────────────────────── */

import { portalNotFound, timingSafeEqual } from '../../../../src/server/portal-auth';
import { syncNext, type VaultEnv } from '../../../../src/server/vault-sync';

type Env = VaultEnv & { VAULT_CRON_SECRET?: string };

/** The daily run takes every client whose last good sync is more
 *  than this old, which on a daily clock is all of them, while a
 *  second call a moment later does not do the same client twice. */
const CRON_FRESH_MS = 60 * 60 * 1000;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const secret = (env.VAULT_CRON_SECRET ?? '').trim();
  // Too short to be a secret is the same as not set.
  if (secret.length < 24 || !env.NOTION_TOKEN) return portalNotFound();
  const sent = /^Bearer\s+(.+)$/i.exec(request.headers.get('Authorization') ?? '')?.[1]?.trim() ?? '';
  if (!sent || !(await timingSafeEqual(sent, secret))) return portalNotFound();

  const out = await syncNext(env, { freshMs: CRON_FRESH_MS });
  if (out.synced) console.log('vault: daily sync', out.synced, out.ok ? 'ok' : `failed: ${out.note ?? ''}`);
  return new Response(JSON.stringify({ ok: true, synced: out.synced, synced_ok: out.ok, more: out.more }), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
