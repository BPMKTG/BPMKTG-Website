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
export interface TierCard { title: string; body: string; }
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
  number: string;       // "01" — also the HUD-marker outlined text
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
  };

  whoFor: { eyebrow: string; headline: string; cards: TierCard[] };
  whatYouGet: { eyebrow: string; headline: string; sub: string; cards: TierCard[] };
  howItWorks: { eyebrow: string; headline: string; steps: TierStep[] };
  addOns: {
    eyebrow: string;
    headline: string;
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
      'A clean starting point —<br/><span class="highlight blue">before you build bigger.</span>',
    sub:
      "Not more random content — a real plan behind the content. A one-time audit + strategy session that turns what you've already created into a 2–4 week roadmap you can run yourself.",
    pills: [
      'Strategy-focused',
      '60–90 min live session',
      'Content roadmap',
      '7–10 day turnaround',
      'No monthly retainer',
    ],
    primaryCta: { label: 'Book Your Session', href: '#book' },
    secondaryCta: { label: 'Back to All Offers', href: '/#offers' },
    markerLabel: 'Tier',
    offerHighlights: [
      { value: '6',     unit: 'deliverables' },
      { value: '60–90', unit: 'min strategy call' },
      { value: '7–10',  unit: 'day turnaround' },
      { value: '5–15',  unit: 'repurposed clips' },
    ],
    offerCardCta: { label: 'Reserve Your Session', href: '#book' },
    offerCardFootLabel: 'Strategy-first · Foundation tier',
  },

  whoFor: {
    eyebrow: 'Who This Is For',
    headline: 'Built for the artist at a specific moment in the curve.',
    cards: [
      { title: 'Posting for months without traction.',           body: "You're consistent, but the content isn't converting into fans, streams, or bookings. You're not sure if it's the work or the strategy." },
      { title: 'Sitting on hours of unused show footage.',       body: 'Dancefestopia, Wicked Oaks, your last headline set — captured and never touched. This is where it earns its keep.' },
      { title: 'Four to eight weeks out from a release.',        body: 'Single, EP, festival announcement — you want the rollout to actually move people instead of disappearing into the feed.' },
      { title: 'Wanting direction before a monthly commitment.', body: "You're considering a retainer but want to prove the system works on a one-time engagement first. Tier 01 is exactly that." },
    ],
  },

  whatYouGet: {
    eyebrow: 'What You Get',
    headline: 'Six deliverables. One focused session.',
    sub:
      'Everything below ships within 7–10 days of intake. The live delivery session is the moment we walk you through it.',
    cards: [
      { title: 'Content audit & growth breakdown',  body: "Every active platform, every recent post, every gap in your funnel — analyzed and documented. You see what's earning attention, what's invisible, and where the leak is." },
      { title: 'Performance review',                body: "What's actually working in your numbers, and what isn't. Engagement patterns, viewer drop-off, format performance, time-of-day data. The picture instead of the gut feeling." },
      { title: 'EDM-specific content direction',    body: 'A concrete set of formats, hooks, and ideas built for bass music — not generic creator advice. We know what plays in this scene and what gets scrolled past.' },
      { title: 'Show footage repurposing',          body: '5 to 15 short-form clips edited from your existing footage. Drops, crowd reactions, b-roll, backstage — turned into content you can post immediately after the session.' },
      { title: 'Platform optimization',             body: 'Bio, link-in-bio, profile, pinned posts, cover photos, positioning copy — every front-page element tuned so first-time visitors convert into followers.' },
      { title: '2–4 week posting plan',             body: 'A scheduled, sequenced content calendar with hooks, captions, posting times, and platform-specific formatting. You leave with something you can run yourself the next morning.' },
    ],
  },

  howItWorks: {
    eyebrow: 'How It Works',
    headline: 'Five steps. About ten days end-to-end.',
    steps: [
      { title: 'Intake',           body: "You send us your channels, your recent shows, your footage drive, and a quick brief on what you're trying to grow. We do the legwork before you spend a minute." },
      { title: 'Audit & Analysis', body: "We pull data across every platform, watch your existing content, identify what's working and what's wasted. No assumptions, no templates." },
      { title: 'Strategy Build',   body: 'We build your specific content direction, posting plan, and platform optimizations — all EDM-native, all tailored to where you are right now.' },
      { title: 'Delivery Session', body: "60 to 90 minutes, live, just us and you. We walk through every finding, every recommendation, and every clip we've cut from your footage." },
      { title: 'You Run It',       body: 'You walk out with the audit, the strategy doc, the clips, and the 2–4 week plan. You execute. If you want help running it, Tier 02 is the next step.' },
    ],
  },

  addOns: {
    eyebrow: 'Add-ons & Next Step',
    headline: 'Scale it up — or take it for a run first.',
    items: [
      { title: 'Extra clip pack',                  body: '+10 additional short-form clips repurposed from your footage drive. Useful if you have a lot of material and want runway past the initial plan.', price: '+$500' },
      { title: 'One month of posting management',  body: 'We run the 2–4 week plan for you instead of handing it off — scheduling, captioning, posting, and reporting. A clean bridge into monthly.',        price: '+$750' },
      { title: 'Brand identity tuning',            body: 'Visual + voice pass — color, typography, tone, positioning copy. Same session, just spends some of it on identity instead of execution.',          price: '+$400' },
    ],
    nextStep: {
      number: '02',
      name: 'Content Engine Starter™',
      description:
        "The natural next step when the Blueprint validates and you're ready to run it monthly. We credit the Tier 01 fee toward your first month if you upgrade within 30 days.",
      href: '/tiers/tier-02',
      bullets: [
        '8–12 short-form videos / month',
        'EDM-focused monthly direction',
        '1 strategy call / month',
        'From $1,000 / month',
      ],
    },
  },

  faq: {
    eyebrow: 'FAQ',
    headline: 'Real questions about Tier 01 —<br/><span class="glow-blue">answered straight.</span>',
    lede: "The ones we hear before every Blueprint Session. If yours isn't here, ask on the call.",
    items: [
      { q: 'How long does the whole thing take?',                a: 'From intake to delivery is typically 7–10 days. The session itself is 60–90 minutes live, then you have everything to run yourself.' },
      { q: 'Do you film the session? Do I need to film anything?', a: "No filming required for Tier 01. We work with footage you've already captured — show clips, backstage, behind-the-scenes. If you have a hard drive of unused footage, this is when it earns its keep. If you don't, we'll lean on optimization and direction instead." },
      { q: "What if I'm new and don't have show footage yet?",   a: "We can still build the audit and the posting plan. We'll lean harder on platform optimization, content direction, and what to film going forward. If you're pre-touring, Tier 02 or 03 may be a better fit when you're ready to scale." },
      { q: 'Can I customize the deliverables?',                   a: 'Yes. Some artists trade the show-footage repurposing for more clips from existing IG/TikTok, or swap the posting plan length. We adjust during intake — the deliverable list is the menu, not the contract.' },
      { q: 'Is this secretly a sales call for Tier 02?',          a: "No. The session is the deliverable, not a pitch. We won't bring up Tier 02 unless you do. If you want to upgrade to monthly after, we set up a separate call for it." },
      { q: 'What if I want to keep working together after?',      a: 'Tier 02 (Content Engine Starter™) is the natural next step — monthly content + ongoing strategy. We credit your Tier 01 fee toward your first month if you upgrade within 30 days of delivery.' },
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
  positioning: 'Consistent rollout — without the overhead.',

  hero: {
    eyebrow: 'Recurring Execution',
    headline:
      'Consistent rollout —<br/><span class="highlight blue">without the overhead.</span>',
    sub:
      "The plug-and-play system for artists who validated direction in Tier 01 and want monthly execution — 8 to 12 short-form videos a month, an EDM-native direction plan, and a live strategy call so the system keeps adapting to where you are.",
    pills: [
      '8–12 videos / month',
      'Monthly direction',
      'Strategy call included',
      '3-month commitment',
      'Recurring execution',
    ],
    primaryCta: { label: 'Start Your Engine', href: '#book' },
    secondaryCta: { label: 'Back to All Offers', href: '/#offers' },
    markerLabel: 'Tier',
    offerHighlights: [
      { value: '8–12',  unit: 'videos / month' },
      { value: '1',     unit: 'strategy call / mo' },
      { value: '3',     unit: 'month minimum' },
      { value: 'Live',  unit: 'monthly direction' },
    ],
    offerCardCta: { label: 'Start the Engine', href: '#book' },
    offerCardFootLabel: 'Recurring rollout · Momentum tier',
  },

  whoFor: {
    eyebrow: 'Who This Is For',
    headline: 'Built for artists who want consistency without thinking.',
    cards: [
      { title: 'Validated Tier 01 — ready to run monthly.',  body: "You've seen the audit, you trust the system, and you don't want to run it yourself anymore. Tier 02 is the handoff." },
      { title: 'Touring 2–6 shows a month.',                 body: 'You have footage coming in regularly. We turn that footage into a feed instead of letting it sit on a hard drive.' },
      { title: 'Building toward a release cycle.',           body: 'Single coming in 2–4 months — you want consistent monthly visibility now so the release lands on warm audience instead of cold scroll.' },
      { title: 'Tired of guessing what to post next.',       body: "Every Monday should not be a strategic crisis. Tier 02 hands you the calendar so you focus on music, not captions." },
    ],
  },

  whatYouGet: {
    eyebrow: 'What You Get',
    headline: 'Monthly execution with strategy on top.',
    sub:
      'Everything ships on a monthly cadence with light footage intake from you. The system runs whether you have a show that week or not.',
    cards: [
      { title: '8–12 short-form videos / month',  body: 'Edited, formatted, and ready for TikTok / Reels / Shorts. Built around your footage, your sound, your scene — not stock templates.' },
      { title: 'EDM-native monthly direction',     body: 'Each month gets a content direction tuned to what\'s working in the scene right now — hooks, formats, trends — applied to your specific brand.' },
      { title: 'Posting cadence + scheduling guidance', body: "We give you the cadence — when to post, what to lead with, what to follow it with. You can hand off the scheduling or do it yourself; either works." },
      { title: '1 live strategy call / month',     body: "60 minutes monthly. Performance review, what's working, what's next. The recurring check-in that keeps the system honest." },
      { title: 'Hook + caption guidance',          body: "Short-form lives or dies on the first 3 seconds. We hand you platform-specific hook and caption frameworks so the videos earn the scroll-stop." },
      { title: 'Light footage repurposing',        body: "Footage you send us in any given month gets light editing into the monthly batch. Not show-day capture — but the bridge between Tier 01 and a full content team." },
    ],
  },

  howItWorks: {
    eyebrow: 'How It Works',
    headline: 'Repeats monthly. Adapts as the system learns.',
    steps: [
      { title: 'Onboarding',     body: 'Channel access, footage drive intake, brand voice intake, monthly-cadence calendar — all set up in the first 7 days.' },
      { title: 'Direction Set',  body: "Each month opens with the new direction: themes, formats, hooks, and the rough plan for the 8–12 pieces." },
      { title: 'Execution',      body: 'Editing, formatting, captioning, platform-specific exports. Delivered in batches so your queue stays full without you managing it.' },
      { title: 'Delivery',       body: 'Files land in your shared drive with naming, captions, and posting recommendations. You schedule, or hand off scheduling to your team.' },
      { title: 'Monthly Review', body: "The strategy call. What worked, what didn't, what we change next month. The system learns about your audience month by month." },
    ],
  },

  addOns: {
    eyebrow: 'Add-ons & Next Step',
    headline: 'Add the parts you need — or step up to Tier 03.',
    items: [
      { title: 'Volume bump',           body: '+6 videos per month on top of the base 8–12. Useful during release windows or tour months where the feed needs more frequency.', price: '+$500/mo' },
      { title: 'Posting management',    body: "We handle scheduling, posting, and reporting in addition to the editing. The bridge if you don't have someone running your channels yet.", price: '+$400/mo' },
      { title: 'Brand identity sprint', body: 'One-time visual + voice tune-up applied across the monthly output: color, typography, tone, positioning copy.', price: '+$500 one-time' },
    ],
    nextStep: {
      number: '03',
      name: 'Fan Growth Engine™',
      description:
        "When Tier 02 is running clean and you're ready to layer show-based content mapping, release campaigns, performance tracking, and brand positioning on top. The jump from execution to campaign infrastructure.",
      href: '/tiers/tier-03',
      bullets: [
        '15–25 short-form videos / month',
        'Show + release campaign planning',
        'Monthly growth report',
        'From $2,000 / month',
      ],
    },
  },

  faq: {
    eyebrow: 'FAQ',
    headline: "What Tier 02 actually looks like —<br/><span class=\"glow-blue\">in motion.</span>",
    lede: 'The ones we hear before every monthly engagement starts.',
    items: [
      { q: 'Is the 3-month minimum a contract I can\'t exit?', a: "It's a commitment, not a trap. We need 3 months to actually see whether the system is working — that's the minimum reasonable test. If something breaks the engagement on our side (delivery delays, mismatch), we don't hold you to it." },
      { q: 'What if I don\'t have footage coming in monthly?', a: "Workable. We lean on existing-content repurposing, format-only content (no footage needed), and IG/TikTok-native creator content. If your output is truly footage-light, Tier 02 still produces — it just looks different than for a touring artist." },
      { q: 'Can I scale up to Tier 03 mid-engagement?',         a: "Yes — most artists who upgrade do it after month 2 once the foundation is running and a release campaign is on the calendar. We pro-rate the transition; you don't pay double in the changeover month." },
      { q: 'Do you post for me or just deliver the files?',     a: "Base Tier 02 delivers files with posting guidance — you (or your team) execute. The Posting Management add-on is the option if you want us running the schedule end-to-end." },
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
  price: '$2,000+',
  priceNote: 'per month · 6-month commitment',
  positioning: 'Full content, distribution, and campaign coordination.',

  hero: {
    eyebrow: 'Release & Campaign Infrastructure',
    headline:
      'Where execution becomes —<br/><span class="highlight blue">a real fan-growth machine.</span>',
    sub:
      'For artists ready to layer show-based content mapping, release campaigns, brand positioning, and performance tracking on top of monthly execution. The tier where Blueprint stops feeling like a vendor and starts feeling like infrastructure.',
    pills: [
      '15–25 videos / month',
      'Release campaigns',
      'Show-based mapping',
      'Brand positioning',
      'Performance tracking',
    ],
    primaryCta: { label: 'Talk to Us', href: '#book' },
    secondaryCta: { label: 'Back to All Offers', href: '/#offers' },
    markerLabel: 'Tier',
    offerHighlights: [
      { value: '15–25', unit: 'videos / month' },
      { value: '6',     unit: 'month commitment' },
      { value: 'Show',  unit: 'content mapping' },
      { value: 'Monthly', unit: 'growth report' },
    ],
    offerCardCta: { label: 'Start the Engine', href: '#book' },
    offerCardFootLabel: 'Campaign infrastructure · Growth tier',
  },

  whoFor: {
    eyebrow: 'Who This Is For',
    headline: 'Built for artists with traction — ready to compound it.',
    cards: [
      { title: 'Released artists with consistent shows.', body: "You're playing 4+ shows a month, you have a release calendar, and content is the bottleneck — not the music." },
      { title: 'Mid-tier artists scaling reach.',          body: 'You\'re past the "is anyone listening" phase. Now it\'s about turning attention into a real fanbase that shows up.' },
      { title: 'Artists running rollouts every 2–3 months.', body: 'Single → EP → tour announce → festival → next single. Every cycle deserves campaign infrastructure, not improvisation.' },
      { title: 'Teams without a content engine.',          body: 'You have management, you have an agent, you don\'t have content + brand running underneath them. Tier 03 plugs that hole.' },
    ],
  },

  whatYouGet: {
    eyebrow: 'What You Get',
    headline: 'Execution + campaign + positioning + tracking.',
    sub:
      'Everything in Tier 02, plus the systems that turn monthly content into a campaign machine — built around your shows, releases, and brand.',
    cards: [
      { title: '15–25 short-form videos / month',     body: 'A meaningful volume bump that lets us run multiple narratives per month — release rollout, show content, brand positioning, and standalone hooks — without thinning the quality.' },
      { title: 'Show footage repurposing (1 → many)', body: 'Every show becomes weeks of content. One night, captured properly, turns into a recap, multiple drops, vertical cuts, BTS — all from the same footage pull.' },
      { title: 'Show-based content mapping',          body: 'Pre-show, show-night, post-show content sequence — designed so every show becomes a momentum spike, not a one-night peak.' },
      { title: 'Release-based content planning',      body: '6–12 week rollouts mapped per release: pre-save, teaser sequence, release day, post-release sustainment. Built so the algorithm sees the heat by drop day.' },
      { title: 'Brand positioning guidance',          body: "Tone, visual identity, language, what your brand stands for in the scene. Less drift, more recognition. We refine as the system learns who's actually engaging." },
      { title: 'Monthly growth report',               body: 'Clear, structured: what\'s growing, what plateaued, what the data is saying. The accountability layer that keeps the engagement honest.' },
    ],
  },

  howItWorks: {
    eyebrow: 'How It Works',
    headline: 'Show + release calendars driving the whole engine.',
    steps: [
      { title: 'Calendar Build',     body: 'We map the next 6 months: shows, releases, festival circuit, brand moments. The campaign calendar that drives every other deliverable.' },
      { title: 'System Deployment',  body: 'Tier 02 execution stack scaled up — onboarding, brand intake, footage pipelines, posting cadence, performance dashboards — all built around the calendar.' },
      { title: 'Campaign Execution', body: 'Per-show + per-release campaigns produced, scheduled, and tracked. Rolling output rather than batch — the feed never goes quiet around big moments.' },
      { title: 'Performance Loops',  body: 'Weekly internal review, monthly client review. We double down on what compounds, retire what doesn\'t, and feed the wins back into next month\'s direction.' },
      { title: 'Growth Compounding', body: 'By month 3 the system is reading your audience back at you. By month 6 it\'s running on patterns specific to your fans — not generic playbooks.' },
    ],
  },

  addOns: {
    eyebrow: 'Add-ons & Next Step',
    headline: 'Layer the parts that fit — or scale to full partnership.',
    items: [
      { title: 'Event Media bolt-on', body: 'On-site multicam + photo coverage for specific festivals, tour runs, or release events. Feeds straight into the monthly content engine.', price: 'Custom quote' },
      { title: 'Paid amplification',  body: 'Boost top-performing organic content + retarget engaged viewers. Layered onto the campaign calendar so spend follows momentum, not hope.',     price: '+$500/mo + spend' },
      { title: 'Fan-funnel buildout', body: 'Link-in-bio + email + SMS capture infrastructure. The first piece of the Tier 04 stack — useful before fully upgrading.',                       price: '+$750 one-time' },
    ],
    nextStep: {
      number: '04',
      name: 'Artist Growth Infrastructure™',
      description:
        'When Tier 03 is compounding and you want the full machine — show-day capture, multi-platform distribution, paid amplification, fan capture, release campaigns, brand systems, all running as one piece of infrastructure. The complete operating system.',
      href: '/tiers/tier-04',
      bullets: [
        '20–40+ short-form videos / month',
        'Show-day multicam capture',
        'Email + SMS fan capture system',
        'From $5,000 / month',
      ],
    },
  },

  faq: {
    eyebrow: 'FAQ',
    headline: 'How Tier 03 actually runs —<br/><span class="glow-blue">in practice.</span>',
    lede: 'The questions we walk through before any 6-month engagement starts.',
    items: [
      { q: 'Why a 6-month minimum?',                                   a: "Campaigns compound. The first month is calendar build and intake; months 2–3 are deployment and tuning; months 4–6 are where the engine actually starts moving the needle. Three months is too short to see compounding. Six is the honest minimum." },
      { q: 'What if my release calendar shifts?',                      a: 'It does. We rebuild the calendar each time a release moves and adjust the campaign waterfall around the new dates. Cost stays the same; the work just routes differently.' },
      { q: 'Does this replace my manager / label content team?',       a: "No — it works alongside them. Most Tier 03 clients have management; we plug into their workflow and become the content + campaign arm rather than competing with strategic decisions." },
      { q: 'Is show-day capture included?',                            a: 'Show-based content mapping is included (planning + repurposing). Show-day on-site capture is a separate Event Media engagement or a Tier 04 inclusion. Many Tier 03 clients add Event Media for the 2–3 biggest moments of the cycle.' },
      { q: 'Can I scale to Tier 04 mid-engagement?',                   a: 'Yes — typically after month 2 once the campaign infrastructure is running and a major moment (tour, festival circuit, album rollout) is on the calendar that justifies the full Tier 04 stack.' },
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
  price: '$5,000+',
  priceNote: 'per month · 6-month commitment',
  positioning: 'The complete growth machine — built around your career.',

  hero: {
    eyebrow: 'Full Growth Partnership',
    headline:
      'Not a service —<br/><span class="highlight blue">growth infrastructure for your career.</span>',
    sub:
      'Show-day capture, multi-platform distribution, paid amplification, fan capture, release campaigns, brand systems — all running as a single operating system underneath everything you do as an artist. The tier built for the moment when content + campaigns + capture stop being separate things and start being one piece of infrastructure.',
    pills: [
      '20–40+ videos / month',
      'Show-day capture',
      'Multi-platform distribution',
      'Fan funnel + capture',
      'Brand systems',
    ],
    primaryCta: { label: 'Talk to Us', href: '#book' },
    secondaryCta: { label: 'Back to All Offers', href: '/#offers' },
    markerLabel: 'Tier',
    offerHighlights: [
      { value: '20–40+', unit: 'videos / month' },
      { value: 'Show',   unit: 'day capture' },
      { value: 'Multi',  unit: 'platform distro' },
      { value: 'Funnel', unit: 'fan capture system' },
    ],
    offerCardCta: { label: 'Talk to Us', href: '#book' },
    offerCardFootLabel: 'Full partnership · Infrastructure tier',
  },

  whoFor: {
    eyebrow: 'Who This Is For',
    headline: 'Built for artists treating their career as a system.',
    cards: [
      { title: 'Touring artists with active festival circuits.', body: "You're playing 8+ shows a month at this point. Every weekend is content. Tier 04 is the infrastructure that turns that volume into compounding fan growth." },
      { title: 'Artists in serious release cycles.',             body: 'Album, EP, single-tour, or multi-release year — you need campaign coordination, multi-platform distribution, and capture all running underneath one roof.' },
      { title: 'Managed / label-supported artists.',             body: 'You have a team. We become the content + campaign + capture arm. We coordinate with management and the label, not against them.' },
      { title: 'Artists building toward long-term legacy.',      body: "This isn't a single-quarter campaign. This is the infrastructure year — the year you stop running one-offs and start running a system that compounds." },
    ],
  },

  whatYouGet: {
    eyebrow: 'What You Get',
    headline: 'Everything in Tier 03 — plus capture, funnel, and amplification.',
    sub:
      'The complete growth stack. Content + campaign + capture + conversion + revenue infrastructure, all coordinated as one operating system underneath your career.',
    cards: [
      { title: 'Everything in Tier 03',           body: 'Monthly direction, content production, campaign calendar, brand positioning, performance tracking, monthly growth report — full Tier 03 stack as the baseline.' },
      { title: '20–40+ short-form videos / month', body: 'High-volume output supporting multiple parallel campaigns — release, tour, brand, standalone — without thinning quality on any single thread.' },
      { title: 'Show-day capture',                 body: 'On-site multicam + photo coverage at your biggest moments — festivals, headlines, release events, tour dates. Captured by us or via our vetted creator network.' },
      { title: 'Multi-platform distribution',      body: 'Reels, TikTok, YouTube Shorts, Spotify Canvas, Instagram Stories — coordinated so each piece is platform-formatted, not just cross-posted.' },
      { title: 'Link-in-bio + fan funnel',         body: 'The infrastructure that turns followers into a fanbase you own: link-in-bio system, email capture, SMS opt-in, sequenced welcome flows. Audience you keep, not just rent from a platform.' },
      { title: 'Email + SMS capture system',       body: 'Owned-channel fan list with capture automations, segmentation by engagement, and broadcast tools for release / tour / merch drops.' },
      { title: 'Release campaigns',                body: 'Full release-cycle execution: teaser sequence, drop-day takeover, post-release sustainment, paid amplification, fan-funnel conversion — coordinated across every channel.' },
      { title: 'Show promotion flows',             body: 'Pre-show ticket drive, week-of warm-up, day-of activation, post-show capture pipeline — every show treated as a campaign, not a calendar entry.' },
      { title: 'Paid amplification',               body: 'Boost top-performing organic, retarget engaged viewers, run cold-audience prospecting against winning content. Spend follows data, not gut.' },
      { title: 'Brand positioning system',         body: 'Ongoing brand identity refinement — visual, voice, tone, positioning copy — refreshed as the audience and the scene evolve. Not a static guide; a living system.' },
      { title: 'Performance intelligence',         body: 'Deep tracking across content, campaigns, funnel, and revenue. Weekly internal review, monthly client review, quarterly strategic review.' },
      { title: 'Vetted creator network access',    body: 'LA, Denver, Miami, Austin, NY photographer + videographer network. Capture scales with your tour schedule without you hiring locally each time.' },
    ],
  },

  howItWorks: {
    eyebrow: 'How It Works',
    headline: 'A 6-month build into a long-term operating system.',
    steps: [
      { title: 'Foundation Audit',     body: 'Full audit of every existing channel, asset, system, and gap. We meet your team. We map what exists and what needs to be built.' },
      { title: 'System Deployment',    body: 'Months 1–2: capture pipelines, posting infrastructure, fan-funnel, brand system, distribution pipes, paid amplification accounts. Everything built before the engine runs.' },
      { title: 'Campaign Activation',  body: 'Month 2–3: first major campaign cycle runs through the full system. We learn what compounds against your specific audience and refine the operating playbook.' },
      { title: 'Optimization Loop',    body: 'Months 3–6: weekly internal optimization, monthly client review, quarterly strategic. The system reads back what works and the playbook gets sharper month over month.' },
      { title: 'Long-term Partnership', body: 'Beyond month 6: ongoing operations, campaign-by-campaign execution, infrastructure scaling. The standard mode is annual renewal — the engine compounds.' },
    ],
  },

  addOns: {
    eyebrow: 'Add-ons & Custom Scope',
    headline: 'Scope flexes around the year ahead of you.',
    items: [
      { title: 'Tour-specific capture deployment', body: 'Dedicated on-site team for a full tour run — 5+ dates, daily capture, daily delivery, tour-end cutdown. Custom-quoted per tour.', price: 'Custom quote' },
      { title: 'Major release campaign overlay',   body: 'Album-cycle campaign overlay on top of base Tier 04 — coordinated paid pushes, PR coordination, sync opportunities. Built around a single release moment.', price: 'Custom quote' },
      { title: 'Brand expansion / merch system',   body: 'Merch drop + brand-expansion strategy: visual identity, drop calendar, fulfillment integration, fan-segment campaigns. Treats merch as a brand asset, not a side hustle.', price: 'Custom quote' },
    ],
    nextStep: null,
  },

  faq: {
    eyebrow: 'FAQ',
    headline: 'What a Tier 04 partnership looks like —<br/><span class="glow-blue">end to end.</span>',
    lede: 'The questions we walk through with management before any Tier 04 engagement signs.',
    items: [
      { q: 'How does this work alongside my manager / label?',         a: "Tier 04 is built to plug into existing teams, not replace them. We become the content + campaign + capture arm; management owns strategic + business decisions; the label owns release positioning. We coordinate on a shared calendar — explicit lanes, no overlap, no friction." },
      { q: 'Why $5,000 as the starting price?',                        a: 'Tier 04 covers infrastructure that operationally costs Blueprint that much to run — on-site capture, multi-platform production, paid management, fan-funnel ops, performance intelligence. Pricing scales above $5K based on capture volume + tour cadence + campaign overlap.' },
      { q: 'What about exclusivity?',                                  a: "We don't lock you into exclusivity, but Tier 04 is intensive enough that we cap how many artists are running at this tier simultaneously. We'll be honest about availability." },
      { q: 'Is there a path to a longer-term arrangement?',            a: 'Yes — annual partnerships are the standard renewal mode. 6 months is the minimum to deploy the infrastructure; the system compounds significantly in months 7–12 once it\'s been tuned to your audience.' },
      { q: 'Can you handle a single major release at this tier?',      a: "Yes — many Tier 04 engagements anchor around a single major release cycle. We scope the 6-month engagement around the cycle (pre-release build → release activation → post-release sustainment)." },
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
