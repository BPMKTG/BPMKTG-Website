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
  sub: 'A vetted network of photographers and videographers across the US. When an artist we work with needs coverage in your market, this is where we look first.',
  pills: ['Photo and video', 'US-wide', 'Paid show work', 'Applications reviewed by hand'],
};

export const what = {
  eyebrow: 'What it is',
  headline: 'Coverage that scales with a tour, without sourcing crews city by city.',
  paragraphs: [
    'Blueprint runs growth systems for touring artists, and those artists play cities we are not in. Flying a crew to every date does not work, and finding a competent shooter in an unfamiliar market three days before doors works even less.',
    'So we keep a list. When a Tier 03 or Tier 04 client has a show in your city, we staff it ourselves or we coordinate it through Blueprint Preferred™, depending on the city and the scope. The brief goes out the same way it does for our own shoots, so you know what the night needs before you get there.',
  ],
  points: [
    {
      title: 'Real work, not a directory listing.',
      body: 'This is not a marketplace that takes a cut of jobs you find yourself. We come to you when we have a show in your market that needs covering.',
    },
    {
      title: 'You get briefed properly.',
      body: 'Set time, meet point, credentials, the moments worth being in position for, and where the content is going. The same brief our clients send their own shooters.',
    },
    {
      title: 'You keep your own clients.',
      body: 'Being on the list is not exclusive and does not touch the work you already do. It adds dates, it does not take any.',
    },
  ],
};

export const who = {
  eyebrow: 'Who we take',
  headline: 'Working shooters, not hobbyists.',
  lede: 'Every application is read by a person, and we look at the portfolio first. The bar is simple: could we put you in front of a client tomorrow without worrying about it?',
  criteria: [
    'You already shoot live shows. Not weddings, not portraits, not "I could learn" — live music, in a dark room, with moving lights.',
    'You own your gear, and it can handle a venue. Low light is the whole job.',
    'You can turn work around on a deadline. A recap that lands two weeks late is a recap nobody posts.',
    'You can deliver vertical. Most of what we do with show media ends up on a phone.',
    'You are reachable on a show day. The brief goes out in advance, but things move.',
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
      { name: 'Primary market', label: 'Primary market', type: 'text', required: true, width: 'half', placeholder: 'City and state' },
      {
        name: 'Travel',
        label: 'How far you will travel',
        type: 'select',
        width: 'half',
        options: ['My city only', 'Up to 3 hours', 'My whole region', 'Anywhere in the US'],
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
    ],
  },
  {
    legend: 'Your skills',
    hint: 'Tick what you actually do, then rate yourself out of ten on each. Be honest rather than generous; we would rather know you are a 9 at photo and a 3 at motion than find out on a show day.',
    skills: [
      'Photography',
      'Videography',
      'Video editing',
      'Color grading',
      'Motion graphics and VFX',
      'Graphic design',
      'Photo retouching',
      'Drone',
      'Lighting',
      'Live streaming',
    ],
    fields: [
      {
        name: 'Other skills',
        label: 'Anything else you are good at',
        type: 'text',
        placeholder: 'Not on the list above',
      },
    ],
  },
  {
    legend: 'A bit about you',
    hint: 'The part that actually separates applications. We are picking people we will put in a room with a client.',
    fields: [
      {
        name: 'About',
        label: 'Tell us about yourself',
        type: 'textarea',
        required: true,
        placeholder: 'What you care about, how you got here, what you do when you are not shooting. Anything that would make us want to work with you.',
      },
    ],
  },
];

export const formCopy = {
  eyebrow: 'Apply',
  headline: 'Get on the list.',
  lede: 'Every application is read by a person. If your work fits, we will reach out when there is a show in your market.',
  submitLabel: 'Send application',
  successHeadline: "That's in.",
  successBody:
    'We read every application by hand, so this is not instant. If your work fits what we need in your market, you will hear from us directly.',
  errorBody: 'Something went wrong sending that. Nothing was lost on your end, but the quickest fix is to email us directly.',
  pendingNote: 'Applications open soon. The form goes live here shortly.',
};
