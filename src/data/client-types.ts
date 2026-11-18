// ─────────────────────────────────────────────────────────────
// Client types: what kind of client this is, and everything that
// follows from it.
//
// The portal and HQ were built for one kind of client, an artist, and
// said so in a hundred small places: "Shows & releases", streams,
// tickets, a 15 to 25 posts band. A cheer gym is a different business
// with the same shape (dates to count down to, things to post, numbers
// to watch), so the differences live HERE, one object per type, and
// the screens ask this file rather than asking "is it a gym?".
//
// Adding a third type is adding one object to CLIENT_TYPES. If a
// screen needs to know something about a type that is not in the
// config yet, the answer is a new field in the config, never an
// `if (type === ...)` in the screen.
//
// The rule that keeps existing clients safe: ARTIST is the default,
// and a Clients row with no Client Type is an artist. The artist
// config describes the portal exactly as it was before types existed.
//
// Nothing in here talks to Notion or reads a secret.
// ─────────────────────────────────────────────────────────────

export type ClientTypeId = 'artist' | 'cheer-gym';

/** How a moment is drawn: the colour of its chip and left edge. A
 *  "show" is the kind of date a campaign builds to on the night, a
 *  "release" is a drop day, and everything else is a plain moment. */
export type MomentKind = 'show' | 'release' | 'moment';

export interface MomentSpec {
  /** Exactly as Notion's Moment Type select spells it. */
  type: string;
  kind: MomentKind;
  /** What the tag on its card says. Absent means the kind's own word
   *  ("Show", "Release", "Moment"), which is what an artist has. */
  label?: string;
}

export interface ClientTypeConfig {
  id: ClientTypeId;
  /** Exactly as Notion's Client Type select spells it. */
  notion: string;
  /** What we call a client of this type, lower case, mid-sentence. */
  noun: string;
  /** The Moment Types this type uses, in the order a picker lists them. */
  moments: readonly MomentSpec[];
  /** The Flows a step of this type may have, in picker order. */
  flows: readonly string[];
  labels: {
    /** The calendar chip for moments. */
    momentsLayer: string;
    /** What an empty calendar says is coming. */
    calendarEmpty: string;
    /** The noun for the main kind of moment, plural, for HQ's strip. */
    keyDates: string;
    /** The calendar's legend rows for the two coloured kinds of
     *  moment. An empty string means this type has no such kind, and
     *  the row is left out. */
    legendShow: string;
    legendRelease: string;
    /** The help line about dragging a moment. */
    dragMoment: string;
    /** What the client's Playbooks tab says a playbook is. */
    playbooksIntro: string;
  };
  /** The numbers on the client's Home, first that exist win. */
  homeMetrics: readonly string[];
  /** KPI platforms a client of this type is never sent. */
  hiddenPlatforms: readonly string[];
  /** KPI columns outside "Platform · Metric" they are never sent. */
  hiddenMetrics: readonly string[];
  features: {
    /** Songs at 10K streams, shows per month. */
    musicGoals: boolean;
    /** Ticket link, tickets sold, capacity, and the ticket trend. */
    tickets: boolean;
    /** Streams to date on a release. */
    streams: boolean;
    /** The Playbook Audit card on the Playbooks tab. */
    playbookAudit: boolean;
    /** The 15 to 25 posts band: the counter, trims, missing pieces. */
    monthCounter: boolean;
    /** The delivery tracker: photo sets and footage batches we owe. */
    deliveries: boolean;
    /** Content buckets are the client's own, and they may add one. */
    ownBuckets: boolean;
    /** The monthly report PDF and its email. Off means a month is
     *  published as numbers only. */
    reportPdf: boolean;
  };
  /** The date a client's health is watched against: the next one of
   *  these with steps still open, close in, turns the card red. */
  health: {
    /** Moment Types that count. */
    keyMoments: readonly string[];
    /** What one is called in the reason, lower case. */
    word: string;
    /** Whether a month with no published report is a problem. */
    monthlyReport: boolean;
  };
}

const ARROW = '→';

/** The two flows a gym has that an artist does not. Named here so the
 *  permission rules in portal.ts and this list cannot drift. */
export const SHOOTS_EDITS_FLOW = `Blueprint shoots + edits ${ARROW} Client posts`;
export const SHOOTS_GRADES_FLOW = `Blueprint shoots + grades ${ARROW} Client edits + posts`;

export const ARTIST: ClientTypeConfig = {
  id: 'artist',
  notion: 'Artist',
  noun: 'artist',
  moments: [
    { type: 'Release', kind: 'release' },
    { type: 'Show', kind: 'show' },
    { type: 'Festival', kind: 'moment' },
    { type: 'Holiday', kind: 'moment' },
    { type: 'Brand Moment', kind: 'moment' },
  ],
  flows: [
    'Blueprint makes + posts',
    'Blueprint task',
    'Client task',
    'Client makes + posts',
    `Client films ${ARROW} Blueprint edits + posts`,
    'Client film session',
  ],
  labels: {
    momentsLayer: 'Shows & releases',
    calendarEmpty: 'Shows, releases and content steps appear here as we plan them.',
    keyDates: 'Shows and releases',
    legendShow: 'A show',
    legendRelease: 'A release',
    dragMoment: 'Drag anything you own to another day. Drag a show or a release and '
      + 'its whole campaign follows, once you have said yes.',
    playbooksIntro: 'How we plan a release or a show, step by step: what happens, how far ahead, and whether it is yours or ours. '
      + 'Anything we have agreed to do differently for you is already in here.',
  },
  homeMetrics: ['Instagram · Followers', 'TikTok · Followers', 'Spotify · Monthly Listeners', 'Email + SMS List'],
  hiddenPlatforms: [],
  hiddenMetrics: [],
  features: {
    musicGoals: true,
    tickets: true,
    streams: true,
    playbookAudit: true,
    monthCounter: true,
    deliveries: false,
    ownBuckets: false,
    reportPdf: true,
  },
  health: { keyMoments: ['Release'], word: 'release', monthlyReport: true },
};

export const CHEER_GYM: ClientTypeConfig = {
  id: 'cheer-gym',
  notion: 'Cheer Gym',
  noun: 'gym',
  moments: [
    { type: 'Competition', kind: 'show', label: 'Competition' },
    { type: 'Showcase', kind: 'show', label: 'Showcase' },
    { type: 'Tryouts', kind: 'moment', label: 'Tryouts' },
    { type: 'Camp', kind: 'moment', label: 'Camp' },
    { type: 'Picture Day', kind: 'moment', label: 'Picture day' },
    { type: 'Banquet / Awards', kind: 'moment', label: 'Banquet / awards' },
    { type: 'Holiday', kind: 'moment' },
    { type: 'Brand Moment', kind: 'moment' },
  ],
  flows: [
    SHOOTS_EDITS_FLOW,
    SHOOTS_GRADES_FLOW,
    'Client makes + posts',
    'Client task',
    'Blueprint task',
  ],
  labels: {
    momentsLayer: 'Competitions & events',
    calendarEmpty: 'Competitions, events and content steps appear here as we plan them.',
    keyDates: 'Competitions',
    legendShow: 'A competition or showcase',
    legendRelease: '',
    dragMoment: 'Drag anything you own to another day. Drag a competition and '
      + 'its whole campaign follows, once you have said yes.',
    playbooksIntro: 'How we plan a competition or an event, step by step: what happens, how far ahead, and whether it is yours or ours. '
      + 'Anything we have agreed to do differently for you is already in here.',
  },
  homeMetrics: ['Instagram · Followers', 'TikTok · Followers', 'Facebook · Followers', 'YouTube · Subscribers'],
  hiddenPlatforms: ['Spotify', 'Apple Music', 'SoundCloud'],
  hiddenMetrics: ['Shows This Month', 'Tickets Sold'],
  features: {
    musicGoals: false,
    tickets: false,
    streams: false,
    playbookAudit: false,
    monthCounter: false,
    deliveries: true,
    ownBuckets: true,
    reportPdf: false,
  },
  health: { keyMoments: ['Competition'], word: 'competition', monthlyReport: false },
};

/** Every type there is, default first. */
export const CLIENT_TYPES: readonly ClientTypeConfig[] = [ARTIST, CHEER_GYM];

/** What Notion's Client Type select may hold. */
export const CLIENT_TYPE_NAMES: readonly string[] = CLIENT_TYPES.map((t) => t.notion);

/**
 * The config for a Client Type as Notion holds it.
 *
 * Blank, or anything this file has not heard of, is an artist. That is
 * the whole of the promise to existing clients: a row nobody has typed
 * is exactly what it was before this file existed, and a typo in the
 * select cannot turn a client into something half-built.
 */
export function clientType(notion: string | null | undefined): ClientTypeConfig {
  const name = (notion ?? '').trim().toLowerCase();
  return CLIENT_TYPES.find((t) => t.notion.toLowerCase() === name) ?? ARTIST;
}

/** The same, from the id a payload carries. */
export function clientTypeById(id: string | null | undefined): ClientTypeConfig {
  return CLIENT_TYPES.find((t) => t.id === id) ?? ARTIST;
}

export const isArtist = (t: ClientTypeConfig): boolean => t.id === ARTIST.id;

/* ── moments ──────────────────────────────────────────────────────
   A Moment Type belongs to the types that list it. The names do not
   collide where it matters ("Show" is an artist's, "Showcase" is a
   gym's), so a moment can be read by its own Moment Type without
   knowing whose calendar it is on. That is what lets HQ, which draws
   every client at once, colour a competition and a show correctly on
   the same day. */

const MOMENT_INDEX: ReadonlyMap<string, MomentSpec> = (() => {
  const m = new Map<string, MomentSpec>();
  // First type to name a Moment Type wins, so an artist's reading of
  // "Holiday" is the reading, and a later type cannot change it.
  for (const t of CLIENT_TYPES) for (const s of t.moments) if (!m.has(s.type.toLowerCase())) m.set(s.type.toLowerCase(), s);
  return m;
})();

/** What the configs say about a Moment Type, or null for one nobody
 *  lists. An exact match: "Showcase" is not "Show". */
export function momentSpec(momentType: string | null | undefined): MomentSpec | null {
  return MOMENT_INDEX.get((momentType ?? '').trim().toLowerCase()) ?? null;
}

/** A moment's own word for its tag, when its type gives it one. */
export function momentLabel(momentType: string | null | undefined): string | null {
  return momentSpec(momentType)?.label ?? null;
}

/** The Moment Types a client of this type picks from. */
export function momentTypesFor(t: ClientTypeConfig): string[] {
  return t.moments.map((m) => m.type);
}

/* ── KPI columns ──────────────────────────────────────────────── */

const SEP = ' · ';

/** May a client of this type be sent this KPI column? */
export function metricAllowed(t: ClientTypeConfig, name: string): boolean {
  if (t.hiddenMetrics.includes(name)) return false;
  const i = name.indexOf(SEP);
  return i === -1 || !t.hiddenPlatforms.includes(name.slice(0, i));
}

/* ── the payload ──────────────────────────────────────────────────
   What a client of this type is not sent. Hiding a section in the
   browser is how it looks; this is how it is: a gym's payload has no
   streams, no tickets and no music goals in it at all, so no screen
   and no future screen can draw them by accident.

   For an artist this returns its argument, the same object, untouched.
   The artist payload is not rebuilt, reordered or re-keyed. */

interface Trimmable {
  client: Record<string, unknown>;
  calendar: Array<Record<string, unknown>>;
  snapshots: Array<{ metrics: Record<string, number> } & Record<string, unknown>>;
}

export function trimForType<T extends Trimmable>(payload: T, t: ClientTypeConfig): T {
  if (isArtist(t)) return payload;
  const f = t.features;
  const client: Record<string, unknown> = { ...payload.client, type: t.id };
  if (!f.musicGoals) { client.goalSongsAt10k = null; client.goalShowsPerMonth = null; }
  const calendar = payload.calendar.map((row) => {
    const next = { ...row };
    if (!f.tickets) { next.ticketLink = null; next.ticketsSold = null; next.capacity = null; }
    if (!f.streams) next.streamsToDate = null;
    return next;
  });
  const snapshots = payload.snapshots.map((s) => ({
    ...s,
    metrics: Object.fromEntries(Object.entries(s.metrics).filter(([name]) => metricAllowed(t, name))),
    ...(f.reportPdf ? {} : { reportPdf: null }),
  }));
  return { ...payload, client, calendar, snapshots };
}
