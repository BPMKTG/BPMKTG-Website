// Master motion script — loaded once from Layout.astro.
// Hooks: [data-reveal], [data-counter], [data-typewriter], [data-glitch], [data-tilt],
//        [data-roadmap-line], plus hero particles + custom cursor + CTA particles.
//
// Lifecycle:
// - Single bootstrap path: `astro:page-load` (fires on initial load AND on
//   every view-transition navigation). A DOMContentLoaded fallback covers
//   the case where the script registers its listener after page-load fired.
// - Per-element `data-mx-*` markers make every init function idempotent:
//   re-running against the same DOM is a no-op for already-bound elements.
// - `astro:before-swap` runs `runCleanups()` so document/window listeners
//   and IntersectionObservers from the outgoing page don't stack up on the
//   incoming page.

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => window.matchMedia('(pointer: fine)').matches;

// ─────────────────────────────────────────────────────────────
// Lifecycle plumbing
// ─────────────────────────────────────────────────────────────
type Cleanup = () => void;
let cleanups: Cleanup[] = [];
const onCleanup = (fn: Cleanup) => { cleanups.push(fn); };
function runCleanups() {
  for (const fn of cleanups) {
    try { fn(); } catch { /* keep tearing down */ }
  }
  cleanups = [];
}

// ─────────────────────────────────────────────────────────────
// 1. Reveal-on-scroll
// ─────────────────────────────────────────────────────────────
function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]:not([data-mx-reveal])');
  if (!els.length) return;
  if (reduce()) {
    els.forEach(el => { el.classList.add('is-in'); el.setAttribute('data-mx-reveal', '1'); });
    return;
  }
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  els.forEach(el => { el.setAttribute('data-mx-reveal', '1'); io.observe(el); });
  onCleanup(() => io.disconnect());
}

// ─────────────────────────────────────────────────────────────
// 2. Counter animations
// ─────────────────────────────────────────────────────────────
function parseCounter(target: string) {
  const cleaned = target.replace(/,/g, '');
  const m = cleaned.match(/^([^\d.-]*)([\d.]+)(.*)$/);
  if (!m) return null;
  return { prefix: m[1], value: parseFloat(m[2]), suffix: m[3] };
}

// Detect leading-zero padding ("01", "02", "007") so the count-up
// animation preserves the original width. Returns 0 when no padding.
function leadingZeroDigits(target: string) {
  const intPart = target.replace(/^[^\d.-]*/, '').match(/^[\d]+/)?.[0] || '';
  return intPart.length > 1 && intPart.startsWith('0') ? intPart.length : 0;
}

function formatCounterValue(v: number, decimals: number, prefix: string, suffix: string, minDigits = 0) {
  if (decimals > 0) return prefix + v.toFixed(decimals) + suffix;
  const rounded = Math.round(v);
  if (minDigits > 0) return prefix + rounded.toString().padStart(minDigits, '0') + suffix;
  return prefix + rounded.toLocaleString('en-US') + suffix;
}

function animateCounter(el: HTMLElement) {
  const target = el.dataset.counter;
  if (!target) return;
  // Run-once guard: even if the element is observed/triggered more than once
  // (re-init, overlapping observers), the count-up only ever fires a single
  // time — prevents the value jumping back to 0 mid-animation.
  if (el.dataset.mxCounted) return;
  el.dataset.mxCounted = '1';
  const parsed = parseCounter(target);
  if (!parsed) return;
  const decimals = (target.split('.')[1] || '').replace(/[^\d]/g, '').length;
  const minDigits = leadingZeroDigits(target);
  const dur = 1600;
  const t0 = performance.now();

  const frame = (now: number) => {
    const t = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = parsed.value * eased;
    el.textContent = formatCounterValue(v, decimals, parsed.prefix, parsed.suffix, minDigits);
    if (t < 1) requestAnimationFrame(frame);
    else {
      el.textContent = target;
      const wrap = el.closest('.stat, .price, .founder-photo');
      if (wrap) wrap.classList.add('is-counted');
    }
  };
  requestAnimationFrame(frame);
}

function initCounters() {
  const els = document.querySelectorAll<HTMLElement>('[data-counter]:not([data-mx-counter])');
  if (!els.length) return;
  // Seed each element with a "0"-state matching its format
  els.forEach(el => {
    const target = el.dataset.counter!;
    const p = parseCounter(target);
    if (!p) { el.textContent = target; return; }
    const decimals = (target.split('.')[1] || '').replace(/[^\d]/g, '').length;
    const minDigits = leadingZeroDigits(target);
    el.textContent = formatCounterValue(0, decimals, p.prefix, p.suffix, minDigits);
    el.setAttribute('data-mx-counter', '1');
  });
  if (reduce()) {
    els.forEach(el => { el.textContent = el.dataset.counter!; el.closest('.stat')?.classList.add('is-counted'); });
    return;
  }
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        // Animate every counter inside the intersecting target (the target is
        // the counter's reveal-ancestor card, which may hold one counter).
        const t = entry.target as HTMLElement;
        const counters = t.matches('[data-counter]')
          ? [t]
          : Array.from(t.querySelectorAll<HTMLElement>('[data-counter]'));
        counters.forEach(animateCounter);
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.15, rootMargin: '0px 0px -8% 0px' });
  // Observe each counter's nearest [data-reveal] ancestor (deduped) using the
  // SAME threshold/rootMargin as the reveal observer. Both observers then fire
  // for the same element in the same callback pass — so the number starts
  // counting on the exact frame the card's label, descriptor, and trace-line
  // reveal animation begins, not after. Falls back to the counter itself when
  // it has no reveal ancestor.
  const targets = new Set<HTMLElement>();
  els.forEach(el => targets.add((el.closest('[data-reveal]') as HTMLElement) ?? el));
  targets.forEach(t => io.observe(t));
  onCleanup(() => io.disconnect());
}

// ─────────────────────────────────────────────────────────────
// 3. Typewriter
// ─────────────────────────────────────────────────────────────
function initTypewriter() {
  const els = document.querySelectorAll<HTMLElement>('[data-typewriter]:not([data-mx-typewriter])');
  if (!els.length) return;
  const ios: IntersectionObserver[] = [];
  const timers: number[] = [];
  els.forEach(el => {
    const text = el.dataset.typewriterText ?? el.textContent ?? '';
    el.dataset.typewriterText = text;
    el.setAttribute('data-mx-typewriter', '1');
    if (reduce()) { el.textContent = text; el.classList.add('is-done'); return; }
    el.textContent = '';

    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          el.classList.add('is-typing');
          let i = 0;
          const tick = () => {
            if (i <= text.length) {
              el.textContent = text.slice(0, i);
              i++;
              const ch = text[i - 1];
              const delay = ch === '.' || ch === ',' ? 70 : ch === ' ' ? 14 : 12 + Math.random() * 18;
              timers.push(window.setTimeout(tick, delay));
            } else {
              el.classList.remove('is-typing');
              el.classList.add('is-done');
            }
          };
          tick();
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.4 });
    io.observe(el);
    ios.push(io);
  });
  onCleanup(() => {
    ios.forEach(io => io.disconnect());
    timers.forEach(id => window.clearTimeout(id));
  });
}

// ─────────────────────────────────────────────────────────────
// 4. Glitch effect — fires once shortly after element comes into view
// ─────────────────────────────────────────────────────────────
function initGlitch() {
  if (reduce()) return;
  const els = document.querySelectorAll<HTMLElement>('[data-glitch]:not([data-mx-glitch])');
  if (!els.length) return;
  const ios: IntersectionObserver[] = [];
  const timers: number[] = [];
  els.forEach(el => {
    if (!el.hasAttribute('data-text')) el.setAttribute('data-text', el.textContent || '');
    el.setAttribute('data-mx-glitch', '1');
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          timers.push(window.setTimeout(() => {
            el.classList.add('is-glitching');
            timers.push(window.setTimeout(() => el.classList.remove('is-glitching'), 700));
          }, 220));
          timers.push(window.setTimeout(() => {
            el.classList.add('is-glitching');
            timers.push(window.setTimeout(() => el.classList.remove('is-glitching'), 700));
          }, 1450));
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.4 });
    io.observe(el);
    ios.push(io);
  });
  onCleanup(() => {
    ios.forEach(io => io.disconnect());
    timers.forEach(id => window.clearTimeout(id));
  });
}

// ─────────────────────────────────────────────────────────────
// 5. Custom cursor (desktop, fine pointer, no reduced-motion)
// ─────────────────────────────────────────────────────────────
function initCursor() {
  if (!finePointer() || reduce()) return;

  // Persist the cursor element across view transitions so it doesn't
  // disappear during the body swap. transition:persist is set declaratively
  // via the data attribute below — Astro reads that during the swap.
  let cursor = document.querySelector<HTMLElement>('.bp-cursor');
  if (!cursor) {
    cursor = document.createElement('div');
    cursor.className = 'bp-cursor';
    cursor.setAttribute('aria-hidden', 'true');
    cursor.setAttribute('data-astro-transition-persist', 'bp-cursor');
    document.body.appendChild(cursor);
  }
  const node = cursor;

  // Restore last known cursor state from a window cache so the cursor
  // doesn't snap to (-100, -100) after a navigation. Cache is written
  // by the onCleanup below so position survives the swap.
  const win = window as unknown as {
    __bpCursorTx?: number; __bpCursorTy?: number;
    __bpCursorX?: number;  __bpCursorY?: number;
  };
  let tx = win.__bpCursorTx ?? -100;
  let ty = win.__bpCursorTy ?? -100;
  let x  = win.__bpCursorX  ?? tx;
  let y  = win.__bpCursorY  ?? ty;

  // Hide the cursor until the first real pointer move, then snap it straight
  // to the pointer (no lerp) and fade it in. Navigation is a full page load,
  // so we never know the true pointer position up front — without this the
  // cursor would start at (-100,-100) and visibly slide in from the corner on
  // every page change ("jumps away and back"). `ready` flips on first move.
  let ready = x !== -100;
  if (ready) node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  else node.style.opacity = '0';

  let raf = 0, running = true;
  const onMove = (e: PointerEvent) => {
    tx = e.clientX; ty = e.clientY;
    if (!ready) {
      // First sighting of the pointer: place the cursor exactly there and reveal.
      ready = true;
      x = tx; y = ty;
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      node.style.opacity = '';
    }
  };
  const onDown = () => node.classList.add('is-click');
  const onUp   = () => node.classList.remove('is-click');
  const onOver = (e: Event) => {
    const t = e.target as HTMLElement | null;
    if (!t || !t.closest) return;
    const hot = t.closest('a, button, [role="button"], [data-lightbox-open], [data-meter], input, textarea, select, label');
    node.classList.toggle('is-hover', !!hot);
  };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerdown', onDown);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointerover', onOver);

  // Lerp factor tuned higher (was 0.28) for snappier trackpad response.
  // 0.55 catches up ~98% within 4 frames — still smoothed, but feels
  // close-to-native on both mouse and trackpad.
  const LERP = 0.55;
  const tick = () => {
    if (!running) return;
    // Hidden-tab guard: don't waste a frame painting an invisible cursor.
    if (!document.hidden) {
      x += (tx - x) * LERP;
      y += (ty - y) * LERP;
      node.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    }
    raf = requestAnimationFrame(tick);
  };
  raf = requestAnimationFrame(tick);

  onCleanup(() => {
    running = false;
    cancelAnimationFrame(raf);
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerdown', onDown);
    document.removeEventListener('pointerup', onUp);
    document.removeEventListener('pointerover', onOver);
    // Persist last position across the swap so the new init restores it.
    win.__bpCursorTx = tx; win.__bpCursorTy = ty;
    win.__bpCursorX  = x;  win.__bpCursorY  = y;
  });
}

// ─────────────────────────────────────────────────────────────
// 6. Hero particle system — canvas, throttled to viewport visibility
// ─────────────────────────────────────────────────────────────
function initHeroParticles() {
  if (reduce()) return;
  const heroEl = document.querySelector<HTMLElement>('.hero');
  if (!heroEl) return;

  // In the cinematic desktop hero the section is a tall (200vh) scroll
  // track, so host the canvas in the pinned 100vh stage instead — that way
  // the particles stay put and sized to the viewport. Decided by the same
  // media query the cinematic effect uses (avoids a class-timing race).
  const cine = window.matchMedia(
    '(min-width: 981px) and (hover: hover) and (prefers-reduced-motion: no-preference)'
  ).matches;
  const sticky = heroEl.querySelector<HTMLElement>('.hero-sticky');
  const hero = (cine && sticky) ? sticky : heroEl;

  // If the persisted hero already has a canvas, leave it alone (just rebind
  // its listeners). If not — fresh page — create the canvas.
  let canvas = hero.querySelector<HTMLCanvasElement>(':scope > canvas.hero-particles');
  const ownsCanvas = !canvas;
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.className = 'hero-particles';
    canvas.setAttribute('aria-hidden', 'true');
    hero.insertBefore(canvas, hero.firstChild);
  }

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas!.width  = Math.floor(w * dpr);
    canvas!.height = Math.floor(h * dpr);
    canvas!.style.width  = w + 'px';
    canvas!.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  // Mobile gets noticeably fewer dots and a tighter line-draw radius so the
  // constellation effect reads as a subtle accent rather than a busy net.
  // Desktop tuning is unchanged.
  const isMobile = window.innerWidth < 700;
  const COUNT = isMobile ? 16 : 75;
  const LINK_DIST = isMobile ? 70 : 118;
  type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
  const ps: P[] = Array.from({ length: COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.16,
    vy: (Math.random() - 0.5) * 0.16,
    r: Math.random() * 2 + 0.8,
    a: Math.random() * 0.45 + 0.38,
  }));

  let mx = -9999, my = -9999;
  const onPointerMove = (e: PointerEvent) => {
    const rect = hero.getBoundingClientRect();
    mx = e.clientX - rect.left;
    my = e.clientY - rect.top;
  };
  const onPointerLeave = () => { mx = my = -9999; };
  hero.addEventListener('pointermove', onPointerMove);
  hero.addEventListener('pointerleave', onPointerLeave);

  let raf = 0, running = false;
  const draw = () => {
    // Skip painting while a modal lightbox is open (avoids re-blurring a
    // repainting canvas under the dialog's backdrop-filter every frame).
    if (document.querySelector('dialog[open]')) {
      if (running) raf = requestAnimationFrame(draw);
      return;
    }
    ctx.clearRect(0, 0, w, h);

    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST * LINK_DIST) {
          const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.3;
          ctx.strokeStyle = `rgba(98, 166, 219, ${alpha})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    for (const p of ps) {
      const dx = p.x - mx, dy = p.y - my;
      const dist = Math.hypot(dx, dy);
      if (dist < 160 && dist > 0.01) {
        const f = (160 - dist) / 160 * 0.1;
        p.vx += (dx / dist) * f;
        p.vy += (dy / dist) * f;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy *= 0.985;
      p.vx += (Math.random() - 0.5) * 0.005;
      p.vy += (Math.random() - 0.5) * 0.005;
      if (p.x < -4)  p.x = w + 4;
      if (p.x > w + 4) p.x = -4;
      if (p.y < -4)  p.y = h + 4;
      if (p.y > h + 4) p.y = -4;

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(179, 224, 246, ${p.a})`;
      ctx.fill();
    }
    if (running) raf = requestAnimationFrame(draw);
  };

  const io = new IntersectionObserver(([entry]) => {
    running = entry.isIntersecting && !document.hidden;
    if (running) raf = requestAnimationFrame(draw);
    else cancelAnimationFrame(raf);
  }, { threshold: 0 });
  io.observe(hero);

  const onVisibility = () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
  };
  document.addEventListener('visibilitychange', onVisibility);

  onCleanup(() => {
    running = false;
    cancelAnimationFrame(raf);
    io.disconnect();
    window.removeEventListener('resize', resize);
    hero.removeEventListener('pointermove', onPointerMove);
    hero.removeEventListener('pointerleave', onPointerLeave);
    document.removeEventListener('visibilitychange', onVisibility);
    // Remove the canvas only if THIS init created it; otherwise let the
    // persisted hero keep its canvas across the swap.
    if (ownsCanvas && canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
  });
}

// ─────────────────────────────────────────────────────────────
// 7. 3D tilt on hover
// ─────────────────────────────────────────────────────────────
function initTilt() {
  if (reduce() || !finePointer()) return;
  const els = document.querySelectorAll<HTMLElement>('[data-tilt]:not([data-mx-tilt])');
  if (!els.length) return;
  const teardown: Array<() => void> = [];
  els.forEach(el => {
    const wrap = el.querySelector<HTMLElement>('.img-wrap');
    if (!wrap) return;
    el.setAttribute('data-mx-tilt', '1');

    let trx = 0, try_ = 0, rx = 0, ry = 0, raf = 0, running = false;
    const max = 8;

    const tick = () => {
      rx += (trx - rx) * 0.18;
      ry += (try_ - ry) * 0.18;
      wrap.style.setProperty('--tilt-rx', `${rx}deg`);
      wrap.style.setProperty('--tilt-ry', `${ry}deg`);
      if (running) raf = requestAnimationFrame(tick);
    };

    const onEnter = () => { if (!running) { running = true; raf = requestAnimationFrame(tick); } };
    const onMove = (e: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const px = (cx / rect.width) * 2 - 1;
      const py = (cy / rect.height) * 2 - 1;
      trx = -py * max;
      try_ = px * max;
      wrap.style.setProperty('--mx', `${(cx / rect.width) * 100}%`);
      wrap.style.setProperty('--my', `${(cy / rect.height) * 100}%`);
    };
    const onLeave = () => {
      trx = 0; try_ = 0;
      window.setTimeout(() => { running = false; cancelAnimationFrame(raf); }, 450);
    };

    el.addEventListener('pointerenter', onEnter);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);

    teardown.push(() => {
      running = false;
      cancelAnimationFrame(raf);
      el.removeEventListener('pointerenter', onEnter);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
    });
  });
  onCleanup(() => teardown.forEach(fn => fn()));
}

// ─────────────────────────────────────────────────────────────
// 8. Roadmap connecting line + steps reveal
// ─────────────────────────────────────────────────────────────
function initRoadmapLine() {
  const line = document.querySelector<HTMLElement>('.roadmap-line:not([data-mx-roadmap])');
  if (!line) return;
  line.setAttribute('data-mx-roadmap', '1');
  if (reduce()) { line.classList.add('is-in'); return; }
  const io = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { line.classList.add('is-in'); io.unobserve(line); }
  }, { threshold: 0.2 });
  io.observe(line);
  onCleanup(() => io.disconnect());
}

// ─────────────────────────────────────────────────────────────
// 9. CTA floating particles (DOM-based, very cheap)
// ─────────────────────────────────────────────────────────────
function initCtaParticles() {
  if (reduce()) return;
  // Only BookCall CTA section gets particles — not the footer.
  const hosts = document.querySelectorAll<HTMLElement>('.cta-particles');
  for (const host of hosts) {
    if (host.children.length) continue; // idempotent
    const count     = parseInt(host.dataset.count     || '18', 10);
    const durBase   = parseInt(host.dataset.durBase   || '10', 10);
    const durSpread = parseInt(host.dataset.durSpread || '10', 10);
    // Set --rise to the host's own pixel height so particles travel
    // the full section regardless of viewport. Was a fixed -110vh in
    // CSS, which on tall mobile sections left a gap at the top.
    const setRise = () => {
      const h = host.offsetHeight || 600;
      host.style.setProperty('--rise', `${h + 100}px`);
    };
    setRise();
    // Re-measure on resize so the particle path keeps up with the
    // current section height on rotation / responsive breakpoints.
    const onResize = () => setRise();
    window.addEventListener('resize', onResize, { passive: true });
    onCleanup(() => window.removeEventListener('resize', onResize));
    for (let i = 0; i < count; i++) {
      const s = document.createElement('span');
      s.style.setProperty('--x', `${Math.random() * 100}%`);
      s.style.setProperty('--dur', `${durBase + Math.random() * durSpread}s`);
      s.style.setProperty('--delay', `${-Math.random() * 12}s`);
      s.style.setProperty('--drift', `${(Math.random() - 0.5) * 80}px`);
      s.style.transform = `scale(${0.7 + Math.random() * 1.2})`;
      host.appendChild(s);
    }
  }
}

// 10. (removed) Lightbox arrow-key navigation — the portfolio page owns its
//     own complete lightbox (open/close/arrow/swipe) in an inline script.
//     A second global handler here double-fired arrow navigation and is gone.

// ─────────────────────────────────────────────────────────────
// 11. Background parallax + scroll-driven scale for full-bleed sections
//     One rAF-throttled scroll listener handles both [data-parallax-bg]
//     (vertical drift) and [data-scale-bg] (Apple-style fill-on-scroll).
// ─────────────────────────────────────────────────────────────
function initBgScrollEffects() {
  if (reduce()) return;
  const parallaxEls = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax-bg]'));
  const scaleEls    = Array.from(document.querySelectorAll<HTMLElement>('[data-scale-bg]'));
  if (!parallaxEls.length && !scaleEls.length) return;

  // Re-resolved on every init so view-transition swaps replace stale refs.
  const parallaxItems = parallaxEls.map(el => ({
    el,
    section: (el.closest('section') ?? el.parentElement) as HTMLElement,
  }));
  const scaleItems = scaleEls.map(el => ({
    el,
    section: (el.closest('section') ?? el.parentElement) as HTMLElement,
    start: parseFloat(el.dataset.scaleStart ?? '1'),
    end:   parseFloat(el.dataset.scaleEnd   ?? '1.12'),
  }));

  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;

    for (const { el, section } of parallaxItems) {
      if (!section || !section.isConnected) continue;
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -300 || rect.top > vh + 300) continue;
      const progress = (vh / 2 - (rect.top + rect.height / 2)) / (vh / 2 + rect.height / 2);
      const clamped = Math.max(-1, Math.min(1, progress));
      el.style.setProperty('--parallax-y', `${clamped * 70}px`);
    }

    for (const { el, section, start, end } of scaleItems) {
      if (!section || !section.isConnected) continue;
      const rect = section.getBoundingClientRect();
      if (rect.bottom < -300 || rect.top > vh + 300) continue;
      const progress = (vh - rect.top) / (vh + rect.height);
      const clamped = Math.max(0, Math.min(1, progress));
      const scale = start + clamped * (end - start);
      el.style.setProperty('--scale-bg', `${scale}`);
    }
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();

  onCleanup(() => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  });
}

// ─────────────────────────────────────────────────────────────
// 12. Scroll-driven focus state (touch-only)
//     Touch devices have no :hover, so cards/tiles never get the
//     blue-outline emphasis desktop users see when they mouse over.
//     This applies an `.is-focus` class to any [data-scroll-focus]
//     element while it sits in the middle band of the viewport, so
//     the CSS @media (hover: none) rules can mirror the :hover look.
// ─────────────────────────────────────────────────────────────
function initScrollFocus() {
  // Only on touch / no-hover environments
  if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  if (reduce()) return;
  const all = Array.from(document.querySelectorAll<HTMLElement>('[data-scroll-focus]'));
  const fresh = all.filter(el => !el.hasAttribute('data-mx-focus'));
  if (!all.length) return;

  fresh.forEach(el => el.setAttribute('data-mx-focus', '1'));

  // Track which elements are currently in-viewport so we don't have to
  // measure every [data-scroll-focus] on every scroll frame.
  const inView = new Set<HTMLElement>();
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      const el = entry.target as HTMLElement;
      if (entry.isIntersecting) inView.add(el);
      else { inView.delete(el); el.classList.remove('is-focus'); }
    }
    schedule();
  }, { rootMargin: '0px 0px 0px 0px', threshold: 0 });
  all.forEach(el => io.observe(el));

  // Pick the single in-view element whose vertical center is closest to
  // the viewport center. Anything outside ±35% of the viewport is
  // disqualified (matches the old rootMargin band, but enforced one at
  // a time so we never have two cards lit up).
  let current: HTMLElement | null = null;
  let ticking = false;
  const pick = () => {
    ticking = false;
    const vh = window.innerHeight;
    const vCenter = vh / 2;
    const maxDist = vh * 0.35;
    let best: { el: HTMLElement; dist: number } | null = null;
    for (const el of inView) {
      const r = el.getBoundingClientRect();
      if (r.height <= 0) continue;
      const c = r.top + r.height / 2;
      const dist = Math.abs(c - vCenter);
      if (dist > maxDist) continue;
      if (!best || dist < best.dist) best = { el, dist };
    }
    const next = best?.el ?? null;
    if (next === current) return;
    if (current) current.classList.remove('is-focus');
    current = next;
    if (current) current.classList.add('is-focus');
  };
  const schedule = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(pick);
  };
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  schedule();

  onCleanup(() => {
    io.disconnect();
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    if (current) current.classList.remove('is-focus');
    current = null;
  });
}

// ─────────────────────────────────────────────────────────────
// Vision-section scroll-progress line
//   A thin vertical accent line on the left of an [data-vision-line]
//   element. Its inner --fill is the section's scroll progress (0–1)
//   computed from the section's bounding rect, so the line "draws"
//   downward as you read through the section.
// ─────────────────────────────────────────────────────────────
function initVisionLine() {
  const lines = document.querySelectorAll<HTMLElement>('[data-vision-line]:not([data-mx-vline])');
  if (!lines.length) return;
  if (reduce()) {
    lines.forEach(l => l.style.setProperty('--fill', '1'));
    return;
  }

  const watched = Array.from(lines).map(line => {
    line.setAttribute('data-mx-vline', '1');
    const section = (line.closest('[data-vision-section]') ?? line.parentElement) as HTMLElement;
    return { line, section };
  });

  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    for (const { line, section } of watched) {
      if (!section) continue;
      const r = section.getBoundingClientRect();
      // Progress = 0 when section's top is at viewport-bottom, 1 when
      // section's bottom hits viewport-top. Clamp.
      const total = r.height + vh;
      const traversed = vh - r.top;
      const p = Math.max(0, Math.min(1, traversed / total));
      line.style.setProperty('--fill', p.toFixed(3));
    }
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(update);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll, { passive: true });
  update();
  onCleanup(() => {
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onScroll);
  });
}

// ─────────────────────────────────────────────────────────────
// Media loading fade-in — applies a graceful opacity transition to
// images and hover-preview videos as their resources finish loading.
// Without this, slow-loading media reads as "broken" on first visit.
// Pure DOM event listeners; no observers, no rAF.
// ─────────────────────────────────────────────────────────────
function initMediaLoading() {
  // IMAGES ONLY. Videos are intentionally excluded — the hover-preview
  // videos in FilmTile / BrandMessage / OnFilm have their own opacity
  // lifecycle driven by :hover state, and a data-mx-loaded force to
  // opacity:1 would override their natural hidden state.
  //
  // Only tag images that ISN'T already loaded — otherwise we'd briefly
  // flash already-decoded images to opacity:0 between the attribute
  // being added and the next paint. Already-loaded media stays at its
  // natural opacity:1 (no CSS rule applies).
  const imgs = document.querySelectorAll<HTMLImageElement>('img:not([data-mx-loading])');
  imgs.forEach(img => {
    if (img.dataset.mxLoaded === '1') return;
    if (img.complete && img.naturalWidth > 0) return; // already decoded
    img.setAttribute('data-mx-loading', '1');
    const finish = () => {
      img.setAttribute('data-mx-loaded', '1');
      img.removeEventListener('load',  finish);
      img.removeEventListener('error', finish);
    };
    img.addEventListener('load',  finish);
    img.addEventListener('error', finish);
  });
}

// ─────────────────────────────────────────────────────────────
// Hero video source — set per viewport. Must run on every page-load
// (not just first parse) so the video re-loads when the user navigates
// BACK to the homepage via view transitions. Idempotent: skips if the
// correct source is already applied so we don't restart a playing video.
// ─────────────────────────────────────────────────────────────
function initHeroVideo() {
  const v = document.querySelector<HTMLVideoElement>('.hero-video');
  if (!v) return;
  const HORIZ = '/videos/hero-montage.mp4';
  const VERT  = '/videos/hero-montage-vertical.mp4';
  const mobile = window.matchMedia('(max-width: 980px)').matches;
  const want = mobile ? VERT : HORIZ;

  // play() must wait until the element can actually play — calling it
  // synchronously right after load() rejects with AbortError (load() resets
  // the media), and the autoplay attribute does not reliably re-fire after a
  // manual src change. So we (re)attempt playback on canplay.
  const tryPlay = () => { if (v.paused) v.play().catch(() => {}); };

  // Already pointed at the right file — leave the source alone, just make
  // sure it's playing (covers a paused-after-swap state).
  const current = v.currentSrc || v.src;
  if (current.indexOf(want) > -1) { tryPlay(); return; }

  if (!v.dataset.mxHeroVideo) {
    v.dataset.mxHeroVideo = '1';
    v.addEventListener('canplay', tryPlay);
    v.addEventListener('error', () => {
      if ((v.currentSrc || v.src).indexOf('vertical') > -1) { v.src = HORIZ; v.load(); }
    });
  }
  v.src = want;
  v.load();
}

// ─────────────────────────────────────────────────────────────
// Init / re-init
// ─────────────────────────────────────────────────────────────
function init() {
  initReveal();
  initCounters();
  initTypewriter();
  initGlitch();
  initCursor();
  initHeroVideo();
  initHeroParticles();
  initTilt();
  initRoadmapLine();
  initBgScrollEffects();
  initCtaParticles();
  initScrollFocus();
  initVisionLine();
  initMediaLoading();
}

// Bootstrap: rely on `astro:page-load` (fires on initial load AND on every
// view-transition navigation). Guard against the rare case where the
// listener registers after the event has already fired by also running on
// DOMContentLoaded — but only if astro:page-load hasn't beaten us to it.
let didInit = false;
const safeInit = () => {
  if (didInit) return;
  didInit = true;
  init();
};

document.addEventListener('astro:before-swap', () => {
  runCleanups();
  didInit = false;

  // ── Global safety net ──────────────────────────────────────────────
  // Catch-all that runs before EVERY navigation regardless of per-component
  // cleanup: force-close any dialog still in the top layer and clear every
  // page-level lock so a modal can never strand the next page (the lightbox
  // "freeze"). A <dialog> left in the top layer — even visually closed —
  // blocks the view transition, so every dialog is hard-closed here.
  document.querySelectorAll<HTMLDialogElement>('dialog').forEach(d => {
    if (d.open) { try { d.close(); } catch { d.removeAttribute('open'); } }
  });
  const b = document.body, h = document.documentElement;
  b.style.overflow = '';
  b.style.height = '';
  b.style.paddingRight = '';
  b.style.pointerEvents = '';
  h.style.overflow = '';
  b.classList.remove('modal-open', 'lightbox-open', 'no-scroll');
  h.classList.remove('modal-open', 'lightbox-open', 'no-scroll');
});
document.addEventListener('astro:page-load', safeInit);

// ── View-transition watchdog ───────────────────────────────────────────
// If a navigation's view transition stalls (e.g. a compositor conflict) the
// page can appear frozen. Arm a timer when a navigation starts and clear it
// once the new page loads; if it ever elapses, fall back to a hard navigation
// to the target URL so the user is never stuck.
let navWatchdog = 0;
let navTarget = '';
document.addEventListener('astro:before-preparation', (e: Event) => {
  navTarget = ((e as unknown as { to?: URL }).to)?.href ?? '';
  clearTimeout(navWatchdog);
  if (!navTarget) return;
  navWatchdog = window.setTimeout(() => {
    if (navTarget) window.location.assign(navTarget);
  }, 3000);
});
const clearNavWatchdog = () => { clearTimeout(navWatchdog); navWatchdog = 0; navTarget = ''; };
document.addEventListener('astro:page-load', clearNavWatchdog);
document.addEventListener('astro:after-swap', () => { clearTimeout(navWatchdog); });

if (document.readyState !== 'loading') {
  safeInit();
} else {
  document.addEventListener('DOMContentLoaded', safeInit, { once: true });
}
