// Motion for the /weddings page only.
//
// Deliberately NOT motion.client.ts: that script also builds the blue
// crosshair cursor, the hero particle canvas, and the HUD tilt — all of
// which belong to the EDM side of the brand and would fight this page's
// light, quiet aesthetic. This is the small subset that page needs.
//
// The site has no ClientRouter (see Layout.astro's note), so every
// navigation is a full page load: no cleanup or re-init plumbing needed.

// 1. Reveal-on-scroll — same [data-reveal] / .is-in contract as the main
//    site, so markup written for either page behaves identically.
function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-wed-reveal])');
  if (!els.length) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    els.forEach(el => {
      el.classList.add('is-in');
      el.setAttribute('data-wed-reveal', '1');
    });
    return;
  }

  const observe = (targets: HTMLElement[], options: IntersectionObserverInit) => {
    if (!targets.length) return;
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          io.unobserve(entry.target);
        }
      }
    }, options);
    targets.forEach(el => {
      el.setAttribute('data-wed-reveal', '1');
      io.observe(el);
    });
  };

  const all = Array.from(els);
  const flip = all.filter(el => el.dataset.reveal === 'flip');
  const rest = all.filter(el => el.dataset.reveal !== 'flip');

  observe(rest, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  // The flip cards get their own, later trigger. A percentage threshold is
  // the wrong metric for them: the package cards are ~800px tall, so 12% of
  // the card is a sliver at the very bottom of the screen, and the 1.6s
  // spin would be over before it scrolled into view. Firing on the top edge
  // crossing 75% of the viewport means the spin plays where you can see it.
  observe(flip, { threshold: 0, rootMargin: '0px 0px -25% 0px' });
}

// 2. Image fade-in. Images only — the hover-preview <video>s own their
//    opacity via :hover, and forcing them visible would break that.
//    Only tags images that haven't decoded yet, so already-cached images
//    never flash to opacity:0 for a frame.
function initMediaLoading() {
  document.querySelectorAll<HTMLImageElement>('img:not([data-wed-loading])').forEach(img => {
    if (img.complete && img.naturalWidth > 0) return;
    img.setAttribute('data-wed-loading', '1');
    const finish = () => {
      img.setAttribute('data-wed-loaded', '1');
      img.removeEventListener('load', finish);
      img.removeEventListener('error', finish);
    };
    img.addEventListener('load', finish);
    img.addEventListener('error', finish);
  });
}

// 3. Header state — the transparent-over-hero header gets a solid
//    background once the page scrolls past the hero.
function initHeader() {
  const header = document.querySelector<HTMLElement>('[data-wed-header]');
  if (!header) return;
  const onScroll = () => {
    header.classList.toggle('is-stuck', window.scrollY > 40);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

// 4. Mobile menu.
function initNav() {
  const toggle = document.querySelector<HTMLButtonElement>('[data-wed-nav-toggle]');
  const sheet  = document.querySelector<HTMLElement>('[data-wed-nav]');
  if (!toggle || !sheet) return;

  const open = () => {
    sheet.hidden = false;
    requestAnimationFrame(() => sheet.classList.add('is-open'));
    toggle.classList.add('is-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.setAttribute('aria-label', 'Close menu');
    document.body.style.overflow = 'hidden';
  };
  const close = () => {
    sheet.classList.remove('is-open');
    toggle.classList.remove('is-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');
    document.body.style.overflow = '';
    window.setTimeout(() => {
      if (!sheet.classList.contains('is-open')) sheet.hidden = true;
    }, 300);
  };

  toggle.addEventListener('click', () => {
    sheet.classList.contains('is-open') ? close() : open();
  });
  sheet.querySelectorAll<HTMLElement>('[data-wed-nav-link]').forEach(el => {
    el.addEventListener('click', close);
  });
  sheet.addEventListener('click', e => { if (e.target === sheet) close(); });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && sheet.classList.contains('is-open')) close();
  });
}

// 5. Champagne motes in the closing CTA.
//    --rise is measured from the host's own height (not a vw/vh guess) so
//    the motes traverse the whole panel at any viewport, and re-measured
//    on resize. Skipped entirely for reduced motion.
function initMotes() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  document.querySelectorAll<HTMLElement>('[data-wed-motes]').forEach(host => {
    const section = host.parentElement ?? host;
    const COUNT = window.matchMedia('(max-width: 700px)').matches ? 14 : 26;

    const setRise = () => {
      host.style.setProperty('--rise', `${section.offsetHeight + 120}px`);
    };
    setRise();
    window.addEventListener('resize', setRise, { passive: true });

    const frag = document.createDocumentFragment();
    for (let i = 0; i < COUNT; i++) {
      const dot = document.createElement('span');
      dot.style.setProperty('--x', `${Math.random() * 100}%`);
      dot.style.setProperty('--dur', `${16 + Math.random() * 16}s`);
      dot.style.setProperty('--delay', `${-Math.random() * 26}s`);
      dot.style.setProperty('--drift', `${(Math.random() - 0.5) * 90}px`);
      frag.appendChild(dot);
    }
    host.appendChild(frag);
  });
}

// 6. Scroll focus for touch devices.
//    There is no hover on a phone, so the card nearest the middle of the
//    viewport gets the emphasis a mouse user would get. Single-active
//    across the page; rows are kept together with a tolerance band so a
//    grid row lights up as one, not cell by cell.
function initScrollFocus() {
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-wed-focus]'));
  if (!cards.length) return;

  let active = new Set<HTMLElement>();
  let ticking = false;

  const pick = () => {
    ticking = false;
    const mid = window.innerHeight / 2;
    const onscreen: { el: HTMLElement; dist: number }[] = [];

    for (const el of cards) {
      const r = el.getBoundingClientRect();
      if (r.bottom < 60 || r.top > window.innerHeight - 60) continue;
      onscreen.push({ el, dist: Math.abs(r.top + r.height / 2 - mid) });
    }

    const next = new Set<HTMLElement>();
    if (onscreen.length) {
      const min = Math.min(...onscreen.map(o => o.dist));
      const ROW_TOLERANCE = 120;
      for (const o of onscreen) if (o.dist <= min + ROW_TOLERANCE) next.add(o.el);
    }

    active.forEach(el => { if (!next.has(el)) el.classList.remove('is-focus'); });
    next.forEach(el => { if (!active.has(el)) el.classList.add('is-focus'); });
    active = next;
  };

  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(pick);
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  window.setTimeout(pick, 250);
}

const boot = () => {
  initReveal();
  initMediaLoading();
  initHeader();
  initNav();
  initMotes();
  initScrollFocus();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
