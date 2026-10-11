# Blueprint Preferred™ application form — setup

The page at `/blueprint-preferred` is built and live. The form is **not yet
wired**: until the Web3Forms key is set it renders an honest "applications
open soon" notice with a mailto fallback instead of inputs that would silently
drop submissions.

Two steps. The first takes two minutes and turns the form on. The second is
optional and puts applications in a spreadsheet as well as your inbox.

---

## 1. Turn the form on (required)

1. Go to **web3forms.com** and enter `info@bpmktg.com`.
2. They email you an **access key**, a UUID.
3. Put it in [`src/config/cta.ts`](../src/config/cta.ts):

```ts
export const WEB3FORMS_ACCESS_KEY = 'paste-the-key-here';
```

That is the whole thing. The form appears, submissions arrive at
`info@bpmktg.com`, and the applicant gets an inline success panel without
leaving the page.

**The key is public on purpose.** It ships in the page source. It only
identifies which inbox to deliver to; it cannot read anything or send on your
behalf, so it does not need hiding and must not be treated as a secret.

### What arrives

One email per application, subject `Blueprint Preferred application: <name>`,
with reply-to set to the applicant so you can answer directly from your inbox.

---

## 2. Also log to a Google Sheet (optional)

Applications in an inbox are hard to shortlist by market. This appends every
submission to a sheet as well.

**This half is best effort by design.** It is fired off separately from the
Web3Forms call and its result is ignored, so if the script breaks or Google is
down, the applicant still sees success and the application is still in your
email. Nothing can be lost by the spreadsheet failing.

### Steps

1. Make a Google Sheet. Name the first tab `Applications`.
2. **Extensions → Apps Script**, delete what's there, paste this:

```javascript
// Appends each Blueprint Preferred application as a row.
// Columns are created from the first submission's keys, then reused.
function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Applications');
    const data = JSON.parse(e.postData.contents);

    // First run: write the header row from the payload's keys.
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(Object.keys(data));
    }

    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    sheet.appendRow(headers.map(h => data[h] ?? ''));

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

3. **Deploy → New deployment → Web app.**
   - Execute as: **Me**
   - Who has access: **Anyone**

   Both matter. "Anyone" is what lets an anonymous visitor's browser post to
   it; without it every submission is silently rejected.
4. Copy the `/exec` URL into [`src/config/cta.ts`](../src/config/cta.ts):

```ts
export const APPLICATION_SHEET_WEBHOOK = 'https://script.google.com/macros/s/.../exec';
```

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
