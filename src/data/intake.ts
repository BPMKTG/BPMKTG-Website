// ─────────────────────────────────────────────────────────────
// Client intake form: /intake
//
// ONE definition, used by both the form (src/components/intake)
// and the server (functions/api/intake.ts). `prop` is the Notion
// property name and must match the database character for
// character, including punctuation: Notion matches exactly and
// silently ignores a property it does not recognise, so a typo
// here looks like a field that "just doesn't save".
//
// Note where `label` and `prop` differ: the database uses "you are"
// where the on-screen copy reads "you're". That is deliberate, not
// a typo to tidy up.
// ─────────────────────────────────────────────────────────────

/** How the field is rendered. */
export type IntakeInput = 'text' | 'email' | 'tel' | 'url' | 'textarea' | 'select' | 'multiselect';

/** How the value is written to Notion. */
export type NotionType =
  | 'title' | 'rich_text' | 'email' | 'phone_number' | 'url' | 'select' | 'multi_select';

export interface IntakeField {
  /** EXACT Notion property name. Also the submitted key. */
  prop: string;
  label: string;
  input: IntakeInput;
  notion: NotionType;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  help?: string;
  width?: 'full' | 'half';
}

export interface IntakeStep {
  title: string;
  blurb?: string;
  /** Rendered as a standing note under the step's fields. */
  note?: string;
  fields: IntakeField[];
}

export const intakeSteps: IntakeStep[] = [
  {
    title: 'About you',
    blurb: 'The basics, so we know who we are talking to and how to reach you.',
    fields: [
      { prop: 'Artist Name', label: 'Artist name', input: 'text', notion: 'title', required: true, width: 'half', placeholder: 'How you are billed' },
      { prop: 'Your Name', label: 'Your name', input: 'text', notion: 'rich_text', required: true, width: 'half', placeholder: 'Your real name' },
      { prop: 'Email', label: 'Email', input: 'email', notion: 'email', required: true, width: 'half', placeholder: 'you@example.com' },
      { prop: 'Phone', label: 'Phone', input: 'tel', notion: 'phone_number', width: 'half', placeholder: 'Best number for show days' },
      {
        prop: 'Best Way to Reach You', label: 'Best way to reach you', input: 'select', notion: 'select',
        width: 'half', options: ['Text', 'Email', 'Call', 'Instagram DM'],
      },
      { prop: 'Home City', label: 'Home city', input: 'text', notion: 'rich_text', width: 'half', placeholder: 'City and state' },
    ],
  },
  {
    title: 'Your brand',
    blurb: 'What the project is actually about. This shapes every caption and cut we make.',
    fields: [
      { prop: 'In one sentence, what is your project about?', label: 'In one sentence, what is your project about?', input: 'textarea', notion: 'rich_text', required: true, placeholder: 'One sentence is genuinely enough.' },
      { prop: 'What do you want fans to feel or take away from your music?', label: 'What do you want fans to feel or take away from your music?', input: 'textarea', notion: 'rich_text' },
      { prop: 'What values or message sit behind the project?', label: 'What values or message sit behind the project?', input: 'textarea', notion: 'rich_text' },
      { prop: 'Who is your ideal fan?', label: 'Who is your ideal fan?', input: 'textarea', notion: 'rich_text', required: true, placeholder: 'Age, scene, what else they listen to, where they are.' },
      { prop: '3 to 5 artists you are inspired by or compared to', label: "3 to 5 artists you're inspired by or compared to", input: 'textarea', notion: 'rich_text' },
      { prop: 'Off-limits: anything you never want posted or associated with you', label: 'Off-limits: anything you never want posted or associated with you', input: 'textarea', notion: 'rich_text', help: 'Topics, imagery, old material, anything. Easier to know now than to undo later.' },
    ],
  },
  {
    title: 'Your music',
    blurb: 'What exists, what is coming, and where it lives.',
    fields: [
      { prop: 'Released music (titles and links)', label: 'Released music (titles and links)', input: 'textarea', notion: 'rich_text' },
      { prop: 'Unreleased music ready to tease', label: 'Unreleased music ready to tease', input: 'textarea', notion: 'rich_text' },
      { prop: 'Planned releases in the next 6 months (titles and target dates)', label: 'Planned releases in the next 6 months (titles and target dates)', input: 'textarea', notion: 'rich_text', help: 'Even rough dates help. The rollout plans backward from them.' },
      { prop: 'Distributor', label: 'Distributor', input: 'text', notion: 'rich_text', width: 'half', placeholder: 'DistroKid, UnitedMasters, label, etc.' },
    ],
  },
  {
    title: 'Your shows',
    blurb: 'Shows are where most of the content comes from, so this drives the calendar.',
    fields: [
      { prop: 'Booked shows (date, venue, city)', label: 'Booked shows (date, venue, city)', input: 'textarea', notion: 'rich_text', placeholder: 'One per line is fine.' },
      {
        prop: 'Events you are targeting', label: "Events you're targeting", input: 'multiselect', notion: 'multi_select',
        options: ['Clubs', 'Festivals', 'Churches and worship nights', 'Conferences', 'Raves', 'Livestreams'],
      },
      {
        prop: 'Shows per month (average)', label: 'Shows per month (average)', input: 'select', notion: 'select',
        width: 'half', options: ['0', '1-2', '3-4', '5+'],
      },
    ],
  },
  {
    title: 'Footage and assets',
    blurb: 'What we have to work with on day one.',
    fields: [
      {
        prop: 'Footage you already have', label: 'Footage you already have', input: 'multiselect', notion: 'multi_select',
        required: true,
        options: ['Live show footage', 'Studio and production', 'Behind the scenes', 'Photos', 'Talking to camera', 'Old social content', 'None yet'],
      },
      { prop: 'Link to your footage folder', label: 'Link to your footage folder', input: 'url', notion: 'url', placeholder: 'Drive, Dropbox, anything we can open', help: 'Set it to anyone-with-the-link before you paste it.' },
      {
        prop: 'Who films your shows right now?', label: 'Who films your shows right now?', input: 'select', notion: 'select',
        options: ['Nobody', 'Me on my phone', 'Friend or crew member', 'Hired photographer or videographer', 'Venue'],
      },
      {
        prop: 'Can you film yourself in the studio or at home?', label: 'Can you film yourself in the studio or at home?', input: 'select', notion: 'select',
        options: ['Yes regularly', 'Sometimes', 'Not really'],
      },
      { prop: 'Link to brand assets (logos, press photos, fonts)', label: 'Link to brand assets (logos, press photos, fonts)', input: 'url', notion: 'url', placeholder: 'https://' },
    ],
  },
  {
    title: 'Your accounts',
    blurb: 'Where you post now, and how it is going.',
    note: "Please don't enter passwords here. We'll set up account access separately and securely.",
    fields: [
      { prop: 'Instagram', label: 'Instagram', input: 'url', notion: 'url', width: 'half', placeholder: 'instagram.com/…' },
      { prop: 'TikTok', label: 'TikTok', input: 'url', notion: 'url', width: 'half', placeholder: 'tiktok.com/@…' },
      { prop: 'Threads', label: 'Threads', input: 'url', notion: 'url', width: 'half', placeholder: 'threads.net/@…' },
      { prop: 'X (Twitter)', label: 'X (Twitter)', input: 'url', notion: 'url', width: 'half', placeholder: 'x.com/…' },
      { prop: 'YouTube', label: 'YouTube', input: 'url', notion: 'url', width: 'half', placeholder: 'youtube.com/@…' },
      { prop: 'Spotify', label: 'Spotify', input: 'url', notion: 'url', width: 'half', placeholder: 'open.spotify.com/artist/…' },
      { prop: 'Apple Music', label: 'Apple Music', input: 'url', notion: 'url', width: 'half', placeholder: 'music.apple.com/artist/…' },
      { prop: 'SoundCloud', label: 'SoundCloud', input: 'url', notion: 'url', width: 'half', placeholder: 'soundcloud.com/…' },
      { prop: 'Other links', label: 'Other links', input: 'textarea', notion: 'rich_text', placeholder: 'Bandcamp, Linktree, Beatport, anything else.' },
      {
        prop: 'How often do you post right now?', label: 'How often do you post right now?', input: 'select', notion: 'select',
        required: true, width: 'half', options: ['Daily', 'A few times a week', 'Weekly', 'Rarely', 'Not at all'],
      },
      { prop: 'Who else posts or manages your accounts?', label: 'Who else posts or manages your accounts?', input: 'text', notion: 'rich_text', width: 'half' },
      { prop: 'Link to your best-performing post so far', label: 'Link to your best-performing post so far', input: 'url', notion: 'url', placeholder: 'https://' },
    ],
  },
  {
    title: 'Team and business',
    blurb: 'Who else is involved, and what already exists commercially.',
    fields: [
      { prop: 'Your team (manager, agent, label, publicist) and their contacts', label: 'Your team (manager, agent, label, publicist) and their contacts', input: 'textarea', notion: 'rich_text', placeholder: 'Names, roles and the best way to reach them.' },
      { prop: 'Merch (link or plans)', label: 'Merch (link or plans)', input: 'textarea', notion: 'rich_text' },
      { prop: 'Email or SMS list (platform and size)', label: 'Email or SMS list (platform and size)', input: 'textarea', notion: 'rich_text', placeholder: 'Mailchimp, Klaviyo, a notes app, or none yet.' },
    ],
  },
  {
    title: 'Goals',
    blurb: 'What winning looks like to you, so we are aiming at the same thing.',
    fields: [
      { prop: 'What does a win look like in 90 days?', label: 'What does a win look like in 90 days?', input: 'textarea', notion: 'rich_text', required: true },
      { prop: 'What does a win look like in 6 months?', label: 'What does a win look like in 6 months?', input: 'textarea', notion: 'rich_text' },
      { prop: 'Biggest frustration with your growth right now', label: 'Biggest frustration with your growth right now', input: 'textarea', notion: 'rich_text' },
      { prop: 'Anything else we should know?', label: 'Anything else we should know?', input: 'textarea', notion: 'rich_text' },
    ],
  },
];

/** Flat list, used by the server to validate and map. */
export const intakeFields: IntakeField[] = intakeSteps.flatMap(s => s.fields);

/** Where a url that will not parse gets appended instead of dropped. */
export const URL_FALLBACK_PROP = 'Other links';

// Guard: `prop` is the submitted key and the Notion property, so a
// duplicate would silently overwrite. Throws at build time.
const propNames = intakeFields.map(f => f.prop);
const dupes = propNames.filter((p, i) => propNames.indexOf(p) !== i);
if (dupes.length) {
  throw new Error(`intake.ts: duplicate Notion property names: ${[...new Set(dupes)].join(', ')}`);
}
