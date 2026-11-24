/* ──────────────────────────────────────────────────────────────
   /portal/<slug>/push — a client's notification settings.

   For the client whose portal this is, and nobody else. One of us
   looking at a client's portal is refused here: our notifications are
   set in HQ, and an admin must not be able to subscribe their own
   phone to a client's "needs your review".

   See src/server/push-endpoint.ts for what it accepts.
   ────────────────────────────────────────────────────────────── */

import {
  isValidSlug, normaliseSlug, portalNotFound, readViewer, sessionSecret,
} from '../../../src/server/portal-auth';
import { findClientBySlug } from '../../../src/server/portal-notion';
import { isJsonRequest, isSameOrigin, readJsonBody } from '../../../src/server/portal-write';
import { overLimit, type WriteEnv } from '../../../src/server/portal-write-shared';
import { pushAction, pushInfo, type PushCaller } from '../../../src/server/push-endpoint';
import type { PushEnv } from '../../../src/server/push';

type Env = WriteEnv & PushEnv;

async function caller(request: Request, env: Env, rawSlug: unknown): Promise<PushCaller | null> {
  if (!env.NOTION_TOKEN) return null;
  const slug = normaliseSlug(rawSlug as string);
  if (!isValidSlug(slug)) return null;
  const viewer = await readViewer(request, sessionSecret(env), slug);
  if (!viewer || viewer.role !== 'client') return null;
  return { audience: 'client', slug, who: viewer.who };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const who = await caller(request, env, params.slug);
  return who ? pushInfo(env, who) : portalNotFound();
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!isSameOrigin(request) || !isJsonRequest(request)) return portalNotFound();
  const who = await caller(request, env, params.slug);
  if (!who || !who.slug) return portalNotFound();
  if (await overLimit('ps', who.slug, 40, 600)) return portalNotFound();
  const body = await readJsonBody(request);
  if (!body) return portalNotFound();
  // The portal has to be on. A switched-off portal keeps no devices.
  const record = await findClientBySlug(env.NOTION_TOKEN, who.slug);
  if (!record || !record.portalEnabled) return portalNotFound();
  return pushAction(env, who, body);
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'POST') return next();
  return portalNotFound();
};
