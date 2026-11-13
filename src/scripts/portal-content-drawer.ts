/* ──────────────────────────────────────────────────────────────
   What a content card says when it is opened, on either screen.

   The client's drawer and ours used to be two things: theirs a form,
   ours four facts and a link to theirs. A card has one set of things
   to say, so there is one drawer and the host says who is reading.

   In order, because the order is the point:
     1. the next move, and the review answer when it is the client's
     2. the cut itself, played in place where it can be
     3. status, with a visible "Saved"
     4. what goes out with it: media, caption, on-screen text
     5. the links: footage, post
     6. the feedback thread
     7. everything else about the row, folded away

   Nothing here decides what may be saved. Every editor hands its value
   to host.save, the server applies the whitelist, and a tick appears
   only when the server says the row changed.
   ────────────────────────────────────────────────────────────── */

import {
  canClientMove,
  editPreview,
  nextMove,
  normaliseId,
  parseFeedback,
  shortDay,
  DRAG_BLOCKED,
  MAX_TEXT,
  MAX_TITLE,
  REVIEW_LABEL,
  type PortalContentItem,
  type PortalContentSchema,
  type ReviewAction,
  type Voice,
} from '../data/portal-content';
import { MEDIA_ICON } from './portal-board';
import { el, icon } from './portal-dom';
import {
  dateField, fieldShell, flashTick, multiEditor, selectEditor, textField, urlField,
  type Tick,
} from './portal-fields';

export interface DrawerHost {
  role: () => 'client' | 'admin';
  schema: () => PortalContentSchema;
  voice: (c: PortalContentItem) => Voice;
  /** The moments this card's client can link a card to. */
  campaigns: (c: PortalContentItem) => Array<{ id: string; title: string }>;
  /** The campaign a card belongs to, by name, however it is linked. */
  momentOf: (c: PortalContentItem) => string | null;
  /** One save. Resolves true only when the server changed the row. */
  save: (c: PortalContentItem, patch: Record<string, unknown>,
         local: Partial<PortalContentItem>) => Promise<boolean>;
  toast: (text: string, bad?: boolean) => void;
  reviewAct?: (c: PortalContentItem, action: ReviewAction) => void;
  /** HQ only: whose card this is. */
  clientOf?: (c: PortalContentItem) => string | null;
}

/** A read-only line: a label and what it says. */
function fact(label: string, value: string): HTMLElement {
  const { wrap, slot } = fieldShell(label);
  slot.appendChild(el('p', 'pt-field-read', value));
  return wrap;
}

/** The cut, in place. A frame for the hosts we can embed, a player or
 *  an image for a direct file, and otherwise nothing: the link below
 *  is the honest fallback. */
function previewEl(url: string, title: string): HTMLElement | null {
  const p = editPreview(url);
  if (!p) return null;
  const box = el('div', `pt-preview pt-preview-${p.kind}`);
  if (p.kind === 'video') {
    const v = el('video') as HTMLVideoElement;
    v.src = p.src;
    v.controls = true;
    v.preload = 'metadata';
    v.playsInline = true;
    box.appendChild(v);
  } else if (p.kind === 'image') {
    const img = el('img') as HTMLImageElement;
    img.src = p.src;
    img.alt = `The edit of ${title}`;
    img.loading = 'lazy';
    img.referrerPolicy = 'no-referrer';
    box.appendChild(img);
  } else {
    const f = el('iframe') as HTMLIFrameElement;
    f.src = p.src;
    f.title = `The edit of ${title}`;
    f.loading = 'lazy';
    f.referrerPolicy = 'no-referrer';
    f.allow = 'autoplay; fullscreen; picture-in-picture';
    f.allowFullscreen = true;
    box.appendChild(f);
  }
  return box;
}

function threadEl(host: DrawerHost, c: PortalContentItem): HTMLElement {
  const { wrap, tick, slot } = fieldShell('Feedback');
  const notes = parseFeedback(c.feedback);
  const list = el('ol', 'pt-thread');
  if (!notes.length) {
    list.appendChild(el('li', 'pt-thread-none', 'No notes yet.'));
  }
  const voice = host.voice(c);
  for (const n of notes) {
    const li = el('li', 'pt-thread-note');
    if (n.who) li.dataset.who = n.who;
    const who = n.who === 'Blueprint' ? 'Blueprint'
      : n.who === 'Client' ? (voice.you ? 'You' : voice.name)
      : 'Note';
    const head = el('span', 'pt-thread-head', n.day ? `${who} · ${shortDay(n.day)}` : who);
    li.append(head, el('p', undefined, n.text));
    list.appendChild(li);
  }
  slot.appendChild(list);

  const row = el('div', 'pt-thread-add');
  const input = el('textarea', 'pt-input pt-textarea') as HTMLTextAreaElement;
  input.id = slot.dataset.fieldId!;
  input.rows = 2;
  input.maxLength = MAX_TEXT;
  input.placeholder = host.role() === 'admin' ? 'Reply, or say what changed' : 'What should change?';
  const send = el('button', 'pt-btn', 'Add note') as HTMLButtonElement;
  send.type = 'button';
  send.addEventListener('click', () => {
    const text = input.value.trim();
    if (!text) { input.focus(); return; }
    send.disabled = true;
    // The server writes the stamp; `local` is only what the card shows
    // until its answer comes back and replaces it.
    void host.save(c, { feedbackAdd: text }, {}).then((ok) => {
      send.disabled = false;
      if (ok) flashTick(tick);
    });
  });
  row.append(input, send);
  slot.appendChild(row);
  return wrap;
}

export function fillContentDrawer(host: DrawerHost, c: PortalContentItem, body: HTMLElement): void {
  const admin = host.role() === 'admin';
  const schema = host.schema();
  const voice = host.voice(c);
  const owns = admin || c.postedBy === 'Client';
  const save = (patch: Record<string, unknown>, local: Partial<PortalContentItem>, tick: Tick) =>
    host.save(c, patch, local).then((ok) => { if (ok) flashTick(tick); });

  /* 1 ── the next move ── */
  const top = el('div', 'pt-drawer-top');
  const who = host.clientOf?.(c) ?? null;
  if (who) top.appendChild(el('span', 'pt-ccard-who', who));
  const move = nextMove(c, voice);
  if (move) {
    const line = el('p', 'pt-drawer-next');
    if (move.waiting) line.dataset.waiting = move.waiting;
    const dot = el('span', 'pt-ccard-dot');
    dot.setAttribute('aria-hidden', 'true');
    line.append(dot, el('span', undefined, move.text));
    top.appendChild(line);
  } else if (c.status) {
    top.appendChild(el('p', 'pt-drawer-next', c.status));
  }
  const tags = el('div', 'pt-drawer-tags');
  const media = c.media ?? 'Video';
  const m = el('span', 'pt-tag pt-tag-media');
  m.append(icon(MEDIA_ICON[media] ?? 'video'), el('span', undefined, media));
  tags.appendChild(m);
  if (c.postedBy === 'Blueprint') tags.appendChild(el('span', 'pt-tag pt-tag-ours', 'Blueprint posts'));
  else if (c.postedBy === 'Client') {
    tags.appendChild(el('span', 'pt-tag pt-tag-todo', voice.you ? 'You post' : `${voice.name} posts`));
  }
  const camps = host.campaigns(c);
  const linked = c.campaign.map(normaliseId);
  const camp = camps.find((x) => linked.includes(normaliseId(x.id)));
  const campName = host.momentOf(c);
  if (campName) tags.appendChild(el('span', 'pt-tag', campName));
  if (c.postDate) tags.appendChild(el('span', 'pt-tag pt-num', `Posts ${shortDay(c.postDate)}`));
  top.appendChild(tags);
  body.appendChild(top);

  /* the review answer, when it is the client's turn */
  if (c.status === 'Ready for Review' && !admin && host.reviewAct) {
    const box = el('div', 'pt-review');
    box.appendChild(el('div', 'pt-review-label', 'Ready for your review'));
    box.appendChild(el('p', undefined,
      'Have a look at the cut, then approve it or tell us what to change.'));
    const row = el('div', 'pt-review-actions');
    for (const a of ['approve', 'changes'] as ReviewAction[]) {
      const b = el('button', a === 'approve' ? 'pt-btn pt-btn-primary' : 'pt-btn', REVIEW_LABEL[a]);
      b.type = 'button';
      b.addEventListener('click', () => host.reviewAct!(c, a));
      row.appendChild(b);
    }
    box.appendChild(row);
    body.appendChild(box);
  }

  /* 2 ── the cut ── */
  if (c.editLink) {
    const frame = previewEl(c.editLink, c.title);
    if (frame) body.appendChild(frame);
  }
  if (admin) {
    body.appendChild(urlField('Edit link', c.editLink, 'Paste the link to the cut',
      (v, tick) => save({ editLink: v }, { editLink: v }, tick)));
  } else if (c.editLink) {
    const a = el('a', 'pt-btn pt-btn-wide') as HTMLAnchorElement;
    a.href = c.editLink;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.append(icon('play'), el('span', undefined, 'Open the edit in a new tab'));
    body.appendChild(a);
  }

  /* 3 ── status ── */
  // Every status Notion has, so the dropdown is a true picture of
  // where a card can be rather than a short list that reads like the
  // rest do not exist. Picking one that is ours to set is answered out
  // loud; the server refuses it again either way.
  body.appendChild(selectEditor('Status', c.status, schema.status, null, (v, tick) => {
    if (!v || v === c.status) return;
    const may = admin || canClientMove(c.status, v, { postedBy: c.postedBy, source: c.source });
    if (!may) { host.toast(DRAG_BLOCKED, true); fillContentDrawer(host, c, clearNode(body)); return; }
    void save({ status: v }, { status: v }, tick);
  }));

  /* 4 ── what goes out ── */
  if (owns && schema.media.length) {
    body.appendChild(selectEditor('Media', c.media, schema.media, null,
      (v, tick) => { if (v && v !== c.media) void save({ media: v }, { media: v }, tick); }));
  } else {
    body.appendChild(fact('Media', media));
  }
  body.appendChild(textField('Caption', c.caption, 'The caption that goes with it', MAX_TEXT,
    (v, tick) => save({ caption: v }, { caption: v }, tick), { lines: 4 }));
  body.appendChild(textField('On-screen text', c.onScreenText, 'What the viewer reads', MAX_TEXT,
    (v, tick) => save({ onScreenText: v }, { onScreenText: v }, tick), { lines: 3 }));

  /* 5 ── the links ── */
  body.appendChild(urlField('Footage link', c.footageLink, 'Paste the Drive or iCloud link',
    (v, tick) => save({ footageLink: v }, { footageLink: v }, tick)));
  body.appendChild(urlField('Post link', c.postLink, 'Paste the link to the live post',
    (v, tick) => save({ postLink: v }, { postLink: v }, tick)));

  /* 6 ── the thread ── */
  body.appendChild(threadEl(host, c));

  /* 7 ── everything else ── */
  const more = el('details', 'pt-drawer-more') as HTMLDetailsElement;
  more.appendChild(el('summary', undefined, 'More about this piece'));
  more.appendChild(textField('Title', c.title, 'A short name, the way you say it', MAX_TITLE,
    (v, tick) => save({ title: v }, { title: v ?? c.title }, tick)));
  more.appendChild(dateField('Post date', c.postDate,
    (v, tick) => save({ postDate: v }, { postDate: v }, tick)));
  more.appendChild(dateField('Film by', c.filmBy,
    (v, tick) => save({ filmBy: v }, { filmBy: v }, tick)));
  // A card delivers one step of a campaign, and that link is what lets
  // the step tick itself when the card is posted. Offering a list of
  // moments here would let a save swap the step for the moment and
  // quietly cut that wire, so a card already on a step says which
  // campaign it is for and leaves the link alone.
  if (c.campaign.length && !camp) {
    if (campName) more.appendChild(fact('Campaign', campName));
  } else if (camps.length) {
    more.appendChild(selectEditor('Campaign', camp?.id ?? null,
      camps.map((x) => ({ name: x.id, color: 'default', label: x.title })), 'No campaign',
      (v, tick) => save({ campaign: v ? [v] : [] }, { campaign: v ? [v] : [] }, tick)));
  }
  more.appendChild(selectEditor('Bucket', c.bucket, schema.bucket, 'No bucket',
    (v, tick) => save({ bucket: v }, { bucket: v }, tick)));
  more.appendChild(multiEditor('Platforms', c.platforms, schema.platforms,
    (v, tick) => save({ platforms: v }, { platforms: v }, tick)));
  more.appendChild(multiEditor('Format', c.format, schema.format,
    (v, tick) => save({ format: v }, { format: v }, tick)));
  more.appendChild(textField('Shoot code', c.shootCode, 'SM L1D1', MAX_TEXT,
    (v, tick) => save({ shootCode: v }, { shootCode: v }, tick), { mono: true }));
  more.appendChild(textField('Notes', c.notes, 'Anything we should know', MAX_TEXT,
    (v, tick) => save({ notes: v }, { notes: v }, tick), { lines: 3 }));
  if (c.source) more.appendChild(fact('Source', c.source));
  body.appendChild(more);
}

/** Empty a node and hand it back, for a redraw in place. */
function clearNode<T extends HTMLElement>(n: T): T {
  while (n.firstChild) n.removeChild(n.firstChild);
  return n;
}
