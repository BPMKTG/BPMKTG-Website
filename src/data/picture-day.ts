// ═══════════════════════════════════════════════════════════════
// /picture-day — Rebelz Cheer Picture Day, all of it in one file.
//
// This page is handed out by link in a team group text. Parents open
// it on a phone, find their team's time, pick a package, and leave
// through the Google Form. Nothing on the page is sold; it is a
// schedule and an order sheet.
//
// EVERYTHING EDITABLE LIVES HERE. Times, prices, package contents,
// the two links and the event line are all below, so changing a
// time or a price never means opening a component. If you are
// reading this because a time moved: it is the `schedule` array,
// and the page renders it in exactly the order it is written.
// ═══════════════════════════════════════════════════════════════

/* ── the event ────────────────────────────────────────────────── */

export const event = {
  /** The long form, for the hero. */
  dateLong: 'Sunday, November 8, 2026',
  /** The short form, for the closing band and the page title. */
  dateShort: 'Sunday, Nov 8',
  venue: 'Rebelz Cheer',
} as const;

/* ── where the buttons go ─────────────────────────────────────── */

/** Both open in a new tab. A parent who taps through to Venmo and
 *  then hits Back should still have the schedule where they left it. */
export const ORDER_FORM_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSf8jW30iHe3h2A6qGuTEagAnVbyBZDcIJjKZ7Uia8X4aQ7_7Q/viewform?usp=header';

export const VENMO_URL = 'https://venmo.com/u/Mason-Celum';

/* ── the schedule ─────────────────────────────────────────────── */

export interface TeamSlot {
  time: string;
  team: string;
}

/**
 * Teams in running order, not alphabetical.
 *
 * The page prints this array as it stands, so the order here IS the
 * order on the page. The gaps between slots are uneven on purpose:
 * they are the real call times, not a generated grid.
 */
export const schedule: TeamSlot[] = [
  { time: '12:00 PM', team: 'Rowdy' },
  { time: '12:40 PM', team: 'Rookies' },
  { time: '1:05 PM', team: 'Rush' },
  { time: '1:30 PM', team: 'Regal' },
  { time: '2:10 PM', team: 'Resistance' },
  { time: '2:50 PM', team: 'Rise' },
  { time: '3:30 PM', team: 'Radiant' },
  { time: '4:30 PM', team: 'Reign' },
  { time: '5:00 PM', team: 'Renaissance' },
];

/**
 * The late fee, as one sentence.
 *
 * Kept here rather than in the component because it is the single
 * most consequential line on the page: it costs a parent $10 to miss
 * it. If the amount changes, it changes once, here.
 */
export const feeNotice = {
  amount: '$10',
  text:
    "Please arrive at your team's scheduled time. Any athlete who comes "
    + "at a time that is not their team's will be charged a $10 fee.",
} as const;

/* ── packages ─────────────────────────────────────────────────── */

export interface Package {
  id: string;
  /** Which backdrop, shown above the name as an eyebrow. */
  backdrop: string;
  name: string;
  price: string;
  /** What you get, which is the whole card now that it has one side. */
  includes: string[];
  /** The orange "Most Popular" badge. Exactly one package has it. */
  popular: boolean;
}

export const packages: Package[] = [
  {
    id: 'classic',
    backdrop: 'White Backdrop',
    name: 'Classic',
    price: '$20',
    includes: [
      '1 individual photo',
      'Team photo included',
      'One predetermined pose',
      'Shot on the white backdrop',
    ],
    popular: false,
  },
  {
    id: 'plus',
    backdrop: 'White Backdrop',
    name: 'Plus',
    price: '$30',
    includes: [
      '3 individual photos',
      'Team photo included',
      '2 poses of your choosing',
      'Shot on the white backdrop',
    ],
    popular: false,
  },
  {
    id: 'signature',
    backdrop: 'Rebelz Backdrop',
    name: 'Signature',
    price: '$45',
    includes: [
      '3 individual photos',
      'Team photo included',
      '2 poses of your choosing',
      'Shot on the Rebelz backdrop',
    ],
    popular: true,
  },
];

export interface AddOn {
  label: string;
  price: string;
}

export const addOns: AddOn[] = [
  { label: 'Additional poses', price: '$5 each' },
  { label: 'Buddy shots', price: '$10 each' },
];

/* ── how to order ─────────────────────────────────────────────── */

export const steps: Array<{ title: string; detail: string }> = [
  {
    title: 'Fill out the order form',
    detail: "Athlete's name, team, package and any add-ons.",
  },
  {
    title: 'Pay by Venmo, or bring cash',
    detail: 'Cash is fine on the day. Venmo ahead is quicker at the table.',
  },
  {
    title: 'Show up camera-ready',
    detail: "Hair and uniform sorted before your team's time.",
  },
];

/** Read twice by parents who get it wrong once, so it is its own line
 *  rather than a clause inside step two. */
export const venmoNote =
  "In your Venmo note, include your athlete's name + team.";

/* ── example poses ────────────────────────────────────────────── */

/**
 * The pose rule, as one sentence, in the same shape as `feeNotice`.
 *
 * It gets the loud box under the gallery lede rather than a clause
 * inside it, because an athlete who turns up without a pose in mind
 * holds up every team behind them. `emphasis` is the phrase set in
 * orange; it has to appear in `text` or it is simply not highlighted.
 */
export const poseNotice = {
  emphasis: 'chosen ahead of time',
  text:
    'Poses must be chosen ahead of time. Athletes who do not know what '
    + 'poses they want will be asked to get in the back of the line.',
} as const;


/**
 * The gallery, in the three groups a parent actually shops by: what the
 * team photo looks like, what an individual looks like, and what a buddy
 * shot looks like. Each group is its own uniform grid, so nothing is
 * cropped: the team frames are 3:2 and every other frame is 2:3, and the
 * tiles are set to match.
 *
 * A photo is just its filename without the extension. There is no written
 * description per photo on purpose: the first pass had one, and a written
 * account of a pose is both unnecessary to a parent looking straight at
 * it and wrong often enough to be worse than nothing. The group supplies
 * the alt text instead, which is short and always true.
 *
 * Add a photo by dropping the file in and adding its slug to the right
 * list. Order inside a list is the order on the page. A slug with no file
 * renders a placeholder tile rather than collapsing the grid.
 *
 * Not all of these are Rebelz. The individual and buddy lists also carry
 * frames from recent soccer and college cheer shoots, which show poses a
 * cheer athlete can copy and carry that club's branding in the corner.
 * The section lede says so, so the other logos read as a portfolio rather
 * than as a mistake.
 */

export const teamShots: string[] = [
  'team-01',
  'team-02',
];

export const individualPoses: string[] = [
  'pose-02',
  'pose-03',
  'pose-04',
  'pose-05',
  'pose-06',
  'pose-07',
  'pose-08',
  'pose-09',
  'pose-22',
  'pose-23',
  'pose-24',
  'pose-25',
  'pose-26',
  'pose-27',
  'pose-34',
  'pose-35',
  'pose-36',
  'pose-37',
  'pose-38',
];

export const buddyPoses: string[] = [
  'buddy_pose-28',
  'buddy_pose-29',
  'buddy_pose-30',
  'buddy_pose-31',
  'buddy_pose-32',
  'buddy_pose-33',
  'buddy_pose-34',
  'buddy_pose-35',
  'buddy_pose-36',
  'buddy_pose-37',
  'buddy_pose-38',
  'buddy_pose-39',
  'buddy_pose-40',
  'buddy_pose-41',
  'buddy_pose-42',
  'buddy_pose-43',
  'buddy_pose-44',
];

export interface PhotoGroup {
  id: string;
  /** The heading above the group. */
  label: string;
  /** Alt text for every photo in the group, numbered by the component. */
  alt: string;
  /** Team frames are landscape and get a wider, two-up grid. */
  wide: boolean;
  slugs: string[];
}

/** The three groups in page order, each with the heading it gets. */
export const photoGroups: PhotoGroup[] = [
  { id: 'team',       label: 'Example team shots', alt: 'Example team photo',      wide: true,  slugs: teamShots },
  { id: 'individual', label: 'Individual poses',   alt: 'Example individual pose', wide: false, slugs: individualPoses },
  { id: 'buddy',      label: 'Buddy poses',        alt: 'Example buddy pose',      wide: false, slugs: buddyPoses },
];

/** The frame that fronts the link in a text message, cropped to
 *  1200x630. A team photo, because it has to read at thumbnail size
 *  in iMessage. */
export const OG_POSE_SLUG = 'team-01';
