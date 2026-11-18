/* ────────────────────────────────────────────────────────────
   The delivery tracker: photo sets and footage batches, by
   competition.

   It stands where the month counter stands on an artist's Content
   tab, for a client type that is counted in deliveries rather than in
   posts (see src/data/client-types.ts and src/data/deliveries.ts).

   Two voices, like the counter. In the client's portal it is a
   statement: what we are working on for them, where each one is, and
   a link when it is ready. In HQ it is a working tool: add one, move
   it to its next stage, paste the link.

   Nothing here decides what a delivery is or what stage it is at.
   That is the data layer's job.
   ──────────────────────────────────────────────────────────── */

import {
  DELIVERABLE_KINDS, DELIVERY_STAGES, deliveryGroups, deliveryStage, deliveryTally, stageLabel,
  tallyLabel, type Delivery, type DeliveryGroup, type DeliveryMoment, type DeliveryStage,
} from '../data/deliveries';
import type { ContentViewApi } from './portal-content-view';
import { el, icon } from './portal-dom';
import { openSheet, sheetField, sheetSubmit } from './portal-sheet';

/** One client's deliveries. HQ across a roster has several. */
export interface DeliveryClient {
  key: string;
  name: string;
  deliveries: Delivery[];
  /** The client's moments, newest picked first in the add sheet. */
  moments: DeliveryMoment[];
}

export interface DeliveriesHost {
  role: () => 'client' | 'admin';
  clients: () => DeliveryClient[];
  shortDay: (iso: string | null) => string;
  /** HQ only. Each resolves true when it saved. */
  add?: (client: DeliveryClient, d: { title: string; kind: string; momentId: string | null; due: string | null }) => Promise<boolean>;
  change?: (client: DeliveryClient, d: Delivery, patch: { stage?: DeliveryStage; link?: string | null; drop?: boolean }) => Promise<boolean>;
}

export function createDeliveries(host: DeliveriesHost): (view: ContentViewApi) => HTMLElement | null {
  const admin = () => host.role() === 'admin';

  function addSheet(client: DeliveryClient) {
    openSheet(`Add a delivery for ${client.name}`, (form, close) => {
      const kind = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
      for (const k of DELIVERABLE_KINDS) {
        const o = el('option', undefined, k) as HTMLOptionElement;
        o.value = k;
        kind.appendChild(o);
      }
      form.appendChild(sheetField('What is it', kind));

      const moment = el('select', 'pt-select pt-select-wide') as HTMLSelectElement;
      const none = el('option', undefined, 'Not tied to one') as HTMLOptionElement;
      none.value = '';
      moment.appendChild(none);
      const sorted = [...client.moments].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
      for (const m of sorted) {
        const o = el('option', undefined, m.date ? `${m.title} · ${host.shortDay(m.date)}` : m.title) as HTMLOptionElement;
        o.value = m.id;
        moment.appendChild(o);
      }
      form.appendChild(sheetField('Which competition or event', moment));

      const title = el('input', 'pt-input') as HTMLInputElement;
      title.required = true;
      title.maxLength = 200;
      title.placeholder = 'Senior Elite, day one';
      form.appendChild(sheetField('Name', title));

      const due = el('input', 'pt-input') as HTMLInputElement;
      due.type = 'date';
      form.appendChild(sheetField('Due (optional)', due));
      form.appendChild(el('p', 'pt-sheet-note',
        'It starts at To shoot. The client sees it on their Content tab straight away.'));

      const go = sheetSubmit(form, 'Add it');
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        const name = title.value.trim();
        if (!name) { title.focus(); return; }
        go.disabled = true;
        const ok = await host.add!(client, {
          title: name, kind: kind.value, momentId: moment.value || null, due: due.value || null,
        });
        go.disabled = false;
        if (ok) close();
      });
    });
  }

  function linkSheet(client: DeliveryClient, d: Delivery) {
    openSheet(`Link for ${d.title}`, (form, close) => {
      const url = el('input', 'pt-input') as HTMLInputElement;
      url.type = 'url';
      url.value = d.link ?? '';
      url.placeholder = 'https://';
      form.appendChild(sheetField('Where the finished files are', url));
      form.appendChild(el('p', 'pt-sheet-note',
        'The client opens this from their Content tab. Leave it empty to take the link away.'));
      const go = sheetSubmit(form, 'Save');
      form.addEventListener('submit', async (ev) => {
        ev.preventDefault();
        go.disabled = true;
        const ok = await host.change!(client, d, { link: url.value.trim() || null });
        go.disabled = false;
        if (ok) close();
      });
    });
  }

  function row(client: DeliveryClient, d: Delivery): HTMLElement {
    const stage = deliveryStage(d.status) as DeliveryStage;
    const li = el('li', `pt-deliv-row pt-deliv-${stage}`);
    li.dataset.delivery = d.id;
    li.dataset.stage = stage;

    const what = el('div', 'pt-deliv-what');
    what.appendChild(el('span', 'pt-deliv-kind', d.kind));
    what.appendChild(el('span', 'pt-deliv-title', d.title));
    if (d.due && stage !== 'delivered') what.appendChild(el('span', 'pt-deliv-due pt-num', `Due ${host.shortDay(d.due)}`));
    li.appendChild(what);

    const acts = el('div', 'pt-deliv-acts');
    if (admin() && host.change) {
      const pick = el('select', 'pt-select pt-deliv-stage') as HTMLSelectElement;
      pick.setAttribute('aria-label', `Stage of ${d.title}`);
      for (const s of DELIVERY_STAGES) {
        const o = el('option', undefined, stageLabel(s, d.kind)) as HTMLOptionElement;
        o.value = s;
        pick.appendChild(o);
      }
      pick.value = stage;
      pick.addEventListener('change', async () => {
        pick.disabled = true;
        const ok = await host.change!(client, d, { stage: pick.value as DeliveryStage });
        pick.disabled = false;
        if (!ok) pick.value = stage;
      });
      acts.appendChild(pick);
      const link = el('button', 'pt-btn pt-deliv-btn', d.link ? 'Change link' : 'Add link');
      link.type = 'button';
      link.addEventListener('click', () => linkSheet(client, d));
      acts.appendChild(link);
      const drop = el('button', 'pt-btn pt-deliv-btn', 'Remove');
      drop.type = 'button';
      drop.addEventListener('click', () => {
        if (!window.confirm(`Remove "${d.title}" from ${client.name}'s deliveries? It stays in Notion as Skipped.`)) return;
        void host.change!(client, d, { drop: true });
      });
      acts.appendChild(drop);
    } else {
      acts.appendChild(el('span', `pt-tag pt-deliv-pill pt-deliv-pill-${stage}`, stageLabel(stage, d.kind)));
    }
    if (d.link) {
      const a = el('a', 'pt-btn pt-deliv-open') as HTMLAnchorElement;
      a.href = d.link;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.appendChild(icon('ext'));
      a.appendChild(el('span', undefined, 'Open'));
      acts.appendChild(a);
    }
    li.appendChild(acts);
    return li;
  }

  function group(client: DeliveryClient, g: DeliveryGroup): HTMLElement {
    const box = el('div', 'pt-deliv-group');
    const head = el('div', 'pt-deliv-head');
    head.appendChild(el('h3', undefined, g.title));
    if (g.date) head.appendChild(el('span', 'pt-deliv-date pt-num', host.shortDay(g.date)));
    head.appendChild(el('span', 'pt-deliv-count pt-num', `${g.delivered} of ${g.rows.length} delivered`));
    box.appendChild(head);
    const list = el('ul', 'pt-deliv-list');
    for (const d of g.rows) list.appendChild(row(client, d));
    box.appendChild(list);
    return box;
  }

  function block(client: DeliveryClient, many: boolean): HTMLElement {
    const sec = el('section', 'pt-deliv');
    sec.dataset.deliveries = client.key;
    const tally = deliveryTally(client.deliveries);
    const head = el('div', 'pt-deliv-top');
    const text = el('div', 'pt-deliv-toptext');
    if (many) text.appendChild(el('span', 'pt-deliv-who', client.name));
    text.appendChild(el('h2', undefined, admin() ? 'Deliveries' : 'What we are finishing for you'));
    text.appendChild(el('p', 'pt-deliv-sum', tally.total
      ? `${tallyLabel(tally)}. Photo sets are edited and footage is color graded, then handed over for ${admin() ? 'them' : 'you'} to post.`
      : (admin()
        ? 'Nothing here yet. Add the photo sets and footage batches each competition owes.'
        : 'Nothing here yet. Photo sets and graded footage from your competitions appear here as we work on them.')));
    head.appendChild(text);
    if (admin() && host.add) {
      const add = el('button', 'pt-btn pt-btn-primary', 'Add a delivery');
      add.type = 'button';
      add.addEventListener('click', () => addSheet(client));
      head.appendChild(add);
    }
    sec.appendChild(head);
    for (const g of deliveryGroups(client.deliveries, client.moments)) sec.appendChild(group(client, g));
    return sec;
  }

  return () => {
    const clients = host.clients();
    if (!clients.length) return null;
    const wrap = el('div', 'pt-deliv-wrap');
    for (const c of clients) wrap.appendChild(block(c, clients.length > 1));
    return wrap;
  };
}
