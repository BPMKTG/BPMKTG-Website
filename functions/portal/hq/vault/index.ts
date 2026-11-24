/* ──────────────────────────────────────────────────────────────
   /portal/hq/vault   every client's Content Vault, for us.

     GET    each client with a portal: how many files, how many
            still to sort, how many waiting on a show, where its
            sync is, and which of its folders are not shared with
            the Vault yet
     POST   { auto: true }   "HQ was opened": sync the client who has
            waited longest, if any is due. The page calls it until
            the answer says there is no more to do

   Admin only. One client's files are read from that client's own
   address (/portal/<slug>/vault/data), behind the same gate.
   ────────────────────────────────────────────────────────────── */

import { SYNC_FRESH_MS } from '../../../../src/data/vault';
import { serviceAccountEmail } from '../../../../src/server/google-drive';
import { beginHq, hqJson, type HqEnv } from '../../../../src/server/hq-auth';
import { portalNotFound } from '../../../../src/server/portal-auth';
import { fetchPortalRecords } from '../../../../src/server/portal-notion';
import { isJsonRequest, isSameOrigin, readJsonBody } from '../../../../src/server/portal-write';
import { allSyncRows, clientKey, tallies, vaultDb } from '../../../../src/server/vault-db';
import { syncNext, syncStatus, type VaultEnv } from '../../../../src/server/vault-sync';

type Env = HqEnv & VaultEnv;

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  const email = serviceAccountEmail(env);
  const db = await vaultDb(env);
  if (!db) {
    return hqJson({ ok: true, configured: false, email, clients: [], note: 'The Vault database is not bound to this site yet (VAULT_DB).' });
  }
  const now = Date.now();
  const [records, rows, counts] = await Promise.all([fetchPortalRecords(env.NOTION_TOKEN), allSyncRows(db), tallies(db)]);
  const byClient = new Map(rows.map((r) => [r.client, r]));
  const clients = records.map((r) => {
    const key = clientKey(r.pageId);
    return {
      slug: r.slug,
      name: r.client.artist || r.slug,
      // No Drive Folder and no Archive folder: nothing to read yet.
      hasFolders: !!r.client.driveFolder || r.archiveFolders.length > 0,
      tally: counts.get(key) ?? { client: key, files: 0, keepers: 0, unsorted: 0, needsShow: 0, missing: 0 },
      sync: syncStatus(byClient.get(key) ?? null, { now, admin: true, email }),
    };
  });
  return hqJson({ ok: true, configured: true, email, clients });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const gate = await beginHq(request, env);
  if (!gate.ok) return gate.response;
  if (!isSameOrigin(request) || !isJsonRequest(request)) return portalNotFound();
  const body = await readJsonBody(request);
  if (!body || body.auto !== true) return portalNotFound();
  const out = await syncNext(env, { freshMs: SYNC_FRESH_MS });
  return hqJson({ ok: true, ...out });
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  if (request.method === 'GET' || request.method === 'POST') return next();
  return portalNotFound();
};
