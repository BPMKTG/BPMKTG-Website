/* ──────────────────────────────────────────────────────────────
   "Needs your review": the cuts waiting on the client, at the top
   of their Content tab.

   A card in the Review column is easy to miss, and a cut nobody has
   answered holds up everything behind it. So anything waiting on the
   client is lifted out and put first, with the cut itself, the caption
   it will go out with, and the two answers. It is drawn only when
   there is something in it: an empty "nothing to review" box at the
   top of a page is noise every day there is nothing to review.

   The buttons do exactly what the ones on the card do, through the
   same host function. The server decides whether either is allowed.
   ────────────────────────────────────────────────────────────── */

import {
  latestFeedback,
  shortDay,
  REVIEW_LABEL,
  type PortalContentItem,
  type ReviewAction,
} from '../data/portal-content';
import { MEDIA_ICON } from './portal-board';
import { previewEl } from './portal-content-drawer';
import { el, icon } from './portal-dom';

export interface ReviewHost {
  items: () => PortalContentItem[];
  momentOf: (c: PortalContentItem) => string | null;
  openCard: (c: PortalContentItem) => void;
  reviewAct: (c: PortalContentItem, action: ReviewAction) => void;
}

export function createReviewStrip(host: ReviewHost): () => HTMLElement | null {
  function cardEl(c: PortalContentItem): HTMLElement {
    const card = el('article', 'pt-rcard');
    card.dataset.review = c.id;

    // The cut, in place where it can be. Where it cannot, the link is
    // the honest fallback, and it still comes before the buttons: an
    // approval with nothing to look at is not one.
    const frame = c.editLink ? previewEl(c.editLink, c.title) : null;
    if (frame) card.appendChild(frame);
    else if (c.editLink) {
      const a = el('a', 'pt-rcard-link') as HTMLAnchorElement;
      a.href = c.editLink;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.append(icon('play'), el('span', undefined, 'Open the edit'));
      card.appendChild(a);
    } else {
      card.appendChild(el('p', 'pt-rcard-nolink', 'The cut is on its way. Open the card for details.'));
    }

    const body = el('div', 'pt-rcard-body');
    const title = el('button', 'pt-rcard-title', c.title);
    title.type = 'button';
    title.addEventListener('click', () => host.openCard(c));
    body.appendChild(title);

    const meta = el('p', 'pt-ccard-meta');
    const media = c.media ?? 'Video';
    const m = el('span', 'pt-ccard-media');
    m.append(icon(MEDIA_ICON[media] ?? 'video'), el('span', undefined, media));
    meta.appendChild(m);
    const camp = host.momentOf(c);
    if (camp) meta.appendChild(el('span', undefined, camp));
    if (c.postDate) meta.appendChild(el('span', 'pt-num', `Posts ${shortDay(c.postDate)}`));
    body.appendChild(meta);

    if (c.caption) {
      const cap = el('div', 'pt-rcard-cap');
      cap.append(el('span', 'pt-rcard-lab', 'Caption'), el('p', undefined, c.caption));
      body.appendChild(cap);
    }
    // If this is a second cut, what we said about it.
    const note = latestFeedback(c.feedback);
    if (note?.who === 'Blueprint') {
      const said = el('div', 'pt-rcard-cap');
      said.append(el('span', 'pt-rcard-lab', 'Blueprint said'), el('p', undefined, note.text));
      body.appendChild(said);
    }

    const acts = el('div', 'pt-rcard-acts');
    for (const a of ['approve', 'changes'] as ReviewAction[]) {
      const b = el('button', a === 'approve' ? 'pt-btn pt-btn-primary' : 'pt-btn', REVIEW_LABEL[a]);
      b.type = 'button';
      b.dataset.act = a;
      b.addEventListener('click', () => host.reviewAct(c, a));
      acts.appendChild(b);
    }
    body.appendChild(acts);
    card.appendChild(body);
    return card;
  }

  return () => {
    // Soonest to post first: that is the one holding something up.
    const waiting = host.items()
      .filter((c) => c.status === 'Ready for Review')
      .sort((a, b) => (a.postDate ?? '9999').localeCompare(b.postDate ?? '9999'));
    if (!waiting.length) return null;
    const sec = el('section', 'pt-reviewstrip');
    sec.setAttribute('aria-label', 'Needs your review');
    const head = el('div', 'pt-reviewstrip-head');
    head.append(el('h2', undefined, 'Needs your review'),
                el('span', 'pt-board-count pt-num', String(waiting.length)));
    sec.appendChild(head);
    const row = el('div', 'pt-reviewstrip-row');
    for (const c of waiting) row.appendChild(cardEl(c));
    sec.appendChild(row);
    return sec;
  };
}
