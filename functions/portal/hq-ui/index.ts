/* ──────────────────────────────────────────────────────────────
   /portal/hq-ui — nothing, to everybody.

   This is where Astro builds the HQ shell, and the only legitimate
   way to it is functions/portal/hq/index.ts, which checks the admin
   cookie and then fetches the page through the ASSETS binding. ASSETS
   goes straight to the asset store without coming back through a
   Function, so gating the public path costs that route nothing and
   stops an unauthenticated fetch of /portal/hq-ui/ from confirming
   that HQ exists at all.

   A 404 rather than a 403, same as everywhere else in /portal.
   ────────────────────────────────────────────────────────────── */

import { portalNotFound } from '../../../src/server/portal-auth';

export const onRequest: PagesFunction = async () => portalNotFound();
