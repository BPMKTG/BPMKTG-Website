/* ──────────────────────────────────────────────────────────────
   HQ: "Update campaigns to current playbook".

   The masters changed and a client's running campaigns were copied
   from them as they were. This sheet shows, row by row, what bringing
   those campaigns up to date would do, and does it only when asked.

   It is a dry run first, always. The plan comes from the server,
   which makes it from Notion; this file draws it and keeps the two
   things a person can say about it:

     - this moment is scheduled by hand: change no dates on it
     - leave this step out

   Either one changes the plan, so the plan is asked for again rather
   than patched up here. Writing saves a snapshot first, runs in
   batches until nothing is left, and then asks the server to check
   its own work. A check that fails is shown as a failure.
   ────────────────────────────────────────────────────────────── */

import { monthLabel, shortDay } from '../data/portal-content';
import { clear, el } from './portal-dom';
import { openSheet, sheetSubmit } from './portal-sheet';

export interface Answer { ok: boolean; status: number; json: Record<string, any> | null }
export type Send = (method: 'GET' | 'POST' | 'PATCH', url: string, body?: unknown) => Promise<Answer>;

export interface UpdateHost {
  send: Send;
  toast: (text: string, bad?: boolean) => void;
  /** Rows were written: HQ's own data is stale. */
  changed: () => void | Promise<void>;
}

interface Change { field: string; from: string | null; to: string | null }
interface Row {
  stepId: string; momentId: string | null; title: string; date: string | null; status: string | null;
  action: 'frozen' | 'kept' | 'unmatched' | 'current' | 'skip' | 'update' | 'add';
  why: string; master: string | null; matchedBy: string | null;
  changes: Change[]; flags: string[];
  pieces: Array<{ id: string; title: string; status?: string; postDate?: string; was: { status: string | null; postDate: string | null } }>;
}
interface Moment { id: string; title: string; date: string | null }
interface Month { month: string; pieces: { before: number; after: number }; projected: { before: number; after: number } }

const URL = '/portal/hq/playbooks/update';
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const detail = (res: Answer, fallback: string) => String(res.json?.detail ?? '').trim() || fallback;
const clip = (s: string | null, n: number) => { const t = s ?? ''; return t.length > n ? `${t.slice(0, n - 1)}…` : t; };

const ACTION_LABEL: Record<Row['action'], string> = {
  skip: 'Skip', update: 'Update', add: 'Add', unmatched: 'Unmatched', kept: 'Kept', frozen: 'Frozen', current: 'Current',
};

/** One change, in a line a person can check against Notion. Long text
 *  is said to have changed rather than printed twice. */
function sayChange(c: Change): string {
  const long = ['Brief', 'Where', 'Why It Matters'].includes(c.field);
  if (long) return `${c.field} ${c.from ? 'replaced' : 'added'}`;
  if (c.field === 'Item') return `Renamed to “${c.to}”`;
  if (c.field === 'Date') return `Date ${c.from ? shortDay(c.from) : 'none'} → ${c.to ? shortDay(c.to) : 'none'}`;
  return `${c.field} ${c.from ?? 'none'} → ${c.to ?? 'none'}`;
}

export function openPlaybookUpdate(host: UpdateHost, client: { pageId: string; name: string }): void {
  openSheet(`Update ${client.name}’s campaigns to the current playbook`, (form, close) => {
    const sheet = form.closest<HTMLElement>('[data-sheet]');
    if (sheet) sheet.dataset.wide = 'true';
    const body = el('div', 'pt-up');
    form.appendChild(body);
    const go = sheetSubmit(form, 'Write the changes');
    go.disabled = true;
    const cancel = el('button', 'pt-btn') as HTMLButtonElement;
    cancel.type = 'button';
    cancel.textContent = 'Close';
    cancel.addEventListener('click', close);
    go.parentElement?.prepend(cancel);

    /** Moments scheduled by hand, and steps left out. */
    const noDates = new Set<string>();
    const exclude = new Set<string>();
    const openMoments = new Set<string>();
    let plan: Record<string, any> | null = null;
    let busy = false;

    const options = () => ({ clientId: client.pageId, noDates: [...noDates], exclude: [...exclude] });

    async function load() {
      busy = true;
      go.disabled = true;
      if (!plan) { clear(body); body.appendChild(el('p', 'pt-sheet-note', 'Reading the calendar and the playbooks…')); }
      else body.dataset.stale = 'true';
      const res = await host.send('POST', URL, { ...options(), dryRun: true });
      busy = false;
      delete body.dataset.stale;
      if (!res.ok || !res.json?.ok) {
        clear(body);
        body.appendChild(el('p', 'pt-pb-warn', detail(res, 'Could not work that out. Try again in a moment.')));
        return;
      }
      plan = res.json;
      draw();
    }

    function monthsEl(months: Month[]): HTMLElement {
      const wrap = el('div', 'pt-up-months');
      wrap.appendChild(el('h3', 'pt-mp-head', 'What each month comes to'));
      const table = el('table', 'pt-up-table');
      const head = el('tr');
      for (const h of ['Month', 'Pieces today', 'After', 'Once every step has its piece', 'After']) head.appendChild(el('th', undefined, h));
      table.appendChild(head);
      for (const m of months) {
        if (!m.projected.before && !m.projected.after) continue;
        const tr = el('tr');
        tr.dataset.month = m.month;
        tr.appendChild(el('td', undefined, monthLabel(m.month)));
        tr.appendChild(el('td', 'pt-num', String(m.pieces.before)));
        tr.appendChild(el('td', 'pt-num', String(m.pieces.after)));
        tr.appendChild(el('td', 'pt-num', String(m.projected.before)));
        const after = el('td', 'pt-num pt-up-after', String(m.projected.after));
        if (m.projected.after > 25) after.dataset.over = 'true';
        tr.appendChild(after);
        table.appendChild(tr);
      }
      wrap.appendChild(table);
      return wrap;
    }

    function rowEl(r: Row): HTMLElement {
      const li = el('li', 'pt-up-row');
      li.dataset.action = r.action;
      if (r.stepId) li.dataset.step = r.stepId;
      const acting = r.action === 'skip' || r.action === 'update';
      const left = el('label', 'pt-trim-main');
      if (acting || r.action === 'kept') {
        const box = el('input') as HTMLInputElement;
        box.type = 'checkbox';
        box.checked = acting;
        box.disabled = busy;
        box.setAttribute('aria-label', `${acting ? 'Leave out' : 'Include'} ${r.title}`);
        box.addEventListener('change', () => {
          if (box.checked) exclude.delete(r.stepId); else exclude.add(r.stepId);
          void load();
        });
        left.appendChild(box);
      } else left.appendChild(el('span', 'pt-up-nobox'));
      const text = el('span', 'pt-trim-text');
      text.appendChild(el('span', 'pt-trim-title', r.title));
      const lines: string[] = [];
      if (r.action === 'update') lines.push(...r.changes.map(sayChange));
      else lines.push(r.why);
      for (const p of r.pieces) {
        lines.push(p.status ? `Piece “${clip(p.title, 48)}” → ${p.status}`
          : `Piece “${clip(p.title, 48)}” moves to ${shortDay(p.postDate ?? null)}`);
      }
      if (r.matchedBy === 'alias' || r.matchedBy === 'placeholder') lines.push(`Matched to master: ${clip(r.master, 70)}`);
      text.appendChild(el('span', 'pt-trim-reason', lines.join(' · ')));
      for (const f of r.flags) text.appendChild(el('span', 'pt-up-flag', f));
      left.appendChild(text);
      li.appendChild(left);
      li.appendChild(el('span', 'pt-trim-date pt-num', r.date ? shortDay(r.date) : ''));
      const tag = el('span', 'pt-tag pt-up-tag', r.action === 'update' ? r.why : ACTION_LABEL[r.action]);
      tag.dataset.action = r.action;
      li.appendChild(tag);
      return li;
    }

    function momentEl(m: Moment, rows: Row[]): HTMLElement {
      const sec = el('section', 'pt-up-moment');
      sec.dataset.moment = m.id;
      const shown = rows.filter((r) => r.action !== 'frozen' && r.action !== 'current' || r.flags.length);
      const tally = (a: Row['action']) => rows.filter((r) => r.action === a).length;
      const isOpen = openMoments.has(m.id);
      const head = el('div', 'pt-up-mhead');
      const toggle = el('button', 'pt-up-mtoggle') as HTMLButtonElement;
      toggle.type = 'button';
      toggle.setAttribute('aria-expanded', String(isOpen));
      toggle.append(el('strong', undefined, m.title), el('span', 'pt-num', m.date ? shortDay(m.date) : 'no date'));
      const bits = (['skip', 'update', 'add', 'unmatched', 'kept'] as const)
        .filter((a) => tally(a)).map((a) => `${tally(a)} ${ACTION_LABEL[a].toLowerCase()}`);
      bits.push(`${tally('frozen')} frozen`, `${tally('current')} already current`);
      toggle.appendChild(el('span', 'pt-up-tally', bits.join(' · ')));
      toggle.addEventListener('click', () => { if (isOpen) openMoments.delete(m.id); else openMoments.add(m.id); draw(); });
      head.appendChild(toggle);
      const hand = el('label', 'pt-up-hand');
      const box = el('input') as HTMLInputElement;
      box.type = 'checkbox';
      box.checked = noDates.has(m.id);
      box.disabled = busy;
      box.dataset.noDates = '1';
      box.addEventListener('change', () => { if (box.checked) noDates.add(m.id); else noDates.delete(m.id); void load(); });
      hand.append(box, el('span', undefined, 'Scheduled by hand: no date changes'));
      head.appendChild(hand);
      sec.appendChild(head);
      if (isOpen) {
        if (!shown.length) sec.appendChild(el('p', 'pt-sheet-note', 'Nothing to do here.'));
        else {
          const list = el('ol', 'pt-up-rows');
          for (const r of shown.sort((a, b) => (a.date ?? '9999').localeCompare(b.date ?? '9999'))) list.appendChild(rowEl(r));
          sec.appendChild(list);
        }
      }
      return sec;
    }

    function draw() {
      if (!plan) return;
      clear(body);
      const c = plan.counts as Record<Row['action'], number>;
      const rows = plan.rows as Row[];
      body.appendChild(el('p', 'pt-sheet-note',
        'This edits campaigns already on the calendar so they match the playbooks as they are now. It never applies a playbook. '
        + 'Steps that are done, skipped, moved, in the past, or whose piece is already being made are frozen and not touched.'));
      const sum = el('p', 'pt-up-sum');
      sum.textContent = `${plural(c.update, 'step')} updated · ${c.skip} skipped (master retired) · ${c.add} added · `
        + `${c.unmatched} unmatched · ${c.kept} left out · ${c.frozen} frozen · ${c.current} already current`;
      body.appendChild(sum);
      const dups = (plan.duplicates ?? []) as string[];
      for (const d of dups) body.appendChild(el('p', 'pt-pb-warn', `After this, ${d}.`));
      const last = plan.last as { key: string; at: string; rows: number; undone: boolean } | null;
      if (last && !last.undone) {
        const bar = el('p', 'pt-up-last');
        bar.appendChild(el('span', undefined, `Last update: ${last.at.slice(0, 16).replace('T', ' ')} UTC, ${plural(last.rows, 'row')}. `));
        const undo = el('button', 'pt-count-quiet', 'Undo last update') as HTMLButtonElement;
        undo.type = 'button';
        undo.dataset.undoUpdate = '1';
        undo.addEventListener('click', () => { void runUndo(last.key, undo); });
        bar.appendChild(undo);
        body.appendChild(bar);
      }
      body.appendChild(monthsEl(plan.months as Month[]));
      const wrap = el('div', 'pt-up-moments');
      for (const m of plan.moments as Moment[]) wrap.appendChild(momentEl(m, rows.filter((r) => r.momentId === m.id)));
      body.appendChild(wrap);
      const writes = Number(plan.writes ?? 0);
      if (!plan.canWrite) {
        body.appendChild(el('p', 'pt-pb-warn', 'The snapshot bucket is not bound here, so nothing can be written from this screen.'));
      }
      go.disabled = busy || !writes || !plan.canWrite;
      go.textContent = writes ? `Write ${plural(writes, 'change')}` : 'Nothing to write';
    }

    async function runUndo(key: string, btn: HTMLButtonElement) {
      btn.disabled = true;
      go.disabled = true;
      let from = 0, restored = 0, bad = false;
      for (let round = 0; round < 40; round++) {
        btn.textContent = `Undoing… ${restored}`;
        const res = await host.send('POST', URL, { clientId: client.pageId, undo: true, run: key, from });
        if (!res.ok || !res.json) { host.toast(detail(res, 'The undo did not finish. Run it again.'), true); bad = true; break; }
        restored += Number(res.json.restored ?? 0);
        from = Number(res.json.next ?? from);
        if (res.json.failed) bad = true;
        if (!Number(res.json.remaining ?? 0)) break;
      }
      host.toast(bad ? 'Some rows could not be put back. Run the undo again.' : `Update undone: ${plural(restored, 'row')} put back`, bad);
      await host.changed();
      plan = null;
      await load();
    }

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (!plan || go.disabled || busy) return;
      const total = (plan.rows as Row[]).filter((r) => ['skip', 'update', 'add'].includes(r.action)).length;
      busy = true;
      go.disabled = true;
      cancel.disabled = true;
      draw();
      go.disabled = true;
      let run: string | null = null;
      let done = 0, left = total, bad = false;
      // The first request saves the snapshot and names the run; every
      // one after carries the name. A round that writes nothing ends it.
      for (let round = 0; round < 60 && left > 0; round++) {
        go.textContent = `Writing… ${done} of ${total} steps`;
        const res = await host.send('POST', URL, { ...options(), ...(run ? { run } : {}) });
        if (!res.ok || !res.json) { host.toast(detail(res, 'That stopped part way. Open it again: the rest is still listed.'), true); bad = true; break; }
        run = (res.json.run as string | null) ?? run;
        const n = Number(res.json.rows ?? 0);
        done += n;
        left = Number(res.json.remaining ?? 0);
        if (!n) { bad = left > 0; break; }
      }
      let failures: string[] = [];
      if (run) {
        go.textContent = 'Checking…';
        const check = await host.send('POST', URL, { clientId: client.pageId, run, verify: true });
        failures = (check.json?.failures ?? (check.ok ? [] : ['The checks could not be run.'])) as string[];
      }
      busy = false;
      cancel.disabled = false;
      await host.changed();
      clear(body);
      const head = el('p', 'pt-mp-clear', `${plural(done, 'step')} written${left ? `, ${left} still to go` : ''}.`);
      body.appendChild(head);
      if (failures.length) {
        const box = el('div', 'pt-up-fail');
        box.dataset.failed = '1';
        box.appendChild(el('strong', undefined, 'The checks FAILED. Undo this update and look at what is listed.'));
        for (const f of failures) box.appendChild(el('p', undefined, f));
        body.appendChild(box);
      } else if (run) {
        body.appendChild(el('p', 'pt-up-pass',
          'Checked: no moment has two open steps from one master, every month has as many pieces past Planned as before, and no Done step changed.'));
      }
      if (run) {
        const undo = el('button', 'pt-btn') as HTMLButtonElement;
        undo.type = 'button';
        undo.textContent = 'Undo this update';
        undo.dataset.undoUpdate = '1';
        undo.addEventListener('click', () => { void runUndo(run as string, undo); });
        body.appendChild(undo);
      }
      go.textContent = 'Done';
      go.disabled = true;
      host.toast(failures.length ? 'The update was written but FAILED its checks.' : bad ? 'The update stopped part way.' : 'Campaigns updated', failures.length > 0 || bad);
    });

    void load();
  });
}
