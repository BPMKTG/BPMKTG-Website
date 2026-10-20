// ─────────────────────────────────────────────────────────────
// Blueprint Preferred™ — page copy and application fields
//
// Copy lives here so the page components stay structural, same as
// tiers.ts and products.ts.
//
// What the network promises is derived from what the site already
// claims about it, in WhyBlueprint, Tier 04, and the Outreach OS
// close: a vetted US network that Blueprint books from when an artist
// needs coverage in that market. Nothing here invents rates, spot
// counts, exclusivity or response times, because those are business
// facts nobody has stated. Anything along those lines needs an answer
// from the owner before it goes on the page.
// ─────────────────────────────────────────────────────────────

export type FieldType = 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select';

export interface ApplicationField {
  /** Submitted key. Also the Sheet column header, so keep it readable. */
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  placeholder?: string;
  help?: string;
  options?: string[];
  /** Half-width fields pair up on desktop. */
  width?: 'full' | 'half';
}

export interface ApplicationSection {
  legend: string;
  hint?: string;
  fields?: ApplicationField[];
  /** When present the section renders the self-rated skills matrix.
   *  Each skill becomes its own submitted key, so the Sheet gets one
   *  filterable column per skill rather than a blob of text. */
  skills?: string[];
}

/** Stars per skill. Changing this changes the markup and the labels. */
export const SKILL_MAX = 10;

export const hero = {
  eyebrow: 'Blueprint Preferred™',
  headline: 'The list we book from.',
  sub: 'A vetted network of photographers and videographers worldwide. When an artist we work with needs coverage in your city, this is where we look first.',
  pills: ['Photo and video', 'Worldwide', 'Paid show work', 'Applications reviewed by hand'],
};

export const what = {
  eyebrow: 'What it is',
  headline: 'Coverage that scales with a tour, without sourcing crews city by city.',
  paragraphs: [
    "Blueprint runs growth systems for touring artists, and those artists play cities we aren't in. Flying a crew to every date doesn't work, and finding a competent shooter in an unfamiliar city three days before doors works even less. That gets harder, not easier, once a tour crosses a border.",
    "So we keep a list. When a Tier 03 or Tier 04 client has a show in your city, we staff it ourselves or we coordinate it through Blueprint Preferred™, depending on where it is and what the scope is. The brief goes out the same way it does for our own shoots, so you know what the night needs before you get there.",
  ],
  points: [
    {
      title: 'Real work, not a directory listing.',
      body: "This isn't a marketplace that takes a cut of jobs you find yourself. We come to you when we have a show in your market that needs covering.",
    },
    {
      title: 'You get briefed properly.',
      body: 'Set time, meet point, credentials, the moments worth being in position for, and where the content is going. The same brief our clients send their own shooters.',
    },
    {
      title: 'You keep your own clients.',
      body: "Being on the list isn't exclusive and doesn't touch the work you already do. It adds dates, it doesn't take any.",
    },
  ],
};

// Derived from what the site already claims about how coverage works.
// No rates, no turnaround promises, no response times: those are still
// undecided and listed as such in CONTENT_BRIEF.md section 18.
export const process = {
  eyebrow: 'How it works',
  headline: 'From application to show day.',
  steps: [
    {
      title: 'You apply',
      body: 'One form, read by a person. The portfolio is the part we actually judge.',
    },
    {
      title: 'We come to you',
      body: "When an artist we work with has a show in your city, we check the list first. You aren't pitching for it.",
    },
    {
      title: 'The brief lands first',
      body: 'Set time, meet point, credentials, the moments worth being in position for, and where the content is going. Before the night, not after.',
    },
    {
      title: 'You shoot and deliver',
      body: 'You send the work back, you get credited, and you get paid for the booking.',
    },
  ],
};

export const who = {
  eyebrow: 'Who we take',
  headline: 'Working shooters, not hobbyists.',
  lede: 'Every application is read by a person, and we look at the portfolio first. The bar is simple: could we put you in front of a client tomorrow without worrying about it?',
  criteria: [
    'You already shoot live shows. Not weddings, not portraits, not "I could learn". Live music, in a dark room, with moving lights.',
    'You own your gear, and it can handle a venue. Low light is the whole job.',
    'You can turn work around on a deadline. A recap that lands two weeks late is a recap nobody posts.',
    'You can deliver vertical. Most of what we do with show media ends up on a phone.',
    "You're reachable on a show day. The brief goes out in advance, but things move.",
  ],
};

// ─────────────────────────────────────────────────────────────
// The application
//
// Grouped so a fourteen-field form reads as three short ones. Field
// `name` doubles as the Sheet column header.
// ─────────────────────────────────────────────────────────────
export const applicationSections: ApplicationSection[] = [
  {
    legend: 'You',
    fields: [
      { name: 'Name', label: 'First and last name', type: 'text', required: true, width: 'half', placeholder: 'First and last' },
      // Email and market are not on the owner's original list but the
      // network cannot function without them: one is the only way to
      // reply, the other is the whole premise of booking by city.
      { name: 'Email', label: 'Email', type: 'email', required: true, width: 'half', placeholder: 'you@example.com' },
      { name: 'Primary market', label: 'Primary market', type: 'text', required: true, width: 'half', placeholder: 'City, state, and country' },
      {
        name: 'Travel',
        label: "How far you'll travel",
        type: 'select',
        width: 'half',
        options: ['My city only', 'A few hours from me', 'Anywhere in my country', 'Internationally'],
      },
      { name: 'Phone', label: 'Phone', type: 'tel', width: 'half', placeholder: 'Day-of contact' },
      {
        name: 'Socials',
        label: 'Instagram and other handles',
        type: 'text',
        width: 'half',
        placeholder: '@handle, and anywhere else you post',
      },
    ],
  },
  {
    legend: 'Your work',
    hint: 'The portfolio is the part we actually judge. Send the strongest thing you have, not everything you have.',
    fields: [
      {
        name: 'Portfolio',
        label: 'Portfolio link',
        type: 'url',
        required: true,
        placeholder: 'https://',
        help: 'A site, a Drive folder, a reel. Anything we can open without an account.',
      },
      {
        name: 'Notable work',
        label: 'Artists and brands you have worked with',
        type: 'textarea',
        required: true,
        placeholder: 'A few names is plenty. Venues and festivals count.',
      },
      {
        name: 'Gear',
        label: 'Gear you would bring to a booking',
        type: 'textarea',
        required: true,
        placeholder: 'Bodies, lenses, lighting, audio, drone, stabilisers, anything else you would actually turn up with.',
        help: 'What you own or have reliable access to. Low light is most of this job, so be specific about glass.',
      },
      {
        // Lives here rather than in the rates section: it is a criterion
        // we screen on ("you can turn work around on a deadline"), and
        // the rates block is optional, which would get this skipped.
        name: 'Delivery timeframe',
        label: 'Typical delivery timeframe',
        type: 'select',
        required: true,
        width: 'half',
        options: [
          'Same night or next morning',
          'Within 24 hours',
          'Within 48 hours',
          '3 to 5 days',
          'A week or more',
        ],
        help: 'Your normal pace, not your fastest ever.',
      },
    ],
  },
  {
    legend: 'Your skills',
    hint: "Tick what you actually do, then rate yourself out of ten on each. Be honest rather than generous; we would rather know you're a 9 at photo and a 3 at motion than find out on a show day.",
    skills: [
      'Photography',
      'Videography',
      'Video editing',
      'Color grading',
      'Motion graphics and VFX',
      'Graphic design',
      'Drone',
      'Live streaming',
    ],
    fields: [
      {
        name: 'Other skills',
        label: "Anything else you're good at",
        type: 'text',
        placeholder: 'Not on the list above',
      },
    ],
  },
  {
    legend: 'Your rates',
    // Deliberately all optional. Rates are the question people abandon
    // forms over, and a ballpark given willingly is worth more than a
    // number squeezed out of someone. Currency is a select rather than
    // free text so the Sheet stays sortable now the network is global.
    hint: "Ballparks, not quotes. We won't hold you to these, and leaving them blank won't cost you the application. It just saves a round of emails when something comes up in your city.",
    fields: [
      {
        name: 'Currency',
        label: 'Currency',
        type: 'select',
        width: 'half',
        options: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'Other (say below)'],
      },
      {
        name: 'Rate per show',
        label: 'Typical rate, one show',
        type: 'text',
        width: 'half',
        placeholder: 'e.g. 350, or 300 to 500',
        help: 'One artist, one set, the usual club or support slot.',
      },
      {
        name: 'Rate per festival day',
        label: 'Typical rate, full festival day',
        type: 'text',
        width: 'half',
        placeholder: 'e.g. 900',
        help: 'Multiple sets, long day, more deliverables.',
      },
      {
        // NOT "Travel": the You section already owns that name, and two
        // fields sharing one would collide in the payload and the Sheet.
        name: 'Travel costs',
        label: 'How you handle travel',
        type: 'select',
        width: 'half',
        options: [
          'Included in my market',
          'Charged beyond my city',
          'Charged beyond my region',
          'Case by case',
        ],
      },
      {
        name: 'Rate notes',
        label: 'What changes the number',
        type: 'textarea',
        placeholder: 'What is included, what costs extra, rush turnaround, usage or licensing, anything else that moves the price.',
      },
    ],
  },
  {
    legend: 'A bit about you',
    hint: "The part that actually separates applications. We're picking people we'll put in a room with a client.",
    fields: [
      {
        name: 'About',
        label: 'Tell us about yourself',
        type: 'textarea',
        required: true,
        placeholder: "What you care about, how you got here, what you do when you aren't shooting. Anything that would make us want to work with you.",
      },
    ],
  },
];

// ─────────────────────────────────────────────────────────────
// Every submitted key must be unique. A duplicate is near-invisible:
// the markup still renders, the form still submits, and the second
// field just quietly overwrites the first in the payload and loses a
// Sheet column. Cheaper to fail the build than to find out from a
// half-empty application. Runs at build time; costs nothing at runtime.
// ─────────────────────────────────────────────────────────────
const allFieldNames = applicationSections.flatMap(s => [
  ...(s.fields ?? []).map(f => f.name),
  ...(s.skills ?? []),
]);
const duplicateNames = allFieldNames.filter((n, i) => allFieldNames.indexOf(n) !== i);
if (duplicateNames.length > 0) {
  throw new Error(
    `preferred.ts: duplicate application field names: ${[...new Set(duplicateNames)].join(', ')}. ` +
      'Each field name is a submitted key and a Sheet column, so they have to be unique.',
  );
}

export const formCopy = {
  eyebrow: 'Apply',
  headline: 'Get on the list.',
  lede: "Every application is read by a person. If your work fits, we'll reach out when there's a show in your market.",
  submitLabel: 'Send application',
  successHeadline: "That's in.",
  successBody:
    "We read every application by hand, so this isn't instant. If your work fits what we need in your market, you'll hear from us directly.",
  errorBody: 'Something went wrong sending that. Nothing was lost on your end, but the quickest fix is to email us directly.',
  pendingNote: 'Applications open soon. The form goes live here shortly.',
};
