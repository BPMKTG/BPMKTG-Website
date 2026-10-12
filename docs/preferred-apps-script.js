/* ──────────────────────────────────────────────────────────────
   Blueprint Preferred: application intake, formatting, dashboard.

   Deployed with clasp and bound to the applications spreadsheet.
   Source of truth lives in the website repo at
   docs/PREFERRED_FORM_SETUP.md; edit there and push with clasp
   rather than editing in the Apps Script editor, or the two drift.

   doPost         runs on every form submission. Builds the dashboard
                  itself the first time, so nothing has to be run by
                  hand for intake to work.
   setupWorkbook  formats the sheet and builds the dashboard. Exposed
                  as a Blueprint menu in the spreadsheet. Safe to
                  re-run; it rebuilds in place.
   ────────────────────────────────────────────────────────────── */

// Opened by id rather than getActiveSpreadsheet(): a web app request
// has no "active" spreadsheet in the way a menu click does, and this
// works identically in both contexts.
const SHEET_ID = '1eFrKxFdGJfXq53uAyjHTtVenj7wyBgPCWFUXdFFrLYs';

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

function book_() {
  return SpreadsheetApp.openById(SHEET_ID);
}

function dataSheet_(ss) {
  // By name if it exists, otherwise the first tab that isn't the
  // dashboard. A CSV import names its tab "Untitled", and renaming a
  // tab should never be able to break intake.
  return ss.getSheetByName(DATA_TAB) ||
         ss.getSheets().filter(function (sh) { return sh.getName() !== DASH_TAB; })[0];
}

function headers_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
}

/** Column letter for a header name, so formulas survive reordering. */
function colOf_(heads, name) {
  var n = heads.indexOf(name) + 1;
  if (n === 0) return null;
  var s = '';
  while (n > 0) { var m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = (n - m - 1) / 26; }
  return s;
}

/** submittedAt is the least interesting column to read first, so it
 *  lives at the far right. Moved before anything else in setup, so the
 *  dashboard formulas are built against the final column positions. */
function moveSubmittedAtLast_(sheet) {
  const heads = headers_(sheet);
  const idx = heads.indexOf('submittedAt');
  if (idx === -1 || idx === heads.length - 1) return;
  // Destination is evaluated before the column is lifted out, so moving
  // to the far right means "one past the current last column".
  sheet.moveColumns(sheet.getRange(1, idx + 1, sheet.getMaxRows(), 1), heads.length + 1);
}

/* ── menu ────────────────────────────────────────────────────── */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Blueprint')
    .addItem('Format sheet and rebuild dashboard', 'setupWorkbook')
    .addToUi();
}

/* ── intake ──────────────────────────────────────────────────── */

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = book_();
    const sheet = dataSheet_(ss);
    const data = JSON.parse(e.postData.contents);

    if (sheet.getLastRow() === 0) sheet.appendRow(Object.keys(data));

    var heads = headers_(sheet);

    // A new question on the form gets a column rather than being dropped.
    const unknown = Object.keys(data).filter(function (k) { return heads.indexOf(k) === -1; });
    if (unknown.length) {
      sheet.getRange(1, heads.length + 1, 1, unknown.length).setValues([unknown]);
      heads = heads.concat(unknown);
    }

    sheet.appendRow(heads.map(function (h) {
      return data[h] !== undefined ? data[h] : '';
    }));

    // First application on a sheet nobody has set up: do it now, so
    // intake never depends on someone having clicked a menu first.
    if (!ss.getSheetByName(DASH_TAB)) {
      try { setupWorkbook(); } catch (ignored) {}
    }

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
  const ss = book_();
  const sheet = dataSheet_(ss);
  sheet.setName(DATA_TAB);

  moveSubmittedAtLast_(sheet);

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
  sheet.getBandings().forEach(function (b) { b.remove(); });
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
    'About': 340
  };
  heads.forEach(function (h, i) { sheet.setColumnWidth(i + 1, WIDE[h] || 86); });

  sheet.getRange(2, 1, ROWS, lastCol)
    .setVerticalAlignment('top').setWrap(true).setFontSize(10);

  // Centre the skill ratings so they read as a block.
  ['Photography', 'Videography', 'Video editing', 'Color grading',
   'Motion graphics and VFX', 'Graphic design', 'Drone', 'Live streaming']
    .forEach(function (name) {
      var c = heads.indexOf(name) + 1;
      if (c > 0) sheet.getRange(2, c, ROWS, 1).setHorizontalAlignment('center');
    });

  // Deliberately no filter. A filter tints the column letters and row
  // numbers green, and that green was the one thing the owner did not
  // want. Data > Create a filter adds one back any time, at the cost of
  // the green returning.
  const existing = sheet.getFilter();
  if (existing) existing.remove();

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
    video:  colOf_(heads, 'Videography')
  };
  const R = function (letter) { return "'" + DATA_TAB + "'!" + letter + '2:' + letter; };

  dash.setHiddenGridlines(true);
  dash.setColumnWidths(1, 14, 92);

  dash.getRange('B2:K2').merge().setValue('Blueprint Preferred')
    .setFontSize(20).setFontWeight('bold').setFontColor(BRAND.deep);
  dash.getRange('B3:K3').merge()
    .setValue('Applications dashboard. Figures update themselves as rows arrive.')
    .setFontSize(10).setFontColor(BRAND.muted);

  kpi_(dash, 5, 2,  'TOTAL APPLICATIONS', '=COUNTA(' + R(c.name) + ')');
  kpi_(dash, 5, 5,  'LAST 7 DAYS',
    '=COUNTIF(' + R(c.when) + ',">="&TEXT(TODAY()-7,"yyyy-mm-dd"))');
  kpi_(dash, 5, 8,  'LAST 30 DAYS',
    '=COUNTIF(' + R(c.when) + ',">="&TEXT(TODAY()-30,"yyyy-mm-dd"))');
  kpi_(dash, 5, 11, 'MARKETS COVERED',
    '=IFERROR(COUNTA(UNIQUE(FILTER(' + R(c.market) + ',' + R(c.market) + '<>""))),0)');

  kpi_(dash, 8, 2,  'PHOTO 8+', '=COUNTIF(' + R(c.photo) + ',">=8")');
  kpi_(dash, 8, 5,  'VIDEO 8+', '=COUNTIF(' + R(c.video) + ',">=8")');
  kpi_(dash, 8, 8,  'DELIVER IN 48H',
    '=COUNTIF(' + R(c.turn) + ',"Same night*")+COUNTIF(' + R(c.turn) +
    ',"Within 24*")+COUNTIF(' + R(c.turn) + ',"Within 48*")');
  kpi_(dash, 8, 11, 'TRAVEL INTERNATIONALLY',
    '=COUNTIF(' + R(c.travel) + ',"Internationally")');

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
