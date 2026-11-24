/* ──────────────────────────────────────────────────────────────
   The notification settings endpoint, shared by both portals.

     GET                     the public key a browser subscribes with,
                             and the kinds this viewer can be told about
     POST { action }
       status      { endpoint }               this device's choices
       subscribe   { subscription, prefs? }   remember this device
       prefs       { endpoint, prefs }        change what it is told
       unsubscribe { endpoint }               forget it

   The two callers (a client's portal and HQ) each work out WHO is
   asking from the signed session and hand that in. Nothing in a
   request says whose device this is or which audience it belongs to:
   a client's device is filed under the client's slug and can only
   ever be told a client's kinds.
   ────────────────────────────────────────────────────────────── */

import { PUSH_KIND_LABEL, cleanPrefs, cleanSubscription, kindsFor, type PushAudience } from '../data/push';
import { deviceState, forgetDevice, pushConfig, saveDevice, type PushEnv } from './push';

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' },
});

export interface PushCaller { audience: PushAudience; slug: string | null; who: string | null }

export function pushInfo(env: PushEnv, caller: PushCaller): Response {
  const cfg = pushConfig(env);
  return json({
    ok: true,
    // Null when the keys are not set, or there is nowhere to keep a
    // subscription. The page then says notifications are not set up,
    // and never asks the browser for permission it cannot use.
    key: cfg && env.PORTAL_KV ? cfg.publicKey : null,
    kinds: kindsFor(caller.audience).map((id) => ({ id, label: PUSH_KIND_LABEL[id] })),
  });
}

export async function pushAction(env: PushEnv, caller: PushCaller, body: Record<string, unknown>): Promise<Response> {
  if (!pushConfig(env) || !env.PORTAL_KV) return json({ ok: false, error: 'not_configured' }, 503);
  const action = typeof body.action === 'string' ? body.action : '';

  if (action === 'subscribe') {
    const sub = cleanSubscription(body.subscription);
    if (!sub) return json({ ok: false, error: 'invalid', rejected: ['subscription'] }, 400);
    const prefs = await saveDevice(env, caller.audience, caller.slug, sub, body.prefs, caller.who);
    return prefs ? json({ ok: true, subscribed: true, prefs }) : json({ ok: false, error: 'not_saved' }, 502);
  }

  const endpoint = cleanSubscription({ endpoint: body.endpoint, keys: { p256dh: 'A'.repeat(87), auth: 'A'.repeat(22) } })?.endpoint ?? null;
  if (!endpoint) return json({ ok: false, error: 'invalid', rejected: ['endpoint'] }, 400);

  if (action === 'status') {
    const prefs = await deviceState(env, caller.audience, caller.slug, endpoint);
    return json({ ok: true, subscribed: !!prefs, prefs: prefs ?? cleanPrefs(null, caller.audience) });
  }
  if (action === 'unsubscribe') {
    await forgetDevice(env, caller.audience, caller.slug, endpoint);
    return json({ ok: true, subscribed: false });
  }
  if (action === 'prefs') {
    // Only a device we already hold: its keys are ours from when it
    // subscribed, never from this request.
    const known = await deviceState(env, caller.audience, caller.slug, endpoint);
    if (!known) return json({ ok: false, error: 'not_subscribed' }, 409);
    const held = await heldKeys(env, caller, endpoint);
    if (!held) return json({ ok: false, error: 'not_subscribed' }, 409);
    const prefs = await saveDevice(env, caller.audience, caller.slug, { endpoint, keys: held }, body.prefs, caller.who);
    return prefs ? json({ ok: true, subscribed: true, prefs }) : json({ ok: false, error: 'not_saved' }, 502);
  }
  return json({ ok: false, error: 'invalid', rejected: ['action'] }, 400);
}

async function heldKeys(env: PushEnv, caller: PushCaller, endpoint: string): Promise<{ p256dh: string; auth: string } | null> {
  const key = caller.audience === 'admin' ? 'push:a' : caller.slug ? `push:c:${caller.slug}` : null;
  if (!env.PORTAL_KV || !key) return null;
  try {
    const list = JSON.parse((await env.PORTAL_KV.get(key)) ?? '[]') as Array<{ endpoint: string; keys: { p256dh: string; auth: string } }>;
    return list.find((d) => d.endpoint === endpoint)?.keys ?? null;
  } catch { return null; }
}
