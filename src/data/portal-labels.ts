// ─────────────────────────────────────────────────────────────
// Client portal: what a metric is CALLED and what it MEANS.
//
// Separate from portal.ts on purpose. The whitelist decides what may
// reach a client; this decides how it reads once it gets there. Copy
// changes land here, and nothing in this file can widen what ships.
//
// Notion's column names are written for us ("Instagram · Posts",
// "Avg Watch Time (sec)"). Clients read them cold, so every label is
// mapped on the way out rather than renamed in Notion, where the
// shorter name is what makes the board usable.
// ─────────────────────────────────────────────────────────────

import { metricLabel, metricPlatform, METRIC_SEPARATOR } from './portal';

/* ── display labels ───────────────────────────────────────────── */

/** "(28d)" is ours, not theirs. */
const WINDOW = /\(28d\)/gi;

/**
 * The metric half of a Notion column, in words a client would use.
 *
 * "Posts" on its own is ambiguous (posts ever? this month?), and every
 * Posts column is in fact a 28 day count, so it is spelled out.
 */
export function displayMetricLabel(name: string): string {
  let label = metricLabel(name).trim();
  if (/^posts$/i.test(label)) return 'Posts (last 28 days)';
  label = label.replace(WINDOW, '(last 28 days)');
  // The value says "6s", so the label does not need to say "(sec)".
  label = label.replace(/\s*\(sec\)/i, '');
  return label.trim();
}

/** The full name, platform included, for tooltips and tables. */
export function displayMetricName(name: string): string {
  const p = metricPlatform(name);
  return p ? `${p}${METRIC_SEPARATOR}${displayMetricLabel(name)}` : displayMetricLabel(name);
}

/* ── value formatting ─────────────────────────────────────────── */

/**
 * Is this metric a decimal that reads as a percentage?
 *
 * Word boundaries matter: "Search Share" is a percentage, "Shares" is
 * a count of how many times people sent a video to someone. A plain
 * substring test on "Share" turns 133 shares into 13,300%.
 */
export function isPercentMetric(name: string): boolean {
  return /\b(Rate|Engagement|Share)\b/.test(metricLabel(name));
}

export function isSecondsMetric(name: string): boolean {
  return /\(sec\)/i.test(name);
}

export function isHoursMetric(name: string): boolean {
  return /\bHours\b/i.test(metricLabel(name));
}

const sep = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

/** 72,900 -> "72.9K", 10,000 -> "10K". Cards only; a table always
 *  shows the real number. A trailing ".0" is noise, so it is dropped. */
export function compactNumber(v: number): string {
  const trim = (x: string) => x.replace(/\.0$/, '');
  if (Math.abs(v) >= 1_000_000) return `${trim((v / 1_000_000).toFixed(1))}M`;
  if (Math.abs(v) >= 10_000) return `${trim((v / 1000).toFixed(1))}K`;
  return sep(v);
}

/**
 * One rule set, used by cards, tables, charts and the goal tracker, so
 * the same number cannot read two different ways in two places.
 */
export function formatMetricValue(
  name: string, value: number, opts: { compact?: boolean } = {},
): string {
  if (isPercentMetric(name)) return `${(value * 100).toFixed(1)}%`;
  if (isSecondsMetric(name)) return `${Math.round(value)}s`;
  if (isHoursMetric(name)) return `${value.toFixed(1)} hrs`;
  return opts.compact ? compactNumber(value) : sep(value);
}

/* ── sections ─────────────────────────────────────────────────── */

export type SectionId = 'audience' | 'reach' | 'engagement' | 'output' | 'music' | 'owned';

export const SECTION_ORDER: SectionId[] = ['audience', 'reach', 'engagement', 'output', 'music', 'owned'];

export const SECTION_TITLE: Record<SectionId, string> = {
  audience: 'Audience',
  reach: 'Reach',
  engagement: 'Engagement',
  output: 'Output',
  music: 'Music',
  owned: 'Owned audience',
};

/** One line under each section header. Plain English, no jargon. */
export const SECTION_BLURB: Record<SectionId, string> = {
  audience: 'How many people follow you, and whether that number is growing.',
  reach: 'How many people the work actually got in front of.',
  engagement: 'What people did once they saw it.',
  output: 'How much went out in the last 28 days.',
  music: 'What is happening on the streaming side.',
  owned: 'The audience you can reach without an algorithm deciding.',
};

const MUSIC_PLATFORMS = ['Spotify', 'Apple Music', 'SoundCloud'];

/**
 * Which section a metric belongs to.
 *
 * Deliberately a rule over the label rather than a fixed list, so a new
 * "TikTok · Saves (28d)" lands somewhere sensible without a deploy. The
 * whitelist still decides whether it ships at all.
 */
export function metricSection(name: string): SectionId {
  const label = metricLabel(name).toLowerCase();
  const platform = metricPlatform(name) ?? '';

  if (platform === 'Email' || /list$/i.test(name)) {
    return 'owned';
  }
  if (MUSIC_PLATFORMS.includes(platform)) return 'music';

  if (/follower|subscriber|net follow/.test(label)) return 'audience';
  if (/post/.test(label)) return 'output';
  if (/engagement|share|watch time|avg view|average view/.test(label)) return 'engagement';
  if (/view|reach|impression/.test(label)) return 'reach';
  return 'audience';
}

/* ── definitions ──────────────────────────────────────────────── */

/**
 * The longer answer, shown in a tooltip on the info icon.
 *
 * Keyed by the metric half of the name, lowercased, so one entry covers
 * every platform's version of the same thing. Written to answer "is
 * that good?", because that is the question a client is actually
 * asking.
 */
export const METRIC_DEFINITION: Record<string, string> = {
  'followers': 'People subscribed to your account. It is the slowest number to move and the easiest to fake, so we treat it as a result rather than a target.',
  'subscribers': 'People subscribed to your channel. Same idea as followers, different platform.',
  'net follows': 'Follows minus unfollows over the last 28 days. This is the honest version of growth: a week of big reach that loses as many as it gains shows up here and nowhere else.',
  'views': 'How many times your content was played or shown in the last 28 days. The number that moves first when something is working.',
  'reach': 'How many separate people saw you, rather than how many plays you got. Views well above reach means the same people are watching repeatedly.',
  'profile views': 'People who watched something and then went to look at who you are. This is the step between a view and a follow.',
  'search share': 'How much of your reach came from people searching rather than being served you. Search traffic keeps paying out long after a post stops being pushed.',
  'engagement': 'Likes, comments, saves and shares as a share of the people who saw it. Platforms use this to decide whether to keep showing you.',
  'shares': 'How many times someone sent your post to another person. The single strongest signal that something is worth pushing, because it is a person vouching for you.',
  'avg views': 'Your typical post, not your best one. A high average matters more than one outlier.',
  'avg watch time': 'How long people watch before scrolling. Under three seconds means the opening is not holding them, whatever the rest of the video does.',
  'posts': 'How much you put out in the last 28 days. Volume on its own wins nothing, but nothing wins without it.',
  'monthly listeners': 'People who played your music at least once in the last 28 days. Spotify resets this constantly, so it falls whenever you stop releasing.',
  'active listeners': 'Listeners who came back rather than passing through once.',
  'streams': 'Plays in the last 28 days. The number labels look at.',
  'saves': 'People who added your track to their own library. A save is worth far more than a stream, because it means they intend to come back.',
  'playlist adds': 'Times your track was added to a playlist. This is what turns one good week into months of passive streams.',
  'top track streams': 'Plays on your strongest track. Where your catalogue is actually pulling from.',
  'shazams': 'People who heard your song somewhere and had to find out what it was.',
  'email + sms list': 'The only audience you own. No algorithm sits between you and these people, which makes this the most valuable number on the page.',
  'open rate': 'How many people opened the last send. Below about 20% usually means the subject line, not the list.',
  'click rate': 'How many people acted on it. This is the one that turns a list into shows sold and songs played.',
  'shows this month': 'Shows on the calendar this month.',
  'tickets sold': 'Tickets sold so far for this show.',
};

/** The definition for a metric, or null when there is nothing to add. */
export function metricDefinition(name: string): string | null {
  const key = metricLabel(name).replace(WINDOW, '').replace(/\(sec\)/i, '').trim().toLowerCase();
  if (METRIC_DEFINITION[key]) return METRIC_DEFINITION[key];
  const full = name.trim().toLowerCase();
  return METRIC_DEFINITION[full] ?? null;
}

/* ── headline roll-ups ────────────────────────────────────────── */

/** Platforms whose views add up into "Total views". */
export const VIEW_ROLLUP = [
  'Instagram · Views (28d)',
  'TikTok · Views (28d)',
  'Facebook · Views (28d)',
  'YouTube · Views (28d)',
] as const;

export const NET_FOLLOW_ROLLUP = [
  'Instagram · Net Follows (28d)',
  'TikTok · Net Follows (28d)',
  'Facebook · Net Follows (28d)',
] as const;

/** Sum of whichever of `names` the snapshot actually has, or null when
 *  it has none. Null means "no data", which renders as a hidden card
 *  rather than a confident zero. */
export function sumMetrics(metrics: Record<string, number>, names: readonly string[]): number | null {
  let total = 0;
  let found = false;
  for (const n of names) {
    const v = metrics[n];
    if (typeof v === 'number') { total += v; found = true; }
  }
  return found ? total : null;
}
