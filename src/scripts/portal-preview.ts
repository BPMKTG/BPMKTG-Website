/* ─────────────────────────────────────────────────
   The cut, in place.

   A Drive link is shown from our own copy of the file (see
   src/data/preview.ts): an image, or a video with its poster, served
   behind the portal's sign-in. Google's player is never put in a
   frame. It only plays for someone signed in to Google with access,
   in a browser that lets Google see that from inside a frame, and an
   iPhone does not.

   Three things a Drive link can look like here:

     ready      the image, or the video with controls
     pending    "Getting the preview ready", and the page asks the
                server every few seconds until it is
     failed     "Preview unavailable · open original"

   and under all three, "Open original", which is the Drive link
   itself, in a new tab.

   A link that is not Drive is shown as it always was: a player for
   YouTube or Vimeo, or the file itself when the link is one.

   The same box is used by the client's portal and by HQ. The address
   it asks is the same for both; the cookie decides who gets an answer.
   ───────────────────────────────────────────────── */

import { editPreview, type PortalContentItem } from '../data/portal-content';
import { driveFileId, previewUrl, type ItemPreview } from '../data/preview';
import { el, icon } from './portal-dom';

/** How often a waiting box asks, and for how long before it stops
 *  and says so. A conversion is a minute or two. */
const ASK_EVERY_MS = 5000;
const ASK_TIMES = 72;

interface Answer { ok: boolean; preview: ItemPreview | null; wait: boolean }

async function ask(slug: string, id: string, verify: boolean): Promise<Answer | null> {
  try {
    const res = await fetch(`/portal/${slug}/preview/${id.replace(/-/g, '').toLowerCase()}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(verify ? { verify: true } : {}),
    });
    if (!res.ok) return null;
    return await res.json() as Answer;
  } catch {
    return null;
  }
}

function original(link: string): HTMLAnchorElement {
  const a = el('a', 'pt-preview-open') as HTMLAnchorElement;
  a.href = link;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.append(icon('ext'), el('span', undefined, 'Open original'));
  return a;
}

/**
 * The preview of one card, or null when there is nothing to show but
 * the link itself (which the caller draws).
 *
 * `slug` is the client the card belongs to. Without one there is no
 * address to ask, so a Drive link falls back to the plain message.
 */
export function previewBox(c: PortalContentItem, slug: string | null): HTMLElement | null {
  const link = c.editLink;
  if (!link) return null;

  /* Not Drive: someone else's player, or a direct file. */
  if (!driveFileId(link)) {
    const p = editPreview(link);
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
      img.alt = `The edit of ${c.title}`;
      img.loading = 'lazy';
      img.referrerPolicy = 'no-referrer';
      box.appendChild(img);
    } else {
      const f = el('iframe') as HTMLIFrameElement;
      f.src = p.src;
      f.title = `The edit of ${c.title}`;
      f.loading = 'lazy';
      f.referrerPolicy = 'no-referrer';
      f.allow = 'autoplay; fullscreen; picture-in-picture';
      f.allowFullscreen = true;
      box.appendChild(f);
    }
    return box;
  }

  /* Drive: our own copy, or an honest line saying there is not one. */
  const box = el('div', 'pt-preview pt-preview-ours');
  box.dataset.preview = c.id;
  const stage = el('div', 'pt-preview-stage');
  box.append(stage, original(link));

  let asked = 0;
  let verified = false;

  const say = (state: 'pending' | 'failed', text: string): void => {
    box.dataset.state = state;
    stage.replaceChildren(el('p', `pt-preview-note pt-preview-note-${state}`, text));
  };
  const unavailable = (): void => say('failed', 'Preview unavailable · open original');

  const keepAsking = (): void => {
    if (!slug) { unavailable(); return; }
    // The drawer was closed, or the card redrawn: stop.
    if (asked > 0 && !box.isConnected) return;
    if (asked >= ASK_TIMES) { unavailable(); return; }
    asked += 1;
    void ask(slug, c.id, false).then((a) => {
      if (!a || !a.ok) { unavailable(); return; }
      if (a.preview) c.preview = a.preview;
      if (a.preview?.state === 'ready') { show(a.preview); return; }
      if (a.preview?.state === 'failed' || !a.wait) { unavailable(); return; }
      window.setTimeout(keepAsking, ASK_EVERY_MS);
    });
  };

  /** The file would not load. Once, ask the server to check that its
   *  copy is really there, which rebuilds it when it is not. */
  const broken = (): void => {
    if (!slug || verified) { unavailable(); return; }
    verified = true;
    say('pending', 'Getting the preview ready…');
    void ask(slug, c.id, true).then((a) => {
      if (!a || !a.ok) { unavailable(); return; }
      if (a.preview) c.preview = a.preview;
      if (a.preview?.state === 'ready') { show(a.preview); return; }
      if (a.preview?.state === 'failed' || !a.wait) { unavailable(); return; }
      window.setTimeout(keepAsking, ASK_EVERY_MS);
    });
  };

  function show(p: ItemPreview): void {
    if (!slug || !p.v || !p.kind) { unavailable(); return; }
    box.dataset.state = 'ready';
    box.dataset.kind = p.kind;
    if (p.kind === 'video') {
      const v = el('video') as HTMLVideoElement;
      v.controls = true;
      v.playsInline = true;
      // The attribute too: an iPhone reads the attribute, and without
      // it tapping play throws the video into the full-screen player.
      v.setAttribute('playsinline', '');
      v.preload = 'metadata';
      if (p.poster) v.poster = previewUrl(slug, c.id, p.v, 'image');
      v.src = previewUrl(slug, c.id, p.v, 'video');
      v.addEventListener('error', broken, { once: true });
      stage.replaceChildren(v);
    } else {
      const img = el('img') as HTMLImageElement;
      img.alt = c.title;
      img.decoding = 'async';
      img.src = previewUrl(slug, c.id, p.v, 'image');
      img.addEventListener('error', broken, { once: true });
      stage.replaceChildren(img);
    }
  }

  const p = c.preview;
  if (p?.state === 'ready') show(p);
  else if (p?.state === 'failed') unavailable();
  else { say('pending', 'Getting the preview ready…'); keepAsking(); }
  return box;
}
