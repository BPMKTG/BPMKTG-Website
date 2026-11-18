/* ──────────────────────────────────────────────────────────────
   "Update campaigns to current playbook": the Notion and R2 side.

   SERVER ONLY.

   The plan is made in src/data/playbook-update.ts and is a pure
   function of what is read here. This file reads one client's steps,
   moments and pieces, turns a row of the plan into the properties it
   sets, and keeps the snapshot that makes the whole thing undoable.

   The snapshot is the safety. Before the first write of a run, every
   row the plan will touch is written to R2 as it stands: the page id
   and the exact properties to put back. No bucket, no snapshot, and
   then no write: the action refuses rather than run without a way
   back.
   ────────────────────────────────────────────────────────────── */

import { cleanItemTitle } from '../data/portal';
import { mastersForType, type MasterStep } from '../data/playbooks';
import type { PieceMoment } from '../data/pieces';
import {
  ASKS_FIELD, baselineOf,
  type UpPiece, type UpStep, type UpdateBaseline, type UpdateRow,
} from '../data/playbook-update';
import {
  CALENDAR_DB, normaliseNotionId, queryAll, readCheckbox, readDate, readNumber, readRelation,
  readSelect, readText,
} from './portal-notion';
import { fetchLinkedPieces, shapeStep } from './pieces';
import { fetchMasters } from './playbooks';

const same = (a: unknown, b: unknown): boolean =>
  normaliseNotionId(String(a ?? '')) === normaliseNotionId(String(b ?? ''));

/* ── reading ──────────────────────────────────────────────────── */

export interface UpdateState {
  steps: UpStep[];
  moments: Array<PieceMoment & { hidden: boolean }>;
  masters: MasterStep[];
  pieces: UpPiece[];
}

export function shapeUpStep(page: any): UpStep {
  const p = page.properties ?? {};
  return {
    ...shapeStep(page),
    offset: readNumber(p['Offset (days)']),
    brief: readText(p['Brief']),
    where: readText(p['Where']),
    why: readText(p['Why It Matters']),
    asksNotes: readCheckbox(p[ASKS_FIELD]),
  };
}

/** One client's steps, moments and campaign pieces, hidden rows
 *  included, and every master, retired ones too. */
export async function readUpdateState(
  token: string, clientPageId: string, artist: string, typeId = 'artist',
): Promise<UpdateState> {
  const [rows, every, linked] = await Promise.all([
    queryAll(token, CALENDAR_DB, {
      filter: { and: [
        { property: 'Client', relation: { contains: clientPageId } },
        { property: 'Is Playbook', checkbox: { equals: false } },
      ] },
    }),
    fetchMasters(token),
    fetchLinkedPieces(token, clientPageId),
  ]);
  const steps: UpStep[] = [];
  const moments: UpdateState['moments'] = [];
  for (const page of rows) {
    const p = page.properties ?? {};
    if (!readRelation(p['Client']).some((id) => same(id, clientPageId))) continue;
    if (readCheckbox(p['Is Playbook'])) continue;
    const kind = readSelect(p['Kind']);
    if (kind === 'Moment') {
      moments.push({
        id: String(page.id),
        title: cleanItemTitle(readText(p['Item']) ?? '', artist).title,
        date: readDate(p['Date']),
        momentType: readSelect(p['Moment Type']),
        hidden: readCheckbox(p['Hide from Client']),
      });
    } else if (kind === 'Step') {
      steps.push(shapeUpStep(page));
    }
  }
  const pieces: UpPiece[] = linked.map((p) => ({
    id: p.id, title: p.title, status: p.status, postDate: p.postDate, campaign: p.campaign,
    media: p.media ?? null, postedBy: p.postedBy ?? null, notes: p.notes ?? null,
  }));
  // A campaign is only ever brought up to date against its own client
  // type's playbooks.
  const masters = mastersForType(every, typeId);
  return { steps, moments, masters, pieces };
}

/* ── a row of the plan, as Notion properties ──────────────────── */

const text = (v: string | null) => ({ rich_text: v ? [{ text: { content: v.slice(0, 2000) } }] : [] });
const select = (v: string | null) => ({ select: v ? { name: v } : null });
const date = (v: string | null) => ({ date: v ? { start: v.slice(0, 10) } : null });
const num = (v: number | null) => ({ number: v });
const titleOf = (v: string) => ({ title: [{ text: { content: v.slice(0, 200) } }] });
const stamp = { 'Last Edited By': select('Blueprint') };

const withNote = (notes: string | null | undefined, line: string): string => {
  const was = (notes ?? '').trimEnd();
  if (was.split('\n').some((l) => l.trim() === line)) return was;
  return was ? `${was}\n${line}` : line;
};

/** The property a field of the plan is written to, as a value. */
function stepProp(field: string, to: string | null): Record<string, unknown> {
  switch (field) {
    case 'Item': return { Item: titleOf(to ?? '') };
    case 'Status': return { Status: select(to) };
    case 'Date': return { Date: date(to) };
    case 'Offset (days)': return { 'Offset (days)': num(to === null ? null : Number(to)) };
    case 'Pieces': return { Pieces: num(to === null ? null : Number(to)) };
    case 'Priority': return { Priority: select(to) };
    case 'Default Media': return { 'Default Media': select(to) };
    case 'Brief': return { Brief: text(to) };
    case 'Where': return { Where: text(to) };
    case 'Why It Matters': return { 'Why It Matters': text(to) };
    case ASKS_FIELD: return { [ASKS_FIELD]: { checkbox: to === 'Yes' } };
    default: return {};
  }
}

/** What a step is set to. */
export function stepWrite(row: UpdateRow, step: UpStep): Record<string, unknown> {
  let props: Record<string, unknown> = { ...stamp };
  for (const c of row.changes) props = { ...props, ...stepProp(c.field, c.to) };
  if (row.note) props.Notes = text(withNote(step.notes, row.note));
  return props;
}

/** What a step held, in the same shape, so putting it back is the
 *  same kind of write as changing it. */
export function stepRestore(row: UpdateRow, step: UpStep): Record<string, unknown> {
  const was: Record<string, string | null> = {
    Item: step.title, Status: step.status, Date: step.date,
    'Offset (days)': step.offset === null ? null : String(step.offset),
    Pieces: step.pieces === null ? null : String(step.pieces),
    Priority: step.priority, 'Default Media': step.defaultMedia,
    Brief: step.brief, Where: step.where, 'Why It Matters': step.why,
    [ASKS_FIELD]: step.asksNotes ? 'Yes' : null,
  };
  let props: Record<string, unknown> = {};
  for (const c of row.changes) props = { ...props, ...stepProp(c.field, was[c.field] ?? null) };
  if (row.note) props.Notes = text(step.notes ?? null);
  return props;
}

export function pieceWrite(change: UpdateRow['pieces'][number], piece: UpPiece): Record<string, unknown> {
  const props: Record<string, unknown> = { ...stamp };
  if (change.status) props.Status = select(change.status);
  if (change.postDate) props['Post Date'] = date(change.postDate);
  if (change.note) props.Notes = text(withNote(piece.notes, change.note));
  return props;
}

export function pieceRestore(change: UpdateRow['pieces'][number], piece: UpPiece): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (change.status) props.Status = select(piece.status);
  if (change.postDate) props['Post Date'] = date(piece.postDate);
  if (change.note) props.Notes = text(piece.notes ?? null);
  return props;
}

/* ── the snapshot ─────────────────────────────────────────────── */

export interface SnapshotRow {
  id: string;
  kind: 'step' | 'piece';
  title: string;
  /** Exactly what to write to put the row back. */
  restore: Record<string, unknown>;
}

export interface UpdateSnapshot {
  version: 1;
  clientId: string;
  /** When the run started, which is also its name. */
  at: string;
  by: string;
  /** How things stood, for the checks made after writing. */
  baseline: UpdateBaseline;
  rows: SnapshotRow[];
  /** Steps the run created. Undo archives them. */
  created: string[];
  /** Set once the run has been taken back, so it is not offered twice. */
  undone?: string;
}

/** A minimal R2 bucket: only what this needs. */
export interface SnapshotBucket {
  put(key: string, value: string, opts?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  get(key: string): Promise<{ text(): Promise<string> } | null>;
  list(opts: { prefix: string; limit?: number; cursor?: string }): Promise<{
    objects: Array<{ key: string }>; truncated?: boolean; cursor?: string;
  }>;
}

/** Where a client's runs are kept. Not under any prefix a client's
 *  session may read: see functions/portal/[slug]/files. */
export const snapshotPrefix = (clientPageId: string) =>
  `hq/playbook-updates/${normaliseNotionId(clientPageId)}/`;

export const snapshotKey = (clientPageId: string, at: string) =>
  `${snapshotPrefix(clientPageId)}${at.replace(/[:.]/g, '-')}.json`;

/** Is this key one of this client's runs, and nothing else? */
export function isSnapshotKey(key: unknown, clientPageId: string): key is string {
  return typeof key === 'string'
    && key.startsWith(snapshotPrefix(clientPageId))
    && /^[0-9TZ-]+\.json$/.test(key.slice(snapshotPrefix(clientPageId).length));
}

/** Every row the plan will touch, as it stands now. */
export function buildSnapshot(
  clientPageId: string, at: string, by: string,
  rows: readonly UpdateRow[], state: Pick<UpdateState, 'steps' | 'pieces'>,
): UpdateSnapshot {
  const stepOf = new Map(state.steps.map((s) => [normaliseNotionId(s.id), s]));
  const pieceOf = new Map(state.pieces.map((p) => [normaliseNotionId(p.id), p]));
  const out: SnapshotRow[] = [];
  for (const row of rows) {
    if (row.action !== 'skip' && row.action !== 'update') continue;
    const step = stepOf.get(normaliseNotionId(row.stepId));
    if (!step) continue;
    out.push({ id: step.id, kind: 'step', title: step.title, restore: stepRestore(row, step) });
    for (const c of row.pieces) {
      const piece = pieceOf.get(normaliseNotionId(c.id));
      if (piece) out.push({ id: piece.id, kind: 'piece', title: piece.title, restore: pieceRestore(c, piece) });
    }
  }
  return {
    version: 1, clientId: clientPageId, at, by,
    baseline: baselineOf(state.steps, state.pieces), rows: out, created: [],
  };
}

export async function putSnapshot(bucket: SnapshotBucket, snap: UpdateSnapshot): Promise<string> {
  const key = snapshotKey(snap.clientId, snap.at);
  await bucket.put(key, JSON.stringify(snap), { httpMetadata: { contentType: 'application/json' } });
  return key;
}

export async function getSnapshot(bucket: SnapshotBucket, key: string): Promise<UpdateSnapshot | null> {
  const obj = await bucket.get(key);
  if (!obj) return null;
  try {
    const snap = JSON.parse(await obj.text()) as UpdateSnapshot;
    return snap && snap.version === 1 && Array.isArray(snap.rows) ? snap : null;
  } catch {
    return null;
  }
}

/** The newest run for a client. Keys are timestamps, so the last one
 *  in order is the last one made. */
export async function latestSnapshotKey(bucket: SnapshotBucket, clientPageId: string): Promise<string | null> {
  let cursor: string | undefined;
  let last: string | null = null;
  for (let page = 0; page < 5; page++) {
    const res = await bucket.list({ prefix: snapshotPrefix(clientPageId), limit: 1000, cursor });
    for (const o of res.objects) if (!last || o.key > last) last = o.key;
    if (!res.truncated || !res.cursor) break;
    cursor = res.cursor;
  }
  return last;
}
