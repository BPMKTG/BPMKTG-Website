/* ──────────────────────────────────────────────────────────────
   The Content Vault's sync: what is in Drive, written into the Vault.

   SERVER ONLY, and Drive is only ever read (see vault-drive.ts).

   One function, `syncClient`, does one client from start to finish:

     1. finds the client's folders: Footage Drop and Finished Content
        inside their Drive Folder, and any Archive folders
     2. lists every image and video under each, however deep
     3. logs the ones it has not seen (matched on the Drive file's id)
        and brings the ones it has up to date
     4. marks a file that is no longer in a folder it was read from as
        Missing. Nothing is ever deleted from the Vault
     5. makes a thumbnail for each file that has none
     6. brings the usage log in line with what is Posted
     7. tells HQ how many new Raw files it found, once

   It runs in one pass. It also writes down where it has got to as it
   goes, and what it has logged stays logged, so a sync that is cut
   off (a closed tab, a deploy) is picked up by the next one: the
   listing is read again, which takes seconds, and the thumbnails
   carry on from the file they stopped at.

   Three things start it: the daily Worker, "Sync now" in HQ, and HQ
   being opened. Only one runs for a client at a time; a second asked
   for in the meantime is told the first is still going.

   A folder that cannot be listed is never read as an empty one. If
   any folder under a root will not list, that root's files are left
   exactly as they are and the sync says it failed, because the other
   reading of "we saw none of them" is two thousand files marked
   Missing.
   ────────────────────────────────────────────────────────────── */

import { THUMB_PX, driveFileId, previewKey } from '../data/preview';
import {
  ROOT_LABEL, SYNC_QUIET_MS, fileDate, placeFile, vaultOrientation, vaultType,
  type SourceState, type VaultRoot, type VaultSourceStatus, type VaultSyncStatus,
} from '../data/vault';
import {
  CONTENT_DB, fetchPortalRecords, queryAll, readCheckbox, readDate, readMultiSelect, readSelect, readText, readUrl,
  type ClientRecord,
} from './portal-notion';
import type { PreviewEnv } from './preview';
import { notifyVaultFiles, type PushEnv } from './push';
import { readManifest } from './slides';
import {
  allSyncRows, beatSync, claimNewRaw, clientKey, countNeedingThumbs, endSync, fileIdsByDrive, filesNeedingThumbs, insertFiles,
  listMade, loadIndex, markMissing, reconcileUses, refreshFiles, saveThumbs, syncRow, takeSync, vaultDb, vaultFileId,
  type D1Like, type FileFacts, type PostUse, type SyncRow, type VaultDbEnv,
} from './vault-db';
import {
  driveDrawing, driveItem, findSourceFolders, google, lookAtFolder, walkFolder,
  type DriveFolder, type Meter, type WalkedFile,
} from './vault-drive';

export type VaultEnv = VaultDbEnv & PreviewEnv & PushEnv & { NOTION_TOKEN: string };

/* ── how much one request does ────────────────────────────────── */

/** A request on the paid plan may make ten thousand calls out. A
 *  sync stops making thumbnails well short of that, says how many
 *  are left, and the next call carries on. */
export const CALL_BUDGET = 8000;
/** And it stops after this long whatever it has spent. */
export const TIME_BUDGET_MS = 4 * 60 * 1000;
/** Thumbnails are made this many at a time, which is as many
 *  connections as a request may have opening at once. */
const AT_ONCE = 6;
/** Progress is written down after every this many. Each round is two
 *  statements against the database, of which a request may run a
 *  thousand. */
const ROUND = 60;

export interface SyncCounts {
  listed: number;
  added: number;
  updated: number;
  missing: number;
  thumbs: number;
  thumbsLeft: number;
  shortcuts: number;
  usesAdded: number;
  usesRemoved: number;
}

const noCounts = (): SyncCounts => ({
  listed: 0, added: 0, updated: 0, missing: 0, thumbs: 0, thumbsLeft: 0, shortcuts: 0, usesAdded: 0, usesRemoved: 0,
});

/* ── the status a page is told ────────────────────────────────── */

function parse<T>(raw: string | null | undefined, fallback: T): T {
  try { const v = JSON.parse(raw || ''); return v && typeof v === 'object' ? v as T : fallback; } catch { return fallback; }
}

/**
 * A sync's record, as a page is told it. `email` is the address a
 * folder is shared with, and is only ever given to one of us.
 */
export function syncStatus(row: SyncRow | null, o: { now: number; email?: string | null; admin: boolean }): VaultSyncStatus {
  const counts = { ...noCounts(), ...parse<Partial<SyncCounts>>(row?.counts, {}) };
  const sources = parse<VaultSourceStatus[]>(row?.sources, []);
  const live = !!row?.phase && row.phase !== 'done' && row.phase !== 'failed';
  const running = live && !!row?.beat_at && o.now - row.beat_at < SYNC_QUIET_MS;
  const phase = !row?.phase ? null
    : live && !running ? 'failed'
    : (['listing', 'saving', 'thumbnails', 'usage', 'done', 'failed'].includes(row.phase) ? row.phase : null) as VaultSyncStatus['phase'];
  return {
    never: !row?.ok_at && !row?.started_at,
    running,
    phase,
    startedAt: row?.started_at ?? null,
    finishedAt: row?.finished_at ?? null,
    okAt: row?.ok_at ?? null,
    listed: counts.listed,
    added: counts.added,
    missing: counts.missing,
    thumbs: counts.thumbs,
    thumbsLeft: counts.thumbsLeft,
    error: live && !running ? 'The last sync was cut off. The next one picks it up.' : (row?.error ?? null),
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

/* ── the sync ─────────────────────────────────────────────────── */

export type SyncOutcome =
  /** `more` is true when thumbnails are still to be made and another
   *  call should follow. */
  | { ok: true; more: boolean; status: VaultSyncStatus }
  /** Another sync has this client. Nothing was done. */
  | { ok: true; busy: true; more: false; status: VaultSyncStatus }
  | { ok: false; why: 'not_configured' | 'failed'; note: string; status?: VaultSyncStatus };

export interface SyncOptions {
  /** A fixed time, for a test. Everything the sync writes down is
   *  stamped with it, and it never runs out of time. Never given by
   *  a real caller: a sync's signs of life have to move with the
   *  clock, or a long one reads as one that has died. */
  now?: number;
  /** Only carry on with thumbnails; the folders were listed a moment
   *  ago by the call before this one. */
  thumbsOnly?: boolean;
  callBudget?: number;
  timeBudgetMs?: number;
  /** A test's clock. */
  clock?: () => number;
}

class SyncStop extends Error {}

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

  const taken = await takeSync(db, {
    client, slug: record.slug, name: record.client.artist, run: newVersion(), now: started,
    quietMs: SYNC_QUIET_MS, resumeMs: 60 * 60 * 1000,
  });
  if (!taken.ok) return { ok: true, busy: true, more: false, status: told(await syncRow(db, client)) };
  const { run } = taken;

  const meter: Meter = { calls: 0 };
  const spent = (): boolean => meter.calls >= (opts.callBudget ?? CALL_BUDGET) || clock() - started >= (opts.timeBudgetMs ?? TIME_BUDGET_MS);
  const before = await syncRow(db, client);
  const counts: SyncCounts = { ...noCounts(), ...(taken.resumed || opts.thumbsOnly ? parse<Partial<SyncCounts>>(before?.counts, {}) : {}) };
  let sources: VaultSourceStatus[] = parse<VaultSourceStatus[]>(before?.sources, []);
  const fresh = new Map<string, string | null>();

  try {
    if (!opts.thumbsOnly) {
      /* 1. the folders */
      sources = [];
      const roots: Root[] = [];
      const found = await findSourceFolders(g.token, record.client.driveFolder, meter);
      const top: SourceState = !record.client.driveFolder ? 'not_set'
        : !found.look ? 'not_found'
        : found.look.ok ? 'ok'
        : found.look.why === 'error' ? 'error' : found.look.why;
      if (found.look && !found.look.ok && found.look.why === 'error') throw new SyncStop(found.look.note);
      const inside = (root: VaultRoot, folder: DriveFolder | null): void => {
        const state: SourceState = top !== 'ok' ? top : folder ? 'ok' : 'not_found';
        sources.push({
          root, name: folder?.name ?? ROOT_LABEL[root], state, files: 0,
          link: folder ? `https://drive.google.com/drive/folders/${folder.id}` : record.client.driveFolder,
        });
        if (state === 'ok' && folder) roots.push({ root, id: folder.id, name: folder.name });
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
      await beatSync(db, client, run, { phase: 'listing', counts, sources, now: clock() });

      /* 2. what is in them */
      const seen = new Map<string, FileFacts>();
      const walked: Root[] = [];
      counts.listed = 0;
      counts.shortcuts = 0;
      for (const root of roots) {
        const walk = await walkFolder(g.token, root.id, meter);
        if (!walk.ok) throw new SyncStop(`${root.root === 'archive' ? root.name : ROOT_LABEL[root.root]}: ${walk.note}`);
        walked.push(root);
        counts.shortcuts += walk.shortcuts;
        let n = 0;
        for (const f of walk.files) {
          const facts = await factsFor(client, root, f);
          // A file reached through two roots (an Archive folder that
          // sits inside Footage Drop) belongs to the first.
          if (seen.has(facts.id)) continue;
          seen.set(facts.id, facts);
          fresh.set(facts.id, f.thumbnailLink);
          n += 1;
        }
        const status = sources.find((s) => s.root === root.root && (root.root !== 'archive' || s.link?.endsWith(root.id)));
        if (status) status.files = n;
        counts.listed += n;
        await beatSync(db, client, run, { phase: 'listing', counts, sources, now: clock() });
      }

      /* 3. new, changed, gone */
      await beatSync(db, client, run, { phase: 'saving', now: clock() });
      const index = await loadIndex(db, client);
      const added: FileFacts[] = [];
      const changed: FileFacts[] = [];
      for (const f of seen.values()) {
        const row = index.get(f.id);
        if (!row) { added.push(f); continue; }
        // What the folders are read as now, against what was read
        // before: the rules for reading them can change under a file
        // that has not moved. A show set by hand is not reopened.
        const reread = row.show_by !== 'hand' && ((row.show ?? null) !== f.show || (row.show_guess ?? null) !== f.guess
          || !!row.needs_show !== f.needsShow || (row.date ?? null) !== f.date);
        if (row.missing || reread || row.name !== f.name || row.path !== f.path || row.root !== f.root || row.root_id !== f.rootId
          || (row.size ?? null) !== (f.size ?? null) || (row.drive_modified ?? null) !== (f.modified ?? null)
          || (!row.width && f.width) || (!row.duration_ms && f.durationMs)) changed.push(f);
      }
      // Missing is only ever said of a file whose own root was read
      // to the end this time. A root that is not shared any more, or
      // was not found, says nothing about its files.
      const walkedIds = new Set(walked.map((r) => r.id));
      const gone = [...index.values()].filter((r) => !r.missing && walkedIds.has(r.root_id) && !seen.has(r.id)).map((r) => r.id);

      const made = await insertFiles(db, client, added, run, clock());
      await refreshFiles(db, client, changed, clock());
      await markMissing(db, client, gone, clock());
      counts.added = taken.resumed ? counts.added + made : made;
      counts.updated = changed.length;
      counts.missing = [...index.values()].filter((r) => r.missing && !seen.has(r.id)).length + gone.length;
    }

    /* 4. thumbnails */
    counts.thumbsLeft = await countNeedingThumbs(db, client);
    await beatSync(db, client, run, { phase: 'thumbnails', counts, sources, now: clock() });
    let stopped = false;
    // Read once, so a file Drive has no thumbnail for is asked about
    // once in a sync and not until its tries run out.
    const queue = await filesNeedingThumbs(db, client, 50000);
    for (let at = 0; at < queue.length && !stopped; at += ROUND) {
      if (spent()) break;
      const batch = queue.slice(at, at + ROUND);
      const done = await inPool(batch, AT_ONCE, async (f): Promise<{ id: string; key: string | null } | null> => {
        try {
          // The listing's own thumbnail address when this run has
          // one; otherwise Drive is asked for the file again, since
          // an address from an earlier day has run out.
          let link = fresh.get(f.id);
          if (link === undefined) {
            const one = await driveItem(g.token, f.driveId, meter);
            // Drive is busy, not empty-handed: not held against the file.
            if (!one.ok && !one.gone) return null;
            link = one.ok ? one.item.thumbnailLink : null;
          }
          return { id: f.id, key: await makeThumb(bucket, record.slug, f.id, link ?? null, meter) };
        } catch (err) {
          // Out of calls for this request. What is made is kept.
          if (/subrequest/i.test(String((err as Error)?.message ?? err))) { stopped = true; return null; }
          console.error('vault: a thumbnail could not be made', f.id, err);
          return { id: f.id, key: null };
        }
      });
      const rows = done.filter((d): d is { id: string; key: string | null } => !!d);
      if (rows.length) await saveThumbs(db, client, rows, clock());
      const made = rows.filter((r) => r.key).length;
      counts.thumbs += made;
      counts.thumbsLeft = Math.max(0, counts.thumbsLeft - made);
      await beatSync(db, client, run, { phase: 'thumbnails', counts, now: clock() });
      // Nothing in the round could be tried: Drive is not answering.
      if (!rows.length) break;
    }

    // Counted afresh at the end, so the number left is the store's
    // own and not this request's arithmetic.
    counts.thumbsLeft = await countNeedingThumbs(db, client);

    /* 5. the usage log */
    if (!opts.thumbsOnly) {
      await beatSync(db, client, run, { phase: 'usage', counts, now: clock() });
      const uses = await postedUses(env, db, record);
      if (uses) {
        const r = await reconcileUses(db, client, uses, clock());
        counts.usesAdded = r.added;
        counts.usesRemoved = r.removed;
      }
    }

    await endSync(db, client, run, { ok: true, counts, sources, now: clock() });

    /* 6. tell HQ, once */
    const raw = await claimNewRaw(db, client, run);
    if (raw > 0) await notifyVaultFiles(env, { client: record.client.artist, slug: record.slug, count: raw });

    const row = await syncRow(db, client);
    return { ok: true, more: counts.thumbsLeft > 0 && (spent() || stopped), status: told(row) };
  } catch (err) {
    const note = err instanceof SyncStop ? err.message : 'The sync stopped on an error. It is in the log.';
    if (!(err instanceof SyncStop)) console.error('vault: sync failed', record.slug, err);
    try { await endSync(db, client, run, { ok: false, error: note, counts, sources, now: clock() }); } catch (e) {
      console.error('vault: could not record a failed sync', record.slug, e);
    }
    return { ok: false, why: 'failed', note, status: told(await syncRow(db, client).catch(() => null)) };
  }
}

/* ── every client, one at a time ──────────────────────────────── */

export interface NextOutcome {
  /** The client this call synced, if it synced one. */
  synced: string | null;
  ok: boolean;
  note?: string;
  /** Another call would find something to do. */
  more: boolean;
}

/** A client whose sync failed is not tried again for this long by
 *  the automatic callers. "Sync now" is not held to it. */
const RETRY_AFTER_MS = 10 * 60 * 1000;

/**
 * Sync the client who has waited longest, if any is due.
 *
 * What the daily Worker and "HQ was opened" both call, again and
 * again until `more` is false: each call does one client, so no one
 * request is asked to do every client's Drive. A client is due when
 * their last good sync is older than `freshMs`, or when a sync left
 * thumbnails still to make. One with no Drive folder at all is never
 * due.
 */
export async function syncNext(env: VaultEnv, o: { freshMs: number; now?: number }): Promise<NextOutcome> {
  const now = o.now ?? Date.now();
  const db = await vaultDb(env);
  if (!db) return { synced: null, ok: false, note: 'The Vault database is not bound (VAULT_DB).', more: false };
  const records = (await fetchPortalRecords(env.NOTION_TOKEN)).filter((r) => r.client.driveFolder || r.archiveFolders.length);
  const rows = new Map((await allSyncRows(db)).map((r) => [r.client, r]));
  const due = records.map((record) => {
    const row = rows.get(clientKey(record.pageId)) ?? null;
    const status = syncStatus(row, { now, admin: true });
    const last = Math.max(row?.finished_at ?? 0, row?.started_at ?? 0);
    const stale = !status.okAt || now - status.okAt > o.freshMs;
    const failedLately = status.phase === 'failed' && now - last < RETRY_AFTER_MS;
    const thumbs = !stale && status.thumbsLeft > 0 && status.phase === 'done';
    return { record, status, stale, thumbs, skip: status.running || failedLately };
  }).filter((d) => !d.skip && (d.stale || d.thumbs))
    // Never synced first, then whoever has waited longest.
    .sort((a, b) => (a.status.okAt ?? 0) - (b.status.okAt ?? 0));
  const next = due[0];
  if (!next) return { synced: null, ok: true, more: false };
  const out = await syncClient(env, next.record, { thumbsOnly: next.thumbs && !next.stale });
  return {
    synced: next.record.slug,
    ok: out.ok,
    ...(out.ok ? {} : { note: out.note }),
    more: due.length > 1 || (out.ok && out.more),
  };
}
