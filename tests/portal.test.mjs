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
  CLIENT_NEVER_SEND,
  CALENDAR_NEVER_SEND,
  SNAPSHOT_NEVER_SEND,
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

const midTerm = termProgress('2026-09-01', '2027-03-01', new Date(2026, 9, 15));
is('term: month 2 of 6', [midTerm.month, midTerm.total], [2, 6]);
// Sep 1 to Mar 1 is 181 days; Oct 15 is day 44.
is('term: the bar is a real fraction of the term', midTerm.fraction.toFixed(3), (44 / 181).toFixed(3));
is('term: the bar never exceeds 1',
   termProgress('2026-09-01', '2027-03-01', new Date(2028, 0, 1)).fraction, 1);
is('term: the bar never goes negative',
   termProgress('2026-09-01', '2027-03-01', new Date(2026, 0, 1)).fraction, 0);
is('term: clamps past the end',
   termProgress('2026-09-01', '2027-03-01', new Date(2028, 0, 1)).month, 6);
is('term: clamps before the start',
   termProgress('2026-09-01', '2027-03-01', new Date(2026, 0, 1)).month, 1);
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
];

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

is('calendar: hidden and admin rows are dropped', calendar.length, 2);
is('calendar: sorted by date', calendar.map(i => i.date), ['2026-10-31', '2026-11-14']);
is('calendar: artist prefix gone and TENTATIVE is a flag',
   calendar.map(i => [i.title, i.tentative]),
   [['Teaser 1', false], ['Red Rocks', true]]);
is('calendar: Auto Date fills in for a step with no Date', calendar[0].date, '2026-10-31');
is('calendar: a javascript: link is not passed through', calendar[0].ticketLink, null);
is('calendar: a real ticket link survives', calendar[1].ticketLink, 'https://tickets.example.com/abc');
is('calendar: venue kept', calendar[1].venueCity, 'Red Rocks, Morrison CO');
is('calendar: why it matters kept', calendar[1].whyItMatters, 'Biggest room this year.');

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

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
