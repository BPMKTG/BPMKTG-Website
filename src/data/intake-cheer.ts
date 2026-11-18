// ─────────────────────────────────────────────────────────────
// The cheer gym intake: the questions, in the order they are asked.
//
// A form config for the intake engine (src/data/intake-forms.ts). Same
// rules as the artist form in intake.ts: `prop` is the EXACT Notion
// property name in the Gym Intake database and is also the submitted
// key, so a rename here is a rename there.
//
// Unlike the artist form, `prop` is a short column name and `label` is
// the question. The artist database was built with the question as
// the column, which is why its columns are sentences.
//
// The wording is a first draft for Mason to finalise. A label can
// change freely. A `prop` or an option cannot, without the same change
// in Notion.
// ─────────────────────────────────────────────────────────────

import { ACCESS_EMAIL, type IntakeStep } from './intake';

export const cheerGymSteps: IntakeStep[] = [
  {
    title: 'About the gym',
    blurb: "The basics, so we know who we're talking to and how to reach you.",
    fields: [
      { prop: 'Gym Name', label: 'Gym name', input: 'text', notion: 'title', required: true, width: 'half', placeholder: 'As it should appear in posts' },
      { prop: 'Your Name', label: 'Your name', input: 'text', notion: 'rich_text', required: true, width: 'half' },
      { prop: 'Your Role', label: 'Your role at the gym', input: 'text', notion: 'rich_text', width: 'half', placeholder: 'Owner, coach, social media manager' },
      { prop: 'Email', label: 'Email', input: 'email', notion: 'email', required: true, width: 'half', placeholder: 'you@example.com' },
      { prop: 'Phone', label: 'Phone', input: 'tel', notion: 'phone_number', width: 'half', placeholder: 'Best number on competition days' },
      {
        prop: 'Best Way to Reach You', label: 'Best way to reach you', input: 'select', notion: 'select',
        width: 'half', options: ['Text', 'Email', 'Call', 'Instagram DM'],
      },
      { prop: 'City and State', label: 'City and state', input: 'text', notion: 'rich_text', width: 'half' },
      { prop: 'Website', label: 'Website', input: 'url', notion: 'url', width: 'half', placeholder: 'https://' },
    ],
  },
  {
    title: 'Teams and levels',
    blurb: 'Who is on the floor this season. This is what the calendar and the content are organised around.',
    fields: [
      { prop: 'Teams', label: 'Your teams, with level and age division', input: 'textarea', notion: 'rich_text', required: true, placeholder: 'One per line. Senior Elite, Level 4, ages 12 to 18.' },
      {
        prop: 'Number of Athletes', label: 'About how many athletes', input: 'select', notion: 'select',
        width: 'half', options: ['Under 50', '50 to 100', '100 to 200', 'Over 200'],
      },
      {
        prop: 'Other Programs', label: 'What else the gym runs', input: 'multiselect', notion: 'multi_select',
        options: ['Tumbling classes', 'Rec or prep teams', 'Camps and clinics', 'Private lessons', 'Open gym'],
      },
      { prop: 'Coaches to Feature', label: 'Coaches or staff who should be featured', input: 'textarea', notion: 'rich_text', placeholder: 'Names and what they coach.' },
    ],
  },
  {
    title: 'Your season',
    blurb: 'Competitions are where most of the content comes from, so this drives the calendar.',
    fields: [
      { prop: 'Competition Schedule', label: 'Competitions this season (date, event, city)', input: 'textarea', notion: 'rich_text', required: true, placeholder: 'One per line is fine.' },
      { prop: 'Competitions to Cover', label: 'Which of those you want us at', input: 'textarea', notion: 'rich_text', help: 'We shoot photo and video at the ones you pick.' },
      { prop: 'Other Key Dates', label: 'Other dates that matter', input: 'textarea', notion: 'rich_text', placeholder: 'Showcase, tryouts, banquet, picture day, camps.' },
    ],
  },
  {
    title: 'Your accounts',
    blurb: "Where the gym posts now, and how it's going.",
    note: "Please don't enter passwords here. We'll set up account access separately and securely.",
    fields: [
      { prop: 'Instagram', label: 'Instagram', input: 'url', notion: 'url', width: 'half', placeholder: 'instagram.com/…' },
      { prop: 'TikTok', label: 'TikTok', input: 'url', notion: 'url', width: 'half', placeholder: 'tiktok.com/@…' },
      { prop: 'Facebook', label: 'Facebook', input: 'url', notion: 'url', width: 'half', placeholder: 'facebook.com/…' },
      { prop: 'YouTube', label: 'YouTube', input: 'url', notion: 'url', width: 'half', placeholder: 'youtube.com/@…' },
      { prop: 'Other Accounts', label: 'Any other accounts', input: 'textarea', notion: 'rich_text', placeholder: 'Team accounts, a second location, anything else. Links are best.' },
      { prop: 'Who Runs the Accounts', label: 'Who runs each account today', input: 'textarea', notion: 'rich_text' },
      {
        prop: 'Posting Frequency', label: 'How often the gym posts right now', input: 'select', notion: 'select',
        required: true, width: 'half', options: ['Daily', 'A few times a week', 'Weekly', 'Rarely', 'Not at all'],
      },
      { prop: 'Best Post', label: 'Link to your best-performing post so far', input: 'url', notion: 'url', placeholder: 'https://' },
    ],
  },
  {
    title: 'Footage and assets',
    blurb: 'What we have to work with on day one.',
    fields: [
      {
        prop: 'Footage You Have', label: 'Footage you already have', input: 'multiselect', notion: 'multi_select',
        required: true,
        options: ['Competition routines', 'Practice footage', 'Photos', 'Behind the scenes', 'Athlete interviews', 'Old social content', 'None yet'],
      },
      { prop: 'Footage Folder', label: 'Link to your footage folder', input: 'url', notion: 'url', placeholder: 'Drive, Dropbox, anything we can open', help: 'Set it to anyone-with-the-link, or share it with us directly.' },
      {
        prop: 'Who Films Now', label: 'Who films at competitions right now', input: 'select', notion: 'select',
        options: ['Nobody', 'Me on my phone', 'Coaches or staff', 'Parents', 'Hired photographer or videographer', 'The event producer'],
      },
      { prop: 'Brand Assets', label: 'Link to brand assets (logos, colors, fonts)', input: 'url', notion: 'url', placeholder: 'https://' },
    ],
  },
  {
    title: 'Content rules',
    blurb: 'Most of your athletes are minors, so we need the rules before anything is posted.',
    note: "No athlete names here. We'll go through who can and can't be shown together.",
    fields: [
      {
        prop: 'Media Release Status', label: 'Media releases on file', input: 'select', notion: 'select',
        required: true,
        options: ['Every athlete has a signed release', 'Most do but some do not', 'No releases on file', 'Not sure'],
      },
      { prop: 'Athletes Not Shown', label: "How you keep track of athletes who can't be shown", input: 'textarea', notion: 'rich_text', placeholder: 'A list, a note on the roster, a coach who knows.' },
      {
        prop: 'Naming and Tagging Rules', label: 'Rules for names and tagging', input: 'multiselect', notion: 'multi_select',
        options: ['First names only', 'No names at all', 'No ages or grades', "No tagging athletes' personal accounts", 'No school names', 'No location tags'],
      },
      { prop: 'Music and Uniform Rules', label: 'Rules about music, uniforms or routines', input: 'textarea', notion: 'rich_text', placeholder: "Routines you can't show before a date, uniform reveals, licensed music." },
      { prop: 'Who Approves Posts', label: 'Who approves a post before it goes up', input: 'text', notion: 'rich_text' },
      { prop: 'Off-Limits', label: 'Off-limits: anything you never want posted', input: 'textarea', notion: 'rich_text' },
    ],
  },
  {
    title: 'Give us access',
    blurb: 'Adding us to your accounts lets us see your real numbers before our kickoff call. Use the invites below.',
    note: `Never send passwords by text, email, or this form. Everything goes to ${ACCESS_EMAIL}.`,
    guide: [
      {
        platform: 'Instagram + Facebook',
        steps: `Meta Business Suite → Settings → People → invite ${ACCESS_EMAIL}. Instagram needs to be a professional account linked to a Facebook Page.`,
      },
      {
        platform: 'TikTok',
        steps: "TikTok doesn't have simple team access for most accounts. If you use TikTok Business Center, add us there; otherwise skip it and we'll set it up together.",
      },
      { platform: 'YouTube', steps: 'YouTube Studio → Settings → Permissions → Invite.' },
      {
        platform: 'Email or text tools',
        steps: `add ${ACCESS_EMAIL} as a user.`,
      },
    ],
    guideNote: "Menu names change sometimes. If something doesn't match, check the box for what you finished and tell us what's stuck below.",
    fields: [
      {
        prop: 'Access Granted', label: "Access I've granted", input: 'multiselect', notion: 'multi_select',
        options: ['Instagram + Facebook (Meta Business Suite)', 'TikTok', 'YouTube', 'Email platform', 'SMS platform'],
      },
      {
        prop: 'Access Help', label: 'Need help with access?', input: 'textarea', notion: 'rich_text',
        placeholder: "Anything you couldn't find or weren't sure about.",
      },
    ],
  },
  {
    title: 'Goals',
    blurb: "What winning looks like to you, so we're aiming at the same thing.",
    fields: [
      { prop: 'Win in 90 Days', label: 'What does a win look like in 90 days?', input: 'textarea', notion: 'rich_text', required: true },
      { prop: 'Win by End of Season', label: 'What does a win look like by the end of the season?', input: 'textarea', notion: 'rich_text' },
      {
        prop: 'What the Accounts Are For', label: 'What the accounts are for', input: 'multiselect', notion: 'multi_select',
        options: ['Recruiting new athletes', 'Keeping parents informed', 'Celebrating athletes', 'Sponsors and fundraising', "Building the gym's reputation"],
      },
      { prop: 'Biggest Frustration', label: 'Biggest frustration with your social media right now', input: 'textarea', notion: 'rich_text' },
      { prop: 'Anything Else', label: 'Anything else we should know?', input: 'textarea', notion: 'rich_text' },
    ],
  },
];
