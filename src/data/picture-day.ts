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
    detail: "Hair, bow and uniform sorted before your team's time.",
  },
];

/** Read twice by parents who get it wrong once, so it is its own line
 *  rather than a clause inside step two. */
export const venmoNote =
  "In your Venmo note, include your athlete's name + team.";

/* ── example poses ────────────────────────────────────────────── */

export interface Photo {
  /** Filename without extension, in src/assets/images/picture-day/.
   *  A slug with no file on disk renders a placeholder tile rather
   *  than collapsing the grid. */
  slug: string;
  alt: string;
}

/**
 * The gallery, in the three groups a parent actually shops by: what
 * the team photo looks like, what an individual looks like, and what a
 * buddy shot looks like. Each group is its own uniform grid, so nothing
 * is cropped: the team frames are 3:2 and every other frame is 2:3, and
 * the tiles are set to match.
 *
 * Add a photo by dropping the file in and adding a row to the right
 * list. Order inside a list is the order on the page. Alt text is
 * written per photo rather than generated, because "pose 14" tells a
 * parent using a screen reader nothing at all.
 *
 * Not all of these are Rebelz. The individual and buddy lists also
 * carry frames from recent soccer and college cheer shoots, which show
 * poses a cheer athlete can copy and carry that club's branding in the
 * corner. The section heading says so, so the other logos read as a
 * portfolio rather than as a mistake.
 */

export const teamShots: Photo[] = [
  { slug: 'team-01', alt: 'The Lady Legacy team photo, the squad lined up under purple stage lights' },
  { slug: 'team-02', alt: 'The Rampage team photo, two rows of athletes under purple stage lights' },
];

export const individualPoses: Photo[] = [
  { slug: 'pose-02', alt: 'A cheerleader standing with one hand behind her head and the other on her hip' },
  { slug: 'pose-03', alt: 'A cheerleader standing with her arms crossed, in the white and blue uniform' },
  { slug: 'pose-04', alt: 'A cheerleader with her arms crossed, facing the camera straight on' },
  { slug: 'pose-05', alt: 'A cheerleader holding a crown above her head with both hands' },
  { slug: 'pose-06', alt: 'A cheerleader lifting a crown overhead, feet together and smiling' },
  { slug: 'pose-07', alt: 'A cheerleader kneeling on one knee, turned to the side' },
  { slug: 'pose-08', alt: 'A cheerleader seated on the floor with her legs extended, holding a crown above her head' },
  { slug: 'pose-09', alt: 'A cheerleader lying on her front, chin in her hands, with a crown balanced on her shoe' },
  { slug: 'pose-22', alt: 'A soccer player balancing the ball on her foot with her hands pressed together' },
  { slug: 'pose-23', alt: 'A soccer player standing tall and pointing straight at the camera' },
  { slug: 'pose-24', alt: 'A soccer player wrapped in a flag, looking back over her shoulder' },
  { slug: 'pose-25', alt: 'A soccer player laughing with one knee lifted and both arms loose' },
  { slug: 'pose-26', alt: 'A soccer player in a cowboy hat, arms folded, balancing the ball on her foot' },
  { slug: 'pose-27', alt: 'A soccer player holding a flag spread wide behind her shoulders' },
  { slug: 'pose-34', alt: 'A college cheerleader with one hand behind her head, a pom raised in the other' },
  { slug: 'pose-35', alt: 'A college cheerleader holding up a painted team sign with both hands' },
  { slug: 'pose-36', alt: 'A college cheerleader pointing at the camera, one hand on her hip' },
  { slug: 'pose-37', alt: 'A college cheerleader in a jazz stand with one pom high and one low' },
  { slug: 'pose-38', alt: 'A college cheerleader spinning a basketball on one finger' },
];

export const buddyPoses: Photo[] = [
  { slug: 'buddy_pose-28', alt: 'Two teammates standing back to back, looking over their shoulders' },
  { slug: 'buddy_pose-29', alt: 'Two teammates side by side with their inside hands joined overhead' },
  { slug: 'buddy_pose-30', alt: 'One athlete sitting on a teammate\'s shoulders with both arms stretched wide' },
  { slug: 'buddy_pose-31', alt: 'An athlete carrying a teammate on his shoulders while she holds a crown overhead' },
  { slug: 'buddy_pose-32', alt: 'Two young teammates together, one kneeling and one standing' },
  { slug: 'buddy_pose-33', alt: 'Two teammates lying on their fronts, smiling down at a crown between them' },
  { slug: 'buddy_pose-34', alt: 'A soccer player lifting a teammate across her hip, both laughing' },
  { slug: 'buddy_pose-35', alt: 'Two soccer teammates, one lying on the floor and one crouching behind her' },
  { slug: 'buddy_pose-36', alt: 'Three soccer teammates stacked on the floor with their heads resting on each other' },
  { slug: 'buddy_pose-37', alt: 'Two soccer teammates in sunglasses with the ball between their feet' },
  { slug: 'buddy_pose-38', alt: 'Two soccer teammates in cowboy hats, back to back and pointing at the camera' },
  { slug: 'buddy_pose-39', alt: 'Three college cheerleaders piled on one another, laughing' },
  { slug: 'buddy_pose-40', alt: 'Two college cheerleaders with a painted sign and a raised pom' },
  { slug: 'buddy_pose-41', alt: 'Two college cheerleaders standing with a sign each, held chest high' },
  { slug: 'buddy_pose-42', alt: 'Two college cheerleaders kneeling, holding a sign each above their knees' },
  { slug: 'buddy_pose-43', alt: 'One college cheerleader carrying a teammate across both arms' },
  { slug: 'buddy_pose-44', alt: 'Two college cheerleaders, one lying on the floor and one seated behind her' },
];

/** The three groups in page order, each with the heading it gets. */
export const photoGroups: Array<{ id: string; label: string; wide: boolean; photos: Photo[] }> = [
  { id: 'team',       label: 'Example team shots', wide: true,  photos: teamShots },
  { id: 'individual', label: 'Individual poses',   wide: false, photos: individualPoses },
  { id: 'buddy',      label: 'Buddy poses',        wide: false, photos: buddyPoses },
];

/** The frame that fronts the link in a text message, cropped to
 *  1200x630. A team photo, because it has to read at thumbnail size
 *  in iMessage. */
export const OG_POSE_SLUG = 'team-01';
