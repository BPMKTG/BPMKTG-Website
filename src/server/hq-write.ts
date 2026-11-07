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
// The vocabulary these builders write lives with the other HQ rules,
// because the Pipeline board in the browser needs the same lists and
// must not import anything out of src/server.
import {
  cleanNextAction, isHqStage, isLeadSource, MAX_ARTIST, NEW_LEAD_STAGE,
} from '../data/hq';

/** The Clients row fields HQ may set, and the Notion property each
 *  one writes. Nothing reads a property name off the request. */
export const HQ_CLIENT_EDITABLE = {
  stage: 'Stage',
  nextAction: 'Next Action',
  nextActionDate: 'Next Action Date',
} as const;

export type HqClientField = keyof typeof HQ_CLIENT_EDITABLE;

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

/* ── a new lead ───────────────────────────────────────────────── */

export interface NewLeadResult {
  properties: Record<string, unknown> | null;
  /** Why it was refused, for the one page that calls this. */
  error: string | null;
}

/**
 * Turn a quick-add body into a Clients row.
 *
 * Artist is the only required field: a lead you cannot name is not a
 * lead. The rest are optional, because the point of quick add is to
 * get the name down before you lose it.
 *
 * Deliberately NOT set here: Portal Key, Portal Emails, Portal
 * Enabled, Monthly Rate, anything to do with the term. A lead has
 * none of those yet, and a create path that could write them is a
 * create path that could hand out portal access.
 */
export function buildNewLead(body: Record<string, unknown>): NewLeadResult {
  const artist = typeof body.artist === 'string'
    ? body.artist.replace(/\s+/g, ' ').trim().slice(0, MAX_ARTIST)
    : '';
  if (!artist) return { properties: null, error: 'artist_required' };

  const properties: Record<string, unknown> = {
    Artist: { title: [{ text: { content: artist } }] },
    Stage: { select: { name: NEW_LEAD_STAGE } },
  };

  if ('leadSource' in body && body.leadSource !== null && body.leadSource !== '') {
    if (!isLeadSource(body.leadSource)) return { properties: null, error: 'bad_lead_source' };
    properties['Lead Source'] = { select: { name: body.leadSource } };
  }

  if ('nextAction' in body) {
    const v = cleanNextAction(body.nextAction);
    if (v === undefined) return { properties: null, error: 'bad_next_action' };
    properties['Next Action'] = { rich_text: v ? [{ text: { content: v } }] : [] };
  }

  if ('nextActionDate' in body && body.nextActionDate !== null && body.nextActionDate !== '') {
    if (!isIsoDay(body.nextActionDate)) return { properties: null, error: 'bad_date' };
    properties['Next Action Date'] = { date: { start: body.nextActionDate } };
  }

  return { properties, error: null };
}
