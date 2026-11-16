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

Two more are read by the Content and Playbooks tabs, and need the same
connection:

| Database | ID |
|---|---|
| Content Pipeline | `086468afa36c414a9dd0e13fca387a42` |
| Playbook Overrides | `a105d9c5790143dfb42741aa8e10d900` |

The Playbook Overrides id is the **database** id. Notion also shows a
`collection://` id for the same thing, and the API does not accept that
one.

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
| Clients | Artist, Tier, Stage, Term Start, Term End, Client Announcement, Drive Folder, Content Vault, Roadmap Link, Access Complete | Portal Emails, Portal Key, Monthly Rate, Full Rate, Notes, Next Action, Email, Phone, Lead Source, Access Granted, Intake Slug, everything else |
| Campaign Calendar | Item, Kind, Moment Type, Date (or Auto Date), Status, Type, Owner, Playbook, Phase, Where, Why It Matters, Venue / City, Ticket or RSVP Link | Notes, Offset (days), Last Edited By |
| KPI Snapshots | Date, Type, Data Source, Growth Score (/40), Summary, every numeric metric | Notes, Snapshot |

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
Client, so "the client changed this" keeps meaning that. That holds for
a ticked-off Campaign Calendar step as well as a content card: both
databases carry the column and both writes stamp it.

### What a client may write

Six things, and nothing else:

- their own content cards (the whitelist in `src/data/portal-content.ts`),
- a new idea,
- the **Status** of a Campaign Calendar step whose **Owner** is Client,
  and only between *Not Started*, *In Progress* and *Done*. Not Skipped,
  not Moved, and never one of our steps or a moment,
- the **Date** of one of those same steps, by dragging it to another day
  or picking one in the drawer,
- the **Date** of a moment, which takes its campaign with it. See below.

- a request for a change to a playbook step, which creates one Playbook
  Overrides row with Status = Requested. They supply the step and a
  reason. What the change is, and whether it applies, are set in HQ.

Every one of those is re-checked on the server against the row as Notion
currently holds it, never against anything in the request.

The Content tab has two sides, and a row is on exactly one of them:

- **My Content**: every row the client posts themselves (Posted By =
  Client) that has no **Campaign** relation. The client's own board
  (Ideas by bucket, the six-column pipeline, the Posted archive). The
  pipeline is Planned, To film, Filmed, In edit, Ready to post, Posted.
  It has no column for our work: a card of theirs that is not one they
  film sits in Planned, and one at Ready for Review sits in In edit and
  is answered from the "Needs your review" strip above the board.
- **Campaigns**: everything else. A row with a Campaign relation,
  whoever posts it, in a lane for its moment; and any row of ours
  (Posted By = Blueprint) with no Campaign relation, in a lane of its
  own called **Other Blueprint pieces**, always the last one.

A row is the client's to do with as they like if they post it (Posted
By = Client), in a campaign or out of one. On any other row a client
may do exactly two things: answer a cut that is Ready for Review, by
approving it or sending it back with a note, and tick Filmed on a card
they film (Source = Client Films), and untick it. Everything else is
refused, and the board says "Blueprint moves this one".

"Other Blueprint pieces" is where a piece added with "Add a piece" on
the month counter sits until it is linked to a campaign step. It counts
toward the month like any other piece of ours and carries the same
permissions. Its Posted column keeps the last 30 days unless a month is
picked in the filters. A row with Posted By left empty lands there too,
because an unanswered "who posts this" is never read as "the client".

**Offset (days) is never written by the portal.** It is the playbook's default
position for a step, and a dragged date is an override of that default,
not a rewrite of it. After a whole campaign moves, every offset is still
correct, because the moment and its steps moved by the same number of
days.

### Playbooks and overrides

A playbook is the set of Campaign Calendar rows with **Is Playbook**
ticked that share a **Playbook** name. HQ → Playbooks edits them, and
every edit is confirmed with "This changes the playbook for every
client, for future campaigns."

An override is one client's exception to one playbook. Only an override
whose Status is **Approved**, and which says completely what it does,
is ever applied. It is applied in three places and nowhere else:

- the timeline drawn for that client, in HQ and in their portal,
- HQ → Playbooks → "Apply *playbook* to a moment", which creates the
  steps on that client's moment with the overrides already in,
- "Apply to open steps in upcoming moments" on an approved override,
  which shows what it would change before it changes it, and only
  touches steps that are Not Started or In Progress on moments that
  have not happened.

Approving an override never rewrites a campaign that is already on a
calendar by itself. A playbook copied onto a moment by hand in Notion
does not see overrides at all; use the button in HQ.

HQ's own writes do set Offset (days), when an override shifts a step:
that is the playbook's position for that client changing, which is what
the column means.

### Moving a moment moves its campaign

`PATCH /portal/<slug>/moment/<id>/move` shifts a show or a release and
every Campaign Calendar row pointing at it by the same number of days,
in one request. Three things worth knowing:

- **It includes rows the client cannot see.** Hidden steps and ours move
  too, or the plan in Notion comes apart the first time a client drags a
  release. They are never shown these rows; the count in the confirm
  dialog is the only thing about them that reaches the browser, and it
  comes from a `{ "preview": true }` call so the dialog cannot be wrong.
- **Skipped, Moved and Done stay where they are.** Those are the record
  of what happened, and the release slipping a week does not change the
  day something was skipped.
- **Undo is a replay, not an inverse.** Every write records the value it
  replaced; the list is kept in `PORTAL_KV` for fifteen minutes under a
  single-use token, and the pages it names are checked against Notion
  again before anything goes back. Without `PORTAL_KV` the move still
  works and simply offers no Undo.

A cascade is capped at 90 days, at 40 steps (a Worker has a fixed budget
of outgoing requests, and half a moved campaign is worse than none), and
at six moves a minute per client, separately from the ordinary write
limit.

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

## Pieces: the rows a campaign step owes

A **deliverable step** is a Campaign Calendar step whose Flow is
"Blueprint makes + posts" or "Client films → Blueprint edits + posts".
Each one owes a row in the Content Pipeline, and a piece only counts
toward the month once that row exists. The rules are in
`src/data/pieces.ts`; the Notion reads and writes in
`src/server/pieces.ts`.

Three properties on Campaign Calendar describe the piece a step owes.
They live on the master and are copied to every step made from it:

| Property | Values | Used for |
|---|---|---|
| Priority | Core, Standard, Filler | What a trim may cut. Core never is. |
| Default Media | Video, Photo, Carousel, Graphic, Story | The row's Media, and through it Source and Platforms. |
| Pieces | a number, blank = 1 | How many rows. 3 is the flyer set: IG post, IG story, Event banner. |

All three are shown and edited on master steps in HQ → Playbooks. A
step that delivers nothing carries none of them.

**Where rows are made.** Applying a playbook in HQ creates each
deliverable step and its rows together. "Create missing pieces" on the
month counter in HQ → Content does the same for steps that already
exist and have nothing linked: it lists what it would make, by month,
and writes only when the button is pressed. Done, Skipped and Moved
steps are left alone, and running it twice creates nothing new.

**What a created row says.** Content is "[moment] [step title]"; Client
and Campaign (the step) are set; Posted By = Blueprint; Status =
Planned; Post Date = the step's date; Media = Default Media. Source is
Client Films when the Flow says the client films it, Flyer / Graphic for
a Graphic or Story, otherwise Show Media. Film By, on a Client Films
row only, is the nearest film session at or before it in the same
moment. Bucket follows the playbook (Show Promo, Release Promo, Live
Performance), except Carousel for a carousel and Flyer for the flyer
rows. A row is hidden from the client when its step is, and a step
made on a hidden moment is hidden with it.

**Staying in step.** When a step's date changes in the portal or HQ, or
its whole moment is moved, its Planned rows take the step's new day. A
row past Planned is never moved. A step that is skipped takes its
Planned rows with it, and a row that is skipped takes its step with it
once every row the step has is Skipped. Editing a date or a status
directly in Notion does not trigger any of this.

**Trimming a month.** When a month is over 25, the "x over" on the HQ
counter opens Suggested trims: counted pieces that are still Planned
and not Core, first to cut at the top, with exactly x ticked. Order:
Filler before Standard; then near-duplicates (same week, same media,
different moments); then Remix Drop, Post-Show, Pre-Show, release
playbooks; then pieces within three days of another moment's release
day or announce; then latest first. Post-show and long-tail pieces can
be moved to next month instead. Applying sets the piece and its step to
Skipped and adds a "Trimmed [date]: over monthly cap ([reason])" line to
both Notes. Film sessions the trim leaves with nothing to film for are
listed afterwards and skipped only if confirmed. "Undo last trim" puts
it all back, for twelve hours, from the same browser session.

**The 50-request limit.** A Pages Function may make 50 outgoing
requests, and every Notion call is one. So each of these writes a
limited number of rows per request and reports what is left, and the
page repeats the request until nothing is. If one is interrupted,
running it again finishes it.

**Retired.** A master whose Playbook is "Retired" is kept to be read and
is not a playbook: it is not shown to clients, never appears inside one
of the six playbooks, and cannot be applied to a moment. HQ → Playbooks
lists these in a closed "Retired / menu" section, each with "Restore to
[playbook]". The playbook it came from is read off its Phase.

**Brief.** A text property on Campaign Calendar: how to make the piece
or do the job. It is edited on masters in HQ, copied to steps when a
playbook is applied, and shown to the client on the step and on the
piece that step delivers (the piece borrows it through Campaign; the
Content Pipeline has no Brief of its own). It is on the client
whitelist in `CALENDAR_FIELDS`. Notes are still ours only.

## Updating running campaigns to the current playbook

When the masters change, campaigns already on a calendar do not: they
were copied, and nothing links a copy to its master. HQ → Playbooks →
pick a client → **Update campaigns to current playbook** brings them up
to date in place. It never applies a playbook. The plan is made in
`src/data/playbook-update.ts`; the endpoint is
`POST /portal/hq/playbooks/update`.

It opens on a dry run and writes only when the button is pressed.

- **Match.** Each step is matched to a master by Playbook and title: the
  master's own title, the master's with a city or the client's name
  where it says `[city]` or "artist", a retired master's title (found
  through its Phase), or an old wording listed in `AUDIT_ALIASES`. A
  step that matches none of those is reported as unmatched and left
  alone. Add to `AUDIT_ALIASES` when a master is renamed again.
- **Frozen, never changed.** Done, Skipped or Moved; dated before
  today; or with a linked piece past Planned (the step and its pieces).
- **Retired master.** The step is Skipped with "Retired in playbook
  audit Nov 16" added to Notes, and so are its Planned pieces.
- **Otherwise.** The title becomes the master's, keeping a city, a
  track name or the client's name that was already in it. Brief,
  Priority, Default Media, Pieces, Where and Why It Matters are copied
  where the master has them. If the master's offset changed, the date
  becomes the moment's date plus the new offset and Planned pieces move
  with it, unless the new date is past or the date was set by hand.
  Flow and Owner are never changed.
- **Set by hand** means: Notes mention a reschedule or a hard deadline,
  the step has no offset, or it is not on the day its own offset gives.
  Those keep their date and are flagged with what it would have been.
- **Adds.** Only the steps named in `AUDIT_ADDS`, once per moment, when
  the campaign has nothing like them and the date is today or later.

Two switches on the sheet change the plan: "Scheduled by hand: no date
changes" on a moment, and unticking a step to leave it out.

Before the first write, every row the run will touch is saved to R2
under `hq/playbook-updates/<client>/<timestamp>.json`, which is not a
prefix any client session can read. With no bucket bound it refuses to
write. "Undo last update" restores every row from that file and
archives any step the run added. After writing, three things are
checked against Notion and shown as a failure if any is false: no
moment has two open steps from one master, every month has as many
pieces past Planned as before, and no Done step changed.

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

That is where a pending code lives for its ten minutes, and where the
undo record for a moved campaign lives for its fifteen. Both have to be
KV and not the Cache API: the cache is per-datacenter, so something
written in one colo may not be readable from another thirty seconds
later, which is a login that fails at random and an Undo button that
does nothing. **With no `PORTAL_KV` bound, sign-in is off** and the
login screen still says the same neutral sentence; a campaign still
moves but offers no Undo. Both reasons are in the Function logs.

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
npx wrangler pages dev dist --kv PORTAL_KV --r2 REPORTS_BUCKET --port 8788 --compatibility-date=2026-01-01
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

The calendar has a second gate of its own, which drives the built
portal in two browsers and compares what it draws with a recorded
baseline. It needs a build and Playwright's browsers, so it is a
separate command and not part of `npm test`:

```bash
npm run test:calendar
```

Run it before and after any change to the calendar. How it works, and
when and how to re-record the baseline, is in
`tests/calendar-snapshot/README.md`.

---

## Sending the codes: Resend and DNS

The codes go out through [Resend](https://resend.com). Until the domain
is verified there, nothing sends and nobody can sign in.

**This is already done.** bpmktg.com is verified for sending on the
Resend account and `RESEND_API_KEY` is set in Cloudflare for both
Production and Preview. The rest of this section is what to do again for
a new domain, or to check when mail stops arriving.

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

Resend prints the exact values on the domain's page, and **every one of
them is generated per-domain**, so copy them from there rather than from
here. What it asked for on bpmktg.com was three records:

| Type | Name | Value | Note |
|---|---|---|---|
| `TXT` | `resend._domainkey` | `p=MIGfMA0...` (long, from Resend) | DKIM. The one that must be copied exactly. |
| `CNAME` | `send` | `<generated>.forge.rmta.net` | Resend's own sending host. Carries SPF and the return path. |
| `CNAME` | `rsend` | `<generated>.forge.rmta.net` | The same, for the second sending hostname. |

Two CNAMEs and a TXT, not the SPF `TXT` and bounce `MX` that older
Resend accounts were given. If the domain page shows you that older
shape instead, add what it shows: the records are Resend's to choose,
and they change.

If bpmktg.com is on Cloudflare DNS, add all three as **DNS only** (grey
cloud), not proxied. A proxied record breaks mail.

Nothing here sets up **receiving**. bpmktg.com has no MX pointed at an
inbox, which is deliberate: the portal only ever sends. A client who
replies to a code email is replying into nothing, which is why the body
says to write to Mason's own address instead of replying.

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
- **Up to a minute stale**, by design. See Caching.
- **No email to the client when something changes.** They have to open
  it. The only mail the portal ever sends is a sign-in code.
