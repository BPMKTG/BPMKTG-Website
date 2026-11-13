/* ──────────────────────────────────────────────────────────────
   The Content Pipeline board, drawn the same way on both screens.

   This is the second thing the client portal and Blueprint HQ share
   outright, after the calendar, and it is here for the same reason:
   two boards drifting apart means a card reads one way to the client
   and another way to us, and then nobody trusts either.

   Five columns, the same five for every kind of piece: Plan, Make,
   Review, Ready, Posted. Whose move it is inside a column is said on
   the card, in one line, and not by which column the card is in.

   One board can draw several lanes. The Campaigns view is a lane per
   moment, and a card picked up in one lane has to dim the columns of
   every lane, so the drag state belongs to the board and not to the
   lane.

   The host supplies what differs:

     role      'client' or 'admin'. The only thing it changes is who
               may drag what, and that question is answered by canDrop
               in the data layer, not here.
     voice     who the client is to the reader: their name in HQ,
               "You" to them.
     clientOf  HQ only: the artist whose card this is, so a
               cross-client board says whose work it is looking at.

   Nothing in this file talks to Notion. A drop calls host.setStatus
   and that is the end of its involvement: the server decides, and the
   server asks canDrop again.
   ────────────────────────────────────────────────────────────── */

import {
  canClientMove,
  canDrop,
  dropStatus,
  isFilmJob,
  latestFeedback,
  nextMove,
  shortDay,
  stageOf,
  DRAG_BLOCKED,
  REVIEW_LABEL,
  STAGE_ORDER,
  STAGE_TITLE,
  type PortalContentItem,
  type ReviewAction,
  type Stage,
  type Voice,
} from '../data/portal-content';
import { el, icon } from './portal-dom';

/** Which sprite icon stands for each Media. An unclassified row reads
 *  as a video, which is what nearly all of them are. */
export const MEDIA_ICON: Record<string, string> = {
  Video: 'video',
  Photo: 'photo',
  Carousel: 'carousel',
  Graphic: 'graphic',
  Story: 'story',
};

/** Below this the board becomes a list. Narrower than the portal's
 *  usual break: five columns still fit on a tablet held sideways, and
 *  a list is the worse view wherever the board fits. */
export const isPhone = () => window.matchMedia('(max-width: 767px)').matches;

export interface BoardHost {
  role: () => 'client' | 'admin';
  /** Who the client of this card is to whoever is reading. */
  voice: (c: PortalContentItem) => Voice;
  /** The campaign a card belongs to, by name, or null. */
  momentOf: (c: PortalContentItem) => string | null;
  openCard: (c: PortalContentItem) => void;
  /** Write the new status. The board does not wait on it: the host
   *  redraws when the save comes back, the same as everywhere else. */
  setStatus: (c: PortalContentItem, status: string) => void;
  toast: (text: string, bad?: boolean) => void;
  /** Client only: the two buttons on a card awaiting review. */
  reviewAct?: (c: PortalContentItem, action: ReviewAction) => void;
  /** HQ only: whose card this is. */
  clientOf?: (c: PortalContentItem) => string | null;
}

export interface Board {
  /** Forget the lanes of the last draw. Call once per redraw. */
  begin: () => void;
  /** Five columns of these cards. */
  lane: (items: PortalContentItem[], opts?: LaneOpts) => HTMLElement;
  /** The same cards as a list grouped by stage, for a phone: no
   *  dragging, and a menu on each card to move it. */
  list: (items: PortalContentItem[], opts?: LaneOpts) => HTMLElement;
  /** One card, for a view that lays them out itself. */
  card: (c: PortalContentItem, opts?: { menu?: boolean }) => HTMLElement;
}

/** A lane under a heading that already names the campaign and the
 *  client does not need every card in it to say so again. */
export interface LaneOpts { inCampaign?: boolean }

interface Col {
  stage: Stage;
  list: HTMLElement;
}

export function createBoard(host: BoardHost): Board {
  let DRAG: PortalContentItem | null = null;
  /** Every column of every lane in the current draw. */
  let COLS: Col[] = [];
  let SCROLLERS: HTMLElement[] = [];

  /** Picking a card up answers the question for every column at once,
   *  so the reader sees where it can go before they let go of it. */
  function markDropTargets(card: PortalContentItem | null): void {
    for (const c of COLS) {
      const refuses = !!card
        && !canDrop(card, c.stage, host.role())
        && stageOf(card) !== c.stage;
      c.list.classList.toggle('pt-board-dim', refuses);
    }
  }

  /* ── dragging to a column that is off screen ─────────────────── */
  // On a narrow window five columns do not all fit. Holding the card
  // near an edge pulls the board along under it, so the far column is
  // one gesture away.
  //
  // The loop reschedules itself rather than waiting on dragover,
  // because dragover stops firing the moment the pointer holds still,
  // which is exactly when someone is waiting for the board to move.

  /** How near an edge counts as being at it. */
  const EDGE = 72;
  /** Pixels per frame hard against the edge, easing to nothing at EDGE. */
  const EDGE_RATE = 22;

  let edgeFrame = 0;
  let edgeRate = 0;

  // Scroll snapping and a drag do not mix. The board snaps by the
  // column, so a 15px nudge is rounded straight back to where it
  // started and the board never moves at all. Snapping is turned off
  // for the length of the drag and put back afterwards.
  function edgeFree(on: boolean): void {
    for (const sc of SCROLLERS) sc.classList.toggle('pt-board-free', on);
  }

  function edgeStop(): void {
    if (edgeFrame) cancelAnimationFrame(edgeFrame);
    edgeFrame = 0;
    edgeRate = 0;
  }

  function edgeStep(sc: HTMLElement): void {
    edgeFrame = 0;
    if (!DRAG || !edgeRate) return;
    const was = sc.scrollLeft;
    sc.scrollLeft = was + edgeRate;
    // Hitting the end is the one way this stops on its own.
    if (sc.scrollLeft === was) { edgeRate = 0; return; }
    edgeFrame = requestAnimationFrame(() => edgeStep(sc));
  }

  /** Aim the loop from where the pointer is, or call it off. */
  function edgeAim(sc: HTMLElement, x: number): void {
    const r = sc.getBoundingClientRect();
    const fromLeft = x - r.left;
    const fromRight = r.right - x;
    let rate = 0;
    if (fromLeft < EDGE) rate = -EDGE_RATE * (1 - Math.max(0, fromLeft) / EDGE);
    else if (fromRight < EDGE) rate = EDGE_RATE * (1 - Math.max(0, fromRight) / EDGE);
    rate = Math.round(rate);
    if (!rate) { edgeStop(); return; }
    edgeRate = rate;
    if (!edgeFrame) edgeFrame = requestAnimationFrame(() => edgeStep(sc));
  }

  /* ── one card ─────────────────────────────────────────────────── */

  function cardEl(
    c: PortalContentItem,
    opts: { menu?: boolean; drag?: boolean; inCampaign?: boolean } = {},
  ): HTMLElement {
    const card = el('article', 'pt-ccard');
    const voice = host.voice(c);
    const move = nextMove(c, voice);
    if (move?.waiting) card.dataset.waiting = move.waiting;

    const open = el('button', 'pt-ccard-open');
    open.type = 'button';
    open.setAttribute('aria-label', `Open ${c.title}`);
    open.addEventListener('click', () => host.openCard(c));

    // A shoot-code title ("SM L1D1") is how he names things, so it is
    // shown exactly as typed and never prettied up.
    open.appendChild(el('span', 'pt-ccard-title', c.title));

    const who = opts.inCampaign ? null : host.clientOf?.(c) ?? null;
    if (who) open.appendChild(el('span', 'pt-ccard-who', who));

    // The next move: the one line on the card that is an instruction
    // rather than a fact. The dot says whose it is at a glance.
    if (move) {
      const line = el('span', 'pt-ccard-next');
      const dot = el('span', 'pt-ccard-dot');
      dot.setAttribute('aria-hidden', 'true');
      line.append(dot, el('span', undefined, move.text));
      open.appendChild(line);
    }

    // What it is, and when it goes out. The date is left off when the
    // line above has already said it.
    const meta = el('span', 'pt-ccard-meta');
    const media = c.media ?? 'Video';
    const m = el('span', 'pt-ccard-media');
    m.appendChild(icon(MEDIA_ICON[media] ?? 'video'));
    m.appendChild(el('span', undefined, media));
    meta.appendChild(m);
    const day = shortDay(c.postDate);
    if (day && !(move?.text ?? '').includes(day)) {
      meta.appendChild(el('span', 'pt-ccard-day pt-num', day));
    }
    open.appendChild(meta);

    // Which campaign it is for, and who puts it up. One row, so a card
    // is four lines tall rather than six.
    const foot = el('span', 'pt-ccard-foot');
    const camp = opts.inCampaign ? null : host.momentOf(c);
    foot.appendChild(el('span', 'pt-ccard-camp', camp ?? ''));
    if (c.postedBy === 'Blueprint') {
      foot.appendChild(el('span', 'pt-tag pt-tag-ours', 'Blueprint posts'));
    } else if (c.postedBy === 'Client') {
      foot.appendChild(el('span', 'pt-tag pt-tag-todo',
        voice.you ? 'You post' : `${voice.name} posts`));
    }
    if (foot.firstChild) open.appendChild(foot);

    card.appendChild(open);

    // The latest note on the thread, on the face of the card. A row
    // that lands back in Make carries the reason it was sent there, so
    // whoever picks it up does not have to open the drawer to find out
    // what to change.
    const note = latestFeedback(c.feedback);
    if (note && c.status !== 'Posted') {
      const p = el('p', 'pt-ccard-note');
      p.appendChild(el('span', 'pt-ccard-note-lab',
        note.who === 'Blueprint' ? 'Blueprint said' : 'Asked for'));
      p.appendChild(el('span', undefined, note.text));
      card.appendChild(p);
    }

    // A card waiting on the client gets the two answers on its face.
    // Buried in the drawer, "your review" was a status rather than a
    // thing to do, and cards sat in it for days.
    if (c.status === 'Ready for Review' && host.role() === 'client' && host.reviewAct) {
      const acts = el('div', 'pt-ccard-acts');
      for (const a of ['approve', 'changes'] as ReviewAction[]) {
        const b = el('button', `pt-ccard-act pt-ccard-act-${a}`, REVIEW_LABEL[a]);
        b.type = 'button';
        b.addEventListener('click', (ev) => { ev.stopPropagation(); host.reviewAct!(c, a); });
        acts.appendChild(b);
      }
      card.appendChild(acts);
    }

    // The one thing a client does to a card of ours before review:
    // say they have filmed it. A button, because the other way to say
    // it is to drag the card into Make, and nobody guesses that.
    if (c.status === 'Planned' && host.role() === 'client' && isFilmJob(c)
        && canClientMove(c.status, 'Filmed', { postedBy: c.postedBy, source: c.source })) {
      const acts = el('div', 'pt-ccard-acts');
      const b = el('button', 'pt-ccard-act pt-ccard-act-filmed', 'I filmed it');
      b.type = 'button';
      b.addEventListener('click', (ev) => { ev.stopPropagation(); host.setStatus(c, 'Filmed'); });
      acts.appendChild(b);
      card.appendChild(acts);
    }

    if (opts.menu) {
      const menu = moveMenu(c);
      if (menu) card.appendChild(menu);
    }

    if (opts.drag) {
      card.draggable = true;
      const grip = el('span', 'pt-ccard-grip');
      grip.setAttribute('aria-hidden', 'true');
      grip.appendChild(icon('grip'));
      card.appendChild(grip);
      card.addEventListener('dragstart', (ev) => {
        DRAG = c;
        edgeFree(true);
        card.classList.add('pt-ccard-dragging');
        markDropTargets(c);
        ev.dataTransfer?.setData('text/plain', c.title);
        if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        DRAG = null;
        edgeStop();
        edgeFree(false);
        card.classList.remove('pt-ccard-dragging');
        markDropTargets(null);
      });
    }
    return card;
  }

  /** Move a card to a stage, or say out loud why not. The one path a
   *  drop and a menu both take. */
  function moveTo(c: PortalContentItem, stage: Stage): void {
    if (stageOf(c) === stage) return;
    if (!canDrop(c, stage, host.role())) { host.toast(DRAG_BLOCKED, true); return; }
    host.setStatus(c, dropStatus(c, stage, host.role()));
  }

  /**
   * The phone's answer to dragging: a menu on the card.
   *
   * It lists every stage, including the ones this viewer may not move
   * this card to. Leaving them out would make a Blueprint card look
   * like it simply has fewer places to go; listed and answered with the
   * toast, it says whose it is.
   */
  function moveMenu(c: PortalContentItem): HTMLElement | null {
    const here = stageOf(c);
    if (!here) return null;
    const wrap = el('label', 'pt-ccard-move');
    wrap.appendChild(el('span', undefined, 'Move to'));
    const sel = el('select', 'pt-select') as HTMLSelectElement;
    sel.setAttribute('aria-label', `Move ${c.title} to another stage`);
    for (const stage of STAGE_ORDER) {
      const o = el('option', undefined, STAGE_TITLE[stage]) as HTMLOptionElement;
      o.value = stage;
      if (stage === here) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener('change', () => {
      const to = sel.value as Stage;
      // Put the menu back first: if the move is refused the card has
      // not gone anywhere, and if it is allowed the redraw replaces it.
      sel.value = here;
      moveTo(c, to);
    });
    wrap.appendChild(sel);
    return wrap;
  }

  /* ── columns and lanes ────────────────────────────────────────── */

  function column(stage: Stage, items: PortalContentItem[], opts: LaneOpts): HTMLElement {
    const col = el('section', 'pt-board-col');
    col.dataset.stage = stage;
    col.appendChild(el('span', 'pt-board-accent'));

    const head = el('div', 'pt-board-col-head');
    head.appendChild(el('h3', undefined, STAGE_TITLE[stage]));
    head.appendChild(el('span', 'pt-board-count pt-num', String(items.length)));
    col.appendChild(head);

    const list = el('div', 'pt-board-list');
    COLS.push({ stage, list });
    if (!items.length) list.appendChild(el('p', 'pt-board-none', 'Nothing here'));
    for (const item of items) list.appendChild(cardEl(item, { drag: true, ...opts }));

    // preventDefault runs whether or not the column will take the
    // card, because a drop event only fires on a target that allowed
    // the dragover. Without it a refused drop is silent, and silent
    // is the one thing it must not be: the card springs back and the
    // reader is left guessing whether they missed or we said no.
    list.addEventListener('dragover', (ev) => {
      if (!DRAG) return;
      if (stageOf(DRAG) === stage) return;
      ev.preventDefault();
      const ok = canDrop(DRAG, stage, host.role());
      list.classList.toggle('pt-board-drop', ok);
      list.classList.toggle('pt-board-nodrop', !ok);
    });
    list.addEventListener('dragleave', () => {
      list.classList.remove('pt-board-drop', 'pt-board-nodrop');
    });
    list.addEventListener('drop', (ev) => {
      ev.preventDefault();
      edgeStop();
      edgeFree(false);
      list.classList.remove('pt-board-drop', 'pt-board-nodrop');
      const item = DRAG;
      DRAG = null;
      if (item) moveTo(item, stage);
    });

    col.appendChild(list);
    return col;
  }

  /** Soonest first in every column but the last, where the newest
   *  post is the one worth seeing. Undated cards go to the bottom. */
  function inStage(items: PortalContentItem[], stage: Stage): PortalContentItem[] {
    const far = stage === 'posted' ? '0000' : '9999';
    const key = (c: PortalContentItem) => c.postDate ?? far;
    const dir = stage === 'posted' ? -1 : 1;
    return items
      .filter((c) => stageOf(c) === stage)
      .sort((a, b) => dir * key(a).localeCompare(key(b)) || a.title.localeCompare(b.title));
  }

  function lane(items: PortalContentItem[], opts: LaneOpts = {}): HTMLElement {
    const scroller = el('div', 'pt-board');
    scroller.dataset.boardScroll = 'true';
    SCROLLERS.push(scroller);
    scroller.addEventListener('dragover', (ev) => {
      if (DRAG) edgeAim(scroller, ev.clientX);
    });
    scroller.addEventListener('drop', edgeStop);
    for (const stage of STAGE_ORDER) {
      scroller.appendChild(column(stage, inStage(items, stage), opts));
    }
    return scroller;
  }

  function list(items: PortalContentItem[], opts: LaneOpts = {}): HTMLElement {
    const wrap = el('div', 'pt-stagelist');
    for (const stage of STAGE_ORDER) {
      const mine = inStage(items, stage);
      if (!mine.length) continue;
      const sec = el('section', 'pt-stagelist-sec');
      sec.dataset.stage = stage;
      const head = el('div', 'pt-stagelist-head');
      head.appendChild(el('h3', undefined, STAGE_TITLE[stage]));
      head.appendChild(el('span', 'pt-board-count pt-num', String(mine.length)));
      sec.appendChild(head);
      for (const item of mine) sec.appendChild(cardEl(item, { menu: true, ...opts }));
      wrap.appendChild(sec);
    }
    return wrap;
  }

  return {
    begin: () => { COLS = []; SCROLLERS = []; edgeStop(); },
    lane,
    list,
    card: (c, opts) => cardEl(c, opts),
  };
}
