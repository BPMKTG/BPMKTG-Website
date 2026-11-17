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
  cardPostLayer,
  migrateLayers,
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
  dropStatus,
  STAGE_ORDER,
  STAGE_TITLE,
  STAGE_STATUSES,
  CONTENT_MEDIA,
  nextMove,
  originOf,
  countsToward,
  isFilmJob,
  contentSide,
  clientOwns,
  whoOf,
  ownStageOf,
  ownDropStatus,
  canDropOwn,
  isOwnIdea,
  cardDate,
  OWN_STAGE_ORDER,
  OWN_STAGE_TITLE,
  postedRecently,
  shortDay,
  parseFeedback,
  appendFeedback,
  latestFeedback,
  editPreview,
  cardMoment,
  cardMomentIndex,
  matchesFilters,
  isFiltering,
  NO_FILTERS,
  campaignLanes,
  LOOSE_LANE_TITLE,
  postMonths,
  monthLabel,
  monthCount,
  shiftMonth,
  counterMonths,
  monthBounds,
  MONTH_MIN,
  MONTH_CAP,
  // playbooks
  offsetLabel,
  stepWho,
  overrideProblem,
  isApplied,
  effectivePlaybook,
  byPhase,
  nearestPhase,
  playbookNames,
  planApply,
  planOverrideOnOpen,
  stepFromMaster,
  addDaysIso,
  CHANGE_TYPES,
  OVERRIDE_STATUSES,
  clientPlaybooks,
  clientRequests,
  buildMasterProperties,
  buildNewMaster,
  buildOverrideProperties,
  stepProperties,
  cleanOffset,
  vocabularyOf,
  shapeMaster,
  shapeOverride,
  cleanPatchText,
  cleanPatchUrl,
  cleanPatchDate,
  cleanPatchSelect,
  cleanPatchMulti,
  cleanPatchRelation,
  normaliseId,
  stageOf,
  MAX_TITLE,
  MAX_TEXT,
  // writes
  buildContentProperties,
  newContentOwner,
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
import {
  AUDIT_ALIASES, applyPlan, baselineOf, buildSnapshot, checkUpdate, duplicateMasters, getSnapshot, handDated,
  isSnapshotKey, latestSnapshotKey, matchMaster, pieceRestore, pieceWrite, planUpdate, putSnapshot, renameFor,
  snapshotKey, snapshotPrefix, stepRestore, stepWrite,
} from '../.tmp-portal-lib.mjs';
import { isRetiredPlaybook, playbooksOfPhase, retiredMasters, CALENDAR_FIELDS } from '../.tmp-portal-lib.mjs';
import {
  CLIENT_FILMS_FLOW, FILM_SESSION_FLOW, FLYER_SET, MAX_PIECES, PIECE_WRITE_BUDGET,
  appendNote, canMoveToNextMonth, filmByFor, isDeliverableFlow, isPieceMedia, isPriority,
  moveNote, nextMonthSameWeekday, pieceBucket, pieceCount, piecePlatforms, pieceProperties,
  pieceSource, pieceTitle, piecesForStep, piecesToFollow, piecesToSkip, planMissingPieces,
  removeNote, sessionsNoLongerNeeded, shapePiece, shapeStep, stepSkippedByPieces,
  stepsWithoutPieces, suggestTrims, trimNote,
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

// Three things a client may do: anything on a row they post, answer a
// cut that is waiting on them, and tick "filmed" on a card they film.
const ownRow = { postedBy: 'Client', source: 'Client Films' };
const oursFilmed = { postedBy: 'Blueprint', source: 'Client Films' };
const oursDrawn = { postedBy: 'Blueprint', source: 'Flyer / Graphic' };

is('status: review, approved', canClientMove('Ready for Review', 'Approved', oursDrawn), true);
is('status: review, handed back', canClientMove('Ready for Review', 'Editing', oursDrawn), true);
is('status: review cannot be skipped past', canClientMove('Ready for Review', 'Posted', oursDrawn), false);

is('status: the film tick', canClientMove('Planned', 'Filmed', oursFilmed), true);
is('status: and unticking it', canClientMove('Filmed', 'Planned', oursFilmed), true);
is('status: footage in follows a film they shot', canClientMove('Filmed', 'Footage In', oursFilmed), true);
is('status: no film tick on a flyer', canClientMove('Planned', 'Filmed', oursDrawn), false);
is('status: no film tick with no source at all', canClientMove('Planned', 'Filmed'), false);

// Everything else on one of ours is ours.
is('status: a client cannot start an edit', canClientMove('Footage In', 'Editing', oursFilmed), false);
is('status: a client cannot put a card up for review',
   canClientMove('Filmed', 'Ready for Review', oursFilmed), false);
is('status: a client cannot schedule', canClientMove('Approved', 'Scheduled', oursDrawn), false);
is('status: a client cannot mark ours posted', canClientMove('Approved', 'Posted', oursDrawn), false);
is('status: a client cannot skip ours',
   CONTENT_STATUSES.filter(st => st !== 'Skipped' && canClientMove(st, 'Skipped', oursDrawn)), []);
is('status: no approving an unseen edit', canClientMove('Editing', 'Approved', oursDrawn), false);
is('status: no un-posting', canClientMove('Posted', 'Approved', oursDrawn), false);
is('status: the table holds nothing but the review answer',
   CONTENT_STATUSES.filter(st => CLIENT_STATUS_MOVES[st].length), ['Ready for Review']);

// A row the client posts is ownRow end to end.
is('status: their own row goes anywhere',
   CONTENT_STATUSES.every(to => canClientMove('Idea', to, ownRow)), true);
is('status: but not to a status that does not exist', canClientMove('Idea', 'Published', ownRow), false);

is('status: a status that is already set is a no-op, not a refusal',
   canClientMove('Editing', 'Editing', oursDrawn), true);
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
  media: CONTENT_MEDIA.map(name => ({ name, color: 'gray' })),
};
const ctx = (currentStatus = 'Planned', more = {}) =>
  ({ schema, allowedCampaigns: mine, currentStatus, ...more });

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

const move = buildContentProperties({ status: 'Filmed' },
  ctx('Planned', { source: 'Client Films', postedBy: 'Blueprint' }));
is('build: an allowed status move writes the select',
   move.properties.Status.select.name, 'Filmed');
is('build: the film tick is refused on a card nobody films',
   buildContentProperties({ status: 'Filmed' },
     ctx('Planned', { source: 'Flyer / Graphic', postedBy: 'Blueprint' })).rejected, ['status']);
is('build: an admin moves anything',
   buildContentProperties({ status: 'Posted' },
     ctx('Planned', { role: 'admin', postedBy: 'Blueprint' })).properties.Status.select.name, 'Posted');

// Media: theirs to set on a row they own, ours everywhere else.
is('build: a client sets Media on their own row',
   buildContentProperties({ media: 'Carousel' }, ctx('Idea', { postedBy: 'Client' })).properties.Media.select.name,
   'Carousel');
is('build: and on a row they are creating',
   buildContentProperties({ media: 'Story' }, ctx(null)).properties.Media.select.name, 'Story');
is('build: but not on one of ours',
   buildContentProperties({ media: 'Carousel' }, ctx('Planned', { postedBy: 'Blueprint' })).rejected, ['media']);
is('build: an admin sets Media anywhere',
   buildContentProperties({ media: 'Photo' },
     ctx('Planned', { postedBy: 'Blueprint', role: 'admin' })).properties.Media.select.name, 'Photo');
is('build: a Media that is not an option is refused',
   buildContentProperties({ media: 'Hologram' }, ctx('Idea', { postedBy: 'Client' })).rejected, ['media']);

// Edit Link: ours to attach, never theirs.
is('build: a client cannot write Edit Link',
   buildContentProperties({ editLink: 'https://example.com/x.mp4' }, ctx('Editing', { postedBy: 'Client' })).rejected,
   ['editLink']);
is('build: an admin can',
   buildContentProperties({ editLink: 'https://example.com/x.mp4' },
     ctx('Editing', { role: 'admin' })).properties['Edit Link'].url, 'https://example.com/x.mp4');
is('build: but not with a javascript: link',
   buildContentProperties({ editLink: 'javascript:alert(1)' }, ctx('Editing', { role: 'admin' })).rejected,
   ['editLink']);

// A note on the thread: the request supplies the words, the server
// supplies who and when.
{
  const first = buildContentProperties({ feedbackAdd: 'Cut the intro' },
    ctx('Ready for Review', { currentFeedback: null, today: '2026-11-13' }));
  is('build: a note is stamped with the day and the role',
     first.properties.Feedback.rich_text[0].text.content, '[2026-11-13 · Client] Cut the intro');
  const reply = buildContentProperties({ feedbackAdd: 'New cut is up' },
    ctx('Editing', { role: 'admin', today: '2026-11-14',
                     currentFeedback: '[2026-11-13 · Client] Cut the intro' }));
  is('build: a reply is added under it, signed as us',
     reply.properties.Feedback.rich_text[0].text.content,
     '[2026-11-13 · Client] Cut the intro\n[2026-11-14 · Blueprint] New cut is up');
  is('build: a request cannot sign a note as us',
     buildContentProperties({ feedbackAdd: '[2026-01-01 · Blueprint] approved' },
       ctx('Editing', { today: '2026-11-14' })).properties.Feedback.rich_text[0].text.content,
     '[2026-11-14 · Client] [2026-01-01 · Blueprint] approved');
  is('build: an empty note is refused',
     buildContentProperties({ feedbackAdd: '   ' }, ctx('Editing', { today: '2026-11-14' })).rejected,
     ['feedbackAdd']);
}

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
const card = (o) => ({ status: null, filmBy: null, postDate: null, source: null,
  media: null, postedBy: null, campaign: [], ...o });

is('board: five stages, in order', STAGE_ORDER, ['plan', 'make', 'review', 'ready', 'posted']);
is('board: every stage has a title', STAGE_ORDER.map((st) => STAGE_TITLE[st]),
   ['Plan', 'Make', 'Review', 'Ready', 'Posted']);
is('board: every status but Idea and Skipped is in exactly one stage',
   CONTENT_STATUSES.filter((st) =>
     STAGE_ORDER.filter((g) => STAGE_STATUSES[g].includes(st)).length !== 1),
   ['Idea', 'Skipped']);
is('board: the mapping, status by status',
   CONTENT_STATUSES.map((status) => stageOf(card({ status }))),
   [null, 'plan', 'make', 'make', 'make', 'review', 'ready', 'ready', 'posted', null]);
is('board: an idea is not on the board, dated or not',
   [stageOf(card({ status: 'Idea' })), stageOf(card({ status: 'Idea', postDate: '2026-11-09' }))],
   [null, null]);
is('board: Source no longer decides a column',
   ['Client Films', 'Show Media', 'Flyer / Graphic', null]
     .map((source) => stageOf(card({ status: 'Planned', source }))),
   ['plan', 'plan', 'plan', 'plan']);

is('board: a recent post is recent',
   postedRecently(card({ status: 'Posted', postDate: '2026-10-20' }), nowC), true);
is('board: a post older than 30 days is not',
   postedRecently(card({ status: 'Posted', postDate: '2026-09-01' }), nowC), false);
is('board: the 30th day still counts',
   postedRecently(card({ status: 'Posted', postDate: '2026-09-28' }), nowC), true);

section('Content: where a row came from, and whether it counts');

is('origin: linked to a campaign', originOf(card({ status: 'Planned', campaign: ['x'] })), 'campaign');
is('origin: an idea with no campaign', originOf(card({ status: 'Idea' })), 'idea');
is('origin: anything else with no campaign is standalone',
   originOf(card({ status: 'Posted' })), 'standalone');
is('origin: an idea linked to a campaign is a campaign row',
   originOf(card({ status: 'Idea', campaign: ['x'] })), 'campaign');

is('counts: ours, dated, not skipped',
   countsToward(card({ postedBy: 'Blueprint', status: 'Planned', postDate: '2026-11-09' })), true);
is('counts: a client post does not', countsToward(card({ postedBy: 'Client', status: 'Posted', postDate: '2026-11-09' })), false);
is('counts: undated does not', countsToward(card({ postedBy: 'Blueprint', status: 'Planned' })), false);
is('counts: skipped does not', countsToward(card({ postedBy: 'Blueprint', status: 'Skipped', postDate: '2026-11-09' })), false);
is('counts: nobody named as posting it does not', countsToward(card({ status: 'Planned', postDate: '2026-11-09' })), false);

// A card links to the step it delivers; the board groups by moment.
{
  const mom = { id: 'aaaa-1111', title: 'Faith Rave', date: '2026-11-15', momentType: 'Show' };
  const idx = cardMomentIndex([
    { id: 'aaaa-1111', title: 'Faith Rave', date: '2026-11-15', kind: 'Moment', momentType: 'Show', moment: null },
    { id: 'bbbb-2222', title: 'Flyer', date: '2026-11-01', kind: 'Step', momentType: null, moment: mom },
    { id: 'cccc-3333', title: 'A loose to-do', date: '2026-11-02', kind: 'Step', momentType: null, moment: null },
  ]);
  is('moment: a card linked to a step resolves to the step’s moment',
     cardMoment({ campaign: ['bbbb2222'] }, idx)?.title, 'Faith Rave');
  is('moment: a card linked straight to the moment resolves to it',
     cardMoment({ campaign: ['AAAA-1111'] }, idx)?.id, 'aaaa-1111');
  is('moment: a card linked to a step with no moment has none',
     cardMoment({ campaign: ['cccc-3333'] }, idx), null);
  is('moment: a card linked to something unseen has none',
     cardMoment({ campaign: ['dddd-4444'] }, idx), null);
  is('moment: a card linked to nothing has none', cardMoment({ campaign: [] }, idx), null);
}

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

const pcard = (o) => ({ status: null, source: null, postedBy: null, media: null,
  filmBy: null, postDate: null, ...o });

// A drop writes the column's first status, except Make and Ready.
is('drop: what each column writes for us',
   STAGE_ORDER.map((st) => dropStatus(pcard({}), st, 'admin')),
   ['Planned', 'Editing', 'Ready for Review', 'Approved', 'Posted']);
is('drop: Make writes Editing for us even on a card the client films',
   dropStatus(pcard({ source: 'Client Films' }), 'make', 'admin'), 'Editing');
// The client's Make on a card they film is the film tick.
is('drop: the client’s Make on a film job is Filmed',
   dropStatus(pcard({ source: 'Client Films', media: 'Video' }), 'make', 'client'), 'Filmed');
is('drop: but Editing on anything nobody films',
   dropStatus(pcard({ source: 'Client Films', media: 'Graphic' }), 'make', 'client'), 'Editing');

// ── the client's own moves ──
is('move: the film tick, by dragging Plan to Make',
   canDrop(pcard({ status: 'Planned', source: 'Client Films', postedBy: 'Blueprint' }), 'make', 'client'), true);
is('move: and back out again',
   canDrop(pcard({ status: 'Filmed', source: 'Client Films', postedBy: 'Blueprint' }), 'plan', 'client'), true);
is('move: not on a flyer',
   canDrop(pcard({ status: 'Planned', source: 'Flyer / Graphic', postedBy: 'Blueprint' }), 'make', 'client'), false);
is('move: review, approved',
   canDrop(pcard({ status: 'Ready for Review', postedBy: 'Blueprint' }), 'ready', 'client'), true);
is('move: review, sent back to Make',
   canDrop(pcard({ status: 'Ready for Review', postedBy: 'Blueprint', source: 'Show Media' }), 'make', 'client'), true);
is('move: the client cannot drag ours to Posted',
   canDrop(pcard({ status: 'Approved', postedBy: 'Blueprint' }), 'posted', 'client'), false);
is('move: nor a Blueprint card anywhere from Plan',
   STAGE_ORDER.filter((st) => st !== 'plan'
     && canDrop(pcard({ status: 'Planned', postedBy: 'Blueprint', source: 'Show Media' }), st, 'client')), []);

// ── a row the client posts is theirs end to end ──
is('move: Posted By Client goes anywhere',
   STAGE_ORDER.map((st) => canDrop(pcard({ status: 'Planned', postedBy: 'Client' }), st, 'client')),
   [true, true, true, true, true]);

// ── admin moves anything ──
is('move: admin reaches every column from every status',
   CONTENT_STATUSES.every((status) => STAGE_ORDER.every((st) =>
     canDrop(pcard({ status, postedBy: 'Blueprint' }), st, 'admin'))), true);

// ── no cell of the board lets a client write one of ours ──
{
  const sources = [null, 'Client Films', 'Show Media', 'Flyer / Graphic'];
  const medias = [null, ...CONTENT_MEDIA];
  let wrong = [];
  let offered = 0;
  for (const status of CONTENT_STATUSES) {
    for (const source of sources) {
      for (const media of medias) {
        for (const stage of STAGE_ORDER) {
          const ours = pcard({ status, source, media, postedBy: 'Blueprint' });
          if (!canDrop(ours, stage, 'client')) continue;
          offered++;
          const to = dropStatus(ours, stage, 'client');
          // Allowed by canDrop means allowed by the rule the server
          // enforces. If those two ever disagree, the board offers a
          // move the server will refuse, which is the silent failure
          // this whole pass exists to remove.
          if (!canClientMove(status, to, { postedBy: 'Blueprint', source })) {
            wrong.push(`${status}/${source}/${media}/${stage}`);
          }
        }
      }
    }
  }
  is('move: the board never offers a client a move the server refuses', wrong, []);
  ok('move: and it does offer some', offered > 0);
}

section('Pipeline: the next move on the face of a card');

const seanV = { name: 'Sean Comma' };
const youV = { name: 'Sean Comma', you: true };
const nm = (o, v = seanV) => nextMove(pcard(o), v);

is('next: planned, the client films',
   nm({ status: 'Planned', source: 'Client Films', media: 'Video', filmBy: '2026-11-10', postDate: '2026-11-14' }),
   { text: 'Sean Comma films by Nov 10', waiting: 'Client' });
is('next: the same line to the client themselves',
   nm({ status: 'Planned', source: 'Client Films', media: 'Video', filmBy: '2026-11-10' }, youV).text,
   'You film by Nov 10');
is('next: planned, anything else',
   nm({ status: 'Planned', source: 'Show Media', media: 'Video', postDate: '2026-11-14', postedBy: 'Blueprint' }),
   { text: 'Blueprint making · posts Nov 14', waiting: 'Blueprint' });
is('next: filmed and footage in',
   [nm({ status: 'Filmed' }), nm({ status: 'Footage In' })],
   [{ text: 'Blueprint to edit', waiting: 'Blueprint' }, { text: 'Blueprint to edit', waiting: 'Blueprint' }]);
is('next: editing, by what it is',
   [null, 'Video', 'Graphic', 'Story', 'Photo', 'Carousel'].map((media) => nm({ status: 'Editing', media }).text),
   ['Blueprint editing', 'Blueprint editing', 'Blueprint designing', 'Blueprint designing',
    'Blueprint selecting', 'Blueprint selecting']);
is('next: ready for review', nm({ status: 'Ready for Review' }), { text: 'Sean Comma to approve', waiting: 'Client' });
is('next: ready for review, to the client', nm({ status: 'Ready for Review' }, youV).text, 'Yours to approve');
is('next: approved and scheduled',
   [nm({ status: 'Approved', postDate: '2026-11-14', postedBy: 'Blueprint' }),
    nm({ status: 'Scheduled', postDate: '2026-11-14', postedBy: 'Blueprint' })],
   [{ text: 'Posts Nov 14', waiting: 'Blueprint' }, { text: 'Posts Nov 14', waiting: 'Blueprint' }]);
is('next: approved, and the client is the one posting',
   nm({ status: 'Approved', postDate: '2026-11-14', postedBy: 'Client' }).waiting, 'Client');
is('next: posted waits on nobody', nm({ status: 'Posted', postDate: '2026-11-01' }), { text: 'Posted Nov 1', waiting: null });
is('next: an idea and a skipped card have no next move',
   [nm({ status: 'Idea' }), nm({ status: 'Skipped' })], [null, null]);

// A Graphic never mentions filming, whatever its Source says.
{
  const says = [];
  for (const status of CONTENT_STATUSES) {
    for (const source of [null, 'Client Films', 'Show Media', 'Flyer / Graphic']) {
      for (const postedBy of ['Blueprint', 'Client']) {
        for (const v of [seanV, youV]) {
          const t = nm({ status, source, postedBy, media: 'Graphic',
                         filmBy: '2026-11-10', postDate: '2026-11-14' }, v)?.text ?? '';
          if (/film/i.test(t) || t.includes('Nov 10')) says.push(`${status}/${source}/${postedBy}: ${t}`);
        }
      }
    }
  }
  is('next: a Graphic never mentions filming, or shows its Film By', says, []);
}
is('next: Film By appears only in the films line',
   CONTENT_STATUSES.filter((status) => status !== 'Planned'
     && (nm({ status, source: 'Client Films', media: 'Video',
              filmBy: '2026-11-10', postDate: '2026-11-14' })?.text ?? '').includes('Nov 10')), []);
is('next: a film job is Client Films and something a camera makes',
   [isFilmJob({ source: 'Client Films', media: 'Video' }), isFilmJob({ source: 'Client Films', media: 'Story' }),
    isFilmJob({ source: 'Client Films', media: null }), isFilmJob({ source: 'Client Films', media: 'Graphic' }),
    isFilmJob({ source: 'Show Media', media: 'Video' })],
   [true, true, true, false, false]);
is('next: a piece the client makes and posts is not ours to be making',
   nm({ status: 'Planned', source: 'Client Films', media: 'Carousel', postedBy: 'Client', postDate: '2026-11-14' }),
   { text: 'Sean Comma making · posts Nov 14', waiting: 'Client' });
is('next: a day reads as the day it says', [shortDay('2026-11-01'), shortDay('2026-01-31'), shortDay(null)],
   ['Nov 1', 'Jan 31', '']);

section('Content: the feedback thread');

is('thread: nothing is nothing', parseFeedback(null), []);
is('thread: text typed by hand is one undated note',
   parseFeedback('Cut the intro'), [{ who: null, day: null, text: 'Cut the intro' }]);
is('thread: stamped notes, in order',
   parseFeedback('[2026-11-13 · Client] Cut the intro\n[2026-11-14 · Blueprint] Done').map((e) => `${e.who}:${e.text}`),
   ['Client:Cut the intro', 'Blueprint:Done']);
is('thread: a note may run over lines',
   parseFeedback('[2026-11-13 · Client] one\ntwo\n[2026-11-14 · Blueprint] three')[0].text, 'one\ntwo');
is('thread: hand-typed text before the first stamp is kept',
   parseFeedback('old note\n[2026-11-13 · Client] new').map((e) => e.text), ['old note', 'new']);
is('thread: the latest is the last',
   latestFeedback('[2026-11-13 · Client] a\n[2026-11-14 · Blueprint] b')?.text, 'b');
is('thread: appending keeps what was there',
   appendFeedback('old note', 'Client', '2026-11-13', 'new'), 'old note\n[2026-11-13 · Client] new');
{
  const long = 'x'.repeat(1100);
  let t = appendFeedback(null, 'Client', '2026-11-01', long);
  t = appendFeedback(t, 'Blueprint', '2026-11-02', long);
  t = appendFeedback(t, 'Client', '2026-11-03', 'the newest');
  ok('thread: it never outgrows the field', t.length <= MAX_TEXT);
  is('thread: and the oldest note is the one that goes',
     parseFeedback(t).map((e) => e.day), ['2026-11-02', '2026-11-03']);
}

section('Content: previewing the cut');

is('preview: a video file plays in place',
   editPreview('https://cdn.example.com/cuts/final.mp4'), { kind: 'video', src: 'https://cdn.example.com/cuts/final.mp4' });
is('preview: an image shows in place', editPreview('https://cdn.example.com/a/flyer.PNG')?.kind, 'image');
is('preview: a Drive file becomes its own preview address',
   editPreview('https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/view?usp=sharing'),
   { kind: 'frame', src: 'https://drive.google.com/file/d/1AbCdEfGhIjKlMnOp/preview' });
is('preview: a Drive folder is just a link', editPreview('https://drive.google.com/drive/folders/1AbCdEfGhIjKlMnOp'), null);
is('preview: YouTube, by id', editPreview('https://youtu.be/dQw4w9WgXcQ')?.src,
   'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ');
is('preview: an unknown host is never framed', editPreview('https://evil.example.com/page'), null);
is('preview: nor is plain http', editPreview('http://cdn.example.com/x.mp4'), null);
is('preview: nor a javascript: link', editPreview('javascript:alert(1)'), null);
is('preview: nothing is nothing', editPreview(null), null);

section('Content: filters');

{
  const base = { id: '1', title: 'Faith Rave flyer', status: 'Planned', bucket: null, format: [],
    source: 'Flyer / Graphic', filmBy: null, postDate: '2026-11-18', postedBy: 'Blueprint',
    platforms: [], campaign: ['step-1'], shootCode: 'FR1', onScreenText: null, caption: null,
    notes: null, feedback: null, footageLink: null, editLink: null, postLink: null, media: 'Graphic' };
  const ctxF = { voice: { name: 'Sean' }, momentId: 'aaaa-1111' };
  const f = (o) => ({ ...NO_FILTERS, ...o });
  const hit = (o, item = base) => matchesFilters(item, f(o), ctxF);

  is('filter: nothing set matches everything', hit({}), true);
  is('filter: nothing set is not filtering', isFiltering(NO_FILTERS), false);
  is('filter: media', [hit({ media: 'Graphic' }), hit({ media: 'Video' })], [true, false]);
  is('filter: an unclassified row is a video',
     matchesFilters({ ...base, media: null }, f({ media: 'Video' }), ctxF), true);
  is('filter: waiting on comes from the next-move line',
     [hit({ waiting: 'Blueprint' }), hit({ waiting: 'Client' })], [true, false]);
  is('filter: a card in review is waiting on the client',
     matchesFilters({ ...base, status: 'Ready for Review' }, f({ waiting: 'Client' }), ctxF), true);
  is('filter: a posted card is waiting on nobody',
     ['Blueprint', 'Client'].map((w) => matchesFilters({ ...base, status: 'Posted' }, f({ waiting: w }), ctxF)),
     [false, false]);
  is('filter: posted by', [hit({ postedBy: 'Blueprint' }), hit({ postedBy: 'Client' })], [true, false]);
  is('filter: moment, dashed or not', [hit({ moment: 'AAAA1111' }), hit({ moment: 'bbbb-2222' })], [true, false]);
  is('filter: month is the post date’s', [hit({ month: '2026-11' }), hit({ month: '2026-12' })], [true, false]);
  is('filter: an undated card is in no month',
     matchesFilters({ ...base, postDate: null }, f({ month: '2026-11' }), ctxF), false);
  is('filter: search reads the title and the shoot code',
     [hit({ search: 'flyer' }), hit({ search: 'fr1' }), hit({ search: 'recap' })], [true, true, false]);
  is('filter: filters combine', hit({ media: 'Graphic', month: '2026-11', waiting: 'Client' }), false);

  is('months: the ones something posts in, in order',
     postMonths([{ postDate: '2026-12-04' }, { postDate: '2026-11-01' }, { postDate: null }, { postDate: '2026-11-30' }]),
     ['2026-11', '2026-12']);
  is('months: a label a person reads', monthLabel('2026-11'), 'November 2026');
}

section('Content: campaigns as lanes');

{
  const M = {
    past:   { id: 'm-past', title: 'Rooftop Revival', date: '2026-10-18', momentType: 'Show' },
    soon:   { id: 'm-soon', title: 'Rooftop Remix', date: '2026-11-13', momentType: 'Release' },
    later:  { id: 'm-later', title: 'Christmas Show', date: '2026-12-13', momentType: 'Show' },
    older:  { id: 'm-older', title: 'Sunset Service', date: '2026-09-01', momentType: 'Show' },
  };
  const row = (status, m, extra = {}) =>
    ({ status, campaign: m ? [m.id] : [], postedBy: 'Blueprint', m, ...extra });
  const theirOwn = { postedBy: 'Client' };
  const all = [
    row('Planned', M.later), row('Posted', M.past), row('Posted', M.soon), row('Planned', M.soon),
    row('Skipped', M.soon), row('Posted', M.older),
    row('Planned', null, theirOwn), row('Idea', null, theirOwn),
    row('Planned', null, { campaign: ['hidden-step'] }),
  ];
  const lanes = campaignLanes(all, (c) => c.m, '2026-11-13');

  is('lanes: soonest first, then the past most recent first, then the unplaceable',
     lanes.map((l) => l.moment?.title ?? '(unlinked)'),
     ['Rooftop Remix', 'Christmas Show', 'Rooftop Revival', 'Sunset Service', '(unlinked)']);
  is('lanes: a moment happening today is still ahead', lanes[0].moment.id, 'm-soon');
  is('lanes: x of y posted, and a skipped card is in neither',
     [lanes[0].posted, lanes[0].total], [1, 2]);
  is('lanes: a row the client posts in no campaign is not in any lane',
     lanes.reduce((n, l) => n + l.items.length, 0), 6);
  is('lanes: a card linked to something unseen still has a lane',
     lanes[4].items.length, 1);
  is('lanes: with nothing of ours outside a campaign, there is no such lane',
     lanes.some((l) => l.loose !== null), false);

  // Ours, and for no campaign: one lane of its own, after everything.
  const withLoose = campaignLanes([
    row('Planned', null, { title: 'Loose A' }), ...all,
    row('Posted', null, { title: 'Loose B' }), row('Skipped', null, { title: 'Dropped' }),
    row('Planned', null, { title: 'Nobody named', postedBy: null }),
  ], (c) => c.m, '2026-11-13');
  const last = withLoose[withLoose.length - 1];
  is('lanes: our pieces with no campaign get the last lane',
     withLoose.map((l) => (l.loose !== null ? LOOSE_LANE_TITLE : l.moment?.title ?? '(unlinked)')),
     ['Rooftop Remix', 'Christmas Show', 'Rooftop Revival', 'Sunset Service', '(unlinked)',
      'Other Blueprint pieces']);
  is('lanes: all of them in it, a skipped one aside, and a row nobody is named on',
     last.items.map((c) => c.title), ['Loose A', 'Loose B', 'Nobody named']);
  is('lanes: it counts posted like any other', [last.posted, last.total], [1, 3]);
  is('lanes: it is not the lane of cards linked to something unseen',
     [last.moment, withLoose[4].loose], [null, null]);
  is('lanes: the client’s own rows are still in none of them',
     withLoose.flatMap((l) => l.items).some((c) => c.postedBy === 'Client'), false);

  // Across clients each gets their own, in name order, all still last.
  const roster = campaignLanes([
    row('Planned', null, { who: 'Zed' }), row('Planned', M.soon, { who: 'Zed' }),
    row('Planned', null, { who: 'Abe' }), row('Posted', null, { who: 'Zed' }),
  ], (c) => c.m, '2026-11-13', (c) => c.who);
  is('lanes: one loose lane per client on a page of several',
     roster.map((l) => l.loose), [null, 'Abe', 'Zed']);
  is('lanes: and each holds only that client’s', roster[2].items.every((c) => c.who === 'Zed'), true);
}

section('Content: the month counter');

{
  const piece = (n, o = {}) => ({ title: `Piece ${String(n).padStart(2, '0')}`, status: 'Planned',
    postDate: `2026-11-${String((n % 28) + 1).padStart(2, '0')}`, postedBy: 'Blueprint', media: 'Video', ...o });
  const many = (k) => Array.from({ length: k }, (_, i) => piece(i));

  const c21 = monthCount([
    ...many(21).map((p, i) => (i < 6 ? { ...p, status: 'Posted' } : p)),
    piece(1, { postedBy: 'Client' }),                     // theirs
    piece(2, { status: 'Skipped' }),                      // dropped
    piece(3, { postDate: null }),                         // undated
    piece(4, { postDate: '2026-12-01' }),                 // another month
  ], '2026-11');
  is('count: what counts, counted', [c21.planned, c21.posted], [21, 6]);
  is('count: inside the band', [c21.state, c21.short, c21.over], ['ok', 0, 0]);
  is('count: the label is the month', c21.label, 'November 2026');

  const c12 = monthCount(many(12), '2026-11');
  is('count: under the minimum', [c12.state, c12.short, c12.over], ['under', MONTH_MIN - 12, 0]);
  is('count: an empty month is fifteen short', monthCount([], '2026-11').short, MONTH_MIN);
  is('count: exactly fifteen is on target', monthCount(many(15), '2026-11').state, 'ok');
  is('count: exactly twenty-five is on target', monthCount(many(25), '2026-11').state, 'ok');

  const c28 = monthCount(many(28), '2026-11');
  is('count: over the cap', [c28.state, c28.over], ['over', 3]);
  is('count: rows are numbered from one', c28.rows.map((r) => r.n).slice(0, 3), [1, 2, 3]);
  is('count: the pieces past twenty-five are the ones flagged',
     c28.rows.filter((r) => r.overCap).map((r) => r.n), [26, 27, 28]);
  is('count: numbered in the order they go out',
     c28.rows.every((r, i, a) => i === 0 || a[i - 1].item.postDate <= r.item.postDate), true);

  const mixed = monthCount([
    piece(1, { media: 'Story' }), piece(2, { media: 'Story' }), piece(3, { media: null }),
    piece(4, { media: 'Graphic' }), piece(5, { media: 'Video' }), piece(6, { media: 'Video' }),
  ], '2026-11');
  is('count: the breakdown, most first, an unclassified row as a video',
     mixed.byMedia, [{ media: 'Video', n: 3 }, { media: 'Story', n: 2 }, { media: 'Graphic', n: 1 }]);
  is('count: the breakdown adds up to the count',
     mixed.byMedia.reduce((t, m) => t + m.n, 0), mixed.planned);

  // A crosspost is one row, so it is one deliverable.
  is('count: four platforms is still one piece',
     monthCount([piece(1, { platforms: ['Instagram', 'TikTok', 'YouTube', 'Facebook'] })], '2026-11').planned, 1);

  // The card on the client page and the counter are the same number.
  is('count: the HQ client card agrees with the counter',
     deliverables(many(28), new Date('2026-11-13T12:00:00Z')).total, c28.planned);

  is('months: forward a month', shiftMonth('2026-11', 1), '2026-12');
  is('months: across a year, both ways', [shiftMonth('2026-12', 1), shiftMonth('2027-01', -1)], ['2027-01', '2026-12']);
  is('months: what HQ can count whole', counterMonths('2026-11-13'), ['2026-10', '2026-11', '2026-12', '2027-01']);
  is('months: the bounds of one', monthBounds('2027-02'), { first: '2027-02-01', last: '2027-02-28' });
  is('months: and of a thirty-one day one', monthBounds('2026-12').last, '2026-12-31');
}

section('My Content: boards and columns, as they were');

const nowOwn = new Date(2026, 9, 28);   // 28 Oct 2026
const ownCard = (o) => ({ status: null, filmBy: null, postDate: null, ...o });

is('ideas: an undated idea is in the well', isOwnIdea(ownCard({ status: 'Idea' })), true);
is('ideas: a planned card with no date is still an idea',
   isOwnIdea(ownCard({ status: 'Planned' })), true);
is('ideas: a date takes it out of the well',
   isOwnIdea(ownCard({ status: 'Planned', postDate: '2026-11-02' })), false);
is('ideas: filmed is not an idea', isOwnIdea(ownCard({ status: 'Filmed' })), false);

is('pipeline: planned with no film date', ownStageOf(ownCard({ status: 'Planned' }), nowOwn), 'planned');
// Source decides the pre-camera column now, not Film By. A flyer we
// are drawing has a Film By too, and it used to land in the client's
// To film pile with a date they could do nothing about.
is('pipeline: a film date alone is not To film',
   ownStageOf(ownCard({ status: 'Planned', filmBy: '2026-11-01' }), nowOwn), 'planned');
is('pipeline: Client Films is To film',
   ownStageOf(ownCard({ status: 'Planned', filmBy: '2026-11-01', source: 'Client Films' }), nowOwn), 'toFilm');
is('pipeline: Client Films is To film even with no film date',
   ownStageOf(ownCard({ status: 'Planned', source: 'Client Films' }), nowOwn), 'toFilm');
// "Up next" and "Your review" were columns about our work, and our
// work has its own side now. The cards that sat in them are still on
// the board, one column over.
is('pipeline: a flyer is Planned, not To film, shoot date or no',
   ownStageOf(ownCard({ status: 'Planned', filmBy: '2026-11-01', source: 'Flyer / Graphic' }), nowOwn), 'planned');
is('pipeline: show media is Planned too',
   ownStageOf(ownCard({ status: 'Planned', source: 'Show Media' }), nowOwn), 'planned');
is('pipeline: a cut waiting on a yes is still in the edit',
   [ownStageOf(ownCard({ status: 'Editing' }), nowOwn), ownStageOf(ownCard({ status: 'Ready for Review' }), nowOwn)],
   ['editing', 'editing']);
is('pipeline: no status a card can hold leaves it off the board for want of a column',
   ['Planned', 'Filmed', 'Footage In', 'Editing', 'Ready for Review', 'Approved', 'Scheduled']
     .map((status) => ownStageOf(ownCard({ status }), nowOwn)).filter((st) => !OWN_STAGE_ORDER.includes(st)), []);
is('pipeline: filmed and footage in share a column',
   [ownStageOf(ownCard({ status: 'Filmed' }), nowOwn), ownStageOf(ownCard({ status: 'Footage In' }), nowOwn)],
   ['filmed', 'filmed']);
is('pipeline: approved and scheduled share Ready to Post',
   [ownStageOf(ownCard({ status: 'Approved' }), nowOwn), ownStageOf(ownCard({ status: 'Scheduled' }), nowOwn)],
   ['ready', 'ready']);
is('pipeline: skipped is hidden', ownStageOf(ownCard({ status: 'Skipped' }), nowOwn), null);
is('pipeline: an undated idea is not on the pipeline', ownStageOf(ownCard({ status: 'Idea' }), nowOwn), null);
is('pipeline: a dated idea lands in Planned',
   ownStageOf(ownCard({ status: 'Idea', postDate: '2026-11-09' }), nowOwn), 'planned');
is('pipeline: a dated idea the client films lands in To film',
   ownStageOf(ownCard({ status: 'Idea', postDate: '2026-11-09', filmBy: '2026-11-05',
                  source: 'Client Films' }), nowOwn), 'toFilm');
is('pipeline: a dated idea with a shoot date but no source stays in Planned',
   ownStageOf(ownCard({ status: 'Idea', postDate: '2026-11-09', filmBy: '2026-11-05' }), nowOwn), 'planned');
is('pipeline: an idea with only a shoot date is still on the board',
   ownStageOf(ownCard({ status: 'Idea', filmBy: '2026-11-05', source: 'Client Films' }), nowOwn), 'toFilm');
is('ideas: a dated idea is off the Ideas board',
   isOwnIdea({ status: 'Idea', postDate: '2026-11-09' }), false);
is('pipeline: a recent post still shows',
   ownStageOf(ownCard({ status: 'Posted', postDate: '2026-10-20' }), nowOwn), 'posted');
is('pipeline: a post older than 30 days drops off',
   ownStageOf(ownCard({ status: 'Posted', postDate: '2026-09-01' }), nowOwn), null);
is('pipeline: the 30th day still counts',
   ownStageOf(ownCard({ status: 'Posted', postDate: '2026-09-28' }), nowOwn), 'posted');

section('My Content: whose move is it');

const ocard = (o) => ({ status: null, source: null, postedBy: null,
  filmBy: null, postDate: null, ...o });

// ── the two pre-camera columns share one status, so a drop into the
//    wrong one of them is refused rather than bounced ──
is('drop: Client Films into To film writes Planned',
   ownDropStatus(ocard({ source: 'Client Films' }), 'toFilm'), 'Planned');
is('drop: a flyer cannot go in To film',
   ownDropStatus(ocard({ source: 'Flyer / Graphic' }), 'toFilm'), null);
is('drop: a flyer into Planned writes Planned',
   ownDropStatus(ocard({ source: 'Flyer / Graphic' }), 'planned'), 'Planned');
is('drop: a sourceless card belongs to Planned alone',
   [ownDropStatus(ocard({}), 'planned'), ownDropStatus(ocard({}), 'toFilm')],
   ['Planned', null]);
is('drop: a card the client films is not allowed back into plain Planned',
   ownDropStatus(ocard({ source: 'Client Films' }), 'planned'), null);
is('drop: every later column maps to one status',
   ['filmed', 'editing', 'ready', 'posted'].map((st) => ownDropStatus(ocard({}), st)),
   ['Filmed', 'Editing', 'Approved', 'Posted']);
is('drop: no column writes Ready for Review; that is ours to say',
   OWN_STAGE_ORDER.map((st) => ownDropStatus(ocard({ source: 'Client Films' }), st)).includes('Ready for Review'), false);

// ── the client's own two moves ──
is('move: To film to Filmed is the client\u2019s',
   canDropOwn(ocard({ status: 'Planned', source: 'Client Films' }), 'filmed', 'client'), true);
is('move: and back out again, on a card they film',
   canDropOwn(ocard({ status: 'Filmed', source: 'Client Films' }), 'toFilm', 'client'), true);
is('move: but not back out of ours',
   canClientMove('Filmed', 'Planned', { source: 'Flyer / Graphic' }), false);
is('move: a cut waiting on them, approved',
   canDropOwn(ocard({ status: 'Ready for Review' }), 'ready', 'client'), true);
is('move: a cut waiting on them, handed back to us',
   canClientMove('Ready for Review', 'Editing'), true);
is('move: a client cannot reach In edit from anywhere else',
   canClientMove('Planned', 'Editing'), false);

// ── a row the client posts is theirs end to end ──
is('move: Posted By Client goes anywhere',
   ['filmed', 'editing', 'ready', 'posted'].map((st) =>
     canDropOwn(ocard({ status: 'Planned', postedBy: 'Client' }), st, 'client')),
   [true, true, true, true]);
is('move: the same card, posted by us, does not',
   canDropOwn(ocard({ status: 'Planned', postedBy: 'Blueprint' }), 'editing', 'client'), false);
is('move: Posted By Client still cannot break the Source rule',
   canDropOwn(ocard({ status: 'Planned', postedBy: 'Client', source: 'Client Films' }), 'planned', 'client'),
   false);

// ── admin moves anything the column can hold ──
is('move: admin reaches every real column',
   ['filmed', 'editing', 'ready', 'posted'].map((st) =>
     canDropOwn(ocard({ status: 'Planned', postedBy: 'Blueprint' }), st, 'admin')),
   [true, true, true, true]);
is('move: admin is still refused a column that would bounce',
   canDropOwn(ocard({ status: 'Planned', source: 'Client Films' }), 'planned', 'admin'), false);

// ── no cell of the board lets a client write one of ours ──
{
  const statuses = ['Idea', 'Planned', 'Filmed', 'Footage In', 'Editing',
    'Ready for Review', 'Approved', 'Scheduled', 'Posted', 'Skipped'];
  const sources = [null, 'Client Films', 'Show Media', 'Flyer / Graphic'];
  const stages = OWN_STAGE_ORDER;
  let wrong = [];
  for (const status of statuses) {
    for (const source of sources) {
      for (const stage of stages) {
        const ours = ocard({ status, source, postedBy: 'Blueprint' });
        if (!canDropOwn(ours, stage, 'client')) continue;
        const to = ownDropStatus(ours, stage);
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

section('My Content: the date on the face of a card');

is('card date: a film date the client owns',
   cardDate(ocard({ source: 'Client Films', filmBy: '2026-11-10', postDate: '2026-11-14' })),
   { label: 'Film by', date: '2026-11-10' });
is('card date: a flyer shows when it posts, never a film date',
   cardDate(ocard({ source: 'Flyer / Graphic', filmBy: '2026-11-10', postDate: '2026-11-14' })),
   { label: 'Posts', date: '2026-11-14' });
is('card date: show media the same',
   cardDate(ocard({ source: 'Show Media', filmBy: '2026-11-10', postDate: '2026-11-14' })),
   { label: 'Posts', date: '2026-11-14' });
is('card date: once it is shot, the film date stops being news',
   cardDate(ocard({ source: 'Client Films', status: 'Filmed',
                    filmBy: '2026-11-10', postDate: '2026-11-14' })),
   { label: 'Posts', date: '2026-11-14' });
is('card date: nothing dated says nothing', cardDate(ocard({})), null);
is('card date: no source and a film date is still not a film job',
   cardDate(ocard({ filmBy: '2026-11-10' })), null);

is('board: six columns, and none of them is about our work',
   OWN_STAGE_ORDER, ['planned', 'toFilm', 'filmed', 'editing', 'ready', 'posted']);
is('board: every column has a title, and To film reads like the rest',
   OWN_STAGE_ORDER.map((st) => OWN_STAGE_TITLE[st]),
   ['Planned', 'To film', 'Filmed', 'In edit', 'Ready to post', 'Posted']);

section('Content: two sides, and a row on exactly one');

{
  const row = (o) => ({ status: 'Planned', source: 'Client Films', postedBy: 'Client', campaign: [], ...o });
  is('side: a row the client posts, in no campaign, is their own', contentSide(row({})), 'own');
  is('side: a campaign row is campaign work', contentSide(row({ campaign: ['step-1'], postedBy: 'Blueprint' })), 'campaign');
  is('side: a row the client posts, linked to a campaign, is still campaign work',
     contentSide(row({ campaign: ['step-1'], postedBy: 'Client' })), 'campaign');
  is('side: one of ours with no campaign is NOT on the client’s side',
     contentSide(row({ postedBy: 'Blueprint' })), 'campaign');
  is('side: nor is a row nobody is named as posting',
     [contentSide(row({ postedBy: null })), contentSide({ campaign: [] })], ['campaign', 'campaign']);
  is('side: every row is on exactly one',
     [row({}), row({ campaign: ['x'] }), row({ postedBy: 'Blueprint' }), row({ postedBy: null })]
       .every((r) => ['own', 'campaign'].includes(contentSide(r))), true);

  // Ownership is what lets a client drag a card anywhere, and it is
  // one question: do they post it?
  is('owns: a row they post', clientOwns({ postedBy: 'Client' }), true);
  is('owns: a row they post inside a campaign too', clientOwns(whoOf(row({ campaign: ['x'] }))), true);
  is('owns: not one of ours, campaign or no campaign',
     [clientOwns(whoOf(row({ postedBy: 'Blueprint' }))),
      clientOwns(whoOf(row({ postedBy: 'Blueprint', campaign: ['x'] })))], [false, false]);
  is('owns: not a row with nobody named', [clientOwns({ postedBy: null }), clientOwns({})], [false, false]);
  is('who: a card is the two facts and nothing else',
     Object.keys(whoOf(row({ campaign: ['x'] }))).sort(), ['postedBy', 'source']);

  // On My Content a client moves any card to any status.
  is('own: every status to every status, on a row they post',
     CONTENT_STATUSES.every((from) => CONTENT_STATUSES.every((to) =>
       canClientMove(from, to, whoOf(row({}))))), true);
  is('own: one of ours with no campaign is ours all the same',
     canClientMove('Planned', 'Posted', { postedBy: 'Blueprint', source: 'Show Media' }), false);
  is('own: the client drags their card into every column it can hold',
     OWN_STAGE_ORDER.filter((st) => canDropOwn(row({}), st, 'client')),
     ['toFilm', 'filmed', 'editing', 'ready', 'posted']);
  is('own: the one it cannot hold is the other pre-camera column, for anyone',
     OWN_STAGE_ORDER.filter((st) => !canDropOwn(row({}), st, 'admin')), ['planned']);

  // The server asks the same question with the fact read off the page.
  const own = buildContentProperties({ status: 'Posted' },
    ctx('Planned', { postedBy: 'Client', source: 'Client Films' }));
  is('build: a client moves a row they post anywhere', own.properties.Status.select.name, 'Posted');
  is('build: and not one of ours, with no campaign to its name',
     buildContentProperties({ status: 'Posted' },
       ctx('Planned', { postedBy: 'Blueprint', source: 'Show Media' })).rejected, ['status']);
  is('build: with nobody named, the tighter answer',
     buildContentProperties({ status: 'Posted' }, ctx('Planned', { source: 'Show Media' })).rejected, ['status']);
  is('build: Media on one of ours is not theirs to set, campaign or none',
     buildContentProperties({ media: 'Carousel' }, ctx('Planned', { postedBy: 'Blueprint' })).rejected, ['media']);
  is('build: and on a row they post it is',
     buildContentProperties({ media: 'Carousel' },
       ctx('Planned', { postedBy: 'Client' })).properties.Media.select.name, 'Carousel');
}

section('Content: a piece made with "Add a piece" on the counter');

// What HQ sends from the month counter, built the way the create
// endpoint builds it, and then read back as the row Notion would hold.
{
  const sent = { title: 'Merch drop teaser', media: 'Graphic', postDate: '2026-11-24',
                 status: 'Planned', piece: true };
  const made = (role) => {
    const built = buildContentProperties(sent, { schema, allowedCampaigns: mine, currentStatus: null, role });
    const owner = newContentOwner(role, sent);
    const p = { ...built.properties, ...owner.properties };
    return {
      ours: owner.ours, rejected: built.rejected,
      item: {
        title: 'Merch drop teaser',
        status: p.Status.select.name,
        postedBy: p['Posted By'].select.name,
        source: p.Source?.select?.name ?? null,
        media: p.Media?.select?.name ?? null,
        postDate: p['Post Date'].date.start,
        campaign: (p.Campaign?.relation ?? []).map((r) => r.id),
      },
    };
  };
  const { item, ours, rejected } = made('admin');

  is('piece: one of us asking makes it ours', [ours, rejected], [true, []]);
  is('piece: Posted By Blueprint, no Source guessed, no campaign',
     [item.postedBy, item.source, item.campaign], ['Blueprint', null, []]);
  is('piece: it counts toward its month', countsToward(item), true);
  is('piece: it is on the campaign side, not My Content', contentSide(item), 'campaign');

  const M = { id: 'm-soon', title: 'Rooftop Remix', date: '2026-11-13', momentType: 'Release' };
  const lanes = campaignLanes([
    { status: 'Planned', postedBy: 'Blueprint', campaign: ['m-soon'] },
    { status: 'Idea', postedBy: 'Client', campaign: [] },
    item,
  ], (c) => (c.campaign.length ? M : null), '2026-11-16');
  is('piece: in "Other Blueprint pieces", which is the last lane',
     [lanes.length, lanes[1].loose !== null, lanes[1].items[0] === item, LOOSE_LANE_TITLE],
     [2, true, true, 'Other Blueprint pieces']);
  is('piece: it starts in Plan', stageOf(item), 'plan');

  // The client's hands on it: the cut, the film tick, nothing else.
  is('piece: the client does not own it', clientOwns(whoOf(item)), false);
  is('piece: no column on the board takes it from the client while it is in Plan',
     STAGE_ORDER.filter((st) => st !== 'plan' && canDrop(item, st, 'client')), []);
  is('piece: from no status may the client mark it posted',
     CONTENT_STATUSES.filter((from) => from !== 'Posted' && canClientMove(from, 'Posted', whoOf(item))), []);
  is('piece: waiting on their review, they approve or ask for changes',
     CONTENT_STATUSES.filter((to) => to !== 'Ready for Review'
       && canClientMove('Ready for Review', to, whoOf(item))), ['Editing', 'Approved']);
  is('piece: with no Source it is not theirs to film, so no tick',
     [isFilmJob(item), canClientMove('Planned', 'Filmed', whoOf(item))], [false, false]);
  is('piece: once we say they film it, the tick is theirs and still nothing more',
     CONTENT_STATUSES.filter((to) => to !== 'Planned'
       && canClientMove('Planned', to, whoOf({ ...item, source: 'Client Films' }))), ['Filmed']);
  is('piece: the server refuses a client moving it',
     buildContentProperties({ status: 'Posted' },
       ctx(item.status, { postedBy: item.postedBy, source: item.source, role: 'client' })).rejected, ['status']);
  is('piece: and refuses a client setting its Media',
     buildContentProperties({ media: 'Video' },
       ctx(item.status, { postedBy: item.postedBy, source: item.source, role: 'client' })).rejected, ['media']);
  is('piece: one of us moves it anywhere',
     buildContentProperties({ status: 'Posted' },
       ctx(item.status, { postedBy: item.postedBy, role: 'admin' })).properties.Status.select.name, 'Posted');

  // The same request from a client is an idea of their own.
  const theirs = made('client');
  is('piece: a client sending piece: true gets their own row instead',
     [theirs.ours, theirs.item.postedBy, theirs.item.source, contentSide(theirs.item)],
     [false, 'Client', 'Client Films', 'own']);
  is('piece: and that one they do own', clientOwns(whoOf(theirs.item)), true);
}

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

is('layer: a client content step is a post of theirs and a to-do',
   layers(cal('Client', 'Content')), 'postsTheirs|todos');
is('layer: a client admin step is only a to-do',
   layers(cal('Client', 'Admin')), 'todos');
// A step of ours that posts something has no pipeline row behind it,
// or the row would be drawn in its place. It is on the plan, and it is
// neither a counted piece nor an admin task.
is('layer: a content step of ours is on the plan and nothing else',
   layers(cal('Blueprint', 'Content')), 'postsPlan');
is('layer: it is not in the layer the month counter matches',
   stepLayers(cal('Blueprint', 'Content')).includes('postsOurs'), false);
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
   layers(film('Client', 'Content')), 'postsTheirs|todos');
is('layer: a clapperboard admin step of theirs is their film day',
   layers(film('Client', 'Admin')), 'films|todos');
is('layer: and it is not also a post',
   stepLayers(film('Client', 'Admin')).some((l) => l.startsWith('posts')), false);
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
is('layer: the portal’s layers, Posts split by who posts',
   PORTAL_LAYERS.join('|'), 'moments|postsOurs|postsTheirs|postsPlan|films|todos|blueprint');

// A pipeline row's layer is who posts it: the month counter's own test.
is('layer: a row we post is in Blueprint posts', cardPostLayer({ postedBy: 'Blueprint' }), 'postsOurs');
is('layer: a row the client posts is in theirs', cardPostLayer({ postedBy: 'Client' }), 'postsTheirs');
is('layer: a row nobody is named on is not counted as ours', cardPostLayer({ postedBy: null }), 'postsTheirs');
{
  // With only Blueprint posts on, the calendar is the counter's list.
  const rows = [
    { title: 'a', status: 'Planned', postDate: '2026-11-03', postedBy: 'Blueprint', media: 'Video' },
    { title: 'b', status: 'Posted', postDate: '2026-11-09', postedBy: 'Blueprint', media: 'Story' },
    { title: 'c', status: 'Skipped', postDate: '2026-11-10', postedBy: 'Blueprint', media: 'Video' },
    { title: 'd', status: 'Planned', postDate: '2026-11-12', postedBy: 'Client', media: 'Video' },
    { title: 'e', status: 'Planned', postDate: null, postedBy: 'Blueprint', media: 'Video' },
    { title: 'f', status: 'Planned', postDate: '2026-12-01', postedBy: 'Blueprint', media: 'Video' },
  ];
  const onCalendar = rows.filter((r) => cardOnCalendar(r) && r.postDate && r.postDate.startsWith('2026-11')
    && cardPostLayer(r) === 'postsOurs').map((r) => r.title);
  is('layer: Blueprint posts in a month is exactly what the counter lists',
     onCalendar, monthCount(rows, '2026-11').rows.map((r) => r.item.title));
}
is('layer: a browser that remembered Posts gets every part of it',
   migrateLayers(['moments', 'posts', 'todos']), ['moments', 'postsOurs', 'postsTheirs', 'postsPlan', 'todos']);
is('layer: and one that had it off keeps it off', migrateLayers(['moments', 'films']), ['moments', 'films']);
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
   HQ_LAYERS.join('|'), 'moments|postsOurs|postsTheirs|postsPlan|films|todos|blueprint');
is('layers: and the portal’s are a prefix of them, not a different list',
   HQ_LAYERS.slice(0, PORTAL_LAYERS.length).join('|'), PORTAL_LAYERS.join('|'));

section('Playbooks · saying an offset, and who does a step');

is('offset: before', offsetLabel(-21), '21 days before');
is('offset: one day', [offsetLabel(-1), offsetLabel(1)], ['1 day before', '1 day after']);
is('offset: the day itself', offsetLabel(0), 'On the day');
is('offset: none', offsetLabel(null), 'No day set');
is('who: a client flow is You', stepWho({ flow: 'Client film session', owner: 'Blueprint' }), 'You');
is('who: films-then-we-edit is ours', stepWho({ flow: 'Client films → Blueprint edits + posts', owner: 'Client' }), 'Blueprint');
is('who: with no flow, the owner says', [stepWho({ flow: null, owner: 'Client' }), stepWho({ flow: null, owner: 'Blueprint' })], ['You', 'Blueprint']);

section('Playbooks · a playbook as one client gets it');

const SEAN_ID = '3f7c8be8-be72-8123-a420-fb9aef6bc0e9';
const mstep = (id, title, offset, o = {}) => ({ id, title, playbook: 'Release Sprint', phase: 'Sprint · Setup',
  offset, flow: 'Blueprint task', owner: 'Blueprint', type: 'Admin', notes: null, where: null, why: null,
  momentId: 'pb-moment', ...o });
const MASTERS = [
  mstep('m-upload', 'Upload to the distributor', -28),
  mstep('m-film', '🎥 Film: studio snippet', -27, { flow: 'Client film session', owner: 'Client' }),
  mstep('m-announce', 'Announce the single', -14, { phase: 'Sprint · Announce', flow: 'Blueprint makes + posts', type: 'Content' }),
  mstep('m-drop', 'Drop day post', 0, { phase: 'Sprint · Follow-Through', flow: 'Blueprint makes + posts', type: 'Content' }),
  mstep('m-other', 'Remix: clear the sample', -21, { playbook: 'Remix Drop', phase: 'Remix · Setup' }),
];
const ov = (id, o) => ({ id, change: id, clientId: SEAN_ID, playbook: 'Release Sprint', masterStepId: null,
  changeType: null, newOffset: null, newFlow: null, newTitle: null, reason: null,
  status: 'Approved', requestedBy: 'Blueprint', created: `2026-11-0${id.length % 9 + 1}T00:00:00Z`, ...o });
const eff = (overrides, client = SEAN_ID, pb = 'Release Sprint') => effectivePlaybook(MASTERS, overrides, pb, client);
const find = (list, key) => list.find((s2) => s2.key === key);

is('effective: with nothing approved it is the master, step for step',
   eff([]).map((s2) => [s2.title, s2.offset, s2.skipped, s2.added]),
   [['Upload to the distributor', -28, false, false], ['🎥 Film: studio snippet', -27, false, false],
    ['Announce the single', -14, false, false], ['Drop day post', 0, false, false]]);
is('effective: only this playbook’s steps', eff([]).some((s2) => s2.playbook !== 'Release Sprint'), false);
is('effective: with no client, overrides are not applied',
   find(effectivePlaybook(MASTERS, [ov('a', { changeType: 'Skip', masterStepId: 'm-upload' })], 'Release Sprint', null), 'm-upload').skipped, false);

{
  const shifted = eff([ov('shift', { changeType: 'Shift timing', masterStepId: 'm-upload', newOffset: -18 })]);
  is('shift: the step moves', find(shifted, 'm-upload').offset, -18);
  is('shift: and remembers where the master had it', find(shifted, 'm-upload').was, { offset: -28 });
  is('shift: the order follows the new day', shifted.map((s2) => s2.key).slice(0, 2), ['m-film', 'm-upload']);

  const re = eff([ov('re', { changeType: 'Reassign', masterStepId: 'm-film', newFlow: 'Blueprint task' })]);
  is('reassign: the Flow changes and the Owner follows it',
     [find(re, 'm-film').flow, find(re, 'm-film').owner], ['Blueprint task', 'Blueprint']);
  is('reassign: the master’s flow is kept for the hover', find(re, 'm-film').was.flow, 'Client film session');

  const sk = eff([ov('sk', { changeType: 'Skip', masterStepId: 'm-announce' })]);
  is('skip: the step is marked, not removed, so the timeline can show it', find(sk, 'm-announce').skipped, true);

  const rw = eff([ov('rw', { changeType: 'Reword', masterStepId: 'm-drop', newTitle: '  Drop day: post and pin  ' })]);
  is('reword: the new wording, trimmed', [find(rw, 'm-drop').title, find(rw, 'm-drop').was.title],
     ['Drop day: post and pin', 'Drop day post']);

  const ad = eff([ov('ad', { changeType: 'Add step', newTitle: 'Clear the remix', newOffset: -21, newFlow: 'Blueprint task', reason: 'flagged before' })]);
  const added = find(ad, 'add:ad');
  is('add: a step that exists only for this client',
     [added.added, added.masterId, added.offset, added.flow, added.owner, added.type],
     [true, null, -21, 'Blueprint task', 'Blueprint', 'Admin']);
  is('add: it joins the phase of the step nearest its day', added.phase, 'Sprint · Setup');
  is('add: a step that posts is content',
     find(eff([ov('ad2', { changeType: 'Add step', newTitle: 'Teaser', newOffset: -7, newFlow: 'Blueprint makes + posts' })]), 'add:ad2').type, 'Content');
  is('add: it is not added to another playbook', eff([ov('ad', { changeType: 'Add step', newTitle: 'x', newOffset: -1, newFlow: 'Blueprint task' })], SEAN_ID, 'Remix Drop').some((s2) => s2.added), false);
}

// Only Approved applies. This is the rule the whole feature hangs on.
for (const status of ['Draft', 'Requested', 'Declined', null]) {
  is(`effective: a ${status ?? 'statusless'} override changes nothing`,
     eff([ov('x', { status, changeType: 'Shift timing', masterStepId: 'm-upload', newOffset: -18 }),
          ov('y', { status, changeType: 'Add step', newTitle: 'Extra', newOffset: -3, newFlow: 'Blueprint task' })])
       .map((s2) => [s2.key, s2.offset, s2.overrideIds.length]),
     eff([]).map((s2) => [s2.key, s2.offset, 0]));
}
is('effective: another client’s approved override changes nothing',
   find(eff([ov('z', { clientId: 'someone-else', changeType: 'Skip', masterStepId: 'm-upload' })]), 'm-upload').skipped, false);
is('effective: an approved override that says nothing changes nothing',
   eff([ov('v', { changeType: null })]).every((s2) => !s2.overrideIds.length), true);
is('effective: two on one step compose, oldest first',
   find(eff([ov('bb', { changeType: 'Shift timing', masterStepId: 'm-upload', newOffset: -10, created: '2026-11-02T00:00:00Z' }),
             ov('aa', { changeType: 'Shift timing', masterStepId: 'm-upload', newOffset: -20, created: '2026-11-01T00:00:00Z' })]), 'm-upload'),
   { ...find(eff([]), 'm-upload'), offset: -10, was: { offset: -28 }, overrideIds: ['aa', 'bb'] });

section('Playbooks · when an override can be approved');

is('problem: no change type', overrideProblem(ov('p', {})), 'Say what kind of change it is first.');
is('problem: a shift with no offset', overrideProblem(ov('p', { changeType: 'Shift timing', masterStepId: 'm-upload' })), 'Say the new offset in days.');
is('problem: a shift with no step', overrideProblem(ov('p', { changeType: 'Shift timing', newOffset: -3 })), 'Pick the step it changes.');
is('problem: a reassign to something that is not a flow', overrideProblem(ov('p', { changeType: 'Reassign', masterStepId: 'm-film', newFlow: 'Whoever' })), 'Pick the new flow.');
is('problem: an add with no flow', overrideProblem(ov('p', { changeType: 'Add step', newTitle: 'x', newOffset: -1 })), 'Pick who does it.');
is('problem: no client', overrideProblem(ov('p', { clientId: null, changeType: 'Skip', masterStepId: 'm-film' })), 'It is not linked to a client.');
is('problem: a zero offset is an offset', overrideProblem(ov('p', { changeType: 'Shift timing', masterStepId: 'm-upload', newOffset: 0 })), null);
is('problem: each kind, complete, has none',
   [ov('p', { changeType: 'Shift timing', masterStepId: 'm-upload', newOffset: -18 }),
    ov('p', { changeType: 'Reassign', masterStepId: 'm-film', newFlow: 'Blueprint task' }),
    ov('p', { changeType: 'Skip', masterStepId: 'm-film' }),
    ov('p', { changeType: 'Reword', masterStepId: 'm-film', newTitle: 'New words' }),
    ov('p', { changeType: 'Add step', newTitle: 'x', newOffset: -1, newFlow: 'Client task' })].map(overrideProblem),
   [null, null, null, null, null]);
is('applied: Approved and complete', isApplied(ov('p', { changeType: 'Skip', masterStepId: 'm-film' })), true);
is('applied: Approved but incomplete is not', isApplied(ov('p', { changeType: 'Shift timing', masterStepId: 'm-film' })), false);
is('vocabulary: the five kinds and four statuses Notion has',
   [CHANGE_TYPES.length, OVERRIDE_STATUSES.join('|')], [5, 'Draft|Requested|Approved|Declined']);

section('Playbooks · phases and names');

is('phases: in the order they happen', byPhase(eff([])).map((g) => `${g.phase}:${g.steps.length}`),
   ['Sprint · Setup:2', 'Sprint · Announce:1', 'Sprint · Follow-Through:1']);
is('phases: a step with none still has somewhere to be', byPhase([{ phase: null, offset: 0 }])[0].phase, 'No phase');
is('nearest phase: the step it follows', nearestPhase(MASTERS.filter((m) => m.playbook === 'Release Sprint'), -13), 'Sprint · Announce');
is('names: campaign order, then anything new alphabetically',
   playbookNames([{ playbook: 'Zeta' }, { playbook: 'Post-Show' }, { playbook: 'Release Rollout' }, { playbook: 'Alpha' }, { playbook: 'Post-Show' }]),
   ['Release Rollout', 'Post-Show', 'Alpha', 'Zeta']);

section('Playbooks · applying one to a moment');

{
  const plain = planApply(eff([]), '2026-12-04');
  is('apply: every step, dated from the moment',
     plain.map((p2) => [p2.title, p2.date]),
     [['Upload to the distributor', '2026-11-06'], ['🎥 Film: studio snippet', '2026-11-07'],
      ['Announce the single', '2026-11-20'], ['Drop day post', '2026-12-04']]);
  const withAll = planApply(eff([
    ov('shift', { changeType: 'Shift timing', masterStepId: 'm-upload', newOffset: -18 }),
    ov('re', { changeType: 'Reassign', masterStepId: 'm-film', newFlow: 'Blueprint task' }),
    ov('sk', { changeType: 'Skip', masterStepId: 'm-announce' }),
    ov('rw', { changeType: 'Reword', masterStepId: 'm-drop', newTitle: 'Drop day: post and pin' }),
    ov('ad', { changeType: 'Add step', newTitle: 'Clear the remix', newOffset: -21, newFlow: 'Blueprint task' }),
    ov('draft', { status: 'Draft', changeType: 'Skip', masterStepId: 'm-drop' }),
  ]), '2026-12-04');
  const by = (t) => withAll.find((p2) => p2.title === t);
  is('apply: a shifted step lands on its new day', [by('Upload to the distributor').offset, by('Upload to the distributor').date], [-18, '2026-11-16']);
  is('apply: a reassigned step has its new Flow and Owner', [by('🎥 Film: studio snippet').flow, by('🎥 Film: studio snippet').owner], ['Blueprint task', 'Blueprint']);
  is('apply: a skipped step is not created', by('Announce the single'), undefined);
  is('apply: a reworded step is created under its new title', !!by('Drop day: post and pin') && !by('Drop day post'), true);
  is('apply: an added step is created', [by('Clear the remix').date, by('Clear the remix').owner], ['2026-11-13', 'Blueprint']);
  is('apply: a Draft skip did not remove anything', withAll.length, 4);
  is('apply: a step already on the moment is not doubled',
     planApply(eff([]), '2026-12-04', ['drop day post ', 'Something else']).map((p2) => p2.title).includes('Drop day post'), false);
  is('apply: a moment with no date gets undated steps', planApply(eff([]), null).every((p2) => p2.date === null), true);
  is('days: across a month and a year', [addDaysIso('2026-12-04', -18), addDaysIso('2026-12-25', 10)], ['2026-11-16', '2027-01-04']);
}

section('Playbooks · applying an override to campaigns already running');

{
  const moments = [
    { id: 'mo-past', title: 'Rooftop Remix', date: '2026-11-01' },
    { id: 'mo-soon', title: 'IDHHW', date: '2026-12-04' },
    { id: 'mo-later', title: 'Every Season', date: '2027-01-08' },
    { id: 'mo-show', title: 'Christmas Show', date: '2026-12-13' },
  ];
  const cstep = (id, momentId, title, offset, o = {}) => ({ id, title, playbook: 'Release Sprint',
    phase: 'Sprint · Setup', offset, status: 'Not Started', momentId, ...o });
  const steps = [
    cstep('s1', 'mo-past', 'Upload to the distributor', -28),
    cstep('s2', 'mo-soon', 'Upload to the distributor', -28),
    cstep('s3', 'mo-later', 'Upload to the distributor', -28, { status: 'Done' }),
    cstep('s4', 'mo-later', 'Get the master to the distributor', -28),            // reworded by hand
    cstep('s5', 'mo-soon', '🎥 Film: studio snippet', -27, { status: 'Skipped' }),
    cstep('s6', 'mo-show', 'Lock show details', -35, { playbook: 'Pre-Show', phase: 'Pre-Show · Prep' }),
  ];
  const plan = (o) => planOverrideOnOpen(o, MASTERS, steps, moments, '2026-11-13');
  const shift = plan(ov('shift', { changeType: 'Shift timing', masterStepId: 'm-upload', newOffset: -18 }));
  is('open: only open steps on moments still ahead', shift.map((w) => w.stepId), ['s2', 's4']);
  is('open: the new offset and the date it implies', shift[0].set, { offset: -18, date: '2026-11-16' });
  is('open: a copy reworded by hand is still found, by where it sits', shift[1].stepTitle, 'Get the master to the distributor');
  is('open: a past moment is left alone', shift.some((w) => w.momentId === 'mo-past'), false);
  is('open: a finished step is left alone', shift.some((w) => w.stepId === 's3'), false);
  is('open: a skipped step is left alone',
     plan(ov('re', { changeType: 'Reassign', masterStepId: 'm-film', newFlow: 'Blueprint task' })), []);
  is('open: skip writes Skipped',
     plan(ov('sk', { changeType: 'Skip', masterStepId: 'm-upload' })).map((w) => w.set), [{ status: 'Skipped' }, { status: 'Skipped' }]);
  is('open: reword does not rewrite a step that already says it',
     plan(ov('rw', { changeType: 'Reword', masterStepId: 'm-upload', newTitle: 'Get the master to the distributor' })).map((w) => w.stepId), ['s2']);
  const add = plan(ov('ad', { changeType: 'Add step', newTitle: 'Clear the remix', newOffset: -21, newFlow: 'Blueprint task' }));
  is('open: an added step goes on each upcoming campaign running that playbook',
     add.map((w) => [w.kind, w.momentTitle, w.step.date]), [['create', 'IDHHW', '2026-11-13'], ['create', 'Every Season', '2026-12-18']]);
  is('open: and not on a campaign running a different one', add.some((w) => w.momentId === 'mo-show'), false);
  is('open: nor twice',
     planOverrideOnOpen(ov('ad', { changeType: 'Add step', newTitle: 'Clear the remix', newOffset: -21, newFlow: 'Blueprint task' }),
       MASTERS, [...steps, cstep('s9', 'mo-soon', 'clear the remix', -21)], moments, '2026-11-13').map((w) => w.momentTitle), ['Every Season']);
  for (const status of ['Draft', 'Requested', 'Declined']) {
    is(`open: a ${status} override writes nothing`,
       plan(ov('n', { status, changeType: 'Skip', masterStepId: 'm-upload' })), []);
  }
  is('match: the same title', stepFromMaster(steps[1], MASTERS[0], MASTERS.filter((m) => m.playbook === 'Release Sprint')), true);
  is('match: not across playbooks', stepFromMaster({ ...steps[1], playbook: 'Remix Drop' }, MASTERS[0], MASTERS), false);
  is('match: a step that is another master by title is not this one',
     stepFromMaster(cstep('q', 'mo-soon', '🎥 Film: studio snippet', -28), MASTERS[0], MASTERS.filter((m) => m.playbook === 'Release Sprint')), false);
  is('match: a shared slot identifies nobody',
     stepFromMaster(cstep('q', 'mo-soon', 'Something reworded', -28), MASTERS[0],
       [...MASTERS.filter((m) => m.playbook === 'Release Sprint'), mstep('m-twin', 'Twin', -28)]), false);
}

section('Playbooks · what a client is sent');

{
  const withNotes = MASTERS.map((m) => ({ ...m, notes: 'OURS: do not show', where: 'IG', why: 'Because it works' }));
  const sent = clientPlaybooks(withNotes, [
    ov('sk', { changeType: 'Skip', masterStepId: 'm-announce' }),
    ov('shift', { changeType: 'Shift timing', masterStepId: 'm-upload', newOffset: -18 }),
    ov('ad', { changeType: 'Add step', newTitle: 'Clear the remix', newOffset: -21, newFlow: 'Blueprint task', reason: 'internal reason' }),
    ov('draft', { status: 'Draft', changeType: 'Reword', masterStepId: 'm-drop', newTitle: 'A DRAFT TITLE' }),
  ], SEAN_ID);
  const sprint = sent.find((p2) => p2.name === 'Release Sprint');
  const flat = sprint.phases.flatMap((g) => g.steps);
  is('client: every playbook that has steps', sent.map((p2) => p2.name), ['Release Sprint', 'Remix Drop']);
  is('client: a step carries these keys and no others',
     Object.keys(flat[0]).sort(), ['changed', 'key', 'offset', 'title', 'where', 'who', 'why']);
  is('client: our notes are nowhere in it', JSON.stringify(sent).includes('OURS'), false);
  is('client: nor the reason we gave for an added step', JSON.stringify(sent).includes('internal reason'), false);
  is('client: a skipped step is simply not there', flat.some((x) => x.title === 'Announce the single'), false);
  is('client: a shifted step is on its new day and marked',
     [flat.find((x) => x.key === 'm-upload').offset, flat.find((x) => x.key === 'm-upload').changed], [-18, true]);
  is('client: an added step is there, marked, with nothing to request against',
     [flat.find((x) => x.title === 'Clear the remix').changed, flat.find((x) => x.title === 'Clear the remix').key], [true, '']);
  is('client: a Draft of ours changes nothing they see', JSON.stringify(sent).includes('A DRAFT TITLE'), false);
  is('client: every step says You or Blueprint', flat.every((x) => x.who === 'You' || x.who === 'Blueprint'), true);
  is('client: a hidden master is left out',
     clientPlaybooks(MASTERS.map((m) => (m.id === 'm-film' ? { ...m, hideFromClient: true } : m)), [], SEAN_ID)
       .flatMap((p2) => p2.phases.flatMap((g) => g.steps)).some((x) => x.key === 'm-film'), false);

  const reqs = clientRequests(MASTERS, [
    ov('theirs', { requestedBy: 'Client', status: 'Requested', masterStepId: 'm-upload', reason: 'too early', created: '2026-11-10T00:00:00Z' }),
    ov('theirs2', { requestedBy: 'Client', status: 'Declined', masterStepId: 'm-drop', created: '2026-11-12T00:00:00Z' }),
    ov('ours', { requestedBy: 'Blueprint', status: 'Draft', masterStepId: 'm-film', reason: 'EXAMPLE' }),
    ov('other', { requestedBy: 'Client', clientId: 'someone-else', status: 'Requested', masterStepId: 'm-film' }),
  ], SEAN_ID);
  is('requests: theirs only, newest first', reqs.map((r) => [r.id, r.status]), [['theirs2', 'Declined'], ['theirs', 'Requested']]);
  is('requests: the step by name', reqs[1].step, 'Upload to the distributor');
  is('requests: nothing we drafted for them', JSON.stringify(reqs).includes('EXAMPLE'), false);
}

section('Playbooks · the write whitelists');

{
  const vocab = vocabularyOf(MASTERS);
  is('vocabulary: phases and playbooks some master already uses',
     [vocab.phases.includes('Sprint · Setup'), vocab.playbooks.slice().sort()], [true, ['Release Sprint', 'Remix Drop']]);
  is('offset: a whole number of days within a year', [cleanOffset(-28), cleanOffset(0), cleanOffset(365)], [-28, 0, 365]);
  is('offset: nothing else', [cleanOffset(-28.5), cleanOffset('-28'), cleanOffset(366), cleanOffset(null), cleanOffset(NaN)],
     [undefined, undefined, undefined, undefined, undefined]);

  const edit = buildMasterProperties({ title: '  New title ', offset: -30, flow: 'Client film session', phase: 'Sprint · Setup', notes: '' }, vocab);
  is('master: each field lands on its own property',
     Object.keys(edit.properties).sort(), ['Flow', 'Item', 'Notes', 'Offset (days)', 'Owner', 'Phase']);
  is('master: Owner follows Flow, and is never the request’s to say',
     [edit.properties.Owner.select.name,
      buildMasterProperties({ flow: 'Blueprint task', owner: 'Client', Owner: 'Client' }, vocab).properties.Owner.select.name],
     ['Client', 'Blueprint']);
  is('master: an empty note clears it', edit.properties.Notes.rich_text, []);
  is('master: a phase Notion does not have is refused, not created',
     buildMasterProperties({ phase: 'A Phase I Made Up' }, vocab).rejected, ['phase']);
  is('master: a flow that is not a flow is refused', buildMasterProperties({ flow: 'Whoever' }, vocab).rejected, ['flow']);
  is('master: a title cannot be emptied', buildMasterProperties({ title: '   ' }, vocab).rejected, ['title']);
  is('master: the things that make a row a master cannot be sent',
     Object.keys(buildMasterProperties({ 'Is Playbook': false, Kind: 'Moment', Client: ['x'], isPlaybook: false, kind: 'Moment' }, vocab).properties), []);

  const fresh = buildNewMaster({ playbook: 'Release Sprint', title: 'Teaser', offset: -7, flow: 'Blueprint makes + posts', phase: 'Sprint · Announce' }, vocab, MASTERS);
  is('new master: it is a master step, in that playbook, hung off its moment',
     [fresh.properties['Is Playbook'].checkbox, fresh.properties.Kind.select.name, fresh.properties.Playbook.select.name,
      fresh.properties.Moment.relation[0].id, fresh.properties.Type.select.name, fresh.rejected],
     [true, 'Step', 'Release Sprint', 'pb-moment', 'Content', []]);
  is('new master: a playbook that does not exist is refused',
     buildNewMaster({ playbook: 'Made Up', title: 'x', offset: 0, flow: 'Blueprint task', phase: 'Sprint · Setup' }, vocab, MASTERS).rejected, ['playbook']);
  is('new master: it needs every part of a step',
     buildNewMaster({ playbook: 'Release Sprint', title: 'x' }, vocab, MASTERS).rejected.sort(),
     ['missing:Flow', 'missing:Offset (days)', 'missing:Phase']);

  const octx = (role) => ({ masterIds: MASTERS.map((m) => m.id), playbooks: vocab.playbooks, role });
  const asClient = buildOverrideProperties({ reason: 'too early', status: 'Approved', changeType: 'Skip',
    newOffset: -1, newFlow: 'Blueprint task', newTitle: 'x', masterStepId: 'm-upload', change: 'x', playbook: 'Remix Drop' }, octx('client'));
  is('override: a client writes a reason and nothing else', Object.keys(asClient.properties), ['Reason']);
  is('override: and everything else they sent is named as refused',
     asClient.rejected.sort(), ['change', 'changeType', 'masterStepId', 'newFlow', 'newOffset', 'newTitle', 'playbook', 'status']);
  const asAdmin = buildOverrideProperties({ change: 'Shift it', changeType: 'Shift timing', masterStepId: 'm-upload',
    newOffset: -18, status: 'Approved', reason: 'because' }, octx('admin'));
  is('override: an admin sets the change',
     [asAdmin.properties['Change Type'].select.name, asAdmin.properties['New Offset (days)'].number,
      asAdmin.properties['Master Step'].relation[0].id, asAdmin.properties.Status.select.name, asAdmin.rejected],
     ['Shift timing', -18, 'm-upload', 'Approved', []]);
  is('override: a step that is not a master cannot be linked',
     buildOverrideProperties({ masterStepId: 'a-clients-own-step' }, octx('admin')).rejected, ['masterStepId']);
  is('override: a kind or a status Notion does not have is refused',
     buildOverrideProperties({ changeType: 'Delete everything', status: 'Live' }, octx('admin')).rejected, ['changeType', 'status']);
  is('override: who it is for and who asked are never the request’s to say',
     Object.keys(buildOverrideProperties({ Client: ['x'], clientId: 'x', requestedBy: 'Blueprint', 'Requested By': 'Blueprint' }, octx('admin')).properties), []);

  const made = stepProperties({ title: 'Drop day post', playbook: 'Release Sprint', phase: 'Sprint · Follow-Through',
    offset: 0, date: '2026-12-04', flow: 'Blueprint makes + posts', owner: 'Blueprint', type: 'Content',
    notes: 'n', where: 'IG', why: 'y' }, 'client-page', 'moment-page');
  is('created step: it is a client’s step on that moment, not a master',
     [made['Is Playbook'].checkbox, made.Kind.select.name, made.Client.relation[0].id, made.Moment.relation[0].id,
      made.Status.select.name, made.Date.date.start, made['Offset (days)'].number, made['Last Edited By'].select.name],
     [false, 'Step', 'client-page', 'moment-page', 'Not Started', '2026-12-04', 0, 'Blueprint']);
  is('created step: a flow that is not a flow is left empty rather than created',
     stepProperties({ title: 'x', playbook: 'Release Sprint', phase: null, offset: 0, date: null, flow: 'Made up',
       owner: 'Nobody', type: 'Other', notes: null, where: null, why: null }, 'c', 'm').Flow.select, null);

  const page = { id: 'p1', created_time: '2026-11-13T00:00:00Z', properties: {
    'Is Playbook': { type: 'checkbox', checkbox: true }, Kind: { type: 'select', select: { name: 'Step' } },
    Playbook: { type: 'select', select: { name: 'Pre-Show' } }, Item: { type: 'title', title: [{ plain_text: ' Lock it ' }] },
    'Offset (days)': { type: 'number', number: -35 } } };
  is('read: a master row', [shapeMaster(page).title, shapeMaster(page).offset, shapeMaster(page).playbook], ['Lock it', -35, 'Pre-Show']);
  is('read: a client’s step is not a master',
     shapeMaster({ ...page, properties: { ...page.properties, 'Is Playbook': { type: 'checkbox', checkbox: false } } }), null);
  is('read: a master moment is not a master step',
     shapeMaster({ ...page, properties: { ...page.properties, Kind: { type: 'select', select: { name: 'Moment' } } } }), null);
  is('read: an override row with nothing set', [shapeOverride({ id: 'o1', properties: {} }).status, shapeOverride({ id: 'o1', properties: {} }).newOffset], [null, null]);
}


/* ══ Pieces: the Content Pipeline rows a campaign step owes ══════ */

section('Pieces · Priority, Default Media and Pieces are carried');

// Notion properties as the API returns them: every one says its type.
const NP = {
  title: (t) => ({ type: 'title', title: [{ plain_text: t }] }),
  sel: (name) => ({ type: 'select', select: name ? { name } : null }),
  num: (n) => ({ type: 'number', number: n }),
  check: (on) => ({ type: 'checkbox', checkbox: on }),
  date: (start) => ({ type: 'date', date: start ? { start } : null }),
  rel: (...ids) => ({ type: 'relation', relation: ids.map((id) => ({ id })) }),
};

{
  const page = (props) => ({ id: 'pg', properties: {
    'Is Playbook': NP.check(true), Kind: NP.sel('Step'), Playbook: NP.sel('Pre-Show'),
    Item: NP.title('Announce: flyer, date, ticket link'), ...props } });
  const read = shapeMaster(page({ Priority: NP.sel('Core'), 'Default Media': NP.sel('Graphic'), Pieces: NP.num(3) }));
  is('master: the three are read off the row', [read.priority, read.defaultMedia, read.pieces], ['Core', 'Graphic', 3]);
  const bare = shapeMaster(page({}));
  is('master: a row without them reads as nothing', [bare.priority, bare.defaultMedia, bare.pieces], [null, null, null]);

  const masters = [
    mstep('m-a', 'Announce: flyer, date, ticket link', -21, { playbook: 'Pre-Show', flow: 'Blueprint makes + posts', priority: 'Core', defaultMedia: 'Graphic', pieces: 3 }),
    mstep('m-b', 'Lock show details', -28, { playbook: 'Pre-Show', flow: 'Client task' }),
  ];
  const effective = effectivePlaybook(masters, [
    ov('late', { playbook: 'Pre-Show', changeType: 'Shift timing', masterStepId: 'm-a', newOffset: -14 }),
    ov('add', { playbook: 'Pre-Show', changeType: 'Add step', newTitle: 'Extra reel', newOffset: -3, newFlow: 'Blueprint makes + posts' }),
  ], 'Pre-Show', SEAN_ID);
  const a = effective.find((e) => e.masterId === 'm-a');
  is('effective: an override leaves the three alone', [a.offset, a.priority, a.defaultMedia, a.pieces], [-14, 'Core', 'Graphic', 3]);
  is('effective: a step added by an override has none', effective.find((e) => e.added).priority, null);
  const planned = planApply(effective, '2026-12-13');
  const pa = planned.find((s2) => s2.title.startsWith('Announce'));
  is('apply: the plan carries them to the new step', [pa.priority, pa.defaultMedia, pa.pieces], ['Core', 'Graphic', 3]);

  const props = stepProperties(pa, 'client-1', 'moment-1');
  is('step: a deliverable step is written with all three',
     [props.Priority.select.name, props['Default Media'].select.name, props.Pieces.number], ['Core', 'Graphic', 3]);
  const task = stepProperties(planned.find((s2) => s2.title === 'Lock show details'), 'client-1', 'moment-1');
  is('step: a step that delivers nothing is written with none',
     ['Priority', 'Default Media', 'Pieces'].filter((k) => k in task), []);
  is('step: a step on a moment we are holding back is held back too',
     [stepProperties(pa, 'c', 'm', { hidden: true })['Hide from Client'].checkbox, 'Hide from Client' in props], [true, false]);
  is('step: a value Notion has no option for is not sent',
     stepProperties({ ...pa, priority: 'Vital', defaultMedia: 'Hologram', pieces: 30 }, 'c', 'm').Priority.select, null);

  // The brief: on the master, copied to the step, never trimmed away.
  const briefed = shapeMaster(page({ Brief: { type: 'rich_text', rich_text: [{ plain_text: 'Open on the crowd. End on the flyer.' }] } }));
  is('brief: read off the master', briefed.brief, 'Open on the crowd. End on the flyer.');
  const withBrief = planApply(effectivePlaybook([{ ...masters[0], brief: 'Open on the crowd.' }, masters[1]], [], 'Pre-Show', SEAN_ID), '2026-12-13');
  is('brief: applying a playbook copies it onto the step',
     stepProperties(withBrief.find((s2) => s2.title.startsWith('Announce')), 'c', 'm').Brief.rich_text[0].text.content, 'Open on the crowd.');
  is('brief: a step whose master has none is written with none',
     stepProperties(withBrief.find((s2) => s2.title === 'Lock show details'), 'c', 'm').Brief.rich_text, []);
  is('brief: editable on a master, and clearable',
     [buildMasterProperties({ brief: ' New brief ' }, vocabularyOf(MASTERS)).properties.Brief.rich_text[0].text.content,
      buildMasterProperties({ brief: null }, vocabularyOf(MASTERS)).properties.Brief.rich_text,
      buildMasterProperties({ brief: 7 }, vocabularyOf(MASTERS)).rejected], ['New brief', [], ['brief']]);
  is('brief: it is on the list of fields a client is sent, and Notes still is not',
     [CALENDAR_FIELDS.includes('Brief'), CALENDAR_FIELDS[18], CALENDAR_NEVER_SEND.includes('Notes')], [true, 'Brief', true]);

  const vocab = vocabularyOf(MASTERS);
  const edit = buildMasterProperties({ priority: 'Filler', defaultMedia: 'Story', pieces: 2 }, vocab);
  is('master edit: each lands on its own property',
     [edit.properties.Priority.select.name, edit.properties['Default Media'].select.name, edit.properties.Pieces.number, edit.rejected],
     ['Filler', 'Story', 2, []]);
  const clear = buildMasterProperties({ priority: null, defaultMedia: null, pieces: null }, vocab);
  is('master edit: null clears each', [clear.properties.Priority.select, clear.properties['Default Media'].select, clear.properties.Pieces.number], [null, null, null]);
  is('master edit: what Notion has no name for is refused, not created',
     buildMasterProperties({ priority: 'Vital', defaultMedia: 'Hologram', pieces: 0 }, vocab).rejected, ['priority', 'defaultMedia', 'pieces']);
  is('master edit: Pieces is a small whole number',
     [1.5, 7, -1, '3'].map((n) => buildMasterProperties({ pieces: n }, vocab).rejected.length), [1, 1, 1, 1]);
  is('vocabulary: the three priorities and the five media',
     [['Core', 'Standard', 'Filler'].every(isPriority), isPriority('Vital'), CONTENT_MEDIA.every(isPieceMedia), isPieceMedia('Hologram')],
     [true, false, true, false]);
}

section('Pieces · what a step’s rows say');

const pstep = (id, title, date, o = {}) => ({ id, title, playbook: 'Pre-Show', phase: 'Pre-Show · Build',
  flow: 'Blueprint makes + posts', status: 'Not Started', date, momentId: 'mo-show',
  priority: 'Standard', defaultMedia: 'Video', pieces: null, ...o });
const PC_SHOW = { id: 'mo-show', title: 'Christmas Show', date: '2026-12-13', momentType: 'Show' };
const PC_REMIX = { id: 'mo-remix', title: 'Christmas Remix', date: '2026-12-11', momentType: 'Release' };

{
  is('deliverable: the two flows that post something of ours',
     [isDeliverableFlow('Blueprint makes + posts'), isDeliverableFlow(CLIENT_FILMS_FLOW)], [true, true]);
  is('deliverable: nothing else is',
     ['Client makes + posts', 'Blueprint task', 'Client task', FILM_SESSION_FLOW, null, ''].map(isDeliverableFlow),
     [false, false, false, false, false, false]);
  is('count: blank is one', [pieceCount(null), pieceCount(undefined), pieceCount(1), pieceCount(3)], [1, 1, 1, 3]);
  is('count: never fewer than one or more than the cap', [pieceCount(0), pieceCount(-2), pieceCount(40)], [1, 1, MAX_PIECES]);

  is('title: the moment, then the step', pieceTitle('Christmas Show', 'Short-form: catch me in Austin'), 'Christmas Show Short-form: catch me in Austin');
  is('title: a step on no moment is just itself', pieceTitle(null, 'Loose step'), 'Loose step');
  const long = pieceTitle('M', 'x'.repeat(400), ' · IG story');
  is('title: a long one keeps its suffix whole', [long.length, long.endsWith(' · IG story')], [200, true]);

  is('source: the client films it', pieceSource(CLIENT_FILMS_FLOW, 'Video'), 'Client Films');
  is('source: the Flow wins over the media', pieceSource(CLIENT_FILMS_FLOW, 'Story'), 'Client Films');
  is('source: a graphic or a story is drawn', [pieceSource('Blueprint makes + posts', 'Graphic'), pieceSource('Blueprint makes + posts', 'Story')],
     ['Flyer / Graphic', 'Flyer / Graphic']);
  is('source: anything else is cut from what we hold',
     ['Video', 'Photo', 'Carousel', null].map((m) => pieceSource('Blueprint makes + posts', m)),
     ['Show Media', 'Show Media', 'Show Media', 'Show Media']);

  is('bucket: by playbook',
     ['Pre-Show', 'Show Night', 'Release Rollout', 'Release Sprint', 'Remix Drop', 'Post-Show'].map((pb) => pieceBucket(pb, 'Video', false)),
     ['Show Promo', 'Show Promo', 'Release Promo', 'Release Promo', 'Release Promo', 'Live Performance']);
  is('bucket: a carousel is a Carousel whatever the playbook', pieceBucket('Post-Show', 'Carousel', false), 'Carousel');
  is('bucket: a flyer row is a Flyer first', [pieceBucket('Pre-Show', 'Graphic', true), pieceBucket('Pre-Show', 'Story', true)], ['Flyer', 'Flyer']);
  is('bucket: a playbook we do not know is left empty rather than guessed', pieceBucket('Something New', 'Video', false), null);

  is('platforms: a story is Instagram only', piecePlatforms('Story'), ['Instagram']);
  is('platforms: a video goes three places', piecePlatforms('Video'), ['Instagram', 'TikTok', 'Facebook']);
  is('platforms: the rest go two', ['Photo', 'Carousel', 'Graphic'].map(piecePlatforms),
     [['Instagram', 'Facebook'], ['Instagram', 'Facebook'], ['Instagram', 'Facebook']]);

  const sessions = [
    pstep('s1', '🎥 Film: one', '2026-11-20', { flow: FILM_SESSION_FLOW }),
    pstep('s2', '🎥 Film: two', '2026-12-01', { flow: FILM_SESSION_FLOW }),
    pstep('s3', '🎥 Film: skipped', '2026-12-05', { flow: FILM_SESSION_FLOW, status: 'Skipped' }),
    pstep('s4', '🎥 Film: another moment', '2026-12-06', { flow: FILM_SESSION_FLOW, momentId: 'mo-remix' }),
    pstep('s5', '🎥 Film: after', '2026-12-10', { flow: FILM_SESSION_FLOW }),
  ];
  const giveaway = pstep('g', 'Ticket giveaway', '2026-12-07', { flow: CLIENT_FILMS_FLOW });
  is('film by: the nearest earlier session in the same moment', filmByFor(giveaway, [...sessions, giveaway]), '2026-12-01');
  is('film by: a session on the day itself counts', filmByFor({ ...giveaway, date: '2026-12-10' }, sessions), '2026-12-10');
  is('film by: none before it is none', filmByFor({ ...giveaway, date: '2026-11-01' }, sessions), null);
  is('film by: a step with no day has none', filmByFor({ ...giveaway, date: null }, sessions), null);

  const one = piecesForStep(giveaway, PC_SHOW, [...sessions, giveaway]);
  is('rows: one step, one row, unless it says otherwise', one.length, 1);
  is('rows: everything about it comes from the step',
     [one[0].title, one[0].media, one[0].source, one[0].bucket, one[0].platforms, one[0].postDate, one[0].filmBy, one[0].stepId],
     ['Christmas Show Ticket giveaway', 'Video', 'Client Films', 'Show Promo', ['Instagram', 'TikTok', 'Facebook'], '2026-12-07', '2026-12-01', 'g']);
  is('rows: a piece we make has no Film By',
     piecesForStep(pstep('v', 'Recap', '2026-12-07'), PC_SHOW, sessions)[0].filmBy, null);

  const flyer = piecesForStep(pstep('f', 'Announce: flyer, date, ticket link', '2026-11-22',
    { phase: 'Pre-Show · Announce', defaultMedia: 'Graphic', pieces: 3, priority: 'Core' }), PC_SHOW, sessions);
  is('flyer: three rows, suffixed', flyer.map((p2) => p2.title),
     ['Christmas Show Announce: flyer, date, ticket link · Feed clip',
      'Christmas Show Announce: flyer, date, ticket link · IG story',
      'Christmas Show Announce: flyer, date, ticket link · Event banner']);
  is('flyer: a feed clip, a story and a banner', flyer.map((p2) => p2.media), ['Video', 'Story', 'Graphic']);
  is('flyer: the clip is cut from footage, the other two are drawn, and all three are in the Flyer bucket',
     [flyer.map((p2) => p2.source), flyer.every((p2) => p2.bucket === 'Flyer')],
     [['Show Media', 'Flyer / Graphic', 'Flyer / Graphic'], true]);
  is('flyer: the clip goes three places, the story to Instagram alone, the banner two',
     flyer.map((p2) => p2.platforms.length), [3, 1, 2]);
  is('flyer: the set is the three in the spec', FLYER_SET.map((v) => [v.suffix, v.media]),
     [[' · Feed clip', 'Video'], [' · IG story', 'Story'], [' · Event banner', 'Graphic']]);
  is('rows: any other number is that many of its own media, numbered',
     piecesForStep(pstep('n', 'Clips', '2026-12-01', { pieces: 2 }), PC_SHOW, []).map((p2) => [p2.title, p2.media]),
     [['Christmas Show Clips · 1 of 2', 'Video'], ['Christmas Show Clips · 2 of 2', 'Video']]);
  is('rows: a step with no Default Media makes a row with none, read as a video elsewhere',
     [piecesForStep(pstep('x', 'X', '2026-12-01', { defaultMedia: null }), PC_SHOW, [])[0].media,
      piecesForStep(pstep('x', 'X', '2026-12-01', { defaultMedia: null }), PC_SHOW, [])[0].platforms.length], [null, 3]);

  const props = pieceProperties({ ...one[0], hidden: true }, 'client-1');
  is('row: ours to post, Planned, linked to its step and its client',
     [props['Posted By'].select.name, props.Status.select.name, props.Campaign.relation[0].id, props.Client.relation[0].id],
     ['Blueprint', 'Planned', 'g', 'client-1']);
  is('row: dated, typed and sourced from the plan',
     [props['Post Date'].date.start, props.Media.select.name, props.Source.select.name, props['Film By'].date.start,
      props.Bucket.select.name, props.Platforms.multi_select.map((o) => o.name)],
     ['2026-12-07', 'Video', 'Client Films', '2026-12-01', 'Show Promo', ['Instagram', 'TikTok', 'Facebook']]);
  is('row: hidden when its step is', props['Hide from Client'].checkbox, true);
  is('row: no Film By or Bucket property when there is none to set',
     ['Film By', 'Bucket'].filter((k) => k in pieceProperties({ ...one[0], filmBy: null, bucket: null }, 'c')), []);
  is('budget: a request leaves room for its reads', PIECE_WRITE_BUDGET <= 30, true);

  const stepPage = { id: 'st', properties: {
    Item: NP.title(' Teaser '), Playbook: NP.sel('Pre-Show'), Flow: NP.sel(CLIENT_FILMS_FLOW),
    Status: NP.sel('Not Started'), Date: NP.date(null),
    'Auto Date': { type: 'formula', formula: { type: 'date', date: { start: '2026-12-02T00:00:00.000Z' } } },
    Moment: NP.rel('mo-show'), Priority: NP.sel('Filler'), 'Default Media': NP.sel('Video'),
    Pieces: NP.num(null), 'Hide from Client': NP.check(true) } };
  const shaped = shapeStep(stepPage);
  is('read: a step with no Date is placed by its Auto Date', [shaped.title, shaped.date, shaped.priority, shaped.hidden], ['Teaser', '2026-12-02', 'Filler', true]);
  const piecePage = { id: 'pc', properties: { Content: NP.title('A piece'), Status: NP.sel('Planned'),
    'Post Date': NP.date('2026-12-02'), Campaign: NP.rel('st', 'st2') } };
  is('read: a piece knows every step it is linked to', shapePiece(piecePage).campaign, ['st', 'st2']);
}

section('Pieces · creating the ones that are missing');

{
  const steps = [
    pstep('a', 'Announce: flyer, date, ticket link', '2026-12-02', { defaultMedia: 'Graphic', pieces: 3, priority: 'Core' }),
    pstep('b', 'Short-form: catch me in Austin', '2026-12-21'),
    pstep('c', 'Ticket giveaway', '2027-01-03', { flow: CLIENT_FILMS_FLOW }),
    pstep('d', 'Done already', '2026-12-04', { status: 'Done' }),
    pstep('e', 'Skipped', '2026-12-05', { status: 'Skipped' }),
    pstep('f', 'Moved', '2026-12-06', { status: 'Moved' }),
    pstep('g', 'Lock show details', '2026-12-01', { flow: 'Client task' }),
    pstep('h', '🎥 Film: giveaway', '2026-12-28', { flow: FILM_SESSION_FLOW }),
    pstep('i', 'They post it', '2026-12-09', { flow: 'Client makes + posts' }),
    pstep('j', 'Has one', '2026-12-10'),
    pstep('k', 'In progress', '2026-12-11', { status: 'In Progress' }),
  ];
  const have = [{ id: 'p-j', title: 'A row made by hand', status: 'Planned', postDate: '2026-12-10', campaign: ['j'] }];
  const plan = planMissingPieces(steps, [PC_SHOW], have);
  is('missing: every open deliverable step with nothing linked, expanded by Pieces',
     plan.map((p2) => p2.stepId), ['a', 'a', 'a', 'k', 'b', 'c']);
  is('missing: in the order they post', plan.map((p2) => p2.postDate),
     ['2026-12-02', '2026-12-02', '2026-12-02', '2026-12-11', '2026-12-21', '2027-01-03']);
  is('missing: Done, Skipped and Moved steps are left alone',
     plan.some((p2) => ['d', 'e', 'f'].includes(p2.stepId)), false);
  is('missing: a step that delivers nothing of ours gets nothing', plan.some((p2) => ['g', 'h', 'i'].includes(p2.stepId)), false);
  is('missing: a step with a row is covered, whatever the row is called', plan.some((p2) => p2.stepId === 'j'), false);
  is('missing: the Film By comes from the session before it', plan.find((p2) => p2.stepId === 'c').filmBy, '2026-12-28');
  is('missing: narrowed to a month', planMissingPieces(steps, [PC_SHOW], have, { months: ['2026-12'] }).map((p2) => p2.stepId),
     ['a', 'a', 'a', 'k', 'b']);
  is('missing: narrowed to some steps', planMissingPieces(steps, [PC_SHOW], have, { stepIds: ['b', 'c'] }).map((p2) => p2.stepId), ['b', 'c']);
  is('chip: the steps the "No piece yet" chip counts', stepsWithoutPieces(steps, have).map((s2) => s2.id), ['a', 'b', 'c', 'k']);

  // Run it, then run it again.
  const made = plan.map((p2, n) => ({ id: `new-${n}`, title: p2.title, status: 'Planned', postDate: p2.postDate, campaign: [p2.stepId] }));
  is('missing: run twice, the second run creates nothing', planMissingPieces(steps, [PC_SHOW], [...have, ...made]), []);
  is('chip: and then it reads zero', stepsWithoutPieces(steps, [...have, ...made]), []);
  // A write that stopped after one flyer row, the banner.
  const banner = made.find((m) => m.title.endsWith('Event banner'));
  const half = planMissingPieces(steps, [PC_SHOW], [...have, banner], { stepIds: ['a'] });
  is('missing: a flyer left one row in is finished, not started again',
     half.map((p2) => p2.title.split(' · ').pop()), ['Feed clip', 'IG story']);
  is('missing: a flyer step covered by one row made by hand is not added to',
     planMissingPieces(steps, [PC_SHOW], [{ id: 'x', title: 'Christmas flyer', status: 'Planned', postDate: null, campaign: ['a'] }], { stepIds: ['a'] }), []);
  is('missing: a skipped row still covers its step, so nothing is recreated behind a trim',
     planMissingPieces(steps, [PC_SHOW], [{ id: 'x', title: 'Christmas Show Short-form: catch me in Austin', status: 'Skipped', postDate: null, campaign: ['b'] }], { stepIds: ['b'] }), []);
  is('missing: ids match with or without dashes',
     planMissingPieces([pstep('3f7c8be8-be72-8123-a420-fb9aef6bc0e9', 'X', '2026-12-01')], [PC_SHOW],
       [{ id: 'x', title: 'y', status: 'Planned', postDate: null, campaign: ['3f7c8be8be728123a420fb9aef6bc0e9'] }]), []);
}

section('Pieces · a step and its rows stay in step');

{
  const rows = [
    { id: '1', status: 'Planned', postDate: '2026-12-02' },
    { id: '2', status: 'Planned', postDate: '2026-12-09' },
    { id: '3', status: 'Editing', postDate: '2026-12-02' },
    { id: '4', status: 'Posted', postDate: '2026-12-02' },
    { id: '5', status: 'Idea', postDate: '2026-12-02' },
    { id: '6', status: 'Skipped', postDate: '2026-12-02' },
  ];
  is('follow: a Planned row not already on the day', piecesToFollow(rows, '2026-12-09').map((r) => r.id), ['1']);
  is('follow: nothing past Planned is ever moved', piecesToFollow(rows, '2026-12-20').map((r) => r.id), ['1', '2']);
  is('follow: a step with no day moves nothing', piecesToFollow(rows, null), []);
  is('skip: a skipped step takes its Planned rows and no others', piecesToSkip(rows).map((r) => r.id), ['1', '2']);
  is('step: skipped when its only row is', stepSkippedByPieces([{ status: 'Skipped' }]), true);
  is('step: a flyer is only skipped when all three are',
     [stepSkippedByPieces([{ status: 'Skipped' }, { status: 'Skipped' }, { status: 'Planned' }]),
      stepSkippedByPieces([{ status: 'Skipped' }, { status: 'Skipped' }, { status: 'Skipped' }])], [false, true]);
  is('step: a step with no rows is not skipped by having none', stepSkippedByPieces([]), false);
}

section('Pieces · suggested trims for a month that is over');

{
  let n = 0;
  const steps = [];
  const pieces = [];
  const add = (title, date, o = {}, po = {}) => {
    const id = `st-${++n}`;
    steps.push(pstep(id, title, date, o));
    pieces.push({ id: `pc-${n}`, title: `P ${title}`, status: 'Planned', postDate: date, media: o.defaultMedia ?? 'Video', stepId: id, ...po });
    return `pc-${n}`;
  };
  // Twenty Core pieces the month cannot lose.
  for (let i = 1; i <= 20; i++) add(`Core ${i}`, `2026-12-${String(i).padStart(2, '0')}`, { priority: 'Core', playbook: 'Release Rollout', momentId: 'mo-core' });
  const fillerRelease = add('Filler release', '2026-12-30', { priority: 'Filler', playbook: 'Release Rollout', momentId: 'mo-core', defaultMedia: 'Photo' });
  const fillerPre = add('Filler pre-show', '2026-12-29', { priority: 'Filler', playbook: 'Pre-Show', defaultMedia: 'Graphic' });
  const fillerPost = add('Filler post-show', '2026-12-27', { priority: 'Filler', playbook: 'Post-Show', defaultMedia: 'Carousel' });
  const fillerRemix = add('Filler remix', '2026-12-24', { priority: 'Filler', playbook: 'Remix Drop', momentId: 'mo-remix', defaultMedia: 'Story' });
  const stdRemixLate = add('Standard remix late', '2026-12-31', { priority: 'Standard', playbook: 'Remix Drop', momentId: 'mo-remix', defaultMedia: 'Story' });
  const stdRemixEarly = add('Standard remix early', '2026-12-22', { priority: 'Standard', playbook: 'Remix Drop', momentId: 'mo-remix', defaultMedia: 'Photo' });
  const stdEditing = add('Standard in the edit', '2026-12-28', { priority: 'Filler', playbook: 'Remix Drop', momentId: 'mo-remix' }, { status: 'Editing' });
  const moments = [PC_SHOW, PC_REMIX, { id: 'mo-core', title: 'Every Season', date: '2027-01-08', momentType: 'Release' }];

  const plan = suggestTrims(pieces, steps, moments);
  is('trims: the month and how far over it is', [plan.planned, plan.over], [27, 2]);
  is('trims: never Core, and never anything past Planned',
     [plan.rows.some((r) => r.title.startsWith('P Core')), plan.rows.some((r) => r.pieceId === stdEditing)], [false, false]);
  is('trims: Filler before Standard, and within a tier remix, after the show, before it, then a release',
     plan.rows.map((r) => r.pieceId), [fillerRemix, fillerPost, fillerPre, fillerRelease, stdRemixLate, stdRemixEarly]);
  is('trims: within a campaign, the latest goes first', plan.rows.slice(4).map((r) => r.postDate), ['2026-12-31', '2026-12-22']);
  is('trims: exactly as many ticked as the month is over', plan.rows.filter((r) => r.suggested).map((r) => r.pieceId), [fillerRemix, fillerPost]);
  is('trims: every row says why in one line', plan.rows[0].reason, 'Filler, Remix Drop');
  is('trims: and nothing is left over when there is enough to cut', plan.stillOver, 0);
  is('trims: a month inside its cap suggests nothing', suggestTrims(pieces.slice(0, 25), steps, moments).rows.filter((r) => r.suggested), []);

  // Competing with another moment's big day.
  const near = suggestTrims([
    ...pieces.slice(0, 25),
    { id: 'far', title: 'Far from it', status: 'Planned', postDate: '2026-12-19', media: 'Video', stepId: 'st-far' },
    { id: 'close', title: 'Close to it', status: 'Planned', postDate: '2026-12-09', media: 'Photo', stepId: 'st-close' },
  ], [...steps, pstep('st-far', 'Far', '2026-12-19', { playbook: 'Pre-Show' }), pstep('st-close', 'Close', '2026-12-09', { playbook: 'Pre-Show' })],
    moments);
  is('trims: a piece within three days of another moment’s release day goes before one that is clear of it',
     near.rows.filter((r) => ['far', 'close'].includes(r.pieceId)).map((r) => r.pieceId), ['close', 'far']);
  is('trims: and says which day it is up against',
     near.rows.find((r) => r.pieceId === 'close').reason, 'Standard, Pre-Show, within 3 days of Christmas Remix’s release day'.replace('’', "'"));
  is('trims: a moment does not compete with itself',
     suggestTrims([...pieces.slice(0, 25), { id: 'own', title: 'Own', status: 'Planned', postDate: '2026-12-10', media: 'Video', stepId: 'st-own' }],
       [...steps, pstep('st-own', 'Own', '2026-12-10', { playbook: 'Remix Drop', momentId: 'mo-remix' })], moments)
       .rows.find((r) => r.pieceId === 'own').reason, 'Standard, Remix Drop');
  const announce = suggestTrims(
    [...pieces.slice(0, 25), { id: 'by', title: 'By the announce', status: 'Planned', postDate: '2026-12-16', media: 'Photo', stepId: 'st-by' }],
    [...steps, pstep('st-by', 'By', '2026-12-16', { playbook: 'Post-Show' }),
     pstep('st-ann', 'Announce: artwork and date', '2026-12-18', { momentId: 'mo-core', playbook: 'Release Rollout', priority: 'Core' })], moments);
  is('trims: another moment’s announce counts the same way',
     announce.rows.find((r) => r.pieceId === 'by').reason.endsWith("Every Season's announce"), true);

  // Near-duplicates: same week, same media, different moments.
  // Twenty Core pieces and as many more as it takes to fill the month,
  // so the only candidates are the ones each case adds.
  const full = (extra) => [...pieces.slice(0, 20),
    ...Array.from({ length: extra }, (_, i) => ({ id: `pad-${i}`, title: `Pad ${i}`, status: 'Planned', postDate: '2026-12-15', media: 'Video', stepId: 'st-1' }))];
  const dup = suggestTrims([
    ...full(4),
    { id: 'd-show', title: 'Show clip', status: 'Planned', postDate: '2026-12-22', media: 'Video', stepId: 'st-d1' },
    { id: 'd-remix', title: 'Remix clip', status: 'Planned', postDate: '2026-12-24', media: 'Video', stepId: 'st-d2' },
    { id: 'd-alone', title: 'Alone', status: 'Planned', postDate: '2026-12-30', media: 'Carousel', stepId: 'st-d3' },
  ], [...steps,
      pstep('st-d1', 'Show clip', '2026-12-22', { playbook: 'Pre-Show', momentId: 'mo-show' }),
      pstep('st-d2', 'Remix clip', '2026-12-24', { playbook: 'Remix Drop', momentId: 'mo-remix' }),
      pstep('st-d3', 'Alone', '2026-12-30', { playbook: 'Remix Drop', momentId: 'mo-remix' })], moments);
  is('trims: of two alike in one week, the one that would go sooner goes, and says what it doubles',
     [dup.rows[0].pieceId, dup.rows[0].reason], ['d-remix', 'Standard, Remix Drop, overlaps with Show clip']);
  is('trims: the other of the pair is not marked as well', dup.rows.find((r) => r.pieceId === 'd-show').reason, 'Standard, Pre-Show');
  is('trims: a near-duplicate still never jumps a tier',
     suggestTrims([
       ...full(4),
       { id: 'fill', title: 'Filler', status: 'Planned', postDate: '2026-12-02', media: 'Photo', stepId: 'st-f' },
       { id: 'd-show', title: 'Show clip', status: 'Planned', postDate: '2026-12-22', media: 'Video', stepId: 'st-d1' },
       { id: 'd-remix', title: 'Remix clip', status: 'Planned', postDate: '2026-12-24', media: 'Video', stepId: 'st-d2' },
     ], [...steps, pstep('st-f', 'F', '2026-12-02', { priority: 'Filler', playbook: 'Release Rollout', momentId: 'mo-core' }),
         pstep('st-d1', 'Show clip', '2026-12-22', { playbook: 'Pre-Show', momentId: 'mo-show' }),
         pstep('st-d2', 'Remix clip', '2026-12-24', { playbook: 'Remix Drop', momentId: 'mo-remix' })], moments).rows.map((r) => r.pieceId),
     ['fill', 'd-remix', 'd-show']);
  is('trims: the same moment twice in a week is not a duplicate',
     suggestTrims([
       ...pieces.slice(0, 24),
       { id: 'x1', title: 'One', status: 'Planned', postDate: '2026-12-22', media: 'Video', stepId: 'st-x1' },
       { id: 'x2', title: 'Two', status: 'Planned', postDate: '2026-12-24', media: 'Video', stepId: 'st-x2' },
     ], [...steps, pstep('st-x1', 'One', '2026-12-22', { momentId: 'mo-show' }), pstep('st-x2', 'Two', '2026-12-24', { momentId: 'mo-show' })], moments)
       .rows.some((r) => /overlaps/.test(r.reason)), false);

  // Not enough to cut.
  const tight = suggestTrims([...pieces.slice(0, 20),
    ...Array.from({ length: 8 }, (_, i) => ({ id: `core-x${i}`, title: `More core ${i}`, status: 'Planned', postDate: '2026-12-15', media: 'Video', stepId: 'st-1' })),
    pieces.find((p2) => p2.id === fillerRemix)], steps, moments);
  is('trims: with fewer candidates than the overage, all of them are suggested and the shortfall is said',
     [tight.over, tight.rows.length, tight.rows.every((r) => r.suggested), tight.stillOver], [4, 1, true, 3]);

  // A piece with no step or no priority is cuttable, and says so.
  const loose = suggestTrims([...full(5), { id: 'loose', title: 'Added by hand', status: 'Planned', postDate: '2026-12-19', media: 'Graphic', stepId: null }], steps, moments);
  is('trims: a piece on no campaign is a Standard candidate, and says what is missing',
     [loose.rows[0].tier, loose.rows[0].reason], ['Standard', 'Standard, no campaign, no priority set']);

  // Moving instead of cutting.
  is('move: offered for a post-show piece and a long-tail one, and nothing else',
     [canMoveToNextMonth({ playbook: 'Post-Show', phase: 'Post-Show · Week Two' }),
      canMoveToNextMonth({ playbook: 'Release Rollout', phase: 'Wk 3–4 · Long Tail' }),
      canMoveToNextMonth({ playbook: 'Release Rollout', phase: 'Wk −4 · Announce' }),
      canMoveToNextMonth({ playbook: 'Pre-Show', phase: 'Pre-Show · Build' }), canMoveToNextMonth(null)],
     [true, true, false, false, false]);
  is('move: to the same weekday, the first one in the next month',
     [nextMonthSameWeekday('2026-12-27'), nextMonthSameWeekday('2026-12-03'), nextMonthSameWeekday('2027-01-31'), nextMonthSameWeekday('nope')],
     ['2027-01-03', '2027-01-07', '2027-02-07', null]);
  is('move: the row carries where it would go',
     [plan.rows.find((r) => r.pieceId === fillerPost).canMove, plan.rows.find((r) => r.pieceId === fillerPost).moveTo,
      plan.rows.find((r) => r.pieceId === fillerRemix).canMove, plan.rows.find((r) => r.pieceId === fillerRemix).moveTo],
     [true, '2027-01-03', false, null]);

  // The notes, and taking them back.
  const line = trimNote('2026-11-16', 'Filler, Remix Drop');
  is('note: the line the spec asks for', line, 'Trimmed 2026-11-16: over monthly cap (Filler, Remix Drop)');
  is('note: appended, never replacing what was there', [appendNote(null, line), appendNote('Shot on the 4th.\n', line)],
     [line, `Shot on the 4th.\n${line}`]);
  is('note: an undo takes exactly that line back out',
     [removeNote(`Shot on the 4th.\n${line}`, line), removeNote(line, line), removeNote('Something else', line)],
     ['Shot on the 4th.', '', 'Something else']);
  is('note: a move says where it came from', moveNote('2026-11-16', '2026-12-27'), 'Moved 2026-11-16: over monthly cap (was 2026-12-27)');
}

section('Pieces · film sessions a trim leaves with nothing to film');

{
  const film = (id, date, o = {}) => pstep(id, `🎥 Film ${id}`, date, { flow: FILM_SESSION_FLOW, ...o });
  const cut = (id, date, o = {}) => pstep(id, `Cut ${id}`, date, { flow: CLIENT_FILMS_FLOW, ...o });
  const base = [
    film('f1', '2026-12-01'), cut('a', '2026-12-04', { status: 'Skipped' }), cut('b', '2026-12-06', { status: 'Skipped' }),
    film('f2', '2026-12-10'), cut('c', '2026-12-12', { status: 'Skipped' }), cut('d', '2026-12-14'),
    pstep('ours', 'Ours', '2026-12-05'),
  ];
  is('sessions: one whose every piece went, one of them in this trim, is listed',
     sessionsNoLongerNeeded(base, ['b', 'c']).map((s2) => s2.id), ['f1']);
  is('sessions: one that still feeds a piece is never listed', sessionsNoLongerNeeded(base, ['c']).map((s2) => s2.id), []);
  is('sessions: one emptied before this trim, by something else, is not this trim’s to list',
     sessionsNoLongerNeeded(base, ['zzz']), []);
  is('sessions: a piece of ours between two sessions does not keep the first one', sessionsNoLongerNeeded(base, ['a']).map((s2) => s2.id), ['f1']);
  is('sessions: one that is already done is history',
     sessionsNoLongerNeeded(base.map((s2) => (s2.id === 'f1' ? { ...s2, status: 'Done' } : s2)), ['b']), []);
  is('sessions: one that feeds nothing at all is not listed for that',
     sessionsNoLongerNeeded([film('f9', '2026-12-01'), pstep('ours', 'Ours', '2026-12-05')], ['ours']), []);
  is('sessions: the last session runs to the end of the campaign',
     sessionsNoLongerNeeded(base.map((s2) => (s2.id === 'd' ? { ...s2, status: 'Skipped' } : s2)), ['d']).map((s2) => s2.id), ['f2']);
  is('sessions: a skipped session is not a boundary, so the one before it covers its pieces',
     sessionsNoLongerNeeded(base.map((s2) => (s2.id === 'f2' ? { ...s2, status: 'Skipped' } : s2)), ['b']), []);
  is('sessions: another moment’s pieces are not this session’s',
     sessionsNoLongerNeeded([film('f1', '2026-12-01'), cut('a', '2026-12-04', { status: 'Skipped' }),
       cut('z', '2026-12-05', { momentId: 'mo-remix' })], ['a']).map((s2) => s2.id), ['f1']);
}

section('Playbooks · steps retired from a playbook');

{
  const withRetired = [
    ...MASTERS,
    mstep('r-1', 'Energy clip from a past show', -18, { playbook: 'Retired', flow: 'Blueprint makes + posts' }),
    mstep('r-2', 'Quote graphic', 20, { playbook: 'Retired', flow: 'Blueprint makes + posts' }),
  ];
  is('retired: it is the name Notion gives the pile, however it is cased', [isRetiredPlaybook('Retired'), isRetiredPlaybook(' retired '), isRetiredPlaybook('Pre-Show'), isRetiredPlaybook(null)],
     [true, true, false, false]);
  is('retired: it is not one of the playbooks', playbookNames(withRetired), ['Release Sprint', 'Remix Drop']);
  is('retired: HQ lists its steps apart, by where they came from and then by day',
     retiredMasters(withRetired.map((m) => (m.id === 'r-1' ? { ...m, phase: 'Pre-Show · Build' } : m.id === 'r-2' ? { ...m, phase: 'Sprint · Follow-Through' } : m))).map((m) => m.id),
     ['r-2', 'r-1']);
  is('retired: a phase says which playbook a step came from',
     ['Sprint · Test', 'Remix · Drop Day', 'Pre-Show · Build', 'Show Night', 'Post-Show · Week Two', 'Wk −4 · Announce', 'Release Week', 'Wk 3–4 · Long Tail']
       .map((ph) => playbooksOfPhase(ph)[0]),
     ['Release Sprint', 'Remix Drop', 'Pre-Show', 'Show Night', 'Post-Show', 'Release Rollout', 'Release Rollout', 'Release Rollout']);
  is('retired: Release Day is the one phase two playbooks share, and it says so',
     [playbooksOfPhase('Release Day'), playbooksOfPhase(null), playbooksOfPhase('Something else')],
     [['Release Rollout', 'Release Sprint'], [], []]);
  const vocabR = vocabularyOf(withRetired);
  is('retired: restoring is a move to a playbook that exists',
     [buildMasterProperties({ playbook: 'Release Sprint' }, vocabR).properties.Playbook.select.name,
      buildMasterProperties({ playbook: 'Retired' }, vocabR).properties.Playbook.select.name,
      buildMasterProperties({ playbook: 'A New One' }, vocabR).rejected],
     ['Release Sprint', 'Retired', ['playbook']]);
  is('retired: a client is never shown it', clientPlaybooks(withRetired, [], SEAN_ID).map((p2) => p2.name), ['Release Sprint', 'Remix Drop']);
  is('retired: and none of its steps reach them under another name',
     clientPlaybooks(withRetired, [], SEAN_ID).flatMap((p2) => p2.phases.flatMap((g) => g.steps.map((s2) => s2.title))).some((t) => /Energy clip|Quote graphic/.test(t)), false);
  is('retired: a real playbook does not pick up a retired step', effectivePlaybook(withRetired, [], 'Release Sprint', SEAN_ID).length, 4);
}

/* ══ Update campaigns to current playbook ════════════════════════ */

section('Update · which master a step came from');

const UM = (id, title, o = {}) => ({ id, title, playbook: 'Pre-Show', phase: 'Pre-Show · Build', offset: -14,
  flow: 'Blueprint makes + posts', owner: 'Blueprint', type: 'Content', notes: null, where: null, why: null,
  momentId: 'pb', priority: 'Standard', defaultMedia: 'Video', pieces: null, brief: null, ...o });
const UP_MASTERS = [
  UM('m1', 'Announce: crowd clip ending on the flyer, flyer story, event banner', { phase: 'Pre-Show · Announce', offset: -28, priority: 'Core', defaultMedia: 'Graphic', pieces: 3, brief: 'Open on the crowd.', where: 'Feed, story, event page' }),
  UM('m2', 'Short-form: catch me in [city], using past show footage', { phase: 'Pre-Show · Announce', offset: -27, brief: 'Name the city.' }),
  UM('m3', 'Ticket giveaway: artist talks to camera, send it to who you’re bringing, comment to enter (comps from the promoter)', { flow: CLIENT_FILMS_FLOW, brief: 'Straight to camera.' }),
  UM('m4', '🎥 Film: ticket giveaway talk-to-camera + set preview snippet', { offset: -17, flow: FILM_SESSION_FLOW, priority: null, defaultMedia: null }),
  UM('m5', '"This week" hype clip', { phase: 'Pre-Show · Final Week', offset: -3, priority: 'Core', brief: 'Fast cuts.' }),
  UM('m6', 'Full set upload (only if the full set was recorded)', { playbook: 'Post-Show', phase: 'Post-Show · Week Two', offset: 14, brief: 'Long form.' }),
  UM('m7', 'Sound design breakdown: how the drop was built', { playbook: 'Release Rollout', phase: 'Release Week', offset: 4, flow: CLIENT_FILMS_FLOW }),
  UM('m8', '🎥 Film: vibing to the drop (vertical, 2–3 takes, different spots)', { playbook: 'Release Rollout', phase: 'Wk −4 · Announce', offset: -24, flow: FILM_SESSION_FLOW, priority: null, defaultMedia: null }),
  UM('m9', '🎥 Film: studio session (making-of, hook snippet, jamming to the track)', { playbook: 'Release Rollout', phase: 'Wk −6 · Lock the Release', offset: -40, flow: FILM_SESSION_FLOW, priority: null, defaultMedia: null }),
  UM('m10', 'Play it as an ID at every show until release, and tell the shooter which drop', { playbook: 'Release Rollout', phase: 'Wk −6 · Lock the Release', offset: -40, flow: 'Client task', owner: 'Client', type: 'Admin', priority: null, defaultMedia: null, why: 'A crowd reaction sells the drop.' }),
  UM('m11', 'Clear the remix: written permission from the original artist’s team', { playbook: 'Remix Drop', phase: 'Remix · Setup', offset: -21, flow: 'Blueprint task', type: 'Admin', priority: null, defaultMedia: null }),
  UM('m12', 'Drop day post with the link', { playbook: 'Remix Drop', phase: 'Remix · Drop Day', offset: 0, priority: 'Core' }),
  // Retired: they keep their title and phase, and lose their playbook.
  UM('r1', 'Energy clip from a past show with a city callout', { playbook: 'Retired', offset: -18, priority: 'Filler' }),
  UM('r2', 'Sound design breakdown: how the drop was built', { playbook: 'Retired', phase: 'Sprint · Test', offset: -10, priority: 'Filler' }),
  UM('r3', 'Release day post', { playbook: 'Retired', phase: 'Release Day', offset: 0, priority: 'Core' }),
];

{
  const m = (title, playbook = 'Pre-Show') => matchMaster({ title, playbook }, UP_MASTERS);
  is('match: a master’s own title, whatever the case or the quotes',
     [m('"This week" hype clip').master.id, m('“THIS WEEK”  hype clip').by], ['m5', 'title']);
  const city = m('Short-form: catch me in Austin, using past show footage');
  is('match: a city standing in the master’s [city]', [city.master.id, city.by, city.city], ['m2', 'placeholder', 'Austin']);
  is('match: a wording it had before the audit', [m('Announce: flyer, date, ticket link').master.id, m('Announce: flyer, date, ticket link').by], ['m1', 'alias']);
  is('match: a wording with the client’s name in it',
     [m('Ticket giveaway: Sean talks to camera, tag a friend to win').master.id, m('Ticket giveaway: Sean talks to camera, tag a friend to win').artist], ['m3', 'Sean']);
  is('match: a wording with the track in it',
     [m('🎥 Film: vibing to the Every Season drop (vertical, 2–3 takes, different spots)', 'Release Rollout').master.id,
      m('🎥 Film: vibing to the Every Season drop (vertical, 2–3 takes, different spots)', 'Release Rollout').moment], ['m8', 'Every Season']);
  const ret = m('Energy clip from a past show with a city callout');
  is('match: a retired master, by its title and the playbook its phase names', [ret.master.id, ret.retired, ret.by], ['r1', true, 'retired']);
  is('match: the same title can be live in one playbook and retired from another',
     [m('Sound design breakdown: how the drop was built', 'Release Rollout').retired,
      m('Sound design breakdown: how the drop was built', 'Release Sprint').retired], [false, true]);
  is('match: Release Day is two playbooks’ phase, so a step retired there is found from either',
     [m('Release day post', 'Release Rollout').retired, m('Release day post', 'Release Sprint').retired], [true, true]);
  is('match: a retired title is not found from a playbook it was never in', m('Energy clip from a past show with a city callout', 'Post-Show'), null);
  is('match: a title nobody knows is not guessed at',
     [m('🎥 Shoot: artwork + clips'), m('Announce something'), matchMaster({ title: 'x', playbook: null }, UP_MASTERS)], [null, null, null]);
  is('match: an old title that must keep its wording says why',
     /ID/.test(m('Capture studio footage and test the track as an ID at shows (film the drop reaction)', 'Release Rollout').keep), true);
  const named = m('Ticket giveaway: Sean talks to camera, send it to who you\u2019re bringing, comment to enter (comps from the promoter)');
  is('match: a name standing where the master says "artist", so a step already updated is still recognised',
     [named.master.id, named.by, named.artist], ['m3', 'placeholder', 'Sean']);
  is('match: and then there is nothing to rename',
     renameFor({ title: 'Ticket giveaway: Sean talks to camera, send it to who you\u2019re bringing, comment to enter (comps from the promoter)' }, named, 'Christmas Show', 'Sean Comma').title, null);
  is('match: a master renamed after the audit is found by the title it had',
     matchMaster({ title: 'Check which cut performed best', playbook: 'Release Rollout' },
       [...UP_MASTERS, UM('m13', 'Hit check: pick the best cut for the announce. If a clip is at 3\u00d7 the account\u2019s usual views, post a follow-up within 72 hours',
         { playbook: 'Release Rollout', phase: 'Wk \u22122 · Seed and Test', offset: -10, flow: 'Blueprint task' })]).master.id, 'm13');
  is('aliases: every one names a playbook and how its master starts', AUDIT_ALIASES.every((a) => a.playbook && a.master && (a.was || a.like || a.keep)), true);

  const rn = (title, playbook, moment = 'Christmas Show') => renameFor({ title }, m(title, playbook), moment, 'Sean Comma');
  is('rename: the city is kept, so a step already in the new wording is not renamed',
     rn('Short-form: catch me in Austin, using past show footage', 'Pre-Show').title, null);
  is('rename: to the master’s new title', rn('Announce: flyer, date, ticket link', 'Pre-Show').title,
     'Announce: crowd clip ending on the flyer, flyer story, event banner');
  is('rename: their name stays where the master says "artist"',
     rn('Ticket giveaway: Sean talks to camera, tag a friend to win', 'Pre-Show').title.startsWith('Ticket giveaway: Sean talks to camera, send it to'), true);
  is('rename: and a step that never named them gets the master’s word',
     rn('Ticket giveaway: tag a friend to win', 'Pre-Show').title.startsWith('Ticket giveaway: artist talks to camera'), true);
  is('rename: the track stays in a title that named it',
     rn('🎥 Film: Every Season studio session (texture shots, hook snippet)', 'Release Rollout', 'Every Season').title,
     '🎥 Film: Every Season studio session (making-of, hook snippet, jamming to the track)');
  is('rename: a title already in the new wording, track and all, is left',
     rn('🎥 Film: vibing to the Every Season drop (vertical, 2–3 takes, different spots)', 'Release Rollout', 'Every Season').title, null);
  const kept = rn('Capture studio footage and test the track as an ID at shows (film the drop reaction)', 'Release Rollout', 'What If I Told You');
  is('rename: a title that carries a second job is left, and says so', [kept.title, /Title left as it is/.test(kept.flag)], [null, true]);
  is('rename: a retired step is never renamed', rn('Energy clip from a past show with a city callout', 'Pre-Show').title, null);
}

section('Update · what is frozen, retired, updated and added');

const ustep = (id, title, date, o = {}) => ({ id, title, playbook: 'Pre-Show', phase: 'Pre-Show · Build', flow: 'Blueprint makes + posts',
  status: 'Not Started', date, momentId: 'mo-show', priority: 'Standard', defaultMedia: 'Video', pieces: null,
  offset: null, brief: null, where: null, why: null, notes: null, ...o });
const upiece = (id, stepId, status, postDate, o = {}) => ({ id, title: `Piece of ${stepId}`, status, postDate, campaign: [stepId],
  media: 'Video', postedBy: 'Blueprint', notes: null, ...o });
const UP_MOMENTS = [
  { id: 'mo-show', title: 'Christmas Show', date: '2026-12-13', momentType: 'Show' },
  { id: 'mo-rel', title: 'Every Season', date: '2027-01-08', momentType: 'Release' },
  { id: 'mo-old', title: 'If The Devil Had His Way', date: '2026-12-04', momentType: 'Release' },
  { id: 'mo-remix', title: 'Christmas Remix', date: '2026-12-11', momentType: 'Release' },
];
const UP_OPTS = { today: '2026-11-16', artist: 'Sean Comma' };

{
  const steps = [
    ustep('done', '"This week" hype clip', '2026-12-10', { status: 'Done', offset: -3 }),
    ustep('skipped', 'Announce: flyer, date, ticket link', '2026-11-20', { status: 'Skipped' }),
    ustep('moved', 'Announce: flyer, date, ticket link', '2026-11-21', { status: 'Moved' }),
    ustep('past', 'Announce: flyer, date, ticket link', '2026-11-15', { offset: -28 }),
    ustep('today', 'Announce: flyer, date, ticket link', '2026-11-16', { offset: -27 }),
    ustep('making', 'Energy clip from a past show with a city callout', '2026-11-25', { offset: -18 }),
    ustep('retire', 'Energy clip from a past show with a city callout', '2026-11-26', { offset: -17 }),
    ustep('nobody', '🎥 Shoot: artwork + clips', '2026-11-27'),
    ustep('held', 'Energy clip from a past show with a city callout', '2026-11-28'),
    ustep('fine', '"This week" hype clip', '2026-12-10', { offset: -3, priority: 'Core', brief: 'Fast cuts.' }),
  ];
  const pieces = [
    upiece('p-making', 'making', 'Editing', '2026-11-25'),
    upiece('p-making2', 'making', 'Planned', '2026-11-25'),
    upiece('p-retire', 'retire', 'Planned', '2026-11-26'),
    upiece('p-retire-idea', 'retire', 'Skipped', '2026-11-26'),
  ];
  const plan = planUpdate(steps, UP_MOMENTS, UP_MASTERS, pieces, { ...UP_OPTS, exclude: ['held'] }, ['2026-11']);
  const row = (id) => plan.rows.find((r) => r.stepId === id);
  is('frozen: done, skipped and moved steps are never touched',
     ['done', 'skipped', 'moved'].map((id) => [row(id).action, row(id).changes.length]), [['frozen', 0], ['frozen', 0], ['frozen', 0]]);
  is('frozen: a step whose date has passed', [row('past').action, row('past').why], ['frozen', 'Its date, 2026-11-15, has passed.']);
  is('frozen: today is not the past', row('today').action, 'update');
  is('frozen: a step whose piece is already being made, and every piece it has',
     [row('making').action, row('making').pieces, row('making').why], ['frozen', [], 'Its piece is already Editing.']);
  is('retired: the step is skipped, with the audit’s name on it',
     [row('retire').action, row('retire').changes, row('retire').note],
     ['skip', [{ field: 'Status', from: 'Not Started', to: 'Skipped' }], 'Retired in playbook audit Nov 16']);
  is('retired: its Planned pieces go with it, and only those',
     row('retire').pieces.map((p2) => [p2.id, p2.status, p2.note]), [['p-retire', 'Skipped', 'Retired in playbook audit Nov 16']]);
  is('unmatched: reported, and nothing is changed', [row('nobody').action, row('nobody').master, row('nobody').changes], ['unmatched', null, []]);
  is('kept: a step left out on purpose is left out', [row('held').action, row('held').changes], ['kept', []]);
  is('current: a step that already matches its master is not written', [row('fine').action, row('fine').changes], ['current', []]);
  is('counts: one of each, and writes are a step plus its pieces',
     [plan.counts.frozen, plan.counts.skip, plan.counts.update, plan.counts.unmatched, plan.counts.kept, plan.counts.current, plan.writes],
     [5, 1, 1, 1, 1, 1, 3]);
  is('months: a skipped Planned piece leaves the count, a piece being made does not',
     plan.months[0].pieces, { before: 3, after: 2 });
}

{
  // Updates: title, the fields, and the date.
  const steps = [
    ustep('ann', 'Announce: flyer, date, ticket link', '2026-11-18', { phase: 'Pre-Show · Announce', offset: -28, priority: 'Core', defaultMedia: 'Graphic', pieces: 3,
      where: 'Old channel', why: 'Old reason', notes: 'Rescheduled Nov 9 (was Nov 15).' }),
    ustep('give', 'Ticket giveaway: tag a friend to win', '2026-11-29', { offset: -14, priority: null, defaultMedia: null }),
    ustep('set', 'Full set upload or long-form recap', '2027-01-09', { playbook: 'Post-Show', phase: 'Post-Show · Weeks 3–4', offset: 27 }),
    ustep('set-hand', 'Full set upload or long-form recap', '2027-01-16', { playbook: 'Post-Show', offset: 27 }),
    ustep('set-note', 'Full set upload or long-form recap', '2027-01-09', { playbook: 'Post-Show', offset: 27, notes: 'Hard deadline. Moved to Jan 9.' }),
    ustep('set-none', 'Full set upload or long-form recap', '2027-01-09', { playbook: 'Post-Show', offset: null }),
    ustep('set-old', 'Full set upload or long-form recap', '2026-12-31', { playbook: 'Post-Show', offset: 27, momentId: 'mo-old' }),
    ustep('set-early', 'Full set upload or long-form recap', '2026-11-19', { playbook: 'Post-Show', offset: 18, momentId: 'mo-early' }),
  ];
  const moments = [...UP_MOMENTS, { id: 'mo-early', title: 'Early Show', date: '2026-11-01', momentType: 'Show' }];
  const pieces = [
    upiece('p-set', 'set', 'Planned', '2027-01-09'),
    upiece('p-set-skipped', 'set', 'Skipped', '2027-01-09'),
    upiece('p-set-hand', 'set-hand', 'Planned', '2027-01-16'),
  ];
  const plan = planUpdate(steps, moments, UP_MASTERS, pieces, { ...UP_OPTS, noDates: ['mo-old'] }, ['2026-12', '2027-01']);
  const row = (id) => plan.rows.find((r) => r.stepId === id);
  const changed = (id) => Object.fromEntries(row(id).changes.map((c) => [c.field, c.to]));
  is('update: renamed to the master’s title', changed('ann').Item, 'Announce: crowd clip ending on the flyer, flyer story, event banner');
  is('update: Brief, Where and the rest are copied from the master', [changed('ann').Brief, changed('ann').Where], ['Open on the crowd.', 'Feed, story, event page']);
  is('update: a field the master leaves empty does not empty the step’s', 'Why It Matters' in changed('ann'), false);
  is('update: a field that already agrees is not written', ['Priority', 'Default Media', 'Pieces'].filter((f) => f in changed('ann')), []);
  is('update: it says what kind of update it is', [row('ann').why, row('give').why, row('set').why], ['rename + brief', 'rename + brief', 'rename + re-date + brief']);
  is('update: Priority and Default Media are filled where the step had none', [changed('give').Priority, changed('give')['Default Media']], ['Standard', 'Video']);
  is('update: Flow is never changed, only pointed out',
     ['Flow' in changed('give'), row('give').flags.some((f) => /Flow is "Blueprint makes \+ posts"/.test(f))], [false, true]);

  is('re-date: the master’s offset moved, so the date is the moment plus the new one',
     [changed('set')['Offset (days)'], changed('set').Date], ['14', '2026-12-27']);
  is('re-date: its Planned piece moves with it, and a Skipped one does not',
     row('set').pieces.map((p2) => [p2.id, p2.postDate]), [['p-set', '2026-12-27']]);
  is('re-date: a step that is not where its own offset puts it was placed by hand, and is left',
     ['Date' in changed('set-hand'), row('set-hand').pieces, row('set-hand').flags.some((f) => /it sits on 2027-01-16, not the 2027-01-09/.test(f))], [false, [], true]);
  is('re-date: Notes that say the date was set by hand leave it too',
     ['Date' in changed('set-note'), row('set-note').flags.some((f) => /Notes say the date was set by hand/.test(f))], [false, true]);
  is('re-date: a step with no offset has nothing to compare, so nothing is flagged or moved',
     ['Date' in changed('set-none'), row('set-none').flags], [false, []]);
  is('re-date: on a moment scheduled by hand the date is left and the rest still happens',
     ['Date' in changed('set-old'), 'Item' in changed('set-old'), row('set-old').flags.some((f) => /scheduled by hand/.test(f))], [false, true, true]);
  is('re-date: a new date that has already passed is flagged, and the date left',
     ['Date' in changed('set-early'), row('set-early').flags.some((f) => /already past/.test(f))], [false, true]);
  is('hand-dated: the three ways a date says a person chose it',
     [handDated({ notes: 'Rescheduled Nov 9 (was Nov 15).', date: '2026-11-18', offset: -28 }, '2026-12-13') !== null,
      handDated({ notes: null, date: '2026-11-18', offset: null }, '2026-12-13') !== null,
      handDated({ notes: null, date: '2026-11-18', offset: -28 }, '2026-12-13') !== null,
      handDated({ notes: 'Footage from the Nov 26 film session.', date: '2026-11-15', offset: -28 }, '2026-12-13')], [true, true, true, null]);

  // Month counts: what exists, and what the month comes to once every open step has its piece.
  const jan = plan.months.find((m) => m.month === '2027-01'), dec = plan.months.find((m) => m.month === '2026-12');
  is('months: a re-dated piece leaves one month and joins another', [jan.pieces, dec.pieces], [{ before: 2, after: 1 }, { before: 0, after: 1 }]);
  is('months: the projection adds the pieces open steps still owe', [jan.projected.before > jan.pieces.before, dec.projected.after >= dec.pieces.after], [true, true]);

  // Written, then planned again: nothing left to do.
  const after = applyPlan(steps, pieces, plan.rows);
  const again = planUpdate(after.steps, moments, UP_MASTERS, after.pieces, { ...UP_OPTS, noDates: ['mo-old'] });
  is('idempotent: run on its own result, it changes nothing', [again.counts.update, again.counts.skip, again.counts.add, again.writes], [0, 0, 0, 0]);
  is('idempotent: the flags it could not act on are still said', again.rows.some((r) => r.flags.length), true);
}

{
  // Adds: once per moment, only where nothing like it exists.
  const steps = [
    ustep('r-a', 'Full hook clip', '2027-01-08', { playbook: 'Release Rollout', momentId: 'mo-rel' }),
    ustep('o-a', 'Full hook clip', '2026-12-04', { playbook: 'Release Rollout', momentId: 'mo-old' }),
    ustep('x-a', 'Drop day post with the link', '2026-12-11', { playbook: 'Remix Drop', momentId: 'mo-remix' }),
    ustep('s-a', '"This week" hype clip', '2026-12-10', { offset: -3, priority: 'Core', brief: 'Fast cuts.' }),
  ];
  const plan = planUpdate(steps, UP_MOMENTS, UP_MASTERS, [], UP_OPTS);
  const adds = plan.rows.filter((r) => r.action === 'add');
  is('add: the step the playbook gained, on each campaign that runs it and has nothing like it',
     adds.map((r) => [r.momentId, r.date, r.add.flow]), [['mo-rel', '2026-11-29', 'Client task'], ['mo-remix', '2026-11-20', 'Blueprint task']]);
  is('add: not when its day has already passed', adds.some((r) => r.momentId === 'mo-old'), false);
  is('add: it brings the master’s offset, phase and reason', [adds[0].add.offset, adds[0].add.phase, adds[0].add.why], [-40, 'Wk −6 · Lock the Release', 'A crowd reaction sells the drop.']);
  is('add: a campaign on another playbook gets nothing', adds.some((r) => r.momentId === 'mo-show'), false);
  const has = planUpdate([...steps,
    ustep('r-b', 'Capture studio footage and test the track as an ID at shows (film the drop reaction)', '2026-11-29', { playbook: 'Release Rollout', momentId: 'mo-rel', flow: FILM_SESSION_FLOW }),
    ustep('x-b', 'Clear the remix: written permission from the original artist’s team', '2026-11-20', { playbook: 'Remix Drop', momentId: 'mo-remix', status: 'Done', flow: 'Blueprint task' }),
  ], UP_MOMENTS, UP_MASTERS, [], UP_OPTS);
  is('add: skipped when the campaign already has a step about playing the track as an ID, or the step itself in any status',
     has.rows.filter((r) => r.action === 'add'), []);
  is('add: never on a moment that is scheduled by hand',
     planUpdate(steps, UP_MOMENTS, UP_MASTERS, [], { ...UP_OPTS, noDates: ['mo-rel', 'mo-remix'] }).rows.filter((r) => r.action === 'add'), []);
  const after = applyPlan(steps, [], plan.rows);
  is('add: once added, it is not added again',
     planUpdate(after.steps, UP_MOMENTS, UP_MASTERS, [], UP_OPTS).rows.filter((r) => r.action === 'add'), []);
  is('scope: only the moments asked for',
     [...new Set(planUpdate(steps, UP_MOMENTS, UP_MASTERS, [], { ...UP_OPTS, moments: ['mo-remix'] }).rows.map((r) => r.momentId))], ['mo-remix']);
}

section('Update · the snapshot, and the checks after writing');

{
  const steps = [
    ustep('a', 'Announce: flyer, date, ticket link', '2026-11-18', { phase: 'Pre-Show · Announce', offset: -28, notes: 'Keep me.', brief: 'Old brief' }),
    ustep('b', 'Energy clip from a past show with a city callout', '2026-11-26', { offset: -17, notes: 'First line.' }),
    ustep('c', 'Full set upload or long-form recap', '2027-01-09', { playbook: 'Post-Show', offset: 27 }),
    ustep('d', '"This week" hype clip', '2026-12-10', { status: 'Done', offset: -3 }),
  ];
  const pieces = [upiece('pb', 'b', 'Planned', '2026-11-26', { notes: 'Piece note.' }), upiece('pc', 'c', 'Planned', '2027-01-09'),
                  upiece('pd', 'd', 'Posted', '2026-12-10')];
  const plan = planUpdate(steps, UP_MOMENTS, UP_MASTERS, pieces, UP_OPTS);
  const row = (id) => plan.rows.find((r) => r.stepId === id);
  const wa = stepWrite(row('a'), steps[0]);
  is('write: a rename and a brief, stamped as ours, and Notes left alone',
     [wa.Item.title[0].text.content, wa.Brief.rich_text[0].text.content, wa['Last Edited By'].select.name, 'Notes' in wa],
     ['Announce: crowd clip ending on the flyer, flyer story, event banner', 'Open on the crowd.', 'Blueprint', false]);
  const wb = stepWrite(row('b'), steps[1]);
  is('write: a skip appends the note under what was there', [wb.Status.select.name, wb.Notes.rich_text[0].text.content],
     ['Skipped', 'First line.\nRetired in playbook audit Nov 16']);
  is('write: the note is not written twice',
     stepWrite(row('b'), { ...steps[1], notes: 'First line.\nRetired in playbook audit Nov 16' }).Notes.rich_text[0].text.content, 'First line.\nRetired in playbook audit Nov 16');
  const wc = stepWrite(row('c'), steps[2]);
  is('write: a re-date sets the day and the offset together', [wc.Date.date.start, wc['Offset (days)'].number], ['2026-12-27', 14]);
  is('write: a piece follows its step', [pieceWrite(row('b').pieces[0], pieces[0]).Status.select.name, pieceWrite(row('c').pieces[0], pieces[1])['Post Date'].date.start],
     ['Skipped', '2026-12-27']);

  const ra = stepRestore(row('a'), steps[0]);
  is('restore: exactly the fields that were changed, as they were',
     [Object.keys(ra).sort(), ra.Item.title[0].text.content, ra.Brief.rich_text[0].text.content],
     [Object.keys(wa).filter((k) => k !== 'Last Edited By').sort(), 'Announce: flyer, date, ticket link', 'Old brief']);
  const rb = stepRestore(row('b'), steps[1]);
  is('restore: a skipped step gets its status and its Notes back', [rb.Status.select.name, rb.Notes.rich_text[0].text.content], ['Not Started', 'First line.']);
  is('restore: a re-dated step gets its day and offset back', [stepRestore(row('c'), steps[2]).Date.date.start, stepRestore(row('c'), steps[2])['Offset (days)'].number], ['2027-01-09', 27]);
  is('restore: a piece gets back what it held',
     [pieceRestore(row('b').pieces[0], pieces[0]).Status.select.name, pieceRestore(row('b').pieces[0], pieces[0]).Notes.rich_text[0].text.content,
      pieceRestore(row('c').pieces[0], pieces[1])['Post Date'].date.start], ['Planned', 'Piece note.', '2027-01-09']);

  const snap = buildSnapshot('3f7c8be8-be72-8123-a420-fb9aef6bc0e9', '2026-11-16T21:00:00.000Z', 'hq', plan.rows, { steps, pieces });
  is('snapshot: every row the run will touch, steps and pieces, and none it will not',
     snap.rows.map((r) => `${r.kind}:${r.id}`), ['step:a', 'step:b', 'piece:pb', 'step:c', 'piece:pc']);
  is('snapshot: it carries how things stood, for the checks', [snap.baseline.pastPlanned, Object.keys(snap.baseline.done)], [{ '2026-12': 1 }, ['d']]);
  const key = snapshotKey(snap.clientId, snap.at);
  is('snapshot: kept under the client, named for when it ran', key, 'hq/playbook-updates/3f7c8be8-be72-8123-a420-fb9aef6bc0e9/2026-11-16T21-00-00-000Z.json'.replace(/3f7c8be8-be72-8123-a420-fb9aef6bc0e9/, snapshotPrefix(snap.clientId).split('/')[2]));
  is('snapshot: a key is only ever one of this client’s runs',
     [isSnapshotKey(key, snap.clientId), isSnapshotKey(key, 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'),
      isSnapshotKey(`${snapshotPrefix(snap.clientId)}../../reports/x.json`, snap.clientId), isSnapshotKey(`reports/sean-comma/2026-11.pdf`, snap.clientId), isSnapshotKey(7, snap.clientId)],
     [true, false, false, false, false]);
  is('snapshot: not under any prefix a client’s session may read', /^(reports|audits|briefs)\//.test(key), false);

  // A bucket that is an object in memory.
  const store = new Map();
  const bucket = { put: async (k, v) => { store.set(k, v); }, get: async (k) => (store.has(k) ? { text: async () => store.get(k) } : null),
    list: async ({ prefix }) => ({ objects: [...store.keys()].filter((k) => k.startsWith(prefix)).map((k) => ({ key: k })), truncated: false }) };
  const k1 = await putSnapshot(bucket, snap);
  const k2 = await putSnapshot(bucket, { ...snap, at: '2026-11-17T09:00:00.000Z' });
  await putSnapshot(bucket, { ...snap, clientId: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', at: '2026-12-01T00:00:00.000Z' });
  is('snapshot: read back whole', (await getSnapshot(bucket, k1)).rows.length, 5);
  is('snapshot: the newest run is this client’s newest, not anybody’s', await latestSnapshotKey(bucket, snap.clientId), k2);
  is('snapshot: a key with nothing behind it is nothing', await getSnapshot(bucket, 'hq/playbook-updates/none.json'), null);

  // The checks.
  const base = baselineOf(steps, pieces);
  const after = applyPlan(steps, pieces, plan.rows);
  is('checks: a clean run passes all three', checkUpdate(base, after.steps, after.pieces, UP_MOMENTS, UP_MASTERS), []);
  is('checks: a piece past Planned that moved or vanished is a failure',
     checkUpdate(base, after.steps, after.pieces.map((p2) => (p2.id === 'pd' ? { ...p2, status: 'Skipped' } : p2)), UP_MOMENTS, UP_MASTERS),
     ['Pieces past Planned in 2026-12 went from 1 to 0']);
  is('checks: a Done step that changed is a failure',
     checkUpdate(base, after.steps.map((s2) => (s2.id === 'd' ? { ...s2, brief: 'Touched' } : s2)), after.pieces, UP_MOMENTS, UP_MASTERS),
     ['A Done step changed: ""This week" hype clip"']);
  is('checks: two open steps from one master on one moment is a failure',
     checkUpdate(base, [...after.steps, ustep('dup', 'Announce: flyer, date, ticket link', '2026-11-19')], after.pieces, UP_MOMENTS, UP_MASTERS),
     ['Christmas Show has 2 open steps from "Announce: crowd clip ending on the flyer, flyer story, event banner"']);
  is('checks: a closed duplicate is not one', duplicateMasters([...after.steps, ustep('dup', 'Announce: flyer, date, ticket link', '2026-11-19', { status: 'Skipped' })], UP_MOMENTS, UP_MASTERS), []);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
