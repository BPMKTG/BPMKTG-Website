/* ──────────────────────────────────────────────────────────────
   PATCH /portal/<slug>/moment/<id>/move — drag a show or a release,
   and take its campaign with it.

   This is the one write in the portal that touches many rows. Moving a
   release without its steps would leave a plan that counts down to a
   date the release is no longer on, so the steps move by exactly the
   number of days the moment moved, in one call, server side.

   Three things it answers:

     { days }                  do it
     { days, preview: true }   how many rows would that be?
     { undo: "<token>"}        put it all back

   The preview exists because the confirm dialog has to be honest about
   what it is about to do, and only the server can count the steps: the
   cascade deliberately includes rows the client never sees, because the
   plan in Notion has to stay coherent whoever dragged it.

   The undo token is a key into Workers KV, not a list of writes. A
   browser that could post its own "set these pages to these dates"
   would be a browser that could write any date onto any page id it
   could guess. The token is single use, and the pages it names are
   checked against Notion again before anything is written back.
   ────────────────────────────────────────────────────────────── */

import { daysBetween, isIsoDay, isMoveDays, MAX_MOVE_DAYS } from '../../../../../src/data/portal';
import { portalNotFound } from '../../../../../src/server/portal-auth';
import {
  fetchMomentSteps,
  fetchOwnedMoment,
  patchCalendarPage,
} from '../../../../../src/server/portal-notion';
import {
  dateProperty,
  isMoveUndo,
  MAX_CASCADE_STEPS,
  MOVE_LIMIT,
  MOVE_WINDOW_SECONDS,
  planMomentMove,
  reverseWrites,
  UNDO_SECONDS,
  type MoveUndo,
  type MoveWrite,
} from '../../../../../src/server/portal-move';
import { stampEdit } from '../../../../../src/server/portal-write';
import {
  beginWrite,
  bustDataCache,
  overLimit,
  writeOk,
  type WriteEnv,
} from '../../../../../src/server/portal-write-shared';

/** Workers KV, as little of it as the undo record needs. */
interface UndoStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
}

interface Env extends WriteEnv {
  /** Without it a move still works and simply cannot be undone, which
   *  is a smaller problem than refusing to move anything. */
  PORTAL_KV?: UndoStore;
}

const ID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

/** Notion writes in flight at once. Four is comfortably inside both
 *  Notion's rate limit and the subrequest budget for a campaign of
 *  thirty steps, and slow enough that a burst does not come back 429. */
const LANES = 4;

const undoKey = (token: string) => `undo:${token}`;

function newToken(): string {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Apply writes, a few at a time, and report what landed.
 *
 * A failure is not fatal and does not stop the rest: a cascade that
 * gave up halfway would leave the plan in a worse state than one that
 * finished and said which rows it could not do.
 */
async function applyWrites(
  token: string,
  writes: MoveWrite[],
  role: 'client' | 'admin',
): Promise<{ done: MoveWrite[]; failed: number }> {
  const done: MoveWrite[] = [];
  let failed = 0;
  let next = 0;

  async function lane(): Promise<void> {
    for (;;) {
      const i = next++;
      if (i >= writes.length) return;
      const w = writes[i];
      const saved = await patchCalendarPage(token, w.id, stampEdit(dateProperty(w), role));
      if (saved) done.push(w); else failed += 1;
    }
  }

  await Promise.all(Array.from({ length: Math.min(LANES, writes.length) }, lane));
  return { done, failed };
}

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  const id = String(params.id ?? '');
  if (!ID.test(id)) return portalNotFound();

  const begun = await beginWrite(request, env, params.slug, { schema: false });
  if (!begun.ok) return begun.response;
  const { ctx } = begun;
  const role = ctx.viewer.role;

  // A counter of its own, on top of the ordinary write limit the
  // preamble already spent a token on. A preview costs nothing here:
  // it reads and writes nothing, and the dialog asks for one before
  // every move.
  if (ctx.body.preview !== true
      && await overLimit('mv', ctx.slug, MOVE_LIMIT, MOVE_WINDOW_SECONDS)) {
    console.error('portal: cascade rate limit hit', ctx.slug);
    return writeOk({
      ok: false,
      error: 'too_fast',
      message: 'That is a lot of moving at once. Give it a minute and try again.',
    });
  }

  // Both the moment and its steps are read again on every call,
  // including an undo, so nothing is ever written to a page without a
  // fresh answer from Notion about who owns it.
  const moment = await fetchOwnedMoment(env.NOTION_TOKEN, ctx.record.pageId, id);
  if (!moment) return portalNotFound();
  const steps = await fetchMomentSteps(env.NOTION_TOKEN, ctx.record.pageId, id);

  /* ── put it back ───────────────────────────────────────────── */
  if (typeof ctx.body.undo === 'string') {
    const token = ctx.body.undo;
    if (!/^[0-9a-f]{32}$/.test(token) || !env.PORTAL_KV) return portalNotFound();

    const raw = await env.PORTAL_KV.get(undoKey(token));
    // Single use, burned on read. An Undo that half worked must not be
    // a thing you can keep pressing.
    await env.PORTAL_KV.delete(undoKey(token));
    if (!raw) return portalNotFound();

    let record: unknown;
    try { record = JSON.parse(raw); } catch { return portalNotFound(); }
    if (!isMoveUndo(record)) return portalNotFound();
    const undo = record as MoveUndo;
    if (undo.slug !== ctx.slug || undo.momentId !== id) return portalNotFound();
    if (undo.exp * 1000 <= Date.now()) return portalNotFound();

    // Only pages Notion still says belong to this client and this
    // moment. A row moved to another campaign in between is left where
    // it is rather than dragged back by a stale record.
    const allowed = new Set<string>(steps.map((s) => s.id));
    allowed.add(id);
    const back = reverseWrites(undo.writes).filter((w) => allowed.has(w.id));

    const { done, failed } = await applyWrites(env.NOTION_TOKEN, back, role);
    await bustDataCache(ctx.slug);
    return writeOk({
      ok: true,
      undone: true,
      days: -undo.days,
      moved: done.length,
      failed,
    });
  }

  /* ── count it, or do it ────────────────────────────────────── */
  const days = typeof ctx.body.days === 'number'
    ? ctx.body.days
    // A browser that would rather name the day than count the days.
    : daysBetween(moment.date, ctx.body.to);
  if (!isMoveDays(days)) {
    return writeOk({
      ok: false,
      error: 'bad_days',
      message: `A move has to be between 1 and ${MAX_MOVE_DAYS} days.`,
    });
  }

  // Said out loud rather than returned as a 404, because this one is
  // not a forged id or a permission problem: it is a campaign bigger
  // than one request can safely carry, and the person dragging it can
  // do nothing about that without being told.
  if (steps.length > MAX_CASCADE_STEPS) {
    console.error('portal: cascade refused,', steps.length, 'steps on', id);
    return writeOk({
      ok: false,
      error: 'too_many',
      message: 'This campaign has too many steps to move in one go. Ask us to shift it.',
    });
  }

  const plan = planMomentMove({ id, date: moment.date, dateEnd: moment.dateEnd }, steps, days);
  if (!plan) return portalNotFound();

  if (ctx.body.preview === true) {
    return writeOk({
      ok: true,
      preview: true,
      days,
      title: moment.title,
      from: plan.moment.from,
      to: plan.moment.to,
      moves: plan.steps.length,
      frozen: plan.frozen,
    });
  }

  // The moment first. If the one row the client actually dragged will
  // not write, nothing else should move either.
  const head = await patchCalendarPage(
    env.NOTION_TOKEN, id, stampEdit(dateProperty(plan.moment), role),
  );
  if (!head) return portalNotFound();

  const { done, failed } = await applyWrites(env.NOTION_TOKEN, plan.steps, role);
  await bustDataCache(ctx.slug);

  // Everything that landed, the moment included, so Undo puts back
  // exactly what was changed and nothing that was not.
  const record: MoveUndo = {
    slug: ctx.slug,
    momentId: id,
    days,
    writes: [plan.moment, ...done],
    exp: Math.floor(Date.now() / 1000) + UNDO_SECONDS,
  };

  let token = '';
  if (env.PORTAL_KV) {
    try {
      token = newToken();
      await env.PORTAL_KV.put(undoKey(token), JSON.stringify(record), {
        expirationTtl: UNDO_SECONDS,
      });
    } catch (err) {
      // No undo offered rather than an Undo button that does nothing.
      console.error('portal: storing the undo record threw', err);
      token = '';
    }
  } else {
    console.error('portal: PORTAL_KV is not bound, a move cannot be undone');
  }

  return writeOk({
    ok: true,
    days,
    title: moment.title,
    date: isIsoDay(head.date) ? head.date : plan.moment.to,
    moved: done.length,
    failed,
    frozen: plan.frozen,
    undo: token || undefined,
  });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'PATCH') return next();
  return portalNotFound();
};
