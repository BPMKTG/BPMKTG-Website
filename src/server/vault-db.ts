/* ──────────────────────────────────────────────────────────────
   The Content Vault's store: a D1 database.

   SERVER ONLY. Bound to the Pages project as VAULT_DB. It is not in
   Notion because a client has thousands of files and the questions
   asked of them ("every vertical video from this show nobody has
   posted") are one query here and twenty requests there, and marking
   two hundred files at once is one write here and two hundred there.

   The tables are made by this file the first time it is used, so a
   new database needs nothing run against it by hand.

     vault_files    one row per Drive file per client
     vault_uses     the usage log: where and when a file was posted
     vault_made     "this post was made from these files"
     vault_shows    when a show's delivery was announced
     vault_sync     where each client's sync has got to
     vault_meta     which version of the tables this is

   Every query that reads or changes a file names the client it
   belongs to. There is no query here that takes a file id alone, so
   an id from one client's Vault is never a way into another's.

   Many rows are written in one statement by handing SQLite the rows
   as one JSON text (json_each), because a statement takes at most a
   hundred separate values and a file has forty.
   ────────────────────────────────────────────────────────────── */

import type { StoredPreview } from '../data/preview';
import {
  mergeTags,
  type VaultEdit, type VaultFile, type VaultKind, type VaultOrientation, type VaultRating, type VaultRoot,
  type VaultSource, type VaultType, type VaultUse,
} from '../data/vault';
import { versionOfKey } from '../data/preview';

/* The parts of D1 used here, spelled out so the file reads without
   Cloudflare's types and a test can stand in for the database. */
export interface D1Result<T = Record<string, unknown>> { results?: T[]; meta?: { changes?: number } }
export interface D1Statement {
  bind(...values: unknown[]): D1Statement;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<D1Result>;
}
export interface D1Like {
  prepare(sql: string): D1Statement;
  batch(statements: D1Statement[]): Promise<D1Result[]>;
}

export interface VaultDbEnv { VAULT_DB?: D1Like }

export const VAULT_DB_BINDING = 'VAULT_DB';

/* ── the tables ───────────────────────────────────────────────── */

export const SCHEMA_VERSION = '1';

export const SCHEMA: readonly string[] = [
  `CREATE TABLE IF NOT EXISTS vault_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS vault_files (
     id TEXT PRIMARY KEY,
     client TEXT NOT NULL,
     drive_id TEXT NOT NULL,
     name TEXT NOT NULL DEFAULT '',
     mime TEXT NOT NULL DEFAULT '',
     type TEXT NOT NULL,
     kind TEXT NOT NULL,
     root TEXT NOT NULL,
     root_id TEXT NOT NULL DEFAULT '',
     parent_id TEXT,
     path TEXT NOT NULL DEFAULT '',
     show TEXT,
     show_guess TEXT,
     show_by TEXT,
     needs_show INTEGER NOT NULL DEFAULT 0,
     date TEXT,
     date_from TEXT,
     taken TEXT,
     width INTEGER,
     height INTEGER,
     orientation TEXT,
     duration_ms INTEGER,
     size INTEGER,
     unreleased INTEGER NOT NULL DEFAULT 0,
     missing INTEGER NOT NULL DEFAULT 0,
     missing_at INTEGER,
     starred INTEGER NOT NULL DEFAULT 0,
     rating TEXT,
     source TEXT,
     tags TEXT NOT NULL DEFAULT '[]',
     notes TEXT NOT NULL DEFAULT '',
     hold_kind TEXT,
     hold_id TEXT,
     hold_title TEXT,
     drive_modified TEXT,
     thumb_key TEXT,
     thumb_tries INTEGER NOT NULL DEFAULT 0,
     web_key TEXT,
     pv_status TEXT,
     pv_image TEXT,
     pv_thumb TEXT,
     pv_video TEXT,
     pv_source TEXT,
     pv_detail TEXT,
     first_run TEXT,
     created_at INTEGER NOT NULL,
     updated_at INTEGER NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS vault_files_drive ON vault_files (client, drive_id)`,
  `CREATE TABLE IF NOT EXISTS vault_uses (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     client TEXT NOT NULL,
     file_id TEXT NOT NULL,
     how TEXT NOT NULL,
     post_id TEXT NOT NULL DEFAULT '',
     post_title TEXT NOT NULL DEFAULT '',
     platform TEXT NOT NULL DEFAULT '',
     date TEXT,
     created_at INTEGER NOT NULL
   )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS vault_uses_one ON vault_uses (file_id, how, post_id)`,
  `CREATE INDEX IF NOT EXISTS vault_uses_client ON vault_uses (client)`,
  `CREATE TABLE IF NOT EXISTS vault_made (
     client TEXT NOT NULL,
     post_id TEXT NOT NULL,
     file_id TEXT NOT NULL,
     post_title TEXT NOT NULL DEFAULT '',
     created_at INTEGER NOT NULL,
     PRIMARY KEY (post_id, file_id)
   )`,
  `CREATE INDEX IF NOT EXISTS vault_made_client ON vault_made (client)`,
  `CREATE TABLE IF NOT EXISTS vault_shows (
     client TEXT NOT NULL,
     show TEXT NOT NULL,
     announced_at INTEGER,
     PRIMARY KEY (client, show)
   )`,
  `CREATE TABLE IF NOT EXISTS vault_sync (
     client TEXT PRIMARY KEY,
     slug TEXT NOT NULL DEFAULT '',
     name TEXT NOT NULL DEFAULT '',
     run TEXT,
     phase TEXT,
     started_at INTEGER,
     beat_at INTEGER,
     finished_at INTEGER,
     ok_at INTEGER,
     counts TEXT NOT NULL DEFAULT '{}',
     sources TEXT NOT NULL DEFAULT '[]',
     error TEXT,
     told_run TEXT
   )`,
];

/** Databases this isolate has already checked. A check is one small
 *  read; making the tables is one write, once per database ever. */
const ready = new WeakSet<object>();

/**
 * The database, with its tables in place, or null when it is not
 * bound. Null is a deployment that has not been set up yet, and every
 * caller's answer to it is the same plain "the Vault is not set up".
 */
export async function vaultDb(env: VaultDbEnv): Promise<D1Like | null> {
  const db = env.VAULT_DB;
  if (!db || typeof db.prepare !== 'function') return null;
  if (ready.has(db)) return db;
  let version: string | null = null;
  try {
    const row = await db.prepare(`SELECT value FROM vault_meta WHERE key = 'schema'`).first<{ value: string }>();
    version = row?.value ?? null;
  } catch { /* no such table: a new database */ }
  if (version !== SCHEMA_VERSION) {
    await db.batch([
      ...SCHEMA.map((sql) => db.prepare(sql)),
      db.prepare(`INSERT INTO vault_meta (key, value) VALUES ('schema', ?1) ON CONFLICT(key) DO UPDATE SET value = excluded.value`).bind(SCHEMA_VERSION),
    ]);
  }
  ready.add(db);
  return db;
}

/* ── small things ─────────────────────────────────────────────── */

const hex = (id: string): string => id.replace(/-/g, '').toLowerCase();

/** A client's key in every table: their Clients page id, as 32 hex. */
export const clientKey = (pageId: string): string => hex(pageId);

/**
 * A file's id: thirty-two hex made from the client and the Drive
 * file's id.
 *
 * Made, not drawn at random, so the same Drive file is the same row
 * every time it is seen, and so it is the shape the preview service
 * files things under. Two clients who share a Drive file have a row
 * each, because what one of them stars is not the other's business.
 */
export async function vaultFileId(client: string, driveId: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${hex(client)}:${driveId}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest.slice(0, 16), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** Rows handed to SQLite as one JSON text are sent this many at a
 *  time, which keeps each well under D1's size limit for one value. */
const CHUNK = 200;

function chunks<T>(list: readonly T[], size: number = CHUNK): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

const idList = (ids: readonly string[]): string => JSON.stringify(ids);

/* ── rows ─────────────────────────────────────────────────────── */

/** What a sync knows about one Drive file, ready to be written. */
export interface FileFacts {
  id: string;
  driveId: string;
  name: string;
  mime: string;
  type: VaultType;
  kind: VaultKind;
  root: VaultRoot;
  rootId: string;
  parentId: string | null;
  path: string;
  show: string | null;
  guess: string | null;
  needsShow: boolean;
  date: string | null;
  dateFrom: string | null;
  taken: string | null;
  width: number | null;
  height: number | null;
  orientation: VaultOrientation | null;
  durationMs: number | null;
  size: number | null;
  unreleased: boolean;
  source: VaultSource | null;
  modified: string | null;
}

/** The little a sync reads of every row, to tell new from known. */
export interface IndexRow {
  id: string;
  drive_id: string;
  name: string;
  path: string;
  root: string;
  root_id: string;
  size: number | null;
  drive_modified: string | null;
  show_by: string | null;
  show: string | null;
  show_guess: string | null;
  needs_show: number;
  date: string | null;
  missing: number;
  thumb_key: string | null;
  width: number | null;
  duration_ms: number | null;
}

/** Rows are read this many at a time, so no one answer from the
 *  database is larger than a few hundred kilobytes however many
 *  files a client has. */
const READ_PAGE = 1000;

/** Every row of a client that a query selects, read a page at a time
 *  in id order. `sql` must select `id` and end where an
 *  `AND id > ?2 ORDER BY id LIMIT ?3` can be added. */
async function readAll<T extends { id: string }>(db: D1Like, sql: string, client: string): Promise<T[]> {
  const out: T[] = [];
  let after = '';
  for (;;) {
    const got = await db.prepare(`${sql} AND id > ?2 ORDER BY id LIMIT ?3`).bind(client, after, READ_PAGE).all<T>();
    const rows = got.results ?? [];
    out.push(...rows);
    if (rows.length < READ_PAGE) return out;
    after = rows[rows.length - 1].id;
  }
}

export async function loadIndex(db: D1Like, client: string): Promise<Map<string, IndexRow>> {
  const rows = await readAll<IndexRow>(db,
    `SELECT id, drive_id, name, path, root, root_id, size, drive_modified, show_by, show, show_guess, needs_show, date,
            missing, thumb_key, width, duration_ms
       FROM vault_files WHERE client = ?1`, client);
  return new Map(rows.map((r) => [r.id, r]));
}

const J = (name: string): string => `json_extract(j.value, '$.${name}')`;

/**
 * Log files that have not been seen before.
 *
 * A file that is somehow already there (two syncs at once) is left
 * exactly as it is: logging is never a way to overwrite a star.
 */
export async function insertFiles(db: D1Like, client: string, rows: readonly FileFacts[], run: string, now: number): Promise<number> {
  let made = 0;
  for (const part of chunks(rows)) {
    const res = await db.prepare(
      `INSERT INTO vault_files (
         id, client, drive_id, name, mime, type, kind, root, root_id, parent_id, path,
         show, show_guess, show_by, needs_show, date, date_from, taken,
         width, height, orientation, duration_ms, size, unreleased, source, drive_modified,
         first_run, created_at, updated_at)
       SELECT ${J('id')}, ?1, ${J('driveId')}, ${J('name')}, ${J('mime')}, ${J('type')}, ${J('kind')}, ${J('root')},
              ${J('rootId')}, ${J('parentId')}, ${J('path')},
              ${J('show')}, ${J('guess')}, CASE WHEN ${J('show')} IS NULL THEN NULL ELSE 'folder' END, ${J('needsShow')},
              ${J('date')}, ${J('dateFrom')}, ${J('taken')},
              ${J('width')}, ${J('height')}, ${J('orientation')}, ${J('durationMs')}, ${J('size')}, ${J('unreleased')},
              ${J('source')}, ${J('modified')}, ?3, ?4, ?4
         FROM json_each(?2) AS j
        WHERE true
       ON CONFLICT DO NOTHING`,
    ).bind(client, JSON.stringify(part.map(flat)), run, now).run();
    made += res.meta?.changes ?? 0;
  }
  return made;
}

const flat = (f: FileFacts): Record<string, unknown> => ({
  ...f, needsShow: f.needsShow ? 1 : 0, unreleased: f.unreleased ? 1 : 0,
});

/** The facts a refresh reads out of each row it is handed. */
const REFRESH_COLUMNS = [
  'id', 'name', 'mime', 'root', 'rootId', 'parentId', 'path', 'kind', 'unreleased', 'size', 'modified', 'width',
  'height', 'orientation', 'durationMs', 'taken', 'show', 'guess', 'needsShow', 'date', 'dateFrom', 'source',
].map((n) => `json_extract(value, '$.${n}') AS ${n}`).join(', ');

/**
 * Bring known files up to date with what Drive now says about them.
 *
 * Only facts: the name, where it is filed, how big it is. The show
 * and the date follow a move to another folder unless one of us set
 * the show by hand, and nothing anybody starred, rated, tagged or
 * wrote is touched. A file that had gone missing and is back is
 * marked found. A file whose size has changed is a different picture
 * under the same id, so its thumbnail and previews are forgotten and
 * made again.
 */
export async function refreshFiles(db: D1Like, client: string, rows: readonly FileFacts[], now: number): Promise<void> {
  for (const part of chunks(rows)) {
    await db.prepare(
      `UPDATE vault_files SET
         name = j.name, mime = j.mime, root = j.root, root_id = j.rootId, parent_id = j.parentId, path = j.path,
         kind = j.kind, unreleased = j.unreleased, size = j.size, drive_modified = j.modified,
         width = COALESCE(j.width, vault_files.width), height = COALESCE(j.height, vault_files.height),
         orientation = COALESCE(j.orientation, vault_files.orientation),
         duration_ms = COALESCE(j.durationMs, vault_files.duration_ms),
         taken = COALESCE(j.taken, vault_files.taken),
         show = CASE WHEN vault_files.show_by = 'hand' THEN vault_files.show ELSE j.show END,
         show_guess = CASE WHEN vault_files.show_by = 'hand' THEN vault_files.show_guess ELSE j.guess END,
         needs_show = CASE WHEN vault_files.show_by = 'hand' THEN vault_files.needs_show ELSE j.needsShow END,
         show_by = CASE WHEN vault_files.show_by = 'hand' THEN 'hand' WHEN j.show IS NULL THEN NULL ELSE 'folder' END,
         date = CASE WHEN vault_files.show_by = 'hand' AND vault_files.date IS NOT NULL THEN vault_files.date ELSE j.date END,
         date_from = CASE WHEN vault_files.show_by = 'hand' AND vault_files.date IS NOT NULL THEN vault_files.date_from ELSE j.dateFrom END,
         source = COALESCE(vault_files.source, j.source),
         thumb_key = CASE WHEN vault_files.size IS NOT j.size THEN NULL ELSE vault_files.thumb_key END,
         thumb_tries = CASE WHEN vault_files.size IS NOT j.size THEN 0 ELSE vault_files.thumb_tries END,
         web_key = CASE WHEN vault_files.size IS NOT j.size THEN NULL ELSE vault_files.web_key END,
         pv_status = CASE WHEN vault_files.size IS NOT j.size THEN NULL ELSE vault_files.pv_status END,
         pv_source = CASE WHEN vault_files.size IS NOT j.size THEN NULL ELSE vault_files.pv_source END,
         missing = 0, missing_at = NULL, updated_at = ?3
       FROM (SELECT ${REFRESH_COLUMNS} FROM json_each(?2)) AS j
      WHERE vault_files.client = ?1 AND vault_files.id = j.id`,
    ).bind(client, JSON.stringify(part.map(flat)), now).run();
  }
}

/** A file removed from Drive is marked, and kept. */
export async function markMissing(db: D1Like, client: string, ids: readonly string[], now: number): Promise<void> {
  for (const part of chunks(ids, 2000)) {
    await db.prepare(
      `UPDATE vault_files SET missing = 1, missing_at = ?3, updated_at = ?3
        WHERE client = ?1 AND missing = 0 AND id IN (SELECT value FROM json_each(?2))`,
    ).bind(client, idList(part), now).run();
  }
}

/* ── reading for a page ───────────────────────────────────────── */

interface FileRow {
  id: string; drive_id: string; name: string; type: string; kind: string; root: string; orientation: string | null;
  width: number | null; height: number | null; duration_ms: number | null; size: number | null;
  show: string | null; show_guess: string | null; needs_show: number; date: string | null; path: string;
  unreleased: number; missing: number; starred: number; rating: string | null; source: string | null;
  tags: string; notes: string; hold_id: string | null; hold_title: string | null; thumb_key: string | null;
  created_at: number; uses: number;
}

function parseTags(raw: string | null | undefined): string[] {
  try {
    const v = JSON.parse(raw || '[]');
    return Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string') : [];
  } catch { return []; }
}

function shapeFile(r: FileRow, admin: boolean): VaultFile {
  const f: VaultFile = {
    id: r.id,
    drive: r.drive_id,
    name: r.name,
    type: r.type as VaultType,
    kind: r.kind as VaultKind,
    root: r.root as VaultRoot,
    o: (r.orientation as VaultOrientation | null) ?? null,
    w: r.width ?? null,
    h: r.height ?? null,
    dur: r.duration_ms ? Math.round(r.duration_ms / 1000) : null,
    size: r.size ?? null,
    show: r.show ?? null,
    date: r.date ?? null,
    path: r.path,
    un: !!r.unreleased,
    missing: !!r.missing,
    star: !!r.starred,
    rating: (r.rating as VaultRating | null) ?? null,
    source: (r.source as VaultSource | null) ?? null,
    tags: parseTags(r.tags),
    notes: r.notes ?? '',
    held: !!r.hold_id,
    used: Number(r.uses) || 0,
    t: versionOfKey(r.thumb_key, r.id),
    added: r.created_at,
  };
  // What a file is held for names a post or a campaign, and one we
  // are holding back from the client would be named with it. So a
  // client is told a file is held, and not for what.
  if (admin) {
    if (r.hold_id) f.holdFor = r.hold_title ?? 'Something we could not name';
    if (r.needs_show) { f.needsShow = true; f.guess = r.show_guess ?? null; }
  }
  return f;
}

const FILE_COLUMNS = `f.id, f.drive_id, f.name, f.type, f.kind, f.root, f.orientation, f.width, f.height, f.duration_ms,
  f.size, f.show, f.show_guess, f.needs_show, f.date, f.path, f.unreleased, f.missing, f.starred, f.rating, f.source,
  f.tags, f.notes, f.hold_id, f.hold_title, f.thumb_key, f.created_at,
  (SELECT COUNT(*) FROM vault_uses u WHERE u.file_id = f.id AND u.client = f.client) AS uses`;

/** Every file of one client, as a page is sent them. */
export async function listFiles(db: D1Like, client: string, opts: { admin: boolean }): Promise<VaultFile[]> {
  const rows = await readAll<FileRow>(db, `SELECT ${FILE_COLUMNS} FROM vault_files f WHERE f.client = ?1`, client);
  return rows.map((r) => shapeFile(r, opts.admin));
}

/** These files of this client, as a page is sent them. Ids that are
 *  not this client's are simply not in the answer. */
export async function filesById(db: D1Like, client: string, ids: readonly string[], opts: { admin: boolean }): Promise<VaultFile[]> {
  if (!ids.length) return [];
  const got = await db.prepare(
    `SELECT ${FILE_COLUMNS} FROM vault_files f WHERE f.client = ?1 AND f.id IN (SELECT value FROM json_each(?2))`,
  ).bind(client, idList(ids)).all<FileRow>();
  const by = new Map((got.results ?? []).map((r) => [r.id, shapeFile(r, opts.admin)]));
  return ids.map((id) => by.get(id)).filter((f): f is VaultFile => !!f);
}

export async function listUses(db: D1Like, client: string): Promise<VaultUse[]> {
  const got = await db.prepare(
    `SELECT file_id, how, post_id, post_title, platform, date FROM vault_uses WHERE client = ?1 ORDER BY date DESC, id DESC`,
  ).bind(client).all<{ file_id: string; how: string; post_id: string; post_title: string; platform: string; date: string | null }>();
  return (got.results ?? []).map((r) => ({
    file: r.file_id, date: r.date ?? null, platform: r.platform, post: r.post_title,
    postId: r.post_id || null, how: (r.how === 'made' || r.how === 'hand' ? r.how : 'post') as VaultUse['how'],
  }));
}

/* ── one file, for the routes that open it ────────────────────── */

export interface FileRecord {
  id: string;
  driveId: string;
  name: string;
  mime: string;
  type: VaultType;
  durationMs: number | null;
  missing: boolean;
  thumbKey: string | null;
  thumbTries: number;
  webKey: string | null;
  preview: StoredPreview;
}

const RECORD_COLUMNS = `id, drive_id, name, mime, type, duration_ms, missing, thumb_key, thumb_tries, web_key,
  pv_status, pv_image, pv_thumb, pv_video, pv_source, pv_detail`;

function shapeRecord(r: Record<string, any>): FileRecord {
  return {
    id: r.id, driveId: r.drive_id, name: r.name, mime: r.mime, type: r.type,
    durationMs: r.duration_ms ?? null, missing: !!r.missing,
    thumbKey: r.thumb_key ?? null, thumbTries: Number(r.thumb_tries) || 0, webKey: r.web_key ?? null,
    preview: {
      status: r.pv_status ?? null, imageKey: r.pv_image ?? null, thumbKey: r.pv_thumb ?? null,
      videoKey: r.pv_video ?? null, source: r.pv_source ?? null, detail: r.pv_detail ?? null,
    },
  };
}

export async function fileRecord(db: D1Like, client: string, id: string): Promise<FileRecord | null> {
  const r = await db.prepare(`SELECT ${RECORD_COLUMNS} FROM vault_files WHERE client = ?1 AND id = ?2`).bind(client, id).first();
  return r ? shapeRecord(r) : null;
}

/** Record a file's converted video (the preview service's six
 *  fields, in six columns). */
export async function savePreview(db: D1Like, client: string, id: string, s: StoredPreview, now: number): Promise<boolean> {
  const res = await db.prepare(
    `UPDATE vault_files SET pv_status = ?3, pv_image = ?4, pv_thumb = ?5, pv_video = ?6, pv_source = ?7, pv_detail = ?8, updated_at = ?9
      WHERE client = ?1 AND id = ?2`,
  ).bind(client, id, s.status, s.imageKey, s.thumbKey, s.videoKey, s.source, s.detail, now).run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function saveWebKey(db: D1Like, client: string, id: string, key: string | null, now: number): Promise<void> {
  await db.prepare(`UPDATE vault_files SET web_key = ?3, updated_at = ?4 WHERE client = ?1 AND id = ?2`).bind(client, id, key, now).run();
}

/** A video whose length Drive had not read when it was logged. */
export async function saveDuration(db: D1Like, client: string, id: string, ms: number): Promise<void> {
  await db.prepare(`UPDATE vault_files SET duration_ms = ?3 WHERE client = ?1 AND id = ?2`).bind(client, id, ms).run();
}

/* ── thumbnails ───────────────────────────────────────────────── */

/** After this many tries a sync stops asking Drive for a thumbnail
 *  it does not have. Opening the file still asks. */
export const MAX_THUMB_TRIES = 6;

export async function filesNeedingThumbs(db: D1Like, client: string, limit: number): Promise<Array<{ id: string; driveId: string }>> {
  const got = await db.prepare(
    `SELECT id, drive_id FROM vault_files
      WHERE client = ?1 AND thumb_key IS NULL AND missing = 0 AND thumb_tries < ?2
      ORDER BY created_at DESC, name LIMIT ?3`,
  ).bind(client, MAX_THUMB_TRIES, limit).all<{ id: string; drive_id: string }>();
  return (got.results ?? []).map((r) => ({ id: r.id, driveId: r.drive_id }));
}

export async function countNeedingThumbs(db: D1Like, client: string): Promise<number> {
  const r = await db.prepare(
    `SELECT COUNT(*) AS n FROM vault_files WHERE client = ?1 AND thumb_key IS NULL AND missing = 0 AND thumb_tries < ?2`,
  ).bind(client, MAX_THUMB_TRIES).first<{ n: number }>();
  return Number(r?.n) || 0;
}

/** Record a batch of thumbnails: the key of each that was made, and
 *  one more try against each that was not. */
export async function saveThumbs(db: D1Like, client: string, rows: ReadonlyArray<{ id: string; key: string | null }>, now: number): Promise<void> {
  for (const part of chunks(rows)) {
    await db.prepare(
      `UPDATE vault_files SET
         thumb_key = COALESCE(j.key, vault_files.thumb_key),
         thumb_tries = CASE WHEN j.key IS NULL THEN vault_files.thumb_tries + 1 ELSE 0 END,
         updated_at = ?3
       FROM (SELECT json_extract(value, '$.id') AS id, json_extract(value, '$.key') AS key FROM json_each(?2)) AS j
      WHERE vault_files.client = ?1 AND vault_files.id = j.id`,
    ).bind(client, JSON.stringify(part), now).run();
  }
}

/* ── edits ────────────────────────────────────────────────────── */

export interface HoldTarget { kind: 'item' | 'campaign'; id: string; title: string }

/**
 * Apply one cleaned edit to these files of this client.
 *
 * `edit` has already been cut down to what the asker may change (see
 * cleanVaultEdit). `hold` is what the server found the hold's id to
 * be; the edit's own copy is never trusted for a name. Returns how
 * many files were this client's and so were changed.
 */
export async function editFiles(
  db: D1Like, client: string, ids: readonly string[], edit: VaultEdit,
  o: { now: number; hold?: HoldTarget | null; today: string },
): Promise<number> {
  if (!ids.length) return 0;
  const list = idList(ids);
  const mine = `client = ?1 AND id IN (SELECT value FROM json_each(?2))`;
  const stmts: D1Statement[] = [];
  const set = (sql: string, ...values: unknown[]): void => {
    stmts.push(db.prepare(`UPDATE vault_files SET ${sql}, updated_at = ?3 WHERE ${mine}`).bind(client, list, o.now, ...values));
  };

  if (edit.star !== undefined) set('starred = ?4', edit.star ? 1 : 0);
  if (edit.notes !== undefined) set('notes = ?4', edit.notes);
  if (edit.rating !== undefined) set('rating = ?4', edit.rating);
  if (edit.source !== undefined) set('source = ?4', edit.source);
  if (edit.type !== undefined) set('type = ?4', edit.type);
  if (edit.show !== undefined) set(`show = ?4, needs_show = 0, show_by = 'hand'`, edit.show);
  if (edit.confirmShow) {
    stmts.push(db.prepare(
      `UPDATE vault_files SET show = show_guess, needs_show = 0, show_by = 'hand', updated_at = ?3
        WHERE ${mine} AND needs_show = 1 AND show_guess IS NOT NULL AND show_guess <> ''`,
    ).bind(client, list, o.now));
  }
  if (edit.hold !== undefined) {
    if (edit.hold === null) set('hold_kind = NULL, hold_id = NULL, hold_title = NULL');
    else if (o.hold) set('hold_kind = ?4, hold_id = ?5, hold_title = ?6', o.hold.kind, o.hold.id, o.hold.title);
  }
  if (edit.used !== undefined) {
    if (edit.used) {
      stmts.push(db.prepare(
        `INSERT INTO vault_uses (client, file_id, how, post_id, post_title, platform, date, created_at)
         SELECT ?1, id, 'hand', '', 'Marked as used', '', ?4, ?3 FROM vault_files WHERE ${mine}
         ON CONFLICT DO NOTHING`,
      ).bind(client, list, o.now, o.today));
    } else {
      stmts.push(db.prepare(
        `DELETE FROM vault_uses WHERE client = ?1 AND how = 'hand' AND file_id IN (SELECT value FROM json_each(?2))`,
      ).bind(client, list));
    }
  }

  // Tags are added to and taken from what each file already has, so
  // tagging forty files does not flatten forty different sets.
  if (edit.tagsAdd?.length || edit.tagsRemove?.length) {
    const got = await db.prepare(`SELECT id, tags FROM vault_files WHERE ${mine}`).bind(client, list).all<{ id: string; tags: string }>();
    const next = (got.results ?? []).map((r) => ({
      id: r.id, tags: JSON.stringify(mergeTags(parseTags(r.tags), edit.tagsAdd ?? [], edit.tagsRemove ?? [])),
    }));
    for (const part of chunks(next)) {
      stmts.push(db.prepare(
        `UPDATE vault_files SET tags = j.tags, updated_at = ?3
           FROM (SELECT json_extract(value, '$.id') AS id, json_extract(value, '$.tags') AS tags FROM json_each(?2)) AS j
          WHERE vault_files.client = ?1 AND vault_files.id = j.id`,
      ).bind(client, JSON.stringify(part), o.now));
    }
  }

  const owned = await db.prepare(`SELECT COUNT(*) AS n FROM vault_files WHERE ${mine}`).bind(client, list).first<{ n: number }>();
  if (stmts.length) await db.batch(stmts);
  return Number(owned?.n) || 0;
}

/* ── made from ────────────────────────────────────────────────── */

export async function setMadeFrom(
  db: D1Like, client: string, ids: readonly string[], post: { id: string; title: string }, on: boolean, now: number,
): Promise<void> {
  const list = idList(ids);
  if (on) {
    await db.prepare(
      `INSERT INTO vault_made (client, post_id, file_id, post_title, created_at)
       SELECT ?1, ?3, id, ?4, ?5 FROM vault_files WHERE client = ?1 AND id IN (SELECT value FROM json_each(?2))
       ON CONFLICT DO NOTHING`,
    ).bind(client, list, post.id, post.title, now).run();
  } else {
    await db.prepare(
      `DELETE FROM vault_made WHERE client = ?1 AND post_id = ?3 AND file_id IN (SELECT value FROM json_each(?2))`,
    ).bind(client, list, post.id).run();
  }
}

export interface MadeRow { file: string; postId: string; post: string }

export async function listMade(db: D1Like, client: string): Promise<MadeRow[]> {
  const got = await db.prepare(`SELECT file_id, post_id, post_title FROM vault_made WHERE client = ?1`)
    .bind(client).all<{ file_id: string; post_id: string; post_title: string }>();
  return (got.results ?? []).map((r) => ({ file: r.file_id, postId: r.post_id, post: r.post_title }));
}

/* ── the usage log ────────────────────────────────────────────── */

/** One use that the Content Pipeline says happened. */
export interface PostUse {
  file: string;
  postId: string;
  post: string;
  platform: string;
  date: string | null;
  how: 'post' | 'made';
}

/**
 * Make the log of posted uses say exactly this.
 *
 * `uses` is everything the client's Posted items use, worked out
 * afresh. A use that is not in the log is written; one in the log
 * that is no longer true (the post was moved back out of Posted, or
 * the file was taken off it) is removed; one whose post was renamed
 * or redated is corrected. Uses marked by hand are never touched.
 *
 * Only ever called with a list that was read whole. A list cut short
 * by a failed read would be taken as "none of the rest were used".
 */
export async function reconcileUses(db: D1Like, client: string, uses: readonly PostUse[], now: number): Promise<{ added: number; removed: number }> {
  const key = (u: { file: string; how: string; postId: string }): string => `${u.file}|${u.how}|${u.postId}`;
  const got = await db.prepare(
    `SELECT id, file_id, how, post_id, post_title, platform, date FROM vault_uses WHERE client = ?1 AND how IN ('post', 'made')`,
  ).bind(client).all<{ id: number; file_id: string; how: string; post_id: string; post_title: string; platform: string; date: string | null }>();
  const have = new Map((got.results ?? []).map((r) => [key({ file: r.file_id, how: r.how, postId: r.post_id }), r]));
  const want = new Map(uses.map((u) => [key(u), u]));

  const fresh = [...want.values()].filter((u) => {
    const h = have.get(key(u));
    return !h || h.post_title !== u.post || h.platform !== u.platform || (h.date ?? null) !== (u.date ?? null);
  });
  const stale = [...have.entries()].filter(([k]) => !want.has(k)).map(([, r]) => r.id);

  for (const part of chunks(fresh)) {
    await db.prepare(
      `INSERT INTO vault_uses (client, file_id, how, post_id, post_title, platform, date, created_at)
       SELECT ?1, json_extract(value, '$.file'), json_extract(value, '$.how'), json_extract(value, '$.postId'),
              json_extract(value, '$.post'), json_extract(value, '$.platform'), json_extract(value, '$.date'), ?3
         FROM json_each(?2)
        WHERE true
       ON CONFLICT (file_id, how, post_id) DO UPDATE SET
         post_title = excluded.post_title, platform = excluded.platform, date = excluded.date`,
    ).bind(client, JSON.stringify(part), now).run();
  }
  for (const part of chunks(stale, 2000)) {
    await db.prepare(`DELETE FROM vault_uses WHERE client = ?1 AND id IN (SELECT value FROM json_each(?2))`)
      .bind(client, JSON.stringify(part)).run();
  }
  const added = [...want.keys()].filter((k) => !have.has(k)).length;
  return { added, removed: stale.length };
}

/** Which of this client's files are these Drive files. */
export async function fileIdsByDrive(db: D1Like, client: string): Promise<Map<string, string>> {
  const got = await db.prepare(`SELECT id, drive_id FROM vault_files WHERE client = ?1`).bind(client).all<{ id: string; drive_id: string }>();
  return new Map((got.results ?? []).map((r) => [r.drive_id, r.id]));
}

/* ── shows ────────────────────────────────────────────────────── */

export async function announcedShows(db: D1Like, client: string): Promise<Record<string, number>> {
  const got = await db.prepare(`SELECT show, announced_at FROM vault_shows WHERE client = ?1 AND announced_at IS NOT NULL`)
    .bind(client).all<{ show: string; announced_at: number }>();
  return Object.fromEntries((got.results ?? []).map((r) => [r.show, r.announced_at]));
}

export async function markAnnounced(db: D1Like, client: string, show: string, now: number): Promise<void> {
  await db.prepare(
    `INSERT INTO vault_shows (client, show, announced_at) VALUES (?1, ?2, ?3)
     ON CONFLICT (client, show) DO UPDATE SET announced_at = excluded.announced_at`,
  ).bind(client, show, now).run();
}

/** How many files that are there to be seen a show has. */
export async function showFileCount(db: D1Like, client: string, show: string): Promise<number> {
  const r = await db.prepare(`SELECT COUNT(*) AS n FROM vault_files WHERE client = ?1 AND show = ?2 AND missing = 0`)
    .bind(client, show).first<{ n: number }>();
  return Number(r?.n) || 0;
}

/* ── the sync's own record ────────────────────────────────────── */

export interface SyncRow {
  client: string;
  slug: string;
  name: string;
  run: string | null;
  phase: string | null;
  started_at: number | null;
  beat_at: number | null;
  finished_at: number | null;
  ok_at: number | null;
  counts: string;
  sources: string;
  error: string | null;
  told_run: string | null;
}

export async function syncRow(db: D1Like, client: string): Promise<SyncRow | null> {
  return await db.prepare(`SELECT * FROM vault_sync WHERE client = ?1`).bind(client).first<SyncRow>();
}

export async function allSyncRows(db: D1Like): Promise<SyncRow[]> {
  return (await db.prepare(`SELECT * FROM vault_sync`).all<SyncRow>()).results ?? [];
}

/**
 * Take a client's sync, or find it taken.
 *
 * One statement, so of two syncs started in the same moment the
 * database lets one in. A sync that has said nothing for `quietMs`
 * was cut off, and is anyone's to pick up: the run's name is kept
 * when it is picked up soon, so the files it logged still count as
 * this run's new ones.
 */
export async function takeSync(
  db: D1Like, o: { client: string; slug: string; name: string; run: string; now: number; quietMs: number; resumeMs: number },
): Promise<{ ok: true; run: string; resumed: boolean } | { ok: false }> {
  await db.prepare(`INSERT INTO vault_sync (client, slug, name) VALUES (?1, ?2, ?3) ON CONFLICT (client) DO NOTHING`)
    .bind(o.client, o.slug, o.name).run();
  const res = await db.prepare(
    `UPDATE vault_sync SET
       run = CASE WHEN phase IS NOT NULL AND phase NOT IN ('done', 'failed') AND run IS NOT NULL AND started_at > ?5 THEN run ELSE ?2 END,
       started_at = CASE WHEN phase IS NOT NULL AND phase NOT IN ('done', 'failed') AND run IS NOT NULL AND started_at > ?5 THEN started_at ELSE ?3 END,
       phase = 'listing', beat_at = ?3, error = NULL, slug = ?6, name = ?7
     WHERE client = ?1 AND (phase IS NULL OR phase IN ('done', 'failed') OR beat_at IS NULL OR beat_at < ?4)`,
  ).bind(o.client, o.run, o.now, o.now - o.quietMs, o.now - o.resumeMs, o.slug, o.name).run();
  if (!(res.meta?.changes ?? 0)) return { ok: false };
  const row = await syncRow(db, o.client);
  return { ok: true, run: row?.run ?? o.run, resumed: !!row?.run && row.run !== o.run };
}

/** Say where a sync has got to. Also its sign of life. */
export async function beatSync(
  db: D1Like, client: string, run: string, o: { phase: string; counts?: unknown; sources?: unknown; now: number },
): Promise<boolean> {
  const res = await db.prepare(
    `UPDATE vault_sync SET phase = ?3, beat_at = ?4,
       counts = COALESCE(?5, counts), sources = COALESCE(?6, sources)
     WHERE client = ?1 AND run = ?2`,
  ).bind(client, run, o.phase, o.now, o.counts === undefined ? null : JSON.stringify(o.counts),
    o.sources === undefined ? null : JSON.stringify(o.sources)).run();
  return (res.meta?.changes ?? 0) > 0;
}

export async function endSync(
  db: D1Like, client: string, run: string, o: { ok: boolean; error?: string | null; counts: unknown; sources: unknown; now: number },
): Promise<void> {
  await db.prepare(
    `UPDATE vault_sync SET phase = ?3, beat_at = ?4, finished_at = ?4,
       ok_at = CASE WHEN ?3 = 'done' THEN ?4 ELSE ok_at END,
       counts = ?5, sources = ?6, error = ?7
     WHERE client = ?1 AND run = ?2`,
  ).bind(client, run, o.ok ? 'done' : 'failed', o.now, JSON.stringify(o.counts), JSON.stringify(o.sources), o.error ?? null).run();
}

/**
 * How many Raw files this run logged, claimed for one announcement.
 *
 * Nought when this run has already been announced, so a sync that
 * finishes twice (two callers moving the same run on) says it once.
 */
export async function claimNewRaw(db: D1Like, client: string, run: string): Promise<number> {
  const res = await db.prepare(
    `UPDATE vault_sync SET told_run = ?2 WHERE client = ?1 AND run = ?2 AND (told_run IS NULL OR told_run <> ?2)`,
  ).bind(client, run).run();
  if (!(res.meta?.changes ?? 0)) return 0;
  const r = await db.prepare(
    `SELECT COUNT(*) AS n FROM vault_files WHERE client = ?1 AND first_run = ?2 AND kind = 'Raw' AND missing = 0`,
  ).bind(client, run).first<{ n: number }>();
  return Number(r?.n) || 0;
}

/* ── HQ's overview ────────────────────────────────────────────── */

export interface ClientTally {
  client: string;
  files: number;
  keepers: number;
  unsorted: number;
  needsShow: number;
  missing: number;
}

export async function tallies(db: D1Like): Promise<Map<string, ClientTally>> {
  const got = await db.prepare(
    `SELECT client,
            SUM(CASE WHEN missing = 0 THEN 1 ELSE 0 END) AS files,
            SUM(CASE WHEN missing = 0 AND (kind = 'Finished' OR starred = 1 OR rating IS NOT NULL) THEN 1 ELSE 0 END) AS keepers,
            SUM(CASE WHEN missing = 0 AND kind <> 'Finished' AND starred = 0 AND rating IS NULL THEN 1 ELSE 0 END) AS unsorted,
            SUM(CASE WHEN missing = 0 AND needs_show = 1 THEN 1 ELSE 0 END) AS needs_show,
            SUM(missing) AS missing
       FROM vault_files GROUP BY client`,
  ).all<{ client: string; files: number; keepers: number; unsorted: number; needs_show: number; missing: number }>();
  return new Map((got.results ?? []).map((r) => [r.client, {
    client: r.client, files: Number(r.files) || 0, keepers: Number(r.keepers) || 0, unsorted: Number(r.unsorted) || 0,
    needsShow: Number(r.needs_show) || 0, missing: Number(r.missing) || 0,
  }]));
}
