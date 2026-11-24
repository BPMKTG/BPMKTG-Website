/* ──────────────────────────────────────────────────────────────
   The Content Vault, behind the portal's sign-in.

   SERVER ONLY. The rules are in src/data/vault.ts, the store in
   vault-db.ts, the sync in vault-sync.ts. This file is what the
   routes under /portal/<slug>/vault/ are made of:

     who is asking       the same cookie as the rest of the portal.
                         A client's is bound to one slug, the slug
                         names one Clients row, and that row's id is
                         in every query. There is no path from one
                         client's Vault into another's to get wrong.
     opening a file      the web-sized picture, made the first time
                         someone opens the file and kept. A video's
                         is its poster.
     playing a video     the preview service's own step (see
                         preview.ts), one per look, behind a cap on
                         how much footage we will convert because
                         somebody tapped Play.
     use in a post       an Idea in the client's Content Pipeline,
                         with the file attached or the files as its
                         slides. The one thing the Vault writes
                         outside itself.
     holding             a file put aside for a post or a campaign.

   Nothing here hands a browser a Drive address for a file's bytes or
   an R2 key. "Open original" is the file's own page in Drive, which
   Drive's own sign-in guards.
   ────────────────────────────────────────────────────────────── */

import { cardUrl } from '../data/push';
import { IMAGE_PX, itemPreview, previewKey, versionOfKey, type ItemPreview } from '../data/preview';
import { cleanItemTitle } from '../data/portal';
import { MAX_TITLE, cleanPatchText } from '../data/portal-content';
import { SLIDES_FIELD, addSlide, driveFileLink, slidesKey } from '../data/slides';
import {
  canPlay, useMedia, useTitle,
  type Playable, type VaultEdit, type VaultFile,
} from '../data/vault';
import {
  isValidSlug, normaliseSlug, portalNotFound, readViewer, sessionSecret, type Viewer,
} from './portal-auth';
import {
  CALENDAR_DB, CONTENT_DB, createContentPage, fetchCalendar, fetchPage, findClientBySlug, notionHeaders, patchPage,
  queryAll, readCheckbox, readDate, readRelation, readSelect, readText,
  type ClientRecord,
} from './portal-notion';
import { editedBy, isJsonRequest, isSameOrigin, readJsonBody } from './portal-write';
import { bustDataCache, type WriteEnv } from './portal-write-shared';
import { advancePreview, type PreviewEnv } from './preview';
import type { PushEnv } from './push';
import { changeManifest, newSlideId } from './slides';
import {
  clientKey, fileRecord, saveDuration, savePreview, saveThumbs, saveWebKey, vaultDb,
  type D1Like, type FileRecord, type HoldTarget, type VaultDbEnv,
} from './vault-db';
import { driveDrawing, driveItem, google } from './vault-drive';
import { makeThumb } from './vault-sync';

export type VaultRouteEnv = WriteEnv & VaultDbEnv & PreviewEnv & PushEnv;

export const vaultJson = (body: unknown, status = 200): Response => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store, private', 'X-Robots-Tag': 'noindex, nofollow' },
});

/** A refusal that can be explained to whoever is signed in. */
export const vaultRefuse = (error: string, message: string, status = 400): Response =>
  vaultJson({ ok: false, error, message }, status);

/* ── who is asking ────────────────────────────────────────────── */

export interface VaultContext {
  slug: string;
  viewer: Viewer;
  admin: boolean;
  /** The client's key in every Vault table. */
  client: string;
  db: D1Like;
  body: Record<string, unknown>;
}

interface Known { pageId: string; on: boolean }

/**
 * Which client a slug is, and whether their portal is on, remembered
 * for five minutes.
 *
 * A grid is a few hundred requests for thumbnails and asking Notion
 * on each would be most of the wait. What is remembered is the row a
 * slug names, which does not change, and whether the portal is on:
 * one switched off stops serving its Vault within five minutes.
 */
async function knownClient(token: string, slug: string): Promise<Known | null> {
  const key = `https://vault-client.invalid/${encodeURIComponent(slug)}`;
  try {
    const hit = await caches.default.match(key);
    if (hit) {
      const v = await hit.json() as Known | { none: true };
      return 'none' in v ? null : v;
    }
  } catch { /* no cache is not a reason to refuse */ }
  const record = await findClientBySlug(token, slug);
  const known: Known | null = record ? { pageId: record.pageId, on: record.portalEnabled } : null;
  try {
    await caches.default.put(key, new Response(JSON.stringify(known ?? { none: true }), {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${known ? 300 : 30}` },
    }));
  } catch { /* as above */ }
  return known;
}

/**
 * The start of every Vault route. Everything that can go wrong before
 * the Vault itself is looked at ends in the portal's one 404, the
 * same as a page that does not exist.
 *
 * One of us may open any client's Vault, portal on or off: HQ's
 * Vault is every client. A client may open their own, while their
 * portal is on.
 */
export async function beginVault(
  request: Request, env: VaultRouteEnv, rawSlug: unknown, o: { post: boolean },
): Promise<{ ok: true; ctx: VaultContext } | { ok: false; response: Response }> {
  const fail = { ok: false as const, response: portalNotFound() };
  if (!env.NOTION_TOKEN) return fail;
  if (o.post && (!isSameOrigin(request) || !isJsonRequest(request))) return fail;
  const slug = normaliseSlug(rawSlug as string);
  if (!isValidSlug(slug)) return fail;
  // Sign-in before anything about the Vault is looked at.
  const viewer = await readViewer(request, sessionSecret(env), slug);
  if (!viewer) return fail;
  const admin = viewer.role === 'admin';
  const body = o.post ? await readJsonBody(request) : {};
  if (!body) return fail;
  const known = await knownClient(env.NOTION_TOKEN, slug);
  if (!known || (!admin && !known.on)) return fail;
  const db = await vaultDb(env);
  // Not set up yet. To a client that is a page that is not there; one
  // of us is told what is missing.
  if (!db) {
    return admin
      ? { ok: false, response: vaultRefuse('not_configured', 'The Vault database is not bound to this site yet (VAULT_DB).', 503) }
      : fail;
  }
  return { ok: true, ctx: { slug, viewer, admin, client: clientKey(known.pageId), db, body } };
}

/** The whole Clients row, for the routes that write to Notion or
 *  read a client's folders. Null is the portal's 404. */
export async function vaultRecord(env: VaultRouteEnv, ctx: VaultContext): Promise<ClientRecord | null> {
  const record = await findClientBySlug(env.NOTION_TOKEN, ctx.slug);
  if (!record || clientKey(record.pageId) !== ctx.client) return null;
  if (!ctx.admin && !record.portalEnabled) return null;
  return record;
}

/* ── a thumbnail asked for before one was made ────────────────── */

function newVersion(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * A file's thumbnail, made now if there is not one.
 *
 * The page asks our preview route for a thumbnail it knows the
 * version of. It comes here for one it has no version for (the sync
 * has not reached it) and for one whose address did not answer (the
 * record and the files have come apart). Either way the answer is
 * the picture, and the record is put right.
 */
export async function thumbFor(env: VaultRouteEnv, ctx: VaultContext, id: string): Promise<{ key: string } | null> {
  const bucket = env.REPORTS_BUCKET;
  if (!bucket) return null;
  const rec = await fileRecord(ctx.db, ctx.client, id);
  if (!rec) return null;
  // A key filed under another slug is not one this page can be sent.
  const mine = (key: string | null): key is string => !!key && key.startsWith(`previews/${ctx.slug}/`) && !!versionOfKey(key, id);
  if (mine(rec.thumbKey) && await bucket.head(rec.thumbKey).catch(() => null)) return { key: rec.thumbKey };
  const g = await google(env);
  if (!g.ok) return null;
  const one = await driveItem(g.token, rec.driveId);
  if (!one.ok) return null;
  const key = await makeThumb(bucket, ctx.slug, id, one.item.thumbnailLink).catch(() => null);
  await saveThumbs(ctx.db, ctx.client, [{ id, key }], Date.now());
  if (key && rec.thumbKey && rec.thumbKey !== key && rec.thumbKey.startsWith('previews/')) {
    try { await bucket.delete(rec.thumbKey); } catch { /* an old thumbnail left behind is small */ }
  }
  return key ? { key } : null;
}

/* ── opening a file ───────────────────────────────────────────── */

export interface OpenAnswer {
  ok: true;
  /** The version of the web-sized picture (a video's poster), or
   *  null when Drive has not drawn one. */
  web: string | null;
  /** A video's converted copy: where it has got to. Null when nobody
   *  has asked for it to be played yet. */
  video: ItemPreview | null;
  /** May it be converted on demand? */
  play: Playable | null;
  /** Ask again in a few seconds. */
  wait: boolean;
  /** Drive no longer shows us the file. */
  gone?: boolean;
}

/**
 * Open one file: make sure its web-sized picture exists, and for a
 * video that somebody has asked to play, move its conversion on by
 * one step.
 *
 * `play` is "the Play button was tapped", and every look after it
 * while the page waits. `verify` is "the page tried to show it and
 * could not". `retry` is ours: build the video again from the start.
 */
export async function openFile(
  env: VaultRouteEnv, ctx: VaultContext, id: string, o: { play: boolean; verify: boolean; retry: boolean },
): Promise<OpenAnswer | null> {
  const bucket = env.REPORTS_BUCKET;
  const rec = await fileRecord(ctx.db, ctx.client, id);
  if (!rec || !bucket) return null;
  const now = Date.now();
  const answer: OpenAnswer = { ok: true, web: null, video: null, play: null, wait: false };
  const mine = (key: string | null): key is string => !!key && key.startsWith(`previews/${ctx.slug}/`) && !!versionOfKey(key, id);

  /* the web-sized picture */
  let seconds = rec.durationMs ? rec.durationMs / 1000 : null;
  let have = mine(rec.webKey) ? rec.webKey : null;
  if (have && o.verify && !(await bucket.head(have).catch(() => null))) have = null;
  if (!have) {
    const g = await google(env);
    const one = g.ok ? await driveItem(g.token, rec.driveId) : null;
    if (one && !one.ok && one.gone) answer.gone = true;
    if (one?.ok) {
      if (!seconds && one.item.durationMs) {
        seconds = one.item.durationMs / 1000;
        await saveDuration(ctx.db, ctx.client, id, one.item.durationMs);
      }
      const key = previewKey(ctx.slug, id, newVersion(), 'image');
      const drawn = key ? await driveDrawing(one.item.thumbnailLink, IMAGE_PX) : null;
      if (key && drawn) {
        const bytes = await drawn.arrayBuffer();
        if (bytes.byteLength) {
          await bucket.put(key, bytes, { httpMetadata: { contentType: drawn.headers.get('Content-Type') || 'image/jpeg' } });
          await saveWebKey(ctx.db, ctx.client, id, key, now);
          if (rec.webKey && rec.webKey !== key && rec.webKey.startsWith('previews/')) {
            try { await bucket.delete(rec.webKey); } catch { /* left behind, and small */ }
          }
          have = key;
        }
      }
    }
  }
  answer.web = versionOfKey(have, id);

  /* the video */
  if (rec.type !== 'Video') return answer;
  answer.play = canPlay(seconds);
  const link = driveFileLink(rec.driveId);
  const shown = (stored: FileRecord['preview']): ItemPreview | null =>
    (stored.status ? itemPreview(link, stored, id, { admin: ctx.admin }) ?? null : null);
  answer.video = shown(rec.preview);

  // Already made, or already on its way: carried on with whatever
  // the cap says now. The cap is on starting one.
  const under = rec.preview.status === 'Converting' || rec.preview.status === 'Ready';
  if (!o.play && !(under && o.verify)) {
    answer.wait = answer.video?.state === 'pending';
    return answer;
  }
  if (!under && answer.play !== 'yes') return answer;

  const out = await advancePreview(env, {
    owner: ctx.slug, itemId: id, title: rec.name, link, stored: rec.preview,
  }, (next) => savePreview(ctx.db, ctx.client, id, next, Date.now()), {
    verify: o.verify,
    force: o.retry && ctx.admin,
    // Two people tapping Play on the same clip make one conversion.
    reread: async () => (await fileRecord(ctx.db, ctx.client, id))?.preview ?? null,
  });
  if (out.note && out.outcome !== 'converting') console.log('vault: play', ctx.slug, id, out.outcome, out.note);
  answer.video = out.stored.status ? itemPreview(link, out.stored, id, { admin: ctx.admin }) ?? null : null;
  answer.wait = out.outcome === 'converting' || (out.outcome === 'busy' && answer.video?.state !== 'ready')
    || (out.outcome === 'ready' && answer.video?.state !== 'ready');
  // Something of ours is missing (a key, a binding). Said to us, and
  // to a client as a preview that is not available.
  if (out.outcome === 'not_configured' || out.outcome === 'try_later') {
    answer.video = { state: 'failed', ...(ctx.admin && out.note ? { why: out.note } : {}) };
  }
  return answer;
}

/* ── holding, and "made from" ─────────────────────────────────── */

const hex = (id: string): string => id.replace(/-/g, '').toLowerCase();

/**
 * What a hold's id is: one of this client's Content Pipeline items,
 * or one of their campaigns. Null when it is neither, or is somebody
 * else's. The name is read here and never taken from the request.
 */
export async function holdTarget(
  token: string, record: ClientRecord, want: { kind: 'item' | 'campaign'; id: string },
): Promise<HoldTarget | null> {
  const page = await fetchPage(token, want.id);
  if (!page || page.object !== 'page' || page.archived) return null;
  const p = page.properties ?? {};
  const owners = readRelation(p['Client']).map(hex);
  if (!owners.includes(hex(record.pageId))) return null;
  const db = hex(String(page.parent?.database_id ?? ''));
  if (want.kind === 'item') {
    if (db !== hex(CONTENT_DB) || readSelect(p['Deliverable'])) return null;
    return { kind: 'item', id: hex(page.id), title: (readText(p['Content']) ?? '').trim() || 'Untitled post' };
  }
  if (db !== hex(CALENDAR_DB) || readCheckbox(p['Is Playbook']) || readSelect(p['Kind']) !== 'Moment') return null;
  // Named the way the calendar names it: without the artist in front.
  const title = cleanItemTitle(readText(p['Item']) ?? '', record.client.artist).title;
  return { kind: 'campaign', id: hex(page.id), title: title || 'Untitled campaign' };
}

/** Does this edit need the whole Clients row and a look at Notion? */
export const editNeedsNotion = (edit: VaultEdit): boolean => !!edit.hold || !!edit.madeFrom;

export interface PickList {
  items: Array<{ id: string; title: string; status: string | null; date: string | null }>;
  campaigns: Array<{ id: string; title: string; date: string | null }>;
}

/**
 * What a file can be held for, or said to be the source of: this
 * client's posts that are not out yet, and their campaigns. Ours
 * only, so rows we are holding back from the client are in it.
 */
export async function pickList(token: string, record: ClientRecord): Promise<PickList> {
  const [pages, calendar] = await Promise.all([
    queryAll(token, CONTENT_DB, { filter: { property: 'Client', relation: { contains: record.pageId } } }).catch(() => []),
    fetchCalendar(token, record.pageId, record.client.artist).catch(() => []),
  ]);
  const items = pages
    .filter((page: any) => !readSelect(page?.properties?.['Deliverable']))
    .map((page: any) => ({
      id: hex(page.id),
      title: (readText(page.properties?.['Content']) ?? '').trim() || 'Untitled post',
      status: readSelect(page.properties?.['Status']),
      date: readDate(page.properties?.['Post Date']),
    }))
    .filter((i: { status: string | null }) => i.status !== 'Skipped')
    .sort((a: { date: string | null; title: string }, b: { date: string | null; title: string }) =>
      (b.date ?? '').localeCompare(a.date ?? '') || a.title.localeCompare(b.title));
  const campaigns = calendar
    .filter((c: any) => c.momentType)
    .map((c: any) => ({ id: hex(c.id), title: String(c.title ?? '').trim() || 'Untitled campaign', date: c.date ?? null }))
    .sort((a: { date: string | null }, b: { date: string | null }) => (b.date ?? '').localeCompare(a.date ?? ''));
  return { items, campaigns };
}

/* ── use in a post ────────────────────────────────────────────── */

/** The names a select has in the Content Pipeline as it is now. */
async function pipelineOptions(token: string): Promise<Record<string, string[]> | null> {
  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${CONTENT_DB}`, { headers: notionHeaders(token) });
    if (!res.ok) return null;
    const db: any = await res.json();
    const out: Record<string, string[]> = {};
    for (const [name, p] of Object.entries<any>(db.properties ?? {})) {
      const list = p?.type === 'select' ? p.select?.options : p?.type === 'multi_select' ? p.multi_select?.options : null;
      out[name] = Array.isArray(list) ? list.map((o: any) => String(o?.name ?? '')) : [];
    }
    return out;
  } catch { return null; }
}

export type UseAnswer =
  | { ok: true; id: string; title: string; url: string; slides: number; note?: string }
  | { ok: false; error: string; message: string };

/**
 * "Use in a post": an Idea in this client's Content Pipeline, made
 * from Vault files.
 *
 * One file is attached as the Idea's Edit Link, so the card shows
 * it. Several become the Idea's slides, in the order they were
 * picked. Every part of the new row is set here: whose it is comes
 * from the session's slug, the files from the Vault's own record of
 * them (the request names ids, never links), and the only words the
 * request supplies are the title.
 *
 * The Idea is the client's to post, like any idea they add
 * themselves, so it is not counted toward what we owe in a month.
 * Each select is set only to a name the pipeline already has.
 */
export async function useInPost(
  env: VaultRouteEnv, ctx: VaultContext, record: ClientRecord, files: readonly VaultFile[], rawTitle: unknown,
): Promise<UseAnswer> {
  const live = files.filter((f) => !f.missing);
  if (!live.length) return { ok: false, error: 'none', message: 'None of those files can be used. They may have been removed from Drive.' };
  const options = await pipelineOptions(env.NOTION_TOKEN);
  if (!options) return { ok: false, error: 'try_later', message: 'The Content Pipeline did not answer. Try again in a moment.' };
  const has = (field: string, name: string): boolean => (options[field] ?? []).includes(name);
  if (!has('Status', 'Idea')) return { ok: false, error: 'pipeline', message: 'The Content Pipeline has no Idea status to put this in.' };

  const typed = cleanPatchText(rawTitle, MAX_TITLE);
  const title = (typeof typed === 'string' && typed) || useTitle(live);
  const { media, source } = useMedia(live);
  const many = live.length > 1;
  if (many && (!env.REPORTS_BUCKET || !slidesKey(ctx.slug, '0'.repeat(32)))) {
    return { ok: false, error: 'not_configured', message: 'There is nowhere to keep slides (the R2 bucket is not bound).' };
  }
  if (many && !has('Media', 'Carousel')) {
    return { ok: false, error: 'pipeline', message: 'The Content Pipeline has no Carousel option under Media.' };
  }

  const item = await createContentPage(env.NOTION_TOKEN, {
    Content: { title: [{ text: { content: title } }] },
    Status: { select: { name: 'Idea' } },
    ...(has('Media', media) ? { Media: { select: { name: media } } } : {}),
    ...(has('Source', source) ? { Source: { select: { name: source } } } : {}),
    ...(has('Posted By', 'Client') ? { 'Posted By': { select: { name: 'Client' } } } : {}),
    ...(many ? {} : { 'Edit Link': { url: driveFileLink(live[0].drive) } }),
    Client: { relation: [{ id: record.pageId }] },
    'Hide from Client': { checkbox: false },
    'Last Edited By': { select: { name: editedBy(ctx.viewer.role) } },
  });
  if (!item) return { ok: false, error: 'try_later', message: 'The Idea could not be created. Try again in a moment.' };

  let slides = 0;
  let note: string | undefined;
  if (many) {
    const out = await changeManifest(env.REPORTS_BUCKET, ctx.slug, item.id, (m) => {
      let next = m;
      for (const f of live) {
        const added = addSlide(next, f.drive, newSlideId(), f.name);
        if (added.ok) next = added.manifest;
      }
      return next;
    });
    slides = out?.manifest.slides.length ?? 0;
    const key = slidesKey(ctx.slug, item.id);
    if (slides && key) {
      await patchPage(env.NOTION_TOKEN, item.id, { [SLIDES_FIELD]: { rich_text: [{ text: { content: key } }] } }, 'vault use');
    }
    if (slides < live.length) {
      note = slides
        ? `The Idea was created with ${slides} of the ${live.length} files as slides.`
        : 'The Idea was created, but its slides could not be saved. Add them from the card.';
    }
  }
  await bustDataCache(ctx.slug, env);
  return { ok: true, id: hex(item.id), title: item.title, url: cardUrl(ctx.slug, item.id), slides, ...(note ? { note } : {}) };
}
