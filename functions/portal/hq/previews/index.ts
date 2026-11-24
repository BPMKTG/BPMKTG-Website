/* ──────────────────────────────────────────────────────────────
   POST /portal/hq/previews — every preview, and the work they need.

     {}                      list every content item with a Drive
                             link and where its preview is, and move
                             on the ones that are not done
     { id }                  move one item on, and answer for it
     { id, retry: true }     build that one again from the start

   Admin only. This is what HQ calls when it opens, and again every
   few seconds while anything is still converting, so it is also the
   backfill: the first time HQ is opened after this ships, every item
   that already has a Drive link gets its preview made.

   One call does a bounded amount: at most one upload to the
   converter (the expensive step), and a few checks on conversions
   already running. The page asks again until nothing is waiting.
   ────────────────────────────────────────────────────────────── */

import { driveFileId, itemPreview, planPreview, type ItemPreview } from '../../../../src/data/preview';
import { hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { dropHq, type HqDataEnv } from '../../../../src/server/hq-data';
import { dropPortalData, portalNotFound } from '../../../../src/server/portal-auth';
import {
  CONTENT_DB, fetchPage, isNotionId, patchPage, queryAll, readRelation, readSelect, readText, readUrl,
} from '../../../../src/server/portal-notion';
import { clientFacts } from '../../../../src/server/pieces';
import { beginPlaybookWrite } from '../../../../src/server/playbooks';
import {
  advancePreview, readStoredPreview, storedPreviewProperties, type PreviewEnv, type PreviewOutcome,
} from '../../../../src/server/preview';
import { notifyAdmins, type PushEnv } from '../../../../src/server/push';

type Env = HqEnv & HqDataEnv & PreviewEnv & PushEnv;

/** How many conversions already running are asked after in one call. */
const CHECKS_PER_CALL = 4;

interface Row {
  id: string;
  title: string;
  status: string | null;
  clientId: string | null;
  client: string | null;
  slug: string | null;
  link: string;
  preview: ItemPreview;
  /** What the last step said, when it said something worth reading. */
  note?: string;
}

const hex = (id: string): string => id.replace(/-/g, '').toLowerCase();

export const onRequestPost: PagesFunction<Env> = async ({ request, env, waitUntil }) => {
  const gate = await beginPlaybookWrite(request, env);
  if (!gate.ok) return gate.response;
  const { body } = gate;
  const only = typeof body.id === 'string' && isNotionId(body.id) ? body.id : null;
  if ('id' in body && !only) return hqJson({ ok: false, error: 'invalid', rejected: ['id'] }, 400);

  let pages: any[];
  if (only) {
    const page = await fetchPage(env.NOTION_TOKEN, only);
    const parent = hex(String(page?.parent?.database_id ?? ''));
    if (!page || page.object !== 'page' || page.archived || parent !== hex(CONTENT_DB)) return portalNotFound();
    pages = [page];
  } else {
    pages = await queryAll(env.NOTION_TOKEN, CONTENT_DB, {
      filter: { property: 'Edit Link', url: { is_not_empty: true } },
    });
  }

  // Whose each one is. A handful of clients, asked once each.
  const facts = new Map<string, { slug: string | null; artist: string } | null>();
  for (const page of pages) {
    const cid = readRelation(page.properties?.['Client'])[0] ?? '';
    if (cid && !facts.has(cid)) {
      const f = isNotionId(cid) ? await clientFacts(env.NOTION_TOKEN, cid) : null;
      facts.set(cid, f ? { slug: f.slug, artist: f.artist } : null);
    }
  }

  const now = Date.now();
  let builds = 0, checks = 0, waiting = 0;
  const touched = new Set<string>();
  const missing = new Set<string>();
  const rows: Row[] = [];

  for (const page of pages) {
    const p = page.properties ?? {};
    const link = readUrl(p['Edit Link']);
    if (!link || !driveFileId(link)) continue;
    const cid = readRelation(p['Client'])[0] ?? null;
    const who = cid ? facts.get(cid) ?? null : null;
    const id = hex(String(page.id));
    let stored = readStoredPreview(p);
    let note: string | undefined;
    let outcome: PreviewOutcome | null = null;

    if (who?.slug) {
      const step = planPreview(link, stored, now, { force: !!only && body.retry === true });
      const heavy = step.do === 'build';
      const light = step.do === 'check' || step.do === 'fail';
      if ((heavy && builds < 1) || (light && checks < CHECKS_PER_CALL)) {
        if (heavy) builds += 1; else checks += 1;
        const out = await advancePreview(env, {
          owner: who.slug, itemId: id, title: (readText(p['Content']) ?? '').trim(), link, stored,
        }, (next) => patchPage(env.NOTION_TOKEN, page.id, storedPreviewProperties(next), 'preview'), {
          force: !!only && body.retry === true, now,
        });
        if (out.stored !== stored) touched.add(who.slug);
        // Newly a failure: it has just landed in "Previews to fix".
        if (out.outcome === 'failed' && stored.status !== 'Failed') {
          waitUntil(notifyAdmins(env, 'preview', {
            client: who.artist, slug: who.slug, item: (readText(p['Content']) ?? '').trim(), id,
          }));
        }
        if (out.outcome === 'not_configured' && out.note) missing.add(out.note);
        stored = out.stored;
        outcome = out.outcome;
        note = out.note;
      }
    } else {
      note = 'This item has no client with a portal, so there is nowhere to file its preview.';
    }

    const preview = itemPreview(link, stored, id, { admin: true }) ?? { state: 'pending' as const };
    // Still worth asking again: converting, or waiting its turn for
    // the one upload a call makes. Not when our own setup is missing.
    if (preview.state === 'pending' && who?.slug && outcome !== 'not_configured' && outcome !== 'try_later') waiting += 1;
    rows.push({
      id, title: (readText(p['Content']) ?? '').trim(), status: readSelect(p['Status']),
      clientId: cid, client: who?.artist ?? null, slug: who?.slug ?? null, link, preview,
      ...(note && preview.state !== 'ready' ? { note } : {}),
    });
  }

  if (touched.size) await Promise.all([dropHq(env), ...[...touched].map((slug) => dropPortalData(slug))]);

  return hqJson({
    ok: true,
    items: rows,
    // With a secret missing there is nothing to wait for: asking again
    // in six seconds would get the same answer.
    waiting: missing.size ? 0 : waiting,
    failed: rows.filter((r) => r.preview.state === 'failed').length,
    // Named, so a missing secret reads as a missing secret and not as
    // thirty broken files.
    ...(missing.size ? { setup: [...missing] } : {}),
  });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'POST') return next();
  return portalNotFound();
};
