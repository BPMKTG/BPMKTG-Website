/* ─────────────────────────────────────────────────
   A post that is several files: the swipe viewer, and the list we
   build one from.

   The viewer is one frame. Swipe left and right and it snaps to a
   slide; there are dots and an "n / total" counter, and on a desktop
   arrow buttons and the arrow keys. The frame takes the first slide's
   shape and crops the rest to it, the way Instagram does; a story is
   9:16. A video shows its poster, plays in place with sound when it
   is tapped, and pauses when it is swiped away. The first two slides
   are loaded up front and the rest as they come near.

   Swiping is the browser's own scrolling with snap points, not
   something written here: it is what a thumb already expects, and it
   is the same in Safari and Chrome.

   The list is ours only, and only in the drawer: paste a Drive file
   link to add a slide, or a folder link to take everything in it;
   drag to reorder; remove with one tap.

   Both draw from the same answer, asked from
   /portal/<client>/slides/<item>. A slide's files come from the same
   address a single preview's do, behind the same sign-in.
   ───────────────────────────────────────────────── */

import type { PortalContentItem } from '../data/portal-content';
import { previewUrl } from '../data/preview';
import {
  MAX_SLIDES, frameRatio, isSlideMedia, showsSlides, type SlideView,
} from '../data/slides';
import { el, icon } from './portal-dom';
import { showWhole } from './portal-picture';
import { fieldShell, flashTick } from './portal-fields';

/** How often a waiting block asks, and for how long before it stops. */
const ASK_EVERY_MS = 4000;
const ASK_TIMES = 90;

interface Answer {
  ok: boolean;
  slides?: SlideView[];
  folder?: string | null;
  wait?: boolean;
  message?: string;
  setup?: string;
}

async function askSlides(slug: string, id: string, body: Record<string, unknown>): Promise<Answer | null> {
  try {
    const res = await fetch(`/portal/${slug}/slides/${id.replace(/-/g, '').toLowerCase()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(body),
    });
    // A refusal we can explain comes back as JSON with a sentence in it.
    if (!res.ok && res.status !== 400) return null;
    return await res.json() as Answer;
  } catch {
    return null;
  }
}

/** What would make a redraw worth doing: which slides, in which
 *  order, and where each one's preview is. */
const signature = (slides: SlideView[]): string =>
  slides.map((s) => `${s.id}:${s.preview.state}:${s.preview.v ?? ''}`).join('|');

const reduced = (): boolean => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── which slide is on screen ─────────────────────────────────── */

/**
 * The slide of this item a reader is looking at right now, counted
 * from one, or null when no viewer of it is on screen.
 *
 * The drawer's viewer wins over one behind it: the drawer is what is
 * in front of them.
 */
export function slideOnScreen(itemId: string): number | null {
  const id = itemId.replace(/-/g, '').toLowerCase();
  const all = Array.from(document.querySelectorAll<HTMLElement>(`.pt-slides[data-slides="${id}"]`))
    .filter((n) => {
      const r = n.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight
        && r.right > 0 && r.left < window.innerWidth;
    });
  if (!all.length) return null;
  const front = all.find((n) => n.closest('[data-drawer]')) ?? all[all.length - 1];
  const n = Number(front.dataset.slide);
  return Number.isInteger(n) && n >= 1 ? n : null;
}

/* ── the mark on a card ───────────────────────────────────────── */

/**
 * Slide one's thumbnail with a stack mark and the count, for a card
 * in a list. Null for anything that is not a post of several slides.
 */
export function slideBadge(c: PortalContentItem, slug: string | null): HTMLElement | null {
  if (!showsSlides(c)) return null;
  const slides = c.slides ?? [];
  const box = el('span', 'pt-ccard-slides');
  box.dataset.count = String(slides.length);
  const first = slides[0];
  if (slug && first.preview.state === 'ready' && first.preview.v
      && (first.thumb || first.preview.kind === 'image' || first.preview.poster)) {
    const img = el('img') as HTMLImageElement;
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = previewUrl(slug, c.id, first.preview.v, first.thumb ? 'thumb' : 'image');
    // A thumbnail that will not load leaves the tile, not a broken picture.
    img.addEventListener('error', () => img.remove(), { once: true });
    box.appendChild(img);
  }
  const mark = el('span', 'pt-ccard-stack pt-num');
  mark.append(icon('stack'), el('span', undefined, String(slides.length)));
  mark.setAttribute('aria-label', `${slides.length} slides`);
  box.appendChild(mark);
  return box;
}

/* ── the viewer ───────────────────────────────────────────────── */

interface Viewer {
  root: HTMLElement;
  /** Draw these slides, keeping the reader on the slide they were on. */
  update: (slides: SlideView[]) => void;
}

function createViewer(
  c: PortalContentItem, slug: string | null, slides0: SlideView[],
  broken: (slideId: string) => void,
): Viewer {
  const root = el('div', 'pt-preview pt-preview-ours pt-slides');
  root.dataset.slides = c.id.replace(/-/g, '').toLowerCase();

  const stage = el('div', 'pt-slides-stage');
  const frame = el('div', 'pt-slides-frame');
  frame.tabIndex = 0;
  frame.setAttribute('role', 'group');
  frame.setAttribute('aria-roledescription', 'carousel');
  frame.setAttribute('aria-label', `The slides of ${c.title}`);
  const track = el('div', 'pt-slides-track');
  const prev = el('button', 'pt-slides-arrow pt-slides-prev') as HTMLButtonElement;
  const next = el('button', 'pt-slides-arrow pt-slides-next') as HTMLButtonElement;
  prev.type = 'button'; next.type = 'button';
  prev.setAttribute('aria-label', 'Previous slide');
  next.setAttribute('aria-label', 'Next slide');
  prev.appendChild(icon('chev-left'));
  next.appendChild(icon('chev-left'));
  const count = el('span', 'pt-slides-count pt-num');
  count.setAttribute('aria-live', 'polite');
  frame.append(track, prev, next, count);
  stage.appendChild(frame);

  const dots = el('div', 'pt-slides-dots');
  dots.setAttribute('aria-hidden', 'true');
  const open = el('a', 'pt-preview-open') as HTMLAnchorElement;
  open.target = '_blank';
  open.rel = 'noopener noreferrer';
  open.append(icon('ext'), el('span', undefined, 'Open original'));
  root.append(stage, dots, open);

  let slides: SlideView[] = [];
  let cells: HTMLElement[] = [];
  let loaded: boolean[] = [];
  let at = 0;
  let measured = false;

  const setRatio = (ratio: number): void => {
    frame.style.setProperty('--pt-slides-ratio', String(Math.round(ratio * 10000) / 10000));
  };

  /** The frame's shape from the first slide's own pixels, when the
   *  server did not know them. */
  const measure = (w: number, h: number): void => {
    if (measured || !(w > 0) || !(h > 0)) return;
    measured = true;
    setRatio(frameRatio(c.media, { w, h }));
  };

  const note = (cell: HTMLElement, state: 'pending' | 'failed'): void => {
    cell.replaceChildren(el('p', `pt-preview-note pt-preview-note-${state}`,
      state === 'pending' ? 'Getting the preview ready…' : 'Preview unavailable · open original'));
  };

  /** A picture that would not come, after several tries. Said, with
   *  a way to ask again, since it is the connection and not the file. */
  const again = (cell: HTMLElement, i: number): void => {
    const p = el('p', 'pt-preview-note pt-preview-note-failed', 'This slide did not load.');
    const b = el('button', 'pt-slide-again', 'Try again') as HTMLButtonElement;
    b.type = 'button';
    b.addEventListener('click', () => { loaded[i] = false; load(i); });
    const box = el('div', 'pt-slide-missed');
    box.append(p, b);
    cell.replaceChildren(box);
  };

  /** Put a slide's picture in its cell. Until this runs a cell is an
   *  empty box, which is what "not loaded yet" is. */
  const load = (i: number): void => {
    if (loaded[i]) return;
    loaded[i] = true;
    const s = slides[i];
    const cell = cells[i];
    const p = s.preview;
    if (p.state !== 'ready') { note(cell, p.state === 'failed' ? 'failed' : 'pending'); return; }
    if (!slug || !p.v || !p.kind) { note(cell, 'failed'); return; }
    const v = p.v;

    if (p.kind === 'image') {
      const img = el('img') as HTMLImageElement;
      img.alt = `Slide ${i + 1} of ${slides.length}`;
      img.draggable = false;
      // Fetched whole and then shown, never painted as it arrives: a
      // download that stops part way must not be left on screen as
      // half a photo. See portal-picture.ts.
      cell.dataset.loading = 'true';
      cell.replaceChildren();
      void showWhole(img, previewUrl(slug, c.id, v, 'image')).then((how) => {
        // The list was drawn again while this was on its way.
        if (cells[i] !== cell) return;
        delete cell.dataset.loading;
        if (how === 'shown') {
          if (i === 0) measure(img.naturalWidth, img.naturalHeight);
          cell.replaceChildren(img);
        } else if (how === 'gone') {
          // The server has no such file: the preview needs making again.
          note(cell, 'pending');
          broken(s.id);
        } else {
          again(cell, i);
        }
      });
      return;
    }

    /* a video: its poster and a play button until it is tapped */
    const play = el('button', 'pt-slide-play') as HTMLButtonElement;
    play.type = 'button';
    play.setAttribute('aria-label', `Play slide ${i + 1}`);
    play.appendChild(icon('play'));
    const kids: HTMLElement[] = [];
    kids.push(play);
    cell.replaceChildren(...kids);
    if (p.poster) {
      const img = el('img') as HTMLImageElement;
      img.alt = `Slide ${i + 1} of ${slides.length}, a video`;
      img.draggable = false;
      // Whole or not at all, like a photo. A poster that will not
      // load is not a video that will not play: the button is there
      // either way.
      void showWhole(img, previewUrl(slug, c.id, v, 'image')).then((how) => {
        if (cells[i] !== cell || how !== 'shown' || !play.isConnected) return;
        if (i === 0) measure(img.naturalWidth, img.naturalHeight);
        cell.insertBefore(img, play);
      });
    }
    play.addEventListener('click', () => {
      const video = el('video') as HTMLVideoElement;
      video.controls = true;
      video.playsInline = true;
      // The attribute too: an iPhone reads the attribute, and without
      // it tapping play throws the video into the full-screen player.
      video.setAttribute('playsinline', '');
      video.preload = 'auto';
      if (p.poster) video.poster = previewUrl(slug, c.id, v, 'image');
      video.addEventListener('loadedmetadata', () => { if (i === 0) measure(video.videoWidth, video.videoHeight); });
      video.addEventListener('error', () => { note(cell, 'pending'); broken(s.id); }, { once: true });
      video.src = previewUrl(slug, c.id, v, 'video');
      cell.replaceChildren(video);
      // Straight from the tap, so it is allowed to play with sound.
      void video.play().catch(() => { /* the controls are there */ });
    });
  };

  const settle = (): void => {
    const total = slides.length;
    root.dataset.slide = String(at + 1);
    root.dataset.count = String(total);
    count.textContent = `${at + 1} / ${total}`;
    count.hidden = total < 2;
    prev.hidden = at <= 0;
    next.hidden = at >= total - 1;
    Array.from(dots.children).forEach((d, i) => d.classList.toggle('pt-slides-dot-on', i === at));
    open.href = slides[at]?.link ?? '#';
    // This one and its neighbours. The first draw is slide one, so
    // that is "the first two up front".
    for (const i of [at, at + 1, at - 1]) if (i >= 0 && i < total) load(i);
    // A video that is no longer the slide on screen stops.
    cells.forEach((cell, i) => {
      if (i === at) return;
      const video = cell.querySelector('video');
      if (video && !video.paused) video.pause();
    });
  };

  const indexNow = (): number => {
    const w = track.clientWidth;
    if (!w) return at;
    return Math.max(0, Math.min(slides.length - 1, Math.round(track.scrollLeft / w)));
  };

  const go = (i: number): void => {
    const to = Math.max(0, Math.min(slides.length - 1, i));
    track.scrollTo({ left: to * track.clientWidth, behavior: reduced() ? 'auto' : 'smooth' });
    // Said now rather than when the scroll lands, so the counter and
    // the arrows do not lag a click.
    if (to !== at) { at = to; settle(); }
  };

  let queued = false;
  track.addEventListener('scroll', () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const i = indexNow();
      if (i !== at) { at = i; settle(); }
    });
  }, { passive: true });
  prev.addEventListener('click', () => go(at - 1));
  next.addEventListener('click', () => go(at + 1));
  frame.addEventListener('keydown', (ev) => {
    // Not while a video's own controls have the keys.
    if ((ev.target as HTMLElement).tagName === 'VIDEO') return;
    if (ev.key === 'ArrowLeft') { ev.preventDefault(); go(at - 1); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); go(at + 1); }
  });

  function update(nextSlides: SlideView[]): void {
    const keep = slides[at]?.id;
    slides = nextSlides;
    measured = false;
    setRatio(frameRatio(c.media, slides[0]));
    if (c.media === 'Story' || (slides[0]?.w && slides[0]?.h)) measured = true;
    cells = slides.map((s, i) => {
      const cell = el('div', 'pt-slide');
      cell.dataset.n = String(i + 1);
      cell.dataset.state = s.preview.state;
      if (s.preview.kind) cell.dataset.kind = s.preview.kind;
      cell.setAttribute('role', 'group');
      cell.setAttribute('aria-roledescription', 'slide');
      cell.setAttribute('aria-label', `Slide ${i + 1} of ${slides.length}`);
      return cell;
    });
    loaded = slides.map(() => false);
    track.replaceChildren(...cells);
    dots.replaceChildren(...slides.map(() => el('span', 'pt-slides-dot')));
    dots.hidden = slides.length < 2;
    // The reader stays on the slide they were on, wherever it now is.
    const found = keep ? slides.findIndex((s) => s.id === keep) : -1;
    at = found !== -1 ? found : Math.min(at, Math.max(0, slides.length - 1));
    settle();
    const place = (): void => { track.scrollLeft = at * track.clientWidth; };
    place();
    // Not laid out yet on the first draw: once more when it is.
    if (at > 0) requestAnimationFrame(place);
  }

  update(slides0);
  return { root, update };
}

/* ── the block: viewer, and the list when it is ours ──────────── */

export interface SlidesHost {
  /** We are building the post: show the list as well as the viewer. */
  edit?: boolean;
  toast?: (text: string, bad?: boolean) => void;
  /** The item's slides are not what they were. For the page to put
   *  on whatever it keeps, and redraw its cards. */
  changed?: (c: PortalContentItem) => void;
}

/**
 * Everything about an item's slides, for the drawer and for the
 * review strip: the swipe viewer when there are slides, and under it
 * the list when `edit` says we are the ones looking.
 *
 * Null when there is nothing to draw: not a carousel or a story, or
 * one with no slides and nobody to add them.
 */
export function slidesBlock(c: PortalContentItem, slug: string | null, host: SlidesHost = {}): HTMLElement | null {
  const editing = !!host.edit && isSlideMedia(c.media);
  if (!showsSlides(c) && !editing) return null;

  const wrap = el('div', 'pt-slides-block');
  let slides: SlideView[] = c.slides ?? [];
  let folder: string | null = c.slidesFolder ?? null;
  let viewer: Viewer | null = null;
  let asks = 0;
  let timer = 0;
  let dragging = false;
  const verified = new Set<string>();

  /* the list, when it is ours */
  const shell = editing ? fieldShell('Slides') : null;
  const list = el('ol', 'pt-slides-list');
  const input = el('input', 'pt-input') as HTMLInputElement;
  const addBtn = el('button', 'pt-btn', 'Add') as HTMLButtonElement;
  const folderRow = el('div', 'pt-slides-folder');
  const full = el('p', 'pt-slides-hint');

  function put(a: Answer): void {
    const before = signature(slides);
    slides = a.slides ?? [];
    if (a.folder !== undefined) folder = a.folder;
    c.slides = slides.length ? slides : undefined;
    if (slides.length || folder) c.multi = true; else delete c.multi;
    if (folder) c.slidesFolder = folder; else delete c.slidesFolder;
    const moved = signature(slides) !== before;
    draw(moved);
    if (moved) host.changed?.(c);
  }

  function draw(moved: boolean): void {
    if (slides.length && isSlideMedia(c.media)) {
      if (!viewer) {
        viewer = createViewer(c, slug, slides, broken);
        wrap.insertBefore(viewer.root, wrap.firstChild);
      } else if (moved) viewer.update(slides);
    } else if (viewer) {
      viewer.root.remove();
      viewer = null;
    }
    if (shell && !dragging) drawList();
  }

  /** A slide's file would not load. Once per slide, ask the server
   *  to check its copy is really there, which rebuilds it if not. */
  function broken(slideId: string): void {
    if (!slug || verified.has(slideId)) return;
    verified.add(slideId);
    void askSlides(slug, c.id, { verify: slideId }).then((a) => {
      if (!a?.ok) return;
      put(a);
      if (a.wait) wait();
    });
  }

  function wait(): void {
    window.clearTimeout(timer);
    timer = window.setTimeout(look, ASK_EVERY_MS);
  }

  function look(): void {
    if (!slug || !wrap.isConnected || asks >= ASK_TIMES) return;
    asks += 1;
    void askSlides(slug, c.id, {}).then((a) => {
      if (!a?.ok || !wrap.isConnected) return;
      put(a);
      if (a.setup) host.toast?.(`Previews cannot be made yet: ${a.setup}`, true);
      if (a.wait) wait();
    });
  }

  /* ── the list ── */

  async function send(body: Record<string, unknown>): Promise<boolean> {
    if (!slug) return false;
    const a = await askSlides(slug, c.id, body);
    if (!a) { host.toast?.('That did not save. Check your connection and try again.', true); return false; }
    if (!a.ok) { host.toast?.(a.message ?? 'That did not save.', true); return false; }
    put(a);
    if (a.message) host.toast?.(a.message);
    if (shell) flashTick(shell.tick);
    asks = 0;
    if (a.wait) { window.clearTimeout(timer); look(); }
    return true;
  }

  function status(s: SlideView): { text: string; state: string } {
    const p = s.preview;
    if (p.state === 'ready') return { text: p.kind === 'video' ? 'Video · ready' : 'Photo · ready', state: 'ready' };
    if (p.state === 'failed') {
      return { text: (p.why ?? 'The preview could not be made.').replace(/^Failed · /, ''), state: 'failed' };
    }
    return { text: 'Getting the preview ready…', state: 'pending' };
  }

  function rowEl(s: SlideView, i: number): HTMLElement {
    const li = el('li', 'pt-slides-row');
    li.dataset.slideId = s.id;

    const grip = el('button', 'pt-slides-grip') as HTMLButtonElement;
    grip.type = 'button';
    grip.setAttribute('aria-label', `Move slide ${i + 1}. Drag, or use the up and down arrow keys.`);
    grip.appendChild(icon('grip'));
    grip.addEventListener('pointerdown', (ev) => startDrag(ev, li, grip));
    grip.addEventListener('keydown', (ev) => {
      if (ev.key !== 'ArrowUp' && ev.key !== 'ArrowDown') return;
      ev.preventDefault();
      const ids = slides.map((x) => x.id);
      const to = i + (ev.key === 'ArrowUp' ? -1 : 1);
      if (to < 0 || to >= ids.length) return;
      ids.splice(to, 0, ...ids.splice(i, 1));
      void send({ order: ids }).then(() => {
        list.querySelector<HTMLElement>(`[data-slide-id="${s.id}"] .pt-slides-grip`)?.focus();
      });
    });

    const thumb = el('span', 'pt-slides-thumb');
    const p = s.preview;
    if (slug && p.state === 'ready' && p.v && (s.thumb || p.kind === 'image' || p.poster)) {
      const img = el('img') as HTMLImageElement;
      img.alt = '';
      img.loading = 'lazy';
      img.src = previewUrl(slug, c.id, p.v, s.thumb ? 'thumb' : 'image');
      img.addEventListener('error', () => img.remove(), { once: true });
      thumb.appendChild(img);
    }
    if (p.state === 'ready' && p.kind === 'video') thumb.appendChild(icon('play'));

    const what = el('span', 'pt-slides-what');
    what.appendChild(el('strong', undefined, s.name ? `${i + 1}. ${s.name}` : `Slide ${i + 1}`));
    const st = status(s);
    const line = el('span', `pt-slides-status pt-slides-status-${st.state}`, st.text);
    what.appendChild(line);
    li.dataset.state = st.state;

    const acts = el('span', 'pt-slides-acts');
    if (p.state === 'failed') {
      // Under the reason, so the reason has the width of the row.
      const again = el('button', 'pt-btn pt-btn-sm pt-slides-again', 'Try again') as HTMLButtonElement;
      again.type = 'button';
      again.addEventListener('click', () => { again.disabled = true; void send({ retry: s.id }); });
      what.appendChild(again);
    }
    const orig = el('a', 'pt-slides-orig') as HTMLAnchorElement;
    orig.href = s.link;
    orig.target = '_blank';
    orig.rel = 'noopener noreferrer';
    orig.setAttribute('aria-label', `Open the original of slide ${i + 1}`);
    orig.appendChild(icon('ext'));
    const remove = el('button', 'pt-slides-remove') as HTMLButtonElement;
    remove.type = 'button';
    remove.setAttribute('aria-label', `Remove slide ${i + 1}`);
    remove.appendChild(icon('close'));
    remove.addEventListener('click', () => { remove.disabled = true; void send({ remove: s.id }); });
    acts.append(orig, remove);

    li.append(grip, thumb, what, acts);
    return li;
  }

  function drawList(): void {
    list.replaceChildren(...slides.map(rowEl));
    list.hidden = !slides.length;
    // Never switched off when the list is full: a folder link still
    // works then, because it replaces the list rather than adding to it.
    input.disabled = false;
    addBtn.disabled = false;
    full.textContent = slides.length < MAX_SLIDES
      ? `${slides.length} of ${MAX_SLIDES}. One file link adds one slide. A folder link takes every photo and video in the folder, by filename.`
      : `${MAX_SLIDES} of ${MAX_SLIDES}. That is as many as a post holds. A folder link replaces them.`;
    folderRow.replaceChildren();
    folderRow.hidden = !folder;
    if (folder) {
      const a = el('a', 'pt-slides-folder-link') as HTMLAnchorElement;
      a.href = folder;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.append(icon('folder'), el('span', undefined, 'From a Drive folder'));
      const sync = el('button', 'pt-btn pt-btn-sm', 'Re-sync folder') as HTMLButtonElement;
      sync.type = 'button';
      sync.dataset.resync = '1';
      sync.addEventListener('click', () => {
        sync.disabled = true;
        sync.textContent = 'Syncing…';
        void send({ resync: true }).then((ok) => { if (!ok) drawList(); });
      });
      folderRow.append(a, sync);
    }
  }

  /** Drag a row by its grip. Pointer events, so it is the same under
   *  a mouse and a thumb. The rows part around the one being held as
   *  it is dragged, and the new order is sent when it is let go.
   *
   *  The held row is never itself moved in the page: a browser drops
   *  a drag the moment the thing being dragged is taken out and put
   *  back. Its neighbours step past it instead. */
  function startDrag(ev: PointerEvent, row: HTMLElement, grip: HTMLElement): void {
    if (dragging || (ev.button !== 0 && ev.pointerType === 'mouse')) return;
    ev.preventDefault();
    dragging = true;
    const before = Array.from(list.children).map((n) => (n as HTMLElement).dataset.slideId);
    row.classList.add('pt-slides-row-drag');
    try { grip.setPointerCapture(ev.pointerId); } catch { /* not every browser will */ }
    const mid = (n: Element): number => { const r = n.getBoundingClientRect(); return r.top + r.height / 2; };

    const move = (e: PointerEvent): void => {
      if (e.pointerId !== ev.pointerId) return;
      for (let guard = 0; guard < MAX_SLIDES; guard += 1) {
        const above = row.previousElementSibling;
        if (above && e.clientY < mid(above)) { list.insertBefore(above, row.nextSibling); continue; }
        const below = row.nextElementSibling;
        if (below && e.clientY > mid(below)) { list.insertBefore(below, row); continue; }
        break;
      }
    };
    const done = (e: PointerEvent): void => {
      if (e.pointerId !== ev.pointerId) return;
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', done);
      window.removeEventListener('pointercancel', done);
      row.classList.remove('pt-slides-row-drag');
      dragging = false;
      const after = Array.from(list.children).map((n) => (n as HTMLElement).dataset.slideId);
      if (after.join() === before.join()) return;
      void send({ order: after }).then((ok) => { if (!ok) drawList(); });
    };
    // On the window, so the drag is followed wherever the pointer goes.
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', done);
    window.addEventListener('pointercancel', done);
  }

  async function add(link: string): Promise<void> {
    const text = link.trim();
    if (!text) { input.focus(); return; }
    // A folder becomes the list. Said first when there are slides it
    // would replace, because the ones not in the folder go.
    if (/\/folders\//.test(text) && slides.length
        && !window.confirm(`Replace these ${slides.length} slides with everything in that folder?`)) return;
    addBtn.disabled = true;
    input.disabled = true;
    const ok = await send({ add: text });
    if (ok) input.value = '';
    drawList();
    if (ok || !input.disabled) input.focus();
  }

  if (shell) {
    shell.wrap.classList.add('pt-slides-edit');
    shell.wrap.dataset.slidesEdit = c.id.replace(/-/g, '').toLowerCase();
    input.id = shell.slot.dataset.fieldId!;
    input.type = 'url';
    input.inputMode = 'url';
    input.autocomplete = 'off';
    input.placeholder = 'Paste a Drive file or folder link';
    addBtn.type = 'button';
    addBtn.addEventListener('click', () => { void add(input.value); });
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); void add(input.value); }
    });
    // A pasted link is the whole gesture: it is added as it lands.
    input.addEventListener('paste', (ev) => {
      const text = ev.clipboardData?.getData('text') ?? '';
      if (!/^https:\/\/(drive|docs)\.google\.com\//.test(text.trim())) return;
      ev.preventDefault();
      input.value = text.trim();
      void add(text);
    });
    const addRow = el('div', 'pt-slides-add');
    addRow.append(input, addBtn);
    shell.slot.append(list, addRow, full, folderRow);
    wrap.appendChild(shell.wrap);
  }

  draw(true);

  // Ours: always ask once, for the list as we are shown it (names,
  // the folder, why a slide failed) and to start the previews.
  // A client: only when something is still on its way.
  if (slug && (editing || slides.some((s) => s.preview.state === 'pending'))) {
    // After the block is in the page, which is the caller's next line.
    window.setTimeout(look, 0);
  }
  return wrap;
}
