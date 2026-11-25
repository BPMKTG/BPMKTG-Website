/* ──────────────────────────────────────────────────────────────
   The Content Vault: every photo and clip a client owns, logged once.

   This file is the rules, and nothing in it talks to Drive, to the
   database, to R2 or to Notion (see src/server/vault*.ts for those).
   It is what the page and the server both read, so the two can never
   disagree about what a keeper is, or which moment a folder means.

   The words:

     root       which of a client's three places a file was found in:
                Footage Drop, Finished Content, or an Archive folder
     kind       Raw (ours to sort) or Finished (already a keeper)
     keeper     a Finished file, or a Raw one somebody starred or rated
     unsorted   a Raw file nobody has starred or rated yet
     moment     the dated thing a file belongs to: a show, a release, a
                holiday. Named by its folder, and linked to the Moment
                of that name or date in the Campaign Calendar when
                there is one. (Kept in a field called `show`, which is
                what it was first called.)
     held       put aside for a post or a campaign that is not out yet
   ────────────────────────────────────────────────────────────── */

/* ── the lists ────────────────────────────────────────────────── */

export const VAULT_TYPES = ['Photo', 'Video', 'Graphic'] as const;
export const VAULT_KINDS = ['Raw', 'Finished'] as const;
export const VAULT_ORIENTATIONS = ['Vertical', 'Horizontal', 'Square'] as const;
export const VAULT_RATINGS = ['Hero', 'Strong', 'Usable'] as const;
export const VAULT_SOURCES = [
  'Own shooter', 'Crowd', 'Other artist', 'Phone', 'Festival', 'Archive', 'Blueprint',
] as const;
export const VAULT_ROOTS = ['drop', 'finished', 'archive'] as const;

export type VaultType = typeof VAULT_TYPES[number];
export type VaultKind = typeof VAULT_KINDS[number];
export type VaultOrientation = typeof VAULT_ORIENTATIONS[number];
export type VaultRating = typeof VAULT_RATINGS[number];
export type VaultSource = typeof VAULT_SOURCES[number];
export type VaultRoot = typeof VAULT_ROOTS[number];

/** What each root is called on the page. */
export const ROOT_LABEL: Record<VaultRoot, string> = {
  drop: 'Footage Drop',
  finished: 'Finished Content',
  archive: 'Archive',
};

/** The two folders looked for directly inside a client's Drive
 *  Folder. Matched without regard to case or stray spaces. */
export const DROP_FOLDER = 'footage drop';
export const FINISHED_FOLDER = 'finished content';

const one = <T extends string>(list: readonly T[], v: unknown): T | null =>
  (typeof v === 'string' && (list as readonly string[]).includes(v) ? v as T : null);

/* ── which files are logged ───────────────────────────────────── */

export const FOLDER_MIME = 'application/vnd.google-apps.folder';
export const SHORTCUT_MIME = 'application/vnd.google-apps.shortcut';

/** An image or a video. Everything else in a folder is left alone. */
export function isVaultMedia(mime: string | null | undefined): boolean {
  const t = String(mime ?? '').toLowerCase();
  return t.startsWith('image/') || t.startsWith('video/');
}

/** Formats that are drawn rather than shot. */
const GRAPHIC_MIMES = ['image/png', 'image/gif', 'image/svg+xml'];
const GRAPHIC_FOLDER = /\b(graphics?|flyers?|artwork|posters?|logos?|cover\s*art)\b/i;

/**
 * Photo, Video or Graphic.
 *
 * A video is a video. An image is a Graphic when its format is one
 * nobody shoots in (PNG, GIF, SVG) or it sits in a folder that says
 * so; otherwise it is a Photo. It is a first answer, and one of us
 * can change it by hand.
 */
export function vaultType(mime: string | null | undefined, folders: readonly string[] = []): VaultType {
  const t = String(mime ?? '').toLowerCase();
  if (t.startsWith('video/')) return 'Video';
  if (GRAPHIC_MIMES.includes(t)) return 'Graphic';
  return folders.some((f) => GRAPHIC_FOLDER.test(f)) ? 'Graphic' : 'Photo';
}

/**
 * Which way up a picture is, from its size.
 *
 * `rotation` is Drive's count of quarter turns for a photo whose
 * camera was held on its side: the stored width and height are the
 * sensor's, so an odd count swaps them. Within three percent of
 * square is Square.
 */
export function vaultOrientation(
  width: number | null | undefined, height: number | null | undefined, rotation: number | null | undefined = 0,
): VaultOrientation | null {
  let w = Number(width);
  let h = Number(height);
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null;
  if (Math.abs(Number(rotation) || 0) % 2 === 1) [w, h] = [h, w];
  if (Math.abs(w - h) / Math.max(w, h) <= 0.03) return 'Square';
  return w > h ? 'Horizontal' : 'Vertical';
}

/* ── folders: the moment, the date, unreleased ────────────────── */

const pad = (n: number): string => String(n).padStart(2, '0');

function realDay(y: number, m: number, d: number): boolean {
  if (y < 1990 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
  const t = new Date(Date.UTC(y, m - 1, d));
  return t.getUTCMonth() === m - 1 && t.getUTCDate() === d;
}

/**
 * "2026-11-07 Revival After Dark" read as a day and a name.
 *
 * The day comes first and is a real one. What follows it, less any
 * dash or dot used to set it off, is the name; a folder that is only
 * a day has no name. Null for anything else.
 */
export function datedFolder(name: string | null | undefined): { date: string; show: string | null } | null {
  const m = /^(\d{4})[-._](\d{2})[-._](\d{2})(?!\d)\s*(.*)$/.exec(String(name ?? '').trim());
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (!realDay(y, mo, d)) return null;
  const rest = m[4].replace(/^[\s\-_.·:|,]+/, '').trim();
  return { date: `${m[1]}-${m[2]}-${m[3]}`, show: rest || null };
}

/** "2026-11" as a month folder, or null. */
export function monthFolder(name: string | null | undefined): string | null {
  const m = /^(\d{4})[-._](\d{2})$/.exec(String(name ?? '').trim());
  if (!m) return null;
  const mo = Number(m[2]);
  return Number(m[1]) >= 1990 && Number(m[1]) <= 2100 && mo >= 1 && mo <= 12 ? `${m[1]}-${m[2]}` : null;
}

/** "2026" as a year folder, or null. */
export function yearFolder(name: string | null | undefined): string | null {
  const m = /^(\d{4})$/.exec(String(name ?? '').trim());
  return m && Number(m[1]) >= 1990 && Number(m[1]) <= 2100 ? m[1] : null;
}

/** The folder unreleased IDs are kept in. */
export function isIdsFolder(name: string | null | undefined): boolean {
  return /^_ids$/i.test(String(name ?? '').trim());
}

export interface Placement {
  kind: VaultKind;
  /** Filled in for a Finished file (Blueprint) and an Archive one
   *  (Archive). A Footage Drop file's source is set by hand. */
  source: VaultSource | null;
  /** The moment's name, when the folders say it in a way we trust. */
  show: string | null;
  /** A guess from the folder a file is in, for one of us to confirm. */
  guess: string | null;
  needsShow: boolean;
  /** A day (YYYY-MM-DD), a month (YYYY-MM) or a year (YYYY), from a
   *  folder's name. */
  date: string | null;
  unreleased: boolean;
}

/**
 * What a file's folders say about it.
 *
 * `folders` is every folder name from the root down to the one the
 * file is in, the root itself left out. `rootName` is the root's own
 * name, used only as the guess for a file lying loose in an Archive.
 *
 *   Footage Drop       "YYYY-MM-DD Moment Name" gives the day and the
 *                      moment. Anything under _IDS is unreleased.
 *   Finished Content   YYYY/YYYY-MM/<moment>/... gives the month and
 *                      the moment. Older work filed as
 *                      YYYY/<moment>/... gives the year and the
 *                      moment. Deeper folders are filing.
 *   Archive            read exactly as Footage Drop is: the same
 *                      dated folders, the same _IDS.
 *
 * A file whose folders fit none of that is never left out. It keeps
 * a folder's name as a guess, and is listed for one of us to confirm.
 * The guess is the folder directly under the root (or under the year,
 * in Finished Content), not the deepest one: the deepest is "Photos"
 * or one person's name far more often than it is the show, and one
 * guess for a whole shoot is one thing to confirm instead of forty.
 */
export function placeFile(root: VaultRoot, folders: readonly string[], rootName: string | null = null): Placement {
  const names = folders.map((f) => String(f ?? '').trim()).filter(Boolean);
  const kind: VaultKind = root === 'finished' ? 'Finished' : 'Raw';
  const source: VaultSource | null = root === 'finished' ? 'Blueprint' : root === 'archive' ? 'Archive' : null;
  // Raw footage, wherever it is kept, is filed the same way.
  const unreleased = root !== 'finished' && names.some(isIdsFolder);
  const real = names.filter((n) => !isIdsFolder(n));
  const base = { kind, source, unreleased };

  // A folder named for a day, at any depth, in any root. The first
  // one from the top is the shoot; one further down is a second day
  // of the same thing.
  for (const n of real) {
    const d = datedFolder(n);
    if (!d) continue;
    if (d.show) return { ...base, show: d.show, guess: null, needsShow: false, date: d.date };
    // A day and no name: the day is kept, the show is asked for.
    const i = real.indexOf(n);
    const near = real[i + 1] ?? real[i - 1] ?? null;
    return { ...base, show: null, guess: near && !monthFolder(near) && !yearFolder(near) ? near : null, needsShow: true, date: d.date };
  }

  if (root === 'finished') {
    const at = real.findIndex((n) => monthFolder(n));
    if (at >= 0) {
      const month = monthFolder(real[at]);
      const show = real[at + 1] ?? null;
      return show
        ? { ...base, show, guess: null, needsShow: false, date: month }
        : { ...base, show: null, guess: null, needsShow: true, date: month };
    }
    // A year and no month, which is how older work is filed:
    // YYYY/<show>/... The folder under the year is the show, and the
    // year is the year. A file lying loose in a year folder has no
    // folder to name it, so it is asked about.
    const year = real.findIndex((n) => yearFolder(n));
    if (year >= 0) {
      const show = real[year + 1] ?? null;
      return show
        ? { ...base, show, guess: null, needsShow: false, date: yearFolder(real[year]) }
        : { ...base, show: null, guess: null, needsShow: true, date: yearFolder(real[year]) };
    }
  }

  // An unreleased ID with no shoot around it is not waiting on a
  // show: it is a track, and may never have been played at one.
  if (unreleased && !real.length) return { ...base, show: null, guess: null, needsShow: false, date: null };

  const top = real.find((n) => !yearFolder(n) && !monthFolder(n)) ?? null;
  const guess = top ?? (root === 'archive' ? (String(rootName ?? '').trim() || null) : null);
  return { ...base, show: null, guess, needsShow: true, date: null };
}

/** Drive writes a photo's camera time as "2026:11:07 21:14:03". */
export function exifDay(raw: string | null | undefined): string | null {
  const m = /^(\d{4})[:\-](\d{2})[:\-](\d{2})/.exec(String(raw ?? '').trim());
  if (!m || !realDay(Number(m[1]), Number(m[2]), Number(m[3]))) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

const isoDay = (raw: string | null | undefined): string | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(raw ?? ''));
  return m && realDay(Number(m[1]), Number(m[2]), Number(m[3])) ? `${m[1]}-${m[2]}-${m[3]}` : null;
};

export type DateFrom = 'folder' | 'taken' | 'file';

/**
 * A file's date, and where it came from.
 *
 * The folder's day wins. A folder that only names a month is
 * sharpened to the day the photo was taken when that day is in the
 * month. A folder that only names a year is sharpened the same way,
 * and failing that to the day Drive says the file was created (then
 * the day it was last changed), when that day is in the year. A
 * file's own date that falls outside its folder's month or year is
 * not believed over the folder: work filed under 2023 and uploaded
 * in 2026 is from 2023. With no folder
 * date it is the day the photo was taken, and failing that the
 * earliest day Drive has for the file: Drive records when a video
 * was put there, not when it was shot.
 */
export function fileDate(
  folderDate: string | null, taken: string | null | undefined, created: string | null | undefined, modified: string | null | undefined,
): { date: string | null; from: DateFrom | null } {
  const shot = exifDay(taken);
  if (folderDate) {
    if (folderDate.length < 10 && shot && shot.startsWith(folderDate)) return { date: shot, from: 'folder' };
    if (folderDate.length === 4) {
      const day = [isoDay(created), isoDay(modified)].find((d) => !!d && d.startsWith(folderDate));
      if (day) return { date: day, from: 'folder' };
    }
    return { date: folderDate, from: 'folder' };
  }
  if (shot) return { date: shot, from: 'taken' };
  const days = [isoDay(created), isoDay(modified)].filter((d): d is string => !!d).sort();
  return days.length ? { date: days[0], from: 'file' } : { date: null, from: null };
}

/* ── linking a file to a Moment ───────────────────────────────── */

/** A Moment in a client's Campaign Calendar, as much as linking needs. */
export interface VaultMoment {
  id: string;
  title: string;
  /** YYYY-MM-DD, and its last day when it runs for more than one. */
  date: string | null;
  dateEnd?: string | null;
}

/** A folder's day and a Moment's are "the same" within this many days. */
export const MOMENT_DAYS = 3;
/** A name that matches is still not believed across more than this. */
const NAME_DAYS = 31;

/** A name as it is compared: lower case, no accents, no punctuation. */
export function momentWords(name: string | null | undefined): string {
  return String(name ?? '').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ').replace(/['\u2018\u2019]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
}

/**
 * Do two names mean the same moment?
 *
 * The same words, or one held whole inside the other at a word's
 * edge: "Revival After Dark" is "Revival After Dark (Austin, TX)".
 * Or one is the other's initials: "ITDHHW" is "If The Devil Had His
 * Way". A single short word is not enough to go on, so "Revival"
 * alone is not "Rooftop Revival".
 */
export function sameMomentName(a: string | null | undefined, b: string | null | undefined): boolean {
  const x = momentWords(a);
  const y = momentWords(b);
  if (!x || !y) return false;
  if (x === y) return true;
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (isInitialsOf(short, long)) return true;
  if (short.length < 6 || !short.includes(' ')) return false;
  return ` ${long} `.includes(` ${short} `);
}

/**
 * Is one name the other's initials? A folder called "ITDHHW" is "If
 * The Devil Had His Way": it is how a long title gets typed into a
 * folder name.
 *
 * One run of three or more letters, each the first letter of the
 * title's words in order, from the first word on. Every word counts,
 * small ones too, because that is how people write them. Any words
 * the title has after those (a city in brackets) are let be.
 */
function isInitialsOf(short: string, long: string): boolean {
  if (!/^[a-z]{3,12}$/.test(short)) return false;
  const words = long.split(' ').filter(Boolean);
  if (words.length < short.length) return false;
  return words.slice(0, short.length).map((w) => w[0]).join('') === short;
}

const dayNumber = (iso: string): number => Date.UTC(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10))) / 86400000;

/** How many days a day is from a moment, which may run several. */
function daysFrom(day: string, m: VaultMoment): number | null {
  if (!m.date || m.date.length < 10) return null;
  const d = dayNumber(day);
  const start = dayNumber(m.date);
  const end = m.dateEnd && m.dateEnd.length >= 10 ? Math.max(start, dayNumber(m.dateEnd)) : start;
  return d < start ? start - d : d > end ? d - end : 0;
}

/** Is a moment's date inside what a file's date allows? A day allows
 *  a month either side, a month allows the months beside it, a year
 *  allows the year. A file with no date allows anything. */
function dateAllows(fileDate: string | null, m: VaultMoment): boolean {
  if (!fileDate || !m.date) return true;
  if (fileDate.length >= 10) { const n = daysFrom(fileDate.slice(0, 10), m); return n === null || n <= NAME_DAYS; }
  if (fileDate.length === 7) {
    const months = (iso: string): number => Number(iso.slice(0, 4)) * 12 + Number(iso.slice(5, 7));
    return Math.abs(months(fileDate) - months(m.date)) <= 1;
  }
  return m.date.startsWith(fileDate.slice(0, 4));
}

/** How many days a moment is from a file's day, for choosing between
 *  several of the same name. Unknown is far. */
function farness(fileDate: string | null, m: VaultMoment): number {
  if (!fileDate || fileDate.length < 10 || !m.date) return 1e6;
  return daysFrom(fileDate.slice(0, 10), m) ?? 1e6;
}

export interface MomentLink { id: string; title: string; by: 'name' | 'date' }

/**
 * The Moment a file belongs to, or null.
 *
 * By name first: the file's moment name against each Moment's, among
 * those whose date the file's own date allows. A night that happens
 * every month has many Moments of one name, so the nearest in date is
 * taken; two equally near, or several and no date to choose by, is
 * no link rather than a guess.
 *
 * Then by date: a day read off a folder or a camera, within a few
 * days of exactly one Moment. A day Drive made up from when a file
 * was uploaded is not used for this: an upload day near a show is a
 * coincidence.
 */
export function matchMoment(
  file: { name: string | null; date: string | null; dateFrom: string | null },
  moments: readonly VaultMoment[],
): MomentLink | null {
  if (file.name) {
    const named = moments.filter((m) => sameMomentName(file.name, m.title) && dateAllows(file.date, m));
    if (named.length === 1) return { id: named[0].id, title: named[0].title, by: 'name' };
    // Only a day can choose between two of the same name. A month
    // or a year that allows both does not say which.
    if (named.length > 1 && file.date && file.date.length >= 10) {
      const sorted = [...named].sort((a, b) => farness(file.date, a) - farness(file.date, b));
      if (farness(file.date, sorted[0]) < farness(file.date, sorted[1])) return { id: sorted[0].id, title: sorted[0].title, by: 'name' };
    }
    if (named.length) return null;
  }
  if (file.date && file.date.length >= 10 && (file.dateFrom === 'folder' || file.dateFrom === 'taken')) {
    const near = moments
      .map((m) => ({ m, n: daysFrom(file.date!.slice(0, 10), m) }))
      .filter((x): x is { m: VaultMoment; n: number } => x.n !== null && x.n <= MOMENT_DAYS)
      .sort((a, b) => a.n - b.n);
    if (near.length === 1 || (near.length > 1 && near[0].n < near[1].n)) return { id: near[0].m.id, title: near[0].m.title, by: 'date' };
  }
  return null;
}

/** One file, as linking reads it. */
export interface LinkInput {
  id: string;
  name: string | null;
  date: string | null;
  dateFrom: string | null;
  /** The name was typed by one of us, so it is matched by that name
   *  and nothing else. */
  hand?: boolean;
}

/**
 * The Moment each of a client's files belongs to.
 *
 * Each file is matched on its own first (see matchMoment). Then a
 * folder is kept whole: when the files of one name that could be
 * placed all point at the same Moment, the rest of that name go with
 * them, as long as their own dates allow it. A shoot's photos carry
 * the day they were taken and its videos often only the month, and
 * without this the photos would be filed under the Moment and the
 * videos beside them under the folder's name.
 */
export function matchMoments(rows: readonly LinkInput[], moments: readonly VaultMoment[]): Map<string, MomentLink> {
  const out = new Map<string, MomentLink>();
  if (!moments.length) return out;
  const groups = new Map<string, LinkInput[]>();
  for (const r of rows) {
    const link = matchMoment({ name: r.name, date: r.date, dateFrom: r.hand ? null : r.dateFrom }, moments);
    if (link) out.set(r.id, link);
    const key = r.hand ? '' : momentWords(r.name);
    if (!key) continue;
    const g = groups.get(key);
    if (g) g.push(r); else groups.set(key, [r]);
  }
  for (const group of groups.values()) {
    const found = group.map((r) => out.get(r.id)).filter((l): l is MomentLink => !!l);
    if (!found.length || found.length === group.length || found.some((l) => l.id !== found[0].id)) continue;
    const moment = moments.find((m) => m.id === found[0].id);
    if (!moment) continue;
    for (const r of group) {
      if (!out.has(r.id) && dateAllows(r.date, moment)) out.set(r.id, { id: moment.id, title: moment.title, by: found[0].by });
    }
  }
  return out;
}

/* ── a file, as a page is sent it ─────────────────────────────── */

/**
 * One file in the Vault, as it leaves the server.
 *
 * No Drive thumbnail address, no storage key. `t` is the version of
 * its thumbnail, which with the file's id is the address the page
 * asks our own preview route for. The fields marked "ours" are left
 * off what a client is sent.
 */
export interface VaultFile {
  id: string;
  /** The Drive file's id, for "Open original" and nothing else. */
  drive: string;
  name: string;
  type: VaultType;
  kind: VaultKind;
  root: VaultRoot;
  o: VaultOrientation | null;
  w: number | null;
  h: number | null;
  /** Seconds, for a video. */
  dur: number | null;
  size: number | null;
  show: string | null;
  /** YYYY-MM-DD, or YYYY-MM or YYYY when that is all that is known. */
  date: string | null;
  /** The folders it is filed under, joined with " / ". */
  path: string;
  un: boolean;
  missing: boolean;
  star: boolean;
  rating: VaultRating | null;
  source: VaultSource | null;
  tags: string[];
  notes: string;
  held: boolean;
  /** How many times it has been used. */
  used: number;
  t: string | null;
  added: number;
  /** Ours: what it is held for, in words. */
  holdFor?: string;
  /** The Moment in the Campaign Calendar it is linked to, if any.
   *  Only ever a moment the client can see. */
  mid?: string | null;
  /** Ours: the moment is a guess, or is not known. */
  needsShow?: boolean;
  guess?: string | null;
}

export interface VaultUse {
  file: string;
  date: string | null;
  platform: string;
  /** The post's title. A client is sent uses of posts they can see. */
  post: string;
  postId: string | null;
  how: 'post' | 'made' | 'hand';
}

/* ── keepers ──────────────────────────────────────────────────── */

type Sortable = Pick<VaultFile, 'kind' | 'star' | 'rating'>;

/** A Finished file, or a Raw one somebody starred or rated. */
export const isKeeper = (f: Sortable): boolean => f.kind === 'Finished' || f.star || !!f.rating;

/** A Raw file nobody has starred or rated. */
export const isUnsorted = (f: Sortable & { missing?: boolean }): boolean => !isKeeper(f) && !f.missing;

/* ── finding things ───────────────────────────────────────────── */

export interface VaultFilter {
  /** Words typed in the search box. Every word must be found. */
  q?: string;
  kind?: VaultKind | null;
  type?: VaultType | null;
  o?: VaultOrientation | null;
  show?: string | null;
  rating?: VaultRating | 'none' | null;
  source?: VaultSource | 'none' | null;
  tag?: string | null;
  /** 'used', or 'never' for never posted. */
  used?: 'used' | 'never' | null;
  un?: boolean | null;
  held?: boolean | null;
  /** Which shelf: keepers (the default), the unsorted tray, files
   *  waiting on a show, missing files, or everything. */
  shelf?: 'keepers' | 'unsorted' | 'needs-show' | 'missing' | 'all';
}

/** The name given to files with no moment, wherever moments are listed. */
export const NO_SHOW = 'No moment yet';

const fold = (s: string): string => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '');

/** Everything about a file that the search box looks through. */
export function searchText(f: VaultFile): string {
  return fold([
    f.name, f.show ?? '', f.guess ?? '', f.path, f.tags.join(' '), f.notes, f.type, f.kind,
    f.o ?? '', f.rating ?? '', f.source ?? '', f.date ?? '', f.un ? 'unreleased' : '',
  ].join(' \u0001 '));
}

/**
 * Does this file belong in what is being looked at?
 *
 * "Never posted" means not used and not held: a file put aside for a
 * post that is on its way is spoken for, and offering it again is how
 * the same clip ends up in two posts.
 */
export function matchesFilter(f: VaultFile, filter: VaultFilter, text: string = searchText(f)): boolean {
  const shelf = filter.shelf ?? 'keepers';
  if (shelf === 'missing') { if (!f.missing) return false; }
  else if (f.missing) return false;
  if (shelf === 'keepers' && !isKeeper(f)) return false;
  if (shelf === 'unsorted' && !isUnsorted(f)) return false;
  if (shelf === 'needs-show' && !f.needsShow) return false;

  if (filter.kind && f.kind !== filter.kind) return false;
  if (filter.type && f.type !== filter.type) return false;
  if (filter.o && f.o !== filter.o) return false;
  if (filter.show != null && filter.show !== '') {
    if (filter.show === NO_SHOW ? !!f.show : f.show !== filter.show) return false;
  }
  if (filter.rating) { if (filter.rating === 'none' ? !!f.rating : f.rating !== filter.rating) return false; }
  if (filter.source) { if (filter.source === 'none' ? !!f.source : f.source !== filter.source) return false; }
  if (filter.tag && !f.tags.some((t) => fold(t) === fold(filter.tag!))) return false;
  if (filter.used === 'used' && f.used < 1) return false;
  if (filter.used === 'never' && (f.used > 0 || f.held)) return false;
  if (filter.un != null && f.un !== filter.un) return false;
  if (filter.held != null && f.held !== filter.held) return false;

  const words = fold(filter.q ?? '').split(/\s+/).filter(Boolean);
  return words.every((w) => text.includes(w));
}

/** Newest first, then by name, so a shoot's files sit together in
 *  the order the camera numbered them. */
export function sortFiles<T extends Pick<VaultFile, 'date' | 'show' | 'name' | 'added'>>(files: readonly T[]): T[] {
  return [...files].sort((a, b) => {
    const ad = a.date ?? '';
    const bd = b.date ?? '';
    if (ad !== bd) return ad < bd ? 1 : -1;
    const as = a.show ?? '';
    const bs = b.show ?? '';
    if (as !== bs) return as.localeCompare(bs);
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
  });
}

/* ── saved views ──────────────────────────────────────────────── */

export interface VaultView {
  id: string;
  label: string;
  filter: VaultFilter;
  /** Drawn as one section per moment, each with its gaps strip. */
  byShow?: boolean;
  /** Only one of us is offered it. */
  ours?: boolean;
}

export const VAULT_VIEWS: readonly VaultView[] = [
  { id: 'keepers', label: 'Keepers', filter: { shelf: 'keepers' } },
  { id: 'unsorted', label: 'Unsorted', filter: { shelf: 'unsorted' } },
  { id: 'never', label: 'Never posted', filter: { shelf: 'keepers', used: 'never' } },
  { id: 'vertical', label: 'Vertical video', filter: { shelf: 'keepers', type: 'Video', o: 'Vertical' } },
  { id: 'hero', label: 'Hero shots', filter: { shelf: 'keepers', rating: 'Hero' } },
  { id: 'ids', label: 'Unreleased IDs', filter: { shelf: 'all', un: true } },
  { id: 'shows', label: 'By moment', filter: { shelf: 'keepers' }, byShow: true },
  { id: 'finished', label: 'Finished', filter: { shelf: 'keepers', kind: 'Finished' } },
  { id: 'needs-show', label: 'Needs a moment', filter: { shelf: 'needs-show' }, ours: true },
  { id: 'all', label: 'Everything', filter: { shelf: 'all' } },
];

export const viewById = (id: string | null | undefined): VaultView =>
  VAULT_VIEWS.find((v) => v.id === id) ?? VAULT_VIEWS[0];

/* ── gaps ─────────────────────────────────────────────────────── */

export interface ShowGaps {
  show: string;
  /** The latest date any of its files carries. */
  date: string | null;
  photos: number;
  vertical: number;
  horizontal: number;
  /** Keepers of any type, and Raw files still to be sorted. */
  keepers: number;
  unsorted: number;
}

/**
 * What each show has, counted three ways, so a show with no vertical
 * video says so with a nought.
 *
 * Counted over keepers, because a gap is about what is ready to use:
 * four hundred unsorted clips are not four hundred vertical videos.
 * The unsorted are counted beside, so a nought can be read as "none
 * yet" or "none sorted yet". Newest show first; files with no show
 * are gathered at the end.
 */
export function showGaps(files: readonly VaultFile[]): ShowGaps[] {
  const by = new Map<string, ShowGaps>();
  for (const f of files) {
    if (f.missing) continue;
    const name = f.show ?? NO_SHOW;
    let g = by.get(name);
    if (!g) { g = { show: name, date: null, photos: 0, vertical: 0, horizontal: 0, keepers: 0, unsorted: 0 }; by.set(name, g); }
    if (f.date && (!g.date || f.date > g.date)) g.date = f.date;
    if (!isKeeper(f)) { g.unsorted += 1; continue; }
    g.keepers += 1;
    if (f.type === 'Photo') g.photos += 1;
    else if (f.type === 'Video' && f.o === 'Vertical') g.vertical += 1;
    else if (f.type === 'Video' && f.o === 'Horizontal') g.horizontal += 1;
  }
  return [...by.values()].sort((a, b) => {
    if ((a.show === NO_SHOW) !== (b.show === NO_SHOW)) return a.show === NO_SHOW ? 1 : -1;
    const ad = a.date ?? '';
    const bd = b.date ?? '';
    if (ad !== bd) return ad < bd ? 1 : -1;
    return a.show.localeCompare(b.show);
  });
}

/* ── how things are said ──────────────────────────────────────── */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "Nov 7, 2026" for a day, "Nov 2026" for a month, "2026" for a year. */
export function vaultDateLabel(date: string | null | undefined): string {
  const m = /^(\d{4})(?:-(\d{2})(?:-(\d{2}))?)?$/.exec(String(date ?? ''));
  if (!m) return '';
  if (!m[2]) return m[1];
  const month = MONTHS[Number(m[2]) - 1] ?? '';
  return m[3] ? `${month} ${Number(m[3])}, ${m[1]}` : `${month} ${m[1]}`;
}

/** "0:44", "12:05", "1:02:10". */
export function durationLabel(seconds: number | null | undefined): string {
  const s = Math.round(Number(seconds));
  if (!Number.isFinite(s) || s <= 0) return '';
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}

export function sizeLabel(bytes: number | null | undefined): string {
  const b = Number(bytes);
  if (!Number.isFinite(b) || b <= 0) return '';
  if (b < 1024 * 1024) return `${Math.max(1, Math.round(b / 1024))} KB`;
  if (b < 1024 * 1024 * 1024) return `${(b / 1024 / 1024).toFixed(b < 10 * 1024 * 1024 ? 1 : 0)} MB`;
  return `${(b / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

/* ── playing a video ──────────────────────────────────────────── */

/** The most footage we will convert because somebody tapped Play.
 *  Past this a file shows its poster and "Open original". */
export const MAX_PLAY_SECONDS = 5 * 60;

export type Playable = 'yes' | 'too_long' | 'unknown';

/** May this video be converted on demand? A length Drive has not
 *  read yet is not a yes: it could be an hour. */
export function canPlay(seconds: number | null | undefined): Playable {
  const s = Number(seconds);
  if (seconds == null || !Number.isFinite(s) || s <= 0) return 'unknown';
  return s <= MAX_PLAY_SECONDS ? 'yes' : 'too_long';
}

/* ── edits: who may change what ───────────────────────────────── */

export const MAX_TAGS = 30;
export const MAX_TAG_CHARS = 40;
export const MAX_NOTES = 2000;
export const MAX_SHOW_CHARS = 120;
/** How many files one request may change. The page sends more in
 *  several requests. */
export const MAX_EDIT_IDS = 500;
/** How many files may go into one post. A carousel holds twenty. */
export const MAX_USE_IDS = 20;

/** One tag, tidied: trimmed, single-spaced, no comma, not too long.
 *  Null when nothing is left. */
export function cleanTag(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.replace(/[,\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^#+/, '').slice(0, MAX_TAG_CHARS).trim();
  return t || null;
}

/** A list of tags with no two the same, whatever their capitals. */
export function cleanTags(raw: unknown): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const v of Array.isArray(raw) ? raw : []) {
    const t = cleanTag(v);
    if (!t || seen.has(t.toLowerCase())) continue;
    seen.add(t.toLowerCase());
    out.push(t);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

/** Tags after some are added and some taken away. */
export function mergeTags(current: readonly string[], add: readonly string[], remove: readonly string[]): string[] {
  const gone = new Set(remove.map((t) => t.toLowerCase()));
  return cleanTags([...current.filter((t) => !gone.has(t.toLowerCase())), ...add.filter((t) => !gone.has(t.toLowerCase()))]);
}

const ID32 = /^[0-9a-f]{32}$/;
export const isVaultId = (v: unknown): v is string => typeof v === 'string' && ID32.test(v);

/** A Notion page id, dashed or not, as 32 hex. Null for anything else. */
export function notionHex(v: unknown): string | null {
  const s = typeof v === 'string' ? v.replace(/-/g, '').toLowerCase() : '';
  return ID32.test(s) ? s : null;
}

export interface VaultEdit {
  star?: boolean;
  tagsAdd?: string[];
  tagsRemove?: string[];
  notes?: string;
  rating?: VaultRating | null;
  source?: VaultSource | null;
  type?: VaultType;
  /** A show's name, or null for "no show, and stop asking". */
  show?: string | null;
  /** Take each file's guess as its show. */
  confirmShow?: true;
  /** What to hold the files for, or null to let them go. Only the id
   *  comes from the request; the server looks up what it is. */
  hold?: { kind: 'item' | 'campaign'; id: string } | null;
  /** Mark as used by hand, or take that mark off. */
  used?: boolean;
  /** The post these files were cut into, or cut out of. */
  madeFrom?: { id: string; on: boolean };
}

/** What a client may change. Everything else is ours. */
export const CLIENT_VAULT_EDITS: readonly (keyof VaultEdit)[] = ['star', 'tagsAdd', 'tagsRemove', 'notes'];
export const ADMIN_VAULT_EDITS: readonly (keyof VaultEdit)[] = [
  ...CLIENT_VAULT_EDITS, 'rating', 'source', 'type', 'show', 'confirmShow', 'hold', 'used', 'madeFrom',
];

/**
 * An edit as the request sent it, cut down to what this person may
 * change and to values that are what they should be.
 *
 * The role comes from the signed session. A field that is not this
 * role's, or does not hold what it should, is left out and named in
 * `rejected`; nothing in `edit` is as the request typed it.
 */
export function cleanVaultEdit(body: Record<string, unknown>, role: 'client' | 'admin'): { edit: VaultEdit; rejected: string[] } {
  const may = role === 'admin' ? ADMIN_VAULT_EDITS : CLIENT_VAULT_EDITS;
  const edit: VaultEdit = {};
  const rejected: string[] = [];
  const known: readonly string[] = ADMIN_VAULT_EDITS;

  for (const key of Object.keys(body)) {
    if (key === 'ids') continue;
    if (!known.includes(key)) { rejected.push(key); continue; }
    if (!(may as readonly string[]).includes(key)) { rejected.push(key); continue; }
    const v = body[key];
    switch (key as keyof VaultEdit) {
      case 'star':
      case 'used':
        if (typeof v === 'boolean') edit[key as 'star' | 'used'] = v; else rejected.push(key);
        break;
      case 'tagsAdd':
      case 'tagsRemove': {
        const tags = cleanTags(v);
        if (Array.isArray(v) && tags.length) edit[key as 'tagsAdd' | 'tagsRemove'] = tags; else rejected.push(key);
        break;
      }
      case 'notes':
        if (typeof v === 'string') edit.notes = v.replace(/\r\n?/g, '\n').trim().slice(0, MAX_NOTES); else rejected.push(key);
        break;
      case 'rating':
        if (v === null) edit.rating = null;
        else if (one(VAULT_RATINGS, v)) edit.rating = one(VAULT_RATINGS, v);
        else rejected.push(key);
        break;
      case 'source':
        if (v === null) edit.source = null;
        else if (one(VAULT_SOURCES, v)) edit.source = one(VAULT_SOURCES, v);
        else rejected.push(key);
        break;
      case 'type':
        if (one(VAULT_TYPES, v)) edit.type = one(VAULT_TYPES, v)!; else rejected.push(key);
        break;
      case 'show':
        if (v === null) edit.show = null;
        else if (typeof v === 'string' && v.replace(/\s+/g, ' ').trim()) edit.show = v.replace(/\s+/g, ' ').trim().slice(0, MAX_SHOW_CHARS);
        else rejected.push(key);
        break;
      case 'confirmShow':
        if (v === true) edit.confirmShow = true; else rejected.push(key);
        break;
      case 'hold': {
        if (v === null) { edit.hold = null; break; }
        const h = v as { kind?: unknown; id?: unknown } | undefined;
        const id = notionHex(h?.id);
        if (h && typeof h === 'object' && (h.kind === 'item' || h.kind === 'campaign') && id) edit.hold = { kind: h.kind, id };
        else rejected.push(key);
        break;
      }
      case 'madeFrom': {
        const m = v as { id?: unknown; on?: unknown } | undefined;
        const id = notionHex(m?.id);
        if (m && typeof m === 'object' && id && typeof m.on === 'boolean') edit.madeFrom = { id, on: m.on };
        else rejected.push(key);
        break;
      }
    }
  }
  // A show typed and a guess confirmed are two answers to one
  // question. The typed one is the one that was meant.
  if (edit.show !== undefined && edit.confirmShow) delete edit.confirmShow;
  return { edit, rejected };
}

/** The ids of a request: each a Vault id, no two the same, in the
 *  order given, and no more than `max`. Null when there are none or
 *  any is not an id. */
export function cleanIds(raw: unknown, max: number = MAX_EDIT_IDS): string[] | null {
  if (!Array.isArray(raw) || !raw.length || raw.length > max) return null;
  const out: string[] = [];
  for (const v of raw) {
    if (!isVaultId(v)) return null;
    if (!out.includes(v)) out.push(v);
  }
  return out;
}

/* ── use in a post ────────────────────────────────────────────── */

/** What a new Idea made from Vault files is called until somebody
 *  names it. */
export function useTitle(files: ReadonlyArray<Pick<VaultFile, 'name' | 'show'>>): string {
  if (!files.length) return 'From the Vault';
  const show = files.find((f) => f.show)?.show ?? null;
  if (files.length === 1) {
    const plain = files[0].name.replace(/\.[A-Za-z0-9]{2,5}$/, '');
    return (show ? `${show}: ${plain}` : plain).slice(0, 200);
  }
  return `${show ?? 'From the Vault'}: ${files.length} slides`.slice(0, 200);
}

/** What kind of post a pick of files makes: the Content Pipeline's
 *  own Media and Source words. */
export function useMedia(files: ReadonlyArray<Pick<VaultFile, 'type'>>): { media: string; source: string } {
  if (files.length > 1) return { media: 'Carousel', source: 'Show Media' };
  const type = files[0]?.type ?? 'Photo';
  return { media: type, source: type === 'Graphic' ? 'Flyer / Graphic' : 'Show Media' };
}

/* ── notifications ────────────────────────────────────────────── */

/** "12 new files", "1 new file". */
export const newFilesLabel = (n: number): string => `${n} new ${n === 1 ? 'file' : 'files'}`;

/* ── addresses ────────────────────────────────────────────────── */

/** Where a client's Vault is. The same address for a client and for
 *  one of us standing in their portal; HQ has its own, below. */
export const vaultUrl = (slug: string, moment?: string | null): string =>
  `/portal/${slug}#/vault${moment ? `/moment/${encodeURIComponent(moment)}` : ''}`;
export const hqVaultUrl = (slug?: string | null): string => `/portal/hq#/vault${slug ? `/${slug}` : ''}`;

/** A thumbnail not made yet is asked for here, and made by the asking. */
export const thumbUrl = (slug: string, id: string): string => `/portal/${slug}/vault/thumb/${id}`;

/* ── a sync, as a page is told about it ───────────────────────── */

export type SourceState = 'ok' | 'not_shared' | 'not_found' | 'not_set' | 'error';

export interface VaultSourceStatus {
  root: VaultRoot;
  /** The folder's name in Drive, when we could read it. */
  name: string | null;
  /** The link, for one of us, to open the folder and share it. */
  link: string | null;
  state: SourceState;
  files: number;
}

export interface VaultSyncStatus {
  /** Nothing has ever been synced. */
  never: boolean;
  running: boolean;
  /** Part way, and silent: it was cut off. Told as failed. */
  stalled: boolean;
  phase: 'listing' | 'thumbnails' | 'linking' | 'done' | 'failed' | null;
  startedAt: number | null;
  finishedAt: number | null;
  /** The last sync that ran to the end. */
  okAt: number | null;
  listed: number;
  added: number;
  missing: number;
  thumbs: number;
  thumbsLeft: number;
  /** Files linked to a Moment in the Campaign Calendar. */
  linked: number;
  error: string | null;
  /** When the last sync that did not finish stopped, if the last one
   *  did not finish. */
  failedAt: number | null;
  sources: VaultSourceStatus[];
  /** The address to share a folder with. Ours only. */
  email?: string | null;
}

/** "Syncing… 1,200 of 2,531 thumbnails", from a sync's own record. */
export function syncLineFor(s: Partial<VaultSyncStatus>): string {
  const n = (v: number | null | undefined): string => (Number(v) || 0).toLocaleString('en-US');
  if (s.phase === 'listing') return `Syncing… reading Drive, ${n(s.listed)} ${s.listed === 1 ? 'file' : 'files'} so far`;
  if (s.phase === 'thumbnails') return `Syncing… ${n(s.thumbs)} of ${n((s.thumbs ?? 0) + (s.thumbsLeft ?? 0))} thumbnails`;
  if (s.phase === 'linking') return 'Syncing… linking files to moments';
  return 'Syncing…';
}

/** How long a sync may go without a sign of life before it is taken
 *  to have died and may be picked up by the next caller. A sync says
 *  it is alive every few seconds, so this is several of those. */
export const SYNC_QUIET_MS = 30 * 1000;
/** A sync on opening HQ is skipped when one finished this recently. */
export const SYNC_FRESH_MS = 30 * 60 * 1000;
