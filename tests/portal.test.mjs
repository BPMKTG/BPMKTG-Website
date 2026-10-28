import {
  // shaping
  cleanItemTitle,
  isVisibleToClient,
  isMetricProp,
  isEngagementMetric,
  formatEngagement,
  isOpenClientTodo,
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
  stampClientEdit,
  isSameOrigin,
  isJsonRequest,
  // auth
  checkPortalKey,
  timingSafeEqual,
  mintSession,
  verifySession,
  sessionCookie,
  readCookie,
  isValidSlug,
  portalNotFound,
  // notion
  findClientBySlug,
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

/* ══ 5. Key checks: every failure is the same failure ════════════ */

const KEY = 'k_7f3a91c24e8b45d6a0f1';
const OTHER_KEY = 'k_11112222333344445555';

ok('key: the right key for an enabled portal opens it', await checkPortalKey(KEY, KEY, true));
is('key: wrong key fails', await checkPortalKey('wrong', KEY, true), false);
is('key: right key but portal disabled fails', await checkPortalKey(KEY, KEY, false), false);
is('key: another client\'s key fails', await checkPortalKey(OTHER_KEY, KEY, true), false);
is('key: a blank stored key never matches a blank supplied key',
   await checkPortalKey('', '', true), false);
is('key: a blank stored key is not opened by anything',
   await checkPortalKey(KEY, '', true), false);

// The three named failure modes must be indistinguishable to a caller.
const failures = [
  await checkPortalKey('wrong', KEY, true),       // wrong key
  await checkPortalKey(KEY, KEY, false),          // portal disabled
  await checkPortalKey(OTHER_KEY, KEY, true),     // key for another client
];
is('key: wrong / disabled / other-client all return the same thing',
   new Set(failures).size, 1);
is('key: and that thing is false', failures, [false, false, false]);

// ...and the response they produce is byte-identical.
const bodies = await Promise.all([portalNotFound(), portalNotFound(), portalNotFound()].map(r => r.text()));
const statuses = [portalNotFound().status, portalNotFound().status, portalNotFound().status];
is('404: identical bodies', new Set(bodies).size, 1);
is('404: identical statuses', new Set(statuses).size, 1);
is('404: says nothing about why', bodies[0], JSON.stringify({ ok: false, error: 'not_found' }));

ok('compare: equal strings match', await timingSafeEqual('abc', 'abc'));
is('compare: different lengths do not match', await timingSafeEqual('abc', 'abcd'), false);

/* ══ 6. Sessions ═════════════════════════════════════════════════ */

const SECRET = 'test-secret-value-at-least-16';
const token = await mintSession(SECRET, 'sean-comma');

ok('session: a fresh token verifies', await verifySession(SECRET, 'sean-comma', token));
is('session: a token for another slug is rejected',
   await verifySession(SECRET, 'other-act', token), false);
is('session: a token signed with another secret is rejected',
   await verifySession('a-completely-different-secret', 'sean-comma', token), false);
is('session: a tampered signature is rejected',
   await verifySession(SECRET, 'sean-comma', token.replace(/.$/, c => (c === 'a' ? 'b' : 'a'))), false);
is('session: no token is rejected', await verifySession(SECRET, 'sean-comma', null), false);
is('session: garbage is rejected', await verifySession(SECRET, 'sean-comma', 'nonsense'), false);
is('session: an expired token is rejected',
   await verifySession(SECRET, 'sean-comma', await mintSession(SECRET, 'sean-comma', Date.now() - 40 * 24 * 3600 * 1000)),
   false);

const cookie = sessionCookie('sean-comma', token);
ok('cookie: scoped to the one client', cookie.includes('Path=/portal/sean-comma'));
ok('cookie: HttpOnly', cookie.includes('HttpOnly'));
ok('cookie: Secure', cookie.includes('Secure'));
ok('cookie: SameSite=Lax', cookie.includes('SameSite=Lax'));
is('cookie: read back out', readCookie(`a=1; bp_portal=${token}; b=2`, 'bp_portal'), token);
is('cookie: a missing cookie reads as null', readCookie('a=1', 'bp_portal'), null);

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
      'Growth Score (/40)': { type: 'number', number: 21 },
      'Instagram · Followers': { type: 'number', number: 12400 },
      'Instagram · Engagement': { type: 'number', number: 0.042 },
      'Email + SMS List': { type: 'number', number: 610 },
      'Spotify · Monthly Listeners': { type: 'number', number: 11200 },
      'Notes': { type: 'rich_text', rich_text: [{ plain_text: 'INTERNAL-SNAPSHOT-NOTE' }] },
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

// The server does hold the key, so the comparison can happen at all.
// It just lives outside the payload.
is('whitelist: the key is kept server-side for the compare', record.portalKey, 'SUPERSECRETPORTALKEY');
is('whitelist: and not on the client object', 'portalKey' in record.client, false);

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

const stamped = stampClientEdit(buildContentProperties({ caption: 'x' }, ctx()).properties);
is('build: every client write is stamped Client',
   stamped['Last Edited By'].select.name, 'Client');
is('build: the stamp is not something the request can set',
   stampClientEdit(
     buildContentProperties({ 'Last Edited By': { select: { name: 'Blueprint' } } }, ctx()).properties,
   )['Last Edited By'].select.name, 'Client');

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
