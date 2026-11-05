/* ──────────────────────────────────────────────────────────────
   The audit's long sections, read out of the Notion page body.

   SERVER ONLY.

   A growth audit is mostly prose: fourteen sections of tables,
   bullets and paragraphs. Those do not belong in database properties,
   so they live in the page body under fixed H2 headings and this file
   turns that body into the `AuditSection` records the templates
   consume.

   The headings are the contract. `AUDIT_HEADINGS` in data/print.ts is
   the list; a heading that is not on it is ignored, and a heading on
   it that the page does not have comes back in `missing` so the admin
   panel can say so. Nothing here throws over a missing section: an
   audit half written still renders the half that exists, which is the
   whole point of drafting one in Notion.

   Matching is case-insensitive and ignores repeated spaces, trailing
   colons and the smart apostrophe Notion substitutes as you type. The
   spec says "exact heading text", and this is what exact has to mean
   in practice: "What's working" typed in Notion comes back with a
   U+2019 apostrophe, and a strict comparison would silently drop the
   section Mason just wrote.
   ────────────────────────────────────────────────────────────── */

import {
  AUDIT_HEADINGS,
  type AuditHeading,
  type AuditSection,
} from '../data/print';
import { notionHeaders } from './portal-notion';

/** Notion pages block children 100 at a time. */
const PAGE_SIZE = 100;
/** Hard stop. A long audit is ~120 blocks; this is room to spare and
 *  still bounds one request. */
const MAX_PAGES = 8;
/** Tables we will expand. Every section is one table at most, so this
 *  is a generous ceiling on a page that has gone wrong. */
const MAX_TABLES = 20;

export interface AuditBody {
  sections: Partial<Record<AuditHeading, AuditSection>>;
  /** Headings on the list that the page body did not have. */
  missing: AuditHeading[];
  /** Headings the body had that are not on the list. Logged so a typo
   *  in Notion reads as a typo rather than as an empty page. */
  unknown: string[];
}

/* ── heading matching ─────────────────────────────────────────── */

function key(raw: string): string {
  return raw
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[–—]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/:\s*$/, '')
    .trim()
    .toLowerCase();
}

const BY_KEY = new Map<string, AuditHeading>(
  AUDIT_HEADINGS.map((h) => [key(h), h]),
);

/* ── rich text ────────────────────────────────────────────────── */

/** A block's text, flattened. Formatting is dropped: these pages are
 *  typeset by the stylesheet, not by what Notion was doing. */
function plain(richText: unknown): string {
  if (!Array.isArray(richText)) return '';
  return richText
    .map((t: any) => String(t?.plain_text ?? ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function textOf(block: any): string {
  const body = block?.[block?.type];
  return plain(body?.rich_text);
}

/* ── fetching ─────────────────────────────────────────────────── */

async function children(token: string, id: string): Promise<any[]> {
  const out: any[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < MAX_PAGES; page++) {
    const url = new URL(`https://api.notion.com/v1/blocks/${id}/children`);
    url.searchParams.set('page_size', String(PAGE_SIZE));
    if (cursor) url.searchParams.set('start_cursor', cursor);

    const res = await fetch(url.toString(), { headers: notionHeaders(token) });
    if (!res.ok) {
      // Logged, not returned: the body can quote the page's own text.
      console.error('audit: block fetch failed', id, res.status, await res.text());
      throw new Error('notion block fetch failed');
    }

    const data = (await res.json()) as {
      results?: any[];
      has_more?: boolean;
      next_cursor?: string;
    };
    out.push(...(data.results ?? []));
    if (!data.has_more || !data.next_cursor) break;
    cursor = data.next_cursor;
  }

  return out;
}

/**
 * One Notion table, as rows of strings.
 *
 * The header row is dropped when Notion says the table has one,
 * because the templates write their own headers: the column order is
 * fixed by the design, and a header row that drifted in Notion should
 * not change what the PDF is labelled.
 */
async function tableRows(token: string, block: any): Promise<string[][]> {
  const rows = await children(token, block.id);
  const out: string[][] = [];
  for (const r of rows) {
    if (r?.type !== 'table_row') continue;
    const cells = r.table_row?.cells;
    if (!Array.isArray(cells)) continue;
    out.push(cells.map((c: unknown) => plain(c)));
  }
  if (block?.table?.has_column_header && out.length > 0) out.shift();
  return out;
}

/* ── the walk ─────────────────────────────────────────────────── */

const ITEM_TYPES = new Set(['bulleted_list_item', 'numbered_list_item', 'to_do']);
const HEADINGS = new Set(['heading_1', 'heading_2', 'heading_3']);

/**
 * Reads an audit page body into sections.
 *
 * A single pass down the top-level blocks, with the last recognised H2
 * as the open section. Content before the first recognised heading, or
 * after an unrecognised one, is dropped rather than guessed at: these
 * pages have a kickoff note at the top that is for Mason, not for the
 * client.
 *
 * Only tables are expanded, and only one level. Content nested inside
 * a toggle or a column is not read, because nothing in the audit
 * template puts it there and recursing would turn one page into an
 * unbounded number of Notion calls.
 */
export async function fetchAuditBody(token: string, pageId: string): Promise<AuditBody> {
  const blocks = await children(token, pageId);

  const sections: Partial<Record<AuditHeading, AuditSection>> = {};
  const unknown: string[] = [];
  let open: AuditHeading | null = null;
  let tables = 0;

  const into = (h: AuditHeading): AuditSection => {
    const existing = sections[h];
    if (existing) return existing;
    const fresh: AuditSection = { rows: [], items: [], paragraphs: [] };
    sections[h] = fresh;
    return fresh;
  };

  for (const block of blocks) {
    const type = block?.type;
    if (typeof type !== 'string') continue;

    if (HEADINGS.has(type)) {
      const text = textOf(block);
      const match = type === 'heading_2' ? BY_KEY.get(key(text)) : undefined;
      if (match) {
        // Touched on sight, so a heading with nothing under it counts
        // as present-and-empty rather than missing. hasContent() is
        // what decides whether the block draws.
        into(match);
        open = match;
      } else {
        if (type === 'heading_2' && text) unknown.push(text);
        open = null;
      }
      continue;
    }

    if (!open) continue;
    const section = into(open);

    if (type === 'table') {
      if (tables >= MAX_TABLES) continue;
      tables += 1;
      // Sequential on purpose. These run inside one request against a
      // rate-limited API, and a fan-out of twenty table reads is how
      // you earn a 429 halfway through a publish.
      section.rows.push(...(await tableRows(token, block)));
      continue;
    }

    if (ITEM_TYPES.has(type)) {
      const text = textOf(block);
      if (text) section.items.push(text);
      continue;
    }

    if (type === 'paragraph') {
      const text = textOf(block);
      if (text) section.paragraphs.push(text);
      continue;
    }

    // Everything else (images, dividers, callouts, embeds) is ignored.
    // The PDF is typeset; a divider Mason left in Notion is not a
    // design instruction.
  }

  const missing = AUDIT_HEADINGS.filter((h) => !(h in sections));
  if (unknown.length) console.warn('audit: unrecognised headings', pageId, unknown);

  return { sections, missing, unknown };
}
