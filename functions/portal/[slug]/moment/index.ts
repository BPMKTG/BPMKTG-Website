/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/moment — a client adds their own event.

     { event, city?, momentType, date, dateEnd?, notes? }

   WHOSE moment it is comes from the signed session and the slug, by
   way of beginWrite, and never from the request: there is no client
   field to send. The Moment Type has to be one this client's type
   has. A moment a client adds is flagged ("Pending Blueprint"), which
   is how HQ's Today list tells us about it.

   One of us, standing in a client's portal, can use it too, and then
   nothing is flagged.
   ────────────────────────────────────────────────────────────── */

import { portalNotFound } from '../../../../src/server/portal-auth';
import { createMoment } from '../../../../src/server/playbook-apply';
import {
  beginWrite, bustDataCache, overLimit, writeOk, type WriteEnv,
} from '../../../../src/server/portal-write-shared';

/** A handful a day is a season being typed in. More is a script. */
const LIMIT = 20;
const WINDOW_SECONDS = 3600;

export const onRequestPost: PagesFunction<WriteEnv> = async ({ request, env, params }) => {
  const begun = await beginWrite(request, env, params.slug, { schema: false });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  if (await overLimit('mo', ctx.slug, LIMIT, WINDOW_SECONDS)) {
    return writeOk({ ok: false, error: 'too_fast', message: 'That is a lot of events at once. Give it a while and try again.' });
  }
  const out = await createMoment(env.NOTION_TOKEN, {
    pageId: ctx.record.pageId, artist: ctx.record.client.artist, slug: ctx.record.slug, type: ctx.record.type,
  }, ctx.body, ctx.viewer.role);
  if (out.status === 200) await bustDataCache(ctx.slug, env);
  // Said rather than returned as a 404: a date typed wrong is not a
  // forged request, and the form has to be able to say which field.
  return writeOk(out.body);
};

export const onRequest: PagesFunction<WriteEnv> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
