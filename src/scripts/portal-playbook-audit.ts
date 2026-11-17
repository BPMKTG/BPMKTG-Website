/* ──────────────────────────────────────────────────────────────
   The Playbook Audit card: "why they are built this way".

   One card at the top of the Playbooks tab, on both screens. It is a
   reference, not part of the plan: a title, one line on what the
   audit is made of, and two ways to get the PDF, look at it or keep
   it. Everything below it on the tab is untouched.

     the client's portal   their own audit if they have one, the
                           general one if not, no card if neither
     HQ                    the general audit, with a way to replace
                           it, and under it who has an audit of their
                           own, each with upload, replace and remove

   The PDF is never linked by a public address. Every link here goes
   to an endpoint that checks the session before it sends a byte.
   ────────────────────────────────────────────────────────────── */

import { el, fmtDateShort, icon } from './portal-dom';

export interface AuditInfo {
  url: string;
  kind: 'pdf' | 'link';
  own: boolean;
  size: number | null;
  uploaded: string | null;
  host: string | null;
}

export interface AuditRosterRow {
  pageId: string;
  slug: string;
  artist: string;
  audit: AuditInfo | null;
}

/** What the audit is made of, in one line. */
export const AUDIT_SUMMARY = '1,983 posts from 25 bass artists, scored on TikTok and Instagram';

/** The same cap the server holds an upload to, said before the bytes
 *  are sent rather than after. */
const MAX_MB = 25;

const fileSize = (bytes: number): string =>
  (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`);

function metaLine(a: AuditInfo): string {
  if (a.kind === 'link') return a.host ? `Link · ${a.host}` : 'Link';
  const bits = ['PDF'];
  if (typeof a.size === 'number') bits.push(fileSize(a.size));
  if (a.uploaded) bits.push(`Updated ${fmtDateShort(a.uploaded)}`);
  return bits.join(' · ');
}

/** View and Download. A new tab for View, the way every other PDF in
 *  the portal opens, so the portal is still there behind it. */
function fileButtons(a: AuditInfo, downloadAs: string): HTMLElement {
  const row = el('div', 'pt-audit-acts');
  const view = el('a', 'pt-btn pt-btn-primary') as HTMLAnchorElement;
  view.href = a.url;
  view.target = '_blank';
  view.rel = 'noopener noreferrer';
  view.dataset.auditView = '1';
  view.append(icon('ext'), el('span', undefined, a.kind === 'link' ? 'Open' : 'View'));
  row.appendChild(view);
  if (a.kind === 'pdf') {
    const dl = el('a', 'pt-btn') as HTMLAnchorElement;
    dl.href = a.url;
    dl.download = downloadAs;
    dl.dataset.auditDownload = '1';
    dl.append(icon('download'), el('span', undefined, 'Download'));
    row.appendChild(dl);
  }
  return row;
}

function cardShell(title: string): { card: HTMLElement; text: HTMLElement } {
  const card = el('section', 'pt-audit');
  card.dataset.playbookAudit = '1';
  const mark = el('div', 'pt-audit-mark');
  mark.appendChild(icon('playbook'));
  const text = el('div', 'pt-audit-text');
  text.appendChild(el('h2', undefined, title));
  text.appendChild(el('p', 'pt-audit-sum', AUDIT_SUMMARY));
  card.append(mark, text);
  return { card, text };
}

/** The card a client sees, or null when there is no audit to show. */
export function clientAuditCard(audit: AuditInfo | null, slug: string): HTMLElement | null {
  if (!audit) return null;
  const { card, text } = cardShell('The Playbook Audit: why your playbooks are built this way');
  const meta = el('p', 'pt-audit-meta');
  if (audit.own) meta.appendChild(el('span', 'pt-tag pt-audit-own', 'Written for you'));
  meta.appendChild(el('span', undefined, metaLine(audit)));
  text.appendChild(meta);
  card.appendChild(fileButtons(audit, audit.own ? `${slug}-playbook-audit.pdf` : 'blueprint-playbook-audit.pdf'));
  return card;
}

/* ── HQ ───────────────────────────────────────────────────────── */

export interface HqAuditHost {
  toast: (text: string, bad?: boolean) => void;
  /** Something was uploaded or removed: read the tab's data again. */
  changed: () => void;
}

async function sendPdf(url: string, file: File): Promise<{ ok: boolean; json: Record<string, any> | null }> {
  try {
    const res = await fetch(url, {
      method: 'POST', headers: { 'Content-Type': 'application/pdf' }, credentials: 'same-origin', body: file,
    });
    let json: Record<string, any> | null = null;
    try { json = await res.json(); } catch { json = null; }
    return { ok: res.ok && json?.ok === true, json };
  } catch {
    return { ok: false, json: null };
  }
}

/** The file picker as one button: the input is hidden and the button
 *  clicks it, so it sits in a row of buttons looking like one. */
function uploadButton(label: string, url: string, host: HqAuditHost, done: string): HTMLElement {
  const wrap = el('span', 'pt-brief-pick');
  const input = el('input') as HTMLInputElement;
  input.type = 'file';
  input.accept = 'application/pdf,.pdf';
  input.hidden = true;
  const btn = el('button', 'pt-btn pt-btn-sm') as HTMLButtonElement;
  btn.type = 'button';
  btn.dataset.auditUpload = url;
  const span = el('span', undefined, label);
  btn.appendChild(span);
  btn.addEventListener('click', () => { if (!btn.disabled) input.click(); });
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    input.value = '';
    if (!file) return;
    if (file.size > MAX_MB * 1024 * 1024) {
      host.toast(`That file is ${fileSize(file.size)} and the limit is ${MAX_MB} MB.`, true);
      return;
    }
    btn.disabled = true;
    span.textContent = 'Uploading…';
    const res = await sendPdf(url, file);
    btn.disabled = false;
    span.textContent = label;
    if (!res.ok) {
      host.toast(String(res.json?.detail ?? '').trim() || 'That did not upload. Check your connection and try again.', true);
      return;
    }
    host.toast(String(res.json?.warning ?? '') || done, !!res.json?.warning);
    host.changed();
  });
  wrap.append(input, btn);
  return wrap;
}

/** The general audit, and who has one of their own. */
export function hqAuditPanel(
  general: AuditInfo | null, roster: readonly AuditRosterRow[], host: HqAuditHost,
): HTMLElement {
  const wrap = el('div', 'pt-audit-hq');

  const { card, text } = cardShell('The Playbook Audit: why the playbooks are built this way');
  text.appendChild(el('p', 'pt-audit-meta', general
    ? `General audit · ${metaLine(general)} · every client without their own is shown this one`
    : 'No general audit is uploaded yet, so clients without their own see no card.'));
  const acts = general ? fileButtons(general, 'blueprint-playbook-audit.pdf') : el('div', 'pt-audit-acts');
  acts.appendChild(uploadButton(general ? 'Replace PDF' : 'Upload PDF', '/portal/hq/playbook-audit', host,
    'General audit uploaded. Clients see it on their next load.'));
  card.appendChild(acts);
  wrap.appendChild(card);

  const own = roster.filter((r) => r.audit).length;
  const list = el('details', 'pt-audit-roster') as HTMLDetailsElement;
  list.dataset.auditRoster = '1';
  list.open = true;
  const sum = el('summary', 'pt-audit-roster-head');
  sum.append(el('span', undefined, 'Custom audits'),
    el('span', 'pt-board-count pt-num', `${own} of ${roster.length}`));
  list.appendChild(sum);
  const ul = el('ul', 'pt-audit-rows');
  for (const r of roster) {
    const li = el('li', 'pt-audit-row');
    li.dataset.client = r.slug;
    const who = el('div', 'pt-audit-who');
    who.appendChild(el('strong', undefined, r.artist));
    who.appendChild(el('span', undefined, r.audit ? `Their own · ${metaLine(r.audit)}` : 'Shown the general audit'));
    li.appendChild(who);
    const a = el('div', 'pt-audit-acts');
    if (r.audit) {
      const view = el('a', 'pt-btn pt-btn-sm') as HTMLAnchorElement;
      view.href = r.audit.url;
      view.target = '_blank';
      view.rel = 'noopener noreferrer';
      view.textContent = r.audit.kind === 'link' ? 'Open' : 'View';
      a.appendChild(view);
    }
    a.appendChild(uploadButton(r.audit ? 'Replace PDF' : 'Upload PDF',
      `/portal/${encodeURIComponent(r.slug)}/admin/playbook-audit`, host,
      `${r.artist}’s audit uploaded. They see it on their next load.`));
    if (r.audit) {
      const rm = el('button', 'pt-btn pt-btn-sm') as HTMLButtonElement;
      rm.type = 'button';
      rm.textContent = 'Remove';
      rm.title = 'They go back to the general audit';
      rm.addEventListener('click', async () => {
        if (!window.confirm(`Remove ${r.artist}’s own audit? They will be shown the general one.`)) return;
        rm.disabled = true;
        try {
          const res = await fetch(`/portal/${encodeURIComponent(r.slug)}/admin/playbook-audit`,
            { method: 'DELETE', credentials: 'same-origin' });
          if (!res.ok) throw new Error('refused');
          host.toast(`${r.artist} is back on the general audit`);
          host.changed();
        } catch {
          rm.disabled = false;
          host.toast('That did not save. Try again.', true);
        }
      });
      a.appendChild(rm);
    }
    li.appendChild(a);
    ul.appendChild(li);
  }
  list.appendChild(ul);
  wrap.appendChild(list);
  return wrap;
}
