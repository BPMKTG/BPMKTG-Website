# Client portal

A private, read-only page per client at `/portal/<slug>`, pulling that
client's own data out of Notion. V1: no login screen, no password. The
link itself is the credential.

---

## Turning a portal on for a client

Four things in the **Clients** database, then send the link.

### 1. Intake Slug

The same slug the intake form uses, so a client has one identity across
both. Lowercase letters, numbers and hyphens only: `sean-comma`.

If it is already filled in for the intake form, leave it alone.

### 2. Portal Key

The secret half of the link. Generate a fresh one per client, never
reuse one, and never use anything guessable.

```bash
openssl rand -hex 24
```

Paste the output into **Portal Key**. Roughly 48 characters of hex is
the right order of magnitude; the code does not enforce a length, so
this is on you.

**A blank Portal Key opens nothing.** That is deliberate: a blank stored
key would otherwise match a blank `?key=` and let anyone who guessed the
slug straight in.

### 3. Portal Enabled

Tick it. Unticking it shuts the portal immediately, including for anyone
holding a valid session cookie, because every data request re-checks it.

### 4. Share the three databases with the integration

The Notion integration behind `NOTION_TOKEN` needs access to all three:

| Database | ID |
|---|---|
| Clients | `b495a24f96c341088d78106fd6228e14` |
| Campaign Calendar | `cb355a1bfc2b455086f2f572b4a5040f` |
| KPI Snapshots | `d34fe42f89da4260b2b114f932b71124` |

In Notion: open each database → `•••` → **Connections** → add the
integration. A database that was never shared returns 404 from the API,
which the portal reports to the client as "this link isn't working",
with the real reason only in the Function logs.

### 5. Send the link

```
https://blueprint-marketing.com/portal/<slug>?key=<portal key>
```

Send it somewhere the whole thing survives as one piece. The key is long
and a client who copies half a link gets a dead portal. Tell them to
bookmark it after the first open, at which point the key is no longer
in the URL anyway.

---

## What a client sees, and what they never see

The portal sends **only** the fields named in `src/data/portal.ts`. It is
a whitelist, not a blocklist: a property added in Notion is invisible in
the portal until someone adds it to that file on purpose.

| Database | Sent | Never sent |
|---|---|---|
| Clients | Artist, Tier, Stage, Term Start, Term End, Client Announcement, Drive Folder, Content Vault, Roadmap Link, Access Complete | Portal Key, Monthly Rate, Full Rate, Notes, Next Action, Email, Phone, Lead Source, Access Granted, Intake Slug, everything else |
| Campaign Calendar | Item, Kind, Moment Type, Date (or Auto Date), Status, Type, Owner, Playbook, Phase, Where, Why It Matters, Venue / City, Ticket or RSVP Link | Notes, Offset (days) |
| KPI Snapshots | Date, Type, Data Source, Growth Score (/40), every numeric metric | Notes |

`npm run test:portal` asserts this against fixtures that deliberately
contain a rate, a portal key and internal notes.

### Which calendar rows reach the portal

A row shows when **all** of these hold:

- it is linked to this client, and
- `Is Playbook` is unticked, and
- `Hide from Client` is unticked, and
- it is a **Moment**, OR its Type is **Content**, OR its Owner is **Client**.

So: our admin steps stay hidden, unless the client is the one who has to
do them, in which case they are a to-do rather than back-office noise.

**`Hide from Client` is the override.** Tick it on any single row to pull
it out of the portal whatever else it is.

### Two display fixes applied on the way out

- A leading `<Artist> · ` is stripped from titles. "Sean Comma · Announce
  the single" reads as "Announce the single" inside Sean's own portal.
- `(TENTATIVE)` anywhere in a title is removed and shown as a **Tentative**
  tag instead.

Both mean you can keep writing titles for our board, not for the client.

---

## How the access actually works

Two steps, kept separate on purpose.

1. **`POST /portal/<slug>/auth`** takes the key, compares it against the
   stored one in constant time, and requires `Portal Enabled`.
2. On success it sets `bp_portal`, an HMAC-signed token in an
   **HttpOnly, Secure, SameSite=Lax** cookie **scoped to `/portal/<slug>`**,
   for 30 days. The page then strips `?key=` from the URL with
   `history.replaceState`.
3. **`GET /portal/<slug>/data`** checks the cookie and nothing else.

The data endpoint lives under the client's own path precisely so that
path-scoped cookie reaches it. A shared `/api/portal` could not read it.

### Every failure is the same failure

Unknown slug, wrong key, disabled portal, a key for a different client,
an expired session, rate limited, Notion down: all of them return

```
404  {"ok":false,"error":"not_found"}
```

and `/portal/<anything>` serves byte-identical HTML. Nothing about the
URL or the responses answers "is this artist a Blueprint client?".

### Replacing the key with Cloudflare Access later

Only step 1 knows what a portal key is. To move to email login:

1. Put Cloudflare Access in front of `/portal/*`.
2. In `functions/portal/[slug]/auth.ts`, verify the Access JWT instead of
   calling `checkPortalKey`, and check the email against the client's
   **Email** in Notion.
3. Mint the same session with the same `mintSession`.

`data.ts`, the cookie, the whitelists and the page do not change.

---

## Secrets

| Name | Required | What it does |
|---|---|---|
| `NOTION_TOKEN` | yes | The integration token. Same one the intake form uses. |
| `PORTAL_SECRET` | no | Signs session cookies. Any random 16+ character string. |

With `PORTAL_SECRET` unset, sessions are signed with `NOTION_TOKEN`,
which is already a high-entropy secret present anywhere the portal can
run at all. The only difference is that rotating the Notion token signs
every client out. Set it if you would rather those be independent.

Both go in **Cloudflare Pages → Settings → Environment variables**, as
encrypted variables. **Set them for Preview as well as Production** if you
want portals to work on preview deploys; Pages does not share variables
between the two environments.

Locally they come from `.dev.vars` (gitignored). See `.dev.vars.example`.

---

## Rate limiting

Failed key checks are counted per IP in the Cloudflare Cache API: eight
failures in ten minutes and everything from that IP 404s.

**Be honest about what this is.** The cache is per datacenter and the
read-modify-write races, so an attacker spread across colos gets more
than eight tries. It costs nothing and it stops the obvious case, which
is a script pointed at one slug.

The real answer, if a portal is ever a target, is a Cloudflare **Rate
Limiting** rule on `/portal/*/auth` in the dashboard. That runs at the
edge, before any Function, and is not fooled by colo spread.

---

## Caching

A client's assembled payload is cached for 60 seconds, keyed by slug,
in the Cloudflare Cache API. Notion's API allows roughly three requests
per second and one portal load costs three queries, so without this a
handful of clients refreshing at once would start getting rate limited
by Notion.

**Auth runs before the cache is read**, so a cached payload can never be
served to someone without a valid session. The response to the browser
is always `no-store`; only the shared cache keeps a copy.

Practical effect: a change in Notion takes up to a minute to show up.
`X-Portal-Cache: hit|miss` on the data response says which you got.

---

## Local development

```bash
npm run build
npx wrangler pages dev dist --port 8788 --compatibility-date=2026-01-01
```

Astro's own dev server will **not** work for the portal: `astro dev` does
not run Pages Functions, so `/portal/<slug>` 404s and there is no
`/auth` or `/data`. Build first, then serve `dist` through wrangler.

With a fake `NOTION_TOKEN` you can still verify all the routing and every
failure path. The success path needs a real token.

---

## Tests

```bash
npm run test:portal     # or: npm test, which runs intake too
```

Covers the calendar visibility rule, the whitelists (against fixtures
stuffed with rates, keys and internal notes), title cleanup, engagement
formatting, term progress, slug validation, session signing, and that
wrong key / disabled portal / another client's key all fail identically.

---

## Known limits of V1

- **The link is the credential.** Anyone a client forwards it to is in.
- **Rotating the Portal Key does not sign anyone out.** It stops the old
  link working, but a browser that already exchanged the old key holds a
  signed session for up to 30 days, and that session does not reference
  the key. To actually cut existing sessions off there are two levers:
  untick **Portal Enabled** (effective within 60 seconds, the cache
  window, and it locks the client out too), or rotate `PORTAL_SECRET`
  (or `NOTION_TOKEN` when no `PORTAL_SECRET` is set), which invalidates
  every session for every client at once. Pick deliberately.
- **Read only.** Nothing in the portal writes back to Notion.
- **Up to a minute stale**, by design. See Caching.
- **No email to the client when something changes.** They have to open it.
