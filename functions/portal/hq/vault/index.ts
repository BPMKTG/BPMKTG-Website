/* ──────────────────────────────────────────────────────────────
   /portal/hq/vault   every client's Content Vault, for us.

     GET    each client with a portal: how many files, how many
            still to sort, how many waiting on a moment, where its
            sync is, and which of its folders are not shared with
            the Vault yet
     POST   { auto: true }   "HQ is open": take the next step of
            whichever sync is due. The page calls it until the answer
            says there is no more to do

   Admin only. One client's files are read from that client's own
   address (/portal/<slug>/vault/data), behind the same gate.

   The GET is asked every few seconds by a page that is watching a
   sync, so it is built not to fail and not to wait:

     the counts and the sync's progress come from the Vault's own
     database, which is the only thing they need;

     who the clients are comes from Notion, which is sometimes slow
     and sometimes says no. So the answer is remembered for a minute,
     Notion is given a few seconds and no more, and when it does not
     answer the last list it gave is used, and failing that the
     clients the Vault itself has synced.

   Whatever does go wrong is written to the log with which part it
   was, so the next time it is not a guess.
   ────────────────────────────────────────────────────────────── */

import { SYNC_FRESH_MS } from '../../../../src/data/vault';
import { serviceAccountEmail } from '../../../../src/server/google-drive';
import { beginHq, hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { portalNotFound } from '../../../../src/server/portal-auth';
import { fetchPortalRecords } from '../../../../src/server/portal-notion';
import { isJsonRequest, isSameOrigin, readJsonBody } from '../../../../src/server/portal-write';
import { allSyncRows, clientKey, tallies, vaultDb, type SyncRow } from '../../../../src/server/vault-db';
import { syncNext, syncStatus, type VaultEnv } from '../../../../src/server/vault-sync';

type Env = HqEnv & VaultEnv;

interface Listed { key: string; slug: string; name: string; hasFolders: boolean }

/** How long Notion's list of clients is used without asking again. */
const LIST_FRESH_SECONDS = 60;
/** How long Notion is waited on before the last list is used instead. */
const NOTION_WAIT_MS = 4000;

const listKey = (kind: 'fresh' | 'last'): string => `https://vault-clients.invalid/${kind}`;

async function remembered(kind: 'fresh' | 'last'): Promise<Listed[] | null> {
  try {
    const hit = await caches.default.match(listKey(kind));
    const list = hit ? await hit.json() as Listed[] : null;
    return Array.isArray(list) ? list : null;
  } catch { return null; }
}

async function remember(list: Listed[]): Promise<void> {
  const put = (kind: 'fresh' | 'last', seconds: number): Promise<void> => caches.default.put(listKey(kind), new Response(JSON.stringify(list), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${seconds}` },
  }));
  try { await Promise.all([put('fresh', LIST_FRESH_SECONDS), put('last', 7 * 24 * 60 * 60)]); } catch { /* no cache is not a reason to fail */ }
}

/**
 * Who the clients are. Never throws and never waits long: see the top
 * of the file. `from` says where the list came from, for the log and
 * for the page.
 */
async function clientList(env: Env, rows: readonly SyncRow[]): Promise<{ list: Listed[]; from: 'notion' | 'remembered' | 'vault' }> {
  const fresh = await remembered('fresh');
  if (fresh) return { list: fresh, from: 'notion' };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const records = await Promise.race([
      fetchPortalRecords(env.NOTION_TOKEN),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`Notion did not answer in ${NOTION_WAIT_MS} ms`)), NOTION_WAIT_MS); }),
    ]);
    const list = records.map((r) => ({
      key: clientKey(r.pageId), slug: r.slug, name: r.client.artist || r.slug,
      // No Drive Folder and no Archive folder: nothing to read yet.
      hasFolders: !!r.client.driveFolder || r.archiveFolders.length > 0,
    }));
    await remember(list);
    return { list, from: 'notion' };
  } catch (err) {
    console.error('hq vault list: the list of clients could not be read from Notion, so an earlier one is used.', String((err as Error)?.message ?? err));
    const last = await remembered('last');
    if (last) return { list: last, from: 'remembered' };
    return {
      list: rows.filter((r) => r.slug).map((r) => ({ key: r.client, slug: r.slug, name: r.name || r.slug, hasFolders: true }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      from: 'vault',
    };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  const email = serviceAccountEmail(env);
  const now = Date.now();
  let rows: SyncRow[];
  let counts: Awaited<ReturnType<typeof tallies>>;
  try {
    const db = await vaultDb(env);
    if (!db) {
      return hqJson({ ok: true, configured: false, email, clients: [], note: 'The Vault database is not bound to this site yet (VAULT_DB).' });
    }
    [rows, counts] = await Promise.all([allSyncRows(db), tallies(db)]);
  } catch (err) {
    // Said as an answer the page can read, not as a broken page: it
    // keeps what it last showed and asks again.
    console.error('hq vault list: the Vault database did not answer.', String((err as Error)?.message ?? err));
    return hqJson({ ok: false, error: 'busy', message: 'The Vault is busy. The numbers on this page are from a moment ago.' }, 503);
  }
  const who = await clientList(env, rows);
  const byClient = new Map(rows.map((r) => [r.client, r]));
  const clients = who.list.map((c) => ({
    slug: c.slug,
    name: c.name,
    hasFolders: c.hasFolders,
    tally: counts.get(c.key) ?? { client: c.key, files: 0, keepers: 0, unsorted: 0, needsShow: 0, missing: 0, linked: 0 },
    sync: syncStatus(byClient.get(c.key) ?? null, { now, admin: true, email }),
  }));
  return hqJson({ ok: true, configured: true, email, clients, at: now, ...(who.from === 'notion' ? {} : { listFrom: who.from }) });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  if (!isSameOrigin(request) || !isJsonRequest(request)) return portalNotFound();
  const body = await readJsonBody(request);
  if (!body || body.auto !== true) return portalNotFound();
  try {
    const out = await syncNext(env, { freshMs: SYNC_FRESH_MS });
    return hqJson({ ...out, ok: true, stepOk: out.ok });
  } catch (err) {
    console.error('hq vault: the next step could not be taken.', String((err as Error)?.message ?? err));
    return hqJson({ ok: true, stepOk: false, synced: null, more: false, note: 'The next step could not be taken. It is tried again shortly.' });
  }
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'POST') return next();
  return portalNotFound();
};
