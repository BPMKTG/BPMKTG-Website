// ═══════════════════════════════════════════════════════════════
// /weddings — all page content in one place.
//
// This page is an unlisted funnel for a completely different customer
// than the rest of the site (couples, not EDM artists). It is not linked
// from the main nav or footer by design.
//
// Messaging follows the Irresistible Offer Formula worked out in Notion
// (Blueprint Marketing > IRRESISTIBLE OFFER FORMULA - WEDDING VIDEO/PHOTO).
// The load-bearing idea is the his & hers crew: a guy with the groomsmen,
// a girl with the bridesmaids. It is the USP, the hook, the comfort
// guarantee, and the answer to the two biggest objections, so it should
// stay the first thing a couple reads.
//
// Money line, from that doc, and worth keeping intact:
//   "Every part of your wedding day, captured by a team who was actually
//    there for both sides of it."
//
// ✅ Pricing, booking terms, and delivery windows below are CONFIRMED.
// ⚠️  Still outstanding: a dedicated wedding Calendly + inbox, the
//     Instagram URL, and real film/gallery assets (the current images are
//     stand-in frames pulled from the films).
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
  /** YouTube video id. Use for anything hosted on YouTube instead of Vimeo. */
  youtubeId?: string;
  preview?: string;
  /** 'h' = 16:9 tile, 'v' = 9:16 tile. Controls tile + player shape. */
  orientation?: 'h' | 'v';
  /**
   * Borrow another image as this tile's poster, by filename stem, from
   * either the thumbnails or the gallery folder. Lets a dozen frames
   * stand in across every tile without duplicating the binaries into the
   * repo. Drop a real `thumbnails/<slug>.jpg` in and delete this field.
   */
  posterSlug?: string;
}

/** Hero film — the one piece that opens the section at full width. */
export const featureFilm: WeddingFilm = {
  slug: 'feature-wedding-film',
  title: 'A Wedding Film',
  tag: 'Full Feature',
  category: 'Wedding Film',
  orientation: 'h',
  posterSlug: 'gallery-11',
  // vimeoId: 'TODO',
};

/** Wedding films / recaps — the highlight-reel format. */
export const weddingFilms: WeddingFilm[] = [
  { slug: 'wedding-film-01', title: 'The Wedding Film', tag: 'Full Day',          category: 'Wedding Film', orientation: 'h', posterSlug: 'gallery-04' },
  { slug: 'wedding-film-02', title: 'The Wedding Film', tag: 'Garden Ceremony',   category: 'Wedding Film', orientation: 'h', posterSlug: 'gallery-05' },
  { slug: 'wedding-film-03', title: 'The Wedding Film', tag: 'Evening Reception', category: 'Wedding Film', orientation: 'h', posterSlug: 'gallery-07' },
];

/** Ceremony multicam — the full, unabridged ceremony from every angle. */
export const ceremonyFilms: WeddingFilm[] = [
  { slug: 'ceremony-multicam-01', title: 'The Ceremony',   tag: 'Three-Camera Edit', category: 'Ceremony', orientation: 'h', posterSlug: 'gallery-01' },
  { slug: 'ceremony-multicam-02', title: 'The Vows',       tag: 'Full Audio Mix',    category: 'Ceremony', orientation: 'h', posterSlug: 'gallery-06' },
  { slug: 'ceremony-multicam-03', title: 'The Processional', tag: 'Multicam',        category: 'Ceremony', orientation: 'h', posterSlug: 'gallery-02' },
];

/** Video moments — short, high-quality clips of the beats that matter. */
// Eight so the 4-column grid fills two clean rows with no orphan tile.
export const momentFilms: WeddingFilm[] = [
  { slug: 'moment-first-look',      title: 'The First Look',      tag: 'Getting Ready', category: 'Moment', orientation: 'v', posterSlug: 'gallery-02' },
  { slug: 'moment-first-kiss',      title: 'The First Kiss',      tag: 'Ceremony',      category: 'Moment', orientation: 'v', posterSlug: 'gallery-08' },
  { slug: 'moment-grand-entrance',  title: 'The Grand Entrance',  tag: 'Reception',     category: 'Moment', orientation: 'v', posterSlug: 'gallery-10' },
  { slug: 'moment-first-dance',     title: 'The First Dance',     tag: 'Reception',     category: 'Moment', orientation: 'v', posterSlug: 'gallery-11' },
  { slug: 'moment-parent-dance',    title: 'The Parent Dance',    tag: 'Reception',     category: 'Moment', orientation: 'v', posterSlug: 'gallery-07' },
  { slug: 'moment-speeches',        title: 'The Speeches',        tag: 'Reception',     category: 'Moment', orientation: 'v', posterSlug: 'gallery-06' },
  { slug: 'moment-cake-cutting',    title: 'The Cake Cutting',    tag: 'Reception',     category: 'Moment', orientation: 'v', posterSlug: 'gallery-09' },
  { slug: 'moment-sendoff',         title: 'The Sendoff',         tag: 'Late Night',    category: 'Moment', orientation: 'v', posterSlug: 'gallery-04' },
];

/** Engagement films — shot before the day, often used at the reception. */
export const engagementFilms: WeddingFilm[] = [
  { slug: 'engagement-01', title: 'The Engagement Film', tag: 'Golden Hour', category: 'Engagement', orientation: 'h', posterSlug: 'gallery-03' },
  { slug: 'engagement-02', title: 'The Engagement Film', tag: 'At Home',     category: 'Engagement', orientation: 'h', posterSlug: 'gallery-10' },
  { slug: 'engagement-03', title: 'The Proposal',        tag: 'Documentary', category: 'Engagement', orientation: 'h', posterSlug: 'gallery-08' },
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
  /**
   * Tile shape in the masonry:
   *   'w' = 3:2 landscape  — use for 16:9 sources (video frames crop least here)
   *   'h' = 1:1 square
   *   'v' = 3:4 portrait
   * The shape holds whether or not the image exists yet, so the grid rhythm
   * is already correct with an empty folder.
   */
  orientation: 'w' | 'h' | 'v';
}

// Captions and shapes match the twelve frames from the cypress-swamp
// wedding, in the order they read best down the wall.
export const galleryPhotos: WeddingPhoto[] = [
  { slug: 'gallery-01', caption: 'The Groomsmen',      tag: 'Ceremony',      orientation: 'w' },
  { slug: 'gallery-02', caption: 'The First Look',     tag: 'Before',        orientation: 'w' },
  { slug: 'gallery-03', caption: 'The Bride',          tag: 'Portraits',     orientation: 'h' },
  { slug: 'gallery-04', caption: 'Boots Off The Ground', tag: 'The Boys',    orientation: 'w' },
  { slug: 'gallery-05', caption: 'The Chapel',         tag: 'Ceremony',      orientation: 'w' },
  { slug: 'gallery-06', caption: 'The Vows',           tag: 'Ceremony',      orientation: 'h' },
  { slug: 'gallery-07', caption: 'The Guests',         tag: 'Ceremony',      orientation: 'w' },
  { slug: 'gallery-08', caption: 'Just Married',       tag: 'Portraits',     orientation: 'w' },
  { slug: 'gallery-09', caption: 'The Cigar',          tag: 'Portraits',     orientation: 'h' },
  { slug: 'gallery-10', caption: 'The Bouquet',        tag: 'Portraits',     orientation: 'w' },
  { slug: 'gallery-11', caption: 'The Dock',           tag: 'The Swamp',     orientation: 'w' },
  { slug: 'gallery-12', caption: 'Under The Cypress',  tag: 'Details',       orientation: 'w' },
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
    positioning: 'The film, without the full-day build.',
    bestFor: 'Intimate weddings and shorter timelines. One filmmaker covering the ceremony, the portraits, and the first hour of the party.',
    includes: [
      '6 hours of coverage, one filmmaker',
      '4-6 minute wedding film',
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
    positioning: 'Both sides of the day, morning through late night.',
    bestFor: 'Most couples. Two filmmakers means a guy with the groomsmen and a girl with the bridesmaids, so nothing happens off camera.',
    includes: [
      '10 hours, two filmmakers: his and hers coverage',
      '6-8 minute wedding film',
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
    positioning: 'The complete story, with nothing left out.',
    bestFor: 'Couples who want one crew on both film and photo, plus an engagement session months before the day.',
    includes: [
      'Unlimited-hours coverage, three-person crew',
      'Everything in The Blueprint',
      'Full photo coverage + edited gallery',
      'Engagement film + engagement portrait session',
      'Rehearsal dinner coverage',
      'Drone / aerial coverage where permitted',
      'A documentary edit of the full day',
      'Priority delivery: teaser in 72 hours',
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
      { name: 'Wedding film',            detail: '4-8 minute highlight film of the full day',            price: 'from $2,200' },
      { name: 'Ceremony multicam',       detail: 'Full unabridged ceremony, three angles, full audio',   price: '$850' },
      { name: 'Video moments',           detail: 'Pack of 3 key moments, finished individually',         price: '$600' },
      { name: 'Additional video moment', detail: 'Each moment beyond your package',                      price: '$180' },
      { name: 'Engagement film',         detail: '90-second film from a two-hour session',               price: '$950' },
      { name: 'Social teaser',           detail: '60-second vertical cut, delivered inside 72 hours',    price: '$450' },
      { name: 'Toasts + speeches edit',  detail: 'Every speech, cleaned up and cut together',            price: '$400' },
      { name: 'Rehearsal dinner',        detail: 'Up to 3 hours of coverage the night before',           price: '$700' },
      { name: 'Documentary edit',        detail: 'The long-form cut, 20 to 40 minutes of the whole day',   price: '$800' },
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
  {
    title: 'The discovery call',
    body: 'Free. Your venue, your timeline, your people, and what you actually want to watch back. You leave knowing exactly what is covered and what it costs.',
  },
  {
    title: 'The engagement session',
    body: 'Shot months before the wedding, so you are comfortable on camera before it counts. You get a gallery and a short film for save-the-dates and invites.',
  },
  {
    title: 'The shot plan',
    body: 'A written, shot-by-shot plan for the day: who is with the bridesmaids, who is with the groomsmen, the family photo list, the multicam ceremony setup.',
  },
  {
    title: 'The day',
    body: 'His and hers coverage from getting ready through the last dance, with footage backed up in real time. We stay out of the way and we never restage a moment that already happened.',
  },
  {
    title: 'The delivery',
    body: 'Your teaser first, then your film and gallery on a date you were given in writing, finished with a walkthrough call.',
  },
];

// ─────────────────────────────────────────────────────────────
// FAQ
// ─────────────────────────────────────────────────────────────
export const faqs = [
  {
    q: 'What does "his and hers" actually mean?',
    a: 'It means a guy with the groomsmen and a girl with the bridesmaids. We are a husband-and-wife team: he runs video, she runs photo and the bridal side. On our two- and three-person packages that means both getting-ready rooms are covered at the same time, by someone who fits naturally in that room. Nobody is waiting on a shooter to finish one side and drive to the other.',
  },
  {
    q: 'I do not love the idea of a stranger filming me getting ready.',
    a: 'Most people do not, and that is exactly why we built it this way. You get a girl with the bridesmaids and a guy with the groomsmen, so it never feels like a stranger of the wrong gender in the room during the most unguarded hour of your day. That comfort is the difference between footage that looks natural and footage where everyone is holding their breath.',
  },
  {
    q: 'Do you shoot photo as well as video?',
    a: 'Both, from one team. They are not competing: photos freeze a moment you can print and frame, video lets you hear your vows again, hear the room laugh, watch the first dance. Most couples who book only one end up wishing they had both, and you cannot go back for the other half. If you genuinely only want one, book only one. The a la carte menu prices them separately.',
  },
  {
    q: 'That is more than we budgeted for.',
    a: 'Most couples come in assuming they can only afford one or the other, because two vendors means two invoices and two timelines. Booking one team covering both sides of your day costs less than hiring a separate photographer and videographer, and there is only one version of this day you will ever get. If the number is still wrong for you, the a la carte menu lets you build exactly what you want and nothing you do not.',
  },
  {
    q: 'A friend offered to shoot it for free.',
    a: 'That is a real option, and sometimes it works out. The difference is six years of shooting weddings, a written plan for every part of your day, and a team that is not also trying to be a guest at your wedding. A free shooter is not a bad person, they are just an unplanned one.',
  },
  {
    q: 'How far in advance should we book?',
    a: 'Most couples book 9 to 14 months out. We take one wedding per weekend so the crew is never split, which means popular dates close early. If your date is close, ask anyway. We hold a small number of short-notice slots.',
  },
  {
    q: 'When do we get everything?',
    a: 'Your teaser lands within 72 hours, and your full film and gallery within six weeks. You get that delivery date in writing when you book, so there is no vague timeline and no chasing us down. Rush delivery pulls the full film inside 14 days if you want it sooner.',
  },
  {
    q: 'What is a "video moment"?',
    a: 'A single beat of the day, finished as its own short film: the first look, the first kiss, the first dance, the toast that wrecked everybody, the sendoff. They live separately from the highlight film so you can send one to your grandmother without making her scrub through eight minutes to find it.',
  },
  {
    q: 'Will you be in our faces all day?',
    a: 'No. We came up shooting live music, where you get one take and you do not get to interrupt the show. That habit carries over: we work long lenses, we stay quiet, and we do not stop your wedding to restage a moment that already happened.',
  },
  {
    q: 'Will our film look like everyone else\'s?',
    a: 'Not if we do our job. The reason most wedding films feel interchangeable is that they are built from a template: same drone shot, same slow-motion first dance, same acoustic cover. We plan your day around your actual people and your actual venue, and we cut to music that means something to you.',
  },
  {
    q: 'Do you travel?',
    a: 'Yes. Travel within 90 miles is included. Beyond that we quote travel and lodging up front, so there is never a surprise line item after the fact.',
  },
  {
    q: 'What do you need from us to hold a date?',
    a: 'A signed agreement and a 30% retainer. The balance is due two weeks before the wedding, and we can split it across the months in between if that is easier.',
  },
];
