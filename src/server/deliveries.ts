/* ──────────────────────────────────────────────────────────────
   Deliveries, on the server: telling one from a post, shaping it, and
   the Notion properties a new one or a change to one is written as.

   SERVER ONLY. See src/data/deliveries.ts for what a delivery is.
   ────────────────────────────────────────────────────────────── */

import {
  deliveryMedia, isDeliverableKind,
  type Delivery, type DeliveryPatch, type NewDelivery,
} from '../data/deliveries';
import { readDate, readRelation, readSelect, readText, readUrl } from './portal-notion';

/** The Content Pipeline column that makes a row a delivery. */
export const DELIVERABLE_PROP = 'Deliverable';
/** Where the finished set or batch is linked. */
export const DELIVERY_LINK_PROP = 'Edit Link';

/** Is this Content Pipeline page a delivery, not a post? */
export function isDeliveryPage(page: any): boolean {
  return isDeliverableKind(readSelect((page?.properties ?? {})[DELIVERABLE_PROP]));
}

export function shapeDelivery(page: any): Delivery {
  const p = page?.properties ?? {};
  const kind = readSelect(p[DELIVERABLE_PROP]);
  return {
    id: String(page.id),
    title: readText(p['Content']) ?? '',
    kind: isDeliverableKind(kind) ? kind : 'Photo set',
    status: readSelect(p['Status']),
    due: readDate(p['Post Date']),
    link: readUrl(p[DELIVERY_LINK_PROP]),
    momentId: readRelation(p['Campaign'])[0] ?? null,
  };
}

/** One query's worth of Content Pipeline pages, as posts and
 *  deliveries. Every page is one or the other, never both. */
export function splitPages(pages: readonly any[]): { posts: any[]; deliveries: any[] } {
  const posts: any[] = [], deliveries: any[] = [];
  for (const page of pages) (isDeliveryPage(page) ? deliveries : posts).push(page);
  return { posts, deliveries };
}

const select = (name: string | null) => ({ select: name ? { name } : null });

/** A new delivery. Ours, never hidden, and it starts at To shoot. */
export function newDeliveryProperties(d: NewDelivery, clientPageId: string): Record<string, unknown> {
  return {
    Content: { title: [{ text: { content: d.title } }] },
    Client: { relation: [{ id: clientPageId }] },
    ...(d.momentId ? { Campaign: { relation: [{ id: d.momentId }] } } : {}),
    [DELIVERABLE_PROP]: select(d.kind),
    Media: select(deliveryMedia(d.kind)),
    'Posted By': select('Blueprint'),
    Status: select('Planned'),
    ...(d.due ? { 'Post Date': { date: { start: d.due } } } : {}),
    'Hide from Client': { checkbox: false },
    'Last Edited By': select('Blueprint'),
  };
}

/** A change to one, as Notion properties. */
export function deliveryPatchProperties(patch: DeliveryPatch): Record<string, unknown> {
  const props: Record<string, unknown> = {};
  if (patch.status !== undefined) props.Status = select(patch.status);
  if (patch.link !== undefined) props[DELIVERY_LINK_PROP] = { url: patch.link };
  if (patch.title !== undefined) props.Content = { title: [{ text: { content: patch.title } }] };
  if (patch.due !== undefined) props['Post Date'] = { date: patch.due ? { start: patch.due } : null };
  if (Object.keys(props).length) props['Last Edited By'] = select('Blueprint');
  return props;
}
