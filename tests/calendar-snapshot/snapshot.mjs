// A behavioural snapshot of the client portal's calendar.
//
// This exists to make a change to the calendar safe. It drives the
// REAL built portal (dist/, so build first) through a matrix of views,
// layers and filters and writes down what it drew. Diff that against
// baseline.json: anything that moved is a regression unless it is the
// thing you meant to change, and anything that did not is proof the
// rest held still.
//
// Run it through run.mjs (npm run test:calendar), or by hand:
//
//   node snapshot.mjs out.json
//   node diff.mjs baseline.json out.json
//
// Nothing here reaches Notion or needs a login: the page's data is the
// fixture, and every write is answered by a stub below.
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { READ, READ_DRAWER, READ_POPOVER } from './reader.mjs';
import { PAYLOAD, TODAY } from './fixture.mjs';

const OUTFILE = process.argv[2];
if (!OUTFILE) { console.error('usage: node snapshot.mjs <out.json>'); process.exit(1); }

const ROOT = fileURLToPath(new URL('../../dist', import.meta.url));
if (!existsSync(join(ROOT, 'portal', 'index.html'))) {
  console.error('No built portal in dist/. Run `npm run build` first.');
  process.exit(1);
}
const T = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.woff2': 'font/woff2',
};

const srv = createServer(async (req, res) => {
  let p = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname))
    .replace(/^(\.\.[/\\])+/, '');
  if (/^\/portal\/[^/]+\/?$/.test(p)) p = '/portal/index.html';
  if (p.endsWith('/')) p += 'index.html';
  try {
    const b = await readFile(join(ROOT, p));
    res.writeHead(200, { 'Content-Type': T[extname(p)] ?? 'application/octet-stream' });
    res.end(b);
  } catch { res.writeHead(404).end('no'); }
});
// Any free port: nothing the snapshot records has the address in it.
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const ORIGIN = `http://127.0.0.1:${srv.address().port}`;

/* ── the walk ────────────────────────────────────────────────── */

const out = {};

for (const [engine, ename] of [[chromium, 'chromium'], [webkit, 'webkit']]) {
  const browser = await engine.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await ctx.newPage();

  await page.route('**/portal/sean-comma/data', (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD),
  }));
  // Nothing in a snapshot run reaches Notion. Every write is answered
  // in the shape the real endpoint answers in, because the page checks
  // it: a step wants its date echoed, a card wants the whole row back.
  // A lazier stub makes every drag roll back, and then the snapshot
  // records the failure path and calls it the baseline.
  const writes = [];
  const json = (r, body) => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(body),
  });
  // The real endpoint echoes the saved row, both fields, whichever one
  // was sent; the page checks what came back. A stub that only echoes
  // the date makes a tick look like a failed save.
  await page.route('**/portal/*/step/*', (r) => {
    const req = r.request();
    const path = new URL(req.url()).pathname;
    writes.push(`${req.method()} ${path}`);
    const sent = JSON.parse(req.postData() || '{}');
    const id = path.split('/').pop();
    const row = PAYLOAD.calendar.find((i) => i.id === id) ?? {};
    return json(r, {
      ok: true, id, changed: true,
      status: sent.status ?? row.status ?? null,
      date: sent.date ?? row.date ?? null,
    });
  });
  await page.route('**/portal/*/content/*', (r) => {
    const req = r.request();
    writes.push(`${req.method()} ${new URL(req.url()).pathname}`);
    const id = new URL(req.url()).pathname.split('/').pop();
    const sent = JSON.parse(req.postData() || '{}');
    const row = PAYLOAD.content.find((c) => c.id === id) ?? { id };
    return json(r, { ok: true, changed: true, item: { ...row, ...sent } });
  });
  // A moment move is two calls to the same route: a preview, which is
  // a read, and then the move itself. They are answered apart, or the
  // confirm dialog never gets a cascade to describe and the snapshot
  // records an error message as the baseline.
  await page.route('**/portal/*/moment/*/move', (r) => {
    const req = r.request();
    const sent = JSON.parse(req.postData() || '{}');
    const path = new URL(req.url()).pathname;
    if (sent.preview) return json(r, { ok: true, moves: 4, frozen: 2, days: sent.days });
    writes.push(`${req.method()} ${path} ${JSON.stringify(sent)}`);
    if (sent.undo) return json(r, { ok: true, undone: true, moved: 4 });
    return json(r, {
      ok: true, moved: 4, failed: 0, frozen: 2, days: sent.days,
      title: 'The Echo', date: sent.date ?? null, undo: 'tok-undo-1',
    });
  });
  await page.route('**/portal/*/admin/**', (r) => {
    writes.push(`${r.request().method()} ${new URL(r.request().url()).pathname}`);
    return json(r, { ok: true });
  });

  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));

  await page.clock.setFixedTime(new Date(`${TODAY}T15:00:00Z`));

  const snap = {};
  const visit = async (name, fn) => {
    if (fn) await fn();
    await page.waitForTimeout(140);
    snap[name] = await page.evaluate(READ);
  };

  // A boot is a REAL document load with empty storage. The query
  // counter is what makes it one: a goto that changes only the hash is
  // a same-document navigation, so the app's JS never re-runs and the
  // cleared prefs are not the ones in force. That cost an hour once.
  let bootN = 0;
  const open = async (hash = '#/calendar') => {
    await page.goto(`${ORIGIN}/portal/sean-comma?b=${++bootN}${hash}`,
      { waitUntil: 'networkidle' });
    await page.waitForSelector('[data-view="calendar"] .pt-toolbar', { timeout: 15000 });
  };
  // Storage is emptied on the page that is already up, then a fresh
  // document is loaded, so the load that matters reads nothing.
  const boot = async () => {
    try { await page.evaluate(() => { try { localStorage.clear(); } catch {} }); } catch {}
    await open();
  };

  // The calendar drags on pointer events, not the HTML5 drag API, so a
  // drag is a real press-move-release. dragTo() reaches for native DnD
  // and would move nothing. The first move has to clear DRAG_START_PX
  // before the ghost exists, which is why there are several.
  const drag = async (src, dst) => {
    const a = await src.boundingBox();
    const b = await dst.boundingBox();
    if (!a || !b) throw new Error('drag: nothing to grab or nowhere to put it');
    const from = [a.x + a.width / 2, a.y + Math.min(8, a.height / 2)];
    const to = [b.x + b.width / 2, b.y + b.height / 2];
    await page.mouse.move(from[0], from[1]);
    await page.mouse.down();
    await page.mouse.move(from[0] + 8, from[1] + 8);
    await page.mouse.move((from[0] + to[0]) / 2, (from[1] + to[1]) / 2, { steps: 6 });
    await page.mouse.move(to[0], to[1], { steps: 6 });
    await page.waitForTimeout(60);
    await page.mouse.up();
  };

  const nav = (i) => page.locator('.pt-navgroup button').nth(i).click();
  const toast = () => page.evaluate(() => {
    const t = document.querySelector('[data-toast]');
    return t ? `${t.className}|${(t.textContent ?? '').replace(/\s+/g, ' ').trim()}` : null;
  });
  const view = (t) => page.locator('.pt-seg button', { hasText: t }).click();

  console.log(`\n== ${ename} ==`);
  await boot();
  await visit('month.default');
  await visit('month.next', () => nav(1));
  await visit('month.prev2', async () => { await nav(0); await nav(0); });
  await visit('month.today', () => page.locator('.pt-toolbar .pt-btn', { hasText: 'Today' }).click());
  await visit('view.week', () => view('Week'));
  await visit('view.week.next', () => nav(1));
  await visit('view.agenda', () => view('Agenda'));
  await visit('view.month', () => view('Month'));

  for (const q of ['Content only', 'My week', 'Campaigns', 'Everything']) {
    await visit(`quick.${q}`, () => page.locator('.pt-quick-tab', { hasText: q }).click());
  }
  await visit('quick.back.month', () => view('Month'));

  for (const l of ['Blueprint posts', 'You post', 'On the plan', 'Film days', 'Your to-dos', 'Blueprint\u2019s work']) {
    await visit(`layer.off.${l}`, () => page.locator('.pt-layer', { hasText: l }).first().click());
  }
  // Named for what it is, so it has to actually be it: every chip on
  // the bar, whatever the list grows to, not a count written down
  // once. An "allOff" state that quietly left one on reported an
  // empty calendar as full for a whole release.
  await visit('layer.allOff', async () => {
    await page.locator('.pt-layer', { hasText: 'Shows & releases' }).first().click();
    const left = await page.locator('.pt-layer.pt-layer-on').count();
    if (left) throw new Error(`layer.allOff left ${left} layer(s) on`);
  });

  await boot();
  await visit('bucket.story', async () => {
    await page.locator('.pt-multi-sum').click();
    await page.locator('.pt-multi-opt', { hasText: 'Story' }).locator('input').check();
  });
  await visit('bucket.clear', () =>
    page.locator('.pt-multi-clear', { hasText: 'Clear' }).click());

  await visit('phase.posted', () =>
    page.locator('select[aria-label="Filter by status"]').selectOption('posted'));
  await visit('phase.progress', () =>
    page.locator('select[aria-label="Filter by status"]').selectOption('progress'));
  await visit('phase.any', () =>
    page.locator('select[aria-label="Filter by status"]').selectOption(''));
  await visit('campaign.show', () =>
    page.locator('select[aria-label="Filter by campaign"]').selectOption('m-show'));
  await visit('campaign.clear', () =>
    page.locator('.pt-filter-chip button').click());

  await visit('tray.off', () => page.locator('.pt-calrow .pt-btn').last().click());
  await visit('tray.on', () => page.locator('.pt-calrow .pt-btn').last().click());
  await visit('tray.search', () =>
    page.locator('.pt-tray-search').fill('merch'));
  await visit('tray.search.clear', () => page.locator('.pt-tray-search').fill(''));

  // What survives a reload, and that it is reapplied.
  snap['prefs.stored'] = await page.evaluate(() => {
    try { return localStorage.getItem('bp.portal.cal.v1'); } catch { return null; }
  });
  await page.locator('.pt-seg button', { hasText: 'Agenda' }).click();
  await page.waitForTimeout(120);
  await open();                      // same storage, new document
  await visit('prefs.restored');

  // The "+N more" popover, then a chip's drawer.
  await boot();
  await page.locator('.pt-chip-more').first().click();
  await page.waitForTimeout(160);
  snap['popover'] = await page.evaluate(READ_POPOVER);
  await page.keyboard.press('Escape');

  for (const [name, sel] of [
    ['drawer.show', '.pt-chip-moment-row, .pt-chip:has(.pt-chip-title:text-is("The Echo"))'],
    ['drawer.post', '.pt-chip:has-text("Studio teaser")'],
    ['drawer.step', '.pt-chip:has-text("Grant Meta access")'],
  ]) {
    await page.locator(sel).first().click();
    await page.waitForTimeout(220);
    snap[name] = await page.evaluate(READ_DRAWER);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(140);
  }
  snap['drawer.closed'] = await page.evaluate(READ_DRAWER);

  // Dragging. The write is intercepted, so the recorded request IS
  // the contract the HQ version has to keep.
  await boot();
  const today = () => page.locator('.pt-cal-cell-today');
  const tray = (t) => page.locator('.pt-traycard', { hasText: t });

  writes.length = 0;
  await drag(tray('Hook idea'), today());
  await page.waitForTimeout(350);
  snap['drag.card'] = {
    writes: [...writes], toast: await toast(), after: await page.evaluate(READ),
  };

  // One of ours. The tray marks it locked, and a drag must not write.
  writes.length = 0;
  await boot();
  snap['drag.card.locked.before'] = {
    cls: await tray('Fan question').getAttribute('class'),
    draggable: await tray('Fan question').getAttribute('data-drag'),
    title: await tray('Fan question').getAttribute('title'),
  };
  await drag(tray('Fan question'), today());
  await page.waitForTimeout(300);
  snap['drag.card.locked'] = { writes: [...writes], toast: await toast() };

  // A chip is made of buttons, and the drag arms on a press anywhere
  // on it. Pointer capture is taken only once a drag goes live, or
  // this tick would be swallowed.
  writes.length = 0;
  await boot();
  await page.locator('.pt-chip:has-text("Grant Meta access") .pt-check').first().click();
  await page.waitForTimeout(350);
  snap['tick.chip'] = {
    writes: [...writes], toast: await toast(),
    on: await page.locator('.pt-chip:has-text("Grant Meta access") .pt-check')
      .first().getAttribute('aria-checked'),
  };

  writes.length = 0;
  await boot();
  await drag(page.locator('.pt-chip', { hasText: 'Grant Meta access' }), today());
  await page.waitForTimeout(350);
  snap['drag.step'] = { writes: [...writes], toast: await toast() };

  // A step of ours. The chip says why before anyone tries.
  writes.length = 0;
  await boot();
  const ours = page.locator('.pt-chip', { hasText: 'Cut the announce reel' });
  snap['drag.step.locked.before'] = {
    cls: await ours.getAttribute('class'),
    draggable: await ours.getAttribute('data-drag'),
    title: await ours.getAttribute('title'),
  };
  await drag(ours, today());
  await page.waitForTimeout(300);
  snap['drag.step.locked'] = { writes: [...writes], toast: await toast() };

  // A moment drags its whole campaign, so it asks first.
  writes.length = 0;
  await boot();
  await drag(page.locator('.pt-chip:has(.pt-chip-title:text-is("The Echo"))').first(), page.locator('.pt-cal-cell').nth(20));
  await page.waitForTimeout(400);
  snap['drag.moment.asks'] = {
    writes: [...writes],
    dialog: await page.evaluate(() => {
      const d = document.querySelector('.pt-sheet, [data-sheet], dialog[open], .pt-confirm');
      return d ? (d.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 600) : null;
    }),
  };
  await page.locator('button', { hasText: 'Leave it' }).first().click();
  await page.waitForTimeout(250);
  snap['drag.moment.cancelled'] = { writes: [...writes], after: await page.evaluate(READ) };

  writes.length = 0;
  await boot();
  await drag(page.locator('.pt-chip:has(.pt-chip-title:text-is("The Echo"))').first(), page.locator('.pt-cal-cell').nth(20));
  await page.waitForTimeout(400);
  await page.locator('button', { hasText: 'Move it' }).first().click();
  await page.waitForTimeout(500);
  snap['drag.moment.confirmed'] = { writes: [...writes], toast: await toast() };

  /* The same calendar seen by one of us. Blueprint tasks belongs to
     HQ, so an admin standing in a client's portal must get exactly the
     client's four chips: this pass exists to hold that still. */
  await page.unroute('**/portal/sean-comma/data');
  await page.route('**/portal/sean-comma/data', (r) => r.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ...PAYLOAD, viewer: { role: 'admin' } }),
  }));
  await boot();
  await visit('admin.default');
  await visit('admin.campaigns', () =>
    page.locator('.pt-quick-tab', { hasText: 'Campaigns' }).click());

  // A browser that remembers the chip from before must not resurrect it.
  await page.evaluate(() => {
    try {
      localStorage.setItem('bp.portal.cal.v1', JSON.stringify({
        layers: ['moments', 'posts', 'films', 'todos', 'blueprint'],
        view: 'month', tray: true,
      }));
    } catch {}
  });
  await open();
  await visit('admin.staleBlueprintPref');

  await page.unroute('**/portal/sean-comma/data');
  await page.route('**/portal/sean-comma/data', (r) => r.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(PAYLOAD),
  }));

  // Phone width: agenda leads, and the month grid opens a day.
  await page.setViewportSize({ width: 390, height: 844 });
  await boot();
  await visit('phone.default');
  await visit('phone.month', () => view('Month'));
  await visit('phone.week.blocked', () => page.locator('.pt-quick-tab', { hasText: 'My week' }).click());

  snap['_engine'] = { writes, errors };
  out[ename] = snap;
  console.log('  states   ', Object.keys(snap).length - 1);
  console.log('  writes   ', writes.length ? writes : '(none)');
  console.log('  errors   ', errors.length ? errors : '(none)');
  await browser.close();
}

await writeFile(OUTFILE, JSON.stringify(out, null, 1));
console.log('\nwrote', OUTFILE);
srv.close();
