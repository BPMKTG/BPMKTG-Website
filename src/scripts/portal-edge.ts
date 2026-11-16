/* ──────────────────────────────────────────────────────────────
   Dragging to a column that is off screen.

   A board wider than its window needs the far column to be one
   gesture away. Holding a card near either edge pulls the board along
   under it. Both boards use this, the campaign one and the client's
   own, so the feel is the same on each.

   The loop reschedules itself rather than waiting on dragover, because
   dragover stops firing the moment the pointer holds still, which is
   exactly when someone is waiting for the board to move.

   Scroll snapping and a drag do not mix. A board snaps by the column,
   so a 15px nudge is rounded straight back to where it started and
   the board never moves at all. Snapping is turned off for the length
   of the drag (the `pt-board-free` class) and put back afterwards.
   ────────────────────────────────────────────────────────────── */

/** How near an edge counts as being at it. */
const EDGE = 72;
/** Pixels per frame hard against the edge, easing to nothing at EDGE. */
const EDGE_RATE = 22;

export interface EdgeScroll {
  /** Forget the scrollers of the last draw. */
  reset: () => void;
  /** A scroller that should follow a drag held at its edge. */
  watch: (scroller: HTMLElement) => void;
  /** A drag began: let the scrollers move freely. */
  start: () => void;
  /** A drag ended, wherever it ended. */
  stop: () => void;
}

export function createEdgeScroll(dragging: () => boolean): EdgeScroll {
  let frame = 0;
  let rate = 0;
  let scrollers: HTMLElement[] = [];

  function halt(): void {
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    rate = 0;
  }

  function step(sc: HTMLElement): void {
    frame = 0;
    if (!dragging() || !rate) return;
    const was = sc.scrollLeft;
    sc.scrollLeft = was + rate;
    // Hitting the end is the one way this stops on its own.
    if (sc.scrollLeft === was) { rate = 0; return; }
    frame = requestAnimationFrame(() => step(sc));
  }

  /** Aim the loop from where the pointer is, or call it off. */
  function aim(sc: HTMLElement, x: number): void {
    const r = sc.getBoundingClientRect();
    const fromLeft = x - r.left;
    const fromRight = r.right - x;
    let next = 0;
    if (fromLeft < EDGE) next = -EDGE_RATE * (1 - Math.max(0, fromLeft) / EDGE);
    else if (fromRight < EDGE) next = EDGE_RATE * (1 - Math.max(0, fromRight) / EDGE);
    next = Math.round(next);
    if (!next) { halt(); return; }
    rate = next;
    if (!frame) frame = requestAnimationFrame(() => step(sc));
  }

  const free = (on: boolean) => { for (const sc of scrollers) sc.classList.toggle('pt-board-free', on); };

  return {
    reset: () => { scrollers = []; halt(); },
    watch: (sc) => {
      scrollers.push(sc);
      sc.addEventListener('dragover', (ev) => { if (dragging()) aim(sc, ev.clientX); });
      sc.addEventListener('drop', halt);
    },
    start: () => free(true),
    stop: () => { halt(); free(false); },
  };
}
