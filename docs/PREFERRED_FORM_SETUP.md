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

### Steps

1. Open the sheet above.
2. **Extensions → Apps Script**, delete what's there, paste all of this:

```javascript
/* ──────────────────────────────────────────────────────────────
   Blueprint Preferred: application intake, formatting, dashboard.

   doPost        runs itself, every time the form is submitted.
   setupWorkbook you run ONCE by hand, from the toolbar above.
                 Safe to re-run; it rebuilds the dashboard in place.
   ────────────────────────────────────────────────────────────── */

const DATA_TAB = 'Applications';
const DASH_TAB = 'Dashboard';

const BRAND = {
  deep:   '#264fa0',  // primary blue
  light:  '#b3e0f6',  // light blue
  tint:   '#eaf3fb',  // row banding tint
  white:  '#ffffff',
  muted:  '#5d6477',
  orange: '#e3703b',
};

/* ── helpers ─────────────────────────────────────────────────── */

function dataSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  // By name if it exists, otherwise the first tab that isn't the
  // dashboard. A CSV import names its tab "Untitled", and renaming a
  // tab should never be able to break intake.
  return ss.getSheetByName(DATA_TAB) ||
         ss.getSheets().filter(sh => sh.getName() !== DASH_TAB)[0];
}

function headers_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

/** Column letter for a header name, so formulas survive reordering. */
function colOf_(heads, name) {
  let n = heads.indexOf(name) + 1;
  if (n === 0) return null;
  let s = '';
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

/* ── intake ──────────────────────────────────────────────────── */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = dataSheet_();
    const data = JSON.parse(e.postData.contents);

    if (sheet.getLastRow() === 0) sheet.appendRow(Object.keys(data));

    let heads = headers_(sheet);

    // A new question on the form gets a column rather than being dropped.
    const unknown = Object.keys(data).filter(k => heads.indexOf(k) === -1);
    if (unknown.length) {
      sheet.getRange(1, heads.length + 1, 1, unknown.length).setValues([unknown]);
      heads = heads.concat(unknown);
    }

    sheet.appendRow(heads.map(h => (data[h] !== undefined ? data[h] : '')));

    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: String(err) }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

/* ── formatting + dashboard ──────────────────────────────────── */

function setupWorkbook() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = dataSheet_();
  sheet.setName(DATA_TAB);

  const heads = headers_(sheet);
  const lastCol = Math.max(sheet.getLastColumn(), 1);
  const ROWS = 2000;

  // Header row: brand blue, white, bold, frozen.
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(2);                 // keep Name + Email in view
  sheet.getRange(1, 1, 1, lastCol)
    .setBackground(BRAND.deep).setFontColor(BRAND.white).setFontWeight('bold')
    .setFontSize(10).setVerticalAlignment('middle').setWrap(true);
  sheet.setRowHeight(1, 44);

  // Alternating white / light blue, applied well past the current last
  // row so new applications inherit it without re-running this.
  sheet.getBandings().forEach(b => b.remove());
  sheet.getRange(1, 1, ROWS, lastCol).applyRowBanding()
    .setHeaderRowColor(BRAND.deep)
    .setFirstRowColor(BRAND.white)
    .setSecondRowColor(BRAND.tint)
    .setFooterRowColor(null);

  // Widths: prose gets room, the eight skill ratings stay narrow.
  const WIDE = {
    'submittedAt': 150, 'Name': 150, 'Email': 210, 'Primary market': 160,
    'Travel': 150, 'Phone': 130, 'Socials': 170, 'Portfolio': 230,
    'Notable work': 260, 'Delivery timeframe': 165, 'Skills summary': 280,
    'Other skills': 170, 'Currency': 90, 'Rate per show': 120,
    'Rate per festival day': 140, 'Travel costs': 160, 'Rate notes': 280,
    'About': 340,
  };
  heads.forEach((h, i) => sheet.setColumnWidth(i + 1, WIDE[h] || 86));

  sheet.getRange(2, 1, ROWS, lastCol)
    .setVerticalAlignment('top').setWrap(true).setFontSize(10);

  // Centre the skill ratings so they read as a block.
  ['Photography','Videography','Video editing','Color grading',
   'Motion graphics and VFX','Graphic design','Drone','Live streaming']
    .forEach(name => {
      const c = heads.indexOf(name) + 1;
      if (c > 0) sheet.getRange(2, c, ROWS, 1).setHorizontalAlignment('center');
    });

  const existing = sheet.getFilter();
  if (existing) existing.remove();
  sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 2), lastCol).createFilter();

  buildDashboard_(ss, heads);
  ss.setActiveSheet(ss.getSheetByName(DASH_TAB));
}

function kpi_(dash, row, col, label, formula) {
  dash.getRange(row, col, 1, 2).merge().setValue(label)
    .setFontSize(9).setFontColor(BRAND.muted).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  dash.getRange(row + 1, col, 1, 2).merge().setFormula(formula)
    .setFontSize(28).setFontColor(BRAND.deep).setFontWeight('bold')
    .setHorizontalAlignment('center').setVerticalAlignment('middle');
  dash.getRange(row, col, 2, 2).setBackground(BRAND.tint)
    .setBorder(true, true, true, true, false, false,
               BRAND.light, SpreadsheetApp.BorderStyle.SOLID);
}

function buildDashboard_(ss, heads) {
  const old = ss.getSheetByName(DASH_TAB);
  if (old) ss.deleteSheet(old);
  const dash = ss.insertSheet(DASH_TAB, 0);

  const c = {
    when:   colOf_(heads, 'submittedAt'),
    name:   colOf_(heads, 'Name'),
    market: colOf_(heads, 'Primary market'),
    travel: colOf_(heads, 'Travel'),
    turn:   colOf_(heads, 'Delivery timeframe'),
    photo:  colOf_(heads, 'Photography'),
    video:  colOf_(heads, 'Videography'),
  };
  const R = letter => "'" + DATA_TAB + "'!" + letter + '2:' + letter;

  dash.setHiddenGridlines(true);
  dash.setColumnWidths(1, 14, 92);

  dash.getRange('B2:K2').merge().setValue('Blueprint Preferred')
    .setFontSize(20).setFontWeight('bold').setFontColor(BRAND.deep);
  dash.getRange('B3:K3').merge()
    .setValue('Applications dashboard. Figures update themselves as rows arrive.')
    .setFontSize(10).setFontColor(BRAND.muted);

  // Row one of tiles
  kpi_(dash, 5, 2,  'TOTAL APPLICATIONS', '=COUNTA(' + R(c.name) + ')');
  kpi_(dash, 5, 5,  'LAST 7 DAYS',
    '=COUNTIF(' + R(c.when) + ',">="&TEXT(TODAY()-7,"yyyy-mm-dd"))');
  kpi_(dash, 5, 8,  'LAST 30 DAYS',
    '=COUNTIF(' + R(c.when) + ',">="&TEXT(TODAY()-30,"yyyy-mm-dd"))');
  kpi_(dash, 5, 11, 'MARKETS COVERED',
    '=IFERROR(COUNTA(UNIQUE(FILTER(' + R(c.market) + ',' + R(c.market) + '<>""))),0)');

  // Row two of tiles
  kpi_(dash, 8, 2,  'PHOTO 8+', '=COUNTIF(' + R(c.photo) + ',">=8")');
  kpi_(dash, 8, 5,  'VIDEO 8+', '=COUNTIF(' + R(c.video) + ',">=8")');
  kpi_(dash, 8, 8,  'DELIVER IN 48H',
    '=COUNTIF(' + R(c.turn) + ',"Same night*")+COUNTIF(' + R(c.turn) +
    ',"Within 24*")+COUNTIF(' + R(c.turn) + ',"Within 48*")');
  kpi_(dash, 8, 11, 'TRAVEL INTERNATIONALLY',
    '=COUNTIF(' + R(c.travel) + ',"Internationally")');

  // Breakdowns
  dash.getRange('B12').setValue('TOP MARKETS')
    .setFontSize(9).setFontWeight('bold').setFontColor(BRAND.muted);
  dash.getRange('B13').setFormula(
    '=IFERROR(QUERY(' + R(c.market) +
    ',"select Col1, count(Col1) where Col1 is not null group by Col1 order by count(Col1) desc limit 10 label count(Col1) \'Applicants\'",0),"No applications yet")');

  dash.getRange('F12').setValue('DELIVERY TIMEFRAME')
    .setFontSize(9).setFontWeight('bold').setFontColor(BRAND.muted);
  dash.getRange('F13').setFormula(
    '=IFERROR(QUERY(' + R(c.turn) +
    ',"select Col1, count(Col1) where Col1 is not null group by Col1 order by count(Col1) desc label count(Col1) \'Applicants\'",0),"No applications yet")');

  dash.getRange('J12').setValue('WILLING TO TRAVEL')
    .setFontSize(9).setFontWeight('bold').setFontColor(BRAND.muted);
  dash.getRange('J13').setFormula(
    '=IFERROR(QUERY(' + R(c.travel) +
    ',"select Col1, count(Col1) where Col1 is not null group by Col1 order by count(Col1) desc label count(Col1) \'Applicants\'",0),"No applications yet")');

  dash.getRange('B5:L25').setFontFamily('Roboto');
  dash.setFrozenRows(3);
}
```

3. In the Apps Script toolbar, choose **setupWorkbook** from the function
   dropdown and press **Run**. Authorise it when prompted. This formats the
   Applications tab and builds the Dashboard. You only do this once, though
   re-running it is safe.

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
