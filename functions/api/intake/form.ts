/* ──────────────────────────────────────────────────────────────
   GET /api/intake/form?client=<slug> — which intake form this link
   opens.

   /intake is one static page holding every form. The link stays
   /intake?client=SLUG, and the Clients row the slug finds decides
   which form is shown: its Client Type, then its Tier. The page asks
   here, once, on load.

   It answers with a form's id and nothing else. A slug that matches
   nobody, or matches two rows, gets the artist form, the same answer a
   real artist client gets, so this cannot be used to ask "is this
   slug a client?". What it does give away is that a slug which gets
   another form exists and is that kind of client. That is the price
   of the link not carrying the form's name.

   The answer here only decides what is DRAWN. The POST decides for
   itself which form a submission is checked against, from the same
   row, and never asks the browser.
   ────────────────────────────────────────────────────────────── */

import { ARTIST_FORM } from '../../../src/data/intake-forms';
import { findClientPage, formForClient } from '../intake';

interface Env { NOTION_TOKEN: string }

const answer = (form: string) => new Response(JSON.stringify({ ok: true, form }), {
  status: 200,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store',
    'X-Robots-Tag': 'noindex, nofollow',
  },
});

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const slug = (new URL(request.url).searchParams.get('client') ?? '').trim().toLowerCase().slice(0, 100);
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug) || !env.NOTION_TOKEN) return answer(ARTIST_FORM.id);
  return answer(formForClient(await findClientPage(env.NOTION_TOKEN, slug)).id);
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET') return next();
  return new Response(JSON.stringify({ ok: false, message: 'GET only.' }), {
    status: 405, headers: { 'Content-Type': 'application/json' },
  });
};
