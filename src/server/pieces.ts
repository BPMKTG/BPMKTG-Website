/* ──────────────────────────────────────────────────────────────
   Pieces: reading a client's steps and Content Pipeline rows out of
   Notion, and writing what the planners in src/data/pieces.ts return.

   SERVER ONLY.

   Everything here is one client at a time, and every query says which
   one. A row is only ever written after it has come back from a query
   filtered on that client, so an id off a request cannot reach across
   to somebody else's calendar.

   A Worker gets a fixed budget of outgoing requests, and each Notion
   call is one. So the reads are narrowed where they can be, the bulk
   writes take a budget and report what is left, and the page that
   asked runs them again until nothing is.
   ────────────────────────────────────────────────────────────── */

import { clientType, type ClientTypeConfig } from '../data/client-types';
import { cleanItemTitle } from '../data/portal';
import {
  piecesToFollow,
  piecesToSkip,
  stepSkippedByPieces,
  type ExistingPiece,
  type PieceMoment,
  type PieceStep,
  type PlannedPiece,
} from '../data/pieces';
import {
  CALENDAR_DB,
  CONTENT_DB,
  fetchPage,
  normaliseNotionId,
  notionHeaders,
  queryAll,
  readCheckbox,
  readDate,
  readNumber,
  readRelation,
  readSelect,
  readText,
} from './portal-notion';

/** Notion writes one request may make on top of its reads. This
 *  leaves room for a client with a long calendar to be read first. */
export const PIECE_WRITE_BUDGET = 28;

const same = (a: unknown, b: unknown): boolean =>
  normaliseNotionId(String(a ?? '')) === normaliseNotionId(String(b ?? ''));

/* ── reading ──────────────────────────────────────────────────── */

function formulaDay(p: any): string | null {
  const f = p?.formula;
  if (!f) return null;
  if (f.type === 'date') return f.date?.start ? String(f.date.start).slice(0, 10) : null;
  if (f.type === 'string' && f.string) return String(f.string).slice(0, 10);
  return null;
}

export interface ClientFacts {
  slug: string | null;
  artist: string;
  /** What kind of client this is. An artist unless the row says. */
  type: ClientTypeConfig;
}

/** The two things about a client these writes need: whose cache to
 *  drop, and the name to take off the front of a moment's title. */
export async function clientFacts(token: string, clientPageId: string): Promise<ClientFacts | null> {
  const page = await fetchPage(token, clientPageId);
  if (!page || page.object !== 'page' || page.archived) return null;
  const p = page.properties ?? {};
  const slug = (readText(p['Intake Slug']) ?? '').trim().toLowerCase();
  // The title property is the artist, whatever it is called.
  const titleProp = Object.values(p).find((v: any) => v?.type === 'title');
  return {
    slug: slug || null,
    artist: (readText(titleProp as any) ?? '').trim(),
    type: clientType(readSelect(p['Client Type'])),
  };
}

export interface ClientCalendar {
  steps: PieceStep[];
  moments: Array<PieceMoment & { hidden: boolean }>;
}

export function shapeStep(page: any): PieceStep {
  const p = page.properties ?? {};
  return {
    id: String(page.id),
    title: (readText(p['Item']) ?? '').trim(),
    playbook: readSelect(p['Playbook']),
    phase: readSelect(p['Phase']),
    flow: readSelect(p['Flow']),
    status: readSelect(p['Status']),
    date: readDate(p['Date']) ?? formulaDay(p['Auto Date']),
    momentId: readRelation(p['Moment'])[0] ?? null,
    priority: readSelect(p['Priority']),
    defaultMedia: readSelect(p['Default Media']),
    pieces: readNumber(p['Pieces']),
    hidden: readCheckbox(p['Hide from Client']),
    notes: readText(p['Notes']),
    owner: readSelect(p['Owner']),
    masterId: (readText(p['Master Step ID']) ?? '').trim() || null,
    pending: readCheckbox(p['Pending Blueprint']),
  };
}

/**
 * One client's steps and moments, hidden rows included: a step we
 * are holding back from a client is still a step that owes a piece.
 *
 * `momentId` narrows the steps to one moment, which is all that
 * applying a playbook needs and is one page of results rather than
 * four. Moments always come back whole; there are a handful.
 */
export async function fetchClientCalendar(
  token: string, clientPageId: string, artist: string, only: { momentId?: string } = {},
): Promise<ClientCalendar> {
  const mine = [
    { property: 'Client', relation: { contains: clientPageId } },
    { property: 'Is Playbook', checkbox: { equals: false } },
  ];
  const filter = only.momentId
    ? { and: [...mine, { or: [
        { property: 'Kind', select: { equals: 'Moment' } },
        { property: 'Moment', relation: { contains: only.momentId } },
      ] }] }
    : { and: mine };
  const rows = await queryAll(token, CALENDAR_DB, { filter });
  const out: ClientCalendar = { steps: [], moments: [] };
  for (const page of rows) {
    const p = page.properties ?? {};
    // Belt and braces: the filter said this client and not a master.
    if (!readRelation(p['Client']).some((id) => same(id, clientPageId))) continue;
    if (readCheckbox(p['Is Playbook'])) continue;
    const kind = readSelect(p['Kind']);
    if (kind === 'Moment') {
      out.moments.push({
        id: String(page.id),
        title: cleanItemTitle(readText(p['Item']) ?? '', artist).title,
        date: readDate(p['Date']),
        momentType: readSelect(p['Moment Type']),
        hidden: readCheckbox(p['Hide from Client']),
      });
    } else if (kind === 'Step') {
      out.steps.push(shapeStep(page));
    }
  }
  return out;
}

export interface PieceRow extends ExistingPiece {
  filmBy: string | null;
  source: string | null;
  hidden: boolean;
}

export function shapePiece(page: any): PieceRow {
  const p = page.properties ?? {};
  return {
    id: String(page.id),
    title: (readText(p['Content']) ?? '').trim(),
    status: readSelect(p['Status']),
    postDate: readDate(p['Post Date']),
    filmBy: readDate(p['Film By']),
    campaign: readRelation(p['Campaign']),
    media: readSelect(p['Media']),
    postedBy: readSelect(p['Posted By']),
    source: readSelect(p['Source']),
    notes: readText(p['Notes']),
    hidden: readCheckbox(p['Hide from Client']),
  };
}

/**
 * One client's Content Pipeline rows that hang off a campaign, hidden
 * ones included. With `stepId`, only the rows linked to that step.
 */
export async function fetchLinkedPieces(
  token: string, clientPageId: string, only: { stepId?: string } = {},
): Promise<PieceRow[]> {
  const rows = await queryAll(token, CONTENT_DB, {
    filter: {
      and: [
        { property: 'Client', relation: { contains: clientPageId } },
        only.stepId
          ? { property: 'Campaign', relation: { contains: only.stepId } }
          : { property: 'Campaign', relation: { is_not_empty: true } },
      ],
    },
  });
  return rows
    .filter((page: any) => readRelation(page?.properties?.['Client']).some((id) => same(id, clientPageId)))
    // A delivery is not a piece: it is not a post, it is counted in no
    // month, and it follows no step. See src/data/deliveries.ts.
    .filter((page: any) => !readSelect(page?.properties?.['Deliverable']))
    .map(shapePiece);
}

/** Every row of ours that counts in one month, linked or not. */
export async function fetchMonthPieces(
  token: string, clientPageId: string, first: string, last: string,
): Promise<PieceRow[]> {
  const rows = await queryAll(token, CONTENT_DB, {
    filter: {
      and: [
        { property: 'Client', relation: { contains: clientPageId } },
        { property: 'Posted By', select: { equals: 'Blueprint' } },
        { property: 'Post Date', date: { on_or_after: first } },
        { property: 'Post Date', date: { on_or_before: last } },
      ],
    },
  });
  return rows
    .filter((page: any) => readRelation(page?.properties?.['Client']).some((id) => same(id, clientPageId)))
    // A delivery is not a piece: it is not a post, it is counted in no
    // month, and it follows no step. See src/data/deliveries.ts.
    .filter((page: any) => !readSelect(page?.properties?.['Deliverable']))
    .map(shapePiece);
}

/* ── writing ──────────────────────────────────────────────────── */

const selectOf = (v: string | null) => ({ select: v ? { name: v } : null });
const dateOf = (v: string | null) => ({ date: v ? { start: v } : null });

/** A piece, as the row it becomes. Everything that says whose it is
 *  and what it is for is set here: ours to post, Planned, linked to
 *  the step it delivers. */
export function pieceProperties(piece: PlannedPiece, clientPageId: string): Record<string, unknown> {
  return {
    Content: { title: [{ text: { content: piece.title } }] },
    Client: { relation: [{ id: clientPageId }] },
    Campaign: { relation: [{ id: piece.stepId }] },
    'Posted By': selectOf('Blueprint'),
    Status: selectOf('Planned'),
    'Post Date': dateOf(piece.postDate),
    Media: selectOf(piece.media),
    Source: selectOf(piece.source),
    ...(piece.filmBy ? { 'Film By': dateOf(piece.filmBy) } : {}),
    ...(piece.bucket ? { Bucket: selectOf(piece.bucket) } : {}),
    Platforms: { multi_select: piece.platforms.map((name) => ({ name })) },
    'Hide from Client': { checkbox: piece.hidden },
    'Last Edited By': selectOf('Blueprint'),
  };
}

async function send(
  method: 'POST' | 'PATCH', url: string, body: unknown, token: string, label: string,
): Promise<any | null> {
  try {
    const res = await fetch(url, { method, headers: notionHeaders(token), body: JSON.stringify(body) });
    if (!res.ok) {
      console.error(`pieces: ${label} failed`, res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`pieces: ${label} threw`, err);
    return null;
  }
}

export function createPiece(token: string, piece: PlannedPiece, clientPageId: string): Promise<any | null> {
  return send('POST', 'https://api.notion.com/v1/pages',
    { parent: { database_id: CONTENT_DB }, properties: pieceProperties(piece, clientPageId) },
    token, 'creating a piece');
}

export function patchRow(
  token: string, id: string, properties: Record<string, unknown>, label: string,
): Promise<any | null> {
  return send('PATCH', `https://api.notion.com/v1/pages/${id}`, { properties }, token, label);
}

export function archiveRow(token: string, id: string, label: string): Promise<any | null> {
  return send('PATCH', `https://api.notion.com/v1/pages/${id}`, { archived: true }, token, label);
}

/**
 * Create these rows, up to a budget, a few at a time.
 *
 * Returns how many landed. It stops at the first failure rather than
 * pressing on, so a Notion that has started refusing is not asked
 * thirty more times; whatever is left is still missing, and the next
 * run plans it again.
 */
export async function createPieces(
  token: string, pieces: readonly PlannedPiece[], clientPageId: string, budget: number,
): Promise<number> {
  let created = 0;
  for (const piece of pieces.slice(0, Math.max(0, budget))) {
    if (!await createPiece(token, piece, clientPageId)) break;
    created++;
  }
  return created;
}

/* ── sync ─────────────────────────────────────────────────────── */

export type Editor = 'Blueprint' | 'Client';

/**
 * Bring each step's Planned rows onto the step's day.
 *
 * `steps` is the steps as they now stand, already known to be this
 * client's. A row past Planned is never moved. Returns how many moved
 * and how many are still waiting because the budget ran out, which
 * the caller hands back to the page so it can ask again.
 */
export async function followSteps(
  token: string,
  clientPageId: string,
  steps: ReadonlyArray<{ id: string; date: string | null }>,
  by: Editor,
  budget: number,
  pieces?: readonly PieceRow[],
): Promise<{ moved: number; left: number }> {
  if (!steps.length) return { moved: 0, left: 0 };
  const rows = pieces ?? (steps.length === 1
    ? await fetchLinkedPieces(token, clientPageId, { stepId: steps[0].id })
    : await fetchLinkedPieces(token, clientPageId));
  const todo: Array<{ id: string; to: string }> = [];
  for (const step of steps) {
    const mine = rows.filter((p) => p.campaign.some((id) => same(id, step.id)));
    for (const p of piecesToFollow(mine, step.date)) todo.push({ id: p.id, to: (step.date as string).slice(0, 10) });
  }
  let moved = 0;
  for (const w of todo.slice(0, Math.max(0, budget))) {
    const ok = await patchRow(token, w.id, {
      'Post Date': dateOf(w.to), 'Last Edited By': selectOf(by),
    }, 'moving a piece with its step');
    if (!ok) break;
    moved++;
  }
  return { moved, left: todo.length - moved };
}

/** A step was skipped: its Planned rows go with it. */
export async function skipPiecesOfStep(
  token: string, clientPageId: string, stepId: string, by: Editor,
): Promise<number> {
  const rows = await fetchLinkedPieces(token, clientPageId, { stepId });
  let n = 0;
  for (const p of piecesToSkip(rows)) {
    const ok = await patchRow(token, p.id, {
      Status: selectOf('Skipped'), 'Last Edited By': selectOf(by),
    }, 'skipping a piece with its step');
    if (ok) n++;
  }
  return n;
}

/**
 * A row was skipped: its step goes too, when that was the last row it
 * had. A step that is already Done, Skipped or Moved is left exactly
 * as it is.
 */
export async function skipStepsOfPiece(
  token: string, clientPageId: string, campaign: readonly string[], by: Editor,
): Promise<string[]> {
  const touched: string[] = [];
  for (const stepId of campaign) {
    const page = await fetchPage(token, stepId);
    if (!page || page.object !== 'page' || page.archived) continue;
    const p = page.properties ?? {};
    if (!readRelation(p['Client']).some((id) => same(id, clientPageId))) continue;
    if (readCheckbox(p['Is Playbook']) || readSelect(p['Kind']) !== 'Step') continue;
    if (['Done', 'Skipped', 'Moved'].includes(readSelect(p['Status']) ?? '')) continue;
    const rows = await fetchLinkedPieces(token, clientPageId, { stepId });
    if (!stepSkippedByPieces(rows)) continue;
    const ok = await patchRow(token, stepId, {
      Status: selectOf('Skipped'), 'Last Edited By': selectOf(by),
    }, 'skipping a step with its last piece');
    if (ok) touched.push(stepId);
  }
  return touched;
}
