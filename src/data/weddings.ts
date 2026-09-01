// ═══════════════════════════════════════════════════════════════
// /weddings — all page content in one place.
//
// This page is an unlisted funnel for a completely different customer
// than the rest of the site (couples, not EDM artists). It is not linked
// from the main nav or footer by design.
//
// ⚠️  PLACEHOLDER CONTENT
//     Everything marked TODO below is a first draft written to make the
//     page real and shippable — NOT confirmed business information.
//     Specifically: every price, every package inclusion count, the
//     delivery windows, and all film/gallery entries (we have not shot a
//     wedding gallery yet). Replace before this URL goes to a client.
// ═══════════════════════════════════════════════════════════════

import { CALENDLY_URL, CONTACT_EMAIL } from '../config/cta';

// TODO: swap in a dedicated wedding booking link + inbox if you want the
// two funnels tracked separately. Until then both fall back to the main
// company destinations, so no CTA on this page is ever dead.
export const WEDDING_CALENDLY_URL = CALENDLY_URL;
export const WEDDING_EMAIL        = CONTACT_EMAIL;

export const WEDDING_INSTAGRAM = '[WEDDING-INSTAGRAM-URL]'; // TODO

// ─────────────────────────────────────────────────────────────
// Film entries
//
// `slug` doubles as the poster-image filename: drop
// `src/assets/images/weddings/thumbnails/<slug>.jpg` in and the tile
// picks it up automatically. Until then the tile renders an elegant
// placeholder frame instead of a broken image.
//
// `vimeoId` is optional for the same reason — a tile without one shows
// a "Coming soon" state rather than opening an empty player.
// `preview` is an optional muted mp4 in /public/videos/previews/ that
// plays on hover, exactly like the EDM portfolio tiles.
// ─────────────────────────────────────────────────────────────
export interface WeddingFilm {
  slug: string;
  title: string;
  tag: string;
  category: string;
  vimeoId?: string;
  preview?: string;
  /** 'h' = 16:9 tile, 'v' = 9:16 tile. Controls tile + player shape. */
  orientation?: 'h' | 'v';
}

/** Hero film — the one piece that opens the section at full width. */
export const featureFilm: WeddingFilm = {
  slug: 'feature-wedding-film',
  title: 'A Wedding Film',
  tag: 'Full Feature',
  category: 'Wedding Film',
  orientation: 'h',
  // vimeoId: 'TODO',
};

/** Wedding films / recaps — the highlight-reel format. */
export const weddingFilms: WeddingFilm[] = [
  { slug: 'wedding-film-01', title: 'The Wedding Film', tag: 'Full Day',          category: 'Wedding Film', orientation: 'h' },
  { slug: 'wedding-film-02', title: 'The Wedding Film', tag: 'Garden Ceremony',   category: 'Wedding Film', orientation: 'h' },
  { slug: 'wedding-film-03', title: 'The Wedding Film', tag: 'Evening Reception', category: 'Wedding Film', orientation: 'h' },
];

/** Ceremony multicam — the full, unabridged ceremony from every angle. */
export const ceremonyFilms: WeddingFilm[] = [
  { slug: 'ceremony-multicam-01', title: 'The Ceremony',   tag: 'Three-Camera Edit', category: 'Ceremony', orientation: 'h' },
  { slug: 'ceremony-multicam-02', title: 'The Vows',       tag: 'Full Audio Mix',    category: 'Ceremony', orientation: 'h' },
  { slug: 'ceremony-multicam-03', title: 'The Processional', tag: 'Multicam',        category: 'Ceremony', orientation: 'h' },
];

/** Video moments — short, high-quality clips of the beats that matter. */
// Eight so the 4-column grid fills two clean rows with no orphan tile.
export const momentFilms: WeddingFilm[] = [
  { slug: 'moment-first-look',      title: 'The First Look',      tag: 'Getting Ready', category: 'Moment', orientation: 'v' },
  { slug: 'moment-first-kiss',      title: 'The First Kiss',      tag: 'Ceremony',      category: 'Moment', orientation: 'v' },
  { slug: 'moment-grand-entrance',  title: 'The Grand Entrance',  tag: 'Reception',     category: 'Moment', orientation: 'v' },
  { slug: 'moment-first-dance',     title: 'The First Dance',     tag: 'Reception',     category: 'Moment', orientation: 'v' },
  { slug: 'moment-parent-dance',    title: 'The Parent Dance',    tag: 'Reception',     category: 'Moment', orientation: 'v' },
  { slug: 'moment-speeches',        title: 'The Speeches',        tag: 'Reception',     category: 'Moment', orientation: 'v' },
  { slug: 'moment-cake-cutting',    title: 'The Cake Cutting',    tag: 'Reception',     category: 'Moment', orientation: 'v' },
  { slug: 'moment-sendoff',         title: 'The Sendoff',         tag: 'Late Night',    category: 'Moment', orientation: 'v' },
];

/** Engagement films — shot before the day, often used at the reception. */
export const engagementFilms: WeddingFilm[] = [
  { slug: 'engagement-01', title: 'The Engagement Film', tag: 'Golden Hour', category: 'Engagement', orientation: 'h' },
  { slug: 'engagement-02', title: 'The Engagement Film', tag: 'At Home',     category: 'Engagement', orientation: 'h' },
  { slug: 'engagement-03', title: 'The Proposal',        tag: 'Documentary', category: 'Engagement', orientation: 'h' },
];

// ─────────────────────────────────────────────────────────────
// Photo gallery
//
// Same convention: drop `src/assets/images/weddings/gallery/<slug>.jpg`
// and the tile fills in. `orientation` drives the tile shape whether or
// not the image exists yet, so the masonry layout is already correct.
// ─────────────────────────────────────────────────────────────
export interface WeddingPhoto {
  slug: string;
  caption: string;
  tag: string;
  orientation: 'h' | 'v';
}

export const galleryPhotos: WeddingPhoto[] = [
  { slug: 'gallery-01', caption: 'The First Look',    tag: 'Getting Ready', orientation: 'h' },
  { slug: 'gallery-02', caption: 'The Portrait',      tag: 'Golden Hour',   orientation: 'v' },
  { slug: 'gallery-03', caption: 'The Details',       tag: 'The Rings',     orientation: 'h' },
  { slug: 'gallery-04', caption: 'The Aisle',         tag: 'Ceremony',      orientation: 'v' },
  { slug: 'gallery-05', caption: 'The Vows',          tag: 'Ceremony',      orientation: 'h' },
  { slug: 'gallery-06', caption: 'The First Kiss',    tag: 'Ceremony',      orientation: 'v' },
  { slug: 'gallery-07', caption: 'The Party',         tag: 'Reception',     orientation: 'h' },
  { slug: 'gallery-08', caption: 'The First Dance',   tag: 'Reception',     orientation: 'v' },
  { slug: 'gallery-09', caption: 'The Toast',         tag: 'Reception',     orientation: 'h' },
  { slug: 'gallery-10', caption: 'The Table',         tag: 'Details',       orientation: 'v' },
  { slug: 'gallery-11', caption: 'The Sendoff',       tag: 'Late Night',    orientation: 'h' },
  { slug: 'gallery-12', caption: 'The Two of You',    tag: 'Portraits',     orientation: 'v' },
];

// ─────────────────────────────────────────────────────────────
// Packages — three-card offer stack.
// ⚠️ TODO: every price and inclusion below is a placeholder draft.
// ─────────────────────────────────────────────────────────────
export interface WeddingPackage {
  slug: string;
  eyebrow: string;
  name: string;
  price: string;
  cadence: string;
  positioning: string;
  bestFor: string;
  includes: string[];
  featured: boolean;
}

export const packages: WeddingPackage[] = [
  {
    slug: 'foundation',
    eyebrow: 'Package 01',
    name: 'The Foundation',
    price: '$2,850',
    cadence: 'up to 6 hours of coverage',
    positioning: 'The day, told properly — ceremony, portraits, and the first hour of the party.',
    bestFor: 'Intimate weddings, shorter timelines, couples who want the film without the full-day build.',
    includes: [
      '6 hours of same-day coverage, one filmmaker',
      '4–6 minute wedding film',
      'Full ceremony, multicam edit',
      '3 video moments of your choosing',
      'Licensed music + full audio mix',
      'Online gallery delivered in 6 weeks',
    ],
    featured: false,
  },
  {
    slug: 'blueprint',
    eyebrow: 'Package 02',  // the ribbon already says "Most booked"
    name: 'The Blueprint',
    price: '$4,950',
    cadence: 'up to 10 hours of coverage',
    positioning: 'Getting ready to last dance, with two filmmakers so nothing happens off camera.',
    bestFor: 'Most couples. Full-day weddings where the morning and the late night both matter.',
    includes: [
      '10 hours of coverage, two filmmakers',
      '6–8 minute wedding film',
      'Full ceremony, three-camera multicam edit',
      'Full toasts + speeches edit',
      '6 video moments of your choosing',
      'A 60-second social teaser, delivered first',
      'Licensed music + full audio mix',
      'Online gallery delivered in 6 weeks',
    ],
    featured: true,
  },
  {
    slug: 'legacy',
    eyebrow: 'Package 03 · Film + Photo',
    name: 'The Legacy',
    price: '$8,500',
    cadence: 'full-day film + photo',
    positioning: 'One team on film and photo, so the two halves of your gallery finally look like they belong together.',
    bestFor: 'Couples who want a single crew covering everything, plus an engagement session beforehand.',
    includes: [
      'Unlimited-hours coverage, three-person crew',
      'Everything in The Blueprint',
      'Full photo coverage + edited gallery',
      'Engagement film + engagement portrait session',
      'Rehearsal dinner coverage',
      'Drone / aerial coverage where permitted',
      'A documentary edit of the full day',
      'Priority delivery — teaser in 72 hours',
    ],
    featured: false,
  },
];

// ─────────────────────────────────────────────────────────────
// À la carte menu — add to any package, or book on its own.
// ⚠️ TODO: placeholder pricing.
// ─────────────────────────────────────────────────────────────
export interface AlaCarteGroup {
  heading: string;
  note: string;
  items: { name: string; detail: string; price: string }[];
}

export const alaCarte: AlaCarteGroup[] = [
  {
    heading: 'Film',
    note: 'Where we started, and still what we do best.',
    items: [
      { name: 'Wedding film',            detail: '4–8 minute highlight film of the full day',            price: 'from $2,200' },
      { name: 'Ceremony multicam',       detail: 'Full unabridged ceremony, three angles, full audio',   price: '$850' },
      { name: 'Video moments',           detail: 'Pack of 3 key moments, finished individually',         price: '$600' },
      { name: 'Additional video moment', detail: 'Each moment beyond your package',                      price: '$180' },
      { name: 'Engagement film',         detail: '90-second film from a two-hour session',               price: '$950' },
      { name: 'Social teaser',           detail: '60-second vertical cut, delivered inside 72 hours',    price: '$450' },
      { name: 'Toasts + speeches edit',  detail: 'Every speech, cleaned up and cut together',            price: '$400' },
      { name: 'Rehearsal dinner',        detail: 'Up to 3 hours of coverage the night before',           price: '$700' },
      { name: 'Documentary edit',        detail: 'The long-form cut — 20–40 minutes of the whole day',   price: '$800' },
    ],
  },
  {
    heading: 'Photo',
    note: 'Booked alongside film so one crew runs your whole day.',
    items: [
      { name: 'Photo coverage',      detail: '8 hours, one photographer, edited gallery',      price: 'from $2,400' },
      { name: 'Second photographer', detail: 'A second angle on every moment',                 price: '$650' },
      { name: 'Engagement session',  detail: 'Two-hour session, 60+ edited images',            price: '$550' },
      { name: 'Printed album',       detail: '10x10 lay-flat, 40 pages, designed by us',       price: 'from $700' },
    ],
  },
  {
    heading: 'Add-ons',
    note: 'Available with any package above.',
    items: [
      { name: 'Additional hour',       detail: 'Per hour, per crew member',                      price: '$275' },
      { name: 'Second filmmaker',      detail: 'Full-day coverage from a second angle',          price: '$800' },
      { name: 'Drone / aerial',        detail: 'Where the venue and airspace permit',            price: '$400' },
      { name: 'Rush delivery',         detail: 'Full film inside 14 days',                       price: '$600' },
      { name: 'Raw footage',           detail: 'Every clip we shot, on a drive you keep',        price: '$350' },
      { name: 'Travel beyond 90 miles',detail: 'Per crew member, plus lodging where needed',     price: 'quoted' },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Process
// ─────────────────────────────────────────────────────────────
export const processSteps = [
  { title: 'Check your date',   body: 'Tell us where and when. We hold one wedding per weekend, so dates go early.' },
  { title: 'The consult',       body: 'A 30-minute call — your venue, your timeline, the people who matter, and what you actually want to watch back.' },
  { title: 'Build the plan',    body: 'You get a written coverage plan: crew, hours, the shot list, and the moments you told us you cannot miss.' },
  { title: 'The day',           body: 'We stay out of the way. No staging, no posing you through your own wedding, no camera in your face during the vows.' },
  { title: 'The delivery',      body: 'A teaser first, then your films and gallery in one private online home you can share with everyone who missed it.' },
];

// ─────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────
export const faqs = [
  {
    q: 'Do you shoot photo as well as video?',
    a: 'Both. Film is where we built our name — festival stages, live production, high-pressure single-take moments — and photo runs alongside it with the same crew. If you only want one, book only one; the à la carte menu prices them separately.',
  },
  {
    q: 'How far in advance should we book?',
    a: 'Most couples book 9–14 months out. We take one wedding per weekend so the crew is never split, which means popular dates close early. If your date is close, ask anyway — we hold a small number of short-notice slots.',
  },
  {
    q: 'When do we get everything?',
    a: 'Your social teaser lands first, then the full gallery within six weeks of the wedding. Rush delivery pulls the full film inside 14 days if you want it sooner.',
  },
  {
    q: 'What is a "video moment"?',
    a: 'A single beat of the day, finished as its own short film — the first look, the first kiss, the first dance, the toast that wrecked everybody, the sendoff. They live separately from the highlight film so you can send one to your grandmother without making her scrub through eight minutes to find it.',
  },
  {
    q: 'Will you be in our faces all day?',
    a: 'No. We come from live events, where you get one take and you do not get to interrupt the show. That habit carries over: we work long lenses, we stay quiet, and we do not stop your wedding to restage a moment that already happened.',
  },
  {
    q: 'Do you travel?',
    a: 'Yes. Travel within 90 miles is included. Beyond that we quote travel and lodging up front — there is never a surprise line item after the fact.',
  },
  {
    q: 'Can we pick the music?',
    a: 'Bring us songs that mean something and we will build around them wherever the license allows. Everything we deliver is properly licensed, so your film will never get muted or pulled off a platform later.',
  },
  {
    q: 'What do you need from us to hold a date?',
    a: 'A signed agreement and a 30% retainer. The balance is due two weeks before the wedding, and we can split it across the months in between if that is easier.',
  },
];
