/* ──────────────────────────────────────────────────────────────
   PATCH /portal/<slug>/step/<id> — the client ticks off a to-do.

   The only writable thing on Campaign Calendar. A client may move one
   of their OWN steps between Not Started, In Progress and Done, and
   nothing else: not a moment, not one of our steps, not a step we have
   taken out of the plan, and no property other than Status. The write
   also stamps Last Edited By, which the client does not get to choose:
   it is read off the session, not off the request.

   Three separate checks, all server side, because the id comes from
   whoever is asking:

     1. the page belongs to this slug's client, is not hidden and is a
        step rather than a moment or a playbook template  (Notion),
     2. its Owner is Client  (Notion),
     3. the status asked for, and the status it is in now, are both in
        STEP_CLIENT_STATUSES.

   Every failure returns the same 404 the rest of the portal uses.
   ────────────────────────────────────────────────────────────── */

import { canClientSetStep } from '../../../../src/data/portal';
import { portalNotFound } from '../../../../src/server/portal-auth';
import { fetchOwnedStep, updateStepStatus } from '../../../../src/server/portal-notion';
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
  // the only value this endpoint writes is checked against a list of
  // three strings that lives in the code.
  const begun = await beginWrite(request, env, params.slug, { schema: false });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;

  const step = await fetchOwnedStep(env.NOTION_TOKEN, ctx.record.pageId, id);
  if (!step) return portalNotFound();

  const wanted = ctx.body.status;
  // The status it is in NOW, read from Notion rather than from the
  // request, is half of what decides whether this move is legal.
  if (!canClientSetStep(step, wanted)) return portalNotFound();
  const status = wanted as string;

  // Already there. Nothing is written and nothing is invalidated, which
  // is what a double tap on a phone looks like.
  if (step.status === status) return writeOk({ ok: true, id, status, changed: false });

  // Stamped the same way a content write is: Blueprint when one of us
  // ticked it off on a client's behalf, Client when they did it
  // themselves. Status is still the only value this endpoint decides.
  const saved = await updateStepStatus(
    env.NOTION_TOKEN,
    id,
    stampEdit({ Status: { select: { name: status } } }, ctx.viewer.role),
  );
  if (!saved) return portalNotFound();

  await bustDataCache(ctx.slug);
  return writeOk({ ok: true, id, status: saved, changed: true });
};

export const onRequest: PagesFunction<WriteEnv> = async ({ request, next }) => {
  if (request.method === 'PATCH') return next();
  return portalNotFound();
};
