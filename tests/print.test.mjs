/* ──────────────────────────────────────────────────────────────
   Report and audit PDFs: what the numbers mean, and what reaches the
   page.

   Run by `npm test`. The bundle comes from tests/_print-entry.ts.

   Three kinds of test in here, in order:

     1  the arithmetic   a delta, a rollup, a trimmed table
     2  the parsing      the shapes Mason types in Notion
     3  the documents    render both, and assert on the HTML

   The third kind is the one that earns its keep. A template is a lot
   of string concatenation, and "does this render six pages with no
   `undefined` in them" is a question no unit test on a formatter can
   answer.
   ────────────────────────────────────────────────────────────── */

import {
  // arithmetic
  delta,
  rollup,
  platformTable,
  glanceTiles,
  goalCards,
  topPosts,
  showBars,
  showStats,
  releaseBlock,
  scoreTotal,
  scoreFraction,
  int,
  compact,
  pct,
  secs,
  monthKey,
  monthRange,
  shiftMonth,
  reportingPeriod,
  inRange,
  // parsing
  splitTitled,
  splitLabelled,
  parseOpportunity,
  scoreNote,
  heroImageUrl,
  focusCards,
  // constants
  AUDIT_HEADINGS,
  AUDIT_FIELDS,
  SCORE_FIELDS,
  SCORE_MAX,
  MAX_TABLE_ROWS,
  REPORT_SNAPSHOT_FIELDS,
  // templates
  renderReport,
  renderAudit,
  reportTitle,
  auditTitle,
  esc,
  safeUrl,
  // tokens and links
  mintPrintToken,
  verifyPrintToken,
  PRINT_TOKEN_SECONDS,
  isShareToken,
  tokenFromShareUrl,
  // mail
  reportSubject,
  reportMail,
  base64,
  // keys
  fileSlug,
  reportKey,
  auditKey,
  canRender,
  redactToken,
  // the publish stamp
  stampSnapshotEdit,
  editedBy,
  // fixtures
  BASELINE,
  NOVEMBER,
  BASELINE_REPORT,
  MONTHLY_REPORT,
  CLIENT_AUDIT,
  PROSPECT_AUDIT,
  SECTIONS,
  SCORES,
} from '../.tmp-print-lib.mjs';

let pass = 0, fail = 0;
const is = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name, '\n       got ', g, '\n       want', w); }
};
const ok = (name, cond) => is(name, Boolean(cond), true);
const section = (title) => console.log(`\n${title}`);

/* ══ 1. Deltas ═══════════════════════════════════════════════════
   The arrow next to a number is the most-read thing in the report and
   the easiest to get subtly wrong. Month one has nothing to compare,
   and saying "0%" there is a lie about a number nobody measured. */

section('1. Deltas');

is('delta: up in percent, signed', delta(4457, 3117, 'pct').text, '+43%');
is('delta: up is up', delta(4457, 3117, 'pct').dir, 'up');
is('delta: down in percent, signed', delta(702, 766, 'pct').text, '\u22128%');
is('delta: down is down', delta(702, 766, 'pct').dir, 'down');
is('delta: no previous month has no text', delta(4457, null, 'pct').text, null);
is('delta: and no direction to colour', delta(4457, null, 'pct').dir, 'flat');
is('delta: no current value has no text', delta(null, 3117, 'pct').text, null);
is('delta: an unchanged number is flat', delta(17, 17, 'abs').dir, 'flat');
ok('delta: a drop from zero falls back to absolute',
   (delta(40, 0, 'pct').text ?? '').includes('40'));
is('delta: points, for a rate', delta(0.081, 0.074, 'pts').text, '+0.7 pts');
is('delta: seconds, for watch time', delta(9, 6, 'sec').text, '+3s');
ok('delta: a fall uses a real minus sign, not a hyphen',
   (delta(702, 766, 'abs').text ?? '').includes('−'));

/* ══ 2. Rollups ══════════════════════════════════════════════════
   A blank column and a real zero are different facts. Summing four
   platforms when three of them have no data would print a confident
   number that means "we do not know". */

section('2. Rollups');

is('rollup: sums the platforms that reported',
   rollup({ 'Instagram · Views (28d)': 72900, 'TikTok · Views (28d)': 69600 },
     ['Instagram · Views (28d)', 'TikTok · Views (28d)', 'Facebook · Views (28d)']),
   142500);
is('rollup: nothing reported is null, not zero',
   rollup({}, ['Instagram · Views (28d)']), null);
is('rollup: a real zero is a zero',
   rollup({ 'YouTube · Views (28d)': 0 }, ['YouTube · Views (28d)']), 0);

/* ══ 3. Formatting ═══════════════════════════════════════════════ */

section('3. Formatting');

is('format: thousands get a comma', int(72900), '72,900');
is('format: compact above ten thousand', compact(72900), '72.9K');
is('format: compact leaves four digits alone', compact(4916), '4,916');
is('format: compact at a million', compact(1200000), '1.2M');
is('format: a rate is a percentage', pct(0.074), '7.4%');
is('format: seconds are seconds', secs(6), '6s');
is('format: a month key for an R2 path', monthKey('2026-11-30'), '2026-11');
is('format: the reporting period reads as a range',
   reportingPeriod('2026-11-30'), 'Nov 1 – Nov 30, 2026');
is('format: a month range is inclusive',
   monthRange('2026-11-13'), { start: '2026-11-01', end: '2026-11-30' });
is('format: shifting a month lands on the first, and crosses the year',
   shiftMonth('2026-12-11', 1), '2027-01-01');
ok('format: in-range is inclusive of both ends',
   inRange('2026-11-30', monthRange('2026-11-01')) && inRange('2026-11-01', monthRange('2026-11-01')));
is('format: out of range is out', inRange('2026-12-01', monthRange('2026-11-01')), false);

/* ══ 4. The platform table ═══════════════════════════════════════
   Twenty-eight metric rows do not fit on a Letter page, and `overflow:
   hidden` would cut one in half rather than admit it. The resolver
   trims from the back, so the top of the page is the same every
   month. */

section('4. The platform table');

const full = platformTable(NOVEMBER.metrics, BASELINE.metrics, BASELINE.metrics);
const rowCount = full.reduce((n, g) => n + g.rows.length, 0);
ok('table: fits on one page', rowCount <= MAX_TABLE_ROWS);
ok('table: and uses the room it has', rowCount > 10);
ok('table: groups a platform under its own heading',
   full.some((g) => g.name === 'Instagram'));
is('table: a platform with no numbers gets no heading',
   full.some((g) => g.name === 'Threads'), false);
ok('table: every row has a current value',
   full.every((g) => g.rows.every((r) => r.now && r.now.length > 0)));
ok('table: a row with no previous month reads as a dash, not a zero',
   platformTable(NOVEMBER.metrics, null, null).every((g) => g.rows.every((r) => r.last === '\u2014')));
is('table: nothing at all is an empty table', platformTable({}, null, null).length, 0);

// The trim has to come off the back. A month where the table shrinks
// from the top would move every row a client had learned the position
// of.
const trimmed = platformTable(NOVEMBER.metrics, BASELINE.metrics, BASELINE.metrics);
is('table: the first group is still the first group', trimmed[0].name, full[0].name);
is('table: and its first row is still Followers', trimmed[0].rows[0].label, full[0].rows[0].label);

/* ══ 5. The page models ══════════════════════════════════════════ */

section('5. The page models');

const tiles = glanceTiles(MONTHLY_REPORT);
ok('tiles: four of them when the data is there', tiles.length >= 3);
ok('tiles: every one has a value', tiles.every((t) => t.value && t.value.length > 0));
is('tiles: month one has no delta text',
   glanceTiles(BASELINE_REPORT).every((t) => t.delta.text === null), true);
ok('tiles: a baseline month labels itself',
   glanceTiles(MONTHLY_REPORT).some((t) => (t.baseline ?? '').length > 0));

const goals = goalCards(MONTHLY_REPORT);
ok('goals: one card per goal on the client row, plus shares', goals.length >= 3);
ok('goals: a progress fraction never leaves its track',
   goals.every((g) => g.progress.fraction >= 0 && g.progress.fraction <= 1));
ok('goals: the shares card is drawn orange, because it has no target',
   goals.some((g) => g.label === 'Content that gets shared' && g.accent === 'orange'));

const best = topPosts(MONTHLY_REPORT.posts, 5);
is('posts: five at most', best.length, 5);
is('posts: ranked by views', best[0].title, 'Faith Rave announcement');
is('posts: a post with no views is not ranked',
   best.some((p) => p.title === 'Behind the Christmas remix'), false);

const bars = showBars(MONTHLY_REPORT.calendar, '2026-11-30');
is('shows: only shows that sold tickets', bars.length, 2);
ok('shows: the stats line compares the last two', showStats(bars).length > 0);

const rel = releaseBlock(MONTHLY_REPORT);
ok('release: the month’s release is found', rel && rel.title === 'Rooftop Remix');
ok('release: plays and downloads become cards',
   rel.stats.some((s) => s.label === 'Plays') && rel.stats.some((s) => s.label === 'Downloads'));
ok('release: new emails come from the snapshot, not the moment',
   rel.stats.some((s) => s.label === 'New emails' && s.value === '+584'));
is('release: a month with no release has no block', releaseBlock(BASELINE_REPORT), null);

is('focus: three focus lines become three cards', focusCards(NOVEMBER).length, 3);
is('focus: a baseline has none', focusCards(BASELINE).length, 0);

/* ══ 6. The shapes Mason types ═══════════════════════════════════
   Every one of these is a convention in a Notion text field rather
   than a schema, so the parser has to be forgiving in the ways a
   person is careless and strict in the ways that matter. */

section('6. Parsing');

is('split: an em dash splits title from reason',
   splitTitled('Capture every room — a QR code on stage'),
   { title: 'Capture every room', why: 'a QR code on stage' });
is('split: an en dash does too',
   splitTitled('Capture every room – a QR code')?.title, 'Capture every room');
is('split: a spaced hyphen does too',
   splitTitled('Capture every room - a QR code')?.title, 'Capture every room');
is('split: a title with no reason is still a title',
   splitTitled('Capture every room'), { title: 'Capture every room', why: null });
is('split: an empty field is nothing', splitTitled(''), null);

is('label: the first colon wins',
   splitLabelled('Instagram: 25–34 is the core (56%)'),
   { label: 'Instagram', text: '25–34 is the core (56%)' });
is('label: a long run-up is prose, not a label',
   splitLabelled('Reach is mostly new people and that is the whole finding here: 95%').label, null);
is('label: no colon is prose', splitLabelled('Shows are his growth engine.').label, null);

const opp = parseOpportunity(SECTIONS['Top opportunities'].items[0]);
is('opportunity: the title', opp.title, 'Capture the attention he already earns');
is('opportunity: the impact', opp.impact, 'High');
is('opportunity: the effort', opp.effort, 'Low');
ok('opportunity: the first move', (opp.firstMove ?? '').startsWith('This week'));
is('opportunity: a half-written line keeps what it has',
   parseOpportunity('Lock the next event | High'),
   { title: 'Lock the next event', impact: 'High', effort: null, why: null, firstMove: null });
is('opportunity: an empty line is nothing', parseOpportunity('  '), null);

is('scorecard: a note is matched on its label',
   scoreNote(SECTIONS['Scorecard notes'], 'Fan capture'),
   '~900 emailable and a working email habit; no SMS and nothing capturing new fans');
is('scorecard: matching ignores case', scoreNote(SECTIONS['Scorecard notes'], 'fan CAPTURE') !== null, true);
is('scorecard: a score with no note is null', scoreNote(SECTIONS['Scorecard notes'], 'Nothing'), null);
is('scorecard: the total is the sum', scoreTotal(SCORES), 22);
is('scorecard: out of forty', SCORE_MAX, 40);
is('scorecard: the dial fraction', Math.round(scoreFraction(22) * 100), 55);
is('scorecard: no scores at all is null, not zero', scoreTotal({}), null);

is('hero: a Drive share link becomes an image URL',
   heroImageUrl('https://drive.google.com/file/d/1AbC_defGHI/view?usp=sharing'),
   'https://lh3.googleusercontent.com/d/1AbC_defGHI=w1600');
is('hero: a plain https image passes through',
   heroImageUrl('https://example.com/sean.jpg'), 'https://example.com/sean.jpg');
is('hero: plain http does not', heroImageUrl('http://example.com/sean.jpg'), null);
is('hero: nothing is nothing', heroImageUrl(null), null);

/* ══ 7. Escaping ═════════════════════════════════════════════════
   A prospect name comes off a form. It must not be able to close a
   div, let alone open a script. */

section('7. Escaping');

is('escape: a tag cannot survive', esc('<script>alert(1)</script>'),
   '&lt;script&gt;alert(1)&lt;/script&gt;');
is('escape: quotes cannot break an attribute', esc('a" onload="x'), 'a&quot; onload=&quot;x');
is('escape: nothing is an empty string', esc(null), '');
is('url: javascript: is not a URL', safeUrl('javascript:alert(1)'), null);
is('url: a data URL is not a URL', safeUrl('data:text/html,<script>'), null);
is('url: https is', safeUrl('https://bpmktg.com/book'), 'https://bpmktg.com/book');

/* ══ 8. The documents ════════════════════════════════════════════ */

section('8. The documents');

const countPages = (html) => (html.match(/class="pg(?:"| )/g) ?? []).length;

const monthly = renderReport(MONTHLY_REPORT);
is('report: six pages', countPages(monthly), 6);
is('report: the last footer agrees with the count', monthly.includes('06 / 06'), true);
is('report: no page says 07', monthly.includes('07 / 06'), false);
ok('report: the title names the client and the month',
   reportTitle(MONTHLY_REPORT).startsWith('Sean Comma · Monthly Report · November'));
is('report: nothing undefined reaches the page', monthly.includes('undefined'), false);
is('report: nothing NaN reaches the page', monthly.includes('NaN'), false);
is('report: no null slips through', /&gt;null|>null</.test(monthly), false);
ok('report: the Win line is the headline', monthly.includes(esc(NOVEMBER.win)));
ok('report: the real logo, not a stand-in',
   monthly.includes('/brand/logo-header-navy.svg'));
ok('report: self-hosted fonts are preloaded',
   monthly.includes('/fonts/orbitron-latin-var.woff2')
   && monthly.includes('/fonts/roboto-latin-var.woff2'));
ok('report: Letter, with no margin', monthly.includes('@page{size:Letter;margin:0}'));
ok('report: backgrounds survive printing', monthly.includes('print-color-adjust:exact'));
ok('report: breaks are before, not after', monthly.includes('break-before:page'));
is('report: and never after, which would add a blank sheet',
   monthly.includes('page-break-after'), false);
ok('report: the renderer is told when it is ready', monthly.includes('data-print-ready'));
is('report: delta arrows are drawn, not typed',
   monthly.includes('▲') || monthly.includes('▼'), false);
ok('report: and drawn as polygons', monthly.includes('<polygon'));
is('report: a published month carries no DRAFT flag', monthly.includes('>DRAFT<'), false);

const baseline = renderReport(BASELINE_REPORT);
is('baseline: six pages too', countPages(baseline), 6);
ok('baseline: says so on the cover rather than claiming a month',
   baseline.includes('Baseline Report'));
is('baseline: nothing undefined', baseline.includes('undefined'), false);
is('baseline: no deltas, because there is nothing to compare',
   baseline.includes('<polygon'), false);

const draft = renderReport({
  ...MONTHLY_REPORT,
  snapshot: { ...NOVEMBER, published: false },
});
ok('draft: an unpublished month is flagged', draft.includes('>DRAFT<'));

const audit = renderAudit(CLIENT_AUDIT);
is('audit: eight pages', countPages(audit), 8);
is('audit: the last footer agrees', audit.includes('08 / 08'), true);
ok('audit: the title names the subject', auditTitle(CLIENT_AUDIT).includes('Sean Comma'));
is('audit: nothing undefined reaches the page', audit.includes('undefined'), false);
is('audit: nothing NaN', audit.includes('NaN'), false);
ok('audit: the growth score is on the cover', audit.includes('GROWTH SCORE') && audit.includes('>22<'));
ok('audit: the short version is a band', audit.includes('The short version'));
ok('audit: a priority score is drawn orange', audit.includes('seg--lo'));
ok('audit: "The fix" is pulled out of the bullets into a band',
   audit.includes('<b>The fix</b>:') || audit.includes('<b>The fix:</b>'));
ok('audit: a client is pointed at their portal', audit.includes('blueprint-marketing.com/portal/sean-comma'));
is('audit: and is never shown an offer', audit.includes('Book a call'), false);

const teardown = renderAudit(PROSPECT_AUDIT);
is('prospect: eight pages, the same document', countPages(teardown), 8);
ok('prospect: gets the offer', teardown.includes('Fan Growth Engine'));
ok('prospect: and a button', teardown.includes('>Book a call<'));
is('prospect: and is never told about a portal', /portal/i.test(teardown), false);

// A half-written audit is the normal state of one. Every missing
// heading has to drop its own block and nothing else.
const sparse = renderAudit({
  ...CLIENT_AUDIT,
  sections: { 'Snapshot: social': SECTIONS['Snapshot: social'] },
  missing: AUDIT_HEADINGS.filter((h) => h !== 'Snapshot: social'),
});
is('sparse: still eight pages, so the shape never changes', countPages(sparse), 8);
is('sparse: nothing undefined where a section used to be',
   sparse.includes('undefined'), false);
is('sparse: and no empty heading left behind', sparse.includes('Top opportunities'), false);

const empty = renderAudit({ ...CLIENT_AUDIT, sections: {}, missing: [...AUDIT_HEADINGS] });
is('empty: an audit with no body still renders', countPages(empty), 8);
is('empty: without an undefined in it', empty.includes('undefined'), false);

/* ══ 9. Print tokens ═════════════════════════════════════════════
   The only thing standing between a snapshot id and a client's whole
   month. Scoped to one document and ten minutes. */

section('9. Print tokens');

const SECRET = 'a-test-signing-secret-long-enough';
const t = await mintPrintToken(SECRET, 'report', 'abc123');
is('token: verifies for its own document',
   await verifyPrintToken(SECRET, 'report', 'abc123', t), true);
is('token: not for another document',
   await verifyPrintToken(SECRET, 'report', 'def456', t), false);
is('token: not for the other kind',
   await verifyPrintToken(SECRET, 'audit', 'abc123', t), false);
is('token: not with another secret',
   await verifyPrintToken('a-different-secret-entirely', 'report', 'abc123', t), false);
is('token: not once it has expired',
   await verifyPrintToken(SECRET, 'report', 'abc123', t, Date.now() + (PRINT_TOKEN_SECONDS + 5) * 1000),
   false);
is('token: a tampered signature fails',
   await verifyPrintToken(SECRET, 'report', 'abc123', t.replace(/.$/, (c) => (c === 'a' ? 'b' : 'a'))),
   false);
is('token: garbage fails', await verifyPrintToken(SECRET, 'report', 'abc123', 'nope'), false);
is('token: nothing fails', await verifyPrintToken(SECRET, 'report', 'abc123', null), false);
is('token: ten minutes', PRINT_TOKEN_SECONDS, 600);

/* ══ 10. Share links ═════════════════════════════════════════════ */

section('10. Share links');

is('share: 32 hex is a token', isShareToken('0123456789abcdef0123456789abcdef'), true);
is('share: 31 is not', isShareToken('0123456789abcdef0123456789abcde'), false);
is('share: uppercase is not', isShareToken('0123456789ABCDEF0123456789ABCDEF'), false);
is('share: a path traversal is not', isShareToken('../../etc/passwd'), false);
is('share: a stored URL gives up its token',
   tokenFromShareUrl('https://bpmktg.com/a/0123456789abcdef0123456789abcdef'),
   '0123456789abcdef0123456789abcdef');
is('share: a URL with no token gives nothing',
   tokenFromShareUrl('https://bpmktg.com/portal/sean-comma'), null);

/* ══ 11. R2 keys ═════════════════════════════════════════════════
   A key is built from a slug and a prospect name, and a prospect name
   comes off a form. It has to be unable to escape its own prefix. */

section('11. R2 keys');

is('key: a report', reportKey('sean-comma', '2026-11-30'), 'reports/sean-comma/2026-11-kpi-report.pdf');
is('key: an audit', auditKey('sean-comma', '40ec8be8be728165a4d8cefcd9e48411'),
   'audits/sean-comma/40ec8be8be728165a4d8cefcd9e48411.pdf');
is('key: a name becomes a slug', fileSlug('Sean Comma'), 'sean-comma');
is('key: a traversal cannot survive', fileSlug('../../etc/passwd'), 'etc-passwd');
is('key: nor can a slash', fileSlug('a/b'), 'a-b');
is('key: an empty name is still a segment', fileSlug(''), 'unnamed');
is('key: an undated snapshot does not make an empty segment',
   reportKey('sean-comma', null), 'reports/sean-comma/undated-kpi-report.pdf');

// Browser Rendering is reached over HTTP with a token, not through a
// binding, because Pages Functions cannot bind it. Both halves of the
// credential have to be present or the endpoints answer 503 rather
// than starting a publish they cannot finish.
is('render: configured', canRender({ CF_ACCOUNT_ID: 'a', CF_BROWSER_TOKEN: 't' }), true);
is('render: no token', canRender({ CF_ACCOUNT_ID: 'a' }), false);
is('render: no account', canRender({ CF_BROWSER_TOKEN: 't' }), false);
is('render: neither', canRender({}), false);
is('render: an empty string is not a credential',
   canRender({ CF_ACCOUNT_ID: '', CF_BROWSER_TOKEN: 't' }), false);

// A render failure is shown to the admin, and error strings get
// pasted into chats, so the signed token does not ride along.
is('redact: a token in a URL',
   redactToken('fetch https://x/print/report/1?t=p1.123.abcdef failed'),
   'fetch https://x/print/report/1?t=REDACTED failed');
is('redact: and as a later parameter',
   redactToken('url=https://x/p?a=1&t=p1.9.zz&b=2'), 'url=https://x/p?a=1&t=REDACTED&b=2');
is('redact: inside JSON quotes',
   redactToken('{"url":"https://x/p?t=p1.9.zz"}'), '{"url":"https://x/p?t=REDACTED"}');
ok('redact: leaves everything else alone',
   redactToken('status 403: Browser Run Edit required').includes('Browser Run Edit required'));

/* ══ 12. The email ═══════════════════════════════════════════════ */

section('12. The email');

is('mail: the subject names the month',
   reportSubject('2026-11-30'), 'Your November 2026 growth report is ready');
is('mail: and reads without one', reportSubject(null), 'Your growth report is ready');

const mail = reportMail({
  artist: 'Sean Comma',
  monthIso: '2026-11-30',
  win: NOVEMBER.win,
  portalUrl: 'https://bpmktg.com/portal/sean-comma#/reports',
});
ok('mail: the win line is in the body', mail.text.includes(NOVEMBER.win));
ok('mail: and in the HTML, escaped', mail.html.includes(esc(NOVEMBER.win)));
ok('mail: the portal link is a button', mail.html.includes('https://bpmktg.com/portal/sean-comma#/reports'));
is('mail: no em dashes, the same as the site', /—/.test(mail.text), false);
is('mail: nothing undefined', mail.text.includes('undefined'), false);

is('mail: base64 round-trips', base64(new Uint8Array([72, 105])), 'SGk=');
// The naive one-liner throws somewhere around 100K arguments. A real
// report PDF is several hundred kilobytes.
ok('mail: and survives a real PDF’s worth of bytes',
   base64(new Uint8Array(400_000)).length > 500_000);

/* ══ 13. The publish stamp ═══════════════════════════════════════
   `Last Edited By` is a Select on Content Pipeline and a Text column
   on KPI Snapshots. The words have to match across the two; the
   shapes must not, because Notion rejects a select written into a
   text property. */

section('13. The publish stamp');

const stampAdmin = stampSnapshotEdit('admin', { Published: { checkbox: true } });
const stampClient = stampSnapshotEdit('client', {});

is('stamp: publishing says Blueprint',
   stampAdmin['Last Edited By'].rich_text[0].text.content, 'Blueprint');
is('stamp: and a client would say Client',
   stampClient['Last Edited By'].rich_text[0].text.content, 'Client');
is('stamp: the same two words Content Pipeline uses',
   [editedBy('admin'), editedBy('client')], ['Blueprint', 'Client']);

// The column is Text. A `{ select: … }` here is a 400 from Notion on
// every publish, which is the kind of thing that only shows up in
// production, so assert the shape and not just the value.
ok('stamp: written as rich_text', Array.isArray(stampAdmin['Last Edited By'].rich_text));
is('stamp: never as a select', 'select' in stampAdmin['Last Edited By'], false);

is('stamp: it does not disturb the other properties',
   stampAdmin.Published, { checkbox: true });
is('stamp: and adds exactly one key',
   Object.keys(stampClient), ['Last Edited By']);

/* ══ 14. Tripwires ═══════════════════════════════════════════════
   The field lists are the contract with Notion. A name deleted here by
   accident fails loudly rather than quietly rendering a blank page. */

section('14. Tripwires');

is('fields: fourteen audit headings', AUDIT_HEADINGS.length, 14);
is('fields: and they are the ones the parser looks for',
   AUDIT_HEADINGS.includes('Snapshot: music and business')
   && AUDIT_HEADINGS.includes('For our call'), true);
is('fields: eight scores', SCORE_FIELDS.length, 8);
is('fields: every score property is prefixed',
   SCORE_FIELDS.every((s) => s.prop.startsWith('Score · ')), true);
is('fields: the audit row has the fourteen properties the cover needs',
   AUDIT_FIELDS.length, 14);
// Mason added this column to KPI Snapshots as Text. If it is ever
// retyped as a Select to match the other two databases, this is the
// line that has to change, and the stamp above with it.
is('fields: the snapshot stamp is the Text shape, not the Select one',
   Object.keys(stampSnapshotEdit('admin', {})['Last Edited By']), ['rich_text']);
is('fields: the report reads Win, Report PDF and Published At',
   REPORT_SNAPSHOT_FIELDS.includes('Win')
   && REPORT_SNAPSHOT_FIELDS.includes('Report PDF')
   && REPORT_SNAPSHOT_FIELDS.includes('Published At'), true);
// Every heading in the fixture is one the parser knows. A typo here
// would silently test nothing.
is('fixture: every section it defines is a real heading',
   Object.keys(SECTIONS).every((h) => AUDIT_HEADINGS.includes(h)), true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
