/**
 * Moving things to another day.
 *
 * A step is one row, and moves like a tick does: on screen first, back
 * where it was if the server says no.
 *
 * A moment is a campaign. Moving one drags everything that counts down
 * to it, including rows the client never sees, so it asks first, says
 * how many rows it is about to touch, and can be taken back for as
 * long as the toast is up and a while after.
 *
 * Both screens do this, through the same endpoints and the same
 * checks. HQ is not given a shortcut: it sends `role: 'admin'` to the
 * same `/portal/<slug>/step/<id>` the client's own drag uses, and the
 * server decides. The only thing the host supplies is which client's
 * endpoint a row belongs to, which on the portal is always the one
 * client and in HQ is read off the row.
 */
import {
  MAX_MOVE_DAYS,
  daysBetween,
  movesWithMoment,
  shiftIsoDay,
  type PortalCalendarItem,
  type PortalMoment,
} from '../data/portal';
import { el, fmtDate, show } from './portal-dom';
import { openSheet, sheetSubmit } from './portal-sheet';

export interface MoveResult {
  ok?: boolean;
  error?: string;
  message?: string;
  days?: number;
  title?: string;
  date?: string;
  /** A preview: how many steps would move. */
  moves?: number;
  /** A real move: how many did. */
  moved?: number;
  failed?: number;
  frozen?: number;
  undo?: string;
  undone?: boolean;
}

export interface MoveHost {
  /** The client this row belongs to, as a portal slug. The portal
   *  answers with its one client; HQ looks the row up. Null means the
   *  row cannot be written, which is treated as a refusal. */
  slugOf(it: PortalCalendarItem): string | null;
  /** The rows on screen, shifted in place so a moved campaign does not
   *  wait for a round trip to look moved. */
  rows(): PortalCalendarItem[];
  /** Whether this row is draggable at all. The calendar module's own
   *  check, so the drawer and the drag agree. */
  canMoveStep(it: PortalCalendarItem): boolean;
  /** Put the new dates on screen. */
  redraw(): void;
  /** Read the rows again from the server and redraw. Used when a move
   *  half-landed, where the only honest thing to show is Notion. */
  reload(): Promise<boolean>;
  toast(text: string, bad?: boolean): void;
  undoToast(text: string, undo: () => void): void;
}

const dayWord = (days: number) =>
  `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} ${days > 0 ? 'later' : 'earlier'}`;
const stepWord = (n: number) => (n === 1 ? 'step' : 'steps');

export function createMover(H: MoveHost) {
  const base = (it: PortalCalendarItem): string | null => {
    const slug = H.slugOf(it);
    return slug ? `/portal/${encodeURIComponent(slug)}` : null;
  };

  /** One step onto another day, dragged or picked from the drawer. */
  async function moveStep(it: PortalCalendarItem, iso: string, offerUndo = true) {
    const before = it.date;
    if (!before || before === iso) return;
    if (!H.canMoveStep(it)) { H.toast('That one is ours to schedule.', true); return; }

    it.date = iso;
    H.redraw();

    if (!(await patchStepDate(it, iso))) {
      it.date = before;
      H.redraw();
      H.toast('That did not save. Check your connection and try again.', true);
      return;
    }
    if (offerUndo) {
      H.undoToast(`Moved to ${fmtDate(iso)}`, () => { void moveStep(it, before, false); });
    }
  }

  async function patchStepDate(it: PortalCalendarItem, date: string): Promise<boolean> {
    const root = base(it);
    if (!root) return false;
    try {
      const res = await fetch(`${root}/step/${encodeURIComponent(it.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ date }),
      });
      if (!res.ok) return false;
      const out = await res.json() as { ok?: boolean; date?: string };
      // The server replies with the date as it now stands. Anything
      // else means it refused.
      return !!out.ok && out.date === date;
    } catch {
      return false;
    }
  }

  async function postMove(
    it: PortalCalendarItem,
    body: Record<string, unknown>,
  ): Promise<MoveResult | null> {
    const root = base(it);
    if (!root) return null;
    try {
      const res = await fetch(`${root}/moment/${encodeURIComponent(it.id)}/move`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      return await res.json() as MoveResult;
    } catch {
      return null;
    }
  }

  /** A drop on a day, which is a question rather than a save. False
   *  when there was nothing to ask about, so a caller that disabled
   *  its own button can put it back. */
  function askMoveMoment(it: PortalCalendarItem, iso: string): boolean {
    if (!it.date || it.date === iso) return false;
    const days = daysBetween(it.date, iso);
    if (days === null || days === 0) return false;
    if (Math.abs(days) > MAX_MOVE_DAYS) {
      H.toast(`A move has to be within ${MAX_MOVE_DAYS} days. Ask us to shift it further.`, true);
      return false;
    }
    openMomentSheet(it, iso, days);
    return true;
  }

  /**
   * The confirm, and then the progress.
   *
   * The count comes from the server, not from the chips on screen: the
   * cascade moves rows the client cannot see, and a dialog that said
   * "4 steps" before moving 13 of them would be the wrong number in
   * the one place it has to be right.
   */
  function openMomentSheet(it: PortalCalendarItem, iso: string, days: number) {
    openSheet(`Move ${it.title}?`, (form, close) => {
      form.appendChild(el('p', 'pt-move-when',
        `${fmtDate(it.date)} to ${fmtDate(iso)}, ${dayWord(days)}.`));

      const count = el('p', 'pt-move-count', 'Counting its campaign steps…');
      form.appendChild(count);

      const frozen = el('p', 'pt-sheet-note');
      show(frozen, false);
      form.appendChild(frozen);

      const bar = el('div', 'pt-move-bar');
      bar.appendChild(el('span'));
      show(bar, false);
      form.appendChild(bar);

      const go = sheetSubmit(form, 'Move it');
      go.disabled = true;
      const cancel = el('button', 'pt-btn') as HTMLButtonElement;
      cancel.type = 'button';
      cancel.textContent = 'Leave it';
      cancel.addEventListener('click', close);
      go.parentElement?.prepend(cancel);

      void (async () => {
        const pre = await postMove(it, { days, preview: true });
        if (!pre || !pre.ok) {
          count.textContent = pre?.message
            ?? 'We could not work out what that would move. Try again in a moment.';
          return;
        }
        const n = pre.moves ?? 0;
        count.textContent = n
          ? `This also moves its ${n} campaign ${stepWord(n)}.`
          : 'Nothing else is hanging off it, so only the date moves.';
        if (pre.frozen) {
          frozen.textContent = `${pre.frozen} ${stepWord(pre.frozen)} `
            + `${pre.frozen === 1 ? 'stays' : 'stay'} put: done, skipped, or out of the plan.`;
          show(frozen, true);
        }
        go.disabled = false;
      })();

      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        if (go.disabled) return;
        go.disabled = true;
        cancel.disabled = true;
        go.textContent = 'Moving…';
        count.textContent = 'Moving the campaign. This takes a few seconds.';
        show(frozen, false);
        show(bar, true);

        const out = await postMove(it, { days });
        close();
        finishMove(it, days, out);
      });
    });
  }

  function finishMove(it: PortalCalendarItem, days: number, out: MoveResult | null) {
    if (!out || !out.ok) {
      H.toast(out?.message ?? 'That did not move. Nothing has changed.', true);
      // Part of it may have landed before it stopped, so the only
      // honest thing to show is whatever Notion actually holds.
      void H.reload();
      return;
    }
    const failed = out.failed ?? 0;
    if (failed) {
      H.toast(`Moved, but ${failed} ${stepWord(failed)} did not. We will sort it out.`, true);
      void H.reload();
      return;
    }

    shiftCampaign(it.id, days);
    const moved = out.moved ?? 0;
    const text = moved
      ? `Moved ${it.title} and ${moved} ${stepWord(moved)}`
      : `Moved ${it.title}`;
    const token = out.undo;
    if (token) H.undoToast(text, () => { void undoMove(it, token); });
    else H.toast(text);
  }

  async function undoMove(it: PortalCalendarItem, token: string) {
    const out = await postMove(it, { undo: token });
    const ok = !!out?.ok && !out.failed;
    // Either way the screen is rebuilt from the server rather than by
    // shifting back by hand: an undo is rare, and being right about it
    // matters more than being quick.
    await H.reload();
    H.toast(ok
      ? `${it.title} is back where it was`
      : 'We could not put all of that back. This is what we have now.', !ok);
  }

  /**
   * The same arithmetic the server just did, applied to what is on
   * screen, so a moved campaign does not wait for a round trip to look
   * moved.
   *
   * Which rows move is not decided twice: movesWithMoment is the one
   * rule, and the endpoint and this both read it.
   */
  function shiftCampaign(momentId: string, days: number) {
    // Every step of a moment shares ONE flattened copy of it, so the
    // copy is shifted once by identity rather than once per step.
    const seen = new Set<PortalMoment>();
    for (const i of H.rows()) {
      const own = i.id === momentId;
      if (own || (i.moment?.id === momentId && movesWithMoment(i))) {
        const next = i.date ? shiftIsoDay(i.date, days) : null;
        if (next) i.date = next;
      }
      const m = i.moment;
      if (m && m.id === momentId && !seen.has(m)) {
        seen.add(m);
        const next = m.date ? shiftIsoDay(m.date, days) : null;
        if (next) m.date = next;
      }
    }
    H.redraw();
  }

  return { moveStep, askMoveMoment, shiftCampaign };
}

export type Mover = ReturnType<typeof createMover>;
