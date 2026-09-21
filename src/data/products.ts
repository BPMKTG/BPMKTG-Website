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

export type ProductStatus = 'available' | 'in-build';

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
  statusNote?: string;     // rendered wherever an in-build product appears

  fileTypes: string[];     // chips: ["PDF", "DOCX", "XLSX"]
  formatNote: string;      // prose version of the above
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
    'The Asset Checklist tells you what you need and when you need it, so you are capturing in week six instead of scrambling in week two.',
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
        body: 'Every asset the plan needs, when it is needed, and a running count of what is still missing.',
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
    'It does not assert your distributor or editorial deadlines. Those vary by service and change, so you enter your own.',
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
  status: 'in-build',
  statusNote: 'The Vault is still being built. It is described here in full, but it is not for sale yet.',

  fileTypes: ['XLSX'],
  formatNote: 'Excel or Google Sheets workbook',
  whoFor:
    'Artists a year or more into shooting regularly, with footage scattered across Drive, Dropbox, a phone, and a hard drive. The tool for people who own more than they can find.',
  positioning: 'The Vault organizes everything, across time.',

  cardBlurb:
    'You have the shot. You just cannot find it. Log every file once and it stays findable: what it is, where it came from, how good it is, and whether you have used it.',

  summary: [
    'You have the shot. You just cannot find it.',
    'The Vault is where every photo and clip gets logged once and stays findable: what it is, where it came from, how good it is, and whether you have used it. Filter to unused vertical video from the last six months, or every crowd shot you own, in one click.',
    'The footage you paid for in March should still be working for you in October.',
  ],

  hero: {
    eyebrow: 'Content Library',
    headline: "Your best shot is in a folder you'll <span class=\"highlight\">never open again</span>.",
    sub: 'Log each file once when it arrives. After that, finding anything takes seconds.',
    pills: [
      'Eight logged fields',
      'Pre-built filter views',
      'Source tracking',
      'Usage log',
      'Sheets or Excel',
    ],
    highlights: [
      { value: '8', unit: 'logged fields' },
      { value: '4', unit: 'source types' },
      { value: '1', unit: 'habit to keep' },
      { value: '∞', unit: 'shelf life' },
    ],
  },

  story: {
    headline: 'You already own the content you are about to go re-shoot.',
    paragraphs: [
      'Every artist has the same problem. A year of shows, a dozen shooters, thousands of files across Drive, Dropbox, a phone, and a hard drive somewhere. When you need one specific frame for a tour announcement, you know it exists and you spend forty minutes looking for it.',
      'Then you give up and post something worse.',
      'The Content Vault fixes that with one habit: log each file once when it arrives. Type, orientation, rating, where it came from, which show, whether you have used it and where.',
      'After that, finding anything takes seconds. Unused vertical video. Everything from a festival. Every crowd shot rated Hero. The strongest thing you have never posted.',
    ],
    points: [
      {
        title: 'Nothing gets used once.',
        body: 'A clip that ran as a Reel in March is a tour announcement asset in October, and the Vault remembers you already used it.',
      },
      {
        title: 'You stop re-shooting what you own.',
        body: 'Most artists commission content they already have, because they cannot find it.',
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

  inside: {
    eyebrow: "What's inside",
    headline: 'Log it once. Find it forever.',
    items: [
      {
        title: 'The Vault',
        body: 'Tagged fields and dropdowns, no setup. File name, type, orientation, rating, source, show or festival, used where, date used.',
      },
      {
        title: 'Filter views',
        body: 'Pre-built for the searches you will actually run, which is the difference between this and a blank spreadsheet.',
      },
      {
        title: 'Source tracking',
        body: 'Your shooter, the crowd, other artists, your own phone, all in one place.',
      },
      {
        title: 'Usage log',
        body: 'What ran, where, and when, so nothing gets posted twice by accident.',
      },
    ],
  },

  files: [],
};

export const products: Record<string, Product> = {
  'show-media-brief-kit': showMediaBriefKit,
  'release-rollout-calendar': releaseRolloutCalendar,
  'content-vault': contentVault,
};

/** Catalog order for the shop grid and cross-sell rails. */
export const productOrder = [
  'show-media-brief-kit',
  'release-rollout-calendar',
  'content-vault',
] as const;

export const productList: Product[] = productOrder.map(slug => products[slug]);

// ─────────────────────────────────────────────────────────────
// The bundle
//
// Priced against the sum of the three standalone products, computed
// rather than hardcoded so the saving can never drift from the
// prices above. It inherits the least-ready status of its contents:
// while the Vault is in build, the bundle cannot be delivered either.
// ─────────────────────────────────────────────────────────────
const bundleStandalone = productList.reduce((sum, p) => sum + p.priceValue, 0);

export const bundle = {
  slug: 'bundle',
  name: 'All Three Tools',
  price: '$49',
  priceValue: 49,
  standalone: `$${bundleStandalone}`,
  saving: `$${bundleStandalone - 49}`,
  status: (productList.every(p => p.status === 'available') ? 'available' : 'in-build') as ProductStatus,
  statusNote: 'The bundle opens when the Vault does.',
  positioning:
    'The Kit organizes one show. The Calendar organizes one release. The Vault organizes everything across time.',
  body:
    'Each tool solves its own problem on its own. Together they cover the whole loop: what you ask for before a show, what you do with a release, and what happens to every file after.',
};
