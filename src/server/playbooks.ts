/* ──────────────────────────────────────────────────────────────
   Playbooks: reading the masters and the overrides out of Notion,
   and writing what the planners in src/data/playbooks.ts return.

   SERVER ONLY.

   Two databases. The masters are Campaign Calendar rows with Is
   Playbook ticked, the same database every client's steps live in,
   so the first thing every master write does is prove the row it was
   handed IS a master: an id is a path segment, and an admin session
   is not licence to retitle a client's step by mistake. Overrides
   live in their own database and get the same check against it.

   Nothing is created that Notion does not already have a name for. A
   phase, a flow or a playbook that is not already an option is
   refused rather than sent, because Notion answers an unknown select
   value by quietly making a new option.
   ────────────────────────────────────────────────────────────── */

import { isStepFlow, flowOwner, type StepFlow } from '../data/portal';
import {
  CHANGE_TYPES,
  OVERRIDE_STATUSES,
  type MasterStep,
  type OpenStep,
  type PlannedStep,
  type PlaybookOverride,
  type UpcomingMoment,
} from '../data/playbooks';
import { beginHq, type HqEnv } from './hq-auth';
import { portalNotFound } from './portal-auth';
import { isJsonRequest, isSameOrigin, readJsonBody } from './portal-write';
import {
  CALENDAR_DB,
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

export const OVERRIDES_DB = 'a105d9c5-7901-43df-b427-41aa8e10d900';

/** Writes one request may make. A Worker has a fixed budget of
 *  subrequests, and Notion takes about a third of a second each, so a
 *  bulk apply is done in batches the caller can run again. The longest
 *  playbook is 36 steps, which fits in one. */
export const MAX_PLAYBOOK_WRITES = 40;

export const MAX_STEP_TITLE = 200;
export const MAX_STEP_NOTES = 2000;
/** A year either side of a moment. Nothing is planned further out, and
 *  a typo of an extra digit should not put a step in another decade. */
export const MAX_OFFSET_DAYS = 365;

/* ── reading ──────────────────────────────────────────────────── */

export function shapeMaster(page: any): MasterStep | null {
  const p = page?.properties ?? {};
  if (!readCheckbox(p['Is Playbook'])) return null;
  if (readSelect(p['Kind']) !== 'Step') return null;
  const playbook = readSelect(p['Playbook']);
  if (!playbook) return null;
  return {
    id: String(page.id),
    title: (readText(p['Item']) ?? '').trim(),
    playbook,
    phase: readSelect(p['Phase']),
    offset: readNumber(p['Offset (days)']),
    flow: readSelect(p['Flow']),
    owner: readSelect(p['Owner']),
    type: readSelect(p['Type']),
    notes: readText(p['Notes']),
    where: readText(p['Where']),
    why: readText(p['Why It Matters']),
    momentId: readRelation(p['Moment'])[0] ?? null,
    hideFromClient: readCheckbox(p['Hide from Client']),
  };
}

export async function fetchMasters(token: string): Promise<MasterStep[]> {
  const rows = await queryAll(token, CALENDAR_DB, {
    filter: { property: 'Is Playbook', checkbox: { equals: true } },
  });
  return rows.map(shapeMaster).filter((m): m is MasterStep => !!m);
}

export function shapeOverride(page: any): PlaybookOverride {
  const p = page?.properties ?? {};
  return {
    id: String(page.id),
    change: (readText(p['Change']) ?? '').trim(),
    clientId: readRelation(p['Client'])[0] ?? null,
    playbook: readSelect(p['Playbook']),
    masterStepId: readRelation(p['Master Step'])[0] ?? null,
    changeType: readSelect(p['Change Type']),
    newOffset: readNumber(p['New Offset (days)']),
    newFlow: readSelect(p['New Flow']),
    newTitle: readText(p['New Title']),
    reason: readText(p['Reason']),
    status: readSelect(p['Status']),
    requestedBy: readSelect(p['Requested By']),
    created: typeof page?.created_time === 'string' ? page.created_time : null,
  };
}

/** Every override, or one client's. */
export async function fetchOverrides(token: string, clientPageId?: string): Promise<PlaybookOverride[]> {
  const rows = await queryAll(token, OVERRIDES_DB, clientPageId
    ? { filter: { property: 'Client', relation: { contains: clientPageId } } }
    : {});
  return rows.map(shapeOverride);
}

/** A client's steps and moments, as the planners read them. Includes
 *  rows hidden from the client: an override is about the campaign, not
 *  about what the portal shows of it. */
export async function fetchClientSteps(
  token: string, clientPageId: string,
): Promise<{ steps: OpenStep[]; moments: UpcomingMoment[] }> {
  const rows = await queryAll(token, CALENDAR_DB, {
    filter: {
      and: [
        { property: 'Client', relation: { contains: clientPageId } },
        { property: 'Is Playbook', checkbox: { equals: false } },
      ],
    },
  });
  const steps: OpenStep[] = [];
  const moments: UpcomingMoment[] = [];
  for (const page of rows) {
    const p = page.properties ?? {};
    const kind = readSelect(p['Kind']);
    if (kind === 'Moment') {
      moments.push({ id: String(page.id), title: (readText(p['Item']) ?? '').trim(), date: readDate(p['Date']) });
    } else if (kind === 'Step') {
      steps.push({
        id: String(page.id),
        title: (readText(p['Item']) ?? '').trim(),
        playbook: readSelect(p['Playbook']),
        phase: readSelect(p['Phase']),
        offset: readNumber(p['Offset (days)']),
        status: readSelect(p['Status']),
        momentId: readRelation(p['Moment'])[0] ?? null,
      });
    }
  }
  return { steps, moments };
}

/* ── proving a row is what the request says it is ─────────────── */

async function getPage(token: string, id: string): Promise<any | null> {
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${id}`, { headers: notionHeaders(token) });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

const inDb = (page: any, db: string) =>
  !!page && !page.archived
  && normaliseNotionId(String(page?.parent?.database_id ?? '')) === normaliseNotionId(db);

/** The master step with this id, or null for anything else at all:
 *  a client's step, a moment, a page in another database. */
export async function fetchOwnedMaster(token: string, id: string): Promise<MasterStep | null> {
  const page = await getPage(token, id);
  if (!inDb(page, CALENDAR_DB)) return null;
  return shapeMaster(page);
}

export async function fetchOwnedOverride(token: string, id: string): Promise<PlaybookOverride | null> {
  const page = await getPage(token, id);
  if (!inDb(page, OVERRIDES_DB)) return null;
  return shapeOverride(page);
}

/* ── untrusted JSON → Notion properties ───────────────────────── */

const text = (v: unknown, max: number): string | null | undefined => {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : null;
};

/** A whole number of days within a year of the moment. */
export function cleanOffset(v: unknown): number | undefined {
  if (typeof v !== 'number' || !Number.isInteger(v)) return undefined;
  return Math.abs(v) <= MAX_OFFSET_DAYS ? v : undefined;
}

const richText = (v: string | null) => ({ rich_text: v ? [{ text: { content: v } }] : [] });
const selectOf = (v: string | null) => ({ select: v ? { name: v } : null });

export interface MasterVocabulary {
  /** Phases some master already uses. Not the whole option list: the
   *  point is to refuse a typo, and a phase no playbook uses is one. */
  phases: readonly string[];
  playbooks: readonly string[];
}

export function vocabularyOf(masters: readonly MasterStep[]): MasterVocabulary {
  return {
    phases: [...new Set(masters.map((m) => m.phase).filter((x): x is string => !!x))],
    playbooks: [...new Set(masters.map((m) => m.playbook))],
  };
}

export interface Built {
  properties: Record<string, unknown>;
  rejected: string[];
}

/**
 * An edit to a master step.
 *
 * Owner is never taken from the request. It follows Flow, which is
 * the rule everywhere else on the calendar, so a master cannot be
 * saved saying "Client film session" and "Owner: Blueprint" at once.
 */
export function buildMasterProperties(body: Record<string, unknown>, vocab: MasterVocabulary): Built {
  const props: Record<string, unknown> = {};
  const rejected: string[] = [];

  if ('title' in body) {
    const v = text(body.title, MAX_STEP_TITLE);
    if (typeof v === 'string') props['Item'] = { title: [{ text: { content: v } }] };
    else rejected.push('title');   // a step with no title is not a step
  }
  if ('offset' in body) {
    const v = cleanOffset(body.offset);
    if (v !== undefined) props['Offset (days)'] = { number: v };
    else rejected.push('offset');
  }
  if ('flow' in body) {
    if (isStepFlow(body.flow)) {
      props['Flow'] = selectOf(body.flow);
      props['Owner'] = selectOf(flowOwner(body.flow as StepFlow));
    } else rejected.push('flow');
  }
  if ('phase' in body) {
    if (typeof body.phase === 'string' && vocab.phases.includes(body.phase)) props['Phase'] = selectOf(body.phase);
    else rejected.push('phase');
  }
  if ('notes' in body) {
    const v = text(body.notes, MAX_STEP_NOTES);
    if (v !== undefined) props['Notes'] = richText(v);
    else rejected.push('notes');
  }
  return { properties: props, rejected };
}

/**
 * A brand new master step. Everything a step needs to be one, plus
 * the playbook's own placeholder moment so Notion can date it.
 */
export function buildNewMaster(
  body: Record<string, unknown>, vocab: MasterVocabulary, masters: readonly MasterStep[],
): Built & { playbook: string | null } {
  const built = buildMasterProperties(body, vocab);
  const playbook = typeof body.playbook === 'string' && vocab.playbooks.includes(body.playbook)
    ? body.playbook : null;
  for (const need of ['Item', 'Offset (days)', 'Flow', 'Phase']) {
    if (!built.properties[need]) built.rejected.push(`missing:${need}`);
  }
  if (!playbook) built.rejected.push('playbook');
  if (!playbook) return { ...built, playbook };

  const sibling = masters.find((m) => m.playbook === playbook && m.momentId);
  const flow = (body.flow as string) ?? '';
  built.properties = {
    ...built.properties,
    Kind: selectOf('Step'),
    'Is Playbook': { checkbox: true },
    Playbook: selectOf(playbook),
    // A step that makes a post is content; anything else is a job.
    Type: selectOf(/posts/.test(flow) ? 'Content' : 'Admin'),
    ...(sibling?.momentId ? { Moment: { relation: [{ id: sibling.momentId }] } } : {}),
  };
  return { ...built, playbook };
}

export interface OverrideContext {
  /** Master step ids that exist, so a relation cannot point at a
   *  client's row or another database. */
  masterIds: readonly string[];
  playbooks: readonly string[];
  role: 'admin' | 'client';
}

/**
 * An override's fields. A client supplies a reason and nothing else:
 * what the change IS, and whether it applies, are ours to say.
 */
export function buildOverrideProperties(body: Record<string, unknown>, ctx: OverrideContext): Built {
  const props: Record<string, unknown> = {};
  const rejected: string[] = [];
  const admin = ctx.role === 'admin';
  const adminOnly = (key: string) => { if (key in body) rejected.push(key); };

  if ('reason' in body) {
    const v = text(body.reason, MAX_STEP_NOTES);
    if (v !== undefined) props['Reason'] = richText(v);
    else rejected.push('reason');
  }
  if (!admin) {
    for (const k of ['changeType', 'newOffset', 'newFlow', 'newTitle', 'status', 'change', 'playbook', 'masterStepId']) adminOnly(k);
    return { properties: props, rejected };
  }

  if ('change' in body) {
    const v = text(body.change, MAX_STEP_TITLE);
    if (typeof v === 'string') props['Change'] = { title: [{ text: { content: v } }] };
    else rejected.push('change');
  }
  if ('changeType' in body) {
    if (typeof body.changeType === 'string' && (CHANGE_TYPES as readonly string[]).includes(body.changeType)) {
      props['Change Type'] = selectOf(body.changeType);
    } else rejected.push('changeType');
  }
  if ('newOffset' in body) {
    if (body.newOffset === null) props['New Offset (days)'] = { number: null };
    else {
      const v = cleanOffset(body.newOffset);
      if (v !== undefined) props['New Offset (days)'] = { number: v };
      else rejected.push('newOffset');
    }
  }
  if ('newFlow' in body) {
    if (body.newFlow === null) props['New Flow'] = selectOf(null);
    else if (isStepFlow(body.newFlow)) props['New Flow'] = selectOf(body.newFlow);
    else rejected.push('newFlow');
  }
  if ('newTitle' in body) {
    const v = text(body.newTitle, MAX_STEP_TITLE);
    if (v !== undefined) props['New Title'] = richText(v);
    else rejected.push('newTitle');
  }
  if ('playbook' in body) {
    if (typeof body.playbook === 'string' && ctx.playbooks.includes(body.playbook)) props['Playbook'] = selectOf(body.playbook);
    else rejected.push('playbook');
  }
  if ('masterStepId' in body) {
    const ids = ctx.masterIds.map(normaliseNotionId);
    if (body.masterStepId === null) props['Master Step'] = { relation: [] };
    else if (typeof body.masterStepId === 'string' && ids.includes(normaliseNotionId(body.masterStepId))) {
      props['Master Step'] = { relation: [{ id: body.masterStepId }] };
    } else rejected.push('masterStepId');
  }
  if ('status' in body) {
    if (typeof body.status === 'string' && (OVERRIDE_STATUSES as readonly string[]).includes(body.status)) {
      props['Status'] = selectOf(body.status);
    } else rejected.push('status');
  }
  return { properties: props, rejected };
}

/** A step on a client's calendar, from a plan. The same properties a
 *  step has when a playbook is copied onto a moment by hand. */
export function stepProperties(
  step: PlannedStep, clientPageId: string, momentId: string,
): Record<string, unknown> {
  return {
    Item: { title: [{ text: { content: step.title.slice(0, MAX_STEP_TITLE) } }] },
    Kind: selectOf('Step'),
    'Is Playbook': { checkbox: false },
    Client: { relation: [{ id: clientPageId }] },
    Moment: { relation: [{ id: momentId }] },
    Playbook: selectOf(step.playbook),
    Phase: selectOf(step.phase),
    'Offset (days)': { number: step.offset },
    Date: { date: step.date ? { start: step.date } : null },
    Flow: selectOf(isStepFlow(step.flow) ? step.flow : null),
    Owner: selectOf(step.owner === 'Client' || step.owner === 'Blueprint' ? step.owner : null),
    Type: selectOf(step.type === 'Content' || step.type === 'Admin' ? step.type : null),
    Status: selectOf('Not Started'),
    Notes: richText(step.notes ? step.notes.slice(0, MAX_STEP_NOTES) : null),
    Where: richText(step.where ? step.where.slice(0, MAX_STEP_NOTES) : null),
    'Why It Matters': richText(step.why ? step.why.slice(0, MAX_STEP_NOTES) : null),
    'Last Edited By': selectOf('Blueprint'),
  };
}

/* ── writing ──────────────────────────────────────────────────── */

export async function createIn(
  token: string, db: string, properties: Record<string, unknown>, label: string,
): Promise<any | null> {
  try {
    const res = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: notionHeaders(token),
      body: JSON.stringify({ parent: { database_id: db }, properties }),
    });
    if (!res.ok) {
      console.error(`playbooks: creating ${label} failed`, res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`playbooks: creating ${label} threw`, err);
    return null;
  }
}

export async function updatePage(
  token: string, id: string, body: Record<string, unknown>, label: string,
): Promise<any | null> {
  try {
    const res = await fetch(`https://api.notion.com/v1/pages/${id}`, {
      method: 'PATCH',
      headers: notionHeaders(token),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(`playbooks: updating ${label} failed`, id, res.status, await res.text());
      return null;
    }
    return await res.json();
  } catch (err) {
    console.error(`playbooks: updating ${label} threw`, id, err);
    return null;
  }
}

/* ── the gate every HQ playbook write runs ────────────────────── */


/** Admin, from our own page, with a JSON body. One 404 for anything
 *  else, the same as the rest of HQ. */
export async function beginPlaybookWrite(
  request: Request, env: HqEnv,
): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; response: Response }> {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate;
  if (!isSameOrigin(request) || !isJsonRequest(request)) return { ok: false, response: portalNotFound() };
  const body = await readJsonBody(request);
  if (!body) return { ok: false, response: portalNotFound() };
  return { ok: true, body };
}

/** The slug of a Clients page, for dropping that client's cache. */
export async function clientSlugOf(token: string, clientPageId: string): Promise<string | null> {
  const page = await getPage(token, clientPageId);
  const slug = (readText(page?.properties?.['Intake Slug']) ?? '').trim().toLowerCase();
  return slug || null;
}
