/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/playbooks/apply — a client plans one of their
   own moments with one of their own type's playbooks.

     { momentId, playbook, dryRun: true }   the preview
     { momentId, playbook }                 write it

   The client is the session's, never the request's. The playbook has
   to be one their client type has, and the moment one of theirs that
   they can see. Flow and Owner come off the masters and their
   Approved overrides; nothing in the request can set either.

   What a client's apply does that ours does not:

     - a step that is THEIRS is created and is on their to-do list;
     - a step that is OURS is created waiting ("Pending Blueprint"),
       owes nothing, and counts toward nothing until one of us
       confirms it in HQ. What we take on in a month is ours to
       decide;
     - a step whose day has passed is created as Skipped. They cannot
       keep it live, and cannot say how many rows a step owes.

   One of us standing in their portal applies as one of us.
   ────────────────────────────────────────────────────────────── */

import { portalNotFound } from '../../../../src/server/portal-auth';
import { isNotionId } from '../../../../src/server/portal-notion';
import { readApplyAsk, runApply } from '../../../../src/server/playbook-apply';
import {
  beginWrite, bustDataCache, overLimit, writeOk, type WriteEnv,
} from '../../../../src/server/portal-write-shared';

const LIMIT = 30;
const WINDOW_SECONDS = 3600;

export const onRequestPost: PagesFunction<WriteEnv> = async ({ request, env, params }) => {
  const begun = await beginWrite(request, env, params.slug, { schema: false });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  const ask = readApplyAsk(ctx.body, isNotionId);
  if (!ask) return portalNotFound();
  const role = ctx.viewer.role;
  // A client cannot keep a late step or size a step of ours.
  if (role !== 'admin') { ask.keep = []; ask.pieces = {}; }
  if (!ask.dryRun && await overLimit('pa', ctx.slug, LIMIT, WINDOW_SECONDS)) {
    return writeOk({ ok: false, error: 'too_fast', message: 'That is a lot of planning at once. Give it a while and try again.' });
  }
  const out = await runApply(env.NOTION_TOKEN, {
    pageId: ctx.record.pageId, artist: ctx.record.client.artist, slug: ctx.record.slug, type: ctx.record.type,
  }, ask, role, new Date().toISOString().slice(0, 10));
  if (out.status === 404) return portalNotFound();
  if (!ask.dryRun && out.status === 200) await bustDataCache(ctx.slug, env);
  return writeOk(out.body);
};

export const onRequest: PagesFunction<WriteEnv> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
