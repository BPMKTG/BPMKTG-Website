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
  /** One line, on the front of the card. */
  summary: string;
  /** The full list, on the back. */
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
    summary: 'One individual photo, plus the team photo.',
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
    summary: 'Three individual photos, plus the team photo.',
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
    summary: 'Three individual photos on the Rebelz backdrop, plus the team photo.',
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
    detail: "Hair, bow and uniform sorted before your team's time.",
  },
];

/** Read twice by parents who get it wrong once, so it is its own line
 *  rather than a clause inside step two. */
export const venmoNote =
  "In your Venmo note, include your athlete's name + team.";

/* ── example poses ────────────────────────────────────────────── */

export interface Pose {
  /** The filename, without extension, in
   *  src/assets/images/picture-day/. A tile with no matching file
   *  renders as a placeholder rather than disappearing, so the grid
   *  keeps its shape before the photos land. */
  slug: string;
  alt: string;
  /** Tile shape: 'v' portrait, 'h' square-ish, 'w' wide. Drives the
   *  collage rhythm, and does so whether or not the file exists. */
  orientation: 'v' | 'h' | 'w';
}

/**
 * The collage.
 *
 * Add or remove rows freely: the grid is built from this list. Drop
 * `pose-01.jpg` (or .jpeg/.png) into src/assets/images/picture-day/
 * and that tile fills itself in on the next build. Alt text is
 * written here rather than generated, because "pose 1" tells a
 * parent using a screen reader nothing at all.
 */
export const poses: Pose[] = [
  { slug: 'pose-01', alt: 'Cheerleader standing with pom poms on one hip', orientation: 'v' },
  { slug: 'pose-02', alt: 'Cheerleader kneeling with both poms raised', orientation: 'h' },
  { slug: 'pose-03', alt: 'Cheerleader in a high V with poms', orientation: 'v' },
  { slug: 'pose-04', alt: 'Two teammates back to back, buddy shot', orientation: 'w' },
  { slug: 'pose-05', alt: 'Cheerleader mid-jump against the backdrop', orientation: 'v' },
  { slug: 'pose-06', alt: 'Close portrait, bow in frame', orientation: 'h' },
  { slug: 'pose-07', alt: 'Cheerleader seated with poms crossed in her lap', orientation: 'h' },
  { slug: 'pose-08', alt: 'Full team lined up for the team photo', orientation: 'w' },
];

/** The frame that fronts the link in a text message. The first pose
 *  that actually exists on disk wins; the component falls back to the
 *  brand card when none of them do yet. */
export const OG_POSE_SLUG = 'pose-01';
