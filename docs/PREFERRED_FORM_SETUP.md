# Blueprint Preferred™ application form — setup

The page at `/blueprint-preferred` is live and **the form is wired**. The
Web3Forms key is set, so submissions arrive at `info@bpmktg.com` and the
applicant gets an inline success panel without leaving the page.

What is still optional is step 2, which also puts every application into a
spreadsheet so they are not only in an inbox.

---

## 1. Email delivery — DONE

`WEB3FORMS_ACCESS_KEY` is set in [`src/config/cta.ts`](../src/config/cta.ts).
If it ever needs replacing, get a new key by entering an address at
web3forms.com and swap that one constant.

**The key is public on purpose.** It ships in the page source. It only
identifies which inbox to deliver to; it cannot read anything or send on your
behalf, so it does not need hiding and must not be treated as a secret.

### What arrives

One email per application, subject `Blueprint Preferred application: <name>`,
with reply-to set to the applicant so you can answer directly from your inbox.

---

## 2. Also log to a Google Sheet

Applications in an inbox are hard to shortlist by market. This appends every
submission to a sheet as well.

**This half is best effort by design.** It is fired off separately from the
Web3Forms call and its result is ignored, so if the script breaks or Google is
down, the applicant still sees success and the application is still in your
email. Nothing can be lost by the spreadsheet failing.

### The sheet already exists

**Blueprint Preferred Applications**
https://docs.google.com/spreadsheets/d/1sMVZFrJpwLCtubwwbQHtMdy-MM_bs5veszUo8ikEpvg/edit

Row 1 already holds all 26 columns, one per question, generated from
`applicationSections` in `src/data/preferred.ts` so the headers cannot drift
from the keys the form actually submits. The order is: submittedAt, the You
section, Your work, the eight skills, Skills summary, Other skills, the rates
fields, then About.

Its tab is named **Untitled**, which is what a CSV import produces. That does
not matter: the script below takes the first sheet rather than a named one.

### Status: deployed

The script is **already created, pushed and deployed** with clasp, bound to the
sheet in the bpmktg account. You do not need to paste anything.

| | |
|---|---|
| Sheet | `1eFrKxFdGJfXq53uAyjHTtVenj7wyBgPCWFUXdFFrLYs` |
| Script | `1UkRwnAKKR0ipiuYll7WKiS2XpoB_wUldTS-d5EfM2CMlhl6hYe8xnjeI` |
| Deployment | `AKfycbx8SY1hdjEF_6NG93HgJjNwCtA_-AAYYa0Ul9lw_A6uxuKkYqDxFAmcXbMssVUw7nUq4A` |

The deployed source is committed at `docs/preferred-apps-script.js`. **Edit it
there and push with clasp**, not in the Apps Script editor, or the two drift.

### The one step clasp cannot do: authorise the script

A web app set to run as the deploying user cannot execute until that user has
granted its scopes once. Until then the endpoint answers 403 "You need
access", which is what it did on the first test.

Granting it, once, in the spreadsheet:

1. Open the sheet and reload it. A **Blueprint** menu appears in the menu bar.
2. **Blueprint → Format sheet and rebuild dashboard.**
3. Approve the authorisation dialog. Google will warn that the app is not
   verified: **Advanced → Go to Blueprint Preferred Intake (unsafe)**. That
   warning is expected for any script you own and have not submitted to
   Google for review; it is your own script in your own account.

That same click also formats the Applications tab and builds the Dashboard.

### Working on the script

```bash
cd <scratch>/preferred-script   # or any dir with .clasp.json
npx clasp push                  # upload changes
npx clasp redeploy AKfycbx8SY1hdjEF_6NG93HgJjNwCtA_-AAYYa0Ul9lw_A6uxuKkYqDxFAmcXbMssVUw7nUq4A
```

Use `redeploy` rather than `deploy`. A fresh `deploy` mints a **new** URL and
`APPLICATION_SHEET_WEBHOOK` in `src/config/cta.ts` would then point at a dead
deployment.

### Why the request looks odd in the code

It is sent `mode: 'no-cors'` with `Content-Type: text/plain`. Apps Script does
not return CORS headers, so a normal JSON POST triggers a preflight that fails.
`text/plain` keeps it a "simple request" that goes through without one. The
trade-off is that the browser cannot read the response, which is exactly why
this half is treated as best effort and Web3Forms remains the source of truth.

The body is still JSON; only the declared content type differs, and
`JSON.parse` in the script above handles it fine.

### Changing the fields later

Form fields live in [`src/data/preferred.ts`](../src/data/preferred.ts) in
`applicationSections`. Each field's `name` doubles as its Sheet column header.

If you add a field after the sheet has rows, the header row will not grow on
its own: add the column header manually to match the new field's `name`, or
clear the sheet and let the script rebuild headers from the next submission.

---

## Spam

The form carries Web3Forms' honeypot (`botcheck`), which catches most bots.
Web3Forms also runs its own spam filtering.

If junk does get through, the next step is Cloudflare Turnstile, which is free
and which this site is already positioned for, being on Cloudflare. Worth
adding only if it becomes a real problem; it is one more thing in the path.
