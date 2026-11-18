// ─────────────────────────────────────────────────────────────
// Deliveries: what we owe a client who posts for themselves.
//
// An artist retainer is counted in posts: we make them and we put
// them out, fifteen to twenty-five a month. A gym is not that deal. We
// shoot the competition, edit the photos and grade the footage, and
// their own social manager cuts and posts. What we owe is not a post,
// it is a finished photo set or a graded batch of footage, per
// competition, and the question is "has it been delivered yet?".
//
// A delivery is a row in the Content Pipeline like any other, marked
// with Deliverable (Photo set or Footage batch), and linked through
// Campaign to the competition it came from. No new database, and no
// new statuses: the four stages of a delivery are four of the
// statuses the pipeline already has, under words that fit.
//
//   To shoot   Planned (and Idea)
//   Shot       Filmed, Footage In
//   Editing    Editing ... Scheduled   ("Grading" on a footage batch)
//   Delivered  Posted
//
// Deliveries never reach the content boards, the calendars or the
// month counter. The servers split them off before a payload is
// built, so nothing that draws posts can draw one by accident.
//
// Nothing here talks to Notion.
// ─────────────────────────────────────────────────────────────

export const DELIVERABLE_KINDS = ['Photo set', 'Footage batch'] as const;
export type DeliverableKind = typeof DELIVERABLE_KINDS[number];

export function isDeliverableKind(v: unknown): v is DeliverableKind {
  return typeof v === 'string' && (DELIVERABLE_KINDS as readonly string[]).includes(v);
}

export interface Delivery {
  id: string;
  title: string;
  kind: DeliverableKind;
  /** The Content Pipeline status it holds. */
  status: string | null;
  /** When it is due, if a day was given. */
  due: string | null;
  /** Where the finished set or batch is. */
  link: string | null;
  /** The competition it came from, if it is linked to one. */
  momentId: string | null;
  /** HQ only: whose it is. */
  clientId?: string | null;
}

export const DELIVERY_STAGES = ['toShoot', 'shot', 'working', 'delivered'] as const;
export type DeliveryStage = typeof DELIVERY_STAGES[number];

/** The stage a pipeline status reads as, or null for a delivery that
 *  was dropped (Skipped), which is on no list. */
export function deliveryStage(status: string | null): DeliveryStage | null {
  switch (status) {
    case 'Skipped': return null;
    case 'Posted': return 'delivered';
    case 'Filmed':
    case 'Footage In': return 'shot';
    case 'Editing':
    case 'Ready for Review':
    case 'Approved':
    case 'Scheduled': return 'working';
    // Planned, Idea, and a status nobody has set yet.
    default: return 'toShoot';
  }
}

/** The status a stage is written as. One each, so moving a delivery
 *  back and forth lands on the same four values every time. */
export const STAGE_STATUS: Record<DeliveryStage, string> = {
  toShoot: 'Planned', shot: 'Filmed', working: 'Editing', delivered: 'Posted',
};

/** The word for a stage. Photos are edited and footage is graded,
 *  which is the whole difference between the two kinds. */
export function stageLabel(stage: DeliveryStage, kind: DeliverableKind): string {
  switch (stage) {
    case 'toShoot': return 'To shoot';
    case 'shot': return 'Shot';
    case 'working': return kind === 'Footage batch' ? 'Grading' : 'Editing';
    case 'delivered': return 'Delivered';
  }
}

/** What a kind is filed as in the pipeline's Media column. */
export function deliveryMedia(kind: DeliverableKind): 'Photo' | 'Video' {
  return kind === 'Footage batch' ? 'Video' : 'Photo';
}

export const MAX_DELIVERY_TITLE = 200;

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const isDay = (v: unknown): v is string => {
  if (typeof v !== 'string' || !DAY.test(v)) return false;
  const t = Date.parse(`${v}T00:00:00Z`);
  return !Number.isNaN(t) && new Date(t).toISOString().slice(0, 10) === v;
};

/** A link somebody typed, as a web address, or null to clear it, or
 *  undefined when it is not one. Only http and https: this is drawn as
 *  a link a client taps. */
export function cleanDeliveryLink(v: unknown): string | null | undefined {
  if (v === null || v === '') return null;
  if (typeof v !== 'string') return undefined;
  const raw = v.trim();
  if (!raw) return null;
  try {
    const u = new URL(/^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : `https://${raw}`);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') return undefined;
    if (!u.hostname.includes('.')) return undefined;
    return u.toString().slice(0, 1500);
  } catch { return undefined; }
}

export interface NewDelivery {
  title: string;
  kind: DeliverableKind;
  due: string | null;
  momentId: string | null;
}

/** A new delivery as it will be stored, or the names of what was
 *  wrong with the request. */
export function cleanNewDelivery(
  body: Record<string, unknown>, isId: (v: unknown) => boolean,
): { ok: true; value: NewDelivery } | { ok: false; rejected: string[] } {
  const rejected: string[] = [];
  const title = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_DELIVERY_TITLE) : '';
  if (!title) rejected.push('title');
  if (!isDeliverableKind(body.kind)) rejected.push('kind');
  const due = body.due === undefined || body.due === null || body.due === '' ? null : body.due;
  if (due !== null && !isDay(due)) rejected.push('due');
  const momentId = body.momentId === undefined || body.momentId === null || body.momentId === '' ? null : body.momentId;
  if (momentId !== null && !isId(momentId)) rejected.push('momentId');
  if (rejected.length) return { ok: false, rejected };
  return { ok: true, value: { title, kind: body.kind as DeliverableKind, due: due as string | null, momentId: momentId as string | null } };
}

export interface DeliveryPatch {
  status?: string;
  link?: string | null;
  title?: string;
  due?: string | null;
}

/** A change to a delivery: only its stage, its link, its title and
 *  its due day, each checked. Anything else in the request is not
 *  read. */
export function cleanDeliveryPatch(
  body: Record<string, unknown>,
): { value: DeliveryPatch; rejected: string[] } {
  const value: DeliveryPatch = {};
  const rejected: string[] = [];
  if ('stage' in body) {
    if (typeof body.stage === 'string' && (DELIVERY_STAGES as readonly string[]).includes(body.stage)) {
      value.status = STAGE_STATUS[body.stage as DeliveryStage];
    } else rejected.push('stage');
  }
  if ('link' in body) {
    const link = cleanDeliveryLink(body.link);
    if (link === undefined) rejected.push('link'); else value.link = link;
  }
  if ('title' in body) {
    const t = typeof body.title === 'string' ? body.title.trim().slice(0, MAX_DELIVERY_TITLE) : '';
    if (t) value.title = t; else rejected.push('title');
  }
  if ('due' in body) {
    if (body.due === null || body.due === '') value.due = null;
    else if (isDay(body.due)) value.due = body.due;
    else rejected.push('due');
  }
  return { value, rejected };
}

/* ── the tracker ──────────────────────────────────────────────── */

export interface DeliveryMoment {
  id: string;
  title: string;
  date: string | null;
}

export interface DeliveryGroup {
  /** The competition's id, or '' for deliveries linked to none. */
  key: string;
  title: string;
  date: string | null;
  rows: Delivery[];
  delivered: number;
}

const same = (id: unknown): string => String(id ?? '').replace(/-/g, '').toLowerCase();

/** What the heading says for deliveries that hang off no competition. */
export const LOOSE_DELIVERIES = 'Other deliveries';

/**
 * The tracker's list: one group per competition, newest competition
 * first, with what is still owed above what has been delivered.
 *
 * Newest first because the question is always about the last
 * competition: "are the photos from Saturday done?". A dropped
 * delivery is on no list. A delivery linked to a moment this viewer
 * cannot see is kept, under "Other deliveries", rather than vanishing.
 */
export function deliveryGroups(
  deliveries: readonly Delivery[], moments: readonly DeliveryMoment[],
): DeliveryGroup[] {
  const byId = new Map(moments.map((m) => [same(m.id), m]));
  const groups = new Map<string, DeliveryGroup>();
  for (const d of deliveries) {
    if (deliveryStage(d.status) === null) continue;
    const m = d.momentId ? byId.get(same(d.momentId)) : undefined;
    const key = m ? same(m.id) : '';
    let g = groups.get(key);
    if (!g) {
      g = { key, title: m ? m.title : LOOSE_DELIVERIES, date: m?.date ?? null, rows: [], delivered: 0 };
      groups.set(key, g);
    }
    g.rows.push(d);
    if (deliveryStage(d.status) === 'delivered') g.delivered += 1;
  }
  const order = (d: Delivery) => DELIVERY_STAGES.indexOf(deliveryStage(d.status) as DeliveryStage);
  for (const g of groups.values()) {
    g.rows.sort((a, b) => order(a) - order(b)
      || (a.kind === b.kind ? 0 : a.kind === 'Photo set' ? -1 : 1)
      || a.title.localeCompare(b.title));
  }
  return [...groups.values()].sort((a, b) => {
    // The loose group last, whatever its dates.
    if (!a.key !== !b.key) return a.key ? -1 : 1;
    return (b.date ?? '').localeCompare(a.date ?? '') || a.title.localeCompare(b.title);
  });
}

/** How many are owed and how many are in, across everything. */
export function deliveryTally(deliveries: readonly Delivery[]): { total: number; delivered: number } {
  let total = 0, delivered = 0;
  for (const d of deliveries) {
    const s = deliveryStage(d.status);
    if (s === null) continue;
    total += 1;
    if (s === 'delivered') delivered += 1;
  }
  return { total, delivered };
}

/** "2 of 5 delivered", for a client card. */
export function tallyLabel(t: { total: number; delivered: number }): string {
  return t.total ? `${t.delivered} of ${t.total} delivered` : 'No deliveries yet';
}
