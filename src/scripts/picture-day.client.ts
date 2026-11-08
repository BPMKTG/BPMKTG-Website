// Client behaviour for /picture-day.
//
// Deliberately NOT an import of wedding.client.ts. That file is a good
// reveal implementation welded to wedding markup (its header, its nav,
// its motes, its scroll-focus). This page needs the same reveal
// CONTRACT — [data-reveal] gains .is-in — plus two things of its own,
// so it carries its own thirty lines instead of dragging in a module
// that would query for elements this page does not have.
//
// Everything here degrades to nothing: with no JS the page is fully
// readable, every link works, every price and every pose photo is on
// screen, and the only thing missing is the lightbox.

const reduced =
  typeof matchMedia === 'function'
  && matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── reveal ───────────────────────────────────────────────────── */

function initReveal(): void {
  const items = Array.from(
    document.querySelectorAll<HTMLElement>('[data-reveal]')
  );
  if (!items.length) return;

  // No observer, or the reader asked for less motion: show everything
  // now. The start state is `opacity: 0`, so skipping this would leave
  // the page blank, which is the one failure mode that matters.
  if (reduced || !('IntersectionObserver' in window)) {
    for (const el of items) el.classList.add('is-in');
    return;
  }

  const observer = (options: IntersectionObserverInit) =>
    new IntersectionObserver((entries, obs) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('is-in');
        obs.unobserve(entry.target);   // one-time entrance, never replayed
      }
    }, options);

  const soon = observer({ threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
  // The package cards swing in over 1.6s, so they fire later: triggered
  // at the same point as everything else the motion finishes offscreen
  // and nobody sees it.
  const late = observer({ threshold: 0, rootMargin: '0px 0px -25% 0px' });

  for (const el of items) {
    // Anything already at or above the fold is shown outright, never
    // observed. An observer's first callback lands a frame or two after
    // it is created, and anything that scrolls out of view inside that
    // window is reported as "not intersecting" and then never again —
    // it would sit at opacity 0 for the life of the page. That is not
    // hypothetical here: browsers restore scroll position on reload,
    // and this page's own jump link puts #schedule in the URL, so a
    // parent re-opening the link they were sent is exactly the case
    // that breaks. Content on this page is a schedule and a price
    // list; it does not get to be invisible because a transition
    // missed its cue.
    if (el.getBoundingClientRect().top < window.innerHeight) {
      el.classList.add('is-in');
      continue;
    }
    (el.dataset.reveal === 'flip' ? late : soon).observe(el);
  }
}

/* ── pose lightbox ────────────────────────────────────────────── */

function initLightbox(): void {
  const dialog = document.querySelector<HTMLDialogElement>('[data-pd-lb]');
  const tiles = Array.from(
    document.querySelectorAll<HTMLButtonElement>('[data-pd-photo]')
  );
  if (!dialog || !tiles.length || typeof dialog.showModal !== 'function') return;

  const img = dialog.querySelector<HTMLImageElement>('[data-pd-lb-img]');
  if (!img) return;

  let at = 0;

  const show = (index: number) => {
    at = (index + tiles.length) % tiles.length;   // wraps both ways
    const tile = tiles[at];
    img.src = tile.dataset.full ?? '';
    // The tile's own <img> carries the alt; no written caption is shown
    // under the picture, so the alt is all there is to carry across.
    img.alt = tile.querySelector('img')?.alt ?? '';
  };

  for (const [index, tile] of tiles.entries()) {
    tile.addEventListener('click', () => {
      show(index);
      dialog.showModal();
    });
  }

  dialog.querySelector('[data-pd-lb-prev]')
    ?.addEventListener('click', () => show(at - 1));
  dialog.querySelector('[data-pd-lb-next]')
    ?.addEventListener('click', () => show(at + 1));
  dialog.querySelector('[data-pd-lb-close]')
    ?.addEventListener('click', () => dialog.close());

  dialog.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(at - 1); }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(at + 1); }
  });

  // The dialog element fills its own backdrop area, so a click lands on
  // the dialog itself only when it misses the picture and the bar.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });

  // Returning focus to the tile that was opened is the dialog's job in
  // theory and unreliable in practice once the image inside changes.
  dialog.addEventListener('close', () => {
    tiles[at]?.focus();
    img.src = '';   // stop a large webp sitting in memory behind a closed dialog
  });
}

/* ── go ───────────────────────────────────────────────────────── */

const start = () => {
  initReveal();
  initLightbox();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
