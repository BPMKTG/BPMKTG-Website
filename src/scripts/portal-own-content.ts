/* ──────────────────────────────────────────────────────────────
   My Content: the client's own board.

   This is the board the client had before the content rebuild,
   brought back from git rather than rebuilt: Ideas by bucket, the
   eight-column pipeline, and the Posted archive. The rebuild replaced
   it with one five-stage board for everything, which was right for
   campaign work and wrong for this. A client's own content is a film
   schedule in their own vocabulary (their buckets, To film, In edit)
   and they drag it around freely, because it is theirs.

   It lives in a module now, where it used to live inside the portal's
   page, because HQ shows the same board for each client and two copies
   of a board drift.

   Three things are kept from the rebuild: Media on the face of a card,
   the one drawer both portals share (the host opens it), and on a
   phone the pipeline is a list by stage with a menu on each card
   rather than one column behind a row of pills.

   Which rows are on this side is not decided here. The host hands
   over the rows that belong to no campaign.
   ────────────────────────────────────────────────────────────── */

import { parseNotionDate } from '../data/portal';
import {
  canDropOwn,
  cardDate,
  isOwnIdea,
  latestFeedback,
  ownDropStatus,
  ownStageOf,
  clientFilms,
  DRAG_BLOCKED,
  OWN_STAGE_NOTE,
  OWN_STAGE_ORDER,
  OWN_STAGE_TITLE,
  REVIEW_LABEL,
  type OwnStage,
  type PortalContentItem,
  type PortalContentSchema,
  type ReviewAction,
} from '../data/portal-content';
import { isPhone, MEDIA_ICON } from './portal-board';
import { el, fmtDateShort, icon, isNarrow, qq } from './portal-dom';
import { createEdgeScroll } from './portal-edge';

type OwnView = 'ideas' | 'pipeline' | 'posted';

const VIEWS: Array<[OwnView, string]> = [
  ['ideas', 'Ideas'], ['pipeline', 'Pipeline'], ['posted', 'Posted'],
];

/** Which icon stands for each Source on a card. */
const SOURCE_ICON: Record<string, string> = {
  'Client Films': 'film',
  'Show Media': 'ticket',
  'Flyer / Graphic': 'folder',
};

export interface OwnContentHost {
  /** Where this screen remembers which of the three views it was on. */
  storeKey: string;
  role: () => 'client' | 'admin';
  /** The rows that belong to no campaign, unfiltered. */
  items: () => PortalContentItem[];
  schema: () => PortalContentSchema;
  openCard: (c: PortalContentItem) => void;
  save: (c: PortalContentItem, patch: Record<string, unknown>,
         local: Partial<PortalContentItem>) => Promise<boolean>;
  /** Open the "new idea" form, in a bucket if one was asked for. */
  newIdea?: (bucket: string | null) => void;
  toast: (text: string, bad?: boolean) => void;
  empty: (title: string, body: string) => HTMLElement;
  now: () => Date;
  redraw: () => void;
  /** Client only: the two buttons on a card awaiting review. */
  reviewAct?: (c: PortalContentItem, action: ReviewAction) => void;
  /** HQ: whose card this is, where a board holds more than one client's. */
  clientOf?: (c: PortalContentItem) => string | null;
}

export interface OwnContent {
  draw: () => HTMLElement;
}

interface Column {
  key: string;
  title: string;
  color?: string;
  items: PortalContentItem[];
  /** What a card dropped here becomes. */
  onDrop: (c: PortalContentItem) => void;
  add?: () => void;
  /** The column heading already names the bucket. */
  hideBucket?: boolean;
}

export function createOwnContent(host: OwnContentHost): OwnContent {
  const OWN = {
    view: 'ideas' as OwnView,
    bucket: '',
    source: '',
    search: '',
    /** On a phone the Ideas board shows one bucket at a time; this is which. */
    col: '',
  };
  let DRAG: PortalContentItem | null = null;
  /** The pipeline's columns in the current draw, for dimming. */
  let PIPE: Array<{ stage: OwnStage; list: HTMLElement }> = [];
  const edge = createEdgeScroll(() => !!DRAG);

  (function load() {
    try {
      const v = JSON.parse(localStorage.getItem(host.storeKey) ?? 'null') as { view?: unknown } | null;
      if (v?.view === 'ideas' || v?.view === 'pipeline' || v?.view === 'posted') OWN.view = v.view;
    } catch { /* a browser that will not remember is not an error */ }
  })();
  const remember = () => {
    try { localStorage.setItem(host.storeKey, JSON.stringify({ view: OWN.view })); } catch { /* same */ }
  };

  /** The Notion colour of a bucket, so a card here and the same row in
   *  Notion read as the same thing. */
  const bucketColor = (name: string | null): string =>
    (name && host.schema().bucket.find((o) => o.name === name)?.color) || 'default';

  /* ── filtering ────────────────────────────────────────────────── */

  function matchesSearch(c: PortalContentItem): boolean {
    if (!OWN.search) return true;
    const needle = OWN.search.toLowerCase();
    return c.title.toLowerCase().includes(needle)
      || (c.shootCode ?? '').toLowerCase().includes(needle);
  }

  const filtered = (): PortalContentItem[] => host.items().filter((c) => {
    if (OWN.bucket && c.bucket !== OWN.bucket) return false;
    if (OWN.source && c.source !== OWN.source) return false;
    return matchesSearch(c);
  });

  /** Whether the board is showing a slice rather than the whole thing.
   *  An empty slice and an empty board need different words. */
  const filtering = (): boolean => !!(OWN.bucket || OWN.source || OWN.search.trim());

  /* ── saving ───────────────────────────────────────────────────── */

  async function setBucket(c: PortalContentItem, bucket: string | null) {
    if (c.bucket === bucket) return;
    if (await host.save(c, { bucket }, { bucket })) {
      host.toast(bucket ? `Moved to ${bucket}` : 'Bucket cleared');
    }
  }

  async function setStatus(c: PortalContentItem, status: string) {
    if (await host.save(c, { status }, { status })) host.toast(`Moved to ${status}`);
  }

  /** Why this column would not take this card. Two different noes, and
   *  a reader told the wrong one goes looking in the wrong place. */
  function refusal(card: PortalContentItem, stage: OwnStage): string {
    if (ownDropStatus(card, stage) === null) {
      return clientFilms(card.source)
        ? 'This one is yours to film, so it lives in To film.'
        : 'That column is for a different kind of card.';
    }
    return DRAG_BLOCKED;
  }

  /** Move a card to a pipeline column, or say out loud why not. The one
   *  path a drop and the phone's menu both take. */
  function moveTo(c: PortalContentItem, stage: OwnStage) {
    if (ownStageOf(c, host.now()) === stage) return;
    if (!canDropOwn(c, stage, host.role())) { host.toast(refusal(c, stage), true); return; }
    const to = ownDropStatus(c, stage);
    if (to) void setStatus(c, to);
  }

  /* ── the toolbar ──────────────────────────────────────────────── */

  function toolbar(): HTMLElement {
    const bar = el('div', 'pt-toolbar pt-own-bar');

    const seg = el('div', 'pt-seg');
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', 'Content view');
    for (const [v, text] of VIEWS) {
      const b = el('button', undefined, text);
      b.type = 'button';
      b.dataset.own = v;
      b.setAttribute('aria-pressed', String(OWN.view === v));
      b.addEventListener('click', () => { OWN.view = v; OWN.col = ''; remember(); host.redraw(); });
      seg.appendChild(b);
    }
    bar.append(seg, el('span', 'pt-toolbar-spacer'));

    const search = el('input', 'pt-input pt-input-search') as HTMLInputElement;
    search.type = 'search';
    search.placeholder = 'Title or shoot code';
    search.setAttribute('aria-label', 'Search content');
    search.value = OWN.search;
    search.addEventListener('input', () => {
      OWN.search = search.value.trim();
      host.redraw();
      const again = qq<HTMLInputElement>('.pt-own-bar .pt-input-search')[0];
      if (again) { again.focus(); again.setSelectionRange(again.value.length, again.value.length); }
    });
    bar.appendChild(search);

    const pick = (label: string, value: string, opts: Array<[string, string]>, set: (v: string) => void) => {
      const sel = el('select', 'pt-select') as HTMLSelectElement;
      sel.setAttribute('aria-label', label);
      for (const [v, text] of opts) {
        const o = el('option', undefined, text) as HTMLOptionElement;
        o.value = v;
        if (value === v) o.selected = true;
        sel.appendChild(o);
      }
      sel.addEventListener('change', () => { set(sel.value); OWN.col = ''; host.redraw(); });
      return sel;
    };

    bar.appendChild(pick('Filter by bucket', OWN.bucket,
      [['', 'Every bucket'], ...host.schema().bucket.map((o) => [o.name, o.name] as [string, string])],
      (v) => { OWN.bucket = v; }));

    const sources = Array.from(new Set(host.items().map((c) => c.source).filter(Boolean) as string[]));
    if (sources.length > 1) {
      bar.appendChild(pick('Filter by source', OWN.source,
        [['', 'Any source'], ...sources.map((s) => [s, s] as [string, string])],
        (v) => { OWN.source = v; }));
    }

    if (host.newIdea) {
      const add = el('button', 'pt-btn pt-btn-primary pt-btn-add');
      add.type = 'button';
      add.appendChild(icon('plus'));
      add.appendChild(el('span', undefined, 'New idea'));
      add.addEventListener('click', () => host.newIdea!(OWN.bucket || null));
      bar.appendChild(add);
    }
    return bar;
  }

  /* ── one card ─────────────────────────────────────────────────── */

  /** The one date that matters next for this card.
   *
   *  Film by only ever appears on a card the client films. A flyer we
   *  are drawing has a Film By too, and showing it told the client to
   *  go and shoot something that was never theirs to shoot. */
  function nextDateLine(c: PortalContentItem): string | null {
    if (c.status === 'Posted') return c.postDate ? `Posted ${fmtDateShort(c.postDate)}` : null;
    const d = cardDate(c);
    return d ? `${d.label} ${fmtDateShort(d.date)}` : null;
  }

  function cardEl(
    c: PortalContentItem,
    opts: { hideBucket?: boolean; pipeline?: boolean; menu?: boolean; drag?: boolean } = {},
  ): HTMLElement {
    const card = el('article', 'pt-ccard');
    const open = el('button', 'pt-ccard-open');
    open.type = 'button';
    open.setAttribute('aria-label', `Open ${c.title}`);
    open.addEventListener('click', () => host.openCard(c));

    // A shoot-code title ("SM L1D1") is how he names things, so it is
    // shown exactly as typed, on one line, and never prettied up.
    open.appendChild(el('span', 'pt-ccard-title', c.title));

    const who = host.clientOf?.(c) ?? null;
    if (who) open.appendChild(el('span', 'pt-ccard-who', who));

    const tags = el('span', 'pt-ccard-tags');
    // On the Ideas board the column already says the bucket, and a
    // chip repeating it on every card is noise in a tight space.
    if (c.bucket && !opts.hideBucket) {
      tags.appendChild(el('span', `pt-bchip pt-nc-${bucketColor(c.bucket)}`, c.bucket));
    }
    for (const f of c.format) tags.appendChild(el('span', 'pt-tag', f));
    if (c.shootCode && c.shootCode !== c.title) {
      tags.appendChild(el('span', 'pt-ccard-code pt-num', c.shootCode));
    }
    if (tags.firstChild) open.appendChild(tags);

    const meta = el('span', 'pt-ccard-meta');
    const next = nextDateLine(c);
    if (next) meta.appendChild(el('span', undefined, next));
    // What it is. Kept from the rebuild: a carousel and a video are
    // different jobs, and the card used to give no sign of which.
    const media = c.media ?? 'Video';
    const m = el('span', 'pt-ccard-media');
    m.appendChild(icon(MEDIA_ICON[media] ?? 'video'));
    m.appendChild(el('span', undefined, media));
    meta.appendChild(m);
    if (c.source && SOURCE_ICON[c.source]) {
      const s = el('span', 'pt-ccard-src');
      s.appendChild(icon(SOURCE_ICON[c.source]));
      s.appendChild(el('span', undefined, c.source));
      meta.appendChild(s);
    }
    open.appendChild(meta);

    const badges = el('span', 'pt-ccard-badges');
    if (c.postedBy === 'Client') {
      badges.appendChild(el('span', 'pt-tag pt-tag-todo', host.role() === 'client' ? 'You post' : 'Client posts'));
    } else if (c.postedBy === 'Blueprint') {
      badges.appendChild(el('span', 'pt-tag pt-tag-ours', 'Blueprint posts'));
    }
    if (c.status === 'Ready for Review') {
      badges.appendChild(el('span', 'pt-tag pt-tag-review',
        host.role() === 'client' ? 'Needs your review' : 'With the client'));
    }
    if (badges.firstChild) open.appendChild(badges);
    card.appendChild(open);

    if (opts.pipeline) {
      // The latest note on the thread, so a card that came back from
      // review carries the reason on its face.
      const note = latestFeedback(c.feedback);
      if (note && c.status !== 'Posted') {
        const p = el('p', 'pt-ccard-note');
        p.appendChild(el('span', 'pt-ccard-note-lab', note.who === 'Blueprint' ? 'Blueprint said' : 'Asked for'));
        p.appendChild(el('span', undefined, note.text));
        card.appendChild(p);
      }
      // A card waiting on the client gets the two answers on its face.
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
    }

    if (opts.menu) {
      const here = ownStageOf(c, host.now());
      if (here) {
        const wrap = el('label', 'pt-ccard-move');
        wrap.appendChild(el('span', undefined, 'Move to'));
        const sel = el('select', 'pt-select') as HTMLSelectElement;
        sel.setAttribute('aria-label', `Move ${c.title} to another column`);
        for (const stage of OWN_STAGE_ORDER) {
          const o = el('option', undefined, OWN_STAGE_TITLE[stage]) as HTMLOptionElement;
          o.value = stage;
          if (stage === here) o.selected = true;
          sel.appendChild(o);
        }
        sel.addEventListener('change', () => {
          const to = sel.value as OwnStage;
          // Put the menu back first: if the move is refused the card
          // has not gone anywhere, and if it is allowed the redraw
          // replaces it.
          sel.value = here;
          moveTo(c, to);
        });
        wrap.appendChild(sel);
        card.appendChild(wrap);
      }
    }

    if (opts.drag) {
      card.draggable = true;
      const grip = el('span', 'pt-ccard-grip');
      grip.setAttribute('aria-hidden', 'true');
      grip.appendChild(icon('grip'));
      card.appendChild(grip);
      card.addEventListener('dragstart', (ev) => {
        DRAG = c;
        card.classList.add('pt-ccard-dragging');
        if (opts.pipeline) { edge.start(); markDropTargets(c); }
        ev.dataTransfer?.setData('text/plain', c.title);
        if (ev.dataTransfer) ev.dataTransfer.effectAllowed = 'move';
      });
      card.addEventListener('dragend', () => {
        DRAG = null;
        edge.stop();
        card.classList.remove('pt-ccard-dragging');
        markDropTargets(null);
      });
    }
    return card;
  }

  /* ── Ideas: a column per bucket ───────────────────────────────── */

  function bucketColumn(c: Column): HTMLElement {
    const col = el('section', 'pt-board-col');
    col.dataset.bucket = c.key;
    if (c.color) col.classList.add(`pt-nc-${c.color}`);
    col.appendChild(el('span', 'pt-board-accent'));

    const head = el('div', 'pt-board-col-head');
    head.appendChild(el('h3', undefined, c.title));
    head.appendChild(el('span', 'pt-board-count pt-num', String(c.items.length)));
    if (c.add && !isNarrow()) {
      const plus = el('button', 'pt-board-add');
      plus.type = 'button';
      plus.setAttribute('aria-label', `New idea in ${c.title}`);
      plus.appendChild(icon('plus'));
      plus.addEventListener('click', c.add);
      head.appendChild(plus);
    }
    col.appendChild(head);

    const list = el('div', 'pt-board-list');
    if (!c.items.length) list.appendChild(el('p', 'pt-board-none', 'Nothing here'));
    for (const item of c.items) {
      list.appendChild(cardEl(item, { hideBucket: c.hideBucket, drag: !isNarrow() }));
    }

    if (!isNarrow()) {
      list.addEventListener('dragover', (ev) => {
        if (!DRAG) return;
        if (c.items.some((i) => i.id === DRAG!.id)) return;
        ev.preventDefault();
        list.classList.add('pt-board-drop');
      });
      list.addEventListener('dragleave', () => list.classList.remove('pt-board-drop'));
      list.addEventListener('drop', (ev) => {
        ev.preventDefault();
        list.classList.remove('pt-board-drop');
        const card = DRAG;
        DRAG = null;
        if (card) c.onDrop(card);
      });
    }
    col.appendChild(list);
    return col;
  }

  function ideasBoard(items: PortalContentItem[]): HTMLElement {
    const well = items.filter(isOwnIdea);
    const cols: Column[] = host.schema().bucket.map((o) => ({
      key: o.name,
      title: o.name,
      color: o.color,
      items: well.filter((c) => c.bucket === o.name),
      onDrop: (c) => { void setBucket(c, o.name); },
      add: host.newIdea ? () => host.newIdea!(o.name) : undefined,
      hideBucket: true,
    }));
    // A card with no bucket yet would otherwise be invisible, which is
    // the one thing an idea well must never do.
    const loose = well.filter((c) => !c.bucket);
    if (loose.length) {
      cols.unshift({
        key: '', title: 'No bucket yet', items: loose,
        onDrop: (c) => { void setBucket(c, null); },
        add: host.newIdea ? () => host.newIdea!(null) : undefined,
      });
    }

    const total = cols.reduce((n, c) => n + c.items.length, 0);
    if (!total) {
      return filtering()
        ? host.empty('Nothing matches that', 'Try a different filter to see the rest of your board.')
        : host.empty('Your idea well is empty', 'Jot one down and it lands here, ready to plan when you are.');
    }

    const wrap = el('div', 'pt-boardwrap');
    // On a phone, a pill row picks the one bucket worth the width.
    if (isNarrow()) {
      if (!cols.some((c) => c.key === OWN.col)) {
        OWN.col = (cols.find((c) => c.items.length) ?? cols[0]).key;
      }
      const pills = el('div', 'pt-pillrow');
      pills.setAttribute('role', 'tablist');
      for (const c of cols) {
        const b = el('button', 'pt-pill' + (c.key === OWN.col ? ' pt-pill-on' : ''));
        b.type = 'button';
        b.setAttribute('aria-pressed', String(c.key === OWN.col));
        if (c.color) b.classList.add(`pt-nc-${c.color}`);
        b.append(el('span', undefined, c.title), el('span', 'pt-pill-n pt-num', String(c.items.length)));
        b.addEventListener('click', () => { OWN.col = c.key; host.redraw(); });
        pills.appendChild(b);
      }
      wrap.appendChild(pills);
      wrap.appendChild(bucketColumn(cols.find((c) => c.key === OWN.col)!));
      return wrap;
    }

    const scroller = el('div', 'pt-board pt-board-own');
    scroller.dataset.boardScroll = 'true';
    for (const c of cols) scroller.appendChild(bucketColumn(c));
    wrap.appendChild(scroller);
    return wrap;
  }

  /* ── Pipeline: the eight columns ──────────────────────────────── */

  /** Picking a card up answers the question for every column at once,
   *  so the reader sees where it can go before they let go of it. */
  function markDropTargets(card: PortalContentItem | null): void {
    for (const c of PIPE) {
      const refuses = !!card
        && !canDropOwn(card, c.stage, host.role())
        && ownStageOf(card, host.now()) !== c.stage;
      c.list.classList.toggle('pt-board-dim', refuses);
    }
  }

  function stageColumn(stage: OwnStage, items: PortalContentItem[]): HTMLElement {
    const col = el('section', 'pt-board-col');
    col.dataset.stage = stage;
    col.appendChild(el('span', 'pt-board-accent'));

    const head = el('div', 'pt-board-col-head');
    head.appendChild(el('h3', undefined, OWN_STAGE_TITLE[stage]));
    head.appendChild(el('span', 'pt-board-count pt-num', String(items.length)));
    const note = OWN_STAGE_NOTE[stage];
    if (note) head.appendChild(el('span', 'pt-board-col-note', note));
    col.appendChild(head);

    const list = el('div', 'pt-board-list');
    PIPE.push({ stage, list });
    if (!items.length) list.appendChild(el('p', 'pt-board-none', 'Nothing here'));
    for (const item of items) list.appendChild(cardEl(item, { pipeline: true, drag: true }));

    // preventDefault runs whether or not the column will take the
    // card, because a drop event only fires on a target that allowed
    // the dragover. Without it a refused drop is silent, and silent
    // is the one thing it must not be: the card springs back and the
    // reader is left guessing whether they missed or we said no.
    list.addEventListener('dragover', (ev) => {
      if (!DRAG) return;
      if (items.some((i) => i.id === DRAG!.id)) return;
      ev.preventDefault();
      const ok = canDropOwn(DRAG, stage, host.role());
      list.classList.toggle('pt-board-drop', ok);
      list.classList.toggle('pt-board-nodrop', !ok);
    });
    list.addEventListener('dragleave', () => {
      list.classList.remove('pt-board-drop', 'pt-board-nodrop');
    });
    list.addEventListener('drop', (ev) => {
      ev.preventDefault();
      edge.stop();
      list.classList.remove('pt-board-drop', 'pt-board-nodrop');
      const item = DRAG;
      DRAG = null;
      if (item) moveTo(item, stage);
    });
    col.appendChild(list);
    return col;
  }

  function pipelineBoard(items: PortalContentItem[]): HTMLElement {
    const now = host.now();
    const cols = OWN_STAGE_ORDER.map((stage) => ({
      stage, items: items.filter((c) => ownStageOf(c, now) === stage),
    }));
    if (!cols.some((c) => c.items.length)) {
      return filtering()
        ? host.empty('Nothing matches that', 'Try a different filter to see the rest of the board.')
        : host.empty('Nothing is moving yet',
                     'A card joins the board as soon as it has a shoot date or a post date.');
    }

    const wrap = el('div', 'pt-boardwrap');
    // On a phone, a list by column with a menu on each card. There is
    // no dragging on a touch screen worth the name.
    if (isPhone()) {
      const listWrap = el('div', 'pt-stagelist');
      for (const c of cols) {
        if (!c.items.length) continue;
        const sec = el('section', 'pt-stagelist-sec');
        sec.dataset.stage = c.stage;
        const head = el('div', 'pt-stagelist-head');
        head.appendChild(el('h3', undefined, OWN_STAGE_TITLE[c.stage]));
        head.appendChild(el('span', 'pt-board-count pt-num', String(c.items.length)));
        sec.appendChild(head);
        for (const item of c.items) sec.appendChild(cardEl(item, { pipeline: true, menu: true }));
        listWrap.appendChild(sec);
      }
      wrap.appendChild(listWrap);
      return wrap;
    }

    const scroller = el('div', 'pt-board pt-board-own');
    scroller.dataset.boardScroll = 'true';
    edge.watch(scroller);
    for (const c of cols) scroller.appendChild(stageColumn(c.stage, c.items));
    wrap.appendChild(scroller);
    return wrap;
  }

  /* ── Posted: the archive ──────────────────────────────────────── */

  function postedList(items: PortalContentItem[]): HTMLElement {
    const posted = items
      .filter((c) => c.status === 'Posted')
      .sort((a, b) => (parseNotionDate(b.postDate)?.getTime() ?? 0) - (parseNotionDate(a.postDate)?.getTime() ?? 0));
    if (!posted.length) {
      return filtering()
        ? host.empty('Nothing matches that', 'Try a different filter to see the rest of your posts.')
        : host.empty('Nothing posted yet',
                     'Once a piece goes out it moves here, newest first, with the link to the post.');
    }
    const grid = el('div', 'pt-posted');
    for (const c of posted) {
      const row = el('article', 'pt-posted-card');
      const open = el('button', 'pt-posted-open');
      open.type = 'button';
      open.addEventListener('click', () => host.openCard(c));
      open.appendChild(el('span', 'pt-ccard-title', c.title));
      const meta = el('span', 'pt-ccard-meta');
      if (c.bucket) meta.appendChild(el('span', `pt-bchip pt-nc-${bucketColor(c.bucket)}`, c.bucket));
      if (c.postDate) meta.appendChild(el('span', undefined, fmtDateShort(c.postDate)));
      if (c.platforms.length) meta.appendChild(el('span', undefined, c.platforms.join(' · ')));
      open.appendChild(meta);
      row.appendChild(open);
      if (c.postLink) {
        const a = el('a', 'pt-posted-link') as HTMLAnchorElement;
        a.href = c.postLink;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.setAttribute('aria-label', `See ${c.title} on ${c.platforms[0] ?? 'the platform'}`);
        a.appendChild(icon('ext'));
        row.appendChild(a);
      }
      grid.appendChild(row);
    }
    return grid;
  }

  /* ── the side ─────────────────────────────────────────────────── */

  function draw(): HTMLElement {
    PIPE = [];
    edge.reset();
    const wrap = el('div', 'pt-own');
    wrap.dataset.ownView = OWN.view;
    wrap.appendChild(toolbar());

    if (!host.items().length) {
      wrap.appendChild(host.empty(
        'Your content board starts here',
        'Ideas you jot down, shoots we plan and posts that go out all live on this one board.',
      ));
      return wrap;
    }
    const items = filtered();
    wrap.appendChild(OWN.view === 'ideas' ? ideasBoard(items)
      : OWN.view === 'pipeline' ? pipelineBoard(items)
      : postedList(items));
    return wrap;
  }

  return { draw };
}
