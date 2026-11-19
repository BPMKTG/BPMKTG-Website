/* ──────────────────────────────────────────────────────────────
   /portal/<slug>/preview/...   a preview, behind the portal's sign-in.

     GET  /portal/<slug>/preview/<item>/<version>/<variant>
          One file of a preview out of R2: image, thumb or video.

     POST /portal/<slug>/preview/<item>
          "Is this item's preview ready?" Moves it on by one step if
          it is not, and answers with where it is now.

   R2 has no public address here. Every byte comes through this
   route, so a preview is seen by the client it belongs to and by us,
   and a copied address is a 404 for anyone else.

   The address is not the permission; the cookie is. A client's
   session is bound to one slug, the key is built from that slug, and
   nothing a request types reaches the key except as one of three
   checked shapes (see previewKey). There is no path to another
   client's files to get wrong.

   A video is answered in byte ranges. A phone asks for the first two
   bytes, then the index, then the picture in pieces, and will not
   play from a server that only knows how to send the whole file.
   ────────────────────────────────────────────────────────────── */

import {
  VARIANT_TYPE, isPreviewVariant, isPreviewVersion, itemPreview, parseRange, previewKey,
} from '../../../../src/data/preview';
import {
  isValidSlug, normaliseSlug, portalNotFound, readViewer, sessionSecret,
} from '../../../../src/server/portal-auth';
import {
  fetchOwnedContent, fetchPage, findClientBySlug, patchPage, readRelation, readText, readUrl,
} from '../../../../src/server/portal-notion';
import { isJsonRequest, isSameOrigin, readJsonBody } from '../../../../src/server/portal-write';
import { bustDataCache, overLimit, type WriteEnv } from '../../../../src/server/portal-write-shared';
import {
  advancePreview, readStoredPreview, storedPreviewProperties, type PreviewEnv,
} from '../../../../src/server/preview';

type Env = WriteEnv & PreviewEnv;

const ITEM = /^[0-9a-f]{32}$/;

/** "Is this slug a client whose portal is on?", remembered for five
 *  minutes. A video is a dozen requests, and asking Notion on every
 *  one would make it stutter. A portal that is switched off stops
 *  serving previews within five minutes, and its data straight away. */
async function portalIsOn(token: string, slug: string): Promise<boolean> {
  const key = `https://portal-on.invalid/${encodeURIComponent(slug)}`;
  try {
    const hit = await caches.default.match(key);
    if (hit) return (await hit.text()) === '1';
  } catch { /* no cache is not a reason to refuse */ }
  const record = await findClientBySlug(token, slug);
  const on = !!record && record.portalEnabled;
  try {
    await caches.default.put(key, new Response(on ? '1' : '0', { headers: { 'Cache-Control': 'max-age=300' } }));
  } catch { /* as above */ }
  return on;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.NOTION_TOKEN || !env.REPORTS_BUCKET) return portalNotFound();
  const slug = normaliseSlug(params.slug as string);
  if (!isValidSlug(slug)) return portalNotFound();

  // Sign-in before anything about the file is looked at.
  const viewer = await readViewer(request, sessionSecret(env), slug);
  if (!viewer) return portalNotFound();

  const parts = Array.isArray(params.path) ? params.path : [];
  if (parts.length !== 3) return portalNotFound();
  const [item, version, variant] = parts.map(String);
  if (!ITEM.test(item) || !isPreviewVersion(version) || !isPreviewVariant(variant)) return portalNotFound();
  const key = previewKey(slug, item, version, variant);
  if (!key) return portalNotFound();

  if (viewer.role !== 'admin' && !(await portalIsOn(env.NOTION_TOKEN, slug))) return portalNotFound();

  const head = await env.REPORTS_BUCKET.head(key);
  if (!head) return portalNotFound();

  const common: Record<string, string> = {
    'Content-Type': head.httpMetadata?.contentType || VARIANT_TYPE[variant],
    'Accept-Ranges': 'bytes',
    ETag: head.httpEtag,
    // Private: it may be kept by this person's own browser, never by
    // anything in between. The version is in the address, so a
    // rebuilt preview is a new address and this never goes stale.
    'Cache-Control': 'private, max-age=3600',
    'Content-Disposition': 'inline',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'no-referrer',
  };

  if (request.headers.get('If-None-Match') === head.httpEtag && !request.headers.get('Range')) {
    return new Response(null, { status: 304, headers: common });
  }

  const range = parseRange(request.headers.get('Range'), head.size);
  if (range === null) {
    return new Response(null, { status: 416, headers: { ...common, 'Content-Range': `bytes */${head.size}` } });
  }
  if (range === 'all') {
    const object = await env.REPORTS_BUCKET.get(key);
    if (!object) return portalNotFound();
    return new Response(object.body, { headers: { ...common, 'Content-Length': String(head.size) } });
  }
  const object = await env.REPORTS_BUCKET.get(key, { range });
  if (!object) return portalNotFound();
  return new Response(object.body, {
    status: 206,
    headers: {
      ...common,
      'Content-Length': String(range.length),
      'Content-Range': `bytes ${range.offset}-${range.offset + range.length - 1}/${head.size}`,
    },
  });
};

const json = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' },
});

export const onRequestPost: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!env.NOTION_TOKEN) return portalNotFound();
  if (!isSameOrigin(request) || !isJsonRequest(request)) return portalNotFound();
  const slug = normaliseSlug(params.slug as string);
  if (!isValidSlug(slug)) return portalNotFound();
  const viewer = await readViewer(request, sessionSecret(env), slug);
  if (!viewer) return portalNotFound();

  const parts = Array.isArray(params.path) ? params.path : [];
  if (parts.length !== 1 || !ITEM.test(String(parts[0]))) return portalNotFound();
  const item = String(parts[0]);
  const body = await readJsonBody(request);
  if (!body) return portalNotFound();

  // A page that is waiting asks every few seconds for a couple of
  // minutes. Past that it is not a page waiting.
  if (await overLimit('pv', slug, 150, 600)) return json({ ok: false, error: 'slow_down' }, 429);

  const record = await findClientBySlug(env.NOTION_TOKEN, slug);
  if (!record || !record.portalEnabled) return portalNotFound();

  // The item must be this client's. A client is refused a row we are
  // holding back, the same as everywhere else; we are not.
  let page: any = null;
  if (viewer.role === 'admin') {
    const got = await fetchPage(env.NOTION_TOKEN, item);
    const owners = readRelation(got?.properties?.['Client']).map((id) => id.replace(/-/g, ''));
    if (got && got.object === 'page' && !got.archived && owners.includes(record.pageId.replace(/-/g, ''))) page = got;
  } else {
    page = (await fetchOwnedContent(env.NOTION_TOKEN, record.pageId, item))?.page ?? null;
  }
  if (!page) return portalNotFound();

  const p = page.properties ?? {};
  const link = readUrl(p['Edit Link']);
  const stored = readStoredPreview(p);
  const out = await advancePreview(env, {
    owner: slug, itemId: item, title: (readText(p['Content']) ?? '').trim(), link, stored,
  }, (next) => patchPage(env.NOTION_TOKEN, page.id, storedPreviewProperties(next), 'preview'), {
    // "I tried to play it and could not": only then is R2 asked
    // whether the files are really there.
    verify: body.verify === true,
  });

  if (out.stored !== stored) await bustDataCache(slug, env);
  if (out.note && out.outcome !== 'converting') console.log('preview:', slug, item, out.outcome, out.note);
  const preview = itemPreview(link, out.stored, item) ?? null;
  return json({
    ok: true,
    preview,
    // Whether asking again soon is worth it. Not when something is
    // missing on our side, and not when it has failed.
    wait: out.outcome === 'converting' || (out.outcome === 'ready' && preview?.state !== 'ready'),
  });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'POST') return next();
  return portalNotFound();
};
