import { CALENDLY_URL } from '../config/cta';

// ─────────────────────────────────────────────────────────────
// Tier page data
//
// Each tier page (/tiers/<slug>) is rendered by the dynamic route
// src/pages/tiers/[slug].astro, which calls <TierPage tier={...} />.
// Adding a new tier = adding an entry below. The hero is fully CSS/SVG
// HUD; no per-tier image asset required.
//
// Copy lives here so the page components stay purely structural.
// ─────────────────────────────────────────────────────────────

export interface TierCta { label: string; href: string; }
// `badge` optionally renders a small chip on the card (e.g. "Coming Soon")
// and dims the card to signal it's a future/unavailable item.
export interface TierCard { title: string; body: string; badge?: string; }
export interface TierStep { title: string; body: string; }
export interface TierFaqItem { q: string; a: string; }
export interface TierAddOn {
  title: string;
  body: string;
  price?: string;
}
export interface TierNextStep {
  number: string;
  name: string;
  description: string;
  href: string;
  bullets: string[];
}
export interface TierOfferHighlight {
  value: string;
  unit: string;
}

export interface Tier {
  slug: string;
  number: string;       // "01", also the HUD-marker outlined text
  name: string;         // "Growth Blueprint Session™"
  shortName: string;    // "Growth Blueprint"
  price: string;        // "$1,000" or "$2,000+"
  priceNote: string;    // "one-time · no retainer"
  positioning: string;  // one-liner for meta description

  hero: {
    eyebrow: string;
    headline: string;   // HTML allowed
    sub: string;
    pills: string[];
    primaryCta: TierCta;
    secondaryCta: TierCta;

    // HUD-marker label paired with the big outlined number ("Tier" by
    // default; the Event Media page passes "Live").
    markerLabel: string;

    // Right-side offer card config
    offerHighlights: TierOfferHighlight[];   // 4 stats shown in 2x2
    offerCardCta: TierCta;
    offerCardFootLabel: string;              // "Strategy-first · Foundation tier"
    // Optional paid-in-full sub-line rendered below the price block.
    pif?: { amount: string; save: string };
  };

  whoFor:     { eyebrow: string; headline: string; cards: TierCard[] };   // headline allows HTML (set:html)
  whatYouGet: { eyebrow: string; headline: string; sub: string; cards: TierCard[] };
  howItWorks: { eyebrow: string; headline: string; steps: TierStep[] };
  addOns: {
    eyebrow: string;
    headline: string;
    // Optional featured add-on (e.g. Event Media) — gets a larger glass
    // card with its own CTA, rendered above the smaller items grid.
    featured?: {
      eyebrow: string;
      title: string;
      body: string;
      bullets?: string[];
      ctaLabel: string;
      ctaHref: string;
    };
    items: TierAddOn[];
    nextStep: TierNextStep | null;
  };
  faq: { eyebrow: string; headline: string; lede: string; items: TierFaqItem[] };
}

// ─────────────────────────────────────────────────────────────
// Tier 01 — Growth Blueprint Session™
// ─────────────────────────────────────────────────────────────
const tier01: Tier = {
  slug: 'tier-01',
  number: '01',
  name: 'Growth Blueprint Session™',
  shortName: 'Growth Blueprint',
  price: '$1,000',
  priceNote: 'one-time · no retainer',
  positioning: "Let's get your content actually working first.",

  hero: {
    eyebrow: 'Strategy & Foundation',
    headline:
      'A clean starting point<br/><span class="highlight blue">before you build bigger.</span>',
    sub:
      "Not more random content. A real plan behind the content. A one-time audit + strategy session that turns what you've already created into a 2-4 week roadmap you can run yourself.",
    pills: [
      'Strategy-focused',
      '60-90 min live session',
      'Content roadmap',
      '7-10 day turnaround',
      'No monthly retainer',
    ],
    primaryCta: { label: 'Book Your Session', href: CALENDLY_URL },
    secondaryCta: { label: 'Back to All Offers', href: '/#offers' },
    // Empty so the hero background watermark shows only the number (no "TIER").
    markerLabel: '',
    offerHighlights: [
      { value: '6',     unit: 'deliverables' },
      { value: '60-90', unit: 'min strategy call' },
      { value: '7-10',  unit: 'day turnaround' },
      { value: '5-15',  unit: 'repurposed clips' },
    ],
    offerCardCta: { label: 'Reserve Your Session', href: CALENDLY_URL },
    offerCardFootLabel: 'Strategy-first · Foundation tier',
    // Tier 01 is one-time so there's no PIF discount per se — the credit
    // line below is the equivalent incentive (carry $1,000 forward into
    // Tier 02 if the artist upgrades within 30 days).
    pif: { amount: '$1,000 credit', save: 'toward Tier 02 within 30 days' },
  },

  whoFor: {
    eyebrow: 'Who This Is For',
    headline: 'Built for the artist at a <span class="highlight">specific moment</span> in the curve.',
    cards: [
      { title: 'Posting for months without traction.',           body: "You're consistent, but the content isn't converting into fans, streams, or bookings. You're not sure if it's the work or the strategy." },
      { title: 'Sitting on hours of unused show footage.',       body: 'Dancefestopia, Wicked Oaks, your last headline set, captured and never touched. This is where it earns its keep.' },
      { title: 'Four to eight weeks out from a release.',        body: 'Single, EP, festival announcement. You want the rollout to actually move people instead of disappearing into the feed.' },
      { title: 'Wanting direction before a monthly commitment.', body: "You're considering a retainer but want to prove the system works on a one-time engagement first. Tier 01 is exactly that." },
    ],
  },

  whatYouGet: {
    eyebrow: 'What You Get',
    headline: 'Six deliverables. One focused session.',
    sub:
      'Everything below ships within 7-10 days of intake. The live delivery session is the moment we walk you through it.',
    cards: [
      { title: 'Content Audit + Growth Breakdown', body: "Every active platform, every recent post, every gap in your funnel, analyzed and documented. You see what's earning attention, what's invisible, and where the leak is." },
      { title: 'Performance Review',               body: "What's actually working in your numbers, and what isn't. Engagement patterns, viewer drop-off, format performance, time-of-day data. The picture instead of the gut feeling." },
      { title: 'Content Direction',                body: 'EDM-specific ideas and formats: a concrete set of hooks, formats, and ideas built for bass music, not generic creator advice. We know what plays in this scene and what gets scrolled past.' },
      { title: 'Repurposing of Existing Footage',  body: '5 to 15 short-form clips edited from your existing footage. Drops, crowd reactions, b-roll, backstage, turned into content you can post immediately after the session.' },
      { title: 'Platform Optimization',            body: 'Bio, profile, link-in-bio, pinned posts, cover photos, positioning copy. Every front-page element tuned so first-time visitors convert into followers.' },
      { title: '2-4 Week Posting Plan',            body: 'A scheduled, sequenced content calendar with hooks, captions, posting times, and platform-specific formatting. You leave with something you can run yourself the next morning.' },
    ],
  },

  howItWorks: {
    eyebrow: 'How It Works',
    headline: 'Five steps. About ten days end-to-end.',
    steps: [
      { title: 'Intake',           body: 'We audit your current content and growth to find exactly where the opportunity is.' },
      { title: 'Audit & Analysis', body: "We pull data across every platform, watch your existing content, identify what's working and what's wasted. No assumptions, no templates." },
      { title: 'Strategy Build',   body: 'We build your specific content direction, posting plan, and platform optimizations, all EDM-native, all tailored to where you are right now.' },
      { title: 'Delivery Session', body: "60 to 90 minutes, live, just us and you. We walk through every finding, every recommendation, and every clip we've cut from your footage." },
      { title: 'You Run It',       body: 'You walk out with the audit, the strategy doc, the clips, and the 2-4 week plan. You execute. If you want help running it, Tier 02 is the next step.' },
    ],
  },

  addOns: {
    eyebrow: 'Add-ons & Next Step',
    headline: 'Scale it up, or take it for a run first.',
    featured: {
      eyebrow: 'Featured Add-on',
      title: 'Event Media',
      body:
        'Add on-site multicam + photo coverage at a festival, headline show, or release event. The footage feeds straight into your Blueprint roadmap, turning one night into weeks of content you can run yourself.',
      bullets: [
        '48-hour recap delivery',
        'Multicam + photo coverage',
        'Same crew, same brand alignment',
        'Per-event scope quoted',
      ],
      ctaLabel: 'See Event Media',
      ctaHref: '/event-media',
    },
    items: [
      { title: 'Extra clip pack',                  body: '+10 additional short-form clips repurposed from your footage drive. Useful if you have a lot of material and want runway past the initial plan.', price: '+$500' },
      { title: 'One month of posting management',  body: 'We run the 2-4 week plan for you instead of handing it off: scheduling, captioning, posting, and reporting. A clean bridge into monthly.',        price: '+$750' },
      { title: 'Brand identity tuning',            body: 'Visual + voice pass: color, typography, tone, positioning copy. Same session, just spends some of it on identity instead of execution.',          price: '+$400' },
    ],
    nextStep: {
      number: '02',
      name: 'Content Engine Starter™',
      description:
        "The natural next step when the Blueprint validates and you're ready to run it monthly. We credit the Tier 01 fee toward your first month if you upgrade within 30 days.",
      href: '/tiers/tier-02',
      bullets: [
        '8-12 short-form videos / month',
        'EDM-focused monthly direction',
        '1 strategy call / month',
        'From $1,000 / month',
      ],
    },
  },

  faq: {
    eyebrow: 'FAQ',
    headline: 'Real questions about Tier 01<br/><span class="glow-blue">answered straight.</span>',
    lede: "The ones we hear before every Blueprint Session. If yours isn't here, ask on the call.",
    items: [
      { q: 'How long does the whole thing take?',                a: 'From intake to delivery is typically 7-10 days. The session itself is 60-90 minutes live, then you have everything to run yourself.' },
      { q: 'Do you film the session? Do I need to film anything?', a: "No filming required for Tier 01. We work with footage you've already captured, show clips, backstage, behind-the-scenes. If you have a hard drive of unused footage, this is when it earns its keep. If you don't, we'll lean on optimization and direction instead." },
      { q: "What if I'm new and don't have show footage yet?",   a: "We can still build the audit and the posting plan. We'll lean harder on platform optimization, content direction, and what to film going forward. If you're pre-touring, Tier 02 or 03 may be a better fit when you're ready to scale." },
      { q: 'Can I customize the deliverables?',                   a: 'Yes. Some artists trade the show-footage repurposing for more clips from existing IG/TikTok, or swap the posting plan length. We adjust during intake. The deliverable list is the menu, not the contract.' },
      { q: 'Is this secretly a sales call for Tier 02?',          a: "No. The session is the deliverable, not a pitch. We won't bring up Tier 02 unless you do. If you want to upgrade to monthly after, we set up a separate call for it." },
      { q: 'What if I want to keep working together after?',      a: 'Tier 02 (Content Engine Starter™) is the natural next step: monthly content + ongoing strategy. We credit your Tier 01 fee toward your first month if you upgrade within 30 days of delivery.' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// Tier 02 — Content Engine Starter™
// ─────────────────────────────────────────────────────────────
const tier02: Tier = {
  slug: 'tier-02',
  number: '02',
  name: 'Content Engine Starter™',
  shortName: 'Content Engine',
  price: '$1,000',
  priceNote: 'per month · 3-month minimum',
  positioning: 'Consistent rollout, without the overhead.',

  hero: {
    eyebrow: 'Recurring Execution',
    headline:
      'Consistent rollout<br/><span class="highlight blue">without the overhead.</span>',
    sub:
      'The plug-and-play content system for artists who are ready to show up consistently and start building real momentum.',
    pills: [
      '8-12 videos / month',
      'Monthly direction',
      'Strategy call included',
      '3-month commitment',
      'Recurring execution',
    ],
    primaryCta: { label: 'Start Your Engine', href: CALENDLY_URL },
    secondaryCta: { label: 'Back to All Offers', href: '/#offers' },
    markerLabel: '',
    offerHighlights: [
      { value: '8-12',  unit: 'videos / month' },
      { value: '1',     unit: 'strategy call / mo' },
      { value: '3',     unit: 'month minimum' },
      { value: 'Live',  unit: 'monthly direction' },
    ],
    offerCardCta: { label: 'Start the Engine', href: CALENDLY_URL },
    offerCardFootLabel: 'Recurring rollout · Momentum tier',
    pif: { amount: '$2,500', save: '$500' },
  },

  whoFor: {
    eyebrow: 'Who This Is For',
    headline: 'Built for artists who want <span class="highlight">consistency</span> without thinking.',
    cards: [
      { title: 'Ready to run a monthly rollout.',            body: "You're done improvising every Monday. You want a content engine running underneath you so you can focus on music, not on what to post next." },
      { title: 'Touring 2-6 shows a month.',                 body: 'You have footage coming in regularly. We turn that footage into a feed instead of letting it sit on a hard drive.' },
      { title: 'Building toward a release cycle.',           body: 'Single coming in 2-4 months. You want consistent monthly visibility now so the release lands on warm audience instead of cold scroll.' },
      { title: 'Tired of guessing what to post next.',       body: "Every Monday should not be a strategic crisis. Tier 02 hands you the calendar so you focus on music, not captions." },
    ],
  },

  whatYouGet: {
    eyebrow: 'What You Get',
    headline: 'Monthly execution with strategy on top.',
    sub:
      'Everything ships on a monthly cadence with light footage intake from you. The system runs whether you have a show that week or not.',
    cards: [
      { title: '8-12 short-form videos/month',           body: 'Edited, formatted, and ready for TikTok, Reels, and Shorts. Built around your footage, your sound, your scene, not stock templates.' },
      { title: 'Editing + formatting for TikTok/Reels',  body: 'Platform-native exports: aspect ratios, captions, hook placement, cover frames, all tuned for first-3-second hold.' },
      { title: 'Monthly content direction',              body: 'EDM-focused strategy refreshed each month: hooks, formats, trends, applied to your specific brand so the system keeps adapting to where the scene is.' },
      { title: 'Ongoing structure + posting guidance',   body: 'We give you the cadence: when to post, what to lead with, what to follow it with. The structure stays consistent month over month.' },
      { title: '1 strategy call/month',                  body: "60 minutes monthly. Performance review, what's working, what's next. The recurring check-in that keeps the system honest." },
      { title: 'Basic hook + caption guidance',          body: 'Short-form lives or dies on the first 3 seconds. We hand you platform-specific hook and caption frameworks so the videos earn the scroll-stop.' },
      { title: 'Light footage repurposing',              body: 'Footage you send us in any given month gets light editing into the monthly batch. Not show-day capture. This is the bridge between Tier 01 and a full content team.' },
    ],
  },

  howItWorks: {
    eyebrow: 'How It Works',
    headline: 'Repeats monthly. Adapts as the system learns.',
    steps: [
      { title: 'Onboarding',     body: 'Channel access, footage drive intake, brand voice intake, monthly-cadence calendar, all set up in the first 7 days.' },
      { title: 'Direction Set',  body: "Each month opens with the new direction: themes, formats, hooks, and the rough plan for the 8-12 pieces." },
      { title: 'Execution',      body: 'Editing, formatting, captioning, platform-specific exports. Delivered in batches so your queue stays full without you managing it.' },
      { title: 'Delivery',       body: 'Files land in your shared drive with naming, captions, and posting recommendations. You schedule, or hand off scheduling to your team.' },
      { title: 'Monthly Review', body: "The strategy call. What worked, what didn't, what we change next month. The system learns about your audience month by month." },
    ],
  },

  addOns: {
    eyebrow: 'Add-ons & Next Step',
    headline: 'Add the parts you need, or step up to Tier 03.',
    featured: {
      eyebrow: 'Featured Add-on',
      title: 'Event Media',
      body:
        'Add on-site multicam + photo coverage at specific festivals, tours, or release events. Feeds straight into the Tier 02 monthly engine. Your shows turn into weeks of content instead of one-night spikes.',
      bullets: [
        '48-hour recap delivery',
        'Multicam + photo coverage',
        'Same crew, same brand alignment',
        'Per-event scope quoted',
      ],
      ctaLabel: 'See Event Media',
      ctaHref: '/event-media',
    },
    items: [
      { title: 'Volume bump',           body: '+6 videos per month on top of the base 8-12. Useful during release windows or tour months where the feed needs more frequency.', price: '+$500/mo' },
      { title: 'Posting management',    body: "We handle scheduling, posting, and reporting in addition to the editing. The bridge if you don't have someone running your channels yet.", price: '+$500/mo' },
      { title: 'Brand identity sprint', body: 'One-time visual + voice tune-up applied across the monthly output: color, typography, tone, positioning copy.', price: '+$500 one-time' },
    ],
    nextStep: {
      number: '03',
      name: 'Fan Growth Engine™',
      description:
        "When Tier 02 is running clean and you're ready to layer show-based content mapping, release campaigns, performance tracking, and brand positioning on top. The jump from execution to campaign infrastructure.",
      href: '/tiers/tier-03',
      bullets: [
        '15-25 short-form videos / month',
        'Show + release campaign planning',
        'Monthly growth report',
        'From $2,000 / month',
      ],
    },
  },

  faq: {
    eyebrow: 'FAQ',
    headline: "What Tier 02 actually looks like<br/><span class=\"glow-blue\">in motion.</span>",
    lede: 'The ones we hear before every monthly engagement starts.',
    items: [
      { q: 'Is the 3-month minimum a contract I can\'t exit?', a: "It's a commitment, not a trap. We need 3 months to actually see whether the system is working. That's the minimum reasonable test. If something breaks the engagement on our side (delivery delays, mismatch), we don't hold you to it." },
      { q: 'What if I don\'t have footage coming in monthly?', a: "Workable. We lean on existing-content repurposing, format-only content (no footage needed), and IG/TikTok-native creator content. If your output is truly footage-light, Tier 02 still produces. It just looks different than for a touring artist." },
      { q: 'Can I scale up to Tier 03 mid-engagement?',         a: "Yes. Most artists who upgrade do it after month 2 once the foundation is running and a release campaign is on the calendar. We pro-rate the transition; you don't pay double in the changeover month." },
      { q: 'Do you post for me or just deliver the files?',     a: "Base Tier 02 delivers files with posting guidance. You (or your team) execute. The Posting Management add-on is the option if you want us running the schedule end-to-end." },
      { q: 'How do you measure whether it\'s working?',         a: 'Monthly: follower growth, post-level engagement, audience saved/shared, time-of-day patterns, top-performing format. We bring the data to the monthly call instead of guessing.' },
      { q: 'Is show-day capture included?',                     a: "Not in Tier 02. Show-day capture is a Tier 04 / Event Media offering. Tier 02 works with whatever footage you (or your venue) already capture." },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// Tier 03 — Fan Growth Engine™
// ─────────────────────────────────────────────────────────────
const tier03: Tier = {
  slug: 'tier-03',
  number: '03',
  name: 'Fan Growth Engine™',
  shortName: 'Fan Growth Engine',
  price: '$3,000',
  priceNote: 'per month · 6-month commitment',
  positioning: 'Full content, distribution, and campaign coordination.',

  hero: {
    eyebrow: 'Release & Campaign Infrastructure',
    headline:
      'Where execution becomes<br/><span class="highlight blue">a real fan-growth machine.</span>',
    sub:
      'For artists ready to layer show-based content mapping, release campaigns, brand positioning, and performance tracking on top of monthly execution. The tier where Blueprint stops feeling like a vendor and starts feeling like infrastructure.',
    pills: [
      '15-25 videos / month',
      'Release campaigns',
      'Show-based mapping',
      'Brand positioning',
      'Performance tracking',
    ],
    primaryCta: { label: 'Talk to Us', href: CALENDLY_URL },
    secondaryCta: { label: 'Back to All Offers', href: '/#offers' },
    markerLabel: '',
    offerHighlights: [
      { value: '15-25', unit: 'videos / month' },
      { value: '6',     unit: 'month commitment' },
      { value: 'Show',  unit: 'content mapping' },
      { value: 'Monthly', unit: 'growth report' },
    ],
    offerCardCta: { label: 'Start the Engine', href: CALENDLY_URL },
    offerCardFootLabel: 'Campaign infrastructure · Growth tier',
    pif: { amount: '$15,000', save: '$3,000' },
  },

  whoFor: {
    eyebrow: 'Who This Is For',
    headline: 'Built for artists with traction <span class="highlight">ready to compound it.</span>',
    cards: [
      { title: 'Released artists with consistent shows.', body: "You're playing 4+ shows a month, you have a release calendar, and content is the bottleneck, not the music." },
      { title: 'Mid-tier artists scaling reach.',          body: 'You\'re past the "is anyone listening" phase. Now it\'s about turning attention into a real fanbase that shows up.' },
      { title: 'Artists running rollouts every 2-3 months.', body: 'Single → EP → tour announce → festival → next single. Every cycle deserves campaign infrastructure, not improvisation.' },
      { title: 'Teams without a content engine.',          body: 'You have management and an agent, but no content or brand running underneath them. Tier 03 plugs that hole.' },
    ],
  },

  whatYouGet: {
    eyebrow: 'What You Get',
    headline: 'Execution + campaign + positioning + tracking.',
    sub:
      'Everything in Tier 02, plus the systems that turn monthly content into a campaign machine, built around your shows, releases, and brand.',
    cards: [
      { title: '15-25 short-form videos/month',           body: 'Volume bump that lets us run multiple narratives per month, release rollout, show content, brand positioning, and standalone hooks, without thinning quality on any single thread.' },
      { title: 'Show footage repurposing',                body: 'Every show becomes weeks of content. One night, captured properly, turns into a recap, multiple drops, vertical cuts, and BTS, all from the same footage pull. One asset becomes many.' },
      { title: 'EDM-trend-aligned editing + formatting',  body: 'Platform-native exports for TikTok, Reels, and Shorts, captions, hook placement, cover frames, combined with weekly scene tracking so trending sounds and breakout formats get deployed with EDM-native framing, not generic creator playbooks.' },
      { title: 'Posting management + scheduling',         body: "We don't just hand off files. The cadence, scheduling, posting flow, and platform timing are managed for you so the feed never goes quiet around big moments." },
      { title: 'Caption + hook optimization',             body: 'Every video gets a written hook and caption tuned to the platform and the brand voice, and iterated on monthly based on what is converting against your audience specifically.' },
      { title: 'Show + release campaign planning',        body: 'Pre-show / show-night / post-show sequences mapped against every show, plus 6-12 week release rollouts, pre-save, teaser, drop day, post-release sustainment, so the algorithm sees the heat by drop day.' },
      { title: 'Brand positioning guidance',              body: "Tone, visual identity, language, what your brand stands for in the scene. Less drift, more recognition. We refine as the system learns who's actually engaging." },
      { title: 'Performance tracking + reporting',        body: 'Weekly internal review, monthly client review. Views, engagement, follower growth tracked across every platform, surfaced in a monthly growth report that reads in 5 minutes and tells you what to act on.' },
      { title: 'Winning-content iteration cycles',        body: "When something pops, we don't move on. We extract the pattern, run it again from a different angle, and tune hooks/formats/times each month based on the previous month's data, so the system gets sharper every cycle." },
      { title: 'Monthly growth strategy call',            body: 'Where the report turns into decisions. Performance review, calendar adjustment, what we double down on, what we shelve. The recurring forum that keeps the campaign moving.' },
    ],
  },

  howItWorks: {
    eyebrow: 'How It Works',
    headline: 'Show + release calendars driving the whole engine.',
    steps: [
      { title: 'Calendar Build',     body: 'We map the next 6 months: shows, releases, festival circuit, brand moments. The campaign calendar that drives every other deliverable.' },
      { title: 'System Deployment',  body: 'Tier 02 execution stack scaled up, onboarding, brand intake, footage pipelines, posting cadence, performance dashboards, all built around the calendar.' },
      { title: 'Campaign Execution', body: 'Per-show + per-release campaigns produced, scheduled, and tracked. Rolling output rather than batch, the feed never goes quiet around big moments.' },
      { title: 'Performance Loops',  body: 'Weekly internal review, monthly client review. We double down on what compounds, retire what doesn\'t, and feed the wins back into next month\'s direction.' },
      { title: 'Growth Compounding', body: 'By month 3 the system is reading your audience back at you. By month 6 it\'s running on patterns specific to your fans, not generic playbooks.' },
    ],
  },

  addOns: {
    eyebrow: 'Add-ons & Next Step',
    headline: 'Layer the parts that fit, or scale to full partnership.',
    featured: {
      eyebrow: 'Featured Add-on',
      title: 'Event Media',
      body:
        'On-site multicam + photo coverage for specific festivals, tour runs, or release events. Feeds straight into the campaign calendar so the on-stage moments become weeks of content.',
      bullets: [
        '48-hour recap delivery',
        'Multicam + photo coverage',
        'Per-event scope quoted',
        'Coordinated with monthly engine',
      ],
      ctaLabel: 'See Event Media',
      ctaHref: '/event-media',
    },
    items: [
      { title: 'Email + SMS fan capture',         body: 'A Tier 04 feature available as an upgrade: link-in-bio funnel + email + SMS capture infrastructure. Builds the audience you own, separate from any platform.', price: '+$750 one-time' },
      { title: 'Paid amplification',              body: 'Boost top-performing organic content + retarget engaged viewers. Layered onto the campaign calendar so spend follows momentum, not hope.',                       price: '+$500/mo + spend' },
      { title: 'Custom release / campaign page',  body: 'A branded landing page tuned to a single release or campaign moment, pre-save links, ticket sales, fan capture, and a sequenced welcome flow in one place.',   price: '+$750 one-time' },
    ],
    nextStep: {
      number: '04',
      name: 'Artist Growth Infrastructure™',
      description:
        'When Tier 03 is compounding and you want the full machine, show-day capture, multi-platform distribution, paid amplification, fan capture, release campaigns, brand systems, all running as one piece of infrastructure. The complete operating system.',
      href: '/tiers/tier-04',
      bullets: [
        '20-40+ short-form videos / month',
        'Show-day multicam capture',
        'Email + SMS fan capture system',
        'From $10,000 / month',
      ],
    },
  },

  faq: {
    eyebrow: 'FAQ',
    headline: 'How Tier 03 actually runs<br/><span class="glow-blue">in practice.</span>',
    lede: 'The questions we walk through before any 6-month engagement starts.',
    items: [
      { q: 'Why a 6-month minimum?',                                   a: "Campaigns compound. The first month is calendar build and intake; months 2-3 are deployment and tuning; months 4-6 are where the engine actually starts moving the needle. Three months is too short to see compounding. Six is the honest minimum." },
      { q: 'What if my release calendar shifts?',                      a: 'It does. We rebuild the calendar each time a release moves and adjust the campaign waterfall around the new dates. Cost stays the same; the work just routes differently.' },
      { q: 'Does this replace my manager / label content team?',       a: "No. It works alongside them. Most Tier 03 clients have management; we plug into their workflow and become the content + campaign arm rather than competing with strategic decisions." },
      { q: 'Is show-day capture included?',                            a: 'Show-based content mapping is included (planning + repurposing). Show-day on-site capture is a separate Event Media engagement or a Tier 04 inclusion. Many Tier 03 clients add Event Media for the 2-3 biggest moments of the cycle.' },
      { q: 'Can I scale to Tier 04 mid-engagement?',                   a: 'Yes, typically after month 2 once the campaign infrastructure is running and a major moment (tour, festival circuit, album rollout) is on the calendar that justifies the full Tier 04 stack.' },
      { q: 'What if it isn\'t working?',                               a: "Same guarantee logic as the full Blueprint promise: if we don't deliver consistent, high-quality output and visible campaign infrastructure in the first 30 days, we work for free until we do." },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// Tier 04 — Artist Growth Infrastructure™
// ─────────────────────────────────────────────────────────────
const tier04: Tier = {
  slug: 'tier-04',
  number: '04',
  name: 'Artist Growth Infrastructure™',
  shortName: 'Growth Infrastructure',
  price: '$10,000',
  priceNote: 'per month · 6-month commitment',
  positioning: 'The complete growth machine, built around your career.',

  hero: {
    eyebrow: 'Full Growth Partnership',
    headline:
      'Not a service<br/><span class="highlight blue">growth infrastructure for your career.</span>',
    sub:
      'Show-day capture, multi-platform distribution, paid amplification, fan capture, release campaigns, brand systems, all running as a single operating system underneath everything you do as an artist. The tier built for the moment when content + campaigns + capture stop being separate things and start being one piece of infrastructure.',
    pills: [
      '20-40+ videos / month',
      'Show-day capture',
      'Multi-platform distribution',
      'Fan funnel + capture',
      'Brand systems',
    ],
    primaryCta: { label: 'Talk to Us', href: CALENDLY_URL },
    secondaryCta: { label: 'Back to All Offers', href: '/#offers' },
    markerLabel: '',
    offerHighlights: [
      { value: '20-40+', unit: 'videos / month' },
      { value: 'Show',   unit: 'day capture' },
      { value: 'Multi',  unit: 'platform distro' },
      { value: 'Funnel', unit: 'fan capture system' },
    ],
    offerCardCta: { label: 'Talk to Us', href: CALENDLY_URL },
    offerCardFootLabel: 'Full partnership · Infrastructure tier',
    pif: { amount: '$50,000', save: '$10,000' },
  },

  whoFor: {
    eyebrow: 'Who This Is For',
    headline: 'Built for artists treating their career <span class="highlight">as a system.</span>',
    cards: [
      { title: 'Touring artists with active festival circuits.', body: "You're playing 8+ shows a month at this point. Every weekend is content. Tier 04 is the infrastructure that turns that volume into compounding fan growth." },
      { title: 'Artists in serious release cycles.',             body: 'Album, EP, single-tour, or multi-release year. You need campaign coordination, multi-platform distribution, and capture all running underneath one roof.' },
      { title: 'Managed / label-supported artists.',             body: 'You have a team. We become the content + campaign + capture arm. We coordinate with management and the label, not against them.' },
      { title: 'Artists building toward long-term legacy.',      body: "This isn't a single-quarter campaign. This is the infrastructure year, the year you stop running one-offs and start running a system that compounds." },
    ],
  },

  whatYouGet: {
    eyebrow: 'What You Get',
    headline: 'Everything in Tier 03, plus capture, funnel, and amplification.',
    sub:
      'The complete growth stack. Content + campaign + capture + conversion + revenue infrastructure, all coordinated as one operating system underneath your career.',
    cards: [
      { title: 'Priority editing + faster turnaround',           body: 'Your work jumps to the front of the queue. Edits land faster, revisions resolve faster, releases ship faster than any lower tier.' },
      { title: '20-40+ short-form videos/month',                body: 'High-volume output supporting multiple parallel campaigns, release, tour, brand, standalone, without thinning quality on any single thread.' },
      { title: 'Show-day capture via Blueprint Preferred™',      body: 'On-site multicam + photo coverage at your biggest moments, festivals, headlines, release events, tour dates. We staff it ourselves or coordinate through Blueprint Preferred™ depending on the city and scope.' },
      { title: 'Multi-platform distribution',                    body: 'Reels, TikTok, YouTube Shorts, Spotify Canvas, Instagram Stories. Each piece is platform-formatted, not cross-posted. Same capture, multiple deliveries tuned to where the audience is.' },
      { title: 'High-impact moment strategy',                    body: "We don't cut everything equally. Drops, crowd reactions, breakout transitions, and hook frames get prioritized, the moments designed to compound." },
      { title: 'Posting + scheduling management',                body: 'Full social and posting management included, multi-channel calendar, platform-specific cadence, posting times tuned to engagement windows. We run the schedule end to end.' },
      { title: 'Caption + hook optimization at scale',           body: 'Every piece, every platform, tuned individually. Hooks tested, captions iterated based on retention curves. Consistency across the catalog, not one-off tweaks.' },
      { title: 'Cross-platform growth strategy',                 body: 'A single strategy spanning every channel, coordinated so the platforms reinforce each other. Audience expansion campaigns layered on top to bring new fans in, not just maintain reach.' },
      { title: 'Release + show campaigns',                       body: 'Full release-cycle execution and show promotion flows, teaser, drop-day, sustainment, ticket drives, post-show pipelines. Every release and every show treated as a campaign, not a calendar entry.' },
      { title: 'Email + SMS fan funnel',                         body: 'Link-in-bio funnel optimization, email + SMS capture system, sequenced welcome flows, and segmentation by engagement. The audience you own, separate from any platform.' },
      { title: 'Paid amplification',                             body: 'Boost top-performing organic, retarget engaged viewers, run cold-audience prospecting against winning content. Spend follows data, not gut, with monthly budget guidance and clear ROAS reporting.' },
      { title: 'Brand identity + messaging system',              body: 'Ongoing brand identity work, visual, voice, tone, positioning, refreshed as the audience evolves. Messaging stays consistent across every touchpoint so the brand reads the same everywhere a new fan finds you.' },
      { title: 'Performance intelligence',                       body: 'Deep tracking across content, campaigns, funnel, paid, and revenue. Weekly internal review, monthly client review, quarterly strategic recommendations. Pattern identification + growth-trend analysis that catches the curve bending before it shows up in lagging metrics.' },
      { title: 'Blueprint Preferred™ network access',            body: 'Vetted photographers and videographers across the U.S., coordinated to wherever your tour is. Regional capture without flying our crew everywhere, same brand consistency, lower overhead. The production pipeline scales with your schedule.' },
    ],
  },

  howItWorks: {
    eyebrow: 'How It Works',
    headline: 'A 6-month build into a long-term operating system.',
    steps: [
      { title: 'Foundation Audit',     body: 'Full audit of every existing channel, asset, system, and gap. We meet your team. We map what exists and what needs to be built.' },
      { title: 'System Deployment',    body: 'Months 1-2: capture pipelines, posting infrastructure, fan-funnel, brand system, distribution pipes, paid amplification accounts. Everything built before the engine runs.' },
      { title: 'Campaign Activation',  body: 'Month 2-3: first major campaign cycle runs through the full system. We learn what compounds against your specific audience and refine the operating playbook.' },
      { title: 'Optimization Loop',    body: 'Months 3-6: weekly internal optimization, monthly client review, quarterly strategic. The system reads back what works and the playbook gets sharper month over month.' },
      { title: 'Long-term Partnership', body: 'Beyond month 6: ongoing operations, campaign-by-campaign execution, infrastructure scaling. The standard mode is annual renewal, the engine compounds.' },
    ],
  },

  addOns: {
    eyebrow: 'Add-ons & Custom Scope',
    headline: 'Scope flexes around the year ahead of you.',
    items: [
      { title: 'Tour-specific capture deployment', body: 'Dedicated on-site team for a full tour run, 5+ dates, daily capture, daily delivery, tour-end cutdown. Custom-quoted per tour.', price: 'Custom quote' },
      { title: 'Major release campaign overlay',   body: 'Album-cycle campaign overlay on top of base Tier 04, coordinated paid pushes, PR coordination, sync opportunities. Built around a single release moment.', price: 'Custom quote' },
      { title: 'Brand expansion / merch system',   body: 'Merch drop + brand-expansion strategy: visual identity, drop calendar, fulfillment integration, fan-segment campaigns. Treats merch as a brand asset, not a side hustle.', price: 'Custom quote' },
    ],
    nextStep: null,
  },

  faq: {
    eyebrow: 'FAQ',
    headline: 'What a Tier 04 partnership looks like<br/><span class="glow-blue">end to end.</span>',
    lede: 'The questions we walk through with management before any Tier 04 engagement signs.',
    items: [
      { q: 'How does this work alongside my manager / label?',         a: "Tier 04 is built to plug into existing teams, not replace them. We become the content + campaign + capture arm; management owns strategic + business decisions; the label owns release positioning. We coordinate on a shared calendar, explicit lanes, no overlap, no friction." },
      { q: 'Why $10,000 as the starting price?',                        a: 'Tier 04 covers infrastructure that operationally costs Blueprint that much to run, on-site capture, multi-platform production, paid management, fan-funnel ops, performance intelligence. Pricing scales above $10K based on capture volume + tour cadence + campaign overlap.' },
      { q: 'What about exclusivity?',                                  a: "We don't lock you into exclusivity, but Tier 04 is intensive enough that we cap how many artists are running at this tier simultaneously. We'll be honest about availability." },
      { q: 'Is there a path to a longer-term arrangement?',            a: 'Yes, annual partnerships are the standard renewal mode. 6 months is the minimum to deploy the infrastructure; the system compounds significantly in months 7-12 once it\'s been tuned to your audience.' },
      { q: 'Can you handle a single major release at this tier?',      a: "Yes. Many Tier 04 engagements anchor around a single major release cycle. We scope the 6-month engagement around the cycle (pre-release build → release activation → post-release sustainment)." },
      { q: 'What happens at the end of 6 months?',                     a: 'Strategic review. We map results, infrastructure state, and the next 12 months. Most engagements renew annually with scope refinements. A small number wind down to Tier 03 maintenance mode once the campaign cycle is past peak.' },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// Registry — only published tiers are routed.
// Add a tier to publish; remove (or move to a separate "drafts" object)
// to unpublish.
// ─────────────────────────────────────────────────────────────
export const tiers: Record<string, Tier> = {
  [tier01.slug]: tier01,
  [tier02.slug]: tier02,
  [tier03.slug]: tier03,
  [tier04.slug]: tier04,
};

export function getTier(slug: string): Tier | undefined {
  return tiers[slug];
}
