/* ──────────────────────────────────────────────────────────────
   The Content Vault's sync: what is in Drive, written into the Vault.

   SERVER ONLY, and Drive is only ever read (see vault-drive.ts).

   A sync of one client is these things, in this order:

     listing      finds the client's folders (Footage Drop and
                  Finished Content inside their Drive Folder, and any
                  Archive folders) and reads every image and video
                  under each, a page of Drive's answer at a time.
                  Each page is logged as it is read: new files by the
                  Drive file's id, known ones brought up to date.
                  When every folder has been read to the end, a file
                  that was not seen is marked Missing. Nothing is
                  ever deleted from the Vault
     thumbnails   makes a thumbnail for each file that has none
     linking      links files to the Moments in the client's Campaign
                  Calendar, brings the usage log in line with what is
                  Posted, and tells HQ how many new Raw files there
                  are, once

   It is taken in STEPS. `syncClient` takes one: a few seconds of
   work, written down as it goes, then it lets go. Whoever asks next
   takes the next step from exactly where the last one stopped: the
   page that pressed "Sync now", HQ being opened, the daily Worker.
   So nothing rides on one long request. A page that is reloaded or
   closed costs the step it was in the middle of, which is done again,
   and no more. To the person watching it is one pass with a progress
   line.

   Only one step is taken for a client at a time. A step says it is
   alive every few seconds; one that has gone quiet was cut off, and
   the step is anyone's.

   A folder that cannot be listed is never read as an empty one. If
   any page of any folder will not list, the sync says it failed and
   marks nothing Missing, because the other reading of "we saw none
   of them" is two thousand files marked Missing.
   ────────────────────────────────────────────────────────────── */

import { THUMB_PX, driveFileId, previewKey } from '../data/preview';
import {
  ROOT_LABEL, SYNC_QUIET_MS, fileDate, matchMoments, placeFile, vaultOrientation, vaultType,
  type SourceState, type VaultMoment, type VaultRoot, type VaultSourceStatus, type VaultSyncStatus,
} from '../data/vault';
import {
  CONTENT_DB, fetchCalendar, fetchPortalRecords, queryAll, readCheckbox, readDate, readMultiSelect, readSelect, readText,
  readUrl,
  type ClientRecord,
} from './portal-notion';
import type { PreviewEnv } from './preview';
import { notifyVaultFiles, type PushEnv } from './push';
import { readManifest } from './slides';
import {
  LIVE_PHASES, allSyncRows, beatSync, claimNewRaw, clientKey, countNeedingThumbs, countSeen, endSync, fileIdsByDrive,
  filesNeedingThumbs, insertFiles, linkRows, listMade, loadIndex, markSeen, markUnseenMissing, reconcileUses, refreshFiles,
  releaseStep, saveLinks, saveThumbs, syncRow, takeStep, vaultDb, vaultFileId,
  type D1Like, type FileFacts, type PostUse, type SyncRow, type VaultDbEnv,
} from './vault-db';
import {
  MAX_FOLDERS, PARENTS_PER_ASK, driveDrawing, driveItem, findSourceFolders, google, listPage, lookAtFolder,
  type DriveFolder, type Meter, type WalkedFile,
} from './vault-drive';

export type VaultEnv = VaultDbEnv & PreviewEnv & PushEnv & { NOTION_TOKEN: string };

/* ── how much one step does ───────────────────────────────────── */

/** A step works for about this long and then lets go. Short enough
 *  that a page reloaded in the middle of one loses little; long
 *  enough that a small client is done in one. */
export const STEP_MS = 10 * 1000;
/** And it stops after this many calls out, whatever the clock says.
 *  A request may make ten thousand. */
export const CALL_BUDGET = 3000;
/** A sync left part way can be carried on for this long. After it, a
 *  new one starts from the top: Drive's place-markers do not keep. */
export const RESUME_MS = 6 * 60 * 60 * 1000;
/** A step says it is alive this often, whatever it is waiting on. */
const PULSE_MS = 5 * 1000;
/** Drive's address for a thumbnail is used for this long after it
 *  was given. Past it the file is asked about again. */
const LINK_GOOD_MS = 50 * 60 * 1000;
/** Thumbnails are made this many at a time, which is as many
 *  connections as a request may have opening at once. */
const AT_ONCE = 6;
/** Progress is written down after every this many. */
const ROUND = 60;

export interface SyncCounts {
  listed: number;
  added: number;
  updated: number;
  missing: number;
  thumbs: number;
  thumbsLeft: number;
  shortcuts: number;
  linked: number;
  usesAdded: number;
  usesRemoved: number;
}

const noCounts = (): SyncCounts => ({
  listed: 0, added: 0, updated: 0, missing: 0, thumbs: 0, thumbsLeft: 0, shortcuts: 0, linked: 0, usesAdded: 0, usesRemoved: 0,
});

/* ── the status a page is told ────────────────────────────────── */

function parse<T>(raw: string | null | undefined, fallback: T): T {
  try { const v = JSON.parse(raw || ''); return v && typeof v === 'object' ? v as T : fallback; } catch { return fallback; }
}

/** What a sync that stopped without finishing is said to have done. */
export const CUT_OFF = 'It was cut off part way. Retry carries on from where it stopped.';

/**
 * A sync's record, as a page is told it. `email` is the address a
 * folder is shared with, and is only ever given to one of us.
 *
 * "Running" is read off the record, never remembered: a sync is
 * running while it is part way AND has shown a sign of life in the
 * last half minute. One that is part way and silent has died, and is
 * told as failed with the time it was last heard from. So "Syncing
 * now" cannot outlive a sync by more than that half minute, whatever
 * happened to it.
 */
export function syncStatus(row: SyncRow | null, o: { now: number; email?: string | null; admin: boolean }): VaultSyncStatus {
  const counts = { ...noCounts(), ...parse<Partial<SyncCounts>>(row?.counts, {}) };
  const sources = parse<VaultSourceStatus[]>(row?.sources, []);
  const live = !!row?.phase && LIVE_PHASES.includes(row.phase);
  const running = live && !!row?.beat_at && o.now - row.beat_at < SYNC_QUIET_MS;
  const stalled = live && !running;
  const failed = stalled || row?.phase === 'failed';
  return {
    never: !row?.ok_at && !row?.started_at,
    running,
    stalled,
    phase: !row?.phase ? null : failed ? 'failed' : (row.phase as VaultSyncStatus['phase']),
    startedAt: row?.started_at ?? null,
    finishedAt: row?.finished_at ?? null,
    okAt: row?.ok_at ?? null,
    listed: counts.listed,
    added: counts.added,
    missing: counts.missing,
    thumbs: counts.thumbs,
    thumbsLeft: counts.thumbsLeft,
    linked: counts.linked,
    error: stalled ? CUT_OFF : row?.phase === 'failed' ? (row?.error ?? 'It stopped on an error.') : null,
    failedAt: stalled ? (row?.beat_at ?? null) : row?.phase === 'failed' ? (row?.finished_at ?? row?.beat_at ?? null) : null,
    // The folders' links are ours. A client is told which of their
    // sources are in, and no more.
    sources: Array.isArray(sources)
      ? sources.map((s) => (o.admin ? s : { ...s, link: null }))
      : [],
    ...(o.admin ? { email: o.email ?? null } : {}),
  };
}

/* ── a Drive file, as a Vault row ─────────────────────────────── */

interface Root { root: VaultRoot; id: string; name: string }

/** Everything a sync fills in by itself about one file. */
export async function factsFor(client: string, root: Root, f: WalkedFile): Promise<FileFacts> {
  const place = placeFile(root.root, f.folders, root.name);
  const when = fileDate(place.date, f.taken, f.createdTime, f.modifiedTime);
  return {
    id: await vaultFileId(client, f.id),
    driveId: f.id,
    name: f.name,
    mime: f.mimeType,
    type: vaultType(f.mimeType, f.folders),
    kind: place.kind,
    root: root.root,
    rootId: root.id,
    parentId: f.parent,
    // The whole path, the root's own name first, so "Open original"
    // is not the only way to know where a file is filed.
    path: [root.root === 'archive' ? root.name : ROOT_LABEL[root.root], ...f.folders].filter(Boolean).join(' / '),
    show: place.show,
    guess: place.guess,
    needsShow: place.needsShow,
    date: when.date,
    dateFrom: when.from,
    taken: f.taken,
    width: f.width,
    height: f.height,
    orientation: vaultOrientation(f.width, f.height, f.rotation),
    durationMs: f.durationMs,
    size: f.size,
    unreleased: place.unreleased,
    source: place.source,
    modified: f.modifiedTime,
  };
}

/* ── thumbnails ───────────────────────────────────────────────── */

function newVersion(): string {
  const b = new Uint8Array(8);
  crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * One file's thumbnail: Drive's own small drawing of it, put in R2
 * under the preview service's address for a thumb. Returns the key,
 * or null when Drive has not drawn one (a video that has only just
 * been uploaded has none for a few minutes).
 */
export async function makeThumb(
  bucket: R2Bucket, slug: string, id: string, link: string | null, meter?: Meter,
): Promise<string | null> {
  const key = previewKey(slug, id, newVersion(), 'thumb');
  if (!key) return null;
  const res = await driveDrawing(link, THUMB_PX, meter);
  if (!res) return null;
  const bytes = await res.arrayBuffer();
  if (!bytes.byteLength) return null;
  if (meter) meter.calls += 1;
  await bucket.put(key, bytes, { httpMetadata: { contentType: res.headers.get('Content-Type') || 'image/jpeg' } });
  return key;
}

async function inPool<T, R>(items: readonly T[], size: number, work: (item: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  const run = async (): Promise<void> => {
    for (;;) {
      const i = next;
      next += 1;
      if (i >= items.length) return;
      out[i] = await work(items[i]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(size, items.length) }, run));
  return out;
}

/* ── the usage log ────────────────────────────────────────────── */

/**
 * Every use the Content Pipeline says has happened: for each Posted
 * item a client can see, the Drive file its Edit Link points at, the
 * files of its slides, and the files it was marked as made from.
 *
 * Null when the pipeline could not be read whole, which the caller
 * takes as "leave the log alone".
 */
export async function postedUses(env: VaultEnv, db: D1Like, record: ClientRecord): Promise<PostUse[] | null> {
  let pages: any[];
  try {
    pages = await queryAll(env.NOTION_TOKEN, CONTENT_DB, {
      filter: {
        and: [
          { property: 'Client', relation: { contains: record.pageId } },
          { property: 'Status', select: { equals: 'Posted' } },
          { property: 'Hide from Client', checkbox: { equals: false } },
        ],
      },
    });
  } catch (err) {
    console.error('vault: could not read the posted items', record.slug, err);
    return null;
  }
  const client = clientKey(record.pageId);
  const byDrive = await fileIdsByDrive(db, client);
  const made = await listMade(db, client);
  const uses: PostUse[] = [];
  for (const page of pages) {
    const p = page?.properties ?? {};
    // Belt and braces, as everywhere else a hidden row could ship.
    if (readCheckbox(p['Hide from Client']) || readSelect(p['Deliverable'])) continue;
    const postId = String(page.id).replace(/-/g, '').toLowerCase();
    const base = {
      postId,
      post: (readText(p['Content']) ?? '').trim() || 'Untitled post',
      platform: readMultiSelect(p['Platforms']).join(', '),
      date: (readDate(p['Post Date']) ?? String(page.last_edited_time ?? '')).slice(0, 10) || null,
    };
    const drive = new Set<string>();
    const single = driveFileId(readUrl(p['Edit Link']));
    if (single) drive.add(single);
    if ((readText(p['Slides Manifest']) ?? '').trim()) {
      const held = await readManifest(env.REPORTS_BUCKET, record.slug, postId);
      for (const s of held?.manifest.slides ?? []) drive.add(s.file);
    }
    for (const d of drive) {
      const file = byDrive.get(d);
      if (file) uses.push({ ...base, file, how: 'post' });
    }
    for (const m of made) {
      if (m.postId === postId) uses.push({ ...base, file: m.file, how: 'made' });
    }
  }
  return uses;
}

/**
 * Bring one client's usage log in line with what is Posted. Called at
 * the end of a sync, and when a card crosses the Posted line through
 * the portal. Quietly does nothing when the Vault is not set up.
 */
export async function logPostedUses(env: VaultEnv, record: ClientRecord, now = Date.now()): Promise<{ added: number; removed: number } | null> {
  try {
    const db = await vaultDb(env);
    if (!db) return null;
    const uses = await postedUses(env, db, record);
    if (!uses) return null;
    return await reconcileUses(db, clientKey(record.pageId), uses, now);
  } catch (err) {
    console.error('vault: the usage log could not be brought up to date', record.slug, err);
    return null;
  }
}

/* ── linking to Moments ───────────────────────────────────────── */

const hex32 = (id: string): string => id.replace(/-/g, '').toLowerCase();

/**
 * Link each file to the Moment it belongs to in the client's
 * Campaign Calendar, by name or by date (see matchMoment).
 *
 * Only Moments the client can see are linked to: a file's name on a
 * page is its Moment's, and a Moment we are holding back must not be
 * named to the client by a file. A file with no Moment keeps its
 * folder's name as plain words. Every sync works the links out
 * afresh, so a Moment renamed, moved or removed is followed.
 *
 * Null when the calendar could not be read, and nothing is changed.
 */
export async function linkMoments(env: VaultEnv, db: D1Like, record: ClientRecord, now: number): Promise<number | null> {
  let moments: VaultMoment[];
  try {
    const calendar = await fetchCalendar(env.NOTION_TOKEN, record.pageId, record.client.artist);
    moments = calendar
      .filter((i: any) => i.kind === 'Moment' || i.momentType)
      .map((i: any) => ({
        id: hex32(String(i.id)), title: String(i.title ?? '').trim(),
        date: typeof i.date === 'string' ? i.date.slice(0, 10) : null,
        dateEnd: typeof i.dateEnd === 'string' ? i.dateEnd.slice(0, 10) : null,
      }))
      .filter((m: VaultMoment) => m.title);
  } catch (err) {
    console.error('vault: could not read the moments to link to', record.slug, err);
    return null;
  }
  const client = clientKey(record.pageId);
  const rows = await linkRows(db, client);
  // "No moment", said by hand, is an answer and is left out of it.
  const links = matchMoments(rows.filter((r) => !(r.show_by === 'hand' && !r.show)).map((r) => ({
    id: r.id, name: r.show, date: r.date, dateFrom: r.date_from, hand: r.show_by === 'hand',
  })), moments);
  const changes: Array<{ id: string; moment: string | null; title: string | null }> = [];
  for (const r of rows) {
    const link = links.get(r.id) ?? null;
    if ((r.moment_id ?? null) !== (link?.id ?? null) || (r.moment_title ?? null) !== (link?.title ?? null)) {
      changes.push({ id: r.id, moment: link?.id ?? null, title: link?.title ?? null });
    }
  }
  const linked = links.size;
  await saveLinks(db, client, changes, now);
  return linked;
}

/* ── the sync ─────────────────────────────────────────────────── */

export type SyncOutcome =
  /** One step was taken. `more` is true while the sync is part way,
   *  and another call should follow. */
  | { ok: true; more: boolean; status: VaultSyncStatus }
  /** Someone else is taking a step for this client right now. */
  | { ok: true; busy: true; more: boolean; status: VaultSyncStatus }
  | { ok: false; why: 'not_configured' | 'failed'; note: string; status?: VaultSyncStatus };

export interface SyncOptions {
  /** A fixed time, for a test. Everything the step writes down is
   *  stamped with it, and it never runs out of time, so the whole
   *  sync is one step. Never given by a real caller: a sync's signs
   *  of life have to move with the clock. */
  now?: number;
  /** A test's clock. */
  clock?: () => number;
  callBudget?: number;
  stepMs?: number;
}

/** A sync stopped for a reason worth saying. */
class SyncStop extends Error {}
/** The step is no longer ours: someone took it over. */
class SyncLost extends Error {}

/** Where a listing has got to. Kept between steps. */
interface ListState {
  roots: Array<Root & { files: number }>;
  /** Folders still to be read. */
  queue: Array<{ id: string; root: number; folders: string[] }>;
  /** The folders being read now, and Drive's marker for the next
   *  page of them. */
  at: { ids: Array<{ id: string; folders: string[] }>; root: number; token: string | null } | null;
  folders: number;
}

const rootLabel = (r: Root): string => (r.root === 'archive' ? r.name : ROOT_LABEL[r.root]);

/**
 * Take one step of a client's sync. See the top of the file.
 */
export async function syncClient(env: VaultEnv, record: ClientRecord, opts: SyncOptions = {}): Promise<SyncOutcome> {
  const fixed = opts.now;
  const clock = opts.clock ?? (typeof fixed === 'number' ? () => fixed : () => Date.now());
  const started = clock();
  const db = await vaultDb(env);
  if (!db) return { ok: false, why: 'not_configured', note: 'The Vault database is not bound (VAULT_DB).' };
  const bucket = env.REPORTS_BUCKET;
  if (!bucket) return { ok: false, why: 'not_configured', note: 'The R2 bucket is not bound.' };
  const g = await google(env, started);
  if (!g.ok) return { ok: false, why: 'not_configured', note: g.note };

  const client = clientKey(record.pageId);
  const told = (row: SyncRow | null): VaultSyncStatus => syncStatus(row, { now: clock(), email: g.email, admin: true });
  const holder = newVersion();
  const taken = await takeStep(db, {
    client, slug: record.slug, name: record.client.artist, run: newVersion(), holder, now: started,
    quietMs: SYNC_QUIET_MS, resumeMs: RESUME_MS,
  });
  if (!taken.ok) {
    const status = told(await syncRow(db, client));
    return { ok: true, busy: true, more: status.running, status };
  }
  const run = taken.row.run as string;

  const meter: Meter = { calls: 0 };
  const spent = (): boolean => meter.calls >= (opts.callBudget ?? CALL_BUDGET) || clock() - started >= (opts.stepMs ?? STEP_MS);
  let phase = taken.row.phase ?? 'listing';
  const counts: SyncCounts = { ...noCounts(), ...parse<Partial<SyncCounts>>(taken.row.counts, {}) };
  let sources: VaultSourceStatus[] = taken.fresh ? [] : parse<VaultSourceStatus[]>(taken.row.sources, []);
  let state = parse<Partial<ListState> | null>(taken.row.state, null);
  /** Write down where the step has got to. Throws when the step has
   *  been taken from us, so two never work on one sync. */
  const save = async (): Promise<void> => {
    const ok = await beatSync(db, client, run, holder, { phase, counts, sources, state: state ?? {}, now: clock() });
    if (!ok) throw new SyncLost();
  };
  // A sign of life on a clock of its own, so a step that is waiting
  // on one slow answer from Drive does not read as dead.
  const pulse = setInterval(() => { void beatSync(db, client, run, holder, { now: clock() }).catch(() => undefined); }, PULSE_MS);
  let ended = false;

  try {
    /* ── listing ── */
    if (phase === 'listing') {
      if (!state || !Array.isArray(state.roots)) {
        sources = [];
        const roots: Root[] = [];
        const found = await findSourceFolders(g.token, record.client.driveFolder, meter);
        const top: SourceState = !record.client.driveFolder ? 'not_set'
          : !found.look ? 'not_found'
          : found.look.ok ? 'ok'
          : found.look.why === 'error' ? 'error' : found.look.why;
        if (found.look && !found.look.ok && found.look.why === 'error') throw new SyncStop(found.look.note);
        const inside = (root: VaultRoot, folder: DriveFolder | null): void => {
          const s: SourceState = top !== 'ok' ? top : folder ? 'ok' : 'not_found';
          sources.push({
            root, name: folder?.name ?? ROOT_LABEL[root], state: s, files: 0,
            link: folder ? `https://drive.google.com/drive/folders/${folder.id}` : record.client.driveFolder,
          });
          if (s === 'ok' && folder) roots.push({ root, id: folder.id, name: folder.name });
        };
        inside('drop', found.drop);
        inside('finished', found.finished);
        for (const a of record.archiveFolders) {
          const look = await lookAtFolder(g.token, a.id, meter);
          if (!look.ok && look.why === 'error') throw new SyncStop(look.note);
          sources.push({
            root: 'archive', name: look.ok ? look.folder.name : (look.why === 'not_shared' ? look.name : null),
            link: a.link, state: look.ok ? 'ok' : look.why, files: 0,
          });
          // The same folder linked twice, or one that is also the
          // client's own, is read once.
          if (look.ok && !roots.some((r) => r.id === look.folder.id)) roots.push({ root: 'archive', id: look.folder.id, name: look.folder.name });
        }
        state = {
          roots: roots.map((r) => ({ ...r, files: 0 })),
          queue: roots.map((r, i) => ({ id: r.id, root: i, folders: [] })),
          at: null,
          folders: roots.length,
        };
        await save();
      }
      const list = state as ListState;
      const index = await loadIndex(db, client);

      while ((list.at || list.queue.length) && !spent()) {
        if (!list.at) {
          // The next folders to ask about: as many as one question
          // takes, all under the same root.
          const root = list.queue[0].root;
          const ids: Array<{ id: string; folders: string[] }> = [];
          const rest: ListState['queue'] = [];
          for (const q of list.queue) {
            if (q.root === root && ids.length < PARENTS_PER_ASK) ids.push({ id: q.id, folders: q.folders });
            else rest.push(q);
          }
          list.queue = rest;
          list.at = { ids, root, token: null };
        }
        const at = list.at;
        const root = list.roots[at.root];
        const page = await listPage(g.token, at.ids.map((x) => x.id), at.token, meter);
        if (!page.ok) throw new SyncStop(`${rootLabel(root)}: ${page.note}`);

        const pathOf = new Map(at.ids.map((x) => [x.id, x.folders]));
        const added: FileFacts[] = [];
        const changed: FileFacts[] = [];
        const seen: Array<{ id: string; link: string | null }> = [];
        for (const item of page.items) {
          const above = (item.parent && pathOf.get(item.parent)) || [];
          if (item.mimeType === 'application/vnd.google-apps.folder') {
            if (list.folders >= MAX_FOLDERS) throw new SyncStop(`${rootLabel(root)}: more than ${MAX_FOLDERS} folders under one root.`);
            list.queue.push({ id: item.id, root: at.root, folders: [...above, item.name] });
            list.folders += 1;
            continue;
          }
          const f = await factsFor(client, root, { ...item, folders: above } as WalkedFile);
          const row = index.get(f.id);
          // A file reached through two roots (an Archive folder that
          // sits inside Footage Drop) belongs to the first.
          if (row && row.seen_run === run && row.root_id !== root.id) continue;
          if (!row) added.push(f);
          else {
            // What the folders are read as now, against what was read
            // before: the rules for reading them can change under a
            // file that has not moved. A name set by hand is not
            // reopened.
            const reread = row.show_by !== 'hand' && ((row.show ?? null) !== f.show || (row.show_guess ?? null) !== f.guess
              || (row.date ?? null) !== f.date);
            if (row.missing || reread || row.name !== f.name || row.path !== f.path || row.root !== f.root || row.root_id !== f.rootId
              || (row.size ?? null) !== (f.size ?? null) || (row.drive_modified ?? null) !== (f.modified ?? null)
              || (!row.width && f.width) || (!row.duration_ms && f.durationMs)) changed.push(f);
          }
          if (!row || row.seen_run !== run) { counts.listed += 1; root.files += 1; }
          seen.push({ id: f.id, link: item.thumbnailLink });
          // So a page read twice in one step is not counted twice.
          index.set(f.id, {
            ...(row ?? { drive_id: f.driveId, show_by: f.show ? 'folder' : null, missing: 0, thumb_key: null }),
            id: f.id, name: f.name, path: f.path, root: f.root, root_id: f.rootId, size: f.size, drive_modified: f.modified,
            show: row?.show_by === 'hand' ? row.show : f.show, show_guess: row?.show_by === 'hand' ? row.show_guess : f.guess,
            needs_show: f.needsShow ? 1 : 0, date: row?.show_by === 'hand' && row.date ? row.date : f.date,
            width: f.width, duration_ms: f.durationMs, seen_run: run,
          } as any);
        }
        counts.added += await insertFiles(db, client, added, run, clock());
        await refreshFiles(db, client, changed, clock());
        await markSeen(db, client, seen, run, clock());
        counts.updated += changed.length;
        counts.shortcuts += page.shortcuts;
        list.at = page.next ? { ...at, token: page.next } : null;
        for (const s of sources) {
          const r = list.roots.find((x) => s.link?.endsWith(x.id));
          if (r) s.files = r.files;
        }
        await save();
      }

      if (!list.at && !list.queue.length) {
        // Every folder was read to the end, so what was not seen is
        // not there. Said only now, and only of the roots that were
        // read: a root that is not shared any more, or was not found,
        // says nothing about its files.
        counts.missing = await markUnseenMissing(db, client, list.roots.map((r) => r.id), run, clock());
        counts.listed = await countSeen(db, client, run);
        counts.thumbsLeft = await countNeedingThumbs(db, client, run);
        phase = 'thumbnails';
        state = {};
        await save();
      }
    }

    /* ── thumbnails ── */
    if (phase === 'thumbnails') {
      let idle = 0;
      while (!spent()) {
        const batch = await filesNeedingThumbs(db, client, run, ROUND);
        if (!batch.length) { phase = 'linking'; await save(); break; }
        let out = false;
        const done = await inPool(batch, AT_ONCE, async (f): Promise<{ id: string; key: string | null } | null> => {
          if (out) return null;
          try {
            // The listing's own address for the thumbnail while it is
            // good. Otherwise Drive is asked about the file again.
            let link = f.link && f.linkAt && clock() - f.linkAt < LINK_GOOD_MS ? f.link : undefined;
            if (link === undefined) {
              const one = await driveItem(g.token, f.driveId, meter);
              // Drive is busy, not empty-handed: not held against the file.
              if (!one.ok && !one.gone) return null;
              link = one.ok ? (one.item.thumbnailLink ?? undefined) : undefined;
            }
            return { id: f.id, key: await makeThumb(bucket, record.slug, f.id, link ?? null, meter) };
          } catch (err) {
            // Out of calls for this request. What is made is kept.
            if (/subrequest/i.test(String((err as Error)?.message ?? err))) { out = true; return null; }
            console.error('vault: a thumbnail could not be made', f.id, err);
            return { id: f.id, key: null };
          }
        });
        const rows = done.filter((d): d is { id: string; key: string | null } => !!d);
        if (rows.length) await saveThumbs(db, client, rows, clock(), run);
        counts.thumbs += rows.filter((r) => r.key).length;
        counts.thumbsLeft = await countNeedingThumbs(db, client, run);
        await save();
        if (out) break;
        // Nothing in the round could even be tried: Drive is not
        // answering. Twice running, and the sync says so and stops.
        idle = rows.length ? 0 : idle + 1;
        if (idle >= 2) throw new SyncStop('Drive stopped answering while thumbnails were being made.');
      }
    }

    /* ── linking, the usage log, and done ── */
    if (phase === 'linking' && !spent()) {
      const linked = await linkMoments(env, db, record, clock());
      if (linked !== null) counts.linked = linked;
      await save();
      const uses = await postedUses(env, db, record);
      if (uses) {
        const r = await reconcileUses(db, client, uses, clock());
        counts.usesAdded = r.added;
        counts.usesRemoved = r.removed;
      }
      // Counted afresh at the end: what is left is what Drive had
      // drawn nothing for.
      counts.thumbsLeft = await countNeedingThumbs(db, client);
      phase = 'done';
      await endSync(db, client, run, holder, { ok: true, counts, sources, now: clock() });
      ended = true;
      const raw = await claimNewRaw(db, client, run);
      if (raw > 0) await notifyVaultFiles(env, { client: record.client.artist, slug: record.slug, count: raw });
    }

    return { ok: true, more: phase !== 'done', status: told(await syncRow(db, client)) };
  } catch (err) {
    if (err instanceof SyncLost) {
      ended = true;
      const status = told(await syncRow(db, client).catch(() => null));
      return { ok: true, busy: true, more: status.running, status };
    }
    const note = err instanceof SyncStop ? err.message : 'The sync stopped on an error. It is in the log.';
    if (!(err instanceof SyncStop)) console.error('vault: sync failed', record.slug, err);
    try { await endSync(db, client, run, holder, { ok: false, error: note, counts, sources, now: clock() }); ended = true; } catch (e) {
      console.error('vault: could not record a failed sync', record.slug, e);
    }
    return { ok: false, why: 'failed', note, status: told(await syncRow(db, client).catch(() => null)) };
  } finally {
    clearInterval(pulse);
    if (!ended) {
      try { await releaseStep(db, client, run, holder, clock()); } catch (e) { console.error('vault: could not let a step go', record.slug, e); }
    }
  }
}

/**
 * Take steps of one client's sync until it is done or `budgetMs` has
 * passed. For a caller with nobody watching, who would only ask
 * again at once: the daily Worker.
 */
export async function syncFor(env: VaultEnv, record: ClientRecord, budgetMs: number, opts: SyncOptions = {}): Promise<SyncOutcome> {
  const from = Date.now();
  let out = await syncClient(env, record, opts);
  while (out.ok && out.more && !('busy' in out) && Date.now() - from < budgetMs) out = await syncClient(env, record, opts);
  return out;
}

/* ── every client, one at a time ──────────────────────────────── */

export interface NextOutcome {
  /** The client this call took a step for, if it took one. */
  synced: string | null;
  ok: boolean;
  note?: string;
  /** Another call would find something to do. */
  more: boolean;
}

/** A client whose sync failed on an error is not tried again for
 *  this long by the automatic callers. "Sync now" and Retry are not
 *  held to it. */
const RETRY_AFTER_MS = 10 * 60 * 1000;

/**
 * Take the next step that is due for any client.
 *
 * What the daily Worker and an open HQ both call, again and again
 * until `more` is false. First a sync that was left part way (its
 * page was closed, its request was cut off): that one is carried on.
 * Then the client whose last good sync is oldest, if it is older than
 * `freshMs`. A client with no Drive folder at all is never due, and
 * one whose step somebody else is taking right now is left to them.
 */
export async function syncNext(env: VaultEnv, o: { freshMs: number; budgetMs?: number; now?: number }): Promise<NextOutcome> {
  const now = o.now ?? Date.now();
  const db = await vaultDb(env);
  if (!db) return { synced: null, ok: false, note: 'The Vault database is not bound (VAULT_DB).', more: false };
  const records = (await fetchPortalRecords(env.NOTION_TOKEN)).filter((r) => r.client.driveFolder || r.archiveFolders.length);
  const rows = new Map((await allSyncRows(db)).map((r) => [r.client, r]));
  const due = records.map((record) => {
    const row = rows.get(clientKey(record.pageId)) ?? null;
    const status = syncStatus(row, { now, admin: true });
    // Part way, and nobody is holding a step: free to carry on. That
    // is a sync between two steps as much as one that was cut off.
    const partWay = !!row?.phase && LIVE_PHASES.includes(row.phase) && (!row.holder || status.stalled);
    const held = !!row?.phase && LIVE_PHASES.includes(row.phase) && !!row.holder && !status.stalled;
    const erred = row?.phase === 'failed';
    const stale = !status.okAt || now - status.okAt > o.freshMs;
    const waitOut = erred && now - (status.failedAt ?? 0) < RETRY_AFTER_MS;
    return { record, status, partWay, held, wanted: partWay || (stale && !held && !waitOut) };
  });
  const next = due.filter((d) => d.wanted)
    // Part way first, then never synced, then whoever has waited longest.
    .sort((a, b) => Number(b.partWay) - Number(a.partWay) || (a.status.okAt ?? 0) - (b.status.okAt ?? 0))[0];
  if (!next) return { synced: null, ok: true, more: false };
  const out = await syncFor(env, next.record, o.budgetMs ?? 0);
  const others = due.filter((d) => d.wanted && d.record.slug !== next.record.slug).length;
  return {
    synced: next.record.slug,
    ok: out.ok,
    ...(out.ok ? {} : { note: out.note }),
    more: others > 0 || (out.ok && out.more),
  };
}
