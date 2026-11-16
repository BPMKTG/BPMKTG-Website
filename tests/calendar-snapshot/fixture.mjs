// The one fixture both the snapshot run and the probes use.
export const TODAY = '2026-11-09';
/* ── the fixture ─────────────────────────────────────────────────
   Dates are relative to one pinned day, so the same run tomorrow
   produces the same snapshot. */

export const day = (n) => new Date(Date.parse(`${TODAY}T00:00:00Z`) + n * 86400000)
  .toISOString().slice(0, 10);

const moment = (o) => ({
  title: '', tentative: false, kind: 'Moment', momentType: 'Show', date: null,
  status: 'Confirmed', type: null, owner: 'Blueprint', playbook: null, phase: null,
  where: null, whyItMatters: null, venueCity: null, ticketLink: null,
  id: '', moment: null, streamsToDate: null, ticketsSold: null, capacity: null, ...o,
});
const step = (o) => moment({ kind: 'Step', momentType: null, status: 'Not Started', ...o });

const M1 = { id: 'm-show', title: 'The Echo', momentType: 'Show', date: day(4) };
const M2 = { id: 'm-rel', title: 'Paper Hearts', momentType: 'Release', date: day(11) };

const calendar = [
  moment({ ...M1, venueCity: 'Los Angeles', ticketLink: 'https://t.test/echo',
           ticketsSold: 180, capacity: 250, whyItMatters: 'Biggest room yet.' }),
  moment({ ...M2, streamsToDate: 4200 }),
  moment({ id: 'm-soon', title: 'Rooftop Remix', momentType: 'Show',
           date: day(-6), tentative: true, venueCity: 'Austin' }),

  step({ id: 's1', title: 'Send the show photos', type: 'Content', owner: 'Client',
         date: day(-3), moment: M1 }),
  step({ id: 's2', title: 'Cut the announce reel', type: 'Content', owner: 'Blueprint',
         date: day(-1), status: 'In Progress', moment: M1 }),
  step({ id: 's3', title: 'Schedule the announce post', type: 'Content',
         owner: 'Blueprint', date: TODAY, moment: M1 }),
  step({ id: 's4', title: 'Grant Meta access', type: 'Access', owner: 'Client',
         date: day(2) }),
  step({ id: 's5', title: 'Pull the pre-release numbers', type: 'Reporting',
         owner: 'Blueprint', date: day(9), moment: M2 }),
  step({ id: 's6', title: 'Ticket link live', type: 'Admin', owner: 'Blueprint',
         date: day(-2), status: 'Done', moment: M1 }),
  step({ id: 's7', title: 'Tentative studio hold', type: 'Content', owner: 'Blueprint',
         date: day(5), tentative: true }),
  // Enough on one day to force the "+N more" popover in the month grid.
  ...Array.from({ length: 5 }, (_, i) => step({
    id: `s-pile-${i}`, title: `Pile item ${i + 1}`, type: 'Content',
    owner: i % 2 ? 'Client' : 'Blueprint', date: day(7),
  })),

  /* The layer rules, one row per case. Owner is Blueprint or Client
     and Type is Admin or Content, so these four are every step there
     can be, and the clapperboard doubles the content pair. */
  step({ id: 'L-bc', title: 'Layer: ours, content', type: 'Content',
         owner: 'Blueprint', date: day(3) }),
  step({ id: 'L-ba', title: 'Layer: ours, admin', type: 'Admin',
         owner: 'Blueprint', date: day(3) }),
  step({ id: 'L-cc', title: 'Layer: theirs, content', type: 'Content',
         owner: 'Client', date: day(3) }),
  step({ id: 'L-ca', title: 'Layer: theirs, admin', type: 'Admin',
         owner: 'Client', date: day(3) }),
  step({ id: 'L-film-c', title: '\u{1F3A5} Film: theirs, content', type: 'Content',
         owner: 'Client', date: day(6) }),
  step({ id: 'L-film-b', title: '\u{1F3A5} Film: ours, admin', type: 'Admin',
         owner: 'Blueprint', date: day(6) }),

  /* Off the calendar in every layer. Each is a status Sean could see
     when he reported it. */
  step({ id: 'X-skip', title: 'Gone: skipped', type: 'Content',
         owner: 'Blueprint', date: day(1), status: 'Skipped' }),
  step({ id: 'X-moved', title: 'Gone: moved', type: 'Content',
         owner: 'Blueprint', date: day(1), status: 'Moved' }),
  step({ id: 'X-skip-mine', title: 'Gone: their skipped to-do', type: 'Admin',
         owner: 'Client', date: day(1), status: 'Skipped' }),
  // Done is NOT gone: it happened on that day, and it is drawn ticked.
  step({ id: 'X-done', title: 'Stays: done', type: 'Content',
         owner: 'Client', date: day(1), status: 'Done' }),
];

const con = (o) => ({
  id: '', title: '', status: 'Idea', bucket: null, format: [], source: null,
  filmBy: null, postDate: null, postedBy: 'Blueprint', platforms: [], campaign: [],
  shootCode: null, onScreenText: null, caption: null, notes: null, feedback: null,
  footageLink: null, editLink: null, postLink: null, ...o,
});

const content = [
  con({ id: 'p1', title: 'Studio teaser, day one', status: 'Scheduled',
        postDate: TODAY, bucket: 'Behind the scenes', format: ['Reel'] }),
  con({ id: 'p2', title: 'Lyric pull quote', status: 'Editing', postDate: day(-2),
        bucket: 'Story', format: ['Carousel'], postedBy: 'Client' }),
  con({ id: 'p3', title: 'Rehearsal cut', status: 'Approved', postDate: day(5),
        bucket: 'Behind the scenes', filmBy: day(3) }),
  con({ id: 'p4', title: 'Show recap', status: 'Posted', postDate: day(-5),
        bucket: 'Recap' }),
  con({ id: 'p5', title: 'Tour poster drop', status: 'Scheduled', postDate: day(8),
        bucket: 'Announce', postedBy: 'Client' }),
  // Unscheduled: the tray.
  // Three unscheduled cards on purpose: one the client may schedule
  // and that an Idea->Planned bump applies to, one already Planned,
  // and one of ours, which the tray must refuse to let go of.
  con({ id: 'u1', title: 'Hook idea: the bridge', status: 'Idea', bucket: 'Story',
        postedBy: 'Client' }),
  con({ id: 'u2', title: 'Fan question series', status: 'Idea', bucket: 'Community' }),
  con({ id: 'u3', title: 'Merch tease', status: 'Planned', bucket: 'Announce',
        postedBy: 'Client' }),
];

const opt = (name, color) => ({ name, color });
const contentSchema = {
  bucket: [opt('Behind the scenes', 'blue'), opt('Story', 'purple'),
           opt('Recap', 'green'), opt('Announce', 'orange'), opt('Community', 'yellow')],
  format: [opt('Reel', 'blue'), opt('Carousel', 'purple')],
  platforms: [opt('Instagram', 'purple'), opt('TikTok', 'gray')],
  status: [opt('Idea', 'gray'), opt('Planned', 'brown'), opt('Approved', 'blue'),
           opt('Editing', 'yellow'), opt('Scheduled', 'purple'), opt('Posted', 'green')],
};

export const PAYLOAD = {
  client: {
    artist: 'Sean Comma', tier: 'Tier 3 \u00b7 Fan Growth Engine', stage: 'Active',
    termStart: '2026-08-01', termEnd: '2027-02-01', announcement: null,
    driveFolder: null, contentVault: null, roadmapLink: null, accessComplete: true,
    goals: null, goalDeadline: null, goalInstagramFollowers: null,
    goalSongsAt10k: null, goalShowsPerMonth: null,
  },
  brief: null,
  viewer: { role: 'client' },
  calendar, snapshots: [], content, contentSchema, audits: [],
};

