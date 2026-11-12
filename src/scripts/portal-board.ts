/* ──────────────────────────────────────────────────────────────
   The Content Pipeline board, drawn the same way on both screens.

   This is the second thing the client portal and Blueprint HQ share
   outright, after the calendar, and it is here for the same reason:
   two boards drifting apart means a card reads one way to the client
   and another way to us, and then nobody trusts either.

   The host supplies what differs:

     role      'client' or 'admin'. The only thing it changes is who
               may drag what, and that question is answered by canDrop
               in the data layer, not here.
     items     the cards to draw, already filtered by whatever the
               surface's own toolbar says.
     clientOf  HQ only: the artist whose card this is, so a
               cross-client board says whose work it is looking at.

   Nothing in this file talks to Notion. A drop calls host.setStatus
   and that is the end of its involvement: the server decides, and the
   server asks canDrop again.
   ────────────────────────────────────────────────────────────── */

import {
  canDrop,
  cardDate,
  clientFilms,
  dropStatus,
  DRAG_BLOCKED,
  REVIEW_LABEL,
  STAGE_NOTE,
  STAGE_ORDER,
  STAGE_TITLE,
  stageOf,
  type PortalContentItem,
  type ReviewAction,
  type Stage,
} from '../data/portal-content';
import { el, fmtDateShort, icon, isNarrow } from './portal-dom';

/** Which icon stands for each Source on a card. */
const SOURCE_ICON: Record<string, string> = {
  'Client Films': 'film',
  'Show Media': 'ticket',
  'Flyer / Graphic': 'folder',
};

export interface BoardHost {
  role: () => 'client' | 'admin';
  items: () => PortalContentItem[];
  /** Today, so the Posted window is the host's idea of now. */
  now: () => Date;
  bucketColor: (name: string | null) => string;
  openCard: (c: PortalContentItem) => void;
  /** Write the new status. The board does not wait on it: the host
   *  redraws when the save comes back, the same as everywhere else. */
  setStatus: (c: PortalContentItem, status: string) => void;
  toast: (text: string, bad?: boolean) => void;
  /** An empty state in the host's own voice. */
  empty: (title: string, body: string) => HTMLElement;
  /** Whether the host's toolbar is filtering, which changes what an
   *  empty board means: nothing here, or nothing matching. */
  filtering: () => boolean;
  /** The phone layout shows one column at a time, and which one is
   *  the host's state because the host owns the redraw. */
  col: { get: () => string; set: (v: string) => void };
  redraw: () => void;
  /** Client only: the two buttons on a card awaiting review. */
  reviewAct?: (c: PortalContentItem, action: ReviewAction) => void;
  /** HQ only: whose card this is. */
  clientOf?: (c: PortalContentItem) => string | null;
}

export interface Board {
  draw: () => HTMLElement;
}

interface Col {
  stage: Stage;
  items: PortalContentItem[];
  list?: HTMLElement;
}

export function createBoard(host: BoardHost): Board {
  let DRAG: PortalContentItem | null = null;
  let COLS: Col[] = [];

  /** Picking a card up answers the question for every column at once,
   *  so the client sees where it can go before they let go of it. */
  function markDropTargets(card: PortalContentItem | null): void {
    for (const c of COLS) {
      if (!c.list) continue;
      const refuses = !!card
        && !canDrop(card, c.stage, host.role())
        && !c.items.some((i) => i.id === card.id);
      c.list.classList.toggle('pt-board-dim', refuses);
    }
  }

  /** Why this column would not take this card. Two different noes, and
   *  a client told the wrong one goes looking in the wrong place. */
  function refusal(card: PortalContentItem, stage: Stage): string {
    if (dropStatus(card, stage) === null) {
      return clientFilms(card.source)
        ? 'This one is yours to film, so it lives in To film.'
        : 'That column is for a different kind of card.';
    }
    return DRAG_BLOCKED;
  }

  function cardEl(c: PortalContentItem): HTMLElement {
    const card = el('article', 'pt-ccard');
    const open = el('button', 'pt-ccard-open');
    open.type = 'button';
    open.setAttribute('aria-label', `Open ${c.title}`);
    open.addEventListener('click', () => host.openCard(c));

    // A shoot-code title ("SM L1D1") is how he names things, so it is
    // shown exactly as typed and never prettied up.
    open.appendChild(el('span', 'pt-ccard-title', c.title));

    const who = host.clientOf?.(c) ?? null;
    if (who) open.appendChild(el('span', 'pt-ccard-who', who));

    const tags = el('span', 'pt-ccard-tags');
    if (c.bucket) {
      tags.appendChild(el('span', `pt-bchip pt-nc-${host.bucketColor(c.bucket)}`, c.bucket));
    }
    for (const f of c.format) tags.appendChild(el('span', 'pt-tag', f));
    if (c.shootCode && c.shootCode !== c.title) {
      tags.appendChild(el('span', 'pt-ccard-code pt-num', c.shootCode));
    }
    if (tags.firstChild) open.appendChild(tags);

    const meta = el('span', 'pt-ccard-meta');
    const line = dateLine(c);
    if (line) meta.appendChild(el('span', undefined, line));
    if (c.source && SOURCE_ICON[c.source]) {
      const s = el('span', 'pt-ccard-src');
      s.appendChild(icon(SOURCE_ICON[c.source]));
      s.appendChild(el('span', undefined, c.source));
      meta.appendChild(s);
    }
    if (meta.firstChild) open.appendChild(meta);

    const badges = el('span', 'pt-ccard-badges');
    if (c.postedBy === 'Client') badges.appendChild(el('span', 'pt-tag pt-tag-todo', 'You post'));
    if (c.status === 'Ready for Review') {
      badges.appendChild(el('span', 'pt-tag pt-tag-review',
        c.feedback ? 'Changes requested' : 'Needs your review'));
    }
    if (badges.firstChild) open.appendChild(badges);

    card.appendChild(open);

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

    if (!isNarrow()) {
      card.draggable = true;
      const grip = el('span', 'pt-ccard-grip');
      grip.setAttribute('aria-hidden', 'true');
      grip.appendChild(icon('grip'));
      card.appendChild(grip);
      card.addEventListener('dragstart', (ev) => {
        DRAG = c;
        card.classList.add('pt-ccard-dragging');
        markDropTargets(c);
        ev.dataTransfer?.setData('text/plain', c.title);
        if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        DRAG = null;
        card.classList.remove('pt-ccard-dragging');
        markDropTargets(null);
      });
    }
    return card;
  }

  /** The one date that matters next for this card.
   *
   *  Film by only ever appears on a card the client films. A flyer we
   *  are drawing carries a Film By too, and showing it told the client
   *  to go and shoot something that was never theirs to shoot. */
  function dateLine(c: PortalContentItem): string | null {
    if (c.status === 'Posted') return c.postDate ? `Posted ${fmtDateShort(c.postDate)}` : null;
    const d = cardDate(c);
    return d ? `${d.label} ${fmtDateShort(d.date)}` : null;
  }

  function column(c: Col): HTMLElement {
    const col = el('section', 'pt-board-col');
    col.appendChild(el('span', 'pt-board-accent'));

    const head = el('div', 'pt-board-col-head');
    head.appendChild(el('h3', undefined, STAGE_TITLE[c.stage]));
    head.appendChild(el('span', 'pt-board-count pt-num', String(c.items.length)));
    const note = STAGE_NOTE[c.stage];
    if (note) head.appendChild(el('span', 'pt-board-col-note', note));
    col.appendChild(head);

    const list = el('div', 'pt-board-list');
    c.list = list;
    if (!c.items.length) list.appendChild(el('p', 'pt-board-none', 'Nothing here'));
    for (const item of c.items) list.appendChild(cardEl(item));

    if (!isNarrow()) {
      // preventDefault runs whether or not the column will take the
      // card, because a drop event only fires on a target that allowed
      // the dragover. Without it a refused drop is silent, and silent
      // is the one thing it must not be: the card springs back and the
      // reader is left guessing whether they missed or we said no.
      list.addEventListener('dragover', (ev) => {
        if (!DRAG) return;
        if (c.items.some((i) => i.id === DRAG!.id)) return;
        ev.preventDefault();
        const ok = canDrop(DRAG, c.stage, host.role());
        list.classList.toggle('pt-board-drop', ok);
        list.classList.toggle('pt-board-nodrop', !ok);
      });
      list.addEventListener('dragleave', () => {
        list.classList.remove('pt-board-drop', 'pt-board-nodrop');
      });
      list.addEventListener('drop', (ev) => {
        ev.preventDefault();
        list.classList.remove('pt-board-drop', 'pt-board-nodrop');
        const item = DRAG;
        DRAG = null;
        if (!item) return;
        if (!canDrop(item, c.stage, host.role())) { host.toast(refusal(item, c.stage), true); return; }
        const to = dropStatus(item, c.stage);
        if (to) host.setStatus(item, to);
      });
    }
    col.appendChild(list);
    return col;
  }

  function draw(): HTMLElement {
    const now = host.now();
    const items = host.items();
    COLS = STAGE_ORDER.map((stage) => ({
      stage,
      items: items.filter((c) => stageOf(c, now) === stage),
    }));

    const total = COLS.reduce((n, c) => n + c.items.length, 0);
    if (!total) {
      return host.filtering()
        ? host.empty('Nothing matches that', 'Try a different filter to see the rest of the board.')
        : host.empty('Nothing is moving yet',
                     'A card joins the board as soon as it has a shoot date or a post date.');
    }

    const wrap = el('div', 'pt-boardwrap');

    // On a phone, a pill row picks the one column worth the width.
    if (isNarrow()) {
      const keys = COLS.map((c) => c.stage as string);
      if (!keys.includes(host.col.get())) {
        host.col.set((COLS.find((c) => c.items.length) ?? COLS[0]).stage);
      }
      const pills = el('div', 'pt-pillrow');
      pills.setAttribute('role', 'tablist');
      for (const c of COLS) {
        const on = c.stage === host.col.get();
        const b = el('button', 'pt-pill' + (on ? ' pt-pill-on' : ''));
        b.type = 'button';
        b.setAttribute('aria-pressed', String(on));
        b.append(el('span', undefined, STAGE_TITLE[c.stage]),
                 el('span', 'pt-pill-n pt-num', String(c.items.length)));
        b.addEventListener('click', () => { host.col.set(c.stage); host.redraw(); });
        pills.appendChild(b);
      }
      wrap.appendChild(pills);
      const only = COLS.find((c) => c.stage === host.col.get()) ?? COLS[0];
      wrap.appendChild(column(only));
      return wrap;
    }

    const scroller = el('div', 'pt-board');
    scroller.dataset.boardScroll = 'true';
    for (const c of COLS) scroller.appendChild(column(c));
    wrap.appendChild(scroller);
    return wrap;
  }

  return { draw };
}
