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

  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });

  els.forEach(el => {
    el.setAttribute('data-wed-reveal', '1');
    io.observe(el);
  });
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

const boot = () => {
  initReveal();
  initMediaLoading();
  initHeader();
  initNav();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
