/* ────────────────────────────────────────────────────────────
   Apply a playbook to a moment: one sheet, for HQ and for a client.

   The steps of the sheet are the steps of the job: whose moment, which
   moment (or a new one), which playbooks, a preview of exactly what
   would be written, then the write. Nothing is written before the
   preview has been read, and the write asks the server for the same
   plan the preview showed.

   Two voices. In HQ one of us is planning for a client: we may keep a
   late step live, we say how many rows a per-team step owes, and what
   we add is ours straight away. In the portal a client is planning
   their own event: their own steps are created, and ours are created
   WAITING for us to confirm, which the preview says in so many words.

   Nothing here decides what a step is, who owns it or what it owes.
   The server works the plan out (src/data/playbook-apply.ts) and this
   draws it.
   ──────────────────────────────────────────────────────────── */

import { clientTypeById, momentTypesFor } from '../data/client-types';
import { el, icon } from './portal-dom';
import { openSheet, sheetField, sheetSubmit } from './portal-sheet';

export interface ApplyAnswer { ok: boolean; json: Record<string, any> | null }

export interface ApplyClientRef {
  /** What the endpoints are addressed with: a page id in HQ, the slug
   *  in the portal. */
  key: string;
  name: string;
  /** The client type's id. Absent is an artist. */
  type?: string;
}

export interface ApplyMomentRef {
  id: string;
  title: string;
  date: string | null;
  momentType: string | null;
}

export interface ApplyHost {
  role: () => 'admin' | 'client';
  clients: () => ApplyClientRef[];
  moments: (client: ApplyClientRef) => ApplyMomentRef[];
  /** The playbooks this client's type has, in order. */
  playbooks: (client: ApplyClientRef) => Promise<string[]>;
  /** POST the apply endpoint for this client. */
  apply: (client: ApplyClientRef, body: Record<string, unknown>) => Promise<ApplyAnswer>;
  /** POST a new moment for this client. */
  createMoment: (client: ApplyClientRef, body: Record<string, unknown>) => Promise<ApplyAnswer>;
  toast: (text: string, bad?: boolean) => void;
  today: () => string;
  shortDay: (iso: string | null) => string;
  /** Something was written: re-read whatever the screen is drawn from. */
  changed: () => void | Promise<void>;
}

export interface ApplyPreset {
  clientKey?: string;
  momentId?: string;
  playbook?: string;
  /** Open straight on the new-moment form. */
  newMoment?: boolean;
}

interface PreviewStep {
  key: string; title: string; date: string | null; flow: string; owner: string; priority: string | null;
  marks: string[]; late: boolean; status: string; pending: boolean; perTeam: boolean;
  owes: string | null; pieces: number; overlap: string | null;
}

const NEW = '\u0000new';

const MARK_WORD: Record<string, string> = {
  reworded: 'Reworded', shifted: 'Shifted', reassigned: 'Reassigned', added: 'Added',
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function openApplyFlow(host: ApplyHost, preset: ApplyPreset = {}) {
  const admin = host.role() === 'admin';
  const clients = host.clients();
  if (!clients.length) { host.toast('There is no client to plan for yet.', true); return; }

  openSheet(admin ? 'Apply a playbook to a moment' : 'Add an event', (form, close) => {
    const sheet = form.closest('[data-sheet]') as HTMLElement | null;
    if (sheet) sheet.dataset.wide = '1';
    form.dataset.applyFlow = '1';

    let client = clients.find((c) => c.key === preset.clientKey) ?? clients[0];
    let moments: ApplyMomentRef[] = [];
    let names: string[] = [];
    const picked = new Set<string>();
    /** Per playbook: its preview, as the server last gave it. */
    const previews = new Map<string, Record<string, any>>();
    /** Late steps to keep live, and rows for per-team steps, by key. */
    const keep = new Set<string>();
    const pieces: Record<string, number> = {};
    /** What this sheet has created, by moment, for Undo. */
    const made: string[] = [];
    let madeOn = '';
    let token = 0;

    /* ── who ── */
    const who = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
    for (const c of clients) {
      const o = el('option', undefined, c.name) as HTMLOptionElement;
      o.value = c.key;
      who.appendChild(o);
    }
    who.value = client.key;
    const whoWrap = sheetField('Client', who);
    whoWrap.hidden = clients.length < 2;
    form.appendChild(whoWrap);

    /* ── which moment ── */
    const pick = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
    pick.dataset.applyMoment = '1';
    form.appendChild(sheetField(admin ? 'Moment' : 'Which event', pick));

    const fresh = el('div', 'pt-apply-new');
    fresh.dataset.applyNew = '1';
    const event = el('input', 'pt-input') as HTMLInputElement;
    event.maxLength = 120;
    const city = el('input', 'pt-input') as HTMLInputElement;
    city.maxLength = 80;
    const kind = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
    const start = el('input', 'pt-input') as HTMLInputElement;
    start.type = 'date';
    const end = el('input', 'pt-input') as HTMLInputElement;
    end.type = 'date';
    const notes = el('textarea', 'pt-input pt-textarea') as HTMLTextAreaElement;
    notes.rows = 2;
    notes.maxLength = 1000;
    const row1 = el('div', 'pt-apply-row');
    row1.append(sheetField('Event name', event), sheetField('Venue / city', city));
    const row2 = el('div', 'pt-apply-row');
    row2.append(sheetField('Type', kind), sheetField('Date', start), sheetField('Last day, if more than one', end));
    const add = el('button', 'pt-btn pt-btn-primary', 'Create the moment') as HTMLButtonElement;
    add.type = 'button';
    add.dataset.applyCreate = '1';
    fresh.append(row1, row2, sheetField('Notes', notes), add);
    form.appendChild(fresh);

    /* ── which playbooks ── */
    const books = el('fieldset', 'pt-apply-books');
    books.dataset.applyBooks = '1';
    form.appendChild(books);

    /* ── the preview ── */
    const preview = el('div', 'pt-apply-preview');
    preview.dataset.applyPreview = '1';
    form.appendChild(preview);

    const go = sheetSubmit(form, 'Nothing to create');
    go.disabled = true;
    const after = el('div', 'pt-apply-after');
    after.dataset.applyAfter = '1';
    form.appendChild(after);

    const typeOf = () => clientTypeById(client.type);
    const momentNow = () => moments.find((m) => m.id === pick.value) ?? null;

    function fillMoments(select?: string) {
      const today = host.today();
      moments = host.moments(client)
        .filter((m) => !!m.date)
        // What is coming, soonest first, then what has just been.
        .sort((a, b) => {
          const fa = (a.date ?? '') >= today, fb = (b.date ?? '') >= today;
          if (fa !== fb) return fa ? -1 : 1;
          return fa ? (a.date ?? '').localeCompare(b.date ?? '') : (b.date ?? '').localeCompare(a.date ?? '');
        });
      pick.replaceChildren();
      for (const m of moments) {
        const o = el('option', undefined, `${m.title} · ${host.shortDay(m.date)}`) as HTMLOptionElement;
        o.value = m.id;
        pick.appendChild(o);
      }
      const o = el('option', undefined, 'New moment…') as HTMLOptionElement;
      o.value = NEW;
      pick.appendChild(o);
      pick.value = select && moments.some((m) => m.id === select) ? select
        : (preset.newMoment || !moments.length) ? NEW : moments[0].id;
      kind.replaceChildren();
      for (const t of momentTypesFor(typeOf())) {
        const k = el('option', undefined, t) as HTMLOptionElement;
        k.value = t;
        kind.appendChild(k);
      }
      // The examples are the client's own kind of event, not a gym's
      // on an artist's screen.
      event.placeholder = typeOf().labels.eventExample;
      city.placeholder = typeOf().labels.cityExample;
    }

    /** The playbooks a moment of this type is usually planned with. */
    function suggest() {
      picked.clear();
      const m = momentNow();
      const rule = m?.momentType ? typeOf().playbooksFor[m.momentType] : undefined;
      if (preset.playbook && names.includes(preset.playbook)) { picked.add(preset.playbook); return; }
      if (!rule) return;
      const usable = rule.names.filter((n) => names.includes(n));
      for (const n of (rule.all ? usable : usable.slice(0, 1))) picked.add(n);
    }

    function drawBooks() {
      books.replaceChildren();
      books.hidden = pick.value === NEW;
      if (books.hidden) return;
      books.appendChild(el('legend', 'pt-field-label', admin ? 'Playbooks' : 'Plan it with a playbook'));
      if (!names.length) {
        books.appendChild(el('p', 'pt-sheet-note', 'There are no playbooks for this kind of client yet.'));
        return;
      }
      const m = momentNow();
      const rule = m?.momentType ? typeOf().playbooksFor[m.momentType] : undefined;
      for (const n of names) {
        const label = el('label', 'pt-apply-book');
        const box = el('input') as HTMLInputElement;
        box.type = 'checkbox';
        box.value = n;
        box.checked = picked.has(n);
        box.addEventListener('change', () => {
          if (box.checked) picked.add(n); else picked.delete(n);
          void look();
        });
        label.append(box, el('span', undefined, n));
        if (rule?.names.includes(n)) label.appendChild(el('span', 'pt-tag pt-apply-usual', `Usual for a ${m!.momentType!.toLowerCase()}`));
        books.appendChild(label);
      }
    }

    function stepLine(playbook: string, s: PreviewStep): HTMLElement {
      const li = el('li', 'pt-apply-step' + (s.status === 'Skipped' ? ' pt-apply-step-off' : ''));
      li.dataset.key = s.key;
      li.appendChild(el('span', 'pt-apply-date pt-num', s.date ? host.shortDay(s.date) : 'No date'));
      const main = el('div', 'pt-apply-main');
      main.appendChild(el('span', 'pt-apply-title', s.title));
      const tags = el('div', 'pt-apply-tags');
      tags.appendChild(el('span', 'pt-tag', s.owner === 'Client' ? (admin ? 'Client' : 'Yours') : 'Blueprint'));
      tags.appendChild(el('span', 'pt-apply-flow', s.flow));
      if (s.priority) tags.appendChild(el('span', 'pt-tag', s.priority));
      for (const mk of s.marks) tags.appendChild(el('span', 'pt-tag pt-apply-mark', MARK_WORD[mk] ?? mk));
      if (s.pending) tags.appendChild(el('span', 'pt-tag pt-tag-todo', 'Waits for Blueprint to confirm'));
      if (s.pieces) {
        tags.appendChild(el('span', 'pt-apply-owes',
          s.owes === 'post' ? plural(s.pieces, 'piece') : plural(s.pieces, (s.owes ?? 'row').toLowerCase())));
      }
      main.appendChild(tags);

      if (s.late) {
        const late = el('label', 'pt-apply-late');
        if (admin) {
          const box = el('input') as HTMLInputElement;
          box.type = 'checkbox';
          box.checked = keep.has(s.key);
          box.dataset.keep = s.key;
          box.addEventListener('change', () => {
            if (box.checked) keep.add(s.key); else keep.delete(s.key);
            void look();
          });
          late.append(box, el('span', undefined, 'Late: will be created as Skipped unless kept. Tick to keep it.'));
        } else {
          late.appendChild(el('span', undefined, 'Its day has already passed, so it is added as skipped.'));
        }
        main.appendChild(late);
      }
      if (s.perTeam && admin && s.status !== 'Skipped') {
        const wrap = el('label', 'pt-apply-teams');
        const n = el('input', 'pt-input pt-num') as HTMLInputElement;
        n.type = 'number';
        n.min = '1';
        n.max = '24';
        n.step = '1';
        n.required = true;
        n.dataset.pieces = s.key;
        n.value = pieces[s.key] ? String(pieces[s.key]) : '';
        n.placeholder = 'Teams';
        n.addEventListener('change', () => {
          const v = Number(n.value);
          if (Number.isInteger(v) && v >= 1 && v <= 24) pieces[s.key] = v; else delete pieces[s.key];
          void look();
        });
        wrap.append(el('span', undefined, 'One per team. How many?'), n);
        main.appendChild(wrap);
      }
      if (s.overlap) main.appendChild(el('p', 'pt-apply-overlap', `Overlap: ${s.overlap}.`));
      li.appendChild(main);
      void playbook;
      return li;
    }

    function drawPreview() {
      preview.replaceChildren();
      let steps = 0, rows = 0, waiting = 0, need = 0;
      for (const name of names.filter((n) => picked.has(n))) {
        const p = previews.get(name);
        const sec = el('section', 'pt-apply-book-preview');
        sec.dataset.playbook = name;
        const head = el('div', 'pt-apply-head');
        head.appendChild(el('h3', undefined, name));
        sec.appendChild(head);
        if (!p) { sec.appendChild(el('p', 'pt-sheet-note', 'Working out the steps…')); preview.appendChild(sec); continue; }
        if (!p.ok) { sec.appendChild(el('p', 'pt-pb-warn', String(p.message ?? p.detail ?? 'Could not plan that.'))); preview.appendChild(sec); continue; }
        const list = (p.steps ?? []) as PreviewStep[];
        const facts: string[] = [];
        if (p.alreadyThere) {
          facts.push(list.length || p.owedCount
            ? `Already applied: ${plural(p.alreadyThere, 'step')} of this playbook ${p.alreadyThere === 1 ? 'is' : 'are'} on this moment. Only what is missing would be added.`
            : `Already applied. All ${plural(p.alreadyThere, 'step')} of this playbook are on this moment, so there is nothing to add.`);
        }
        if ((p.skipped ?? []).length) facts.push(`${plural(p.skipped.length, 'step')} left out by an approved skip: ${p.skipped.join('; ')}.`);
        if (p.owedCount) facts.push(`${plural(p.owedCount, 'row')} that steps already here still owe would be created too.`);
        for (const f of facts) sec.appendChild(el('p', 'pt-sheet-note', f));
        head.appendChild(el('span', 'pt-board-count pt-num', String(list.length)));
        // Steps already on the moment that still owe something. A
        // per-team one with no number yet asks for it here.
        const owed = (p.owed ?? []) as Array<{ key: string; title: string; date: string | null; owes: string; missing: number; perTeam: boolean }>;
        if (owed.length && admin) {
          const ul = el('ul', 'pt-apply-steps');
          ul.dataset.applyOwed = '1';
          for (const o of owed) {
            const li = el('li', 'pt-apply-step');
            li.appendChild(el('span', 'pt-apply-date pt-num', o.date ? host.shortDay(o.date) : 'No date'));
            const main = el('div', 'pt-apply-main');
            main.appendChild(el('span', 'pt-apply-title', o.title));
            const tags = el('div', 'pt-apply-tags');
            tags.appendChild(el('span', 'pt-tag', 'Already on this moment'));
            if (o.missing) tags.appendChild(el('span', 'pt-apply-owes', `owes ${plural(o.missing, o.owes.toLowerCase())}`));
            main.appendChild(tags);
            if (o.perTeam) {
              const wrap = el('label', 'pt-apply-teams');
              const n = el('input', 'pt-input pt-num') as HTMLInputElement;
              n.type = 'number'; n.min = '1'; n.max = '24'; n.step = '1'; n.required = true;
              n.dataset.pieces = o.key;
              n.value = pieces[o.key] ? String(pieces[o.key]) : '';
              n.placeholder = 'Teams';
              n.addEventListener('change', () => {
                const v = Number(n.value);
                if (Number.isInteger(v) && v >= 1 && v <= 24) pieces[o.key] = v; else delete pieces[o.key];
                void look();
              });
              wrap.append(el('span', undefined, 'One per team. How many?'), n);
              main.appendChild(wrap);
            }
            li.appendChild(main);
            ul.appendChild(li);
          }
          sec.appendChild(ul);
        }
        if (list.length) {
          const ul = el('ul', 'pt-apply-steps');
          for (const s of list) ul.appendChild(stepLine(name, s));
          sec.appendChild(ul);
        }
        steps += list.length;
        rows += Number(p.pieceCount ?? 0);
        waiting += list.filter((s) => s.pending).length;
        need += (p.needs ?? []).length;
        preview.appendChild(sec);
      }
      const ready = [...picked].every((n) => previews.get(n)?.ok);
      if (!picked.size || pick.value === NEW) {
        go.textContent = 'Nothing to create';
        go.disabled = true;
      } else if (!ready) {
        go.textContent = 'Working it out…';
        go.disabled = true;
      } else if (need) {
        go.textContent = `Say how many teams (${need} to fill in)`;
        go.disabled = true;
      } else if (!steps && !rows) {
        go.textContent = 'Nothing to create';
        go.disabled = true;
      } else {
        const bits = [plural(steps, 'step')];
        if (rows) bits.push(plural(rows, admin && typeOf().features.deliveries ? 'delivery' : 'piece',
          admin && typeOf().features.deliveries ? 'deliveries' : 'pieces'));
        go.textContent = `${steps ? 'Create' : 'Add'} ${bits.filter((b) => !b.startsWith('0 ')).join(' and ')}`;
        go.disabled = false;
      }
      if (!admin && waiting && picked.size) {
        preview.appendChild(el('p', 'pt-apply-waits',
          `${plural(waiting, 'step')} here ${waiting === 1 ? 'needs' : 'need'} Blueprint. `
          + `${waiting === 1 ? 'It is' : 'They are'} added as waiting, and we confirm ${waiting === 1 ? 'it' : 'each one'} before it goes on our plan.`));
      }
    }

    /** Ask the server what each picked playbook would create. */
    async function look() {
      const mine = ++token;
      // Not inside the event that asked for it. A number box's own
      // change event redrawing the list that holds the box removes it
      // mid-event, and the browser objects.
      await new Promise((r) => setTimeout(r, 0));
      if (mine !== token) return;
      if (pick.value === NEW) { previews.clear(); drawPreview(); return; }
      for (const n of picked) previews.delete(n);
      drawPreview();
      await Promise.all([...picked].map(async (name) => {
        const res = await host.apply(client, {
          momentId: pick.value, playbook: name, dryRun: true, keep: [...keep], pieces,
        });
        if (mine !== token) return;
        previews.set(name, res.ok && res.json ? res.json : { ok: false, message: res.json?.message ?? res.json?.detail });
      }));
      if (mine === token) drawPreview();
    }

    async function switchClient() {
      client = clients.find((c) => c.key === who.value) ?? clients[0];
      keep.clear();
      for (const k of Object.keys(pieces)) delete pieces[k];
      names = [];
      fillMoments(preset.momentId);
      fresh.hidden = pick.value !== NEW;
      drawBooks();
      drawPreview();
      names = await host.playbooks(client);
      suggest();
      drawBooks();
      void look();
    }

    who.addEventListener('change', () => { preset = {}; void switchClient(); });
    pick.addEventListener('change', () => {
      fresh.hidden = pick.value !== NEW;
      keep.clear();
      for (const k of Object.keys(pieces)) delete pieces[k];
      preset = { ...preset, playbook: undefined };
      suggest();
      drawBooks();
      void look();
    });

    add.addEventListener('click', async () => {
      if (!event.value.trim()) { event.focus(); return; }
      if (!start.value) { start.focus(); return; }
      if (end.value && end.value < start.value) { end.focus(); return; }
      add.disabled = true;
      const res = await host.createMoment(client, {
        event: event.value.trim(), city: city.value.trim() || null, momentType: kind.value,
        date: start.value, dateEnd: end.value || null, notes: notes.value.trim() || null,
      });
      add.disabled = false;
      const m = res.json?.moment as ApplyMomentRef | undefined;
      if (!res.ok || !res.json?.ok || !m) {
        const bad = (res.json?.rejected as string[] | undefined) ?? [];
        host.toast(bad.length ? `Check the ${bad.join(', ')}.` : String(res.json?.message ?? 'That did not save. Check your connection and try again.'), true);
        return;
      }
      host.toast(`${m.title} added`);
      await host.changed();
      // The list is re-read, and the new one put in by hand in case
      // the re-read has not caught up with the write yet.
      fillMoments(m.id);
      if (!moments.some((x) => x.id === m.id)) {
        moments.unshift(m);
        const o = el('option', undefined, `${m.title} · ${host.shortDay(m.date)}`) as HTMLOptionElement;
        o.value = m.id;
        pick.insertBefore(o, pick.firstChild);
      }
      pick.value = m.id;
      fresh.hidden = true;
      event.value = ''; city.value = ''; start.value = ''; end.value = ''; notes.value = '';
      suggest();
      drawBooks();
      void look();
    });

    form.addEventListener('submit', async (ev) => {
      ev.preventDefault();
      if (go.disabled || pick.value === NEW) return;
      const momentId = pick.value;
      go.disabled = true;
      pick.disabled = true;
      who.disabled = true;
      let steps = 0, rows = 0, failed = false;
      for (const name of names.filter((n) => picked.has(n))) {
        // One request writes a limited number of rows and says what is
        // left, so this asks until nothing is. A round that writes
        // nothing ends it, rather than asking forever.
        for (let round = 0; round < 14; round++) {
          go.textContent = `Creating… ${name}`;
          const res = await host.apply(client, { momentId, playbook: name, keep: [...keep], pieces });
          if (!res.ok || !res.json?.ok) { host.toast(String(res.json?.message ?? `${name} did not apply.`), true); failed = true; break; }
          const did = Number(res.json.created ?? 0) + Number(res.json.piecesCreated ?? 0);
          steps += Number(res.json.created ?? 0);
          rows += Number(res.json.piecesCreated ?? 0);
          for (const id of (res.json.createdIds ?? []) as string[]) made.push(id);
          const left = Number(res.json.remaining ?? 0) + Number(res.json.piecesRemaining ?? 0);
          if (!did || !left) break;
        }
        if (failed) break;
      }
      madeOn = momentId;
      await host.changed();
      pick.disabled = false;
      who.disabled = false;
      host.toast(steps || rows
        ? `${plural(steps, 'step')}${rows ? ` and ${plural(rows, 'row')}` : ''} created`
        : 'Nothing was created', !steps && !rows);
      drawAfter(steps, rows);
      void look();
    });

    function drawAfter(steps: number, rows: number) {
      after.replaceChildren();
      if (!steps && !rows) return;
      after.appendChild(el('p', 'pt-apply-done',
        `Done: ${plural(steps, 'step')}${rows ? ` and ${plural(rows, 'row')}` : ''} created.`
        + (admin ? '' : ' Anything that is Blueprint’s work is waiting for us to confirm it.')));
      if (!admin || !made.length) return;
      const undo = el('button', 'pt-btn', 'Undo this apply') as HTMLButtonElement;
      undo.type = 'button';
      undo.dataset.applyUndo = '1';
      undo.addEventListener('click', async () => {
        undo.disabled = true;
        const res = await host.apply(client, { momentId: madeOn, undo: [...made] });
        if (!res.ok || !res.json?.ok) { undo.disabled = false; host.toast('The undo did not go through.', true); return; }
        const kept = (res.json.kept ?? []) as Array<{ title: string; why: string }>;
        made.length = 0;
        await host.changed();
        after.replaceChildren();
        after.appendChild(el('p', 'pt-apply-done', `${plural(Number(res.json.removed ?? 0), 'step')} removed.`
          + (kept.length ? ` Left where ${kept.length === 1 ? 'it is' : 'they are'}: ${kept.map((k) => `${k.title} (${k.why})`).join('; ')}.` : '')));
        host.toast('Undone');
        void look();
      });
      after.appendChild(undo);
      after.appendChild(el('p', 'pt-sheet-note',
        'Undo removes only the steps this just made that are still Not Started with nothing begun. It is offered until this sheet is closed.'));
    }

    const done = el('button', 'pt-btn', 'Close');
    done.type = 'button';
    done.addEventListener('click', close);
    go.insertAdjacentElement('afterend', done);
    void icon;
    void switchClient();
  });
}
