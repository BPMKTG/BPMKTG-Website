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

### Browser Rendering (`CF_ACCOUNT_ID` + `CF_BROWSER_TOKEN`)

Not a binding. **Pages Functions support only a subset of Workers
bindings and Browser Rendering is not one of them**, so there is no
`BROWSER` to add here however long you look for it in the dashboard.
The REST API does the same job over HTTP, which is what
`src/server/pdf.ts` calls.

Two values, both under **Settings → Variables and Secrets**, for
Production and Preview:

| Name | Type | Value |
|---|---|---|
| `CF_ACCOUNT_ID` | Plaintext | your account id, the hex string in any dashboard URL |
| `CF_BROWSER_TOKEN` | Secret | an API token, created as below |

Create the token at **My Profile → API Tokens → Create Token →
Create Custom Token**:

- Name: anything. `bpmktg-website · report PDFs` says which project
  breaks if you revoke it, which is the only job the name has.
- Permissions: **Account → Browser Run → Edit**. Cloudflare renamed
  Browser Rendering to Browser Run, so that is the row to look for.
- Account Resources: **Include → your account**
- Nothing else. This token can start a headless browser and that is
  all it should ever be able to do.

Copy it once, when it is shown. Cloudflare will not show it again.

The rename moved the API path too. `src/server/pdf.ts` calls
`/accounts/<id>/browser-run/pdf` and falls back to the older
`/browser-rendering/pdf` if that answers 404, because the product docs
and the API reference currently disagree about which one is live. If
the logs ever show the fallback firing, drop the dead path.

This works on the **Free plan**, which allows 10 minutes of browser
time a day. A report takes a few seconds to render, so that is on the
order of a hundred PDFs a day: enough for every client, every month,
with room to regenerate.

The **Workers Paid plan** removes that cap and raises the concurrency
from 3 browsers to 200. Worth having, not required. This project is on
it as of November 2026.

### No `nodejs_compat` needed

Worth writing down because it cost a deploy. The first version of this
used `@cloudflare/puppeteer` and a `BROWSER` binding, which was wrong
twice over: Pages cannot bind Browser Rendering at all, and the
package imports `node:buffer`, so the whole `functions/` Worker failed
to publish with:

```
Failed to publish your Function. Got error:
Uncaught Error: No such module "node:buffer".
```

Everything in `functions/` compiles into one Worker, so that took
sign-in and the portal down with it, not just the print routes. The
REST API needs no such dependency, so the flag is not needed and the
functions bundle is 232 KB rather than 1 MB.

If you ever add a package that wants Node built-ins, the flag goes in
**Settings → Runtime → Compatibility flags**, for both environments.

### R2 bucket (`REPORTS_BUCKET`)

R2 has to be switched on for the account before the Pages dashboard
will offer it as a binding at all. Until then it sits under "Discover
additional bindings" marked "Available on R2 subscription". Enabling
it costs nothing on its own: the free tier is 10 GB of storage, a
million writes and ten million reads a month, with free egress, and a
year of reports for every client is a few megabytes.

Enable it under **R2 Object Storage**, then create the bucket:

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

### The cover photo (`GOOGLE_SERVICE_ACCOUNT_JSON`)

Optional. Without it the cover falls back to the Clients row's Hero
Photo, and the blue grid after that. Nothing fails.

The report cover is the newest image in a `Report Covers` folder
inside the client's own shared Drive folder. Reading it needs a Google
service account, which is a robot Google account with no password and
no inbox: you share a folder with its address, the same way you would
share with a person, and it can read that folder and nothing else.

**Making one, once.**

1. [console.cloud.google.com](https://console.cloud.google.com) →
   project dropdown → **New Project**, named `blueprint-portal`.
2. Search for **Google Drive API** → **Enable**.
3. **APIs & Services → Credentials → Create Credentials → Service
   account**, named `portal-covers`. Skip the "grant this service
   account access to the project" step: it needs no role in the Cloud
   project, and its access to Drive comes from sharing, not from here.
4. On the new service account → **Keys → Add Key → Create new key →
   JSON**. A file downloads.
5. Pages → `bpmktg-website` → Settings → Variables and Secrets. Add
   `GOOGLE_SERVICE_ACCOUNT_JSON` as a **Secret**, value being the
   whole file. Do it for Production and again for Preview. Delete the
   downloaded file afterwards; the only copy that needs to exist is
   the one in Cloudflare.

**The address to share folders with:**

```
portal-covers@blueprint-portal-513817.iam.gserviceaccount.com
```

That is the `client_email` field in the JSON, also printed on the
Credentials page. It is an identifier, not a secret: knowing it grants
nothing, because access comes from the folders it has been shared on.

**If key creation is blocked.** Google's security baseline enforces
`iam.disableServiceAccountKeyCreation` on new organizations, and the
Keys tab answers "Service account key creation is disabled". The fix
is an override on this one project, and it needs **Organization Policy
Administrator**, which can only be granted on the organization, not on
a project:

1. [IAM](https://console.cloud.google.com/iam-admin/iam), resource
   picker switched to the **organization** → grant yourself
   **Organization Policy Administrator**.
2. [Organization
   Policies](https://console.cloud.google.com/iam-admin/orgpolicies),
   picker switched **back to the project** → search
   `disableServiceAccountKeyCreation` → for each match, plain and
   `managed` → **Manage policy → Override parent's policy →
   Enforcement Off → Set policy**.
3. Wait a couple of minutes, then create the key.

The override is left in place rather than reverted. It is scoped to
one project holding one read-only service account, and the policy
stays enforced everywhere else. Google documents the constraint as
blocking key *creation* and says nothing about keys that already
exist, so reverting it probably leaves the key working, but "probably"
is not a thing to build a monthly report on.

**Per client, once.** Share the client's main folder with that address
as **Viewer**, with notifications off. Inside that folder make a
subfolder called `Report Covers`, and drop photos in it. Then paste
the main folder's link into **Client Folder** on the Clients row.

The folders stay private throughout. Nothing is ever set to "anyone
with the link".

**If Workspace blocks the share.** Google Workspace can forbid sharing
outside the organisation, and a service account is outside it. Fix at
admin.google.com → **Apps → Google Workspace → Drive and Docs →
Sharing settings**, setting sharing outside the domain to **On** or
**On, but warn**. The narrower alternative is to put the client folder
in a Shared Drive and add the service account as a member of that
drive, which is governed by its own setting rather than the global
one.

### Already set, and still needed

`NOTION_TOKEN`, `RESEND_API_KEY`, `ADMIN_EMAILS`, `PORTAL_SECRET` and
the `PORTAL_KV` namespace. Publishing uses KV for the idempotency claim
that stops a double-click sending two emails, and for share-link
records, so a missing `PORTAL_KV` disables share links entirely.

### The checklist

- [ ] R2 enabled on the account
- [ ] bucket `bpmktg-reports` created, private
- [ ] `REPORTS_BUCKET` bound, Production
- [ ] `REPORTS_BUCKET` bound, Preview
- [ ] `CF_ACCOUNT_ID` set, Production
- [ ] `CF_ACCOUNT_ID` set, Preview
- [ ] `CF_BROWSER_TOKEN` set, Production
- [ ] `CF_BROWSER_TOKEN` set, Preview
- [ ] `PRINT_SIGNING_SECRET` set, Production
- [ ] `PRINT_SIGNING_SECRET` set, Preview
- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON` set, Production *(cover photos)*
- [ ] `GOOGLE_SERVICE_ACCOUNT_JSON` set, Preview
- [ ] each client's Drive folder shared with the service account, Viewer
- [ ] each client's `Client Folder` filled in on the Clients row

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

## 3b. The cover photo

### Where it comes from

In order, stopping at the first that works:

1. the newest image in `Report Covers`, inside the client's
   **Client Folder**
2. the Clients row's **Hero Photo** URL
3. the blue grid, which is the template's own background

"Newest" is by Drive's modified time. Only `Report Covers` directly
inside the client folder is looked at, case-insensitively, and only
jpg, png and webp count. A HEIC straight off a phone is skipped on
purpose: Chrome cannot draw one.

Two fields on Clients drive it:

| Property | Type | What it does |
|---|---|---|
| Client Folder | URL | the client's main shared Drive folder |
| Cover Focus | Select | Top / Center / Bottom. Which part survives the crop. Blank means Center |

**Client Folder is not Drive Folder and not Content Vault.** Drive
Folder is Blueprint's internal folder and Content Vault is a
spreadsheet. Pasting either one in does no harm, it just falls back to
the Hero Photo, but the cover will not be what you expected.

### What actually happens

Publish and Regenerate resolve the cover before they render. The
Worker signs in as the service account, finds the folder, picks the
newest image, pulls it down at 2400px, and writes a copy into R2 at
`reports/<slug>/covers/<fileId>.jpg`, with a small `current.json` next
to it recording what was chosen. The print route reads that pointer,
and nothing else.

Which means the renderer never talks to Google. A Drive permission
changed on a Tuesday cannot make a report fail to render on Wednesday;
the worst it can do is make the next Regenerate fall back.

**On the 2400px, and on what to put in the folder.** A Cloudflare
Worker has no image decoder, so it cannot resample a JPEG. Drive
renders its own images at whatever size you ask for, so the Worker
asks for 2400, then 1600 if that is declined, and stores what comes
back: typically a few hundred kilobytes. Only if Drive renders
neither does it fall back to the original file, and a file over 10MB
is then refused rather than stored, because a 29MB JPEG on a cover is
a render that times out.

So: **put a web-sized export in Report Covers, around 2400px wide.**
A straight-off-the-camera JPEG usually still works, because Drive
renders it down, but it is relying on Drive to do something it is not
contractually obliged to do. A 3MB export never has to find out.

Nothing here can fail a render. Every path ends in a cover and a log
line saying which source was used.

### Checking it

The Reports tab's publishing panel has a **Cover photo** row at the
top: the thumbnail, the filename and the source, cropped the way the
PDF will crop it. It reads the stored decision and does not call
Google, so opening the panel is cheap. It repaints after every Publish
and Regenerate, which are the two actions that do look at Drive.

A fallback says why on a second line, for example
`no "Report Covers" folder in the client folder`.

---

## 3c. The brand brief

One PDF per client, on the **Files** tab, stored in R2 at:

```
briefs/<clientSlug>/brand-brief.pdf
```

There is no Notion row behind it. The key is the whole record that it
exists, which is why uploading again replaces it: a client has one
brand brief, not a history of them.

To upload one, open the client's portal as Blueprint, go to **Files**,
and use **Upload PDF** in the orange panel. It has to be a PDF: the
first five bytes are checked rather than the filename, because the
file is served back as `application/pdf`. The cap is 25MB.

The client sees it as the first card on their Files tab, ahead of the
Drive folder, with its size on it. They download it through
`/portal/<slug>/files/briefs/<slug>/brand-brief.pdf`, behind the same
session check as their reports. R2 has no public URL here.

Uploading drops that client's cached payload, so the new brief is on
their next load rather than up to a minute later.

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
`reports/<slug>/`, `audits/<slug>/` or `briefs/<slug>/`; an admin can
fetch any. Keys are checked against a pattern before R2 is touched, so
a traversal never gets as far as a lookup.

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
