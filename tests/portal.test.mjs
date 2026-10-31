import {
  // shaping
  cleanItemTitle,
  isVisibleToClient,
  isMetricProp,
  isEngagementMetric,
  formatEngagement,
  isOpenClientTodo,
  canClientSetStep,
  isStepClientStatus,
  isStepDone,
  STEP_CLIENT_STATUSES,
  // moving things
  canSetStepDate,
  daysBetween,
  isIsoDay,
  isMoveDays,
  movesWithMoment,
  shiftIsoDay,
  planMomentMove,
  reverseWrites,
  dateProperty,
  isMoveUndo,
  MAX_CASCADE_STEPS,
  MAX_MOVE_DAYS,
  MOVE_LIMIT,
  WRITE_LIMIT,
  STEP_FROZEN_STATUSES,
  termProgress,
  parseNotionDate,
  goalProgress,
  songsAtTarget,
  showsInMonth,
  weeklyPaceNeeded,
  cleanText,
  showsPerMonthAverage,
  daysUntil,
  displayMetricLabel,
  isPercentMetric,
  formatMetricValue,
  compactNumber,
  metricSection,
  metricDefinition,
  sumMetrics,
  VIEW_ROLLUP,
  CLIENT_NEVER_SEND,
  CALENDAR_NEVER_SEND,
  SNAPSHOT_NEVER_SEND,
  // content
  CONTENT_FIELDS,
  CONTENT_NEVER_SEND,
  CONTENT_STATUSES,
  contentPhase,
  CLIENT_STATUS_MOVES,
  CLIENT_EDITABLE,
  CLIENT_READ_ONLY,
  canClientMove,
  cleanPatchText,
  cleanPatchUrl,
  cleanPatchDate,
  cleanPatchSelect,
  cleanPatchMulti,
  cleanPatchRelation,
  normaliseId,
  stageOf,
  isIdea,
  MAX_TITLE,
  MAX_TEXT,
  // writes
  buildContentProperties,
  stampEdit,
  isSameOrigin,
  isJsonRequest,
  // auth
  timingSafeEqual,
  sha256Hex,
  mintClientSession,
  mintAdminSession,
  verifyClientSession,
  verifyAdminSession,
  readViewer,
  sessionCookie,
  adminCookie,
  clearCookies,
  clearAdminCookie,
  clearClientCookie,
  readCookie,
  isValidSlug,
  portalNotFound,
  // signing in
  normaliseEmail,
  looksLikeEmail,
  parseEmailList,
  parseAdminEmails,
  makeCode,
  isCodeShaped,
  hashCode,
  putCode,
  takeCode,
  checkCode,
  overRequestLimit,
  codeText,
  CODE_ATTEMPTS,
  CODE_REQUESTS_PER_HOUR,
  // notion
  findClientBySlug,
  findClientByEmail,
  fetchPortalClients,
  fetchCalendar,
  fetchSnapshots,
  CLIENTS_DB,
  CALENDAR_DB,
  SNAPSHOTS_DB,
} from '../.tmp-portal-lib.mjs';

let pass = 0, fail = 0;
const is = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log('  ok  ', name); }
  else { fail++; console.log('  FAIL', name, '\n       got ', g, '\n       want', w); }
};
const ok = (name, cond) => is(name, Boolean(cond), true);
const section = (title) => console.log(`\n${title}`);

/* ══ 1. Calendar visibility ══════════════════════════════════════
   The rule the whole portal hangs on. A row the client should not see
   reaching this list is the worst bug this feature can have. */

const vis = (over = {}) => isVisibleToClient({
  isPlaybook: false, hideFromClient: false,
  kind: 'Step', type: 'Content', owner: 'Blueprint',
  ...over,
});

is('visible: a content step shows', vis(), true);
is('visible: a moment shows', vis({ kind: 'Moment', type: null }), true);
is('visible: a client-owned admin step shows', vis({ type: 'Admin', owner: 'Client' }), true);
is('visible: a Blueprint admin step is hidden', vis({ type: 'Admin', owner: 'Blueprint' }), false);
is('visible: a playbook template is hidden', vis({ isPlaybook: true }), false);
is('visible: Hide from Client wins over everything',
   isVisibleToClient({ isPlaybook: false, hideFromClient: true, kind: 'Moment', type: 'Content', owner: 'Client' }),
   false);
is('visible: Is Playbook wins even for a client-owned moment',
   isVisibleToClient({ isPlaybook: true, hideFromClient: false, kind: 'Moment', type: 'Content', owner: 'Client' }),
   false);
is('visible: nothing matching any of the three is hidden',
   vis({ kind: 'Step', type: 'Admin', owner: 'Blueprint' }), false);
is('visible: nulls do not accidentally qualify',
   vis({ kind: null, type: null, owner: null }), false);

/* ══ 2. Title cleanup ════════════════════════════════════════════ */

is('title: artist prefix stripped',
   cleanItemTitle('Sean Comma · Announce the single', 'Sean Comma'),
   { title: 'Announce the single', tentative: false });
is('title: prefix match is case-insensitive',
   cleanItemTitle('SEAN COMMA · Teaser 1', 'Sean Comma'),
   { title: 'Teaser 1', tentative: false });
is('title: a different artist prefix is left alone',
   cleanItemTitle('Other Act · Teaser 1', 'Sean Comma'),
   { title: 'Other Act · Teaser 1', tentative: false });
is('title: a mid-title dot is not a prefix',
   cleanItemTitle('Announce · the single', 'Sean Comma'),
   { title: 'Announce · the single', tentative: false });
is('title: TENTATIVE becomes a flag, not words',
   cleanItemTitle('Red Rocks (TENTATIVE)', 'Sean Comma'),
   { title: 'Red Rocks', tentative: true });
is('title: TENTATIVE mid-string is removed cleanly',
   cleanItemTitle('Red Rocks (TENTATIVE) support slot', 'Sean Comma'),
   { title: 'Red Rocks support slot', tentative: true });
is('title: prefix and tentative together',
   cleanItemTitle('Sean Comma · Red Rocks (tentative)', 'Sean Comma'),
   { title: 'Red Rocks', tentative: true });
is('title: empty artist never strips anything',
   cleanItemTitle('Sean Comma · Teaser', ''),
   { title: 'Sean Comma · Teaser', tentative: false });

/* ══ 3. Engagement and metric naming ═════════════════════════════ */

is('engagement: detected by name', isEngagementMetric('Instagram · Engagement'), true);
is('engagement: followers are not engagement', isEngagementMetric('Instagram · Followers'), false);
is('engagement: 0.042 renders as 4.2%', formatEngagement(0.042), '4.2%');
is('engagement: 0 renders as 0.0%', formatEngagement(0), '0.0%');
is('engagement: 0.1 renders as 10.0%', formatEngagement(0.1), '10.0%');
is('engagement: rounds to one decimal', formatEngagement(0.04267), '4.3%');

is('metric: platform metrics pass', isMetricProp('TikTok · Avg Views'), true);
is('metric: the named extras pass', isMetricProp('Email + SMS List'), true);
is('metric: Shows This Month passes', isMetricProp('Shows This Month'), true);
is('metric: an unlisted plain name does not pass', isMetricProp('Monthly Rate'), false);
is('metric: Notes does not pass', isMetricProp('Notes'), false);

/* ══ 4. To-dos and term progress ═════════════════════════════════ */

is('todo: client-owned and open', isOpenClientTodo({ owner: 'Client', status: 'Not Started' }), true);
is('todo: client-owned and done is closed', isOpenClientTodo({ owner: 'Client', status: 'Done' }), false);
is('todo: client-owned and skipped is closed', isOpenClientTodo({ owner: 'Client', status: 'Skipped' }), false);
is('todo: Blueprint-owned is never a client to-do', isOpenClientTodo({ owner: 'Blueprint', status: 'Not Started' }), false);

// The term is INCLUSIVE of both end months. Sean's real term, Nov 1 to
// Apr 30, is six months: Nov, Dec, Jan, Feb, Mar, Apr. Counting the
// difference in month index alone gives five, which was the bug.
const sean = termProgress('2026-11-01', '2027-04-30', new Date(2026, 11, 10));
is('term: Nov 1 to Apr 30 is six months, not five', sean.total, 6);
is('term: December is month 2', sean.month, 2);
is('term: mid-term reports during', sean.state, 'during');

const midTerm = termProgress('2026-09-01', '2027-03-01', new Date(2026, 9, 15));
is('term: month 2 of 7', [midTerm.month, midTerm.total], [2, 7]);
// Sep 1 to Mar 1 inclusive of the final day is 182 days; Oct 15 is day 44.
is('term: the bar is a real fraction of the term', midTerm.fraction.toFixed(3), (44 / 182).toFixed(3));

// Before the term there is no month to be in yet.
const early = termProgress('2026-11-01', '2027-04-30', new Date(2026, 9, 26));
is('term: before the start reports before', early.state, 'before');
is('term: before the start counts the days', early.daysUntilStart, 6);
is('term: before the start has an empty bar', early.fraction, 0);
is('term: before the start is not month 1', early.month, 0);

// The last day of the term is still inside it.
const lastDay = termProgress('2026-11-01', '2027-04-30', new Date(2027, 3, 30));
is('term: the final day is still during', lastDay.state, 'during');
// Not 1: on the MORNING of the last day the term is not over yet. It
// reaches 1 only once that day has passed, which is the 'after' case.
is('term: the final day is nearly full but not complete',
   lastDay.fraction > 0.99 && lastDay.fraction < 1, true);
is('term: the final day is the last month', lastDay.month, 6);

const done = termProgress('2026-11-01', '2027-04-30', new Date(2027, 4, 1));
is('term: past the end reports after', done.state, 'after');
is('term: past the end is full', [done.month, done.fraction], [6, 1]);

is('term: missing dates give nothing', termProgress(null, '2027-03-01'), null);
is('term: an end before the start gives nothing', termProgress('2027-03-01', '2026-09-01'), null);

// A date-only value must not drift a day backwards west of Greenwich.
is('date: YYYY-MM-DD parses as a local day',
   [parseNotionDate('2026-10-22').getFullYear(), parseNotionDate('2026-10-22').getMonth(), parseNotionDate('2026-10-22').getDate()],
   [2026, 9, 22]);

/* ══ 5. Every failure is the same failure ═══════════════════════ */

// There is no key any more, so there is nothing to compare. What is
// left is the rule that outlived it: one response, for everything.
const bodies = await Promise.all([portalNotFound(), portalNotFound(), portalNotFound()].map(r => r.text()));
const statuses = [portalNotFound().status, portalNotFound().status, portalNotFound().status];
is('404: identical bodies', new Set(bodies).size, 1);
is('404: identical statuses', new Set(statuses).size, 1);
is('404: says nothing about why', bodies[0], JSON.stringify({ ok: false, error: 'not_found' }));

ok('compare: equal strings match', await timingSafeEqual('abc', 'abc'));
is('compare: different lengths do not match', await timingSafeEqual('abc', 'abcd'), false);

/* ══ 6. Sessions ═════════════════════════════════════════════════ */

const SECRET = 'test-secret-value-at-least-16';
const WHO = (await sha256Hex('sean@seancomma.com')).slice(0, 16);
const token = await mintClientSession(SECRET, 'sean-comma', WHO);

is('session: a fresh token verifies, and says who',
   await verifyClientSession(SECRET, 'sean-comma', token), WHO);
is('session: a token for another slug is rejected',
   await verifyClientSession(SECRET, 'other-act', token), null);
is('session: a token signed with another secret is rejected',
   await verifyClientSession('a-completely-different-secret', 'sean-comma', token), null);
is('session: a tampered signature is rejected',
   await verifyClientSession(SECRET, 'sean-comma', token.replace(/.$/, c => (c === 'a' ? 'b' : 'a'))), null);
is('session: a tampered who is rejected',
   await verifyClientSession(SECRET, 'sean-comma', token.replace(WHO, 'f'.repeat(16))), null);
is('session: no token is rejected', await verifyClientSession(SECRET, 'sean-comma', null), null);
is('session: garbage is rejected', await verifyClientSession(SECRET, 'sean-comma', 'nonsense'), null);
is('session: an expired token is rejected',
   await verifyClientSession(SECRET, 'sean-comma',
     await mintClientSession(SECRET, 'sean-comma', WHO, Date.now() - 40 * 24 * 3600 * 1000)),
   null);

// The old shared-link sessions have no version prefix. Every one of
// them has to stop working, or the links they came from still work.
is('session: a token in the old format is rejected',
   await verifyClientSession(SECRET, 'sean-comma', '99999999999.' + 'a'.repeat(64)), null);

const adminToken = await mintAdminSession(SECRET, WHO);
is('session: an admin token verifies', await verifyAdminSession(SECRET, adminToken), WHO);
is('session: an admin token is not a client session',
   await verifyClientSession(SECRET, 'sean-comma', adminToken), null);
is('session: a client token is not an admin session',
   await verifyAdminSession(SECRET, token), null);

/* ── who the request says you are ───────────────────────────── */

const asRequest = (cookie) =>
  new Request('https://blueprint-marketing.com/portal/sean-comma/data',
    cookie ? { headers: { Cookie: cookie } } : undefined);

is('viewer: nobody, with no cookie', await readViewer(asRequest(''), SECRET, 'sean-comma'), null);
is('viewer: a client, with their own cookie',
   (await readViewer(asRequest(`bp_portal=${token}`), SECRET, 'sean-comma'))?.role, 'client');
is('viewer: nobody, with a cookie for another client',
   await readViewer(asRequest(`bp_portal=${token}`), SECRET, 'other-act'), null);
is('viewer: an admin, in any client\'s portal',
   (await readViewer(asRequest(`bp_admin=${adminToken}`), SECRET, 'other-act'))?.role, 'admin');
is('viewer: the admin cookie wins over a client one',
   (await readViewer(asRequest(`bp_portal=${token}; bp_admin=${adminToken}`), SECRET, 'sean-comma'))?.role,
   'admin');
is('viewer: a forged admin cookie is nobody',
   await readViewer(asRequest('bp_admin=v2.99999999999.abc.deadbeef'), SECRET, 'sean-comma'), null);

const cookie = sessionCookie('sean-comma', token);
ok('cookie: scoped to the one client', cookie.includes('Path=/portal/sean-comma'));
ok('cookie: HttpOnly', cookie.includes('HttpOnly'));
ok('cookie: Secure', cookie.includes('Secure'));
ok('cookie: SameSite=Lax', cookie.includes('SameSite=Lax'));
ok('cookie: the admin cookie reaches every portal', adminCookie(adminToken).includes('Path=/portal;'));
ok('cookie: the admin cookie is HttpOnly too', adminCookie(adminToken).includes('HttpOnly'));
is('cookie: read back out', readCookie(`a=1; bp_portal=${token}; b=2`, 'bp_portal'), token);
is('cookie: a missing cookie reads as null', readCookie('a=1', 'bp_portal'), null);

// A sign-out has to clear both, or an admin who logs out is still an
// admin on the next client's portal.
// Signing in as one has to put the other out, or a stale admin cookie
// on a shared laptop silently outranks the client's own session.
ok('logout: a client sign-in clears the admin cookie',
   clearAdminCookie().includes('bp_admin=;') && clearAdminCookie().includes('Max-Age=0'));
ok('logout: an admin sign-in clears the client cookie',
   clearClientCookie('sean-comma').includes('Path=/portal/sean-comma')
   && clearClientCookie('sean-comma').includes('Max-Age=0'));

const cleared = clearCookies('sean-comma');
is('logout: clears two cookies', cleared.length, 2);
ok('logout: expires the client cookie', cleared[0].includes('bp_portal=;') && cleared[0].includes('Max-Age=0'));
ok('logout: expires the admin cookie', cleared[1].includes('bp_admin=;') && cleared[1].includes('Max-Age=0'));

/* ══ 6b. Signing in ══════════════════════════════════════════════ */

is('email: trimmed and lowercased', normaliseEmail('  Sean@SeanComma.com '), 'sean@seancomma.com');
is('email: a non-string is empty', normaliseEmail(null), '');
// Two addresses that differ only by a dot or a +tag are two people as
// far as this is concerned. Folding them would hand one of them the
// other's portal.
is('email: dots are not stripped', normaliseEmail('a.b@x.com'), 'a.b@x.com');
is('email: plus tags are not stripped', normaliseEmail('a+portal@x.com'), 'a+portal@x.com');

is('email: an address looks like one', looksLikeEmail('sean@seancomma.com'), true);
is('email: no at sign does not', looksLikeEmail('seanseancomma.com'), false);
is('email: no dot in the domain does not', looksLikeEmail('sean@localhost'), false);
is('email: a space does not', looksLikeEmail('se an@x.com'), false);

is('email list: comma separated, cleaned',
   parseEmailList(' Sean@SeanComma.com, mason@bpmktg.com ').join('|'),
   'sean@seancomma.com|mason@bpmktg.com');
is('email list: blank is no addresses', parseEmailList('').length, 0);
is('email list: admins use the same shape',
   parseAdminEmails('MASON@bpmktg.com').join('|'), 'mason@bpmktg.com');

// Notion's `contains` would match an address inside a longer one, so
// the list is what decides.
is('email list: a longer address is not a member',
   parseEmailList('notsean@seancomma.com').includes('sean@seancomma.com'), false);

for (let i = 0; i < 200; i++) {
  const c = makeCode();
  if (!isCodeShaped(c)) { is('code: always six digits', c, '000000'); break; }
}
is('code: six digits is a code', isCodeShaped('012345'), true);
is('code: five digits is not', isCodeShaped('01234'), false);
is('code: letters are not', isCodeShaped('abcdef'), false);
is('code: a number is not a string', isCodeShaped(123456), false);
is('code: two codes differ', new Set(Array.from({ length: 50 }, makeCode)).size > 1, true);

/* ── the pending code, against a Map standing in for KV ───────── */

function fakeKV() {
  const m = new Map();
  return {
    store: m,
    get: async (k) => (m.has(k) ? m.get(k) : null),
    put: async (k, v) => { m.set(k, v); },
    delete: async (k) => { m.delete(k); },
  };
}

const EMAIL = 'sean@seancomma.com';
const EHASH = await sha256Hex(EMAIL);
const pend = async (code, over = {}) => ({
  hash: await hashCode(EMAIL, code),
  email: EMAIL, role: 'client', slug: 'sean-comma',
  exp: Math.floor(Date.now() / 1000) + 600, tries: 0, ...over,
});

{
  const kv = fakeKV();
  await putCode(kv, EHASH, await pend('123456'));
  const got = await takeCode(kv, EHASH);
  is('code: comes back out', got.slug, 'sean-comma');
  ok('code: the code itself is not in the record', !JSON.stringify(got).includes('123456'));
  is('code: the right code is accepted', await checkCode(kv, EHASH, got, '123456'), true);
  is('code: and is gone afterwards', await takeCode(kv, EHASH), null);
}
{
  const kv = fakeKV();
  await putCode(kv, EHASH, await pend('123456'));
  is('code: a wrong code is refused',
     await checkCode(kv, EHASH, await takeCode(kv, EHASH), '654321'), false);
  is('code: and the attempt is counted', (await takeCode(kv, EHASH)).tries, 1);
}
{
  const kv = fakeKV();
  await putCode(kv, EHASH, await pend('123456'));
  for (let i = 0; i < CODE_ATTEMPTS; i++) {
    const p = await takeCode(kv, EHASH);
    if (p) await checkCode(kv, EHASH, p, '000000');
  }
  is('code: ten wrong guesses burn it', await takeCode(kv, EHASH), null);
}
{
  const kv = fakeKV();
  const expired = await pend('123456', { exp: Math.floor(Date.now() / 1000) - 1 });
  is('code: an expired code is refused', await checkCode(kv, EHASH, expired, '123456'), false);
}
{
  const kv = fakeKV();
  const p = await pend('123456');
  is('code: a code for another address does not verify',
     await checkCode(kv, EHASH, { ...p, email: 'someone@else.com' }, '123456'), false);
}
{
  const kv = fakeKV();
  let blocked = 0;
  for (let i = 0; i < CODE_REQUESTS_PER_HOUR + 3; i++) {
    if (await overRequestLimit(kv, EHASH)) blocked++;
  }
  is('rate: five an hour, then no more', blocked, 3);
  is('rate: another address is unaffected',
     await overRequestLimit(kv, await sha256Hex('other@x.com')), false);
}

ok('mail: the code is in the body', codeText('123456', 'Sean Comma').includes('123456'));
ok('mail: and says whose portal', codeText('123456', 'Sean Comma').includes('Sean Comma'));
ok('mail: an unasked-for code says nothing has changed',
   codeText('123456', '').includes('nobody has been let in'));

is('slug: a normal slug is valid', isValidSlug('sean-comma'), true);
is('slug: path traversal is not a slug', isValidSlug('../admin'), false);
is('slug: a cookie-breaking slug is not a slug', isValidSlug('a; Path=/'), false);
is('slug: uppercase is not a slug', isValidSlug('Sean'), false);
is('slug: empty is not a slug', isValidSlug(''), false);

/* ══ 7. The whitelists, against Notion pages full of secrets ═════
   The real test of a whitelist is a source object that contains the
   things it must drop. Each fixture below carries every never-send
   property, with a value distinctive enough to grep the output for. */

const SECRETS = [
  'SUPERSECRETPORTALKEY',
  'INTERNAL-CLIENT-NOTE',
  'INTERNAL-CALENDAR-NOTE',
  'INTERNAL-SNAPSHOT-NOTE',
  'NEXT-ACTION-TEXT',
  'sean@example.com',
  '+15555550123',
  // Who may sign in is ours to know. A client's own address is not a
  // disaster on their own payload, but their manager's is, and the
  // list is the thing an attacker would want.
  'manager@seancomma.com',
  'DRAFT-SUMMARY-NOT-READY',
];

const clientPage = {
  id: 'client-page-id',
  properties: {
    'Artist': { type: 'title', title: [{ plain_text: 'Sean Comma' }] },
    'Tier': { type: 'select', select: { name: 'Tier 3 · Fan Growth Engine' } },
    'Stage': { type: 'select', select: { name: 'Active' } },
    'Term Start': { type: 'date', date: { start: '2026-09-01' } },
    'Term End': { type: 'date', date: { start: '2027-03-01' } },
    'Client Announcement': { type: 'rich_text', rich_text: [{ plain_text: 'Kickoff Monday.' }] },
    'Drive Folder': { type: 'url', url: 'https://drive.google.com/folder' },
    'Content Vault': { type: 'url', url: 'https://docs.google.com/vault' },
    'Roadmap Link': { type: 'url', url: 'https://notion.so/roadmap' },
    'Access Complete': { type: 'checkbox', checkbox: false },
    '90-Day Goals': { type: 'rich_text', rich_text: [{ plain_text: 'Sell out a hometown show.' }] },
    'Goal Deadline': { type: 'date', date: { start: '2026-12-01' } },
    'Goal · Instagram Followers': { type: 'number', number: 15000 },
    'Goal · Songs at 10K Streams': { type: 'number', number: 3 },
    'Goal · Shows per Month': { type: 'number', number: 2 },
    // Everything below must never reach the browser.
    'Portal Key': { type: 'rich_text', rich_text: [{ plain_text: 'SUPERSECRETPORTALKEY' }] },
    'Portal Enabled': { type: 'checkbox', checkbox: true },
    'Portal Emails': { type: 'rich_text', rich_text: [{ plain_text: 'Sean@SeanComma.com, manager@seancomma.com' }] },
    'Intake Slug': { type: 'rich_text', rich_text: [{ plain_text: 'sean-comma' }] },
    'Monthly Rate': { type: 'number', number: 2500 },
    'Full Rate': { type: 'number', number: 4000 },
    'Notes': { type: 'rich_text', rich_text: [{ plain_text: 'INTERNAL-CLIENT-NOTE' }] },
    'Next Action': { type: 'rich_text', rich_text: [{ plain_text: 'NEXT-ACTION-TEXT' }] },
    'Email': { type: 'email', email: 'sean@example.com' },
    'Phone': { type: 'phone_number', phone_number: '+15555550123' },
    'Lead Source': { type: 'select', select: { name: 'Referral' } },
    'Access Granted': { type: 'multi_select', multi_select: [{ name: 'TikTok' }] },
    'Intake Slug': { type: 'rich_text', rich_text: [{ plain_text: 'sean-comma' }] },
  },
};

const calendarPages = [
  {
    id: 'cal-1',
    properties: {
      'Item': { type: 'title', title: [{ plain_text: 'Sean Comma · Red Rocks (TENTATIVE)' }] },
      'Kind': { type: 'select', select: { name: 'Moment' } },
      'Moment Type': { type: 'select', select: { name: 'Show' } },
      'Date': { type: 'date', date: { start: '2026-11-14' } },
      'Status': { type: 'select', select: { name: 'Not Started' } },
      'Type': { type: 'select', select: { name: 'Content' } },
      'Owner': { type: 'select', select: { name: 'Blueprint' } },
      'Playbook': { type: 'select', select: { name: 'Pre-Show' } },
      'Phase': { type: 'select', select: { name: 'Show Night' } },
      'Where': { type: 'rich_text', rich_text: [{ plain_text: 'Instagram' }] },
      'Why It Matters': { type: 'rich_text', rich_text: [{ plain_text: 'Biggest room this year.' }] },
      'Venue / City': { type: 'rich_text', rich_text: [{ plain_text: 'Red Rocks, Morrison CO' }] },
      'Ticket or RSVP Link': { type: 'url', url: 'https://tickets.example.com/abc' },
      'Is Playbook': { type: 'checkbox', checkbox: false },
      'Hide from Client': { type: 'checkbox', checkbox: false },
      'Notes': { type: 'rich_text', rich_text: [{ plain_text: 'INTERNAL-CALENDAR-NOTE' }] },
      'Offset (days)': { type: 'number', number: -14 },
    },
  },
  {
    // Slipped past the Notion filter (renamed property, stale index).
    // The second pass in fetchCalendar has to drop it anyway.
    id: 'cal-2',
    properties: {
      'Item': { type: 'title', title: [{ plain_text: 'Sean Comma · Invoice chase' }] },
      'Kind': { type: 'select', select: { name: 'Step' } },
      'Type': { type: 'select', select: { name: 'Admin' } },
      'Owner': { type: 'select', select: { name: 'Blueprint' } },
      'Date': { type: 'date', date: { start: '2026-11-02' } },
      'Is Playbook': { type: 'checkbox', checkbox: false },
      'Hide from Client': { type: 'checkbox', checkbox: false },
    },
  },
  {
    id: 'cal-3',
    properties: {
      'Item': { type: 'title', title: [{ plain_text: 'Sean Comma · Hidden thing' }] },
      'Kind': { type: 'select', select: { name: 'Moment' } },
      'Date': { type: 'date', date: { start: '2026-11-03' } },
      'Is Playbook': { type: 'checkbox', checkbox: false },
      'Hide from Client': { type: 'checkbox', checkbox: true },
    },
  },
  {
    // A step with no explicit Date falls back to the Auto Date formula.
    id: 'cal-4',
    properties: {
      'Item': { type: 'title', title: [{ plain_text: 'Sean Comma · Teaser 1' }] },
      'Kind': { type: 'select', select: { name: 'Step' } },
      'Type': { type: 'select', select: { name: 'Content' } },
      'Owner': { type: 'select', select: { name: 'Client' } },
      'Date': { type: 'date', date: null },
      'Auto Date': { type: 'formula', formula: { type: 'date', date: { start: '2026-10-31' } } },
      'Is Playbook': { type: 'checkbox', checkbox: false },
      'Hide from Client': { type: 'checkbox', checkbox: false },
      // A link that would become a live javascript: anchor in a browser.
      'Ticket or RSVP Link': { type: 'url', url: 'javascript:alert(1)' },
    },
  },
  {
    // A moment, with internal fields that must not ride along into the
    // `moment` object a step carries.
    id: 'cal-moment',
    properties: {
      'Item': { type: 'title', title: [{ plain_text: 'Sean Comma · Rooftop Revival' }] },
      'Kind': { type: 'select', select: { name: 'Moment' } },
      'Moment Type': { type: 'select', select: { name: 'Show' } },
      'Date': { type: 'date', date: { start: '2026-10-18' } },
      'Tickets Sold': { type: 'number', number: 120 },
      'Is Playbook': { type: 'checkbox', checkbox: false },
      'Hide from Client': { type: 'checkbox', checkbox: false },
      'Notes': { type: 'rich_text', rich_text: [{ plain_text: 'INTERNAL-MOMENT-NOTE' }] },
      'Offset (days)': { type: 'number', number: -7 },
    },
  },
  {
    id: 'cal-step-of-moment',
    properties: {
      'Item': { type: 'title', title: [{ plain_text: 'Sean Comma · Announce the show' }] },
      'Kind': { type: 'select', select: { name: 'Step' } },
      'Type': { type: 'select', select: { name: 'Content' } },
      'Date': { type: 'date', date: { start: '2026-10-11' } },
      'Moment': { type: 'relation', relation: [{ id: 'cal-moment' }] },
      'Is Playbook': { type: 'checkbox', checkbox: false },
      'Hide from Client': { type: 'checkbox', checkbox: false },
    },
  },
  {
    // Points at a moment that is NOT in the result set and belongs to
    // somebody else. It must come back with no moment attached.
    id: 'cal-step-foreign',
    properties: {
      'Item': { type: 'title', title: [{ plain_text: 'Sean Comma · Orphan step' }] },
      'Kind': { type: 'select', select: { name: 'Step' } },
      'Type': { type: 'select', select: { name: 'Content' } },
      'Date': { type: 'date', date: { start: '2026-10-12' } },
      'Moment': { type: 'relation', relation: [{ id: 'cal-foreign' }] },
      'Is Playbook': { type: 'checkbox', checkbox: false },
      'Hide from Client': { type: 'checkbox', checkbox: false },
    },
  },
];

// A moment page owned by a DIFFERENT client, served only by id.
const foreignMoment = {
  id: 'cal-foreign',
  properties: {
    'Item': { type: 'title', title: [{ plain_text: 'OTHER-CLIENT-MOMENT' }] },
    'Kind': { type: 'select', select: { name: 'Moment' } },
    'Moment Type': { type: 'select', select: { name: 'Release' } },
    'Date': { type: 'date', date: { start: '2026-10-20' } },
    'Client': { type: 'relation', relation: [{ id: 'someone-else-page-id' }] },
  },
};

const snapshotPages = [
  {
    id: 'snap-1',
    properties: {
      'Snapshot': { type: 'title', title: [{ plain_text: 'Sean Comma Baseline' }] },
      'Date': { type: 'date', date: { start: '2026-09-01' } },
      'Type': { type: 'select', select: { name: 'Baseline' } },
      'Data Source': { type: 'multi_select', multi_select: [{ name: 'Platform analytics' }] },
      'Published': { type: 'checkbox', checkbox: true },
      'Summary': { type: 'rich_text', rich_text: [{ plain_text: 'Where we are starting.' }] },
      'Growth Score (/40)': { type: 'number', number: 14 },
      'Instagram · Followers': { type: 'number', number: 10000 },
      'Instagram · Engagement': { type: 'number', number: 0.031 },
      'Email + SMS List': { type: 'number', number: 420 },
      'Spotify · Monthly Listeners': { type: 'number', number: 8800 },
      'TikTok · Followers': { type: 'number', number: null },
      'Notes': { type: 'rich_text', rich_text: [{ plain_text: 'INTERNAL-SNAPSHOT-NOTE' }] },
    },
  },
  {
    id: 'snap-2',
    properties: {
      'Snapshot': { type: 'title', title: [{ plain_text: 'Sean Comma October' }] },
      'Date': { type: 'date', date: { start: '2026-10-22' } },
      'Type': { type: 'select', select: { name: 'Monthly' } },
      'Data Source': { type: 'multi_select', multi_select: [{ name: 'Platform analytics' }] },
      'Published': { type: 'checkbox', checkbox: true },
      'Growth Score (/40)': { type: 'number', number: 21 },
      'Instagram · Followers': { type: 'number', number: 12400 },
      'Instagram · Engagement': { type: 'number', number: 0.042 },
      'Email + SMS List': { type: 'number', number: 610 },
      'Spotify · Monthly Listeners': { type: 'number', number: 11200 },
      'Notes': { type: 'rich_text', rich_text: [{ plain_text: 'INTERNAL-SNAPSHOT-NOTE' }] },
    },
  },
  {
    // Half filled in, not published. The client must never see it.
    id: 'snap-3',
    properties: {
      'Snapshot': { type: 'title', title: [{ plain_text: 'Sean Comma November' }] },
      'Date': { type: 'date', date: { start: '2026-11-22' } },
      'Type': { type: 'select', select: { name: 'Monthly' } },
      'Published': { type: 'checkbox', checkbox: false },
      'Summary': { type: 'rich_text', rich_text: [{ plain_text: 'DRAFT-SUMMARY-NOT-READY' }] },
      'Instagram · Followers': { type: 'number', number: 99999 },
    },
  },
];

// Stub Notion. Each database answers with its own fixture.
globalThis.fetch = async (url) => {
  const u = String(url);
  if (u.includes('/v1/pages/')) {
    const body = u.endsWith('cal-foreign') ? foreignMoment : {};
    return new Response(JSON.stringify(body), { status: 200 });
  }
  const results =
    u.includes(CLIENTS_DB) ? [clientPage] :
    u.includes(CALENDAR_DB) ? calendarPages :
    u.includes(SNAPSHOTS_DB) ? snapshotPages : [];
  return new Response(JSON.stringify({ results, has_more: false, next_cursor: null }), { status: 200 });
};

const record = await findClientBySlug('fake-token', 'sean-comma');
const calendar = await fetchCalendar('fake-token', record.pageId, record.client.artist);
const snapshots = await fetchSnapshots('fake-token', record.pageId);

// This is the object the browser receives. Nothing else does.
const payload = { client: record.client, calendar, snapshots };
const wire = JSON.stringify(payload);

for (const secret of SECRETS) {
  is(`whitelist: "${secret}" never reaches the browser`, wire.includes(secret), false);
}
is('whitelist: the monthly rate never reaches the browser', wire.includes('2500'), false);
is('whitelist: the full rate never reaches the browser', wire.includes('4000'), false);

for (const prop of [...CLIENT_NEVER_SEND, ...CALENDAR_NEVER_SEND, ...SNAPSHOT_NEVER_SEND]) {
  is(`whitelist: no "${prop}" key in the payload`, wire.includes(`"${prop}"`), false);
}

// The server does hold the sign-in list, so the lookup can happen at
// all. It just lives outside the payload.
is('whitelist: the sign-in list is kept server-side',
   record.portalEmails.join('|'), 'sean@seancomma.com|manager@seancomma.com');
is('whitelist: and not on the client object', 'portalEmails' in record.client, false);
is('whitelist: the slug is read for the lookup', record.slug, 'sean-comma');
is('whitelist: and the slug is not on the client object', 'slug' in record.client, false);
// The old portal key is not read any more at all, which is the
// strongest form of "it does not ship".
is('whitelist: the portal key is not read', 'portalKey' in record, false);

// Only published months are a report. A snapshot being built is not
// in the payload at all, so nothing downstream has to know about it.
is('snapshots: only the published ones come through', snapshots.length, 2);
is('snapshots: the unpublished month is not among them',
   snapshots.some((s) => s.date === '2026-11-22'), false);
is('snapshots: the baseline carries its summary', snapshots[0].summary, 'Where we are starting.');
is('snapshots: a month with no summary says nothing', snapshots[1].summary, null);

/* ── who may sign in ───────────────────────────────────────── */

// Notion narrows with `contains`; this is what decides. The stub
// answers with the same client page whatever the filter says, which is
// the point: the exact check has to be in the code.
is('login: a listed address finds the client',
   (await findClientByEmail('fake-token', 'sean@seancomma.com'))?.slug, 'sean-comma');
is('login: the list is case-insensitive, because it was normalised',
   (await findClientByEmail('fake-token', 'sean@seancomma.com'))?.client.artist, 'Sean Comma');
is('login: the manager on the same list gets in too',
   (await findClientByEmail('fake-token', 'manager@seancomma.com'))?.slug, 'sean-comma');
is('login: an address that merely contains a listed one does not',
   await findClientByEmail('fake-token', 'ean@seancomma.com'), null);
is('login: an address nobody has does not', await findClientByEmail('fake-token', 'nobody@x.com'), null);
is('login: a blank address does not', await findClientByEmail('fake-token', ''), null);

is('login: the switcher lists portals that are on',
   (await fetchPortalClients('fake-token')).map((c) => `${c.slug}:${c.artist}`).join('|'),
   'sean-comma:Sean Comma');

// Positive side: the named fields DID come through.
is('client: artist', record.client.artist, 'Sean Comma');
is('client: tier', record.client.tier, 'Tier 3 · Fan Growth Engine');
is('client: term start', record.client.termStart, '2026-09-01');
is('client: announcement', record.client.announcement, 'Kickoff Monday.');
is('client: drive folder', record.client.driveFolder, 'https://drive.google.com/folder');
is('client: access complete', record.client.accessComplete, false);
is('client: portal enabled read for the gate', record.portalEnabled, true);

/* ══ 8. Calendar extraction end to end ═══════════════════════════ */

// Looked up by title, not by index: the fixture grows, and a test that
// breaks because row 2 became row 4 says nothing useful.
const byTitle = (t) => calendar.find(i => i.title === t);
const teaser = byTitle('Teaser 1');
const redRocks = byTitle('Red Rocks');

is('calendar: hidden and admin rows are dropped',
   calendar.map(i => i.title).sort(),
   ['Announce the show', 'Orphan step', 'Red Rocks', 'Rooftop Revival', 'Teaser 1']);
is('calendar: sorted by date',
   calendar.map(i => i.date),
   [...calendar.map(i => i.date)].sort());
is('calendar: artist prefix gone', teaser.title, 'Teaser 1');
is('calendar: TENTATIVE becomes a flag', [redRocks.title, redRocks.tentative], ['Red Rocks', true]);
is('calendar: Auto Date fills in for a step with no Date', teaser.date, '2026-10-31');
is('calendar: a javascript: link is not passed through', teaser.ticketLink, null);
is('calendar: a real ticket link survives', redRocks.ticketLink, 'https://tickets.example.com/abc');
is('calendar: venue kept', redRocks.venueCity, 'Red Rocks, Morrison CO');
is('calendar: why it matters kept', redRocks.whyItMatters, 'Biggest room this year.');

/* ── moments ── */
const step = byTitle('Announce the show');
const momentRow = byTitle('Rooftop Revival');
const orphan = byTitle('Orphan step');

is('moment: a step carries the moment it promotes', step.moment.title, 'Rooftop Revival');
is('moment: with its type and date', [step.moment.momentType, step.moment.date], ['Show', '2026-10-18']);
is('moment: the artist prefix is stripped there too', step.moment.title.startsWith('Sean'), false);
is('moment: exactly four fields and no more',
   Object.keys(step.moment).sort(), ['date', 'id', 'momentType', 'title']);
is('moment: a moment does not belong to itself', momentRow.moment, null);
is('moment: Tickets Sold is carried on the moment row', momentRow.ticketsSold, 120);
// The relation points at a page owned by another client. Fetching it is
// allowed; trusting it is not.
is('moment: a relation pointing outside this client is dropped', orphan.moment, null);
is('moment: and that moment\'s title never appears',
   JSON.stringify(calendar).includes('OTHER-CLIENT-MOMENT'), false);
is('moment: internal moment fields do not ride along on the step',
   JSON.stringify(calendar).includes('INTERNAL-MOMENT-NOTE'), false);

/* ══ 9. Snapshot extraction ══════════════════════════════════════ */

is('snapshots: both rows', snapshots.length, 2);
is('snapshots: type and date', [snapshots[1].type, snapshots[1].date], ['Monthly', '2026-10-22']);
is('snapshots: growth score is its own field', snapshots[1].growthScore, 21);
is('snapshots: growth score is not duplicated into metrics',
   'Growth Score (/40)' in snapshots[1].metrics, false);
is('snapshots: platform metrics carried', snapshots[1].metrics['Instagram · Followers'], 12400);
is('snapshots: engagement carried as a decimal', snapshots[1].metrics['Instagram · Engagement'], 0.042);
is('snapshots: the named extras carried', snapshots[1].metrics['Email + SMS List'], 610);
is('snapshots: an empty metric is omitted rather than sent as null',
   'TikTok · Followers' in snapshots[0].metrics, false);
is('snapshots: data source carried', snapshots[1].dataSource, ['Platform analytics']);

// And the display path on top of the stored decimal.
is('snapshots: engagement renders as a percent',
   formatEngagement(snapshots[1].metrics['Instagram · Engagement']), '4.2%');

/* ══ 12. Goal tracker maths ══════════════════════════════════════ */

// Progress runs from the BASELINE, not from zero. A client sitting at
// 3,117 of 5,000 has done none of the work yet, not 62% of it.
const ig = goalProgress(3117, 3117, 5000);
is('goal: no movement yet is 0%', ig.fraction, 0);
is('goal: and reports nothing gained', ig.gained, 0);

const half = goalProgress(3000, 4000, 5000);
is('goal: halfway from baseline to target', half.fraction, 0.5);
is('goal: gained is movement since baseline', half.gained, 1000);

is('goal: past the target clamps to 1', goalProgress(3000, 6000, 5000).fraction, 1);
is('goal: going backwards clamps to 0', goalProgress(3000, 2500, 5000).fraction, 0);
// A target at or below the baseline cannot be divided by; it is either
// already met or it is not.
is('goal: a target already at the baseline reads as met',
   goalProgress(5000, 5000, 5000).fraction, 1);
is('goal: a target below the baseline that is still met reads as met',
   goalProgress(5000, 5200, 4000).fraction, 1);

const releases = [
  { momentType: 'Release', streamsToDate: 12400 },
  { momentType: 'Release', streamsToDate: 10000 },
  { momentType: 'Release', streamsToDate: 9999 },
  { momentType: 'Release', streamsToDate: null },
  { momentType: 'Show', streamsToDate: 50000 },
];
is('songs: counted only at or above the target', songsAtTarget(releases), 2);
is('songs: a show with streams is not a song', songsAtTarget([{ momentType: 'Show', streamsToDate: 99999 }]), 0);
is('songs: an unreleased track counts for nothing', songsAtTarget([{ momentType: 'Release', streamsToDate: null }]), 0);

const shows = [
  { kind: 'Moment', momentType: 'Show', date: '2026-11-03' },
  { kind: 'Moment', momentType: 'Show', date: '2026-11-21' },
  { kind: 'Moment', momentType: 'Show', date: '2026-12-02' },
  { kind: 'Moment', momentType: 'Release', date: '2026-11-10' },
  { kind: 'Step', momentType: null, date: '2026-11-11' },
];
is('shows: counted by calendar month', showsInMonth(shows, new Date(2026, 10, 15)), 2);
is('shows: a different month counts separately', showsInMonth(shows, new Date(2026, 11, 15)), 1);
is('shows: a release is not a show', showsInMonth(shows, new Date(2026, 10, 1)), 2);
is('shows: an empty month is zero', showsInMonth(shows, new Date(2027, 0, 1)), 0);

// Nov 1 to Dec 15 is two calendar months, and three shows fall in them.
is('shows: average per month since term start',
   showsPerMonthAverage(shows, '2026-11-01', new Date(2026, 11, 15)), 1.5);
// Part months count as whole ones, so day two is not "shows per 0.03 months".
is('shows: a part month counts as one',
   showsPerMonthAverage(shows, '2026-11-01', new Date(2026, 10, 2)), 0);
is('shows: before the term starts there is no average',
   showsPerMonthAverage(shows, '2026-11-01', new Date(2026, 9, 1)), null);

is('deadline: days remaining', daysUntil('2026-12-01', new Date(2026, 10, 24)), 7);
is('deadline: the day itself is zero', daysUntil('2026-12-01', new Date(2026, 11, 1)), 0);
is('deadline: a passed deadline goes negative', daysUntil('2026-12-01', new Date(2026, 11, 5)), -4);

/* ══ 13. Metric labels and formatting ════════════════════════════ */

is('label: bare Posts is spelled out', displayMetricLabel('Instagram · Posts'), 'Posts (last 28 days)');
is('label: (28d) is spelled out', displayMetricLabel('TikTok · Views (28d)'), 'Views (last 28 days)');
is('label: a plain metric is left alone', displayMetricLabel('Instagram · Followers'), 'Followers');

// The one that matters: "Share" is a percentage, "Shares" is a count.
is('percent: Search Share is a percentage', isPercentMetric('TikTok · Search Share'), true);
is('percent: Shares is NOT a percentage', isPercentMetric('TikTok · Shares (28d)'), false);
is('percent: Open Rate is a percentage', isPercentMetric('Email · Open Rate'), true);
is('percent: Engagement is a percentage', isPercentMetric('Instagram · Engagement'), true);
is('percent: Followers is not', isPercentMetric('Instagram · Followers'), false);

is('format: a decimal becomes a percentage', formatMetricValue('Email · Open Rate', 0.199), '19.9%');
is('format: shares stay a count', formatMetricValue('TikTok · Shares (28d)', 133), '133');
is('compact: a round thousand loses its .0', compactNumber(10000), '10K');
is('compact: an uneven one keeps its decimal', compactNumber(24180), '24.2K');
is('format: seconds', formatMetricValue('Instagram · Avg Watch Time (sec)', 6.2), '6s');
is('label: (sec) drops out, because the value carries the unit',
   displayMetricLabel('Instagram · Avg Watch Time (sec)'), 'Avg Watch Time');
is('format: hours keep one decimal', formatMetricValue('YouTube · Watch Hours (28d)', 0.52), '0.5 hrs');
is('format: thousands separated', formatMetricValue('Instagram · Followers', 72900), '72,900');
is('format: compact only when asked', formatMetricValue('Instagram · Followers', 72900, { compact: true }), '72.9K');
is('format: compact leaves small numbers alone', compactNumber(850), '850');

is('section: followers are audience', metricSection('Instagram · Followers'), 'audience');
is('section: net follows are audience', metricSection('TikTok · Net Follows (28d)'), 'audience');
is('section: views are reach', metricSection('Instagram · Views (28d)'), 'reach');
is('section: shares are engagement', metricSection('TikTok · Shares (28d)'), 'engagement');
is('section: watch time is engagement', metricSection('Instagram · Avg Watch Time (sec)'), 'engagement');
is('section: posts are output', metricSection('Instagram · Posts'), 'output');
is('section: Spotify is music', metricSection('Spotify · Streams (28d)'), 'music');
is('section: email is owned', metricSection('Email · Open Rate'), 'owned');
is('section: the list itself is owned', metricSection('Email + SMS List'), 'owned');

is('definition: one entry covers every platform',
   metricDefinition('TikTok · Net Follows (28d)') === metricDefinition('Instagram · Net Follows (28d)'), true);
is('definition: a metric with nothing to add returns null', metricDefinition('Made Up · Thing'), null);

is('rollup: views add across platforms',
   sumMetrics({ 'Instagram · Views (28d)': 10, 'TikTok · Views (28d)': 5 }, VIEW_ROLLUP), 15);
is('rollup: missing platforms are skipped, not zeroed',
   sumMetrics({ 'TikTok · Views (28d)': 5 }, VIEW_ROLLUP), 5);
is('rollup: no data at all is null rather than 0',
   sumMetrics({ 'Instagram · Followers': 10 }, VIEW_ROLLUP), null);


/* ── round 4: placeholders, term-bounded shows, weekly pace ───── */

is('clean: an em dash is nothing', cleanText('—'), null);
is('clean: so is a plain hyphen', cleanText('-'), null);
is('clean: and TBD', cleanText(' TBD '), null);
is('clean: and N/A', cleanText('n/a'), null);
is('clean: real text survives', cleanText(' IG Story '), 'IG Story');
// The one that would bite: a title is not a placeholder because it
// happens to contain a dash.
is('clean: a dash inside real text is kept', cleanText('Out now — go stream it'), 'Out now — go stream it');
is('clean: null stays null', cleanText(null), null);

const showRows = [
  { kind: 'Moment', momentType: 'Show', date: '2026-10-03' },   // before the term
  { kind: 'Moment', momentType: 'Show', date: '2026-11-08' },
  { kind: 'Moment', momentType: 'Show', date: '2026-11-22' },
  { kind: 'Moment', momentType: 'Show', date: '2026-12-02' },   // next month
  { kind: 'Moment', momentType: 'Release', date: '2026-11-13' },// not a show
];
const inNov = new Date(2026, 10, 15);
is('shows: this month, no term bound', showsInMonth(showRows, inNov), 2);
is('shows: a show before the term start does not count',
   showsInMonth([{ kind: 'Moment', momentType: 'Show', date: '2026-11-02' }, ...showRows],
                inNov, '2026-11-05'), 2);
is('shows: the term start day itself counts',
   showsInMonth([{ kind: 'Moment', momentType: 'Show', date: '2026-11-05' }], inNov, '2026-11-05'), 1);

const paceNow = new Date(2026, 10, 1);
// 1,883 to go over 90 days (12.86 weeks) is 146.5 a week. The card
// rounds that UP, because a pace you round down does not get there.
is('pace: followers per week to the deadline',
   Math.round(weeklyPaceNeeded(3117, 5000, '2027-01-30', paceNow)), 146);
is('pace: the card rounds up, never down',
   Math.ceil(weeklyPaceNeeded(3117, 5000, '2027-01-30', paceNow)), 147);
is('pace: a goal already met needs no pace',
   weeklyPaceNeeded(5200, 5000, '2027-01-30', paceNow), null);
is('pace: a deadline that has passed needs no pace',
   weeklyPaceNeeded(3117, 5000, '2026-10-01', paceNow), null);
is('pace: no deadline, no pace', weeklyPaceNeeded(3117, 5000, null, paceNow), null);

/* ══════════════════════════════════════════════════════════════
   CONTENT PIPELINE — the first writable surface
   ══════════════════════════════════════════════════════════════ */

section('Content: the two whitelists');

// The read list and the write list are separate on purpose. Anything
// that appears in both is a field a client may change; anything that
// appears in neither they cannot see at all.
const editableProps = Object.values(CLIENT_EDITABLE);

is('content: nothing never-send is readable',
   CONTENT_NEVER_SEND.some(f => CONTENT_FIELDS.includes(f)), false);
is('content: nothing never-send is writable',
   CONTENT_NEVER_SEND.some(f => editableProps.includes(f)), false);
is('content: the read-only list and the editable list are disjoint',
   CLIENT_READ_ONLY.some(f => editableProps.includes(f)), false);
is('content: every editable property is one we also read',
   editableProps.every(f => CONTENT_FIELDS.includes(f)), true);
is('content: Edit Link is readable but not writable',
   CONTENT_FIELDS.includes('Edit Link') && !editableProps.includes('Edit Link'), true);

section('Content: status moves a client may make');

is('status: Idea to Planned', canClientMove('Idea', 'Planned'), true);
is('status: Planned back to Idea', canClientMove('Planned', 'Idea'), true);
is('status: Planned to Filmed', canClientMove('Planned', 'Filmed'), true);
is('status: Filmed to Footage In', canClientMove('Filmed', 'Footage In'), true);
is('status: Ready for Review to Approved', canClientMove('Ready for Review', 'Approved'), true);
is('status: Approved to Posted', canClientMove('Approved', 'Posted'), true);
is('status: Scheduled to Posted', canClientMove('Scheduled', 'Posted'), true);
is('status: Skipped back to Idea', canClientMove('Skipped', 'Idea'), true);
is('status: anything to Skipped',
   CONTENT_STATUSES.every(s => s === 'Skipped' || canClientMove(s, 'Skipped')), true);

// Editing, Ready for Review and Scheduled are ours to set in Notion.
is('status: a client cannot start an edit', canClientMove('Footage In', 'Editing'), false);
is('status: a client cannot put their own card up for review',
   canClientMove('Filmed', 'Ready for Review'), false);
is('status: a client cannot schedule', canClientMove('Approved', 'Scheduled'), false);
is('status: no jumping the queue', canClientMove('Idea', 'Posted'), false);
is('status: no approving your own unseen edit', canClientMove('Editing', 'Approved'), false);
is('status: no un-posting', canClientMove('Posted', 'Approved'), false);
is('status: an invented status is not a status', canClientMove('Idea', 'Published'), false);
is('status: a status that is already set is a no-op, not a refusal',
   canClientMove('Editing', 'Editing'), true);
is('status: a blank row can only start at the beginning',
   [canClientMove(null, 'Idea'), canClientMove(null, 'Planned'), canClientMove(null, 'Approved')],
   [true, true, false]);

section('Content: field validation');

is('text: trimmed', cleanPatchText('  SM L1D1  ', MAX_TITLE), 'SM L1D1');
is('text: emptied means cleared', cleanPatchText('   ', MAX_TITLE), null);
is('text: null means cleared', cleanPatchText(null, MAX_TITLE), null);
is('text: a number is not text', cleanPatchText(42, MAX_TITLE), undefined);
is('text: an object is not text', cleanPatchText({ content: 'hi' }, MAX_TITLE), undefined);
is('text: a title is capped at 200',
   cleanPatchText('x'.repeat(500), MAX_TITLE).length, 200);
is('text: a caption is capped at 2,000',
   cleanPatchText('x'.repeat(5000), MAX_TEXT).length, 2000);

is('url: https passes', cleanPatchUrl('https://instagram.com/p/abc'),
   'https://instagram.com/p/abc');
is('url: http passes', cleanPatchUrl('http://example.com/'), 'http://example.com/');
is('url: javascript is refused', cleanPatchUrl('javascript:alert(1)'), undefined);
is('url: data is refused', cleanPatchUrl('data:text/html,<script>'), undefined);
is('url: a bare word is not a link', cleanPatchUrl('instagram'), undefined);
is('url: blank clears the field', cleanPatchUrl(''), null);

is('date: a plain day passes', cleanPatchDate('2026-11-15'), '2026-11-15');
is('date: a timestamp is refused', cleanPatchDate('2026-11-15T10:00:00Z'), undefined);
is('date: an impossible day is refused', cleanPatchDate('2026-13-45'), undefined);
is('date: blank clears the field', cleanPatchDate(''), null);

const buckets = ['Talking Head', 'Release Promo', 'Skit'];
is('select: a real option passes', cleanPatchSelect('Skit', buckets), 'Skit');
is('select: an invented option is refused', cleanPatchSelect('Vlog', buckets), undefined);
is('select: case matters, because Notion would create a new option',
   cleanPatchSelect('skit', buckets), undefined);

const platforms = ['Instagram', 'TikTok', 'YouTube'];
is('multi: known values survive',
   cleanPatchMulti(['Instagram', 'TikTok'], platforms), ['Instagram', 'TikTok']);
is('multi: unknown values are dropped, the rest stays',
   cleanPatchMulti(['Instagram', 'Myspace'], platforms), ['Instagram']);
is('multi: duplicates collapse',
   cleanPatchMulti(['TikTok', 'TikTok'], platforms), ['TikTok']);
is('multi: an empty array clears the field', cleanPatchMulti([], platforms), []);
is('multi: a string is not a list', cleanPatchMulti('Instagram', platforms), undefined);

const mine = ['aaaaaaaa-1111-2222-3333-444444444444'];
is('relation: my own moment passes',
   cleanPatchRelation(['aaaaaaaa-1111-2222-3333-444444444444'], mine),
   [normaliseId(mine[0])]);
is('relation: dashes do not decide identity',
   cleanPatchRelation(['AAAAAAAA111122223333444444444444'], mine), [normaliseId(mine[0])]);
is('relation: another client’s moment is dropped',
   cleanPatchRelation(['bbbbbbbb-1111-2222-3333-444444444444'], mine), []);

section('Content: building Notion properties');

const schema = {
  bucket: buckets.map(name => ({ name, color: 'gray' })),
  format: [{ name: 'Text on Screen', color: 'gray' }],
  platforms: platforms.map(name => ({ name, color: 'gray' })),
  status: CONTENT_STATUSES.map(name => ({ name, color: 'gray' })),
};
const ctx = (currentStatus = 'Planned') => ({ schema, allowedCampaigns: mine, currentStatus });

// A key the client did not send must not appear in the properties at
// all: an autosave sends one field, and the others must be left alone.
const one = buildContentProperties({ caption: 'new caption' }, ctx());
is('build: only what was sent is written',
   Object.keys(one.properties), ['Caption']);
is('build: rich text is wrapped the way Notion wants it',
   one.properties.Caption.rich_text[0].text.content, 'new caption');

const unknown = buildContentProperties({ title: 'Hi', Client: ['x'], 'Hide from Client': false }, ctx());
is('build: an unrecognised key cannot survive',
   Object.keys(unknown.properties), ['Content']);

const bad = buildContentProperties(
  { caption: 'keep me', postLink: 'javascript:alert(1)' }, ctx());
is('build: a bad link does not cost you the caption you typed with it',
   Object.keys(bad.properties), ['Caption']);
is('build: and the refusal is named', bad.rejected, ['postLink']);

const jump = buildContentProperties({ status: 'Editing' }, ctx('Planned'));
is('build: a disallowed status move writes nothing',
   Object.keys(jump.properties).length, 0);
is('build: and is reported as rejected', jump.rejected, ['status']);

const move = buildContentProperties({ status: 'Filmed' }, ctx('Planned'));
is('build: an allowed status move writes the select',
   move.properties.Status.select.name, 'Filmed');

const foreign = buildContentProperties(
  { campaign: ['bbbbbbbb-1111-2222-3333-444444444444'] }, ctx());
is('build: a campaign this client cannot see is written as empty',
   foreign.properties.Campaign.relation, []);

is('build: clearing a date sends null, which is how Notion clears it',
   buildContentProperties({ postDate: null }, ctx()).properties['Post Date'].date, null);

const stamped = stampEdit(buildContentProperties({ caption: 'x' }, ctx()).properties, 'client');
is('build: every client write is stamped Client',
   stamped['Last Edited By'].select.name, 'Client');
is('build: the stamp is not something the request can set',
   stampEdit(
     buildContentProperties({ 'Last Edited By': { select: { name: 'Blueprint' } } }, ctx()).properties,
     'client',
   )['Last Edited By'].select.name, 'Client');
// One of us standing in a client's portal is still us. "The client
// changed this" has to keep meaning that.
is('build: an admin write is stamped Blueprint',
   stampEdit(buildContentProperties({ caption: 'x' }, ctx()).properties, 'admin')['Last Edited By'].select.name,
   'Blueprint');

section('Content: request gates');

const req = (headers, method = 'PATCH') =>
  new Request('https://blueprint-marketing.com/portal/sean-comma/content/x',
              { method, headers });

is('origin: our own origin passes',
   isSameOrigin(req({ Origin: 'https://blueprint-marketing.com' })), true);
is('origin: somebody else’s does not',
   isSameOrigin(req({ Origin: 'https://evil.example' })), false);
is('origin: a referer stands in when there is no origin',
   isSameOrigin(req({ Referer: 'https://blueprint-marketing.com/portal/sean-comma' })), true);
is('origin: neither header is a no, not a maybe', isSameOrigin(req({})), false);
is('content-type: JSON passes',
   isJsonRequest(req({ 'Content-Type': 'application/json' })), true);
is('content-type: a form post is not a portal write',
   isJsonRequest(req({ 'Content-Type': 'application/x-www-form-urlencoded' })), false);

section('Content: boards and columns');

const nowC = new Date(2026, 9, 28);   // 28 Oct 2026
const card = (o) => ({ status: null, filmBy: null, postDate: null, ...o });

is('ideas: an undated idea is in the well', isIdea(card({ status: 'Idea' })), true);
is('ideas: a planned card with no date is still an idea',
   isIdea(card({ status: 'Planned' })), true);
is('ideas: a date takes it out of the well',
   isIdea(card({ status: 'Planned', postDate: '2026-11-02' })), false);
is('ideas: filmed is not an idea', isIdea(card({ status: 'Filmed' })), false);

is('pipeline: planned with no film date', stageOf(card({ status: 'Planned' }), nowC), 'planned');
is('pipeline: planned with a film date is To Film',
   stageOf(card({ status: 'Planned', filmBy: '2026-11-01' }), nowC), 'toFilm');
is('pipeline: filmed and footage in share a column',
   [stageOf(card({ status: 'Filmed' }), nowC), stageOf(card({ status: 'Footage In' }), nowC)],
   ['filmed', 'filmed']);
is('pipeline: approved and scheduled share Ready to Post',
   [stageOf(card({ status: 'Approved' }), nowC), stageOf(card({ status: 'Scheduled' }), nowC)],
   ['ready', 'ready']);
is('pipeline: skipped is hidden', stageOf(card({ status: 'Skipped' }), nowC), null);
is('pipeline: an undated idea is not on the pipeline', stageOf(card({ status: 'Idea' }), nowC), null);
is('pipeline: a dated idea lands in Planned',
   stageOf(card({ status: 'Idea', postDate: '2026-11-09' }), nowC), 'planned');
is('pipeline: a dated idea with a shoot date lands in To film',
   stageOf(card({ status: 'Idea', postDate: '2026-11-09', filmBy: '2026-11-05' }), nowC), 'toFilm');
is('pipeline: an idea with only a shoot date lands in To film',
   stageOf(card({ status: 'Idea', filmBy: '2026-11-05' }), nowC), 'toFilm');
is('ideas: a dated idea is off the Ideas board',
   isIdea({ status: 'Idea', postDate: '2026-11-09' }), false);
is('pipeline: a recent post still shows',
   stageOf(card({ status: 'Posted', postDate: '2026-10-20' }), nowC), 'posted');
is('pipeline: a post older than 30 days drops off',
   stageOf(card({ status: 'Posted', postDate: '2026-09-01' }), nowC), null);
is('pipeline: the 30th day still counts',
   stageOf(card({ status: 'Posted', postDate: '2026-09-28' }), nowC), 'posted');

section('Content: the quick-add status default');

// The quick-add form sends both date keys every time, empty or not, so
// "has a Post Date property" and "has a post date" are not the same
// question. Mirrors the branch in functions/portal/[slug]/content.
const hasDate = (prop) => !!(prop && prop.date && prop.date.start);
const defaultStatus = (props) =>
  hasDate(props['Post Date']) || hasDate(props['Film By']) ? 'Planned' : 'Idea';

is('quick-add: no dates at all is an idea',
   defaultStatus({}), 'Idea');
is('quick-add: cleared date properties are still an idea',
   defaultStatus({ 'Post Date': { date: null }, 'Film By': { date: null } }), 'Idea');
is('quick-add: a post date makes it planned',
   defaultStatus({ 'Post Date': { date: { start: '2026-11-09' } }, 'Film By': { date: null } }), 'Planned');
is('quick-add: a shoot date alone makes it planned',
   defaultStatus({ 'Post Date': { date: null }, 'Film By': { date: { start: '2026-11-05' } } }), 'Planned');

/* ── the three words a client uses for where something is ───── */
section('Content: status to phase');

is('phase: an idea is planned', contentPhase('Idea'), 'planned');
is('phase: planned is planned', contentPhase('Planned'), 'planned');
is('phase: filmed is in progress', contentPhase('Filmed'), 'progress');
is('phase: our edit is in progress', contentPhase('Editing'), 'progress');
is('phase: waiting on the client is in progress', contentPhase('Ready for Review'), 'progress');
is('phase: approved is in progress until it goes out', contentPhase('Approved'), 'progress');
is('phase: posted is posted', contentPhase('Posted'), 'posted');
is('phase: skipped is in no phase', contentPhase('Skipped'), null);
is('phase: an unknown status is in no phase', contentPhase('Marinating'), null);
is('phase: no status at all is in no phase', contentPhase(null), null);
// The filter offers exactly three choices, so every status a card can
// hold has to land in one of them or be deliberately out.
is('phase: every status is placed or deliberately skipped',
   CONTENT_STATUSES.every((s) => s === 'Skipped' || contentPhase(s) !== null), true);

/* ── the one writable thing on Campaign Calendar ─────────────── */
section('Steps: what a client may tick');

const own = (status) => ({ owner: 'Client', status });
const ours = (status) => ({ owner: 'Blueprint', status });

is('step: the three statuses are exactly the client\'s three',
   STEP_CLIENT_STATUSES.join('|'), 'Not Started|In Progress|Done');
is('step: Done is a client status', isStepClientStatus('Done'), true);
is('step: Skipped is not', isStepClientStatus('Skipped'), false);
is('step: Moved is not', isStepClientStatus('Moved'), false);
is('step: a made-up status is not', isStepClientStatus('Nearly'), false);
is('step: a non-string is not', isStepClientStatus(1), false);

is('step: ticking off your own not-started step', canClientSetStep(own('Not Started'), 'Done'), true);
is('step: unticking your own done step', canClientSetStep(own('Done'), 'Not Started'), true);
is('step: starting your own step', canClientSetStep(own('Not Started'), 'In Progress'), true);
is('step: a step with no status yet reads as not started',
   canClientSetStep(own(null), 'Done'), true);

is('step: our step is not theirs to tick', canClientSetStep(ours('Not Started'), 'Done'), false);
is('step: a step with no owner is not theirs', canClientSetStep({ owner: null, status: null }, 'Done'), false);
is('step: a skipped step stays skipped', canClientSetStep(own('Skipped'), 'Done'), false);
is('step: a moved step stays moved', canClientSetStep(own('Moved'), 'Done'), false);
is('step: they cannot skip a step', canClientSetStep(own('Not Started'), 'Skipped'), false);
is('step: they cannot move a step', canClientSetStep(own('Not Started'), 'Moved'), false);
is('step: nonsense is refused', canClientSetStep(own('Not Started'), 'Done!'), false);
is('step: an object is refused', canClientSetStep(own('Not Started'), { select: 'Done' }), false);

// The step write carries the same stamp a content write does, so a
// to-do we ticked off on a client's behalf does not read as theirs.
const tick = (role) => stampEdit({ Status: { select: { name: 'Done' } } }, role);
is('step: a client ticking a box is stamped Client',
   tick('client')['Last Edited By'].select.name, 'Client');
is('step: one of us ticking a box is stamped Blueprint',
   tick('admin')['Last Edited By'].select.name, 'Blueprint');
is('step: the stamp does not disturb the status being written',
   tick('client').Status.select.name, 'Done');
is('step: and nothing else is written',
   Object.keys(tick('client')).sort().join('|'), 'Last Edited By|Status');

is('step: done is done', isStepDone(own('Done')), true);
is('step: in progress is not done', isStepDone(own('In Progress')), false);
is('step: no status is not done', isStepDone(own(null)), false);

// A ticked step leaves the to-do list, which is the whole point of the
// box. These two rules have to agree or a step can be both done and
// outstanding.
is('step: a done step is off the to-do list', isOpenClientTodo(own('Done')), false);
is('step: every status the client can set but Done stays on the list',
   STEP_CLIENT_STATUSES.filter((s) => isOpenClientTodo(own(s))).join('|'),
   'Not Started|In Progress');

section('Moving a step to another day');

const dstep = (owner, status) => ({ owner, status });

is('date: a client may move their own not-started step',
   canSetStepDate(dstep('Client', 'Not Started'), 'client'), true);
is('date: and one with no status yet',
   canSetStepDate(dstep('Client', null), 'client'), true);
is('date: and one they have already done',
   canSetStepDate(dstep('Client', 'Done'), 'client'), true);
is('date: but not ours', canSetStepDate(dstep('Blueprint', 'Not Started'), 'client'), false);
is('date: and not one with no owner', canSetStepDate(dstep(null, null), 'client'), false);
// Skipped and Moved are rows we took out of the plan. A client dragging
// one back onto the month would be putting it back in.
is('date: and not one we took out of the plan',
   canSetStepDate(dstep('Client', 'Moved'), 'client'), false);
is('date: nor a skipped one', canSetStepDate(dstep('Client', 'Skipped'), 'client'), false);

// One of us standing in a client's portal is the one place where more
// is allowed than the client has: we schedule our own work.
is('date: an admin may move our step', canSetStepDate(dstep('Blueprint', 'Not Started'), 'admin'), true);
is('date: an admin may move a moved one', canSetStepDate(dstep('Blueprint', 'Moved'), 'admin'), true);
is('date: an admin may move an unowned one', canSetStepDate(dstep(null, null), 'admin'), true);

is('day: a plain date is one', isIsoDay('2026-11-13'), true);
is('day: a datetime is not', isIsoDay('2026-11-13T10:00:00Z'), false);
is('day: the 31st of February is not', isIsoDay('2026-02-31'), false);
is('day: nonsense is not', isIsoDay('tomorrow'), false);
is('day: a number is not', isIsoDay(20261113), false);
is('day: null is not', isIsoDay(null), false);

is('shift: seven days on', shiftIsoDay('2026-11-13', 7), '2026-11-20');
is('shift: seven days back', shiftIsoDay('2026-11-13', -7), '2026-11-06');
is('shift: over the end of a month', shiftIsoDay('2026-11-27', 7), '2026-12-04');
is('shift: over the end of a year', shiftIsoDay('2026-12-28', 7), '2027-01-04');
// March in a timezone west of UTC is where a naive local-time shift
// quietly loses an hour and lands a day early.
is('shift: across a daylight saving change', shiftIsoDay('2027-03-13', 1), '2027-03-14');
is('shift: a leap day exists', shiftIsoDay('2028-02-28', 1), '2028-02-29');

is('between: a week later is seven', daysBetween('2026-11-13', '2026-11-20'), 7);
is('between: a week earlier is minus seven', daysBetween('2026-11-20', '2026-11-13'), -7);
is('between: the same day is zero', daysBetween('2026-11-13', '2026-11-13'), 0);
is('between: across the spring change is still a day',
   daysBetween('2027-03-13', '2027-03-14'), 1);
is('between: a date that is not one gives nothing', daysBetween('2026-11-13', 'soon'), null);

is('days: ninety is allowed', isMoveDays(MAX_MOVE_DAYS), true);
is('days: ninety back is allowed', isMoveDays(-MAX_MOVE_DAYS), true);
is('days: ninety-one is not', isMoveDays(MAX_MOVE_DAYS + 1), false);
is('days: nought is not a move', isMoveDays(0), false);
is('days: half a day is not', isMoveDays(1.5), false);
is('days: a string is not', isMoveDays('7'), false);

section('Moving a moment, and its campaign with it');

is('frozen: the three that stay put',
   STEP_FROZEN_STATUSES.join('|'), 'Skipped|Moved|Done');
is('frozen: a not-started step moves', movesWithMoment({ status: 'Not Started' }), true);
is('frozen: an in-progress step moves', movesWithMoment({ status: 'In Progress' }), true);
is('frozen: a step with no status moves', movesWithMoment({ status: null }), true);
is('frozen: a done step stays', movesWithMoment({ status: 'Done' }), false);
is('frozen: a skipped step stays', movesWithMoment({ status: 'Skipped' }), false);
is('frozen: a moved step stays', movesWithMoment({ status: 'Moved' }), false);

/* Rooftop Remix, as Notion actually holds it: a release on the 13th
   with twenty-nine rows pointing at it, sixteen of them left over from
   an earlier run of the playbook and marked Moved. Thirteen move. */
const REMIX = 'remix-moment';
const remixSteps = [
  { id: 's1', status: 'Not Started',  date: '2026-10-30' },
  { id: 's2', status: 'Not Started',  date: '2026-11-06' },
  { id: 's3', status: 'In Progress',  date: '2026-11-10' },
  { id: 's4', status: 'Not Started',  date: '2026-11-13' },
  { id: 's5', status: null,           date: '2026-11-27' },
  { id: 'x1', status: 'Moved',        date: '2026-10-28' },
  { id: 'x2', status: 'Moved',        date: '2026-11-13' },
  { id: 'x3', status: 'Done',         date: '2026-11-03' },
  { id: 'x4', status: 'Skipped',      date: '2026-11-06' },
  { id: 'u1', status: 'Not Started',  date: null },
];

const plan = planMomentMove({ id: REMIX, date: '2026-11-13' }, remixSteps, 7);

is('plan: the moment moves to the day asked for', plan.moment.to, '2026-11-20');
is('plan: and remembers where it was', plan.moment.from, '2026-11-13');
is('plan: every step still in the plan moves',
   plan.steps.map((w) => w.id).join(','), 's1,s2,s3,s4,s5');
is('plan: each by the same seven days',
   plan.steps.map((w) => w.to).join(','),
   '2026-11-06,2026-11-13,2026-11-17,2026-11-20,2026-12-04');
is('plan: the ones out of the plan are counted, not moved', plan.frozen, 4);
is('plan: a step with no date is neither moved nor counted as frozen',
   plan.steps.some((w) => w.id === 'u1'), false);
is('plan: days is echoed back', plan.days, 7);

// A moment relating to itself would otherwise be shifted twice: once
// as the moment and once as one of its own steps.
is('plan: a moment is never its own step',
   planMomentMove({ id: REMIX, date: '2026-11-13' },
                  [{ id: REMIX, status: 'Not Started', date: '2026-11-13' }], 7).steps.length,
   0);

is('plan: no move is no plan',
   planMomentMove({ id: REMIX, date: '2026-11-13' }, remixSteps, 0), null);
is('plan: further than the cap is no plan',
   planMomentMove({ id: REMIX, date: '2026-11-13' }, remixSteps, MAX_MOVE_DAYS + 1), null);
is('plan: a moment with no date is no plan',
   planMomentMove({ id: REMIX, date: null }, remixSteps, 7), null);
// Every step is its own Notion write, and a Worker has a fixed budget
// of those. Past the cap we refuse rather than half-move a campaign.
is('plan: more steps than one request can carry is no plan',
   planMomentMove(
     { id: REMIX, date: '2026-11-13' },
     Array.from({ length: MAX_CASCADE_STEPS + 1 }, (_, i) => (
       { id: `b${i}`, status: 'Not Started', date: '2026-11-13' })),
     7,
   ), null);

const backwards = planMomentMove({ id: REMIX, date: '2026-11-13' }, remixSteps, -3);
is('plan: backwards works the same way', backwards.moment.to, '2026-11-10');
is('plan: and takes the steps with it',
   backwards.steps.map((w) => w.to).join(','),
   '2026-10-27,2026-11-03,2026-11-07,2026-11-10,2026-11-24');

/* Undo is a replay of the old values, not an arithmetic inverse, so a
   row somebody edited in between goes back to what it was when we
   changed it rather than to wherever minus-seven days lands. */
const undone = reverseWrites([plan.moment, ...plan.steps]);
is('undo: it puts everything back',
   undone.map((w) => w.to).join(','),
   '2026-11-13,2026-10-30,2026-11-06,2026-11-10,2026-11-13,2026-11-27');
is('undo: and names the same rows',
   undone.map((w) => w.id).join(','), `${REMIX},s1,s2,s3,s4,s5`);
is('undo: a write with no old value is left alone',
   reverseWrites([{ id: 'z', from: null, to: '2026-11-20' }]).length, 0);

is('write: a plan becomes one Notion date property',
   dateProperty(plan.steps[0]).Date.date.start, '2026-11-06');
is('write: and nothing but the date',
   Object.keys(dateProperty(plan.steps[0])).join('|'), 'Date');

const rec = {
  slug: 'sean-comma', momentId: REMIX, days: 7,
  writes: [plan.moment], exp: 9999999999,
};
is('undo record: a whole one is one', isMoveUndo(rec), true);
is('undo record: one with no slug is not', isMoveUndo({ ...rec, slug: undefined }), false);
is('undo record: one with no days is not', isMoveUndo({ ...rec, days: undefined }), false);
// The record is read back out of KV, so a corrupt or crafted one must
// not become a list of dates we write to pages.
is('undo record: one whose writes are not dates is not',
   isMoveUndo({ ...rec, writes: [{ id: 'a', to: 'whenever' }] }), false);
is('undo record: one with no writes array is not',
   isMoveUndo({ ...rec, writes: 'all of them' }), false);
is('undo record: a string is not', isMoveUndo('{}'), false);
is('undo record: null is not', isMoveUndo(null), false);

// A date is the only thing a cascade writes. Last Edited By comes from
// the session on top of this, the same as every other portal write.
is('write: a cascade write stamps Blueprint for us',
   stampEdit(dateProperty(plan.moment), 'admin')['Last Edited By'].select.name, 'Blueprint');
is('write: and Client when they did it',
   stampEdit(dateProperty(plan.moment), 'client')['Last Edited By'].select.name, 'Client');

// One cascade is tens of Notion writes, so it cannot be allowed to
// spend from the same budget as a content save that costs one.
ok('limit: a cascade is rarer than an ordinary write', MOVE_LIMIT < WRITE_LIMIT);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
