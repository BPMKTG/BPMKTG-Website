/* ──────────────────────────────────────────────────────────────
   PATCH /portal/<slug>/step/<id> — the client ticks off a to-do,
   drags it to another day, or writes the note it asks for.

   The only writable things on Campaign Calendar, and only three of
   them: Status, Date and Client Notes. A client may move one of their
   OWN steps between Not Started, In Progress and Done, give it a
   different day, and, on a step whose master asks for a note, write
   one. Nothing else: not a moment, not one of our steps, not a step we
   have taken out of the plan, and no property beyond those three. The
   write also stamps Last Edited By, which the client does not get to
   choose: it is read off the session, not off the request.

   The note is plain text and is stored as plain text. It goes to
   Client Notes and never to Notes, which is ours and is never sent to
   a client.

   A step that moves takes its Planned pieces with it: the Content
   Pipeline rows linked to it get the step's new day as their Post
   Date. A piece past Planned is never moved from here.

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

import {
  canSetStepStatus, canSetStepDate, canWriteStepNote, cleanStepNote, isIsoDay,
} from '../../../../src/data/portal';
import { portalNotFound } from '../../../../src/server/portal-auth';
import { fetchOwnedStep, patchCalendarPage } from '../../../../src/server/portal-notion';
import { editedBy, stampEdit } from '../../../../src/server/portal-write';
import { followSteps } from '../../../../src/server/pieces';
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
  let note = step.clientNotes ?? '';

  if ('status' in ctx.body) {
    const wanted = ctx.body.status;
    // The status it is in NOW, read from Notion rather than from the
    // request, is half of what decides whether this move is legal. The
    // role is the other half, the same way it is for the date below:
    // a client may only tick their own steps, and one of us may tick
    // any of them, because HQ's Today list holds both.
    if (!canSetStepStatus(step, wanted, ctx.viewer.role)) return portalNotFound();
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

  if ('note' in ctx.body) {
    // Who may write it is decided from the row as Notion has it, like
    // the other two. What they wrote is checked on its own: a string,
    // trimmed, and short enough to be stored whole.
    if (!canWriteStepNote(step, ctx.viewer.role)) return portalNotFound();
    const wanted = cleanStepNote(ctx.body.note);
    if (wanted === undefined) return portalNotFound();
    if (wanted !== note) {
      note = wanted;
      props['Client Notes'] = { rich_text: note ? [{ text: { content: note } }] : [] };
    }
  }

  // A request that asked for nothing we write is not a request.
  const asked = 'status' in ctx.body || 'date' in ctx.body || 'note' in ctx.body;
  if (!asked) return portalNotFound();

  // Already there. Nothing is written and nothing is invalidated, which
  // is what a double tap on a phone, or a drop back on the same day,
  // looks like.
  if (status === step.status && date === step.date && !('Client Notes' in props)) {
    return writeOk({ ok: true, id, status, date, note, changed: false });
  }

  // Stamped the same way a content write is: Blueprint when one of us
  // did it on a client's behalf, Client when they did it themselves.
  const saved = await patchCalendarPage(env.NOTION_TOKEN, id, stampEdit(props, ctx.viewer.role));
  if (!saved) return portalNotFound();

  // A step and the piece it delivers are one job seen twice, so the
  // piece's Post Date follows the step to its new day. Only a piece
  // that is still Planned: past that, its date is somebody's decision.
  let pieces = 0;
  if (date !== step.date) {
    try {
      pieces = (await followSteps(env.NOTION_TOKEN, ctx.record.pageId,
        [{ id, date: saved.date }], editedBy(ctx.viewer.role), 6)).moved;
    } catch (err) {
      // The step moved. A piece that did not is put right the next
      // time the step moves, and is not a reason to tell the person
      // dragging that their drag failed.
      console.error('portal: a step moved but its pieces did not follow', id, err);
    }
  }

  await bustDataCache(ctx.slug, env);
  return writeOk({ ok: true, id, status: saved.status, date: saved.date, note, changed: true, pieces });
};

export const onRequest: PagesFunction<WriteEnv> = async ({ request, next }) => {
  if (request.method === 'PATCH') return next();
  return portalNotFound();
};
