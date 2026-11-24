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
import { REVIEW_STATUS } from '../../../src/data/push';
import { portalNotFound } from '../../../src/server/portal-auth';
import { CONTENT_DB, queryAll, readRelation, readSelect, readText } from '../../../src/server/portal-notion';
import { pushConfig, sweepAllReview, type PushEnv } from '../../../src/server/push';

interface Env extends HqEnv, HqDataEnv, Pick<PushEnv, 'VAPID_PUBLIC_KEY' | 'VAPID_PRIVATE_KEY'> {}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;

  try {
    const { payload, timing } = await hqBuild(env);
    // The timing goes back with the data rather than only into a log:
    // the one person who can see this page is the one person who
    // needs to know when it is getting slow.
    console.log('hq: built', JSON.stringify(timing));
    // A card moved into review in Notion itself never passes through
    // our save, so it is looked for here, on fresh data only, after
    // the answer has gone. See sweepAllReview.
    if (!timing.cached && pushConfig(env as PushEnv)) waitUntil(reviewSweep(env as PushEnv & { NOTION_TOKEN: string }, payload.clients));
    return hqJson({ ok: true, viewer: gate.viewer, ...payload, timing });
  } catch (err) {
    console.error('hq: building the payload threw', err);
    // Not a 404: the caller is a verified admin, so they get to know
    // that it broke rather than being told HQ does not exist.
    return hqJson({ ok: false, error: 'build_failed' }, 502);
  }
};

/** Every card in review that a client can see, announced if it has
 *  not been. Asked of Notion directly, not read off the payload: the
 *  payload is a window of dates, and a card outside it would be
 *  forgotten and then announced a second time when it came back in. */
async function reviewSweep(
  env: PushEnv & { NOTION_TOKEN: string }, clients: ReadonlyArray<{ pageId: string; slug: string | null }>,
): Promise<void> {
  try {
    const hex = (id: string) => id.replace(/-/g, '').toLowerCase();
    const slugOf = new Map(clients.filter((c) => c.slug).map((c) => [hex(c.pageId), c.slug as string]));
    const rows = await queryAll(env.NOTION_TOKEN, CONTENT_DB, {
      filter: { and: [
        { property: 'Status', select: { equals: REVIEW_STATUS } },
        { property: 'Hide from Client', checkbox: { equals: false } },
      ] },
    });
    const cards = rows
      // A delivery is ours start to finish and is never reviewed.
      .filter((r: any) => !readSelect(r.properties?.['Deliverable']))
      .map((r: any) => ({
        slug: slugOf.get(hex(readRelation(r.properties?.['Client'])[0] ?? '')) ?? '',
        id: String(r.id), title: (readText(r.properties?.['Content']) ?? '').trim(),
      }))
      .filter((c) => c.slug);
    const sent = await sweepAllReview(env, [...new Set(slugOf.values())], cards);
    if (sent) console.log('hq: review sweep sent', sent);
  } catch (err) {
    console.error('hq: review sweep failed', err);
  }
}

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET') return next();
  return portalNotFound();
};
