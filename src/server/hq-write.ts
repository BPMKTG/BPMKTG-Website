/* ──────────────────────────────────────────────────────────────
   What Blueprint HQ may write onto a Clients row.

   The pair to portal-write.ts, and built the same way: a whitelist
   keyed by the field name the browser sends, mapped to the Notion
   property it is allowed to touch. A field that is not in the list is
   not written, and a field whose value does not clean up is reported
   back as rejected rather than silently dropped.

   The list is deliberately short. HQ edits a great deal more of a
   client than this, but it does the rest in Notion; what goes through
   this endpoint is only what the Today and Pipeline tabs have buttons
   for. A new field has to be added here on purpose.
   ────────────────────────────────────────────────────────────── */

import { isIsoDay } from '../data/portal';

/** The Clients row fields HQ may set, and the Notion property each
 *  one writes. Nothing reads a property name off the request. */
export const HQ_CLIENT_EDITABLE = {
  stage: 'Stage',
  nextAction: 'Next Action',
  nextActionDate: 'Next Action Date',
} as const;

export type HqClientField = keyof typeof HQ_CLIENT_EDITABLE;

/**
 * The pipeline columns, in order.
 *
 * Also the only Stage values this endpoint will write. They have to
 * match the Notion select exactly, because a name Notion does not know
 * would be created as a new option by the API rather than refused.
 */
export const HQ_STAGES = [
  'Lead', 'Call Booked', 'Proposal Sent', 'Onboarding', 'Active', 'Paused', 'Ended',
] as const;

export type HqStage = typeof HQ_STAGES[number];

export function isHqStage(v: unknown): v is HqStage {
  return typeof v === 'string' && (HQ_STAGES as readonly string[]).includes(v);
}

/** A next action is a line, not a document. */
export const MAX_NEXT_ACTION = 200;

/** Trimmed, length-capped, and empty becomes null so clearing works. */
export function cleanNextAction(v: unknown): string | null | undefined {
  if (v === null) return null;
  if (typeof v !== 'string') return undefined;
  // Newlines out: this lands in a one-line Notion text column and on
  // one line of a pipeline card.
  const s = v.replace(/\s+/g, ' ').trim().slice(0, MAX_NEXT_ACTION);
  return s || null;
}

export interface HqBuildResult {
  properties: Record<string, unknown>;
  rejected: string[];
}

/**
 * Turn a request body into Notion properties.
 *
 * `undefined` from a cleaner means "this was present but not usable",
 * which is a rejection. A field absent from the body is not touched at
 * all, so a patch that sets only the date leaves the text alone.
 */
export function buildHqClientProperties(body: Record<string, unknown>): HqBuildResult {
  const properties: Record<string, unknown> = {};
  const rejected: string[] = [];

  if ('stage' in body) {
    if (isHqStage(body.stage)) {
      properties[HQ_CLIENT_EDITABLE.stage] = { select: { name: body.stage } };
    } else {
      rejected.push('stage');
    }
  }

  if ('nextAction' in body) {
    const v = cleanNextAction(body.nextAction);
    if (v === undefined) {
      rejected.push('nextAction');
    } else {
      properties[HQ_CLIENT_EDITABLE.nextAction] = {
        rich_text: v ? [{ text: { content: v } }] : [],
      };
    }
  }

  if ('nextActionDate' in body) {
    const v = body.nextActionDate;
    if (v === null) {
      // Clearing the date is how a next action is ticked off: the
      // Clients row has no status column to write Done into.
      properties[HQ_CLIENT_EDITABLE.nextActionDate] = { date: null };
    } else if (isIsoDay(v)) {
      properties[HQ_CLIENT_EDITABLE.nextActionDate] = { date: { start: v } };
    } else {
      rejected.push('nextActionDate');
    }
  }

  return { properties, rejected };
}
