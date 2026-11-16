/* ──────────────────────────────────────────────────────────────
   A sideways scroll bar that stays in reach.

   A board is wider than its window and often several screens tall. A
   browser draws the bar for it at the very bottom of the board, so on
   a long board the one control that moves it sideways is somewhere
   below the fold, and on a Mac it is invisible until you are already
   scrolling.

   This draws a bar of our own under the board and pins it to the
   bottom of the window for as long as any of the board is on screen.
   It is always visible, and it is the same bar wherever you are in
   the board. The board's own bar is hidden while this one is up, so
   there are never two.

   Nothing is taken away: a trackpad, shift and the wheel, and a drag
   held at an edge all still move the board, and this bar follows.
   It is for a pointer, so it is hidden from assistive tech; a
   keyboard reaches a far column by tabbing to a card in it.
   ────────────────────────────────────────────────────────────── */

/** The thumb never gets smaller than this, however wide the board. */
const MIN_THUMB = 56;
/** How much of a screenful a click on the track moves the board. */
const PAGE = 0.85;

export function createHScroll(scroller: HTMLElement): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'pt-hbar';
  bar.setAttribute('aria-hidden', 'true');
  bar.hidden = true;
  const thumb = document.createElement('div');
  thumb.className = 'pt-hbar-thumb';
  bar.appendChild(thumb);

  /** Thumb width and how far it can travel, for the board as it is. */
  function geometry() {
    const span = scroller.scrollWidth - scroller.clientWidth;
    // The thumb runs inside the bar's padding, not over it.
    const cs = getComputedStyle(bar);
    const track = bar.clientWidth - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
    const width = Math.max(MIN_THUMB, Math.round((track * scroller.clientWidth) / (scroller.scrollWidth || 1)));
    return { span, track, width, travel: Math.max(0, track - width) };
  }

  function sync(): void {
    const over = scroller.scrollWidth - scroller.clientWidth > 1;
    if (bar.hidden === over) {
      bar.hidden = !over;
      scroller.classList.toggle('pt-board-barred', over);
    }
    if (!over) return;
    const g = geometry();
    const at = g.span > 0 ? Math.min(1, Math.max(0, scroller.scrollLeft / g.span)) : 0;
    thumb.style.width = `${g.width}px`;
    thumb.style.transform = `translateX(${Math.round(g.travel * at)}px)`;
  }

  scroller.addEventListener('scroll', sync, { passive: true });
  // Fires once when the board first lays out, and again whenever the
  // window, and so the board, changes width.
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(sync).observe(scroller);
  else requestAnimationFrame(sync);

  /* Dragging the thumb. The board snaps by the column, and a snap
     fights a drag one nudge at a time, so it is let go for the length
     of the drag, the same as when a card is in the air. */
  let grab: { x: number; left: number } | null = null;
  thumb.addEventListener('pointerdown', (ev) => {
    if (ev.button !== 0) return;
    ev.preventDefault();
    ev.stopPropagation();
    grab = { x: ev.clientX, left: scroller.scrollLeft };
    thumb.setPointerCapture(ev.pointerId);
    thumb.classList.add('pt-hbar-held');
    scroller.classList.add('pt-board-free');
  });
  thumb.addEventListener('pointermove', (ev) => {
    if (!grab) return;
    const g = geometry();
    if (!g.travel) return;
    scroller.scrollLeft = grab.left + ((ev.clientX - grab.x) * g.span) / g.travel;
  });
  const release = (ev: PointerEvent) => {
    if (!grab) return;
    grab = null;
    try { thumb.releasePointerCapture(ev.pointerId); } catch { /* already gone */ }
    thumb.classList.remove('pt-hbar-held');
    scroller.classList.remove('pt-board-free');
  };
  thumb.addEventListener('pointerup', release);
  thumb.addEventListener('pointercancel', release);

  // A click on the track, either side of the thumb, turns the page.
  bar.addEventListener('pointerdown', (ev) => {
    if (ev.target !== bar || ev.button !== 0) return;
    const t = thumb.getBoundingClientRect();
    const dir = ev.clientX < t.left ? -1 : 1;
    scroller.scrollBy({ left: dir * scroller.clientWidth * PAGE, behavior: 'smooth' });
  });

  // A sideways swipe that happens to start on the bar still counts.
  bar.addEventListener('wheel', (ev) => {
    const dx = ev.deltaX || (ev.shiftKey ? ev.deltaY : 0);
    if (dx) scroller.scrollLeft += dx;
  }, { passive: true });

  return bar;
}
