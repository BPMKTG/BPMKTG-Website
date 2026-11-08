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
  /** 'v' is one column, 'w' is two. Everything is two rows tall, so a
   *  'v' lands on roughly 2:3 and a 'w' on roughly 3:2, which is what
   *  the portraits and the team photos actually are. Barely any crop. */
  orientation: 'v' | 'w';
  /** object-position, for the few frames where the athlete sits low in
   *  a tall file and a centred crop would cut their head off. */
  focus?: string;
}

/**
 * The collage.
 *
 * ORDER MATTERS, and not for the reason it usually does. The grid is
 * three columns wide and every tile is two rows tall, so a 'w' takes
 * two of the three slots in its band. With the two team photos at
 * positions 1 and 10, the sixteen tiles fill six bands exactly and the
 * last row is not half empty. Moving a photo is fine; moving a team
 * photo means counting again.
 *
 * Alt text is written per photo rather than generated, because "pose 4"
 * tells a parent using a screen reader nothing at all.
 */
export const poses: Pose[] = [
  { slug: 'pose-01', orientation: 'w', alt: 'The Lady Legacy team photo, the squad lined up under purple stage lights' },
  { slug: 'pose-02', orientation: 'v', alt: 'A cheerleader standing with one hand behind her head and the other on her hip' },
  { slug: 'pose-03', orientation: 'v', alt: 'A cheerleader standing with her arms crossed, in the white and blue uniform' },
  { slug: 'pose-04', orientation: 'v', alt: 'A cheerleader with her arms crossed, facing the camera straight on' },
  { slug: 'pose-05', orientation: 'v', alt: 'A cheerleader holding a crown above her head with both hands' },
  { slug: 'pose-06', orientation: 'v', alt: 'A cheerleader lifting a crown overhead, feet together and smiling' },
  { slug: 'pose-07', orientation: 'v', alt: 'A cheerleader kneeling on one knee, turned to the side' },
  { slug: 'pose-08', orientation: 'v', focus: 'center bottom', alt: 'A cheerleader seated on the floor with her legs extended, holding a crown above her head' },
  { slug: 'pose-09', orientation: 'v', focus: 'center bottom', alt: 'A cheerleader lying on her front, chin in her hands, with a crown balanced on her shoe' },
  { slug: 'pose-10', orientation: 'w', alt: 'The Rampage team photo, two rows of athletes under purple stage lights' },
  { slug: 'pose-11', orientation: 'v', alt: 'Two teammates standing back to back, looking over their shoulders' },
  { slug: 'pose-12', orientation: 'v', alt: 'Two teammates side by side with their inside hands joined overhead' },
  { slug: 'pose-13', orientation: 'v', alt: 'One athlete sitting on a teammate\'s shoulders with both arms stretched wide' },
  { slug: 'pose-14', orientation: 'v', alt: 'An athlete carrying a teammate on his shoulders while she holds a crown overhead' },
  { slug: 'pose-15', orientation: 'v', alt: 'Two young teammates together, one kneeling and one standing' },
  { slug: 'pose-16', orientation: 'v', focus: 'center bottom', alt: 'Two teammates lying on their fronts, smiling down at a crown between them' },
];

export const OG_POSE_SLUG = 'pose-01';
