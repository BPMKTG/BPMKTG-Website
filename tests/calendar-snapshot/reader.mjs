// What the calendar drew, as data. Shared by the baseline run and the
// post-extraction run so both read with exactly the same eyes.
export const READ = () => {
  const root = document.querySelector('[data-view="calendar"]');
  if (!root) return null;
  const txt = (n) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const cls = (n) => (n.getAttribute('class') ?? '').split(/\s+/).filter(Boolean).sort().join(' ');
  const one = (s) => root.querySelector(s);
  const all = (s) => [...root.querySelectorAll(s)];

  return {
    monthLabel: txt(one('.pt-month-label')),
    nav: all('.pt-navgroup button').map((b) => b.getAttribute('aria-label')),
    views: all('.pt-seg button').map((b) => `${txt(b)}:${b.getAttribute('aria-pressed')}`),
    quick: all('.pt-quick-tab').map((b) => `${txt(b)}:${b.getAttribute('aria-pressed')}`),
    layers: all('.pt-layer').map((b) => `${txt(b)}:${b.getAttribute('aria-pressed')}`),
    bucketSummary: txt(one('.pt-multi-sum')),
    bucketOpts: all('.pt-multi-opt').map((l) => `${cls(l)}|${txt(l)}|${l.querySelector('input')?.checked}`),
    selects: all('select.pt-select').map((s) => ({
      label: s.getAttribute('aria-label'),
      value: s.value,
      options: [...s.options].map((o) => `${o.value}=${txt(o)}`),
    })),
    trayBtn: (() => {
      const b = all('.pt-calrow .pt-btn').pop();
      return b ? `${txt(b)}:${b.getAttribute('aria-pressed')}` : null;
    })(),
    filterChip: txt(one('.pt-filter-chip')),
    // The month and week grids are the same cell class, so one reader
    // covers both. Empty out-of-month cells are dropped: they are
    // geometry, and keeping them makes the diff unreadable.
    cells: all('.pt-cal-cell').map((c) => ({
      date: txt(c.querySelector('.pt-cal-date')),
      cls: cls(c),
      chips: [...c.querySelectorAll('.pt-chip')].map((ch) => ({
        cls: cls(ch), text: txt(ch), title: ch.title,
        draggable: ch.dataset.drag === '1', locked: ch.classList.contains('pt-chip-locked'),
      })),
      dots: [...c.querySelectorAll('.pt-dot')].map((d) => cls(d)),
      more: txt(c.querySelector('.pt-chip-more')),
    })).filter((c) => c.chips.length || c.dots.length || c.more
      || /today|selected/.test(c.cls)),
    dow: all('.pt-cal-dow div').map((d) => txt(d)),
    agenda: all('.pt-agenda-day').map((g) => ({
      head: txt(g.querySelector('.pt-agenda-date')),
      headCls: cls(g.querySelector('.pt-agenda-date') ?? g),
      rows: [...g.querySelectorAll('li')].map((li) => `${cls(li)}|${txt(li)}`),
    })),
    tray: one('.pt-tray') ? {
      head: txt(one('.pt-tray-head')),
      cards: all('.pt-traycard').map((c) => ({
        cls: cls(c), text: txt(c), draggable: c.dataset.drag === '1', title: c.title,
      })),
      groups: all('.pt-tray h4, .pt-tray .pt-tray-group').map((g) => txt(g)),
    } : null,
    dayCard: (() => {
      const cards = all('.pt-card');
      const last = cards[cards.length - 1];
      return last && !last.closest('.pt-tray') ? txt(last).slice(0, 400) : null;
    })(),
    empty: txt(one('.pt-empty')) || null,
    counts: {
      chips: all('.pt-chip').length,
      cells: all('.pt-cal-cell').length,
      more: all('.pt-chip-more').length,
      tray: all('.pt-traycard').length,
      agendaRows: all('.pt-agenda-day li').length,
    },
  };
};

/** The drawer, which lives outside the calendar view. */
export const READ_DRAWER = () => {
  const d = document.querySelector('[data-drawer]');
  if (!d) return null;
  const txt = (n) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return {
    open: !d.hasAttribute('hidden'),
    title: txt(d.querySelector('[data-drawer-title]')),
    body: txt(d.querySelector('[data-drawer-body]')).slice(0, 800),
    foot: txt(d.querySelector('[data-drawer-foot]')).slice(0, 300),
    footHidden: d.querySelector('[data-drawer-foot]')?.hasAttribute('hidden') ?? null,
  };
};

/** The "+N more" popover. */
export const READ_POPOVER = () => {
  const p = document.querySelector('.pt-popover');
  if (!p) return null;
  const txt = (n) => (n?.textContent ?? '').replace(/\s+/g, ' ').trim();
  return { text: txt(p).slice(0, 500), rows: [...p.querySelectorAll('button, li')].map((b) => txt(b)) };
};
