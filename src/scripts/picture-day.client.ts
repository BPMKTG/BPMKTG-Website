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
// readable, every link works, and the package cards render flat with
// both faces showing (see .pd-card:not([data-flip-ready]) in
// picture-day.css).

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

/* ── package cards ────────────────────────────────────────────── */

/** Just past the 0.31s visibility delay in picture-day.css, which is
 *  half of the 0.62s turn. The two have to move together. */
const SWAP_MS = 330;

function initFlips(): void {
  // Under reduced motion the cards are never marked ready, which is
  // what makes the CSS render both faces flat and drop the controls.
  if (reduced) return;

  for (const card of document.querySelectorAll<HTMLElement>('[data-pd-card]')) {
    const front = card.querySelector<HTMLElement>('[data-pd-face="front"]');
    const back = card.querySelector<HTMLElement>('[data-pd-face="back"]');
    const open = card.querySelector<HTMLButtonElement>('.pd-face-front .pd-flip');
    const close = card.querySelector<HTMLButtonElement>('[data-pd-back]');
    if (!front || !back || !open || !close) continue;

    // Only now does the card claim to be flippable.
    card.dataset.flipReady = '';
    back.toggleAttribute('inert', true);

    let pending: number | undefined;

    const flip = (show: boolean) => {
      card.classList.toggle('is-flipped', show);
      open.setAttribute('aria-expanded', String(show));

      // The handoff waits for the faces to actually swap.
      //
      // The arriving face is `visibility: hidden` until the card is
      // edge-on, and an element inside a hidden subtree cannot take
      // focus — calling .focus() before the swap is a silent no-op,
      // and the next line marking the old face inert then drops focus
      // to <body>. So: let the user keep the control they just used
      // for the first half of the turn, and move focus once the new
      // face is really there.
      if (pending) clearTimeout(pending);
      pending = window.setTimeout(() => {
        const arriving = show ? back : front;
        const leaving = show ? front : back;
        // inert blurs what it contains, so the arriving face is opened
        // up and focused before the leaving one is shut.
        arriving.toggleAttribute('inert', false);
        (show
          ? arriving.querySelector<HTMLElement>('a, button')
          : open
        )?.focus();
        leaving.toggleAttribute('inert', true);
      }, SWAP_MS);
    };

    open.addEventListener('click', () => flip(true));
    close.addEventListener('click', () => flip(false));

    // Escape closes the card that is currently showing its back, which
    // is what anyone who has used a flip card expects.
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && card.classList.contains('is-flipped')) {
        event.stopPropagation();
        flip(false);
      }
    });
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
  const cap = dialog.querySelector<HTMLElement>('[data-pd-lb-cap]');
  if (!img || !cap) return;

  let at = 0;

  const show = (index: number) => {
    at = (index + tiles.length) % tiles.length;   // wraps both ways
    const tile = tiles[at];
    img.src = tile.dataset.full ?? '';
    img.alt = tile.dataset.caption ?? '';
    cap.textContent = tile.dataset.caption ?? '';
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
  initFlips();
  initLightbox();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', start, { once: true });
} else {
  start();
}
