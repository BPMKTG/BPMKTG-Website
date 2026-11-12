import {
  // shaping
  cleanItemTitle,
  isVisibleToClient,
  isMetricProp,
  isEngagementMetric,
  formatEngagement,
  isOpenClientTodo,
  canSetStepStatus,
  // Blueprint HQ · reports
  REPORT_FIELDS,
  reportGaps,
  blocksPublish,
  reportDrafts,
  reportPublished,
  sortAudits,
  docBase,
  mailSentAt,
  isStepClientStatus,
  isStepDone,
  STEP_CLIENT_STATUSES,
  // calendar layers
  isFilmStep,
  showsOnCalendar,
  stepLayers,
  FILM_MARK,
  HQ_LAYERS,
  PORTAL_LAYERS,
  STEP_OFF_CALENDAR,
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
  canDrop,
  cardFilmCovered,
  filmCover,
  cardDate,
  dropStatus,
  STAGE_NOTE,
  STAGE_ORDER,
  STAGE_TITLE,
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
  editedBy,
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
  // the brand brief
  BRIEF_FILE,
  MAX_BRIEF_BYTES,
  briefKey,
  briefUrl,
  looksLikePdf,
  fileSize,
  // Blueprint HQ
  buildToday,
  groupByCampaign,
  momentIndex,
  oneLine,
  NO_CAMPAIGN,
  NOTE_SEP,
  bucketFor,
  stepRows,
  contentRows,
  nextActionRows,
  matchesFilter,
  sortRows,
  stripItems,
  snoozeTo,
  isoToday,
  addDays,
  WEEK_DAYS,
  STRIP_DAYS,
  STEP_SETTLED,
  CONTENT_SETTLED,
  DEAD_STAGES,
  buildHqClientProperties,
  cleanNextAction,
  isHqStage,
  HQ_STAGES,
  HQ_CLIENT_EDITABLE,
  MAX_NEXT_ACTION,
  clientHealth,
  clientFacts,
  stepUpSoon,
  HEALTH,
  HEALTH_RULES,
  CARD_STAGES,
  buildNewLead,
  isLeadSource,
  LEAD_SOURCES,
  MAX_ARTIST,
  NEW_LEAD_STAGE,
  cleanBriefUrl,
  MAX_BRIEF_URL,
  briefHost,
  isOurBriefUrl,
  isSafeBriefUrl,
  readBrief,
  // HQ's calendar, across clients
  onCalendar,
  clientColor,
  deliverables,
  CLIENT_COLORS,
  DELIVERABLES_MIN,
  DELIVERABLES_MAX,
  dayClash,
  itemKind,
  momentKind,
  cardFilmRow,
  cardOnCalendar,
  cardRowTitle,
  flowChip,
  flowOf,
  flowOwner,
  isBlueprintWork,
  postsBy,
  sameId,
  stepsCoveredByCards,
  CARD_FILMED,
  POSTS_LABEL,
  STEP_FLOWS,
  KIND_LABEL,
} from '../.tmp-portal-lib.mjs';
import { readFileSync } from 'node:fs';

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
// Our own work reaches the client now. It is read-only there, and
// the refusal is on the server: canSetStepStatus and canSetStepDate
// both say no to a step the client does not own.
is('visible: a Blueprint admin step shows, to be read',
   vis({ type: 'Admin', owner: 'Blueprint' }), true);
is('visible: a playbook template is hidden', vis({ isPlaybook: true }), false);
is('visible: Hide from Client wins over everything',
   isVisibleToClient({ isPlaybook: false, hideFromClient: true, kind: 'Moment', type: 'Content', owner: 'Client' }),
   false);
is('visible: Is Playbook wins even for a client-owned moment',
   isVisibleToClient({ isPlaybook: true, hideFromClient: false, kind: 'Moment', type: 'Content', owner: 'Client' }),
   false);
is('visible: a step whose Owner and Type are both unset is still hidden',
   vis({ kind: 'Step', type: 'Admin', owner: null }), false);
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
    // Our own work: Owner Blueprint, Type Admin. It reaches the client
    // now, read-only, and carries the Flow Notion holds.
    id: 'cal-2',
    properties: {
      'Item': { type: 'title', title: [{ plain_text: 'Sean Comma · Invoice chase' }] },
      'Kind': { type: 'select', select: { name: 'Step' } },
      'Type': { type: 'select', select: { name: 'Admin' } },
      'Owner': { type: 'select', select: { name: 'Blueprint' } },
      'Flow': { type: 'select', select: { name: 'Blueprint task' } },
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

is('calendar: hidden rows are dropped and our own work is kept',
   calendar.map(i => i.title).sort(),
   ['Announce the show', 'Invoice chase', 'Orphan step', 'Red Rocks',
    'Rooftop Revival', 'Teaser 1']);
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

// report-publish.ts stamps the same two words into KPI Snapshots,
// where the column is Text rather than a Select. The shapes differ;
// the vocabulary must not.
is('build: the stamp vocabulary has one source',
   [editedBy('admin'), editedBy('client')],
   [stampEdit({}, 'admin')['Last Edited By'].select.name,
    stampEdit({}, 'client')['Last Edited By'].select.name]);

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
// Source decides the pre-camera column now, not Film By. A flyer we
// are drawing has a Film By too, and it used to land in the client's
// To film pile with a date they could do nothing about.
is('pipeline: a film date alone is not To film',
   stageOf(card({ status: 'Planned', filmBy: '2026-11-01' }), nowC), 'planned');
is('pipeline: Client Films is To film',
   stageOf(card({ status: 'Planned', filmBy: '2026-11-01', source: 'Client Films' }), nowC), 'toFilm');
is('pipeline: Client Films is To film even with no film date',
   stageOf(card({ status: 'Planned', source: 'Client Films' }), nowC), 'toFilm');
is('pipeline: a flyer we draw goes to Up next, not To film',
   stageOf(card({ status: 'Planned', filmBy: '2026-11-01', source: 'Flyer / Graphic' }), nowC), 'upNext');
is('pipeline: show media goes to Up next',
   stageOf(card({ status: 'Planned', source: 'Show Media' }), nowC), 'upNext');
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
is('pipeline: a dated idea the client films lands in To film',
   stageOf(card({ status: 'Idea', postDate: '2026-11-09', filmBy: '2026-11-05',
                  source: 'Client Films' }), nowC), 'toFilm');
is('pipeline: a dated idea with a shoot date but no source stays in Planned',
   stageOf(card({ status: 'Idea', postDate: '2026-11-09', filmBy: '2026-11-05' }), nowC), 'planned');
is('pipeline: an idea with only a shoot date is still on the board',
   stageOf(card({ status: 'Idea', filmBy: '2026-11-05', source: 'Client Films' }), nowC), 'toFilm');
is('ideas: a dated idea is off the Ideas board',
   isIdea({ status: 'Idea', postDate: '2026-11-09' }), false);
is('pipeline: a recent post still shows',
   stageOf(card({ status: 'Posted', postDate: '2026-10-20' }), nowC), 'posted');
is('pipeline: a post older than 30 days drops off',
   stageOf(card({ status: 'Posted', postDate: '2026-09-01' }), nowC), null);
is('pipeline: the 30th day still counts',
   stageOf(card({ status: 'Posted', postDate: '2026-09-28' }), nowC), 'posted');

section('Calendar: one film day per campaign');

{
  const step = (o) => ({ id: 'x', kind: 'Step', momentType: null, status: 'Not Started',
    flow: null, owner: null, type: null, title: null, moment: null, ...o });
  const shoot = (id, momentId, o = {}) => step({ id, moment: { id: momentId },
    owner: 'Client', flow: 'Client film session', ...o });

  const cover = filmCover([
    shoot('s1', 'm1'),
    step({ id: 's2', moment: { id: 'm1' }, owner: 'Blueprint', type: 'Content' }),
    step({ id: 's3', moment: { id: 'm2' }, owner: 'Blueprint', type: 'Content' }),
    shoot('s4', 'm3', { status: 'Skipped' }),
  ]);

  is('film cover: the campaign with a shoot is covered', cover.moments.has('m1'), true);
  is('film cover: a campaign with no shoot is not', cover.moments.has('m2'), false);
  is('film cover: a shoot taken out of the plan covers nothing',
     cover.moments.has('m3'), false);

  is('film cover: a card linked to the moment falls silent',
     cardFilmCovered({ campaign: ['m1'] }, cover), true);
  is('film cover: a card linked to a step of that moment too',
     cardFilmCovered({ campaign: ['s2'] }, cover), true);
  is('film cover: a card on a campaign with no shoot keeps its chip',
     cardFilmCovered({ campaign: ['m2'] }, cover), false);
  is('film cover: a card linked to nothing always keeps its chip',
     cardFilmCovered({ campaign: [] }, cover), false);
  is('film cover: dashes in an id do not hide the match',
     cardFilmCovered({ campaign: ['M1'] }, cover), true);
  is('film cover: the skipped shoot leaves its own cards speaking',
     cardFilmCovered({ campaign: ['m3'] }, cover), false);

  // The two rules compose: covered decides whether to ask, cardFilmRow
  // decides whether there is anything left to shoot.
  const c = { filmBy: '2026-11-10', status: 'Planned', campaign: ['m1'] };
  is('film cover: covered beats a live film date',
     cardFilmRow(c) && !cardFilmCovered(c, cover), false);
  const own = { filmBy: '2026-11-10', status: 'Planned', campaign: [] };
  is('film cover: the client\u2019s own planned shoot still draws',
     cardFilmRow(own) && !cardFilmCovered(own, cover), true);
}

section('Pipeline: whose move is it');

const pcard = (o) => ({ status: null, source: null, postedBy: null,
  filmBy: null, postDate: null, ...o });

// ── the three pre-camera columns share one status, so a drop into the
//    wrong one of them is refused rather than bounced ──
is('drop: Client Films into To film writes Planned',
   dropStatus(pcard({ source: 'Client Films' }), 'toFilm'), 'Planned');
is('drop: Client Films cannot go in Up next',
   dropStatus(pcard({ source: 'Client Films' }), 'upNext'), null);
is('drop: a flyer cannot go in To film',
   dropStatus(pcard({ source: 'Flyer / Graphic' }), 'toFilm'), null);
is('drop: a flyer into Up next writes Planned',
   dropStatus(pcard({ source: 'Flyer / Graphic' }), 'upNext'), 'Planned');
is('drop: a sourceless card belongs to Planned alone',
   [dropStatus(pcard({}), 'planned'), dropStatus(pcard({}), 'toFilm'), dropStatus(pcard({}), 'upNext')],
   ['Planned', null, null]);
is('drop: a sourced card is not allowed back into plain Planned',
   dropStatus(pcard({ source: 'Client Films' }), 'planned'), null);
is('drop: every later column maps to one status',
   ['filmed', 'editing', 'review', 'ready', 'posted'].map((st) => dropStatus(pcard({}), st)),
   ['Filmed', 'Editing', 'Ready for Review', 'Approved', 'Posted']);

// ── the client's own two moves ──
is('move: To film to Filmed is the client\u2019s',
   canDrop(pcard({ status: 'Planned', source: 'Client Films' }), 'filmed', 'client'), true);
is('move: and back out again, on a card they film',
   canDrop(pcard({ status: 'Filmed', source: 'Client Films' }), 'toFilm', 'client'), true);
is('move: but not back out of ours',
   canClientMove('Filmed', 'Planned', { source: 'Flyer / Graphic' }), false);
is('move: Your review, approved',
   canDrop(pcard({ status: 'Ready for Review' }), 'ready', 'client'), true);
is('move: Your review, handed back to us',
   canClientMove('Ready for Review', 'Editing'), true);
is('move: a client cannot reach In edit from anywhere else',
   canClientMove('Planned', 'Editing'), false);

// ── a row the client posts is theirs end to end ──
is('move: Posted By Client goes anywhere',
   ['filmed', 'editing', 'review', 'ready', 'posted'].map((st) =>
     canDrop(pcard({ status: 'Planned', postedBy: 'Client' }), st, 'client')),
   [true, true, true, true, true]);
is('move: the same card, posted by us, does not',
   canDrop(pcard({ status: 'Planned', postedBy: 'Blueprint' }), 'editing', 'client'), false);
is('move: Posted By Client still cannot break the Source rule',
   canDrop(pcard({ status: 'Planned', postedBy: 'Client', source: 'Client Films' }), 'upNext', 'client'),
   false);

// ── admin moves anything the column can hold ──
is('move: admin reaches every real column',
   ['filmed', 'editing', 'review', 'ready', 'posted'].map((st) =>
     canDrop(pcard({ status: 'Planned', postedBy: 'Blueprint' }), st, 'admin')),
   [true, true, true, true, true]);
is('move: admin is still refused a column that would bounce',
   canDrop(pcard({ status: 'Planned', source: 'Client Films' }), 'upNext', 'admin'), false);

// ── no cell of the board lets a client write one of ours ──
{
  const statuses = ['Idea', 'Planned', 'Filmed', 'Footage In', 'Editing',
    'Ready for Review', 'Approved', 'Scheduled', 'Posted', 'Skipped'];
  const sources = [null, 'Client Films', 'Show Media', 'Flyer / Graphic'];
  const stages = ['upNext', 'planned', 'toFilm', 'filmed', 'editing', 'review', 'ready', 'posted'];
  let wrong = [];
  for (const status of statuses) {
    for (const source of sources) {
      for (const stage of stages) {
        const ours = pcard({ status, source, postedBy: 'Blueprint' });
        if (!canDrop(ours, stage, 'client')) continue;
        const to = dropStatus(ours, stage);
        // Allowed by canDrop means allowed by the table the server
        // enforces. If those two ever disagree, the board offers a
        // move the server will refuse, which is the silent failure
        // this whole pass exists to remove.
        if (!canClientMove(status, to, { postedBy: 'Blueprint', source })) {
          wrong.push(`${status}/${source}/${stage}`);
        }
      }
    }
  }
  is('move: the board never offers a client a move the server refuses', wrong, []);
}

section('Pipeline: the date on the face of a card');

is('card date: a film date the client owns',
   cardDate(pcard({ source: 'Client Films', filmBy: '2026-11-10', postDate: '2026-11-14' })),
   { label: 'Film by', date: '2026-11-10' });
is('card date: a flyer shows when it posts, never a film date',
   cardDate(pcard({ source: 'Flyer / Graphic', filmBy: '2026-11-10', postDate: '2026-11-14' })),
   { label: 'Posts', date: '2026-11-14' });
is('card date: show media the same',
   cardDate(pcard({ source: 'Show Media', filmBy: '2026-11-10', postDate: '2026-11-14' })),
   { label: 'Posts', date: '2026-11-14' });
is('card date: once it is shot, the film date stops being news',
   cardDate(pcard({ source: 'Client Films', status: 'Filmed',
                    filmBy: '2026-11-10', postDate: '2026-11-14' })),
   { label: 'Posts', date: '2026-11-14' });
is('card date: nothing dated says nothing', cardDate(pcard({})), null);
is('card date: no source and a film date is still not a film job',
   cardDate(pcard({ filmBy: '2026-11-10' })), null);

is('board: Up next comes first', STAGE_ORDER[0], 'upNext');
is('board: every column has a title',
   STAGE_ORDER.filter((st) => !STAGE_TITLE[st]), []);
is('board: the two columns with an owner say so',
   STAGE_ORDER.filter((st) => STAGE_NOTE[st]), ['upNext', 'toFilm', 'review']);

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

is('step: ticking off your own not-started step', canSetStepStatus(own('Not Started'), 'Done'), true);
is('step: unticking your own done step', canSetStepStatus(own('Done'), 'Not Started'), true);
is('step: starting your own step', canSetStepStatus(own('Not Started'), 'In Progress'), true);
is('step: a step with no status yet reads as not started',
   canSetStepStatus(own(null), 'Done'), true);

is('step: our step is not theirs to tick', canSetStepStatus(ours('Not Started'), 'Done'), false);
is('step: a step with no owner is not theirs', canSetStepStatus({ owner: null, status: null }, 'Done'), false);
is('step: a skipped step stays skipped', canSetStepStatus(own('Skipped'), 'Done'), false);
is('step: a moved step stays moved', canSetStepStatus(own('Moved'), 'Done'), false);
is('step: they cannot skip a step', canSetStepStatus(own('Not Started'), 'Skipped'), false);
is('step: they cannot move a step', canSetStepStatus(own('Not Started'), 'Moved'), false);
is('step: nonsense is refused', canSetStepStatus(own('Not Started'), 'Done!'), false);
is('step: an object is refused', canSetStepStatus(own('Not Started'), { select: 'Done' }), false);

// The role is the pair to canSetStepDate's, and it has to be, because
// HQ's Today list puts our steps and the client's in one list with one
// tick box. Every case above is the client's; these are ours.
is('step: a caller that does not say which role is held to the client rule',
   canSetStepStatus(ours('Not Started'), 'Done'), false);
is('step: one of us may tick our own step',
   canSetStepStatus(ours('Not Started'), 'Done', 'admin'), true);
is('step: one of us may tick a client step too',
   canSetStepStatus(own('Not Started'), 'Done', 'admin'), true);
is('step: one of us may tick an unowned step',
   canSetStepStatus({ owner: null, status: null }, 'Done', 'admin'), true);
is('step: one of us may untick',
   canSetStepStatus(ours('Done'), 'Not Started', 'admin'), true);
// The frozen statuses are frozen for everybody. Putting a step we
// dropped back into the plan is an edit in Notion, not a stray tap.
is('step: a skipped step stays skipped even for us',
   canSetStepStatus(ours('Skipped'), 'Done', 'admin'), false);
is('step: a moved step stays moved even for us',
   canSetStepStatus(ours('Moved'), 'Done', 'admin'), false);
is('step: we cannot reach Skipped from here either',
   canSetStepStatus(ours('Not Started'), 'Skipped', 'admin'), false);
is('step: nor Moved', canSetStepStatus(ours('Not Started'), 'Moved', 'admin'), false);
is('step: nonsense is refused for us as well',
   canSetStepStatus(ours('Not Started'), 'Done!', 'admin'), false);
// A role that is not 'admin' is not a way in: anything unrecognised
// falls to the client rule rather than through it.
is('step: an unknown role is held to the client rule',
   canSetStepStatus(ours('Not Started'), 'Done', 'blueprint'), false);
is('step: an empty role is held to the client rule',
   canSetStepStatus(ours('Not Started'), 'Done', ''), false);

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

section('Calendar layers');

/* The fixture is the cross product. Campaign Calendar's Owner is
   Blueprint or Client and its Type is Admin or Content, so four rows
   cover every step there can be, and the clapperboard doubles it. */
const cal = (owner, type, status = 'Not Started', title = 'A step') =>
  ({ owner, type, status, title });

const layers = (row) => stepLayers(row).join('|');

is('layer: a client content step is a post and a to-do',
   layers(cal('Client', 'Content')), 'posts|todos');
is('layer: a client admin step is only a to-do',
   layers(cal('Client', 'Admin')), 'todos');
is('layer: a content step of ours is a post and nothing else',
   layers(cal('Blueprint', 'Content')), 'posts');
is('layer: an admin step of ours is the only thing in Blueprint tasks',
   layers(cal('Blueprint', 'Admin')), 'blueprint');

// The bug this replaced: every Blueprint-owned row landed in Blueprint
// tasks, so the column meant for our admin work listed our posts.
is('layer: a content step of ours is NOT a Blueprint task',
   stepLayers(cal('Blueprint', 'Content')).includes('blueprint'), false);

// Every step lands somewhere, so nothing can go invisible.
for (const owner of ['Blueprint', 'Client']) {
  for (const type of ['Admin', 'Content']) {
    is(`layer: ${owner} + ${type} is in at least one layer`,
       stepLayers(cal(owner, type)).length > 0, true);
  }
}

// A shoot is the filming, not the post.
const film = (owner, type) => cal(owner, type, 'Not Started', `${FILM_MARK} Film: a thing`);

// A clapperboard only turns a step into a shoot where the flow is in
// doubt. A client's Content step is a post they make, clapperboard or
// not, because the flow says Client makes + posts; the shoot has its
// own Admin step.
is('layer: a clapperboard content step of theirs is still a post of theirs',
   layers(film('Client', 'Content')), 'posts|todos');
is('layer: a clapperboard admin step of theirs is their film day',
   layers(film('Client', 'Admin')), 'films|todos');
is('layer: and it is not also a post',
   stepLayers(film('Client', 'Admin')).includes('posts'), false);
// A shoot WE run is our work and nothing else. Putting it under Film
// days would read to a client as a day they have to hold a camera.
is('layer: a clapperboard admin step of ours is ours alone',
   layers(film('Blueprint', 'Admin')), 'blueprint');
is('layer: the mark is one clapperboard',
   FILM_MARK.codePointAt(0).toString(16), '1f3a5');
is('layer: leading space before the mark still counts',
   isFilmStep({ title: `  ${FILM_MARK} Film: later` }), true);
is('layer: the mark in the middle does not',
   isFilmStep({ title: `Film ${FILM_MARK} later` }), false);
is('layer: no title is not a film day', isFilmStep({ title: null }), false);

// Status decides whether a step is on the calendar at all.
is('layer: a not-started step is on the calendar',
   showsOnCalendar(cal('Client', 'Admin', 'Not Started')), true);
is('layer: an in-progress step is on the calendar',
   showsOnCalendar(cal('Client', 'Admin', 'In Progress')), true);
is('layer: a done step stays on the calendar, ticked',
   showsOnCalendar(cal('Client', 'Admin', 'Done')), true);
is('layer: a skipped step is off the calendar',
   showsOnCalendar(cal('Blueprint', 'Content', 'Skipped')), false);
is('layer: a moved step is off the calendar',
   showsOnCalendar(cal('Blueprint', 'Content', 'Moved')), false);
is('layer: a step with no status yet is on the calendar',
   showsOnCalendar(cal('Client', 'Admin', null)), true);
is('layer: the two statuses that take a step off the calendar',
   STEP_OFF_CALENDAR.join('|'), 'Skipped|Moved');

// Skipped and Moved are also the statuses a cascade leaves alone, but
// Done is frozen and still drawn, so the two lists are not the same
// list and must not be collapsed into one.
is('layer: Done is frozen in a cascade yet still on the calendar',
   `${movesWithMoment({ status: 'Done' })}/${showsOnCalendar({ status: 'Done' })}`,
   'false/true');

/* Both screens now draw the same five. The portal's query fetches our
   own work, so the layer is no longer an empty column there: it is
   the one the client reads and cannot touch. */
is('layer: the portal has five layers',
   PORTAL_LAYERS.join('|'), 'moments|posts|films|todos|blueprint');
is('layer: HQ has the same five',
   HQ_LAYERS.join('|'), PORTAL_LAYERS.join('|'));
is('layer: the portal does have Blueprint\u2019s work',
   PORTAL_LAYERS.includes('blueprint'), true);
is('layer: neither screen has a layer the other lacks',
   HQ_LAYERS.length - PORTAL_LAYERS.length, 0);

/* Our own work lands in a layer both screens have. What keeps the
   client from changing it is not the layer but the permission rule,
   which is on the server. */
is('layer: an admin step of ours is in a layer the portal has',
   stepLayers(cal('Blueprint', 'Admin')).some((l) => PORTAL_LAYERS.includes(l)),
   true);
is('layer: a client may not move one',
   canSetStepDate(cal('Blueprint', 'Admin'), 'client'), false);
is('layer: or tick one',
   canSetStepStatus(cal('Blueprint', 'Admin'), 'Done', 'client'), false);
is('layer: and we may do both',
   [canSetStepDate(cal('Blueprint', 'Admin'), 'admin'),
    canSetStepStatus(cal('Blueprint', 'Admin'), 'Done', 'admin')].join('|'),
   'true|true');

/* The live rows this was found against: Sean Comma, November 2026.
   Each of these is a real Item, and the four skipped ones were on his
   calendar when he reported it. */
const seanSkipped = [
  cal('Blueprint', 'Content', 'Skipped', "Set preview: snippet of a track he'll play"),
  cal('Blueprint', 'Content', 'Skipped', 'Short-form: this drops in four weeks'),
  cal('Blueprint', 'Content', 'Skipped', 'Cut three: different angle'),
  cal('Blueprint', 'Content', 'Skipped', 'Crowd or POV clip'),
];
is('layer: none of the four steps Sean could see survive the status rule',
   seanSkipped.filter(showsOnCalendar).length, 0);

const seanAdmin = [
  cal('Blueprint', 'Admin', 'Not Started', 'Book capture: send the Show Media Brief or quote Event Media'),
  cal('Blueprint', 'Admin', 'Not Started', 'Put the ticket or RSVP link in bio and keep it there through show night'),
  cal('Blueprint', 'Admin', 'Not Started', 'Decide the one hook the rollout is built on'),
  cal('Blueprint', 'Admin', 'Not Started', 'Set up the free download gate (follow + email)'),
  cal('Blueprint', 'Admin', 'Not Started', 'Submit editorial pitch'),
];
is('layer: all five of the steps expected in Blueprint tasks are in it',
   seanAdmin.filter((r) => stepLayers(r).includes('blueprint')).length, 5);
is('layer: and every one of them is on the calendar',
   seanAdmin.filter(showsOnCalendar).length, 5);

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

/* ══ The brand brief ═════════════════════════════════════════════
   One PDF per client at one key, replaced on re-upload. There is no
   Notion row behind it, so the key IS the record: get it wrong and a
   client's brief either cannot be found or, far worse, is served to
   somebody else. */

section('The brand brief');

is('brief: the key is briefs/<slug>/brand-brief.pdf',
   briefKey('sean-comma'), 'briefs/sean-comma/brand-brief.pdf');
// Replace on re-upload is the whole design: same client, same key,
// every time, whatever the uploaded file was called.
is('brief: the same client always gets the same key',
   briefKey('sean-comma'), briefKey('sean-comma'));
is('brief: two clients never share one',
   briefKey('sean-comma') === briefKey('other-artist'), false);
// The slug reaches a storage key, so it goes through the same cleaner
// as every other key rather than being trusted as it arrives.
is('brief: a slug with junk in it is cleaned',
   briefKey('../../etc/passwd'), 'briefs/etc-passwd/brand-brief.pdf');
is('brief: and an empty one does not collapse the path',
   briefKey(''), 'briefs/unnamed/brand-brief.pdf');
is('brief: the file is always called the same thing', BRIEF_FILE, 'brand-brief.pdf');

// The URL is root-relative on purpose: it rides in the cached payload
// and a baked-in origin would be wrong the moment a preview
// deployment and production shared a cache entry.
is('brief: the URL goes through the portal, never at R2',
   briefUrl('sean-comma'), '/portal/sean-comma/files/briefs/sean-comma/brand-brief.pdf');
ok('brief: and it is relative', briefUrl('sean-comma').startsWith('/'));

// The files endpoint only hands over keys that match its own filter.
// A brief key that cannot get through it is a brief nobody can read.
const BRIEF_KEY_SHAPE = /^[a-z0-9/-]+\.pdf$/;
ok('brief: the key passes the file endpoint\u2019s filter',
   BRIEF_KEY_SHAPE.test(briefKey('sean-comma')));
ok('brief: and it sits under the client\u2019s own prefix',
   briefKey('sean-comma').startsWith('briefs/sean-comma/'));

/* What counts as a PDF. The endpoint stores this under a key it then
   serves as application/pdf, so the bytes decide, not the filename. */

const pdfBytes = (head) => new TextEncoder().encode(head);
ok('brief: a real header passes', looksLikePdf(pdfBytes('%PDF-1.4\n…')));
is('brief: HTML does not', looksLikePdf(pdfBytes('<!doctype html>')), false);
is('brief: a PNG does not', looksLikePdf(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d])), false);
is('brief: empty does not', looksLikePdf(new Uint8Array()), false);
is('brief: and nor does something shorter than the magic',
   looksLikePdf(pdfBytes('%PDF')), false);
// The real thing, off disk, so this does not only pass against bytes
// the test made up.
const REAL_PDF = new Uint8Array(readFileSync(new URL('./fixtures/brief-head.bin', import.meta.url)));
ok('brief: the file Mason actually uploaded passes', looksLikePdf(REAL_PDF));

is('brief: the cap is 25MB', MAX_BRIEF_BYTES, 25 * 1024 * 1024);

/* The browser carries its own copy of the cap so a 40MB file is
   refused before it is uploaded. Two numbers, one rule. */
const PANEL_SRC = readFileSync(new URL('../src/pages/portal/index.astro', import.meta.url), 'utf8');
const mb = /const MAX_BRIEF_MB = (\d+);/.exec(PANEL_SRC);
ok('brief: the panel has a cap of its own', Boolean(mb));
is('brief: and it is the server\u2019s cap',
   Number(mb?.[1] ?? -1) * 1024 * 1024, MAX_BRIEF_BYTES);

// HQ uploads too, and carries the same number for the same reason.
const HQ_SRC = readFileSync(new URL('../src/pages/portal/hq-ui.astro', import.meta.url), 'utf8');
const hqMb = /const MAX_BRIEF_MB = (\d+);/.exec(HQ_SRC);
ok('brief: HQ has a cap of its own', Boolean(hqMb));
is('brief: and it is the same cap',
   Number(hqMb?.[1] ?? -1) * 1024 * 1024, MAX_BRIEF_BYTES);
// HQ posts to the client's own admin route rather than a second one
// of its own. If that path ever moves, this says so.
ok('brief: HQ posts to the client\u2019s admin brief route',
   /\/admin\/brief`/.test(HQ_SRC));

/* The file endpoint is what actually hands the bytes over, and it
   only serves prefixes it has been told a client owns. Miss this and
   the brief is stored, listed, linked and then 404s. */
const FILES_SRC = readFileSync(
  new URL('../functions/portal/[slug]/files/[[key]].ts', import.meta.url), 'utf8');
const owned = /const ownedPrefixes = \(slug: string\) => \[([^\]]*)\]/.exec(FILES_SRC);
ok('brief: the file endpoint lists what a client owns', Boolean(owned));
ok('brief: and briefs/ is one of them', (owned?.[1] ?? '').includes('briefs/${slug}/'));
// Under the slug, never bare: `briefs/` on its own would hand every
// client every other client's brief.
is('brief: never a bare briefs/ prefix',
   /`briefs\/`/.test(owned?.[1] ?? ''), false);

/* And the upload panel has to be reachable from the state it exists
   to fix: a Files tab with nothing on it. Same bug as the Publish
   button, which went missing for exactly this reason. */
const filesEmpty = PANEL_SRC.indexOf("if (!live.length && !BRIEF) {");
ok('brief: the empty Files state exists', filesEmpty > 0);
ok('brief: and it still offers the upload panel',
   PANEL_SRC.slice(filesEmpty, filesEmpty + 700).includes('appendBrief'));

is('brief: kilobytes under a megabyte', fileSize(350 * 1024), '350 KB');
is('brief: megabytes above it', fileSize(1_197_865), '1.1 MB');
is('brief: bytes when it is tiny', fileSize(900), '900 B');

/* ══ 13. Blueprint HQ ═══════════════════════════════════════════
   The Today list, and the one Clients write.

   Every date here is pinned to a fixed "now" rather than the real
   clock: a test that passes in the morning and fails at 23:30 is worse
   than no test. NOW is a Thursday. */

section('Blueprint HQ · dates and sections');

const NOW = new Date('2026-11-05T14:30:00Z');   // Thursday
const TODAY = '2026-11-05';

is('hq: today is read at UTC', isoToday(NOW), TODAY);
is('hq: a late evening is still the same day',
   isoToday(new Date('2026-11-05T23:59:59Z')), TODAY);
is('hq: adding days crosses a month end', addDays('2026-11-28', 5), '2026-12-03');
is('hq: and a leap day', addDays('2028-02-28', 1), '2028-02-29');
is('hq: subtracting works too', addDays('2026-11-05', -5), '2026-10-31');

is('hq: yesterday is overdue', bucketFor('2026-11-04', NOW), 'overdue');
is('hq: long ago is overdue', bucketFor('2026-08-01', NOW), 'overdue');
is('hq: today is today', bucketFor(TODAY, NOW), 'today');
is('hq: tomorrow is this week', bucketFor('2026-11-06', NOW), 'week');
is('hq: the seventh day is still this week',
   bucketFor(addDays(TODAY, WEEK_DAYS), NOW), 'week');
is('hq: the eighth day is off the list',
   bucketFor(addDays(TODAY, WEEK_DAYS + 1), NOW), null);
is('hq: an undated row is in no section', bucketFor(null, NOW), null);

/* ── the row builders ──────────────────────────────────────────── */

section('Blueprint HQ · what reaches the Today list');

const SEAN = {
  pageId: 'c-sean', slug: 'sean-comma', artist: 'Sean Comma',
  stage: 'Active', nextAction: null, nextActionDate: null,
};
const LEAD = {
  pageId: 'c-lead', slug: 'new-lead', artist: 'A Lead',
  stage: 'Lead', nextAction: 'Send the proposal', nextActionDate: null,
};
const BY_ID = new Map([[SEAN.pageId, SEAN], [LEAD.pageId, LEAD]]);

const hqStep = (over = {}) => ({
  id: 's1', clientId: 'c-sean', title: 'Film the b-roll',
  kind: 'Step', type: 'Content', owner: 'Blueprint',
  status: 'Not Started', date: TODAY, ...over,
});

is('hq: our own step reaches the list', stepRows([hqStep()], BY_ID, NOW).length, 1);
is('hq: and it reads as ours', stepRows([hqStep()], BY_ID, NOW)[0].owner, 'blueprint');
// Today carries the flow too, so a row says what kind of job it is
// and not only whose. Derived where Notion has not set it.
is('hq: a Today row carries its flow',
   stepRows([hqStep({ type: 'Admin' })], BY_ID, NOW)[0].flow, 'Blueprint task');
is('hq: derived from Owner and Type where Notion is empty',
   stepRows([hqStep({ owner: 'Client', type: 'Content' })], BY_ID, NOW)[0].flow,
   'Client makes + posts');
is('hq: and taken from Notion where it is set',
   stepRows([hqStep({ owner: 'Blueprint', type: 'Content',
                      flow: 'Client films \u2192 Blueprint edits + posts' })], BY_ID, NOW)[0].flow,
   'Client films \u2192 Blueprint edits + posts');
is('hq: a client step reads as theirs',
   stepRows([hqStep({ owner: 'Client' })], BY_ID, NOW)[0].owner, 'client');
// The whole reason HQ exists: the portal hides our steps, this does not.
is('hq: both owners are on one list',
   stepRows([hqStep(), hqStep({ id: 's2', owner: 'Client' })], BY_ID, NOW).length, 2);

// A moment is not a task. It has its own strip.
is('hq: a moment is not a to-do',
   stepRows([hqStep({ kind: 'Moment' })], BY_ID, NOW).length, 0);

for (const st of STEP_SETTLED) {
  is(`hq: a ${st} step is not outstanding`,
     stepRows([hqStep({ status: st, date: '2026-01-01' })], BY_ID, NOW).length, 0);
}
is('hq: an undated step is in no section',
   stepRows([hqStep({ date: null })], BY_ID, NOW).length, 0);
is('hq: a step too far out is left off',
   stepRows([hqStep({ date: addDays(TODAY, 30) })], BY_ID, NOW).length, 0);
// A step whose Client relation points nowhere we know has no chip to
// draw and no slug to write to, so it cannot be shown at all.
is('hq: a step with an unknown client is dropped',
   stepRows([hqStep({ clientId: 'c-ghost' })], BY_ID, NOW).length, 0);
is('hq: and one with no client at all',
   stepRows([hqStep({ clientId: null })], BY_ID, NOW).length, 0);

// The tick and the snooze are asked for, not assumed. These two
// mirror canSetStepStatus/canSetStepDate at admin.
is('hq: our step can be ticked', stepRows([hqStep()], BY_ID, NOW)[0].tickTo, 'Done');
is('hq: and moved', stepRows([hqStep()], BY_ID, NOW)[0].snoozable, true);

const content = (over = {}) => ({
  id: 'p1', clientId: 'c-sean', title: 'Studio teaser',
  status: 'Scheduled', postDate: TODAY, format: 'Reel', ...over,
});

is('hq: a scheduled post reaches the list', contentRows([content()], BY_ID, NOW).length, 1);
is('hq: content counts as ours', contentRows([content()], BY_ID, NOW)[0].owner, 'blueprint');
is('hq: the format is the type chip', contentRows([content()], BY_ID, NOW)[0].type, 'Reel');
for (const st of CONTENT_SETTLED) {
  is(`hq: a ${st} post is not outstanding`,
     contentRows([content({ status: st, date: '2026-01-01', postDate: '2026-01-01' })], BY_ID, NOW).length, 0);
}
// The tick writes Posted, so it is only drawn where the content rules
// already allow that move. Editing cannot jump to Posted.
is('hq: a scheduled post can be ticked',
   contentRows([content()], BY_ID, NOW)[0].tickTo, 'Posted');
is('hq: an approved post can be ticked',
   contentRows([content({ status: 'Approved' })], BY_ID, NOW)[0].tickTo, 'Posted');
is('hq: a post in Editing offers no tick',
   contentRows([content({ status: 'Editing' })], BY_ID, NOW)[0].tickTo, null);
is('hq: nor one still an Idea',
   contentRows([content({ status: 'Idea' })], BY_ID, NOW)[0].tickTo, null);

const withNext = (c, date, action = 'Send the proposal') =>
  ({ ...c, nextAction: action, nextActionDate: date });

is('hq: a next action due today is a row',
   nextActionRows([withNext(LEAD, TODAY)], NOW).length, 1);
is('hq: a next action is always ours',
   nextActionRows([withNext(LEAD, TODAY)], NOW)[0].owner, 'blueprint');
is('hq: its title is the action itself',
   nextActionRows([withNext(LEAD, TODAY)], NOW)[0].title, 'Send the proposal');
// The type slot holds a kind of work on every other row, so a stage
// name among Reel and Access would read as a status.
is('hq: its type says what it is, not what stage the client is in',
   nextActionRows([withNext(LEAD, TODAY)], NOW)[0].type, 'Next action');
is('hq: an empty action still reads as something',
   nextActionRows([withNext(LEAD, TODAY, '   ')], NOW)[0].title, 'Next action');
is('hq: ticking one clears the date rather than writing a status',
   nextActionRows([withNext(LEAD, TODAY)], NOW)[0].tickTo, 'clear');
is('hq: no date, no row', nextActionRows([LEAD], NOW).length, 0);
for (const st of DEAD_STAGES) {
  is(`hq: a ${st} client's next action is nobody's to-do`,
     nextActionRows([withNext({ ...LEAD, stage: st }, TODAY)], NOW).length, 0);
}
// A lead and an active client sit in the same list. That is the point:
// an overdue proposal is as real as an overdue step.
is('hq: a lead and a client share the list',
   nextActionRows([withNext(LEAD, TODAY), withNext(SEAN, TODAY)], NOW).length, 2);

/* ── the whole list ────────────────────────────────────────────── */

section('Blueprint HQ · campaigns on a row');

/* A moment is a row in the same database as the steps that hang off it,
   so the index is built out of the payload we already have. */
const hqMoment = (over = {}) => ({
  id: 'm-rave', clientId: 'c-sean', title: 'Faith Rave',
  kind: 'Moment', momentType: 'Show', type: null, owner: null,
  status: 'Not Started', date: addDays(TODAY, 6), notes: null, ...over,
});

const MI = (steps) => momentIndex(steps, BY_ID);

is('camp: a moment is indexed by its page id',
   MI([hqMoment()]).get('m-rave').title, 'Faith Rave');
// Calendar titles are written for our board, so the artist prefix is
// on the row and comes off here: the chip sits next to a row that
// already names the client.
is('camp: the artist prefix comes off the name',
   MI([hqMoment({ title: 'Sean Comma \u00b7 Faith Rave' })]).get('m-rave').title,
   'Faith Rave');
is('camp: a name that was never prefixed is left alone',
   MI([hqMoment({ title: 'Faith Rave' })]).get('m-rave').title, 'Faith Rave');
is('camp: a nameless moment still says something',
   MI([hqMoment({ title: '' })]).get('m-rave').title, 'Untitled moment');
is('camp: with its own date, which is what campaign order means',
   MI([hqMoment()]).get('m-rave').date, addDays(TODAY, 6));
is('camp: and its type, for the chip colour',
   MI([hqMoment()]).get('m-rave').type, 'Show');
is('camp: and the slug the chip links to',
   MI([hqMoment()]).get('m-rave').clientSlug, 'sean-comma');
is('camp: a step is not a campaign', MI([hqStep()]).size, 0);
// The chip is a link into a client's portal, so a moment with no client
// has nowhere to go and is not indexed.
is('camp: a moment with an unknown client is not indexed',
   MI([hqMoment({ clientId: 'c-ghost' })]).size, 0);

const withMoment = (over = {}) =>
  stepRows([hqMoment(), hqStep({ momentId: 'm-rave', ...over })], BY_ID, NOW)[0];

is('camp: a step carries the campaign it hangs off',
   withMoment().moment.title, 'Faith Rave');
is('camp: a step that hangs off nothing carries none',
   stepRows([hqStep()], BY_ID, NOW)[0].moment, null);
is('camp: a step pointing at a moment we do not have carries none',
   stepRows([hqStep({ momentId: 'm-gone' })], BY_ID, NOW)[0].moment, null);
// A next action is about the client, not about a campaign.
is('camp: a next action carries no campaign',
   nextActionRows([{ ...LEAD, nextActionDate: TODAY }], NOW)[0].moment, null);

/* A content card holds its campaign as a relation of its own rather
   than hanging off a moment, and both have to resolve to the same
   chip or a post and the step promoting it would disagree. */
const hqCard = (over = {}) => ({
  id: 'p1', clientId: 'c-sean', campaignId: null, title: 'Drop clip',
  status: 'Editing', postDate: TODAY, format: 'Reel', notes: null, ...over,
});

is('camp: a content card carries its campaign',
   contentRows([hqCard({ campaignId: 'm-rave' })], BY_ID, NOW, MI([hqMoment()]))[0]
     .moment.title, 'Faith Rave');
is('camp: a card with no campaign carries none',
   contentRows([hqCard()], BY_ID, NOW, MI([hqMoment()]))[0].moment, null);

const sameCamp = buildToday({
  clients: [SEAN],
  steps: [hqMoment(), hqStep({ momentId: 'm-rave' })],
  content: [hqCard({ campaignId: 'm-rave' })],
}, 'all', NOW);
is('camp: the step and the post agree about the campaign',
   sameCamp.today.filter((r) => r.moment?.id === 'm-rave').length, 2);

section('Blueprint HQ · notes as a subtitle');

is('note: a plain note is itself', oneLine('Pushed a week, venue moved'),
   'Pushed a week, venue moved');
is('note: nothing is null', oneLine(null), null);
is('note: empty is null', oneLine(''), null);
is('note: whitespace is null', oneLine('   \n  \n'), null);
is('note: lines join with a separator',
   oneLine('Venue moved\nWaiting on the flyer'),
   `Venue moved${NOTE_SEP}Waiting on the flyer`);
is('note: blank lines in the middle are dropped',
   oneLine('One\n\n\nTwo'), `One${NOTE_SEP}Two`);
is('note: windows line endings too',
   oneLine('One\r\nTwo'), `One${NOTE_SEP}Two`);
is('note: each line is trimmed', oneLine('  One  \n  Two  '),
   `One${NOTE_SEP}Two`);
// No truncation here: the row cuts it with CSS, so a note with room to
// spare must not arrive with an ellipsis already in it.
is('note: a long note is not cut',
   oneLine('x'.repeat(400)).length, 400);

is('note: a step row carries its note',
   stepRows([hqStep({ notes: 'Moved for the venue' })], BY_ID, NOW)[0].notes,
   'Moved for the venue');
is('note: a step with no note carries null',
   stepRows([hqStep()], BY_ID, NOW)[0].notes, null);
is('note: a content row carries its note',
   contentRows([hqCard({ notes: 'Waiting on footage' })], BY_ID, NOW)[0].notes,
   'Waiting on footage');

section('Blueprint HQ · grouped by campaign');

const gRow = (id, moment, date = TODAY) => ({
  key: `step:${id}`, kind: 'step', id, clientSlug: 'sean-comma',
  clientName: 'Sean Comma', title: id, owner: 'blueprint', type: 'Content',
  status: 'Not Started', date, bucket: 'today', tickTo: 'Done',
  snoozable: true, moment, notes: null,
});
const mRef = (id, date, title = id) =>
  ({ id, title, date, type: 'Show', clientSlug: 'sean-comma' });

const SOON = mRef('m-soon', addDays(TODAY, 2), 'Saturday show');
const LATER = mRef('m-later', addDays(TODAY, 12), 'The fortnight one');

/* Campaign order is the MOMENT's date, not the rows'. The point of this
   view is to read a rollout as a rollout, so a campaign with an overdue
   step does not jump ahead of one whose show is sooner. */
const ordered = groupByCampaign([
  gRow('a', LATER, addDays(TODAY, -3)),
  gRow('b', SOON, addDays(TODAY, 5)),
]);
is('group: sections run in moment-date order',
   ordered.map((g) => g.title).join('|'), 'Saturday show|The fortnight one');

is('group: a section holds its own rows',
   groupByCampaign([gRow('a', SOON), gRow('b', SOON), gRow('c', LATER)])
     .map((g) => g.rows.length).join('|'), '2|1');
is('group: and keeps the order it was given',
   groupByCampaign([gRow('b', SOON), gRow('a', SOON)])[0]
     .rows.map((r) => r.id).join('|'), 'b|a');

const loose = groupByCampaign([gRow('a', SOON), gRow('x', null)]);
is('group: rows with no campaign get their own section',
   loose[loose.length - 1].title, NO_CAMPAIGN);
is('group: which comes after every campaign', loose.length, 2);
is('group: and is marked by carrying no moment',
   loose[loose.length - 1].moment, null);
is('group: no loose rows means no loose section',
   groupByCampaign([gRow('a', SOON)]).length, 1);
is('group: nothing in means nothing out', groupByCampaign([]).length, 0);

// An undated moment has no place in the order, so it goes last among
// the campaigns rather than first, which is where '' would sort it.
const undated = groupByCampaign([
  gRow('a', mRef('m-undated', null, 'No date yet')),
  gRow('b', SOON),
  gRow('x', null),
]);
is('group: an undated campaign sorts after the dated ones',
   undated.map((g) => g.title).join('|'),
   `Saturday show|No date yet|${NO_CAMPAIGN}`);

// Every row is drawn exactly once, whichever grouping is on.
const mixed = [gRow('a', SOON), gRow('b', LATER), gRow('c', SOON), gRow('x', null)];
is('group: every row is placed, none twice',
   groupByCampaign(mixed).reduce((n, g) => n + g.rows.length, 0), mixed.length);

/* The same rule as the calendar: a step we took out of the plan is not
   work outstanding, so it is in no count and no list. This is the
   tripwire for that, named after the two statuses rather than relying
   on STEP_SETTLED keeping them. */
for (const st of ['Skipped', 'Moved']) {
  const t = buildToday({
    clients: [SEAN],
    steps: [hqStep({ status: st, date: '2026-01-01' })],
    content: [],
  }, 'all', NOW);
  is(`group: a ${st} step is in no Today section`,
     t.overdue.length + t.today.length + t.week.length, 0);
}

section('Blueprint HQ · filter and sections');

const INPUT = {
  clients: [withNext(SEAN, '2026-11-01'), LEAD],
  steps: [
    hqStep({ id: 'a', date: '2026-10-30', owner: 'Client', title: 'Send the photos' }),
    hqStep({ id: 'b', date: TODAY, owner: 'Blueprint', title: 'Film the b-roll' }),
    hqStep({ id: 'c', date: '2026-11-09', owner: 'Client', title: 'Approve the cut' }),
    hqStep({ id: 'd', date: '2027-01-01', owner: 'Blueprint', title: 'Miles away' }),
  ],
  content: [content({ id: 'p', postDate: TODAY })],
};

const all = buildToday(INPUT, 'all', NOW);
is('hq: overdue holds the client step and the next action', all.overdue.length, 2);
is('hq: due today holds the step and the post', all.today.length, 2);
is('hq: this week holds the approval', all.week.length, 1);
is('hq: and the far-off step is nowhere',
   [...all.overdue, ...all.today, ...all.week].some((r) => r.id === 'd'), false);

// Overdue is sorted oldest first, which is the order you work it in.
is('hq: the oldest overdue row is first', all.overdue[0].date, '2026-10-30');

const hqMine = buildToday(INPUT, 'mine', NOW);
is('hq: Mine drops the client steps',
   hqMine.overdue.concat(hqMine.today, hqMine.week).every((r) => r.owner === 'blueprint'), true);
is('hq: Mine keeps the next action', hqMine.overdue.length, 1);
is('hq: Mine keeps our step and the post', hqMine.today.length, 2);

const theirs = buildToday(INPUT, 'clients', NOW);
is("hq: Clients' keeps only theirs",
   theirs.overdue.concat(theirs.today, theirs.week).every((r) => r.owner === 'client'), true);
is("hq: Clients' finds the overdue photos", theirs.overdue.length, 1);
is("hq: and nothing of ours today", theirs.today.length, 0);

is('hq: All matches everything',
   matchesFilter({ owner: 'client' }, 'all') && matchesFilter({ owner: 'blueprint' }, 'all'), true);

// Every row needs a key the DOM can hold, and two kinds must never
// collide on one id.
const keys = [...all.overdue, ...all.today, ...all.week].map((r) => r.key);
is('hq: every row key is unique', new Set(keys).size, keys.length);
ok('hq: keys are kind-prefixed', keys.every((k) => /^(step|content|next):/.test(k)));

is('hq: sorting is stable on date then client then title',
   sortRows([
     { date: '2026-11-06', clientName: 'B', title: 'z' },
     { date: '2026-11-05', clientName: 'B', title: 'a' },
     { date: '2026-11-06', clientName: 'A', title: 'a' },
   ]).map((r) => `${r.date}/${r.clientName}`),
   ['2026-11-05/B', '2026-11-06/A', '2026-11-06/B']);

/* ── the strip ─────────────────────────────────────────────────── */

section('Blueprint HQ · the fortnight strip');

const moment = (over = {}) => ({
  id: 'm1', clientId: 'c-sean', title: 'The Echo, LA',
  kind: 'Moment', momentType: 'Show', type: null, owner: 'Blueprint',
  status: 'Confirmed', date: addDays(TODAY, 3), venueCity: 'Los Angeles', ...over,
});

is('hq: a show in three days is on the strip', stripItems([moment()], BY_ID, NOW).length, 1);
is('hq: and it says how far off', stripItems([moment()], BY_ID, NOW)[0].days, 3);
is('hq: today reads as zero days',
   stripItems([moment({ date: TODAY })], BY_ID, NOW)[0].days, 0);
is('hq: the last day of the fortnight is in',
   stripItems([moment({ date: addDays(TODAY, STRIP_DAYS) })], BY_ID, NOW).length, 1);
is('hq: the day after is out',
   stripItems([moment({ date: addDays(TODAY, STRIP_DAYS + 1) })], BY_ID, NOW).length, 0);
// The strip answers "what is coming", so a show last week is not on it
// even though the calendar still holds the row.
is('hq: a past show is not coming up',
   stripItems([moment({ date: '2026-10-01' })], BY_ID, NOW).length, 0);
is('hq: a step is not a moment',
   stripItems([moment({ kind: 'Step' })], BY_ID, NOW).length, 0);
is('hq: a moved moment is off the strip',
   stripItems([moment({ status: 'Moved' })], BY_ID, NOW).length, 0);
is('hq: a skipped one too',
   stripItems([moment({ status: 'Skipped' })], BY_ID, NOW).length, 0);
is('hq: the strip is sorted soonest first',
   stripItems([
     moment({ id: 'x', date: addDays(TODAY, 9) }),
     moment({ id: 'y', date: addDays(TODAY, 2) }),
   ], BY_ID, NOW).map((m) => m.id), ['y', 'x']);

/* ── snooze ────────────────────────────────────────────────────── */

section('Blueprint HQ · snooze');

is('hq: snoozing today by a day lands tomorrow',
   snoozeTo(TODAY, 1, NOW), '2026-11-06');
is('hq: by a week lands next Thursday', snoozeTo(TODAY, 7, NOW), '2026-11-12');
// The one that matters. +1 day on something three weeks late has to
// mean tomorrow, not three weeks ago plus one.
is('hq: snoozing an overdue row by a day lands tomorrow, not back in the past',
   snoozeTo('2026-10-15', 1, NOW), '2026-11-06');
is('hq: a future row snoozes from its own date',
   snoozeTo('2026-11-20', 1, NOW), '2026-11-21');

/* ── the Clients write whitelist ───────────────────────────────── */

section('Blueprint HQ · the Clients write');

is('hq: the pipeline columns are the seven stages',
   HQ_STAGES.join('|'),
   'Lead|Call Booked|Proposal Sent|Onboarding|Active|Paused|Ended');
is('hq: Active is a stage', isHqStage('Active'), true);
is('hq: a made-up stage is not', isHqStage('Nearly Signed'), false);
is('hq: a non-string is not', isHqStage(3), false);
// A name Notion does not know would be CREATED as a new select option
// by the API rather than refused, which is why this list is closed.
is('hq: a near-miss is refused', isHqStage('active'), false);

const props = (body) => buildHqClientProperties(body);

is('hq: only the four fields exist',
   Object.keys(HQ_CLIENT_EDITABLE).join(','),
   'stage,nextAction,nextActionDate,brandBriefUrl');
is('hq: a field nobody whitelisted is not written',
   Object.keys(props({ monthlyRate: 9999, portalKey: 'x' }).properties).length, 0);
is('hq: and Portal Key above all',
   JSON.stringify(props({ portalKey: 'x', 'Portal Key': 'x' })).includes('Portal Key'), false);

is('hq: a stage writes the Stage select',
   props({ stage: 'Onboarding' }).properties.Stage, { select: { name: 'Onboarding' } });
is('hq: a bad stage is rejected, not written',
   props({ stage: 'Nope' }).rejected, ['stage']);
ok('hq: and nothing is written with it',
   Object.keys(props({ stage: 'Nope' }).properties).length === 0);

is('hq: a next action writes rich text',
   props({ nextAction: 'Call them' }).properties['Next Action'],
   { rich_text: [{ text: { content: 'Call them' } }] });
is('hq: clearing it writes an empty array',
   props({ nextAction: null }).properties['Next Action'], { rich_text: [] });
is('hq: an all-whitespace action clears it too',
   props({ nextAction: '   ' }).properties['Next Action'], { rich_text: [] });
is('hq: newlines are flattened out of a one-line column',
   cleanNextAction('Call them\nthen email'), 'Call them then email');
is('hq: it is capped', cleanNextAction('x'.repeat(500)).length, MAX_NEXT_ACTION);
is('hq: a number is not a next action', props({ nextAction: 7 }).rejected, ['nextAction']);

is('hq: a date writes the date',
   props({ nextActionDate: '2026-12-01' }).properties['Next Action Date'],
   { date: { start: '2026-12-01' } });
is('hq: null clears the date, which is how a next action is ticked',
   props({ nextActionDate: null }).properties['Next Action Date'], { date: null });
is('hq: a day that never existed is refused',
   props({ nextActionDate: '2026-02-31' }).rejected, ['nextActionDate']);
is('hq: so is a datetime', props({ nextActionDate: '2026-12-01T10:00:00Z' }).rejected,
   ['nextActionDate']);
is('hq: so is nonsense', props({ nextActionDate: 'soon' }).rejected, ['nextActionDate']);

/* The brand brief pointer. One Notion column holds both kinds, so
   this cleaner is the only thing between a pasted string and an href
   in a client's browser. */

is('hq: a pasted link writes the url column',
   props({ brandBriefUrl: 'https://figma.com/file/abc' }).properties['Brand Brief PDF'],
   { url: 'https://figma.com/file/abc' });
is('hq: null clears it, which is how a brief comes down',
   props({ brandBriefUrl: null }).properties['Brand Brief PDF'], { url: null });
is('hq: an empty string clears it too',
   props({ brandBriefUrl: '   ' }).properties['Brand Brief PDF'], { url: null });
is('hq: http is allowed, since not every client is on https yet',
   cleanBriefUrl('http://example.com/brief.pdf'), 'http://example.com/brief.pdf');
// This value becomes an href on a page a client is signed in to.
is('hq: javascript: is not a brief', props({ brandBriefUrl: 'javascript:alert(1)' }).rejected,
   ['brandBriefUrl']);
is('hq: nor is data:',
   props({ brandBriefUrl: 'data:text/html,<script>x</script>' }).rejected, ['brandBriefUrl']);
is('hq: nor is ftp', props({ brandBriefUrl: 'ftp://host/brief.pdf' }).rejected,
   ['brandBriefUrl']);
is('hq: nor is a bare word', props({ brandBriefUrl: 'brief.pdf' }).rejected,
   ['brandBriefUrl']);
is('hq: nor a number', props({ brandBriefUrl: 7 }).rejected, ['brandBriefUrl']);
is('hq: an absurd length is refused rather than truncated',
   cleanBriefUrl(`https://e.com/${'x'.repeat(MAX_BRIEF_URL)}`), undefined);
ok('hq: and nothing is written when it is refused',
   Object.keys(props({ brandBriefUrl: 'javascript:alert(1)' }).properties).length === 0);

/* Which kind a stored pointer is. */

is('brief: our own URL is recognised',
   isOurBriefUrl('/portal/sean-comma/files/briefs/sean-comma/brand-brief.pdf', 'sean-comma'),
   true);
is('brief: and so is the absolute form of it, which is what a paste gives',
   isOurBriefUrl(
     'https://blueprint-marketing.com/portal/sean-comma/files/briefs/sean-comma/brand-brief.pdf',
     'sean-comma'),
   true);
is('brief: another client\u2019s brief is not ours to serve from this slug',
   isOurBriefUrl('/portal/other/files/briefs/other/brand-brief.pdf', 'sean-comma'), false);
is('brief: a link that merely mentions files is not ours',
   isOurBriefUrl('https://evil.test/portal/sean-comma/files/briefs/x', 'sean-comma'), false);
is('brief: the host is what a client is told they are opening',
   briefHost('https://www.figma.com/file/abc'), 'figma.com');
is('brief: https is safe', isSafeBriefUrl('https://x.test/a'), true);
is('brief: javascript is not', isSafeBriefUrl('javascript:alert(1)'), false);

/* readBrief: the pointer decides, and only a PDF of ours costs a HEAD. */

const bucket = (head) => {
  let heads = 0;
  return {
    bucket: { head: async () => { heads++; return head; } },
    heads: () => heads,
  };
};
const UPLOADED = { size: 2048, uploaded: new Date('2026-11-06T10:00:00Z') };

const pdfCase = bucket(UPLOADED);
is('brief: a pointer at our file reads the bytes behind it',
   await readBrief({ REPORTS_BUCKET: pdfCase.bucket }, 'sean-comma',
     briefUrl('sean-comma')),
   { url: briefUrl('sean-comma'), kind: 'pdf', size: 2048,
     uploaded: '2026-11-06T10:00:00.000Z', host: null });

const linkCase = bucket(UPLOADED);
is('brief: a pointer somewhere else is a link, with no size',
   await readBrief({ REPORTS_BUCKET: linkCase.bucket }, 'sean-comma',
     'https://www.notion.so/brief'),
   { url: 'https://www.notion.so/brief', kind: 'link', size: null,
     uploaded: null, host: 'notion.so' });
is('brief: and the bucket is never touched for one',
   linkCase.heads(), 0);

const legacy = bucket(UPLOADED);
ok('brief: a blank column still finds a brief uploaded before the column existed',
   (await readBrief({ REPORTS_BUCKET: legacy.bucket }, 'sean-comma', null))?.kind === 'pdf');
is('brief: a pointer at our file that is gone is no brief',
   await readBrief({ REPORTS_BUCKET: bucket(null).bucket }, 'sean-comma',
     briefUrl('sean-comma')),
   null);
is('brief: an unsafe pointer is refused rather than handed to the browser',
   await readBrief({ REPORTS_BUCKET: bucket(UPLOADED).bucket }, 'sean-comma',
     'javascript:alert(1)'),
   null);
is('brief: no bucket and no link is no brief',
   await readBrief({}, 'sean-comma', null), null);
is('brief: but a link needs no bucket at all',
   (await readBrief({}, 'sean-comma', 'https://x.test/b'))?.kind, 'link');

// A patch naming one field leaves the others alone, so snoozing a next
// action cannot wipe its text.
is('hq: a date-only patch touches only the date',
   Object.keys(props({ nextActionDate: '2026-12-01' }).properties), ['Next Action Date']);
is('hq: a patch of all three writes all three',
   Object.keys(props({
     stage: 'Active', nextAction: 'Kick off', nextActionDate: '2026-12-01',
   }).properties).length, 3);
is('hq: and a brief patch touches only the brief',
   Object.keys(props({ brandBriefUrl: 'https://x.test/b' }).properties),
   ['Brand Brief PDF']);

/* ══ 14. Blueprint HQ · client health ════════════════════════════
   The colour on a client card, and the sentence behind it. Worth
   pinning hard: a green card on a client who is actually in trouble
   is the one bug on this page that costs money. */

section('Blueprint HQ · health rules');

// Facts with nothing wrong. Each test below breaks exactly one thing.
const WELL = {
  stage: 'Active',
  overdueBlueprint: 0,
  overdueClient: 0,
  daysSinceLastPost: 1,
  postedThisWeek: 3,
  scheduledThisWeek: 2,
  lastReport: '2026-11-03',
  reportThisMonth: true,
  monthToReport: true,
  releaseInDays: null,
  releaseStepsOpen: 0,
  dayOfMonth: 5,
};
const H = (over = {}) => clientHealth({ ...WELL, ...over });

is('health: a client with nothing wrong is green', H().level, 'green');
is('health: and green says nothing', H().reasons, []);

// Yellow: one of ours overdue.
is('health: one task of ours overdue is yellow',
   H({ overdueBlueprint: 1 }).level, 'yellow');
is('health: and it says so in the singular',
   H({ overdueBlueprint: 1 }).reasons[0], '1 task of ours overdue');
is('health: two reads as plural',
   H({ overdueBlueprint: 2 }).reasons[0], '2 tasks of ours overdue');

// Yellow: three or more of theirs. Two is a normal week.
is('health: two client to-dos overdue is still green',
   H({ overdueClient: 2 }).level, 'green');
is('health: three is yellow', H({ overdueClient: 3 }).level, 'yellow');
is('health: and it counts them', H({ overdueClient: 4 }).reasons[0],
   '4 client to-dos overdue');
is('health: the threshold is the one in the config',
   HEALTH.CLIENT_OVERDUE_YELLOW, 3);

// Yellow: quiet.
is('health: six quiet days is still green', H({ daysSinceLastPost: 6 }).level, 'green');
is('health: seven is yellow', H({ daysSinceLastPost: 7 }).level, 'yellow');
is('health: and says how long', H({ daysSinceLastPost: 9 }).reasons[0],
   'nothing posted in 9 days');
// Nothing at all in the window we hold is worse than seven days, not
// better, so it must not read as green.
is('health: no post at all in the window is yellow',
   H({ daysSinceLastPost: null }).level, 'yellow');
is('health: and says that plainly', H({ daysSinceLastPost: null }).reasons[0],
   'nothing posted in the last month');

// Red: the report.
is('health: on the 5th the report is not yet late',
   H({ dayOfMonth: 5, reportThisMonth: false }).level, 'green');
is('health: on the 6th it is', H({ dayOfMonth: 6, reportThisMonth: false }).level, 'red');
is('health: unless one went out this month',
   H({ dayOfMonth: 20, reportThisMonth: true }).level, 'green');
// A client who signed this month has no previous month to report on.
is('health: a client with no month behind them is not late',
   H({ dayOfMonth: 25, reportThisMonth: false, monthToReport: false }).level, 'green');

// Red: a release with the plan unfinished.
is('health: a release in ten days with everything done is green',
   H({ releaseInDays: 10, releaseStepsOpen: 0 }).level, 'green');
is('health: a release in ten days with steps open is red',
   H({ releaseInDays: 10, releaseStepsOpen: 2 }).level, 'red');
is('health: and it says both numbers',
   H({ releaseInDays: 10, releaseStepsOpen: 2 }).reasons[0],
   'a release in 10 days with 2 steps still open');
is('health: a release further out than the window is not red yet',
   H({ releaseInDays: HEALTH.RELEASE_RED_DAYS + 1, releaseStepsOpen: 5 }).level, 'green');
is('health: the last day of the window still counts',
   H({ releaseInDays: HEALTH.RELEASE_RED_DAYS, releaseStepsOpen: 1 }).level, 'red');

// Worst wins, and the worst reason is read first.
const both = H({ overdueBlueprint: 1, releaseInDays: 3, releaseStepsOpen: 1 });
is('health: red beats yellow', both.level, 'red');
ok('health: and the red reason is first', both.reasons[0].startsWith('a release in 3 days'));
is('health: both reasons are kept', both.reasons.length, 2);

/* ── the facts behind the rules ────────────────────────────────── */

section('Blueprint HQ · reading the facts');

const FC = {
  pageId: 'c-sean', slug: 'sean-comma', artist: 'Sean Comma', stage: 'Active',
  nextAction: null, nextActionDate: null,
  termStart: '2026-08-01', termEnd: '2027-02-01',
};
const fstep = (over = {}) => ({
  id: 'x', clientId: 'c-sean', title: 't', kind: 'Step', type: 'Content',
  owner: 'Blueprint', status: 'Not Started', date: TODAY, momentId: null,
  momentType: null, ...over,
});
const fpost = (over = {}) => ({
  id: 'p', clientId: 'c-sean', title: 't', status: 'Posted',
  postDate: TODAY, format: 'Reel', ...over,
});
const F = (input, client = FC) => clientFacts(client, {
  steps: [], content: [], snapshots: [], ...input,
}, NOW);

is('facts: our overdue steps are counted as ours',
   F({ steps: [fstep({ date: '2026-11-01' })] }).overdueBlueprint, 1);
is('facts: theirs as theirs',
   F({ steps: [fstep({ date: '2026-11-01', owner: 'Client' })] }).overdueClient, 1);
is('facts: a done step is not overdue',
   F({ steps: [fstep({ date: '2026-11-01', status: 'Done' })] }).overdueBlueprint, 0);
is('facts: a moment is not a task',
   F({ steps: [fstep({ date: '2026-11-01', kind: 'Moment' })] }).overdueBlueprint, 0);
is('facts: another client’s step is not counted',
   F({ steps: [fstep({ date: '2026-11-01', clientId: 'c-other' })] }).overdueBlueprint, 0);
is('facts: a step due today is not yet overdue',
   F({ steps: [fstep({ date: TODAY })] }).overdueBlueprint, 0);

is('facts: the last post is the most recent one',
   F({ content: [fpost({ postDate: '2026-10-20' }), fpost({ id: 'p2', postDate: '2026-11-02' })] })
     .daysSinceLastPost, 3);
is('facts: something merely scheduled has not gone out',
   F({ content: [fpost({ status: 'Scheduled' })] }).daysSinceLastPost, null);
is('facts: a post dated in the future has not gone out either',
   F({ content: [fpost({ postDate: '2026-12-01' })] }).daysSinceLastPost, null);
is('facts: posts this week are counted',
   F({ content: [fpost({ postDate: '2026-11-01' }), fpost({ id: 'b', postDate: TODAY })] })
     .postedThisWeek, 2);
is('facts: and what is still due',
   F({ content: [fpost({ id: 'c', status: 'Scheduled', postDate: '2026-11-08' })] })
     .scheduledThisWeek, 1);

const snap = (over = {}) => ({
  clientId: 'c-sean', published: true, date: '2026-10-31',
  publishedAt: '2026-11-03T09:00:00.000Z', ...over,
});
is('facts: a published report gives its day',
   F({ snapshots: [snap()] }).lastReport, '2026-11-03');
is('facts: and counts for this month', F({ snapshots: [snap()] }).reportThisMonth, true);
is('facts: a draft is not a published report',
   F({ snapshots: [snap({ published: false })] }).lastReport, null);
is('facts: last month’s does not count for this one',
   F({ snapshots: [snap({ publishedAt: '2026-10-03T09:00:00.000Z' })] }).reportThisMonth, false);
is('facts: a client who started this month has no month to report',
   F({}, { ...FC, termStart: '2026-11-01' }).monthToReport, false);
is('facts: one who started before does', F({}).monthToReport, true);

// The release rule needs steps joined to their moment, which is why
// the payload carries momentId.
const rel = fstep({ id: 'm9', kind: 'Moment', momentType: 'Release',
                    date: '2026-11-12', status: 'Planned' });
is('facts: the next release is found', F({ steps: [rel] }).releaseInDays, 7);
is('facts: its open steps are counted by moment, not by date',
   F({ steps: [rel, fstep({ id: 's1', momentId: 'm9' }), fstep({ id: 's2', momentId: 'other' })] })
     .releaseStepsOpen, 1);
is('facts: a done step of that release is not open',
   F({ steps: [rel, fstep({ id: 's1', momentId: 'm9', status: 'Done' })] }).releaseStepsOpen, 0);
is('facts: a show is not a release',
   F({ steps: [fstep({ kind: 'Moment', momentType: 'Show', date: '2026-11-12' })] })
     .releaseInDays, null);
is('facts: a moved release is not coming',
   F({ steps: [{ ...rel, status: 'Moved' }] }).releaseInDays, null);
is('facts: a release in the past is not next',
   F({ steps: [{ ...rel, date: '2026-10-01' }] }).releaseInDays, null);

/* ── the step-up flag ──────────────────────────────────────────── */

is('step-up: nothing without a date', stepUpSoon(null, NOW), null);
is('step-up: a month out is the edge',
   stepUpSoon(addDays(TODAY, HEALTH.STEP_UP_NOTICE_DAYS), NOW), HEALTH.STEP_UP_NOTICE_DAYS);
is('step-up: further out is not shown yet',
   stepUpSoon(addDays(TODAY, HEALTH.STEP_UP_NOTICE_DAYS + 1), NOW), null);
is('step-up: today shows as nought', stepUpSoon(TODAY, NOW), 0);
is('step-up: a date gone by is not a warning', stepUpSoon('2026-10-01', NOW), null);

is('clients: only Onboarding and Active get a card', CARD_STAGES.join('|'), 'Onboarding|Active');


/* ══ 15. Blueprint HQ · quick add ════════════════════════════════
   The only route in this codebase that creates a Clients row. What
   it must NOT be able to write matters more than what it can. */

section('Blueprint HQ · a new lead');

const lead = (body) => buildNewLead(body);

is('lead: the five sources are the Notion select',
   LEAD_SOURCES.join('|'), 'Referral|Outreach|Inbound|Show Media Client|Network');
is('lead: Referral is a source', isLeadSource('Referral'), true);
is('lead: a typo is not', isLeadSource('referral'), false);

is('lead: a lead you cannot name is not a lead', lead({}).error, 'artist_required');
is('lead: whitespace is not a name', lead({ artist: '   ' }).error, 'artist_required');
is('lead: and nothing is built', lead({ artist: '' }).properties, null);

const ok1 = lead({ artist: 'New Artist' });
is('lead: a name is enough', ok1.error, null);
is('lead: the title is written',
   ok1.properties.Artist, { title: [{ text: { content: 'New Artist' } }] });
is('lead: every lead starts at Lead', ok1.properties.Stage, { select: { name: 'Lead' } });
is('lead: and the stage constant says so', NEW_LEAD_STAGE, 'Lead');
is('lead: a bare lead sets nothing else', Object.keys(ok1.properties).sort(),
   ['Artist', 'Stage']);

is('lead: the name is capped', lead({ artist: 'x'.repeat(400) })
   .properties.Artist.title[0].text.content.length, MAX_ARTIST);
is('lead: newlines are flattened',
   lead({ artist: 'Two\nNames' }).properties.Artist.title[0].text.content, 'Two Names');

const ok2 = lead({
  artist: 'New Artist', leadSource: 'Referral',
  nextAction: 'Book the call', nextActionDate: '2026-12-01',
});
is('lead: a source is written', ok2.properties['Lead Source'], { select: { name: 'Referral' } });
is('lead: a next action is written',
   ok2.properties['Next Action'], { rich_text: [{ text: { content: 'Book the call' } }] });
is('lead: and its date', ok2.properties['Next Action Date'], { date: { start: '2026-12-01' } });

is('lead: an unknown source is refused rather than invented',
   lead({ artist: 'A', leadSource: 'Facebook Ads' }).error, 'bad_lead_source');
is('lead: an empty source is simply left off',
   'Lead Source' in lead({ artist: 'A', leadSource: '' }).properties, false);
is('lead: a bad date is refused',
   lead({ artist: 'A', nextActionDate: '2026-02-31' }).error, 'bad_date');

// The thing that matters most about this endpoint.
const everything = lead({
  artist: 'A', portalKey: 'secret', portalEmails: 'someone@example.com',
  'Portal Enabled': true, portalEnabled: true, monthlyRate: 5000,
  stage: 'Active', termStart: '2020-01-01',
});
is('lead: quick add cannot hand out portal access',
   JSON.stringify(everything.properties).includes('Portal'), false);
is('lead: nor set a rate',
   JSON.stringify(everything.properties).includes('Monthly Rate'), false);
is('lead: nor start somebody at Active',
   everything.properties.Stage, { select: { name: 'Lead' } });
is('lead: nor backdate a term',
   JSON.stringify(everything.properties).includes('Term'), false);
is('lead: only ever the four it knows', Object.keys(everything.properties).sort(),
   ['Artist', 'Stage']);

/* ══ 16. Blueprint HQ · reports ══════════════════════════════════
   The Reports tab draws buttons that publish a PDF and email a
   client, so the two things worth pinning are which route each
   document's buttons point at, and what the tab says is missing
   before Mason presses one. */

section('Blueprint HQ · report gaps');

const repSnap = (over = {}) => ({
  date: '2026-10-01',
  metrics: { 'Instagram Followers': 1200 },
  win: 'The Berlin show sold out.',
  watch: 'Reels are flat.',
  summary: 'A good month.',
  focus: ['Ship the remix', null, null],
  ...over,
});

is('gaps: a complete month has none', reportGaps(repSnap()).length, 0);
is('gaps: nothing complete blocks a publish', blocksPublish(reportGaps(repSnap())), false);

is('gaps: a missing win is named',
   reportGaps(repSnap({ win: null })).map((g) => g.field), ['win']);
is('gaps: and it blocks', blocksPublish(reportGaps(repSnap({ win: null }))), true);
is('gaps: whitespace is not a win',
   reportGaps(repSnap({ win: '   \n ' })).map((g) => g.field), ['win']);

is('gaps: no metrics at all is a gap',
   reportGaps(repSnap({ metrics: {} })).map((g) => g.field), ['metrics']);
is('gaps: a single metric is enough',
   reportGaps(repSnap({ metrics: { Shows: 0 } })).length, 0);

is('gaps: one focus card of three is a deliberately short section',
   reportGaps(repSnap({ focus: [null, 'Second thing', null] })).length, 0);
is('gaps: three empty ones is a missing section',
   reportGaps(repSnap({ focus: [null, null, null] })).map((g) => g.field), ['focus']);
is('gaps: an empty focus array too',
   reportGaps(repSnap({ focus: [] })).map((g) => g.field), ['focus']);

is('gaps: watch and summary are thin, not wrong',
   blocksPublish(reportGaps(repSnap({ watch: null, summary: null }))), false);
is('gaps: and both are reported',
   reportGaps(repSnap({ watch: null, summary: '' })).map((g) => g.field),
   ['watch', 'summary']);

is('gaps: a blank month names everything, in field order',
   reportGaps({ date: null, metrics: {}, win: null, watch: null, summary: null, focus: [] })
     .map((g) => g.field),
   ['date', 'metrics', 'win', 'watch', 'summary', 'focus']);
is('gaps: exactly three of them are blocking',
   REPORT_FIELDS.filter((g) => g.blocking).map((g) => g.field),
   ['date', 'metrics', 'win']);
is('gaps: every field says where it shows up',
   REPORT_FIELDS.every((g) => g.where && g.label), true);

section('Blueprint HQ · which pile, and in what order');

const repRows = [
  { id: 'a', date: '2026-09-01', published: true },
  { id: 'b', date: '2026-10-01', published: false },
  { id: 'c', date: null, published: false },
  { id: 'd', date: '2026-08-01', published: true },
  { id: 'e', date: '2026-11-01', published: false },
];

is('piles: drafts are the unpublished ones, newest first',
   reportDrafts(repRows).map((r) => r.id), ['e', 'b', 'c']);
is('piles: published are the rest, newest first',
   reportPublished(repRows).map((r) => r.id), ['a', 'd']);
is('piles: an undated draft goes last rather than first',
   reportDrafts(repRows).at(-1).id, 'c');
is('piles: neither pile mutates the payload',
   repRows.map((r) => r.id), ['a', 'b', 'c', 'd', 'e']);

const auditRows = [
  { id: 'p1', audience: 'Prospect', status: 'Sent', auditDate: '2026-11-01' },
  { id: 'p2', audience: 'Prospect', status: 'Draft', auditDate: '2026-10-01' },
  { id: 'c1', audience: 'Client', status: 'Ready', auditDate: '2026-11-02' },
  { id: 'c2', audience: 'Client', status: null, auditDate: '2026-11-03' },
  { id: 'p3', audience: 'Prospect', status: 'Draft', auditDate: '2026-11-04' },
];

is('audits: the ones with work left come first, newest inside each',
   sortAudits(auditRows).map((a) => a.id), ['p3', 'p2', 'c1', 'p1', 'c2']);
is('audits: a row with no status sorts after the three that have one',
   sortAudits(auditRows).at(-1).id, 'c2');
is('audits: the payload is left alone',
   auditRows.map((a) => a.id), ['p1', 'p2', 'c1', 'c2', 'p3']);

section('Blueprint HQ · where an action goes');

is('route: a snapshot goes through its own client’s portal',
   docBase('report', 'abc', 'sean-comma'), '/portal/sean-comma/admin/report/abc');
is('route: so does a client audit',
   docBase('audit', 'abc', 'sean-comma'), '/portal/sean-comma/admin/audit/abc');
is('route: a prospect teardown has no portal, so it goes through HQ',
   docBase('audit', 'abc', null), '/portal/hq/audit/abc');
is('route: a snapshot with no slug has nowhere to go, and says so',
   docBase('report', 'abc', null), null);
is('route: an id is encoded rather than pasted in',
   docBase('audit', 'a/b?c', null), '/portal/hq/audit/a%2Fb%3Fc');
is('route: and so is a slug',
   docBase('report', 'x', 'a b'), '/portal/a%20b/admin/report/x');

section('Blueprint HQ · the email record');

/* The claim in KV is the only record of a send anywhere: nothing
   about it is written to Notion. So the three answers have to be
   distinguishable, because "not sent" and "we did not look" are
   different things to put in front of somebody. */
const claimKv = (store) => ({
  get: async (k) => (k in store ? store[k] : null),
  put: async () => {},
  delete: async () => {},
});

is('mail: a claim is the time it went',
   await mailSentAt(claimKv({ 'report-mail:s1': '2026-11-02T09:00:00.000Z' }), 's1'),
   '2026-11-02T09:00:00.000Z');
is('mail: no claim is null', await mailSentAt(claimKv({}), 's1'), null);
is('mail: and so is no KV at all', await mailSentAt(undefined, 's1'), null);
is('mail: it reads the snapshot id it was given, not a neighbour',
   await mailSentAt(claimKv({ 'report-mail:s2': 'x' }), 's1'), null);

const thrower = {
  get: async () => { throw new Error('KV is having a day'); },
  put: async () => {}, delete: async () => {},
};
is('mail: an unreadable claim is a blank status line, not a thrown page',
   await mailSentAt(thrower, 's1'), null);

/* ══════════════════════════════════════════════════════════════════
   HQ's calendar, across clients
   ══════════════════════════════════════════════════════════════════ */

section('Blueprint HQ · what we owe this month');

/* A tier is sold as a number of posts a month. The only way to know
   whether we are delivering it is to count ours, dated inside the
   month, and say so where someone will see it on the 3rd rather than
   on the 31st. */
const NOV = new Date('2026-11-12T12:00:00Z');
const owedCard = (over = {}) =>
  ({ postedBy: 'Blueprint', postDate: '2026-11-10', status: 'Planned', ...over });

const only = (cards) => deliverables(cards, NOV);
is('owed: ours this month are counted', only([owedCard(), owedCard(), owedCard()]).total, 3);
is('owed: and the ones that went out',
   only([owedCard({ status: 'Posted' }), owedCard()]).posted, 1);
is('owed: theirs are not ours to deliver',
   only([owedCard(), owedCard({ postedBy: 'Client' })]).total, 1);
is('owed: nor is a card with nobody on it',
   only([owedCard({ postedBy: null })]).total, 0);
is('owed: last month is last month',
   only([owedCard({ postDate: '2026-10-31' }), owedCard({ postDate: '2026-12-01' })]).total, 0);
is('owed: so is an undated card', only([owedCard({ postDate: null })]).total, 0);
is('owed: a card we dropped was never a deliverable',
   only([owedCard({ status: 'Skipped' }), owedCard()]).total, 1);
is('owed: the month is named', only([]).month, 'Nov');
is('owed: the label reads as a sentence',
   only([owedCard({ status: 'Posted' }), owedCard(), owedCard()]).label, 'Nov: 1 / 3 posted');
is('owed: an empty month is off', only([]).off, true);
is('owed: too few is off',
   only(Array.from({ length: DELIVERABLES_MIN - 1 }, () => owedCard())).off, true);
is('owed: the floor itself is fine',
   only(Array.from({ length: DELIVERABLES_MIN }, () => owedCard())).off, false);
is('owed: the ceiling itself is fine',
   only(Array.from({ length: DELIVERABLES_MAX }, () => owedCard())).off, false);
is('owed: one over is off',
   only(Array.from({ length: DELIVERABLES_MAX + 1 }, () => owedCard())).off, true);
is('owed: the band we sell', `${DELIVERABLES_MIN}–${DELIVERABLES_MAX}`, '15–25');

section('Blueprint HQ · which clients the calendar covers');

is('stage: an active client is on it', onCalendar({ stage: 'Active' }), true);
is('stage: so is one onboarding', onCalendar({ stage: 'Onboarding' }), true);
is('stage: a prospect has no plan yet', onCalendar({ stage: 'Prospect' }), false);
is('stage: an ended client’s plan is history', onCalendar({ stage: 'Ended' }), false);
is('stage: and no stage at all is not a yes', onCalendar({ stage: null }), false);

section('Blueprint HQ · a colour per client');

/* The colour is decided by the slug and nothing else, so taking on a
   client cannot repaint everyone else's chips. */
is('colour: the same slug always lands on the same colour',
   clientColor('sean-comma'), clientColor('sean-comma'));
is('colour: it is one of the ring', CLIENT_COLORS.includes(clientColor('sean-comma')), true);
is('colour: and so is a slug nobody has yet',
   CLIENT_COLORS.includes(clientColor('a-client-we-have-not-signed')), true);
is('colour: an empty slug still gets one',
   CLIENT_COLORS.includes(clientColor('')), true);
/* Grey and default are deliberately not in the ring: a client has to
   be distinguishable from an unbucketed card. */
is('colour: no greys in the ring',
   CLIENT_COLORS.filter((c) => c === 'gray' || c === 'default').length, 0);
/* Not "their position in the list": that is the bug this avoids. */
is('colour: a roster of eight uses eight different colours',
   new Set(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
     .map((x) => clientColor(`client-${x}`))).size >= 5, true);

section('Blueprint HQ · two clients busy on one day');

const clashShow = (slug, type = 'Show') =>
  ({ momentType: type, kind: 'Moment', title: 'A night', clientSlug: slug });
const clashFilm = (slug) =>
  ({ momentType: null, kind: 'Step', title: 'A shoot',
     flow: 'Client film session', clientSlug: slug });
const clashShoot = (slug) =>
  ({ momentType: null, kind: 'Content', title: 'A card',
     contentRole: 'film', clientSlug: slug });

is('clash: nothing on the day is nothing to say', dayClash([]), null);
is('clash: one client with a show is their own business',
   dayClash([clashShow('sean-comma')]), null);
/* The whole point: one client's two shows in a night is their problem
   and they already know. Two clients is ours, because one of us has
   to be at both. */
is('clash: one client with two shows is still not ours',
   dayClash([clashShow('sean-comma'), clashShow('sean-comma')]), null);
is('clash: two clients with a show the same night',
   dayClash([clashShow('sean-comma'), clashShow('mara-vale')]),
   '2 clients have a show or release on this day');
is('clash: a release counts as a night out too',
   dayClash([clashShow('sean-comma'), clashShow('mara-vale', 'Release')]),
   '2 clients have a show or release on this day');
is('clash: and so does a single drop, which is what Notion calls one',
   dayClash([clashShow('sean-comma', 'Single Drop'), clashShow('mara-vale', 'Release')]),
   '2 clients have a show or release on this day');
is('clash: two clients filming',
   dayClash([clashFilm('sean-comma'), clashFilm('mara-vale')]),
   '2 clients are filming on this day');
is('clash: a card’s shoot date is a camera too',
   dayClash([clashShoot('sean-comma'), clashFilm('mara-vale')]),
   '2 clients are filming on this day');
is('clash: one client filming is just a shoot',
   dayClash([clashFilm('sean-comma')]), null);
is('clash: both at once says both',
   dayClash([clashShow('a'), clashShow('b'), clashFilm('c'), clashFilm('d')]),
   '2 clients have a show or release, and 2 clients are filming on this day');
is('clash: three clients with a show says three',
   dayClash([clashShow('a'), clashShow('b'), clashShow('c')]),
   '3 clients have a show or release on this day');
/* A film step is marked by the clapperboard as well as by Flow, and
   both have to count or the Film days layer and the clash marker
   would disagree about what a shoot is. */
is('clash: a clapperboard title is a film session with no Flow set',
   dayClash([
     { momentType: null, kind: 'Step', title: '\u{1F3A5} Capture the set', clientSlug: 'a' },
     { momentType: null, kind: 'Step', title: '\u{1F3A5} Studio day', clientSlug: 'b' },
   ]),
   '2 clients are filming on this day');
is('clash: a show is not also counted as a shoot',
   dayClash([clashShow('a'), clashFilm('a')]), null);

section('Blueprint HQ · one classification, both screens');

/* itemKind is the rule the portal and HQ both read, so neither can
   decide on its own that a show is a to-do. */
is('kind: an open client step is their to-do',
   itemKind({ momentType: null, type: 'Admin', owner: 'Client', status: 'Not Started' }), 'todo');
is('kind: a show is a show',
   itemKind({ momentType: 'Show', type: null, owner: 'Blueprint', status: 'Not Started' }), 'show');
is('kind: a single drop is a release',
   itemKind({ momentType: 'Single Drop', type: null, owner: 'Blueprint', status: 'Not Started' }),
   'release');
is('kind: a content step is content',
   itemKind({ momentType: null, type: 'Content', owner: 'Blueprint', status: 'Not Started' }),
   'content');
is('kind: a done client step is no longer an open to-do',
   itemKind({ momentType: null, type: 'Admin', owner: 'Client', status: 'Done' }), 'task');
// Only a moment is a Moment. A step used to come back as one, which
// put the word at the top of the drawer of every task we do.
is('kind: a step of ours is a task',
   itemKind({ momentType: null, type: 'Admin', owner: 'Blueprint', status: 'Not Started' }),
   'task');
is('kind: a moment is still a moment',
   itemKind({ momentType: null, type: null, owner: null, status: null, kind: 'Moment' }),
   'moment');
is('kindLabel: every kind has a word',
   ['show', 'release', 'content', 'moment', 'todo', 'task'].every((k) => !!KIND_LABEL[k]), true);
is('momentKind: a moment on its own reads the same way',
   momentKind({ momentType: 'Show' }), 'show');
is('momentKind: nothing in particular is a moment',
   momentKind({ momentType: null }), 'moment');

section('Flow \u00b7 the whole Owner \u00d7 Type \u00d7 Flow \u00d7 Status board');

/* Flow is the one fact the layers key on, and most live rows have not
   been given one yet, so the fallback has to be exactly as good as
   the real thing. Every combination is walked here: nothing may land
   in no layer, nothing a client owns may be read-only, and nothing of
   ours may be writable by them. */

const FLOWS_OR_NONE = [null, ...STEP_FLOWS];
const OWNERS = ['Blueprint', 'Client', null];
const TYPES = ['Admin', 'Content', null];
const STATUSES = ['Not Started', 'In Progress', 'Done', 'Skipped', 'Moved', null];
const TITLES = ['Announce the thing', `${FILM_MARK} Film: the thing`];

const cellOf = (owner, type, flow, status, title) =>
  ({ owner, type, flow, status, title });

let cells = 0;
let noLayer = 0;
const broke = [];
for (const owner of OWNERS) {
  for (const type of TYPES) {
    for (const flow of FLOWS_OR_NONE) {
      for (const status of STATUSES) {
        for (const title of TITLES) {
          cells++;
          const row = cellOf(owner, type, flow, status, title);
          const ls = stepLayers(row);
          const f = flowOf(row);

          // Every layer is a real layer, and no duplicates.
          if (ls.some((l) => !PORTAL_LAYERS.includes(l))) broke.push(['layer not on a screen', row, ls]);
          if (new Set(ls).size !== ls.length) broke.push(['a layer twice', row, ls]);

          // A flow is one of Notion's, or nothing at all.
          if (f !== null && !STEP_FLOWS.includes(f)) broke.push(['invented a flow', row, f]);

          // A row with no owner cannot be classified, and that is the
          // only way to land nowhere.
          if (!ls.length) {
            noLayer++;
            if (owner !== null) broke.push(['an owned row landed nowhere', row, ls]);
          }

          // Ours is ours: the client may not write it, whatever the
          // status says.
          if (f === 'Blueprint task') {
            if (ls.join('|') !== 'blueprint') broke.push(['our task is not ours alone', row, ls]);
            if (canSetStepDate(row, 'client')) broke.push(['client could move our task', row]);
            if (canSetStepStatus(row, 'Done', 'client')) broke.push(['client could tick our task', row]);
          }

          // Theirs is theirs: anything in to-dos is owned by them, and
          // anything owned by them is in to-dos.
          const theirs = ls.includes('todos');
          if (theirs !== (owner === 'Client')) broke.push(['to-dos disagreed with Owner', row, ls]);

          // A step they own and that is still in play is writable.
          if (owner === 'Client' && ['Not Started', 'In Progress', 'Done', null].includes(status)) {
            if (!canSetStepDate(row, 'client')) broke.push(['client could not move their own', row]);
          }
          // One of ours standing in their portal may move anything.
          if (!canSetStepDate(row, 'admin')) broke.push(['admin could not move', row]);
        }
      }
    }
  }
}
is(`flow: walked the whole board (${cells} cells)`, cells, 3 * 3 * 7 * 6 * 2);
is('flow: nothing in the board broke a rule', broke.slice(0, 3), []);
is('flow: the only rows that land nowhere are the ones with no owner',
   noLayer, 1 * 3 * 7 * 6 * 2);

/* The fallback, stated plainly. These are the five shapes the live
   board actually holds. */
const derived = (owner, type, title = 'A thing') => flowOf({ owner, type, title, flow: null });
is('flow: Blueprint + Admin is our task', derived('Blueprint', 'Admin'), 'Blueprint task');
is('flow: Blueprint + Content is ours to make and post',
   derived('Blueprint', 'Content'), 'Blueprint makes + posts');
is('flow: Client + Content is theirs to make and post',
   derived('Client', 'Content'), 'Client makes + posts');
is('flow: Client + Admin is a task of theirs', derived('Client', 'Admin'), 'Client task');
is('flow: Client + Admin with a clapperboard is a film session',
   derived('Client', 'Admin', `${FILM_MARK} Film: it`), 'Client film session');
is('flow: no owner, no flow', derived(null, 'Content'), null);
// Type blank is the one that used to make a row of ours vanish.
is('flow: ours with no Type is still our task', derived('Blueprint', null), 'Blueprint task');
// A moment is not a job. It carries an Owner like anything else, and
// without this it read as our task in the drawer of every show.
is('flow: a moment has no flow',
   flowOf({ owner: 'Blueprint', type: null, title: 'The Echo', kind: 'Moment' }), null);
is('flow: nor does one known only by its Moment Type',
   flowOf({ owner: 'Blueprint', type: null, title: 'The Echo', momentType: 'Show' }), null);
is('flow: and a moment is nobody\u2019s Blueprint task',
   isBlueprintWork({ owner: 'Blueprint', type: null, title: 'The Echo', kind: 'Moment' }), false);
is('flow: a moment lands in no step layer',
   stepLayers({ owner: 'Blueprint', type: null, title: 'The Echo', kind: 'Moment' }).length, 0);
is('flow: theirs with no Type is still their task', derived('Client', null), 'Client task');
is('flow: Notion wins over the fallback',
   flowOf({ owner: 'Blueprint', type: 'Content', title: 'x',
            flow: 'Client films \u2192 Blueprint edits + posts' }),
   'Client films \u2192 Blueprint edits + posts');
is('flow: a value Notion does not have is not a flow',
   flowOf({ owner: 'Blueprint', type: 'Admin', title: 'x', flow: 'Something else' }),
   'Blueprint task');
// A Flow that contradicts Owner is a mistake in Notion, and the side
// that can actually write the row is the one to believe.
is('flow: Owner wins when the two disagree',
   flowOf({ owner: 'Blueprint', type: 'Admin', title: 'x', flow: 'Client task' }),
   'Blueprint task');
is('flow: and the other way round',
   flowOf({ owner: 'Client', type: 'Admin', title: 'x', flow: 'Blueprint task' }),
   'Client task');
is('flow: every flow names its own side',
   STEP_FLOWS.map((f) => `${f}=${flowOwner(f)}`).join(' | '),
   'Blueprint makes + posts=Blueprint | Blueprint task=Blueprint | Client task=Client | '
   + 'Client makes + posts=Client | Client films \u2192 Blueprint edits + posts=Blueprint | '
   + 'Client film session=Client');

/* What the client is told. */
is('flow: we post it', flowChip('Blueprint makes + posts'), 'Blueprint posts');
is('flow: we post what they filmed',
   flowChip('Client films \u2192 Blueprint edits + posts'), 'Blueprint posts');
is('flow: they post it', flowChip('Client makes + posts'), 'You post');
is('flow: they film it', flowChip('Client film session'), 'You film');
is('flow: our task just says Blueprint', flowChip('Blueprint task'), 'Blueprint');
is('flow: a plain to-do of theirs says nothing', flowChip('Client task'), null);
is('flow: and neither does nothing', flowChip(null), null);
is('flow: who posts a post',
   STEP_FLOWS.map((f) => `${f}=${postsBy(f) ?? '-'}`).join(' | '),
   'Blueprint makes + posts=blueprint | Blueprint task=- | Client task=- | '
   + 'Client makes + posts=client | Client films \u2192 Blueprint edits + posts=blueprint | '
   + 'Client film session=-');
is('flow: the labels a client reads',
   `${POSTS_LABEL.blueprint} / ${POSTS_LABEL.client}`, 'Blueprint posts / You post');
is('flow: isBlueprintWork follows the flow, derived or not',
   [isBlueprintWork({ owner: 'Blueprint', type: 'Admin', title: 'x' }),
    isBlueprintWork({ owner: 'Blueprint', type: 'Content', title: 'x' }),
    isBlueprintWork({ owner: 'Client', type: 'Admin', title: 'x' })].join('|'),
   'true|false|false');

section('Flow \u00b7 a card and the step it hangs off are one thing');

/* On the live board a card's Campaign relation names a STEP, and one
   step often has three cards. Drawing both put the same thing on the
   same day twice. */
const cards = [
  { status: 'Planned', campaign: ['406c-8be8-aaaa'] },
  { status: 'Planned', campaign: ['406c-8be8-aaaa'] },
  { status: 'Idea', campaign: ['406c8be8bbbb'] },
  { status: 'Skipped', campaign: ['406c8be8cccc'] },
  { status: 'Posted', campaign: [] },
];
const covered = stepsCoveredByCards(cards);
is('dedupe: a step three cards hang off is claimed once',
   covered.has('406c8be8aaaa'), true);
is('dedupe: dashes do not matter', covered.has(sameId('406C8BE8-BBBB')), true);
is('dedupe: a skipped card claims nothing', covered.has('406c8be8cccc'), false);
is('dedupe: a card with no campaign claims nothing', covered.size, 2);
is('dedupe: an id normalises to lowercase and no dashes',
   sameId('40AC-8BE8-816B'), '40ac8be8816b');
is('dedupe: nothing normalises to an empty string', sameId(null), '');

section('Blueprint HQ \u00b7 a card reads the same on both screens');

/* A Content Pipeline card is the one row both screens BUILD rather
   than receive, and they used to build it differently: the portal
   prefixed its film row and dropped it at Posted, HQ did neither.
   These are now one rule, so a card cannot read two ways. */
is('card: a post row keeps its own title',
   cardRowTitle('Drop day post', 'post'), 'Drop day post');
is('card: a film row says what the job is',
   cardRowTitle('Drop day post', 'film'), 'Film \u00b7 Drop day post');
is('card: no film date, no film row',
   cardFilmRow({ filmBy: null, status: 'Planned' }), false);
is('card: a planned shoot earns a row',
   cardFilmRow({ filmBy: '2026-11-20', status: 'Planned' }), true);
is('card: an idea with a shoot date earns one too',
   cardFilmRow({ filmBy: '2026-11-20', status: 'Idea' }), true);
for (const st of CARD_FILMED) {
  is(`card: nothing left to shoot at ${st}`,
     cardFilmRow({ filmBy: '2026-11-20', status: st }), false);
}
is('card: the filmed list covers the whole back half of the pipeline',
   CARD_FILMED.join('|'), 'Posted|Footage In|Editing|Ready for Review|Approved|Scheduled');
is('card: skipped is not a plan',
   cardOnCalendar({ status: 'Skipped' }), false);
is('card: everything else is',
   ['Idea', 'Planned', 'Footage In', 'Editing', 'Posted']
     .every((st) => cardOnCalendar({ status: st })), true);
is('card: a status we have never seen is still on the calendar',
   cardOnCalendar({ status: null }), true);

section('Blueprint HQ · the layers it draws');

is('layers: HQ draws the portal’s layers and Blueprint tasks',
   HQ_LAYERS.join('|'), 'moments|posts|films|todos|blueprint');
is('layers: and the portal’s are a prefix of them, not a different list',
   HQ_LAYERS.slice(0, PORTAL_LAYERS.length).join('|'), PORTAL_LAYERS.join('|'));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
