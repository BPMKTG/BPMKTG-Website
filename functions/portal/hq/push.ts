/* ──────────────────────────────────────────────────────────────
   /portal/hq/push — our own notification settings.

   Admin only, like the rest of HQ. A device subscribed here is told
   about clients approving, asking for changes and sending ideas, and
   about previews that failed. It is never told a client's kinds.

   See src/server/push-endpoint.ts for what it accepts.
   ────────────────────────────────────────────────────────────── */

import { beginHq, type HqEnv } from '../../../src/server/hq-auth';
import { portalNotFound } from '../../../src/server/portal-auth';
import { isJsonRequest, isSameOrigin, readJsonBody } from '../../../src/server/portal-write';
import { pushAction, pushInfo } from '../../../src/server/push-endpoint';
import type { PushEnv } from '../../../src/server/push';

type Env = HqEnv & PushEnv;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  return pushInfo(env, { audience: 'admin', slug: null, who: gate.viewer.who });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  if (!isSameOrigin(request) || !isJsonRequest(request)) return portalNotFound();
  const body = await readJsonBody(request);
  if (!body) return portalNotFound();
  return pushAction(env, { audience: 'admin', slug: null, who: gate.viewer.who }, body);
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'POST') return next();
  return portalNotFound();
};
