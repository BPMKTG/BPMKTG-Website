/* ──────────────────────────────────────────────────────────────
   The Growth Audit, eight pages of it.

   SERVER ONLY. Same contract as print-report.ts: a model in, a string
   out, every value escaped, no arithmetic and no Notion.

     1  Cover + growth score
     2  The short version + snapshot: music and business
     3  Snapshot: social + profile and positioning
     4  Content: what's working, what's not, the pattern
     5  Audience + show and release momentum
     6  Footage and assets + the growth scorecard
     7  Top opportunities + recommended direction
     8  Next 30 days + for our call + the closing band

   A missing H2 in the Notion page body skips its block and nothing
   else: the page it was on still prints, and the page count stays at
   eight so a client and a prospect get the same document shape.

   The one place the two audiences differ is the closing band on page
   eight, which is the offer and a "Book a call" button for a prospect
   and the portal for a client. That is also the only place the word
   "portal" appears, which is what keeps a prospect teardown free of
   references to something they do not have.
   ────────────────────────────────────────────────────────────── */

import {
  EMPTY_SECTION,
  FOOTAGE_COLUMNS,
  SCORE_FIELDS,
  SCORE_MAX,
  SCORE_PRIORITY_AT,
  coverNameLines,
  coverPosition,
  coverTitleTight,
  effortTone,
  hasContent,
  impactTone,
  longDate,
  monthLabel,
  parseOpportunity,
  scoreFraction,
  scoreNote,
  scoreNoteKey,
  scoreTotal,
  splitLabelled,
  statusTone,
  type AuditHeading,
  type AuditInput,
  type AuditSection,
} from '../data/print';
import { T } from './print-css';
import {
  bodyPage,
  esc,
  footer,
  join,
  pill,
  safeUrl,
  sectionHead,
  shell,
  type PageCtx,
} from './print-html';

const DOC = 'Growth Audit';
/** The dial's circumference: 2 · π · 88, rounded the way the canvas has it. */
const DIAL = 553;

export function auditTitle(input: AuditInput): string {
  return `${input.subject} · ${DOC} · ${monthLabel(input.auditDate)}`;
}

export function renderAudit(input: AuditInput): string {
  const ctx: PageCtx = {
    doc: DOC,
    who: `${DOC} · ${input.subject}`,
    sample: input.status === 'Draft',
  };

  const sec = (h: AuditHeading): AuditSection => input.sections[h] ?? EMPTY_SECTION;

  const builders: Array<(n: number, of: number) => string> = [
    () => cover(input),
    (n, of) => bodyPage(ctx, n, of, pageShort(input, sec)),
    (n, of) => bodyPage(ctx, n, of, pageSocial(input, sec)),
    (n, of) => bodyPage(ctx, n, of, pageContent(sec)),
    (n, of) => bodyPage(ctx, n, of, pageAudience(sec)),
    (n, of) => bodyPage(ctx, n, of, pageScorecard(input, sec)),
    (n, of) => bodyPage(ctx, n, of, pageOpportunities(sec)),
    (n, of) => bodyPage(ctx, n, of, pagePlan(input, sec)),
  ];

  const of = builders.length;
  const pages = builders.map((build, i) => build(i + 1, of));
  pages[0] = pages[0].replace('<!--cover-footer-->', footer(ctx, 1, of));

  return shell(auditTitle(input), pages);
}

/* ── 1 · cover ────────────────────────────────────────────────── */

/**
 * The name, broken across two lines the way the canvas sets it.
 *
 * At 72px, "Sean Comma" on one line is 360px wide and fits; "Alexandra
 * Kowalczyk" is 760 and does not. Breaking at the last space keeps the
 * canvas's look for two-word names and keeps every other name on the
 * page.
 *
 * A name long enough to need a third line is set smaller instead. On
 * this cover a third line reaches the score dial, and a name nobody
 * can read because it is sitting on a circle is not a name set at
 * 72px. See coverTitleTight in data/print.ts.
 */
function coverName(name: string): string {
  return coverNameLines(name).map(esc).join('<br>');
}

function cover(input: AuditInput): string {
  const total = scoreTotal(input.scores);
  const dial = total === null ? '' : `<div class="cv__dial${input.coverImage ? ' cv__dial--photo' : ''}">
  <svg width="220" height="220" viewBox="0 0 220 220" role="img"
       aria-label="Growth score ${esc(String(total))} out of ${SCORE_MAX}">
    <circle cx="110" cy="110" r="88" fill="none" stroke="${T.tint2}" stroke-width="14"></circle>
    <circle cx="110" cy="110" r="88" fill="none" stroke="${T.navy}" stroke-width="14"
      stroke-linecap="round"
      stroke-dasharray="${Math.round(scoreFraction(total) * DIAL)} ${DIAL}"
      transform="rotate(-90 110 110)"></circle>
  </svg>
  <div style="text-align:center;position:relative">
    <div class="cv__dialn">${esc(String(total))}</div>
    <div class="note" style="margin-top:4px">out of ${SCORE_MAX}</div>
    <div style="font-family:Orbitron,sans-serif;font-size:10px;letter-spacing:2px;color:${T.orangeInk};margin-top:6px">GROWTH SCORE</div>
  </div>
</div>`;

  const facts = join([
    input.auditDate && fact('Audit date', longDate(input.auditDate)),
    input.dataWindow && fact('Data window', input.dataWindow),
    input.platformsReviewed && fact('Platforms reviewed', input.platformsReviewed, true),
  ]);

  // A client audit gets the same cover photo a monthly report gets. A
  // prospect teardown gets the grid, because the Drive folder it would
  // come from belongs to a client relationship that does not exist.
  //
  // The photo is a band rather than the report's 400px frame, because
  // this cover already carries a title, a score dial and three facts.
  // Everything below the band shifts down by one `--photo` class, and
  // the no-photo layout is left at the coordinates it has always had:
  // a prospect cover prints byte for byte as it did before.
  const photo = input.coverImage
    ? `<div class="cv__hero cv__hero--audit"><img src="${esc(input.coverImage)}" alt=""`
      + ` style="object-position:${coverPosition(input.coverFocus)}"></div>`
    : '';
  const shift = input.coverImage ? ' cv__at--photo' : '';

  return `<div class="pg">
<div class="grid" style="position:absolute;left:0;top:0;width:816px;height:1056px"></div>
<div class="cv__hd">
  <img class="cv__logo" src="/brand/logo-header-navy.svg" alt="Blueprint Marketing">
  <div class="cv__doc">${esc(DOC)}</div>
</div>
${photo}
<div class="cv__at${shift} stack g18">
  <div class="cv__kick">${esc(DOC)} · ${esc(monthLabel(input.auditDate))}</div>
  <h1 class="cv__title cv__title--audit${coverTitleTight(input.subject) ? ' cv__title--long' : ''}">${coverName(input.subject)}</h1>
  <div class="cv__bar"></div>
  <div class="cv__sub cv__sub--audit">Where your music, shows and audience stand today, and the three moves that will grow them.</div>
</div>
${dial}
${facts ? `<div class="cv__facts${input.coverImage ? ' cv__facts--photo' : ''}">${facts}</div>` : ''}
<div class="cv__ft">
  <div class="note">Prepared by Mason Celum<br>Blueprint Marketing · mason@bpmktg.com</div>
  <div class="note--sm">Confidential · for ${esc(input.subject)}</div>
</div>
<!--cover-footer-->
</div>`;
}

function fact(label: string, value: string, wrap = false): string {
  return `<div class="stack" style="gap:2px"><div class="fact__k">${esc(label)}</div>`
    + `<div class="fact__v${wrap ? ' fact__v--wrap' : ''}">${esc(value)}</div></div>`;
}

/* ── 2 · the short version ────────────────────────────────────── */

function pageShort(input: AuditInput, sec: (h: AuditHeading) => AuditSection): string {
  const snap = sec('Snapshot: music and business');
  return `<div class="stack g22">
${input.shortVersion ? `<div class="short">
  <div class="short__k">The short version</div>
  <p>${esc(input.shortVersion)}</p>
</div>` : ''}
${hasContent(snap) ? `<div class="stack g6">
  <div class="eyebrow">01 · Snapshot</div>
  <h2 class="h2 h2--sm">Music and business</h2>
  <div class="note">The baseline everything is measured against. Platform numbers cover the last 28 days unless noted.</div>
</div>
${table3(snap, ['Metric', 'Today', 'Notes'], ['200px', '120px', ''], 't-txt--lead2')}` : ''}
</div>`;
}

/* ── 3 · social and positioning ───────────────────────────────── */

function pageSocial(input: AuditInput, sec: (h: AuditHeading) => AuditSection): string {
  const social = sec('Snapshot: social');
  const profile = sec('Profile and positioning');

  return `<div class="stack g18">
${hasContent(social) ? `<h2 class="h2 h2--sm">Social</h2>
${tableN(social, ['Platform', 'Followers', '28-day performance', 'Avg views', 'Engagement', 'Posts'],
  ['84px', '72px', '', '84px', '92px', '52px'], 't-txt--tight t-txt--bold1')}` : ''}
${hasContent(social) && hasContent(profile) ? '<div class="rule" style="margin:4px 0"></div>' : ''}
${hasContent(profile) ? `<div class="eyebrow">02 · Profile and positioning</div>
${profileTable(profile)}` : ''}
${input.positioningRead ? `<div class="card--tint-sm">
  <div class="band__h" style="font-size:14px">Positioning read</div>
  <p style="margin:6px 0 0;font-size:13.5px;line-height:1.6;color:${T.ink}">${esc(input.positioningRead)}</p>
</div>` : ''}
</div>`;
}

/** Element | Status | Fix, with the middle column drawn as a pill. */
function profileTable(s: AuditSection): string {
  const rows = s.rows.map((r) => `<tr>
    <td>${esc(r[0] ?? '')}</td>
    <td>${r[1] ? pill(r[1], statusTone(r[1])) : ''}</td>
    <td>${esc(r[2] ?? '')}</td>
  </tr>`).join('');
  return `<table class="t-txt t-txt--tight">
  <thead><tr><th style="width:170px">Element</th><th style="width:80px">Status</th><th>Fix</th></tr></thead>
  <tbody>${rows}</tbody></table>`;
}

/* ── 4 · content ──────────────────────────────────────────────── */

function pageContent(sec: (h: AuditHeading) => AuditSection): string {
  const working = sec("What's working");
  const not = sec("What's not");
  const pattern = sec('The pattern');

  return `<div class="stack g16">
${hasContent(working) ? `${sectionHead('03 · Content audit', "What's working")}
${table3(working, ['Post', 'Views', 'Why it worked'], ['250px', '64px', ''], 't-txt--tight t-txt--right2')}` : ''}
${hasContent(not) ? `<h2 class="h2 h2--sm" style="margin:6px 0 0">What's not</h2>
${table3(not, ['Post', 'Views', 'Why it missed'], ['250px', '64px', ''], 't-txt--tight t-txt--right2')}` : ''}
${hasContent(pattern) ? `<div class="card--warm" style="border-radius:16px;padding:16px 20px">
  <div class="strong" style="font-size:14px;color:${T.orangeInk}">The pattern</div>
  ${pattern.paragraphs.map((p) => `<p style="margin:6px 0 0;font-size:13.5px;line-height:1.6;color:${T.ink}">${esc(p)}</p>`).join('')}
  ${pattern.items.map((i) => `<p style="margin:6px 0 0;font-size:13.5px;line-height:1.6;color:${T.ink}">${esc(i)}</p>`).join('')}
</div>` : ''}
</div>`;
}

/* ── 5 · audience and momentum ────────────────────────────────── */

function pageAudience(sec: (h: AuditHeading) => AuditSection): string {
  const audience = sec('Audience and engagement');
  const momentum = sec('Show and release momentum');

  // "The fix: ..." is written as the last bullet of the momentum
  // section, and the canvas sets it as a navy band rather than as one
  // more bullet. Pulled out by its label so Mason keeps writing it in
  // the same place.
  const fix = momentum.items.find((i) => (splitLabelled(i).label ?? '').toLowerCase() === 'the fix');
  const rest = momentum.items.filter((i) => i !== fix);

  return `<div class="stack g16">
${hasContent(audience) ? `<div class="eyebrow">04 · Audience and engagement</div>
<div class="stack g6">${audience.items.map(bullet).join('')}</div>
${audience.paragraphs.map((p) => `<div class="note">${esc(p)}</div>`).join('')}` : ''}
${hasContent(audience) && rest.length ? '<div class="rule" style="margin:2px 0"></div>' : ''}
${rest.length ? `<div class="eyebrow">05 · Show and release momentum</div>
<div class="stack g6">${rest.map(bullet).join('')}</div>` : ''}
${fix ? `<div style="background:${T.navy};border-radius:14px;padding:14px 18px;font-size:13.5px;line-height:1.55;color:#ffffff">
  <b>${esc(splitLabelled(fix).label ?? 'The fix')}:</b> ${esc(splitLabelled(fix).text)}
</div>` : ''}
</div>`;
}

/**
 * One bullet, with its label set in ink rather than in grey.
 *
 * The label is the first few words before a colon, which is how every
 * bullet in these sections is written. A bullet without one renders as
 * plain text, which is the whole fallback.
 */
function bullet(raw: string): string {
  const { label, text } = splitLabelled(raw);
  const body = label
    ? `<b>${esc(label)}:</b> ${esc(text)}`
    : esc(text);
  return `<div class="li"><span class="dot"></span><span>${body}</span></div>`;
}

/* ── 6 · footage and the scorecard ────────────────────────────── */

function pageScorecard(input: AuditInput, sec: (h: AuditHeading) => AuditSection): string {
  const footage = sec('Footage and assets');
  const notes = sec('Scorecard notes');
  const total = scoreTotal(input.scores);

  const columns = FOOTAGE_COLUMNS
    .map((c) => {
      const found = footage.items.find(
        (i) => (splitLabelled(i).label ?? '').toLowerCase() === c.key.toLowerCase(),
      );
      if (!found) return null;
      const colour = c.tone === 'good' ? T.up : c.tone === 'bad' ? T.down : T.navy;
      return `<div class="card--sm stack g6" style="border:1px solid ${T.rule};border-radius:14px">
        <div class="strong" style="font-size:13.5px;color:${colour}">${esc(c.label)}</div>
        <div style="font-size:13px;line-height:1.5;color:${T.ink2}">${esc(splitLabelled(found).text)}</div>
      </div>`;
    })
    .filter((c): c is string => c !== null);

  const rows = SCORE_FIELDS
    .map(({ prop, label }) => {
      const value = input.scores[prop];
      if (typeof value !== 'number' || !Number.isFinite(value)) return null;
      const lo = value <= SCORE_PRIORITY_AT;
      const segs = Array.from({ length: 5 }, (_, i) =>
        `<div class="seg${i < value ? (lo ? ' seg--lo' : ' seg--on') : ''}"></div>`).join('');
      const why = scoreNote(notes, scoreNoteKey(prop));
      return `<div class="sc">
        <div class="sc__n">${esc(label)}</div>
        <div class="segs">${segs}</div>
        <div class="sc__v">${esc(String(value))}</div>
        <div class="sc__w">${esc(why ?? '')}</div>
      </div>`;
    })
    .filter((r): r is string => r !== null);

  return `<div class="stack g16">
${columns.length ? `<div class="eyebrow">06 · Footage and assets</div>
<div style="display:grid;grid-template-columns:repeat(${columns.length},minmax(0,1fr));gap:12px">${columns.join('')}</div>` : ''}
${columns.length && rows.length ? '<div class="rule" style="margin:4px 0"></div>' : ''}
${rows.length ? `<div class="row row--end">
  <div class="stack g6">
    <div class="eyebrow">07 · Growth scorecard</div>
    <div class="note">Scored 1 (missing) to 5 (strong). Re-scored at day 90 and at the end of the term.</div>
  </div>
  ${total === null ? '' : `<div style="text-align:right">
    <span style="font-family:Orbitron,sans-serif;font-size:40px;font-weight:700;color:${T.navyDeep}">${esc(String(total))}</span>
    <span style="font-size:16px;color:${T.ink2}"> / ${SCORE_MAX}</span>
  </div>`}
</div>
<div class="stack">${rows.join('')}</div>
<div style="display:flex;gap:18px;font-size:12px;color:${T.ink2}">
  <div style="display:flex;gap:6px;align-items:center"><span class="swatch" style="background:${T.navy}"></span>3 to 5 · working</div>
  <div style="display:flex;gap:6px;align-items:center"><span class="swatch" style="background:${T.orange}"></span>1 to 2 · priority to fix</div>
</div>` : ''}
</div>`;
}

/* ── 7 · opportunities and direction ──────────────────────────── */

function pageOpportunities(sec: (h: AuditHeading) => AuditSection): string {
  const opps = sec('Top opportunities');
  const direction = sec('Recommended direction');

  const cards = opps.items
    .map((raw, i) => {
      const o = parseOpportunity(raw);
      if (!o || !o.title) return null;
      const tags = join([
        o.impact && `<span class="tag pill--${impactTone(o.impact)}">${esc(o.impact)} impact</span>`,
        o.effort && `<span class="tag pill--${effortTone(o.effort)}">${esc(o.effort)} effort</span>`,
      ]);
      return `<div class="opp">
        <div class="opp__n">${i + 1}</div>
        <div class="stack g6">
          <div class="row" style="gap:10px">
            <div class="strong" style="font-size:15px">${esc(o.title)}</div>
            ${tags ? `<div style="display:flex;gap:6px;flex-shrink:0">${tags}</div>` : ''}
          </div>
          ${o.why ? `<div style="font-size:13px;line-height:1.5;color:${T.ink2}">${esc(o.why)}</div>` : ''}
          ${o.firstMove ? `<div style="font-size:13px;color:${T.ink}">
            <b style="color:${T.orangeInk}">First move:</b> ${esc(o.firstMove)}</div>` : ''}
        </div>
      </div>`;
    })
    .filter((c): c is string => c !== null);

  return `<div class="stack g16">
${cards.length ? `${sectionHead('08 · Top opportunities', cards.length === 3 ? 'Three moves, in order' : 'The moves, in order')}
<div class="stack g12">${cards.join('')}</div>` : ''}
${cards.length && hasContent(direction) ? '<div class="rule" style="margin:4px 0"></div>' : ''}
${hasContent(direction) ? `<div class="eyebrow">09 · Recommended direction</div>
<div class="stack">${direction.items.map((raw) => {
  const { label, text } = splitLabelled(raw);
  return `<div class="dl"><b>${esc(label ?? '')}</b><span>${esc(text)}</span></div>`;
}).join('')}</div>` : ''}
</div>`;
}

/* ── 8 · the plan ─────────────────────────────────────────────── */

function pagePlan(input: AuditInput, sec: (h: AuditHeading) => AuditSection): string {
  const plan = sec('Next 30 days');
  const call = sec('For our call');

  return `<div class="stack g14">
${hasContent(plan) ? `<div class="eyebrow">10 · Next 30 days</div>
<div class="stack">${plan.items.map((i) =>
  `<div class="ck"><span class="box"></span><span>${esc(i)}</span></div>`).join('')}</div>` : ''}
${hasContent(plan) && hasContent(call) ? '<div class="rule" style="margin:2px 0"></div>' : ''}
${hasContent(call) ? `<div class="eyebrow">For our call</div>
<div class="stack">${call.items.map((raw) => {
  const { label, text } = splitLabelled(raw);
  return `<div class="dl" style="grid-template-columns:130px minmax(0,1fr);font-size:13px">
    <b>${esc(label ?? '')}</b><span>${esc(text)}</span></div>`;
}).join('')}</div>` : ''}
${closing(input)}
</div>`;
}

/**
 * The closing band, which is the one thing a prospect sees differently.
 *
 * A client is pointed at their portal. A prospect is shown the offer
 * and a button, because a teardown is a proposal and the page should
 * say what happens next. A prospect with neither an offer nor a link
 * gets no band at all rather than a band inviting them into something
 * that does not exist for them.
 */
function closing(input: AuditInput): string {
  if (input.audience === 'Prospect') {
    const link = safeUrl(input.bookACallLink);
    if (!input.offer && !link) return '';
    return `<div class="band band--navy" style="margin-top:6px">
  <div class="stack g4">
    <div class="band__h">Let's build it.</div>
    ${input.offer ? `<div class="band__b">${esc(input.offer)}</div>` : ''}
  </div>
  ${link ? `<div style="flex-shrink:0"><a class="cta" href="${link}">Book a call</a></div>` : ''}
</div>`;
  }

  const portal = input.slug
    ? `blueprint-marketing.com/portal/${esc(input.slug)}`
    : 'blueprint-marketing.com/portal';
  return `<div class="band band--navy" style="margin-top:6px">
  <div class="stack g4">
    <div class="band__h">Let's build it.</div>
    <div class="band__b">Your portal has the calendar, playbooks and goals from this audit. We'll walk it together on the kickoff call.</div>
  </div>
  <div class="band__r">${portal}<br>mason@bpmktg.com</div>
</div>`;
}

/* ── tables ───────────────────────────────────────────────────── */

function cell(value: string | undefined): string {
  return esc(value ?? '');
}

function table3(
  s: AuditSection,
  heads: [string, string, string],
  widths: [string, string, string],
  extra: string,
): string {
  return tableN(s, heads, widths, extra);
}

/**
 * A Notion table, drawn.
 *
 * The header row from Notion is dropped by the parser, so `heads` is
 * ours and the column count is fixed. A row with fewer cells than the
 * header renders empty cells rather than a broken table, which is what
 * a half-filled row in Notion looks like.
 */
function tableN(
  s: AuditSection,
  heads: string[],
  widths: string[],
  extra = '',
): string {
  const thead = heads
    .map((h, i) => `<th${widths[i] ? ` style="width:${widths[i]}"` : ''}>${esc(h)}</th>`)
    .join('');
  const tbody = s.rows
    .map((r) => `<tr>${heads.map((_, i) => `<td>${cell(r[i])}</td>`).join('')}</tr>`)
    .join('');
  return `<table class="t-txt ${extra}"><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
}
