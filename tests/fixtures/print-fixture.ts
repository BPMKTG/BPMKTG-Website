/* ──────────────────────────────────────────────────────────────
   Real rows, copied once, so the tests and the render harness are
   looking at the same documents Mason will.

   Every value here came out of Notion on 2026-11-04: Sean Comma's
   Baseline snapshot (KPI Snapshots), his Growth Audit row and page
   body (Audits), and the Campaign Calendar moments around them. A
   handwritten fixture would be tidier and would not have caught the
   things this one caught, like a baseline with no Win line and a
   "what's working" table with six rows instead of three.

   Nothing in here is secret. It is the same data the client sees in
   their own portal.
   ────────────────────────────────────────────────────────────── */

import type {
  AuditHeading,
  AuditInput,
  AuditSection,
  ReportInput,
  ReportSnapshot,
} from '../../src/data/print';
import type { PortalCalendarItem, PortalClient } from '../../src/data/portal';

export const CLIENT: PortalClient = {
  artist: 'Sean Comma',
  tier: 'Tier 3 · Fan Growth Engine',
  stage: 'Active',
  termStart: '2026-11-01',
  termEnd: '2027-04-30',
  announcement: null,
  driveFolder: null,
  contentVault: null,
  roadmapLink: null,
  accessComplete: true,
  goals: null,
  goalDeadline: '2027-01-30',
  goalInstagramFollowers: 5000,
  goalSongsAt10k: 3,
  goalShowsPerMonth: 2,
};

export const BASELINE: ReportSnapshot = {
  id: '3f9c8be8be728130861ad19363008c6f',
  date: '2026-10-26',
  type: 'Baseline',
  growthScore: 22,
  summary: "Where we're starting. Your shows are already working: Rooftop Revival sold out (107 tickets) and gave your Instagram its best month, with 72.9K views and +127 net followers. Your content travels too. TikTok had 69.6K views and 1,000 shares in the last 28 days. The gap is everything around that attention: nothing turns new viewers into fans you can reach again, and streaming is riding one playlist, not loyal listeners. Over the next 90 days we'll do three things: capture the attention you earn, turn your shows into a monthly growth engine, and give every release a real rollout. Every number on this page is the starting line we'll measure against.",
  // A baseline has none of these. That is the point of using it as a
  // fixture: the report has to read without a headline.
  win: null,
  watch: null,
  focus: [null, null, null],
  releaseNotes: null,
  published: true,
  reportPdf: null,
  publishedAt: null,
  metrics: {
    'Apple Music · Plays (28d)': 133,
    'Apple Music · Shazams (28d)': 1,
    'Email + SMS List': 902,
    'Email · Click Rate': 0.0078,
    'Email · Open Rate': 0.1053,
    'Facebook · Followers': 1159,
    'Facebook · Net Follows (28d)': 4,
    'Facebook · Posts': 7,
    'Facebook · Views (28d)': 39100,
    'Instagram · Avg Views': 1195,
    'Instagram · Avg Watch Time (sec)': 6,
    'Instagram · Engagement': 0.074,
    'Instagram · Followers': 3117,
    'Instagram · Net Follows (28d)': 127,
    'Instagram · Posts': 17,
    'Instagram · Reach (28d)': 23100,
    'Instagram · Views (28d)': 72900,
    'Shows This Month': 2,
    'SoundCloud · Followers': 3817,
    'SoundCloud · Top Track Plays': 9583,
    'Spotify · Active Listeners': 148,
    'Spotify · Followers': 169,
    'Spotify · Monthly Listeners': 766,
    'Spotify · Playlist Adds (28d)': 49,
    'Spotify · Saves (28d)': 29,
    'Spotify · Streams (28d)': 1500,
    'Spotify · Top Track Streams': 1455,
    'Tickets Sold': 107,
    'TikTok · Avg Views': 1149,
    'TikTok · Engagement': 0.072,
    'TikTok · Followers': 4916,
    'TikTok · Net Follows (28d)': 1400,
    'TikTok · Posts': 17,
    'TikTok · Profile Views (28d)': 1000,
    'TikTok · Search Share': 0.199,
    'TikTok · Shares (28d)': 1000,
    'TikTok · Views (28d)': 69600,
    'X · Followers': 628,
    'YouTube · Avg Views': 31,
    'YouTube · Posts': 0,
    'YouTube · Subscribers': 41,
    'YouTube · Views (28d)': 31,
    'YouTube · Watch Hours (28d)': 0.5,
  },
};

/**
 * A second month, invented from the baseline.
 *
 * The only fabricated numbers in this file, and they exist to test one
 * thing the real data cannot: a month WITH deltas. Everything moves,
 * including two numbers that go down, because an orange arrow is as
 * much of the design as a navy one.
 */
export const NOVEMBER: ReportSnapshot = {
  ...BASELINE,
  id: '0000000000004000800000000000000b',
  date: '2026-11-30',
  type: 'Monthly',
  growthScore: 26,
  summary: 'A strong first month. The Faith Rave sold out again and the Rooftop Remix gave us a real rollout to run, which is two of the three things we said we would do in the first ninety days.',
  win: 'The Faith Rave sold out in nine days and brought 1,340 new followers with it, which is ten months of your old growth rate in one night.',
  watch: 'Spotify monthly listeners are still sliding. One playlist carries most of the streams and that playlist is shrinking.',
  focus: [
    'Capture every room — a QR code on stage and a Laylo page in every bio, so a sold-out night becomes a list you own',
    'Run the December rollout properly — If The Devil Had His Way gets a full four-week runway rather than a post on release day',
    'Two shows a month — the Faith Rave works, so the only question left is how often we can run it',
  ],
  releaseNotes: 'Rooftop Remix was SoundCloud-only and still did 4,100 plays in a fortnight. The DJ edits are what moved it: three plays from Austin DJs in the first week.',
  published: true,
  reportPdf: null,
  publishedAt: null,
  metrics: {
    ...BASELINE.metrics,
    'Instagram · Followers': 4457,
    'Instagram · Net Follows (28d)': 1340,
    'Instagram · Views (28d)': 184200,
    'Instagram · Avg Views': 2740,
    'Instagram · Engagement': 0.081,
    'Instagram · Avg Watch Time (sec)': 9,
    'Instagram · Posts': 21,
    'TikTok · Followers': 6880,
    'TikTok · Net Follows (28d)': 1964,
    'TikTok · Views (28d)': 211400,
    'TikTok · Avg Views': 3120,
    'TikTok · Posts': 22,
    'Spotify · Monthly Listeners': 702,
    'Spotify · Streams (28d)': 1320,
    'Email + SMS List': 1486,
    'Tickets Sold': 164,
    'Shows This Month': 2,
  },
};

const moment = (over: Partial<PortalCalendarItem>): PortalCalendarItem => ({
  id: '',
  title: '',
  tentative: false,
  kind: 'Moment',
  momentType: null,
  date: null,
  status: 'Not Started',
  type: null,
  owner: null,
  playbook: null,
  phase: null,
  where: null,
  whyItMatters: null,
  venueCity: null,
  ticketLink: null,
  moment: null,
  streamsToDate: null,
  ticketsSold: null,
  capacity: null,
  ...over,
});

export const CALENDAR: PortalCalendarItem[] = [
  moment({
    id: '402c8be8be7281dfb5b7f5e9667f1e44',
    title: 'Rooftop Revival',
    momentType: 'Show',
    date: '2026-10-18',
    status: 'Done',
    venueCity: 'Austin, TX',
    ticketsSold: 107,
    capacity: 107,
  }),
  moment({
    id: '402c8be8be7281ed92b1e6c27779314b',
    title: 'Rooftop Remix',
    momentType: 'Release',
    date: '2026-11-13',
    where: 'SoundCloud',
  }),
  moment({
    id: '406c8be8be728177b176dd370f2500c3',
    title: 'Faith Rave (Nov)',
    momentType: 'Show',
    date: '2026-11-15',
    venueCity: 'Austin, TX',
    ticketsSold: 164,
    capacity: 180,
  }),
  moment({
    id: '402c8be8be728135ae8acfb7292eb5a1',
    title: 'If The Devil Had His Way',
    momentType: 'Release',
    date: '2026-12-04',
  }),
  moment({
    id: '406c8be8be72815d9292f9e29f9ff1d3',
    title: 'Christmas Remix',
    momentType: 'Release',
    date: '2026-12-11',
  }),
  moment({
    id: '406c8be8be7281379329cc276e5c2e8a',
    title: 'Christmas Show',
    momentType: 'Show',
    date: '2026-12-13',
    venueCity: 'Austin, TX',
  }),
  // A client step, so the "yours to do" list on the last page has
  // something in it.
  {
    ...moment({
      id: '0000000000004000800000000000000c',
      title: 'Record three drop-reaction clips',
      date: '2026-12-02',
      status: 'Not Started',
    }),
    kind: 'Step',
    type: 'Content',
    owner: 'Client',
  },
];

export const BASELINE_REPORT: ReportInput = {
  client: CLIENT,
  slug: 'sean-comma',
  snapshot: BASELINE,
  previous: null,
  baseline: null,
  posts: [],
  calendar: CALENDAR,
  releaseStats: {},
  termMonth: null,
  heroImage: null,
};

export const MONTHLY_REPORT: ReportInput = {
  client: CLIENT,
  slug: 'sean-comma',
  snapshot: NOVEMBER,
  previous: BASELINE,
  baseline: BASELINE,
  posts: [
    {
      title: 'Faith Rave announcement',
      bucket: 'Show Promo',
      source: 'Flyer / Graphic',
      platforms: ['Instagram', 'TikTok'],
      postDate: '2026-11-02',
      views: 18400,
      shares: 2140,
      saves: 612,
    },
    {
      title: 'JESUS IS ALIVE mashup',
      bucket: 'Release Promo',
      source: 'Client Films',
      platforms: ['Instagram', 'TikTok', 'Facebook'],
      postDate: '2026-11-09',
      views: 11250,
      shares: 980,
      saves: 404,
    },
    {
      title: 'Rooftop Remix drop reaction',
      bucket: 'Release Promo',
      source: 'Client Films',
      platforms: ['TikTok'],
      postDate: '2026-11-13',
      views: 9870,
      shares: 1210,
      saves: 288,
    },
    {
      title: 'Faith Rave sold out, from the stage',
      bucket: 'Live Performance',
      source: 'Show Media',
      platforms: ['Instagram'],
      postDate: '2026-11-16',
      views: 7640,
      shares: 410,
      saves: 190,
    },
    {
      title: 'What is a worship rave',
      bucket: 'Talking Head',
      source: 'Client Films',
      platforms: ['Instagram', 'TikTok'],
      postDate: '2026-11-22',
      views: 4310,
      shares: 266,
      saves: 155,
    },
    {
      title: 'Behind the Christmas remix',
      bucket: 'Release Promo',
      source: 'Client Films',
      platforms: ['TikTok'],
      postDate: '2026-12-03',
      views: null,
      shares: null,
      saves: null,
    },
  ],
  calendar: CALENDAR,
  releaseStats: {
    '402c8be8be7281ed92b1e6c27779314b': {
      plays: 4100,
      downloads: 312,
      djSupport: 3,
      streams: null,
    },
  },
  termMonth: { month: 1, total: 6 },
  heroImage: null,
};

/* ── the audit ────────────────────────────────────────────────── */

const sec = (over: Partial<AuditSection>): AuditSection => ({
  rows: [], items: [], paragraphs: [], ...over,
});

/**
 * Sean's audit page body, as notion-blocks.ts flattens it.
 *
 * Transcribed from the real page rather than written for the test, so
 * the row counts, the bullet lengths and the "The fix" bullet at the
 * end of the momentum section are all the shapes the templates will
 * actually meet.
 */
export const SECTIONS: Partial<Record<AuditHeading, AuditSection>> = {
  'Snapshot: music and business': sec({
    rows: [
      ['Spotify monthly listeners', '766', 'Down 24% vs. the previous 28 days'],
      ['Spotify streams (28 days)', '1.5K', 'Down 13.6%. Alive Again is 1,455 of them; Road to Damascus 49, Front & Center 38'],
      ['Spotify followers', '169', 'Up 5.6%. Saves 29, playlist adds 49 (down 33%)'],
      ['Apple Music (28 days)', '133 plays · 1 Shazam', 'Road to Damascus leads on Apple (66 plays) and passed 500 US plays Oct 15'],
      ['SoundCloud followers', '3,817', 'Top track is a secular remix (Stay Fly, 9,583); top faith-era track Alive Again (3,264)'],
      ['Shows per month', '1–2', 'Rooftop Revival (Oct 18) sold out and raised $500+ for the Tim Tebow Foundation'],
      ['Email list', '~900', 'HubSpot: 3,158 contacts total; the Oct 16 email reached 902 (10.5% open, 0.8% click)'],
      ['SMS list', '0', 'Laylo: two draft drops, no fans, no integrations connected'],
    ],
  }),
  'Snapshot: social': sec({
    rows: [
      ['Instagram', '3,117', '72.9K views · 23.1K reach · +127 net followers', '1,195', '7.4% of views', '17'],
      ['TikTok', '4,916', '69.6K views · 1K profile views · 1K shares · +1.4K net followers', '1,149 (last 10)', '7.2% of views', '17'],
      ['Facebook', '1,159', '39.1K views · 16.7K viewers · +4 net followers', '—', '201 interactions', '7'],
      ['YouTube', '41', '31 views · 0.5 watch hours', '—', '—', '0'],
      ['X', '628', 'No visible posts', '—', '—', '0'],
    ],
  }),
  'Profile and positioning': sec({
    rows: [
      ['Handle consistent across platforms', 'Partly', '@seancomma everywhere except YouTube (@sean-comma)'],
      ['Bio says who you are and what you sound like', 'Mixed', 'Instagram, TikTok, SoundCloud, and Spotify are strong ("#FAITHBASS · Bass Music for Believers"). X is stale (Denver, old pre-save)'],
      ['Link in bio goes somewhere useful', 'No', 'Bios pointed to Rooftop Revival tickets after the show. Replace with a Laylo page that captures fans'],
      ['Catalog matches the brand', 'No', 'SoundCloud still shows secular remixes and an original titled "MDMA." Decision: hide, archive, or reframe as testimony'],
      ['Audience matches the brand', 'Partly', "Facebook's audience is mostly from his Denver era (Denver is its #1 city; Austin is 1.3%). Instagram is Austin-led but only 7.7%"],
    ],
  }),
  "What's working": sec({
    rows: [
      ['Rooftop Revival promo reel ("Austin\'s first rooftop worship rave," Oct 15)', '613', '162 shares on 613 views: people sent it to friends to invite them. Shareable event invites sell tickets'],
      ['"JESUS IS ALIVE" Forrest Frank mashup (Oct 8)', '2,052', 'Best reach (1,768) and 11 follows, the most of any post. Riding a known faith-crossover artist works'],
      ['Rooftop Revival recap carousel, sold out + donation (Oct 19)', '1,885', '18 comments from a "comment INFO" call to action: built-in lead capture'],
      ['TikTok: Sunset Service full-set promo (Jul 21)', '1.2M', '81.9K shares. The worship-rave concept is the hook. Still drew 13K views this month'],
      ['TikTok: "We are God\'s dogs" (Apr 9)', '423K', 'A 7-month-old video that still drew 26K views this month, his top TikTok in the period. Faith humor travels'],
      ['TikTok: "JUST ANNOUNCED" Rooftop Revival (Oct 1)', '8.8K', '946 likes. His best new post of the month: an event announcement'],
    ],
  }),
  "What's not": sec({
    rows: [
      ['"All Ages, Family Friendly" reel (Oct 15)', '134', '2 interactions, 4-second average watch. Information-first, no hook'],
      ["Viral TikTok's call to action", '1.2M → ~290', "Sent viewers to YouTube. TikTok doesn't even appear in the set's YouTube traffic sources; at most ~90 views came from TikTok"],
    ],
  }),
  'The pattern': sec({
    paragraphs: [
      "Average watch time on Instagram reels is 4–9 seconds, so openers aren't holding people yet. On TikTok, two old pinned videos drove about 39K of his 69.6K views this month; new posts mostly land between 230 and 900 views, with announcements and hype posts (8.8K, 3.5K, 3.3K) as the exceptions. His post-show posts underperformed (341 and 470 views). TikTok volume is solid (17 posts in 28 days); Instagram picked up in October.",
    ],
  }),
  'Audience and engagement': sec({
    items: [
      'Instagram: 25–34 is the core (56%), 18–44 is 89%. 69% men, 31% women. US 73%; Austin is the top city at only 7.7%.',
      'TikTok: 66% men, 25–34 is 54%. Only 45% US: Brazil, Colombia, Argentina, Peru, Mexico, and Chile add up to about a third. Search drives 20% of views.',
      'Facebook: 89% men, and still mostly his Denver-era audience. A crossposting channel, not a growth engine yet.',
      'Reach is mostly new people: 95% of Instagram reach and 97% of Facebook views came from non-followers. Discovery works; conversion to follows is the gap (170 follows from 23.1K reached).',
      'DMs: 84 Instagram conversations started, 72% response rate. A real community channel.',
      'Ideal vs. actual: matches the ideal fan’s age (20–40). Women and Austin locals are underrepresented relative to filling local shows.',
    ],
  }),
  'Show and release momentum': sec({
    items: [
      'Shows are his growth engine. Instagram views jumped about 4x during Rooftop Revival week, and it sold out. The next event should be on the calendar before this momentum fades.',
      'Streaming rides playlists, not fans. Alive Again surged to 250–500 streams a day Jul 13 – Aug 30, then fell overnight from 355 to 38 on Aug 31, the signature of losing a large playlist placement. Since September it averages about 55 a day, and one curator playlist (Dubstep Mashups & Remixes) supplies about 80% of Alive Again’s streams (1,157 of 1,455 in 28 days).',
      'Nothing else is building momentum: Road to Damascus and Front & Center drew under 100 streams combined in 28 days. Road to Damascus does better on Apple Music.',
      "Shows bring new listeners, but they don't stick. Monthly active listeners climbed about 23% in the Rooftop Revival run-up, nearly all light listeners (~88 → ~118). Super listeners are near zero, and daily streams stayed flat (46 on show day).",
      'Biggest gap: capture. About 900 emailable contacts and a working email habit (10.5% open rate), but no SMS list, Laylo isn’t connected to Instagram, Spotify, or Eventbrite, and the bio links pointed to a past show.',
      'The fix: point every crowd to his music (a QR code or "stream Alive Again" call to action from the stage and in post-show content), then follow up through Laylo and pre-saves to turn light listeners into repeat fans.',
    ],
  }),
  'Footage and assets': sec({
    items: [
      'What exists: live show footage, photos, talking-to-camera, press photos and brand assets in Drive. He hires a shooter for shows.',
      'Missing: studio and production clips, drop-reaction clips of unreleased IDs, testimony content.',
      'Capture plan: brief every shooter for vertical drop-reaction clips and a next-day hero photo.',
    ],
  }),
  'Scorecard notes': sec({
    items: [
      'Profile and positioning: Strong bios, but stale calls to action, a dormant X, and a catalog conflict',
      'Posting consistency: TikTok is consistent (17 posts in 28 days); Instagram only picked up in October',
      'Hook strength: 4–9 second average watch time on reels; one TikTok breakout',
      'Format fit: Worship rave and faith-crossover mashups are proven; not yet repeatable series',
      'Show leverage: Sold out, a donation story, and a 4x lift in Instagram views',
      'Release leverage: Listeners down 24%, one song carrying streams, ~80% of it from one curator playlist; no rollouts',
      'Fan capture: ~900 emailable and a working email habit; no SMS and nothing capturing new fans',
      'Brand clarity: "Faith Bass" is clear and ownable; the older catalog muddies it',
    ],
  }),
  'Top opportunities': sec({
    items: [
      'Capture the attention he already earns | High | Low | One destination in every bio that collects fans (Laylo), connected to Instagram (comment-to-join), Spotify (pre-saves), and Eventbrite (ticket buyers) | This week: connect Laylo’s integrations, swap bios to the Laylo page, and email the ~900 list to opt in to SMS',
      'Turn his own events into a monthly growth engine | High | Medium | Rooftop Revival proved the format: sold out, a giving-back story, and his best month on Instagram | Lock the next event date on the kickoff call and run Pre-Show, Show Night, and Post-Show',
      'Give every release a real rollout | High | Medium | Reverse the listener decline with release rollouts, DJ promo, curators, and faith-crossover mashups like the one that drove his most follows | Lock the first release date. Early December fits a full rollout',
    ],
  }),
  'Recommended direction': sec({
    items: [
      'Formats: worship-rave live moments, shareable event invites, faith-crossover mashups (Forrest Frank, Hulvey), testimony to camera, sound design breakdowns, "what is a worship rave" explainers.',
      'Hooks: lead with the drop or the crowd in the first second. Current reels lose people in 4–9 seconds.',
      'Cadence: Reels and TikTok 4–5 times a week each (shared cuts), Facebook crossposting, daily stories in show and release weeks. About 16–20 videos a month.',
      'One destination: every post points to Laylo. "Comment INFO" style calls to action, connected to Laylo, turn comments into contacts automatically.',
      'Stop doing: calls to action pointing to past events, sending TikTok viewers to YouTube, information-first promo reels.',
    ],
  }),
  'Next 30 days': sec({
    items: [
      'Connect Laylo to Instagram, Spotify, and Eventbrite; swap bios to the Laylo page',
      "Email the ~900 list: Rooftop Revival recap, what's next, SMS opt-in",
      'Lock the next event date and start its Pre-Show playbook',
      'Finish Rooftop Revival post-show content, including the full set upload',
      'Lock the first release date and run it on a rollout',
    ],
  }),
  'For our call': sec({
    items: [
      'The win: Rooftop Revival sold out and gave back $500+. What made it work, and how often can you run one?',
      'Catalog: hide, archive, or reframe the secular remixes and "MDMA"?',
      'Releases: which tracks get the full rollout, and is early December realistic for the first one?',
      "Targets: 5K Instagram followers in 90 days means about +630 a month; October did +127 with a sold-out show. 10K streams per track compares to Alive Again's ~1,455 a month. What would make January feel like a win?",
      'Spotify: what happened around Aug 31? Can a stage QR code or stream call to action, plus a Laylo follow-up, turn crowds into repeat listeners?',
      'Women and Austin locals: both are underrepresented. Any partners (churches, campus groups, women-led creators) worth bringing in?',
      "TikTok's international audience: about a third of TikTok followers are in Latin America. Lean in (Spanish captions, worship in Spanish) or keep the focus on the US and Austin?",
    ],
  }),
};

export const SCORES: Record<string, number | null> = {
  'Score · Profile and positioning': 3,
  'Score · Posting consistency': 3,
  'Score · Hook strength': 2,
  'Score · Format fit': 3,
  'Score · Show leverage': 4,
  'Score · Release leverage': 1,
  'Score · Fan capture': 2,
  'Score · Brand clarity': 4,
};

export const CLIENT_AUDIT: AuditInput = {
  id: '40ec8be8be728165a4d8cefcd9e48411',
  title: 'Sean Comma · Growth Audit · Oct 2026',
  subject: 'Sean Comma',
  audience: 'Client',
  status: 'Sent',
  auditDate: '2026-10-26',
  dataWindow: '28 days · Sep 28 – Oct 25',
  platformsReviewed: 'Instagram, TikTok, Facebook, YouTube, X, Spotify, Apple Music, SoundCloud, email, SMS',
  shortVersion: "Sean's live events are working. Rooftop Revival sold out, raised $500+ for the Tim Tebow Foundation, and drove his best month on Instagram: 72.9K views and +127 net followers in 28 days. His content travels too: one TikTok hit 1.2M plays and 81.9K shares. What's missing is the system around it. That viral clip produced about 290 YouTube views, nothing collects new fans (Laylo has none), and streaming is shrinking (Spotify listeners down 24%). The opportunity: capture the attention his shows already earn, run his own events as a monthly growth engine, and give every release a real rollout.",
  positioningRead: '"Faith Bass" and "Bass Music for Believers" are rare, clear, and ownable. The Rooftop Revival recap shows the strongest version of the brand: sold out, worship, and giving back. That story, a movement and not just shows, should be front and center.',
  offer: null,
  bookACallLink: null,
  scores: SCORES,
  sections: SECTIONS,
  missing: [],
  slug: 'sean-comma',
};

/** The same audit as a teardown. Only the closing band differs, and
 *  this is how the test proves it: a prospect must not be told about
 *  a portal they do not have. */
export const PROSPECT_AUDIT: AuditInput = {
  ...CLIENT_AUDIT,
  id: '0000000000004000800000000000000a',
  audience: 'Prospect',
  status: 'Ready',
  subject: 'Sean Comma',
  offer: 'Tier 3 · Fan Growth Engine, $3,500 a month, six months. Content system, campaign calendar, show and release playbooks, and this scorecard re-scored at day 90.',
  bookACallLink: 'https://bpmktg.com/book',
  slug: null,
};
