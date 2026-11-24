/* ──────────────────────────────────────────────────────────────
   The Content Vault's daily sync.

   A Cloudflare Pages site cannot run on a schedule, so this small
   Worker does the one thing the site cannot: once a day it asks the
   site to bring every client's Vault up to date.

   It holds no keys to Notion or to Drive and never talks to either.
   It knows two things, both set by hand in the dashboard:

     SITE_URL            where the site is, e.g. https://example.com
     VAULT_CRON_SECRET   the same secret the site was given

   Each call syncs one client. The site answers with whether there is
   more to do, and this keeps calling until there is not.

   It is created and pasted in the dashboard, not deployed from this
   repository. See docs/PORTAL_SETUP.md, "The Content Vault".
   ────────────────────────────────────────────────────────────── */

/** A day's run is a handful of calls. This is only a stop. */
const MAX_CALLS = 60;

async function run(env) {
  const site = String(env.SITE_URL || '').replace(/\/+$/, '');
  const secret = String(env.VAULT_CRON_SECRET || '');
  if (!/^https:\/\//.test(site) || secret.length < 24) {
    console.error('vault-sync: SITE_URL or VAULT_CRON_SECRET is not set');
    return { ok: false, calls: 0, synced: [] };
  }
  const synced = [];
  for (let call = 1; call <= MAX_CALLS; call += 1) {
    const res = await fetch(`${site}/portal/hq/vault/cron`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) {
      // A 404 here is the site not recognising the secret, or not
      // having one set.
      console.error(`vault-sync: the site answered ${res.status} on call ${call}`);
      return { ok: false, calls: call, synced };
    }
    const out = await res.json().catch(() => null);
    if (out && out.synced) synced.push(`${out.synced}${out.synced_ok ? '' : ' (failed)'}`);
    if (!out || !out.more) {
      console.log(`vault-sync: done in ${call} call(s): ${synced.join(', ') || 'nothing was due'}`);
      return { ok: true, calls: call, synced };
    }
  }
  console.error('vault-sync: still more to do after the last call');
  return { ok: false, calls: MAX_CALLS, synced };
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(run(env));
  },
  // Nothing to see at its address. The schedule is the only way in.
  async fetch() {
    return new Response('Not found', { status: 404 });
  },
};
