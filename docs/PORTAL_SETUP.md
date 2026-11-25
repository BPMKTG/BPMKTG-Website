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
| Clients | Artist, Tier, Stage, Term Start, Term End, Client Announcement, Drive Folder, Content Vault, Roadmap Link, Access Complete | Portal Emails, Portal Key, Monthly Rate, Full Rate, Notes, Next Action, Email, Phone, Lead Source, Access Granted, Intake Slug, Archive Folders, everything else |
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

Seven things, and nothing else:

- their own content cards (the whitelist in `src/data/portal-content.ts`),
- a new idea,
- the **Status** of a Campaign Calendar step whose **Owner** is Client,
  and only between *Not Started*, *In Progress* and *Done*. Not Skipped,
  not Moved, and never one of our steps or a moment,
- the **Date** of one of those same steps, by dragging it to another day
  or picking one in the drawer,
- the **Client Notes** of one of those same steps, and only when the
  step has **Ask for Notes** ticked. See "Notes a step asks for" below,
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

`PATCH /portal/<slug>/moment/<id>/move` shifts a moment and
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

**Notes a step asks for.** Two properties on Campaign Calendar: **Ask
for Notes** (checkbox) and **Client Notes** (text). Some steps are a
question, such as "Log biggest crowd reaction moments". Tick Ask for
Notes on the master (in HQ, on the step's edit form) and every step
made from it carries the tick. The client's card for that step then has
a "Your notes" box above its tick box. What they type saves itself a
moment after they stop, when they leave the box, and on "Save notes",
and goes to Client Notes on their step. HQ shows it on the step's card
as "Client notes".

- Only a step with the tick takes a note, and only from the client who
  owns it (Owner = Client) or from one of us. Not a hidden step, and
  not one that is Skipped or Moved.
- A note is plain text, at most 2,000 characters. One that is longer is
  refused, never cut short. An empty note clears the box.
- It can still be added to after the step is ticked Done.
- Client Notes is never the same field as Notes. Notes stays ours and
  is never sent to a client; a client's note never lands in it.
- "Update campaigns to current playbook" switches the box on for steps
  already on a calendar whose master now asks. It never switches one
  off, so a note that was written keeps the box it was written in.

## Client types: artists and cheer gyms

A client is an **Artist** unless its Clients row says otherwise. The
**Client Type** select on Clients has two options, `Artist` and `Cheer
Gym`, and a blank is an artist: every client from before types existed
behaves exactly as it did.

Everything that differs by type is in one file,
`src/data/client-types.ts`: one config object per type. Labels, Moment
Types, Flows, which KPI platforms are shown, which Home numbers, the
health rule, and the features that are on or off. The screens read the
config. **Do not add `if (cheer)` checks to a screen.** If a screen
needs to know something new about a type, add a field to the config.
A third type is a third object in `CLIENT_TYPES`.

What a Cheer Gym does not get is left out **on the server**
(`trimForType`), not only hidden in the browser: no streams, tickets,
capacity or ticket link on a calendar row, no music goals, no Spotify,
Apple Music or SoundCloud numbers, no Playbook Audit, and no artist
playbooks. An artist's payload is passed through untouched.

**Notion fields this added** (all additive):

| Database | Field |
|---|---|
| Clients | `Client Type` (select: Artist, Cheer Gym) |
| Campaign Calendar | `Client Type` (select), read on playbook masters |
| Campaign Calendar | `Moment Type` options: Competition, Showcase, Tryouts, Camp, Picture Day, Banquet / Awards |
| Campaign Calendar, Playbook Overrides | two `Flow` / `New Flow` options (below) |
| Content Pipeline | `Deliverable` (select: Photo set, Footage batch) |
| Gym Intake | a new database beside Artist Intake |

**Moments.** A gym's Moment Types are its own. A Moment Type a config
lists is read exactly ("Showcase" is not a "Show"); anything else falls
back to the old match on the word. Competition and Showcase are drawn
like a show; the rest are plain moments with their own tag.

**The two gym flows.** `Blueprint shoots + edits → Client posts` and
`Blueprint shoots + grades → Client edits + posts`. Both are **Owner =
Client**: the step is the posting, which is hers, so she ticks it and
it sits under "You post" and on her to-do list, never under
"Blueprint's work". Our half is not a step. It is the photo set or
footage batch the step owes, tracked as a delivery in HQ → Content.
What a step owes is read off **Flow alone, never Owner**. Applying a
playbook creates a delivery for them, never a Blueprint post.

**Deliveries, not a month counter.** A gym is not counted in 15 to 25
posts. What we owe is photo sets and footage batches, per competition.
A delivery is a Content Pipeline row with `Deliverable` set, Posted By
= Blueprint, and Campaign pointing at the competition's **moment** (not
at a step, so the client's posting step stays on her calendar). Its
four stages reuse four statuses: To shoot = Planned, Shot = Filmed,
Editing or Grading = Editing, Delivered = Posted. The finished link
lives in `Edit Link`.

- Deliveries are split off on the server before any payload is built,
  so they are never on a content board, a calendar or a month count.
- In the tracker each competition is a dropdown, shut until opened,
  with its date and "n of m delivered" on the heading. The soonest
  competition with anything still owed is on top; one that is all
  delivered drops below, most recent first.
- HQ → Content shows a tracker per gym: add one, move its stage, paste
  the link, remove it (which sets Skipped). `POST` and `PATCH`
  `/portal/hq/deliveries`, admin only.
- The gym sees the same list on her Content tab and can change nothing.
- Her own posts are ordinary Client rows on the board, as before.

**Her own buckets.** The Bucket select is one list for every client.
A gym is shown only the buckets her own rows use, and "New bucket…" on
a card or a new idea founds one by naming it.

**Playbook Audit.** A gym is shown the audit card only when its own
PDF is uploaded (HQ → Playbooks → Cheer Gym playbooks → Custom audits).
There is no general gym audit to fall back to.

**Playbooks.** A playbook belongs to one client type. Masters carry
`Client Type` (blank is Artist); a client is only ever shown, given, or
updated against its own type's masters. HQ → Playbooks has a switch
between the types and a **New playbook** button, which creates the
playbook's placeholder moment and its first step. A step added to a
playbook joins that playbook's type. "A new phase…" in the step form
starts a phase.

**Reports.** The Reports tab is the same for both types and draws
whatever numbers a snapshot has. A gym has no monthly PDF: a month goes
live with **Publish numbers** (HQ → Reports, or the admin panel in her
portal), which ticks Published and sends nothing. Growth audits work as
they do for artists.

**Turning on a gym's portal.** On its Clients row: set **Client Type**
to Cheer Gym, put her address in **Portal Emails**, tick **Portal
Enabled**, and set **Portal Link** to
`https://blueprint-marketing.com/portal/<intake slug>`. Its Intake Slug
must be on exactly one row.

## Applying a playbook to a moment

One sheet, in two places: **HQ → Playbooks → Apply a playbook to a
moment**, and **Add a moment** on a client's own Calendar tab (also
"Plan this with a playbook" on any moment's card). The plan is
`src/data/playbook-apply.ts`; the writing is `src/server/playbook-apply.ts`.

Pick the client (HQ only), the moment or **New moment…**, and the
playbooks. Only the client's own type's playbooks are offered, and the
usual ones for that Moment Type are ticked (`playbooksFor` in
`src/data/client-types.ts`). The preview is a dry run of exactly what
would be written; nothing is written before it.

- **Dates.** A step is the moment's first day plus its Offset. A
  multi-day moment counts from its first day.
- **Overrides.** Only Approved ones for that client and playbook apply.
  The preview marks each step they touched: Reworded, Shifted,
  Reassigned, Added. A skipped step is left out and named.
- **Late.** A step whose day has passed is created as **Skipped**
  unless one of us ticks "keep" in the preview.
- **Per team.** A post of ours whose Notes contain "One piece per"
  needs a number before it can be applied, and the number is kept in
  the copy's Pieces. A gym's delivery is never counted this way: see
  the next line.
- **What a step owes.** For an artist, a Blueprint post per deliverable
  step, as before. For a gym, a photo set
  (`Blueprint shoots + edits → Client posts`) or a footage batch
  (`Blueprint shoots + grades → Client edits + posts`), linked to the
  step and shown in the delivery tracker under its competition.
  **One delivery per step**, whatever the step's Pieces and even when
  it is "one per team": not every team goes to every competition, so
  the row stands for the batch, as the step does on the calendar.
- **Twice is safe.** Every copy keeps its master's id in **Master Step
  ID** (never sent to a client). A second apply says "already applied"
  and only adds what is missing, including rows that steps already
  there still owe. Copies from before that field are matched by title.
- **Overlaps.** A new step within three days of a step on another of
  the client's campaigns, with the same Default Media or the same
  title, is flagged in the preview.
- **Undo.** In HQ, until the sheet is closed: removes only the steps it
  just made that are still Not Started with nothing begun, and names
  the rest. Rows are archived, not deleted.
- **Deliveries only.** `owedOnly: true` on `POST /portal/hq/playbooks/apply`
  (ours only; ignored from a client's portal) makes no steps at all:
  only the deliveries that Not Started steps already on the moment
  still owe. `leave: [stepIds]` holds steps back. For backfilling a
  client whose steps were made before Master Step ID, where a reworded
  step would otherwise be made a second time.
- **Masters are never written to** by any of this.

Both gym flows are **Owner = Client**: the step is the client's
posting, and what we owe for it is the delivery. A copy of a master
with one of these flows is always written Owner = Client, whatever the
master's Owner says.

### A new moment

Title "[Client] · [Event] ([City])", Kind = Moment, a Moment Type from
the client's type, Date (and last day if more than one), Venue / City,
Client, Client Type, Notes. `POST /portal/hq/moments` for us,
`POST /portal/<slug>/moment` for a client, where the client is the
session's and never the request's.

### When a client applies a playbook

Their own steps (Owner = Client) are created and are on their to-do
list. Steps that need us are created with **Pending Blueprint**
ticked. That is every step of ours, and every step of theirs with one
of the two gym flows, because the shoot behind it is our work: they owe nothing, create no post or delivery, and count toward
no month and no tracker until one of us confirms them. A late step is
Skipped; a client cannot keep one or give a team count.

HQ → Today shows **Client added: confirm**: each moment a client
created ("Got it") and each pending step (**Confirm** or **Skip**).
Confirm is what creates the step's post, photo set or footage batch.
`POST /portal/hq/pending`.

## Previews: our own copy of a Drive file

A Drive link in **Edit Link** is never shown in Google's player. That
player only plays for someone signed in to Google with access, in a
browser that lets Google see that from inside a frame, and an iPhone
does not. Instead we keep our own copy in R2 and serve it behind the
portal's sign-in:

| The file is | What we keep | Made by |
|---|---|---|
| an image | a web copy (1600px long edge) and a thumbnail (400px) | Drive's own resized renditions |
| a video | an H.264 MP4 (1080p at most), a poster and a small poster | Cloudflare Stream, used only as a converter |

The original is never served. "Open original" under every preview is
the Drive link itself.

**The code.** The rules are `src/data/preview.ts` (pure, tested). The
part that talks to Drive, Stream and R2 is `src/server/preview.ts`,
and it knows nothing about content cards: it is given a link, what is
recorded about that link's preview, and a way to record what happens
next. The Content Vault can use it as it is.

**One step per look.** There is no job runner on Pages, so
`advancePreview` does one step each time someone looks: an image is
done in one; a video is uploaded to Stream, then on later looks asked
after, and when its MP4 is ready it is copied into R2 and deleted from
Stream. A page that is waiting asks every five seconds. HQ asks when
it opens, which is also the backfill: the first open after a link is
added makes its preview.

**Where it is recorded.** Six fields on the Content Pipeline, none of
which is ever sent to a client:

| Field | Holds |
|---|---|
| `Preview Status` | Converting, Ready or Failed |
| `Preview Image Key` | the R2 key of the web image, or of a video's poster |
| `Preview Thumb Key` | the R2 key of the small one |
| `Preview Video Key` | the R2 key of the MP4 |
| `Preview Source` | the Drive file id it was made from. A link to a different file is rebuilt. |
| `Preview Detail` | what was made ("1920×1080 H.264, faststart, 23 MB"), the job while converting, or why it failed |

A page is sent `preview: { state, kind, v }` and builds the address
itself. Writing a preview touches those six fields and nothing else:
not Status, not Last Edited By.

**Keys and addresses.** `previews/<slug>/<item>/<version>/image.jpg`,
`thumb.jpg`, `video.mp4`, in the existing bucket. The version is
random per build, so a rebuilt preview has new addresses.
`GET /portal/<slug>/preview/<item>/<version>/<image|thumb|video>`
serves one, to that client's session or to an admin, with byte ranges
(a phone will not play a video without them). The key is built from
the slug the session is bound to, so there is no address for another
client's file.

**One maker at a time.** Notion writes whatever it is handed, so two
looks at the same new card a moment apart (HQ open, the client opening
it) would each read "nothing made yet" and each make it: two sets of
files, and for a video two copies in Stream. So a step that is about
to make or record something first takes the item's claim, a small file
at `previews/<slug>/<item>/building.json` that R2 stores only if there
is not one already, and then reads the card again. A look that finds
the claim taken, or the card already moved on, does nothing and the
page asks again. The claim is deleted when the step ends; one left by
a step that was cut off is taken over after six minutes. If R2 cannot
be asked about the claim, the step goes ahead without one and logs
`going ahead without one`: a preview made twice is better than one
never made. A slide does not use the claim. Its record is in its
manifest, which refuses a late write itself.

**Shown whole or not at all.** A preview picture is not handed to the
browser as an address to paint as it arrives. On a phone a download
sometimes stops part way with the connection still open, and the
browser leaves the top of the photo on screen over a black box, for
good: it is not an error, so nothing tries again. The page fetches
the bytes itself (`src/scripts/portal-picture.ts`): a download that
goes eight seconds without a byte, ends early, or is cut is started
again, up to three times, and the picture is put on the page only
once it is complete and decoded. Until then the box shows that it is
loading. If it never comes the box says "This slide did not load"
with **Try again**; that is the connection, so it is not reported as
a preview to fix. This covers a slide's picture, a video's poster and
a single card's picture. The small thumbnails on cards and in the
Slides list are still plain images. The service worker has no part
in it.

**When it fails.** The client sees "Preview unavailable · open
original". HQ → Today lists it under **Previews to fix** with the
reason (most often: the file is not shared with the service account)
and **Try again**. A missing secret is never recorded as a failure of
the file: nothing is written, and HQ names the secret.

**It repairs itself.** If a preview is recorded but its files are not
in R2 (recorded by a local server, say, and read in production), the
page fails to load it, tells the server, and the server checks R2 and
rebuilds.

**Limits.** A video over 800 MB is refused with "export a smaller
file". Only one upload is started per HQ call, so a large backfill
takes several rounds, which HQ does on its own.

---

## Slides: a post that is several files

A carousel or a story sequence is up to twenty photos and videos, in
order. Each slide is one Drive file, and each gets its preview from
the service above, unchanged: a web copy and a thumbnail for a photo,
the Stream MP4 and a poster for a video. An item is shown as slides
when **Media** is Carousel or Story and it has at least one. Anything
else is its Edit Link, exactly as before.

**Where the list lives.** One JSON file per item in R2, the manifest,
at `previews/<slug>/<item>/slides.json`: which Drive files, in which
order, the filename when Drive told us, the folder the list was last
matched to, and what is recorded about each slide's preview. It is in
R2 and not in Notion because it is too long for a text field (twenty
slides of keys), and because it changes every time a conversion moves
on, which is not an edit of the card.

**Notion holds one field**, `Slides Manifest`, containing that key.
All it is ever used for is "this item has a list": the address is
always built from the client's slug and the item's id, and what the
field says is only compared with that. It is never sent to a client.

**The files** are filed under the item like any preview
(`previews/<slug>/<item>/<version>/...`, one random version per
build), so the address a page asks and the route that answers are the
ones a single preview uses, with the same sign-in. The service worker
handles none of it.

**The code.** The rules are `src/data/slides.ts` (pure, tested). The
part that reads Drive and R2 is `src/server/slides.ts`. The page side
is `src/scripts/portal-slides.ts`: the swipe viewer, the list we
build a post from, and the mark on a card.

**One route**, `POST /portal/<slug>/slides/<item>`:

| Body | Who | What it does |
|---|---|---|
| `{}` | the client, or us | answers with the slides, and moves on the ones not ready |
| `{ verify: <slide> }` | the client, or us | "that one would not load": its files are checked and rebuilt |
| `{ add: <link> }` | us | a Drive file link adds one slide. A folder link makes the list every image and video directly in the folder, by filename |
| `{ remove: <slide> }` | us | takes it out, and clears its files |
| `{ order: [<slide>, ...] }` | us | the same slides in a new order. Refused if it is not exactly the slides there are |
| `{ resync: true }` | us | matches the folder again. Slides whose files are still there keep their previews |
| `{ retry: <slide> }` | us | builds that slide's preview from the start |

A client who sends one of ours gets the usual 404, before anything is
read. Changing the list is refused unless Media is Carousel or Story.

**Two changes at once both land.** Someone can reorder the list while
a conversion finishes for one of its slides. Every change reads the
manifest, makes its change to what it read, and writes only if the
file is still the one it read (R2's conditional write); if not, it
reads again. And a preview step only records its result if the slide
is still as the step found it, so two people looking at once make one
copy, not two.

**When a slide fails**, the others still show. That slide says
"Preview unavailable · open original"; HQ → Today lists the item
under **Previews to fix** with the slide number, and the row in the
list has its own **Try again**.

**The viewer.** One frame. Swiping is the browser's own sideways
scrolling with snap points. Dots and an "n / total" counter; arrow
buttons and the arrow keys on a desktop. A carousel's frame takes its
first slide's shape and crops the rest to it; a story is 9:16. A
video shows its poster, plays in place with sound when tapped, and
pauses when swiped away. The first two slides load up front, the rest
as they come near.

**Review.** Approve and Request changes act on the whole post.
Request changes starts the note with "Slide n:" for the slide on
screen, which the client can change or clear.

**Notifications.** Adding, removing and reordering slides tells a
client nothing. The slides route sends no client notification at
all; the only thing a client hears about is the post moving into
review, from the content route, as before.

**Local testing.** The manifest is in R2, which a local server does
not share with production, while `Slides Manifest` is in Notion,
which it does. A list built locally reads in production as "no
slides" until it is built there. Test on a row with **Hide from
Client** ticked, and remove the slides before archiving it.

---

## The Content Vault

Every photo and clip a client owns, logged once and findable in
seconds. It replaces the Google Sheet each client used to have, and
the script that filled it. It is a tab in the client's portal
(`/portal/<slug>#/vault`) and a tab in HQ (`/portal/hq#/vault`, every
client; `/portal/hq#/vault/<slug>`, one).

The rules are in `src/data/vault.ts`. The store is
`src/server/vault-db.ts`, the reading of Drive `vault-drive.ts`, the
sync `vault-sync.ts`, and what the routes are made of `vault.ts`. The
page is one module, `src/scripts/portal-vault.ts`, drawn in both
places.

**Where it is kept.** A D1 database bound as `VAULT_DB`, not Notion: a
client has thousands of files, and a filter over them is one query
there and twenty requests to Notion. The tables are made by the app
the first time it is used, so a new database needs nothing run
against it.

**The words.** A Moment is a dated thing: a show, a release, a
holiday. A Playbook is the reusable plan. A Campaign is a playbook
applied to a moment. The Vault files things under moments, and says
"moment" for all of them. (In the database the column is still called
`show`, which is what it was first called.)

**Three sources a client.** Every file has a Kind (Raw or Finished)
and a Source.

| Source | Where | Kind | What the folders mean |
|---|---|---|---|
| Footage Drop | a folder of that name inside the Clients row's **Drive Folder** | Raw | `YYYY-MM-DD Moment Name` gives the day and the moment. Anything under `_IDS` is Unreleased. |
| Finished Content | a folder of that name inside the same Drive Folder | Finished, source Blueprint | `YYYY/YYYY-MM/<moment>/...` gives the month and the moment. Older work filed as `YYYY/<moment>/...` gives the year and the moment. Deeper folders are filing: they are shown on the file and not used to name it. |
| Archive | each link in the Clients row's **Archive Folders** | Raw, source Archive | Read exactly as Footage Drop is: `YYYY-MM-DD Moment Name`, and `_IDS` is Unreleased. |

A file whose folders fit none of that is never left out. It falls
back to its own date, keeps the name of the folder directly under the
source as a suggestion, and is listed in HQ under **Needs a moment**,
one line a suggestion, to confirm in bulk. In Finished Content that
is only a file with no folder to name it: one lying loose in a year
or a month folder, or filed outside both.

The rules for reading folders can change. A sync reads every known
file's folders again, so a file logged under an older rule is put
right by the next one. A moment set by hand is never reopened.

**Linked to the calendar.** At the end of every sync each file is
matched to a Moment in the client's Campaign Calendar:

- by name: the folder's name is the Moment's, or one is held whole in
  the other ("Revival After Dark" is "Revival After Dark (Austin,
  TX)"). A name is only believed near the Moment's date, and a night
  that happens every month goes to the nearest one
- or by date: a day read off a folder or a camera, within three days
  of exactly one Moment. Never the day a file was uploaded
- a folder is kept whole: when the files of one name that could be
  placed all point at one Moment, the rest of that name go with them

A linked file goes by the Moment's own name. A folder with no
matching Moment keeps its name as plain words and still counts as
sorted. Only a file with no name at all, and no Moment near its date,
waits under **Needs a moment**. Links are worked out afresh by every
sync, so a Moment renamed, moved or removed is followed. Only Moments
the client can see are linked to. A Moment's drawer in HQ shows its
Vault files and its gaps strip, from `/portal/<slug>/vault/moment/<id>`.

A file's date is the folder's day where its name has one. A folder
that only names a month is sharpened to the day the photo was taken
when that day falls inside it. A folder that only names a year is
sharpened the same way, and failing that to the day Drive says the
file was created, when that day is in the year. A date of the file's
own that falls outside its folder's year is not believed over the
folder: work filed under 2023 and uploaded in 2026 is from 2023, and
reads as "2023". With no folder date it is
the day the photo was taken, and failing that the earliest day Drive
has for the file: Drive records when a video was put there, not when
it was shot.

**Drive is read-only.** The service account's key asks for
`drive.readonly`. The sync asks Drive questions and nothing else: no
file is renamed, moved, copied or deleted, and no original is
downloaded. What Drive already knows about a file (its size in
pixels, its length, a thumbnail it has drawn) is all that is used.

**Shared by name, not by link.** A folder counts as shared only when
it, or a folder above it, has been shared with the service account by
name. One that can be read only because "anyone with the link" can
read it is shown in HQ as **Not shared with the Vault yet**, with the
service account's address to copy, and none of its files are logged.

**The sync.** Lists every image and video under all three sources,
logs the ones it has not seen (matched on the Drive file's id), brings
the ones it has up to date, makes a thumbnail for each, links files
to Moments, and brings the usage log in line with what is Posted. It
fills in type, orientation, length, size, date and moment. It is
started:

- once a day, by the scheduled Worker below
- by **Sync now** in HQ
- by HQ being opened, for any client not synced in the last half hour

**It is taken in steps.** One request does a few seconds of the sync,
writes down exactly where it has got to (Drive's own marker for the
next page of a folder, which thumbnails are made), and lets go.
Whoever asks next takes the next step from there: the page that
pressed Sync now, an open HQ, the daily Worker. So nothing rides on
one long request. A page that is reloaded or closed in the middle
costs the step it was on, which is done again, and nothing else. To
the person watching it is one pass with a progress line: "Syncing…
1,200 of 2,531 thumbnails".

Only one step is taken for a client at a time. A step says it is
alive every few seconds. "Syncing" is never remembered, only read: a
sync is running while it is part way and was heard from in the last
half minute. One that is part way and silent has died, and is shown
as **Last sync failed** with the time and **Retry**, which carries on
from where it stopped. An open HQ carries it on by itself.

**HQ's list does not fail.** `/portal/hq/vault` is asked every few
seconds by a page watching a sync. Its counts and progress come from
the Vault's own database. Who the clients are comes from Notion, which
is given four seconds and remembered for a minute; when it does not
answer, the last list it gave is used. If the read fails anyway the
page keeps the last good counts, says they are from a moment ago, and
asks again. Each of those is written to the log with which part it
was (`hq vault list: ...`).

A file that is no longer in a folder it was read from is marked
**Missing** and is never deleted. Missing is only said when every
folder has been read to the end, and only of a file whose own source
was read: a page that would not list fails the sync and marks
nothing, and a folder that is no longer shared says nothing about its
files.

**Unsorted and keepers.** A new Raw file lands in **Unsorted**.
Starring or rating it makes it a keeper. A Finished file is a keeper
from the start. The default view is keepers only.

**Opening a file.** A thumbnail is made for every file. The web-sized
picture is made the first time someone opens the file, and kept. A
video shows its poster; **Play preview** converts it through Stream
(the preview service's own step, see above) and keeps the result. A
video longer than five minutes is not converted on demand: it shows
its poster and **Open original**, which is always there and is the
file's own page in Drive. Every file is served by the preview route,
behind the same sign-in: a client sees only their own.

**The usage log.** When a Content Pipeline item is Posted, each Vault
file it uses (its Edit Link, or its slides, matched on the Drive
file's id) is logged as used, with the date, the platforms and the
post. So is a file one of us marked as what the post was **made
from**. It is brought up to date when a card crosses the Posted line
through the portal, and by every sync, which is what catches a status
changed in Notion itself. A post moved back out of Posted comes off
the log. One of us can also mark a file as used by hand.

**Hold for.** One of us can put files aside for a post or a campaign.
A held file is left out of **Never posted**. We are shown what it is
held for; a client is told it is held, and not for what, because the
post may be one we are holding back.

**Use in a post.** One file, or several picked in order, become a new
Idea in that client's Content Pipeline: the file attached as its Edit
Link, or the files as its slides. This is the one thing the Vault
writes outside itself. It makes a new row and changes no existing
card, stage, campaign or playbook. The Idea is the client's to post,
so it does not count toward what we owe in a month.

**Who can do what.** Decided by the signed session, on the server.

| | A client | One of us |
|---|---|---|
| Browse, search, filter, open | their own files | every client's |
| Star, tag, write notes | yes | yes |
| Use in a post | into their own Ideas | yes |
| Rate, set source, type or moment, hold for, mark used, made from | no | yes |
| Sync, Needs a moment, Announce delivery | no | yes |

**Notifications.** A sync that finds new Raw files tells us once:
"[Client]: 12 new files". A client is told about files only when one
of us taps **Announce delivery** on a moment: "Your [moment] media is
ready". Never by a sync. Each is its own kind on the notifications
sheet, so a device can turn it off.

**The service worker.** It does not handle any Vault file, thumbnail,
preview or data request, and was not changed for the Vault. The Vault
is a view of pages it already serves.

### Setting it up

Three things, once, in the Cloudflare dashboard.

**1. The database.** Storage & Databases → D1 SQL Database → **Create**.
Name it `bpmktg-vault`. Then the Pages project → **Settings →
Bindings → Add → D1 database**: variable name `VAULT_DB`, database
`bpmktg-vault`. Add it for **Production** and for **Preview**, and
redeploy. The Vault tab appears for clients once it is bound.

**2. A secret both sides share.** Make a long random string (for
example `openssl rand -hex 32`). On the Pages project, add it as an
encrypted variable named `VAULT_CRON_SECRET`, for Production. It is
what lets the daily Worker in, and nothing else can use that door.

**3. The daily Worker.** Workers & Pages → **Create → Worker**. Name
it `bpmktg-vault-sync`. Replace its code with the whole of
`workers/vault-sync/worker.js` and deploy. Then, on that Worker:

- **Settings → Variables and Secrets**: add a text variable
  `SITE_URL` = `https://blueprint-marketing.com`, and a secret
  `VAULT_CRON_SECRET` with the same string as step 2.
- **Settings → Trigger Events → Add → Cron Triggers**: `0 10 * * *`
  (10:00 UTC every day).

To try it without waiting a day: the Worker's **Triggers** panel can
run the scheduled event once, and its log should end with
`vault-sync: done in N call(s)`. A `404` in the log means the two
secrets do not match, or the site does not have one.

The Worker holds no key to Notion or to Drive. All it can do is ask
the site to start a sync.

**Archive folders.** On a Clients row, paste one or more Drive folder
links into **Archive Folders**, one per line. Have each folder's
owner share it with the service account as a Viewer (HQ shows the
address to copy). The field is ours: it is in nothing a client is
sent.

**Local testing.** Add `--d1 VAULT_DB` to the wrangler command. The
local database and the local R2 are both separate from production's,
so nothing done locally shows up there. "Use in a post" is the
exception: it writes a real Idea to Notion, which a local server
shares, so tick **Hide from Client** on it and archive it.

---

## The installed app

The portal can be put on a home screen. There are two apps, and a
phone that has both holds two icons:

| | Blueprint | Blueprint HQ |
|---|---|---|
| For | a client | us |
| Manifest | `/portal-app.webmanifest` (a static file) | `/portal/hq/app.webmanifest` (admin only) |
| `id` | `/portal/start` | `/portal/hq` |
| Opens at | `/portal/start` | `/portal/hq` |
| Scope | `/portal/` | `/portal/` |
| Icon | the blue mark on white | the light mark on a dark tile, with the orange HQ badge |

Both are light: `theme_color` is the top bar (`#ffffff`, see
`.pt-topbar`), `background_color` is the page (`--pt-bg`, `#f6f9fc`),
and the iOS status bar style is `default`, which is dark text. The
icons and the iOS launch screens are in `public/brand/app/` and are
drawn from the brand SVGs by `node scripts/app-art.mjs`.

**Who can install which.** `PortalLayout` takes `app="hq"` on the HQ
page only. The HQ manifest is served to a signed-in admin and is a 404
to everyone else, and the page fetches it with the cookie
(`crossorigin="use-credentials"`). The client's portal and the sign-in
screen link the client manifest. HQ's scope is all of `/portal/` so a
client's portal opened from HQ stays inside the HQ window.

**The start address.** `/portal/start` shows nothing and sends the
device on: to its last portal, to HQ for one of us, or to
`/portal/login`. A client's session cookie is tied to their own path
and is not sent to `/portal/start`, so sign-in also sets `bp_last`,
which holds the slug they signed in to. **It is a routing hint and
never a sign-in.** The portal it points at checks the session itself
and sends anyone without the right one to the sign-in screen. Signing
out clears it.

**Sign-in inside the app.** A home-screen app on an iPhone does not
share Safari's sign-in, so everyone signs in once inside the app.
Every step is under `/portal/`, so the app never leaves its window:
`/portal/start` → `/portal/login` → the portal. `/portal/hq` shows the
sign-in screen in place when signed out (it used to be a 404, which
in the installed HQ app is a dead end), and one of us who signs in
there lands on HQ. Sessions last thirty days.

**The service worker.** One, `public/portal-sw.js`, for `/portal/`.
It is served from the site root with
`Service-Worker-Allowed: /portal/`, because a file under `/portal/`
would be answered by the portal's own routes.

- Pages (`/portal/start`, `/portal/login`, `/portal/hq`,
  `/portal/<slug>`, exactly those shapes) are fetched from the network
  every time, with `/portal-offline` shown when there is none. Pages
  are never stored.
- Static files (`/_astro/`, `/brand/`, `/fonts/`) are stored.
- **Everything else is not handled at all.** Data, previews, files,
  every POST, anything from another site, and any request with a
  `Range` header get no `respondWith`, so the browser makes them as if
  no worker were installed. A video's byte-range requests reach the
  server untouched.
- It is registered as `/portal-sw.js?v=<build>`, so each deploy is a
  new worker. It waits until the app is next opened, or until
  "Updated, tap to refresh" is tapped.

**The install card.** Once, at the top of the client's portal:
steps and a picture on an iPhone (Share, then Add to Home Screen), a
button on Android and desktop once the browser offers to install.
Dismissible, gone once installed, and never shown to one of us
looking at a client's portal.

### Notifications

Web Push, with no library: `src/server/push.ts` signs (VAPID) and
encrypts (RFC 8291) with WebCrypto, and the encryption is checked
against the RFC's own worked example in the tests. Devices are kept in
`PORTAL_KV`, a client's under `push:c:<slug>` and ours under `push:a`.
A device the push service says is gone is forgotten.

| Who | Is told | When |
|---|---|---|
| a client | New content needs your review | one of us moves a card to **Ready for Review** |
| a client | Now editing / Scheduled / Posted: [item] | one of us moves a card to Editing, Scheduled or Posted |
| a client (gym) | To shoot / Shot / Editing / Grading / Delivered: [delivery] | one of us moves a delivery to another stage |
| a client | Your monthly report is ready | a report is published, once per report |
| us | [Client] approved [item] | the client moves a card to Approved |
| us | [Client] requested changes on [item] | the client moves it from Ready for Review to Editing |
| us | [Client] filmed [item] / sent footage for [item] | the client moves a card to Filmed or Footage In |
| us | [Client] submitted a new idea | the client creates a card |
| us | Preview failed: [item] | a preview lands in Previews to fix |

- **Only the move fires, and only to the other side.** A caption,
  on-screen text, a date, a note or a link changed on a card or a
  delivery that stays where it is tells nobody. A move one of us makes
  is told to the client; a move the client makes is told to us; nobody
  is told about their own click (`statusNotice` in `src/data/push.ts`).
- **A status changed in Notion itself** never passes through our save,
  so HQ looks for it when it loads fresh data: a card in review that
  has not been announced is announced once. The first look after this
  shipped announced nothing.
- **Batching.** Review and progress each batch on their own. Cards
  that reach review within ten minutes of the first become one
  notification, and so do progress updates ("3 updates on your
  content"). There is no timer on Pages, so this
  is done on the device: each further card REPLACES the notification
  with the running count ("5 posts need your review").
- **A tap** opens that card (`/portal/<slug>#/content/<id>`), or the
  review list when there are several, inside the app.
- **Permission** is asked for only after a tap on "Turn on
  notifications" (the account menu in a client's portal, the
  Notifications button in HQ). On an iPhone it is offered only in the
  installed app, which is the only place an iPhone delivers them.
- **Each device** chooses which kinds it gets. A client's device can
  only ever hold a client's kinds, and one of us cannot subscribe from
  a client's portal.

---

## Intake forms

`/intake?client=SLUG` is one page and one endpoint, and it holds every
form. Which one a link opens is decided by the Clients row the slug
finds: Client Type first, then Tier. See `src/data/intake-forms.ts`.

- A form is a config: its steps and questions, its Notion database,
  and optionally which Clients fields it fills. `FORM_RULES` in that
  file says which client gets which. To give an artist tier its own
  questions, write its config and add one rule above the artist
  default.
- The artist form is the default and is the list in `src/data/intake.ts`.
  No slug, an unknown slug, or a slug on two rows, all get it.
- The gym form is `src/data/intake-cheer.ts` and writes to the **Gym
  Intake** database. Each `prop` is that database's column name: a
  rename or a new option has to be made in both places.
- The page asks `GET /api/intake/form?client=SLUG` which form to draw.
  The `POST` works it out again for itself from the same row and never
  trusts the browser about it.
- The gym form fills **Instagram** and **TikTok** on the Clients row,
  only when they are empty. The artist form writes nothing there.

## The Playbook Audit

A card at the top of the Playbooks tab, in the client portal and in HQ:
"why they are built this way", with View and Download. It is a
reference; nothing below it on the tab depends on it.

- **Two PDFs, both in R2.** The general one is at
  `shared/playbook-audit.pdf`. A client's own, when there is one, is at
  `playbook-audits/<slug>/playbook-audit.pdf`.
- **Which a client sees.** Their own if the Clients row's **Playbook
  Audit** (URL) points at one; otherwise the general one; otherwise no
  card. The property can also hold a link to a document elsewhere.
- **Uploading.** HQ → Playbooks. "Replace PDF" on the card is the
  general audit. Under it, "Custom audits" lists every client with a
  portal, with Upload, Replace and Remove for each. An upload stores the
  file and writes the Playbook Audit address on the client's row.
- **Auth.** There is no public address. A client reads a PDF through
  `/portal/<slug>/files/<key>`, which checks their session and only
  hands over their own prefixes plus `shared/`. HQ reads the general one
  at `/portal/hq/playbook-audit`, admin only. `shared/` is readable by
  every signed-in client, so only put there what all of them may see.

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

Three switches on the sheet change the plan: "Scheduled by hand: no
date changes" on a moment; "Move hand-set dates too" on a moment, for a
campaign being brought into line on purpose (a day the playbook would
already have passed is still left); and unticking a step to leave it
out. Adds only go to a campaign that still has an open step from that
playbook.

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
| `GOOGLE_SERVICE_ACCOUNT_JSON` | yes, for previews and report covers | The whole key file of the read-only service account. Reads the Drive files previews are made from. |
| `CF_ACCOUNT_ID` | yes, for video previews | The Cloudflare account Stream is on. The same variable PDF rendering already uses. |
| `CLOUDFLARE_STREAM_TOKEN` | yes, for video previews | An API token with Account → Stream → Edit and nothing else. Converts videos. |
| `VAPID_PUBLIC_KEY` | yes, for notifications | The public half of the push key pair. Handed to browsers when they subscribe. |
| `VAPID_PRIVATE_KEY` | yes, for notifications | The private half. Signs every notification. Changing the pair signs every device out of notifications. |
| `VAULT_CRON_SECRET` | yes, for the Vault's daily sync | A long random string, set here and on the `bpmktg-vault-sync` Worker. Lets the Worker ask for a sync. Without it the daily sync does not run; **Sync now** and opening HQ still do. |

There is also one **binding**, which is not a variable: a Workers KV
namespace bound as `PORTAL_KV`, in **Settings → Functions → KV namespace
bindings**, for Production and Preview both.

And one more for the Content Vault: a D1 database bound as `VAULT_DB`.
See "The Content Vault" above.

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
npx wrangler pages dev dist --kv PORTAL_KV --r2 REPORTS_BUCKET --d1 VAULT_DB --port 8788 --compatibility-date=2026-01-01
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

The Content Vault has its own:

```bash
npm run test:vault      # part of npm test
```

It covers the folder rules, who may change what, the store (its SQL
is run for real, against the SQLite that ships with Node), and the
sync against a stand-in for Drive: new, moved, removed and returning
files, a folder that will not list, a folder shared only by its link,
a sync cut off part way, and that Drive is only ever sent a GET.

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
