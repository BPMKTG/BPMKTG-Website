# Reports and audits

Monthly KPI reports and growth audits, rendered from Notion into
branded PDFs. Mason previews a draft, clicks Publish, and the client
gets the PDF in their portal and an email. No design work per month.

Two documents come out of this:

| | Pages | Source | Who sees it |
|---|---|---|---|
| **Monthly report** | 6 | a KPI Snapshots row | the client, once published |
| **Growth audit** | 8 | an Audits row and its page body | the client, or a prospect by link |

---

## 1. What has to be set in Cloudflare

None of this is in the repo. There is no `wrangler.toml`, so every
binding below is added by hand in the Pages dashboard, under
**Workers & Pages → bpmktg-website → Settings**.

Set each one for **Production AND Preview**. A binding that exists only
in Production means Preview answers 404 on every Preview button, which
looks like a bug in the code and is not.

### The `nodejs_compat` flag, first

**Settings → Runtime → Compatibility flags**, add:

```
nodejs_compat
```

for Production **and** Preview, with a **compatibility date of
2024-09-23 or later**.

Do this before anything else. `@cloudflare/puppeteer` imports
`node:buffer`, and without the flag the Worker cannot resolve it, so
the deploy is rejected outright:

```
Failed to publish your Function. Got error:
Uncaught Error: No such module "node:buffer".
```

That failure is not limited to the print routes. The whole `functions/`
directory compiles into one Worker, so an unresolvable import at the
top of its module graph takes down sign-in and the portal with it. A
build that went green and a deploy that failed a minute later is this,
every time.

`wrangler pages functions build` warns about it locally and still exits
zero, so a clean local build proves nothing here. The flag is the fix.

### Browser Rendering (`BROWSER`)

**Settings → Bindings → Add → Browser Rendering**, named exactly
`BROWSER`.

This needs the **Workers Paid plan**. Without it the binding cannot be
added at all, and Publish fails with "Browser Rendering is not bound".

### R2 bucket (`REPORTS_BUCKET`)

Create the bucket first, under **R2 → Create bucket**:

```
bpmktg-reports
```

Leave it **private**. Nothing reads it over the public internet; both
routes that serve a PDF read it through the binding and check who is
asking first.

Then **Settings → Bindings → Add → R2 bucket**, named exactly
`REPORTS_BUCKET`, pointed at `bpmktg-reports`.

Keys inside the bucket:

```
reports/<client-slug>/<YYYY-MM>-kpi-report.pdf
audits/<client-slug or prospect-slug>/<audit-id>.pdf
```

Regenerating overwrites the same key, so a client's link never goes
stale and the bucket does not fill up with versions.

### `PRINT_SIGNING_SECRET`

**Settings → Variables and Secrets → Add → Secret**. Any random string
of 16 characters or more:

```
openssl rand -hex 32
```

This signs the ten-minute token the renderer uses to open `/print/*`.
If it is unset, the print routes fall back to the portal session
secret, which works; the only difference is that rotating one rotates
both at once.

### Already set, and still needed

`NOTION_TOKEN`, `RESEND_API_KEY`, `ADMIN_EMAILS`, `PORTAL_SECRET` and
the `PORTAL_KV` namespace. Publishing uses KV for the idempotency claim
that stops a double-click sending two emails, and for share-link
records, so a missing `PORTAL_KV` disables share links entirely.

### The checklist

- [ ] `nodejs_compat` flag set, Production
- [ ] `nodejs_compat` flag set, Preview
- [ ] compatibility date 2024-09-23 or later
- [ ] R2 bucket `bpmktg-reports` created, private
- [ ] `BROWSER` bound, Production
- [ ] `BROWSER` bound, Preview
- [ ] `REPORTS_BUCKET` bound, Production
- [ ] `REPORTS_BUCKET` bound, Preview
- [ ] `PRINT_SIGNING_SECRET` set, Production
- [ ] `PRINT_SIGNING_SECRET` set, Preview
- [ ] Workers Paid plan active

---

## 2. Notion: the Audits database

Audits live in their own database, `Audits`. The eight scores and the
short summaries are properties; the long sections are the page body.

### Properties

| Property | Type | What it does |
|---|---|---|
| Name | Title | internal, not printed |
| Client | Relation → Clients | set it for a client audit, leave it empty for a prospect |
| Prospect Name | Text | the name on the cover when there is no Client |
| Audience | Select: Client / Prospect | decides the closing band on page 8 |
| Status | Select: Draft / Ready / Sent | Draft prints a DRAFT flag on the cover |
| Audit Date | Date | the month on the cover |
| Data Window | Text | e.g. `28 days · Sep 28 – Oct 25` |
| Platforms Reviewed | Text | comma-separated, printed on the cover |
| Short Version | Text | the one-paragraph summary on page 2 |
| Positioning Read | Text | the tinted card on page 3 |
| Offer | Text | prospects only: the line inside the closing band |
| Book a Call Link | URL | prospects only: the button |
| Published | Checkbox | with Audience = Client, puts it in the portal |
| Audit PDF | URL | written by Generate PDF, do not fill it by hand |
| Share Link | URL | written by Create share link, do not fill it by hand |
| Score · *(eight of them)* | Number 1 to 5 | see below |

### The eight scores

Each is a number from 1 to 5. The cover prints their sum out of 40.
On the scorecard a 1 or a 2 renders orange, which is the page saying
"this is the thing to fix"; 3 to 5 render navy.

Leave one blank and that row prints as not scored rather than as a
zero, so a half-filled audit still renders.

### The fourteen headings

The long sections are written in the page body as **Heading 2** blocks,
matched by their exact text. Bullets, numbered lists, to-dos and tables
underneath a heading belong to it.

A heading that is missing is skipped. The page closes up around it and
the Generate PDF response lists what was missing, so a half-written
audit renders without breaking and you can see which parts are not
written yet. The matcher ignores case, smart apostrophes, repeated
spaces and a trailing colon, so `What's working:` matches `What's
working`.

---

## 3. Notion: the monthly report

Nothing new to create. The report reads the KPI Snapshots row you
already fill in each month, plus four fields that are report copy:

| Property | Type | Where it prints |
|---|---|---|
| Summary | Text | the note from Mason, page 2 |
| Win | Text | page 2, and the email body |
| Watch | Text | page 2 |
| Focus 1, Focus 2, Focus 3 | Text | page 6, as `Title — why it matters` |
| Release Notes | Text | page 5 |
| Published | Checkbox | written by Publish |
| Report PDF | URL | written by Publish |
| Published At | Date | written by Publish |
| Last Edited By | Text | written by Publish and by Regenerate |

Everything else on the report is read from rows that already exist:
the metrics from the same snapshot, the goals from the Clients row,
the top posts from Content Pipeline, the shows and releases from
Campaign Calendar.

### Last Edited By

Stamped `Blueprint` on every portal write to the row, which is the
same rule and the same vocabulary Content Pipeline and Campaign
Calendar use. Both Publish and Regenerate stamp it, so the column
answers "who last touched this from the portal" rather than meaning
one thing on some rows and another on the rest.

The name comes from the signed session, never from the request. In
practice it is always `Blueprint`, because a client cannot reach any
endpoint that writes to this database, but the role is threaded
through rather than hardcoded so the stamp keeps telling the truth if
that ever changes.

One difference worth knowing about. On Content Pipeline and Campaign
Calendar this column is a **Select**; on KPI Snapshots it is a
**Text** column. The words match, the API shapes do not, and writing a
select into a text property is a 400 from Notion on every publish. If
you ever retype this column as a Select to match the other two, change
`stampSnapshotEdit` in `src/server/report-publish.ts` with it; there is
a test pinned to the current shape that will fail first and tell you.

### Release numbers

Plays, Downloads and DJ Support are read off the Campaign Calendar
release moment, not off the snapshot. The monthly scheduled task fills
Plays and Downloads from SoundCloud; DJ Support is filled by hand. New
Emails on the releases page comes from the month's KPI snapshot
instead, because that is where Laylo and HubSpot growth already lands.

A card with no number behind it is hidden rather than printed as a
zero.

---

## 4. Publishing a report

Sign in to any client's portal as an admin and open **Reports**. The
orange panel at the bottom is admin-only; a client never receives it,
because it is grafted onto the payload per request rather than cached
with it.

Each draft snapshot has three buttons:

**Preview** opens the report in a tab, exactly as it will print. It is
a live render, so a correction in Notion shows up on a refresh. A draft
prints a DRAFT flag on the cover so a preview cannot be mistaken for
the real thing.

**Regenerate PDF** renders and stores the PDF without telling anyone.
Use it after a correction.

**Publish** does four things in this order:

1. renders the PDF and puts it in R2
2. writes Report PDF, Published At and Published back to Notion
3. the report appears in the client's Reports tab and Files
4. emails every address in that client's Portal Emails

The email is last on purpose. If anything before it fails, nothing has
been sent and you can click Publish again. The send itself claims a key
in KV **before** calling Resend, so a double-click is a no-op, while a
genuine retry after a failure still goes through.

Subject: `Your <Month> growth report is ready`. The body is the Win
line and a button to the portal, with the PDF attached.

---

## 5. Publishing an audit

Same panel, under the reports.

**Generate PDF** renders and stores it, and reports back any of the
fourteen headings that were missing.

For a **client** audit, tick Published in Notion with Audience = Client
and it joins their Reports tab.

For a **prospect**, click **Create share link**. That mints an
unguessable token and gives you a URL:

```
https://blueprint-marketing.com/a/<token>
```

That link renders the audit as a web page, and `?pdf=1` on the end
serves the stored PDF. It expires after 30 days, and **Revoke** kills
it immediately. Creating a second link revokes the first, so there is
only ever one live link per audit.

The token is a stored record, not an encoded id: it says nothing about
whose audit it opens, and revoking it deletes the only thing that
connects the two. Generate the PDF before creating the link, or the
button answers "no PDF yet" and refuses.

A prospect audit never mentions the portal. The closing band on page 8
is the only place the two audiences differ: a client gets the portal
line, a prospect gets the Offer and a Book a call button.

---

## 6. Who can read what

Print routes, `/print/report/<id>` and `/print/audit/<id>`, are never
public. They take either an admin cookie or a signed ten-minute token.
The portal admin cookie is scoped to `/portal`, so it does not reach
`/print` in production: that is why Preview is a redirect from
`/portal/<slug>/admin/...` that mints a token on the way.

Files are served from `/portal/<slug>/files/<key>`, behind the client
session. A client can only fetch keys that begin with their own
`reports/<slug>/` or `audits/<slug>/`; an admin can fetch any. Keys are
checked against a pattern before R2 is touched, so a traversal never
gets as far as a lookup.

Drafts never reach a client. The portal payload is built from a
whitelist of field names, and an unpublished snapshot is dropped before
the whitelist is even applied. A new field in Notion does not appear in
a client's browser until somebody adds it to that list on purpose.

---

## 7. Local development

```bash
npm run dev
```

renders the portal, but not the PDFs: Browser Rendering has no local
emulator, so Preview and Publish only work against a deployed
environment. Test those on Preview.

The templates themselves can be worked on without any of that. The
print tests render all four documents from fixtures and assert page
counts, footers, overflow and the two closing bands:

```bash
npm run test:print
```
