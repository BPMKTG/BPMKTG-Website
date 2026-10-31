/* ──────────────────────────────────────────────────────────────
   PATCH /portal/<slug>/step/<id> — the client ticks off a to-do, or
   drags it to another day.

   The only writable things on Campaign Calendar, and only two of
   them: Status and Date. A client may move one of their OWN steps
   between Not Started, In Progress and Done, and give it a different
   day. Nothing else: not a moment, not one of our steps, not a step we
   have taken out of the plan, and no property beyond those two. The
   write also stamps Last Edited By, which the client does not get to
   choose: it is read off the session, not off the request.

   Offset (days) is deliberately left alone. It is the playbook's
   default position for this step, and dragging one step to a different
   day is an override of that default, not a rewrite of it.

   Three separate checks, all server side, because the id comes from
   whoever is asking:

     1. the page belongs to this slug's client, is not hidden and is a
        step rather than a moment or a playbook template  (Notion),
     2. its Owner is Client, unless one of us is the one asking,
     3. the status asked for, and the status it is in now, are both in
        STEP_CLIENT_STATUSES.

   Every failure returns the same 404 the rest of the portal uses.
   ────────────────────────────────────────────────────────────── */

import { canClientSetStep, canSetStepDate, isIsoDay } from '../../../../src/data/portal';
import { portalNotFound } from '../../../../src/server/portal-auth';
import { fetchOwnedStep, patchCalendarPage } from '../../../../src/server/portal-notion';
import { stampEdit } from '../../../../src/server/portal-write';
import {
  beginWrite,
  bustDataCache,
  writeOk,
  type WriteEnv,
} from '../../../../src/server/portal-write-shared';

/** A Notion page id, dashed or not. Anything else never reaches the
 *  API: a path segment is not a safe thing to put in a URL. */
const ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

export const onRequestPatch: PagesFunction<WriteEnv> = async ({ request, env, params }) => {
  const id = String(params.id ?? '');
  if (!ID.test(id)) return portalNotFound();

  // Same preamble as a content write: signed cookie, same origin, JSON
  // body, slug, rate limit, client lookup. No content schema, because
  // the only values this endpoint writes are a string checked against
  // a list of three and a date checked against a regular expression.
  const begun = await beginWrite(request, env, params.slug, { schema: false });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;

  const step = await fetchOwnedStep(env.NOTION_TOKEN, ctx.record.pageId, id);
  if (!step) return portalNotFound();

  const props: Record<string, unknown> = {};
  let status = step.status;
  let date = step.date;

  if ('status' in ctx.body) {
    const wanted = ctx.body.status;
    // The status it is in NOW, read from Notion rather than from the
    // request, is half of what decides whether this move is legal.
    if (!canClientSetStep(step, wanted)) return portalNotFound();
    status = wanted as string;
    props.Status = { select: { name: status } };
  }

  if ('date' in ctx.body) {
    const wanted = ctx.body.date;
    if (!isIsoDay(wanted)) return portalNotFound();
    // Who may move what is a different question from who may tick
    // what: one of us standing in a client's portal may re-date any
    // step, which is the only place an admin is allowed more.
    if (!canSetStepDate(step, ctx.viewer.role)) return portalNotFound();
    date = wanted;
    props.Date = { date: { start: date } };
  }

  // A request that asked for nothing we write is not a request.
  if (!Object.keys(props).length) return portalNotFound();

  // Already there. Nothing is written and nothing is invalidated, which
  // is what a double tap on a phone, or a drop back on the same day,
  // looks like.
  if (status === step.status && date === step.date) {
    return writeOk({ ok: true, id, status, date, changed: false });
  }

  // Stamped the same way a content write is: Blueprint when one of us
  // did it on a client's behalf, Client when they did it themselves.
  const saved = await patchCalendarPage(env.NOTION_TOKEN, id, stampEdit(props, ctx.viewer.role));
  if (!saved) return portalNotFound();

  await bustDataCache(ctx.slug);
  return writeOk({ ok: true, id, status: saved.status, date: saved.date, changed: true });
};

export const onRequest: PagesFunction<WriteEnv> = async ({ request, next }) => {
  if (request.method === 'PATCH') return next();
  return portalNotFound();
};
