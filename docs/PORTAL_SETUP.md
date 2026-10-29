# Client portal

A private page per client at `/portal/<slug>`, pulling that client's own
data out of Notion. Sign-in is a six-digit code sent to an email address
written down in Notion. There is no password.

---

## Turning a portal on for a client

Four things in the **Clients** database, then send the link.

### 1. Intake Slug

The same slug the intake form uses, so a client has one identity across
both. Lowercase letters, numbers and hyphens only: `sean-comma`.

If it is already filled in for the intake form, leave it alone.

### 2. Portal Emails

Who may sign in to this client's portal. Comma-separated, one line:

```
sean@seancomma.com, manager@seancomma.com
```

Anyone on this list can ask for a code and get into **this client's
portal only**. Leave it blank and nobody can sign in, which is the safe
direction to be wrong in.

The addresses are compared exactly, after trimming and lowercasing.
Dots and `+tags` are **not** folded, because `a.b@x.com` and `ab@x.com`
may be two different people and one of them must not get the other's
numbers.

One address must not appear on two clients. If it does, that address
can sign in to neither: the code refuses to guess.

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

### 5. Tell them where it is

```
https://blueprint-marketing.com/portal/login
```

That is the whole thing. They put in their email, we send a code, and
after that their browser remembers them for 30 days. They can also
bookmark `/portal/<slug>` directly: without a session it sends them to
the sign-in screen and back again afterwards.

There is nothing secret in either URL, so it does not matter how the
link travels.

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

**1. Establish who you are.**

| Endpoint | What it does |
|---|---|
| `POST /portal/login/start` | Takes an email. If it is on a client's **Portal Emails**, or in `ADMIN_EMAILS`, it stores a hashed six-digit code in Workers KV for ten minutes and sends the code by email. |
| `POST /portal/login/verify` | Takes the email and the code. On success it sets the session cookie and answers with the slug to open. |

**2. Carry it.** An HMAC-signed token in an **HttpOnly, Secure,
SameSite=Lax** cookie, for 30 days. There are two:

| Cookie | Path | Who |
|---|---|---|
| `bp_portal` | `/portal/<slug>` | One client, their own portal. |
| `bp_admin` | `/portal` | Us, in any client's portal. |

`GET /portal/<slug>/data` checks those cookies and nothing else. The
admin one is checked first and wins. Signing in as one clears the other,
so a stale admin cookie on a shared laptop cannot outrank a client's own
session.

### Admins

`ADMIN_EMAILS` is a comma-separated secret. An address in it can sign in
to **every** client whose portal is on, sees exactly what that client
sees, and gets a client switcher in the avatar menu plus a navy band
across the top saying whose portal they are standing in.

Anything an admin changes is stamped **Last Edited By = Blueprint**, not
Client, so "the client changed this" keeps meaning that. The one
exception is a Campaign Calendar step, which has no Last Edited By
column at all; add one if you want tick-offs attributed.

### What a client may write

Three things, and nothing else:

- their own content cards (the whitelist in `src/data/portal-content.ts`),
- a new idea,
- the **Status** of a Campaign Calendar step whose **Owner** is Client,
  and only between *Not Started*, *In Progress* and *Done*. Not Skipped,
  not Moved, and never one of our steps or a moment.

Every one of those is re-checked on the server against the row as Notion
currently holds it, never against anything in the request.

### Every failure is the same failure

Unknown slug, no session, a session for a different client, a disabled
portal, an expired session, rate limited, Notion down: all of them
return

```
404  {"ok":false,"error":"not_found"}
```

and `/portal/<anything>` serves byte-identical HTML. Nothing about the
URL or the responses answers "is this artist a Blueprint client?".

The sign-in screen holds the same line. An address nobody has, an
address on a client whose portal is off, and an address that works all
produce the same sentence:

> If that email has access, we sent a code.

Do not "improve" that into "we don't recognise that email". It would
turn the login page into a way to ask whether a given artist is a
Blueprint client, and a way to sort a leaked address list into ours and
not-ours.

### Old `?key=` links

They open nothing. The key is stripped from the URL before anything
else happens and the visitor lands on the sign-in screen. Sessions
minted by the old sign-in are rejected too: the new token format
carries a `v2.` prefix that the old one does not have, so every browser
holding one is signed out.

The **Portal Key** column in Notion is no longer read. Delete it when
you are satisfied.

---

## Secrets

| Name | Required | What it does |
|---|---|---|
| `NOTION_TOKEN` | yes | The integration token. Same one the intake form uses. |
| `RESEND_API_KEY` | yes, for sign-in | Sends the codes. Without it no code is ever sent and nobody can sign in. |
| `ADMIN_EMAILS` | yes, for admins | Comma-separated. `mason@bpmktg.com`. These addresses open every client's portal. |
| `PORTAL_SECRET` | no | Signs session cookies. Any random 16+ character string. |
| `PORTAL_MAIL_FROM` | no | The From line. Defaults to `Blueprint Marketing <noreply@bpmktg.com>`. |

There is also one **binding**, which is not a variable: a Workers KV
namespace bound as `PORTAL_KV`, in **Settings → Functions → KV namespace
bindings**, for Production and Preview both.

That is where a pending code lives for its ten minutes. It has to be KV
and not the Cache API: the cache is per-datacenter, so a code written in
one colo may not be readable from another thirty seconds later, which is
a login that fails at random. **With no `PORTAL_KV` bound, sign-in is
off** and the login screen still says the same neutral sentence; the
reason is in the Function logs.

With `PORTAL_SECRET` unset, sessions are signed with `NOTION_TOKEN`,
which is already a high-entropy secret present anywhere the portal can
run at all. The only difference is that rotating the Notion token signs
every client out. Set it if you would rather those be independent.

Both go in **Cloudflare Pages → Settings → Environment variables**, as
encrypted variables. **Set them for Preview as well as Production** if you
want portals to work on preview deploys; Pages does not share variables
between the two environments.

**A variable added after a deployment does not reach that deployment.**
Pages binds variables when a deployment is created, so an existing
preview keeps running without them until you redeploy. Push a commit, or
use **Retry deployment** in the dashboard.

With `NOTION_TOKEN` missing the portal returns the same 404 as every
other failure, by design, so there is nothing on the page to tell you
this is what happened. The giveaway is in **Workers & Pages → the
project → the deployment → Functions → Real-time logs**:

```
portal: NOTION_TOKEN isn't set
```

A response that comes back in roughly 100ms is the same hint, since that
is too fast to have asked Notion anything.

Locally they come from `.dev.vars` (gitignored). See `.dev.vars.example`.

---

## Rate limiting

Three limits, each protecting a different thing.

| Limit | Where | What it protects |
|---|---|---|
| 5 code requests per hour, per email | KV | Somebody's inbox |
| 10 guesses per code, then the code is burned | KV | A six-digit code |
| 8 failed sign-ins per IP per 10 minutes | Cache API | Everything, from one machine |

The last one is the old one, and it is still a speed bump rather than a
guarantee: the Cache API is per-datacenter. The first two are durable,
because they are in KV.

Failed sign-ins are counted per IP in the Cloudflare Cache API: eight
failures and everything from that IP 404s.

**The window is ten minutes since the last attempt, not since the first.**
Every failure rewrites the counter with a fresh ten minute TTL, so a
script that keeps hammering stays locked out indefinitely. That is the
behaviour you want against an attacker, and a trap when you are the one
testing: once you are over the limit, the gate runs *before* the key is
read, so a **correct** key also returns 404 and looks like a bad key.
Stop for ten full minutes, then try once.

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
`/data` and no `/portal/login/start`. Build first, then serve `dist`
through wrangler.

With a fake `NOTION_TOKEN` you can still verify all the routing and every
failure path. The success path needs a real token.

Sign-in locally needs a KV namespace as well. Either create a preview
one:

```bash
npx wrangler kv namespace create PORTAL_KV --preview
npx wrangler pages dev dist --kv PORTAL_KV --port 8788 --compatibility-date=2026-01-01
```

or leave it unbound and accept that `/portal/login/start` will log
`PORTAL_KV is not bound` and send nothing, which is the correct
behaviour and is also what the tests cover.

---

## Tests

```bash
npm run test:portal     # or: npm test, which runs intake too
```

Covers the calendar visibility rule, the whitelists (against fixtures
stuffed with rates, keys and internal notes), title cleanup, engagement
formatting, term progress, slug validation, session signing for both
roles, who may sign in, the code store and its limits, what a client may
tick off, and that every one of those failures is identical.

---

## Sending the codes: Resend and DNS

The codes go out through [Resend](https://resend.com). Until the domain
is verified there, nothing sends and nobody can sign in.

### 1. Add the domain

Resend → **Domains** → **Add domain** → `bpmktg.com`, region
**us-east-1**.

Note the domain here is **bpmktg.com**, while the site is
blueprint-marketing.com. That is a deliberate choice about where the
mail comes from, not an accident, but it does mean these records go on
bpmktg.com's DNS, not the site's. If you would rather send from
blueprint-marketing.com, add that domain instead and the records below
apply to it with the same shape.

### 2. Add the records Resend gives you

Resend prints the exact values on the domain's page. **The DKIM value is
generated per-domain and cannot be written down in advance**, so copy it
from there rather than from here. What it asks for is three records:

| Type | Name | Value | Note |
|---|---|---|---|
| `TXT` | `resend._domainkey` | `p=MIGfMA0...` (long, from Resend) | DKIM. The one that must be copied exactly. |
| `TXT` | `send` | `v=spf1 include:amazonses.com ~all` | SPF for the sending subdomain. |
| `MX` | `send` | `feedback-smtp.us-east-1.amazonses.com` priority `10` | Bounces. Match the region you picked. |

If bpmktg.com is on Cloudflare DNS, add all three as **DNS only** (grey
cloud), not proxied. A proxied record breaks mail.

One more, strongly recommended, which Resend does not add for you:

| Type | Name | Value |
|---|---|---|
| `TXT` | `_dmarc` | `v=DMARC1; p=none; rua=mailto:mason@bpmktg.com` |

Start at `p=none` and watch the reports before tightening to
`quarantine`. A DMARC policy applied before DKIM and SPF are both
passing will send your own mail to spam.

### 3. Verify, then set the key

Press **Verify** in Resend once the records have propagated, which is
usually minutes and occasionally an hour. Then create an API key with
**Sending access** and put it in Cloudflare as `RESEND_API_KEY`.

Check `PORTAL_MAIL_FROM` matches a verified sender on that domain. The
default is `Blueprint Marketing <noreply@bpmktg.com>`.

---

## Known limits

- **An email account is the credential.** Whoever can read that inbox
  can get in. That is the normal trade, and it is a long way better than
  a link anyone can forward.
- **Signing out one client does not sign out the rest.** Removing an
  address from **Portal Emails** stops them asking for new codes, but a
  browser they already signed in on holds a session for up to 30 days.
  To cut existing sessions off: untick **Portal Enabled** (effective
  within 60 seconds, the cache window, and it locks the client out too),
  or rotate `PORTAL_SECRET` (or `NOTION_TOKEN` when no `PORTAL_SECRET`
  is set), which signs every client out at once. Pick deliberately.
- **Campaign Calendar has no Last Edited By**, so a step ticked off by
  one of us looks the same as one ticked off by the client. Add the
  column if that matters.
- **Up to a minute stale**, by design. See Caching.
- **No email to the client when something changes.** They have to open
  it. The only mail the portal ever sends is a sign-in code.
