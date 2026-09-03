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
// How it actually works, per Mason: while the couple is getting ready
// apart, BOTH of them shoot hybrid (photo and video) in their own room,
// so neither side trades one medium for the other. Once the couple is
// together, Makenzie takes photo and Mason takes video. Copy anywhere on
// the page should match that split.
//
// That describes how the day is COVERED, not what a package DELIVERS.
// The Foundation and The Blueprint are film packages; an edited photo
// gallery comes with The Legacy or as a photo add-on. Both FAQ answers
// that touch photo say so, so a film-only couple cannot read the his &
// hers hook as photo being included.
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
  posterSlug: 'wedding-11',
  // vimeoId: 'TODO',
};

/** Wedding films / recaps — the highlight-reel format. */
export const weddingFilms: WeddingFilm[] = [
  { slug: 'wedding-film-01', title: 'The Wedding Film', tag: 'Full Day',          category: 'Wedding Film', orientation: 'h', posterSlug: 'wedding-04' },
  { slug: 'wedding-film-02', title: 'The Wedding Film', tag: 'Garden Ceremony',   category: 'Wedding Film', orientation: 'h', posterSlug: 'wedding-05' },
  { slug: 'wedding-film-03', title: 'The Wedding Film', tag: 'Evening Reception', category: 'Wedding Film', orientation: 'h', posterSlug: 'wedding-07' },
];

/** Ceremony multicam — the full, unabridged ceremony from every angle. */
export const ceremonyFilms: WeddingFilm[] = [
  { slug: 'ceremony-multicam-01', title: 'The Ceremony',   tag: 'Three-Camera Edit', category: 'Ceremony', orientation: 'h', posterSlug: 'wedding-01' },
  { slug: 'ceremony-multicam-02', title: 'The Vows',       tag: 'Full Audio Mix',    category: 'Ceremony', orientation: 'h', posterSlug: 'wedding-06' },
  { slug: 'ceremony-multicam-03', title: 'The Processional', tag: 'Multicam',        category: 'Ceremony', orientation: 'h', posterSlug: 'wedding-02' },
];

/** Video moments — short, high-quality clips of the beats that matter. */
// Horizontal, like every other film on the page. A vertical crop for
// social is available on request, so the tiles show the master 16:9 the
// clip is actually delivered in rather than the crop.
// Eight so the 4-column grid fills two clean rows with no orphan tile.
export const momentFilms: WeddingFilm[] = [
  { slug: 'moment-first-look',      title: 'The First Look',      tag: 'Getting Ready', category: 'Moment', orientation: 'h', posterSlug: 'wedding-02' },
  { slug: 'moment-first-kiss',      title: 'The First Kiss',      tag: 'Ceremony',      category: 'Moment', orientation: 'h', posterSlug: 'wedding-08' },
  { slug: 'moment-grand-entrance',  title: 'The Grand Entrance',  tag: 'Reception',     category: 'Moment', orientation: 'h', posterSlug: 'wedding-10' },
  { slug: 'moment-first-dance',     title: 'The First Dance',     tag: 'Reception',     category: 'Moment', orientation: 'h', posterSlug: 'wedding-11' },
  { slug: 'moment-parent-dance',    title: 'The Parent Dance',    tag: 'Reception',     category: 'Moment', orientation: 'h', posterSlug: 'wedding-07' },
  { slug: 'moment-speeches',        title: 'The Speeches',        tag: 'Reception',     category: 'Moment', orientation: 'h', posterSlug: 'wedding-06' },
  { slug: 'moment-cake-cutting',    title: 'The Cake Cutting',    tag: 'Reception',     category: 'Moment', orientation: 'h', posterSlug: 'wedding-09' },
  { slug: 'moment-sendoff',         title: 'The Sendoff',         tag: 'Late Night',    category: 'Moment', orientation: 'h', posterSlug: 'wedding-04' },
];

/** Engagement films — shot before the day, often used at the reception. */
// Slugs are `engagement-film-NN`, NOT `engagement-NN`. WedFilms globs the
// gallery folder as well as thumbnails/ into one slug map, so a film slug
// that collides with a gallery filename silently steals that photo as its
// poster and overrides its own posterSlug. `engagement-NN` collided with
// the engagement photos the moment they landed. Matches the naming the
// other groups already use (`wedding-film-NN`, `ceremony-multicam-NN`).
export const engagementFilms: WeddingFilm[] = [
  { slug: 'engagement-film-01', title: 'The Engagement Film', tag: 'Golden Hour', category: 'Engagement', orientation: 'h', posterSlug: 'wedding-03' },
  { slug: 'engagement-film-02', title: 'The Engagement Film', tag: 'At Home',     category: 'Engagement', orientation: 'h', posterSlug: 'wedding-10' },
  { slug: 'engagement-film-03', title: 'The Proposal',        tag: 'Documentary', category: 'Engagement', orientation: 'h', posterSlug: 'wedding-08' },
];

// ─────────────────────────────────────────────────────────────
// Photo gallery
//
// Three service lines share one gallery wall, filtered by `category`.
// The tab bar in WedGallery builds itself from the categories that have
// at least one REAL image on disk, so a category that is scaffolded but
// unshot never shows a tab full of empty tiles, and the bar hides itself
// entirely while only one category has photos.
//
// Same drop-in convention as before, with the slug now carrying the
// category: `src/assets/images/weddings/gallery/<slug>.jpg`.
// `orientation` drives the tile shape whether or not the image exists,
// so the masonry rhythm is correct with an empty folder.
// ─────────────────────────────────────────────────────────────
export type PhotoCategory = 'wedding' | 'engagement' | 'proposal';

export interface WeddingPhoto {
  slug: string;
  caption: string;
  tag: string;
  category: PhotoCategory;
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

/** Tab labels, and the order the tabs appear in. */
export const photoCategories: { id: PhotoCategory; label: string }[] = [
  { id: 'wedding',    label: 'Weddings' },
  { id: 'engagement', label: 'Engagements' },
  { id: 'proposal',   label: 'Proposals' },
];

// Captions and shapes match the twelve frames from the cypress-swamp
// wedding, in the order they read best down the wall.
const weddingPhotos: WeddingPhoto[] = [
  { slug: 'wedding-01', caption: 'The Groomsmen',      tag: 'Ceremony',   category: 'wedding', orientation: 'w' },
  { slug: 'wedding-02', caption: 'The First Look',     tag: 'Before',     category: 'wedding', orientation: 'w' },
  { slug: 'wedding-03', caption: 'The Bride',          tag: 'Portraits',  category: 'wedding', orientation: 'h' },
  { slug: 'wedding-04', caption: 'Boots Off The Ground', tag: 'The Boys', category: 'wedding', orientation: 'w' },
  { slug: 'wedding-05', caption: 'The Chapel',         tag: 'Ceremony',   category: 'wedding', orientation: 'w' },
  { slug: 'wedding-06', caption: 'The Vows',           tag: 'Ceremony',   category: 'wedding', orientation: 'h' },
  { slug: 'wedding-07', caption: 'The Guests',         tag: 'Ceremony',   category: 'wedding', orientation: 'w' },
  { slug: 'wedding-08', caption: 'Just Married',       tag: 'Portraits',  category: 'wedding', orientation: 'w' },
  { slug: 'wedding-09', caption: 'The Cigar',          tag: 'Portraits',  category: 'wedding', orientation: 'h' },
  { slug: 'wedding-10', caption: 'The Bouquet',        tag: 'Portraits',  category: 'wedding', orientation: 'w' },
  { slug: 'wedding-11', caption: 'The Dock',           tag: 'The Swamp',  category: 'wedding', orientation: 'w' },
  { slug: 'wedding-12', caption: 'Under The Cypress',  tag: 'Details',    category: 'wedding', orientation: 'w' },
];

// TWO different couples, deliberately in one list: the gallery sells the
// service, not the session, so they interleave on the wall.
//
//   01-26  Mason and Makenzie's own: overcast winter, the spiral stair,
//          the white chapel at Grace Heritage, the courtyard. Numbering
//          has GAPS: 03, 07, 11, 12, 15, 22 and 24 were culled by the
//          owner on 2026-09-03. The gaps are deliberate, do not renumber
//          to close them. The slug is only a key onto a filename, so a
//          hole costs nothing, while renumbering would re-point every
//          caption at a different photo.
//   27-47  A client couple, golden hour on the town square: the stone
//          facades, the blue door, the teal breeze-block, the roses.
//
// Tile shape follows the SOURCE, it is not a design choice. A portrait
// photo gets 'v' and a landscape photo gets 'w'. An earlier pass shaped a
// handful of tight portrait crops as 'h' (square) for masonry rhythm and
// the owner rightly called it out: a square tile in a wall of 3:4 reads as
// a mistake, and it crops the frame for no reason. Only engagement-30 and
// engagement-46 are 'w', because those two really are landscape files.
// Do not hand a portrait photo an 'h' or 'w' tile.
const engagementPhotos: WeddingPhoto[] = [
  { slug: 'engagement-01', caption: 'The Dip',                tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-02', caption: 'The Spiral Stair',       tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-04', caption: 'On The Iron Steps',      tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-05', caption: 'Standing Together',      tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-06', caption: 'By The Chapel',          tag: 'The Chapel',    category: 'engagement', orientation: 'v' },
  { slug: 'engagement-08', caption: 'Held Close',             tag: 'The Chapel',    category: 'engagement', orientation: 'v' },
  { slug: 'engagement-09', caption: 'Her Smile',              tag: 'Portraits',     category: 'engagement', orientation: 'v' },
  { slug: 'engagement-10', caption: 'Wrapped Up',             tag: 'The Chapel',    category: 'engagement', orientation: 'v' },
  { slug: 'engagement-13', caption: 'Laughing',               tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-14', caption: 'Over His Shoulder',      tag: 'Portraits',     category: 'engagement', orientation: 'v' },
  { slug: 'engagement-16', caption: 'The Look',               tag: 'The Chapel',    category: 'engagement', orientation: 'v' },
  { slug: 'engagement-17', caption: 'Grace Heritage',         tag: 'The Chapel',    category: 'engagement', orientation: 'v' },
  { slug: 'engagement-18', caption: 'Stolen Kiss',            tag: 'The Chapel',    category: 'engagement', orientation: 'v' },
  { slug: 'engagement-19', caption: 'Against The Stone',      tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-20', caption: 'Walking Away',           tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-21', caption: 'The Ring',               tag: 'Details',       category: 'engagement', orientation: 'v' },
  { slug: 'engagement-23', caption: 'Off Her Feet',           tag: 'The Courtyard', category: 'engagement', orientation: 'v' },
  { slug: 'engagement-25', caption: 'Among The Roses',        tag: 'Details',       category: 'engagement', orientation: 'v' },
  { slug: 'engagement-26', caption: 'One More',               tag: 'The Courtyard', category: 'engagement', orientation: 'v' },

  { slug: 'engagement-27', caption: 'Her Ring',             tag: 'Details',       category: 'engagement', orientation: 'v' },
  { slug: 'engagement-28', caption: 'Into The Evening',     tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-29', caption: 'Golden Hour',          tag: 'Portraits',     category: 'engagement', orientation: 'v' },
  { slug: 'engagement-30', caption: 'Side By Side',         tag: 'Portraits',     category: 'engagement', orientation: 'w' },
  { slug: 'engagement-31', caption: 'Warm Light',           tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-32', caption: 'Showing It Off',       tag: 'Details',       category: 'engagement', orientation: 'v' },
  { slug: 'engagement-33', caption: 'Chapel Light',         tag: 'The Chapel',    category: 'engagement', orientation: 'v' },
  { slug: 'engagement-34', caption: 'Golden Kiss',          tag: 'The Chapel',    category: 'engagement', orientation: 'v' },
  { slug: 'engagement-35', caption: 'The Stone Steps',      tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-36', caption: 'Crossing The Square',  tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-37', caption: 'The Square',           tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-38', caption: 'The Blue Door',        tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-39', caption: 'Under The Lamp',       tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-40', caption: 'Sunset On The Square', tag: 'Portraits',     category: 'engagement', orientation: 'v' },
  { slug: 'engagement-41', caption: 'Teal And White',       tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-42', caption: 'The White House',      tag: 'Downtown',      category: 'engagement', orientation: 'v' },
  { slug: 'engagement-43', caption: 'Through The Roses',    tag: 'Details',       category: 'engagement', orientation: 'v' },
  { slug: 'engagement-44', caption: 'Behind The Blooms',    tag: 'Details',       category: 'engagement', orientation: 'v' },
  { slug: 'engagement-45', caption: 'The Garden Path',      tag: 'The Courtyard', category: 'engagement', orientation: 'v' },
  { slug: 'engagement-46', caption: 'Garden Pavilion',      tag: 'The Courtyard', category: 'engagement', orientation: 'w' },
  { slug: 'engagement-47', caption: 'The Chapel Steps',     tag: 'The Chapel',    category: 'engagement', orientation: 'v' },
];

// Their proposal, shot at night in the lit woods, in the order it
// happened: the walk in, the knee, the yes, the ring.
const proposalPhotos: WeddingPhoto[] = [
  { slug: 'proposal-01', caption: 'Under The Lights', tag: 'The Woods',    category: 'proposal', orientation: 'v' },
  { slug: 'proposal-02', caption: 'Hand In Hand',     tag: 'The Woods',    category: 'proposal', orientation: 'v' },
  { slug: 'proposal-03', caption: 'Down On One Knee', tag: 'The Question', category: 'proposal', orientation: 'v' },
  { slug: 'proposal-04', caption: 'The Question',     tag: 'The Question', category: 'proposal', orientation: 'v' },
  { slug: 'proposal-05', caption: 'Yes',              tag: 'The Question', category: 'proposal', orientation: 'v' },
  { slug: 'proposal-06', caption: 'The First Hug',    tag: 'She Said Yes', category: 'proposal', orientation: 'v' },
  { slug: 'proposal-07', caption: 'The First Kiss',   tag: 'She Said Yes', category: 'proposal', orientation: 'v' },
  { slug: 'proposal-08', caption: 'Just Engaged',     tag: 'She Said Yes', category: 'proposal', orientation: 'v' },
  { slug: 'proposal-10', caption: 'Her Hand',         tag: 'The Ring',     category: 'proposal', orientation: 'v' },
  { slug: 'proposal-11', caption: 'Telling Everyone', tag: 'She Said Yes', category: 'proposal', orientation: 'v' },
  { slug: 'proposal-12', caption: 'Newly Engaged',    tag: 'The Ring',     category: 'proposal', orientation: 'v' },
  { slug: 'proposal-13', caption: 'In The Snow',      tag: 'She Said Yes', category: 'proposal', orientation: 'v' },
];

export const galleryPhotos: WeddingPhoto[] = [
  ...weddingPhotos,
  ...engagementPhotos,
  ...proposalPhotos,
];

// ─────────────────────────────────────────────────────────────
// Packages — three-card offer stack.
// Prices and inclusions here are confirmed: see the banner at the top of
// this file, which is the one place to change if that stops being true.
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
// Confirmed pricing, same as the packages above.
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
    a: 'It means one of us is with the groomsmen and one of us is with the bridesmaids, at the same time, on the two- and three-person packages. While you are apart we both shoot hybrid, photo and video, so neither room trades stills for footage and nobody is waiting on a shooter to finish one side and drive to the other. Once you are together we go back to our lanes: Makenzie on photo, Mason on video. We are married, so this is not a crew we assemble per wedding. It is the two of us either way. One thing worth being clear on: shooting hybrid is how we cover the morning, not what every package delivers. The film packages deliver film. An edited photo gallery comes with The Legacy, or as a photo add-on on any package.',
  },
  {
    q: 'I do not love the idea of a stranger filming me getting ready.',
    a: 'Most people do not, and that is exactly why we built it this way. You get a girl with the bridesmaids and a guy with the groomsmen, so it never feels like a stranger of the wrong gender in the room during the most unguarded hour of your day. That comfort is the difference between footage that looks natural and footage where everyone is holding their breath.',
  },
  {
    q: 'Do you shoot photo as well as video?',
    a: 'Both, from one team. They are not competing: photos freeze a moment you can print and frame, video lets you hear your vows again, hear the room laugh, watch the first dance. Most couples who book only one end up wishing they had both, and you cannot go back for the other half. If you genuinely only want one, book only one. Photo is delivered on The Legacy or as an add-on to either film package, and the a la carte menu prices both separately.',
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
