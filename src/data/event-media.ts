// ─────────────────────────────────────────────────────────────
// Event Media page data
//
// Event Media is a sibling offering to the four tiers — same visual
// language, but positioned as live coverage infrastructure for artist
// momentum (not a growth-system retainer).
//
// The page reuses TierHero + TierWhoFor + TierWhatYouGet + TierRoadmap
// + FAQ + BookCall with event-media-specific copy.
// ─────────────────────────────────────────────────────────────

import type { TierCard, TierStep, TierFaqItem, TierCta, TierOfferHighlight } from './tiers';
import { CALENDLY_URL } from '../config/cta';

export interface EventMedia {
  slug: 'event-media';
  number: string;          // HUD marker text — "LV" for Live
  name: string;
  shortName: string;
  price: string;
  priceNote: string;
  positioning: string;

  hero: {
    eyebrow: string;
    headline: string;
    sub: string;
    pills: string[];
    primaryCta: TierCta;
    secondaryCta: TierCta;
    markerLabel: string;
    offerHighlights: TierOfferHighlight[];
    offerCardCta: TierCta;
    offerCardFootLabel: string;
  };

  whatWeCapture: { eyebrow: string; headline: string; cards: TierCard[] };
  coverageFormats: { eyebrow: string; headline: string; sub: string; cards: TierCard[] };
  deliverableExamples: { eyebrow: string; headline: string; sub: string; cards: TierCard[] };
  workflow: { eyebrow: string; headline: string; steps: TierStep[] };
  whoFor: { eyebrow: string; headline: string; cards: TierCard[] };
  faq: { eyebrow: string; headline: string; lede: string; items: TierFaqItem[] };
}

export const eventMedia: EventMedia = {
  slug: 'event-media',
  number: 'LV',
  name: 'Live Event Media',
  shortName: 'Event Media',
  price: '$2,500+',
  priceNote: 'per event · custom scope',
  positioning: 'Live content infrastructure for artist momentum.',

  hero: {
    eyebrow: 'Live Coverage Infrastructure',
    headline:
      'Turning live moments —<br/><span class="highlight blue">into actual momentum.</span>',
    sub:
      'Recap edits, multicam moments, vertical social cuts, photography, and same-week delivery — built for artists who want every show to become weeks of content, not a one-night spike.',
    pills: [
      'Same-week delivery',
      'Multicam coverage',
      'Festival + tour',
      'Vertical + horizontal',
      'Per-event pricing',
    ],
    primaryCta: { label: 'Request Coverage', href: CALENDLY_URL },
    secondaryCta: { label: 'See Field Work', href: '/portfolio' },
    markerLabel: 'Live',
    offerHighlights: [
      { value: 'Same-week', unit: 'delivery' },
      { value: '2–3',       unit: 'camera multicam' },
      { value: '40–80',     unit: 'photos / show' },
      { value: 'Custom',    unit: 'scope quote' },
    ],
    offerCardCta: { label: 'Request Coverage', href: CALENDLY_URL },
    offerCardFootLabel: 'Live coverage · Event-based',
  },

  whatWeCapture: {
    eyebrow: 'What We Capture',
    headline: "Built for the energy that doesn't replay itself.",
    cards: [
      { title: 'Festival sets',     body: 'Main-stage, side-stage, and B-stage capture across multicam setups. Drops, transitions, crowd moments — all timestamped and tagged for fast turnaround.' },
      { title: 'Headline tours',    body: 'Full tour coverage from venue arrival through closer. Backstage, soundcheck, fan moments, and post-show — your tour becomes a content calendar.' },
      { title: 'Release events',    body: 'EP listening parties, album launches, music-video premieres. We treat your release event like a campaign asset, not a one-night thing.' },
      { title: 'Single shows',      body: 'One-night headline or feature slots. Multicam capture, photography, and same-week delivery so the moment doesn\'t fade before the next show.' },
    ],
  },

  coverageFormats: {
    eyebrow: 'Coverage Formats',
    headline: 'One capture pass — every format your rollout needs.',
    sub:
      "You don't pick one format. We capture once and deliver across every cut your rollout calls for.",
    cards: [
      { title: 'Recap edit',           body: '60–120 second hero recap. Cinematic pacing, music-synced. The piece that defines the show in retrospect.' },
      { title: 'Multicam moments',     body: 'Individual standout drops + transitions captured from multiple angles. Reusable as standalone content for weeks after the show.' },
      { title: 'Vertical social cuts', body: 'TikTok / Reels / Shorts cuts optimized for first-3-second hook. Captioned, formatted, ready to schedule.' },
      { title: 'Photography pack',     body: 'Editorial-quality photos — performance, backstage, crowd, environment. High-res for press, web-ready for socials.' },
      { title: 'BTS / backstage',      body: "Documentary-style backstage capture — the moments fans don't see. The footage that builds connection, not just reach." },
      { title: 'Tour cutdowns',        body: 'Once a tour wraps, we cut a season-style recap. Becomes the press piece and the "what we just did" content for the next announce.' },
    ],
  },

  deliverableExamples: {
    eyebrow: 'Deliverable Examples',
    headline: 'What you actually receive — per engagement.',
    sub:
      'Packages flex around scope. These are the three patterns we run most often.',
    cards: [
      { title: 'Festival recap package',  body: 'One hero recap (60–120s) + 5 multicam moments + 8 vertical social cuts + photo pack (60+ images). Most-requested format. Same-week delivery.' },
      { title: 'Tour content package',    body: 'Per-city coverage rolling into a tour-end cutdown. Nightly social drops + per-show recap + cumulative tour piece. Multi-event engagement.' },
      { title: 'Single-show package',     body: 'One-night coverage with recap + multicam moments + vertical cuts + photos. Delivered within 5 days of show. Single engagement.' },
    ],
  },

  workflow: {
    eyebrow: 'Turnaround & Workflow',
    headline: 'Show on Saturday. Content live the next week.',
    steps: [
      { title: 'Pre-event Brief',       body: 'You send the show details: set times, key drops, expected guests, footage priorities. We send back a capture plan and shot list.' },
      { title: 'On-Site Capture',       body: 'Multicam team on-site through doors-to-closer. Photo + video. Backstage access if granted. Everything tagged in real time.' },
      { title: 'Post-Show Triage',      body: 'Within 48 hours: rough cuts of the hero recap and top 3 vertical moments. Posted same-week if you want speed-to-feed.' },
      { title: 'Final Delivery',        body: 'Full package delivered within 5–7 days: hero recap, multicam moments, vertical cuts, photo pack, raw selects if requested.' },
      { title: 'Distribution Support',  body: 'Captions, hooks, posting recommendations included. We hand off ready-to-schedule files, not raw exports.' },
    ],
  },

  whoFor: {
    eyebrow: "Who It's For",
    headline: 'Built for artists treating every show like a campaign.',
    cards: [
      { title: 'Touring artists between announces.', body: "You're playing 4–12 shows per month and most of them aren't becoming anything. Event media fixes that." },
      { title: 'Artists running release tours.',     body: 'New EP, new album, new sound — the tour is the rollout. Every show is a content asset, not a one-night reset.' },
      { title: 'Festival circuits.',                  body: "You're slotting Dancefestopia, Wicked Oaks, Lost Lands — every weekend a new festival. We turn the circuit into a content stream." },
      { title: 'Special-event capture.',              body: 'Album listening party, music-video premiere, B2B set, debut headline. One-off moments that deserve real treatment.' },
    ],
  },

  faq: {
    eyebrow: 'FAQ',
    headline: 'Logistics and turnaround —<br/><span class="glow-blue">answered straight.</span>',
    lede: "The ones we hear before every event engagement. If yours isn't here, ask on the call.",
    items: [
      { q: 'How fast is "same-week delivery"?',                            a: 'Hero recap within 5–7 days; rough cuts of vertical social drops within 48 hours if speed-to-feed is the priority. Festival recaps often hit the feed by Tuesday after a Saturday show.' },
      { q: 'Do you travel? Multi-day tours?',                              a: 'Yes. We travel for single shows, festival weekends, and full tours. Tour engagements include per-city coverage rolling into a tour-end cutdown piece. Travel costs quoted in the engagement.' },
      { q: 'How many cameras / what counts as "multicam"?',                a: 'Typical festival/headline coverage is 2–3 cameras: a wide locked-off main, a roaming POV, and a dedicated drop camera. Larger productions scale up. We bring our own gear unless venue restrictions.' },
      { q: 'Do you handle photography too, or just video?',                a: 'Both. Editorial-quality photos are included in every package — performance, backstage, crowd, environment. Photo deliverables are typically 40–80 selects per show, high-res for press + web-ready for socials.' },
      { q: 'Can I just hire you for photos? Or just recaps?',              a: "Yes — packages are modular. Photo-only, recap-only, or full coverage. Pricing scales accordingly. Bring your scope to the call and we'll quote it." },
      { q: 'Is this connected to the Blueprint tiers?',                    a: "Event Media is a separate offering — it's not bundled into the tier retainers by default. That said, Tier 03 and Tier 04 clients often add Event Media for major festivals or tour runs. We coordinate the rollout so the event content feeds the broader growth system." },
    ],
  },
};
