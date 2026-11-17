/* ──────────────────────────────────────────────────────────────
   The Playbooks tab, on both screens.

   A playbook is a campaign in the abstract: steps placed by how many
   days they sit before or after a moment. HQ edits the masters and
   decides each client's exceptions. A client reads the playbooks as
   they will actually get them and can ask for a change.

   The two screens share how a timeline is drawn and nothing else,
   because they are doing different jobs:

     HQ        the master, editable; or the master with one client's
               approved overrides laid over it, with every override
               that client has, applied or not, listed beside it.
     Client    read-only, plain language, "You" or "Blueprint" on
               every step, and a way to say "I would change this".

   What an override does to a playbook is decided in
   src/data/playbooks.ts and nowhere else. This file draws the answer.
   Nothing here writes to Notion directly: every button calls the
   host's `send`, and the server checks it again.
   ────────────────────────────────────────────────────────────── */

import { STEP_FLOWS } from '../data/portal';
import {
  byPhase,
  effectivePlaybook,
  isRetiredPlaybook,
  playbooksOfPhase,
  retiredMasters,
  offsetLabel,
  overrideProblem,
  playbookNames,
  stepWho,
  CHANGE_TYPES,
  type ClientPlaybook,
  type ClientRequest,
  type EffectiveStep,
  type MasterStep,
  type PlaybookOverride,
} from '../data/playbooks';
import { shortDay, CONTENT_MEDIA } from '../data/portal-content';
import { isDeliverableFlow, pieceCount, MAX_PIECES, PRIORITIES } from '../data/pieces';
import { clear, el, icon } from './portal-dom';
import { openSheet, sheetField, sheetSubmit } from './portal-sheet';
import { openPlaybookUpdate } from './portal-playbook-update';
import { clientAuditCard, hqAuditPanel, type AuditInfo, type AuditRosterRow } from './portal-playbook-audit';

export interface Answer { ok: boolean; status: number; json: Record<string, any> | null }
export type Send = (method: 'GET' | 'POST' | 'PATCH', url: string, body?: unknown) => Promise<Answer>;

const sameId = (id: unknown): string => String(id ?? '').replace(/-/g, '').toLowerCase();

/** What the server said went wrong, in its own words where it has
 *  some, so the reason is on the screen and not in a log. */
function why(res: Answer, fallback: string): string {
  const detail = String(res.json?.detail ?? '').trim();
  if (detail) return detail;
  const rejected = res.json?.rejected;
  if (Array.isArray(rejected) && rejected.length) return `${fallback} (${rejected.join(', ')})`;
  return fallback;
}

function optionsInto(sel: HTMLSelectElement, opts: Array<[string, string]>, value: string) {
  for (const [v, text] of opts) {
    const o = el('option', undefined, text) as HTMLOptionElement;
    o.value = v;
    if (v === value) o.selected = true;
    sel.appendChild(o);
  }
}

/** The pills that pick a playbook, the same on both screens. */
function playbookPills(
  names: Array<{ name: string; count: number }>, current: string, pick: (name: string) => void,
): HTMLElement {
  const row = el('div', 'pt-pb-pills');
  row.setAttribute('role', 'tablist');
  row.setAttribute('aria-label', 'Playbooks');
  for (const p of names) {
    const on = p.name === current;
    const b = el('button', 'pt-pill' + (on ? ' pt-pill-on' : ''));
    b.type = 'button';
    b.dataset.playbook = p.name;
    b.setAttribute('role', 'tab');
    b.setAttribute('aria-selected', String(on));
    b.append(el('span', undefined, p.name), el('span', 'pt-pill-n pt-num', String(p.count)));
    b.addEventListener('click', () => pick(p.name));
    row.appendChild(b);
  }
  return row;
}

/* ══ HQ ════════════════════════════════════════════════════════ */

export interface HqPlaybooksHost {
  send: Send;
  clients: () => Array<{ pageId: string; slug: string; artist: string }>;
  /** A client's moments, for "apply to a moment". */
  moments: (slug: string) => Array<{ id: string; title: string; date: string | null }>;
  toast: (text: string, bad?: boolean) => void;
  today: () => string;
  /** Something on a calendar changed, so HQ's own data is stale. */
  calendarChanged: () => void;
}

export function createHqPlaybooks(host: HqPlaybooksHost): { draw: (root: HTMLElement) => void } {
  let ROOT: HTMLElement | null = null;
  let masters: MasterStep[] | null = null;
  let overrides: PlaybookOverride[] = [];
  /** The Playbook Audit: the general PDF and who has their own. */
  let audit: { general: AuditInfo | null; clients: AuditRosterRow[] } | null = null;
  let failed = false;
  let loading = false;
  let playbook = '';
  /** A Clients page id, or '' for the master as it is. */
  let clientId = '';
  /** The master step being edited in place, or 'new'. */
  let editing = '';
  /** Whether the Retired section is open. It starts closed. */
  let retiredOpen = false;

  const redraw = () => { if (ROOT?.isConnected) draw(ROOT); };

  async function load(force = false) {
    if (loading || (masters && !force)) return;
    loading = true;
    const res = await host.send('GET', '/portal/hq/playbooks');
    loading = false;
    if (res.ok && Array.isArray(res.json?.masters)) {
      masters = res.json!.masters as MasterStep[];
      overrides = (res.json!.overrides ?? []) as PlaybookOverride[];
      audit = (res.json!.audit ?? null) as typeof audit;
      failed = false;
    } else {
      failed = true;
    }
    redraw();
  }

  const clientName = () => host.clients().find((c) => sameId(c.pageId) === sameId(clientId))?.artist ?? '';
  const clientOverrides = () => overrides.filter((o) => sameId(o.clientId) === sameId(clientId));
  const masterOf = (id: string | null) => (masters ?? []).find((m) => sameId(m.id) === sameId(id)) ?? null;

  /* ── confirming a change to a master ──────────────────────────── */

  /** Every master write goes through this sentence. It is the only
   *  place in HQ where one click changes what every client gets. */
  function confirmMaster(title: string, lines: string[], cta: string, run: () => Promise<boolean>) {
    openSheet(title, (form, close) => {
      form.appendChild(el('p', 'pt-pb-warn',
        'This changes the playbook for every client, for future campaigns.'));
      for (const line of lines) form.appendChild(el('p', 'pt-sheet-note', line));
      form.appendChild(el('p', 'pt-sheet-note',
        'Campaigns already on a calendar keep the steps they have.'));
      const go = sheetSubmit(form, cta);
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        go.disabled = true;
        const ok = await run();
        go.disabled = false;
        if (ok) close();
      });
    });
  }

  /* ── editing a master step in place ───────────────────────────── */

  function stepForm(step: MasterStep | null): HTMLElement {
    const form = el('form', 'pt-pb-edit') as HTMLFormElement;
    const pb = (masters ?? []).filter((m) => m.playbook === playbook);
    const phases = [...new Set(pb.map((m) => m.phase).filter((x): x is string => !!x))];

    const title = el('input', 'pt-input') as HTMLInputElement;
    title.required = true;
    title.maxLength = 200;
    title.value = step?.title ?? '';
    title.placeholder = 'What happens';
    form.appendChild(sheetField('Title', title));

    const row = el('div', 'pt-pb-edit-row');
    const offset = el('input', 'pt-input pt-num') as HTMLInputElement;
    offset.type = 'number';
    offset.step = '1';
    offset.min = '-365';
    offset.max = '365';
    offset.required = true;
    offset.value = step?.offset === null || step?.offset === undefined ? '' : String(step.offset);
    const offWrap = sheetField('Offset in days', offset);
    const said = el('span', 'pt-pb-said');
    const say = () => { said.textContent = offset.value === '' ? 'negative is before the moment' : offsetLabel(Number(offset.value)); };
    offset.addEventListener('input', say);
    say();
    offWrap.appendChild(said);
    row.appendChild(offWrap);

    const flow = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
    optionsInto(flow, STEP_FLOWS.map((f) => [f, f] as [string, string]), step?.flow ?? STEP_FLOWS[0]);
    const flowWrap = sheetField('Flow', flow);
    const owner = el('span', 'pt-pb-said');
    const sayOwner = () => { owner.textContent = `Owner: ${stepWho({ flow: flow.value, owner: null }) === 'You' ? 'Client' : 'Blueprint'}`; };
    flow.addEventListener('change', sayOwner);
    sayOwner();
    flowWrap.appendChild(owner);
    row.appendChild(flowWrap);

    const phase = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
    optionsInto(phase, phases.map((p) => [p, p] as [string, string]), step?.phase ?? phases[0] ?? '');
    row.appendChild(sheetField('Phase', phase));
    form.appendChild(row);

    // What the step says about the piece it owes. Only a step that
    // posts something owes one, so the three sit out of sight until
    // the Flow says it does.
    const owes = el('div', 'pt-pb-edit-row pt-pb-owes');
    const priority = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
    optionsInto(priority, [['', 'Not set'], ...PRIORITIES.map((p) => [p, p] as [string, string])], step?.priority ?? '');
    const prWrap = sheetField('Priority', priority);
    prWrap.appendChild(el('span', 'pt-pb-said', 'Core is never trimmed'));
    const media = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
    optionsInto(media, [['', 'Not set'], ...CONTENT_MEDIA.map((m) => [m, m] as [string, string])], step?.defaultMedia ?? '');
    const mdWrap = sheetField('Default media', media);
    const count = el('input', 'pt-input pt-num') as HTMLInputElement;
    count.type = 'number';
    count.step = '1';
    count.min = '1';
    count.max = String(MAX_PIECES);
    count.placeholder = '1';
    count.value = step?.pieces ? String(step.pieces) : '';
    const ctWrap = sheetField('Pieces', count);
    const ctSaid = el('span', 'pt-pb-said');
    const sayCount = () => {
      const n = count.value === '' ? 1 : Number(count.value);
      ctSaid.textContent = n === 3 ? 'feed clip, IG story, event banner' : n > 1 ? `${n} rows, numbered` : 'blank is one';
    };
    count.addEventListener('input', sayCount);
    sayCount();
    ctWrap.appendChild(ctSaid);
    owes.append(prWrap, mdWrap, ctWrap);
    form.appendChild(owes);
    const showOwes = () => { owes.hidden = !isDeliverableFlow(flow.value); };
    flow.addEventListener('change', showOwes);
    showOwes();

    const brief = el('textarea', 'pt-input pt-textarea') as HTMLTextAreaElement;
    brief.rows = 3;
    brief.maxLength = 2000;
    brief.value = step?.brief ?? '';
    brief.placeholder = 'How to make it. The client reads this on the step and on the piece.';
    form.appendChild(sheetField('Brief', brief));

    // A step that is a question. Ticked, the client's card for it gets
    // a box to write the answer in, above the tick.
    const asksWrap = el('label', 'pt-pb-asks');
    const asks = el('input') as HTMLInputElement;
    asks.type = 'checkbox';
    asks.checked = !!step?.asksNotes;
    asksWrap.append(asks, el('span', undefined,
      'Ask the client for notes on this step. Their card gets a box to write in before they tick it.'));
    form.appendChild(asksWrap);

    const notes = el('textarea', 'pt-input pt-textarea') as HTMLTextAreaElement;
    notes.rows = 2;
    notes.maxLength = 2000;
    notes.value = step?.notes ?? '';
    notes.placeholder = 'Notes for us. Never shown to a client.';
    form.appendChild(sheetField('Notes', notes));

    const acts = el('div', 'pt-pb-edit-acts');
    const save = el('button', 'pt-btn pt-btn-primary', step ? 'Save' : 'Add the step') as HTMLButtonElement;
    save.type = 'submit';
    const cancel = el('button', 'pt-btn', 'Cancel');
    cancel.type = 'button';
    cancel.addEventListener('click', () => { editing = ''; redraw(); });
    acts.append(save, cancel);
    if (step) {
      const arch = el('button', 'pt-btn pt-pb-danger', 'Archive this step');
      arch.type = 'button';
      arch.addEventListener('click', () => {
        confirmMaster('Archive this step?', [`"${step.title}" leaves ${step.playbook}.`], 'Archive it', async () => {
          const res = await host.send('PATCH', `/portal/hq/playbooks/step/${step.id}`, { archive: true });
          if (!res.ok) { host.toast(why(res, 'That did not save.'), true); return false; }
          masters = (masters ?? []).filter((m) => m.id !== step.id);
          editing = '';
          host.toast('Archived');
          redraw();
          return true;
        });
      });
      acts.append(el('span', 'pt-toolbar-spacer'), arch);
    }
    form.appendChild(acts);

    form.addEventListener('submit', (ev) => {
      ev.preventDefault();
      // A step that delivers nothing carries none of the three.
      const delivers = isDeliverableFlow(flow.value);
      const nPieces = count.value === '' ? null : Number(count.value);
      if (delivers && nPieces !== null && (!Number.isInteger(nPieces) || nPieces < 1 || nPieces > MAX_PIECES)) {
        count.focus();
        return;
      }
      const next = {
        title: title.value.trim(), offset: Number(offset.value), flow: flow.value,
        phase: phase.value, notes: notes.value.trim() || null,
        brief: brief.value.trim() || null,
        asksNotes: asks.checked,
        priority: delivers ? priority.value || null : null,
        defaultMedia: delivers ? media.value || null : null,
        pieces: delivers ? nPieces : null,
      };
      if (!next.title) { title.focus(); return; }
      if (offset.value === '' || !Number.isInteger(next.offset)) { offset.focus(); return; }

      if (!step) {
        confirmMaster('Add a step to this playbook?',
          [`"${next.title}", ${offsetLabel(next.offset).toLowerCase()}, in ${playbook}.`], 'Add it for everyone',
          async () => {
            const res = await host.send('POST', '/portal/hq/playbooks/step', { ...next, playbook });
            if (!res.ok || !res.json?.step) { host.toast(why(res, 'That did not save.'), true); return false; }
            masters = [...(masters ?? []), res.json.step as MasterStep];
            editing = '';
            host.toast('Added');
            redraw();
            return true;
          });
        return;
      }

      // Only what changed is sent, and only what changed is confirmed.
      const patch: Record<string, unknown> = {};
      const lines: string[] = [];
      if (next.title !== step.title) { patch.title = next.title; lines.push(`Title: "${step.title}" becomes "${next.title}".`); }
      if (next.offset !== step.offset) { patch.offset = next.offset; lines.push(`Timing: ${offsetLabel(step.offset).toLowerCase()} becomes ${offsetLabel(next.offset).toLowerCase()}.`); }
      if (next.flow !== step.flow) { patch.flow = next.flow; lines.push(`Flow: ${step.flow ?? 'none'} becomes ${next.flow}. Owner follows it.`); }
      if (next.phase !== step.phase) { patch.phase = next.phase; lines.push(`Phase: ${step.phase ?? 'none'} becomes ${next.phase}.`); }
      if ((next.notes ?? '') !== (step.notes ?? '')) { patch.notes = next.notes; lines.push('Notes are updated.'); }
      if ((next.brief ?? '') !== (step.brief ?? '')) { patch.brief = next.brief; lines.push('The brief is updated. Clients see it on new campaigns.'); }
      if (next.asksNotes !== !!step.asksNotes) {
        patch.asksNotes = next.asksNotes;
        lines.push(next.asksNotes
          ? 'Clients are asked for notes on this step, on new campaigns.'
          : 'Clients are no longer asked for notes on this step, on new campaigns. Notes already written are kept.');
      }
      if (next.priority !== (step.priority ?? null)) { patch.priority = next.priority; lines.push(`Priority: ${step.priority ?? 'not set'} becomes ${next.priority ?? 'not set'}.`); }
      if (next.defaultMedia !== (step.defaultMedia ?? null)) { patch.defaultMedia = next.defaultMedia; lines.push(`Default media: ${step.defaultMedia ?? 'not set'} becomes ${next.defaultMedia ?? 'not set'}.`); }
      if (next.pieces !== (step.pieces ?? null)) { patch.pieces = next.pieces; lines.push(`Pieces: ${pieceCount(step.pieces ?? null)} becomes ${pieceCount(next.pieces)}.`); }
      if (patch.priority !== undefined || patch.defaultMedia !== undefined || patch.pieces !== undefined) {
        lines.push('Steps already on a client\u2019s calendar keep what they have.');
      }
      if (!lines.length) { editing = ''; redraw(); return; }
      confirmMaster('Change this step?', lines, 'Change it for everyone', async () => {
        const res = await host.send('PATCH', `/portal/hq/playbooks/step/${step.id}`, patch);
        if (!res.ok || !res.json?.step) { host.toast(why(res, 'That did not save.'), true); return false; }
        masters = (masters ?? []).map((m) => (m.id === step.id ? res.json!.step as MasterStep : m));
        editing = '';
        host.toast('Saved');
        redraw();
        return true;
      });
    });
    return form;
  }

  /* ── an override, created or edited ───────────────────────────── */

  function overrideSheet(existing: PlaybookOverride | null, seed: Partial<PlaybookOverride> = {}) {
    const base = { ...(existing ?? {}), ...seed } as Partial<PlaybookOverride>;
    const forClient = existing?.clientId ?? clientId;
    const who = host.clients().find((c) => sameId(c.pageId) === sameId(forClient))?.artist ?? 'this client';
    const pbName = base.playbook ?? masterOf(base.masterStepId ?? null)?.playbook ?? playbook;
    const steps = (masters ?? []).filter((m) => m.playbook === pbName)
      .sort((a, b) => (a.offset ?? 0) - (b.offset ?? 0));

    openSheet(existing ? 'Set the change' : `Override for ${who}`, (form, close) => {
      if (existing?.requestedBy === 'Client' && existing.reason) {
        const q = el('div', 'pt-pb-quote');
        q.append(el('span', 'pt-rcard-lab', `${who} asked`), el('p', undefined, existing.reason));
        form.appendChild(q);
      }

      const type = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
      optionsInto(type, [['', 'Pick the kind of change'], ...CHANGE_TYPES.map((t) => [t, t] as [string, string])],
        base.changeType ?? '');
      form.appendChild(sheetField('Change', type));

      const step = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
      optionsInto(step, [['', 'Pick the step'],
        ...steps.map((m) => [m.id, `${offsetLabel(m.offset)} · ${m.title}`] as [string, string])],
        steps.find((m) => sameId(m.id) === sameId(base.masterStepId))?.id ?? '');
      const stepWrap = sheetField('Step', step);
      form.appendChild(stepWrap);

      const title = el('input', 'pt-input') as HTMLInputElement;
      title.maxLength = 200;
      title.value = base.newTitle ?? '';
      const titleWrap = sheetField('New wording', title);
      form.appendChild(titleWrap);

      const offset = el('input', 'pt-input pt-num') as HTMLInputElement;
      offset.type = 'number';
      offset.step = '1';
      offset.min = '-365';
      offset.max = '365';
      offset.value = base.newOffset === null || base.newOffset === undefined ? '' : String(base.newOffset);
      const offWrap = sheetField('New offset in days', offset);
      const said = el('span', 'pt-pb-said');
      offWrap.appendChild(said);
      form.appendChild(offWrap);

      const flow = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
      optionsInto(flow, [['', 'Pick a flow'], ...STEP_FLOWS.map((f) => [f, f] as [string, string])], base.newFlow ?? '');
      const flowWrap = sheetField('New flow', flow);
      form.appendChild(flowWrap);

      const reason = el('textarea', 'pt-input pt-textarea') as HTMLTextAreaElement;
      reason.rows = 3;
      reason.maxLength = 2000;
      reason.value = base.reason ?? '';
      reason.placeholder = 'Why this client is different';
      form.appendChild(sheetField('Reason', reason));

      // Only the fields this kind of change uses are on screen.
      const sync = () => {
        const t = type.value;
        stepWrap.hidden = t === 'Add step' || !t;
        titleWrap.hidden = !(t === 'Reword' || t === 'Add step');
        (titleWrap.querySelector('label') as HTMLElement).textContent = t === 'Add step' ? 'Title of the new step' : 'New wording';
        offWrap.hidden = !(t === 'Shift timing' || t === 'Add step');
        flowWrap.hidden = !(t === 'Reassign' || t === 'Add step');
        (flowWrap.querySelector('label') as HTMLElement).textContent = t === 'Add step' ? 'Who does it' : 'New flow';
        const m = masterOf(step.value || null);
        said.textContent = offset.value === ''
          ? (m && t === 'Shift timing' ? `The master has it ${offsetLabel(m.offset).toLowerCase()}.` : 'negative is before the moment')
          : `${offsetLabel(Number(offset.value))}${m && t === 'Shift timing' ? `. The master has it ${offsetLabel(m.offset).toLowerCase()}.` : ''}`;
      };
      for (const n of [type, step, offset]) n.addEventListener('input', sync);
      sync();

      const read = () => {
        const t = type.value;
        const m = masterOf(step.value || null);
        const usesStep = t && t !== 'Add step';
        const usesTitle = t === 'Reword' || t === 'Add step';
        const usesOffset = t === 'Shift timing' || t === 'Add step';
        const usesFlow = t === 'Reassign' || t === 'Add step';
        const body: Record<string, unknown> = {
          changeType: t || undefined,
          masterStepId: usesStep ? (step.value || null) : null,
          newTitle: usesTitle ? (title.value.trim() || null) : null,
          newOffset: usesOffset && offset.value !== '' ? Number(offset.value) : null,
          newFlow: usesFlow ? (flow.value || null) : null,
          reason: reason.value.trim() || null,
          playbook: m?.playbook ?? pbName,
        };
        if (!t) delete body.changeType;
        // A sentence for the row's own title, so the Notion board reads.
        const subject = t === 'Add step' ? (title.value.trim() || 'a new step') : (m?.title ?? 'a step');
        body.change = (existing?.requestedBy === 'Client' ? existing.change : '')
          || `${t || 'Change'}: ${subject}`.slice(0, 200);
        return body;
      };

      const row = el('div', 'pt-sheet-foot pt-pb-sheet-acts');
      const draft = el('button', 'pt-btn', existing ? 'Save' : 'Save as draft') as HTMLButtonElement;
      draft.type = 'button';
      const approve = el('button', 'pt-btn pt-btn-primary', existing ? 'Save and approve' : 'Approve now') as HTMLButtonElement;
      approve.type = 'submit';
      row.append(draft, approve);
      form.appendChild(row);

      const submit = async (status: string | null) => {
        const body = read();
        if (status) body.status = status;
        draft.disabled = approve.disabled = true;
        const res = existing
          ? await host.send('PATCH', `/portal/hq/playbooks/override/${existing.id}`, body)
          : await host.send('POST', '/portal/hq/playbooks/override', { ...body, clientId: forClient, status: status ?? 'Draft' });
        draft.disabled = approve.disabled = false;
        if (!res.ok || !res.json?.override) { host.toast(why(res, 'That did not save.'), true); return; }
        const saved = res.json.override as PlaybookOverride;
        overrides = existing ? overrides.map((o) => (o.id === saved.id ? saved : o)) : [...overrides, saved];
        host.toast(status === 'Approved' ? 'Approved. Future campaigns get it.' : 'Saved');
        close();
        redraw();
      };
      draft.addEventListener('click', () => { void submit(null); });
      form.addEventListener('submit', (ev) => { ev.preventDefault(); void submit('Approved'); });
    });
  }

  async function setStatus(o: PlaybookOverride, status: string) {
    const res = await host.send('PATCH', `/portal/hq/playbooks/override/${o.id}`, { status });
    if (!res.ok || !res.json?.override) { host.toast(why(res, 'That did not save.'), true); return; }
    overrides = overrides.map((x) => (x.id === o.id ? res.json!.override as PlaybookOverride : x));
    host.toast(status === 'Approved' ? 'Approved. Future campaigns get it.' : status);
    redraw();
  }

  function deleteOverride(o: PlaybookOverride) {
    openSheet('Delete this override?', (form, close) => {
      form.appendChild(el('p', 'pt-sheet-note', `"${o.change}" is removed. It is not applied to anything, so nothing else changes.`));
      const go = sheetSubmit(form, 'Delete it');
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        go.disabled = true;
        const res = await host.send('PATCH', `/portal/hq/playbooks/override/${o.id}`, { archive: true });
        go.disabled = false;
        if (!res.ok) { host.toast(why(res, 'That did not delete.'), true); return; }
        overrides = overrides.filter((x) => x.id !== o.id);
        host.toast('Deleted');
        close();
        redraw();
      });
    });
  }

  /** "Apply to open steps in upcoming moments": shown first, written
   *  only when the list has been read. */
  async function applyToOpen(o: PlaybookOverride) {
    const dry = await host.send('POST', `/portal/hq/playbooks/override/${o.id}/apply`, { dryRun: true });
    if (!dry.ok) { host.toast(why(dry, 'Could not work out what that would change.'), true); return; }
    const writes = (dry.json?.writes ?? []) as Array<{ moment: string; step: string; says: string }>;
    openSheet('Apply to campaigns already running', (form, close) => {
      if (!writes.length) {
        form.appendChild(el('p', 'pt-sheet-note',
          'There is nothing to change: no open step on an upcoming moment matches this override.'));
        const ok = sheetSubmit(form, 'Close');
        form.addEventListener('submit', (ev) => { ev.preventDefault(); close(); });
        ok.focus();
        return;
      }
      form.appendChild(el('p', 'pt-sheet-note',
        `${writes.length} open step${writes.length === 1 ? '' : 's'} on upcoming moments would change. `
        + 'Steps that are done, skipped or moved by hand are left alone.'));
      const list = el('ul', 'pt-pb-writes');
      for (const w of writes) {
        const li = el('li');
        li.append(el('strong', undefined, w.moment), el('span', undefined, ` · ${w.step} ${w.says}`));
        list.appendChild(li);
      }
      form.appendChild(list);
      const go = sheetSubmit(form, `Apply to ${writes.length} step${writes.length === 1 ? '' : 's'}`);
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        go.disabled = true;
        const res = await host.send('POST', `/portal/hq/playbooks/override/${o.id}/apply`, {});
        go.disabled = false;
        if (!res.ok) { host.toast(why(res, 'That did not apply.'), true); return; }
        const left = Number(res.json?.remaining ?? 0);
        host.toast(left ? `${res.json?.done} changed, ${left} to go. Run it again.` : `${res.json?.done} step${res.json?.done === 1 ? '' : 's'} changed`);
        host.calendarChanged();
        close();
      });
    });
  }

  /** Put this playbook on one of the client's moments, as they get it. */
  function applyToMoment() {
    const client = host.clients().find((c) => sameId(c.pageId) === sameId(clientId));
    if (!client) return;
    const today = host.today();
    const moments = host.moments(client.slug)
      .filter((m) => !!m.date && m.date.slice(0, 10) >= today)
      .sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''));
    openSheet(`Apply ${playbook} to a moment`, (form, close) => {
      if (!moments.length) {
        form.appendChild(el('p', 'pt-sheet-note', `${client.artist} has no upcoming moment to put it on.`));
        return;
      }
      const pick = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
      optionsInto(pick, moments.map((m) => [m.id, `${m.title} · ${shortDay(m.date)}`] as [string, string]), moments[0].id);
      form.appendChild(sheetField('Moment', pick));
      const preview = el('div', 'pt-pb-preview');
      form.appendChild(preview);
      const go = sheetSubmit(form, 'Create the steps');
      go.disabled = true;
      let count = 0;
      let pieceTotal = 0;

      const look = async () => {
        go.disabled = true;
        clear(preview);
        preview.appendChild(el('p', 'pt-sheet-note', 'Working out the steps…'));
        const res = await host.send('POST', '/portal/hq/playbooks/apply',
          { clientId, momentId: pick.value, playbook, dryRun: true });
        clear(preview);
        if (!res.ok) { preview.appendChild(el('p', 'pt-pb-warn', why(res, 'Could not plan that.'))); return; }
        const steps = (res.json?.steps ?? []) as Array<{ title: string; date: string | null; pieces?: number }>;
        count = steps.length;
        pieceTotal = Number(res.json?.pieceCount ?? 0);
        const facts: string[] = [`${count} step${count === 1 ? '' : 's'} would be created, dated from the moment.`];
        if (pieceTotal) {
          facts.push(`${pieceTotal} piece${pieceTotal === 1 ? '' : 's'} would be created in the Content Pipeline with them, `
            + 'one for every step we post, Planned and dated the same day.');
        }
        const changed = (res.json?.changed ?? []) as string[];
        const skipped = (res.json?.skipped ?? []) as string[];
        if (changed.length) facts.push(`${changed.length} carry ${client.artist}'s approved overrides: ${changed.join('; ')}.`);
        if (skipped.length) facts.push(`${skipped.length} left out by an approved skip: ${skipped.join('; ')}.`);
        if (res.json?.alreadyThere) facts.push(`${res.json.alreadyThere} already on this moment under the same title, so not doubled.`);
        for (const f of facts) preview.appendChild(el('p', 'pt-sheet-note', f));
        const list = el('ul', 'pt-pb-writes');
        for (const s of steps) {
          const li = el('li');
          li.append(el('strong', 'pt-num', s.date ? shortDay(s.date) : 'no date'), el('span', undefined, ` · ${s.title}`));
          if (s.pieces) li.appendChild(el('span', 'pt-pb-owed', s.pieces === 1 ? ' · 1 piece' : ` · ${s.pieces} pieces`));
          list.appendChild(li);
        }
        preview.appendChild(list);
        go.disabled = count === 0 && pieceTotal === 0;
        go.textContent = count
          ? `Create ${count} step${count === 1 ? '' : 's'}${pieceTotal ? ` and ${pieceTotal} piece${pieceTotal === 1 ? '' : 's'}` : ''}`
          : pieceTotal ? `Create ${pieceTotal} missing piece${pieceTotal === 1 ? '' : 's'}` : 'Nothing to create';
      };
      pick.addEventListener('change', () => { void look(); });
      void look();

      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        if (!count && !pieceTotal) return;
        go.disabled = true;
        pick.disabled = true;
        // One request writes a limited number of rows and says what is
        // left, so this asks until nothing is. A round that writes
        // nothing ends it, rather than asking forever.
        let steps = 0, pieces = 0, left = count + pieceTotal;
        for (let round = 0; round < 12 && left > 0; round++) {
          go.textContent = `Creating\u2026 ${steps} of ${count} steps, ${pieces} of ${pieceTotal} pieces`;
          const res = await host.send('POST', '/portal/hq/playbooks/apply', { clientId, momentId: pick.value, playbook });
          if (!res.ok) { host.toast(why(res, 'That did not apply.'), true); break; }
          const made = Number(res.json?.created ?? 0) + Number(res.json?.piecesCreated ?? 0);
          steps += Number(res.json?.created ?? 0);
          pieces += Number(res.json?.piecesCreated ?? 0);
          left = Number(res.json?.remaining ?? 0) + Number(res.json?.piecesRemaining ?? 0);
          if (!made) break;
        }
        go.disabled = false;
        pick.disabled = false;
        host.toast(left
          ? `${steps} steps and ${pieces} pieces created, ${left} still to go. Run it again.`
          : `${steps} step${steps === 1 ? '' : 's'} and ${pieces} piece${pieces === 1 ? '' : 's'} created`, left > 0);
        host.calendarChanged();
        close();
      });
    });
  }

  /* ── the overrides panel ──────────────────────────────────────── */

  function overrideRow(o: PlaybookOverride): HTMLElement {
    const li = el('li', 'pt-pb-ov');
    li.dataset.override = o.id;
    li.dataset.status = o.status ?? '';
    const head = el('div', 'pt-pb-ov-head');
    head.appendChild(el('span', `pt-tag pt-pb-st-${(o.status ?? 'none').toLowerCase()}`, o.status ?? 'No status'));
    if (o.changeType) head.appendChild(el('span', 'pt-tag', o.changeType));
    if (o.playbook) head.appendChild(el('span', 'pt-tag', o.playbook));
    if (o.requestedBy === 'Client') head.appendChild(el('span', 'pt-tag pt-tag-todo', 'Asked by the client'));
    li.appendChild(head);
    li.appendChild(el('p', 'pt-pb-ov-title', o.change || 'Untitled change'));

    const m = masterOf(o.masterStepId);
    const says: string[] = [];
    if (m) says.push(`Step: ${m.title} (${offsetLabel(m.offset).toLowerCase()} in the master)`);
    if (o.changeType === 'Shift timing' && o.newOffset !== null) says.push(`becomes ${offsetLabel(o.newOffset).toLowerCase()}`);
    if (o.changeType === 'Reassign' && o.newFlow) says.push(`becomes ${o.newFlow}`);
    if (o.changeType === 'Reword' && o.newTitle) says.push(`becomes "${o.newTitle}"`);
    if (o.changeType === 'Add step') says.push(`"${o.newTitle ?? ''}", ${offsetLabel(o.newOffset).toLowerCase()}, ${o.newFlow ?? 'no flow'}`);
    if (says.length) li.appendChild(el('p', 'pt-pb-ov-says', says.join(', ')));
    if (o.reason) li.appendChild(el('p', 'pt-pb-ov-reason', o.reason));

    const problem = overrideProblem(o);
    const acts = el('div', 'pt-pb-ov-acts');
    const button = (text: string, run: () => void, cls = 'pt-btn') => {
      const b = el('button', cls, text) as HTMLButtonElement;
      b.type = 'button';
      b.addEventListener('click', run);
      acts.appendChild(b);
      return b;
    };
    if (o.status === 'Approved') {
      li.appendChild(el('p', 'pt-pb-ov-applied',
        problem ? `Approved, but it does nothing yet: ${problem}` : 'Applied to the timeline, and to any playbook put on a moment from now on.'));
      if (!problem) button('Apply to open steps in upcoming moments', () => { void applyToOpen(o); }, 'pt-btn pt-btn-primary');
      button('Edit', () => overrideSheet(o));
      button('Switch off', () => { void setStatus(o, 'Declined'); });
    } else {
      li.appendChild(el('p', 'pt-pb-ov-applied pt-pb-ov-off', 'Not applied.'));
      if (problem) {
        button(o.requestedBy === 'Client' ? 'Set the change' : 'Finish it', () => overrideSheet(o), 'pt-btn pt-btn-primary');
        acts.appendChild(el('span', 'pt-pb-ov-why', problem));
      } else {
        button('Approve', () => { void setStatus(o, 'Approved'); }, 'pt-btn pt-btn-primary');
        button('Edit', () => overrideSheet(o));
      }
      if (o.status !== 'Declined') button('Decline', () => { void setStatus(o, 'Declined'); });
      button('Delete', () => deleteOverride(o), 'pt-btn pt-pb-danger');
    }
    li.appendChild(acts);
    return li;
  }

  function overridesPanel(): HTMLElement {
    const all = clientOverrides();
    const panel = el('section', 'pt-pb-panel');
    const head = el('div', 'pt-pb-panel-head');
    head.appendChild(el('h2', undefined, `${clientName()}'s overrides`));
    head.appendChild(el('span', 'pt-toolbar-spacer'));
    const apply = el('button', 'pt-btn', `Apply ${playbook} to a moment`);
    apply.type = 'button';
    apply.addEventListener('click', applyToMoment);
    // Retired steps are kept to be read, not run.
    apply.hidden = isRetiredPlaybook(playbook);
    // The other direction: campaigns already running, brought up to
    // the playbooks as they are now. A dry run first, always.
    const update = el('button', 'pt-btn', 'Update campaigns to current playbook');
    update.type = 'button';
    update.dataset.updateCampaigns = '1';
    update.addEventListener('click', () => openPlaybookUpdate(
      { send: host.send, toast: host.toast, changed: () => host.calendarChanged() },
      { pageId: clientId, name: clientName() }));
    head.appendChild(update);
    const add = el('button', 'pt-btn pt-btn-primary');
    add.type = 'button';
    add.append(icon('plus'), el('span', undefined, 'Override'));
    add.addEventListener('click', () => overrideSheet(null));
    head.append(apply, add);
    panel.appendChild(head);

    const group = (title: string, note: string, rows: PlaybookOverride[], key: string) => {
      const sec = el('div', 'pt-pb-group');
      sec.dataset.group = key;
      const h = el('div', 'pt-pb-group-head');
      h.append(el('h3', undefined, title), el('span', 'pt-board-count pt-num', String(rows.length)));
      sec.appendChild(h);
      if (!rows.length) { sec.appendChild(el('p', 'pt-pb-none', note)); panel.appendChild(sec); return; }
      const list = el('ul', 'pt-pb-ovs');
      for (const o of rows) list.appendChild(overrideRow(o));
      sec.appendChild(list);
      panel.appendChild(sec);
    };
    group('Inbox', 'Nothing waiting on you.', all.filter((o) => o.status === 'Requested'), 'requested');
    group('Approved', 'No approved overrides, so this client gets the master as it is.',
      all.filter((o) => o.status === 'Approved'), 'approved');
    group('Not applied', 'No drafts.', all.filter((o) => o.status !== 'Requested' && o.status !== 'Approved'), 'off');
    return panel;
  }

  /* ── the timeline ─────────────────────────────────────────────── */

  function stepRow(s: EffectiveStep): HTMLElement {
    const li = el('li', 'pt-pb-step');
    li.dataset.step = s.key;
    if (s.skipped) li.dataset.skipped = 'true';
    if (s.added) li.dataset.added = 'true';
    if (s.overrideIds.length) li.dataset.changed = 'true';

    const master = masterOf(s.masterId);
    if (!clientId && master && editing === master.id) {
      li.classList.add('pt-pb-step-editing');
      li.appendChild(stepForm(master));
      return li;
    }

    // A value an override changed says what the master has on hover,
    // and in words for anyone not using a mouse.
    const mark = (node: HTMLElement, was: string | null | undefined, label: string) => {
      if (was === undefined) return node;
      node.classList.add('pt-pb-changed');
      node.title = `Master: ${was ?? 'none'}`;
      node.setAttribute('aria-label', `${node.textContent}. ${label} in the master: ${was ?? 'none'}`);
      return node;
    };

    li.appendChild(mark(el('span', 'pt-pb-when pt-num', offsetLabel(s.offset)),
      'offset' in s.was ? offsetLabel(s.was.offset ?? null) : undefined, 'Timing'));

    const main = el('div', 'pt-pb-main');
    main.appendChild(mark(el('span', 'pt-pb-title', s.title), s.was.title, 'Title'));
    if (s.brief) main.appendChild(el('span', 'pt-pb-brief', s.brief));
    if (s.asksNotes) main.appendChild(el('span', 'pt-pb-notes', 'Asks the client for notes.'));
    if (s.notes) main.appendChild(el('span', 'pt-pb-notes', s.notes));
    li.appendChild(main);

    const tags = el('div', 'pt-pb-tags');
    if (s.skipped) tags.appendChild(el('span', 'pt-tag pt-pb-st-declined', `Skipped for ${clientName()}`));
    if (s.added) tags.appendChild(el('span', 'pt-tag pt-pb-st-approved', `Added for ${clientName()}`));
    if (s.flow) tags.appendChild(mark(el('span', 'pt-tag pt-tag-flow', s.flow), s.was.flow, 'Flow'));
    if (s.type) tags.appendChild(el('span', 'pt-tag', s.type));
    // What the step owes, on a step that owes something.
    if (isDeliverableFlow(s.flow)) {
      if (s.priority) {
        const pr = el('span', 'pt-tag pt-pb-priority', s.priority);
        pr.dataset.priority = s.priority;
        tags.appendChild(pr);
      } else if (!s.added) {
        tags.appendChild(el('span', 'pt-tag pt-pb-unset', 'No priority'));
      }
      const n = pieceCount(s.pieces);
      if (s.defaultMedia || n > 1) {
        tags.appendChild(el('span', 'pt-tag pt-pb-media',
          n > 1 ? `${n} pieces` : s.defaultMedia as string));
      }
    }
    li.appendChild(tags);

    const act = el('button', 'pt-pb-act');
    act.type = 'button';
    if (clientId) {
      act.textContent = 'Override';
      act.setAttribute('aria-label', `Override ${s.title} for ${clientName()}`);
      act.addEventListener('click', () => overrideSheet(null, { masterStepId: s.masterId, playbook: s.playbook }));
      if (!s.masterId) act.hidden = true;
    } else {
      act.textContent = 'Edit';
      act.setAttribute('aria-label', `Edit ${s.title}`);
      act.addEventListener('click', () => { editing = s.masterId ?? ''; redraw(); });
    }
    li.appendChild(act);
    return li;
  }

  function timeline(): HTMLElement {
    const steps = effectivePlaybook(masters ?? [], overrides, playbook, clientId || null);
    const wrap = el('div', 'pt-pb-timeline');
    for (const g of byPhase(steps)) {
      const sec = el('section', 'pt-pb-phase');
      const h = el('div', 'pt-pb-phase-head');
      h.append(el('h3', undefined, g.phase), el('span', 'pt-board-count pt-num', String(g.steps.length)));
      sec.appendChild(h);
      const list = el('ol', 'pt-pb-steps');
      for (const s of g.steps) list.appendChild(stepRow(s));
      sec.appendChild(list);
      wrap.appendChild(sec);
    }
    if (!clientId) {
      if (editing === 'new') {
        const box = el('div', 'pt-pb-step pt-pb-step-editing');
        box.appendChild(stepForm(null));
        wrap.appendChild(box);
      } else {
        const add = el('button', 'pt-btn pt-pb-addstep');
        add.type = 'button';
        add.append(icon('plus'), el('span', undefined, `Add a step to ${playbook}`));
        add.addEventListener('click', () => { editing = 'new'; redraw(); });
        wrap.appendChild(add);
      }
    }
    return wrap;
  }

  function draw(root: HTMLElement) {
    ROOT = root;
    clear(root);
    const bar = el('div', 'pt-toolbar');
    bar.appendChild(el('h1', undefined, 'Playbooks'));
    bar.appendChild(el('p', 'pt-sub', 'The plan every campaign starts from, and where each client differs from it.'));
    root.appendChild(bar);

    if (!masters) {
      root.appendChild(el('p', 'pt-pb-none', failed
        ? 'The playbooks did not load. Check the connection and open this tab again.'
        : 'Loading the playbooks…'));
      if (!failed) void load();
      else failed = false;
      return;
    }

    // The reference card: why the playbooks are built this way. It
    // sits above the playbooks and changes nothing below it.
    root.appendChild(hqAuditPanel(audit?.general ?? null, audit?.clients ?? [],
      { toast: host.toast, changed: () => { void load(true); } }));

    const names = playbookNames(masters);
    if (!names.includes(playbook)) playbook = names[0] ?? '';

    const pickRow = el('div', 'pt-pb-who');
    const sel = el('select', 'pt-select') as HTMLSelectElement;
    sel.setAttribute('aria-label', 'Show the playbook as a client gets it');
    sel.dataset.pbClient = '1';
    optionsInto(sel, [['', 'The master, as it is'],
      ...host.clients().map((c) => [c.pageId, `As ${c.artist} gets it`] as [string, string])], clientId);
    sel.addEventListener('change', () => { clientId = sel.value; editing = ''; redraw(); });
    pickRow.append(el('span', 'pt-whobar-label', 'Showing'), sel);
    if (clientId) {
      const n = clientOverrides().filter((o) => o.status === 'Requested').length;
      if (n) pickRow.appendChild(el('span', 'pt-tag pt-tag-todo', `${n} request${n === 1 ? '' : 's'} waiting`));
    }
    root.appendChild(pickRow);

    root.appendChild(playbookPills(
      names.map((name) => ({ name, count: masters!.filter((m) => m.playbook === name).length })),
      playbook, (name) => { playbook = name; editing = ''; redraw(); }));

    const body = el('div', clientId ? 'pt-pb-body pt-pb-body-split' : 'pt-pb-body');
    body.appendChild(timeline());
    if (clientId) body.appendChild(overridesPanel());
    root.appendChild(body);
    // The masters as they are, and only there: a client's version of
    // a playbook has nothing retired in it to show.
    if (!clientId) {
      const menu = retiredSection();
      if (menu) root.appendChild(menu);
    }
  }

  /**
   * Retired / menu.
   *
   * Steps taken out of a playbook without being thrown away: never
   * applied, never shown inside a playbook, and here to be read and
   * put back. Closed until asked for, because it is a cupboard and
   * not part of the plan.
   */
  function retiredSection(): HTMLElement | null {
    const retired = retiredMasters(masters ?? []);
    if (!retired.length) return null;
    const names = playbookNames(masters ?? []);
    const box = el('details', 'pt-pb-retired') as HTMLDetailsElement;
    box.dataset.retired = '1';
    box.open = retiredOpen;
    box.addEventListener('toggle', () => { retiredOpen = box.open; });
    const sum = el('summary', 'pt-pb-retired-head');
    sum.append(el('span', undefined, 'Retired / menu'),
      el('span', 'pt-board-count pt-num', String(retired.length)),
      el('span', 'pt-pb-retired-note', 'Kept to pick from. Never applied to a campaign.'));
    box.appendChild(sum);
    const list = el('ol', 'pt-pb-steps');
    for (const m of retired) {
      const li = el('li', 'pt-pb-step pt-pb-step-retired');
      li.dataset.step = m.id;
      li.appendChild(el('span', 'pt-pb-when pt-num', offsetLabel(m.offset)));
      const main = el('div', 'pt-pb-main');
      main.appendChild(el('span', 'pt-pb-title', m.title));
      main.appendChild(el('span', 'pt-pb-notes', m.phase ?? 'No phase'));
      li.appendChild(main);
      const tags = el('div', 'pt-pb-tags');
      if (m.flow) tags.appendChild(el('span', 'pt-tag pt-tag-flow', m.flow));
      if (m.priority) {
        const pr = el('span', 'pt-tag pt-pb-priority', m.priority);
        pr.dataset.priority = m.priority;
        tags.appendChild(pr);
      }
      li.appendChild(tags);
      // Where it came from is written in its phase. One phase belongs
      // to two playbooks, and then both are offered.
      const homes = playbooksOfPhase(m.phase).filter((n) => names.includes(n));
      const acts = el('div', 'pt-pb-restore');
      for (const home of homes.length ? homes : names) {
        const b = el('button', 'pt-pb-act', `Restore to ${home}`);
        b.type = 'button';
        b.addEventListener('click', () => {
          confirmMaster('Restore this step?',
            [`"${m.title}" goes back into ${home}, ${offsetLabel(m.offset).toLowerCase()}.`,
             'Campaigns already running are not changed.'], `Restore to ${home}`, async () => {
              const res = await host.send('PATCH', `/portal/hq/playbooks/step/${m.id}`, { playbook: home });
              if (!res.ok || !res.json?.step) { host.toast(why(res, 'That did not save.'), true); return false; }
              masters = (masters ?? []).map((x) => (x.id === m.id ? res.json!.step as MasterStep : x));
              playbook = home;
              host.toast(`Restored to ${home}`);
              redraw();
              return true;
            });
        });
        acts.appendChild(b);
      }
      li.appendChild(acts);
      list.appendChild(li);
    }
    box.appendChild(list);
    return box;
  }

  return { draw };
}

/* ══ the client's portal ═══════════════════════════════════════ */

export interface ClientPlaybooksHost {
  send: Send;
  slug: () => string;
  toast: (text: string, bad?: boolean) => void;
}

const REQUEST_STATUS: Record<string, string> = {
  Requested: 'Waiting on Blueprint', Approved: 'Approved', Declined: 'Declined', Draft: 'Waiting on Blueprint',
};

export function createClientPlaybooks(host: ClientPlaybooksHost): { draw: (root: HTMLElement) => void } {
  let ROOT: HTMLElement | null = null;
  let playbooks: ClientPlaybook[] | null = null;
  let requests: ClientRequest[] = [];
  /** The audit this client is shown, or null. */
  let audit: AuditInfo | null = null;
  let failed = false;
  let loading = false;
  let current = '';

  const redraw = () => { if (ROOT?.isConnected) draw(ROOT); };

  async function load() {
    if (loading) return;
    loading = true;
    const res = await host.send('GET', `/portal/${encodeURIComponent(host.slug())}/playbooks`);
    loading = false;
    if (res.ok && Array.isArray(res.json?.playbooks)) {
      playbooks = res.json!.playbooks as ClientPlaybook[];
      requests = (res.json!.requests ?? []) as ClientRequest[];
      audit = (res.json!.audit ?? null) as AuditInfo | null;
      failed = false;
    } else failed = true;
    redraw();
  }

  function requestSheet(step: { key: string; title: string }) {
    openSheet('Request a change', (form, close) => {
      form.appendChild(el('p', 'pt-sheet-note', `About: ${step.title}`));
      const reason = el('textarea', 'pt-input pt-textarea') as HTMLTextAreaElement;
      reason.rows = 4;
      reason.required = true;
      reason.maxLength = 2000;
      reason.placeholder = 'What would you change, and why? Earlier, later, not at all, someone else doing it...';
      form.appendChild(sheetField('What you would change', reason));
      form.appendChild(el('p', 'pt-sheet-note',
        'We read every one. If we agree, it becomes part of how your campaigns are planned from then on.'));
      const go = sheetSubmit(form, 'Send the request');
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const text = reason.value.trim();
        if (!text) { reason.focus(); return; }
        go.disabled = true;
        const res = await host.send('POST', `/portal/${encodeURIComponent(host.slug())}/playbooks/request`,
          { step: step.key, reason: text });
        go.disabled = false;
        if (!res.ok) { host.toast('That did not send. Check your connection and try again.', true); return; }
        requests = (res.json?.requests ?? requests) as ClientRequest[];
        host.toast('Sent. We will come back to you on it.');
        close();
        redraw();
      });
    });
  }

  function draw(root: HTMLElement) {
    ROOT = root;
    clear(root);
    const bar = el('div', 'pt-toolbar');
    bar.appendChild(el('h1', undefined, 'Playbooks'));
    root.appendChild(bar);
    root.appendChild(el('p', 'pt-sub pt-pb-intro',
      'How we plan a release or a show, step by step: what happens, how far ahead, and whether it is yours or ours. '
      + 'Anything we have agreed to do differently for you is already in here.'));

    if (!playbooks) {
      root.appendChild(el('p', 'pt-pb-none', failed
        ? 'The playbooks did not load. Check your connection and open this tab again.'
        : 'Loading…'));
      if (!failed) void load();
      else failed = false;
      return;
    }
    // Why they are built this way: their own audit, or the general
    // one. No card when there is neither.
    const auditCard = clientAuditCard(audit, host.slug());
    if (auditCard) root.appendChild(auditCard);

    if (!playbooks.length) {
      root.appendChild(el('p', 'pt-pb-none', 'There are no playbooks to show yet.'));
      return;
    }
    if (!playbooks.some((p) => p.name === current)) current = playbooks[0].name;
    root.appendChild(playbookPills(
      playbooks.map((p) => ({ name: p.name, count: p.phases.reduce((n, g) => n + g.steps.length, 0) })),
      current, (name) => { current = name; redraw(); }));

    const pb = playbooks.find((p) => p.name === current)!;
    const wrap = el('div', 'pt-pb-timeline pt-pb-timeline-client');
    for (const g of pb.phases) {
      const sec = el('section', 'pt-pb-phase');
      const h = el('div', 'pt-pb-phase-head');
      h.appendChild(el('h3', undefined, g.phase));
      sec.appendChild(h);
      const list = el('ol', 'pt-pb-steps');
      for (const s of g.steps) {
        const li = el('li', 'pt-pb-step');
        li.dataset.who = s.who;
        if (s.changed) li.dataset.changed = 'true';
        li.appendChild(el('span', 'pt-pb-when pt-num', offsetLabel(s.offset)));
        const main = el('div', 'pt-pb-main');
        main.appendChild(el('span', 'pt-pb-title', s.title));
        if (s.why) main.appendChild(el('span', 'pt-pb-notes', s.why));
        li.appendChild(main);
        const tags = el('div', 'pt-pb-tags');
        tags.appendChild(el('span', s.who === 'You' ? 'pt-tag pt-tag-todo' : 'pt-tag pt-tag-ours', s.who));
        if (s.changed) tags.appendChild(el('span', 'pt-tag pt-pb-st-approved', 'Changed for you'));
        li.appendChild(tags);
        if (s.key) {
          const ask = el('button', 'pt-pb-act', 'Request a change');
          ask.type = 'button';
          ask.setAttribute('aria-label', `Request a change to ${s.title}`);
          ask.addEventListener('click', () => requestSheet(s));
          li.appendChild(ask);
        }
        list.appendChild(li);
      }
      sec.appendChild(list);
      wrap.appendChild(sec);
    }
    root.appendChild(wrap);

    const mine = el('section', 'pt-pb-panel pt-pb-requests');
    const head = el('div', 'pt-pb-panel-head');
    head.append(el('h2', undefined, 'Changes you have asked for'),
                el('span', 'pt-board-count pt-num', String(requests.length)));
    mine.appendChild(head);
    if (!requests.length) {
      mine.appendChild(el('p', 'pt-pb-none', 'None yet. Use "Request a change" on any step above.'));
    } else {
      const list = el('ul', 'pt-pb-ovs');
      for (const r of requests) {
        const li = el('li', 'pt-pb-ov');
        li.dataset.status = r.status ?? '';
        const h2 = el('div', 'pt-pb-ov-head');
        h2.appendChild(el('span', `pt-tag pt-pb-st-${(r.status ?? 'none').toLowerCase()}`,
          REQUEST_STATUS[r.status ?? ''] ?? 'Waiting on Blueprint'));
        if (r.playbook) h2.appendChild(el('span', 'pt-tag', r.playbook));
        if (r.created) h2.appendChild(el('span', 'pt-pb-ov-date pt-num', shortDay(r.created)));
        li.appendChild(h2);
        if (r.step) li.appendChild(el('p', 'pt-pb-ov-title', r.step));
        if (r.reason) li.appendChild(el('p', 'pt-pb-ov-reason', r.reason));
        list.appendChild(li);
      }
      mine.appendChild(list);
    }
    root.appendChild(mine);
  }

  return { draw };
}
