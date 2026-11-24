/* ─────────────────────────────────────────────────
   The Content Vault, on a page.

   One module, drawn in two places: a client's portal (their own
   Vault) and Blueprint HQ (any client's, and the list of all of
   them). It asks the same addresses in both. What comes back, and
   what a save is allowed to change, is decided by the sign-in on the
   server, so the controls drawn here for one of us are a convenience
   and never the permission.

   Every file of the client is on the page once it has loaded, so
   search and every filter answer as you type, with no request. The
   grid draws a screenful at a time as it is scrolled.

     the grid       thumbnails, from our own preview route
     saved views    Keepers, Unsorted, Never posted, Vertical video,
                    Hero shots, Unreleased IDs, By show, Finished
     by show        one section a show, each with its gaps strip
     a file         the web-sized picture, or a video's poster and
                    "Play preview"; always "Open original"
     select         many files at once: star, tag, and for us rate,
                    source, show and hold; "Use in a post"

   Nothing here is built with innerHTML: file names, tags, notes and
   folder names are typed by people.
   ───────────────────────────────────────────────── */

import { previewUrl, type ItemPreview } from '../data/preview';
import { driveFileLink } from '../data/slides';
import {
  MAX_EDIT_IDS, MAX_USE_IDS, NO_SHOW, ROOT_LABEL, VAULT_ORIENTATIONS, VAULT_RATINGS, VAULT_SOURCES, VAULT_TYPES,
  VAULT_VIEWS, cleanTag, durationLabel, isKeeper, matchesFilter, newFilesLabel, searchText, showGaps, sizeLabel,
  sortFiles, thumbUrl, useTitle, vaultDateLabel, viewById,
  type Playable, type ShowGaps, type VaultFile, type VaultFilter, type VaultSyncStatus, type VaultUse, type VaultView,
} from '../data/vault';
import { clear, el, icon } from './portal-dom';
import { showWhole } from './portal-picture';

/* ── asking the server ────────────────────────────────────────── */

interface Reply { status: number; json: any }

async function ask(url: string, body?: Record<string, unknown>): Promise<Reply> {
  try {
    const res = await fetch(url, body === undefined
      ? { credentials: 'same-origin' }
      : { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json().catch(() => null);
    return { status: res.status, json };
  } catch {
    return { status: 0, json: null };
  }
}

/* ── small things ─────────────────────────────────────────────── */

type Toast = (text: string, bad?: boolean) => void;

function ago(at: number | null | undefined, now = Date.now()): string {
  if (!at) return 'never';
  const m = Math.round((now - at) / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 36) return `${h} ${h === 1 ? 'hour' : 'hours'} ago`;
  const d = Math.round(h / 24);
  return `${d} days ago`;
}

const plural = (n: number, one: string, many = `${one}s`): string => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

function button(cls: string, text: string, onClick: () => void): HTMLButtonElement {
  const b = el('button', cls, text);
  b.type = 'button';
  b.addEventListener('click', onClick);
  return b;
}

function option(value: string, label: string, selected = false): HTMLOptionElement {
  const o = el('option', undefined, label);
  o.value = value;
  o.selected = selected;
  return o;
}

/* ── sheets: one short question at a time ─────────────────────── */

interface Sheet { body: HTMLElement; close: () => void }

function openSheet(title: string, wide = false): Sheet {
  const scrim = el('div', 'pt-scrim vt-scrim');
  const sheet = el('div', `pt-sheet vt-sheet${wide ? ' vt-sheet-wide' : ''}`);
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', title);
  const head = el('div', 'pt-sheet-head');
  const x = el('button', 'pt-announce-close');
  x.type = 'button';
  x.setAttribute('aria-label', 'Close');
  x.appendChild(icon('close'));
  head.append(el('h2', undefined, title), x);
  const body = el('div', 'pt-sheet-body');
  sheet.append(head, body);
  const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') { e.stopPropagation(); close(); } };
  function close(): void {
    document.removeEventListener('keydown', onKey, true);
    scrim.remove();
    sheet.remove();
  }
  x.addEventListener('click', close);
  scrim.addEventListener('click', close);
  document.addEventListener('keydown', onKey, true);
  document.body.append(scrim, sheet);
  requestAnimationFrame(() => { scrim.dataset.open = 'true'; sheet.dataset.open = 'true'; });
  return { body, close };
}

/* ── the Vault of one client ──────────────────────────────────── */

export interface VaultOptions {
  slug: string;
  toast: Toast;
  /** Drawn inside HQ: the heading names the client, and there is a
   *  way back to the list of all of them. */
  hq?: { name: string; back: () => void };
}

export interface VaultMount {
  /** What follows "vault/" in the address: "", or "show/<name>". */
  route(detail: string): void;
  destroy(): void;
}

interface Extra {
  kind: string; type: string; o: string; show: string; rating: string; source: string; tag: string;
  used: string; un: string; held: string;
}

const NO_EXTRA: Extra = { kind: '', type: '', o: '', show: '', rating: '', source: '', tag: '', used: '', un: '', held: '' };

/** How many cells are drawn at a time. */
const PAGE = 120;
/** How often a waiting viewer asks about a conversion, and how many
 *  times before it stops and says so. */
const ASK_EVERY_MS = 4000;
const ASK_TIMES = 120;

export function mountVault(root: HTMLElement, o: VaultOptions): VaultMount {
  const { slug, toast } = o;
  const base = `/portal/${encodeURIComponent(slug)}/vault`;
  let alive = true;
  let admin = false;
  let files: VaultFile[] = [];
  let byId = new Map<string, VaultFile>();
  let text = new Map<string, string>();
  let uses: VaultUse[] = [];
  let made: Array<{ file: string; postId: string; post: string }> = [];
  let announced: Record<string, number> = {};
  let sync: Partial<VaultSyncStatus> = {};
  let view: VaultView = VAULT_VIEWS[0];
  let extra: Extra = { ...NO_EXTRA };
  let query = '';
  let picking = false;
  let picked: string[] = [];
  let list: VaultFile[] = [];
  let drawn = 0;
  let lastTapped: string | null = null;
  let filtersOpen = false;
  let wantShow: string | null = null;
  let syncing = false;
  const cells = new Map<string, HTMLElement>();
  let watcher: IntersectionObserver | null = null;
  let closeViewer: (() => void) | null = null;

  clear(root);
  root.classList.add('vt');
  const head = el('div', 'vt-head');
  const notices = el('div', 'vt-notices');
  const views = el('div', 'pt-pillrow vt-views');
  views.setAttribute('role', 'tablist');
  const tools = el('div', 'vt-tools');
  const filters = el('div', 'vt-filters');
  const count = el('div', 'vt-count');
  const body = el('div', 'vt-body');
  const bar = el('div', 'vt-bar');
  bar.hidden = true;
  root.append(head, notices, views, tools, filters, count, body, bar);

  body.appendChild(emptyBox('photo', 'Loading the Vault', 'Reading every file.'));
  void load(true);

  function emptyBox(ic: string, title: string, line: string): HTMLElement {
    const e = el('div', 'pt-empty');
    const box = el('div', 'pt-empty-icon');
    box.appendChild(icon(ic));
    e.append(box, el('h3', undefined, title), el('p', undefined, line));
    return e;
  }

  /* ── loading ── */

  function take(next: VaultFile[]): void {
    files = next;
    byId = new Map(files.map((f) => [f.id, f]));
    text = new Map(files.map((f) => [f.id, searchText(f)]));
    picked = picked.filter((id) => byId.has(id));
  }

  async function load(first = false): Promise<void> {
    const got = await ask(`${base}/data`);
    if (!alive) return;
    if (got.status !== 200 || !got.json?.ok) {
      clear(body);
      for (const n of [head, notices, views, tools, filters, count]) clear(n);
      const why = got.json?.message
        ?? (got.status === 0 ? 'The Vault could not be reached. Check the connection and try again.' : 'The Vault is not available here yet.');
      body.appendChild(emptyBox('info', 'The Vault is not open', why));
      return;
    }
    admin = got.json.role === 'admin';
    uses = Array.isArray(got.json.uses) ? got.json.uses : [];
    made = Array.isArray(got.json.made) ? got.json.made : [];
    announced = got.json.announced && typeof got.json.announced === 'object' ? got.json.announced : {};
    sync = got.json.sync ?? {};
    take(Array.isArray(got.json.files) ? got.json.files : []);
    if (first && wantShow) { applyShow(wantShow); wantShow = null; }
    draw();
    // One of us opening a Vault that was left part way: carry it on.
    if (first && admin && !syncing && ((sync.thumbsLeft ?? 0) > 0 || sync.never) && !sync.running) void runSync(!sync.never);
  }

  /* ── what is being looked at ── */

  function filter(): VaultFilter {
    return {
      ...view.filter,
      q: query,
      ...(extra.kind ? { kind: extra.kind as VaultFilter['kind'] } : {}),
      ...(extra.type ? { type: extra.type as VaultFilter['type'] } : {}),
      ...(extra.o ? { o: extra.o as VaultFilter['o'] } : {}),
      ...(extra.show ? { show: extra.show } : {}),
      ...(extra.rating ? { rating: extra.rating as VaultFilter['rating'] } : {}),
      ...(extra.source ? { source: extra.source as VaultFilter['source'] } : {}),
      ...(extra.tag ? { tag: extra.tag } : {}),
      ...(extra.used ? { used: extra.used as VaultFilter['used'] } : {}),
      ...(extra.un ? { un: extra.un === 'yes' } : {}),
      ...(extra.held ? { held: extra.held === 'yes' } : {}),
    };
  }

  const extras = (): number => Object.values(extra).filter(Boolean).length;
  const countFor = (v: VaultView): number => files.reduce((n, f) => n + (matchesFilter(f, v.filter, text.get(f.id)) ? 1 : 0), 0);

  function applyShow(show: string): void {
    view = viewById('keepers');
    extra = { ...NO_EXTRA, show };
    query = '';
    filtersOpen = true;
  }

  /* ── drawing ── */

  function draw(): void {
    drawHead();
    drawNotices();
    drawViews();
    drawTools();
    drawFilters();
    drawBody();
    drawBar();
  }

  function drawHead(): void {
    clear(head);
    const title = el('div', 'vt-title');
    if (o.hq) {
      const back = button('vt-back', 'All clients', o.hq.back);
      back.prepend(icon('chev-left'));
      title.append(back, el('h1', undefined, `${o.hq.name}: Content Vault`));
    } else {
      title.appendChild(el('h1', undefined, 'Content Vault'));
    }
    const live = files.filter((f) => !f.missing).length;
    const line = el('p', 'vt-sub');
    const parts = [plural(live, 'file')];
    if (sync.okAt) parts.push(`synced ${ago(sync.okAt)}`);
    else if (admin) parts.push('not synced yet');
    line.textContent = parts.join(' · ');
    title.appendChild(line);
    head.appendChild(title);
    if (admin) {
      const b = button('pt-btn pt-btn-sm vt-sync', syncing ? 'Syncing…' : 'Sync now', () => { void runSync(false); });
      b.disabled = syncing;
      b.dataset.sync = '1';
      head.appendChild(b);
    }
  }

  function drawNotices(): void {
    clear(notices);
    if (!admin) return;
    if (syncing || sync.running) {
      notices.appendChild(el('p', 'vt-note vt-note-busy', progressLine()));
    } else if (sync.phase === 'failed' && sync.error) {
      notices.appendChild(el('p', 'vt-note vt-note-bad', `The last sync did not finish. ${sync.error}`));
    } else if ((sync.thumbsLeft ?? 0) > 0) {
      notices.appendChild(el('p', 'vt-note', `${plural(sync.thumbsLeft ?? 0, 'thumbnail')} still to make. They are made as the grid is scrolled, and by the next sync.`));
    }
    for (const s of sync.sources ?? []) {
      if (s.state === 'ok') continue;
      const p = el('div', 'vt-note vt-note-warn');
      const name = s.root === 'archive' ? (s.name ? `Archive folder "${s.name}"` : 'An Archive folder') : ROOT_LABEL[s.root];
      if (s.state === 'not_shared') {
        p.appendChild(el('strong', undefined, `${name}: Not shared with the Vault yet. `));
        p.appendChild(el('span', undefined, 'Share the folder as a Viewer with '));
        const code = el('code', 'vt-email', sync.email ?? 'the service account');
        p.appendChild(code);
        if (sync.email) {
          p.appendChild(button('pt-btn pt-btn-sm', 'Copy', () => {
            void navigator.clipboard?.writeText(sync.email ?? '').then(() => toast('Address copied'), () => toast('Could not copy. Select the address and copy it.', true));
          }));
        }
      } else if (s.state === 'not_found') {
        p.appendChild(el('span', undefined, `${name}: no folder with that name inside this client's Drive Folder.`));
      } else if (s.state === 'not_set') {
        p.appendChild(el('span', undefined, `${name}: this client has no Drive Folder on their Clients row.`));
      } else {
        p.appendChild(el('span', undefined, `${name}: Drive did not answer. The next sync tries again.`));
      }
      if (s.link) {
        const a = el('a', 'vt-note-link', 'Open folder');
        a.href = s.link;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        p.appendChild(a);
      }
      notices.appendChild(p);
    }
  }

  function progressLine(): string {
    const s = sync;
    if (s.phase === 'listing') return `Syncing: reading Drive… ${plural(s.listed ?? 0, 'file')} so far.`;
    if (s.phase === 'saving') return `Syncing: logging ${plural(s.listed ?? 0, 'file')}.`;
    if (s.phase === 'thumbnails') {
      const total = (s.thumbs ?? 0) + (s.thumbsLeft ?? 0);
      return `Syncing: thumbnails ${(s.thumbs ?? 0).toLocaleString('en-US')} of ${total.toLocaleString('en-US')}. The grid can be used meanwhile.`;
    }
    if (s.phase === 'usage') return 'Syncing: bringing the usage log up to date.';
    return 'Syncing…';
  }

  function drawViews(): void {
    clear(views);
    for (const v of VAULT_VIEWS) {
      if (v.ours && !admin) continue;
      const n = countFor(v);
      // The tray and the fix-list are only offered when there is
      // something in them, or when they are where you are.
      if ((v.id === 'unsorted' || v.id === 'needs-show' || v.id === 'ids') && !n && view.id !== v.id) continue;
      const b = el('button', `pt-pill${view.id === v.id ? ' pt-pill-on' : ''}`);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.setAttribute('aria-selected', String(view.id === v.id));
      b.dataset.view = v.id;
      b.append(el('span', undefined, v.label), el('span', 'pt-pill-n', n.toLocaleString('en-US')));
      b.addEventListener('click', () => {
        view = v;
        if (v.byShow || v.id === 'needs-show') extra = { ...NO_EXTRA };
        draw();
      });
      views.appendChild(b);
    }
  }

  function drawTools(): void {
    clear(tools);
    const search = el('input', 'pt-input vt-search');
    search.type = 'search';
    search.placeholder = 'Search names, shows, tags, notes';
    search.setAttribute('aria-label', 'Search the Vault');
    search.value = query;
    search.autocomplete = 'off';
    search.addEventListener('input', () => { query = search.value; drawBody(); });
    const n = extras();
    const f = button(`pt-btn pt-btn-sm${n ? ' pt-btn-on' : ''}`, n ? `Filters (${n})` : 'Filters', () => { filtersOpen = !filtersOpen; drawFilters(); });
    f.dataset.filters = '1';
    const pick = button(`pt-btn pt-btn-sm${picking ? ' pt-btn-on' : ''}`, picking ? 'Done' : 'Select', () => {
      picking = !picking;
      if (!picking) picked = [];
      root.classList.toggle('vt-picking', picking);
      drawTools();
      refreshPicks();
      drawBar();
    });
    pick.dataset.select = '1';
    tools.append(search, f, pick);
  }

  function drawFilters(): void {
    clear(filters);
    filters.hidden = !filtersOpen;
    if (!filtersOpen) return;
    const shows = [...new Set(files.filter((f) => !f.missing && f.show).map((f) => f.show as string))].sort((a, b) => a.localeCompare(b));
    const tags = [...new Map(files.flatMap((f) => f.tags).map((t) => [t.toLowerCase(), t])).values()].sort((a, b) => a.localeCompare(b));
    const add = (key: keyof Extra, label: string, options: Array<[string, string]>): void => {
      const s = el('select', 'pt-select vt-filter');
      s.setAttribute('aria-label', label);
      s.appendChild(option('', label, !extra[key]));
      for (const [value, text] of options) s.appendChild(option(value, text, extra[key] === value));
      if (extra[key]) s.classList.add('vt-filter-on');
      s.addEventListener('change', () => { extra = { ...extra, [key]: s.value }; drawTools(); drawFilters(); drawBody(); });
      filters.appendChild(s);
    };
    add('kind', 'Kind', [['Raw', 'Raw'], ['Finished', 'Finished']]);
    add('type', 'Type', VAULT_TYPES.map((t) => [t, t]));
    add('o', 'Orientation', VAULT_ORIENTATIONS.map((t) => [t, t]));
    add('show', 'Show', [...shows.map((s): [string, string] => [s, s]), [NO_SHOW, NO_SHOW]]);
    add('rating', 'Rating', [...VAULT_RATINGS.map((t): [string, string] => [t, t]), ['none', 'Not rated']]);
    add('source', 'Source', [...VAULT_SOURCES.map((t): [string, string] => [t, t]), ['none', 'No source']]);
    if (tags.length) add('tag', 'Tag', tags.map((t) => [t, t]));
    add('used', 'Used', [['used', 'Used'], ['never', 'Never posted']]);
    add('un', 'Unreleased', [['yes', 'Unreleased only'], ['no', 'Released only']]);
    add('held', 'Held', [['yes', 'Held'], ['no', 'Not held']]);
    if (extras()) filters.appendChild(button('pt-btn pt-btn-sm', 'Clear filters', () => { extra = { ...NO_EXTRA }; drawTools(); drawFilters(); drawBody(); }));
  }

  /* ── the grid ── */

  function thumbOf(f: VaultFile): HTMLImageElement {
    const img = el('img');
    img.alt = '';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.draggable = false;
    let again = false;
    img.addEventListener('error', () => {
      // The address did not answer: ask once for it to be made, and
      // after that show the tile without a picture.
      if (again || f.missing) { img.remove(); return; }
      again = true;
      img.src = `${thumbUrl(slug, f.id)}?again=1`;
    });
    img.src = f.t ? previewUrl(slug, f.id, f.t, 'thumb') : thumbUrl(slug, f.id);
    return img;
  }

  function flagsOf(f: VaultFile): HTMLElement {
    const flags = el('span', 'vt-flags');
    if (f.missing) flags.appendChild(el('span', 'vt-flag vt-flag-bad', 'Missing'));
    if (f.un) flags.appendChild(el('span', 'vt-flag vt-flag-un', 'Unreleased'));
    if (f.rating) flags.appendChild(el('span', `vt-flag vt-flag-${f.rating.toLowerCase()}`, f.rating));
    if (f.held) flags.appendChild(el('span', 'vt-flag vt-flag-held', 'Held'));
    if (f.used > 0) flags.appendChild(el('span', 'vt-flag vt-flag-used', 'Used'));
    return flags;
  }

  function cellOf(f: VaultFile): HTMLElement {
    const c = el('div', 'vt-cell');
    c.dataset.id = f.id;
    c.dataset.type = f.type;
    if (f.missing) c.dataset.missing = 'true';
    const open = el('button', 'vt-cell-open');
    open.type = 'button';
    open.setAttribute('aria-label', `${f.name}${f.show ? `, ${f.show}` : ''}`);
    const ph = el('span', 'vt-cell-icon');
    ph.appendChild(icon(f.type === 'Video' ? 'video' : f.type === 'Graphic' ? 'graphic' : 'photo'));
    open.appendChild(ph);
    if (!f.missing) open.appendChild(thumbOf(f));
    open.addEventListener('click', (e) => tap(f.id, e.shiftKey));
    c.appendChild(open);
    if (f.type === 'Video') c.appendChild(el('span', 'vt-dur', durationLabel(f.dur) || 'Video'));
    c.appendChild(flagsOf(f));
    const star = el('button', 'vt-star');
    star.type = 'button';
    star.setAttribute('aria-label', f.star ? 'Remove the star' : 'Star this file');
    star.setAttribute('aria-pressed', String(f.star));
    star.textContent = f.star ? '★' : '☆';
    star.addEventListener('click', (e) => { e.stopPropagation(); void save([f.id], { star: !byId.get(f.id)?.star }); });
    c.appendChild(star);
    const mark = el('span', 'vt-pick');
    c.appendChild(mark);
    paintPick(c, f.id);
    return c;
  }

  function paintPick(c: HTMLElement, id: string): void {
    const at = picked.indexOf(id);
    c.dataset.picked = String(at >= 0);
    const mark = c.querySelector('.vt-pick');
    if (mark) mark.textContent = at >= 0 ? String(at + 1) : '';
  }

  function refreshPicks(): void {
    for (const [id, c] of cells) paintPick(c, id);
  }

  /** A cell redrawn in place after a save, so the grid does not jump. */
  function refreshCell(id: string): void {
    const old = cells.get(id);
    const f = byId.get(id);
    if (!old || !f) return;
    const next = cellOf(f);
    old.replaceWith(next);
    cells.set(id, next);
  }

  function tap(id: string, range: boolean): void {
    if (!picking) { openViewer(id); return; }
    if (range && lastTapped && lastTapped !== id) {
      const a = list.findIndex((f) => f.id === lastTapped);
      const b = list.findIndex((f) => f.id === id);
      if (a >= 0 && b >= 0) {
        for (const f of list.slice(Math.min(a, b), Math.max(a, b) + 1)) if (!picked.includes(f.id)) picked.push(f.id);
      }
    } else if (picked.includes(id)) picked = picked.filter((p) => p !== id);
    else picked.push(id);
    lastTapped = id;
    refreshPicks();
    drawBar();
  }

  function fillGrid(grid: HTMLElement, from: readonly VaultFile[], start: number, end: number): void {
    const frag = document.createDocumentFragment();
    for (const f of from.slice(start, end)) {
      const c = cellOf(f);
      cells.set(f.id, c);
      frag.appendChild(c);
    }
    grid.appendChild(frag);
  }

  function drawBody(): void {
    watcher?.disconnect();
    watcher = null;
    cells.clear();
    clear(body);
    clear(count);
    const f = filter();
    list = sortFiles(files.filter((x) => matchesFilter(x, f, text.get(x.id))));

    if (!files.length) {
      body.appendChild(emptyBox('photo', 'Nothing in the Vault yet',
        admin ? 'Run a sync to read this client\'s Footage Drop, Finished Content and Archive folders.'
          : 'Your photos and video land here as we log them.'));
      return;
    }

    const said = el('span', 'vt-count-n', plural(list.length, 'file'));
    count.appendChild(said);
    if (picking && list.length) {
      count.appendChild(button('vt-linkbtn', 'Select all shown', () => {
        for (const x of list) if (!picked.includes(x.id)) picked.push(x.id);
        refreshPicks();
        drawBar();
      }));
    }

    if (view.id === 'needs-show' && admin) { drawNeedsShow(); return; }
    if (view.byShow && !extra.show) { drawByShow(); return; }
    if (extra.show && extra.show !== NO_SHOW) body.appendChild(showHeader(showGaps(files).find((g) => g.show === extra.show) ?? null, extra.show));

    if (!list.length) {
      body.appendChild(emptyBox('photo', 'Nothing here', query || extras()
        ? 'No file matches that search and those filters.'
        : view.id === 'keepers' ? 'No keepers yet. Star or rate a file in Unsorted and it lands here.' : 'No file is in this view.'));
      return;
    }
    const grid = el('div', 'vt-grid');
    body.appendChild(grid);
    drawn = Math.min(PAGE, list.length);
    fillGrid(grid, list, 0, drawn);
    if (drawn < list.length) {
      const more = el('div', 'vt-more');
      body.appendChild(more);
      watcher = new IntersectionObserver((entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        const next = Math.min(drawn + PAGE, list.length);
        fillGrid(grid, list, drawn, next);
        drawn = next;
        if (drawn >= list.length) { watcher?.disconnect(); more.remove(); }
      }, { rootMargin: '900px 0px' });
      watcher.observe(more);
    }
  }

  /* ── by show, and the gaps strip ── */

  function gapsStrip(g: ShowGaps): HTMLElement {
    const strip = el('div', 'vt-gaps');
    strip.dataset.gaps = g.show;
    const box = (n: number, label: string): void => {
      const b = el('div', `vt-gap${n ? '' : ' vt-gap-empty'}`);
      b.append(el('span', 'vt-gap-n', String(n)), el('span', 'vt-gap-label', label));
      strip.appendChild(b);
    };
    box(g.photos, 'Photos');
    box(g.vertical, 'Vertical video');
    box(g.horizontal, 'Horizontal video');
    if (g.unsorted) strip.appendChild(el('span', 'vt-gap-aside', `${plural(g.unsorted, 'file')} still unsorted`));
    return strip;
  }

  function showHeader(g: ShowGaps | null, name: string): HTMLElement {
    const box = el('div', 'vt-show-head');
    const row = el('div', 'vt-show-row');
    const title = el('div', 'vt-show-title');
    title.append(el('h2', undefined, name));
    if (g?.date) title.appendChild(el('span', 'vt-show-date', vaultDateLabel(g.date)));
    row.appendChild(title);
    if (admin && name !== NO_SHOW) {
      const at = announced[name];
      if (at) row.appendChild(el('span', 'vt-announced', `Announced ${ago(at)}`));
      const b = button('pt-btn pt-btn-sm', at ? 'Announce again' : 'Announce delivery', () => confirmAnnounce(name));
      b.dataset.announce = name;
      row.appendChild(b);
    }
    box.appendChild(row);
    if (g) box.appendChild(gapsStrip(g));
    return box;
  }

  function drawByShow(): void {
    const groups = showGaps(files);
    const inView = new Map<string, VaultFile[]>();
    for (const f of list) {
      const key = f.show ?? NO_SHOW;
      const at = inView.get(key);
      if (at) at.push(f); else inView.set(key, [f]);
    }
    if (!groups.length) { body.appendChild(emptyBox('photo', 'No shows yet', 'Shows appear here as files are logged.')); return; }
    for (const g of groups) {
      const mine = inView.get(g.show) ?? [];
      const section = el('section', 'vt-show');
      section.dataset.show = g.show;
      section.appendChild(showHeader(g, g.show));
      if (mine.length) {
        const grid = el('div', 'vt-grid vt-grid-strip');
        fillGrid(grid, mine, 0, Math.min(mine.length, 12));
        section.appendChild(grid);
        if (mine.length > 12) {
          section.appendChild(button('vt-linkbtn', `See all ${mine.length.toLocaleString('en-US')}`, () => {
            view = viewById('keepers');
            extra = { ...NO_EXTRA, show: g.show };
            filtersOpen = true;
            draw();
            root.scrollIntoView({ block: 'start' });
          }));
        }
      } else if (query) {
        continue;
      } else {
        section.appendChild(el('p', 'vt-show-none', g.unsorted ? 'No keepers yet. Its files are in Unsorted.' : 'No keepers yet.'));
      }
      body.appendChild(section);
    }
  }

  /* ── needs a show (ours) ── */

  function drawNeedsShow(): void {
    if (!list.length) {
      body.appendChild(emptyBox('check', 'Every file has a show', 'Files from folders we cannot read a show from are listed here to confirm.'));
      return;
    }
    // One group a suggestion: a shoot filed under forty subfolders
    // is one thing to confirm. Files with no suggestion are grouped
    // by the folder they are in.
    const groups = new Map<string, VaultFile[]>();
    for (const f of list) {
      const key = f.guess ? `g\u0001${f.guess}` : `p\u0001${f.path}`;
      const at = groups.get(key);
      if (at) at.push(f); else groups.set(key, [f]);
    }
    const shows = [...new Set(files.filter((f) => f.show).map((f) => f.show as string))].sort((a, b) => a.localeCompare(b));
    const known = el('datalist');
    known.id = `vt-shows-${slug}`;
    for (const s of shows) known.appendChild(option(s, s));
    body.appendChild(known);
    body.appendChild(el('p', 'vt-needs-intro',
      'These files are in folders that do not name a show. Each group has the folder\'s own name as a suggestion: confirm it, or type the show it belongs to.'));
    const wrap = el('div', 'vt-needs');
    wrap.dataset.needs = '1';
    for (const [, group] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
      const row = el('div', 'vt-need');
      const strip = el('div', 'vt-need-thumbs');
      for (const f of group.slice(0, 4)) {
        const t = el('button', 'vt-need-thumb');
        t.type = 'button';
        t.setAttribute('aria-label', `Open ${f.name}`);
        t.appendChild(thumbOf(f));
        t.addEventListener('click', () => openViewer(f.id));
        strip.appendChild(t);
      }
      const info = el('div', 'vt-need-info');
      const paths = [...new Set(group.map((f) => f.path))];
      // What every one of its folders starts with, so the line says
      // where the group is without listing forty folders.
      const parts = paths.map((p) => p.split(' / '));
      const shared: string[] = [];
      for (let i = 0; parts.every((p) => p[i] !== undefined && p[i] === parts[0][i]); i += 1) shared.push(parts[0][i]);
      const where = paths.length === 1 ? paths[0] : `${shared.join(' / ') || 'Several folders'} · ${paths.length} folders`;
      info.append(el('strong', undefined, plural(group.length, 'file')), el('span', 'vt-need-path', where || 'No folder'));
      const input = el('input', 'pt-input vt-need-input');
      input.type = 'text';
      input.value = group[0].guess ?? '';
      input.placeholder = 'Show or release';
      input.setAttribute('list', known.id);
      input.setAttribute('aria-label', `Show for the files in ${where}`);
      const go = button('pt-btn pt-btn-sm pt-btn-primary', 'Confirm', () => {
        const name = input.value.trim();
        if (!name) { toast('Type the show these files belong to.', true); return; }
        void save(group.map((f) => f.id), { show: name }, `${plural(group.length, 'file')} set to ${name}`);
      });
      const none = button('pt-btn pt-btn-sm', 'No show', () => {
        void save(group.map((f) => f.id), { show: null }, `${plural(group.length, 'file')} marked as having no show`);
      });
      const act = el('div', 'vt-need-act');
      act.append(input, go, none);
      row.append(strip, info, act);
      wrap.appendChild(row);
    }
    body.appendChild(wrap);
    const guessed = list.filter((f) => f.guess);
    if (guessed.length > 1) {
      body.appendChild(button('pt-btn vt-need-all', `Confirm every suggestion (${plural(guessed.length, 'file')})`, () => {
        void save(guessed.map((f) => f.id), { confirmShow: true }, `${plural(guessed.length, 'file')} confirmed`);
      }));
    }
  }

  /* ── saving ── */

  /**
   * Save one change to these files. The page shows what the server
   * says was saved, not what was asked for, so a field a client may
   * not change is never drawn as changed.
   */
  async function save(ids: readonly string[], change: Record<string, unknown>, done?: string): Promise<boolean> {
    if (!ids.length) return false;
    let changed = 0;
    for (let i = 0; i < ids.length; i += MAX_EDIT_IDS) {
      const got = await ask(`${base}/edit`, { ids: ids.slice(i, i + MAX_EDIT_IDS), ...change });
      if (!alive) return false;
      if (got.status !== 200 || !got.json?.ok) {
        toast(got.json?.message ?? (got.status === 429 ? 'That is a lot of changes at once. Wait a moment and try again.' : 'That did not save. Try again.'), true);
        return false;
      }
      changed += Number(got.json.changed) || 0;
      for (const f of (got.json.files ?? []) as VaultFile[]) {
        byId.set(f.id, f);
        text.set(f.id, searchText(f));
      }
    }
    files = files.map((f) => byId.get(f.id) ?? f);
    if ('used' in change || 'madeFrom' in change) await reloadUses();
    // A big change moves files between shelves: draw it all again. A
    // small one is redrawn in place.
    const whole = ids.length > 12 || 'show' in change || 'confirmShow' in change;
    if (whole) draw(); else { for (const id of ids) refreshCell(id); drawViews(); drawBar(); }
    if (done && changed) toast(done);
    return changed > 0;
  }

  async function reloadUses(): Promise<void> {
    const got = await ask(`${base}/data`);
    if (!alive || got.status !== 200 || !got.json?.ok) return;
    uses = got.json.uses ?? [];
    made = got.json.made ?? [];
    take(got.json.files ?? files);
  }

  /* ── the bar under a selection ── */

  function drawBar(): void {
    clear(bar);
    bar.hidden = !picking;
    if (!picking) return;
    const n = picked.length;
    bar.appendChild(el('span', 'vt-bar-n', n ? `${n.toLocaleString('en-US')} selected` : 'Tap files to select them'));
    if (!n) return;
    const act = el('div', 'vt-bar-acts');
    const add = (label: string, fn: () => void, primary = false): void => {
      act.appendChild(button(`pt-btn pt-btn-sm${primary ? ' pt-btn-primary' : ''}`, label, fn));
    };
    add('Star', () => { void save(picked, { star: true }, `${plural(n, 'file')} starred`); });
    add('Tag', () => tagSheet(picked));
    if (admin) {
      add('Rate', () => chooseSheet('Rate', [...VAULT_RATINGS, 'Not rated'], (v) => save(picked, { rating: v === 'Not rated' ? null : v }, `${plural(n, 'file')} rated`)));
      add('Source', () => chooseSheet('Source', [...VAULT_SOURCES, 'No source'], (v) => save(picked, { source: v === 'No source' ? null : v }, `Source set on ${plural(n, 'file')}`)));
      add('Show', () => showSheet(picked));
      add('Hold for', () => holdSheet(picked));
      add('More', () => moreSheet(picked));
    }
    add('Use in a post', () => useSheet(picked), true);
    bar.appendChild(act);
  }

  function chooseSheet(title: string, choices: readonly string[], pick: (v: string) => Promise<boolean>): void {
    const s = openSheet(title);
    const col = el('div', 'vt-choices');
    for (const c of choices) col.appendChild(button('pt-btn', c, () => { s.close(); void pick(c); }));
    s.body.appendChild(col);
  }

  function tagSheet(ids: readonly string[]): void {
    const s = openSheet(`Tag ${plural(ids.length, 'file')}`);
    const all = [...new Map(files.flatMap((f) => f.tags).map((t) => [t.toLowerCase(), t])).values()].sort((a, b) => a.localeCompare(b));
    const on = new Map<string, number>();
    for (const id of ids) for (const t of byId.get(id)?.tags ?? []) on.set(t.toLowerCase(), (on.get(t.toLowerCase()) ?? 0) + 1);
    const input = el('input', 'pt-input');
    input.type = 'text';
    input.placeholder = 'Add a tag, then Enter';
    input.maxLength = 40;
    input.setAttribute('aria-label', 'A new tag');
    const addTag = async (): Promise<void> => {
      const t = cleanTag(input.value);
      if (!t) return;
      s.close();
      await save(ids, { tagsAdd: [t] }, `Tagged ${plural(ids.length, 'file')}`);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); void addTag(); } });
    s.body.append(input, button('pt-btn pt-btn-primary vt-sheet-go', 'Add tag', () => { void addTag(); }));
    if (all.length) {
      s.body.appendChild(el('p', 'pt-sheet-note', 'Or tap one. A filled tag is on every selected file; tap it to take it off.'));
      const set = el('div', 'vt-tagset');
      for (const t of all) {
        const have = on.get(t.toLowerCase()) ?? 0;
        const full = have === ids.length;
        const b = button(`vt-tag${full ? ' vt-tag-on' : have ? ' vt-tag-some' : ''}`, t, () => {
          s.close();
          void save(ids, full ? { tagsRemove: [t] } : { tagsAdd: [t] }, full ? 'Tag removed' : `Tagged ${plural(ids.length, 'file')}`);
        });
        set.appendChild(b);
      }
      s.body.appendChild(set);
    }
    input.focus();
  }

  function showSheet(ids: readonly string[]): void {
    const s = openSheet(`Show for ${plural(ids.length, 'file')}`);
    const shows = [...new Set(files.filter((f) => f.show).map((f) => f.show as string))].sort((a, b) => a.localeCompare(b));
    const list = el('datalist');
    list.id = `vt-showpick-${slug}`;
    for (const name of shows) list.appendChild(option(name, name));
    const input = el('input', 'pt-input');
    input.type = 'text';
    input.placeholder = 'Show or release';
    input.setAttribute('list', list.id);
    input.setAttribute('aria-label', 'Show or release');
    const go = async (): Promise<void> => {
      const name = input.value.trim();
      if (!name) return;
      s.close();
      await save(ids, { show: name }, `${plural(ids.length, 'file')} set to ${name}`);
    };
    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); void go(); } });
    s.body.append(list, input, button('pt-btn pt-btn-primary vt-sheet-go', 'Set show', () => { void go(); }));
    input.focus();
  }

  function moreSheet(ids: readonly string[]): void {
    const s = openSheet(`${plural(ids.length, 'file')}`);
    const col = el('div', 'vt-choices');
    const add = (label: string, fn: () => void): void => { col.appendChild(button('pt-btn', label, () => { s.close(); fn(); })); };
    add('Remove the star', () => { void save(ids, { star: false }, 'Stars removed'); });
    add('Mark as used', () => { void save(ids, { used: true }, `${plural(ids.length, 'file')} marked as used`); });
    add('Take off the "used by hand" mark', () => { void save(ids, { used: false }, 'Mark removed'); });
    add('Let go of what they are held for', () => { void save(ids, { hold: null }, 'No longer held'); });
    add('These were used to make a post…', () => madeSheet(ids));
    add('Change type…', () => chooseSheet('Type', VAULT_TYPES, (v) => save(ids, { type: v }, 'Type changed')));
    s.body.appendChild(col);
  }

  /* ── holding, and "made from" (ours) ── */

  interface Picks { items: Array<{ id: string; title: string; status: string | null; date: string | null }>; campaigns: Array<{ id: string; title: string; date: string | null }> }
  let picks: Picks | null = null;

  async function loadPicks(): Promise<Picks | null> {
    if (picks) return picks;
    const got = await ask(`${base}/pick`);
    if (got.status !== 200 || !got.json?.ok) return null;
    picks = { items: got.json.items ?? [], campaigns: got.json.campaigns ?? [] };
    return picks;
  }

  function pickSheet(title: string, o2: { campaigns: boolean; open: boolean; choose: (kind: 'item' | 'campaign', id: string, name: string) => void }): void {
    const s = openSheet(title, true);
    s.body.appendChild(el('p', 'pt-sheet-note vt-pick-loading', 'Reading this client\'s posts and campaigns…'));
    void loadPicks().then((p) => {
      clear(s.body);
      if (!p) { s.body.appendChild(el('p', 'pt-sheet-note', 'They could not be read. Close this and try again.')); return; }
      const find = el('input', 'pt-input');
      find.type = 'search';
      find.placeholder = 'Find a post or campaign';
      find.setAttribute('aria-label', 'Find a post or campaign');
      const rows = el('div', 'vt-picklist');
      const fill = (): void => {
        clear(rows);
        const needle = find.value.trim().toLowerCase();
        const hit = (t: string): boolean => !needle || t.toLowerCase().includes(needle);
        const section = (label: string, list: Array<{ id: string; title: string; sub: string; kind: 'item' | 'campaign' }>): void => {
          if (!list.length) return;
          rows.appendChild(el('h3', 'vt-pick-h', label));
          for (const r of list.slice(0, 60)) {
            const b = el('button', 'vt-pickrow');
            b.type = 'button';
            b.append(el('span', 'vt-pickrow-t', r.title), el('span', 'vt-pickrow-s', r.sub));
            b.addEventListener('click', () => { s.close(); o2.choose(r.kind, r.id, r.title); });
            rows.appendChild(b);
          }
        };
        if (o2.campaigns) {
          section('Campaigns', p.campaigns.filter((c) => hit(c.title)).map((c) => ({ id: c.id, title: c.title, sub: vaultDateLabel(c.date?.slice(0, 10)) || 'No date', kind: 'campaign' as const })));
        }
        section('Posts', p.items.filter((i) => hit(i.title) && (!o2.open || i.status !== 'Posted'))
          .map((i) => ({ id: i.id, title: i.title, sub: [i.status, vaultDateLabel(i.date?.slice(0, 10))].filter(Boolean).join(' · '), kind: 'item' as const })));
        if (!rows.childElementCount) rows.appendChild(el('p', 'pt-sheet-note', 'Nothing matches.'));
      };
      find.addEventListener('input', fill);
      s.body.append(find, rows);
      fill();
      find.focus();
    });
  }

  function holdSheet(ids: readonly string[]): void {
    pickSheet(`Hold ${plural(ids.length, 'file')} for`, {
      campaigns: true, open: true,
      choose: (kind, id, name) => { void save(ids, { hold: { kind, id } }, `Held for ${name}`); },
    });
  }

  function madeSheet(ids: readonly string[]): void {
    pickSheet('Which post were they made into?', {
      campaigns: false, open: false,
      choose: (_kind, id, name) => { void save(ids, { madeFrom: { id, on: true } }, `Marked as the source of ${name}`); },
    });
  }

  /* ── use in a post ── */

  function useSheet(ids: readonly string[]): void {
    const chosen = ids.map((id) => byId.get(id)).filter((f): f is VaultFile => !!f && !f.missing);
    if (!chosen.length) { toast('Those files are missing from Drive, so they cannot be used.', true); return; }
    if (chosen.length > MAX_USE_IDS) { toast(`A post holds up to ${MAX_USE_IDS} files. Pick fewer.`, true); return; }
    const s = openSheet('Use in a post');
    s.body.appendChild(el('p', 'vt-use-line', chosen.length === 1
      ? 'This makes a new Idea in the Content Pipeline with this file attached.'
      : `This makes a new Idea in the Content Pipeline with these ${chosen.length} files as its slides, in the order you picked them.`));
    const strip = el('div', 'vt-use-strip');
    chosen.slice(0, 8).forEach((f, i) => {
      const t = el('span', 'vt-use-thumb');
      t.appendChild(thumbOf(f));
      if (chosen.length > 1) t.appendChild(el('span', 'vt-use-n', String(i + 1)));
      strip.appendChild(t);
    });
    if (chosen.length > 8) strip.appendChild(el('span', 'vt-use-rest', `+${chosen.length - 8}`));
    const field = el('label', 'pt-field');
    field.appendChild(el('span', 'pt-field-label', 'What to call it'));
    const input = el('input', 'pt-input');
    input.type = 'text';
    input.maxLength = 200;
    input.value = useTitle(chosen);
    field.appendChild(input);
    const go = button('pt-btn pt-btn-primary vt-sheet-go', 'Create the Idea', () => {
      go.disabled = true;
      go.textContent = 'Creating…';
      void ask(`${base}/use`, { ids: chosen.map((f) => f.id), title: input.value }).then((got) => {
        if (!alive) return;
        if (got.status !== 200 || !got.json?.ok) {
          go.disabled = false;
          go.textContent = 'Create the Idea';
          toast(got.json?.message ?? 'The Idea could not be created. Try again.', true);
          return;
        }
        clear(s.body);
        s.body.appendChild(el('p', 'vt-use-done', `"${got.json.title}" is in Ideas.`));
        if (got.json.note) s.body.appendChild(el('p', 'pt-sheet-note', got.json.note));
        const a = el('a', 'pt-btn pt-btn-primary vt-sheet-go', 'Open the Idea');
        a.href = got.json.url;
        a.addEventListener('click', () => { s.close(); closeViewer?.(); });
        s.body.append(a, button('pt-btn vt-sheet-go', 'Stay in the Vault', s.close));
        picked = [];
        picking = false;
        root.classList.remove('vt-picking');
        drawTools();
        refreshPicks();
        drawBar();
      });
    });
    s.body.append(strip, field, go);
  }

  /* ── announce delivery (ours) ── */

  function confirmAnnounce(show: string): void {
    const s = openSheet('Announce delivery');
    s.body.appendChild(el('p', 'vt-use-line', `This sends the client a notification: "Your ${show} media is ready". It opens their Vault at this show.`));
    s.body.appendChild(el('p', 'pt-sheet-note', 'It reaches the devices where they have turned notifications on. Nothing else tells a client about files.'));
    const go = button('pt-btn pt-btn-primary vt-sheet-go', 'Send it', () => {
      go.disabled = true;
      void ask(`${base}/announce`, { show }).then((got) => {
        if (!alive) return;
        s.close();
        if (got.status !== 200 || !got.json?.ok) { toast(got.json?.message ?? 'It could not be sent. Try again.', true); return; }
        if (!got.json.sent) { toast(got.json.message ?? 'Nobody was told.', true); return; }
        announced = { ...announced, [show]: got.json.announced };
        toast(`Sent to ${plural(got.json.sent, 'device')}`);
        drawBody();
      });
    });
    s.body.appendChild(go);
  }

  /* ── sync (ours) ── */

  async function runSync(more: boolean): Promise<void> {
    if (syncing || !admin) return;
    syncing = true;
    sync = { ...sync, running: true, phase: 'listing' };
    drawHead();
    drawNotices();
    // The sync answers when it is done. While it runs, its progress
    // is read from where it writes it down.
    const watch = window.setInterval(() => {
      void ask(`${base}/sync`).then((got) => {
        if (!alive || !syncing || !got.json?.sync) return;
        sync = { ...got.json.sync, running: true };
        drawNotices();
      });
    }, 2500);
    let carry = more;
    let outcome: Reply | null = null;
    for (let round = 0; round < 12 && alive; round += 1) {
      outcome = await ask(`${base}/sync`, carry ? { more: true } : {});
      if (!outcome.json?.ok || !outcome.json.more) break;
      carry = true;
    }
    window.clearInterval(watch);
    syncing = false;
    if (!alive) return;
    if (!outcome || !outcome.json) toast('The sync did not answer. It carries on where it stopped the next time it is run.', true);
    else if (!outcome.json.ok) toast(outcome.json.message ?? 'The sync did not finish.', true);
    else if (outcome.json.busy) toast('A sync is already running for this client.');
    else {
      const s = outcome.json.sync as VaultSyncStatus;
      toast(s.added ? `Synced: ${newFilesLabel(s.added)}` : 'Synced. Nothing new.');
    }
    await load();
  }

  /* ── one file ── */

  function openViewer(id: string): void {
    closeViewer?.();
    let at = id;
    let token = 0;
    const order = (): VaultFile[] => (list.some((f) => f.id === at) ? list : [byId.get(at)].filter((f): f is VaultFile => !!f));
    const wrap = el('div', 'vt-viewer');
    wrap.setAttribute('role', 'dialog');
    wrap.setAttribute('aria-modal', 'true');
    const top = el('div', 'vt-viewer-top');
    const stage = el('div', 'vt-stage');
    const side = el('div', 'vt-side');
    const main = el('div', 'vt-viewer-main');
    main.append(stage, side);
    wrap.append(top, main);

    const step = (by: number): void => {
      const all = order();
      const i = all.findIndex((f) => f.id === at);
      const next = all[i + by];
      if (next) { at = next.id; show(); }
    };
    const onKey = (e: KeyboardEvent): void => {
      if (document.querySelector('.vt-sheet')) return;
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement | null)?.tagName ?? '');
      if (e.key === 'Escape') { close(); return; }
      if (typing) return;
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    function close(): void {
      token += 1;
      document.removeEventListener('keydown', onKey);
      document.documentElement.classList.remove('vt-locked');
      stage.querySelector('video')?.pause();
      wrap.remove();
      closeViewer = null;
    }
    closeViewer = close;
    document.addEventListener('keydown', onKey);
    document.documentElement.classList.add('vt-locked');
    document.body.appendChild(wrap);
    show();

    function show(): void {
      const f = byId.get(at);
      if (!f) { close(); return; }
      token += 1;
      const mine = token;
      wrap.setAttribute('aria-label', f.name);
      wrap.dataset.file = f.id;

      clear(top);
      const x = el('button', 'vt-viewer-x');
      x.type = 'button';
      x.setAttribute('aria-label', 'Close');
      x.appendChild(icon('close'));
      x.addEventListener('click', close);
      const all = order();
      const i = all.findIndex((y) => y.id === at);
      const prev = el('button', 'vt-viewer-nav');
      prev.type = 'button';
      prev.setAttribute('aria-label', 'Previous file');
      prev.appendChild(icon('chev-left'));
      prev.disabled = i <= 0;
      prev.addEventListener('click', () => step(-1));
      const next = el('button', 'vt-viewer-nav');
      next.type = 'button';
      next.setAttribute('aria-label', 'Next file');
      next.appendChild(icon('chev'));
      next.disabled = i < 0 || i >= all.length - 1;
      next.addEventListener('click', () => step(1));
      top.append(x, el('span', 'vt-viewer-name', f.name), el('span', 'vt-viewer-at', all.length > 1 ? `${i + 1} / ${all.length.toLocaleString('en-US')}` : ''), prev, next);

      drawStage(f, mine);
      drawSide(f);
    }

    /* the picture, or the video */

    function note(textLine: string, kind: 'pending' | 'failed' = 'pending'): HTMLElement {
      return el('p', `vt-stage-note vt-stage-note-${kind}`, textLine);
    }

    function drawStage(f: VaultFile, mine: number): void {
      clear(stage);
      stage.dataset.type = f.type;
      stage.dataset.state = 'loading';
      if (f.missing) {
        stage.dataset.state = 'failed';
        stage.appendChild(note('This file is no longer in Drive. Its record is kept here.', 'failed'));
        return;
      }
      stage.appendChild(note('Loading the preview…'));
      void ask(`${base}/open/${f.id}`, {}).then((got) => {
        if (mine !== token) return;
        if (got.status !== 200 || !got.json?.ok) { fail('The preview is not available right now.'); return; }
        if (f.type === 'Video') video(f, mine, got.json); else picture(f, mine, got.json.web, false);
      });
    }

    function fail(line: string, why?: string | null, again?: () => void): void {
      stage.dataset.state = 'failed';
      const box = el('div', 'vt-stage-missed');
      box.appendChild(note(line, 'failed'));
      if (why) box.appendChild(el('p', 'vt-stage-why', why));
      if (again) box.appendChild(button('pt-slide-again', 'Try again', again));
      stage.replaceChildren(box);
    }

    function picture(f: VaultFile, mine: number, web: string | null, verified: boolean): void {
      if (!web) { fail('Drive has not made a preview of this file. Open the original to see it.'); return; }
      const img = el('img', 'vt-stage-img');
      img.alt = f.name;
      const url = previewUrl(slug, f.id, web, 'image');
      const go = (): void => {
        stage.dataset.state = 'loading';
        stage.replaceChildren(note('Loading the preview…'));
        void showWhole(img, url).then((how) => {
          if (mine !== token) return;
          if (how === 'shown') { stage.dataset.state = 'ready'; stage.replaceChildren(img); return; }
          if (how === 'gone' && !verified) {
            // Our copy is not where the record says. Checked, and
            // made again if it has gone.
            void ask(`${base}/open/${f.id}`, { verify: true }).then((got) => {
              if (mine !== token) return;
              if (got.json?.ok) picture(f, mine, got.json.web, true); else fail('The preview is not available right now.');
            });
            return;
          }
          fail(how === 'gone' ? 'The preview is not available right now.' : 'The preview did not load.', null, go);
        });
      };
      go();
    }

    function video(f: VaultFile, mine: number, first: { web: string | null; video: ItemPreview | null; play: Playable | null; wait: boolean }): void {
      const poster = first.web ? previewUrl(slug, f.id, first.web, 'image') : null;
      let asked = 0;

      const frame = (): HTMLElement => {
        const box = el('div', 'vt-poster');
        if (poster) {
          const img = el('img', 'vt-stage-img');
          img.alt = `A frame from ${f.name}`;
          box.dataset.loading = 'true';
          void showWhole(img, poster).then((how) => {
            delete box.dataset.loading;
            if (how === 'shown' && mine === token) box.prepend(img);
          });
        }
        return box;
      };

      const play = (v: ItemPreview): void => {
        if (!v.v) { fail('The preview is not available right now.'); return; }
        const player = el('video', 'vt-stage-video');
        player.controls = true;
        player.playsInline = true;
        // The attribute too: an iPhone reads the attribute, and
        // without it tapping play goes full screen.
        player.setAttribute('playsinline', '');
        player.preload = 'metadata';
        if (poster) player.poster = poster;
        else if (v.poster) player.poster = previewUrl(slug, f.id, v.v, 'image');
        player.src = previewUrl(slug, f.id, v.v, 'video');
        let checked = false;
        player.addEventListener('error', () => {
          if (checked || mine !== token) return;
          checked = true;
          waiting('Getting the preview ready…');
          tick(true);
        }, { once: true });
        stage.dataset.state = 'ready';
        stage.replaceChildren(player);
      };

      const waiting = (line: string): void => {
        stage.dataset.state = 'converting';
        const box = frame();
        const over = el('div', 'vt-poster-over');
        over.append(el('span', 'vt-spin'), el('span', undefined, line));
        box.appendChild(over);
        stage.replaceChildren(box);
      };

      const offer = (line?: string): void => {
        stage.dataset.state = 'poster';
        const box = frame();
        const b = el('button', 'vt-play');
        b.type = 'button';
        b.append(icon('play'), el('span', undefined, 'Play preview'));
        b.addEventListener('click', () => { waiting('Converting. This takes a minute or two.'); tick(false); });
        box.appendChild(b);
        if (line) box.appendChild(el('p', 'vt-poster-line', line));
        stage.replaceChildren(box);
      };

      const cannot = (line: string): void => {
        stage.dataset.state = 'poster';
        const box = frame();
        box.appendChild(el('p', 'vt-poster-line vt-poster-line-solo', line));
        stage.replaceChildren(box);
      };

      const read = (a: { video: ItemPreview | null; play: Playable | null; wait: boolean }, tapped: boolean): void => {
        if (a.video?.state === 'ready') { play(a.video); return; }
        if (a.video?.state === 'failed') {
          fail('This video could not be converted. Open the original to watch it.', admin ? a.video.why ?? null : null,
            admin ? () => { waiting('Converting. This takes a minute or two.'); tick(false, true); } : undefined);
          return;
        }
        if (a.video?.state === 'pending' || a.wait) {
          waiting('Converting. This takes a minute or two.');
          window.setTimeout(() => { if (mine === token) tick(false); }, ASK_EVERY_MS);
          return;
        }
        if (a.play === 'too_long') { cannot('This video is longer than 5 minutes, so it is not converted here. Open the original to watch it.'); return; }
        if (a.play === 'unknown') { cannot('Drive has not finished reading this video. Try again in a few minutes, or open the original.'); return; }
        if (tapped) { fail('The preview is not available right now.'); return; }
        offer();
      };

      function tick(verify: boolean, retry = false): void {
        if (mine !== token || !wrap.isConnected) return;
        asked += 1;
        if (asked > ASK_TIMES) { fail('This is taking longer than it should. Close this and open it again in a few minutes.'); return; }
        void ask(`${base}/open/${f.id}`, { play: true, ...(verify ? { verify: true } : {}), ...(retry ? { retry: true } : {}) }).then((got) => {
          if (mine !== token) return;
          if (got.status !== 200 || !got.json?.ok) { fail('The preview is not available right now.'); return; }
          read(got.json, true);
        });
      }

      read(first, false);
    }

    /* what is known about it, and what can be changed */

    function drawSide(f: VaultFile): void {
      clear(side);
      const facts = el('div', 'vt-facts');
      const fact = (label: string, value: string | null | undefined): void => {
        if (!value) return;
        const row = el('div', 'vt-fact');
        row.append(el('span', 'vt-fact-l', label), el('span', 'vt-fact-v', value));
        facts.appendChild(row);
      };
      fact('Show', f.show ?? (f.needsShow && f.guess ? `${f.guess} (a guess)` : null));
      fact('Date', vaultDateLabel(f.date));
      fact('Type', [f.kind, f.type, f.o].filter(Boolean).join(' · '));
      if (f.type === 'Video') fact('Length', durationLabel(f.dur));
      fact('Size', [f.w && f.h ? `${f.w} × ${f.h}` : '', sizeLabel(f.size)].filter(Boolean).join(' · '));
      fact('Filed under', f.path);
      if (!admin) { fact('Rating', f.rating); fact('Source', f.source); }
      if (f.un) fact('Status', 'Unreleased');
      if (f.held) fact('Held', admin ? `For ${f.holdFor ?? 'something'}` : 'Put aside for a post that is on its way');
      side.appendChild(facts);

      const acts = el('div', 'vt-acts');
      const orig = el('a', 'pt-btn pt-btn-sm', 'Open original');
      orig.href = driveFileLink(f.drive);
      orig.target = '_blank';
      orig.rel = 'noopener noreferrer';
      orig.prepend(icon('ext'));
      orig.dataset.original = '1';
      const star = button(`pt-btn pt-btn-sm${f.star ? ' pt-btn-on' : ''}`, f.star ? '★ Starred' : '☆ Star', () => {
        void save([f.id], { star: !f.star }).then(() => drawSide(byId.get(f.id) ?? f));
      });
      star.setAttribute('aria-pressed', String(f.star));
      acts.append(orig, star);
      if (!f.missing) acts.appendChild(button('pt-btn pt-btn-sm pt-btn-primary', 'Use in a post', () => useSheet([f.id])));
      side.appendChild(acts);

      /* tags */
      const tagBox = el('div', 'vt-field');
      tagBox.appendChild(el('span', 'pt-field-label', 'Tags'));
      const set = el('div', 'vt-tagset');
      for (const t of f.tags) {
        const chip = el('span', 'vt-tag vt-tag-on');
        chip.appendChild(el('span', undefined, t));
        const rm = el('button', 'vt-tag-x', '×');
        rm.type = 'button';
        rm.setAttribute('aria-label', `Remove the tag ${t}`);
        rm.addEventListener('click', () => { void save([f.id], { tagsRemove: [t] }).then(() => drawSide(byId.get(f.id) ?? f)); });
        chip.appendChild(rm);
        set.appendChild(chip);
      }
      const add = el('input', 'pt-input vt-tag-add');
      add.type = 'text';
      add.placeholder = 'Add a tag';
      add.maxLength = 40;
      add.setAttribute('aria-label', 'Add a tag');
      add.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const t = cleanTag(add.value);
        if (!t) return;
        void save([f.id], { tagsAdd: [t] }).then(() => { drawSide(byId.get(f.id) ?? f); (side.querySelector('.vt-tag-add') as HTMLInputElement | null)?.focus(); });
      });
      tagBox.append(set, add);
      side.appendChild(tagBox);

      /* notes */
      const noteBox = el('label', 'vt-field');
      noteBox.appendChild(el('span', 'pt-field-label', 'Notes'));
      const area = el('textarea', 'pt-input pt-textarea');
      area.rows = 3;
      area.maxLength = 2000;
      area.value = f.notes;
      area.placeholder = 'Anything worth knowing about this file';
      area.addEventListener('blur', () => {
        if (area.value.trim() === (byId.get(f.id)?.notes ?? '')) return;
        void save([f.id], { notes: area.value }).then((ok) => { if (ok) toast('Note saved'); });
      });
      noteBox.appendChild(area);
      side.appendChild(noteBox);

      /* ours */
      if (admin) {
        const ours = el('div', 'vt-ours');
        const rate = el('div', 'vt-field');
        rate.appendChild(el('span', 'pt-field-label', 'Rating'));
        const seg = el('div', 'pt-seg vt-seg');
        for (const r of VAULT_RATINGS) {
          const b = button('', r, () => { void save([f.id], { rating: f.rating === r ? null : r }).then(() => drawSide(byId.get(f.id) ?? f)); });
          b.setAttribute('aria-pressed', String(f.rating === r));
          seg.appendChild(b);
        }
        rate.appendChild(seg);
        ours.appendChild(rate);

        const pickOne = (label: string, value: string | null, options: readonly string[], none: string, key: 'source' | 'type'): void => {
          const box = el('label', 'vt-field');
          box.appendChild(el('span', 'pt-field-label', label));
          const sel = el('select', 'pt-select pt-select-wide');
          if (none) sel.appendChild(option('', none, !value));
          for (const v of options) sel.appendChild(option(v, v, v === value));
          sel.addEventListener('change', () => { void save([f.id], { [key]: sel.value || null }).then(() => drawSide(byId.get(f.id) ?? f)); });
          box.appendChild(sel);
          ours.appendChild(box);
        };
        pickOne('Source', f.source, VAULT_SOURCES, 'Not set', 'source');
        pickOne('Type', f.type, VAULT_TYPES, '', 'type');

        const showBox = el('div', 'vt-field');
        showBox.appendChild(el('span', 'pt-field-label', f.needsShow ? 'Show (needs confirming)' : 'Show'));
        const row = el('div', 'vt-row');
        const input = el('input', 'pt-input');
        input.type = 'text';
        input.value = f.show ?? f.guess ?? '';
        input.placeholder = 'Show or release';
        input.setAttribute('aria-label', 'Show or release');
        row.append(input, button('pt-btn pt-btn-sm', f.needsShow ? 'Confirm' : 'Save', () => {
          const name = input.value.trim();
          void save([f.id], { show: name || null }, name ? `Show set to ${name}` : 'Marked as having no show').then(() => drawSide(byId.get(f.id) ?? f));
        }));
        showBox.appendChild(row);
        ours.appendChild(showBox);

        const holdBox = el('div', 'vt-field');
        holdBox.appendChild(el('span', 'pt-field-label', 'Hold for'));
        const hrow = el('div', 'vt-row');
        hrow.appendChild(el('span', 'vt-hold', f.held ? (f.holdFor ?? 'Something') : 'Not held'));
        hrow.appendChild(button('pt-btn pt-btn-sm', f.held ? 'Change' : 'Hold for…', () => {
          pickSheet('Hold this file for', {
            campaigns: true, open: true,
            choose: (kind, id, name) => { void save([f.id], { hold: { kind, id } }, `Held for ${name}`).then(() => drawSide(byId.get(f.id) ?? f)); },
          });
        }));
        if (f.held) hrow.appendChild(button('pt-btn pt-btn-sm', 'Let go', () => { void save([f.id], { hold: null }).then(() => drawSide(byId.get(f.id) ?? f)); }));
        holdBox.appendChild(hrow);
        ours.appendChild(holdBox);
        side.appendChild(ours);
      }

      /* the usage log */
      const mineUses = uses.filter((u) => u.file === f.id);
      const pending = made.filter((m) => m.file === f.id && !mineUses.some((u) => u.how === 'made' && u.postId === m.postId));
      const log = el('div', 'vt-field vt-log');
      log.appendChild(el('span', 'pt-field-label', 'Used'));
      if (!mineUses.length && !pending.length) log.appendChild(el('p', 'vt-log-none', f.held ? 'Not posted yet. It is held.' : 'Never posted.'));
      for (const u of mineUses) {
        const row = el('div', 'vt-use');
        const what = u.how === 'hand' ? 'Marked as used' : u.how === 'made' ? `Used to make ${u.post}` : u.post;
        row.append(el('span', 'vt-use-t', what), el('span', 'vt-use-s', [vaultDateLabel(u.date), u.platform].filter(Boolean).join(' · ')));
        log.appendChild(row);
      }
      for (const m of pending) {
        const row = el('div', 'vt-use vt-use-pending');
        row.append(el('span', 'vt-use-t', `Source of ${m.post}`), el('span', 'vt-use-s', 'Not posted yet'));
        if (admin) row.appendChild(button('vt-linkbtn', 'Remove', () => { void save([f.id], { madeFrom: { id: m.postId, on: false } }).then(() => drawSide(byId.get(f.id) ?? f)); }));
        log.appendChild(row);
      }
      if (admin) {
        const byHand = mineUses.some((u) => u.how === 'hand');
        const r = el('div', 'vt-row vt-log-acts');
        r.appendChild(button('pt-btn pt-btn-sm', byHand ? 'Take off the "used" mark' : 'Mark as used', () => {
          void save([f.id], { used: !byHand }).then(() => drawSide(byId.get(f.id) ?? f));
        }));
        r.appendChild(button('pt-btn pt-btn-sm', 'Made into a post…', () => {
          pickSheet('Which post was this made into?', {
            campaigns: false, open: false,
            choose: (_k, id, name) => { void save([f.id], { madeFrom: { id, on: true } }, `Marked as the source of ${name}`).then(() => drawSide(byId.get(f.id) ?? f)); },
          });
        }));
        log.appendChild(r);
      }
      side.appendChild(log);
    }
  }

  return {
    route(detail: string): void {
      const m = /^show\/(.+)$/.exec(detail);
      if (!m) return;
      let show = m[1];
      try { show = decodeURIComponent(m[1]); } catch { /* as typed */ }
      if (!files.length) { wantShow = show; return; }
      applyShow(show);
      draw();
    },
    destroy(): void {
      alive = false;
      watcher?.disconnect();
      closeViewer?.();
      for (const n of Array.from(document.querySelectorAll('.vt-sheet, .vt-scrim'))) n.remove();
      root.classList.remove('vt', 'vt-picking');
      clear(root);
    },
  };
}

/* ── every client's Vault, in HQ ──────────────────────────────── */

interface OverviewClient {
  slug: string;
  name: string;
  hasFolders: boolean;
  tally: { files: number; keepers: number; unsorted: number; needsShow: number; missing: number };
  sync: VaultSyncStatus;
}

/**
 * HQ's list: each client's Vault in one card, with what is waiting
 * in it and where its sync is. `open` shows one client's Vault.
 */
export function mountVaultOverview(root: HTMLElement, o: { toast: Toast; open: (slug: string) => void }): { destroy(): void } {
  let alive = true;
  clear(root);
  root.classList.add('vt');
  const head = el('div', 'vt-head');
  const title = el('div', 'vt-title');
  title.append(el('h1', undefined, 'Content Vault'), el('p', 'vt-sub', 'Every photo and clip each client owns.'));
  head.appendChild(title);
  const body = el('div', 'vt-clients');
  root.append(head, body);
  body.appendChild(el('p', 'vt-note', 'Reading every Vault…'));

  async function load(): Promise<void> {
    const got = await ask('/portal/hq/vault');
    if (!alive) return;
    clear(body);
    if (got.status !== 200 || !got.json?.ok) { body.appendChild(el('p', 'vt-note vt-note-bad', 'The Vaults could not be read. Reload to try again.')); return; }
    if (!got.json.configured) {
      body.appendChild(el('p', 'vt-note vt-note-warn', got.json.note ?? 'The Vault is not set up on this site yet.'));
      return;
    }
    const clients = (got.json.clients ?? []) as OverviewClient[];
    if (!clients.length) { body.appendChild(el('p', 'vt-note', 'No client has a portal turned on.')); return; }
    for (const c of clients) body.appendChild(card(c));
  }

  function card(c: OverviewClient): HTMLElement {
    const box = el('div', 'pt-card vt-client');
    box.dataset.client = c.slug;
    const top = el('div', 'vt-client-top');
    top.appendChild(el('h2', undefined, c.name));
    const bad = c.sync.sources.filter((s) => s.state === 'not_shared').length;
    const line = !c.hasFolders ? 'No Drive Folder or Archive folder on their Clients row yet.'
      : c.sync.running ? 'Syncing now.'
      : c.sync.phase === 'failed' ? `The last sync did not finish. ${c.sync.error ?? ''}`.trim()
      : c.sync.okAt ? `Synced ${ago(c.sync.okAt)}.` : 'Not synced yet.';
    top.appendChild(el('p', `vt-client-line${c.sync.phase === 'failed' ? ' vt-client-bad' : ''}`, line));
    box.appendChild(top);
    const stats = el('div', 'vt-client-stats');
    const stat = (n: number, label: string, flag = false): void => {
      const s = el('div', `vt-stat${flag && n ? ' vt-stat-flag' : ''}`);
      s.append(el('span', 'vt-stat-n', n.toLocaleString('en-US')), el('span', 'vt-stat-l', label));
      stats.appendChild(s);
    };
    stat(c.tally.files, 'files');
    stat(c.tally.keepers, 'keepers');
    stat(c.tally.unsorted, 'unsorted', true);
    stat(c.tally.needsShow, 'need a show', true);
    if (c.tally.missing) stat(c.tally.missing, 'missing', true);
    box.appendChild(stats);
    if (bad) box.appendChild(el('p', 'vt-note vt-note-warn', `${plural(bad, 'folder')} not shared with the Vault yet. Open the Vault for the address to share with.`));
    const acts = el('div', 'vt-client-acts');
    acts.appendChild(button('pt-btn pt-btn-sm pt-btn-primary', 'Open', () => o.open(c.slug)));
    if (c.hasFolders) {
      const b = button('pt-btn pt-btn-sm', 'Sync now', () => {
        b.disabled = true;
        b.textContent = 'Syncing…';
        void (async () => {
          let out: Reply | null = null;
          let body2: Record<string, unknown> = {};
          for (let round = 0; round < 12 && alive; round += 1) {
            out = await ask(`/portal/${encodeURIComponent(c.slug)}/vault/sync`, body2);
            if (!out.json?.ok || !out.json.more) break;
            body2 = { more: true };
          }
          if (!alive) return;
          if (!out?.json?.ok) o.toast(out?.json?.message ?? 'The sync did not finish.', true);
          else if (out.json.busy) o.toast('A sync is already running for this client.');
          else o.toast(out.json.sync?.added ? `${c.name}: ${newFilesLabel(out.json.sync.added)}` : `${c.name}: nothing new.`);
          void load();
        })();
      });
      acts.appendChild(b);
    }
    box.appendChild(acts);
    return box;
  }

  void load();
  return { destroy(): void { alive = false; root.classList.remove('vt'); clear(root); } };
}

/**
 * "HQ was opened": bring every Vault that is due up to date, one
 * client a call, quietly. Nothing is shown; a failure is in the
 * server's log and on that client's card.
 */
export async function syncVaultsOnOpen(): Promise<void> {
  for (let round = 0; round < 40; round += 1) {
    const got = await ask('/portal/hq/vault', { auto: true });
    if (got.status !== 200 || !got.json?.ok || !got.json.more) return;
  }
}

/** Is a file one that would be shown as a keeper? For the shells. */
export { isKeeper };
