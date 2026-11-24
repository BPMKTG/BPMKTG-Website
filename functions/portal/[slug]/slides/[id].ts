/* ──────────────────────────────────────────────────────────────
   POST /portal/<slug>/slides/<item>   the slides of one post.

   Anyone signed in to this client's portal:

     {}                    where are this item's slides? Moves on the
                           ones that are not ready, and answers
     { verify: <slide> }   "I tried to show that one and could not":
                           its files are checked, and rebuilt if they
                           are not there

   Us only. A client who sends one of these gets the same 404 as
   anyone asking for a page that does not exist:

     { add: <link> }       one Drive file, added to the end; or one
                           Drive folder, and the list becomes every
                           image and video in it, by filename
     { remove: <slide> }
     { order: [<slide>] }  the same slides, in a new order
     { resync: true }      match the folder again
     { retry: <slide> }    build that slide's preview from the start

   The files themselves are served by /portal/<slug>/preview/..., the
   same route and the same sign-in a single preview uses.

   Nothing here tells a client anything. Adding, removing and
   reordering slides is us getting a post ready; the one thing a
   client is told about is the post moving into review, and that is
   said by the content route when the status changes.
   ────────────────────────────────────────────────────────────── */

import {
  MAX_SLIDES, SLIDES_FIELD, addSlide, isSlideId, isSlideMedia, matchFolder, removeSlide, reorderSlides,
  slideSource, slidesKey, type Slide,
} from '../../../../src/data/slides';
import {
  isValidSlug, normaliseSlug, portalNotFound, readViewer, sessionSecret,
} from '../../../../src/server/portal-auth';
import {
  fetchOwnedContent, fetchPage, findClientBySlug, patchPage, readRelation, readSelect, readText,
} from '../../../../src/server/portal-notion';
import { isJsonRequest, isSameOrigin, readJsonBody } from '../../../../src/server/portal-write';
import { bustDataCache, overLimit, type WriteEnv } from '../../../../src/server/portal-write-shared';
import { discardPreview } from '../../../../src/server/preview';
import { notifyAdmins, type PushEnv } from '../../../../src/server/push';
import {
  advanceSlides, changeManifest, dropManifest, listFolderMedia, newSlideId, readManifest, slidesAnswer,
  type SlidesEnv,
} from '../../../../src/server/slides';

type Env = WriteEnv & SlidesEnv & PushEnv;

const ITEM = /^[0-9a-f]{32}$/;
const ACTIONS = ['add', 'remove', 'order', 'resync', 'retry'] as const;

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' },
});

/** A refusal we can explain. Only ever sent to one of us. */
const refuse = (error: string, message: string): Response => json({ ok: false, error, message }, 400);

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params, waitUntil }) => {
  if (!env.NOTION_TOKEN) return portalNotFound();
  if (!isSameOrigin(request) || !isJsonRequest(request)) return portalNotFound();
  const slug = normaliseSlug(params.slug as string);
  if (!isValidSlug(slug)) return portalNotFound();
  const viewer = await readViewer(request, sessionSecret(env), slug);
  if (!viewer) return portalNotFound();

  const item = String(params.id ?? '').replace(/-/g, '').toLowerCase();
  if (!ITEM.test(item) || !slidesKey(slug, item)) return portalNotFound();
  const body = await readJsonBody(request);
  if (!body) return portalNotFound();

  const admin = viewer.role === 'admin';
  const action = ACTIONS.find((a) => a in body) ?? null;
  // Changing the list is ours to do. Refused before anything is read.
  if (action && !admin) return portalNotFound();

  // A page that is waiting asks every few seconds for a few minutes.
  if (await overLimit('sl', slug, 240, 600)) return json({ ok: false, error: 'slow_down' }, 429);

  const record = await findClientBySlug(env.NOTION_TOKEN, slug);
  if (!record || !record.portalEnabled) return portalNotFound();

  // The item must be this client's. A client is refused a row we are
  // holding back, the same as everywhere else; we are not.
  let page: any = null;
  if (admin) {
    const got = await fetchPage(env.NOTION_TOKEN, item);
    const owners = readRelation(got?.properties?.['Client']).map((id) => id.replace(/-/g, ''));
    if (got && got.object === 'page' && !got.archived && owners.includes(record.pageId.replace(/-/g, ''))) page = got;
  } else {
    page = (await fetchOwnedContent(env.NOTION_TOKEN, record.pageId, item))?.page ?? null;
  }
  if (!page) return portalNotFound();

  const p = page.properties ?? {};
  const title = (readText(p['Content']) ?? '').trim();
  const bucket = env.REPORTS_BUCKET;
  const key = slidesKey(slug, item)!;
  const noted = (readText(p[SLIDES_FIELD]) ?? '').trim();

  /* ── a change to the list ── */
  if (action) {
    if (!bucket) return refuse('not_configured', 'The R2 bucket is not bound, so there is nowhere to keep slides.');
    if (!isSlideMedia(readSelect(p['Media']))) {
      return refuse('media', 'Slides are for Carousel and Story items. Set Media to one of those first.');
    }

    const gone: Slide[] = [];
    let message: string | undefined;
    let manifest = (await readManifest(bucket, slug, item))?.manifest ?? null;

    if (action === 'add') {
      const source = slideSource(typeof body.add === 'string' ? body.add : '');
      if (!source) return refuse('link', 'Paste the link to one Drive file, or to a Drive folder.');

      if (source.kind === 'file') {
        const id = newSlideId();
        let refused: Response | null = null;
        const out = await changeManifest(bucket, slug, item, (m) => {
          const added = addSlide(m, source.id, id);
          if (added.ok) { refused = null; return added.manifest; }
          refused = added.why === 'full'
            ? refuse('full', `A post holds up to ${MAX_SLIDES} slides.`)
            : refuse('duplicate', `That file is already slide ${added.n}.`);
          return null;
        });
        if (refused) return refused;
        if (!out) return refuse('store', 'The slide could not be saved. Try again.');
        manifest = out.manifest;
      } else {
        const listed = await listFolderMedia(env, source.id);
        if (!listed.ok) return folderRefusal(listed);
        if (!listed.files.length) return refuse('folder_empty', 'There are no photos or videos directly inside that folder.');
        const out = await changeManifest(bucket, slug, item, (m) => {
          const matched = matchFolder(m, source.id, listed.files, newSlideId);
          gone.length = 0;
          gone.push(...matched.removed);
          message = matched.over
            ? `That folder has ${listed.files.length} files. The first ${MAX_SLIDES} by filename were added.`
            : undefined;
          return matched.manifest;
        });
        if (!out) return refuse('store', 'The slides could not be saved. Try again.');
        manifest = out.manifest;
      }
    }

    if (action === 'resync') {
      const folder = manifest?.folder ?? null;
      if (!folder) return refuse('no_folder', 'These slides were not added from a folder.');
      const listed = await listFolderMedia(env, folder);
      if (!listed.ok) return folderRefusal(listed);
      const out = await changeManifest(bucket, slug, item, (m) => {
        const matched = matchFolder(m, folder, listed.files, newSlideId);
        gone.length = 0;
        gone.push(...matched.removed);
        message = matched.over
          ? `That folder has ${listed.files.length} files. The first ${MAX_SLIDES} by filename are used.`
          : undefined;
        return matched.manifest;
      });
      if (!out) return refuse('store', 'The slides could not be saved. Try again.');
      manifest = out.manifest;
    }

    if (action === 'remove') {
      if (!isSlideId(body.remove)) return refuse('slide', 'That slide is not in this post any more.');
      const out = await changeManifest(bucket, slug, item, (m) => {
        const cut = removeSlide(m, body.remove as string);
        gone.length = 0;
        if (!cut.removed) return null;
        gone.push(cut.removed);
        return cut.manifest;
      });
      if (!out) return refuse('store', 'The slide could not be removed. Try again.');
      manifest = out.manifest;
    }

    if (action === 'order') {
      let stale = false;
      const out = await changeManifest(bucket, slug, item, (m) => {
        const next = reorderSlides(m, body.order);
        stale = !next;
        return next;
      });
      if (!out) return refuse('store', 'The order could not be saved. Try again.');
      manifest = out.manifest;
      // The list on the page was not the list there is. Nothing was
      // moved; the answer below is the list as it stands.
      if (stale) message = 'The slides changed while you were moving them. Have another look.';
    }

    if (action === 'retry' && !isSlideId(body.retry)) return refuse('slide', 'That slide is not in this post any more.');

    // What was made for slides that are no longer in the post.
    for (const s of gone) await discardPreview(env, s.preview);

    // Notion's one field: there is a list, or there is not. A list
    // with nothing left in it is not kept, folder and all, so taking
    // the last slide out is a clean start.
    const has = !!manifest && manifest.slides.length > 0;
    if (has && noted !== key) {
      await patchPage(env.NOTION_TOKEN, page.id, { [SLIDES_FIELD]: { rich_text: [{ text: { content: key } }] } }, 'slides');
    } else if (!has && manifest) {
      await dropManifest(bucket, slug, item);
      if (noted) await patchPage(env.NOTION_TOKEN, page.id, { [SLIDES_FIELD]: { rich_text: [] } }, 'slides');
      manifest = null;
    }

    // A retry is the one change that is itself a step. The rest
    // answer straight away, and the page asks again for the previews.
    const progress = action === 'retry'
      ? await advanceSlides(env, { owner: slug, itemId: item, title }, { retry: body.retry as string, builds: 1, checks: 0 })
      : null;
    if (progress?.manifest) manifest = progress.manifest;

    await bustDataCache(slug, env);
    const answer = slidesAnswer(manifest, item, { admin: true });
    return json({
      ok: true,
      ...answer,
      wait: !progress?.setup && answer.slides.some((s) => s.preview.state === 'pending'),
      ...(message ? { message } : {}),
      ...(progress?.setup ? { setup: progress.setup } : {}),
    });
  }

  /* ── where are they? ── */
  const verify = isSlideId(body.verify) ? body.verify : null;
  const progress = await advanceSlides(env, { owner: slug, itemId: item, title }, { verify });
  if (progress.changed) await bustDataCache(slug, env);
  // Each lands in "Previews to fix". Said once, on the step that made
  // it a failure, and to us: a client is never told about a slide.
  for (const n of progress.newlyFailed) {
    waitUntil(notifyAdmins(env, 'preview', {
      client: record.client.artist, slug, item: `${title} (slide ${n})`, id: item,
    }));
  }
  const answer = slidesAnswer(progress.manifest, item, { admin });
  return json({
    ok: true,
    ...answer,
    // Whether asking again soon is worth it. Not when something is
    // missing on our side.
    wait: !progress.setup && answer.slides.some((s) => s.preview.state === 'pending'),
    ...(admin && progress.setup ? { setup: progress.setup } : {}),
  });
};

function folderRefusal(
  listed: { ok: false; why: 'not_configured'; note: string } | { ok: false; why: 'unreadable'; email: string }
        | { ok: false; why: 'try_later'; note: string },
): Response {
  if (listed.why === 'unreadable') {
    return refuse('folder', `Drive will not show us that folder. Share it with ${listed.email} as a Viewer.`);
  }
  if (listed.why === 'not_configured') return refuse('not_configured', listed.note);
  return refuse('try_later', `${listed.note} Try again in a moment.`);
}

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
