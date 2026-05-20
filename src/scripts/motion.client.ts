// Master motion script — loaded once from Layout.astro.
// Hooks: [data-reveal], [data-counter], [data-typewriter], [data-glitch], [data-tilt],
//        [data-roadmap-line], plus hero particles + custom cursor + CTA particles.
// All effects are IntersectionObserver-gated so nothing runs off-screen.
// Re-initializes on `astro:page-load` for view-transition navigation.

const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = () => window.matchMedia('(pointer: fine)').matches;

// ─────────────────────────────────────────────────────────────
// 1. Reveal-on-scroll (single shared observer)
// ─────────────────────────────────────────────────────────────
function initReveal() {
  const els = document.querySelectorAll<HTMLElement>('[data-reveal]');
  if (!els.length) return;
  if (reduce()) {
    els.forEach(el => el.classList.add('is-in'));
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
  els.forEach(el => io.observe(el));
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

function formatCounterValue(v: number, decimals: number, prefix: string, suffix: string) {
  if (decimals > 0) return prefix + v.toFixed(decimals) + suffix;
  return prefix + Math.round(v).toLocaleString('en-US') + suffix;
}

function animateCounter(el: HTMLElement) {
  const target = el.dataset.counter;
  if (!target) return;
  const parsed = parseCounter(target);
  if (!parsed) return;
  const decimals = (target.split('.')[1] || '').replace(/[^\d]/g, '').length;
  const dur = 1600;
  const t0 = performance.now();

  const frame = (now: number) => {
    const t = Math.min(1, (now - t0) / dur);
    const eased = 1 - Math.pow(1 - t, 3);
    const v = parsed.value * eased;
    el.textContent = formatCounterValue(v, decimals, parsed.prefix, parsed.suffix);
    if (t < 1) requestAnimationFrame(frame);
    else {
      el.textContent = target;
      const wrap = el.closest('.stat, .price');
      if (wrap) wrap.classList.add('is-counted');
    }
  };
  requestAnimationFrame(frame);
}

function initCounters() {
  const els = document.querySelectorAll<HTMLElement>('[data-counter]');
  if (!els.length) return;
  // Seed each element with a "0"-state matching its format
  els.forEach(el => {
    const target = el.dataset.counter!;
    const p = parseCounter(target);
    if (!p) { el.textContent = target; return; }
    const decimals = (target.split('.')[1] || '').replace(/[^\d]/g, '').length;
    el.textContent = formatCounterValue(0, decimals, p.prefix, p.suffix);
  });
  if (reduce()) {
    els.forEach(el => { el.textContent = el.dataset.counter!; el.closest('.stat')?.classList.add('is-counted'); });
    return;
  }
  const io = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        animateCounter(entry.target as HTMLElement);
        io.unobserve(entry.target);
      }
    }
  }, { threshold: 0.5 });
  els.forEach(el => io.observe(el));
}

// ─────────────────────────────────────────────────────────────
// 3. Typewriter
// ─────────────────────────────────────────────────────────────
function initTypewriter() {
  document.querySelectorAll<HTMLElement>('[data-typewriter]').forEach(el => {
    const text = el.dataset.typewriterText ?? el.textContent ?? '';
    el.dataset.typewriterText = text;
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
              window.setTimeout(tick, delay);
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
  });
}

// ─────────────────────────────────────────────────────────────
// 4. Glitch effect — fires once shortly after element comes into view
// ─────────────────────────────────────────────────────────────
function initGlitch() {
  if (reduce()) return;
  document.querySelectorAll<HTMLElement>('[data-glitch]').forEach(el => {
    if (!el.hasAttribute('data-text')) el.setAttribute('data-text', el.textContent || '');
    const io = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          window.setTimeout(() => {
            el.classList.add('is-glitching');
            window.setTimeout(() => el.classList.remove('is-glitching'), 700);
          }, 220);
          window.setTimeout(() => {
            el.classList.add('is-glitching');
            window.setTimeout(() => el.classList.remove('is-glitching'), 700);
          }, 1450);
          io.unobserve(entry.target);
        }
      }
    }, { threshold: 0.4 });
    io.observe(el);
  });
}

// ─────────────────────────────────────────────────────────────
// 5. Custom cursor (desktop, fine pointer, no reduced-motion)
// ─────────────────────────────────────────────────────────────
function initCursor() {
  if (!finePointer() || reduce()) return;
  if (document.querySelector('.bp-cursor')) return;

  const cursor = document.createElement('div');
  cursor.className = 'bp-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  document.body.appendChild(cursor);

  let tx = -100, ty = -100, x = -100, y = -100;
  const onMove = (e: PointerEvent) => { tx = e.clientX; ty = e.clientY; };
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerdown', () => cursor.classList.add('is-click'));
  document.addEventListener('pointerup',   () => cursor.classList.remove('is-click'));

  const tick = () => {
    x += (tx - x) * 0.28;
    y += (ty - y) * 0.28;
    cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  document.addEventListener('pointerover', (e) => {
    const t = e.target as HTMLElement;
    if (!t) return;
    const hot = t.closest?.('a, button, [role="button"], [data-lightbox-open], [data-meter], input, textarea, select, label');
    cursor.classList.toggle('is-hover', !!hot);
  });
}

// ─────────────────────────────────────────────────────────────
// 6. Hero particle system — canvas, throttled to viewport visibility
// ─────────────────────────────────────────────────────────────
function initHeroParticles() {
  if (reduce()) return;
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!hero) return;
  if (hero.querySelector('.hero-particles')) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'hero-particles';
  canvas.setAttribute('aria-hidden', 'true');
  hero.insertBefore(canvas, hero.firstChild);

  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;

  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  let w = 0, h = 0;

  const resize = () => {
    const rect = hero.getBoundingClientRect();
    w = rect.width; h = rect.height;
    canvas.width  = Math.floor(w * dpr);
    canvas.height = Math.floor(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };
  resize();
  window.addEventListener('resize', resize, { passive: true });

  const COUNT = window.innerWidth < 700 ? 24 : 48;
  type P = { x: number; y: number; vx: number; vy: number; r: number; a: number };
  const ps: P[] = Array.from({ length: COUNT }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: (Math.random() - 0.5) * 0.16,
    vy: (Math.random() - 0.5) * 0.16,
    r: Math.random() * 1.6 + 0.45,
    a: Math.random() * 0.4 + 0.18,
  }));

  let mx = -9999, my = -9999;
  hero.addEventListener('pointermove', (e) => {
    const rect = hero.getBoundingClientRect();
    mx = (e as PointerEvent).clientX - rect.left;
    my = (e as PointerEvent).clientY - rect.top;
  });
  hero.addEventListener('pointerleave', () => { mx = my = -9999; });

  let raf = 0, running = false;
  const draw = () => {
    ctx.clearRect(0, 0, w, h);

    // Connections first (lines)
    for (let i = 0; i < ps.length; i++) {
      for (let j = i + 1; j < ps.length; j++) {
        const a = ps[i], b = ps[j];
        const dx = a.x - b.x, dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 110 * 110) {
          const alpha = (1 - Math.sqrt(d2) / 110) * 0.18;
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
      if (dist < 110 && dist > 0.01) {
        const f = (110 - dist) / 110 * 0.06;
        p.vx += (dx / dist) * f;
        p.vy += (dy / dist) * f;
      }
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.985;
      p.vy *= 0.985;
      // Gentle drift to keep movement alive
      p.vx += (Math.random() - 0.5) * 0.005;
      p.vy += (Math.random() - 0.5) * 0.005;
      // Wrap
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

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; cancelAnimationFrame(raf); }
    else if (io) { /* observer will re-trigger when scrolled */ }
  });
}

// ─────────────────────────────────────────────────────────────
// 7. 3D tilt on hover
// ─────────────────────────────────────────────────────────────
function initTilt() {
  if (reduce() || !finePointer()) return;
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach(el => {
    const wrap = el.querySelector<HTMLElement>('.img-wrap');
    if (!wrap) return;

    let trx = 0, try_ = 0, rx = 0, ry = 0, raf = 0, running = false;
    const max = 8;

    const tick = () => {
      rx += (trx - rx) * 0.18;
      ry += (try_ - ry) * 0.18;
      wrap.style.setProperty('--tilt-rx', `${rx}deg`);
      wrap.style.setProperty('--tilt-ry', `${ry}deg`);
      if (running) raf = requestAnimationFrame(tick);
    };

    el.addEventListener('pointerenter', () => { if (!running) { running = true; raf = requestAnimationFrame(tick); } });
    el.addEventListener('pointermove', (e) => {
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const px = (cx / rect.width) * 2 - 1;
      const py = (cy / rect.height) * 2 - 1;
      trx = -py * max;
      try_ = px * max;
      wrap.style.setProperty('--mx', `${(cx / rect.width) * 100}%`);
      wrap.style.setProperty('--my', `${(cy / rect.height) * 100}%`);
    });
    el.addEventListener('pointerleave', () => {
      trx = 0; try_ = 0;
      window.setTimeout(() => { running = false; cancelAnimationFrame(raf); }, 450);
    });
  });
}

// ─────────────────────────────────────────────────────────────
// 8. Roadmap connecting line + steps reveal
// ─────────────────────────────────────────────────────────────
function initRoadmapLine() {
  const line = document.querySelector<HTMLElement>('.roadmap-line');
  if (!line) return;
  if (reduce()) { line.classList.add('is-in'); return; }
  const io = new IntersectionObserver(entries => {
    if (entries[0].isIntersecting) { line.classList.add('is-in'); io.unobserve(line); }
  }, { threshold: 0.2 });
  io.observe(line);
}

// ─────────────────────────────────────────────────────────────
// 9. CTA floating particles (DOM-based, very cheap)
// ─────────────────────────────────────────────────────────────
function initCtaParticles() {
  if (reduce()) return;
  const host = document.querySelector<HTMLElement>('.cta-particles');
  if (!host || host.children.length) return;
  const COUNT = 18;
  for (let i = 0; i < COUNT; i++) {
    const s = document.createElement('span');
    s.style.setProperty('--x', `${Math.random() * 100}%`);
    s.style.setProperty('--dur', `${10 + Math.random() * 10}s`);
    s.style.setProperty('--delay', `${-Math.random() * 12}s`);
    s.style.setProperty('--drift', `${(Math.random() - 0.5) * 80}px`);
    s.style.transform = `scale(${0.7 + Math.random() * 1.2})`;
    host.appendChild(s);
  }
}

// ─────────────────────────────────────────────────────────────
// 10. Lightbox arrow-key navigation (page-specific but cheap to globalize)
// ─────────────────────────────────────────────────────────────
function initLightboxArrows() {
  const dialog = document.querySelector<HTMLDialogElement>('[data-lightbox]');
  if (!dialog) return;
  const img = dialog.querySelector<HTMLImageElement>('[data-lightbox-img]');
  const cap = dialog.querySelector<HTMLElement>('[data-lightbox-caption]');
  if (!img || !cap) return;
  const openers = Array.from(document.querySelectorAll<HTMLElement>('[data-lightbox-open]'));

  let idx = -1;
  // Track which opener was used so we can navigate
  openers.forEach((btn, i) => btn.addEventListener('click', () => { idx = i; }));

  const navigate = (delta: number) => {
    if (!openers.length) return;
    idx = (idx + delta + openers.length) % openers.length;
    const btn = openers[idx];
    const full = btn.dataset.full || '';
    const caption = btn.dataset.caption || '';
    img.src = full; img.alt = caption; cap.textContent = caption;
  };

  document.addEventListener('keydown', (e) => {
    if (!dialog.open) return;
    if (e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
  });
}

// ─────────────────────────────────────────────────────────────
// 11. Background parallax for full-bleed photo sections
//     Cheap pattern: one rAF-throttled scroll listener, sets --parallax-y
//     on every [data-parallax-bg] element that's near the viewport.
// ─────────────────────────────────────────────────────────────
function initBgParallax() {
  if (reduce()) return;
  const els = Array.from(document.querySelectorAll<HTMLElement>('[data-parallax-bg]'));
  if (!els.length) return;

  // Cache section references
  const items = els.map(el => ({ el, section: (el.closest('section') ?? el.parentElement) as HTMLElement }));

  let ticking = false;
  const update = () => {
    ticking = false;
    const vh = window.innerHeight;
    for (const { el, section } of items) {
      if (!section) continue;
      const rect = section.getBoundingClientRect();
      // Skip elements far outside viewport — cheap perf win
      if (rect.bottom < -300 || rect.top > vh + 300) continue;
      const progress = (vh / 2 - (rect.top + rect.height / 2)) / (vh / 2 + rect.height / 2);
      const clamped = Math.max(-1, Math.min(1, progress));
      const shift = clamped * 70;
      el.style.setProperty('--parallax-y', `${shift}px`);
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
  initHeroParticles();
  initTilt();
  initRoadmapLine();
  initBgParallax();
  initCtaParticles();
  initLightboxArrows();
}

document.addEventListener('astro:page-load', init);
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}
