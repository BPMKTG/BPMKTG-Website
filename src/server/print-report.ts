/* ──────────────────────────────────────────────────────────────
   The Monthly Report, six pages of it.

   SERVER ONLY. Takes a ReportInput and returns a string. No Notion,
   no secrets, no arithmetic: every number arrives already decided by
   src/data/print.ts, and every piece of text goes out through `esc`.

   The page order is the canvas's:

     1  Cover
     2  The month at a glance
     3  90-day goals + what we shipped
     4  Platform by platform
     5  Shows + releases      (dropped when there is neither)
     6  Next month

   Page five is the only one that can be absent, so the footers count
   what was actually built rather than assuming six.
   ────────────────────────────────────────────────────────────── */

import {
  bySource,
  byBucket,
  clientTodos,
  dayLabel,
  filmList,
  focusCards,
  glanceTiles,
  goalCards,
  int,
  monthLabel,
  monthRange,
  nextMonthMoments,
  platformTable,
  postLine,
  releaseBlock,
  reportingPeriod,
  showBars,
  showStats,
  stepProgress,
  topPosts,
  type GoalCard,
  type ReportInput,
  type ReportPost,
  type Tally,
  type Tile,
} from '../data/print';
import { T } from './print-css';
import {
  bar,
  bodyPage,
  deltaHtml,
  esc,
  footer,
  join,
  sectionHead,
  shell,
  type PageCtx,
} from './print-html';

const DOC = 'Monthly Report';
/** A baseline is the starting line, not a month's results. It prints
 *  under its own name so a client reading the footer is not told they
 *  are holding October's report. */
const BASELINE_DOC = 'Baseline Report';

const docName = (input: ReportInput): string =>
  input.snapshot.type === 'Baseline' ? BASELINE_DOC : DOC;

export function reportTitle(input: ReportInput): string {
  return `${input.client.artist} · ${docName(input)} · ${monthLabel(input.snapshot.date)}`;
}

export function renderReport(input: ReportInput): string {
  const month = monthLabel(input.snapshot.date);
  const doc = docName(input);
  const ctx: PageCtx = {
    doc,
    who: `${input.client.artist} · ${month}`,
    sample: !input.snapshot.published,
  };

  const bars = showBars(input.calendar, monthRange(input.snapshot.date)?.end ?? null);
  const release = releaseBlock(input);
  const wantsShows = bars.length > 0 || release !== null;

  // Built as closures so the page count is known before any footer is
  // written. A footer reading "05 / 06" on a five-page report is the
  // kind of mistake a client notices and we never would.
  const builders: Array<(n: number, of: number) => string> = [
    () => cover(input, month, doc),
    (n, of) => bodyPage(ctx, n, of, glance(input)),
    (n, of) => bodyPage(ctx, n, of, goalsAndShipped(input)),
    (n, of) => bodyPage(ctx, n, of, platforms(input, month)),
  ];
  if (wantsShows) builders.push((n, of) => bodyPage(ctx, n, of, shows(input, bars, release)));
  builders.push((n, of) => bodyPage(ctx, n, of, next(input)));

  const of = builders.length;
  const pages = builders.map((build, i) => build(i + 1, of));

  // The cover carries no header and its own footer, so it is given one
  // here rather than inside `cover`, which does not know the count.
  pages[0] = pages[0].replace('<!--cover-footer-->', footer(ctx, 1, of));

  return shell(reportTitle(input), pages);
}

/* ── 1 · cover ────────────────────────────────────────────────── */

function cover(input: ReportInput, month: string, doc: string): string {
  const { client } = input;
  const term = join([
    client.tier && esc(client.tier),
    input.termMonth && ` &#160;·&#160; Month ${input.termMonth.month} of ${input.termMonth.total}`,
  ]);
  const period = reportingPeriod(input.snapshot.date);

  // The grid band is the fallback the canvas calls for. The photo sits
  // in the rounded frame on top of it, so a cover with no photo is a
  // deliberate-looking cover rather than a gap.
  const hero = input.heroImage
    ? `<div class="cv__hero"><img src="${esc(input.heroImage)}" alt=""></div>`
    : '';

  return `<div class="pg">
<div class="grid" style="position:absolute;left:0;top:0;width:816px;height:620px"></div>
${hero}
<div class="cv__hd">
  <img class="cv__logo" src="/brand/logo-header-navy.svg" alt="Blueprint Marketing">
  <div class="cv__doc">Client report</div>
</div>
<div style="position:absolute;left:64px;right:64px;top:664px" class="stack g14">
  <div class="cv__kick">${esc(doc)} · ${esc(month)}</div>
  <h1 class="cv__title">${esc(client.artist)}</h1>
  <div class="cv__bar"></div>
  <div class="cv__sub">${term}${period ? `<br>Reporting period ${esc(period)}` : ''}</div>
</div>
<div class="cv__ft">
  <div class="note">Prepared by Mason Celum<br>Blueprint Marketing · mason@bpmktg.com</div>
  <div class="note--sm">Confidential · for ${esc(client.artist)}</div>
</div>
<!--cover-footer-->
</div>`;
}

/* ── 2 · the month at a glance ────────────────────────────────── */

function glance(input: ReportInput): string {
  const s = input.snapshot;
  const tiles = glanceTiles(input);

  // The Win line is the page's headline. It is the one sentence in the
  // snapshot written to be read first, so it is set large at the top
  // rather than tucked into a card at the bottom. That is also why
  // there is no "Biggest win" column below: printing it twice would
  // spend the strongest line on the page on a repeat.
  const headline = s.win;

  const tops: Array<{ k: string; h: string; b: string }> = [];
  if (s.watch) tops.push({ k: 'orange', h: 'Watch', b: s.watch });
  const focus1 = focusCards(s)[0];
  if (focus1) {
    tops.push({
      k: 'blue',
      h: "Next month's focus",
      b: focus1.why ? `${focus1.title}. ${focus1.why}` : focus1.title,
    });
  }

  return `<div class="stack g28">
${sectionHead('01 · The month at a glance', null)}
${headline ? `<h1 class="h1">${esc(headline)}</h1>` : ''}
${fromMason(input)}
${tiles.length ? `<div class="c2 g16">${tiles.map(tile).join('')}</div>` : ''}
${tops.length ? `<div class="${tops.length === 3 ? 'c3' : 'c2'} g16">${tops.map(top).join('')}</div>` : ''}
</div>`;
}

function fromMason(input: ReportInput): string {
  const said = input.snapshot.summary;
  if (!said) return '';
  return `<div class="card--tint stack g12">
  <div style="display:flex;align-items:center;gap:12px">
    <div class="ava">M</div>
    <div><div class="band__h" style="font-size:15px">From Mason</div>
    <div class="note--sm">Your strategist</div></div>
  </div>
  <p class="said">${esc(said)}</p>
</div>`;
}

function tile(t: Tile): string {
  const foot = join([
    deltaHtml(t.delta, t.deltaLabel),
    t.baseline && `<span class="flat">${esc(t.baseline)}</span>`,
  ]);
  return `<div class="card stack g6">
  <div class="kicker">${esc(t.label)}</div>
  <div class="big">${esc(t.value)}</div>
  ${foot ? `<div style="display:flex;gap:14px;font-size:13px">${foot}</div>` : ''}
</div>`;
}

function top(t: { k: string; h: string; b: string }): string {
  return `<div class="tt tt--${esc(t.k)}">`
    + `<div class="tt__h">${esc(t.h)}</div>`
    + `<div class="tt__b">${esc(t.b)}</div></div>`;
}

/* ── 3 · goals and what we shipped ────────────────────────────── */

function goalsAndShipped(input: ReportInput): string {
  const goals = goalCards(input);
  const range = monthRange(input.snapshot.date);
  const inMonth = input.posts.filter((p) => p.postDate && range
    && p.postDate.slice(0, 10) >= range.start && p.postDate.slice(0, 10) <= range.end);
  const buckets = byBucket(inMonth);
  const sources = bySource(inMonth);
  const steps = stepProgress(input.calendar, range);
  const best = topPosts(inMonth, 5);

  const shipped = buckets.length || sources.length || steps.total;

  return `<div class="stack g26">
${goals.length || input.client.goals ? `<div class="stack g8">
  <div class="eyebrow">02 · 90-day goals</div>
  ${input.client.goals ? `<p class="quote">“${esc(input.client.goals)}”</p>` : ''}
</div>` : ''}
${goals.length ? `<div class="c2 g14">${goals.map(goalCard).join('')}</div>` : ''}
${shipped ? `<div class="rule"></div>
<div class="eyebrow">03 · What we shipped</div>
<div class="c2 g28">
  ${bucketColumn(buckets, inMonth.length)}
  ${mixColumn(sources, inMonth.length, steps)}
</div>` : ''}
${best.length ? `<div class="band__h" style="font-size:14px">Top posts</div>
<div class="c${Math.min(5, best.length)} g12">${best.map(postCard).join('')}</div>` : ''}
</div>`;
}

function goalCard(g: GoalCard): string {
  return `<div class="card--sm stack g8" style="border:1px solid ${T.rule}">
  <div class="row" style="align-items:baseline">
    <span class="strong" style="font-size:14px">${esc(g.label)}</span>
    <span style="font-size:14px;color:${T.ink2}">
      <b style="font-size:20px;color:${T.navyDeep}">${esc(g.value)}</b>${g.of ? ` ${esc(g.of)}` : ''}
    </span>
  </div>
  ${bar(g.progress.fraction, g.accent)}
  ${g.note ? `<div class="note">${esc(g.note)}</div>` : ''}
</div>`;
}

function bucketColumn(buckets: Tally[], total: number): string {
  if (!buckets.length) return '<div></div>';
  const max = buckets[0].count;
  return `<div class="stack g10">
  <div class="row" style="align-items:baseline">
    <span class="strong" style="font-size:14px">${esc(int(total))} posts by bucket</span>
  </div>
  <div class="stack g6" style="font-size:13px">
    ${buckets.slice(0, 7).map((b) => `<div class="brow">
      <span>${esc(b.label)}</span>
      <div class="brow__bar" style="width:${Math.round((b.count / max) * 100)}%"></div>
      <span class="brow__n">${esc(String(b.count))}</span>
    </div>`).join('')}
  </div>
</div>`;
}

const MIX_COLOURS = [T.navy, T.blue, T.orange, T.light, T.navyDeep];

function mixColumn(sources: Tally[], total: number, steps: { done: number; total: number }): string {
  const mix = sources.length && total
    ? `<div class="mix">${sources.map((s, i) =>
        `<div style="width:${(s.count / total) * 100}%;background:${MIX_COLOURS[i % MIX_COLOURS.length]}"></div>`,
      ).join('')}</div>
    <div class="stack g6">${sources.map((s, i) =>
      `<div class="legend"><span class="swatch" style="background:${MIX_COLOURS[i % MIX_COLOURS.length]}"></span>${esc(s.label)} · ${esc(String(s.count))}</div>`,
    ).join('')}</div>`
    : '';

  const stepLine = steps.total
    ? `<div class="card--tint-sm" style="border-radius:12px;padding:12px 14px;font-size:13px;color:${T.ink}">
        <b>${esc(int(steps.done))} of ${esc(int(steps.total))}</b> campaign steps done this month
      </div>`
    : '';

  if (!mix && !stepLine) return '<div></div>';
  return `<div class="stack g12">
  ${mix ? `<div class="strong" style="font-size:14px">Content mix</div>${mix}` : ''}
  ${stepLine}
</div>`;
}

function postCard(p: ReportPost): string {
  const where = p.platforms[0] ?? p.bucket ?? 'Post';
  return `<div class="thumb">
  <div class="thumb__top" style="height:26px">${esc(where)}</div>
  <div class="thumb__body">
    <div class="thumb__t">${esc(p.title)}</div>
    <div class="note--sm" style="line-height:1.4">${esc(postLine(p))}</div>
  </div>
</div>`;
}

/* ── 4 · platform by platform ─────────────────────────────────── */

function platforms(input: ReportInput, month: string): string {
  const groups = platformTable(
    input.snapshot.metrics,
    input.previous?.metrics ?? null,
    input.baseline?.metrics ?? null,
  );
  if (!groups.length) {
    return `<div class="stack g18">${sectionHead('04 · Platform by platform', 'The full numbers')}
    <div class="note">This month's platform numbers are not in yet.</div></div>`;
  }

  const first = monthShortOf(month);
  const body = groups.map((g) => {
    const head = `<tr class="grp"><td colspan="5">${esc(g.name)}</td></tr>`;
    const rows = g.rows.map((r) => `<tr>
      <td>${esc(r.label)}</td><td>${esc(r.now)}</td><td>${esc(r.last)}</td>
      <td>${esc(r.base)}</td><td>${deltaHtml(r.change) || '—'}</td>
    </tr>`).join('');
    return head + rows;
  }).join('');

  return `<div class="stack g18">
<div class="row row--end">
  ${sectionHead('04 · Platform by platform', 'The full numbers')}
  <div class="note--sm" style="text-align:right">28-day windows from each platform's analytics<br>
  Change is against last month${input.previous ? '' : ', which the baseline month does not have'}</div>
</div>
<table class="t-num">
  <thead><tr><th>Metric</th><th>${esc(first)}</th><th>Last month</th><th>Baseline</th><th>Change</th></tr></thead>
  <tbody>${body}</tbody>
</table>
</div>`;
}

/** "November 2026" -> "November", for the column head. */
function monthShortOf(month: string): string {
  return month.split(' ')[0] || month;
}

/* ── 5 · shows and releases ───────────────────────────────────── */

function shows(
  input: ReportInput,
  bars: ReturnType<typeof showBars>,
  release: ReturnType<typeof releaseBlock>,
): string {
  const stats = showStats(bars);
  // Two bars is the canvas. More than five on one axis stops being a
  // chart and starts being a fence, so only the most recent five are
  // drawn; the averages above still count every show.
  const drawn = bars.slice(-5);

  const chart = drawn.length ? `<div class="c2 g28" style="grid-template-columns:300px minmax(0,1fr);align-items:end">
  <div style="display:flex;align-items:flex-end;gap:36px;height:240px;border-bottom:1px solid ${T.ruleStrong};padding:0 20px">
    ${drawn.map((b, i) => `<div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1">
      <div style="font-size:13px;font-weight:700;color:${T.navyDeep}">${esc(int(b.sold))}</div>
      <div style="width:100%;height:${Math.max(8, Math.round(b.height * 200))}px;background:${i === drawn.length - 1 ? T.navy : T.light};border-radius:8px 8px 0 0"></div>
    </div>`).join('')}
  </div>
  ${stats.length ? `<div class="c2 g12">${stats.map(showStat).join('')}</div>` : '<div></div>'}
</div>
<div style="display:flex;gap:36px;padding-left:20px;margin-top:-16px;font-size:12px;color:${T.ink2};width:300px;box-sizing:border-box">
  ${drawn.map((b) => `<div style="flex:1;text-align:center">${esc(b.title)}<br>${esc(dayLabel(b.date))}${
    b.soldOut ? '<br>sold out' : b.capacity ? `<br>${Math.round((b.sold / b.capacity) * 100)}% sold` : ''
  }</div>`).join('')}
</div>` : '';

  return `<div class="stack g26">
${drawn.length ? `${sectionHead('05 · Shows', 'Tickets, show over show')}${chart}` : ''}
${drawn.length && release ? '<div class="rule"></div>' : ''}
${release ? releaseHtml(release) : ''}
</div>`;
}

function showStat(s: { label: string; value: string; note: string | null; tone: string }): string {
  return `<div class="card--tint-sm" style="border-radius:14px;padding:14px 16px">
  <div class="kicker">${esc(s.label)}</div>
  <div class="mid">${esc(s.value)}</div>
  ${s.note ? `<div style="font-size:13px;color:${s.tone === 'good' ? T.up : T.ink2};font-weight:${s.tone === 'good' ? 500 : 400}">${esc(s.note)}</div>` : ''}
</div>`;
}

function releaseHtml(r: NonNullable<ReturnType<typeof releaseBlock>>): string {
  const sub = join([
    r.where && esc(r.where),
    r.playbook && `${r.where ? ' · ' : ''}${esc(r.playbook)} playbook`,
  ]);
  return `<div class="stack g8">
  <div class="eyebrow">06 · Releases</div>
  <h2 class="h2">${esc(r.title)}${r.date ? ` · dropped ${esc(dayLabel(r.date))}` : ''}</h2>
  ${sub ? `<div class="note">${sub}</div>` : ''}
</div>
${r.stats.length ? `<div class="c${Math.min(4, r.stats.length)} g12">${r.stats.map((s) =>
  `<div class="card--sm"><div class="kicker">${esc(s.label)}</div><div class="mid">${esc(s.value)}</div></div>`,
).join('')}</div>` : ''}
${r.worked || r.next ? `<div class="c2 g14">
  ${r.worked ? `<div class="card--tint-sm stack g6">
    <div class="band__h" style="font-size:14px">What worked</div>
    <div class="tt__b">${esc(r.worked)}</div></div>` : '<div></div>'}
  ${r.next ? `<div class="card--warm stack g6">
    <div class="strong" style="font-size:14px;color:${T.orangeInk}">Up next · ${esc(r.next.title)}</div>
    <div class="tt__b">${r.next.date ? `Out ${esc(dayLabel(r.next.date))}` : 'Date to lock'}</div></div>` : ''}
</div>` : ''}`;
}

/* ── 6 · next month ───────────────────────────────────────────── */

function next(input: ReportInput): string {
  const focus = focusCards(input.snapshot);
  const moments = nextMonthMoments(input);
  const films = filmList(input, input.posts);
  const todos = clientTodos(input);
  const label = monthLabel(shiftOne(input.snapshot.date));

  return `<div class="stack g26">
${sectionHead(`07 · ${monthShortOf(label)}`, "What's next", 'h2')}
${focus.length ? `<div class="c${Math.min(3, focus.length)} g14">${focus.map((f) => `<div class="card--navy stack g8">
  <div style="font-family:Orbitron,sans-serif;font-size:22px;font-weight:700;color:${T.light}">${f.n}</div>
  <div class="strong" style="font-size:15px">${esc(f.title)}</div>
  ${f.why ? `<div style="font-size:13px;line-height:1.5;color:${T.tint2}">${esc(f.why)}</div>` : ''}
</div>`).join('')}</div>` : ''}
${moments.length || films.length || todos.length ? `<div class="c2 g28">
  ${moments.length ? `<div class="stack g10">
    <div class="band__h" style="font-size:15px">On the calendar</div>
    ${moments.slice(0, 6).map((m) => `<div class="when">
      <div class="when__chip${m.accent === 'orange' ? ' when__chip--orange' : ''}">
        <div class="when__m">${esc(m.month)}</div><div class="when__d">${esc(m.day)}</div>
      </div>
      <div><div class="when__t">${esc(m.title)}</div>
      ${m.note ? `<div class="note--sm">${esc(m.note)}</div>` : ''}</div>
    </div>`).join('')}
  </div>` : '<div></div>'}
  ${films.length || todos.length ? `<div class="stack g10">
    ${films.length ? `<div class="band__h" style="font-size:15px">Your film list</div>
      ${films.slice(0, 5).map((f) => `<div class="ck ck--light"><span class="box"></span><span>${esc(f.text)}</span></div>`).join('')}` : ''}
    ${todos.length ? `<div class="band__h" style="font-size:15px;margin-top:10px">What we need from you</div>
      ${todos.slice(0, 5).map((t) => `<div class="ck ck--light"><span class="box box--orange"></span><span>${esc(t.text)}</span></div>`).join('')}` : ''}
  </div>` : ''}
</div>` : ''}
<div class="band" style="margin-top:8px">
  <div class="stack g4">
    <div class="band__h">Questions about this report?</div>
    <div class="band__b">Bring them to our next weekly check-in, or open your portal anytime.</div>
  </div>
  <div class="band__r">blueprint-marketing.com/portal/${esc(input.slug)}<br>mason@bpmktg.com</div>
</div>
</div>`;
}

function shiftOne(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  d.setUTCMonth(d.getUTCMonth() + 1, 1);
  return d.toISOString().slice(0, 10);
}
