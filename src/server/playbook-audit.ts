/* ──────────────────────────────────────────────────────────────
   The Playbook Audit: the PDF that says why the playbooks are built
   the way they are.

   SERVER ONLY.

   Two kinds, both in R2, neither with a public address:

     shared/playbook-audit.pdf
         The general one. Every client reads the same file.
     playbook-audits/<clientSlug>/playbook-audit.pdf
         One client's own, when we have written one for them.

   Fixed keys, the same way the brand brief has one: uploading again
   replaces the file, and "is there one" is a single HEAD.

   Which a client gets is one rule. Their own, if the Clients row's
   `Playbook Audit` property points at one; otherwise the general one;
   otherwise nothing, and the card is not drawn. The property is a URL,
   so it can also hold a link to a document somewhere else, and then
   the client is sent there instead.

   Nothing here serves bytes to a client. A PDF is read back through
   /portal/<slug>/files/<key> with every other file, behind the same
   session check. `shared/` is the one prefix every signed-in client
   may read, which is why only things meant for all of them go in it.
   ────────────────────────────────────────────────────────────── */

import { clientType } from '../data/client-types';
import { MAX_BRIEF_BYTES, briefHost, isSafeBriefUrl, looksLikePdf } from './brief';
import { CLIENTS_DB, queryAll, readCheckbox, readSelect, readText } from './portal-notion';
import { fileSlug } from './pdf';

export const AUDIT_FILE = 'playbook-audit.pdf';

/** Files every signed-in client may read, whoever they are. */
export const SHARED_PREFIX = 'shared/';

export const GENERAL_AUDIT_KEY = `${SHARED_PREFIX}${AUDIT_FILE}`;

/** `playbook-audits/sean-comma/playbook-audit.pdf` */
export function clientAuditKey(slug: string): string {
  return `playbook-audits/${fileSlug(slug)}/${AUDIT_FILE}`;
}

/** The prefix of the keys that are one client's own audit. */
export function clientAuditPrefix(slug: string): string {
  return `playbook-audits/${fileSlug(slug)}/`;
}

/** Where a client fetches their own. Root-relative, like the brief. */
export function clientAuditUrl(slug: string): string {
  return `/portal/${slug}/files/${clientAuditKey(slug)}`;
}

/** Where a client fetches the general one: through their own files
 *  route, so it is their session that opens it. */
export function generalAuditUrl(slug: string): string {
  return `/portal/${slug}/files/${GENERAL_AUDIT_KEY}`;
}

/** Where HQ fetches the general one. There is no client in HQ to
 *  borrow a files route from. */
export const HQ_GENERAL_AUDIT_URL = '/portal/hq/playbook-audit';

/** The site, for the address written into Notion. A whole address
 *  there is one a person can click; the path is what is compared. */
export const SITE_ORIGIN = 'https://blueprint-marketing.com';

export interface PlaybookAuditInfo {
  url: string;
  /** A PDF of ours, or a link to a document somewhere else. */
  kind: 'pdf' | 'link';
  /** Written for this client, rather than the one everybody reads. */
  own: boolean;
  size: number | null;
  uploaded: string | null;
  /** For a link: where it goes. */
  host: string | null;
}

/** As much of an R2 bucket as this needs. */
export interface AuditBucket {
  head(key: string): Promise<{ size: number; uploaded?: Date } | null>;
  get(key: string): Promise<{ body: ReadableStream | null } | null>;
  put(key: string, body: Uint8Array, opts?: unknown): Promise<unknown>;
  delete(key: string): Promise<unknown>;
}

export interface AuditEnv {
  REPORTS_BUCKET?: AuditBucket;
}

/** The `Playbook Audit` property as it was typed, or null. Read raw
 *  rather than through readUrl, which keeps only http(s): our own
 *  pointer may be written as a path. */
export function readAuditPointer(prop: unknown): string | null {
  const url = (prop as { type?: string; url?: unknown } | null | undefined)?.url;
  return typeof url === 'string' && url.trim() ? url.trim() : null;
}

/** Is this the address of this client's own file? Compared by path,
 *  so the whole address and the bare path are the same answer. */
export function isOurAuditUrl(url: string, slug: string): boolean {
  try {
    return new URL(url, SITE_ORIGIN).pathname === clientAuditUrl(slug);
  } catch {
    return false;
  }
}

async function headOf(env: AuditEnv, key: string): Promise<{ size: number; uploaded: string | null } | null> {
  if (!env.REPORTS_BUCKET) return null;
  try {
    const head = await env.REPORTS_BUCKET.head(key);
    return head ? { size: head.size, uploaded: head.uploaded ? head.uploaded.toISOString() : null } : null;
  } catch (err) {
    console.error('portal: reading a playbook audit threw', key, err);
    return null;
  }
}

/** The general audit, as HQ sees it, or null when none is stored. */
export async function readGeneralAudit(env: AuditEnv, url: string = HQ_GENERAL_AUDIT_URL): Promise<PlaybookAuditInfo | null> {
  const head = await headOf(env, GENERAL_AUDIT_KEY);
  return head ? { url, kind: 'pdf', own: false, size: head.size, uploaded: head.uploaded, host: null } : null;
}

/** A client's OWN audit and nothing else: null when they have none,
 *  even if a general one exists. For the list in HQ. */
export async function readOwnAudit(
  env: AuditEnv, slug: string, pointer: string | null | undefined,
): Promise<PlaybookAuditInfo | null> {
  const url = (pointer ?? '').trim();
  if (!url) return null;
  if (!isOurAuditUrl(url, slug)) {
    // Somebody else's document. It becomes an href in a browser, so
    // anything that is not a web link is dropped.
    if (!isSafeBriefUrl(url)) {
      console.error('portal: the playbook audit link is not http(s)', slug);
      return null;
    }
    return { url, kind: 'link', own: true, size: null, uploaded: null, host: briefHost(url) };
  }
  const head = await headOf(env, clientAuditKey(slug));
  // The row says there is one and the bucket says there is not: the
  // file was never uploaded here. Treated as none, not as an error.
  return head
    ? { url: clientAuditUrl(slug), kind: 'pdf', own: true, size: head.size, uploaded: head.uploaded, host: null }
    : null;
}

/**
 * The audit this client is shown: their own if they have one, the
 * general one if not, null if there is neither.
 */
export async function readClientAudit(
  env: AuditEnv, slug: string, pointer: string | null | undefined,
): Promise<PlaybookAuditInfo | null> {
  return await readOwnAudit(env, slug, pointer) ?? await readGeneralAudit(env, generalAuditUrl(slug));
}

const PDF_META = {
  httpMetadata: {
    contentType: 'application/pdf',
    // Served through our own endpoints behind a session check, so it
    // must never sit in a shared cache.
    cacheControl: 'private, max-age=0, must-revalidate',
  },
};

export async function putGeneralAudit(env: AuditEnv, body: Uint8Array): Promise<PlaybookAuditInfo> {
  if (!env.REPORTS_BUCKET) throw new Error('REPORTS_BUCKET is not bound');
  await env.REPORTS_BUCKET.put(GENERAL_AUDIT_KEY, body, PDF_META);
  return { url: HQ_GENERAL_AUDIT_URL, kind: 'pdf', own: false, size: body.byteLength, uploaded: new Date().toISOString(), host: null };
}

export async function putClientAudit(env: AuditEnv, slug: string, body: Uint8Array): Promise<PlaybookAuditInfo> {
  if (!env.REPORTS_BUCKET) throw new Error('REPORTS_BUCKET is not bound');
  await env.REPORTS_BUCKET.put(clientAuditKey(slug), body, PDF_META);
  return { url: clientAuditUrl(slug), kind: 'pdf', own: true, size: body.byteLength, uploaded: new Date().toISOString(), host: null };
}

export async function deleteClientAudit(env: AuditEnv, slug: string): Promise<void> {
  if (!env.REPORTS_BUCKET) return;
  await env.REPORTS_BUCKET.delete(clientAuditKey(slug));
}

/* ── an upload, checked ───────────────────────────────────────── */


/** The same cap a brand brief has: big enough for a report with
 *  charts in it, small enough to hold in a Worker while it is checked. */
export const MAX_AUDIT_BYTES = MAX_BRIEF_BYTES;

export type PdfUpload =
  | { ok: true; bytes: Uint8Array }
  | { ok: false; status: number; error: string; detail: string };

/**
 * The body of an upload, as bytes we are willing to store as a PDF.
 *
 * The declared length is checked before the bytes are read and the
 * real length after, and the first five bytes have to be `%PDF-`: the
 * result is served as application/pdf, so the file gets the last word
 * about what it is, not its name or its Content-Type.
 */
export async function readPdfUpload(request: Request): Promise<PdfUpload> {
  const mb = (n: number) => `${(n / 1024 / 1024).toFixed(1)}MB`;
  const tooBig = (n: number) => ({ ok: false as const, status: 413, error: 'too_big',
    detail: `That file is ${mb(n)} and the limit is ${mb(MAX_AUDIT_BYTES)}. Export it again at a smaller size.` });
  const declared = Number(request.headers.get('Content-Length') ?? '0');
  if (Number.isFinite(declared) && declared > MAX_AUDIT_BYTES) return tooBig(declared);
  let bytes: Uint8Array;
  try {
    bytes = new Uint8Array(await request.arrayBuffer());
  } catch (err) {
    return { ok: false, status: 400, error: 'unreadable', detail: err instanceof Error ? err.message : String(err) };
  }
  if (bytes.byteLength > MAX_AUDIT_BYTES) return tooBig(bytes.byteLength);
  if (!bytes.byteLength) return { ok: false, status: 400, error: 'empty', detail: 'That file was empty.' };
  if (!looksLikePdf(bytes)) return { ok: false, status: 400, error: 'not_pdf', detail: 'That is not a PDF. The audit has to be one.' };
  return { ok: true, bytes };
}

/* ── who has one of their own ─────────────────────────────────── */

export interface AuditRosterRow {
  pageId: string;
  slug: string;
  artist: string;
  /** Their own audit, or null when they read the general one. */
  audit: PlaybookAuditInfo | null;
  /** The client type's id. Absent on an artist. */
  type?: string;
}

/**
 * Every client with a portal, and whether they have an audit of their
 * own. One Clients query and a HEAD for each client whose row points
 * at a file of ours; a client with no pointer costs nothing.
 */
export async function readAuditRoster(token: string, env: AuditEnv): Promise<AuditRosterRow[]> {
  const rows = await queryAll(token, CLIENTS_DB, {});
  const out: AuditRosterRow[] = [];
  for (const page of rows) {
    const p = page.properties ?? {};
    const slug = (readText(p['Intake Slug']) ?? '').trim().toLowerCase();
    if (!slug || !readCheckbox(p['Portal Enabled'])) continue;
    const title = Object.values(p).find((v: any) => v?.type === 'title');
    out.push({
      pageId: String(page.id), slug, artist: (readText(title as any) ?? '').trim() || slug,
      audit: await readOwnAudit(env, slug, readAuditPointer(p['Playbook Audit'])),
      ...(clientType(readSelect(p['Client Type'])).id === 'artist'
        ? {} : { type: clientType(readSelect(p['Client Type'])).id }),
    });
  }
  return out.sort((a, b) => a.artist.localeCompare(b.artist));
}
