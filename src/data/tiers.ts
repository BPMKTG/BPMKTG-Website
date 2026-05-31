// ─────────────────────────────────────────────────────────────
// Tier page data
//
// Each tier page (/tiers/<slug>) is rendered by the dynamic route
// src/pages/tiers/[slug].astro, which calls <TierPage tier={...} />.
// Adding a new tier = adding an entry below + registering a hero
// background image in the route file. No new components needed.
//
// Copy lives here so the page components stay purely structural and
// future tiers can be slotted in by editing one file.
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

export interface Tier {
  slug: string;
  number: string;       // "01"
  name: string;         // "Growth Blueprint Session™"
  shortName: string;    // "Growth Blueprint"
  price: string;        // "$1,000"
  priceNote: string;    // "one-time · no retainer"
  positioning: string;  // one-liner for meta description

  hero: {
    eyebrow: string;
    headline: string;   // HTML allowed — use <span class="highlight blue"> for accent
    sub: string;
    pills: string[];    // 3–5 short at-a-glance value points shown below the sub
    primaryCta: TierCta;
    secondaryCta: TierCta;
  };

  whoFor: {
    eyebrow: string;
    headline: string;
    cards: TierCard[];
  };

  whatYouGet: {
    eyebrow: string;
    headline: string;
    sub: string;
    cards: TierCard[];
  };

  howItWorks: {
    eyebrow: string;
    headline: string;
    steps: TierStep[];
  };

  whyExists: {
    eyebrow: string;
    headline: string;   // HTML allowed
    paragraphs: string[]; // each can include HTML (.hl spans, etc.)
  };

  addOns: {
    eyebrow: string;
    headline: string;
    items: TierAddOn[];
    nextStep: TierNextStep | null;
  };

  faq: {
    eyebrow: string;
    headline: string;   // HTML allowed
    lede: string;
    items: TierFaqItem[];
  };
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
    eyebrow: 'Tier 01 — Growth Blueprint Session™',
    headline:
      'A clean starting point —<br/><span class="highlight blue">before you build bigger.</span>',
    sub:
      "Not more random content — a real plan behind the content. A one-time audit + strategy session that turns what you've already created into a 2–4 week roadmap you can run yourself.",
    pills: [
      '6 deliverables',
      '60–90 min live session',
      '7–10 day turnaround',
      'No retainer',
      'Show footage included',
    ],
    primaryCta: { label: 'Book Your Session', href: '#book' },
    secondaryCta: { label: 'Back to All Offers', href: '/#offers' },
  },

  whoFor: {
    eyebrow: 'Who This Is For',
    headline: 'Built for the artist at a specific moment in the curve.',
    cards: [
      {
        title: 'Posting for months without traction.',
        body: "You're consistent, but the content isn't converting into fans, streams, or bookings. You're not sure if it's the work or the strategy.",
      },
      {
        title: 'Sitting on hours of unused show footage.',
        body: 'Dancefestopia, Wicked Oaks, your last headline set — captured and never touched. This is where it earns its keep.',
      },
      {
        title: 'Four to eight weeks out from a release.',
        body: 'Single, EP, festival announcement — you want the rollout to actually move people instead of disappearing into the feed.',
      },
      {
        title: 'Wanting direction before a monthly commitment.',
        body: "You're considering a retainer but want to prove the system works on a one-time engagement first. Tier 01 is exactly that.",
      },
    ],
  },

  whatYouGet: {
    eyebrow: 'What You Get',
    headline: 'Six deliverables. One focused session.',
    sub:
      'Everything below ships within 7–10 days of intake. The live delivery session is the moment we walk you through it.',
    cards: [
      {
        title: 'Content audit & growth breakdown',
        body:
          "Every active platform, every recent post, every gap in your funnel — analyzed and documented. You see what's earning attention, what's invisible, and where the leak is.",
      },
      {
        title: 'Performance review',
        body:
          "What's actually working in your numbers, and what isn't. Engagement patterns, viewer drop-off, format performance, time-of-day data. The picture instead of the gut feeling.",
      },
      {
        title: 'EDM-specific content direction',
        body:
          'A concrete set of formats, hooks, and ideas built for bass music — not generic creator advice. We know what plays in this scene and what gets scrolled past.',
      },
      {
        title: 'Show footage repurposing',
        body:
          '5 to 15 short-form clips edited from your existing footage. Drops, crowd reactions, b-roll, backstage — turned into content you can post immediately after the session.',
      },
      {
        title: 'Platform optimization',
        body:
          'Bio, link-in-bio, profile, pinned posts, cover photos, positioning copy — every front-page element tuned so first-time visitors convert into followers.',
      },
      {
        title: '2–4 week posting plan',
        body:
          'A scheduled, sequenced content calendar with hooks, captions, posting times, and platform-specific formatting. You leave with something you can run yourself the next morning.',
      },
    ],
  },

  howItWorks: {
    eyebrow: 'How It Works',
    headline: 'Five steps. About ten days end-to-end.',
    steps: [
      {
        title: 'Intake',
        body:
          "You send us your channels, your recent shows, your footage drive, and a quick brief on what you're trying to grow. We do the legwork before you spend a minute.",
      },
      {
        title: 'Audit & Analysis',
        body:
          "We pull data across every platform, watch your existing content, identify what's working and what's wasted. No assumptions, no templates.",
      },
      {
        title: 'Strategy Build',
        body:
          'We build your specific content direction, posting plan, and platform optimizations — all EDM-native, all tailored to where you are right now.',
      },
      {
        title: 'Delivery Session',
        body:
          "60 to 90 minutes, live, just us and you. We walk through every finding, every recommendation, and every clip we've cut from your footage.",
      },
      {
        title: 'You Run It',
        body:
          'You walk out with the audit, the strategy doc, the clips, and the 2–4 week plan. You execute. If you want help running it, Tier 02 is the next step.',
      },
    ],
  },

  whyExists: {
    eyebrow: 'Why This Tier Exists',
    headline:
      'Most artists don\'t need more content. They need a <span class="hl">real plan</span> underneath it.',
    paragraphs: [
      "If you've been posting for six months with nothing moving, the answer isn't more posts. It's a system underneath them. We see this every week — artists creating real work that doesn't compound because there's no infrastructure under it.",
      "This isn't a sales call. It's not a pitch. It's a one-time, focused session built to give you direction without locking you into anything monthly. Some artists leave and run it themselves for a year. Others come back for Tier 02 once they've validated the system.",
      "Either way, you walk out with clarity — what's working, what isn't, and what to do next. <span class=\"hl\">That's the whole point.</span>",
    ],
  },

  addOns: {
    eyebrow: 'Add-ons & Next Step',
    headline: 'Scale it up — or take it for a run first.',
    items: [
      {
        title: 'Extra clip pack',
        body:
          '+10 additional short-form clips repurposed from your footage drive. Useful if you have a lot of material and want runway past the initial plan.',
        price: '+$500',
      },
      {
        title: 'One month of posting management',
        body:
          'We run the 2–4 week plan for you instead of handing it off — scheduling, captioning, posting, and reporting. A clean bridge into monthly.',
        price: '+$750',
      },
      {
        title: 'Brand identity tuning',
        body:
          'Visual + voice pass — color, typography, tone, positioning copy. Same session, just spends some of it on identity instead of execution.',
        price: '+$400',
      },
    ],
    nextStep: {
      number: '02',
      name: 'Content Engine Starter™',
      description:
        "The natural next step when the Blueprint validates and you're ready to run it monthly. We credit the Tier 01 fee toward your first month if you upgrade within 30 days.",
      href: '/#offers',
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
    headline:
      'Real questions about Tier 01 —<br/><span class="glow-blue">answered straight.</span>',
    lede:
      "The ones we hear before every Blueprint Session. If yours isn't here, ask on the call.",
    items: [
      {
        q: 'How long does the whole thing take?',
        a: 'From intake to delivery is typically 7–10 days. The session itself is 60–90 minutes live, then you have everything to run yourself.',
      },
      {
        q: 'Do you film the session? Do I need to film anything?',
        a: "No filming required for Tier 01. We work with footage you've already captured — show clips, backstage, behind-the-scenes. If you have a hard drive of unused footage, this is when it earns its keep. If you don't, we'll lean on optimization and direction instead.",
      },
      {
        q: "What if I'm new and don't have show footage yet?",
        a: "We can still build the audit and the posting plan. We'll lean harder on platform optimization, content direction, and what to film going forward. If you're pre-touring, Tier 02 or 03 may be a better fit when you're ready to scale.",
      },
      {
        q: 'Can I customize the deliverables?',
        a: 'Yes. Some artists trade the show-footage repurposing for more clips from existing IG/TikTok, or swap the posting plan length. We adjust during intake — the deliverable list is the menu, not the contract.',
      },
      {
        q: 'Is this secretly a sales call for Tier 02?',
        a: "No. The session is the deliverable, not a pitch. We won't bring up Tier 02 unless you do. If you want to upgrade to monthly after, we set up a separate call for it.",
      },
      {
        q: 'What if I want to keep working together after?',
        a: 'Tier 02 (Content Engine Starter™) is the natural next step — monthly content + ongoing strategy. We credit your Tier 01 fee toward your first month if you upgrade within 30 days of delivery.',
      },
    ],
  },
};

// ─────────────────────────────────────────────────────────────
// Registry — only published tiers are routed.
// Add tier02/03/04 here when they're ready (and add hero bg in route).
// ─────────────────────────────────────────────────────────────
export const tiers: Record<string, Tier> = {
  [tier01.slug]: tier01,
};

export function getTier(slug: string): Tier | undefined {
  return tiers[slug];
}
