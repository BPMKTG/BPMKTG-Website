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
  fields: ApplicationField[];
}

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
    legend: 'You and your market',
    fields: [
      { name: 'Name', label: 'Name', type: 'text', required: true, width: 'half', placeholder: 'First and last' },
      { name: 'Email', label: 'Email', type: 'email', required: true, width: 'half', placeholder: 'you@example.com' },
      { name: 'Phone', label: 'Phone', type: 'tel', width: 'half', placeholder: 'Day-of contact', help: 'Optional, but we will need it before a show.' },
      { name: 'Primary market', label: 'Primary market', type: 'text', required: true, width: 'half', placeholder: 'City and state' },
      {
        name: 'Travel',
        label: 'How far you will travel',
        type: 'select',
        required: true,
        width: 'half',
        options: ['My city only', 'Up to 3 hours', 'My whole region', 'Anywhere in the US'],
      },
      {
        name: 'Discipline',
        label: 'What you shoot',
        type: 'select',
        required: true,
        width: 'half',
        options: ['Photo', 'Video', 'Both'],
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
      { name: 'Instagram', label: 'Instagram', type: 'text', width: 'half', placeholder: '@handle' },
      {
        name: 'Years shooting shows',
        label: 'Years shooting live shows',
        type: 'select',
        required: true,
        width: 'half',
        options: ['Under a year', '1 to 2 years', '3 to 5 years', 'More than 5 years'],
      },
      {
        name: 'Notable work',
        label: 'Venues, festivals or artists you have shot',
        type: 'textarea',
        required: true,
        placeholder: 'A few names is plenty.',
      },
      {
        name: 'Gear',
        label: 'Gear you own',
        type: 'textarea',
        required: true,
        placeholder: 'Bodies, lenses, lighting, anything else that matters in a dark room.',
      },
    ],
  },
  {
    legend: 'Logistics',
    fields: [
      {
        name: 'Turnaround',
        label: 'Turnaround you can commit to',
        type: 'select',
        required: true,
        width: 'half',
        options: ['Within 24 hours', 'Within 48 hours', '3 to 5 days', 'A week or more'],
      },
      {
        name: 'Vertical',
        label: 'Can you deliver vertical?',
        type: 'select',
        required: true,
        width: 'half',
        options: ['Yes, shot vertical natively', 'Yes, cropped from horizontal', 'Not currently'],
      },
      {
        name: 'Notes',
        label: 'Anything else',
        type: 'textarea',
        placeholder: 'Optional. Rates, availability, anything we should know.',
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
