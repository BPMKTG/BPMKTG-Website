/* ──────────────────────────────────────────────────────────────
   HQ: two sheets that keep the month honest.

     Create missing pieces   every step that posts something of ours
                             and has no row in the Content Pipeline,
                             listed first and created on a click.
     Suggested trims         for a month over its cap: what to cut, why,
                             and what the month would land at.

   Both are a preview and then a write, in that order, always. Nothing
   on either sheet is decided here: the lists come from the server,
   which works them out from Notion, and the server checks every id it
   is sent back against the list it would make again. This file draws
   the list and remembers what is ticked.
   ────────────────────────────────────────────────────────────── */

import { monthLabel, shortDay } from '../data/portal-content';
import { MEDIA_ICON } from './portal-board';
import { clear, el, icon } from './portal-dom';
import { openSheet, sheetSubmit } from './portal-sheet';

export interface Answer { ok: boolean; status: number; json: Record<string, any> | null }
export type Send = (method: 'GET' | 'POST' | 'PATCH', url: string, body?: unknown) => Promise<Answer>;

export interface PiecesHost {
  send: Send;
  toast: (text: string, bad?: boolean) => void;
  /** Rows were written: read HQ again. */
  changed: () => void | Promise<void>;
}

export interface PiecesClient { pageId: string; name: string }

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const detail = (res: Answer, fallback: string) => String(res.json?.detail ?? '').trim() || fallback;

/** Marks the sheet as one of the wide ones for as long as it is this
 *  sheet: a list of thirty titles does not fit a form's width. */
function widen(form: HTMLFormElement) {
  const sheet = form.closest<HTMLElement>('[data-sheet]');
  if (sheet) sheet.dataset.wide = 'true';
}

/* ── Create missing pieces ────────────────────────────────────── */

interface MissingRow {
  title: string; step: string; moment: string | null; date: string | null;
  media: string | null; source: string; bucket: string | null; filmBy: string | null;
  platforms: string[]; priority: string | null;
}

export function openMissingPieces(host: PiecesHost, client: PiecesClient, startMonth?: string): void {
  openSheet(`Create missing pieces for ${client.name}`, (form, close) => {
    widen(form);
    const body = el('div', 'pt-mp');
    form.appendChild(body);
    body.appendChild(el('p', 'pt-sheet-note', 'Reading the calendar…'));
    const go = sheetSubmit(form, 'Create');
    go.disabled = true;
    const cancel = el('button', 'pt-btn') as HTMLButtonElement;
    cancel.type = 'button';
    cancel.textContent = 'Close';
    cancel.addEventListener('click', close);
    go.parentElement?.prepend(cancel);

    let rows: MissingRow[] = [];
    /** Months that are ticked. */
    const on = new Set<string>();
    const monthOf = (r: MissingRow) => (r.date ?? '').slice(0, 7) || 'none';
    const chosen = () => rows.filter((r) => on.has(monthOf(r)));

    const draw = () => {
      clear(body);
      if (!rows.length) {
        body.appendChild(el('p', 'pt-mp-clear', 'Every step we post has its piece. There is nothing to create.'));
        go.disabled = true;
        go.textContent = 'Nothing to create';
        return;
      }
      const months = [...new Set(rows.map(monthOf))].sort();
      body.appendChild(el('p', 'pt-sheet-note',
        'One row in the Content Pipeline for every step we post that has none yet: Planned, ours to post, '
        + 'dated the same day as its step. Steps that are done, skipped or moved are left alone. '
        + 'Nothing is written until you press the button.'));

      const picks = el('div', 'pt-mp-months');
      picks.setAttribute('role', 'group');
      picks.setAttribute('aria-label', 'Months to create');
      for (const m of months) {
        const n = rows.filter((r) => monthOf(r) === m).length;
        const lab = el('label', 'pt-mp-month');
        const box = el('input') as HTMLInputElement;
        box.type = 'checkbox';
        box.checked = on.has(m);
        box.dataset.month = m;
        box.addEventListener('change', () => { if (box.checked) on.add(m); else on.delete(m); draw(); });
        lab.append(box, el('span', undefined, m === 'none' ? 'No date' : monthLabel(m)), el('strong', 'pt-num', String(n)));
        picks.appendChild(lab);
      }
      body.appendChild(picks);

      const list = el('div', 'pt-mp-list');
      for (const m of months) {
        if (!on.has(m)) continue;
        const mine = rows.filter((r) => monthOf(r) === m);
        const sec = el('section', 'pt-mp-sec');
        sec.dataset.month = m;
        const head = el('h3', 'pt-mp-head');
        head.append(el('span', undefined, m === 'none' ? 'No date' : monthLabel(m)),
          el('span', 'pt-num', plural(mine.length, 'piece')));
        sec.appendChild(head);
        const ol = el('ol', 'pt-mp-rows');
        for (const r of mine) {
          const li = el('li', 'pt-mp-row');
          li.appendChild(el('span', 'pt-mp-date pt-num', r.date ? shortDay(r.date) : 'no date'));
          li.appendChild(el('span', 'pt-mp-title', r.title));
          const media = r.media ?? 'Video';
          const md = el('span', 'pt-ccard-media');
          md.append(icon(MEDIA_ICON[media] ?? 'video'), el('span', undefined, r.media ?? 'No media set'));
          if (!r.media) md.classList.add('pt-mp-unset');
          li.appendChild(md);
          li.appendChild(el('span', 'pt-mp-src', r.filmBy ? `${r.source} · film by ${shortDay(r.filmBy)}` : r.source));
          ol.appendChild(li);
        }
        sec.appendChild(ol);
        list.appendChild(sec);
      }
      body.appendChild(list);

      const n = chosen().length;
      go.disabled = n === 0;
      go.textContent = n ? `Create ${plural(n, 'piece')}` : 'Tick a month';
    };

    void (async () => {
      const res = await host.send('POST', '/portal/hq/pieces', { clientId: client.pageId, dryRun: true });
      if (!res.ok || !res.json?.ok) {
        clear(body);
        body.appendChild(el('p', 'pt-pb-warn', detail(res, 'Could not read the calendar. Try again in a moment.')));
        return;
      }
      rows = (res.json.pieces ?? []) as MissingRow[];
      for (const r of rows) on.add(monthOf(r));
      // Opened from a month's counter, it starts on that month alone.
      if (startMonth && rows.some((r) => monthOf(r) === startMonth)) {
        on.clear();
        on.add(startMonth);
      }
      draw();
    })();

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      const total = chosen().length;
      if (!total || go.disabled) return;
      const months = [...on].filter((m) => m !== 'none');
      // Undated steps cannot be asked for by month, so they only go
      // when everything is ticked and no month filter is sent at all.
      const everything = rows.every((r) => on.has(monthOf(r)));
      go.disabled = true;
      cancel.disabled = true;
      let made = 0;
      let left = total;
      // One request creates a limited number and says what is left.
      for (let round = 0; round < 20 && left > 0; round++) {
        go.textContent = `Creating… ${made} of ${total}`;
        const res = await host.send('POST', '/portal/hq/pieces',
          everything ? { clientId: client.pageId } : { clientId: client.pageId, months });
        if (!res.ok) { host.toast(detail(res, 'That did not finish. Open it again to see what is left.'), true); break; }
        const n = Number(res.json?.created ?? 0);
        made += n;
        left = Number(res.json?.remaining ?? 0);
        if (!n) break;
      }
      cancel.disabled = false;
      host.toast(left ? `${plural(made, 'piece')} created, ${left} still to go. Run it again.` : `${plural(made, 'piece')} created`, left > 0);
      await host.changed();
      close();
    });
  });
}

/* ── Suggested trims ──────────────────────────────────────────── */

interface TrimRow {
  pieceId: string; stepId: string | null; title: string; postDate: string; media: string;
  tier: string; playbook: string | null; momentTitle: string | null; reason: string;
  suggested: boolean; canMove: boolean; moveTo: string | null;
}
interface IdleSession { id: string; title: string; date: string | null; moment: string | null }

/** The undo tokens of the last trim, per client, for this browser
 *  session. A trim longer than one request has more than one. */
const UNDO_KEY = 'bp.hq.trim.undo.v1';

function undoTokens(clientId: string): string[] {
  try {
    const all = JSON.parse(sessionStorage.getItem(UNDO_KEY) ?? '{}') as Record<string, string[]>;
    return Array.isArray(all[clientId]) ? all[clientId] : [];
  } catch { return []; }
}
function setUndoTokens(clientId: string, tokens: string[]): void {
  try {
    const all = JSON.parse(sessionStorage.getItem(UNDO_KEY) ?? '{}') as Record<string, string[]>;
    if (tokens.length) all[clientId] = tokens; else delete all[clientId];
    sessionStorage.setItem(UNDO_KEY, JSON.stringify(all));
  } catch { /* a private window: there is simply no undo after a reload */ }
}

export function hasTrimUndo(clientId: string): boolean {
  return undoTokens(clientId).length > 0;
}

/** Put the last trim back: statuses, dates and notes, as they were. */
export async function undoLastTrim(host: PiecesHost, client: PiecesClient): Promise<void> {
  const tokens = undoTokens(client.pageId);
  if (!tokens.length) return;
  let undone = 0;
  const kept: string[] = [];
  // Newest first: a later batch may have skipped a session that an
  // earlier one's steps still fed.
  for (const token of [...tokens].reverse()) {
    const res = await host.send('POST', '/portal/hq/trim', { clientId: client.pageId, undo: token, revert: true });
    if (res.ok && res.json?.ok) undone += Number(res.json.undone ?? 0);
    else if (res.status !== 410) kept.unshift(token);
  }
  setUndoTokens(client.pageId, kept);
  host.toast(kept.length
    ? 'Some of that could not be put back. Try the undo again.'
    : undone ? `Trim undone: ${plural(undone, 'row')} put back as they were` : 'That trim can no longer be undone', kept.length > 0 || !undone);
  await host.changed();
}

export function openTrims(host: PiecesHost, client: PiecesClient, month: string): void {
  openSheet(`Suggested trims · ${client.name} · ${monthLabel(month)}`, (form, close) => {
    widen(form);
    const body = el('div', 'pt-trim');
    form.appendChild(body);
    body.appendChild(el('p', 'pt-sheet-note', 'Working out what could go…'));
    const go = sheetSubmit(form, 'Apply');
    go.disabled = true;
    const cancel = el('button', 'pt-btn') as HTMLButtonElement;
    cancel.type = 'button';
    cancel.textContent = 'Leave the month as it is';
    cancel.addEventListener('click', close);
    go.parentElement?.prepend(cancel);

    let rows: TrimRow[] = [];
    let planned = 0, over = 0, cap = 25, stillOver = 0;
    /** What each row is set to: cut, move, or left alone. */
    const pick = new Map<string, 'cut' | 'move'>();
    const lands = () => planned - pick.size;

    const total = el('p', 'pt-trim-total');
    const sayTotal = () => {
      clear(total);
      const n = lands();
      const cuts = [...pick.values()].filter((v) => v === 'cut').length;
      const moves = pick.size - cuts;
      total.dataset.state = n > cap ? 'over' : 'ok';
      total.append(el('span', undefined, 'Would land at '), el('strong', 'pt-num', String(n)),
        el('span', undefined, ` of ${cap}`));
      const bits: string[] = [];
      if (cuts) bits.push(`${cuts} cut`);
      if (moves) bits.push(`${moves} moved to ${monthLabel(nextMonth(month)).split(' ')[0]}`);
      if (n > cap) bits.push(`${n - cap} still over`);
      if (bits.length) total.appendChild(el('span', 'pt-trim-bits', ` · ${bits.join(' · ')}`));
      go.disabled = pick.size === 0;
      go.textContent = pick.size ? `Apply: ${[cuts ? `cut ${cuts}` : '', moves ? `move ${moves}` : ''].filter(Boolean).join(', ')}` : 'Nothing ticked';
    };

    const draw = () => {
      clear(body);
      if (!over) {
        body.appendChild(el('p', 'pt-mp-clear', `${monthLabel(month)} has ${planned} of ${cap}. There is nothing to trim.`));
        go.disabled = true;
        go.textContent = 'Nothing to trim';
        return;
      }
      body.appendChild(el('p', 'pt-sheet-note',
        `${monthLabel(month)} has ${planned} pieces against a cap of ${cap}, so ${over} too many. `
        + `These are the ${plural(rows.length, 'piece')} that could go, first to cut at the top, with ${Math.min(over, rows.length)} ticked. `
        + 'Core pieces and anything already past Planned are never offered.'));
      if (stillOver) {
        body.appendChild(el('p', 'pt-pb-warn',
          `${stillOver} still over: only Core pieces left, move one to next month.`));
      }
      const list = el('ol', 'pt-trim-rows');
      for (const r of rows) {
        const li = el('li', 'pt-trim-row');
        li.dataset.piece = r.pieceId;
        li.dataset.tier = r.tier;
        const state = pick.get(r.pieceId);
        if (state) li.dataset.pick = state;
        const lab = el('label', 'pt-trim-main');
        const box = el('input') as HTMLInputElement;
        box.type = 'checkbox';
        box.checked = !!state;
        box.setAttribute('aria-label', `Trim ${r.title}`);
        box.addEventListener('change', () => {
          if (box.checked) pick.set(r.pieceId, 'cut'); else pick.delete(r.pieceId);
          draw();
        });
        const text = el('span', 'pt-trim-text');
        text.appendChild(el('span', 'pt-trim-title', r.title));
        text.appendChild(el('span', 'pt-trim-reason', r.reason));
        lab.append(box, text);
        li.appendChild(lab);
        const md = el('span', 'pt-ccard-media');
        md.append(icon(MEDIA_ICON[r.media] ?? 'video'), el('span', undefined, r.media));
        li.appendChild(md);
        li.appendChild(el('span', 'pt-trim-date pt-num', shortDay(r.postDate)));
        const tier = el('span', 'pt-tag pt-pb-priority', r.tier);
        tier.dataset.priority = r.tier;
        li.appendChild(tier);
        // Cut or move, for the pieces that can wait a month.
        if (r.canMove && r.moveTo) {
          const mv = el('button', 'pt-trim-move') as HTMLButtonElement;
          mv.type = 'button';
          const moving = state === 'move';
          mv.setAttribute('aria-pressed', String(moving));
          mv.textContent = moving ? `Moving to ${shortDay(r.moveTo)}` : `Move to ${shortDay(r.moveTo)} instead`;
          mv.addEventListener('click', () => {
            if (moving) pick.set(r.pieceId, 'cut'); else pick.set(r.pieceId, 'move');
            draw();
          });
          li.appendChild(mv);
        } else {
          li.appendChild(el('span', 'pt-trim-nomove'));
        }
        list.appendChild(li);
      }
      body.appendChild(list);
      body.appendChild(total);
      sayTotal();
    };

    void (async () => {
      const res = await host.send('POST', '/portal/hq/trim', { clientId: client.pageId, month, dryRun: true });
      if (!res.ok || !res.json?.ok) {
        clear(body);
        body.appendChild(el('p', 'pt-pb-warn', detail(res, 'Could not work that out. Try again in a moment.')));
        return;
      }
      rows = (res.json.rows ?? []) as TrimRow[];
      planned = Number(res.json.planned ?? 0);
      over = Number(res.json.over ?? 0);
      cap = Number(res.json.cap ?? 25);
      stillOver = Number(res.json.stillOver ?? 0);
      for (const r of rows) if (r.suggested) pick.set(r.pieceId, 'cut');
      draw();
    })();

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!pick.size || go.disabled) return;
      go.disabled = true;
      cancel.disabled = true;
      go.textContent = 'Trimming…';
      const todo = [...pick];
      const tokens: string[] = [];
      const idle = new Map<string, { row: IdleSession; token: string }>();
      let cut = 0, moved = 0, bad = false, landsAt = lands();
      // Twelve at a time: each is two writes and a request has a budget.
      for (let i = 0; i < todo.length; i += 12) {
        const part = todo.slice(i, i + 12);
        const res = await host.send('POST', '/portal/hq/trim', {
          clientId: client.pageId, month,
          cut: part.filter(([, v]) => v === 'cut').map(([id]) => id),
          move: part.filter(([, v]) => v === 'move').map(([id]) => id),
        });
        if (!res.ok || !res.json) { host.toast(detail(res, 'That did not apply.'), true); bad = true; break; }
        cut += Number(res.json.cut ?? 0);
        moved += Number(res.json.moved ?? 0);
        if (res.json.failed) bad = true;
        const token = String(res.json.undo ?? '');
        if (token) tokens.push(token);
        // Asked for again after each batch, so the last answer is the
        // one that has seen every cut.
        for (const s of (res.json.sessions ?? []) as IdleSession[]) if (token) idle.set(s.id, { row: s, token });
      }
      if (tokens.length) setUndoTokens(client.pageId, tokens);
      landsAt = planned - cut - moved;
      await host.changed();
      cancel.disabled = false;

      const done = [cut ? `${cut} cut` : '', moved ? `${moved} moved` : ''].filter(Boolean).join(', ') || 'Nothing changed';
      if (!idle.size) {
        host.toast(bad ? `${done}, but not all of it. Open the month again.` : `${done}. ${monthLabel(month)} is at ${landsAt}.`, bad);
        close();
        return;
      }
      // The second question: sessions with nothing left to film for.
      clear(body);
      body.appendChild(el('p', 'pt-mp-clear', `${done}. ${monthLabel(month)} is at ${landsAt}.`));
      body.appendChild(el('h3', 'pt-mp-head', 'Film sessions no longer needed'));
      body.appendChild(el('p', 'pt-sheet-note',
        'Every piece these sessions were filming for has been cut. Tick the ones to skip. '
        + 'A session that still feeds a piece is never listed.'));
      const keep = new Set<string>(idle.keys());
      const list = el('ol', 'pt-trim-rows');
      for (const { row } of idle.values()) {
        const li = el('li', 'pt-trim-row pt-trim-session');
        li.dataset.session = row.id;
        const lab = el('label', 'pt-trim-main');
        const box = el('input') as HTMLInputElement;
        box.type = 'checkbox';
        box.checked = true;
        box.addEventListener('change', () => { if (box.checked) keep.add(row.id); else keep.delete(row.id); sayGo(); });
        const text = el('span', 'pt-trim-text');
        text.appendChild(el('span', 'pt-trim-title', row.title));
        text.appendChild(el('span', 'pt-trim-reason', row.moment ?? ''));
        lab.append(box, text);
        li.append(lab, el('span', 'pt-trim-date pt-num', row.date ? shortDay(row.date) : ''));
        list.appendChild(li);
      }
      body.appendChild(list);
      cancel.textContent = 'Keep them';
      const sayGo = () => {
        go.disabled = keep.size === 0;
        go.textContent = keep.size ? `Skip ${plural(keep.size, 'film session')}` : 'None ticked';
      };
      sayGo();
      // The same button now answers the second question.
      const skip = async (e: Event) => {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (!keep.size) return;
        go.disabled = true;
        let skipped = 0;
        const byToken = new Map<string, string[]>();
        for (const id of keep) {
          const token = idle.get(id)!.token;
          if (!byToken.has(token)) byToken.set(token, []);
          byToken.get(token)!.push(id);
        }
        for (const [token, list2] of byToken) {
          const res = await host.send('POST', '/portal/hq/trim', { clientId: client.pageId, undo: token, sessions: list2 });
          skipped += Number(res.json?.skipped ?? 0);
        }
        host.toast(skipped ? `${plural(skipped, 'film session')} skipped` : 'Those could not be skipped. They are still on the calendar.', !skipped);
        await host.changed();
        close();
      };
      form.addEventListener('submit', skip, { capture: true });
    });
  });
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split('-').map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
}
