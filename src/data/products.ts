// ─────────────────────────────────────────────────────────────
// Digital product data
//
// Source of truth for copy is the Notion "Product Catalog — Copy
// Reference" page; this file is its shipped form. Em dashes from
// the catalog are converted on the way in, per the site-wide rule.
//
// Each product routes at /products/<slug> via the dynamic route
// src/pages/products/[slug].astro. Adding a product = adding an
// entry to `products` below. The shop index at /products renders
// the same records as cards.
//
// `status` gates whether a buy button appears at all:
//   'available' — the files exist and can be delivered today
//   'in-build'  — listed and described, but not purchasable yet
// Nothing here should say a file is buyable before it exists.
// ─────────────────────────────────────────────────────────────

// 'available'  — exists, delivers today, safe to take money for
// 'in-build'   — the thing does not exist yet
// 'unproven'   — the thing is finished and tested, but has never been
//                run for real. Deliberately distinct from 'in-build':
//                saying "in build" about a finished product would be as
//                inaccurate as saying "buy now" about an untested one.
export type ProductStatus = 'available' | 'in-build' | 'unproven';

/** Which audience a product is sold to. The shop splits on this. */
export type ProductTrack = 'artist' | 'creator';

export interface ProductFile {
  name: string;
  purpose: string;
}

export interface ProductPoint {
  title: string;
  body: string;
}

export interface ProductHighlight {
  value: string;
  unit: string;
}

export interface Product {
  slug: string;
  number: string;          // HUD marker numeral on the detail hero
  name: string;
  shortName: string;
  subtitle: string;        // "Media Brief & Post-Show Content Schedule"
  price: string;           // display string
  priceValue: number;      // used for the bundle saving math
  status: ProductStatus;
  statusNote?: string;     // rendered wherever a non-sellable product appears
  track: ProductTrack;

  fileTypes: string[];     // chips: ["PDF", "DOCX", "XLSX"]
  formatNote: string;      // prose version of the above

  /** A hard prerequisite the buyer must meet. Rendered next to the buy
   *  control rather than in the FAQ, because someone on Outlook needs to
   *  learn that before paying, not after. */
  requirement?: string;

  /** A credit or offset against a larger offer, shown under the price.
   *  The Teardown is fully credited toward the Session. */
  creditNote?: string;

  /** How the product actually reaches the buyer, when it isn't a
   *  download. The Outreach OS copies a sheet into their own Drive. */
  deliveryNote?: string;

  /** The quiet version of the above: a short, matter-of-fact note set
   *  low on the page rather than its own headlined section. */
  deliveryFootnote?: string;

  /** Capability blocks, set high on the page above the contents list.
   *  For the thing a buyer needs to understand before the detail: the
   *  Vault syncing itself from Drive is the reason it is worth paying
   *  for, and it reads as a footnote anywhere further down. */
  features?: {
    eyebrow: string;
    items: ProductPoint[];
  };
  whoFor: string;
  positioning: string;     // one line, used in cross-sell + meta

  /** Two sentences for the shop grid. Kept to a similar length across
   *  products so the cards in a row don't read as ragged. */
  cardBlurb: string;

  /** Longer summary. Each string is its own paragraph. */
  summary: string[];

  hero: {
    eyebrow: string;
    headline: string;      // HTML allowed, for the .highlight span
    sub: string;
    pills: string[];
    highlights: ProductHighlight[];
  };

  /** The long-form sell: a lead headline, prose, then named points. */
  story: {
    headline: string;
    paragraphs: string[];
    points: ProductPoint[];
  };

  inside: {
    eyebrow: string;
    headline: string;
    items: ProductPoint[];
    closer?: string;
  };

  files: ProductFile[];

  /** For products that are a workbook rather than a download: the tabs
   *  the buyer gets. Rendered in place of the file manifest, because a
   *  "what you download" list would be a lie for a Google Sheet. */
  tabs?: ProductFile[];

  /** For a service rather than a thing: what gets produced and sent
   *  back. Also rendered in place of the file manifest. */
  deliverables?: ProductFile[];
  /** Tabs that exist but are not meant to be used. Listed for honesty. */
  hiddenTabs?: string[];

  /** Honest limits worth stating on the page rather than burying. */
  caveats?: string[];
}

// ─────────────────────────────────────────────────────────────
// 01 — Show Media Brief Kit
// ─────────────────────────────────────────────────────────────
const showMediaBriefKit: Product = {
  slug: 'show-media-brief-kit',
  number: '01',
  name: 'Show Media Brief Kit',
  shortName: 'Brief Kit',
  subtitle: 'Media Brief & Post-Show Content Schedule',
  price: '$17',
  priceValue: 17,
  status: 'available',
  track: 'artist',

  fileTypes: ['PDF', 'DOCX', 'XLSX'],
  formatNote: 'Fillable PDF, Word doc, and Excel or Sheets workbook',
  whoFor:
    'Artists and managers booking media for shows. Anyone who has hired a shooter and gotten back footage that missed the moment.',
  positioning: 'The Kit organizes one show.',

  cardBlurb:
    'One page you send before every show, so your shooter arrives knowing exactly what the night needs. Then a schedule that turns what they deliver into thirty days of posts.',

  summary: [
    'Your media team can only capture what they know about. The Brief is the one page you send before every show: set time, meet point, key moments, platform destinations, references, and usage, so your shooter arrives knowing exactly what the night needs. They fill in the last section and send it back, so you both have one document instead of a scattered text thread.',
    'Then the Post-Show Content Schedule turns what they deliver into thirty days of posts, dated automatically from your show date, so nothing dies in a Drive folder.',
  ],

  hero: {
    eyebrow: 'Show Media',
    headline: 'Stop briefing your media team in a <span class="highlight">group chat</span>.',
    sub: 'One page you send before every show, and a schedule that turns what comes back into thirty days of posts.',
    pills: [
      'Fillable PDF + Word',
      'Completed example included',
      'Two-way return block',
      'Auto-dated from your show',
      'Works with any shooter',
    ],
    highlights: [
      { value: '29', unit: 'fillable fields' },
      { value: '13', unit: 'auto-dated posts' },
      { value: '30', unit: 'days covered' },
      { value: '4', unit: 'files included' },
    ],
  },

  story: {
    headline: "The shot you didn't get was never on the list.",
    paragraphs: [
      "Most missed shots aren't a skill problem. Your shooter didn't know about the guest appearance, didn't know you needed vertical, spent twenty minutes finding you before doors.",
      'The Show Media Brief is one page you fill in and send before every show. Set time, stage, meet point, credentials. The moments worth being in position for. Where the content is going, so it gets shot for the platform instead of cropped into it later. References for what you want and, more usefully, what you don’t. Tagging and usage, sorted before the shoot instead of argued about after.',
      "Your shooter fills in the last section with their credit handle, day-of number, and confirmed delivery date, then sends it back. Now it's a shared reference, not a one-way instruction sheet.",
    ],
    points: [
      {
        title: 'It goes out before the shoot, not after.',
        body: 'Six numbered sections cover the logistics that waste a shooter’s first hour and the moments that only happen once. Position beats reaction.',
      },
      {
        title: 'It comes back filled in.',
        body: 'An orange block at the end belongs to your media team: credit handle, day-of number, confirmed delivery date. That return step is what makes it a shared document rather than an instruction sheet.',
      },
      {
        title: 'It keeps working after the lights come up.',
        body: 'The Schedule dates thirteen posts from the night you entered, and the Asset Inventory matches your logged files to each one by type, orientation, and rating. Where nothing fits, it says so.',
      },
    ],
  },

  inside: {
    eyebrow: "What's inside",
    headline: 'Four files, one workflow',
    items: [
      {
        title: 'Show Media Brief',
        body: 'Fillable PDF, plus a Word version if you would rather work in Google Docs. Six numbered sections, 29 text fields, 12 clickable checkboxes.',
      },
      {
        title: 'Completed example',
        body: 'A real brief, filled in by both sides, so you can see what good looks like before you send your first one.',
      },
      {
        title: 'Post-Show Content Schedule',
        body: 'Thirty days of posts mapped from one night of media, dated automatically from your show date, with an asset log that tells you which file fits which post.',
      },
      {
        title: 'Gap flagging',
        body: 'The Asset Inventory matches logged files to schedule rows by type, orientation, and rating, and marks the rows where nothing you have fits.',
      },
    ],
    closer: 'Fill it out once. Send it before every show.',
  },

  files: [
    { name: 'Show-Media-Brief-Fillable.pdf', purpose: 'Primary. 29 text fields, 12 clickable checkboxes' },
    { name: 'Show-Media-Brief.docx', purpose: 'Google Docs alternative' },
    { name: 'Show-Media-Brief-Example.pdf', purpose: 'Completed reference, both sides filled' },
    { name: 'Post-Show-Content-Schedule.xlsx', purpose: 'Three tabs: Start Here, Asset Inventory, Content Schedule' },
  ],

  caveats: [
    'Send your shooter the editable version, not the flattened one, so they can complete the return block.',
  ],
};

// ─────────────────────────────────────────────────────────────
// 02 — Release Rollout Calendar
// ─────────────────────────────────────────────────────────────
const releaseRolloutCalendar: Product = {
  slug: 'release-rollout-calendar',
  number: '02',
  name: 'Release Rollout Calendar',
  shortName: 'Rollout Calendar',
  subtitle: 'Rollout Plan & Asset Checklist',
  price: '$19',
  priceValue: 19,
  status: 'available',
  track: 'artist',

  fileTypes: ['XLSX'],
  formatNote: 'Excel or Google Sheets workbook',
  whoFor:
    'Artists with a single release coming up who announce two weeks out and watch it die three days after it drops. Built for one release, not a rolling catalog cadence.',
  positioning: 'The Calendar organizes one release.',

  cardBlurb:
    'Enter your release date and the Calendar builds the six weeks before it, backward, then keeps going for four weeks after. Deadlines stay separate from posts that can move.',

  summary: [
    'Most releases get announced two weeks out and die three days after they drop.',
    'Enter your release date and the Calendar builds the six weeks before it, backward: what to post, when, and why, with the deadlines that actually have consequences marked separately from the posts that can move. Then it keeps going for four weeks after, which is where most artists go quiet and most streams get left behind.',
    "The Asset Checklist tells you what you need and when you need it, so you're capturing in week six instead of scrambling in week two.",
  ],

  hero: {
    eyebrow: 'Release Strategy',
    headline: 'Your release deserves more than a <span class="highlight">two-week announcement</span>.',
    sub: 'Enter your release date. The Calendar dates every step against it, six weeks out through four weeks after.',
    pills: [
      '32 dated steps',
      'Ten phases',
      'Admin and content separated',
      'Four weeks of post-release',
      'Sheets or Excel',
    ],
    highlights: [
      { value: '32', unit: 'dated steps' },
      { value: '10', unit: 'phases' },
      { value: '6wk', unit: 'pre-release' },
      { value: '4wk', unit: 'post-release' },
    ],
  },

  story: {
    headline: 'Nobody planned backward from the date.',
    paragraphs: [
      "The pattern is always the same. The track's been done for months. You remember to announce it two weeks out, post the artwork, post a clip on release day, and by the following Wednesday it's over.",
      "The problem isn't effort. It's that nobody planned backward from the date.",
      'Enter your release date and the Calendar dates every step against it automatically. Six weeks of pre-release, release day, then four weeks after.',
    ],
    points: [
      {
        title: 'It separates two things most calendars mix up.',
        body: 'Admin rows are deadlines with consequences: distributor upload, editorial pitch, pre-save link live. Miss one and no amount of good posting fixes it. Content rows are posts, and those can move. You can see at a glance which is which, which means you can compress a rollout without breaking it.',
      },
      {
        title: 'It builds in the part most artists skip.',
        body: "Weeks two and one before release aren't more announcement posts. They're three different cuts of the same footage, tested against each other, then weight behind whichever one moved. That sequence is the difference between a release that travels and one that doesn't.",
      },
      {
        title: "And it doesn't stop at release day.",
        body: 'Week two is the second wave. Weeks three and four are the long tail, including getting the track into your show recaps. Most artists stop posting the day after the drop, which is roughly when the algorithm was about to start paying attention.',
      },
    ],
  },

  inside: {
    eyebrow: "What's inside",
    headline: 'One workbook, three tabs',
    items: [
      {
        title: 'Rollout Plan',
        body: '32 dated steps across ten phases, from six weeks out to four weeks after, calculated from the release date you enter.',
      },
      {
        title: 'Asset Checklist',
        body: "Every asset the plan needs, when it's needed, and a running count of what is still missing.",
      },
      {
        title: 'Admin and content, separated',
        body: 'Admin rows render orange and content rows blue, so you know what is a hard deadline and what is a suggestion you can move.',
      },
    ],
    closer: 'Built for one release, start to finish. Works whether you have six weeks or three.',
  },

  files: [
    { name: 'Release-Rollout-Calendar.xlsx', purpose: 'Three tabs: Start Here, Rollout Plan, Asset Checklist' },
  ],

  caveats: [
    "It doesn't assert your distributor or editorial deadlines. Those vary by service and change, so you enter your own.",
    'The worked example uses a Friday release, the industry convention.',
  ],
};

// ─────────────────────────────────────────────────────────────
// 03 — The Content Vault  (in build)
// ─────────────────────────────────────────────────────────────
const contentVault: Product = {
  slug: 'content-vault',
  number: '03',
  name: 'The Content Vault',
  shortName: 'The Vault',
  subtitle: 'Asset Library & Usage Log',
  price: '$29',
  priceValue: 29,
  status: 'available',
  track: 'artist',

  // Google Sheets only, and not by omission: the sync runs on Apps
  // Script, which has no Excel equivalent. Do not re-add Excel here.
  fileTypes: ['Google Sheets'],
  formatNote: 'A Google Sheet, copied into your own Drive',
  whoFor:
    'Artists a year or more into shooting regularly, with footage scattered across Drive, Dropbox, a phone, and a hard drive. The tool for people who own more than they can find.',
  positioning: 'The Vault organizes everything, across time.',

  cardBlurb:
    "You have the shot. You just can't find it. Log every file once and it stays findable: what it is, where it came from, how good it is, and whether you have used it.",

  summary: [
    "You have the shot. You just can't find it.",
    'The Vault is where every photo and clip gets logged once and stays findable: what it is, where it came from, how good it is, and whether you have used it. Filter to unused vertical video from the last six months, or every crowd shot you own, in one click.',
    'The footage you paid for in March should still be working for you in October.',
  ],

  hero: {
    eyebrow: 'Content Library',
    headline: "Your best shot is in a folder you'll <span class=\"highlight\">never open again</span>.",
    sub: "Point it at your Drive folder and hit Sync. It logs what you own, and tells you what you're short on.",
    pills: [
      'Syncs from Google Drive',
      'Eleven logged fields',
      'Filter arrows on every column',
      'Live gap counts',
      'Google Sheets',
    ],
    highlights: [
      { value: '11', unit: 'logged fields' },
      { value: '5', unit: 'source types' },
      { value: '1', unit: 'click to sync' },
      { value: '\u221e', unit: 'shelf life' },
    ],
  },

  story: {
    headline: "You already own the content you're about to go re-shoot.",
    paragraphs: [
      'Every artist has the same problem. A year of shows, a dozen shooters, thousands of files across Drive, Dropbox, a phone, and a hard drive somewhere. When you need one specific frame for a tour announcement, you know it exists and you spend forty minutes looking for it.',
      'Then you give up and post something worse.',
      'The Content Vault reads your Drive folder and logs what is in it. Name, shoot folder, date, format, orientation, and a link straight back to the file. You rate the ones worth keeping and delete the rest.',
      'After that, finding anything takes seconds. Unused vertical video. Everything from a festival. Every crowd shot rated Hero. The strongest thing you have never posted.',
    ],
    points: [
      {
        title: 'Nothing gets used once.',
        body: 'A clip that ran as a Reel in March is a tour announcement asset in October, and the Vault remembers you already used it.',
      },
      {
        title: 'You stop re-shooting what you own.',
        body: "Most artists commission content they already have, because they can't find it.",
      },
      {
        title: 'Gaps become visible.',
        body: 'Filter for vertical video and come up empty, and you have just found what to put in your next brief.',
      },
      {
        title: 'It works across everything.',
        body: 'One festival, one show, one release, or four years of all of it.',
      },
    ],
  },

  features: {
    eyebrow: 'What it does',
    items: [
      {
        title: 'It fills itself in.',
        body: 'Point it at your Drive folder and hit Sync. It pulls in every new file with the name, shoot folder, date, format, orientation and a clickable link straight to the file. You add a rating and a tag to the ones worth keeping, and delete the rest. Run it again after your next delivery and it only brings in what is new.',
      },
      {
        title: "It tells you what you're short on.",
        body: "The Gaps tab keeps live counts of what you're holding and what you're missing. Unused vertical video. Unused Hero-rated anything. ID clips waiting on a release date. A zero next to unused vertical video isn't a spreadsheet problem, it's the brief for your next shoot.",
      },
    ],
  },

  inside: {
    eyebrow: "What's inside",
    headline: 'Synced, rated, and findable.',
    items: [
      {
        title: 'Eleven logged fields',
        body: "File name, shoot folder, date, type, orientation, rating, source, tags, used or not, where it was used, and what release it's being held for. Plus an Open column that links straight to the file in Drive.",
      },
      {
        title: 'Filter arrows on every column',
        body: 'Native column filters, so you can stack them: unused, vertical, rated Hero, from a festival. No setup and nothing to learn.',
      },
      {
        title: 'Five source types',
        body: 'Own shooter, crowd, other artist, phone, festival. So you know what you paid for and what simply turned up.',
      },
      {
        title: 'Usage log',
        body: 'What ran, where, and when, so nothing gets posted twice by accident.',
      },
    ],
  },

  deliveryFootnote:
    "Click the link and make a copy. It lands in your own Google Drive and it's yours. The first time you sync, Google asks for permission to read your Drive folder, because that's what the tool does. It runs entirely inside your own account and nothing is sent anywhere else.",

  files: [],
};

// ─────────────────────────────────────────────────────────────
// 04 — Artist Outreach OS  (creator track, finished but unproven)
//
// Structurally unlike the other three: nothing downloads. The buyer
// gets a link that copies a Google Sheet into their own Drive, and the
// templates install into their own Gmail. So this record carries `tabs`
// and `deliveryNote` instead of a file manifest, and a `requirement`
// (Gmail) that has to be read before anyone pays.
// ─────────────────────────────────────────────────────────────
const artistOutreachOS: Product = {
  slug: 'artist-outreach-os',
  // 05, not 04: the artist track runs 01 to 04 and the creator track
  // picks up after it, so the shop reads in order down the page.
  number: '05',
  name: 'Artist Outreach OS',
  shortName: 'Outreach OS',
  subtitle: 'Outreach Tracker & Contact Directory',
  price: '$199',
  priceValue: 199,
  status: 'unproven',
  statusNote:
    'Built and tested end to end, but nobody has run a real campaign through it yet. It goes on sale after one has.',
  track: 'creator',

  fileTypes: ['Google Sheets', 'Gmail'],
  formatNote: 'A Google Sheet copied into your own Drive, plus 21 templates installed in your Gmail',
  requirement:
    "Gmail only. Drafting, send detection, reply detection, bounce tracking and threading all run through Gmail or Google Workspace. On Outlook or anything else it still works as a tracker, but the automation doesn't.",
  deliveryNote:
    'You get one link that copies the sheet into your own Google Drive, so you own it outright rather than being given access to ours. A fresh copy has a single tab, Start Here. One menu click, Run full setup, builds the other seven tabs, the dropdowns, the automation and the Gmail labels. Everything runs in your account, against your mailbox. We never see your data.',

  whoFor:
    'The working concert photographer or videographer who already shoots shows and has a reel, and whose pipeline is "DM the artist on Instagram and hope". Roughly two to ten shoots a month, mostly local venues, wanting festival and tour work.',
  positioning: 'The OS gets your pitch to the right person, early.',

  cardBlurb:
    'You found out they were playing your city the week after the show. This is the pipeline and the contact book that stops that happening, with follow-ups that fire on their own.',

  summary: [
    "You can already deliver. What you can't do is reliably find the right manager, pitch before the routing is locked, and remember who you chased.",
    'Paste a manager’s details from anywhere and the row fills itself in. The OS drafts the email into your Gmail, notices when you actually send it, and runs a three-stage follow-up that stops the moment someone replies.',
    "It won't let you email the same manager twice, and it never sends anything on your behalf.",
  ],

  hero: {
    eyebrow: 'Artist Outreach',
    headline: 'You found out they were playing your city <span class="highlight">the week after the show</span>.',
    sub: 'One paste captures a contact. It drafts, you send, and it remembers everyone you have chased.',
    pills: [
      'Copies into your Drive',
      'Drafts, never sends',
      'Three-stage follow-up',
      'Contacts fill themselves',
      'Gmail only',
    ],
    highlights: [
      { value: '21', unit: 'email templates' },
      { value: '3', unit: 'follow-up stages' },
      { value: '29', unit: 'tracked fields' },
      { value: '1', unit: 'paste per contact' },
    ],
  },

  story: {
    headline: 'The money is in touch two and three.',
    paragraphs: [
      "You found out they were playing your city the week after the show. The three times you did get in early, you DM'd the artist's Instagram, got read by an intern, and never followed up, because there was nowhere to write down that you had tried.",
      "Three failures, in the order they bite. You don't know who to email, so you message the artist. You send once, hear nothing, and forget. And you can't recall who you pitched, when, or what they said.",
      "None of that's a talent problem. It's a memory problem, and a spreadsheet with a script attached fixes it.",
    ],
    points: [
      {
        title: 'One paste captures a contact.',
        body: 'Copy a manager’s details from anywhere, a booking database, an agency page, an email signature, a link-in-bio, and paste the block into one cell. Name, email, phone, company and role are pulled out, the row fills in, and your directory learns that contact permanently. A blank doc makes you retype it every time.',
      },
      {
        title: 'It drafts. It never sends.',
        body: "Every email lands in your Gmail drafts for you to read and change. There's no button anywhere that sends mail on your behalf. A mail-merge tool sends first and apologises afterwards.",
      },
      {
        title: 'The follow-up clock starts when you actually send.',
        body: 'Not when you wrote the draft. The sheet watches Gmail and notices. Follow-ups go out as replies on the same thread, three stages deep, and the sequence stops the moment someone answers.',
      },
      {
        title: "It won't let you email the same manager twice.",
        body: 'It refuses to re-draft a row that already went out, warns when one contact is about to get several emails from a single batch, and can merge nearby dates into one email, "Austin & Dallas, TX on July 3 & July 5", instead of three near-identical pitches to the same person.',
      },
    ],
  },

  inside: {
    eyebrow: "What's inside",
    headline: 'A pipeline and a contact book that fills itself',
    items: [
      {
        title: 'The outreach grid',
        body: 'One row per show or festival, laid out left to right in the order you actually work: event, contact research, send, then tracking.',
      },
      {
        title: 'The artist directory',
        body: 'A CRM that builds itself out of your outreach. Enter a manager once and every future row for that artist fills in automatically, with lead temperature, last contacted, and last outcome.',
      },
      {
        title: '21 email templates',
        body: "Installed as drafts in your own Gmail, where you can edit them freely. They're yours, not ours, and not locked in a file.",
      },
      {
        title: 'The automation',
        body: 'Detects sends, replies and bounces. Schedules and drafts the follow-ups, flags dead addresses per address, and keeps a dated log of everything that happened.',
      },
    ],
    closer: 'Paste once. Follow up on its schedule, not your memory.',
  },

  files: [],

  tabs: [
    { name: 'Start Here', purpose: 'Setup and the full manual, in the sheet. The only tab in a fresh copy' },
    { name: 'Artist Reachout', purpose: 'The working grid, one row per show or festival' },
    { name: 'Artist Directory', purpose: 'Your contacts, building themselves as you work' },
    { name: 'Conversation Log', purpose: 'Dated, append-only history of every draft, send, reply and bounce' },
    { name: 'Import', purpose: 'Bring an existing outreach spreadsheet in without breaking anything' },
  ],
  hiddenTabs: ['Automation Control (settings)', 'Logic (reference lists)', 'Contact Archive (raw pasted blocks)'],

  caveats: [
    "It can't promise bookings. It finds nothing for you and guarantees no replies. It makes sure you pitch the right person, early, and then follow up, which is the part most people skip.",
    "It doesn't find contacts. You still need a source. It removes the retyping, not the research.",
    "It doesn't pull tour dates automatically. It opens the right searches for the artist on that row; you read the dates and fill them in.",
    "It never sends. You'll always press send yourself.",
    'Google shows an "unverified app" warning the first time you run setup. That\'s unavoidable: you own your copy, so you\'re authorising your own script, not ours.',
  ],
};

// ─────────────────────────────────────────────────────────────
// 05 — Growth Systems Teardown  (artist track, a service)
//
// From the Blueprint Ascension Ladder (Notion). The rung between the
// workbooks and the $1,000 Session: async, credited forward, and
// deliberately a demonstration of the thinking rather than a promise.
// Not a file and not a workbook, so it carries `deliverables`.
// ─────────────────────────────────────────────────────────────
const growthSystemsTeardown: Product = {
  slug: 'growth-systems-teardown',
  number: '04',
  name: 'Growth Systems Teardown',
  shortName: 'The Teardown',
  subtitle: 'Recorded Audit & Priority Fix List',
  price: '$197',
  priceValue: 197,
  status: 'in-build',
  statusNote:
    "The Teardown isn't open yet. It's described here in full, but we aren't taking bookings for it until the process is running.",
  track: 'artist',

  fileTypes: ['Video', 'Written'],
  formatNote: 'A 20-minute recorded walkthrough plus a written priority fix list',
  creditNote: 'Fully credited toward the Growth Blueprint Session™ within 30 days.',
  deliveryNote:
    'Nothing is scheduled. You send your socials, your recent releases and whatever content archive you have. We go through it properly and send back a recorded walkthrough with a written fix list ordered by what matters first. No call, no timezone maths, nothing in your calendar.',

  whoFor:
    "Artists who want to know what is actually broken before committing to a build. You suspect the problem isn't effort, you just can't see the system from inside it.",
  positioning: 'The Teardown tells you what is leaking.',

  cardBlurb:
    'Send your socials, releases and content archive. Get back a recorded walkthrough of what is leaking, what to fix first, and what to build in what order. The full $197 comes off the Session.',

  summary: [
    "Most artists don't need more content. They need someone to look at what they already have and say, plainly, which part is losing them the growth.",
    'You submit your socials, your recent releases and your content archive. We return a twenty-minute recorded walkthrough of what is leaking, what to fix first, and what to build in what order, plus the written version so you can work from it.',
    "It's async on purpose. No scheduling, no timezones, watched on a bus at 2am if that's when you have twenty minutes.",
  ],

  hero: {
    eyebrow: 'Diagnosis',
    headline: 'Find out what is broken <span class="highlight">before you build anything</span>.',
    sub: 'A recorded teardown of your actual accounts, releases and archive, with a fix list in priority order.',
    pills: [
      '20-minute recording',
      'Written fix list',
      'Fully credited toward the Session',
      'No call to schedule',
      'Async, watch it anywhere',
    ],
    highlights: [
      { value: '20', unit: 'minute walkthrough' },
      { value: '$197', unit: 'credited forward' },
      { value: '30', unit: 'day credit window' },
      { value: '0', unit: 'calls to schedule' },
    ],
  },

  story: {
    headline: 'A demonstration, not a promise.',
    paragraphs: [
      "Every agency will tell you what they would do. Almost none of them will show you, because showing you costs them an afternoon and gives away the part they're actually selling.",
      'The Teardown is that afternoon. You experience the thinking before you spend a thousand pounds on it, which means the Session stops being a leap of faith and becomes an obvious next step or an obvious no.',
      "And it's yours either way. If you never book anything else, you still have a prioritised list of what is costing you growth.",
    ],
    points: [
      {
        title: "It's tour-proof.",
        body: "No scheduling, no timezones, nothing that needs you at a desk. It's a recording, so it survives a bus at 2am and a festival weekend.",
      },
      {
        title: "It's a miniature of the real thing.",
        body: 'The Growth Blueprint Session™ is this thinking applied with you, in the room, building the plan together. The Teardown is the same eye, one-way. That makes the upgrade obvious instead of salesy.',
      },
      {
        title: 'The whole fee comes back.',
        body: 'The full $197 is credited toward the Session if you book within 30 days. Taken that way, the diagnosis costs nothing and only the build does.',
      },
    ],
  },

  inside: {
    eyebrow: 'What you get back',
    headline: 'What is leaking, and what to fix first',
    items: [
      {
        title: 'The recorded walkthrough',
        body: 'Twenty minutes through your actual accounts, releases and archive. Not a template with your name in it.',
      },
      {
        title: 'The priority fix list',
        body: 'Written, ordered, and specific. What to fix this week, what to fix next, and what to stop doing entirely.',
      },
      {
        title: 'The build order',
        body: 'If the answer is that you need a system rather than a fix, you get the order it should be built in, whether or not you build it with us.',
      },
    ],
    closer: 'This covered the what. The Session builds the how, with you.',
  },

  files: [],

  deliverables: [
    { name: 'Recorded teardown', purpose: 'Roughly 20 minutes, walking your socials, releases and archive' },
    { name: 'Priority fix list', purpose: 'Written, ordered by what costs you the most growth first' },
  ],

  caveats: [
    "You have to send real material. Socials, recent releases and whatever archive you have; a teardown of an empty account isn't worth either of our time.",
    "It's a diagnosis, not a build. It tells you what to fix and in what order. Doing it is either your job or the Session.",
    'The credit runs 30 days. After that the $197 is just the Teardown.',
  ],
};

export const products: Record<string, Product> = {
  'show-media-brief-kit': showMediaBriefKit,
  'release-rollout-calendar': releaseRolloutCalendar,
  'content-vault': contentVault,
  'growth-systems-teardown': growthSystemsTeardown,
  'artist-outreach-os': artistOutreachOS,
};

/** Catalog order. Routing walks this; the shop splits it by track. */
export const productOrder = [
  'show-media-brief-kit',
  'release-rollout-calendar',
  'content-vault',
  'growth-systems-teardown',
  'artist-outreach-os',
] as const;

export const productList: Product[] = productOrder.map(slug => products[slug]);

/** The two shop tracks. The shop renders these as separate sections,
 *  and cross-sell rails stay inside a track: someone reading about
 *  outreach is a shooter, and has no use for a release calendar. */
export const artistProducts: Product[] = productList.filter(p => p.track === 'artist');
export const creatorProducts: Product[] = productList.filter(p => p.track === 'creator');

export const trackLabels: Record<ProductTrack, { label: string; blurb: string }> = {
  artist: {
    label: 'For artists and managers',
    blurb:
      'The pieces of the growth system you can run without us: what you ask for before a show, what you do with a release, and what happens to every file after.',
  },
  creator: {
    label: 'For photographers and videographers',
    blurb:
      'The other side of the same job. You can already shoot it; this is how you get booked to shoot it.',
  },
};

// ─────────────────────────────────────────────────────────────
// The bundle
//
// Its contents are named explicitly, NOT derived from a track. The
// bundle is the three workbooks and nothing else, and the price and
// saving are summed from them rather than hardcoded so the arithmetic
// can never drift from the prices above.
//
// This list being explicit is load-bearing. Deriving it from "every
// artist product" was already fragile and broke the moment the $197
// Teardown joined that track: a $49 bundle would have started claiming
// a $213 saving on items it does not include. Add a slug here only if
// the bundle genuinely contains it.
//
// It also inherits the least-ready status of its contents: while the
// Vault is in build, the bundle cannot be delivered either.
// ─────────────────────────────────────────────────────────────
export const bundleSlugs = [
  'show-media-brief-kit',
  'release-rollout-calendar',
  'content-vault',
] as const;

export const bundleProducts: Product[] = bundleSlugs.map(slug => products[slug]);

const bundleStandalone = bundleProducts.reduce((sum, p) => sum + p.priceValue, 0);

export const bundle = {
  slug: 'bundle',
  name: 'All Three Tools',
  price: '$49',
  priceValue: 49,
  standalone: `$${bundleStandalone}`,
  saving: `$${bundleStandalone - 49}`,
  status: (bundleProducts.every(p => p.status === 'available') ? 'available' : 'in-build') as ProductStatus,
  statusNote: 'The bundle opens when the Vault does.',
  positioning:
    'The Kit organizes one show. The Calendar organizes one release. The Vault organizes everything across time.',
  body:
    'Each tool solves its own problem on its own. Together they cover the whole loop: what you ask for before a show, what you do with a release, and what happens to every file after.',
};
