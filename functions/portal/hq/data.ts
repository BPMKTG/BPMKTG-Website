/* ──────────────────────────────────────────────────────────────
   GET /portal/hq/data — every client, in one payload.

   Admin only, through the same gate as the shell. A client session
   gets the portal's 404 here, exactly as if the route did not exist.

   One read serves all four tabs. That is a deliberate trade: a bigger
   payload once, rather than a query per tab and a spinner every time
   Mason switches between Today and Pipeline. The work behind it is
   cached in KV for ninety seconds and dropped by any HQ write.
   ────────────────────────────────────────────────────────────── */

import { beginHq, hqJson, type HqEnv } from '../../../src/server/hq-auth';
import { hqBuild, type HqDataEnv } from '../../../src/server/hq-data';
import { portalNotFound } from '../../../src/server/portal-auth';

interface Env extends HqEnv, HqDataEnv {}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;

  try {
    const { payload, timing } = await hqBuild(env);
    // The timing goes back with the data rather than only into a log:
    // the one person who can see this page is the one person who
    // needs to know when it is getting slow.
    console.log('hq: built', JSON.stringify(timing));
    return hqJson({ ok: true, viewer: gate.viewer, ...payload, timing });
  } catch (err) {
    console.error('hq: building the payload threw', err);
    // Not a 404: the caller is a verified admin, so they get to know
    // that it broke rather than being told HQ does not exist.
    return hqJson({ ok: false, error: 'build_failed' }, 502);
  }
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET') return next();
  return portalNotFound();
};
